/**
 * indexedDBStorage.js
 * -------------------
 * Low-level storage layer for resumable downloads.
 *
 * Each download is stored as two IndexedDB records:
 *   • "meta"  store  – metadata (url, filename, totalBytes, downloadedBytes,
 *                       etag, lastModified, status, contentId)
 *   • "chunks" store – ArrayBuffer blobs keyed by { id, offset }
 *
 * The chunk offset equals the byte position in the final file, so we can
 * reassemble them in order.
 */

const DB_NAME    = 'dhruvkosh_downloads';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('meta')) {
        const meta = db.createObjectStore('meta', { keyPath: 'id' });
        meta.createIndex('by_url', 'url', { unique: false });
      }

      if (!db.objectStoreNames.contains('chunks')) {
        // compound key: [downloadId, offset]
        db.createObjectStore('chunks', { keyPath: ['downloadId', 'offset'] });
      }
    };

    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror    = (e) => reject(e.target.error);
  });
}

function tx(store, mode = 'readonly') {
  return _db.transaction(store, mode).objectStore(store);
}

// ── Meta ─────────────────────────────────────────────────────────────────────

export async function saveMeta(meta) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('meta', 'readwrite')
                  .objectStore('meta')
                  .put(meta);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function getMeta(id) {
  await openDB();
  return new Promise((resolve, reject) => {
    const req = tx('meta').get(id);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function getAllMeta() {
  await openDB();
  return new Promise((resolve, reject) => {
    const req = tx('meta').getAll();
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function deleteMeta(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('meta', 'readwrite')
                  .objectStore('meta')
                  .delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Chunks ────────────────────────────────────────────────────────────────────

/**
 * Append one ArrayBuffer chunk at `offset` for download `downloadId`.
 */
export async function saveChunk(downloadId, offset, buffer) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('chunks', 'readwrite')
                  .objectStore('chunks')
                  .put({ downloadId, offset, data: buffer });
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Return all chunks for a download, sorted by offset ascending.
 */
export async function getChunks(downloadId) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = tx('chunks');
    // IDBKeyRange: all records where first key = downloadId
    const range = IDBKeyRange.bound([downloadId, 0], [downloadId, Infinity]);
    const req   = store.getAll(range);
    req.onsuccess = (e) => {
      const sorted = (e.target.result || []).sort((a, b) => a.offset - b.offset);
      resolve(sorted);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Delete all chunks belonging to a download (call after completion or reset).
 */
export async function deleteChunks(downloadId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction('chunks', 'readwrite').objectStore('chunks');
    const range = IDBKeyRange.bound([downloadId, 0], [downloadId, Infinity]);
    const req   = store.delete(range);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Reassemble all stored chunks into a single Blob.
 */
export async function assembleBlob(downloadId, mimeType = 'application/octet-stream') {
  const chunks  = await getChunks(downloadId);
  const buffers = chunks.map(c => c.data);
  return new Blob(buffers, { type: mimeType });
}

/**
 * Compute total bytes already stored for a download.
 */
export async function countStoredBytes(downloadId) {
  const chunks = await getChunks(downloadId);
  return chunks.reduce((sum, c) => sum + c.data.byteLength, 0);
}

/**
 * Full cleanup – meta + chunks.
 */
export async function purgeDownload(downloadId) {
  await deleteChunks(downloadId);
  await deleteMeta(downloadId);
}
