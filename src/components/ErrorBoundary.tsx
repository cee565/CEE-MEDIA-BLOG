import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <AlertTriangle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Something went wrong</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              We encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 bg-slate-900 text-white px-8 py-4 rounded-full font-black hover:scale-105 transition-all active:scale-95"
          >
            <RefreshCw size={18} />
            <span>REFRESH PAGE</span>
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-slate-100 rounded-2xl text-left text-xs overflow-auto max-w-full text-red-600 font-mono">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
