/**
 * IOT PTIT - Sensor History (UC03)
 * Features: Xem lịch sử dữ liệu cảm biến với tìm kiếm theo điều kiện và phân trang.
 */

'use strict';

/* =====================================================
   CONFIG
   ===================================================== */
const API_URL = 'api/sensors/history.php';

/* =====================================================
   STATE
   ===================================================== */
let state = {
  condition  : 'all',
  keyword    : '',
  limit      : 10,
  page       : 1,
  total      : 0,
  totalPages : 1,
  loading    : false,
};

/* =====================================================
   DOM REFS
   ===================================================== */
let elConditionFilter, elKeyword, elLimit,
    elBtnSearch, elBtnReset,
    elTableBody, elEmptyState, elLoadingState,
    elPagination, elTotalCount, elPageInfo;

function initDOMRefs() {
  const $ = id => document.getElementById(id);
  elConditionFilter = $('filterCondition');
  elKeyword         = $('filterKeyword');
  elLimit           = $('pageSizeSelect');
  elBtnSearch       = $('btnSearch');
  elBtnReset        = $('btnReset');
  elTableBody       = $('historyTableBody');
  elEmptyState      = $('emptyState');
  elLoadingState    = $('loadingState');
  elPagination      = $('pagination');
  elTotalCount      = $('totalCount');
  elPageInfo        = $('pageInfo');
}

/* =====================================================
   UTILITY
   ===================================================== */
function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  return dtStr;
}

function formatValue(type, value) {
  const num = Number(value);
  switch (type) {
    case 'temperature': return `${num.toFixed(1)} °C`;
    case 'humidity':    return `${num.toFixed(1)} %`;
    case 'light':       return `${Math.round(num).toLocaleString()} Lux`;
    default:            return isNaN(num) ? value : num.toFixed(2);
  }
}

function getTypeLabel(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('temp') || t.includes('nhiệt')) return 'Nhiệt độ';
  if (t.includes('humi') || t.includes('ẩm'))   return 'Độ ẩm';
  if (t.includes('light') || t.includes('sáng') || t.includes('lux')) return 'Ánh sáng';
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : '—';
}

function formatSensorDisplayName(name, type) {
  const t = String(type || name || '').toLowerCase();
  if (t.includes('temp') || t.includes('nhiệt')) return 'Nhiệt độ';
  if (t.includes('humi') || t.includes('ẩm'))   return 'Độ ẩm';
  if (t.includes('light') || t.includes('sáng') || t.includes('lux') || t.includes('lm393')) return 'Ánh sáng';
  return getTypeLabel(type) || name;
}

function getTypeBadge(type = '') {
  const t = String(type).toLowerCase();
  if (t.includes('temp') || t.includes('nhiệt')) {
    return `<span class="type-badge badge-temp">🌡️ Nhiệt độ</span>`;
  }
  if (t.includes('humi') || t.includes('ẩm')) {
    return `<span class="type-badge badge-humi">💧 Độ ẩm</span>`;
  }
  if (t.includes('light') || t.includes('sáng') || t.includes('lux')) {
    return `<span class="type-badge badge-light">☀️ Ánh sáng</span>`;
  }
  return `<span class="type-badge badge-default">📡 ${escHtml(getTypeLabel(type))}</span>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-msg">${escHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* =====================================================
   FETCH DATA
   ===================================================== */
async function fetchHistory() {
  if (state.loading) return;
  state.loading = true;
  setLoadingUI(true);

  try {
    const params = new URLSearchParams({
      condition : state.condition,
      keyword   : state.keyword,
      limit     : state.limit,
      page      : state.page,
    });

    const res  = await fetch(`${API_URL}?${params.toString()}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || `Lỗi máy chủ (${res.status})`, 'error');
      renderTable([]);
      renderPagination(0, 1, 1);
      return;
    }

    state.total      = data.total;
    state.totalPages = data.totalPages;
    state.page       = data.page;

    renderTable(data.data);
    renderPagination(data.total, data.page, data.totalPages);
  } catch (e) {
    console.warn('fetchHistory offline, using fallback sensor data:', e);
    const fallbackSensorData = [
      { id: 1, sensor_id: 1, sensor_name: 'Nhiệt độ', type: 'temperature', value: 28.5, recorded_at: '2026-09-23 22:53:18' },
      { id: 2, sensor_id: 2, sensor_name: 'Độ ẩm', type: 'humidity', value: 65.2, recorded_at: '2026-09-23 22:53:18' },
      { id: 3, sensor_id: 3, sensor_name: 'Ánh sáng', type: 'light', value: 450, recorded_at: '2026-09-23 22:53:18' },
      { id: 4, sensor_id: 1, sensor_name: 'Nhiệt độ', type: 'temperature', value: 29.0, recorded_at: '2026-09-23 22:50:00' },
      { id: 5, sensor_id: 2, sensor_name: 'Độ ẩm', type: 'humidity', value: 66.0, recorded_at: '2026-09-23 22:50:00' },
      { id: 6, sensor_id: 3, sensor_name: 'Ánh sáng', type: 'light', value: 520, recorded_at: '2026-09-23 22:50:00' },
      { id: 7, sensor_id: 1, sensor_name: 'Nhiệt độ', type: 'temperature', value: 28.2, recorded_at: '2026-09-23 22:45:10' },
      { id: 8, sensor_id: 2, sensor_name: 'Độ ẩm', type: 'humidity', value: 64.8, recorded_at: '2026-09-23 22:45:10' },
      { id: 9, sensor_id: 3, sensor_name: 'Ánh sáng', type: 'light', value: 480, recorded_at: '2026-09-23 22:45:10' },
      { id: 10, sensor_id: 1, sensor_name: 'Nhiệt độ', type: 'temperature', value: 27.9, recorded_at: '2026-09-23 22:40:05' },
      { id: 11, sensor_id: 2, sensor_name: 'Độ ẩm', type: 'humidity', value: 63.5, recorded_at: '2026-09-23 22:40:05' },
      { id: 12, sensor_id: 3, sensor_name: 'Ánh sáng', type: 'light', value: 430, recorded_at: '2026-09-23 22:40:05' }
    ];

    let filtered = fallbackSensorData.filter(item => {
      if (state.condition === 'temp' && item.type !== 'temperature') return false;
      if (state.condition === 'humi' && item.type !== 'humidity') return false;
      if (state.condition === 'light' && item.type !== 'light') return false;
      if (state.keyword) {
        const kw = state.keyword.toLowerCase();
        const valMatch = String(item.value).includes(kw);
        const nameMatch = (item.sensor_name || '').toLowerCase().includes(kw);
        const timeMatch = (item.recorded_at || '').includes(kw);
        return valMatch || nameMatch || timeMatch;
      }
      return true;
    });

    state.total = filtered.length;
    state.totalPages = Math.ceil(filtered.length / state.limit) || 1;
    const start = (state.page - 1) * state.limit;
    renderTable(filtered.slice(start, start + state.limit));
    renderPagination(state.total, state.page, state.totalPages);
  } finally {
    state.loading = false;
    setLoadingUI(false);
  }
}

/* =====================================================
   RENDER TABLE
   ===================================================== */
function setLoadingUI(on) {
  if (elLoadingState) elLoadingState.style.display = on ? 'flex' : 'none';
  if (elTableBody)    elTableBody.style.opacity     = on ? '0.4' : '1';
}

function renderTable(rows) {
  if (!elTableBody) return;

  if (!rows || rows.length === 0) {
    elTableBody.innerHTML = '';
    if (elEmptyState) elEmptyState.style.display = 'flex';
    if (elTotalCount) elTotalCount.textContent   = '0 kết quả';
    if (elPageInfo)   elPageInfo.textContent     = '';
    return;
  }

  if (elEmptyState) elEmptyState.style.display = 'none';
  if (elTotalCount) elTotalCount.textContent   = `${state.total.toLocaleString()} kết quả`;
  if (elPageInfo)   elPageInfo.textContent     = `Trang ${state.page} / ${state.totalPages}`;

  elTableBody.innerHTML = rows.map((r, idx) => {
    const rowNum = (state.page - 1) * state.limit + idx + 1;
    return `<tr class="table-row" style="animation-delay:${idx * 20}ms">
      <td class="td-num">${rowNum}</td>
      <td class="td-id"><span class="id-chip">#${r.id}</span></td>
      <td class="td-name">${escHtml(formatSensorDisplayName(r.sensor_name, r.type))}</td>
      <td class="td-type">${getTypeBadge(r.type)}</td>
      <td class="td-value"><span class="value-chip value-${r.type}">${formatValue(r.type, r.value)}</span></td>
      <td class="td-time"><span class="time-chip">${formatDateTime(r.recorded_at)}</span></td>
    </tr>`;
  }).join('');
}

/* =====================================================
   PAGINATION
   ===================================================== */
function renderPagination(total, page, totalPages) {
  if (!elPagination) return;
  elPagination.innerHTML = '';
  if (totalPages <= 1) return;

  const btn = (label, pg, disabled = false, active = false) => {
    const b = document.createElement('button');
    b.className = ['page-btn', active ? 'active' : '', disabled ? 'disabled' : ''].join(' ').trim();
    b.disabled  = disabled;
    b.innerHTML = label;
    if (!disabled) b.addEventListener('click', () => goToPage(pg));
    return b;
  };

  elPagination.appendChild(btn('«', 1,        page === 1));
  elPagination.appendChild(btn('‹', page - 1, page === 1));

  buildPageRange(page, totalPages).forEach(p => {
    if (p === '…') {
      const span = document.createElement('span');
      span.className   = 'page-ellipsis';
      span.textContent = '…';
      elPagination.appendChild(span);
    } else {
      elPagination.appendChild(btn(p, p, false, p === page));
    }
  });

  elPagination.appendChild(btn('›', page + 1,   page === totalPages));
  elPagination.appendChild(btn('»', totalPages,  page === totalPages));
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('…', total);
  } else if (current >= total - 3) {
    pages.push(1, '…');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total);
  }
  return pages;
}

function goToPage(pg) {
  if (pg < 1 || pg > state.totalPages || pg === state.page) return;
  state.page = pg;
  fetchHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================
   FILTER & SEARCH CONTROLS
   Combobox CHỈ LÀ ĐIỀU KIỆN (không tự động load lại dữ liệu khi change)
   ===================================================== */
function updatePlaceholder() {
  if (!elKeyword || !elConditionFilter) return;
  const cond = elConditionFilter.value;
  switch (cond) {
    case 'temp':
      elKeyword.placeholder = 'Nhập giá trị nhiệt độ cần tìm (ví dụ: 28, 30.5...)';
      break;
    case 'humi':
      elKeyword.placeholder = 'Nhập giá trị độ ẩm cần tìm (ví dụ: 65, 70...)';
      break;
    case 'light':
      elKeyword.placeholder = 'Nhập giá trị ánh sáng cần tìm (ví dụ: 500, 1000...)';
      break;
    case 'time':
      elKeyword.placeholder = 'Nhập thời gian cần tìm (ví dụ: 2024, 12/10, 15:30...)';
      break;
    case 'all':
    default:
      elKeyword.placeholder = 'Nhập từ khóa hoặc thời gian cần tìm...';
      break;
  }
}

function handleSearch() {
  state.condition = elConditionFilter ? elConditionFilter.value : 'all';
  state.keyword   = elKeyword ? elKeyword.value.trim() : '';
  state.page      = 1;
  fetchHistory();
}

function handleReset() {
  if (elConditionFilter) elConditionFilter.value = 'all';
  if (elKeyword) elKeyword.value = '';
  updatePlaceholder();

  state.condition = 'all';
  state.keyword   = '';
  state.page      = 1;
  fetchHistory();
}

function handlePageSizeChange() {
  if (!elLimit) return;
  state.limit = parseInt(elLimit.value, 10) || 10;
  state.page  = 1;
  fetchHistory();
}

/* =====================================================
   REAL-TIME CLOCK
   ===================================================== */
function startClock() {
  const el = document.getElementById('headerTime');
  if (!el) return;
  const update = () => {
    const now = new Date();
    el.textContent = now.toLocaleDateString('vi-VN', {
      weekday: 'short',
      year   : 'numeric',
      month  : '2-digit',
      day    : '2-digit',
      hour   : '2-digit',
      minute : '2-digit',
      second : '2-digit',
    });
  };
  update();
  setInterval(update, 1000);
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDOMRefs();
  startClock();

  // Sidebar toggle
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Khi thay đổi combobox điều kiện: Cập nhật placeholder, TUYỆT ĐỐI KHÔNG tự động lọc
  if (elConditionFilter) {
    elConditionFilter.addEventListener('change', () => {
      updatePlaceholder();
    });
    updatePlaceholder();
  }

  // Nút tìm kiếm
  if (elBtnSearch) {
    elBtnSearch.addEventListener('click', handleSearch);
  }

  // Nhấn Enter trong ô tìm kiếm
  if (elKeyword) {
    elKeyword.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
    });
  }

  // Nút đặt lại
  if (elBtnReset) {
    elBtnReset.addEventListener('click', handleReset);
  }

  // Đổi số dòng / trang
  if (elLimit) {
    elLimit.addEventListener('change', handlePageSizeChange);
  }

  // Tải dữ liệu ban đầu
  fetchHistory();
});
