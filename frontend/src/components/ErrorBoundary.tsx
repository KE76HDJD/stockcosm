import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-porcelaine dark:bg-[#0F1113] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-8 text-center">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h1 className="font-heading font-700 text-xl text-text-primary dark:text-[#E4E6E9] mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-text-secondary dark:text-[#8B9199] mb-6">
              {this.state.error?.message || "L'application a rencontré un problème inattendu."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-button hover:bg-accent/90 transition-colors"
            >
              <RefreshCw size={16} />
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
