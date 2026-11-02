/**
 * IOT PTIT – Dashboard Realtime (UC01)
 *
 * Kiến trúc dữ liệu:
 *   ESP32 → MQTT → PHP → MySQL
 *                 → Paho MQTT → Chart.js
 *
 * Biểu đồ:
 *   - Hiển thị cố định 20 điểm gần nhất (FIFO Queue: Thêm mới 1 - Bỏ cũ 1)
 *   - Mỗi điểm nhận = 1 điểm {x: Date, y: value}
 *   - Trục X tự động trải đều theo 20 điểm dữ liệu
 *   - Đường nét mượt mà, tối ưu hiệu năng và hiển thị
 */

'use strict';

/* =====================================================
   CONFIG
   ===================================================== */
const CONFIG = {
  api: {
    history: 'api/sensors/history.php',
    latest: 'api/sensors/latest.php',
    devices: 'api/devices/status.php',
    control: 'api/devices/control.php',
  },
  mqtt: {
    host: window.location.hostname || '172.20.10.12',
    port: 9001,
    username: 'Vinh',
    password: '123456',
    topic: 'home/data',
    clientId: 'dash_' + Math.random().toString(36).slice(2, 9),
    enabled: true,
  },
  chart: {
    maxPoints: 20,
  },
};

/* =====================================================
   STATE
   ===================================================== */
const charts = {};   // { tempHumi, light }
let mqttClient = null;
let mqttConnected = false;
const pendingActions = {};   // { actionId: { deviceId, isOn, checkbox, timeoutId } }
const ACK_TIMEOUT_MS = 5000; // 5s timeout chờ ACK từ ESP32

/* =====================================================
   UTILITY
   ===================================================== */

function updateClock() {
  const el = document.getElementById('headerTime');
  if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
}

/** Parse "2026-08-31 22:11:00" or ISO string → Date */
function parseTS(ts) {
  if (!ts) return new Date();
  if (typeof ts === 'string') return new Date(ts.replace(' ', 'T'));
  return ts instanceof Date ? ts : new Date();
}

/** Trả về chuỗi thời gian địa phương YYYY-MM-DD HH:mm:ss (chuẩn UTC+7 không bị trừ 7 tiếng) */
function getLocalDateTimeString(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDateTime(dtStr) {
  const d = parseTS(dtStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function showToast(msg, type = 'info', ms = 3500) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('hiding'); setTimeout(() => t.remove(), 350); }, ms);
}

function setRealtimeStatus(status, text) {
  const badge = document.getElementById('realtimeBadge');
  if (!badge) return;
  badge.className = 'realtime-badge ' + status;
  badge.querySelector('.pulse-dot').className =
    'pulse-dot ' + (status === 'connected' ? 'active' : status === 'error' ? 'error' : '');
  document.getElementById('realtimeText').textContent = text;
}

/* =====================================================
   SENSOR CARDS
   ===================================================== */

const SENSOR_SCALE = {
  temperature: 100,
  humidity: 100,
  light: 2000,
};

function updateSensorCard(type, value, recordedAt) {
  const map = { temperature: 'temp', humidity: 'humi', light: 'light' };
  const id = map[type];
  if (!id) return;

  const numVal = parseFloat(value) || 0;
  const valEl = document.getElementById(`${id}-value`);
  const metaEl = document.getElementById(`${id}-meta`);
  const barEl = document.getElementById(`${id}-bar`);
  const scaleMax = SENSOR_SCALE[type] || 100;

  if (valEl) {
    valEl.textContent = type === 'light'
      ? Math.round(numVal).toLocaleString('vi-VN')
      : Number(numVal).toFixed(1);
    valEl.classList.remove('value-updated');
    void valEl.offsetWidth;
    valEl.classList.add('value-updated');
  }

  if (barEl) {
    const pct = Math.min(100, Math.max(4, (numVal / scaleMax) * 100));
    barEl.style.width = pct.toFixed(1) + '%';
    barEl.classList.remove('bar-pulse');
    void barEl.offsetWidth;
    barEl.classList.add('bar-pulse');
  }

  if (metaEl && recordedAt) {
    metaEl.textContent = formatDateTime(recordedAt);
  }
}

// Lưu recorded_at mới nhất của từng loại để tránh đẩy điểm trùng
const lastSeen = { temperature: null, humidity: null, light: null };

async function loadLatestSensorData() {
  try {
    const res = await fetchJSON(CONFIG.api.latest);
    if (!res.success) return;
    const d = res.data;
    if (d.temperature) {
      updateSensorCard('temperature', d.temperature.value, d.temperature.recorded_at);
      if (lastSeen.temperature !== d.temperature.recorded_at) {
        lastSeen.temperature = d.temperature.recorded_at;
        pushRealtimePoint('temperature', d.temperature.value, d.temperature.recorded_at);
      }
    }
    if (d.humidity) {
      updateSensorCard('humidity', d.humidity.value, d.humidity.recorded_at);
      if (lastSeen.humidity !== d.humidity.recorded_at) {
        lastSeen.humidity = d.humidity.recorded_at;
        pushRealtimePoint('humidity', d.humidity.value, d.humidity.recorded_at);
      }
    }
    if (d.light) {
      updateSensorCard('light', d.light.value, d.light.recorded_at);
      if (lastSeen.light !== d.light.recorded_at) {
        lastSeen.light = d.light.recorded_at;
        pushRealtimePoint('light', d.light.value, d.light.recorded_at);
      }
    }
  } catch (e) { console.error('loadLatestSensorData:', e); }
}

/* =====================================================
   CHART.JS INITIALIZATION
   ===================================================== */

Chart.defaults.color = '#64748b';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 11;

// Plugin vẽ đường crosshair dọc khi hover
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart.tooltip || !chart.tooltip._active || !chart.tooltip._active.length) return;
    const ctx = chart.ctx;
    const x = chart.tooltip._active[0].element.x;
    const yTop = chart.chartArea.top;
    const yBottom = chart.chartArea.bottom;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    ctx.lineTo(x, yBottom);
    ctx.stroke();
    ctx.restore();
  },
};
Chart.register(crosshairPlugin);

function makeXAxis() {
  return {
    type: 'category', // Equal spacing along the X-axis (Category Scale)
    grid: { display: false },
    border: { display: false },
    ticks: {
      maxTicksLimit: 8,
      autoSkip: true,
      maxRotation: 0,
      color: '#94a3b8',
      font: { family: "'JetBrains Mono', monospace", size: 10 },
      padding: 6,
    },
  };
}

function makeYAxis(unit, color, min = null, max = null) {
  return {
    min: min !== null ? min : undefined,
    max: max !== null ? max : undefined,
    grid: {
      color: 'rgba(0, 0, 0, 0.04)',
      borderDash: [3, 3],
    },
    border: { display: false },
    ticks: {
      color: '#94a3b8',
      font: { family: "'JetBrains Mono', monospace", size: 10 },
      padding: 6,
      callback: (v) => unit === 'Lux' ? v.toLocaleString() : v + (unit === '%' ? '%' : '°'),
    },
    title: {
      display: true,
      text: unit,
      color: color || '#94a3b8',
      font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
      padding: { bottom: 4 },
    },
  };
}

function formatTimeLabel(ts) {
  const d = (ts instanceof Date) ? ts : parseTS(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function makeTooltip(labelFn) {
  return {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    titleColor: '#f8fafc',
    bodyColor: '#e2e8f0',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    padding: { top: 8, bottom: 8, left: 12, right: 12 },
    cornerRadius: 8,
    boxPadding: 4,
    usePointStyle: true,
    titleFont: { family: "'JetBrains Mono', monospace", size: 11 },
    bodyFont: { family: "'Inter', sans-serif", size: 12, weight: '500' },
    callbacks: {
      title: (items) => items[0]?.label || '',
      label: labelFn,
    },
  };
}

function createAreaGradient(ctx, r, g, b, alphaTop = 0.22, alphaBottom = 0.0) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaTop})`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alphaTop * 0.4})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alphaBottom})`);
  return gradient;
}

function initTempHumiChart() {
  const canvas = document.getElementById('chartTempHumi');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const tempGrad = createAreaGradient(ctx, 244, 63, 94, 0.22, 0.0);
  const humiGrad = createAreaGradient(ctx, 14, 165, 233, 0.18, 0.0);

  charts.tempHumi = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Nhiệt độ (°C)',
          data: [],
          borderColor: '#f43f5e',
          backgroundColor: tempGrad,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#f43f5e',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#f43f5e',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2.5,
          tension: 0.38,
          fill: true,
        },
        {
          label: 'Độ ẩm (%)',
          data: [],
          borderColor: '#0ea5e9',
          backgroundColor: humiGrad,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#0ea5e9',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#0ea5e9',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2.5,
          tension: 0.38,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350, easing: 'easeOutQuad' },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, right: 16, bottom: 2, left: 2 } },
      plugins: {
        legend: { display: false },
        tooltip: makeTooltip((item) => {
          if (item.datasetIndex === 0) return ` Nhiệt độ: ${item.parsed.y.toFixed(1)} °C`;
          return ` Độ ẩm: ${item.parsed.y.toFixed(1)} %`;
        }),
      },
      scales: {
        x: makeXAxis(),
        y: makeYAxis('°C / %', '#64748b', 0, 100),
      },
    },
  });
}

function initLightChart() {
  const canvas = document.getElementById('chartLight');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const lightGrad = createAreaGradient(ctx, 245, 158, 11, 0.24, 0.00);

  charts.light = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Ánh sáng (Lux)',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: lightGrad,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f59e0b',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2.5,
        tension: 0.38,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350, easing: 'easeOutQuad' },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 8, right: 16, bottom: 2, left: 2 } },
      plugins: {
        legend: { display: false },
        tooltip: makeTooltip((i) => ` Ánh sáng: ${Math.round(i.parsed.y).toLocaleString('vi-VN')} Lux`),
      },
      scales: {
        x: makeXAxis(),
        y: makeYAxis('Lux', '#d97706', 0, 4095),
      },
    },
  });
}

/* =====================================================
   CHART.JS — SLIDING WINDOW (FIFO, Size 20, Category Scale)
   ===================================================== */

/**
 * Cập nhật điểm realtime vào biểu đồ theo cơ chế Sliding Window FIFO:
 * - Equal Spacing: Dùng Category Scale (labels mảng string thời gian + datasets data mảng số)
 * - Size 20: Tối đa 20 điểm. Điểm mới push vào cuối, vượt quá 20 thì shift điểm cũ nhất ở đầu.
 * - Smooth Update: Cập nhật hiệu ứng chuyển động mượt mà.
 */
function pushRealtimePoint(type, value, timestamp) {
  if (value === null || value === undefined || isNaN(value)) return;
  const numVal = Number(value);

  if (type === 'temperature' && charts.tempHumi) {
    updateTempHumiFifo(0, numVal, timestamp);
  } else if (type === 'humidity' && charts.tempHumi) {
    updateTempHumiFifo(1, numVal, timestamp);
  } else if (type === 'light' && charts.light) {
    updateLightFifo(numVal, timestamp);
  }
}

/**
 * Cập nhật FIFO cho biểu đồ Light Intensity (1 dataset)
 */
function updateLightFifo(value, timestamp) {
  if (!charts.light) return;
  const label = formatTimeLabel(timestamp);
  const labels = charts.light.data.labels;
  const ds = charts.light.data.datasets[0];

  labels.push(label);
  ds.data.push(value);

  while (labels.length > CONFIG.chart.maxPoints) {
    labels.shift();
    ds.data.shift();
  }

  charts.light.update();
}

/**
 * Cập nhật FIFO cho biểu đồ Temperature & Humidity (2 datasets dùng chung trục hoành Category)
 */
function updateTempHumiFifo(dsIdx, value, timestamp) {
  if (!charts.tempHumi) return;
  const label = formatTimeLabel(timestamp);
  const labels = charts.tempHumi.data.labels;
  const dsTemp = charts.tempHumi.data.datasets[0];
  const dsHumi = charts.tempHumi.data.datasets[1];

  const lastLabel = labels[labels.length - 1];
  if (lastLabel === label && labels.length > 0) {
    if (dsIdx === 0) dsTemp.data[dsTemp.data.length - 1] = value;
    if (dsIdx === 1) dsHumi.data[dsHumi.data.length - 1] = value;
  } else {
    // Mốc thời gian mới: Đẩy label mới và đồng bộ 2 datasets
    labels.push(label);
    if (dsIdx === 0) {
      dsTemp.data.push(value);
      const prevHumi = dsHumi.data[dsHumi.data.length - 1] ?? value;
      if (dsHumi.data.length < labels.length) dsHumi.data.push(prevHumi);
    } else {
      dsHumi.data.push(value);
      const prevTemp = dsTemp.data[dsTemp.data.length - 1] ?? value;
      if (dsTemp.data.length < labels.length) dsTemp.data.push(prevTemp);
    }
  }

  // FIFO Cửa sổ trượt 20 điểm: Bỏ điểm cũ nhất ở đầu
  while (labels.length > CONFIG.chart.maxPoints) {
    labels.shift();
    dsTemp.data.shift();
    dsHumi.data.shift();
  }

  charts.tempHumi.update();
}

/**
 * Load dữ liệu lịch sử ban đầu cho biểu đồ (20 điểm gần nhất từ database, sắp xếp cũ -> mới)
 */
async function loadRecentChartHistory() {
  try {
    let [resTemp, resHumi, resLight] = await Promise.all([
      fetchJSON(`${CONFIG.api.history}?sensorId=1&limit=${CONFIG.chart.maxPoints}&sort=recorded_at&order=DESC`),
      fetchJSON(`${CONFIG.api.history}?sensorId=2&limit=${CONFIG.chart.maxPoints}&sort=recorded_at&order=DESC`),
      fetchJSON(`${CONFIG.api.history}?sensorId=3&limit=${CONFIG.chart.maxPoints}&sort=recorded_at&order=DESC`),
    ]);

    // Fallback nếu sensorId không khớp
    if ((!resTemp?.data || resTemp.data.length === 0) ||
      (!resHumi?.data || resHumi.data.length === 0) ||
      (!resLight?.data || resLight.data.length === 0)) {
      const [fTemp, fHumi, fLight] = await Promise.all([
        fetchJSON(`${CONFIG.api.history}?keyword=temperature&limit=${CONFIG.chart.maxPoints}&sort=recorded_at&order=DESC`),
        fetchJSON(`${CONFIG.api.history}?keyword=humidity&limit=${CONFIG.chart.maxPoints}&sort=recorded_at&order=DESC`),
        fetchJSON(`${CONFIG.api.history}?keyword=light&limit=${CONFIG.chart.maxPoints}&sort=recorded_at&order=DESC`),
      ]);
      if (!resTemp?.data?.length && fTemp?.data?.length) resTemp = fTemp;
      if (!resHumi?.data?.length && fHumi?.data?.length) resHumi = fHumi;
      if (!resLight?.data?.length && fLight?.data?.length) resLight = fLight;
    }

    // 1. Khởi tạo biểu đồ Temperature & Humidity (Sắp xếp theo thứ tự thời gian cũ -> mới)
    if (charts.tempHumi) {
      const rowsTemp = (resTemp?.data || []).slice()
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .slice(-CONFIG.chart.maxPoints);

      const rowsHumi = (resHumi?.data || []).slice()
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .slice(-CONFIG.chart.maxPoints);

      const baseRows = rowsTemp.length >= rowsHumi.length ? rowsTemp : rowsHumi;
      charts.tempHumi.data.labels = baseRows.map(r => formatTimeLabel(r.recorded_at));
      charts.tempHumi.data.datasets[0].data = rowsTemp.map(r => Number(r.value));
      charts.tempHumi.data.datasets[1].data = rowsHumi.map(r => Number(r.value));

      if (rowsTemp.length > 0) lastSeen.temperature = rowsTemp[rowsTemp.length - 1].recorded_at;
      if (rowsHumi.length > 0) lastSeen.humidity = rowsHumi[rowsHumi.length - 1].recorded_at;

      charts.tempHumi.update();
    }

    // 2. Khởi tạo biểu đồ Light (Sắp xếp theo thứ tự thời gian cũ -> mới)
    if (charts.light) {
      const rowsLight = (resLight?.data || []).slice()
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
        .slice(-CONFIG.chart.maxPoints);

      charts.light.data.labels = rowsLight.map(r => formatTimeLabel(r.recorded_at));
      charts.light.data.datasets[0].data = rowsLight.map(r => Number(r.value));

      if (rowsLight.length > 0) lastSeen.light = rowsLight[rowsLight.length - 1].recorded_at;

      charts.light.update();
    }
  } catch (e) {
    console.error('loadRecentChartHistory:', e);
  }
}

/* =====================================================
   DEVICE WIDGET
   ===================================================== */

const DEVICE_ICONS = {
  'điều hòa': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M9 12h6M7 17l-2 4M17 17l2 4"/></svg>`,
  'ac': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M9 12h6M7 17l-2 4M17 17l2 4"/></svg>`,
  'quạt': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2a4 4 0 0 1 4 4c0 2-4 4-4 8a4 4 0 0 1-4-4c0-2 4-4 4-8z"/></svg>`,
  'fan': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2a4 4 0 0 1 4 4c0 2-4 4-4 8a4 4 0 0 1-4-4c0-2 4-4 4-8z"/></svg>`,
  'led': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>`,
  'default': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>`,
};
function getDeviceIcon(name = '') {
  const n = name.toLowerCase();
  for (const k of Object.keys(DEVICE_ICONS))
    if (k !== 'default' && n.includes(k)) return DEVICE_ICONS[k];
  return DEVICE_ICONS.default;
}

function updateActiveCountBadge(total) {
  const badge = document.getElementById('deviceCountBadge');
  if (!badge) return;
  const checkboxes = document.querySelectorAll('#deviceList input[type="checkbox"]');
  const count = Array.from(checkboxes).filter(cb => cb.checked).length;
  const tot = total !== undefined ? total : checkboxes.length;
  badge.textContent = `${count}/${tot} Đang bật`;
}

function setDeviceWaitingState(deviceId, isWaiting) {
  const item = document.getElementById(`device-${deviceId}`);
  const st = document.getElementById(`device-status-${deviceId}`);
  if (item) {
    if (isWaiting) item.classList.add('is-waiting');
    else item.classList.remove('is-waiting');
  }
  if (st && isWaiting) {
    st.className = 'device-status-pill pill-pending';
    st.innerHTML = '<span class="device-status-dot pulse-wait"></span><span class="device-status-text">ĐANG CHỜ...</span>';
  }
}

function renderDeviceList(devices) {
  const list = document.getElementById('deviceList');
  const empty = document.getElementById('deviceEmpty');
  if (!devices || !devices.length) {
    if (list) list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    updateActiveCountBadge(0);
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = devices.map(dev => {
    const isPending = !!dev.is_pending;
    const on = isPending ? (dev.pending_action === 'on') : (dev.status === 'on');
    const devNameLower = (dev.name || '').toLowerCase();
    let typeClass = 'dev-generic';
    if (devNameLower.includes('quạt') || devNameLower.includes('fan')) typeClass = 'dev-fan';
    else if (devNameLower.includes('led') || devNameLower.includes('đèn') || devNameLower.includes('light')) typeClass = 'dev-led';
    else if (devNameLower.includes('điều hòa') || devNameLower.includes('ac')) typeClass = 'dev-ac';

    const pillClass = on ? 'pill-on' : 'pill-off';
    const text = on ? 'BẬT' : 'TẮT';

    return `<div class="device-item ${on ? 'active' : ''} ${typeClass} ${isPending ? 'is-waiting' : ''}" id="device-${dev.id}">
      <div class="device-info">
        <div class="device-icon-wrap" id="device-icon-${dev.id}">${getDeviceIcon(dev.name)}</div>
        <div class="device-meta-group">
          <div class="device-name">${dev.name}</div>
          <div class="device-status-pill ${pillClass}" id="device-status-${dev.id}">
            <span class="device-status-dot"></span>
            <span class="device-status-text">${text}</span>
          </div>
        </div>
      </div>
      <label class="toggle-switch" aria-label="Toggle ${dev.name}">
        <input type="checkbox" id="toggle-${dev.id}" ${on ? 'checked' : ''} ${isPending ? 'disabled' : ''}
               data-device-id="${dev.id}" data-device-name="${dev.name}"
               onchange="handleDeviceToggle(this)"/>
        <span class="toggle-label"></span>
      </label>
    </div>`;
  }).join('');

  updateActiveCountBadge(devices.length);
}

async function loadDeviceStatus() {
  try {
    const res = await fetchJSON(CONFIG.api.devices);
    if (!res.success || !res.data?.length) {
      renderDeviceList([]);
      return;
    }
    renderDeviceList(res.data);
  } catch (e) {
    console.warn('loadDeviceStatus fallback to default devices:', e);
    // Dự phòng chế độ HTML & Javascript khi API offline
    renderDeviceList([
      { id: 1, name: 'Đèn LED', status: 'off', is_pending: false },
      { id: 2, name: 'Quạt điện', status: 'off', is_pending: false },
      { id: 3, name: 'Điều hòa', status: 'off', is_pending: false },
    ]);
  }
}

async function handleDeviceToggle(checkbox) {
  const id = checkbox.dataset.deviceId;
  const name = checkbox.dataset.deviceName;
  const isOn = checkbox.checked;
  const action = isOn ? 'TURN_ON' : 'TURN_OFF';

  checkbox.disabled = true;
  const st = document.getElementById(`device-status-${id}`);
  const item = document.getElementById(`device-${id}`);

  setDeviceWaitingState(id, true);

  try {
    const ctrlRes = await fetch(CONFIG.api.control, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: +id, action }),
    });
    const ctrlData = await ctrlRes.json();

    if (!ctrlData.success) {

      setDeviceWaitingState(id, false);
      checkbox.checked = !isOn;
      checkbox.disabled = false;
      showToast(`Lỗi: ${ctrlData.message}`, 'error');
      if (item) item.classList.toggle('active', !isOn);
      if (st) {
        st.className = `device-status-pill ${!isOn ? 'pill-on' : 'pill-off'}`;
        st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${!isOn ? 'BẬT' : 'TẮT'}</span>`;
      }
      return;
    }

    const actionId = ctrlData.actionId;

    const timeoutId = setTimeout(async () => {

      if (!pendingActions[actionId]) return;
      delete pendingActions[actionId];

      setDeviceWaitingState(id, false);
      checkbox.checked = !isOn;
      checkbox.disabled = false;
      if (item) item.classList.toggle('active', !isOn);
      if (st) {
        st.className = `device-status-pill ${!isOn ? 'pill-on' : 'pill-off'}`;
        st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${!isOn ? 'BẬT' : 'TẮT'}</span>`;
      }
      showToast(`${name}: Không nhận được phản hồi từ thiết bị (quá thời gian)`, 'error');
      updateActiveCountBadge();
    }, ACK_TIMEOUT_MS);

    pendingActions[actionId] = {
      deviceId: id,
      isOn: isOn,
      checkbox: checkbox,
      timeoutId: timeoutId,
    };

    // Khi không kết nối MQTT realtime (chế độ demo HTML/JS), tự động xác nhận sau 1.2s icon xoay tròn
    if (!mqttConnected) {
      setTimeout(() => {
        if (!pendingActions[actionId]) return;
        clearTimeout(timeoutId);
        delete pendingActions[actionId];
        setDeviceWaitingState(id, false);
        checkbox.checked = isOn;
        checkbox.disabled = false;
        if (item) item.classList.toggle('active', isOn);
        if (st) {
          st.className = `device-status-pill ${isOn ? 'pill-on' : 'pill-off'}`;
          st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${isOn ? 'BẬT' : 'TẮT'}</span>`;
        }
        showToast(`${name}: ${isOn ? 'Đã bật thành công ✓' : 'Đã tắt thành công ✓'}`, 'success');
        updateActiveCountBadge();
      }, 1200);
    } else {
      showToast(`${name}: Đã gửi lệnh, đang chờ thiết bị phản hồi...`, 'info', 2500);
    }

  } catch (e) {
    // Chế độ HTML & JS thuần (không có backend): Icon xoay tròn chờ lệnh 1.2s rồi hoàn tất thành công
    console.warn('Backend control offline, running HTML/JS simulated response:', e);
    setTimeout(() => {
      setDeviceWaitingState(id, false);
      checkbox.checked = isOn;
      checkbox.disabled = false;
      if (item) item.classList.toggle('active', isOn);
      if (st) {
        st.className = `device-status-pill ${isOn ? 'pill-on' : 'pill-off'}`;
        st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${isOn ? 'BẬT' : 'TẮT'}</span>`;
      }
      showToast(`${name}: ${isOn ? 'Đã bật thành công ✓' : 'Đã tắt thành công ✓'}`, 'success');
      updateActiveCountBadge();
    }, 1200);
  }
}

async function toggleAllDevices(turnOn) {
  const checkboxes = Array.from(document.querySelectorAll('#deviceList input[type="checkbox"]'));
  const targets = checkboxes.filter(cb => cb.checked !== turnOn);
  if (targets.length === 0) {
    showToast(`Tất cả thiết bị đều đã được ${turnOn ? 'BẬT' : 'TẮT'}.`, 'info');
    return;
  }
  showToast(`Đang chuyển trạng thái ${targets.length} thiết bị sang ${turnOn ? 'BẬT' : 'TẮT'}...`, 'info', 2000);
  for (const cb of targets) {
    cb.checked = turnOn;
    await handleDeviceToggle(cb);
  }
}

/* =====================================================
   MQTT REALTIME
   ===================================================== */

function initMQTT() {
  if (!CONFIG.mqtt.enabled || typeof Paho === 'undefined') {
    setRealtimeStatus('error', 'Đã tắt MQTT');
    return;
  }
  try {
    mqttClient = new Paho.MQTT.Client(CONFIG.mqtt.host, CONFIG.mqtt.port, CONFIG.mqtt.clientId);
    mqttClient.onConnectionLost = () => {
      mqttConnected = false;
      setRealtimeStatus('error', 'Mất kết nối MQTT');
      setTimeout(connectMQTT, 5000);
    };
    mqttClient.onMessageArrived = msg => onMQTTMessage(msg.destinationName, msg.payloadString);
    connectMQTT();
  } catch (e) {
    console.error('initMQTT error:', e);
    setRealtimeStatus('error', 'Lỗi kết nối MQTT');
  }
}

function connectMQTT() {
  if (!mqttClient) return;
  const connectOptions = {
    onSuccess: () => {
      mqttConnected = true;
      setRealtimeStatus('connected', 'Đã kết nối MQTT');
      mqttClient.subscribe(CONFIG.mqtt.topic);
      mqttClient.subscribe('home/data');
      mqttClient.subscribe('home/ack');
    },
    onFailure: () => {
      mqttConnected = false;
      setRealtimeStatus('error', 'Mất kết nối MQTT');
      setTimeout(connectMQTT, 5000);
    },
    timeout: 5,
  };
  if (CONFIG.mqtt.username) {
    connectOptions.userName = CONFIG.mqtt.username;
    connectOptions.password = CONFIG.mqtt.password;
  }
  mqttClient.connect(connectOptions);
}

function onMQTTMessage(topic, payload) {
  try {
    const d = JSON.parse(payload);

    // Route theo topic
    if (topic === 'home/ack') {
      onDeviceAck(d);
      return;
    }

    // home/data — xử lý dữ liệu cảm biến
    // Sử dụng timestamp từ payload hoặc giờ local hiện tại (UTC+7, không dùng toISOString để tránh bị trừ 7 tiếng)
    const ts = d.timestamp || getLocalDateTimeString(new Date());
    const temp = d.temp != null ? d.temp : d.temperature;
    const humi = d.humidity;
    const light = d.lux != null ? d.lux : d.light;

    if (temp != null) {
      updateSensorCard('temperature', temp, ts);
      if (lastSeen.temperature !== ts) { lastSeen.temperature = ts; pushRealtimePoint('temperature', temp, ts); }
    }
    if (humi != null) {
      updateSensorCard('humidity', humi, ts);
      if (lastSeen.humidity !== ts) { lastSeen.humidity = ts; pushRealtimePoint('humidity', humi, ts); }
    }
    if (light != null) {
      updateSensorCard('light', light, ts);
      if (lastSeen.light !== ts) { lastSeen.light = ts; pushRealtimePoint('light', light, ts); }
    }
  } catch (e) { console.error('MQTT parse:', e); }
}

/**
 * Xử lý ACK từ ESP32 qua MQTT topic 'home/ack'
 * ACK format: { actionId, deviceId, status: 'SUCCESS'|'FAILED', state: 'ON'|'OFF' }
 */
function onDeviceAck(ack) {
  const actionId = ack.actionId;
  const deviceId = ack.deviceId;
  const status = (ack.status || '').toUpperCase();
  const state = (ack.state || ack.action || '').toUpperCase();

  console.log(`[ACK] actionId=${actionId}, deviceId=${deviceId}, status=${status}, state=${state}`);

  const pending = pendingActions[actionId];

  if (pending) {
    if (pending.timeoutId) clearTimeout(pending.timeoutId);
    delete pendingActions[actionId];

    const checkbox = pending.checkbox;
    const id = pending.deviceId;
    const name = checkbox?.dataset?.deviceName || `Device #${id}`;
    const st = document.getElementById(`device-status-${id}`);
    const item = document.getElementById(`device-${id}`);

    setDeviceWaitingState(id, false);

    if (status === 'SUCCESS') {
      const isOn = ['ON', 'TURN_ON', '1'].includes(state);
      if (checkbox) {
        checkbox.checked = isOn;
        checkbox.disabled = false;
      }
      if (item) item.classList.toggle('active', isOn);
      if (st) {
        st.className = `device-status-pill ${isOn ? 'pill-on' : 'pill-off'}`;
        st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${isOn ? 'BẬT' : 'TẮT'}</span>`;
      }
      showToast(`${name}: ${isOn ? 'Đã bật thành công ✓' : 'Đã tắt thành công ✓'}`, 'success');
    } else {
      const revertOn = !pending.isOn;
      if (checkbox) {
        checkbox.checked = revertOn;
        checkbox.disabled = false;
      }
      if (item) item.classList.toggle('active', revertOn);
      if (st) {
        st.className = `device-status-pill ${revertOn ? 'pill-on' : 'pill-off'}`;
        st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${revertOn ? 'BẬT' : 'TẮT'}</span>`;
      }
      showToast(`${name}: Điều khiển THẤT BẠI ✗`, 'error');
    }
    updateActiveCountBadge();
  } else {
    // Không tìm thấy pending action — vẫn cập nhật UI theo deviceId
    if (deviceId) {
      setDeviceWaitingState(deviceId, false);
      if (status === 'SUCCESS') {
        const isOn = ['ON', 'TURN_ON', '1'].includes(state);
        const cb = document.getElementById(`toggle-${deviceId}`);
        const st = document.getElementById(`device-status-${deviceId}`);
        const item = document.getElementById(`device-${deviceId}`);

        if (cb) {
          cb.checked = isOn;
          cb.disabled = false;
        }
        if (item) item.classList.toggle('active', isOn);
        if (st) {
          st.className = `device-status-pill ${isOn ? 'pill-on' : 'pill-off'}`;
          st.innerHTML = `<span class="device-status-dot"></span><span class="device-status-text">${isOn ? 'BẬT' : 'TẮT'}</span>`;
        }
        updateActiveCountBadge();
      }
    }
  }
}

/* =====================================================
   SIDEBAR TOGGLE
   ===================================================== */
function bindSidebarToggle() {
  const btn = document.getElementById('sidebarToggle');
  const side = document.getElementById('sidebar');
  if (!btn || !side) return;
  btn.addEventListener('click', () => side.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!side.contains(e.target) && !btn.contains(e.target)) side.classList.remove('open');
  });
}

/* =====================================================
   INIT
   ===================================================== */
async function init() {
  updateClock();
  setInterval(updateClock, 1000);
  bindSidebarToggle();

  initTempHumiChart();
  initLightChart();

  await loadRecentChartHistory();

  await loadLatestSensorData();
  await loadDeviceStatus();

  setRealtimeStatus('connected', 'Đang kết nối...');
  initMQTT();
}

window.handleDeviceToggle = handleDeviceToggle;
window.toggleAllDevices = toggleAllDevices;
document.addEventListener('DOMContentLoaded', init);

// Tự động đồng bộ lại trạng thái thiết bị chuẩn xác từ server khi chuyển tab quay lại hoặc dùng nút Back
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadDeviceStatus();
  }
});
window.addEventListener('pageshow', () => {
  loadDeviceStatus();
});
