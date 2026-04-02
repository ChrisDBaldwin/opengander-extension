/**
 * lib/exporters/otlp-http.js — OTLP/HTTP exporter.
 */

(function() {
  'use strict';

  class OtlpHttpExporter extends self.BaseExporter {
    constructor() {
      super('otlp-http', 'OTLP/HTTP Collector');
      this.options = {
        endpoint: '',
        headers: {}
      };
    }

    _sessionToOtlp(session) {
      const traceId = crypto.randomUUID().replace(/-/g, '');
      const spanId = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      const attributes = [
        { key: 'session.id', value: { stringValue: session.session_id } },
        { key: 'session.duration_ms', value: { intValue: String(session.duration_ms) } },
        { key: 'session.step_count', value: { intValue: String(session.step_count) } },
        { key: 'session.entry_page', value: { stringValue: session.entry_page } },
        { key: 'session.exit_page', value: { stringValue: session.exit_page } },
        { key: 'session.termination_reason', value: { stringValue: session.termination_reason } },
        { key: 'consent.status', value: { stringValue: session.consent_status } },
        { key: 'consent.jurisdiction', value: { stringValue: session.consent_jurisdiction } },
        { key: 'consent.protocol', value: { stringValue: session.consent_protocol } },
        { key: 'consent.rings_observed', value: { stringValue: session.consent_rings_observed.join(',') } },
        { key: 'traffic.source', value: { stringValue: session.traffic_source } },
        { key: 'traffic.medium', value: { stringValue: session.traffic_medium } },
        { key: 'traffic.channel', value: { stringValue: session.traffic_channel } },
        { key: 'traffic.campaign', value: { stringValue: session.traffic_campaign } },
        { key: 'session.synthesized_by', value: { stringValue: 'contact-agent' } }
      ];

      const startNano = String(session.start_time * 1000000);
      const endNano = String(session.end_time * 1000000);

      return {
        resourceSpans: [{
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: session.service_name } },
              { key: 'telemetry.sdk.name', value: { stringValue: 'contact-agent' } }
            ]
          },
          scopeSpans: [{
            scope: { name: 'contact-agent-synthesizer' },
            spans: [{
              traceId,
              spanId,
              name: 'session',
              kind: 1,
              startTimeUnixNano: startNano,
              endTimeUnixNano: endNano,
              attributes
            }]
          }]
        }]
      };
    }

    async export(session) {
      if (!this.options.endpoint) {
        return { success: false, error: 'No OTLP endpoint configured' };
      }

      try {
        const payload = this._sessionToOtlp(session);
        const response = await fetch(this.options.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.options.headers
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          return { success: false, error: `OTLP export failed: ${response.status} ${response.statusText}` };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }

  self.OtlpHttpExporter = OtlpHttpExporter;
})();
