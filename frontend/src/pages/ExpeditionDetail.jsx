import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, BarChart2, BookOpen, Image as ImageIcon,
  Plus, Calendar, MapPin, User, ChevronRight, Download,
  Database, Film, ExternalLink, ArrowLeft
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import * as expeditionApi from '../api/expeditions';
import UploadModal from '../components/UploadModal';
import BandwidthAwareImage from '../components/BandwidthAwareImage';

const TABS = [
  { key: 'reports',      label: 'Reports',      icon: FileText   },
  { key: 'datasets',     label: 'Datasets',     icon: Database   },
  { key: 'publications', label: 'Publications', icon: BookOpen   },
  { key: 'media',        label: 'Media',        icon: ImageIcon  },
];

const REGION_LABEL = {
  antarctica: 'Antarctica',
  arctic: 'Arctic',
  himalaya: 'Himalayas',
  himalayas: 'Himalayas',
  ocean: 'Ocean',
};

export default function ExpeditionDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reports');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const { data: expedition, isLoading, isError } = useQuery({
    queryKey: ['expedition', id],
    queryFn: () => expeditionApi.getExpeditionFull(id),
  });

  /* ── Loading ── */
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-ncpor-accent border-t-transparent animate-spin" />
        <p className="text-ncpor-muted text-sm">Loading expedition…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (isError || !expedition) return (
    <div className="max-w-lg mx-auto mt-20 p-8 bg-ncpor-panel border border-red-500/20 rounded-2xl text-center">
      <p className="text-red-400 font-semibold mb-2">Failed to load expedition</p>
      <Link to="/expeditions" className="text-ncpor-accent text-sm hover:underline">← Back to expeditions</Link>
    </div>
  );

  const counts = {
    reports:      expedition.reports?.length      ?? 0,
    datasets:     expedition.datasets?.length     ?? 0,
    publications: expedition.publications?.length ?? 0,
    media:        expedition.media_items?.length  ?? 0,
  };

  const regionLabel = REGION_LABEL[expedition.region?.toLowerCase()] || expedition.region;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">

      {/* ── Back link ── */}
      <Link
        to="/expeditions"
        className="inline-flex items-center gap-1.5 text-ncpor-muted hover:text-ncpor-accent text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Expeditions
      </Link>

      {/* ── Hero card ── */}
      <div className="relative bg-ncpor-panel border border-ncpor-divider rounded-2xl shadow-premium overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-ncpor-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 p-8">
          {/* Code badge */}
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-ncpor-accent/10 border border-ncpor-accent/30 text-ncpor-accent tracking-widest uppercase">
              {expedition.expedition_code}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-ncpor-divider text-ncpor-muted capitalize">
              {regionLabel}
            </span>
          </div>

          <h1 className="text-3xl font-display font-bold text-ncpor-primary mb-3 tracking-wide">
            {expedition.name}
          </h1>

          {expedition.summary && (
            <p className="text-ncpor-secondary max-w-3xl leading-relaxed mb-6">
              {expedition.summary}
            </p>
          )}

          {/* Meta strip */}
          <div className="flex flex-wrap gap-6 text-sm">
            {expedition.start_date && (
              <div className="flex items-center gap-2 text-ncpor-muted">
                <Calendar className="w-4 h-4 text-ncpor-accent/60 shrink-0" />
                <span>
                  {expedition.start_date}
                  {expedition.end_date && <> — {expedition.end_date}</>}
                </span>
              </div>
            )}
            {expedition.team_lead && (
              <div className="flex items-center gap-2 text-ncpor-muted">
                <User className="w-4 h-4 text-ncpor-accent/60 shrink-0" />
                <span>{expedition.team_lead}</span>
              </div>
            )}
            {expedition.region && (
              <div className="flex items-center gap-2 text-ncpor-muted">
                <MapPin className="w-4 h-4 text-ncpor-accent/60 shrink-0" />
                <span>{regionLabel}</span>
              </div>
            )}
          </div>

          {/* Quick stat chips */}
          <div className="flex flex-wrap gap-3 mt-6">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  activeTab === t.key
                    ? 'bg-ncpor-accent/15 border-ncpor-accent/40 text-ncpor-accent'
                    : 'bg-ncpor-bg/60 border-ncpor-divider text-ncpor-muted hover:border-ncpor-accent/30 hover:text-ncpor-accent'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {counts[t.key]} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs panel ── */}
      <div className="bg-ncpor-panel border border-ncpor-divider rounded-2xl shadow-premium overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center border-b border-ncpor-divider bg-ncpor-bg/40 overflow-x-auto no-scrollbar">
          <div className="flex flex-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === t.key
                    ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-panel'
                    : 'text-ncpor-muted border-transparent hover:text-ncpor-primary hover:bg-ncpor-panel/50'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                  activeTab === t.key ? 'bg-ncpor-accent/15 text-ncpor-accent' : 'bg-ncpor-divider text-ncpor-muted'
                }`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="px-4 shrink-0">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-ncpor-accent/10 border border-ncpor-accent/30 text-ncpor-accent text-sm font-semibold hover:bg-ncpor-accent/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Upload
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-6 min-h-[320px]">

          {/* ── Reports ── */}
          {activeTab === 'reports' && (
            <TabContent
              items={expedition.reports}
              empty="No reports uploaded yet."
              render={r => (
                <div key={r.id} className="group flex items-center justify-between gap-4 p-4 rounded-xl border border-ncpor-divider hover:border-ncpor-accent/40 bg-ncpor-bg/40 hover:bg-ncpor-accent/5 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-ncpor-accent/10 border border-ncpor-accent/20 flex items-center justify-center text-ncpor-accent shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ncpor-primary truncate">{r.title}</p>
                      <p className="text-xs text-ncpor-muted mt-0.5 capitalize">{r.report_type} Report · {r.page_count || 0} pages</p>
                    </div>
                  </div>
                  <a
                    href={`${API_BASE_URL}/api/files/reports/${r.id}?download=1`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-ncpor-accent/30 text-ncpor-accent text-xs font-semibold hover:bg-ncpor-accent hover:text-ncpor-bg transition-all shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View PDF
                  </a>
                </div>
              )}
            />
          )}

          {/* ── Datasets ── */}
          {activeTab === 'datasets' && (
            <TabContent
              items={expedition.datasets}
              empty="No datasets uploaded yet."
              render={d => (
                <div key={d.id} className="group flex items-center justify-between gap-4 p-4 rounded-xl border border-ncpor-divider hover:border-cyan-500/40 bg-ncpor-bg/40 hover:bg-cyan-500/5 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ncpor-primary truncate">{d.title}</p>
                      <p className="text-xs text-ncpor-muted mt-0.5 capitalize">
                        {[d.data_type, d.file_format, d.parameters_measured?.slice(0,2).join(', ')].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`${API_BASE_URL}/api/files/datasets/${d.id}?download=1`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-500 hover:text-ncpor-bg transition-all shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              )}
            />
          )}

          {/* ── Publications ── */}
          {activeTab === 'publications' && (
            <TabContent
              items={expedition.publications}
              empty="No publications linked yet."
              render={p => (
                <div key={p.id} className="group flex items-start justify-between gap-4 p-4 rounded-xl border border-ncpor-divider hover:border-purple-500/40 bg-ncpor-bg/40 hover:bg-purple-500/5 transition-all">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ncpor-primary">{p.title}</p>
                      {p.authors?.length > 0 && <p className="text-xs text-ncpor-secondary mt-1">{p.authors.join(', ')}</p>}
                      {p.journal_or_venue && <p className="text-xs text-ncpor-muted mt-0.5 italic">{p.journal_or_venue}</p>}
                    </div>
                  </div>
                  {p.file_path && (
                    <a
                      href={`${API_BASE_URL}/api/files/publications/${p.id}?download=1`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500 hover:text-white transition-all shrink-0 mt-0.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> PDF
                    </a>
                  )}
                </div>
              )}
            />
          )}

          {/* ── Media ── */}
          {activeTab === 'media' && (
            expedition.media_items?.length === 0 ? (
              <EmptyState text="No media uploaded yet." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {expedition.media_items.map(m => (
                  <div key={m.id} className="group rounded-xl border border-ncpor-divider overflow-hidden bg-ncpor-bg hover:border-ncpor-accent/40 transition-all card-hover">
                    <div className="h-36 bg-ncpor-bg/80 flex items-center justify-center overflow-hidden relative">
                      {m.media_type === 'photo' ? (
                        <BandwidthAwareImage
                          src={`${API_BASE_URL}/api/files/media/${m.id}`}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          alt={m.title}
                          placeholderLabel="Photo"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-ncpor-muted">
                          <Film className="w-8 h-8" />
                          <span className="text-xs capitalize">{m.media_type}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-ncpor-primary text-sm truncate">{m.title}</p>
                      <p className="text-xs text-ncpor-muted capitalize mt-0.5">{m.media_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          queryClient.invalidateQueries(['expedition', id]);
        }}
        type={activeTab === 'media' ? 'media' : activeTab.slice(0, -1)}
        expeditionId={id}
      />
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function TabContent({ items, empty, render }) {
  if (!items?.length) return <EmptyState text={empty} />;
  return <div className="space-y-3">{items.map(render)}</div>;
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-ncpor-divider/50 flex items-center justify-center mb-4">
        <FileText className="w-7 h-7 text-ncpor-muted/50" />
      </div>
      <p className="text-ncpor-muted text-sm">{text}</p>
    </div>
  );
}
