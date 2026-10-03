import React from 'react';
import { ImageIcon } from 'lucide-react';
import { useBandwidth } from '../context/BandwidthContext';
import { useState } from 'react';

/**
 * Drop-in <img> replacement that respects bandwidth mode.
 *
 * Props:
 *   src          - full-quality image URL
 *   thumbnailSrc - optional low-res version preferred on slow connections
 *   alt          - alt text (required)
 *   className    - forwarded to <img>
 *   placeholderLabel - text shown inside the placeholder (default: "Image")
 *   ...rest      - any other props forwarded to <img>
 */
export default function BandwidthAwareImage({
  src,
  thumbnailSrc,
  alt,
  className = '',
  placeholderLabel = 'Image',
  style,
  ...rest
}) {
  const { isLowBandwidth } = useBandwidth();
  const [loadRequested, setLoadRequested] = useState(false);

  // On slow connections: don't request the image until the user asks
  if (isLowBandwidth && !loadRequested) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 bg-ncpor-panel border border-ncpor-divider rounded-lg text-ncpor-muted select-none"
        style={{ minHeight: 80, ...style }}
        aria-label={`${placeholderLabel} — hidden in Data Saver mode`}
      >
        <ImageIcon className="w-5 h-5 opacity-40" />
        <span className="text-[11px] text-center opacity-60 px-3">
          {placeholderLabel} hidden to reduce data usage.
        </span>
        <button
          onClick={() => setLoadRequested(true)}
          className="text-[11px] px-3 py-1 rounded-md border border-ncpor-accent/40 text-ncpor-accent hover:bg-ncpor-accent/10 transition-colors"
        >
          Load image
        </button>
      </div>
    );
  }

  // On slow connections, prefer thumbnail if available
  const resolvedSrc = (isLowBandwidth && thumbnailSrc) ? thumbnailSrc : src;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      {...rest}
    />
  );
}
