'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error };
  }

  async function logout() {
    const role = user?.role;
    let pathSlug = null;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      pathSlug = parts[1];
      if (pathSlug && pathSlug !== 'login' && pathSlug !== 'super-admin' && pathSlug !== 'api') {
        window.localStorage.setItem('last_tenant_slug', pathSlug);
      }
    }
    const storedSlug = typeof window !== 'undefined' ? window.localStorage.getItem('last_tenant_slug') : null;
    const slug = pathSlug || user?.slug || storedSlug;
    await fetch('/api/auth', { method: 'DELETE' });
    setUser(null);
    if (slug && slug !== 'login' && slug !== 'super-admin' && slug !== 'api') {
      window.location.href = `/${slug}/login`;
    } else if (role === 'super_admin') {
      window.location.href = '/login';
    } else {
      window.location.href = '/login';
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
