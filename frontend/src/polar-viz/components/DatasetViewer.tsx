import React, { useEffect, useMemo, useState, lazy, LazyExoticComponent, Suspense } from 'react';
import type { Dataset, ModeId, WorkerResponse } from '../types/dataset';
import { evaluateCapabilities, MODE_LABELS } from '../engine/capabilityEngine';
import { Box, Table, AlertTriangle, Layers, Database, Sparkles, RefreshCw, FileText } from 'lucide-react';
import { useBandwidth } from '../../context/BandwidthContext';

// VolumeField3D is only lazy-loaded when NOT in low-bandwidth mode.
let _VolumeField3D: LazyExoticComponent<any> | null = null;

interface Props {
  /** Pass a File (from an <input type="file"> or drag-and-drop)... */
  file?: File | null;
  /** ...or a URL to a dataset file */
  url?: string;
  height?: number;
  onClose?: () => void;
}

const ORDER: ModeId[] = [
  'volume3D', 'rawTable', 'verticalProfile', 'timeSeries', 'map', 'curtain', 'depthSlice', 
  'surfaceField', 'vectorField', 'histogram', 'scatter', 'surface3D', 'vectorField3D', 'isosurface3D'
];
const BUILT: ModeId[] = ['volume3D', 'rawTable'];

type State =
  | { status: 'idle' }
  | { status: 'loading'; stage: string }
  | { status: 'ready'; dataset: Dataset }
  | { status: 'error'; message: string };

export default function DatasetViewer({ file, url, height = 520, onClose }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [mode, setMode] = useState<ModeId | null>(null);
  const [variable, setVariable] = useState<string>('');
  const [force3D, setForce3D] = useState(false);
  const { isLowBandwidth } = useBandwidth();

  // Only assign the lazy import when actually needed
  if (!isLowBandwidth || force3D) {
    if (!_VolumeField3D) {
      _VolumeField3D = React.lazy(() => import('./VolumeField3D'));
    }
  }

  useEffect(() => {
    if (!file && !url) { 
      setState({ status: 'idle' }); 
      return; 
    }
    
    let cancelled = false;
    const worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), { type: 'module' });
    const id = Math.random().toString(36).slice(2);
    setState({ status: 'loading', stage: 'Initializing Scientific Worker' }); 
    setMode(null);

    worker.onmessage = (e: { data: WorkerResponse }) => {
      if (cancelled || e.data.id !== id) return;
      if (e.data.type === 'progress') {
        setState({ status: 'loading', stage: e.data.stage });
      } else if (e.data.type === 'error') {
        setState({ status: 'error', message: e.data.message });
      } else if (e.data.type === 'dataset') {
        setState({ status: 'ready', dataset: e.data.dataset });
      }
    };
    
    worker.onerror = (err) => {
      console.error('Worker error:', err);
      if (!cancelled) {
        setState({ status: 'error', message: 'The background file reader encountered an issue parsing this file format.' });
      }
    };

    (async () => {
      try {
        let f: File | undefined = file || undefined;
        if (!f && url) {
          setState({ status: 'loading', stage: 'Fetching dataset stream' });
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Could not fetch dataset file (HTTP ${res.status}).`);
          const blob = await res.blob();
          
          let fileName = 'polar_dataset.csv'; // Safe default
          const cd = res.headers.get('content-disposition');
          if (cd && cd.includes('filename=')) {
            const match = cd.match(/filename="?([^"]+)"?/);
            if (match) fileName = match[1];
          } else {
            fileName = decodeURIComponent(res.url.split('?')[0].split('/').pop() || 'polar_dataset.csv');
          }
          
          // If after all that, there's no extension, force .csv so the parser doesn't crash on IDs
          if (!fileName.includes('.')) fileName += '.csv';
          
          f = new File([blob], fileName);
        }
        if (!cancelled && f) {
          worker.postMessage({ type: 'parse', id, file: f });
        }
      } catch (err) {
        if (!cancelled) {
          setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
        }
      }
    })();

    return () => { 
      cancelled = true; 
      worker.terminate(); 
    };
  }, [file, url]);

  const dataset = state.status === 'ready' ? state.dataset : undefined;
  const caps = useMemo(() => (dataset ? evaluateCapabilities(dataset) : undefined), [dataset]);
  const scalars = dataset?.variables.filter(v => v.values && v.values.length > 0) ?? [];

  // Set default mode and scalar variable — always prefer 3D if available
  useEffect(() => {
    if (!caps || !dataset) return;
    // Log diagnostics to console for debugging
    const roles = dataset.variables.map(v => `${v.name}→${v.role}`).join(', ');
    console.log('[PolarViz] Variables:', roles);
    console.log('[PolarViz] volume3D:', caps.modes.volume3D);
    console.log('[PolarViz] density:', caps.density);
    const defaultMode = caps.modes.volume3D?.enabled ? 'volume3D' : (ORDER.find(m => caps.modes[m]?.enabled && BUILT.includes(m)) ?? 'rawTable');
    setMode(defaultMode);
    setVariable(scalars[0]?.name ?? '');
  }, [caps, dataset]);

  if (state.status === 'idle') {
    return (
      <div className="p-8 rounded-2xl bg-ncpor-panel border border-ncpor-divider text-center">
        <Database className="w-8 h-8 text-ncpor-accent mx-auto mb-3 opacity-60" />
        <p className="text-ncpor-primary font-medium">Select or upload a scientific dataset to inspect in 3D</p>
        <p className="text-xs text-ncpor-muted mt-1">Supports CSV, TSV, XLSX, JSON, Sea-Bird .CNV, and TXT files</p>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div className="p-12 rounded-2xl bg-ncpor-panel border border-ncpor-divider flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-ncpor-primary">{state.stage}...</p>
        <p className="text-xs text-ncpor-muted mt-1">Parsing spatial coordinates &amp; oceanographic columns in background</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
        <div className="flex items-center gap-2 mb-2 font-bold">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>Could not visualize file</span>
        </div>
        <p className="text-xs text-rose-200/90">{state.message}</p>
      </div>
    );
  }

  if (!dataset || !caps) return null;

  return (
    <div className="w-full rounded-2xl bg-ncpor-panel border border-ncpor-divider overflow-hidden shadow-2xl animate-fade-in flex flex-col">
      {/* Header Info Banner */}
      <div className="p-4 sm:p-5 border-b border-ncpor-divider bg-ncpor-bg/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ncpor-primary flex items-center gap-2">
              <span>{dataset.name}</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] uppercase font-mono border border-cyan-500/30">
                {dataset.format}
              </span>
            </h3>
            <p className="text-xs text-ncpor-muted">
              {dataset.layout === 'tabular' ? `${dataset.rowCount.toLocaleString()} measurement rows` : 'Gridded field'} • {dataset.variables.length} parameters
            </p>
          </div>
        </div>

        {/* View mode selection tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-ncpor-bg border border-ncpor-divider">
          {caps.modes.volume3D.enabled && (
            <button
              onClick={() => setMode('volume3D')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'volume3D'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-ncpor-muted hover:text-ncpor-primary'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Water Column</span>
            </button>
          )}

          <button
            onClick={() => setMode('rawTable')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'rawTable'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-ncpor-muted hover:text-ncpor-primary'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Raw Data Matrix</span>
          </button>
        </div>
      </div>

      {/* Warnings & Notes */}
      {dataset.warnings.length > 0 && (
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{dataset.warnings.join(' • ')}</span>
        </div>
      )}

      {/* 3D Not Available — show why */}
      {mode === 'rawTable' && !caps.modes.volume3D.enabled && (
        <div className="px-5 py-3 bg-blue-500/10 border-b border-blue-500/20 text-blue-300 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-400" />
            <div>
              <span className="font-semibold text-blue-200">3D view unavailable: </span>
              <span>{caps.modes.volume3D.reason}</span>
              <div className="mt-1.5 text-blue-400/80">
                <span className="font-semibold">Detected columns: </span>
                {dataset.variables.map(v => (
                  <span key={v.name} className={`inline-block mr-2 px-1.5 py-0.5 rounded font-mono text-[10px] ${
                    v.role === 'latitude' ? 'bg-green-500/20 text-green-300' :
                    v.role === 'longitude' ? 'bg-cyan-500/20 text-cyan-300' :
                    v.role === 'depth' || v.role === 'pressure' ? 'bg-purple-500/20 text-purple-300' :
                    v.role === 'scalar' ? 'bg-ncpor-divider/60 text-ncpor-secondary' :
                    'bg-ncpor-divider/30 text-ncpor-muted'
                  }`}>
                    {v.name} <span className="opacity-60">({v.role})</span>
                  </span>
                ))}
              </div>
              <div className="mt-1 text-blue-400/60">Tip: rename columns to <code className="font-mono bg-blue-500/10 px-1 rounded">latitude</code>, <code className="font-mono bg-blue-500/10 px-1 rounded">longitude</code>, <code className="font-mono bg-blue-500/10 px-1 rounded">depth</code> for 3D rendering.</div>
            </div>
          </div>
        </div>
      )}


      {/* Variable Switcher Bar for 3D View */}
      {mode === 'volume3D' && scalars.length > 1 && (
        <div className="px-5 py-3 border-b border-ncpor-divider/60 bg-[#0a1220] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ncpor-secondary font-medium">Render Scalar Field:</span>
            <select
              value={variable}
              onChange={e => setVariable(e.target.value)}
              className="bg-ncpor-bg text-ncpor-primary text-xs px-3 py-1.5 rounded-lg border border-ncpor-divider focus:border-cyan-400 outline-none cursor-pointer"
            >
              {scalars.map(v => (
                <option key={v.name} value={v.name}>
                  {v.longName || v.name} {v.unit ? `(${v.unit})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-ncpor-muted flex items-center gap-2">
            <span>Spatial density verified ({caps.density.coverage ? `${Math.round(caps.density.coverage * 100)}%` : '100%'} volumetric coverage)</span>
          </div>
        </div>
      )}

      {/* View Container */}
      <div className="p-4 bg-ncpor-bg/30">
        {mode === 'volume3D' ? (
          isLowBandwidth && !force3D ? (
            /* ── Data Saver 3D placeholder ─────────────────────────────── */
            <div className="rounded-xl border border-ncpor-divider bg-[#060c18] p-8 text-center">
              <Box className="w-8 h-8 text-ncpor-accent mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-ncpor-primary mb-1">3D View unavailable in Data Saver</p>
              <p className="text-xs text-ncpor-muted mb-4 max-w-xs mx-auto">
                Your connection is slow. The scientific data is still available in the Raw Data Matrix below.
              </p>
              {/* Lightweight dataset summary */}
              <div className="mb-5 grid grid-cols-2 gap-3 text-left max-w-xs mx-auto">
                <div className="bg-ncpor-panel rounded-lg p-3 border border-ncpor-divider">
                  <p className="text-[10px] text-ncpor-muted uppercase font-mono mb-1">Rows</p>
                  <p className="text-base font-bold text-ncpor-primary font-mono">{dataset.rowCount.toLocaleString()}</p>
                </div>
                <div className="bg-ncpor-panel rounded-lg p-3 border border-ncpor-divider">
                  <p className="text-[10px] text-ncpor-muted uppercase font-mono mb-1">Variables</p>
                  <p className="text-base font-bold text-ncpor-primary font-mono">{dataset.variables.length}</p>
                </div>
              </div>
              <button
                onClick={() => setForce3D(true)}
                className="text-xs px-4 py-2 rounded-lg border border-ncpor-accent/40 text-ncpor-accent hover:bg-ncpor-accent/10 transition-colors"
              >
                Load 3D view anyway
              </button>
            </div>
          ) : (
            /* ── Normal 3D render ────────────────────────────────────── */
            (() => {
              const VolumeComp = _VolumeField3D;
              if (!VolumeComp) return null;
              return (
                <Suspense fallback={
                  <div className="h-96 flex flex-col items-center justify-center gap-2 bg-[#060c18] rounded-xl border border-ncpor-divider text-xs text-ncpor-muted">
                    <div className="w-6 h-6 border-2 border-ncpor-accent border-t-transparent rounded-full animate-spin" />
                    <span>Loading 3D visualization...</span>
                  </div>
                }>
                  <VolumeComp dataset={dataset} variable={variable} height={height} />
                </Suspense>
              );
            })()
          )
        ) : (
          /* Raw Data Table View */
          <div className="rounded-xl border border-ncpor-divider bg-[#060c18] overflow-hidden">
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full text-left text-xs text-ncpor-secondary font-mono">
                <thead className="sticky top-0 bg-[#0b1622] text-ncpor-primary border-b border-ncpor-divider font-bold">
                  <tr>
                    <th className="p-3">#</th>
                    {dataset.variables.map(v => (
                      <th key={v.name} className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{v.name}</span>
                          <span className="text-[10px] text-ncpor-muted font-normal">{v.unit || v.role}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ncpor-divider/40">
                  {Array.from({ length: Math.min(dataset.rowCount, 100) }).map((_, r) => (
                    <tr key={r} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="p-3 text-ncpor-muted">{r + 1}</td>
                      {dataset.variables.map(v => {
                        const val = v.values ? v.values[r] : v.labels ? v.labels[r] : '-';
                        return (
                          <td key={v.name} className="p-3 whitespace-nowrap">
                            {typeof val === 'number' ? (Number.isFinite(val) ? val.toFixed(4) : 'NaN') : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dataset.rowCount > 100 && (
              <div className="p-3 text-center text-xs text-ncpor-muted border-t border-ncpor-divider bg-[#0b1622]/60">
                Showing first 100 of {dataset.rowCount.toLocaleString()} measurement rows
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
