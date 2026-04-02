/**
 * lib/exporters/json-file.js — JSON file download exporter.
 */

(function() {
  'use strict';

  class JsonFileExporter extends self.BaseExporter {
    constructor() {
      super('json-file', 'JSON File Download');
    }

    _toDataUri(jsonString) {
      const base64 = btoa(unescape(encodeURIComponent(jsonString)));
      return `data:application/json;base64,${base64}`;
    }

    async export(session) {
      try {
        const json = JSON.stringify(session, null, 2);
        const url = this._toDataUri(json);
        const filename = `session-${session.session_id.substring(0, 8)}-${new Date(session.start_time).toISOString().slice(0, 10)}.json`;

        await chrome.downloads.download({
          url: url,
          filename: `opengander/${filename}`,
          saveAs: false
        });

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    async exportBatch(sessions) {
      try {
        const json = JSON.stringify({
          exported_at: new Date().toISOString(),
          session_count: sessions.length,
          sessions: sessions
        }, null, 2);

        const url = this._toDataUri(json);
        const filename = `opengander-sessions-${new Date().toISOString().slice(0, 10)}.json`;

        await chrome.downloads.download({
          url: url,
          filename: `opengander/${filename}`,
          saveAs: false
        });

        return { exported: sessions.length, failed: 0, errors: [] };
      } catch (error) {
        return { exported: 0, failed: sessions.length, errors: [error.message] };
      }
    }
  }

  self.JsonFileExporter = JsonFileExporter;
})();
