/**
 * DownloadManagerWidget.jsx
 * -------------------------
 * Floating bottom-right panel that shows all active / paused / complete
 * downloads site-wide (like a browser download tray).
 *
 * Mount once inside <Layout>. Automatically hides when there are no downloads.
 */

import React, { useState } from 'react';
import { Download, ChevronDown, ChevronUp, X, Pause, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDownload, formatBytes } from '../context/DownloadContext';

export default function DownloadManagerWidget() {
  const { downloads, pauseDownload, resumeDownload, cancelDownload, clearCompleted } = useDownload();
  const [collapsed, setCollapsed] = useState(false);

  if (downloads.size === 0) return null;

  const list        = [...downloads.values()];
  const activeCount = list.filter(d => d.status === 'downloading' || d.status === 'pending').length;

  return (
    <div
      id="download-manager-widget"
      className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-ncpor-divider bg-ncpor-panel shadow-2xl overflow-hidden"
      style={{ backdropFilter: 'blur(12px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ncpor-divider">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-ncpor-accent" />
          <span className="text-sm font-semibold text-ncpor-primary">
            Downloads
            {activeCount > 0 && (
              <span className="ml-2 text-xs bg-ncpor-accent text-ncpor-bg px-1.5 py-0.5 rounded-full font-bold">
                {activeCount}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearCompleted}
            title="Clear completed"
            className="text-xs text-ncpor-muted hover:text-ncpor-primary transition-colors px-1.5"
          >
            Clear
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded text-ncpor-muted hover:text-ncpor-primary transition-colors"
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Download list */}
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto divide-y divide-ncpor-divider/50">
          {list.map(d => (
            <DownloadRow
              key={d.id}
              d={d}
              onPause={() => pauseDownload(d.id)}
              onResume={() => resumeDownload(d.id)}
              onCancel={() => cancelDownload(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadRow({ d, onPause, onResume, onCancel }) {
  const { status, filename, downloadedBytes, totalBytes, progress, error } = d;

  const isActive   = status === 'downloading';
  const isPending  = status === 'pending';
  const isPaused   = status === 'paused';
  const isError    = status === 'error';
  const isComplete = status === 'complete';

  const statusColor = isComplete ? 'text-green-400'
    : isError   ? 'text-red-400'
    : isPaused  ? 'text-amber-400'
    : 'text-ncpor-accent';

  const statusLabel = isComplete ? 'Complete'
    : isError   ? 'Paused (error)'
    : isPaused  ? 'Paused'
    : isPending ? 'Starting…'
    : `${progress}%`;

  return (
    <div className="px-4 py-3 group">
      {/* File name + status */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ncpor-primary truncate" title={filename}>
            {filename}
          </p>
          <p className={`text-[10px] mt-0.5 ${statusColor}`}>
            {isError && error ? error : statusLabel}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {(isActive || isPending) && (
            <button onClick={onPause} title="Pause" className="p-1 rounded hover:bg-ncpor-divider text-ncpor-muted hover:text-ncpor-primary transition-colors">
              {isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ncpor-accent" />
                : <Pause className="w-3.5 h-3.5" />
              }
            </button>
          )}
          {(isPaused || isError) && (
            <button onClick={onResume} title="Resume" className="p-1 rounded hover:bg-ncpor-divider text-ncpor-accent transition-colors">
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
          {isComplete && (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          )}
          {!isComplete && (
            <button onClick={onCancel} title="Cancel" className="p-1 rounded hover:bg-red-500/10 text-ncpor-muted hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <>
          <div className="w-full bg-ncpor-divider rounded-full h-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isError   ? 'bg-red-500'
                : isPaused ? 'bg-amber-400'
                : 'bg-ncpor-accent'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-ncpor-muted mt-1">
            {formatBytes(downloadedBytes)}
            {totalBytes ? ` / ${formatBytes(totalBytes)}` : ''}
          </p>
        </>
      )}
    </div>
  );
}
