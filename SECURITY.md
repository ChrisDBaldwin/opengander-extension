# Security

This document is a guided path for auditors reviewing the OpenGander Contact Agent browser extension.

## Data Flow

```
Page (MAIN world)          Extension (ISOLATED world)         Background
──────────────────         ──────────────────────────         ──────────
SDK fires                  content-script.js                  service-worker.js
contact:propose  ───→  inject.js  ──window.postMessage──→  receives via           stores spans in
                       checks ring prefs                    chrome.runtime         IndexedDB
                       accepts/declines                     .sendMessage           ↓
                       ↓                                                          Session synthesis
SDK sends spans        BroadcastChannel                                           ↓
via contact:spans ──→  forwards via ──window.postMessage──→ forwards to  ────→    Synthesized sessions
                       window.postMessage                   service worker        stored in IndexedDB
```

**Step by step:**

1. `inject.js` runs in the page's **MAIN world**. It sets `window.__contact = { version: 1, ready: true }` and listens for `contact:propose` CustomEvents from the site's SDK.
2. When a proposal arrives, `inject.js` checks the user's ring preferences (received from `content-script.js` via `window.postMessage`). If the ring is set to `never`, it fires `contact:decline` and stops. Otherwise it generates a `participant_id` (UUID) and fires `contact:accept`.
3. On acceptance, `inject.js` opens a `BroadcastChannel('contact:spans')` and forwards each span to `content-script.js` via `window.postMessage` with type `__contact_span`.
4. `content-script.js` runs in the **ISOLATED world**. It relays `__contact_handshake` and `__contact_span` messages to the service worker via `chrome.runtime.sendMessage`.
5. `service-worker.js` stores raw spans in IndexedDB (via `lib/db.js`), tracks active sessions, and synthesizes session records when sessions close.

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Persist ring preferences and exporter configuration in `chrome.storage.local`. |
| `downloads` | Export session data as CSV or JSON files to the user's filesystem (user-initiated only). |
| `alarms` | Schedule hourly cleanup of expired sessions based on the retention period. |
| `<all_urls>` (content script) | The content script must run on every page so it can detect Contact Protocol proposals from any site using the OpenGander SDK. No content is read or modified — the script only injects the handshake listener and bridges messages. |

The extension does **not** request `tabs`, `history`, `cookies`, `webRequest`, or any network-access permissions.

## Local-Only Storage

All collected data stays in the browser's IndexedDB. Nothing is transmitted to any server unless the user explicitly exports it:

- **JSON file download** — writes to the local filesystem via the `downloads` API.
- **OTLP/HTTP export** — sends spans to a user-configured endpoint. The endpoint URL is stored in `chrome.storage.local` and is never set by the extension itself.
- **CSV export** — generates a file in-memory and downloads it locally.

There are no analytics, crash reporters, or telemetry endpoints in the extension. No network requests are made by the extension code itself.

## Contact Protocol Handshake

The handshake is the consent mechanism. A site cannot send spans to the extension without it.

1. The site's SDK dispatches a `contact:propose` CustomEvent with a `ring` field indicating what category of data it wants to share.
2. `inject.js` checks the user's preference for that ring (`always`, `ask`, or `never`).
3. If declined, a `contact:decline` event is fired and no channel is opened.
4. If accepted, a `contact:accept` event is fired with a generated `participant_id`, and a `BroadcastChannel` is opened to receive spans.

The user controls this entirely through ring preferences. No handshake is accepted without matching a user preference.

## Ring Model

Data is categorized into three rings. Each ring has an independent user preference:

| Ring | Contents | Default |
|------|----------|---------|
| **Traffic** | Page views, navigation, referrer, Web Vitals | `always` (accept) |
| **Interaction** | Clicks, form submissions, errors | `ask` (prompt) |
| **Identity** | User IDs, custom attributes | `never` (decline) |

Ring preferences are stored in `chrome.storage.local` under the key `ringPreferences`. They are sent to `inject.js` on every page load via `window.postMessage` (type `__contact_preferences`). The site never learns what preferences are set — it only sees `contact:accept` or `contact:decline`.

## Trust Boundaries

| Boundary | Trust level | Notes |
|----------|-------------|-------|
| Page → `inject.js` | Untrusted | Runs in the page's MAIN world. The SDK controls what events and spans it sends. |
| `inject.js` → `content-script.js` | Semi-trusted | `window.postMessage` bridge. Content script checks `event.source === window` and filters by message type. |
| `content-script.js` → service worker | Trusted | `chrome.runtime.sendMessage` — Chrome's internal messaging, only accessible to the extension. |
| Service worker → IndexedDB | Trusted | Standard browser storage API. Data is scoped to the extension origin. |
| Popup / Options → service worker | Trusted | Extension-internal messaging. |

## Data Retention

- Default retention: 30 days.
- Configurable via the options page. Setting retention to 0 means indefinite storage.
- An hourly alarm (`cleanExpiredSessions`) deletes sessions older than the retention period.
- The user can clear all data immediately via the popup's "Clear All Data" button.

## What to Audit

1. **`inject.js`** — Runs in the page's MAIN world. Verify it only reads `contact:propose` events and user preferences, and only writes `contact:accept`/`contact:decline` events and `window.postMessage` messages.
2. **`content-script.js`** — Verify it only bridges specific message types (`__contact_handshake`, `__contact_span`, `__contact_preferences`) and does not read or modify page content.
3. **`popup/popup.js`** — Verify that data from spans (service names, session IDs) is rendered via `textContent`, not `innerHTML`, to prevent XSS from malicious SDK payloads.
4. **`service-worker.js`** — Verify no outbound network requests are made. The only network-capable code is in `lib/exporters/otlp-http.js`, which sends to a user-configured endpoint.
5. **`lib/exporters/otlp-http.js`** — Verify the endpoint is read from `chrome.storage.local` and that the user must explicitly configure it.
