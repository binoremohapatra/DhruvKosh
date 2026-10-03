/**
 * ResumableDownloadButton.jsx
 * ---------------------------
 * Drop-in replacement for a plain <a download> link.
 *
 * Props:
 *   downloadId  – stable unique key (e.g. "report-25")
 *   url         – API file URL
 *   filename    – suggested save-as name
 *   mimeType    – MIME type string
 *   label       – button text (default: "Download")
 *   fileSize    – optional number of bytes (for the "This file is X GB" hint)
 *   className   – extra CSS classes
 */

import React from 'react';
import { Download, Pause, Play, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDownload, formatBytes } from '../context/DownloadContext';

export default function ResumableDownloadButton({
  downloadId,
  url,
  filename,
  mimeType = 'application/octet-stream',
  label = 'Download',
  fileSize = null,
  className = '',
}) {
  const { downloads, startDownload, pauseDownload, resumeDownload, cancelDownload } = useDownload();
  const d = downloads.get(downloadId);

  const status   = d?.status   || 'idle';
  const progress = d?.progress || 0;
  const dlBytes  = d?.downloadedBytes || 0;
  const total    = d?.totalBytes || fileSize || null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStart = (e) => {
    e.preventDefault();
    startDownload(downloadId, url, filename, mimeType);
  };

  const handlePause = (e) => {
    e.preventDefault();
    pauseDownload(downloadId);
  };

  const handleResume = (e) => {
    e.preventDefault();
    resumeDownload(downloadId);
  };

  const handleCancel = (e) => {
    e.preventDefault();
    cancelDownload(downloadId);
  };

  // ── Idle / not started ─────────────────────────────────────────────────────

  if (status === 'idle') {
    return (
      <div className={`flex flex-col items-end gap-1 ${className}`}>
        {total && total > 100 * 1024 * 1024 && (
          <p className="text-[10px] text-ncpor-muted">
            {formatBytes(total)} — download can be resumed if connection drops
          </p>
        )}
        <button
          id={`dl-btn-${downloadId}`}
          onClick={handleStart}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-ncpor-accent/40 text-ncpor-accent text-sm font-semibold hover:bg-ncpor-accent hover:text-ncpor-bg transition-all"
        >
          <Download className="w-4 h-4" />
          {label}
        </button>
      </div>
    );
  }

  // ── Active / paused / error / complete ────────────────────────────────────

  const isActive   = status === 'downloading';
  const isPaused   = status === 'paused';
  const isError    = status === 'error';
  const isComplete = status === 'complete';
  const isPending  = status === 'pending';

  return (
    <div className={`flex flex-col gap-2 w-full max-w-sm ${className}`}>
      {/* Progress bar */}
      {!isComplete && (
        <div className="w-full bg-ncpor-divider rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isError ? 'bg-red-500' : 'bg-ncpor-accent'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ncpor-muted">
          {isComplete ? (
            <span className="text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Download complete
            </span>
          ) : isError ? (
            <span className="text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {d?.error || 'Error'}
            </span>
          ) : (
            <>
              {formatBytes(dlBytes)}
              {total ? ` / ${formatBytes(total)}` : ''}
              {' '}({progress}%)
            </>
          )}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {(isActive || isPending) && (
            <button
              onClick={handlePause}
              title="Pause"
              className="p-1.5 rounded-lg bg-ncpor-accent/10 hover:bg-ncpor-accent/20 text-ncpor-accent transition-colors"
            >
              {isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Pause className="w-3.5 h-3.5" />
              }
            </button>
          )}

          {(isPaused || isError) && (
            <button
              onClick={handleResume}
              title="Resume"
              className="p-1.5 rounded-lg bg-ncpor-accent/10 hover:bg-ncpor-accent/20 text-ncpor-accent transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {!isComplete && (
            <button
              onClick={handleCancel}
              title="Cancel"
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
