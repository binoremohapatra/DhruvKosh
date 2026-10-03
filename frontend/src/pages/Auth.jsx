import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import dhruvLogo from '../assets/dhruv_logo.png';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import Threads from '../components/Threads';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, googleSignIn } = useAuth();
  
  const isSignupRoute = location.pathname === '/signup';
  const [isLogin, setIsLogin] = useState(!isSignupRoute);

  useEffect(() => {
    setIsLogin(location.pathname !== '/signup');
  }, [location.pathname]);

  const handleTabSwitch = (loginMode) => {
    setIsLogin(loginMode);
    navigate(loginMode ? '/login' : '/signup', { replace: true });
    setError(null);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    remember: false,
    terms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getStrength = (pw) => {
    if (!pw) return { label: '', color: 'bg-transparent', w: 'w-0' };
    if (pw.length < 8) return { label: 'Weak', color: 'bg-red-500', w: 'w-1/3' };
    if (pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)) return { label: 'Strong', color: 'bg-green-500', w: 'w-full' };
    return { label: 'Fair', color: 'bg-yellow-500', w: 'w-2/3' };
  };
  const strength = getStrength(formData.password);

  const validate = () => {
    if (!formData.email.includes('@')) return "Invalid email address.";
    if (formData.password.length < 8) return "Password must be at least 8 characters.";
    if (!isLogin && formData.password !== formData.confirmPassword) return "Passwords do not match.";
    if (!isLogin && !formData.name) return "Name is required.";
    if (!isLogin && !formData.terms) return "You must accept the terms.";
    return null;
  };

  const triggerError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (failedAttempts >= 5) {
      triggerError("Too many failed attempts. Please try again later.");
      return;
    }
    const valError = validate();
    if (valError) {
      triggerError(valError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        // AuthContext.login() saves token + user and navigates to '/'
        await login(formData.email, formData.password);
      } else {
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'viewer'
        });
        handleTabSwitch(true);
        triggerError('Account created! Please sign in.');
        setLoading(false);
      }
    } catch (err) {
      setFailedAttempts(p => p + 1);
      const msg = err.response?.data?.detail ||
        (isLogin ? 'Incorrect email or password.' : 'Registration failed. Email may already be in use.');
      triggerError(msg);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Starting Google sign-in...');
      // Sign in with Firebase Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Firebase sign-in successful:', user.email);

      // Get ID token from Firebase
      const idToken = await user.getIdToken();
      console.log('Got ID token from Firebase');

      // Send to backend
      console.log('Sending to backend...');
      await googleSignIn(idToken);
      console.log('Backend auth successful');
    } catch (err) {
      console.error('Google Auth error:', err);
      const msg = err.response?.data?.detail || err.message || 'Google sign-in failed. Please try again.';
      triggerError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-ncpor-bg text-ncpor-primary font-sans">

      {/* Brand Panel */}
      <div className="md:w-[52%] w-full bg-gradient-to-br from-[#05080F] to-[#0D1422] relative overflow-hidden flex flex-col justify-between p-8 md:p-12 animate-fade-in md:min-h-screen">

        {/* Threads Animation */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <Threads
            color={[0.5, 0.9, 0.96]}
            amplitude={0.3}
            distance={0.2}
            enableMouseInteraction={true}
          />
        </div>
        
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-8 w-fit">
            <img src={dhruvLogo} alt="DhruvKosh" className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-display font-bold text-white tracking-wider">DhruvKosh</h1>
              <p className="text-[10px] text-[#7FE7F5] tracking-widest uppercase">NCPOR</p>
            </div>
          </Link>
          <div className="hidden md:block mt-20">
            <h2 className="text-4xl lg:text-5xl font-display font-medium text-white mb-4 leading-tight overflow-hidden">
              <span className="block animate-slide-up-mask stagger-1">Every station.</span>
              <span className="block animate-slide-up-mask stagger-2 text-[#7FE7F5]">Every record.</span>
            </h2>
            <p className="text-gray-400 max-w-md animate-fade-in stagger-3">
              Sign in to the National Polar & Ocean Research Knowledge Platform.
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden md:block text-xs text-gray-500 animate-fade-in stagger-4">
          NCPOR, Ministry of Earth Sciences, Govt. of India
        </div>
      </div>

      {/* Auth Panel */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative bg-ncpor-bg z-20 overflow-y-auto">
        <div className={`w-full max-w-[440px] p-8 md:p-10 rounded-2xl transition-all duration-300 ${shake ? 'animate-shake' : ''} opacity-100 scale-100 animate-card-rise bg-ncpor-surface border border-ncpor-divider/50 backdrop-blur-md shadow-2xl`}>
          
          <div className="flex bg-ncpor-elevated rounded-lg p-1 mb-8 relative border border-ncpor-divider">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-ncpor-bg rounded-md shadow-sm border border-ncpor-divider transition-all duration-300 ease-out ${isLogin ? 'left-1' : 'left-[calc(50%+3px)]'}`} />
            <button type="button" onClick={() => handleTabSwitch(true)} className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors ${isLogin ? 'text-ncpor-primary' : 'text-ncpor-muted hover:text-ncpor-secondary'}`}>Login</button>
            <button type="button" onClick={() => handleTabSwitch(false)} className={`relative z-10 flex-1 py-2 text-sm font-medium transition-colors ${!isLogin ? 'text-ncpor-primary' : 'text-ncpor-muted hover:text-ncpor-secondary'}`}>Register</button>
          </div>

                      <div className="relative group w-full mb-6 flex justify-center">
               <button
                 type="button"
                 onClick={() => {
                   alert('Google button clicked!');
                   console.log('Google button clicked!');
                   handleGoogleSignIn();
                 }}
                 disabled={loading}
                 className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-all active:scale-[0.98] border border-gray-300 shadow-sm"
               >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                   <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                   <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                   <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                   <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                 </svg>
                 <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
               </button>
            </div>
          
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-ncpor-divider" />
            <span className="text-xs text-ncpor-muted uppercase tracking-wider">or continue with email</span>
            <div className="flex-1 h-px bg-ncpor-divider" />
          </div>

          <div className="relative overflow-hidden transition-all duration-300" style={{ height: isLogin ? '260px' : '460px' }}>
            <div className={`absolute inset-0 w-full transition-all duration-300 ease-out flex flex-col gap-4 ${isLogin ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-8 pointer-events-none'}`}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative group">
                  <input type="email" name="email" id="email-login" value={formData.email} onChange={handleChange} required autoComplete="email" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-3 pt-5 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Email" />
                  <label htmlFor="email-login" className="absolute left-4 top-1.5 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Email</label>
                  {formData.email.includes('@') && <CheckCircle2 className="w-4 h-4 text-green-500 absolute right-4 top-4 animate-draw-check" />}
                </div>

                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} name="password" id="password-login" value={formData.password} onChange={handleChange} required autoComplete="current-password" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-3 pt-5 pr-10 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Password" />
                  <label htmlFor="password-login" className="absolute left-4 top-1.5 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Password</label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-ncpor-muted hover:text-ncpor-accent transition-colors" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} className="w-4 h-4 rounded border-ncpor-divider text-ncpor-accent focus:ring-ncpor-accent focus:ring-offset-ncpor-bg bg-ncpor-bg" />
                    <span className="text-xs text-ncpor-secondary group-hover:text-ncpor-primary transition-colors">Remember me</span>
                  </label>
                  <button type="button" className="text-xs text-ncpor-accent hover:text-cyan-400 hover:underline transition-colors">Forgot password?</button>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-2 bg-ncpor-accent text-[#05080F] font-semibold py-2.5 rounded-lg hover:bg-cyan-400 transition-all active:scale-[0.98] flex items-center justify-center h-10 sweep-hover relative overflow-hidden">
                  <span className="relative z-10">{loading ? <div className="w-5 h-5 border-2 border-[#05080F]/30 border-t-[#05080F] rounded-full animate-spin" /> : 'Sign in'}</span>
                </button>
              </form>
            </div>

            <div className={`absolute inset-0 w-full transition-all duration-300 ease-out flex flex-col gap-4 ${!isLogin ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative group">
                  <input type="text" name="name" id="name-reg" value={formData.name} onChange={handleChange} required autoComplete="name" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Full name" />
                  <label htmlFor="name-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Full name</label>
                </div>

                <div className="relative group">
                  <input type="email" name="email" id="email-reg" value={formData.email} onChange={handleChange} required autoComplete="email" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Email" />
                  <label htmlFor="email-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Email</label>
                </div>

                <div className="relative group">
                  <input type="text" name="organization" id="org-reg" value={formData.organization} onChange={handleChange} autoComplete="organization" className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Organization" />
                  <label htmlFor="org-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Organization (optional)</label>
                </div>

                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} name="password" id="password-reg" value={formData.password} onChange={handleChange} required autoComplete="new-password" minLength={8} className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 pr-10 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Password" />
                  <label htmlFor="password-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Password</label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-ncpor-muted hover:text-ncpor-accent transition-colors" aria-label="Toggle password visibility">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <div className="flex-1 h-1 bg-ncpor-divider rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} ${strength.w} transition-all duration-300 ease-out`} />
                    </div>
                    <span className="text-[10px] text-ncpor-muted w-10 text-right">{strength.label}</span>
                  </div>
                </div>

                <div className="relative group">
                  <input type={showPassword ? 'text' : 'password'} name="confirmPassword" id="confirm-reg" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" minLength={8} className="peer w-full bg-ncpor-bg border border-ncpor-divider rounded-lg px-4 py-2.5 pt-4 pr-10 text-sm text-ncpor-primary placeholder-transparent focus:border-ncpor-accent focus:ring-1 focus:ring-ncpor-accent outline-none transition-colors" placeholder="Confirm password" />
                  <label htmlFor="confirm-reg" className="absolute left-4 top-1 text-[10px] text-ncpor-muted transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-2.5 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-ncpor-accent uppercase tracking-wide">Confirm password</label>
                </div>

                <label className="flex items-start gap-2 cursor-pointer mt-1">
                  <input type="checkbox" name="terms" checked={formData.terms} onChange={handleChange} required className="w-4 h-4 mt-0.5 rounded border-ncpor-divider text-ncpor-accent focus:ring-ncpor-accent focus:ring-offset-ncpor-bg bg-ncpor-bg" />
                  <span className="text-[11px] text-ncpor-secondary leading-tight">I agree to the Terms of Service and Privacy Policy.</span>
                </label>

                <button type="submit" disabled={loading} className="w-full mt-2 bg-ncpor-accent text-[#05080F] font-semibold py-2.5 rounded-lg hover:bg-cyan-400 transition-all active:scale-[0.98] flex items-center justify-center h-10 sweep-hover relative overflow-hidden">
                  <span className="relative z-10">{loading ? <div className="w-5 h-5 border-2 border-[#05080F]/30 border-t-[#05080F] rounded-full animate-spin" /> : 'Create account'}</span>
                </button>
              </form>
            </div>
          </div>

          <div aria-live="polite" className="mt-4 text-center">
            {error && (
              <p className={`text-sm ${error.includes('successfully') ? 'text-green-500' : 'text-red-500'}`}>{error}</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Auth;
