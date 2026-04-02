# OpenGander Contact Agent

Browser extension that gives you your own copy of the analytics data sites collect about you, via the [Contact Protocol](https://opengander.io).

When a site uses OpenGander and proposes a Contact handshake, this extension accepts on your behalf (based on your preferences), receives the same telemetry spans the site sends to its analytics backend, and stores them locally in your browser. You get to see exactly what was collected, export it, or send it to your own observability stack.

## Why Open Source?

This extension runs in your browser and handles your data. You should be able to read every line of code it executes. Publishing the source lets you verify that the extension does what it says — stores your data locally, exports only when you ask, and never phones home. The companion [OpenGander SDK](https://github.com/opengander/opengander-sdk) (what sites install) is open source for the same reason. Together, they make the full Contact Protocol auditable end to end.

## How It Works

1. **Detection** — The extension injects a small script into every page that sets `window.__contact` and listens for `contact:propose` events.
2. **Handshake** — When a site proposes contact, the extension checks your ring preferences and either accepts or declines.
3. **Collection** — On acceptance, telemetry spans are forwarded from the page via BroadcastChannel to the extension's service worker, which stores them in IndexedDB.
4. **Synthesis** — The service worker tracks active sessions and synthesizes session records when sessions close (matching the same logic the site's backend uses).
5. **Export** — View your data in the popup, or export it as JSON files or via OTLP to your own collector.

## Ring Preferences

Data is categorized into rings. You control each independently:

| Ring | What it includes | Default |
|------|-----------------|---------|
| **Traffic** | Page views, navigation, referrer, Web Vitals | Always accept |
| **Interaction** | Clicks, form submissions, errors | Ask |
| **Identity** | User IDs, custom attributes | Never accept |

Configure these in the extension's options page.

## Data Storage

- All data stays in your browser's IndexedDB — nothing leaves unless you export it.
- Configurable retention period (default: 30 days). Set to 0 for indefinite retention.
- Automatic cleanup runs hourly.

## Export Options

- **JSON file download** — export individual sessions or everything at once
- **OTLP/HTTP** — forward spans to your own OpenTelemetry collector endpoint

## Structure

```
manifest.json          Chrome/Firefox extension manifest (MV3)
service-worker.js      Background — stores spans, runs session synthesis
content-script.js      Isolated world — bridges page and service worker
inject.js              Main world — Contact Protocol handshake
lib/
  db.js                IndexedDB wrapper
  synthesizer.js       Session synthesis logic
  exporters/           JSON file and OTLP export
popup/                 Extension popup UI
options/               Settings page
icons/                 Extension icons
store/                 Chrome Web Store listing assets
test/                  Contact Protocol test page
```

## Development

Load as an unpacked extension:

1. Open `chrome://extensions` (or `about:debugging` in Firefox)
2. Enable Developer Mode
3. Click "Load unpacked" and select this directory
4. Open `test/test-contact-protocol.html` to test the handshake flow

## License

[MIT](LICENSE)
