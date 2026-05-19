'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import api, { setTenantSlug } from '@/lib/api';
import { TenantProvider } from '@/lib/TenantContext';

const NAV = [
  { path: '', label: 'Tableau de bord', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/students', label: 'Étudiants', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: '/attendance', label: 'Scanner QR', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { path: '/presences-absences', label: 'Présences/Absences', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/obtenir-permis', label: 'Permis Obtenus', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { path: '/stages', label: 'Stages & Examens', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/payments', label: 'Paiements', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/invoices', label: 'Factures', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/expenses', label: 'Dépenses', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m-7-14h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z' },
  { path: '/alerts', label: 'Alertes', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { path: '/offers', label: 'Offres', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { path: '/settings', label: 'Paramètres', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

function Sidebar({ slug, onSchoolInfoLoaded, collapsed, setCollapsed }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [alertCounts, setAlertCounts] = useState({ total: 0, danger: 0 });

  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);

  const navItems = NAV.map((item) => ({ ...item, fullPath: `/${slug}${item.path}` }));

  function isActive(item) {
    return item.path === '' ? pathname === `/${slug}` : pathname.startsWith(item.fullPath);
  }

  function getSafeUserDisplayName() {
    const fullName = user?.full_name?.trim();
    if (fullName) return fullName;

    const username = user?.username?.trim();
    const lowerUsername = username?.toLowerCase();
    if (username && !username.includes('@') && lowerUsername !== 'login') return username;

    return null;
  }

  const userDisplayName = getSafeUserDisplayName();
  const userLabel = userDisplayName || schoolName || slug || 'Utilisateur';
  const userInitial = userLabel ? userLabel.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    api.alerts.getCounts().then(setAlertCounts).catch(() => {});
    const interval = setInterval(() => {
      api.alerts.getCounts().then(setAlertCounts).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.settings.get().then(async (settings) => {
      if (settings) {
        const name = settings.school_name || '';
        setSchoolName(name);
        let logo = null;
        if (settings.logo) {
          try {
            logo = await api.files.getBase64(settings.logo);
            if (logo) setLogoUrl(logo);
          } catch {}
        }
        if (onSchoolInfoLoaded) onSchoolInfoLoaded({ name, logoUrl: logo });
      }
    }).catch(() => {});
  }, []);

  return (
    <aside
      className={`flex flex-col transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[72px]' : 'w-64'} shadow-xl z-20 relative bg-primary-600`}
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex flex-col items-center py-4 gap-1">
          {logoUrl ? (
            <div className="w-11 h-11 rounded-2xl bg-white overflow-hidden shadow-lg ring-2 ring-white/20">
              <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center ring-2 ring-white/20">
              <span className="text-white font-bold text-sm">
                {schoolName ? schoolName.substring(0, 2).toUpperCase() : 'AE'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {logoUrl ? (
                <div className="w-12 h-12 rounded-2xl bg-white flex-shrink-0 overflow-hidden shadow-lg ring-2 ring-white/20">
                  <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain p-1" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white leading-tight truncate">
                  {schoolName || 'Auto-École'}
                </h1>
                <p className="text-[11px] text-blue-100 mt-1 font-medium truncate uppercase tracking-wider">Espace de gestion</p>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors flex-shrink-0 mt-0.5"
              title="Réduire"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={`mx-auto bg-white/15 h-px ${collapsed ? 'w-10' : 'w-[calc(100%-32px)]'}`} />

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 px-3.5">
            <button
              onClick={() => setCollapsed(false)}
              className="w-11 h-11 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors mb-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.fullPath}
                  href={item.fullPath}
                  title={item.label}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    active ? 'bg-white text-primary-600 shadow-md' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 px-3">
            {navItems.map((item) => {
              const active = isActive(item);
              return (
                <Link
                  key={item.fullPath}
                  href={item.fullPath}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    active ? 'bg-white text-primary-600 shadow-lg' : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="flex-1">{item.label}</span>
                  {item.path === '/alerts' && alertCounts.total > 0 && (
                    <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold bg-red-500 text-white`}>
                      {alertCounts.total}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/20 p-3">
        {collapsed ? (
          <div className="flex justify-center">
            <button
              onClick={logout}
              className="w-11 h-11 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors flex items-center justify-center"
              title={`Déconnexion - ${userLabel}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm font-bold text-white">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{userLabel}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title={`Déconnexion - ${userLabel}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function MobileHeader({ schoolName, logoUrl, onToggleSidebar }) {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {logoUrl ? (
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 overflow-hidden flex-shrink-0">
              <img src={logoUrl} alt={schoolName} className="w-full h-full object-contain p-0.5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
              <span className="text-white font-bold text-xs">
                {schoolName ? schoolName.substring(0, 2).toUpperCase() : 'AE'}
              </span>
            </div>
          )}
          <h1 className="text-sm font-semibold text-gray-900 truncate">{schoolName || 'Auto-École'}</h1>
        </div>
      </div>
    </div>
  );
}

function MobileOverlay({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
      onClick={onClose}
    />
  );
}

export default function SlugLayout({ children }) {
  const { slug } = useParams();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // Register slug globally so api.js sends x-tenant-slug header
  useEffect(() => {
    setTenantSlug(slug);
    return () => setTenantSlug(null);
  }, [slug]);

  const isLoginPage = pathname === `/${slug}/login`;

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleSchoolInfoLoaded = useCallback((info) => {
    if (info.name) setSchoolName(info.name);
    if (info.logoUrl) setLogoUrl(info.logoUrl);
  }, []);

  if (isLoginPage) return children;

  return (
    <TenantProvider slug={slug}>
      <div className="flex h-screen overflow-hidden" style={{backgroundColor:'#f1f4f9'}}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar slug={slug} onSchoolInfoLoaded={handleSchoolInfoLoaded} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Mobile overlay */}
      <MobileOverlay isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar slug={slug} onSchoolInfoLoaded={handleSchoolInfoLoaded} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ '--sidebar-width': collapsed ? '72px' : '256px' }}>
        <MobileHeader
          schoolName={schoolName}
          logoUrl={logoUrl}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
      <main className="flex-1 overflow-auto" style={{ background: '#f1f4f9' }}>
          <div className="p-5 lg:p-7 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
    </TenantProvider>
  );
}
