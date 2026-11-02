<?php
/**
 * API: GET /api/devices/status.php
 * Lấy trạng thái thiết bị
 * Param: deviceId (int, optional) - nếu không có thì lấy tất cả
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/db.php';

// Tự động chuyển các action pending quá 5s không có phản hồi thành failed
$conn->query("UPDATE actions SET status = 'failed', updated_at = NOW() WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 5 SECOND)");

$deviceId = isset($_GET['deviceId']) ? (int)$_GET['deviceId'] : 0;

if ($deviceId > 0) {
    $stmt = $conn->prepare("
        SELECT d.id, d.name, d.status, d.updated_at,
               (SELECT a.action FROM actions a WHERE a.device_id = d.id AND a.status = 'pending' AND a.created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND) ORDER BY a.id DESC LIMIT 1) AS pending_action
        FROM devices d
        WHERE d.id = ?
    ");
    $stmt->bind_param('i', $deviceId);
} else {
    $stmt = $conn->prepare("
        SELECT d.id, d.name, d.status, d.updated_at,
               (SELECT a.action FROM actions a WHERE a.device_id = d.id AND a.status = 'pending' AND a.created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND) ORDER BY a.id DESC LIMIT 1) AS pending_action
        FROM devices d
        ORDER BY d.id
    ");
}
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();
$conn->close();

foreach ($rows as &$r) {
    $r['id'] = (int)$r['id'];
    $r['is_pending'] = !empty($r['pending_action']);

    $devNameLower = strtolower($r['name'] ?? '');
    if (strpos($devNameLower, 'quạt') !== false || strpos($devNameLower, 'fan') !== false) {
        $r['name'] = 'Quạt điện';
    } elseif (strpos($devNameLower, 'đèn') !== false || strpos($devNameLower, 'led') !== false || strpos($devNameLower, 'light') !== false) {
        $r['name'] = 'Đèn LED';
    } elseif (strpos($devNameLower, 'điều hòa') !== false || strpos($devNameLower, 'air') !== false || strpos($devNameLower, 'ac') !== false) {
        $r['name'] = 'Điều hòa';
    }
}
unset($r);

echo json_encode([
    'success' => true,
    'data'    => $rows
], JSON_UNESCAPED_UNICODE);
