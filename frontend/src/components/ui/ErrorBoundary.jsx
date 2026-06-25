import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-500/12 text-danger-500">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-content-primary">Something went wrong</h2>
          <p className="mt-1.5 max-w-sm text-sm text-content-secondary">
            An unexpected error occurred while rendering this view. Try reloading the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
