import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import publishAPI from '../api/publish';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { useInvalidateLiveStats } from '../hooks/useLiveStats';

const PublishPanel = ({ post, onPublishSuccess }) => {
  const queryClient = useQueryClient();
  const invalidateLiveStats = useInvalidateLiveStats();
  const { user, canPublishSocial, isPendingResearcher, isNormalUser } = useAuth();
  const [platforms, setPlatforms] = useState({ configured_platforms: [], publish_mode: 'dry_run' });
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publishStatus, setPublishStatus] = useState([]); // from API
  const [localText, setLocalText] = useState(post.generated_text);
  const [customImage, setCustomImage] = useState(null);

  useEffect(() => {
    setLocalText(post.generated_text);
  }, [post.generated_text]);

  useEffect(() => {
    publishAPI.getPlatforms().then(res => {
      setPlatforms(res.data);
      if (res.data.configured_platforms.includes(post.platform)) {
        setSelectedPlatforms([post.platform]);
      } else if (res.data.configured_platforms.length > 0) {
        setSelectedPlatforms([res.data.configured_platforms[0]]);
      }
    }).catch(e => console.error(e));
    
    fetchStatus();
  }, [post.id, post.platform]);

  const fetchStatus = () => {
    publishAPI.getPublishStatus(post.id).then(res => {
      setPublishStatus(res.data);
    }).catch(e => console.error(e));
  };

  const handlePublish = async () => {
    if (!canPublishSocial) {
      if (isPendingResearcher) {
        alert('Your researcher account is currently pending Admin approval. You cannot post content across social media platforms until approved by an Admin.');
      } else if (isNormalUser) {
        alert('Normal users cannot post content across social media platforms. Please register as a Researcher and get approved by an Admin.');
      } else {
        alert('Please log in with an approved Researcher or Admin account to publish.');
      }
      return;
    }

    try {
      setLoading(true);
      let finalMediaId = post.suggested_media_id;
      
      if (customImage) {
        const formData = new FormData();
        formData.append('file', customImage);
        formData.append('title', 'Custom Social Media Image');
        formData.append('media_type', 'photo');
        
        try {
          const token = localStorage.getItem('token');
          const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com'}/api/expeditions/standalone`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!uploadRes.ok) {
            const errData = await uploadRes.json();
            throw new Error(errData.detail || 'Image upload failed');
          }
          const mediaData = await uploadRes.json();
          finalMediaId = mediaData.id;
        } catch (err) {
          alert('Failed to upload custom image: ' + err.message);
          setLoading(false);
          return;
        }
      }

      await publishAPI.publishContent(post.id, {
        platforms: selectedPlatforms,
        media_id: finalMediaId,
        scheduled_at: scheduleDate ? new Date(scheduleDate).toISOString() : null
      });
      queryClient.invalidateQueries({ queryKey: ['publishLog'] });
      invalidateLiveStats();
      setIsModalOpen(false);
      fetchStatus();
      if (onPublishSuccess) onPublishSuccess();
    } catch (e) {
      alert('Failed to publish: ' + (e.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };
  
  const allPlatforms = ['twitter', 'telegram', 'mastodon', 'bluesky', 'linkedin', 'facebook', 'instagram', 'threads'];
  const isApproved = post.status === 'approved' || post.status === 'published';

  return (
    <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-6 mt-6">
      <h3 className="text-xl font-display text-ncpor-primary mb-4">Publish Content</h3>
      
      {/* Role & Approval Warning Banner */}
      {isPendingResearcher && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl mb-4 text-sm font-medium flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-bold">Pending Admin Approval for Social Media Publishing</p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              Your researcher account is registered, but your social media publishing privileges are pending Admin approval. Contact your NCPOR Admin or switch to the Seed Admin account to approve.
            </p>
          </div>
        </div>
      )}

      {isNormalUser && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 p-4 rounded-xl mb-4 text-sm font-medium flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Normal User Account</p>
            <p className="text-xs text-cyan-300/80 mt-0.5">
              Normal users can explore datasets and research publications. To post content across social media platforms, please register as a Researcher.
            </p>
          </div>
        </div>
      )}
      
      {!isApproved && (
        <div className="bg-yellow-900/20 text-yellow-500 p-3 rounded mb-4 text-sm font-medium">
          Content must be Approved before it can be published.
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-sm font-semibold uppercase tracking-wider text-ncpor-secondary mb-2">Target Platforms</label>
        <div className="flex flex-wrap gap-3">
          {allPlatforms.map(p => {
            const isConfigured = platforms.configured_platforms.includes(p);
            return (
              <label 
                key={p} 
                className={`flex items-center space-x-2 p-2 border rounded-lg cursor-pointer transition-colors ${!isConfigured ? 'opacity-50 grayscale cursor-not-allowed bg-ncpor-bg/30' : selectedPlatforms.includes(p) ? 'border-ncpor-accent bg-ncpor-accent/10 text-ncpor-accent' : 'border-ncpor-divider hover:border-ncpor-accent/50'}`}
                title={!isConfigured ? 'Credentials not configured' : ''}
              >
                <input 
                  type="checkbox" 
                  disabled={!isConfigured || !isApproved}
                  checked={selectedPlatforms.includes(p)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedPlatforms([...selectedPlatforms, p]);
                    else setSelectedPlatforms(selectedPlatforms.filter(pl => pl !== p));
                  }}
                  className="hidden"
                />
                <span className="capitalize text-sm font-medium">{p}</span>
              </label>
            );
          })}
        </div>
      </div>
      
      {selectedPlatforms.includes('twitter') && (
        <div className="mb-4 flex justify-end">
          <span className={`text-xs font-mono ${localText.length > 280 ? 'text-red-500 font-bold' : 'text-ncpor-secondary'}`}>
            X limit: {localText.length}/280
          </span>
        </div>
      )}

      {selectedPlatforms.includes('instagram') && !post.suggested_media_id && (
        <div className="mb-6 p-4 border border-ncpor-divider rounded-lg bg-ncpor-bg/30">
          <label className="block text-sm font-semibold text-ncpor-primary mb-2">
            Instagram requires an Image. Please upload one:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setCustomImage(e.target.files[0])}
            className="text-sm text-ncpor-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ncpor-accent/10 file:text-ncpor-accent hover:file:bg-ncpor-accent/20"
          />
          {!customImage && (
            <p className="text-xs text-red-400 mt-2">Publishing to Instagram will fail without an image.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center justify-between border-t border-ncpor-divider pt-4">
        <div className="flex items-center space-x-2">
          <input 
            type="datetime-local" 
            value={scheduleDate}
            onChange={e => setScheduleDate(e.target.value)}
            disabled={!isApproved}
            className="bg-ncpor-bg/50 border border-ncpor-divider text-ncpor-primary px-3 py-2 rounded focus:outline-none focus:border-ncpor-accent text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={!isApproved || selectedPlatforms.length === 0}
            className="px-6 py-2 bg-ncpor-accent text-ncpor-bg font-bold uppercase tracking-wider text-sm rounded hover:bg-ncpor-accentBright disabled:opacity-50 transition-colors"
          >
            {scheduleDate ? 'Schedule' : 'Publish Now'}
          </button>
        </div>
      </div>

      {/* Result Chips */}
      {publishStatus.length > 0 && (
        <div className="mt-6 border-t border-ncpor-divider pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold uppercase text-ncpor-secondary">Posted To</h4>
            {publishStatus.some(log => log.status === 'success' && log.external_url && log.external_url !== 'PRIVATE_TELEGRAM') && (
              <button
                onClick={() => {
                  const links = publishStatus
                    .filter(log => log.status === 'success' && log.external_url && log.external_url !== 'PRIVATE_TELEGRAM')
                    .map(log => `${log.platform.charAt(0).toUpperCase() + log.platform.slice(1)}: ${log.external_url}`)
                    .join('\n');
                  navigator.clipboard.writeText(links);
                  alert('Links copied to clipboard!');
                }}
                className="text-xs flex items-center gap-1 bg-ncpor-bg text-ncpor-secondary hover:text-ncpor-primary px-3 py-1.5 rounded-full border border-ncpor-divider hover:border-ncpor-accent/50 transition-colors font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                Share links
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {publishStatus.map(log => (
              <div key={log.id} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-ncpor-bg/30 ${
                log.status === 'success' ? 'border-ncpor-accent/30 text-ncpor-primary' : 
                log.status === 'failed' ? 'border-red-500/30 text-red-400' : 
                log.status === 'dry_run' ? 'border-gray-500/30 text-gray-400' :
                'border-blue-500/30 text-blue-400'
              }`}>
                {/* Status indicator dot */}
                <div className={`w-2 h-2 rounded-full ${
                  log.status === 'success' ? 'bg-ncpor-accent shadow-[0_0_8px_rgba(var(--ncpor-accent-rgb),0.6)]' :
                  log.status === 'failed' ? 'bg-red-500' :
                  log.status === 'dry_run' ? 'bg-gray-400' :
                  'bg-blue-500 animate-pulse'
                }`} />
                
                <span className="capitalize font-semibold">{log.platform}</span>
                <span className="text-xs text-ncpor-secondary opacity-80 border-l border-ncpor-divider pl-2">
                  {new Date(log.scheduled_at || log.created_at).toLocaleDateString()}
                </span>
                
                {log.status === 'success' ? (
                  log.external_url === 'PRIVATE_TELEGRAM' ? (
                    <span className="text-xs italic ml-1 opacity-70">Private</span>
                  ) : log.external_url ? (
                    <a href={log.external_url} target="_blank" rel="noreferrer" className="ml-1 text-ncpor-accent hover:text-ncpor-accentBright hover:underline flex items-center gap-1 font-medium transition-colors">
                      Live ↗
                    </a>
                  ) : (
                    <span className="text-xs italic ml-1 opacity-70">No link</span>
                  )
                ) : log.status === 'failed' ? (
                  <span className="text-xs ml-1 max-w-[120px] truncate" title={log.error_message}>{log.error_message}</span>
                ) : log.status === 'dry_run' ? (
                  <span className="text-xs italic ml-1 opacity-70">Dry run</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-ncpor-primary mb-2">Confirm {scheduleDate ? 'Schedule' : 'Publish'}</h2>
            <p className="text-ncpor-secondary text-sm mb-4">
              You are about to {scheduleDate ? 'schedule' : 'publish'} this post to: <strong className="text-ncpor-accent capitalize">{selectedPlatforms.join(', ')}</strong>.
              {platforms.publish_mode === 'dry_run' ? (
                <span className="block mt-2 text-yellow-500 font-bold bg-yellow-900/20 p-2 rounded">Dry Run Mode: No real posts will be made.</span>
              ) : (
                <span className="block mt-2 text-red-500 font-bold bg-red-900/20 p-2 rounded">Live Mode: This action is irreversible.</span>
              )}
            </p>
            <div className="bg-ncpor-bg p-4 rounded-lg border border-ncpor-divider mb-6 max-h-60 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm text-ncpor-primary">{localText}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-ncpor-divider text-ncpor-secondary rounded hover:text-ncpor-primary transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handlePublish}
                disabled={loading}
                className="px-6 py-2 bg-ncpor-accent text-ncpor-bg rounded font-bold hover:bg-ncpor-accentBright transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishPanel;
