<?php
/**
 * API: POST /api/devices/control.php
 * Send device control command
 *
 * Request Body JSON:
 *   { "deviceId": 1, "action": "TURN_ON" }
 *   Or: { "deviceId": 1, "action": "TURN_OFF" }
 *   Also accepts: "on" / "off"
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../../config/db.php';

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Only HTTP POST is allowed.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Read & parse body JSON
$rawBody = file_get_contents('php://input');
$body    = json_decode($rawBody, true);

if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Request body must be valid JSON.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate deviceId
$deviceId = isset($body['deviceId']) ? (int)$body['deviceId'] : 0;
if ($deviceId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid deviceId. Must be a positive integer.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate action
$actionRaw = isset($body['action']) ? strtoupper(trim((string)$body['action'])) : '';
$actionMap = [
    'TURN_ON'  => 'on',
    'TURN_OFF' => 'off',
    'ON'       => 'on',
    'OFF'      => 'off',
];
if (!array_key_exists($actionRaw, $actionMap)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid action. Valid values: TURN_ON, TURN_OFF, on, off.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
$action = $actionMap[$actionRaw]; // normalized to 'on' | 'off'

// Check device existence in DB
$stmtDev = $conn->prepare('SELECT id, name, status FROM devices WHERE id = ?');
$stmtDev->bind_param('i', $deviceId);
$stmtDev->execute();
$device = $stmtDev->get_result()->fetch_assoc();
$stmtDev->close();

if (!$device) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "Device ID={$deviceId} does not exist.",
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Default user_id = 1
$userId = 1;

// INSERT into actions table with status = 'pending'
$stmtIns = $conn->prepare(
    "INSERT INTO actions (user_id, device_id, action, status) VALUES (?, ?, ?, 'pending')"
);
$stmtIns->bind_param('iis', $userId, $deviceId, $action);
$stmtIns->execute();
$actionId = (int)$conn->insert_id;
$stmtIns->close();

if ($actionId <= 0) {
    $conn->close();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to create control command in database.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Không cập nhật devices.status tại đây (chờ ACK từ ESP32 qua MQTT để cập nhật chính xác)
$conn->close();

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/mqtt.php';

use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\ConnectionSettings;

// Gửi lệnh điều khiển qua MQTT tới ESP32
$mqttSent = false;
$mqttError = null;
try {
    $mqttPub = new MqttClient(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 'PHP_Ctrl_' . uniqid());
    $mqttSettings = (new ConnectionSettings())
        ->setUsername(MQTT_BROKER_USER)
        ->setPassword(MQTT_BROKER_PASS)
        ->setKeepAliveInterval(10)
        ->setConnectTimeout(3)
        ->setUseTls(false);

    $mqttPub->connect($mqttSettings, true);

    // Gói tin gửi xuống ESP32: {"actionId": 12, "deviceId": 1, "action": "TURN_ON"}
    $controlPayload = json_encode([
        'actionId' => $actionId,
        'deviceId' => $deviceId,
        'action'   => $action === 'on' ? 'TURN_ON' : 'TURN_OFF',
    ], JSON_UNESCAPED_UNICODE);

    $mqttPub->publish(MQTT_TOPIC_CONTROL, $controlPayload, 0);
    $mqttPub->disconnect();
    $mqttSent = true;
} catch (Exception $e) {
    $mqttError = $e->getMessage();
}

echo json_encode([
    'success'    => true,
    'actionId'   => $actionId,
    'deviceId'   => (int)$deviceId,
    'deviceName' => $device['name'],
    'action'     => strtoupper($action),
    'status'     => 'PENDING',
    'mqttSent'   => $mqttSent,
    'mqttError'  => $mqttError,
    'message'    => sprintf(
        'Đã gửi lệnh %s tới thiết bị %s (ID=%d). Đang chờ xác nhận từ ESP32.',
        strtoupper($action),
        $device['name'],
        $actionId
    ),
], JSON_UNESCAPED_UNICODE);
