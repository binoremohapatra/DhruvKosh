import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import PageTransition from './PageTransition';
import {
  Database,
  UploadCloud,
  LayoutDashboard,
  Share2,
  Bell,
  Bot,
  Sun,
  Moon,
  Shield,
  LogOut,
  LogIn,
  CheckCircle2,
  Clock,
  ChevronDown,
  Zap,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useBandwidth } from '../context/BandwidthContext';
import dhruvLogo from '../assets/dhruv_logo.png';
import DownloadManagerWidget from './DownloadManagerWidget';

/* ── Connection-quality dot colours ──────────────────────────────── */
const DOT_COLOR = { fast: '#22c55e', moderate: '#f59e0b', slow: '#ef4444', unknown: '#6b7280' };
const DOT_LABEL = { fast: 'Good connection', moderate: 'Limited connection', slow: 'Slow connection', unknown: 'Connection unknown' };

const Layout = () => {
  const { isLight, toggleTheme } = useTheme();
  const { user, logout, isAdmin, isResearcher, isApprovedResearcher, isPendingResearcher } = useAuth();
  const { connectionType, isLowBandwidth, manualOverride, setManualOverride } = useBandwidth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };
    
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  /* ─── Nav item definition ─────────────────────────────────────────────── */
  const NAV = [
    { to: '/', end: true, label: 'Repository', icon: Database },
    { to: '/upload', label: 'Upload', icon: UploadCloud },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/publishing', label: 'Publishing', icon: Share2 },
    { to: '/expeditions', label: 'Expeditions', icon: Database },
    { to: '/polar-guide', label: 'AI Guide', icon: Bot },
  ];

  if (isAdmin) {
    NAV.push({ to: '/admin', label: 'Admin Control', icon: Shield });
  }

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full bg-ncpor-bg text-ncpor-primary font-sans relative flex flex-col selection:bg-cyan-500/20 selection:text-cyan-200 transition-colors duration-300">
      {/* ── Top Navigation Bar (Single Global Header) ───────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-ncpor-divider bg-ncpor-bg/85 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Portal Identity */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(0,210,255,0.45)] group-hover:scale-105">
              <img
                src={dhruvLogo}
                alt="DhruvKosh logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-lg tracking-wider text-ncpor-primary group-hover:text-ncpor-accent transition-colors">
                  DhruvKosh
                </span>
                <span className="px-1.5 py-0.5 bg-ncpor-accent/10 border border-ncpor-accent/20 text-ncpor-accent text-[10px] font-mono rounded tracking-widest uppercase">
                  NCPOR
                </span>
              </div>
              <span className="text-[10px] text-ncpor-muted uppercase tracking-widest -mt-0.5">
                National Polar &amp; Ocean Research
              </span>
            </div>
          </NavLink>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-ncpor-panel/80 p-1 rounded-xl border border-ncpor-divider">
            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `
                  flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 whitespace-nowrap
                  ${
                    isActive
                      ? 'bg-ncpor-elevated text-ncpor-accent shadow-sm'
                      : 'text-ncpor-secondary hover:text-ncpor-primary hover:bg-ncpor-elevated/50'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Action Icons: Theme Toggle, Data Saver, User Profile & Role Status */}
          <div className="flex items-center gap-3">

            {/* Connection quality dot — hidden when fast/unknown */}
            {(connectionType === 'slow' || connectionType === 'moderate') && (
              <span
                title={DOT_LABEL[connectionType]}
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: DOT_COLOR[connectionType], boxShadow: `0 0 6px ${DOT_COLOR[connectionType]}99` }}
              />
            )}

            {/* Data Saver toggle */}
            <button
              id="data-saver-toggle"
              onClick={() => setManualOverride(!manualOverride)}
              title={manualOverride ? 'Data Saver ON — click to disable' : 'Enable Data Saver mode'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 active:scale-95 ${
                isLowBandwidth
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'border-ncpor-divider bg-ncpor-panel text-ncpor-muted hover:border-ncpor-accent/40 hover:text-ncpor-primary'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">{isLowBandwidth ? 'Data Saver' : 'Saver'}</span>
            </button>

            {/* Theme Toggle (Midnight / Glacier Day) */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-ncpor-divider bg-ncpor-panel hover:border-ncpor-accent/40 text-ncpor-secondary hover:text-ncpor-primary transition-all duration-200 active:scale-95 shadow-sm"
              title={`Switch to ${isLight ? 'Midnight (Dark)' : 'Glacier Day (Light)'}`}
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#0A7C8C]" />
                  <span className="hidden sm:inline">Glacier Day</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#7FE7F5]" />
                  <span className="hidden sm:inline">Midnight</span>
                </>
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 relative text-ncpor-muted hover:text-ncpor-accent hover:bg-ncpor-panel rounded-lg transition-colors border border-transparent hover:border-ncpor-divider"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-ncpor-bg"></span>
                )}
              </button>
              
              {/* Dropdown Panel */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in flex flex-col">
                  <div className="p-3 border-b border-ncpor-divider flex items-center justify-between bg-ncpor-bg/50">
                    <h3 className="text-sm font-semibold text-ncpor-primary">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-ncpor-accent hover:text-ncpor-primary transition-colors">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(note => (
                        <div key={note.id} className={`p-3 border-b border-ncpor-divider/50 hover:bg-ncpor-elevated transition-colors ${!note.read ? 'bg-ncpor-accent/5' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={`text-sm ${!note.read ? 'text-ncpor-primary font-medium' : 'text-ncpor-secondary'}`}>{note.title}</h4>
                            <span className="text-[10px] text-ncpor-muted whitespace-nowrap">{note.time}</span>
                          </div>
                          <p className="text-xs text-ncpor-muted mt-1">{note.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-ncpor-muted">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auth State Button / Profile dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-ncpor-panel border border-ncpor-divider hover:border-ncpor-accent/40 transition-all duration-200"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-ncpor-primary leading-tight flex items-center gap-1.5">
                      {user.name}
                      {isAdmin && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono rounded">
                          Admin
                        </span>
                      )}
                      {isApprovedResearcher && (
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono rounded flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                        </span>
                      )}
                      {isPendingResearcher && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono rounded flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Pending Approval
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-ncpor-muted capitalize">
                      {user.role} {user.institution ? `• ${user.institution}` : ''}
                    </span>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-ncpor-muted" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-ncpor-panel border border-ncpor-divider rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-ncpor-divider">
                      <p className="text-xs font-bold text-ncpor-primary">{user.name}</p>
                      <p className="text-[11px] text-ncpor-muted truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ncpor-elevated text-ncpor-accent capitalize">
                          Role: {user.role}
                        </span>
                        {isResearcher && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              user.is_approved
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {user.is_approved ? 'Approved to Post' : 'Pending Approval'}
                          </span>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-ncpor-primary hover:bg-ncpor-elevated"
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Admin Control &amp; Approvals</span>
                      </NavLink>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-500 hover:to-blue-500 transition-all duration-200"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login / Register</span>
              </NavLink>
            )}
          </div>
        </div>
      </header>

      {/* ── Data Saver active banner ──────────────────────────────────── */}
      {isLowBandwidth && !bannerDismissed && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/25 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              <strong>Data Saver active</strong> — heavy media (3D, images, video) is deferred to reduce data usage.
              {!manualOverride && connectionType !== 'unknown' && (
                <span className="opacity-75"> Detected: {DOT_LABEL[connectionType].toLowerCase()}.</span>
              )}
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="p-1 rounded hover:bg-amber-500/20 transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Page Content Outlet ─────────────────────────────────── */}
      <main className="flex-1 w-full relative z-10">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-ncpor-divider bg-ncpor-bg text-ncpor-muted py-8 text-xs relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-ncpor-secondary">
            <span>© {new Date().getFullYear()} National Centre for Polar and Ocean Research (NCPOR)</span>
            <span>•</span>
            <span>Ministry of Earth Sciences, Govt. of India</span>
          </div>
          <div className="flex items-center gap-4 text-ncpor-muted">
            <span className="hover:text-ncpor-accent transition-colors">Antarctica (Maitri & Bharati)</span>
            <span>•</span>
            <span className="hover:text-ncpor-accent transition-colors">Arctic (Himadri)</span>
            <span>•</span>
            <span className="hover:text-ncpor-accent transition-colors">Himalayas</span>
          </div>
        </div>
      </footer>

      {/* ── Global Download Manager Tray ──────────────────────────── */}
      <DownloadManagerWidget />
    </div>
  );
};

export default Layout;
