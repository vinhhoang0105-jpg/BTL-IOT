<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IOT PTIT – Bảng điều khiển</title>
  <meta name="description" content="Hệ thống giám sát và điều khiển IoT PTIT – Bảng điều khiển thời gian thực cho nhiệt độ, độ ẩm và ánh sáng." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <!-- Paho MQTT -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js"></script>
  <!-- Chart.js + Date Adapter -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
  <link rel="stylesheet" href="assets/css/style.css?v=<?= time() ?>" />
</head>
<body>

  <!-- ===== SIDEBAR ===== -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="brand-name">IOT PTIT</span>
    </div>
    <nav class="sidebar-nav">
      <a href="index.php" class="nav-item active" id="nav-dashboard">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
        </svg>
        Bảng điều khiển
      </a>
      <a href="sensor-history.php" class="nav-item" id="nav-sensor">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Dữ liệu cảm biến
      </a>
      <a href="action-history.php" class="nav-item" id="nav-action">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        Lịch sử hoạt động
      </a>
      <a href="profile.php" class="nav-item" id="nav-profile">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        Thông tin cá nhân
      </a>
    </nav>
  </aside>

  <!-- ===== MAIN ===== -->
  <main class="main-content">

    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <button class="sidebar-toggle" id="sidebarToggle" aria-label="Đóng mở menu">
          <span></span><span></span><span></span>
        </button>
        <div>
          <h1 class="page-title">Bảng điều khiển</h1>
          <p class="page-subtitle">Giám sát cảm biến thời gian thực &middot; 20 bản ghi gần nhất</p>
        </div>
      </div>
      <div class="header-right">
        <div class="realtime-badge" id="realtimeBadge">
          <span class="pulse-dot"></span>
          <span id="realtimeText">Đang kết nối...</span>
        </div>
        <div class="header-time" id="headerTime"></div>
      </div>
    </header>

    <!-- ===== SENSOR CARDS ===== -->
    <section class="sensor-cards" aria-label="Giá trị cảm biến hiện tại">

      <div class="sensor-card" id="card-temperature">
        <div class="card-header">
          <div class="card-icon temp-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
            </svg>
          </div>
          <div class="card-title-group">
            <span class="card-label">NHIỆT ĐỘ</span>
            <span class="card-tag">DHT11</span>
          </div>
        </div>
        <div class="card-value-row">
          <span class="card-value" id="temp-value">--</span>
          <span class="card-unit">°C</span>
        </div>
        <div class="card-activity-track">
          <div class="card-activity-bar temp-bar" id="temp-bar" style="width: 0%"></div>
        </div>
      </div>

      <div class="sensor-card" id="card-humidity">
        <div class="card-header">
          <div class="card-icon humi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <div class="card-title-group">
            <span class="card-label">ĐỘ ẨM</span>
            <span class="card-tag">DHT11</span>
          </div>
        </div>
        <div class="card-value-row">
          <span class="card-value" id="humi-value">--</span>
          <span class="card-unit">%</span>
        </div>
        <div class="card-activity-track">
          <div class="card-activity-bar humi-bar" id="humi-bar" style="width: 0%"></div>
        </div>
      </div>

      <div class="sensor-card" id="card-light">
        <div class="card-header">
          <div class="card-icon light-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          </div>
          <div class="card-title-group">
            <span class="card-label">CƯỜNG ĐỘ ÁNH SÁNG</span>
            <span class="card-tag">LM393</span>
          </div>
        </div>
        <div class="card-value-row">
          <span class="card-value" id="light-value">--</span>
          <span class="card-unit">LUX</span>
        </div>
        <div class="card-activity-track">
          <div class="card-activity-bar light-bar" id="light-bar" style="width: 0%"></div>
        </div>
      </div>

    </section>

    <!-- ===== DASHBOARD MAIN LAYOUT (CHARTS ON LEFT, DEVICE CONTROL & SYSTEM STATUS ON RIGHT) ===== -->
    <div class="dashboard-main-layout">

      <!-- LEFT COLUMN: REALTIME CHARTS -->
      <section class="dashboard-charts-col" aria-label="Biểu đồ cảm biến thời gian thực">

        <!-- Temperature + Humidity Chart -->
        <div class="rt-chart-card card-temp-humi">
          <div class="rt-chart-header">
            <div class="rt-chart-label">
              <span class="rt-chart-icon-badge temp-humi-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                </svg>
              </span>
              <div class="rt-legend-group">
                <span class="legend-item"><span class="rt-dot dot-temp"></span>Nhiệt độ (°C)</span>
                <span class="legend-sep">/</span>
                <span class="legend-item"><span class="rt-dot dot-humi"></span>Độ ẩm (%)</span>
              </div>
            </div>
          </div>
          <div class="rt-chart-wrap">
            <canvas id="chartTempHumi"></canvas>
          </div>
        </div>

        <!-- Light Chart -->
        <div class="rt-chart-card card-light">
          <div class="rt-chart-header">
            <div class="rt-chart-label">
              <span class="rt-chart-icon-badge light-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </span>
              <div class="rt-legend-group">
                <span class="legend-item"><span class="rt-dot dot-light"></span>Cường độ ánh sáng (Lux)</span>
              </div>
            </div>
          </div>
          <div class="rt-chart-wrap">
            <canvas id="chartLight"></canvas>
          </div>
        </div>

      </section>

      <!-- RIGHT COLUMN: DEVICE CONTROL & SYSTEM STATUS -->
      <aside class="dashboard-sidebar-col" aria-label="Bảng điều khiển thiết bị & thông tin hệ thống">

        <!-- Device Widget -->
        <div class="device-card" id="device-widget">
          <div class="device-card-header">
            <div class="device-header-left">
              <div class="device-header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              </div>
              <div class="device-header-text">
                <span class="device-card-title">ĐIỀU KHIỂN THIẾT BỊ</span>
                <span class="device-card-subtitle">Bật / tắt nhanh &amp; trạng thái</span>
              </div>
            </div>
            <span class="device-count-badge" id="deviceCountBadge">-- Đang bật</span>
          </div>

          <!-- Device List -->
          <div class="device-list" id="deviceList">
            <div class="device-skeleton"></div>
            <div class="device-skeleton"></div>
            <div class="device-skeleton"></div>
          </div>
          <div class="device-empty" id="deviceEmpty" style="display:none">Chưa có thiết bị nào được cấu hình.</div>

        </div>

      </aside>

    </div>

  </main>

  <div class="toast-container" id="toastContainer" aria-live="polite"></div>
  <script src="assets/js/dashboard.js?v=<?= time() ?>"></script>
</body>
</html>
