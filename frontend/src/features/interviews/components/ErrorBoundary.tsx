import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled lifecycle exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-md mx-auto mt-16 p-6 border border-red-200 bg-red-50 rounded-lg shadow-sm text-center">
          <h2 className="text-lg font-bold text-red-800 mb-2">Application Crash Detected</h2>
          <p className="text-sm text-red-600 mb-4">
            {this.state.error?.message || 'An unexpected rendering error occurred inside the app.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors cursor-pointer"
          >
            Refresh & Restart Session
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
