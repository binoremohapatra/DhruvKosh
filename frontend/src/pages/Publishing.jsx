import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import publishAPI from '../api/publish';
import { useInvalidateLiveStats } from '../hooks/useLiveStats';
import { CheckCircle, XCircle, Clock, ExternalLink, Copy, Calendar, RefreshCw } from 'lucide-react';

const Publishing = () => {
  const queryClient = useQueryClient();
  const invalidateLiveStats = useInvalidateLiveStats();
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['publishLog'],
    queryFn: async () => {
      const res = await publishAPI.getPublishLog();
      return res.data?.items || [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15000,
    placeholderData: (prev) => prev,
    retry: 2,
  });

  const { data: platforms = {} } = useQuery({
    queryKey: ['publishPlatforms'],
    queryFn: async () => {
      const res = await publishAPI.getPlatforms();
      return res.data || {};
    },
    staleTime: 60000,
    placeholderData: (prev) => prev,
  });

  const loading = loadingLogs && logs.length === 0;

  const handleCancel = async (logId) => {
    if (!window.confirm('Cancel this scheduled post?')) return;
    try {
      await publishAPI.cancelScheduled(logId);
      queryClient.invalidateQueries({ queryKey: ['publishLog'] });
      invalidateLiveStats();
    } catch (e) {
      console.error(e);
      alert('Failed to cancel');
    }
  };

  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'scheduled': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'dry_run': return 'bg-ncpor-muted/10 text-ncpor-muted border-ncpor-divider';
      default: return 'bg-ncpor-muted/10 text-ncpor-muted border-ncpor-divider';
    }
  };

  return (
    <div className="min-h-screen bg-ncpor-bg text-ncpor-primary font-sans p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '0ms' }}>
          <h1 className="text-3xl font-display text-ncpor-primary mb-2 tracking-tight">Publishing Dashboard</h1>
          <p className="text-ncpor-secondary text-base">Track and manage your published content across platforms.</p>
        </div>

        {/* Mode indicator */}
        {platforms.publish_mode && (
          <div className="mb-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <span className={`px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 ${platforms.publish_mode === 'dry_run' ? 'bg-ncpor-accent/10 border border-ncpor-accent/30 text-ncpor-accent' : 'bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse'}`}>
              {platforms.publish_mode === 'dry_run' ? <RefreshCw className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              {platforms.publish_mode === 'dry_run' ? 'DRY RUN MODE' : 'LIVE MODE - REAL POSTING ACTIVE'}
            </span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl p-6 shadow-premium sweep-hover hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out animate-fade-up" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider">Total Posts</h3>
              <div className="w-8 h-8 rounded-lg bg-ncpor-accent/10 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-ncpor-accent" />
              </div>
            </div>
            <p className="text-3xl font-display text-ncpor-primary">{logs.length}</p>
          </div>
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl p-6 shadow-premium sweep-hover hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out animate-fade-up" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider">Successful</h3>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-3xl font-display text-green-500">{logs.filter(l => l.status === 'success').length}</p>
          </div>
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl p-6 shadow-premium sweep-hover hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider">Failed</h3>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-3xl font-display text-red-500">{logs.filter(l => l.status === 'failed').length}</p>
          </div>
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl p-6 shadow-premium sweep-hover hover:-translate-y-[3px] hover:border-ncpor-accent/30 transition-all duration-220 ease-out animate-fade-up" style={{ animationDelay: '260ms' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-ncpor-secondary text-xs font-semibold uppercase tracking-wider">Scheduled</h3>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-display text-blue-500">{logs.filter(l => l.status === 'scheduled').length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium overflow-hidden animate-fade-up" style={{ animationDelay: '320ms' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-ncpor-elevated border-b border-ncpor-divider">
                <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Platform</th>
                <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Content ID</th>
                <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Post Link</th>
                <th className="px-6 py-4 font-semibold text-ncpor-secondary text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ncpor-divider">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-ncpor-muted">Loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-ncpor-muted">No publishing history found.</td></tr>
              ) : (
                logs.map((log, index) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-ncpor-elevated/50 group transition-colors duration-220 animate-fade-up" style={{ animationDelay: `${380 + index * 30}ms` }}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ncpor-secondary">
                        {new Date(log.scheduled_at || log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ncpor-primary capitalize">{log.platform}</span>
                          {log.text_preview && (
                            <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-ncpor-muted hover:text-ncpor-accent transition-colors duration-220" title="Toggle preview">
                              <svg className={`w-4 h-4 transform transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-ncpor-accent hover:underline cursor-pointer transition-colors" onClick={() => window.location.href=`/content/${log.generated_content_id}`}>
                        #{log.generated_content_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(log.status)}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-sm">
                        {log.status === 'dry_run' ? (
                          <span className="text-ncpor-muted italic">Dry run: not published</span>
                        ) : log.status === 'failed' ? (
                          <span className="text-red-400 font-medium">{log.error_message || 'Failed'}</span>
                        ) : log.status === 'success' ? (
                          log.external_url === 'PRIVATE_TELEGRAM' ? (
                            <span className="text-ncpor-muted italic">No public link (private channel)</span>
                          ) : log.external_url ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <a href={log.external_url} target="_blank" rel="noreferrer" className="text-ncpor-accent hover:underline font-medium inline-flex items-center gap-1 transition-colors">
                                  View post <ExternalLink className="w-3 h-3" />
                                </a>
                                <button onClick={() => handleCopy(log.external_url, log.id)} className="text-ncpor-muted hover:text-ncpor-primary transition-colors duration-220" title="Copy link">
                                  {copiedId === log.id ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                              <div className="text-xs text-ncpor-muted truncate mt-1 max-w-[200px]" title={log.external_url}>{log.external_url}</div>
                            </div>
                          ) : (
                            <span className="text-ncpor-muted italic">Link unavailable</span>
                          )
                        ) : (
                          <span className="text-ncpor-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.status === 'scheduled' && (
                          <button onClick={() => handleCancel(log.id)} className="text-red-400 hover:text-red-300 font-semibold transition-colors duration-220">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.text_preview && (
                      <tr className="bg-ncpor-elevated/30 border-b border-ncpor-divider animate-fade-in">
                        <td colSpan="6" className="px-6 py-4 text-sm text-ncpor-secondary italic">
                          <div className="pl-4 border-l-2 border-ncpor-divider">
                            {log.text_preview}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Publishing;
