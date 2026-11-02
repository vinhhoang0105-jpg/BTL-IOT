/**
 * IOT PTIT – Action History (UC04)
 * Features: Xem lịch sử điều khiển thiết bị với tìm kiếm thời gian, điều kiện,
 *           trạng thái phản hồi (độ trễ ms) và trạng thái pending/loading.
 */

'use strict';

/* =====================================================
   CONFIG
   ===================================================== */
const API_URL         = 'api/actions/history.php';
const API_DEVICES_URL = 'api/devices/status.php';

/* =====================================================
   STATE
   ===================================================== */
let state = {
  deviceId   : 0,
  action     : '',
  status     : '',
  searchTime : '',
  limit      : 10,
  page       : 1,
  total      : 0,
  totalPages : 1,
  loading    : false,
};

/* =====================================================
   DOM REFS
   ===================================================== */
let elDeviceFilter, elActionFilter, elStatusFilter, elSearchTime, elLimit,
    elBtnSearch, elBtnReset,
    elTableBody, elEmptyState, elLoadingState,
    elPagination, elTotalCount, elPageInfo;

function initDOMRefs() {
  const $ = id => document.getElementById(id);
  elDeviceFilter = $('filterDevice');
  elActionFilter = $('filterAction');
  elStatusFilter = $('filterStatus');
  elSearchTime   = $('searchTime');
  elLimit        = $('pageSizeSelect');
  elBtnSearch    = $('btnSearch');
  elBtnReset     = $('btnReset');
  elTableBody    = $('historyTableBody');
  elEmptyState   = $('emptyState');
  elLoadingState = $('loadingState');
  elPagination   = $('pagination');
  elTotalCount   = $('totalCount');
  elPageInfo     = $('pageInfo');
}

/* =====================================================
   UTILITY
   ===================================================== */
function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  return dtStr;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(msg, type = 'info', ms = 3500) {
  const c = document.getElementById('toastContainer');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span>${escHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = 'all 0.3s ease';
    setTimeout(() => t.remove(), 300);
  }, ms);
}

/* =====================================================
   API CALL
   ===================================================== */
async function fetchHistory() {
  if (state.loading) return;
  state.loading = true;
  setLoadingUI(true);

  const params = new URLSearchParams({
    deviceId    : state.deviceId,
    action      : state.action,
    status      : state.status,
    search_time : state.searchTime,
    limit       : state.limit,
    page        : state.page,
  });

  try {
    const res  = await fetch(`${API_URL}?${params}`, { cache: 'no-store' });
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
    console.error('fetchHistory error:', e);
    showToast('Không thể kết nối đến máy chủ.', 'error');
    renderTable([]);
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
    const devCode = r.device_code || (r.device_id ? `DEV-0${r.device_id}` : `#${r.id}`);

    // Hành động: ON / OFF
    const isActOn = String(r.action).toUpperCase().includes('ON');
    const actClass = isActOn ? 'action-on' : 'action-off';
    const actText  = isActOn ? 'ON' : 'OFF';

    // Trạng thái: ● Success, ● Failed, ● Pending
    let statBadge = '';
    const stUpper = String(r.status).toUpperCase();

    if (stUpper === 'LOADING' || stUpper === 'PENDING') {
      statBadge = `<span class="status-badge status-pending"><span class="status-dot-sm dot-pending"></span>Pending</span>`;
    } else if (stUpper === 'FAILED' || stUpper === 'TIMEOUT') {
      statBadge = `<span class="status-badge status-failed"><span class="status-dot-sm dot-failed"></span>Failed</span>`;
    } else {
      statBadge = `<span class="status-badge status-success"><span class="status-dot-sm dot-success"></span>Success</span>`;
    }

    // Thời gian phản hồi
    let respTimeHtml = '<span class="time-muted">--</span>';
    if (r.response_time && stUpper !== 'LOADING' && stUpper !== 'PENDING') {
      respTimeHtml = `<span class="time-cell">${formatDateTime(r.response_time)}</span>`;
      if (r.latency_text) {
        respTimeHtml += ` <span class="latency-tag" title="Độ trễ phản hồi">${escHtml(r.latency_text)}</span>`;
      }
    }

    return `<tr class="table-row" style="animation-delay:${idx * 20}ms">
      <td class="td-num">${rowNum}</td>
      <td class="td-id"><span class="device-id">${escHtml(devCode)}</span></td>
      <td class="td-device"><span class="device-name">${escHtml(formatDeviceName(r.device_name || 'Thiết bị'))}</span></td>
      <td class="td-action"><span class="action-badge ${actClass}">${actText}</span></td>
      <td class="td-status">${statBadge}</td>
      <td class="td-time"><span class="time-cell">${formatDateTime(r.created_at || r.action_time)}</span></td>
      <td class="td-resp-time">${respTimeHtml}</td>
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

  elPagination.appendChild(btn('«', 1,          page === 1));
  elPagination.appendChild(btn('‹', page - 1,   page === 1));

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
   FILTER CONTROLS
   Combobox CHỈ LÀ ĐIỀU KIỆN (Không tự động reload khi change)
   ===================================================== */
function collectFilters() {
  if (elDeviceFilter) state.deviceId   = parseInt(elDeviceFilter.value, 10) || 0;
  if (elActionFilter) state.action     = elActionFilter.value.trim();
  if (elStatusFilter) state.status     = elStatusFilter.value.trim();
  if (elSearchTime)   state.searchTime = elSearchTime.value.trim();
  if (elLimit)        state.limit      = parseInt(elLimit.value, 10) || 10;
  state.page = 1;
}

function bindControls() {
  // Nút Tìm kiếm
  if (elBtnSearch) {
    elBtnSearch.addEventListener('click', () => {
      collectFilters();
      fetchHistory();
    });
  }

  // Nhấn Enter tại ô tìm kiếm thời gian
  if (elSearchTime) {
    elSearchTime.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        collectFilters();
        fetchHistory();
      }
    });
  }

  // Thay đổi số dòng / trang
  if (elLimit) {
    elLimit.addEventListener('change', () => {
      state.limit = parseInt(elLimit.value, 10) || 10;
      state.page  = 1;
      fetchHistory();
    });
  }

  // Nút Đặt lại
  if (elBtnReset) {
    elBtnReset.addEventListener('click', resetFilters);
  }
}

function resetFilters() {
  if (elSearchTime)   elSearchTime.value   = '';
  if (elDeviceFilter) elDeviceFilter.value = '0';
  if (elActionFilter) elActionFilter.value = '';
  if (elStatusFilter) elStatusFilter.value = '';
  if (elLimit)        elLimit.value        = '10';

  state = {
    ...state,
    deviceId   : 0,
    action     : '',
    status     : '',
    searchTime : '',
    limit      : 10,
    page       : 1,
  };
  fetchHistory();
}

/* =====================================================
   DEVICE NAME FORMATTER
   ===================================================== */
function formatDeviceName(rawName) {
  const lower = String(rawName || '').toLowerCase().trim();
  if (lower.includes('quạt') || lower.includes('fan')) return 'Quạt điện';
  if (lower.includes('đèn') || lower.includes('led') || lower.includes('light')) return 'Đèn LED';
  if (lower.includes('điều hòa') || lower.includes('air') || lower.includes('ac')) return 'Điều hòa';
  return rawName || 'Thiết bị';
}

/* =====================================================
   LOAD DEVICE OPTIONS
   ===================================================== */
async function loadDeviceOptions() {
  if (!elDeviceFilter) return;
  try {
    const res  = await fetch(API_DEVICES_URL, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return;

    const currentVal = elDeviceFilter.value;
    elDeviceFilter.innerHTML = '<option value="0">Tất cả</option>' +
      data.data.map(d => `<option value="${d.id}">${escHtml(formatDeviceName(d.name))}</option>`).join('');
    elDeviceFilter.value = currentVal || '0';
  } catch (e) {
    console.warn('loadDeviceOptions: Could not load devices list from API');
    elDeviceFilter.innerHTML = `
      <option value="0">Tất cả</option>
      <option value="1">Đèn LED</option>
      <option value="2">Quạt điện</option>
      <option value="3">Điều hòa</option>
    `;
  }
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
  bindControls();

  // Sidebar toggle
  const toggleBtn = document.getElementById('sidebarToggle');
  const sidebar   = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  loadDeviceOptions();
  fetchHistory();
});
