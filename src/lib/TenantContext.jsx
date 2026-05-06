'use client';
import { createContext, useContext, useEffect } from 'react';
import { setTenantSlug } from './api';

const TenantContext = createContext(null);

export function TenantProvider({ slug, children }) {
  useEffect(() => {
    setTenantSlug(slug);
    return () => setTenantSlug(null);
  }, [slug]);

  return (
    <TenantContext.Provider value={{ slug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
