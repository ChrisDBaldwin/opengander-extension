/**
 * inject.js — Runs in the page's MAIN world.
 * Sets window.__contact, handles Contact Protocol handshake,
 * listens on BroadcastChannel for spans.
 * Bridges to content-script.js (ISOLATED world) via window.postMessage.
 */
(function() {
  'use strict';

  // Announce presence
  window.__contact = { version: 1, ready: true };

  // Load user preferences from storage (injected by content-script.js)
  let userPreferences = {
    rings: { traffic: 'always', interaction: 'ask', identity: 'never' }
  };

  // Listen for preferences from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === '__contact_preferences') {
      userPreferences = event.data.preferences;
    }
  });

  // Handle Contact Protocol proposals
  document.addEventListener('contact:propose', (event) => {
    const terms = event.detail;
    const ringPref = userPreferences.rings[terms.ring] || 'never';

    if (ringPref === 'never') {
      document.dispatchEvent(new CustomEvent('contact:decline'));
      window.postMessage({
        type: '__contact_handshake',
        result: 'declined',
        terms: terms
      }, '*');
      return;
    }

    // Accept the proposal
    const participantId = crypto.randomUUID();
    document.dispatchEvent(new CustomEvent('contact:accept', {
      detail: { participant_id: participantId }
    }));

    // Notify content script of acceptance
    window.postMessage({
      type: '__contact_handshake',
      result: 'accepted',
      terms: terms,
      participant_id: participantId
    }, '*');

    // Open BroadcastChannel and listen for spans
    try {
      const channel = new BroadcastChannel('contact:spans');
      channel.onmessage = (msg) => {
        // Forward each span to the content script (ISOLATED world)
        window.postMessage({
          type: '__contact_span',
          data: msg.data
        }, '*');
      };

      // Clean up on page unload
      window.addEventListener('pagehide', () => {
        try { channel.close(); } catch (e) {}
      });
    } catch (e) {
      console.warn('[Contact Agent] BroadcastChannel not available:', e);
    }
  });
})();
