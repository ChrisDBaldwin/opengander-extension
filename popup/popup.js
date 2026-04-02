/**
 * popup/popup.js — Extension popup logic.
 */

const activeCountEl = document.getElementById('active-count');
const completedCountEl = document.getElementById('completed-count');
const sessionsList = document.getElementById('sessions-list');
const exporterSelect = document.getElementById('exporter-select');
const otlpSettings = document.getElementById('otlp-settings');
const emptyState = document.getElementById('empty-state');
const mainContent = document.getElementById('main-content');
const mydataList = document.getElementById('mydata-list');
const mydataDetail = document.getElementById('mydata-detail');

// All sessions (cached for My Data tab)
let allSessions = [];

function showMainContent() {
  emptyState.style.display = 'none';
  mainContent.style.display = 'block';
}

function showEmptyState() {
  emptyState.style.display = 'block';
  mainContent.style.display = 'none';
}

// Tab switching
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

    if (tab.dataset.tab === 'mydata') {
      renderMyData();
    }
  });
});

// Load status and sessions, then decide which view to show
let activeSessions = 0;
let completedSessions = 0;

chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  if (response) {
    activeSessions = response.activeSessions || 0;
    activeCountEl.textContent = activeSessions;
  }
  checkState();
});

chrome.runtime.sendMessage({ action: 'getSessions' }, (response) => {
  if (!response || !response.sessions) {
    completedSessions = 0;
    completedCountEl.textContent = '0';
    checkState();
    return;
  }

  allSessions = response.sessions;
  completedSessions = allSessions.length;
  completedCountEl.textContent = completedSessions;

  if (completedSessions > 0) {
    sessionsList.innerHTML = '';
    const sorted = [...allSessions].sort((a, b) => b.start_time - a.start_time);

    for (const session of sorted.slice(0, 10)) {
      const div = document.createElement('div');
      div.className = 'session';
      const date = new Date(session.start_time);
      const duration = session.duration_ms >= 1000
        ? Math.round(session.duration_ms / 1000) + 's'
        : session.duration_ms + 'ms';
      div.innerHTML = `
        <div><strong class="session-service"></strong></div>
        <div class="session-id"></div>
        <div class="session-meta">
          <span class="session-pages"></span>
          <span class="session-duration"></span>
          <span class="session-date"></span>
        </div>
      `;
      div.querySelector('.session-service').textContent = session.service_name || 'unknown';
      div.querySelector('.session-id').textContent = session.session_id.substring(0, 16) + '...';
      div.querySelector('.session-pages').textContent = session.step_count + ' pages';
      div.querySelector('.session-duration').textContent = duration;
      div.querySelector('.session-date').textContent = date.toLocaleDateString();
      sessionsList.appendChild(div);
    }
  }

  checkState();
});

function checkState() {
  if (activeSessions > 0 || completedSessions > 0) {
    showMainContent();
  } else {
    showEmptyState();
  }
}

// Storage usage
const storageUsageEl = document.getElementById('storage-usage');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function updateStorageUsage() {
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then((estimate) => {
      if (storageUsageEl) {
        storageUsageEl.textContent = formatBytes(estimate.usage || 0);
      }
    });
  } else if (storageUsageEl) {
    storageUsageEl.textContent = 'N/A';
  }
}

updateStorageUsage();

// Ring preferences
const defaultRings = { traffic: 'always', interaction: 'ask', identity: 'never' };
const ringSelects = document.querySelectorAll('[data-ring]');

chrome.storage.local.get(['ringPreferences'], (result) => {
  const prefs = result.ringPreferences || defaultRings;
  ringSelects.forEach((select) => {
    select.value = prefs[select.dataset.ring] || defaultRings[select.dataset.ring];
  });
});

ringSelects.forEach((select) => {
  select.addEventListener('change', () => {
    chrome.storage.local.get(['ringPreferences'], (result) => {
      const prefs = result.ringPreferences || { ...defaultRings };
      prefs[select.dataset.ring] = select.value;
      chrome.storage.local.set({ ringPreferences: prefs });
    });
  });
});

// Load exporters
chrome.runtime.sendMessage({ action: 'getExporters' }, (response) => {
  if (!response || !response.exporters) return;
  exporterSelect.innerHTML = '';

  for (const exporter of response.exporters) {
    const option = document.createElement('option');
    option.value = exporter.id;
    option.textContent = exporter.name;
    exporterSelect.appendChild(option);
  }

  chrome.storage.local.get(['selectedExporter'], (result) => {
    if (result.selectedExporter) {
      exporterSelect.value = result.selectedExporter;
      toggleOtlpSettings();
    }
  });
});

exporterSelect.addEventListener('change', () => {
  chrome.storage.local.set({ selectedExporter: exporterSelect.value });
  toggleOtlpSettings();
});

function toggleOtlpSettings() {
  otlpSettings.style.display = exporterSelect.value === 'otlp-http' ? 'block' : 'none';

  if (exporterSelect.value === 'otlp-http') {
    chrome.storage.local.get(['otlpEndpoint'], (result) => {
      if (result.otlpEndpoint) {
        document.getElementById('otlp-endpoint').value = result.otlpEndpoint;
      }
    });
  }
}

function saveOtlpSettings() {
  const endpoint = document.getElementById('otlp-endpoint').value;
  chrome.storage.local.set({ otlpEndpoint: endpoint });

  chrome.runtime.sendMessage({
    action: 'configureExporter',
    exporterId: 'otlp-http',
    options: { endpoint }
  });
}

// Clear All Data
const clearBtn = document.getElementById('clear-btn');
const clearConfirm = document.getElementById('clear-confirm');
const clearYes = document.getElementById('clear-yes');
const clearCancel = document.getElementById('clear-cancel');

clearBtn.addEventListener('click', () => {
  clearConfirm.style.display = 'block';
  clearBtn.style.display = 'none';
});

clearCancel.addEventListener('click', () => {
  clearConfirm.style.display = 'none';
  clearBtn.style.display = 'block';
});

clearYes.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearAllData' }, () => {
    activeSessions = 0;
    completedSessions = 0;
    allSessions = [];
    showEmptyState();
    updateStorageUsage();
  });
});

function exportAll() {
  const exporterId = exporterSelect.value;
  chrome.runtime.sendMessage({ action: 'exportAll', exporterId }, (result) => {
    if (result && result.exported > 0) {
      alert(`Exported ${result.exported} sessions`);
    } else if (result && result.errors && result.errors.length > 0) {
      alert(`Export failed: ${result.errors.join(', ')}`);
    } else {
      alert('No sessions to export');
    }
  });
}

// ── My Data Tab ──────────────────────────────────────────────────────

function groupSessionsBySite(sessions) {
  const sites = {};
  for (const session of sessions) {
    const name = session.service_name || 'unknown';
    if (!sites[name]) {
      sites[name] = { service_name: name, sessions: [], totalSpans: 0, firstSeen: Infinity, lastSeen: 0 };
    }
    sites[name].sessions.push(session);
    sites[name].totalSpans += session.step_count || 0;
    if (session.start_time < sites[name].firstSeen) sites[name].firstSeen = session.start_time;
    if (session.start_time > sites[name].lastSeen) sites[name].lastSeen = session.start_time;
  }
  return Object.values(sites).sort((a, b) => b.lastSeen - a.lastSeen);
}

function renderMyData() {
  mydataList.style.display = 'block';
  mydataDetail.style.display = 'none';

  const sites = groupSessionsBySite(allSessions);
  mydataList.innerHTML = '';

  if (sites.length === 0) {
    mydataList.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 16px;">No site data yet</div>';
    return;
  }

  for (const site of sites) {
    const div = document.createElement('div');
    div.className = 'site-item';
    div.innerHTML = `
      <div class="site-name"></div>
      <div class="site-stats">
        <span class="site-sessions"></span>
        <span class="site-pages"></span>
      </div>
      <div class="site-dates"></div>
    `;
    div.querySelector('.site-name').textContent = site.service_name;
    div.querySelector('.site-sessions').textContent = site.sessions.length + ' sessions';
    div.querySelector('.site-pages').textContent = site.totalSpans + ' pages';
    div.querySelector('.site-dates').textContent =
      new Date(site.firstSeen).toLocaleDateString() + ' — ' + new Date(site.lastSeen).toLocaleDateString();
    div.addEventListener('click', () => renderSiteDetail(site));
    mydataList.appendChild(div);
  }
}

function renderSiteDetail(site) {
  mydataList.style.display = 'none';
  mydataDetail.style.display = 'block';
  mydataDetail.innerHTML = '';

  const sorted = [...site.sessions].sort((a, b) => b.start_time - a.start_time);

  const backBtn = document.createElement('button');
  backBtn.className = 'detail-back';
  backBtn.id = 'back-to-sites';
  backBtn.innerHTML = '&larr; All sites';
  backBtn.addEventListener('click', renderMyData);
  mydataDetail.appendChild(backBtn);

  const header = document.createElement('div');
  header.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 8px;';
  header.textContent = site.service_name;
  mydataDetail.appendChild(header);

  for (const session of sorted) {
    const date = new Date(session.start_time);
    const duration = session.duration_ms >= 1000
      ? Math.round(session.duration_ms / 1000) + 's'
      : session.duration_ms + 'ms';
    const rings = (session.consent_rings_observed || []).join(', ') || '-';

    const div = document.createElement('div');
    div.className = 'session';
    div.innerHTML = `
      <div class="session-id"></div>
      <div class="session-meta">
        <span class="detail-pages"></span>
        <span class="detail-duration"></span>
        <span class="detail-date"></span>
      </div>
      <div class="session-meta">
        <span class="detail-rings"></span>
        <span class="detail-consent"></span>
      </div>
    `;
    div.querySelector('.session-id').textContent = session.session_id.substring(0, 16) + '...';
    div.querySelector('.detail-pages').textContent = session.step_count + ' pages';
    div.querySelector('.detail-duration').textContent = duration;
    div.querySelector('.detail-date').textContent = date.toLocaleDateString();
    div.querySelector('.detail-rings').textContent = 'Rings: ' + rings;
    div.querySelector('.detail-consent').textContent = session.consent_status || '-';
    mydataDetail.appendChild(div);
  }
}

// ── CSV Export ────────────────────────────────────────────────────────

document.getElementById('export-csv-btn').addEventListener('click', () => {
  if (allSessions.length === 0) {
    alert('No sessions to export');
    return;
  }

  const headers = [
    'session_id', 'service_name', 'start_time', 'end_time', 'duration_ms',
    'step_count', 'entry_page', 'exit_page', 'traffic_source', 'traffic_medium',
    'consent_status', 'consent_rings'
  ];

  const rows = allSessions.map(s => [
    s.session_id,
    s.service_name || '',
    s.start_time ? new Date(s.start_time).toISOString() : '',
    s.end_time ? new Date(s.end_time).toISOString() : '',
    s.duration_ms || 0,
    s.step_count || 0,
    s.entry_page || '',
    s.exit_page || '',
    s.traffic_source || '',
    s.traffic_medium || '',
    s.consent_status || '',
    (s.consent_rings_observed || []).join(';')
  ]);

  let csv = headers.join(',') + '\n';
  for (const row of rows) {
    csv += row.map(v => {
      const str = String(v);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? '"' + str.replace(/"/g, '""') + '"'
        : str;
    }).join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url: url,
    filename: 'opengander-sessions.csv',
    saveAs: true
  });
});
