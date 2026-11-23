import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../utils/auth';
import { useSession } from '../contexts/SessionContext';
import './SessionExpiredModal.css';

const SessionExpiredModal = ({ reason = 'inactivity' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearExpiry } = useSession();

  const handleSignIn = () => {
    clearExpiry();
    logout();
    navigate('/login', {
      replace: true,
      state: { returnTo: location.pathname },
    });
  };

  const isUnauthorized = reason === '401';

  return (
    <div className="session-backdrop">
      <div className="session-card" role="dialog" aria-modal="true" aria-labelledby="session-title">

        {/* Branded green header */}
        <div className="session-card-header">
          {/* Decorative leaf blobs */}
          <div className="session-header-leaf session-header-leaf--tl" aria-hidden="true">
            <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
              <path d="M0 0C30 10 60 40 90 90L0 90Z" fill="rgba(255,255,255,0.06)" />
            </svg>
          </div>
          <div className="session-header-leaf session-header-leaf--br" aria-hidden="true">
            <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
              <path d="M70 70C40 60 10 30 0 0L70 0Z" fill="rgba(255,255,255,0.05)" />
            </svg>
          </div>

          {/* Wordmark */}
          <div className="session-wordmark" aria-label="AgriScanAI">
            <span className="session-wordmark-chip">
              <img className="session-wordmark-leaf" src="/favicon.ico" alt="AgriScanAI Logo" />
            </span>
            <span>AgriScanAI</span>
          </div>

          {/* Central icon badge */}
          <div className="session-icon-glow" aria-hidden="true" />
          <div className="session-icon-badge">
            {isUnauthorized ? (
              /* Shield / access denied icon */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 15.11 16.48 17.78 12 19.93V12H5V6.3L12 3.19V11.99Z" fill="white" />
              </svg>
            ) : (
              /* Hourglass / session timer icon */
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M6 2V8H6.01L6 8.01L10 12L6 16L6.01 16.01H6V22H18V16.01H17.99L18 16L14 12L18 8.01L17.99 8H18V2H6ZM16 16.5V20H8V16.5L12 12.5L16 16.5ZM12 11.5L8 7.5V4H16V7.5L12 11.5Z" fill="white" />
              </svg>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="session-card-body">
          <h2 id="session-title" className="session-title">
            {isUnauthorized ? 'Access Denied' : 'Session Expired'}
          </h2>

          <p className="session-message">
            {isUnauthorized
              ? 'Your credentials are no longer valid. Sign in again to regain access to your dashboard.'
              : 'You\'ve been inactive for a while. For your account\'s security, please sign in again to continue.'}
          </p>

          {/* Status pill */}
          <div className="session-status-pill">
            <span className="session-status-dot" />
            <span>{isUnauthorized ? 'Authentication required' : 'Session timed out'}</span>
          </div>

          <button className="session-signin-btn" onClick={handleSignIn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M11 7L9.6 8.4L12.2 11H2V13H12.2L9.6 15.6L11 17L16 12L11 7ZM20 19H12V21H20C21.1 21 22 20.1 22 19V5C22 3.9 21.1 3 20 3H12V5H20V19Z" fill="currentColor" />
            </svg>
            Sign In Again
          </button>

          <p className="session-return-note">
            Your work is saved &mdash; you'll return here after signing in.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiredModal;
