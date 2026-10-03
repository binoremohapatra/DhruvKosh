import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Search, ArrowUpRight, Globe, Layers, Mountain, X } from 'lucide-react';
import { stations as STATIONS } from '../data/stations';
import { useLiveStats } from '../hooks/useLiveStats';
import verifiedFacts from '../data/facts';
import LiveIndicator from './LiveIndicator';

/* ─── Dark-only design tokens ────────────────────────────────────────────── */
const D = {
  bg:           '#05080F',
  surface:      '#0D1422',
  border:       'rgba(255,255,255,0.10)',
  borderBright: 'rgba(127,231,245,0.35)',
  accent:       '#7FE7F5',
  text:         '#EAF0F8',
  muted:        '#8592A6',
};

/** Indian active stations — always show labels on the globe */
const INDIAN_ACTIVE_IDS = new Set(['maitri', 'bharati', 'himadri']);

/**
 * International stations — show an "International" badge in the info card.
 * These are sourced from stations.js (see src/data/stations.js).
 * Do NOT remove them without asking.
 */
const INTERNATIONAL_IDS = new Set([
  'south-pole', 'prydz-bay', 'dome-c',
  'southern-ocean', 'kerguelen-transect',
  'gruvebadet', 'indarc', 'svalbard-unis',
  'kongsfjorden-glacier', 'fram-strait',
  'greenland-summit', 'chars-arctic', 'arctic-ocean', 'tromso',
]);

const SEARCH_PLACEHOLDERS = [
  'Search the polar archive...',
  'Ice-core records, 1998',
  'Sea-ice extent, Weddell Sea',
  'Bharati atmospheric lidar data',
  'Maitri geomagnetic surveys',
  'Himadri Arctic permafrost samples',
];

/* ─── Coastline data ─────────────────────────────────────────────────────── */
const ANTARCTIC_COASTLINE = [
  [-63.3,-57.0],[-64.2,-59.5],[-66.0,-64.5],[-68.0,-67.0],[-71.0,-68.5],
  [-73.5,-72.0],[-74.5,-78.0],[-74.8,-84.0],[-73.5,-95.0],[-73.0,-103.0],
  [-74.2,-114.0],[-75.0,-125.0],[-75.5,-136.0],[-76.2,-148.0],[-77.5,-158.0],
  [-78.0,-165.0],[-78.5,-175.0],[-78.8,180.0],[-78.5,172.0],[-77.5,166.0],
  [-76.0,163.0],[-73.5,168.0],[-71.0,170.5],[-69.0,164.0],[-68.0,155.0],
  [-67.0,145.0],[-66.5,138.0],[-66.0,128.0],[-65.5,115.0],[-66.0,105.0],
  [-66.5,95.0],[-66.8,85.0],[-68.0,78.0],[-69.4,76.2],
  [-67.5,65.0],[-66.0,52.0],[-67.5,45.0],[-69.0,38.0],[-70.0,25.0],
  [-70.8,11.7],[-71.5,2.0],[-72.0,-10.0],[-74.0,-25.0],[-76.0,-35.0],
  [-77.8,-45.0],[-79.5,-50.0],[-78.0,-60.0],[-75.0,-62.0],[-70.0,-60.0],
  [-65.0,-58.0],[-63.3,-57.0],
];
const ARCTIC_COASTLINE = [
  [76.5,16.0],[77.2,14.5],[78.0,13.5],[78.9,11.9],[79.8,11.5],
  [80.3,16.0],[80.0,22.0],[79.2,25.0],[78.4,21.5],[77.5,22.0],
  [76.8,19.5],[76.5,16.0],
];
const HIMALAYAS_RIDGE = [
  [36.0,74.0],[35.5,75.5],[35.2,77.0],[34.0,77.8],[32.8,77.3],
  [32.4,77.6],[31.5,78.5],[30.8,79.2],[29.8,80.5],[28.8,83.5],
  [28.0,86.5],[27.8,88.5],[28.2,90.5],[28.5,92.5],[29.5,94.5],
  [30.0,95.5],[29.0,95.0],[27.5,92.0],[27.0,88.5],[27.2,85.0],
  [28.5,81.0],[30.0,78.0],[32.0,76.5],[34.5,74.5],[36.0,74.0],
];

/* ─── Orthographic projection ────────────────────────────────────────────── */
function projectOrthographic(latDeg, lonDeg, radius, center, rotAngle = 0, tilt = 1.35) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + rotAngle;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = -Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
  const yT = y * cosT - z * sinT;
  const zT = y * sinT + z * cosT;
  return {
    x: center.x + x * radius,
    y: center.y - yT * radius,
    z: zT,
    isVisible: zT > -0.05,
    scale: Math.max(0.2, (zT + 1) / 2),
  };
}

/* ─── Magnetic button hook ───────────────────────────────────────────────── */
function useMagnetic(strength = 5) {
  const ref = useRef(null);
  const onMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width  / 2) / (r.width  / 2))) * strength;
    const dy = Math.max(-1, Math.min(1, (e.clientY - r.top  - r.height / 2) / (r.height / 2))) * strength;
    ref.current.style.transform = `translate3d(${dx}px,${dy}px,0)`;
  }, [strength]);
  const onMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate3d(0,0,0)';
    ref.current.style.transition = 'transform 350ms cubic-bezier(0.2,0.7,0.2,1)';
  }, []);
  const onMouseEnter = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transition = 'transform 100ms ease-out';
  }, []);
  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

/* ─── Animated live stat ─────────────────────────────────────────────────── */
const HeroLiveStat = ({ value, label, sourceLabel, duration = 1400, delay = 0 }) => {
  const [display, setDisplay] = useState(0);
  const prevRef    = useRef(0);
  const rafRef     = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (value == null || isNaN(value)) return;
    const from = prevRef.current, to = value;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const go = () => {
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setDisplay(Math.round(from + (to - from) * e));
        if (p < 1) { rafRef.current = requestAnimationFrame(tick); }
        else { prevRef.current = to; startedRef.current = true; }
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    if (!startedRef.current && delay > 0) { const t = setTimeout(go, delay); return () => clearTimeout(t); }
    else go();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration, delay]);

  const formatted = display >= 1000 ? display.toLocaleString() : display;
  return (
    <div className="group cursor-default" title={sourceLabel} aria-label={sourceLabel}>
      <div
        className="font-mono text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-[#EAF0F8] group-hover:text-[#7FE7F5] transition-colors duration-220"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value == null
          ? <span className="inline-block w-12 h-6 rounded bg-white/10 animate-pulse align-middle" />
          : formatted}
      </div>
      <div className="text-[11px] sm:text-xs uppercase tracking-wider font-medium text-[#8592A6] opacity-70 group-hover:opacity-100 transition-opacity duration-220">
        {label}
      </div>
    </div>
  );
};

/* ─── Status pill styles ─────────────────────────────────────────────────── */
const PILL = {
  active:         { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  color: '#6EE7B7', label: 'Active' },
  decommissioned: { bg: 'rgba(133,146,166,0.15)', border: 'rgba(133,146,166,0.30)', color: '#8592A6', label: 'Decommissioned' },
  planned:        { bg: 'rgba(127,231,245,0.12)', border: 'rgba(127,231,245,0.30)', color: '#7FE7F5', label: 'Planned' },
};

/* ─── Station info card (React portal) ──────────────────────────────────── */
const StationCard = ({ station, anchorPos, globeRect, onClose, isPinned }) => {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, side: 'right' });
  const [vis, setVis]  = useState(false);
  const isIntl = station.operator ? (!station.operator.toLowerCase().includes('india') && !station.operator.toLowerCase().includes('ncpor') && !station.operator.toLowerCase().includes('wihg') && !station.operator.toLowerCase().includes('dgre') && !station.operator.toLowerCase().includes('drdo') && !station.operator.toLowerCase().includes('gsi')) : INTERNATIONAL_IDS.has(station.id);
  const pill   = PILL[station.status] || PILL.active;
  const rm     = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* Compute placement once anchor is known */
  useEffect(() => {
    if (!anchorPos || !globeRect) return;
    const CW = 340, CH = 280, HEADER = 80, MARGIN = 16;
    const VW = window.innerWidth, VH = window.innerHeight;
    const mx = globeRect.left + anchorPos.x;
    const my = globeRect.top  + anchorPos.y;
    const gcx = globeRect.left + globeRect.width / 2;
    let left, side;
    if (mx > gcx && mx - CW - 20 >= MARGIN) { left = mx - CW - 20; side = 'left'; }
    else if (mx + 20 + CW <= VW - MARGIN)    { left = mx + 20;      side = 'right'; }
    else { left = Math.max(MARGIN, globeRect.left - CW - 12); side = 'left'; }
    let top = Math.max(HEADER, my - CH / 2);
    top = Math.min(top, VH - CH - MARGIN);
    setPos({ left, top, side });
    requestAnimationFrame(() => setVis(true));
  }, [anchorPos, globeRect]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!anchorPos || !globeRect) return null;

  /* Leader line endpoints */
  const lx  = globeRect.left + anchorPos.x;
  const ly  = globeRect.top  + anchorPos.y;
  const cx2 = pos.side === 'right' ? pos.left : pos.left + 340;

  return ReactDOM.createPortal(
    <>
      {/* Thin dashed leader line */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9998 }}
        aria-hidden="true"
      >
        <line x1={lx} y1={ly} x2={cx2} y2={pos.top + 40}
          stroke="rgba(127,231,245,0.30)" strokeWidth="1" strokeDasharray="4 3" />
      </svg>

      {/* Card */}
      <div
        ref={cardRef}
        data-station-card="true"
        role="dialog"
        aria-label={station.name + ' station info'}
        style={{
          position: 'fixed', left: pos.left, top: pos.top,
          width: 340, minWidth: 300, maxWidth: 380, zIndex: 9999,
          padding: '18px 20px', borderRadius: 14,
          background: D.surface,
          border: `1px solid ${D.border}`,
          borderTop: `1px solid ${D.borderBright}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
          opacity: vis ? 1 : 0,
          transform: vis ? 'translateY(0)' : 'translateY(-8px)',
          transition: rm
            ? 'opacity 200ms'
            : 'opacity 200ms cubic-bezier(0.2,0.7,0.2,1), transform 200ms cubic-bezier(0.2,0.7,0.2,1)',
          willChange: 'opacity, transform',
        }}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 12, right: 12, padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: D.muted, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          aria-label="Close station info"
        >
          <X size={14} />
        </button>

        {/* Title + status pill */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4, paddingRight: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: D.text, lineHeight: 1.2, flex: 1 }}>{station.name}</span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: pill.bg, border: `1px solid ${pill.border}`, color: pill.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {pill.label}
          </span>
        </div>

        {/* International badge */}
        {isIntl && (
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 20, background: 'rgba(133,146,166,0.12)', border: '1px solid rgba(133,146,166,0.25)', color: D.muted, marginBottom: 6 }}>
            International
          </span>
        )}

        {/* Place / region subtitle */}
        {station.place && (
          <p style={{ fontSize: 13, color: D.muted, margin: '0 0 10px', lineHeight: 1.4 }}>{station.place}</p>
        )}

        <div style={{ height: 1, background: D.border, marginBottom: 10 }} />

        {/* Description (max 4 lines) */}
        {station.description && (
          <p style={{ fontSize: 14, color: D.text, lineHeight: 1.55, margin: '0 0 12px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {station.description}
          </p>
        )}

        {/* Data grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          {station.coordsFormatted && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Coordinates</div>
              <div style={{ fontSize: 13, color: D.text, fontFamily: 'monospace' }}>{station.coordsFormatted}</div>
            </div>
          )}
          {station.elevation && station.elevation !== 'undefined' && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Elevation</div>
              <div style={{ fontSize: 14, color: D.text }}>{station.elevation}</div>
            </div>
          )}
          {station.year && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Established</div>
              <div style={{ fontSize: 14, color: D.text }}>{station.year}</div>
            </div>
          )}
          {station.region && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Region</div>
              <div style={{ fontSize: 14, color: D.text }}>{station.region}</div>
            </div>
          )}
        </div>

        {isPinned && (
          <div style={{ fontSize: 11, color: D.muted, marginTop: 10, opacity: 0.6 }}>
            Press Esc or click outside to close
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

/* ─── Mobile bottom sheet ────────────────────────────────────────────────── */
const MobileStationSheet = ({ station, onClose }) => {
  const [vis, setVis] = useState(false);
  const isIntl = station.operator ? (!station.operator.toLowerCase().includes('india') && !station.operator.toLowerCase().includes('ncpor') && !station.operator.toLowerCase().includes('wihg') && !station.operator.toLowerCase().includes('dgre') && !station.operator.toLowerCase().includes('drdo') && !station.operator.toLowerCase().includes('gsi')) : INTERNATIONAL_IDS.has(station.id);
  const pill   = PILL[station.status] || PILL.active;

  useEffect(() => {
    requestAnimationFrame(() => setVis(true));
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return ReactDOM.createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,15,0.7)', zIndex: 9997, transition: 'opacity 200ms', opacity: vis ? 1 : 0 }} />
      <div
        role="dialog"
        aria-label={station.name + ' station info'}
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '60vh', overflowY: 'auto', zIndex: 9999, padding: '20px 20px 32px', background: D.surface, borderTop: `1px solid ${D.borderBright}`, borderRadius: '16px 16px 0 0', transform: vis ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 300ms cubic-bezier(0.2,0.7,0.2,1)' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: D.muted, borderRadius: 6 }} aria-label="Close"><X size={16} /></button>
        <div style={{ width: 36, height: 4, background: D.border, borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4, paddingRight: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: D.text, lineHeight: 1.2, flex: 1 }}>{station.name}</span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: pill.bg, border: `1px solid ${pill.border}`, color: pill.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{pill.label}</span>
        </div>
        {isIntl && <span style={{ display: 'inline-block', fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'rgba(133,146,166,0.12)', border: '1px solid rgba(133,146,166,0.25)', color: D.muted, marginBottom: 6 }}>International</span>}
        {station.place && <p style={{ fontSize: 13, color: D.muted, margin: '0 0 10px', lineHeight: 1.4 }}>{station.place}</p>}
        <div style={{ height: 1, background: D.border, marginBottom: 10 }} />
        {station.description && <p style={{ fontSize: 14, color: D.text, lineHeight: 1.55, margin: '0 0 12px' }}>{station.description}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          {station.coordsFormatted && <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Coordinates</div><div style={{ fontSize: 13, color: D.text, fontFamily: 'monospace' }}>{station.coordsFormatted}</div></div>}
          {station.elevation && <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Elevation</div><div style={{ fontSize: 14, color: D.text }}>{station.elevation}</div></div>}
          {station.year && <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Established</div><div style={{ fontSize: 14, color: D.text }}>{station.year}</div></div>}
        </div>
      </div>
    </>,
    document.body
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN POLAR GLOBE HERO COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */
export const PolarGlobeHero = ({ onSearch, className = '' }) => {
  /* Live stats from backend — React Query, shared with Dashboard/Repository */
  const { data: liveData, isError: statsError, dataUpdatedAt } = useLiveStats();
  const liveDocuments = liveData?.documents ?? null;

  const [polarView,       setPolarView]       = useState('antarctic');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [placeholderIndex,setPlaceholderIndex]= useState(0);
  const [globeReady,      setGlobeReady]      = useState(false);
  const [activeStation,   setActiveStation]   = useState(null);
  const [isPinned,        setIsPinned]        = useState(false);
  const [anchorPos,       setAnchorPos]       = useState(null);
  const [globeRect,       setGlobeRect]       = useState(null);

  const heroRef       = useRef(null);
  const canvasRef     = useRef(null);
  const searchInputRef= useRef(null);
  const animFrameRef  = useRef(null);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const searchMag     = useMagnetic(4);

  /**
   * All mutable rendering state lives here — never in React state.
   * This avoids triggering re-renders from the frame loop or mousemove.
   */
  const ms = useRef({
    rotation: 0.28, rotationSpeed: 0.0008,
    tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0,
    isDragging: false, dragStartX: 0, velocity: 0, lastMouseX: 0,
    inView: true, reducedMotion: false,
    currentTiltBase: 1.35, targetTiltBase: 1.35,
    isCardOpen: false, isScrolling: false, hoveredId: null,
  });

  /** Screen-space marker positions, updated each frame for hit-testing */
  const markerPosRef = useRef([]);
  /** Stations currently rendered (changes when polarView changes) */
  const visibleStRef = useRef([]);

  /* ── Side-effects ──────────────────────────────────────────────────────── */
  useEffect(() => {
    ms.current.targetTiltBase =
      polarView === 'antarctic' ? 1.35 :
      polarView === 'arctic'    ? -1.35 : 0.45;
  }, [polarView]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion:reduce)');
    ms.current.reducedMotion = mq.matches;
    const h = (e) => { ms.current.reducedMotion = e.matches; };
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { ms.current.inView = e.isIntersecting; }, { threshold: 0.05 });
    if (heroRef.current) obs.observe(heroRef.current);
    const v = () => { ms.current.inView = !document.hidden; };
    document.addEventListener('visibilitychange', v);
    return () => { obs.disconnect(); document.removeEventListener('visibilitychange', v); };
  }, []);

  useEffect(() => {
    let t;
    const h = () => { ms.current.isScrolling = true; clearTimeout(t); t = setTimeout(() => { ms.current.isScrolling = false; }, 200); };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIndex(p => (p + 1) % SEARCH_PLACEHOLDERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchInputRef.current?.focus(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { const t = setTimeout(() => setGlobeReady(true), 40); return () => clearTimeout(t); }, []);

  /* Keep mutable flag in sync with card state */
  useEffect(() => { ms.current.isCardOpen = !!activeStation; }, [activeStation]);

  /* Outside click closes pinned card */
  useEffect(() => {
    if (!isPinned) return;
    const h = (e) => {
      if (!e.target.closest('[data-station-card]') && !e.target.closest('canvas')) {
        setActiveStation(null); setIsPinned(false); setAnchorPos(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isPinned]);

  const closeCard = useCallback(() => {
    setActiveStation(null); setIsPinned(false); setAnchorPos(null);
    /* Resume auto-rotate 2 s after card closes */
    setTimeout(() => { ms.current.isCardOpen = false; }, 2000);
  }, []);

  const handleSearchSubmit = (e) => { e?.preventDefault(); if (onSearch) onSearch(searchQuery.trim()); };

  /* ════════════════════════════════════════════════════════════════════════
     CANVAS RENDER LOOP — no React state updates inside
     ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); /* cap DPR at 1.5 */
    let atmGlow, sphereGrad, rimGrad, cachedR = 0, lastT = performance.now();

    const resize = () => {
      const p = canvas.parentElement; if (!p) return;
      canvas.width  = p.clientWidth  * dpr;
      canvas.height = p.clientHeight * dpr;
      canvas.style.width  = p.clientWidth  + 'px';
      canvas.style.height = p.clientHeight + 'px';
      ctx.scale(dpr, dpr);
      cachedR = 0; /* invalidate cached gradients */
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (time) => {
      const state = ms.current;
      /* Throttle: 30fps idle, 60fps interactive */
      const idle     = !state.isDragging && !state.isCardOpen;
      const interval = 1000 / (idle ? 30 : 60);
      const elapsed  = time - lastT;

      if (!state.inView || document.hidden) { animFrameRef.current = requestAnimationFrame(render); return; }
      if (elapsed < interval)               { animFrameRef.current = requestAnimationFrame(render); return; }
      lastT = time - (elapsed % interval);
      if (!canvas.parentElement)            { animFrameRef.current = requestAnimationFrame(render); return; }

      const W = canvas.parentElement.clientWidth;
      const H = canvas.parentElement.clientHeight;
      const R = Math.min(W, H) * 0.54;
      const cx = { x: W > 1024 ? W * 0.68 : W * 0.52, y: H * 0.5 };

      state.currentTiltBase += (state.targetTiltBase - state.currentTiltBase) * 0.05;
      state.tiltX += (state.targetTiltX - state.tiltX) * 0.08;
      state.tiltY += (state.targetTiltY - state.tiltY) * 0.08;

      /* Auto-rotate — paused while card is open, dragging, scrolling, or reduced-motion */
      if (!state.isDragging && !state.reducedMotion && !state.isCardOpen && !state.isScrolling) {
        state.rotation += state.rotationSpeed;
        if (Math.abs(state.velocity) > 0.0001) { state.rotation += state.velocity; state.velocity *= 0.94; }
      }

      ctx.clearRect(0, 0, W, H);
      const tilt = state.currentTiltBase + (state.tiltY * Math.PI) / 180;
      const rot  = state.rotation        + (state.tiltX * Math.PI) / 180;

      /* ── Gradients (created once per resize) ── */
      if (R !== cachedR) {
        cachedR = R;
        atmGlow = ctx.createRadialGradient(cx.x, cx.y, R * 0.85, cx.x, cx.y, R * 1.3);
        atmGlow.addColorStop(0,   'rgba(28,76,140,0.45)');
        atmGlow.addColorStop(0.5, 'rgba(15,45,90,0.2)');
        atmGlow.addColorStop(1,   'rgba(5,8,15,0)');
        sphereGrad = ctx.createRadialGradient(cx.x - R * 0.2, cx.y - R * 0.2, R * 0.05, cx.x, cx.y, R);
        sphereGrad.addColorStop(0,    '#163B66');
        sphereGrad.addColorStop(0.45, '#0E2747');
        sphereGrad.addColorStop(0.85, '#08172D');
        sphereGrad.addColorStop(1,    '#050D1A');
        rimGrad = ctx.createLinearGradient(cx.x - R, cx.y - R, cx.x + R, cx.y + R);
        rimGrad.addColorStop(0,   'rgba(127,231,245,0.75)');
        rimGrad.addColorStop(0.5, 'rgba(47,95,168,0.4)');
        rimGrad.addColorStop(1,   'rgba(127,231,245,0.5)');
      }

      /* ── Atmosphere ── */
      ctx.fillStyle = atmGlow;
      ctx.beginPath(); ctx.arc(cx.x, cx.y, R * 1.3, 0, Math.PI * 2); ctx.fill();

      /* ── Globe disk ── */
      ctx.save();
      ctx.beginPath(); ctx.arc(cx.x, cx.y, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = sphereGrad; ctx.fill();

      /* Latitude rings */
      [0.18, 0.36, 0.54, 0.72, 0.90].forEach(f => {
        ctx.beginPath(); ctx.arc(cx.x, cx.y, R * f, 0, Math.PI * 2);
        ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(64,130,200,0.24)'; ctx.stroke();
      });

      /* Meridians */
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        ctx.beginPath(); ctx.moveTo(cx.x, cx.y); ctx.lineTo(cx.x + Math.cos(a) * R, cx.y + Math.sin(a) * R);
        ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(64,130,200,0.16)'; ctx.stroke();
      }

      /* Lat graticule */
      const lats = polarView === 'antarctic' ? [-80,-70,-60,-50] : polarView === 'arctic' ? [80,70,60,50] : [40,35,30,25];
      lats.forEach(latDeg => {
        ctx.beginPath(); let f = true;
        for (let lon = 0; lon <= 360; lon += 6) {
          const pt = projectOrthographic(latDeg, lon, R, cx, rot, tilt);
          if (pt.isVisible) { f ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y); f = false; } else f = true;
        }
        ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(127,231,245,0.15)'; ctx.stroke();
      });

      /* Coastline */
      const coast = polarView === 'antarctic' ? ANTARCTIC_COASTLINE : polarView === 'arctic' ? ARCTIC_COASTLINE : HIMALAYAS_RIDGE;
      ctx.beginPath(); let cs = false;
      coast.forEach(([la, lo]) => {
        const pt = projectOrthographic(la, lo, R, cx, rot, tilt);
        if (pt.isVisible) { cs ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y); cs = true; }
      });
      if (cs) { ctx.closePath(); ctx.fillStyle = 'rgba(20,50,90,0.4)'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(127,231,245,0.35)'; ctx.stroke(); }

      /* Pole dot */
      ctx.fillStyle = 'rgba(127,231,245,0.8)';
      ctx.beginPath(); ctx.arc(cx.x, cx.y, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      /* Rim */
      ctx.beginPath(); ctx.arc(cx.x, cx.y, R, 0, Math.PI * 2);
      ctx.lineWidth = 1.8; ctx.strokeStyle = rimGrad; ctx.stroke();

      /* ── Markers & labels ── */
      const visible = STATIONS.filter(s =>
        polarView === 'antarctic' ? s.region === 'Antarctica' || s.region === 'Southern Ocean' :
        polarView === 'arctic'    ? s.region === 'Arctic' :
                                    s.region === 'Himalayas'
      );
      visibleStRef.current = visible;

      const hasActive = state.isCardOpen;
      const priorityOf = s => {
        if (s.id === state.hoveredId)              return 5;
        if (INDIAN_ACTIVE_IDS.has(s.id))           return 4;
        if (s.status === 'planned')                 return 3;
        if (s.status === 'active' && !INTERNATIONAL_IDS.has(s.id)) return 2;
        if (s.status === 'decommissioned')          return 1;
        return 0;
      };
      const sorted = [...visible].sort((a, b) => priorityOf(b) - priorityOf(a));

      /** Simple AABB collision for labels */
      const drawnRects = [];
      const overlaps = (x, y, w, h) =>
        drawnRects.some(r => !(x + w < r.x || x > r.x + r.w || y + h < r.y || y > r.y + r.h));

      const newMPs = [];

      sorted.forEach(station => {
        const pt = projectOrthographic(station.lat, station.lon, R, cx, rot, tilt);
        if (!pt.isVisible) return;
        newMPs.push({ id: station.id, x: pt.x, y: pt.y });

        const isHov    = state.hoveredId === station.id;
        const isDim    = hasActive && !isHov;
        const isIndian = INDIAN_ACTIVE_IDS.has(station.id);

        ctx.save();

        /* Pulse ring */
        const pp = (time % 6000) / 6000;
        const rr = 6 + (isHov ? 12 : pp * 14);
        const ra = isHov ? 0.85 : (1 - pp) * 0.45;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, rr, 0, Math.PI * 2);
        ctx.strokeStyle = station.status === 'planned' ? '#7FE7F5' : '#F2B441';
        ctx.lineWidth = 1.4; ctx.globalAlpha = isDim ? 0.15 : ra; ctx.stroke();

        /* Marker core (min 32px touch area via the 16px radius hit zone in hitTest) */
        ctx.beginPath(); ctx.arc(pt.x, pt.y, isHov ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = station.status === 'planned' ? '#7FE7F5' : '#F2B441';
        ctx.globalAlpha = isDim ? 0.3 : 1; ctx.fill();

        /* Labels: always Indian active, only on hover for others; hide all when card open */
        const showLabel = !isDim && (isIndian || isHov);
        if (showLabel) {
          const pl   = station.labelPlacement || 'right';
          const flip = pl.includes('left') || pt.x > W - 180 || pt.x > cx.x + R * 0.4;
          const ld   = flip ? -1 : 1;
          const isTop = pl.includes('top');
          const lex  = pt.x + ld * 42;
          const ley  = pt.y + (isTop ? -22 : 22);

          ctx.font = '600 12px Inter, sans-serif';
          const nw = ctx.measureText(station.name.toUpperCase()).width;
          const lx2 = flip ? lex - 5 - nw : lex + 5;
          const lr = { x: lx2 - 4, y: ley - 16, w: nw + 8, h: 22 };

          if (overlaps(lr.x, lr.y, lr.w, lr.h)) { ctx.restore(); return; }
          drawnRects.push(lr);

          /* Leader line */
          ctx.globalAlpha = isDim ? 0.2 : 0.6;
          ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x + ld * 14, ley); ctx.lineTo(lex, ley);
          ctx.strokeStyle = 'rgba(234,240,248,0.45)'; ctx.lineWidth = 1; ctx.shadowBlur = 0; ctx.stroke();

          /* Dark halo pill behind Indian station labels for legibility */
          if (isIndian) {
            ctx.globalAlpha = 0.85; ctx.fillStyle = 'rgba(5,8,15,0.72)';
            const px2 = flip ? lex - 5 - nw - 6 : lex + 5 - 4;
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(px2, ley - 17, nw + 10, 18, 4); ctx.fill(); }
          }

          /* Station name */
          ctx.font = '600 12px Inter, sans-serif';
          ctx.fillStyle = 'rgba(234,240,248,0.92)';
          ctx.textAlign = flip ? 'right' : 'left';
          ctx.globalAlpha = isDim ? 0 : 1;
          ctx.fillText(station.name.toUpperCase(), lex + (flip ? -5 : 5), ley - 4);

          /* Coordinates — only on hover */
          if (isHov) {
            ctx.font = '400 11px monospace'; ctx.fillStyle = '#8592A6'; ctx.globalAlpha = 0.85;
            ctx.fillText(
              station.coordsFormatted || (Math.abs(station.lat).toFixed(2) + 'N ' + Math.abs(station.lon).toFixed(2) + 'E'),
              lex + (flip ? -5 : 5), ley + 10
            );
          }
        }

        ctx.restore();
      });

      markerPosRef.current = newMPs;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeStation, polarView]);

  /* ── Hit-test against canvas marker positions ──────────────────────────── */
  const hitTest = useCallback((cx, cy) => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const mx = cx - r.left, my = cy - r.top, HIT = 20;
    let best = null, bd = Infinity;
    markerPosRef.current.forEach(({ id, x, y }) => {
      const d = Math.hypot(mx - x, my - y);
      if (d < HIT && d < bd) { bd = d; best = id; }
    });
    return best ? visibleStRef.current.find(s => s.id === best) : null;
  }, []);

  /* ── Mouse events ──────────────────────────────────────────────────────── */
  const handleMouseMove = useCallback((e) => {
    const state = ms.current;
    if (state.isDragging) {
      const dx = e.clientX - state.lastMouseX;
      state.rotation += dx * 0.005; state.velocity = dx * 0.002; state.lastMouseX = e.clientX; return;
    }
    if (heroRef.current) {
      const r = heroRef.current.getBoundingClientRect();
      state.targetTiltX =  ((e.clientX - r.left) / r.width  - 0.5) * 3.0;
      state.targetTiltY = -((e.clientY - r.top)  / r.height - 0.5) * 3.0;
    }
    if (isPinned) return;

    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      state.hoveredId = hit.id;
      clearTimeout(closeTimerRef.current); clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setActiveStation(hit);
        const c = canvasRef.current; if (!c) return;
        const cr = c.getBoundingClientRect();
        const mp = markerPosRef.current.find(m => m.id === hit.id);
        if (mp) { setAnchorPos({ x: mp.x, y: mp.y }); setGlobeRect(cr); }
      }, 80);
    } else {
      clearTimeout(hoverTimerRef.current); state.hoveredId = null;
      if (activeStation && !isPinned) {
        closeTimerRef.current = setTimeout(() => { setActiveStation(null); setAnchorPos(null); }, 150);
      }
    }
  }, [isPinned, activeStation, hitTest]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'button') return;
    ms.current.isDragging = true; ms.current.lastMouseX = e.clientX;
    ms.current.velocity = 0; ms.current.dragStartX = e.clientX;
  }, []);

  const handleMouseUp = useCallback((e) => {
    const state = ms.current;
    const wasDrag = Math.abs(e.clientX - state.dragStartX) > 4;
    state.isDragging = false; if (wasDrag) return;
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      setActiveStation(hit); setIsPinned(true);
      const c = canvasRef.current; if (!c) return;
      const cr = c.getBoundingClientRect();
      const mp = markerPosRef.current.find(m => m.id === hit.id);
      if (mp) { setAnchorPos({ x: mp.x, y: mp.y }); setGlobeRect(cr); }
    } else if (!isPinned) { setActiveStation(null); setAnchorPos(null); }
  }, [hitTest, isPinned]);

  const handleMouseLeave = useCallback(() => {
    const state = ms.current;
    state.isDragging = false; state.targetTiltX = 0; state.targetTiltY = 0; state.hoveredId = null;
    clearTimeout(hoverTimerRef.current);
    if (activeStation && !isPinned) {
      closeTimerRef.current = setTimeout(() => { setActiveStation(null); setAnchorPos(null); }, 150);
    }
  }, [activeStation, isPinned]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => { if (e.key === 'Escape') closeCard(); }}
      className={`polar-hero relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden select-none bg-[#05080F] text-[#EAF0F8] ${className}`}
      style={{ fontFamily: "'Inter', sans-serif" }}
      aria-label="DhruvKosh Polar Globe Hero"
    >
      {/* Top aurora glow */}
      <div
        className="pointer-events-none absolute -top-[25%] left-1/2 -translate-x-1/2 w-[110vw] h-[450px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(127,231,245,0.08) 0%, rgba(47,95,168,0.05) 50%, transparent 80%)', filter: 'blur(120px)' }}
        aria-hidden="true"
      />

      {/* Globe canvas column */}
      <div className={`absolute inset-0 w-full h-full pointer-events-auto transition-all duration-1000 ease-out z-10 ${globeReady ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          title="Drag to rotate globe. Hover station markers to inspect."
          tabIndex={0}
          aria-label="Interactive polar globe"
        />

        {/* View switcher — one of three: backdrop-filter elements allowed */}
        <div
          className="absolute bottom-6 right-6 sm:bottom-10 sm:right-12 z-40 flex items-center gap-1.5 p-1 rounded-full border border-white/10 bg-[#0D1422]/95 shadow-xl"
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {[
            { id: 'antarctic', label: 'Antarctica',         Icon: Globe   },
            { id: 'arctic',    label: 'Arctic',             Icon: Layers  },
            { id: 'himalayas', label: 'Himalayas (Himansh)',Icon: Mountain },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setPolarView(id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                polarView === id
                  ? 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                  : 'text-[#8592A6] hover:text-[#EAF0F8]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /><span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Left column: headline, search, stats */}
      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-12 relative z-20 pointer-events-none">
        <div className="max-w-xl pointer-events-auto">

          <div className="overflow-hidden mb-5">
            <h1
              className={`font-[300] tracking-[-0.02em] leading-[1.08] transition-all duration-900 ease-out max-w-[12ch] text-[#EAF0F8] ${globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
              style={{ fontSize: 'clamp(2.6rem, 5vw, 4.5rem)' }}
            >
              India's Knowledge <br />
              <span className="opacity-60 font-[300]">at the Edge of the World.</span>
            </h1>
          </div>

          <p className={`text-base sm:text-lg mb-8 max-w-md font-normal transition-all duration-900 delay-150 ease-out text-[#8592A6] ${globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Every expedition. Every dataset. One fixed point.
          </p>

          {/* Search bar — one of three backdrop-filter elements */}
          <div className={`relative w-full max-w-md mb-8 transition-all duration-900 delay-300 ease-out ${globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center w-full rounded-full transition-all duration-300 group bg-[#0D1422]/85 border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] focus-within:border-[#7FE7F5]/80 focus-within:shadow-[0_0_20px_rgba(127,231,245,0.2)] focus-within:scale-[1.04]"
              style={{ backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.22)' }}
            >
              <div className="pl-5 pr-2 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-[#8592A6] group-focus-within:text-[#7FE7F5] transition-colors duration-220" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                className="w-full py-3.5 pr-14 bg-transparent text-sm sm:text-base outline-none font-normal text-[#EAF0F8] placeholder-[#8592A6]/70"
                aria-label="Search the polar archive"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded border border-white/10 text-[#8592A6]">⌘K</kbd>
                <button
                  type="submit"
                  ref={searchMag.ref}
                  onMouseMove={searchMag.onMouseMove}
                  onMouseEnter={searchMag.onMouseEnter}
                  onMouseLeave={searchMag.onMouseLeave}
                  className="p-2 rounded-full transition-all active:scale-95 bg-[#7FE7F5] text-[#05080F] hover:bg-white"
                  aria-label="Submit search"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Stats row */}
          <div className={`pt-5 border-t border-white/10 grid grid-cols-3 gap-4 max-w-md transition-all duration-900 delay-500 ease-out ${globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <HeroLiveStat value={liveDocuments} label="Documents" sourceLabel="Live count from the DhruvKosh repository" duration={1400} delay={600} />
            <HeroLiveStat value={verifiedFacts.antarcticExpeditions.value} label={verifiedFacts.antarcticExpeditions.shortLabel} sourceLabel={verifiedFacts.antarcticExpeditions.note} duration={1400} delay={700} />
            <HeroLiveStat value={verifiedFacts.activeStations.value} label={verifiedFacts.activeStations.shortLabel} sourceLabel={verifiedFacts.activeStations.note} duration={1400} delay={800} />
          </div>

          <div className="pt-2">
            <LiveIndicator dataUpdatedAt={dataUpdatedAt} isError={statsError} />
          </div>
        </div>
      </div>

      {/* Station card / bottom sheet */}
      {activeStation && (
        isMobile
          ? <MobileStationSheet station={activeStation} onClose={closeCard} />
          : <StationCard station={activeStation} anchorPos={anchorPos} globeRect={globeRect} onClose={closeCard} isPinned={isPinned} />
      )}

      <style>{`
        @keyframes polarAuroraDrift {
          0%   { transform: translate3d(-52%, 0, 0) scale(1); opacity: 0.06; }
          50%  { transform: translate3d(-48%, 15px, 0) scale(1.08); opacity: 0.09; }
          100% { transform: translate3d(-52%, -10px, 0) scale(0.96); opacity: 0.05; }
        }
      `}</style>
    </section>
  );
};

export default PolarGlobeHero;
