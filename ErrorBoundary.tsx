import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Une erreur inattendue est survenue.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('12 PIONS ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#02120c] text-[#f0e6c8] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#052319] border-2 border-amber-400/60 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="text-3xl">👑</div>
            <h1 className="text-lg font-black text-amber-300">12 PIONS</h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              Une erreur technique s&apos;est produite lors de la synchronisation. Vos données locales sont préservées.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
            >
              Recharger l&apos;application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
