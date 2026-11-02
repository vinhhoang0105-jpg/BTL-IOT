<?php
// Cấu hình kết nối MQTT Broker đồng bộ với file MQTT.h của ESP32
define('MQTT_BROKER_HOST', '172.20.10.14');
define('MQTT_BROKER_PORT', 1884);
define('MQTT_BROKER_USER', 'Vinh');
define('MQTT_BROKER_PASS', '123456');

// Các Topic MQTT
define('MQTT_TOPIC_DATA',    'home/data');
define('MQTT_TOPIC_CONTROL', 'home/control');
define('MQTT_TOPIC_ACK',     'home/ack');
