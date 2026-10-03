import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const LS_KEY = 'dhruv_datasaver';

/** Classify the Network Information API into one of our four tiers. */
function classify(conn) {
  if (!conn) return 'unknown';
  if (conn.saveData) return 'slow';
  const type = conn.effectiveType;
  const dl   = typeof conn.downlink === 'number' ? conn.downlink : Infinity;
  if (type === 'slow-2g' || type === '2g') return 'slow';
  if (type === '3g') return 'moderate';
  if (type === '4g' && dl >= 1) return 'fast';
  if (type === '4g') return 'moderate'; // 4g but low downlink
  return 'unknown';
}

const BandwidthContext = createContext(null);

export function BandwidthProvider({ children }) {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

  const [connectionType, setConnectionType] = useState(() => classify(conn));
  const [saveData,       setSaveData]       = useState(() => !!(conn?.saveData));
  const [manualOverride, setManualOverride] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === 'true'; } catch { return false; }
  });

  // Re-classify whenever the network changes
  useEffect(() => {
    if (!conn) return;
    const update = () => {
      setConnectionType(classify(conn));
      setSaveData(!!(conn.saveData));
    };
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, [conn]);

  const toggleManual = useCallback((val) => {
    const next = typeof val === 'boolean' ? val : !manualOverride;
    setManualOverride(next);
    try { localStorage.setItem(LS_KEY, String(next)); } catch { /* ignore */ }
  }, [manualOverride]);

  // isLowBandwidth: true when the network is slow/moderate OR the user forced it
  const isLowBandwidth = manualOverride || connectionType === 'slow' || connectionType === 'moderate';

  const value = {
    connectionType,   // 'fast' | 'moderate' | 'slow' | 'unknown'
    isLowBandwidth,   // boolean — main gate for heavy content
    saveData,         // navigator.connection.saveData
    manualOverride,
    setManualOverride: toggleManual,
  };

  return (
    <BandwidthContext.Provider value={value}>
      {children}
    </BandwidthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBandwidth() {
  const ctx = useContext(BandwidthContext);
  if (!ctx) throw new Error('useBandwidth must be used inside <BandwidthProvider>');
  return ctx;
}

export default BandwidthContext;
