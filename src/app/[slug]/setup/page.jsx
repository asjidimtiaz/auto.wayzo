'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AccountSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ full_name: '', password: '', confirm_password: '' });

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError('Lien de creation de compte invalide.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/setup?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lien invalide ou expire');
        setUser(data.user);
        setForm((prev) => ({ ...prev, full_name: data.user.full_name || '' }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim()) {
      setError('Votre nom est requis.');
      return;
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caracteres.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: form.full_name, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSuccess('Compte cree. Redirection vers la connexion...');
      setTimeout(() => router.replace(data.loginUrl), 900);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-[#111827] to-[#0a0a0f]" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11zm0 2c-2.761 0-5 1.79-5 4v1h10v-1c0-2.21-2.239-4-5-4zm7-2v3m0 0v3m0-3h3m-3 0h-3" />
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Creation du compte</p>
          <h1 className="mt-2 text-2xl font-extrabold text-white">
            {user?.auto_ecole_name || 'Auto-ecole'}
          </h1>
          <p className="mt-2 text-sm text-white/50">Choisissez votre nom et votre mot de passe personnel.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-10 animate-pulse rounded-xl bg-white/10" />
            <div className="h-10 animate-pulse rounded-xl bg-white/10" />
            <div className="h-10 animate-pulse rounded-xl bg-white/10" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {user && (
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Identifiant de connexion</label>
                <input value={user.username} disabled className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/60 outline-none" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Votre nom</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/60"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Mot de passe</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/60"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Confirmer le mot de passe</label>
              <input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/60"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
            {success && <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</p>}

            <button
              type="submit"
              disabled={saving || !user || !!success}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? 'Creation...' : 'Creer mon compte'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AccountSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
      </div>
    }>
      <AccountSetupForm />
    </Suspense>
  );
}
