/**
 * lib/exporters/base.js — Exporter interface.
 */

(function() {
  'use strict';

  class BaseExporter {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this.options = {};
    }

    configure(options) {
      this.options = { ...this.options, ...options };
    }

    async export(session) {
      throw new Error('export() not implemented');
    }

    async exportBatch(sessions) {
      let exported = 0;
      let failed = 0;
      const errors = [];

      for (const session of sessions) {
        const result = await this.export(session);
        if (result.success) {
          exported++;
        } else {
          failed++;
          if (result.error) errors.push(result.error);
        }
      }

      return { exported, failed, errors };
    }
  }

  self.BaseExporter = BaseExporter;
})();
