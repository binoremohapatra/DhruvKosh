import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { Search, ArrowUpRight, Globe, Layers, Mountain } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLiveStats } from '../hooks/useLiveStats';
import { useBandwidth } from '../context/BandwidthContext';
import verifiedFacts from '../data/facts';
import LiveIndicator from './LiveIndicator';

// PolarGlobe3D is only lazy-loaded when NOT in low-bandwidth mode.
// We declare the variable here; it gets assigned inside the component.
let _PolarGlobe3D = null;

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

const AnimatedStat = ({ endValue, label, duration = 1400, delay = 0, isLight }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericEnd = useMemo(() => parseInt(String(endValue).replace(/,/g, ''), 10) || 0, [endValue]);
  const hasComma = String(endValue).includes(',');

  useEffect(() => {
    let startTimestamp = null;
    let frameId;

    const timeoutId = setTimeout(() => {
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(easeOut * numericEnd));

        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };
      frameId = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [numericEnd, duration, delay]);

  const formatted = hasComma ? displayValue.toLocaleString() : displayValue;

  return (
    <div className="group cursor-default transition-all duration-220">
      <div
        className={`font-mono text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-220 tabular-nums ${
          isLight
            ? 'text-[#0B1B33] group-hover:text-[#0A7C8C]'
            : 'text-[#EAF0F8] group-hover:text-[#7FE7F5]'
        }`}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {formatted}
      </div>
      <div
        className={`text-[11px] sm:text-xs uppercase tracking-wider font-medium transition-opacity duration-220 ${
          isLight
            ? 'text-[#66758C] opacity-75 group-hover:opacity-100'
            : 'text-[#8592A6] opacity-70 group-hover:opacity-100'
        }`}
      >
        {label}
      </div>
    </div>
  );
};

/* ── HeroLiveStat — wraps AnimatedStat with live value and tooltip ──────── */
const HeroLiveStat = ({ value, label, sourceLabel, duration, delay, isLight }) => {
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
        className={`font-mono text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-220 tabular-nums ${
          isLight
            ? 'text-[#0B1B33] group-hover:text-[#0A7C8C]'
            : 'text-[#EAF0F8] group-hover:text-[#7FE7F5]'
        }`}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value == null
          ? <span className="inline-block w-12 h-6 rounded bg-white/10 animate-pulse align-middle" />
          : formatted
        }
      </div>
      <div
        className={`text-[11px] sm:text-xs uppercase tracking-wider font-medium transition-opacity duration-220 ${
          isLight
            ? 'text-[#66758C] opacity-75 group-hover:opacity-100'
            : 'text-[#8592A6] opacity-70 group-hover:opacity-100'
        }`}
      >
        {label}
      </div>
    </div>
  );
};

export const PolarGlobeHero3D = ({ onSearch, className = '' }) => {
  const { isLight } = useTheme();
  const { isLowBandwidth } = useBandwidth();
  // Live stats from backend — shared with Dashboard and Repository
  const { data: liveData, isError: statsError, dataUpdatedAt } = useLiveStats();
  const liveDocuments = liveData?.documents ?? null;

  const [polarView, setPolarView] = useState('antarctic'); // 'antarctic' | 'arctic'
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [globeReady, setGlobeReady] = useState(false);
  // Allow user to force-load the 3D globe even on a slow connection
  const [force3D, setForce3D] = useState(false);

  // Only assign the lazy import once, when actually needed (not on slow connections)
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
    const timer = setTimeout(() => setGlobeReady(true), 150); // slight delay for lazy load
    return () => clearTimeout(timer);
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (onSearch) onSearch(searchQuery.trim());
  };

  // Render the 3D canvas section — or a data-saver placeholder
  const renderGlobe = () => {
    if (isLowBandwidth && !force3D) {
      return (
        <div className="absolute top-0 bottom-0 right-0 w-full lg:w-[65%] h-full flex items-center justify-center">
          <div className={`mx-auto max-w-xs rounded-2xl border p-6 text-center ${
            isLight ? 'bg-white/80 border-slate-200 text-[#0B1B33]' : 'bg-[#0D1422]/90 border-white/10 text-[#EAF0F8]'
          }`}>
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-sm mb-1">3D Globe unavailable in Data Saver</p>
            <p className="text-xs opacity-60 mb-4">Your connection is slow. Scientific data is still fully accessible below.</p>
            <button
              onClick={() => setForce3D(true)}
              className={`text-xs px-4 py-1.5 rounded-full border transition-colors ${
                isLight ? 'border-[#0A7C8C] text-[#0A7C8C] hover:bg-[#0A7C8C]/10' : 'border-[#7FE7F5] text-[#7FE7F5] hover:bg-[#7FE7F5]/10'
              }`}
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
          <PolarGlobe3D polarView={polarView} />
        </Suspense>
      </div>
    );
  };

  return (
    <section
      ref={heroRef}
      className={`polar-hero relative w-full min-h-[calc(100vh-4rem)] flex items-center overflow-hidden select-none transition-colors duration-500 ${
        isLight ? 'bg-[#F4F7FB] text-[#0B1B33]' : 'bg-[#05080F] text-[#EAF0F8]'
      } ${className}`}
      style={{
        fontFamily: "'Inter', sans-serif",
      }}
      aria-label="DhruvKosh Polar Globe Hero"
    >
      <div
        className="pointer-events-none absolute -top-[25%] left-1/2 -translate-x-1/2 w-[110vw] h-[450px] rounded-full blur-[120px] transition-opacity duration-700"
        style={{
          background: isLight
            ? 'radial-gradient(circle, rgba(10, 124, 140, 0.08) 0%, rgba(47, 95, 168, 0.03) 60%, transparent 80%)'
            : 'radial-gradient(circle, rgba(127, 231, 245, 0.08) 0%, rgba(47, 95, 168, 0.05) 50%, transparent 80%)',
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
                ? isLight
                  ? 'bg-white text-[#0A7C8C] shadow-sm font-semibold'
                  : 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
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
                ? isLight
                  ? 'bg-white text-[#0A7C8C] shadow-sm font-semibold'
                  : 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
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
                ? isLight
                  ? 'bg-white text-[#0A7C8C] shadow-sm font-semibold'
                  : 'bg-[#7FE7F5]/20 text-[#7FE7F5] border border-[#7FE7F5]/30 shadow-sm font-semibold'
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
              className={`font-[300] tracking-[-0.02em] leading-[1.08] transition-all duration-900 ease-out max-w-[12ch] ${
                globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              } ${isLight ? 'text-[#0B1B33]' : 'text-[#EAF0F8]'}`}
              style={{ fontSize: 'clamp(2.6rem, 5vw, 4.5rem)' }}
            >
              India's Knowledge <br />
              <span className="opacity-60 font-[300]">
                at the Edge of the World.
              </span>
            </h1>
          </div>

          <p
            className={`text-base sm:text-lg mb-8 max-w-md font-normal transition-all duration-900 delay-150 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            } ${isLight ? 'text-[#66758C]' : 'text-[#8592A6]'}`}
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
              className={`relative flex items-center w-full rounded-full transition-all duration-300 group ${
                isLight
                  ? 'bg-white border border-slate-300 shadow-sm focus-within:border-[#0A7C8C] focus-within:ring-2 focus-within:ring-[#0A7C8C]/20'
                  : 'bg-[#0D1422]/85 backdrop-blur-md border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] focus-within:border-[#7FE7F5]/80 focus-within:shadow-[0_0_20px_rgba(127,231,245,0.2)] focus-within:scale-[1.04]'
              }`}
              style={{
                borderTop: isLight ? '1px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <div className="pl-5 pr-2 flex items-center pointer-events-none">
                <Search
                  className={`w-4 h-4 transition-colors duration-220 ${
                    isLight ? 'text-slate-400 group-focus-within:text-[#0A7C8C]' : 'text-[#8592A6] group-focus-within:text-[#7FE7F5]'
                  }`}
                />
              </div>

              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
                className={`w-full py-3.5 pr-14 bg-transparent text-sm sm:text-base outline-none font-normal ${
                  isLight ? 'text-[#0B1B33] placeholder-slate-400' : 'text-[#EAF0F8] placeholder-[#8592A6]/70'
                }`}
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
                  className={`p-2 rounded-full transition-all active:scale-95 ${
                    isLight
                      ? 'bg-[#0A7C8C] text-white hover:bg-[#086370]'
                      : 'bg-[#7FE7F5] text-[#05080F] hover:bg-white'
                  }`}
                  aria-label="Submit search"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

          <div
            className={`pt-5 border-t grid grid-cols-3 gap-4 max-w-md transition-all duration-900 delay-500 ease-out ${
              globeReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            } ${isLight ? 'border-slate-200' : 'border-white/10'}`}
          >
            {/* LIVE from backend — DhruvKosh repository total */}
            <HeroLiveStat
              value={liveDocuments}
              label="Documents"
              sourceLabel="Live count from the DhruvKosh repository"
              duration={1400}
              delay={600}
              isLight={isLight}
            />
            {/* NCPOR verified public record */}
            <HeroLiveStat
              value={verifiedFacts.antarcticExpeditions.value}
              label={verifiedFacts.antarcticExpeditions.shortLabel}
              sourceLabel={`${verifiedFacts.antarcticExpeditions.note} — Source: NCPOR (ncpor.res.in/news/view/815)`}
              duration={1400}
              delay={700}
              isLight={isLight}
            />
            {/* Derived from stations.js active entries */}
            <HeroLiveStat
              value={verifiedFacts.activeStations.value}
              label={verifiedFacts.activeStations.shortLabel}
              sourceLabel={`${verifiedFacts.activeStations.note} — Source: NCPOR Operational Stations`}
              duration={1400}
              delay={800}
              isLight={isLight}
            />
          </div>

          {/* Live status indicator */}
          <div className="pt-2">
            <LiveIndicator dataUpdatedAt={dataUpdatedAt} isError={statsError} />
          </div>

        </div>
      </div>
    </section>

  );
};

export default PolarGlobeHero3D;
