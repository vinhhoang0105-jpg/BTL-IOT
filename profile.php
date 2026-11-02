<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thông tin cá nhân – IOT PTIT</title>
  <meta name="description" content="Hồ sơ sinh viên và thông tin hệ thống IoT PTIT." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/style.css?v=<?= time() ?>" />
  <link rel="stylesheet" href="assets/css/profile.css?v=<?= time() ?>" />
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
      <a href="index.php" class="nav-item" id="nav-dashboard">
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
      <a href="profile.php" class="nav-item active" id="nav-profile">
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
          <h1 class="page-title">Thông tin cá nhân</h1>
          <p class="page-subtitle">Hồ sơ cá nhân &amp; thông tin dự án IoT</p>
        </div>
      </div>
      <div class="header-right">
        <div class="header-time" id="headerTime"></div>
      </div>
    </header>

    <!-- ===== PROFILE CONTENT ===== -->
    <div class="profile-container">

      <div class="profile-card">
        <!-- Avatar -->
        <div class="profile-avatar-wrap">
          <svg class="profile-avatar" viewBox="0 0 160 160" width="160" height="160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background circle -->
            <circle cx="80" cy="80" r="80" fill="#3B82F6"/>
            <circle cx="80" cy="80" r="76" fill="#60A5FA" fill-opacity="0.5"/>
            
            <!-- Body / Jacket -->
            <path d="M30 160 C30 120, 50 110, 80 110 C110 110, 130 120, 130 160 Z" fill="#1E293B"/>
            <!-- Shirt -->
            <path d="M60 160 L60 125 C60 125, 80 135, 100 125 L100 160 Z" fill="#F1F5F9"/>
            
            <!-- Neck -->
            <rect x="70" y="95" width="20" height="24" rx="4" fill="#FBCFE8"/>
            <path d="M70 100 L90 100 L80 112 Z" fill="#F472B6" fill-opacity="0.3"/>

            <!-- Head / Face -->
            <ellipse cx="80" cy="74" rx="30" ry="34" fill="#FDE047" fill-opacity="0.1"/>
            <ellipse cx="80" cy="74" rx="28" ry="32" fill="#FCD34D" fill-opacity="0.2"/>
            <ellipse cx="80" cy="74" rx="26" ry="30" fill="#FED7AA"/>

            <!-- Cheeks blush -->
            <circle cx="62" cy="82" r="6" fill="#F43F5E" fill-opacity="0.25"/>
            <circle cx="98" cy="82" r="6" fill="#F43F5E" fill-opacity="0.25"/>

            <!-- Smile -->
            <path d="M70 86 Q80 96 90 86" stroke="#BE185D" stroke-width="2.5" stroke-linecap="round" fill="white"/>

            <!-- Eyes smiling -->
            <path d="M62 70 Q67 66 72 70" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M88 70 Q93 66 98 70" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" fill="none"/>

            <!-- Eyeglasses Frames -->
            <circle cx="67" cy="70" r="11" stroke="#0F172A" stroke-width="2.5" fill="rgba(255,255,255,0.2)"/>
            <circle cx="93" cy="70" r="11" stroke="#0F172A" stroke-width="2.5" fill="rgba(255,255,255,0.2)"/>
            <!-- Bridge -->
            <path d="M78 70 L82 70" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Temples -->
            <path d="M56 68 L50 66" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M104 68 L110 66" stroke="#0F172A" stroke-width="2.5" stroke-linecap="round"/>

            <!-- Hair -->
            <path d="M52 64 C50 42, 65 34, 80 34 C95 34, 110 42, 108 64 C104 54, 94 48, 80 48 C66 48, 56 54, 52 64 Z" fill="#0F172A"/>
            <path d="M56 52 C60 40, 75 36, 88 38 C78 38, 70 42, 66 50 Z" fill="#1E293B"/>
          </svg>
        </div>

        <!-- Full Name -->
        <h2 class="profile-name">Hoàng Xuân Vinh</h2>

        <!-- Info List -->
        <div class="profile-info-list">
          <!-- Date of Birth -->
          <div class="profile-info-row">
            <div class="info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="info-content">
              <span class="info-label">Ngày sinh</span>
              <span class="info-value">01/09/2005</span>
            </div>
          </div>

          <!-- Phone -->
          <div class="profile-info-row">
            <div class="info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div class="info-content">
              <span class="info-label">Số điện thoại</span>
              <span class="info-value">0123456789</span>
            </div>
          </div>

          <!-- Email -->
          <div class="profile-info-row">
            <div class="info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div class="info-content">
              <span class="info-label">Email</span>
              <a href="mailto:hoangxuanvinhhly@gmail.com" class="info-link info-value">hoangxuanvinhhly@gmail.com</a>
            </div>
          </div>

          <!-- Github -->
          <div class="profile-info-row">
            <div class="info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </div>
            <div class="info-content">
              <span class="info-label">GitHub</span>
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer" class="info-link info-value">
                github.com/hoangxuanvinh
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>

          <!-- Figma -->
          <div class="profile-info-row">
            <div class="info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/>
                <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/>
                <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/>
                <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/>
                <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>
              </svg>
            </div>
            <div class="info-content">
              <span class="info-label">Thiết kế Figma</span>
              <a href="https://figma.com/" target="_blank" rel="noopener noreferrer" class="info-link info-value">
                figma.com/@hoangxuanvinh
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>

          <!-- PDF Documentation -->
          <div class="profile-info-row">
            <div class="info-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div class="info-content">
              <span class="info-label">Báo cáo PDF</span>
              <a href="#" class="info-link info-value" onclick="alert('Liên kết tài liệu PDF báo cáo bài tập lớn.'); return false;">
                IoT_Report_HoangXuanVinh.pdf
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>

        </div><!-- /.profile-info-list -->
      </div><!-- /.profile-card -->

    </div><!-- /.profile-container -->

  </main>

  <script>
    // Sidebar toggle and real-time clock
    function updateClock() {
      const el = document.getElementById('headerTime');
      if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
    }
    updateClock();
    setInterval(updateClock, 1000);

    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', e => {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }
  </script>
</body>
</html>
