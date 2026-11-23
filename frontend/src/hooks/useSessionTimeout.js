import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isSessionExpired, logout, updateActivity, isAuthenticated } from '../utils/auth';
import { useSession } from '../contexts/SessionContext';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

const useSessionTimeout = () => {
  const location = useLocation();
  const { triggerExpiry } = useSession();
  const checkIntervalRef = useRef(null);

  const checkSession = useCallback(() => {
    if (PUBLIC_ROUTES.includes(location.pathname)) return;

    if (isAuthenticated() && isSessionExpired()) {
      logout();
      triggerExpiry('inactivity');
    }
  }, [location.pathname, triggerExpiry]);

  const handleActivity = useCallback(() => {
    if (!PUBLIC_ROUTES.includes(location.pathname)) {
      updateActivity();
    }
  }, [location.pathname]);

  useEffect(() => {
    checkSession();
    checkIntervalRef.current = setInterval(checkSession, 60000);

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [checkSession, handleActivity]);
};

export default useSessionTimeout;
