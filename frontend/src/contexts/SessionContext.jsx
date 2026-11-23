import React, { createContext, useContext, useState, useCallback } from 'react';

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [expiredReason, setExpiredReason] = useState(null); // null = active, 'inactivity' | '401' = expired

  const triggerExpiry = useCallback((reason = 'inactivity') => {
    setExpiredReason(reason);
  }, []);

  const clearExpiry = useCallback(() => {
    setExpiredReason(null);
  }, []);

  return (
    <SessionContext.Provider value={{ expiredReason, triggerExpiry, clearExpiry }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
};
