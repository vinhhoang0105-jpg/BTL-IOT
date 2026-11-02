<?php
/**
 * API: GET /api/sensors/latest.php
 * Trả về giá trị mới nhất của temperature, humidity, light
 * Response JSON:
 * {
 *   "success": true,
 *   "data": {
 *     "temperature": { "value": 30.5, "recorded_at": "2024-01-01 12:00:00" },
 *     "humidity":    { "value": 70.2, "recorded_at": "2024-01-01 12:00:00" },
 *     "light":       { "value": 850,  "recorded_at": "2024-01-01 12:00:00" }
 *   }
 * }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/db.php';

$types = ['temperature', 'humidity', 'light'];
$result = [];

foreach ($types as $type) {
    $stmt = $conn->prepare("
        SELECT sd.value, sd.recorded_at
        FROM sensor_data sd
        INNER JOIN sensors s ON sd.sensor_id = s.id
        WHERE s.type = ?
        ORDER BY sd.recorded_at DESC
        LIMIT 1
    ");
    $stmt->bind_param('s', $type);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($row) {
        $result[$type] = [
            'value'       => (float)$row['value'],
            'recorded_at' => $row['recorded_at']
        ];
    } else {
        $result[$type] = null;
    }
}

$conn->close();

echo json_encode([
    'success' => true,
    'data'    => $result
], JSON_UNESCAPED_UNICODE);
