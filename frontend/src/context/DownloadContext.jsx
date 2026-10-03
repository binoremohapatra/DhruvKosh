/**
 * DownloadContext.jsx
 * -------------------
 * Global download manager context.
 *
 * Manages multiple simultaneous resumable downloads. Each download is
 * identified by a stable `id` (e.g. "report-25") and runs its own
 * fetch loop with Range requests + IndexedDB chunk storage.
 *
 * Exposed via useDownload():
 *   startDownload(id, url, filename, mimeType)  – enqueue / resume
 *   pauseDownload(id)
 *   resumeDownload(id)
 *   cancelDownload(id)                          – deletes stored chunks
 *   clearCompleted()
 *   downloads                                   – Map of id → state object
 *
 * State shape per download:
 * {
 *   id, url, filename, mimeType,
 *   status: 'pending'|'downloading'|'paused'|'error'|'complete',
 *   totalBytes: number | null,
 *   downloadedBytes: number,
 *   progress: number,       // 0-100
 *   error: string | null,
 *   etag: string | null,
 *   lastModified: string | null,
 * }
 */

import React, {
  createContext, useContext, useRef, useState, useCallback, useEffect,
} from 'react';
import {
  saveMeta, getMeta, getAllMeta,
  saveChunk, countStoredBytes,
  assembleBlob, purgeDownload,
} from '../utils/indexedDBStorage';

const DownloadContext = createContext(null);

const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB fetch chunk

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(bytes) {
  if (bytes == null) return '?';
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 ** 2)      return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)      return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export { fmt as formatBytes };

// ── Provider ──────────────────────────────────────────────────────────────────

export function DownloadProvider({ children }) {
  // Map<id, stateObj>
  const [downloads, setDownloads] = useState(new Map());
  // Map<id, AbortController>  – live controllers for active fetches
  const controllers = useRef(new Map());

  // ── Internal state update helper ──────────────────────────────────────────

  const patch = useCallback((id, updates) => {
    setDownloads(prev => {
      const next = new Map(prev);
      const cur  = next.get(id) || {};
      next.set(id, { ...cur, ...updates });
      return next;
    });
  }, []);

  // ── Restore persisted downloads on mount ──────────────────────────────────

  useEffect(() => {
    getAllMeta().then(all => {
      if (!all.length) return;
      setDownloads(prev => {
        const next = new Map(prev);
        all.forEach(m => {
          // Only restore incomplete downloads (not complete/cancelled)
          if (m.status !== 'complete') {
            next.set(m.id, {
              ...m,
              status: m.status === 'downloading' ? 'paused' : m.status,
              error: m.status === 'error' ? m.error : null,
            });
          }
        });
        return next;
      });
    }).catch(() => {/* IndexedDB unavailable – silent */});
  }, []);

  // ── Core download loop ────────────────────────────────────────────────────

  const _runDownload = useCallback(async (id, url, filename, mimeType, startByte, knownEtag, knownLastModified) => {
    const abort = new AbortController();
    controllers.current.set(id, abort);

    patch(id, { status: 'downloading', error: null });

    try {
      let offset = startByte;

      // If resuming, verify the file hasn't changed (ETag / Last-Modified)
      if (startByte > 0 && (knownEtag || knownLastModified)) {
        const headRes = await fetch(url, { method: 'HEAD', signal: abort.signal });
        if (headRes.ok) {
          const serverEtag = headRes.headers.get('ETag');
          const serverLM   = headRes.headers.get('Last-Modified');
          if (
            (knownEtag && serverEtag && serverEtag !== knownEtag) ||
            (!knownEtag && knownLastModified && serverLM && serverLM !== knownLastModified)
          ) {
            // File changed – discard partial data and restart
            await purgeDownload(id);
            offset = 0;
            patch(id, {
              downloadedBytes: 0, progress: 0,
              etag: serverEtag, lastModified: serverLM,
              error: 'File changed on server — restarting download.',
            });
          }
        }
      }

      // Fetch loop – one Range request per CHUNK_SIZE slice
      while (true) {
        if (abort.signal.aborted) break;

        // We always request up to CHUNK_SIZE from current offset
        const rangeEnd = offset + CHUNK_SIZE - 1;
        const headers  = { Range: `bytes=${offset}-${rangeEnd}` };

        const res = await fetch(url, { headers, signal: abort.signal });

        if (res.status === 416) {
          // Range not satisfiable = we already have the whole file
          break;
        }

        if (!res.ok && res.status !== 206) {
          throw new Error(`Server returned ${res.status}`);
        }

        // Grab ETag / Last-Modified from first response
        if (offset === startByte) {
          const etag = res.headers.get('ETag');
          const lm   = res.headers.get('Last-Modified');

          // If server sent 200 instead of 206 but we asked for a range,
          // it doesn't support Range – reset and consume the whole response
          if (res.status === 200 && startByte > 0) {
            await purgeDownload(id);
            offset = 0;
            patch(id, {
              downloadedBytes: 0, progress: 0,
              error: 'Server does not support resuming – restarting from 0.',
            });
          }

          // Parse total size from Content-Range (206) or Content-Length (200)
          let totalBytes = null;
          const cr = res.headers.get('Content-Range');
          if (cr) {
            const m = cr.match(/bytes \d+-\d+\/(\d+)/);
            if (m) totalBytes = parseInt(m[1], 10);
          }
          if (!totalBytes) {
            const cl = res.headers.get('Content-Length');
            if (cl) totalBytes = parseInt(cl, 10);
          }

          patch(id, { etag, lastModified: lm, totalBytes });
          await saveMeta({
            id, url, filename, mimeType,
            totalBytes, downloadedBytes: offset,
            etag, lastModified: lm,
            status: 'downloading', error: null,
          });
        }

        // Stream body in CHUNK_SIZE lumps into IndexedDB
        const buffer = await res.arrayBuffer();
        if (!buffer.byteLength) break;

        await saveChunk(id, offset, buffer);
        offset += buffer.byteLength;

        const storedBytes = offset; // we track via offset
        const meta        = await getMeta(id);
        const total       = meta?.totalBytes || null;
        const progress    = total ? Math.round((storedBytes / total) * 100) : 0;

        patch(id, { downloadedBytes: storedBytes, progress, totalBytes: total });
        await saveMeta({ ...(meta || {}), id, url, filename, mimeType, downloadedBytes: storedBytes, status: 'downloading' });

        // Done when offset reaches totalBytes
        if (total && offset >= total) break;

        // If server returned less than we asked for in one shot (full file in 200), done
        if (res.status === 200) break;
      }

      if (!abort.signal.aborted) {
        // Assemble and trigger browser Save-As dialog
        const blob    = await assembleBlob(id, mimeType);
        const blobUrl = URL.createObjectURL(blob);
        const a       = document.createElement('a');
        a.href        = blobUrl;
        a.download    = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

        patch(id, { status: 'complete', progress: 100 });
        await saveMeta({ id, url, filename, mimeType, status: 'complete', downloadedBytes: -1 });
        // Keep chunks a bit so the user can save again, then clean up
        setTimeout(() => purgeDownload(id).catch(() => {}), 60000);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        patch(id, { status: 'paused' });
        const meta = await getMeta(id);
        if (meta) await saveMeta({ ...meta, status: 'paused' });
      } else {
        const msg = navigator.onLine === false
          ? 'Connection lost – download paused.'
          : err.message || 'Download failed.';
        patch(id, { status: 'error', error: msg });
        const meta = await getMeta(id);
        if (meta) await saveMeta({ ...meta, status: 'error', error: msg });
      }
    } finally {
      controllers.current.delete(id);
    }
  }, [patch]);

  // ── Public API ────────────────────────────────────────────────────────────

  const startDownload = useCallback(async (id, url, filename, mimeType = 'application/octet-stream') => {
    // If already active, ignore
    if (controllers.current.has(id)) return;

    const existing = downloads.get(id);

    // Resume from stored progress if available
    const storedBytes = existing?.downloadedBytes > 0 ? existing.downloadedBytes : 0;
    const etag        = existing?.etag        || null;
    const lastMod     = existing?.lastModified || null;

    if (!existing) {
      patch(id, { id, url, filename, mimeType, status: 'pending', totalBytes: null, downloadedBytes: 0, progress: 0, error: null, etag: null, lastModified: null });
    }

    _runDownload(id, url, filename, mimeType, storedBytes, etag, lastMod);
  }, [downloads, patch, _runDownload]);

  const pauseDownload = useCallback((id) => {
    const ctrl = controllers.current.get(id);
    if (ctrl) ctrl.abort();
    // status will be set to 'paused' inside _runDownload's catch
  }, []);

  const resumeDownload = useCallback((id) => {
    const d = downloads.get(id);
    if (!d) return;
    if (controllers.current.has(id)) return; // already running
    startDownload(id, d.url, d.filename, d.mimeType);
  }, [downloads, startDownload]);

  const cancelDownload = useCallback(async (id) => {
    const ctrl = controllers.current.get(id);
    if (ctrl) ctrl.abort();
    await purgeDownload(id);
    setDownloads(prev => { const n = new Map(prev); n.delete(id); return n; });
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads(prev => {
      const n = new Map(prev);
      for (const [k, v] of n) if (v.status === 'complete') n.delete(k);
      return n;
    });
  }, []);

  // Auto-resume paused downloads when connection comes back
  useEffect(() => {
    const onOnline = () => {
      for (const [id, d] of downloads) {
        if ((d.status === 'error' || d.status === 'paused') && !controllers.current.has(id)) {
          resumeDownload(id);
        }
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [downloads, resumeDownload]);

  const value = { downloads, startDownload, pauseDownload, resumeDownload, cancelDownload, clearCompleted };

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
}

export function useDownload() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used inside <DownloadProvider>');
  return ctx;
}

export default DownloadContext;
