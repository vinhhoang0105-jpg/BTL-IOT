<?php
/**
 * API: GET /api/sensors/history.php
 * View sensor data history with filtering, searching, sorting, and pagination
 *
 * Query Params:
 *   sensorId  (int)    - filter by sensor_id
 *   keyword   (string) - keyword search (sensor name, type, value, timestamp)
 *   sort      (string) - sort column: recorded_at|value|sensor_id (default: recorded_at)
 *   order     (string) - ASC|DESC (default: DESC)
 *   limit     (int)    - records per page (default: 10, max: 200)
 *   page      (int)    - current page (default: 1)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/db.php';

// -------------------------------------------------------
// Validate & parse input parameters
// -------------------------------------------------------

// limit: positive integer
$limitRaw = $_GET['limit'] ?? '10';
if (!ctype_digit((string)$limitRaw) || (int)$limitRaw <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid limit parameter, must be a positive integer.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$limit = min(200, max(1, (int)$limitRaw));

// page: positive integer
$pageRaw = $_GET['page'] ?? '1';
if (!ctype_digit((string)$pageRaw) || (int)$pageRaw <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid page parameter, must be a positive integer.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$page   = max(1, (int)$pageRaw);
$offset = ($page - 1) * $limit;

// sensorId: optional positive integer
$sensorIdRaw = $_GET['sensorId'] ?? '0';
if ($sensorIdRaw !== '' && $sensorIdRaw !== '0' && !ctype_digit((string)$sensorIdRaw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid sensorId parameter.'], JSON_UNESCAPED_UNICODE);
    exit;
}
$sensorId = max(0, (int)$sensorIdRaw);

$condition = strtolower(trim($_GET['condition'] ?? 'all'));
$keyword   = trim($_GET['keyword'] ?? '');

// Mặc định luôn sắp xếp theo thời gian mới nhất (bỏ sắp xếp tùy biến)
$sort  = 'recorded_at';
$order = 'DESC';

// -------------------------------------------------------
// Dynamic WHERE clause
// -------------------------------------------------------
$where  = ['1=1'];
$params = [];
$types  = '';

if ($condition === 'temp' || $condition === 'temperature') {
    $where[] = "s.type = 'temperature'";
    if ($keyword !== '') {
        $where[]  = 'CAST(sd.value AS CHAR) LIKE ?';
        $params[] = "%$keyword%";
        $types   .= 's';
    }
} elseif ($condition === 'humi' || $condition === 'humidity') {
    $where[] = "s.type = 'humidity'";
    if ($keyword !== '') {
        $where[]  = 'CAST(sd.value AS CHAR) LIKE ?';
        $params[] = "%$keyword%";
        $types   .= 's';
    }
} elseif ($condition === 'light') {
    $where[] = "s.type = 'light'";
    if ($keyword !== '') {
        $where[]  = 'CAST(sd.value AS CHAR) LIKE ?';
        $params[] = "%$keyword%";
        $types   .= 's';
    }
} elseif ($condition === 'time') {
    if ($keyword !== '') {
        $like = "%$keyword%";
        $where[] = '(
            DATE_FORMAT(sd.recorded_at, \'%Y-%m-%d %H:%i:%s\') LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%d/%m/%Y %H:%i:%s\') LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%e/%c/%Y %H:%i:%s\') LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%d-%m-%Y %H:%i:%s\') LIKE ?
        )';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $types   .= 'ssss';
    }
} else {
    // 'all'
    if ($keyword !== '') {
        $like = "%$keyword%";
        $where[] = '(
            CAST(sd.value AS CHAR) LIKE ?
            OR s.name LIKE ?
            OR s.type LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%Y-%m-%d %H:%i:%s\') LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%d/%m/%Y %H:%i:%s\') LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%e/%c/%Y %H:%i:%s\') LIKE ?
            OR DATE_FORMAT(sd.recorded_at, \'%d-%m-%Y %H:%i:%s\') LIKE ?
        )';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $types   .= 'sssssss';
    }
}

if ($sensorId > 0) {
    $where[]  = 'sd.sensor_id = ?';
    $params[] = $sensorId;
    $types   .= 'i';
}

$whereSQL = implode(' AND ', $where);

// -------------------------------------------------------
// Count total matching records
// -------------------------------------------------------
$countSQL  = "SELECT COUNT(*) AS total
              FROM sensor_data sd
              INNER JOIN sensors s ON sd.sensor_id = s.id
              WHERE $whereSQL";

$stmtCount = $conn->prepare($countSQL);
if ($types !== '') {
    $stmtCount->bind_param($types, ...$params);
}
$stmtCount->execute();
$total      = (int)$stmtCount->get_result()->fetch_assoc()['total'];
$totalPages = $total > 0 ? (int)ceil($total / $limit) : 1;
$stmtCount->close();

// Adjust page if out of bounds
if ($page > $totalPages) $page = $totalPages;
$offset = ($page - 1) * $limit;

// -------------------------------------------------------
// Fetch current page data
// -------------------------------------------------------
$dataSQL = "SELECT sd.id, sd.sensor_id, s.name AS sensor_name, s.type,
                   sd.value, sd.recorded_at
            FROM sensor_data sd
            INNER JOIN sensors s ON sd.sensor_id = s.id
            WHERE $whereSQL
            ORDER BY sd.$sort $order
            LIMIT ? OFFSET ?";

$dataParams   = $params;
$dataParams[] = $limit;
$dataParams[] = $offset;
$dataTypes    = $types . 'ii';

$stmtData = $conn->prepare($dataSQL);
$stmtData->bind_param($dataTypes, ...$dataParams);
$stmtData->execute();
$rows = $stmtData->get_result()->fetch_all(MYSQLI_ASSOC);
$stmtData->close();
$conn->close();

// Normalize data types and timestamp format YYYY-MM-DD HH:MM:SS
foreach ($rows as &$r) {
    $r['id']        = (int)$r['id'];
    $r['sensor_id'] = (int)$r['sensor_id'];
    $r['value']     = (float)$r['value'];
    if ($r['type'] === 'temperature') {
        $r['sensor_name'] = 'Nhiệt độ';
    } elseif ($r['type'] === 'humidity') {
        $r['sensor_name'] = 'Độ ẩm';
    } elseif ($r['type'] === 'light') {
        $r['sensor_name'] = 'Ánh sáng';
    }
    if (!empty($r['recorded_at'])) {
        $r['recorded_at'] = date('Y-m-d H:i:s', strtotime($r['recorded_at']));
    }
}
unset($r);

echo json_encode([
    'success'    => true,
    'total'      => $total,
    'page'       => $page,
    'limit'      => $limit,
    'totalPages' => $totalPages,
    'data'       => $rows,
], JSON_UNESCAPED_UNICODE);
