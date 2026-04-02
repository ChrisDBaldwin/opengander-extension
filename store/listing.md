# Chrome Web Store Listing

## Short Description (under 132 characters)

Get your own copy of the analytics data sites collect about you via the OpenGander Contact Protocol.

## Detailed Description

**Your data. Your copy. Your choice.**

Every website you visit collects analytics about you — page views, clicks, how long you stayed, where you came from. You probably knew that. What you probably didn't know is that you've never had a way to see exactly what was collected, let alone keep your own copy.

The OpenGander Contact Agent changes that.

**How it works**

When you visit a website that uses OpenGander analytics, the site proposes a data collection handshake called the Contact Protocol. Your Contact Agent acts on your behalf:

1. The site says: "I'd like to collect traffic data about your visit."
2. Your agent checks your preferences and responds: accept or decline.
3. If accepted, the agent captures your own copy of the exact same data the site collects.
4. Your copy stays in your browser. You own it. You can export it or delete it anytime.

That's it. The site gets its analytics. You get your copy. Both parties are transparent.

**What you can control**

The Contact Protocol organizes data into "rings" — categories that determine what gets shared:

- **Traffic** — Page views, navigation, referrer information
- **Interaction** — Clicks, scrolls, form submissions
- **Identity** — Email, name, user identifiers

You set your preference for each ring: Always accept, Ask me each time, or Never allow. You're in control.

**What's stored and where**

All captured data lives in your browser's local storage (IndexedDB). Nothing is sent anywhere unless you explicitly choose to export it. No accounts, no cloud sync, no telemetry from the extension itself.

You can:

- View sessions by site in the popup
- Export your data as JSON or via OTLP
- Set automatic data retention (7, 30, or 90 days)
- Clear everything with one click

**Why this matters**

Most analytics platforms operate in one direction: they collect data about you, and you never see it. OpenGander believes analytics should be bilateral — if a site wants to understand its visitors, those visitors deserve to understand what's being collected.

The Contact Agent makes that possible. It's free, it's open source, and it's built by the same team that builds OpenGander analytics.

**Technical details**

- Chrome MV3 extension (works on Chrome, Edge, Brave, Arc)
- Captures OTLP (OpenTelemetry) spans
- Local-only storage with configurable retention
- No build tools, no dependencies, no external services
- Open source: github.com/opengander/opengander

## Category

Privacy & Security

## Additional Tags

privacy, analytics, transparency, telemetry, opentelemetry, data rights, consent
