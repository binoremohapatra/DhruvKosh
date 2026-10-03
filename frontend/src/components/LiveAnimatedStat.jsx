/**
 * LiveAnimatedStat
 *
 * Smoothly animates from previous value to new value (600–900 ms ease-out).
 * First load counts up from 0 (same behaviour as before).
 * When value increases, shows a brief +N chip that auto-fades after 2 s.
 * Respects prefers-reduced-motion: instant update, no animation.
 * Uses tabular-nums so the layout never shifts.
 */

import { useState, useEffect, useRef, memo } from 'react';

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return n.toLocaleString();
  return String(n);
}

const LiveAnimatedStat = memo(({
  value,           // number — current live value
  label,           // string — stat label
  sourceLabel,     // string — tooltip / aria-label for source info
  duration = 750,  // ms — animation duration (600–900 recommended)
  delay = 0,       // ms — initial animation delay
  className = '',
}) => {
  const [display, setDisplay] = useState(0);
  const [delta,   setDelta]   = useState(null);
  const prevRef   = useRef(0);
  const startedRef = useRef(false);
  const rafRef    = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    if (value == null || isNaN(value)) return;

    const from = prevRef.current;
    const to   = value;

    // Show +N chip when value increases after first load
    if (startedRef.current && to > from) {
      setDelta(`+${to - from}`);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDelta(null), 2200);
    }

    // Instant change for reduced-motion users
    if (prefersReducedMotion) {
      setDisplay(to);
      prevRef.current = to;
      startedRef.current = true;
      return;
    }

    // Cancel any running animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startAnimAt = () => {
      const start = performance.now();
      const tick = (now) => {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out-quart
        const eased    = 1 - Math.pow(1 - progress, 4);
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          prevRef.current   = to;
          startedRef.current = true;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (!startedRef.current && delay > 0) {
      const t = setTimeout(startAnimAt, delay);
      return () => clearTimeout(t);
    } else {
      startAnimAt();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // cleanup on unmount
  useEffect(() => () => {
    if (rafRef.current)  cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div className={`flex flex-col ${className}`} title={sourceLabel} aria-label={sourceLabel}>
      {/* Value row */}
      <div className="relative inline-flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums leading-none text-white">
          {value == null ? (
            /* skeleton while loading */
            <span className="inline-block w-10 h-5 rounded bg-white/10 animate-pulse align-middle" />
          ) : (
            formatNumber(display)
          )}
        </span>

        {/* +N delta chip */}
        {delta && (
          <span
            className="text-[10px] font-bold px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400
              animate-fade-in pointer-events-none select-none"
            style={{ lineHeight: 1 }}
          >
            {delta}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="text-[11px] mt-1 text-[#8592A6]">{label}</span>
    </div>
  );
});

LiveAnimatedStat.displayName = 'LiveAnimatedStat';

export default LiveAnimatedStat;
