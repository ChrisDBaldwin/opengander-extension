# OpenGander Contact Agent — Privacy Policy

**Last updated:** March 28, 2026

## What This Extension Does

The OpenGander Contact Agent is a browser extension that participates in the Contact Protocol — a bilateral data collection handshake between websites and users. When a website running the OpenGander SDK proposes to collect analytics data about your visit, this extension acts as your agent: it accepts or declines based on your preferences, and when accepted, captures your own copy of the data collected about you.

## What Data Is Collected

The extension stores **OTLP telemetry spans** from websites that use the OpenGander Contact Protocol and that you have consented to. This data includes:

- Page URLs you visited on consented sites
- Navigation timing and performance metrics
- Session identifiers (randomly generated, not linked to your real identity)
- Traffic source information (referrer, UTM parameters)
- The consent status and ring level you chose

**This data comes exclusively from sites where you actively consented to data collection through the Contact Protocol handshake.**

## Where Data Is Stored

All data is stored **locally in your browser** using IndexedDB. It never leaves your device unless you explicitly choose to export it.

- Data is stored in your browser's local storage (IndexedDB)
- You control how long data is retained (configurable: 7, 30, 90 days, or forever)
- You can view all stored data in the extension popup
- You can delete all data at any time using the "Clear All Data" button

## What We Never Collect

The extension itself does **not** collect any data about you:

- No usage analytics or telemetry from the extension itself
- No personal information (name, email, phone, etc.)
- No browsing history outside of consented Contact Protocol interactions
- No data is sent to OpenGander servers or any third party
- No cookies are set or read by the extension
- No tracking pixels, beacons, or fingerprinting

## Data Export

You can export your locally stored data in two ways:

- **JSON download:** Saves your session data as a JSON file to your computer
- **OTLP/HTTP:** Sends spans to an endpoint you configure (e.g., your own collector)

Both export methods are user-initiated. No data is exported automatically.

## Permissions

The extension requests the following browser permissions:

- **storage:** To save your ring preferences, settings, and session data locally
- **downloads:** To enable JSON export of your data
- **alarms:** To periodically clean up sessions older than your retention setting
- **Content script access (all URLs):** Required to detect the Contact Protocol (`window.__contact`) on any website — the extension needs to run on all pages to discover which sites support the protocol

## How to Delete Your Data

You can delete all stored data at any time:

1. Click the extension icon in your toolbar
2. Click "Clear All Data" at the bottom of the popup
3. Confirm the deletion

Alternatively, uninstalling the extension removes all stored data automatically.

## Changes to This Policy

If we update this privacy policy, we will update the "Last updated" date at the top. Material changes will be noted in the extension's changelog.

## Contact

For questions about this privacy policy or the Contact Agent extension:

- **Website:** https://opengander.com
- **Email:** privacy@opengander.io
- **GitHub:** https://github.com/opengander/opengander
