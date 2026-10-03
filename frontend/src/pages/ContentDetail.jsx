import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Film, FileText, Play, Trash2 } from 'lucide-react';
import { contentAPI } from '../utils/api';
import PublishPanel from '../components/PublishPanel';
import DatasetViewer from '../polar-viz/components/DatasetViewer';
import BandwidthAwareImage from '../components/BandwidthAwareImage';
import { useBandwidth } from '../context/BandwidthContext';

const ContentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('twitter');
  const [editingPosts, setEditingPosts] = useState({});
  const [forceVideo, setForceVideo] = useState(false);
  const [forcePdf, setForcePdf] = useState(false);
  const { isLowBandwidth } = useBandwidth();
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await contentAPI.getById(id);
        setContent(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load content. Please try again.');
        console.error('Error fetching content:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContent();
  }, [id]);
  
  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Wrap with a 90-second timeout to prevent infinite spinning
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 90000)
      );
      const response = await Promise.race([contentAPI.generatePosts(id), timeoutPromise]);
      setContent(prev => ({
        ...prev,
        generated_posts: response.data
      }));
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        setError('AI generation timed out. The backend may be starting up (cold start). Please wait a moment and try again.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('You need to be logged in as an Admin or approved Researcher to generate content.');
      } else {
        setError('Failed to generate posts. The AI backend may be temporarily unavailable. Please try again.');
      }
      console.error('Error generating posts:', err);
    } finally {
      setGenerating(false);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await contentAPI.delete(id);
        navigate('/repository');
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete item. You may not have permission.');
      }
    }
  };

  const handlePostEdit = (postId, newText) => {
    setEditingPosts(prev => ({
      ...prev,
      [postId]: newText
    }));
  };
  
  const handlePostSave = async (postId) => {
    try {
      await contentAPI.updatePost(postId, {
        generated_text: editingPosts[postId]
      });
      // Refresh content
      const response = await contentAPI.getById(id);
      setContent(response.data);
      setEditingPosts(prev => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
    } catch (err) {
      setError('Failed to update post. Please try again.');
      console.error('Error updating post:', err);
    }
  };
  
  const handleStatusChange = async (postId, newStatus) => {
    try {
      await contentAPI.updatePostStatus(postId, newStatus);
      // Refresh content
      const response = await contentAPI.getById(id);
      setContent(response.data);
    } catch (err) {
      setError('Failed to update status. Please try again.');
      console.error('Error updating status:', err);
    }
  };
  
  useEffect(() => {
    if (!content?.generated_posts) return;
    const availablePlatforms = Array.from(new Set(content.generated_posts.map(p => p.platform)));
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(activeTab)) {
      setActiveTab(availablePlatforms[0]);
    }
  }, [content?.generated_posts, activeTab]);

  const renderFilePreview = () => {
    if (!content) return null;
    
    // Check if the physical file actually exists
    if (!content.file_path) {
      return (
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-12 text-center group">
          <div className="text-ncpor-muted/30 text-6xl mb-6">⚠️</div>
          <h3 className="text-2xl font-display text-ncpor-primary mb-3">
            File Not Attached
          </h3>
          <p className="text-ncpor-secondary max-w-md mx-auto">
            This entry was created without an actual file attachment. Please upload a new entry with a valid file to view and download it.
          </p>
        </div>
      );
    }

    // download_url is set by the API adapter per content type
    const fileUrl = content.download_url || `${import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com'}/api/files/${content._type}s/${content._raw_id}`;
    const datasetUrl = content.content_type === 'dataset' ? fileUrl : null;
    
    switch (content.content_type) {
      case 'report':
      case 'publication': {
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-8 relative overflow-hidden group flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-ncpor-accent/10 border border-ncpor-accent/30 flex items-center justify-center text-ncpor-accent">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h4 className="font-semibold text-ncpor-primary text-lg">Document Available</h4>
              <p className="text-sm text-ncpor-muted max-w-sm mt-1">
                Click the button below to securely download the full document.
              </p>
            </div>
            <a
              href={`${fileUrl}?download=1`}
              download
              className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl bg-ncpor-accent/10 border border-ncpor-accent/40 text-ncpor-accent text-sm font-semibold hover:bg-ncpor-accent hover:text-ncpor-bg transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Download Document
            </a>
          </div>
        );
      }
      case 'photo':
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-4 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1416] via-transparent to-transparent opacity-0 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none rounded-xl" />
            <BandwidthAwareImage
              src={fileUrl}
              alt={content.title}
              className="w-full h-auto rounded-lg shadow-md mb-4"
              placeholderLabel="High-resolution Image"
            />
            <div className="flex justify-end mt-4">
              <a
                href={${fileUrl}?download=1}
                download
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-ncpor-accent/40 text-ncpor-accent text-sm font-semibold hover:bg-ncpor-accent hover:text-ncpor-bg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Download Photo
              </a>
            </div>
          </div>
        );
      case 'video': {
        const isVideoGated = isLowBandwidth && !forceVideo;
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-4">
            {isVideoGated ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-ncpor-bg/60 rounded-lg border border-ncpor-divider/60 space-y-3">
                <div className="w-12 h-12 rounded-full bg-ncpor-accent/10 border border-ncpor-accent/30 flex items-center justify-center text-ncpor-accent">
                  <Film className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-ncpor-primary text-sm">Video Streaming Paused</h4>
                  <p className="text-xs text-ncpor-muted max-w-sm mt-1">
                    Video playback is blocked in Data Saver mode to preserve bandwidth.
                  </p>
                </div>
                <button
                  onClick={() => setForceVideo(true)}
                  className="px-4 py-2 bg-ncpor-accent/10 hover:bg-ncpor-accent/20 border border-ncpor-accent/40 rounded-lg text-xs font-semibold text-ncpor-accent transition-colors flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Load & Play Video
                </button>
              </div>
            ) : (
              <video
                src={fileUrl}
                controls
                className="w-full rounded-lg shadow-md mb-4"
              >
                Your browser does not support the video tag.
              </video>
            )}
            
            <div className="flex justify-end mt-4">
              <a
                href={${fileUrl}?download=1}
                download
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-ncpor-accent/40 text-ncpor-accent text-sm font-semibold hover:bg-ncpor-accent hover:text-ncpor-bg transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Download Video
              </a>
            </div>
          </div>
        );
      }
      case 'dataset':
        return (
          <div className="space-y-4">
            {/* Header card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0a1526] to-[#040811] p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Scientific Dataset</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✓ 3D Polar Engine</span>
                    </div>
                    <p className="text-sm font-bold text-ncpor-primary">
                      {content.file_path ? content.file_path.split('/').pop() : content.title}
                    </p>
                    <p className="text-xs text-ncpor-secondary mt-0.5">CTD Profiles · Water Columns · Scalar Field Rendering</p>
                  </div>
                </div>
                <a
                  href={${fileUrl}?download=1}
                  download
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-ncpor-accent/40 text-ncpor-accent text-sm font-semibold hover:bg-ncpor-accent hover:text-ncpor-bg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download Dataset
                </a>
              </div>
            </div>

            {/* Embedded 3D Visualizer — loads directly from the file URL */}
            <div className="rounded-2xl border border-ncpor-divider overflow-hidden">
              <DatasetViewer url={datasetUrl} height={520} />
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-12 text-center group hover:-translate-y-1 transition-all duration-300">
            <div className="text-ncpor-muted/30 text-6xl mb-6 transition-transform group-hover:scale-110 duration-500">📄</div>
            <h3 className="text-2xl font-display text-ncpor-primary mb-3">
              File Preview Not Available
            </h3>
            <p className="text-ncpor-secondary mb-8">This file type cannot be previewed directly in the browser.</p>
            <a
              href={${fileUrl}?download=1}
              download
              className="inline-flex items-center space-x-2 bg-ncpor-sidebar border border-ncpor-divider text-ncpor-primary py-3 px-8 rounded-lg hover:border-ncpor-accent hover:text-ncpor-accent transition-all font-semibold uppercase tracking-wider text-sm"
            >
              <span>Download File</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </a>
          </div>
        );
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-ncpor-divider text-ncpor-secondary border border-ncpor-divider',
      approved: 'bg-ncpor-panel text-ncpor-primary border border-ncpor-divider',
      published: 'bg-ncpor-sidebar text-ncpor-primary border border-ncpor-accent/30'
    };
    return colors[status] || colors.draft;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ncpor-accent"></div>
      </div>
    );
  }
  
  if (error && !content) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-3 rounded max-w-7xl mx-auto mt-8 font-medium">
        {error}
        <button
          onClick={() => navigate('/')}
          className="ml-4 text-red-400 hover:text-red-300 underline"
        >
          Back to Repository
        </button>
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/50 text-yellow-200 px-4 py-3 rounded max-w-7xl mx-auto mt-8 font-medium">
        Content not found
        <button
          onClick={() => navigate('/')}
          className="ml-4 text-yellow-400 hover:text-yellow-300 underline"
        >
          Back to Repository
        </button>
      </div>
    );
  }
  
  const postsByPlatform = {};
  const platforms = [];
  content.generated_posts?.forEach(post => {
    postsByPlatform[post.platform] = post;
    if (!platforms.includes(post.platform)) {
      platforms.push(post.platform);
    }
  });
  if (platforms.length === 0) {
    platforms.push('twitter', 'instagram', 'linkedin', 'website');
  }
  
  const getCategoryColor = (cat) => {
    return 'bg-ncpor-divider text-ncpor-primary border border-ncpor-divider';
  };
  
  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        to="/"
        className="inline-flex items-center space-x-2 text-ncpor-secondary hover:text-ncpor-primary mb-8 transition-colors group"
      >
        <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
        <span className="font-medium tracking-wide uppercase text-sm">Back to Repository</span>
      </Link>
      
      {/* Content Details */}
      <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-8 mb-8 relative overflow-hidden">
        {/* Accent Top Border */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncpor-accent via-ncpor-accentBright to-transparent opacity-50" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-display text-ncpor-primary mb-4 leading-tight">
              {content.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-3 py-1.5 rounded bg-ncpor-bg border ${getCategoryColor(content.category).replace('bg-', 'border-').replace('/10', '/30')} text-xs font-semibold uppercase tracking-wider shadow-sm`}>
                {content.category}
              </span>
              <span className="px-3 py-1.5 rounded bg-ncpor-sidebar border border-ncpor-divider text-ncpor-secondary text-xs font-semibold uppercase tracking-wider shadow-sm">
                {content.content_type}
              </span>
              {content.year && (
                <span className="px-3 py-1.5 rounded bg-ncpor-sidebar border border-ncpor-divider text-ncpor-secondary text-xs font-semibold uppercase tracking-wider shadow-sm">
                  {content.year}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleDelete}
              className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center space-x-2"
              title="Delete this item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-3 bg-ncpor-accent text-ncpor-bg font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-ncpor-accentBright disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-ncpor-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  <span>Generate Content</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline error banner (for generate errors, not initial load errors) */}
        {error && content && (
          <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl mb-4 text-sm">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 shrink-0">✕</button>
          </div>
        )}

        {content.description && (
          <p className="text-ncpor-secondary text-lg leading-relaxed max-w-4xl mb-6">{content.description}</p>
        )}
        
        {content.expedition_name && (
          <div className="inline-flex items-center space-x-2 text-sm text-ncpor-secondary mb-4 bg-ncpor-bg/50 px-4 py-2 rounded-lg border border-ncpor-divider">
            <svg className="w-4 h-4 text-ncpor-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span><strong className="text-ncpor-primary font-medium">Expedition:</strong> {content.expedition_name}</span>
          </div>
        )}
        
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {content.tags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-ncpor-bg/30 border border-ncpor-divider/50 text-ncpor-secondary rounded-full text-xs font-medium tracking-wide"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* File Preview and Download Section */}
      <div className="mb-8">
        {renderFilePreview()}
      </div>

      {/* Generated Posts Section */}
      {content.generated_posts && content.generated_posts.length > 0 && (
        <div className="bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-premium p-8">
          <div className="flex items-center space-x-3 mb-8">
            <svg className="w-8 h-8 text-ncpor-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <h2 className="text-3xl font-display text-ncpor-primary">
              AI Generated Output
            </h2>
          </div>
          
          {/* Platform Tabs */}
          <div className="flex overflow-x-auto no-scrollbar border-b border-ncpor-divider mb-8">
            {platforms.map(platform => (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`px-8 py-4 font-semibold uppercase tracking-wider text-sm transition-all whitespace-nowrap ${
                  activeTab === platform
                    ? 'text-ncpor-accent border-b-2 border-ncpor-accent bg-ncpor-accent/5'
                    : 'text-ncpor-secondary hover:text-ncpor-primary hover:bg-ncpor-bg/50'
                }`}
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Active Platform Content */}
          {postsByPlatform[activeTab] && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-semibold uppercase tracking-wider text-ncpor-secondary">
                    Review & Edit Content
                  </label>
                  <span className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider ${getStatusColor(postsByPlatform[activeTab].status)}`}>
                    {postsByPlatform[activeTab].status}
                  </span>
                </div>
                
                {postsByPlatform[activeTab].suggested_media_id && (
                  <div className="mb-4 bg-ncpor-bg/30 p-4 rounded-xl border border-ncpor-divider flex items-center gap-4">
                    <div className="w-16 h-16 rounded overflow-hidden bg-ncpor-panel flex items-center justify-center flex-shrink-0">
                      <BandwidthAwareImage 
                        src={`${import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com'}/api/files/media/${postsByPlatform[activeTab].suggested_media_id}/thumbnail`}
                        alt="Suggested Media"
                        className="w-full h-full object-cover"
                        placeholderLabel="Media Thumbnail"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ncpor-primary mb-1">Suggested Media Attachment</h4>
                      <div className="flex gap-3">
                        <a 
                          href={`${import.meta.env.VITE_API_URL || 'https://dhruvkosh.onrender.com'}/api/files/media/${postsByPlatform[activeTab].suggested_media_id}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs text-ncpor-accent hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          View Full
                        </a>
                        <button 
                          onClick={() => {
                            const newText = (editingPosts[postsByPlatform[activeTab].id] || postsByPlatform[activeTab].generated_text) + `\n[Attached Media ID: ${postsByPlatform[activeTab].suggested_media_id}]`;
                            handlePostEdit(postsByPlatform[activeTab].id, newText);
                          }}
                          className="text-xs text-ncpor-secondary hover:text-ncpor-primary flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          Attach to Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="relative group">
                  <textarea
                    value={editingPosts[postsByPlatform[activeTab].id] || postsByPlatform[activeTab].generated_text}
                    onChange={(e) => handlePostEdit(postsByPlatform[activeTab].id, e.target.value)}
                    rows={8}
                    className="w-full bg-ncpor-bg/50 text-ncpor-primary px-6 py-5 border border-ncpor-divider rounded-xl focus:outline-none focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent/30 transition-all resize-y text-lg leading-relaxed font-sans shadow-inner"
                  />
                  <div className="absolute top-4 right-4 text-ncpor-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-ncpor-bg/30 p-4 rounded-xl border border-ncpor-divider">
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  {postsByPlatform[activeTab].status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(postsByPlatform[activeTab].id, 'approved')}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-ncpor-panel text-ncpor-primary border border-ncpor-divider font-semibold uppercase tracking-wider text-sm rounded-lg hover:border-ncpor-accent transition-all"
                    >
                      Approve
                    </button>
                  )}
                  
                  {postsByPlatform[activeTab].status === 'approved' && (
                    <button
                      onClick={() => handleStatusChange(postsByPlatform[activeTab].id, 'published')}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-ncpor-sidebar text-ncpor-primary border border-ncpor-divider font-semibold uppercase tracking-wider text-sm rounded-lg hover:border-ncpor-accent transition-all"
                    >
                      Publish
                    </button>
                  )}
                </div>
                
                {editingPosts[postsByPlatform[activeTab].id] && (
                  <button
                    onClick={() => handlePostSave(postsByPlatform[activeTab].id)}
                    className="w-full sm:w-auto px-8 py-2.5 bg-ncpor-accent text-ncpor-bg font-semibold uppercase tracking-wider text-sm rounded-lg hover:bg-ncpor-accentBright transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    <span>Save Changes</span>
                  </button>
                )}
              </div>
              
              {/* Publish Panel Integration */}
              <PublishPanel post={postsByPlatform[activeTab]} />
            </div>
          )}
          
          {!postsByPlatform[activeTab] && (
            <div className="text-center py-16 text-ncpor-secondary border border-dashed border-ncpor-divider rounded-xl bg-ncpor-bg/20">
              <div className="text-4xl mb-4 opacity-50">🤖</div>
              <p className="text-lg">No content generated for {activeTab ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : ''} yet.</p>
              <p className="text-sm mt-2 opacity-70">Click 'Generate Content' to create an AI draft.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentDetail;
