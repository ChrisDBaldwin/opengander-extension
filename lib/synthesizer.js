/**
 * lib/synthesizer.js — Session synthesis logic.
 *
 * Mirrors the ClickHouse sessions_mv materialized view.
 * Tracks active sessions, closes them on timeout, produces
 * synthesized session records with the same attributes.
 */

(function() {
  'use strict';

  var db = self.ContactDB;

  function extractAttrValue(valueObj) {
    if (!valueObj) return '';
    return valueObj.stringValue || valueObj.intValue || valueObj.doubleValue
      || valueObj.boolValue || '';
  }

  function extractAttributes(otlpPayload) {
    try {
      const attrs = otlpPayload.resourceSpans[0].scopeSpans[0].spans[0].attributes;
      const result = {};
      for (const attr of attrs) {
        result[attr.key] = extractAttrValue(attr.value);
      }
      return result;
    } catch (e) {
      return {};
    }
  }

  function extractResourceAttributes(otlpPayload) {
    try {
      const attrs = otlpPayload.resourceSpans[0].resource.attributes;
      const result = {};
      for (const attr of attrs) {
        result[attr.key] = extractAttrValue(attr.value);
      }
      return result;
    } catch (e) {
      return {};
    }
  }

  function extractSpanName(otlpPayload) {
    try {
      return otlpPayload.resourceSpans[0].scopeSpans[0].spans[0].name;
    } catch (e) {
      return '';
    }
  }

  function synthesizeSession(sessionId, spanRecords) {
    if (!spanRecords || spanRecords.length === 0) return null;

    const spans = spanRecords
      .map(record => {
        const attrs = extractAttributes(record.payload);
        const resourceAttrs = extractResourceAttributes(record.payload);
        const name = extractSpanName(record.payload);
        return {
          timestamp: record.timestamp,
          sequence: parseInt(attrs['session.sequence'] || '0', 10),
          name,
          attrs,
          resourceAttrs
        };
      })
      .filter(s => s.name === 'page_view')
      .sort((a, b) => a.sequence - b.sequence);

    if (spans.length === 0) return null;

    const first = spans[0];
    const last = spans[spans.length - 1];

    const ringsSet = new Set();
    let hasRevoked = false;
    for (const span of spans) {
      if (span.attrs['consent.ring']) {
        ringsSet.add(span.attrs['consent.ring']);
      }
      if (span.attrs['consent.status'] === 'revoked') {
        hasRevoked = true;
      }
    }

    return {
      session_id: sessionId,
      service_name: first.resourceAttrs['service.name'] || '',
      start_time: first.timestamp,
      end_time: last.timestamp,
      duration_ms: last.timestamp - first.timestamp,
      step_count: last.sequence,
      entry_page: first.attrs['session.entry_page'] || first.attrs['http.url'] || '',
      exit_page: last.attrs['http.url'] || last.attrs['http.target'] || '',
      termination_reason: hasRevoked ? 'revoked' : 'timeout',
      consent_status: first.attrs['consent.status'] || '',
      consent_jurisdiction: first.attrs['consent.jurisdiction'] || '',
      consent_rings_observed: Array.from(ringsSet),
      consent_protocol: first.attrs['consent.protocol'] || 'contact',
      traffic_source: first.attrs['traffic.source'] || '',
      traffic_medium: first.attrs['traffic.medium'] || '',
      traffic_channel: first.attrs['traffic.channel'] || '',
      traffic_campaign: first.attrs['traffic.campaign'] || '',
      synthesized_at: Date.now(),
      exported: false
    };
  }

  class SessionTracker {
    constructor() {
      this.active = new Map();
      this.onSessionClosed = null;
    }

    trackSpan(sessionId, spanMessage) {
      const attrs = extractAttributes(spanMessage.payload);
      const timeoutMs = parseInt(attrs['session.timeout_ms'] || '1800000', 10);

      const existing = this.active.get(sessionId);
      if (existing) {
        clearTimeout(existing.timerId);
      }

      if (attrs['consent.status'] === 'revoked') {
        this.active.delete(sessionId);
        this._closeSession(sessionId);
        return;
      }

      const timerId = setTimeout(() => {
        this.active.delete(sessionId);
        this._closeSession(sessionId);
      }, timeoutMs);

      this.active.set(sessionId, {
        timeoutMs,
        timerId,
        lastActivity: Date.now()
      });
    }

    async _closeSession(sessionId) {
      try {
        const spanRecords = await db.getSpansForSession(sessionId);
        const session = synthesizeSession(sessionId, spanRecords);

        if (session) {
          await db.storeSession(session);
          if (this.onSessionClosed) {
            this.onSessionClosed(session);
          }
        }
      } catch (err) {
        console.error('[Contact Agent] Session synthesis failed for', sessionId, err);
      }
    }

    get activeCount() {
      return this.active.size;
    }
  }

  // Expose on global scope
  self.ContactSynthesizer = { synthesizeSession, SessionTracker };
})();
