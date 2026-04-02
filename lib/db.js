/**
 * lib/db.js — IndexedDB wrapper for span and session storage.
 *
 * Stores:
 *   - 'spans' object store: raw span payloads keyed by auto-increment,
 *     indexed by session_id for efficient session queries.
 *   - 'sessions' object store: synthesized session records keyed by session_id.
 */

(function() {
  'use strict';

  const DB_NAME = 'contact-agent';
  const DB_VERSION = 1;

  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('spans')) {
          const spanStore = db.createObjectStore('spans', { autoIncrement: true });
          spanStore.createIndex('session_id', 'session_id', { unique: false });
          spanStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'session_id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return dbPromise;
  }

  function extractSessionId(otlpPayload) {
    try {
      const attrs = otlpPayload.resourceSpans[0].scopeSpans[0].spans[0].attributes;
      const sessionAttr = attrs.find(a => a.key === 'session.id');
      return sessionAttr ? sessionAttr.value.stringValue : 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  async function storeSpan(spanMessage) {
    const db = await getDB();
    const tx = db.transaction('spans', 'readwrite');
    const store = tx.objectStore('spans');

    const sessionId = extractSessionId(spanMessage.payload);

    store.add({
      session_id: sessionId,
      timestamp: spanMessage.timestamp,
      payload: spanMessage.payload,
      received_at: Date.now()
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getSpansForSession(sessionId) {
    const db = await getDB();
    const tx = db.transaction('spans', 'readonly');
    const index = tx.objectStore('spans').index('session_id');
    const request = index.getAll(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function storeSession(session) {
    const db = await getDB();
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getAllSessions() {
    const db = await getDB();
    const tx = db.transaction('sessions', 'readonly');
    const request = tx.objectStore('sessions').getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteSpansForSession(sessionId) {
    const db = await getDB();
    const tx = db.transaction('spans', 'readwrite');
    const index = tx.objectStore('spans').index('session_id');
    const request = index.openCursor(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteSession(sessionId) {
    const db = await getDB();
    const tx = db.transaction(['spans', 'sessions'], 'readwrite');
    tx.objectStore('sessions').delete(sessionId);
    const index = tx.objectStore('spans').index('session_id');
    const request = index.openCursor(sessionId);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clearAllData() {
    const db = await getDB();
    const tx = db.transaction(['spans', 'sessions'], 'readwrite');
    tx.objectStore('spans').clear();
    tx.objectStore('sessions').clear();

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  // Expose on global scope
  self.ContactDB = {
    getDB, storeSpan, getSpansForSession, storeSession,
    getAllSessions, deleteSpansForSession, deleteSession, clearAllData,
    extractSessionId
  };
})();
