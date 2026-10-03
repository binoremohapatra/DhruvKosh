import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Search, ArrowUpRight, Globe, Layers, Mountain, X } from 'lucide-react';
import { useLiveStats } from '../hooks/useLiveStats';
import { useBandwidth } from '../context/BandwidthContext';
import verifiedFacts from '../data/facts';
import LiveIndicator from './LiveIndicator';

let _PolarGlobe3D = null;

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

/** International stations — show an "International" badge in the info card */
const INTERNATIONAL_IDS = new Set([
  'south-pole', 'prydz-bay', 'dome-c',
  'southern-ocean', 'kerguelen-transect',
  'gruvebadet', 'indarc', 'svalbard-unis',
  'kongsfjorden-glacier', 'fram-strait',
  'greenland-summit', 'chars-arctic', 'arctic-ocean', 'tromso',
]);

const SEARCH_PLACEHOLDERS = [
  "Search the polar archive...",
  "Ice-core records, 1998",
  "Sea-ice extent, Weddell Sea",
  "Bharati atmospheric lidar data",
  "Maitri geomagnetic surveys",
  "Himadri Arctic permafrost samples",
  "Himansh high-altitude glacier mass balance",
];

function useMagnetic(strength = 5) {
  const ref = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = (e.clientX - centerX) / (rect.width / 2);
    const distanceY = (e.clientY - centerY) / (rect.height / 2);
    const moveX = Math.max(-1, Math.min(1, distanceX)) * strength;
    const moveY = Math.max(-1, Math.min(1, distanceY)) * strength;
    ref.current.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate3d(0, 0, 0)';
    ref.current.style.transition = 'transform 350ms cubic-bezier(0.2, 0.7, 0.2, 1)';
  }, []);

  const onMouseEnter = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transition = 'transform 100ms ease-out';
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

/* ── HeroLiveStat ──────────────────────────────────────────────────────── */
const HeroLiveStat = ({ value, label, sourceLabel, duration, delay }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef  = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (value == null || isNaN(value)) return;
    const from = prevRef.current;
    const to   = value;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startAnim = () => {
      const start = performance.now();
      const tick = (now) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          prevRef.current = to;
          startedRef.current = true;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    if (!startedRef.current && delay > 0) {
      const t = setTimeout(startAnim, delay);
      return () => clearTimeout(t);
    } else {
      startAnim();
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration, delay]);

  const formatted = display >= 1000 ? display.toLocaleString() : display;

  return (
    <div className="group cursor-default transition-all duration-220" title={sourceLabel} aria-label={sourceLabel}>
      <div
        className="font-mono text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-220 tabular-nums text-[#EAF0F8] group-hover:text-[#7FE7F5]"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value == null
          ? <span className="inline-block w-12 h-6 rounded bg-white/10 animate-pulse align-middle" />
          : formatted
        }
      </div>
      <div
        className="text-[11px] sm:text-xs uppercase tracking-wider font-medium transition-opacity duration-220 text-[#8592A6] opacity-70 group-hover:opacity-100"
      >
        {label}
      </div>
    </div>
  );
};

/* ── Status pill styles ─────────────────────────────────────────────────── */
const PILL = {
  active:         { bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.35)',  color: '#6EE7B7', label: 'Active' },
  decommissioned: { bg: 'rgba(133,146,166,0.15)', border: 'rgba(133,146,166,0.30)', color: '#8592A6', label: 'Decommissioned' },
  planned:        { bg: 'rgba(127,231,245,0.12)', border: 'rgba(127,231,245,0.30)', color: '#7FE7F5', label: 'Planned' },
};

/* ─── Clear, Large, Readable Station Info Card (Portal) ─────────────────── */
const StationCard = ({ station, anchorPos, onClose, isPinned, onMouseEnter, onMouseLeave }) => {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, side: 'right' });
  const [vis, setVis] = useState(false);
  const isIntl = station.operator ? (!station.operator.toLowerCase().includes('india') && !station.operator.toLowerCase().includes('ncpor') && !station.operator.toLowerCase().includes('wihg') && !station.operator.toLowerCase().includes('dgre') && !station.operator.toLowerCase().includes('drdo') && !station.operator.toLowerCase().includes('gsi')) : INTERNATIONAL_IDS.has(station.id);
  const pill   = PILL[station.status] || PILL.active;
  const rm     = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* Calculate smart side placement */
  useEffect(() => {
    if (!anchorPos) return;
    const CW = 350, CH = 290, HEADER = 80, MARGIN = 16;
    const VW = window.innerWidth, VH = window.innerHeight;
    const mx = anchorPos.x;
    const my = anchorPos.y;
    
    let left, side;
    if (mx > VW * 0.55 && mx - CW - 24 >= MARGIN) {
      left = mx - CW - 24;
      side = 'left';
    } else if (mx + 24 + CW <= VW - MARGIN) {
      left = mx + 24;
      side = 'right';
    } else {
      left = Math.max(MARGIN, mx - CW / 2);
      side = 'center';
    }

    let top = Math.max(HEADER, my - CH / 2);
    top = Math.min(top, VH - CH - MARGIN);
    
    setPos({ left, top, side });
    requestAnimationFrame(() => setVis(true));
  }, [anchorPos]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!anchorPos) return null;

  const lx  = anchorPos.x;
  const ly  = anchorPos.y;
  const cx2 = pos.side === 'right' ? pos.left : (pos.side === 'left' ? pos.left + 350 : pos.left + 175);

  return ReactDOM.createPortal(
    <>
      {/* Dashed SVG leader line connecting 3D marker to clear card */}
      <svg
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9998 }}
        aria-hidden="true"
      >
        <line
          x1={lx} y1={ly} x2={cx2} y2={pos.top + 45}
          stroke="rgba(127,231,245,0.35)" strokeWidth="1.2" strokeDasharray="4 3"
        />
      </svg>

      {/* Crystal clear, solid high-contrast card */}
      <div
        ref={cardRef}
        data-station-card="true"
        role="dialog"
        aria-label={station.name + ' polar region details'}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          position: 'fixed',
          left: pos.left,
          top: pos.top,
          width: 350,
          minWidth: 320,
          maxWidth: 380,
          zIndex: 9999,
          padding: '20px 22px',
          borderRadius: 14,
          background: D.surface,
          border: `1px solid ${D.border}`,
          borderTop: `1px solid ${D.borderBright}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.05)',
          opacity: vis ? 1 : 0,
          transform: vis ? 'translateY(0)' : 'translateY(-8px)',
          transition: rm
            ? 'opacity 200ms'
            : 'opacity 200ms cubic-bezier(0.2,0.7,0.2,1), transform 200ms cubic-bezier(0.2,0.7,0.2,1)',
          willChange: 'opacity, transform',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            padding: 4,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
            color: D.muted,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close station info"
        >
          <X size={14} />
        </button>

        {/* Title + Status Pill */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4, paddingRight: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: D.text, lineHeight: 1.25, margin: 0, flex: 1 }}>
            {station.name}
          </h3>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 20,
            background: pill.bg,
            border: `1px solid ${pill.border}`,
            color: pill.color,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {pill.label}
          </span>
        </div>

        {/* International badge */}
        {isIntl && (
          <div style={{ marginBottom: 6 }}>
            <span style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 500,
              padding: '1px 8px',
              borderRadius: 20,
              background: 'rgba(133,146,166,0.15)',
              border: '1px solid rgba(133,146,166,0.3)',
              color: D.muted
            }}>
              International
            </span>
          </div>
        )}

        {/* Region & Place subtitle */}
        {station.place && (
          <p style={{ fontSize: 13, color: D.muted, margin: '2px 0 10px', lineHeight: 1.4 }}>
            {station.place}
          </p>
        )}

        <div style={{ height: 1, background: D.border, marginBottom: 12 }} />

        {/* Description — clear 14px text */}
        {station.description && (
          <p style={{
            fontSize: 14,
            color: D.text,
            lineHeight: 1.55,
            margin: '0 0 14px',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {station.description}
          </p>
        )}

        {/* Coordinates Highlight Box */}
        {station.coordsFormatted && (
          <div style={{
            fontFamily: 'monospace',
            fontSize: 13,
            color: '#7FE7F5',
            background: 'rgba(127,231,245,0.08)',
            border: '1px solid rgba(127,231,245,0.22)',
            borderRadius: 8,
            padding: '6px 10px',
            marginBottom: 12
          }}>
            {station.coordsFormatted}
          </div>
        )}

        {/* 2-Column Structured Data Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 10 }}>
          {station.elevation && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>
                Elevation
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>
                {station.elevation}
              </div>
            </div>
          )}
          {station.year && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>
                Established
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>
                {station.year}
              </div>
            </div>
          )}
          {station.region && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>
                Region
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>
                {station.region}
              </div>
            </div>
          )}
          {station.datasetCount && (
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>
                Datasets
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F2B441' }}>
                {station.datasetCount}
              </div>
            </div>
          )}
        </div>

        {/* Operator & Key Science Fields */}
        {station.operator && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${D.border}` }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: D.muted, marginBottom: 2 }}>
              Operator / Authority
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: D.accent }}>
              {station.operator}
            </div>
          </div>
        )}

        {station.scienceFields && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: D.muted, marginBottom: 2 }}>
              Research Focus
            </div>
            <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.35 }}>
              {station.scienceFields}
            </div>
          </div>
        )}

        {isPinned && (
          <div style={{ fontSize: 11, color: D.muted, marginTop: 12, opacity: 0.7, textAlign: 'center' }}>
            Press Esc or click outside to close
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

/* ── Mobile bottom sheet ────────────────────────────────────────────────── */
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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,8,15,0.75)', zIndex: 9997, transition: 'opacity 200ms', opacity: vis ? 1 : 0 }} />
      <div
        role="dialog"
        aria-label={station.name + ' station info'}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '60vh', overflowY: 'auto',
          zIndex: 9999, padding: '20px 20px 32px', background: D.surface, borderTop: `1px solid ${D.borderBright}`,
          borderRadius: '16px 16px 0 0', transform: vis ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.2,0.7,0.2,1)'
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: D.muted }} aria-label="Close">
          <X size={16} />
        </button>
        <div style={{ width: 40, height: 4, background: D.border, borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4, paddingRight: 28 }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: D.text, lineHeight: 1.2, flex: 1 }}>{station.name}</span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: pill.bg, border: `1px solid ${pill.border}`, color: pill.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{pill.label}</span>
        </div>
        {isIntl && <span style={{ display: 'inline-block', fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'rgba(133,146,166,0.15)', border: '1px solid rgba(133,146,166,0.25)', color: D.muted, marginBottom: 6 }}>International</span>}
        {station.place && <p style={{ fontSize: 13, color: D.muted, margin: '0 0 10px', lineHeight: 1.4 }}>{station.place}</p>}
        <div style={{ height: 1, background: D.border, marginBottom: 10 }} />
        {station.description && <p style={{ fontSize: 14, color: D.text, lineHeight: 1.55, margin: '0 0 12px' }}>{station.description}</p>}
        {station.coordsFormatted && <div style={{ fontSize: 13, color: '#7FE7F5', fontFamily: 'monospace', background: 'rgba(127,231,245,0.08)', padding: '6px 10px', borderRadius: 8, marginBottom: 10 }}>{station.coordsFormatted}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
          {station.elevation && <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Elevation</div><div style={{ fontSize: 14, color: D.text }}>{station.elevation}</div></div>}
          {station.year && <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: D.muted, marginBottom: 2 }}>Established</div><div style={{ fontSize: 14, color: D.text }}>{station.year}</div></div>}
        </div>
      </div>
    </>,
    document.body
  );
};

export const PolarGlobeHero3D = ({ onSearch, className = '' }) => {
  const { isLowBandwidth } = useBandwidth();
  const { data: liveData, isError: statsError, dataUpdatedAt } = useLiveStats();
  const liveDocuments = liveData?.documents ?? null;

  const [polarView, setPolarView] = useState('antarctic');
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [globeReady, setGlobeReady] = useState(false);
  const [force3D, setForce3D] = useState(false);

  /* Station card state */
  const [activeStation, setActiveStation] = useState(null);
  const [anchorPos, setAnchorPos] = useState(null);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  if (!isLowBandwidth || force3D) {
    if (!_PolarGlobe3D) {
      _PolarGlobe3D = React.lazy(() => import('./PolarGlobe3D'));
    }
  }

  const heroRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchMag = useMagnetic(4);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setGlobeReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  /* Outside click closes pinned card */
  useEffect(() => {
    if (!isPinned) return;
    const h = (e) => {
      if (!e.target.closest('[data-station-card]') && !e.target.closest('canvas')) {
        setActiveStation(null);
        setIsPinned(false);
        setAnchorPos(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isPinned]);

  const handleStationHover = useCallback((station, screenPos) => {
    if (isPinned) return;
    clearTimeout(closeTimerRef.current);
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setActiveStation(station);
      setAnchorPos(screenPos);
    }, 80);
  }, [isPinned]);

  const handleStationLeave = useCallback(() => {
    clearTimeout(hoverTimerRef.current);
    if (!isPinned) {
      closeTimerRef.current = setTimeout(() => {
        setActiveStation(null);
        setAnchorPos(null);
      }, 150);
    }
  }, [isPinned]);

  const handleStationSelect = useCallback((station, screenPos) => {
    clearTimeout(hoverTimerRef.current);
    clearTimeout(closeTimerRef.current);
    setActiveStation(station);
    setAnchorPos(screenPos);
    setIsPinned(true);
  }, []);

  const closeCard = useCallback(() => {
    setActiveStation(null);
    setIsPinned(false);
    setAnchorPos(null);
  }, []);

  const handleCardMouseEnter = useCallback(() => {
    clearTimeout(closeTimerRef.current);
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    if (!isPinned) {
      closeTimerRef.current = setTimeout(() => {
        setActiveStation(null);
        setAnchorPos(null);
      }, 150);
    }
  }, [isPinned]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (onSearch) onSearch(searchQuery.trim());
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const renderGlobe = () => {
    if (isLowBandwidth && !force3D) {
      return (
        <div className="absolute top-0 bottom-0 right-0 w-full lg:w-[65%] h-full flex items-center justify-center">
          <div className="mx-auto max-w-xs rounded-2xl border p-6 text-center bg-[#0D1422]/90 border-white/10 text-[#EAF0F8]">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm mb-1">3D Globe unavailable in Data Saver</p>
            <p className="text-xs opacity-60 mb-4">Your connection is slow. Scientific data is still fully accessible below.</p>
            <button
              onClick={() => setForce3D(true)}
              className="text-xs px-4 py-1.5 rounded-full border transition-colors border-[#7FE7F5] text-[#7FE7F5] hover:bg-[#7FE7F5]/10"
            >
              Load 3D Globe anyway
            </button>
          </div>
        </div>
      );
    }
    const PolarGlobe3D = _PolarGlobe3D;
    return (
      <div className="absolute top-0 bottom-0 right-0 w-full lg:w-[65%] h-full flex items-center justify-center">
        <Suspense fallback={null}>
          <PolarGlobe3D
            polarView={polarView}
            activeStation={activeStation}
            onHoverStation={handleStationHover}
            onLeaveStation={handleStationLeave}
            onSelectStation={handleStationSelect}
          />
        </Suspense>
      </div>
    );
  };

  return (
    <section
      ref={heroRef}
      className={`polar-hero relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden select-none bg-[#05080F] text-[#EAF0F8] ${className}`}
      style={{
        fontFamily: "'Inter', sans-serif",
      }}
      aria-label="DhruvKosh Polar Globe Hero"
    >
      <div
        className="pointer-events-none absolute -top-[25%] left-1/2 -translate-x-1/2 w-[110vw] h-[450px] rounded-full blur-[120px] transition-opacity duration-700"
        style={{
          background: 'radial-gradient(circle, rgba(127, 231, 245, 0.08) 0%, rgba(47, 95, 168, 0.05) 50%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      <div
        className={`absolute inset-0 w-full h-full pointer-events-auto transition-all duration-1000 ease-out z-10 ${
          globeReady ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-md'
        }`}
      >
        <Suspense fallback={null}>
          {renderGlobe()}
        </Suspense>

        {/* Polar Realms: Antarctica, Arctic, Himalayas (Third Pole) */}
        <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-12 z-40 flex items-center gap-1.5 p-1 rounded-full border border-white/10 bg-[#0D1422]/95 backdrop-blur-md shadow-xl">
          <button
            onClick={() => setPolarView('antarctic')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              polarView === 'antarctic'
                ? 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                : 'text-[#8592A6] hover:text-[#EAF0F8]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Antarctica</span>
          </button>

          <button
            onClick={() => setPolarView('arctic')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              polarView === 'arctic'
                ? 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                : 'text-[#8592A6] hover:text-[#EAF0F8]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Arctic</span>
          </button>

          <button
            onClick={() => setPolarView('himalayas')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              polarView === 'himalayas'
                ? 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
                : 'text-[#8592A6] hover:text-[#EAF0F8]'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Himalayas (Himansh)</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-16 py-12 relative z-20 pointer-events-none">
        <div className="max-w-xl pointer-events-auto">
          
          <div className="overflow-hidden mb-5">
            <h1
              className={`font-[300] tracking-[-0.02em] leading-[1.08] transition-all duration-900 ease-out max-w-[12ch] text-[#EAF0F8] ${
                globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ fontSize: 'clamp(2.6rem, 5vw, 4.5rem)' }}
            >
              India's Knowledge <br />
              <span className="opacity-60 font-[300]">
                at the Edge of the World.
              </span>
            </h1>
          </div>

          <p
            className={`text-base sm:text-lg mb-8 max-w-md font-normal transition-all duration-900 delay-150 ease-out text-[#8592A6] ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Every expedition. Every dataset. One fixed point.
          </p>

          <div
            className={`relative w-full max-w-md mb-8 transition-all duration-900 delay-300 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center w-full rounded-full transition-all duration-300 group bg-[#0D1422]/85 backdrop-blur-md border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] focus-within:border-[#7FE7F5]/80 focus-within:shadow-[0_0_20px_rgba(127,231,245,0.2)] focus-within:scale-[1.04]"
              style={{
                borderTop: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <div className="pl-5 pr-2 flex items-center pointer-events-none">
                <Search
                  className="w-4 h-4 transition-colors duration-220 text-[#8592A6] group-focus-within:text-[#7FE7F5]"
                />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                className="w-full py-3.5 pr-14 bg-transparent text-sm sm:text-base outline-none font-normal text-[#EAF0F8] placeholder-[#8592A6]/70"
                aria-label="Search the polar archive"
              />

              <div className="absolute right-2 flex items-center gap-1.5">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded border border-white/10 text-[#8592A6]">
                  ⌘K
                </kbd>
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

          <div
            className={`pt-5 border-t border-white/10 grid grid-cols-3 gap-4 max-w-md transition-all duration-900 delay-500 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <HeroLiveStat
              value={liveDocuments}
              label="Documents"
              sourceLabel="Live count from the DhruvKosh repository"
              duration={1400}
              delay={600}
            />
            <HeroLiveStat
              value={verifiedFacts.antarcticExpeditions.value}
              label={verifiedFacts.antarcticExpeditions.shortLabel}
              sourceLabel={`${verifiedFacts.antarcticExpeditions.note} — Source: NCPOR (ncpor.res.in/news/view/815)`}
              duration={1400}
              delay={700}
            />
            <HeroLiveStat
              value={verifiedFacts.activeStations.value}
              label={verifiedFacts.activeStations.shortLabel}
              sourceLabel={`${verifiedFacts.activeStations.note} — Source: NCPOR Operational Stations`}
              duration={1400}
              delay={800}
            />
          </div>

          <div className="pt-2">
            <LiveIndicator dataUpdatedAt={dataUpdatedAt} isError={statsError} />
          </div>

        </div>
      </div>

      {/* Crystal Clear Station Details Card */}
      {activeStation && (
        isMobile ? (
          <MobileStationSheet
            station={activeStation}
            onClose={closeCard}
          />
        ) : (
          <StationCard
            station={activeStation}
            anchorPos={anchorPos}
            onClose={closeCard}
            isPinned={isPinned}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          />
        )
      )}
    </section>
  );
};

export default PolarGlobeHero3D;
