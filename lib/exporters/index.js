/**
 * lib/exporters/index.js — Exporter registry.
 */

(function() {
  'use strict';

  class ExporterRegistry {
    constructor() {
      this.exporters = new Map();
    }

    register(exporter) {
      this.exporters.set(exporter.id, exporter);
    }

    get(id) {
      return this.exporters.get(id);
    }

    list() {
      return Array.from(this.exporters.values()).map(e => ({
        id: e.id,
        name: e.name
      }));
    }

    async exportSession(exporterId, session) {
      const exporter = this.exporters.get(exporterId);
      if (!exporter) {
        return { success: false, error: `Unknown exporter: ${exporterId}` };
      }
      return exporter.export(session);
    }

    async exportBatch(exporterId, sessions) {
      const exporter = this.exporters.get(exporterId);
      if (!exporter) {
        return { exported: 0, failed: sessions.length, errors: [`Unknown exporter: ${exporterId}`] };
      }
      return exporter.exportBatch(sessions);
    }
  }

  const registry = new ExporterRegistry();
  registry.register(new self.JsonFileExporter());
  registry.register(new self.OtlpHttpExporter());

  self.exporterRegistry = registry;
})();
