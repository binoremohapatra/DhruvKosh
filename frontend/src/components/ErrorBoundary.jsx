import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#05080F] text-[#EAF0F8]">
          <div className="max-w-md w-full p-8 rounded-2xl border bg-[#0D1422] border-white/10 shadow-xl text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm mb-4 text-slate-400">
              We encountered an unexpected error rendering this page.
            </p>
            {this.state.error && (
              <div className="text-xs text-left bg-black/50 p-4 rounded-lg mb-6 overflow-auto max-h-48 border border-red-500/20">
                <p className="text-red-400 font-semibold mb-1">{this.state.error.name || 'Error'}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap">{this.state.error.stack}</pre>
                )}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium transition-colors bg-ncpor-accent text-[#05080F] hover:bg-ncpor-accentBright"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
