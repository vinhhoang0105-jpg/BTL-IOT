-- ================================================
-- IOT PTIT – Script khởi tạo & dữ liệu mẫu
-- Chạy trong phpMyAdmin sau khi tạo database "IOT"
-- ================================================

USE IOT;

-- Bảng cảm biến
CREATE TABLE IF NOT EXISTS sensors (
  id         INT(11)      NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(50)  NOT NULL COMMENT 'temperature | humidity | light',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng dữ liệu cảm biến
CREATE TABLE IF NOT EXISTS sensor_data (
  id          INT(11) NOT NULL AUTO_INCREMENT,
  sensor_id   INT(11) NOT NULL,
  value       FLOAT   NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE,
  INDEX idx_sensor_recorded (sensor_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng thiết bị
CREATE TABLE IF NOT EXISTS devices (
  id         INT(11)      NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  status     VARCHAR(20)  DEFAULT 'off' COMMENT 'on | off',
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng người dùng
CREATE TABLE IF NOT EXISTS users (
  id         INT(11)      NOT NULL AUTO_INCREMENT,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng lịch sử điều khiển
CREATE TABLE IF NOT EXISTS actions (
  id         INT(11)     NOT NULL AUTO_INCREMENT,
  user_id    INT(11)     NOT NULL,
  device_id  INT(11)     NOT NULL,
  action     VARCHAR(20) NOT NULL COMMENT 'on | off',
  status     VARCHAR(20) DEFAULT 'pending' COMMENT 'pending | success | failed',
  created_at DATETIME    DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ================================================
-- DỮ LIỆU MẪU
-- ================================================

-- Cảm biến
INSERT IGNORE INTO sensors (id, name, type) VALUES
  (1, 'DHT11 – Temperature', 'temperature'),
  (2, 'DHT11 – Humidity',    'humidity'),
  (3, 'LM393 – Light',       'light');

-- Thiết bị
INSERT IGNORE INTO devices (id, name, status) VALUES
  (1, 'LED',      'off'),
  (2, 'Quạt',     'off'),
  (3, 'Điều hòa', 'off');

-- Người dùng mẫu (password: 123456 – bcrypt hash)
INSERT IGNORE INTO users (id, name, email, password) VALUES
  (1, 'Admin', 'admin@iot.ptit.edu.vn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Dữ liệu cảm biến 24 giờ qua (mỗi 30 phút)
-- Nhiệt độ
INSERT INTO sensor_data (sensor_id, value, recorded_at) VALUES
  (1, 28.5, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
  (1, 29.0, DATE_SUB(NOW(), INTERVAL 23 HOUR)),
  (1, 29.8, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
  (1, 30.5, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
  (1, 31.2, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
  (1, 32.0, DATE_SUB(NOW(), INTERVAL 19 HOUR)),
  (1, 33.1, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
  (1, 34.5, DATE_SUB(NOW(), INTERVAL 17 HOUR)),
  (1, 35.0, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
  (1, 34.8, DATE_SUB(NOW(), INTERVAL 15 HOUR)),
  (1, 34.2, DATE_SUB(NOW(), INTERVAL 14 HOUR)),
  (1, 33.5, DATE_SUB(NOW(), INTERVAL 13 HOUR)),
  (1, 33.0, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
  (1, 32.5, DATE_SUB(NOW(), INTERVAL 11 HOUR)),
  (1, 31.8, DATE_SUB(NOW(), INTERVAL 10 HOUR)),
  (1, 31.0, DATE_SUB(NOW(), INTERVAL 9 HOUR)),
  (1, 30.5, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
  (1, 29.8, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
  (1, 29.2, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
  (1, 28.8, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (1, 28.5, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
  (1, 28.2, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (1, 28.0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (1, 28.5, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (1, 29.0, NOW());

-- Độ ẩm
INSERT INTO sensor_data (sensor_id, value, recorded_at) VALUES
  (2, 72.0, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
  (2, 71.5, DATE_SUB(NOW(), INTERVAL 23 HOUR)),
  (2, 70.8, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
  (2, 70.0, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
  (2, 69.5, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
  (2, 68.0, DATE_SUB(NOW(), INTERVAL 19 HOUR)),
  (2, 66.5, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
  (2, 65.0, DATE_SUB(NOW(), INTERVAL 17 HOUR)),
  (2, 64.0, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
  (2, 63.5, DATE_SUB(NOW(), INTERVAL 15 HOUR)),
  (2, 64.0, DATE_SUB(NOW(), INTERVAL 14 HOUR)),
  (2, 65.5, DATE_SUB(NOW(), INTERVAL 13 HOUR)),
  (2, 67.0, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
  (2, 68.5, DATE_SUB(NOW(), INTERVAL 11 HOUR)),
  (2, 70.0, DATE_SUB(NOW(), INTERVAL 10 HOUR)),
  (2, 71.5, DATE_SUB(NOW(), INTERVAL 9 HOUR)),
  (2, 72.8, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
  (2, 74.0, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
  (2, 75.5, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
  (2, 76.0, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (2, 75.5, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
  (2, 74.8, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (2, 73.5, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (2, 72.0, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (2, 71.5, NOW());

-- Ánh sáng
INSERT INTO sensor_data (sensor_id, value, recorded_at) VALUES
  (3,  50.0, DATE_SUB(NOW(), INTERVAL 24 HOUR)),
  (3,  80.0, DATE_SUB(NOW(), INTERVAL 23 HOUR)),
  (3, 150.0, DATE_SUB(NOW(), INTERVAL 22 HOUR)),
  (3, 320.0, DATE_SUB(NOW(), INTERVAL 21 HOUR)),
  (3, 520.0, DATE_SUB(NOW(), INTERVAL 20 HOUR)),
  (3, 680.0, DATE_SUB(NOW(), INTERVAL 19 HOUR)),
  (3, 820.0, DATE_SUB(NOW(), INTERVAL 18 HOUR)),
  (3, 950.0, DATE_SUB(NOW(), INTERVAL 17 HOUR)),
  (3, 980.0, DATE_SUB(NOW(), INTERVAL 16 HOUR)),
  (3, 950.0, DATE_SUB(NOW(), INTERVAL 15 HOUR)),
  (3, 900.0, DATE_SUB(NOW(), INTERVAL 14 HOUR)),
  (3, 820.0, DATE_SUB(NOW(), INTERVAL 13 HOUR)),
  (3, 700.0, DATE_SUB(NOW(), INTERVAL 12 HOUR)),
  (3, 600.0, DATE_SUB(NOW(), INTERVAL 11 HOUR)),
  (3, 480.0, DATE_SUB(NOW(), INTERVAL 10 HOUR)),
  (3, 350.0, DATE_SUB(NOW(), INTERVAL 9 HOUR)),
  (3, 220.0, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
  (3, 120.0, DATE_SUB(NOW(), INTERVAL 7 HOUR)),
  (3,  60.0, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
  (3,  30.0, DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (3,  20.0, DATE_SUB(NOW(), INTERVAL 4 HOUR)),
  (3,  15.0, DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (3,  10.0, DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (3,  20.0, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (3,  50.0, NOW());

-- Lịch sử điều khiển mẫu
INSERT INTO actions (user_id, device_id, action, status, created_at) VALUES
  (1, 3, 'on',  'success', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (1, 3, 'off', 'success', DATE_SUB(NOW(), INTERVAL 4 HOUR)),
  (1, 3, 'on',  'success', DATE_SUB(NOW(), INTERVAL 3 HOUR)),
  (1, 3, 'off', 'pending', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (1, 2, 'on',  'success', DATE_SUB(NOW(), INTERVAL 90 MINUTE)),
  (1, 2, 'off', 'success', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),
  (1, 1, 'on',  'success', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
  (1, 1, 'off', 'failed',  DATE_SUB(NOW(), INTERVAL 10 MINUTE)),
  (1, 3, 'on',  'success', NOW());
