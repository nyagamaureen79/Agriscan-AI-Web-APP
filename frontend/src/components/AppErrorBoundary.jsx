import React from 'react';
import { SessionExpiredError } from '../utils/apiFetch';
import './AppErrorBoundary.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isSessionError: false };
  }

  static getDerivedStateFromError(error) {
    const isSessionError = error instanceof SessionExpiredError || error?.name === 'SessionExpiredError';
    return { hasError: true, isSessionError };
  }

  componentDidCatch(error, info) {
    if (!(error instanceof SessionExpiredError)) {
      console.error('AppErrorBoundary caught an error:', error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, isSessionError: false });
  };

  render() {
    const { hasError, isSessionError } = this.state;

    // For session errors, render nothing — the SessionExpiredModal (outside
    // this boundary) will overlay and handle it.
    if (hasError && isSessionError) {
      return null;
    }

    if (hasError) {
      return (
        <div className="error-boundary-wrapper">
          <div className="error-boundary-card">
            <div className="error-boundary-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              An unexpected error occurred. Try refreshing the page or navigating back to the dashboard.
            </p>
            <div className="error-boundary-actions">
              <button className="error-boundary-btn error-boundary-btn--primary" onClick={() => window.location.reload()}>
                Refresh Page
              </button>
              <button className="error-boundary-btn error-boundary-btn--secondary" onClick={() => { window.location.href = '/dashboard'; }}>
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
