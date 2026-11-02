<?php
/**
 * MQTT Backend Subscriber (Giám sát Cảm biến & Điều khiển Thiết bị)
 * Chạy lệnh: php mqtt-subscriber.php
 * 
 * Luồng hoạt động:
 *  1. Lắng nghe dữ liệu cảm biến từ ESP32 trên topic 'home/data' -> Lưu vào bảng sensor_data (MySQL)
 *  2. Lắng nghe gói phản hồi điều khiển thiết bị (ACK) trên topic 'home/ack' -> Cập nhật bảng actions và devices
 */

require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/mqtt.php';

use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\ConnectionSettings;

$server   = MQTT_BROKER_HOST;
$port     = MQTT_BROKER_PORT;
$username = MQTT_BROKER_USER;
$password = MQTT_BROKER_PASS;
$clientId = 'PHP_Backend_Subscriber_' . uniqid();

$topicData = MQTT_TOPIC_DATA; // 'home/data'
$topicAck  = MQTT_TOPIC_ACK;  // 'home/ack'

// Hàm duy trì kết nối CSDL MySQL không bị ngắt quãng
function getDbConnection() {
    global $conn;
    if (!$conn || !@$conn->ping()) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $conn->set_charset('utf8mb4');
        $conn->query("SET time_zone = '+07:00'");
    }
    return $conn;
}

// Lấy ánh xạ type -> sensor_id trong bảng sensors
function getSensorMap($db) {
    $map = [];
    $res = $db->query("SELECT id, type FROM sensors WHERE type IN ('temperature', 'humidity', 'light')");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $map[$row['type']] = (int)$row['id'];
        }
    }
    return $map;
}

try {
    $mqtt = new MqttClient($server, $port, $clientId);
    $settings = (new ConnectionSettings())
        ->setUsername($username)
        ->setPassword($password)
        ->setKeepAliveInterval(60)
        ->setConnectTimeout(10)
        ->setUseTls(false);

    echo "====================================================\n";
    echo "       IOT BACKEND MQTT SUBSCRIBER & WORKER         \n";
    echo "====================================================\n";
    echo "MQTT Broker Server : $server:$port (User: $username)\n";
    echo "Sensor Data Topic  : $topicData\n";
    echo "Device ACK Topic   : $topicAck\n";
    echo "Database           : " . DB_NAME . " (" . DB_HOST . ")\n";
    echo "----------------------------------------------------\n";

    echo "[" . date('H:i:s') . "] Đang kết nối tới MQTT Broker...\n";
    $mqtt->connect($settings, true);
    echo "[" . date('H:i:s') . "] ✅ Kết nối MQTT Broker thành công!\n";
    echo "[" . date('H:i:s') . "] 🎧 Đang lắng nghe '$topicData' và '$topicAck'...\n\n";

    // 1. Lắng nghe dữ liệu cảm biến từ ESP32 trên 'home/data'
    $mqtt->subscribe($topicData, function (string $topic, string $message) {
        $now = date('Y-m-d H:i:s');

        // Giải mã JSON từ ESP32
        $data = json_decode($message, true);
        if (!is_array($data)) {
            return;
        }

        // ESP32 gửi: {"temp": ..., "humidity": ..., "lux": ...}
        $temp = isset($data['temp']) ? (float)$data['temp'] : (isset($data['temperature']) ? (float)$data['temperature'] : null);
        $humi = isset($data['humidity']) ? (float)$data['humidity'] : null;
        $lux  = isset($data['lux']) ? (float)$data['lux'] : (isset($data['light']) ? (float)$data['light'] : null);

        // Bảo vệ dữ liệu tránh lỗi NaN/INF
        if ($temp !== null && (is_nan($temp) || is_infinite($temp))) $temp = null;
        if ($humi !== null && (is_nan($humi) || is_infinite($humi))) $humi = null;
        if ($lux !== null && (is_nan($lux) || is_infinite($lux))) $lux = null;
        if ($lux !== null) $lux = round($lux, 1);

        if ($temp === null && $humi === null && $lux === null) {
            return;
        }

        echo "----------------------------------------------------\n";
        echo "📥 [" . $now . "] Nhận dữ liệu cảm biến [$topic]: $message\n";
        echo "   🌡 Nhiệt độ: " . ($temp !== null ? "$temp °C" : "--") . "\n";
        echo "   💧 Độ ẩm   : " . ($humi !== null ? "$humi %" : "--") . "\n";
        echo "   ☀️ Ánh sáng: " . ($lux !== null ? "$lux Lux" : "--") . "\n";

        // Lưu vào MySQL
        $db = getDbConnection();
        $sensorMap = getSensorMap($db);
        $savedCount = 0;

        $readings = [
            'temperature' => $temp,
            'humidity'    => $humi,
            'light'       => $lux,
        ];

        foreach ($readings as $type => $value) {
            if ($value !== null && isset($sensorMap[$type])) {
                $sensorId = $sensorMap[$type];
                $stmt = $db->prepare("INSERT INTO sensor_data (sensor_id, value, recorded_at) VALUES (?, ?, ?)");
                $stmt->bind_param('ids', $sensorId, $value, $now);
                if ($stmt->execute()) {
                    $savedCount++;
                } else {
                    echo "   ❌ Lỗi chèn $type vào DB: " . $stmt->error . "\n";
                }
                $stmt->close();
            }
        }
        echo "   💾 [CSDL] Đã lưu $savedCount bản ghi vào `sensor_data`.\n";
    }, 0);

    // 2. Lắng nghe phản hồi điều khiển thiết bị (ACK) trên 'home/ack'
    $mqtt->subscribe($topicAck, function (string $topic, string $message) {
        $now = date('Y-m-d H:i:s');
        echo "----------------------------------------------------\n";
        echo "🔔 [" . $now . "] Nhận ACK từ ESP32 [$topic]: $message\n";

        $ack = json_decode($message, true);
        if (!is_array($ack)) return;

        $deviceId = isset($ack['deviceId']) ? (int)$ack['deviceId'] : 0;
        $actionId = isset($ack['actionId']) ? (int)$ack['actionId'] : 0;
        $status   = isset($ack['status']) ? strtoupper($ack['status']) : '';
        // ESP32 không gửi field "state" → fallback sang field "action" (TURN_ON / TURN_OFF)
        $state    = isset($ack['state'])
            ? strtoupper($ack['state'])
            : (isset($ack['action']) ? strtoupper($ack['action']) : '');

        $db = getDbConnection();

        // 2.1. Cập nhật bảng actions (lịch sử điều khiển)
        if ($actionId > 0) {
            $actionStatus = ($status === 'SUCCESS') ? 'success' : 'failed';
            $stmtAct = $db->prepare("UPDATE actions SET status = ?, updated_at = ? WHERE id = ?");
            $stmtAct->bind_param('ssi', $actionStatus, $now, $actionId);
            $stmtAct->execute();
            $stmtAct->close();
            echo "   ✅ Cập nhật action #$actionId -> $actionStatus\n";
        }

        // 2.2. Cập nhật trạng thái thiết bị trong bảng devices (chỉ khi thực thi thành công)
        if ($deviceId > 0 && $status === 'SUCCESS') {
            $devStatus = (in_array($state, ['ON', 'TURN_ON', '1'])) ? 'on' : 'off';
            $stmtDev = $db->prepare("UPDATE devices SET status = ?, updated_at = ? WHERE id = ?");
            $stmtDev->bind_param('ssi', $devStatus, $now, $deviceId);
            $stmtDev->execute();
            $stmtDev->close();
            echo "   💡 Cập nhật thiết bị ID #$deviceId -> $devStatus\n";
        }
    }, 0);

    // Vòng lặp chính: xử lý MQTT + auto-expire pending → failed sau 10s
    $lastExpireCheck = 0;

    while (true) {
        $mqtt->loop(false); // Xử lý 1 iteration MQTT (non-blocking)

        $now = time();
        if ($now - $lastExpireCheck >= 5) {
            $lastExpireCheck = $now;

            $db = getDbConnection();
            $expireAt = date('Y-m-d H:i:s', $now - 5); // Quá 5s chưa có ACK
            $stmt = $db->prepare(
                "UPDATE actions SET status = 'failed', updated_at = NOW()
                 WHERE status = 'pending' AND created_at < ?"
            );
            $stmt->bind_param('s', $expireAt);
            $stmt->execute();
            $affected = $stmt->affected_rows;
            $stmt->close();

            if ($affected > 0) {
                echo "[" . date('H:i:s') . "] ⏰ Auto-expire: $affected action(s) pending → failed (timeout 5s)\n";
            }
        }

        usleep(200000); // Sleep 200ms để tránh CPU 100%
    }

} catch (Exception $e) {
    echo "❌ Lỗi MQTT: " . $e->getMessage() . "\n";
    exit(1);
}
