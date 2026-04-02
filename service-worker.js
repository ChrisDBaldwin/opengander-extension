/**
 * service-worker.js — Extension background.
 * Receives spans from content scripts, stores in IndexedDB,
 * runs session synthesis on timeout.
 *
 * Chrome loads this as a service worker (importScripts for deps).
 * Firefox loads all scripts via manifest "scripts" array (deps already available).
 */

try {
  importScripts(
    './lib/db.js',
    './lib/synthesizer.js',
    './lib/exporters/base.js',
    './lib/exporters/json-file.js',
    './lib/exporters/otlp-http.js',
    './lib/exporters/index.js'
  );
} catch (e) {
  // Firefox background scripts mode — files already loaded via manifest
}

const { storeSpan, getAllSessions, deleteSpansForSession, deleteSession, clearAllData, extractSessionId } = self.ContactDB;
const { SessionTracker } = self.ContactSynthesizer;
const exporterRegistry = self.exporterRegistry;

const tracker = new SessionTracker();

// Update badge with active session count
function updateBadge() {
  const count = tracker.activeCount;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' });
  chrome.action.setBadgeTextColor({ color: '#1F2937' });
}

// Log session closures and update badge
tracker.onSessionClosed = (session) => {
  console.log('[Contact Agent] Session closed:', session.session_id,
    'steps:', session.step_count,
    'duration:', session.duration_ms + 'ms',
    'reason:', session.termination_reason);
  updateBadge();
};

// Storage rotation — clean up sessions older than retention period
async function cleanExpiredSessions() {
  const result = await chrome.storage.local.get(['retentionDays']);
  const retentionDays = result.retentionDays !== undefined ? result.retentionDays : 30;
  if (retentionDays === 0) return; // "forever" — no cleanup

  const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  const sessions = await getAllSessions();
  let deleted = 0;

  for (const session of sessions) {
    if (session.start_time < cutoff) {
      await deleteSession(session.session_id);
      deleted++;
    }
  }

  if (deleted > 0) {
    console.log(`[Contact Agent] Cleaned ${deleted} expired sessions (retention: ${retentionDays}d)`);
  }
}

// Run cleanup on alarm and on startup
chrome.alarms.create('cleanExpiredSessions', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanExpiredSessions') {
    cleanExpiredSessions();
  }
});

// Also run on service worker start
cleanExpiredSessions();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'handshake') {
    console.log('[Contact Agent] Handshake:', message.result,
      'from', message.origin,
      'ring:', message.terms?.ring);
  }

  if (message.action === 'span') {
    const spanData = message.data;
    const sessionId = extractSessionId(spanData.payload);

    // Store the raw span
    storeSpan(spanData).catch(err => {
      console.error('[Contact Agent] Failed to store span:', err);
    });

    // Track for synthesis
    if (sessionId && sessionId !== 'unknown') {
      tracker.trackSpan(sessionId, spanData);
      updateBadge();
    }
  }

  if (message.action === 'getStatus') {
    sendResponse({
      activeSessions: tracker.activeCount
    });
    return true;
  }

  if (message.action === 'getSessions') {
    getAllSessions().then(sessions => {
      sendResponse({ sessions });
    }).catch(err => {
      sendResponse({ sessions: [], error: err.message });
    });
    return true;
  }

  if (message.action === 'getExporters') {
    sendResponse({ exporters: exporterRegistry.list() });
    return true;
  }

  if (message.action === 'configureExporter') {
    const exporter = exporterRegistry.get(message.exporterId);
    if (exporter) {
      exporter.configure(message.options);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Unknown exporter' });
    }
    return true;
  }

  if (message.action === 'exportSession') {
    exporterRegistry.exportSession(message.exporterId, message.session)
      .then(result => {
        if (result.success && message.deleteAfterExport) {
          return deleteSpansForSession(message.session.session_id)
            .then(() => result);
        }
        return result;
      })
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'clearAllData') {
    clearAllData()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'exportAll') {
    getAllSessions()
      .then(sessions => {
        const unexported = sessions.filter(s => !s.exported);
        return exporterRegistry.exportBatch(message.exporterId, unexported);
      })
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ exported: 0, failed: 0, errors: [err.message] }));
    return true;
  }
});
