import React, { useState, useEffect } from 'react';
import { FileText, FileBarChart, Image as ImageIcon, Film, File } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useBandwidth } from '../context/BandwidthContext';

// Use same worker as pdfHelper
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const ICONS = {
  photo:       ImageIcon,
  video:       Film,
  report:      FileText,
  publication: FileText,
  dataset:     FileBarChart,
};

const ContentThumbnail = ({ item }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(item.thumbnail || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { isLowBandwidth } = useBandwidth();

  useEffect(() => {
    // If item has thumbnail already, use it
    if (item.thumbnail) {
      setThumbnailUrl(item.thumbnail);
      setLoading(false);
      return;
    }

    const isPdf = item.content_type === 'report' || item.content_type === 'publication' || 
                  (item.download_url && item.download_url.toLowerCase().endsWith('.pdf'));


    // On slow connections, skip the PDF download — just show the icon fallback
    if (isPdf && isLowBandwidth) {
      setLoading(false);
      return;
    }

    if (isPdf && item.download_url) {
      let isMounted = true;
      setLoading(true);
      setError(false);

      const fetchPdfThumbnail = async () => {
        try {
          const loadingTask = pdfjsLib.getDocument({
            url: item.download_url,
            disableAutoFetch: true,
            disableStream: true
          });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.8 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          
          if (isMounted) {
            setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.9));
            setLoading(false);
          }
        } catch (err) {
          console.error("Failed to render PDF thumbnail:", err);
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
        }
      };

      fetchPdfThumbnail();

      return () => {
        isMounted = false;
      };
    } else {
      setLoading(false);
    }

  }, [item, item.thumbnail, item.download_url, item.content_type]);

  const IconComponent = ICONS[item.content_type] || File;

  if (loading) {
    return (
      <div className="absolute inset-0 bg-ncpor-panel flex items-center justify-center">
        <div className="w-full h-full skeleton" />
      </div>
    );
  }

  // If thumbnail loaded without error
  if (thumbnailUrl && !error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ncpor-elevated transition-transform duration-300 ease-out group-hover:scale-[1.04]">
        <img 
          src={thumbnailUrl} 
          alt={`${item.title || 'Polar archive record'} preview`}
          loading="lazy"
          decoding="async"
          width="100%"
          height="100%"
          onError={() => setError(true)}
          className="max-w-full max-h-[190px] object-contain shadow-md border border-ncpor-divider/20 bg-white/5"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ncpor-bg/80 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        {/* Metadata pill badge */}
        <div className="absolute bottom-2 right-2 bg-ncpor-bg/95 border border-ncpor-divider rounded px-2 py-0.5 pointer-events-none">
          <span className="text-[9px] font-medium tracking-wider text-ncpor-accent capitalize">{item.content_type}</span>
        </div>
      </div>
    );
  }

  // Clean Fallback Tile with Soft Gradient & File-Type Icon (Never browser broken icon)
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-ncpor-panel to-ncpor-elevated flex flex-col items-center justify-center overflow-hidden border-b border-ncpor-divider/20 transition-transform duration-300 ease-out group-hover:scale-[1.04]">
      <div className="w-12 h-12 rounded-xl bg-ncpor-accent/10 border border-ncpor-accent/20 flex items-center justify-center mb-2.5 transition-colors duration-300 group-hover:border-ncpor-accent/40">
        <IconComponent className="w-6 h-6 text-ncpor-accent transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
      </div>
      <span className="text-[10px] font-medium text-ncpor-secondary capitalize tracking-wider text-center px-4">
        {item.content_type || 'Scientific Record'}
      </span>
      <div className="absolute inset-0 bg-gradient-to-t from-ncpor-bg/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default ContentThumbnail;
