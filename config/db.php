<?php
// Cấu hình kết nối CSDL
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'IOT');

// ⚠️ Fix timezone: PHP & MySQL đều dùng giờ Việt Nam (UTC+7)
date_default_timezone_set('Asia/Ho_Chi_Minh');

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$conn->set_charset('utf8mb4');

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Kết nối CSDL thất bại: ' . $conn->connect_error
    ]);
    exit;
}

// Đồng bộ timezone cho MySQL session
$conn->query("SET time_zone = '+07:00'");

