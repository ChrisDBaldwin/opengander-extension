> **⚠️ This repository has moved.** Development continues in the OpenGander monorepo:
> [github.com/opengander/opengander](https://github.com/opengander/opengander) (`packages/browser-extension`).
> This repo is kept as a read-only archive.

# OpenGander Contact Agent

> [OpenGander](https://opengander.com) is privacy-first web analytics. The Contact Agent is the trust layer — it shows visitors exactly what's shared, making consent real, not theater.

See exactly what analytics data websites collect about you. This browser extension receives a copy of the same telemetry a site sends to its analytics backend and stores it locally in your browser. Nothing leaves unless you export it.

This is the source code for the extension. You can read every line. The companion [OpenGander SDK](https://github.com/ChrisDBaldwin/opengander-sdk) (what sites install) is open source for the same reason. Together, they make the full Contact Protocol auditable end to end. See [PROTOCOL.md](PROTOCOL.md) for the specification and [SECURITY.md](SECURITY.md) for an auditor's guide.

This isn't a community project. It's a read-only reference. Fork it if you want.

## How It Works

1. **The extension notices a site uses OpenGander** — a small script checks for `contact:propose` events on every page.
2. **Your preferences decide what happens** — the extension checks your ring settings and accepts or declines on your behalf.
3. **Your copy of the data is saved locally** — telemetry spans flow from the page to the extension's service worker and into IndexedDB.
4. **Sessions are assembled automatically** — the service worker produces session records when visits end, matching the same logic the site's backend uses.
5. **Export when you want** — view data in the popup, download as CSV/JSON, or forward via OTLP to your own collector.

## For Site Owners

Offering the Contact Agent to your visitors is a trust signal. When visitors can see exactly what you collect, consent opt-in rates go up. The SDK's built-in consent UI can [prompt visitors to install the extension](https://github.com/ChrisDBaldwin/opengander-sdk#consent) after they accept — turning a compliance moment into a trust-building one.

## Ring Preferences

Data is categorized into rings. You control each independently:

| Ring | What it includes | Default |
|------|-----------------|---------|
| **Traffic** | Page views, navigation, referrer, Web Vitals | Always accept |
| **Interaction** | Clicks, form submissions, errors | Ask |
| **Identity** | User IDs, custom attributes | Never accept |

Configure in the extension's options page.

## Where Data Lives

All data stays in your browser's IndexedDB.

- Configurable retention (default: 30 days, 0 for indefinite)
- Automatic cleanup runs hourly
- Clear everything from the popup at any time

## Export

- **CSV / JSON file download** — individual sessions or everything at once
- **OTLP/HTTP** — forward spans to your own OpenTelemetry collector

## Development

Load as an unpacked extension:

1. `chrome://extensions` (or `about:debugging` in Firefox)
2. Enable Developer Mode
3. Load unpacked — select this directory
4. Open `test/test-contact-protocol.html` to test the handshake

## Structure

```
manifest.json        Extension manifest (MV3, Chrome + Firefox)
service-worker.js    Background — span storage, session synthesis
content-script.js    Isolated world — bridges page and service worker
inject.js            Main world — Contact Protocol handshake
lib/
  db.js              IndexedDB wrapper
  synthesizer.js     Session synthesis
  exporters/         JSON file and OTLP export
popup/               Extension popup UI
options/             Settings page
store/               Chrome Web Store listing assets
test/                Protocol test page
```

## Documentation

| Doc | What's in it |
|-----|-------------|
| [PROTOCOL.md](PROTOCOL.md) | Contact Protocol specification — events, rings, span delivery |
| [SECURITY.md](SECURITY.md) | Auditor's guide — data flow, permissions, trust boundaries |

## License

[MIT](LICENSE)
