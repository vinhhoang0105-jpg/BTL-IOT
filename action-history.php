<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lịch sử hoạt động – IOT PTIT</title>
  <meta name="description" content="Xem lịch sử điều khiển thiết bị IOT PTIT – tìm kiếm theo thời gian, điều kiện và phân trang." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/style.css?v=<?= time() ?>" />
  <link rel="stylesheet" href="assets/css/action-history.css?v=<?= time() ?>" />
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
      <a href="action-history.php" class="nav-item active" id="nav-action">
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
          <h1 class="page-title">Lịch sử hoạt động</h1>
          <p class="page-subtitle">Lịch sử điều khiển thiết bị &middot; Tìm kiếm theo thời gian &amp; phân trang</p>
        </div>
      </div>
      <div class="header-right">
        <div class="header-time" id="headerTime"></div>
      </div>
    </header>

    <!-- ===== CONTENT WRAPPER ===== -->
    <div class="ah-container">

      <!-- ===== FILTER BAR (Tìm kiếm theo thời gian + điều kiện) ===== -->
      <section class="filter-bar" aria-label="Tìm kiếm và điều kiện">
        <div class="search-group">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="search-input" id="searchTime"
                 placeholder="Tìm kiếm theo thời gian (ví dụ: 2024, 12/10, 19:30...)"
                 autocomplete="off" />
        </div>

        <div class="filter-divider"></div>

        <span class="filter-label">Thiết bị:</span>
        <select class="filter-select" id="filterDevice">
          <option value="0">Tất cả</option>
          <option value="1">Đèn LED</option>
          <option value="2">Quạt điện</option>
          <option value="3">Điều hòa</option>
        </select>

        <div class="filter-divider"></div>

        <span class="filter-label">Hành động:</span>
        <select class="filter-select" id="filterAction" style="min-width:105px;">
          <option value="">Tất cả</option>
          <option value="on">ON</option>
          <option value="off">OFF</option>
        </select>

        <div class="filter-divider"></div>

        <span class="filter-label">Trạng thái:</span>
        <select class="filter-select" id="filterStatus" style="min-width:115px;">
          <option value="">Tất cả</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>

        <button class="btn-search" id="btnSearch" title="Tìm kiếm">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Tìm kiếm
        </button>

        <button class="btn-reset" id="btnReset" title="Đặt lại">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Đặt lại
        </button>
      </section>

      <!-- ===== TABLE SECTION ===== -->
      <section class="table-card" aria-label="Bảng lịch sử hoạt động thiết bị">
        <div class="table-card-header">
          <div class="table-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Lịch sử bật / tắt thiết bị
          </div>
          <div class="table-meta">
            <span id="totalCount" class="total-count">—</span>
            <span id="pageInfo"   class="page-info"></span>
          </div>
        </div>

        <!-- Loading overlay -->
        <div id="loadingState" class="loading-state" style="display:none;">
          <div class="spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>

        <!-- Table -->
        <div class="table-wrapper">
          <table class="ah-table" id="historyTable">
            <thead>
              <tr>
                <th class="th-num">STT</th>
                <th class="th-id">ID THIẾT BỊ</th>
                <th class="th-device">TÊN THIẾT BỊ</th>
                <th class="th-action">HÀNH ĐỘNG</th>
                <th class="th-status">TRẠNG THÁI</th>
                <th class="th-time">THỜI GIAN THAO TÁC</th>
                <th class="th-resp-time">THỜI GIAN PHẢN HỒI</th>
              </tr>
            </thead>
            <tbody id="historyTableBody">
              <!-- populated by JS -->
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div id="emptyState" class="empty-state" style="display:none;">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p class="empty-title">Không tìm thấy dữ liệu</p>
          <p class="empty-sub">Thử điều chỉnh lại từ khóa thời gian hoặc điều kiện lọc.</p>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrap">
          <div class="page-size-wrap">
            <span>Hiển thị</span>
            <select class="page-size-select" id="pageSizeSelect">
              <option value="10" selected>10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>dòng/trang</span>
          </div>
          <div id="pagination" class="pagination" role="navigation" aria-label="Phân trang"></div>
        </div>
      </section>

    </div><!-- /.ah-container -->
  </main>

  <div class="toast-container" id="toastContainer" aria-live="polite"></div>
  <script src="assets/js/action-history.js?v=<?= time() ?>"></script>
</body>
</html>
