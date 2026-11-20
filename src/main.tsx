import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected rendering error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nexus Consumers Limited UI Error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-4 text-center">
            <h1 className="text-lg font-bold text-[#13204A]">Nexus Consumers Limited</h1>
            <p className="text-xs text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.removeItem('nexus_consumers_state_v1');
                  window.localStorage.removeItem('nexus_consumers_state_v2');
                } catch {
                  // ignore
                }
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#13204A] rounded-md cursor-pointer"
            >
              Reset Local State &amp; Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
