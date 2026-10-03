import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, BarChart, Book, Image as ImageIcon, Plus } from 'lucide-react';
import { API_BASE_URL } from '../config';
import * as expeditionApi from '../api/expeditions';
import UploadModal from '../components/UploadModal';
import BandwidthAwareImage from '../components/BandwidthAwareImage';

const ExpeditionDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('reports');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Data Fetching via React Query
  const { data: expedition, isLoading: loadingExpedition, isError: expError } = useQuery({
    queryKey: ['expedition', id],
    queryFn: () => expeditionApi.getExpeditionFull(id)
  });


  if (loadingExpedition) return <div className="text-center p-20"><div className="animate-spin h-10 w-10 border-4 border-ncpor-accent border-t-transparent rounded-full mx-auto"></div></div>;
  if (expError || !expedition) return <div className="text-center p-20 text-ncpor-warning bg-ncpor-warning/10 border border-ncpor-warning/20 max-w-lg mx-auto rounded-xl mt-12">Expedition not found or failed to load.</div>;

  return (
    <div className="font-sans">
      <div className="bg-ncpor-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-ncpor-border p-8 mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-4 mb-4">
            <h1 className="text-3xl font-bold font-display text-ncpor-textPrimary tracking-wide">{expedition.name}</h1>
            <span className="bg-ncpor-accent/10 text-ncpor-accent border border-ncpor-accent/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider font-mono">{expedition.expedition_code}</span>
          </div>
          <p className="text-ncpor-textSecondary max-w-3xl mb-6 leading-relaxed">{expedition.summary}</p>
          <div className="flex space-x-8 text-sm text-ncpor-textMuted bg-ncpor-bgSecondary/50 p-4 rounded-lg border border-ncpor-border/50 inline-flex">
            <div><span className="font-semibold text-ncpor-textPrimary uppercase tracking-wider text-xs mr-2">Region:</span> <span className="capitalize">{expedition.region.replace('_', ' ')}</span></div>
            <div><span className="font-semibold text-ncpor-textPrimary uppercase tracking-wider text-xs mr-2">Dates:</span> {expedition.start_date} <span className="mx-1">to</span> {expedition.end_date}</div>
            <div><span className="font-semibold text-ncpor-textPrimary uppercase tracking-wider text-xs mr-2">Lead:</span> {expedition.team_lead}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Left Column: Data Tabs */}
        <div className="w-full space-y-8">
          <div className="bg-ncpor-card rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-ncpor-border overflow-hidden">
            <div className="flex border-b border-ncpor-border bg-ncpor-bgSecondary overflow-x-auto justify-between">
              <div className="flex">
                <button onClick={() => setActiveTab('reports')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'reports' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><FileText className="h-4 w-4" /><span>Reports ({expedition.reports.length})</span></button>
                <button onClick={() => setActiveTab('datasets')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'datasets' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><BarChart className="h-4 w-4" /><span>Datasets ({expedition.datasets.length})</span></button>
                <button onClick={() => setActiveTab('publications')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'publications' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><Book className="h-4 w-4" /><span>Publications ({expedition.publications.length})</span></button>
                <button onClick={() => setActiveTab('media')} className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors border-b-2 ${activeTab === 'media' ? 'text-ncpor-accent border-ncpor-accent bg-ncpor-card' : 'text-ncpor-textMuted border-transparent hover:text-ncpor-textPrimary hover:bg-ncpor-card/50'}`}><ImageIcon className="h-4 w-4" /><span>Media ({expedition.media_items.length})</span></button>
              </div>
              <div className="p-3">
                <button onClick={() => setUploadModalOpen(true)} className="flex items-center space-x-2 bg-ncpor-accent/10 text-ncpor-accent border border-ncpor-accent/30 hover:bg-ncpor-accent/20 px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                  <Plus className="h-4 w-4" /> <span>Upload</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 min-h-[300px]">
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {expedition.reports.length === 0 ? <p className="text-ncpor-textMuted italic">No reports uploaded yet.</p> : expedition.reports.map(r => (
                    <div key={r.id} className="border border-ncpor-border rounded-lg p-5 bg-ncpor-bgSecondary flex justify-between items-center hover:border-ncpor-accent/30 transition-colors">
                      <div>
                        <h4 className="font-semibold font-display text-lg text-ncpor-textPrimary tracking-wide">{r.title}</h4>
                        <p className="text-xs text-ncpor-textSecondary mt-1 capitalize tracking-wider font-medium">{r.report_type} Report • {r.page_count || 0} pages</p>
                      </div>
                      <a href={`${API_BASE_URL}/api/files/${r.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:text-ncpor-lightIce text-sm font-medium tracking-wide">View PDF</a>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'datasets' && (
                <div className="space-y-4">
                  {expedition.datasets.length === 0 ? <p className="text-ncpor-textMuted italic">No datasets uploaded yet.</p> : expedition.datasets.map(d => (
                    <div key={d.id} className="border border-ncpor-border rounded-lg p-5 bg-ncpor-bgSecondary flex justify-between items-center hover:border-ncpor-accent/30 transition-colors">
                      <div>
                        <h4 className="font-semibold font-display text-lg text-ncpor-textPrimary tracking-wide">{d.title}</h4>
                        <p className="text-xs text-ncpor-textSecondary mt-1 capitalize tracking-wider font-medium">{d.data_type} • {d.file_format} • {d.parameters_measured?.join(', ')}</p>
                      </div>
                      <a href={`${API_BASE_URL}/api/files/${d.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:text-ncpor-lightIce text-sm font-medium tracking-wide">Download Data</a>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'publications' && (
                <div className="space-y-4">
                  {expedition.publications.length === 0 ? <p className="text-ncpor-textMuted italic">No publications linked yet.</p> : expedition.publications.map(p => (
                    <div key={p.id} className="border border-ncpor-border rounded-lg p-5 bg-ncpor-bgSecondary flex justify-between items-start hover:border-ncpor-accent/30 transition-colors">
                      <div>
                        <h4 className="font-semibold font-display text-lg text-ncpor-textPrimary tracking-wide">{p.title}</h4>
                        <p className="text-sm text-ncpor-textSecondary mt-1">{p.authors?.join(', ')}</p>
                        <p className="text-xs text-ncpor-textMuted mt-2 italic">{p.journal_or_venue}</p>
                      </div>
                      {p.file_path && <a href={`${API_BASE_URL}/api/files/${p.file_path.replace('uploads/', '')}`} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:text-ncpor-lightIce text-sm font-medium tracking-wide">PDF</a>}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'media' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {expedition.media_items.length === 0 ? <p className="text-ncpor-textMuted italic col-span-3">No media uploaded yet.</p> : expedition.media_items.map(m => (
                    <div key={m.id} className="border border-ncpor-border rounded-lg overflow-hidden bg-ncpor-bgSecondary group cursor-pointer hover:border-ncpor-accent/50 transition-colors">
                      <div className="h-32 bg-ncpor-bg flex items-center justify-center relative overflow-hidden">
                         {m.media_type === 'photo' ? (
                           <BandwidthAwareImage src={`${API_BASE_URL}/api/files/${m.file_path.replace('uploads/', '')}`} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" alt={m.title} placeholderLabel="Photo" />
                         ) : (
                           <ImageIcon className="h-8 w-8 text-ncpor-textMuted group-hover:text-ncpor-accent/50 transition-colors" />
                         )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-ncpor-textPrimary text-sm line-clamp-1">{m.title}</h4>
                        <p className="text-xs text-ncpor-textSecondary capitalize mt-1">{m.media_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      
      {/* Dynamic Upload Modal */}
      <UploadModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        type={activeTab.slice(0, -1)} 
        expeditionId={id} 
      />
    </div>
  );
};
export default ExpeditionDetail;
