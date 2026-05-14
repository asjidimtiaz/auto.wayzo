'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';

export default function TenantLoginPage() {
  const { slug } = useParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [schoolName, setSchoolName] = useState('Auto-École');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Try to fetch school name for a better UX
    if (slug) {
      api.superAdmin.getEcole(slug).then(res => {
        if (res && res.name) setSchoolName(res.name);
      }).catch(() => {});
    }
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login({ username, password });
      if (res.success) {
        if (res.user.role === 'super_admin') {
          router.replace('/super-admin');
        } else if (res.user.slug) {
          router.replace(`/${res.user.slug}`);
        } else {
          setError('Accès non autorisé');
        }
      } else {
        setError(res.error || 'Identifiants invalides');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Left panel - Visual Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 40%, #0a0a0f 100%)' }} />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-blue-400/15 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className={`relative z-10 max-w-lg px-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-400/20 to-sky-400/20 border border-blue-400/20 flex items-center justify-center backdrop-blur-sm shadow-2xl">
              <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Espace Gestion<br />
            <span className="bg-gradient-to-r from-blue-300 to-sky-300 bg-clip-text text-transparent">{schoolName}</span>
          </h2>
          <p className="text-white/40 text-lg leading-relaxed mb-10">
            Plateforme complète pour la gestion de votre auto-école, de vos élèves et de votre comptabilité.
          </p>
          <div className="space-y-4">
            {[
              { icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', text: 'Gestion des dossiers élèves' },
              { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', text: 'Pointage QR et assiduité' },
              { icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', text: 'Suivi financier et paiements' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`} style={{ transitionDelay: `${600 + 150 * i}ms` }}>
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-md">
                  <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <span className="text-white/50 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0d1a] via-[#0a0a0f] to-[#0a0a0f] lg:hidden" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px]" />

        <div className={`relative w-full max-w-[420px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '200ms' }}>
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 border border-blue-500/20 mb-4 shadow-xl">
              <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">{schoolName}</h1>
          </div>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Connexion Administrateur</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bon retour</h1>
          <p className="text-white/35 mb-8">Identifiez-vous pour accéder à votre établissement</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/8 border border-red-500/15 rounded-2xl flex items-start gap-3 animate-shake">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-red-300">{error}</p>
                <p className="text-xs text-red-400/50 mt-0.5">Veuillez vérifier vos accès</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/50 mb-2">Identifiant</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/20 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 focus:bg-white/[0.06] transition-all text-sm text-white placeholder-white/20 outline-none shadow-inner"
                  placeholder="Votre nom d'utilisateur"
                  required autoFocus autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/50 mb-2">Mot de passe</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-white/20 group-focus-within:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 focus:bg-white/[0.06] transition-all text-sm text-white placeholder-white/20 outline-none shadow-inner"
                  placeholder="Votre mot de passe"
                  required autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white/50 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 relative overflow-hidden group mt-4 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authentification...
                </>
              ) : (
                <>
                  Entrer dans l'espace
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/10 text-[10px] mt-12 tracking-widest uppercase font-bold">Auto-Wayzo Management System</p>
        </div>
      </div>
    </div>
  );
}
