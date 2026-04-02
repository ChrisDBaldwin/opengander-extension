/**
 * options/options.js — Options page logic.
 */

const defaultRings = { traffic: 'always', interaction: 'ask', identity: 'never' };

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// OTLP endpoint
const otlpInput = document.getElementById('otlp-endpoint');
const saveOtlpBtn = document.getElementById('save-otlp');

chrome.storage.local.get(['otlpEndpoint'], (result) => {
  if (result.otlpEndpoint) otlpInput.value = result.otlpEndpoint;
});

saveOtlpBtn.addEventListener('click', () => {
  chrome.storage.local.set({ otlpEndpoint: otlpInput.value });
  chrome.runtime.sendMessage({
    action: 'configureExporter',
    exporterId: 'otlp-http',
    options: { endpoint: otlpInput.value }
  });
  showToast('Endpoint saved');
});

// Data retention
const retentionSelect = document.getElementById('retention');

chrome.storage.local.get(['retentionDays'], (result) => {
  if (result.retentionDays !== undefined) {
    retentionSelect.value = String(result.retentionDays);
  }
});

retentionSelect.addEventListener('change', () => {
  chrome.storage.local.set({ retentionDays: parseInt(retentionSelect.value, 10) });
  showToast('Retention setting saved');
});

// Ring preferences
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
      showToast('Ring preference saved');
    });
  });
});

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
  chrome.runtime.sendMessage({ action: 'clearAllData' }, (response) => {
    clearConfirm.style.display = 'none';
    clearBtn.style.display = 'block';
    if (response && response.success) {
      showToast('All data cleared');
    } else {
      showToast('Failed to clear data');
    }
  });
});
