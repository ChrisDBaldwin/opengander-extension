/**
 * content-script.js — Runs in ISOLATED world.
 * Injects inject.js into the page's MAIN world via script tag
 * (cross-browser compatible — works on Chrome, Firefox, Edge, Brave).
 * Bridges messages from inject.js to the service worker.
 * Sends user preferences to inject.js on load.
 */

// Inject inject.js into the page context (MAIN world)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = () => script.remove();
(document.documentElement || document.head).appendChild(script);

// Load and send user preferences to inject.js
chrome.storage.local.get(['ringPreferences'], (result) => {
  const preferences = {
    rings: result.ringPreferences || {
      traffic: 'always',
      interaction: 'ask',
      identity: 'never'
    }
  };
  window.postMessage({
    type: '__contact_preferences',
    preferences: preferences
  }, '*');
});

// Listen for messages from inject.js (MAIN world)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (!msg || !msg.type) return;

  if (msg.type === '__contact_handshake') {
    chrome.runtime.sendMessage({
      action: 'handshake',
      result: msg.result,
      terms: msg.terms,
      participant_id: msg.participant_id,
      origin: window.location.origin,
      url: window.location.href
    });
  }

  if (msg.type === '__contact_span') {
    chrome.runtime.sendMessage({
      action: 'span',
      data: msg.data,
      origin: window.location.origin
    });
  }
});
