'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse max-w-3xl mx-auto">
      <div className="h-4 w-40 bg-gray-200 rounded mb-6" />
      <div className="h-7 w-56 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-72 bg-gray-200 rounded mb-8" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-soft p-6 mb-6">
          <div className="h-5 w-48 bg-gray-200 rounded mb-6" />
          <div className="space-y-4">
            <div className="h-10 w-full bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EditEcolePage() {
  const { id } = useParams();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '', slug: '', active: true, school_name: '', address: '', phone: '',
    gsm: '', email: '', fax: '', city: '', tax_register: '', commercial_register: '',
    tp: '', cnss: '', ice: '', capital: '', web_reference: '', logo: '',
  });

  // Logo state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Admins state
  const [admins, setAdmins] = useState([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '' });
  const [latestInvite, setLatestInvite] = useState(null);
  const [adminErrors, setAdminErrors] = useState({});
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [ecoleRes, adminsRes] = await Promise.all([
          fetch(`/api/super-admin/ecoles?id=${id}`),
          fetch(`/api/super-admin/admins?autoEcoleId=${id}`),
        ]);
        if (!ecoleRes.ok) throw new Error("Auto-ecole introuvable");
        const ecole = await ecoleRes.json();
        const settings = ecole.settings || {};
        setForm({
          name: ecole.name || '',
          slug: ecole.slug || '',
          active: ecole.active !== false,
          school_name: settings.school_name || '',
          address: settings.address || '',
          phone: settings.phone || '',
          gsm: settings.gsm || '',
          email: settings.email || '',
          fax: settings.fax || '',
          city: settings.city || '',
          tax_register: settings.tax_register || '',
          commercial_register: settings.commercial_register || '',
          tp: settings.tp || '',
          cnss: settings.cnss || '',
          ice: settings.ice || '',
          capital: settings.capital || '',
          web_reference: settings.web_reference || '',
          logo: settings.logo || '',
        });
        if (settings.logo) setLogoPreview(settings.logo);
        if (adminsRes.ok) setAdmins(await adminsRes.json());
      } catch (e) {
        setErrorMsg(e.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.slug.trim()) errs.slug = 'Le slug est requis';
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.slug)) errs.slug = 'Slug invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      let logoPath = form.logo;
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        fd.append('subfolder', 'logos');
        const uploadRes = await fetch('/api/files', { method: 'POST', body: fd, credentials: 'include' });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData.filePath) logoPath = uploadData.filePath;
        else throw new Error(uploadData.error || 'Erreur lors du téléchargement du logo');
      }

      const res = await fetch(`/api/super-admin/ecoles?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          active: form.active,
          settings: {
            school_name: form.school_name || form.name,
            address: form.address, phone: form.phone, gsm: form.gsm,
            email: form.email, fax: form.fax, city: form.city,
            tax_register: form.tax_register, commercial_register: form.commercial_register,
            tp: form.tp, cnss: form.cnss, ice: form.ice, capital: form.capital,
            web_reference: form.web_reference, logo: logoPath,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la mise a jour');
      }
      notify.success('Auto-école mise à jour avec succès');
      setLogoFile(null);
      if (logoPath) updateField('logo', logoPath);
    } catch (e) {
      notify.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify.error('Veuillez selectionner une image'); return; }
    if (file.size > 2 * 1024 * 1024) { notify.error("L'image ne doit pas depasser 2 Mo"); return; }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validateNewAdmin() {
    const errs = {};
    if (!newAdmin.username.trim()) errs.username = "Le nom d'utilisateur est requis";
    setAdminErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleAddAdmin(e) {
    e.preventDefault();
    if (!validateNewAdmin()) return;
    setAddingAdmin(true);
    try {
      const res = await fetch('/api/super-admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoEcoleId: Number(id), username: newAdmin.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }
      notify.success('Administrateur ajoute. Lien de creation genere.');
      setLatestInvite({ username: newAdmin.username, setupUrl: data.setupUrl });
      setNewAdmin({ username: '' });
      setAdminErrors({});
      setShowAddAdmin(false);
      const adminsRes = await fetch(`/api/super-admin/admins?autoEcoleId=${id}`);
      if (adminsRes.ok) setAdmins(await adminsRes.json());
    } catch (e) {
      notify.error(e.message);
    } finally {
      setAddingAdmin(false);
    }
  }


  async function handleDeleteAdmin(admin) {
    const confirmed = await confirmDelete(admin.username);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/super-admin/admins?id=${admin.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      notify.success('Administrateur supprime');
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (e) {
      notify.error(e.message);
    }
  }

  const inputClass = (field) =>
    `w-full h-10 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-primary-500/20 transition-colors ${errors[field] ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-primary-500'}`;

  if (loading) return <LoadingSkeleton />;

  if (errorMsg) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/super-admin/ecoles" className="inline-flex items-center gap-2 text-sm text-dark-muted hover:text-gray-700 mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Retour
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">
      <Link href="/super-admin/ecoles" className="inline-flex items-center gap-2 text-sm text-dark-muted hover:text-gray-700 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Retour aux auto-ecoles
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Modifier l'auto-ecole</h1>
          <p className="text-dark-muted mt-1">{form.name}</p>
        </div>
        <Link href={`/${form.slug}`} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors border border-primary-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          Tableau de bord
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identification */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Identification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} className={inputClass('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
              <input type="text" value={form.slug} onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className={`${inputClass('slug')} font-mono`} />
              {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom affiche</label>
              <input type="text" value={form.school_name} onChange={(e) => updateField('school_name', e.target.value)} className={inputClass('school_name')} placeholder="Nom sur les documents" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} className={inputClass('city')} />
            </div>
            <div className="sm:col-span-2 flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Statut actif</label>
                <p className="text-xs text-gray-400">Desactiver empeche l'acces a l'espace</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.active}
                onClick={() => updateField('active', !form.active)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${form.active ? 'bg-primary-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Logo de l'école
          </h2>
          <div className="flex flex-col items-center gap-4">
            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden transition-all ${logoPreview ? 'bg-gray-50 border-2 border-primary-200 shadow-lg' : 'bg-gray-100 border-2 border-dashed border-gray-300'}`}>
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs">Aucun logo</span>
                </div>
              )}
            </div>
            {logoPreview && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-xl border border-purple-100 w-full">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <div className="w-full h-full flex items-center justify-center p-0.5">
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-lg bg-white" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-purple-700 truncate">{form.school_name || form.name || 'Auto-École'}</p>
                  <p className="text-[10px] text-purple-400">Aperçu dans la barre latérale</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 active:scale-95 transition-all cursor-pointer border border-primary-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {logoPreview ? 'Changer' : 'Choisir un logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); updateField('logo', ''); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all border border-red-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Supprimer
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400">PNG, JPG ou SVG · Max 2 Mo</p>
          </div>
        </div>

        {/* Coordonnees */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            Coordonnees
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label><input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} className={inputClass('address')} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label><input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className={inputClass('phone')} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">GSM</label><input type="text" value={form.gsm} onChange={(e) => updateField('gsm', e.target.value)} className={inputClass('gsm')} placeholder="Ex: 06 55 80 76 29" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fax</label><input type="text" value={form.fax} onChange={(e) => updateField('fax', e.target.value)} className={inputClass('fax')} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={inputClass('email')} /></div>
          </div>
        </div>

        {/* Informations legales */}
        <div className="bg-white rounded-2xl shadow-soft p-6">
          <h2 className="text-base font-semibold text-dark mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Informations legales
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Capital (SARL)</label><input type="text" value={form.capital} onChange={(e) => updateField('capital', e.target.value)} className={inputClass('capital')} placeholder="Ex: 10.000,00 Dhs" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">RC (Registre de commerce)</label><input type="text" value={form.commercial_register} onChange={(e) => updateField('commercial_register', e.target.value)} className={inputClass('commercial_register')} placeholder="Ex: 100775" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">T.P (Taxe professionnelle)</label><input type="text" value={form.tp} onChange={(e) => updateField('tp', e.target.value)} className={inputClass('tp')} placeholder="Ex: 47940305" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">I.F (Identifiant fiscal)</label><input type="text" value={form.tax_register} onChange={(e) => updateField('tax_register', e.target.value)} className={inputClass('tax_register')} placeholder="Ex: 39405279" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">CNSS</label><input type="text" value={form.cnss} onChange={(e) => updateField('cnss', e.target.value)} className={inputClass('cnss')} placeholder="Ex: 1817556" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ICE</label><input type="text" value={form.ice} onChange={(e) => updateField('ice', e.target.value)} className={inputClass('ice')} placeholder="Ex: 002347009000081" /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Reference web</label><input type="text" value={form.web_reference} onChange={(e) => updateField('web_reference', e.target.value)} className={inputClass('web_reference')} /></div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Enregistrement...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>

      {/* Admins section */}
      <div className="bg-white rounded-2xl shadow-soft p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-dark flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Administrateurs
          </h2>
          <button
            onClick={() => { setShowAddAdmin(!showAddAdmin); setNewAdmin({ username: '' }); setAdminErrors({}); }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Ajouter un admin
          </button>
        </div>

        {showAddAdmin && (
          <form onSubmit={handleAddAdmin} className="mb-6 p-4 bg-gray-50 rounded-lg shadow-soft">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Nouvel administrateur</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-muted mb-1">Nom d'utilisateur <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newAdmin.username}
                  onChange={(e) => { setNewAdmin((p) => ({ ...p, username: e.target.value })); if (adminErrors.username) setAdminErrors((p) => ({ ...p, username: '' })); }}
                  placeholder="Nom d'utilisateur"
                  className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-primary-500/20 ${adminErrors.username ? 'border-red-300' : 'border-gray-300 focus:border-primary-500'}`}
                />
                {adminErrors.username && <p className="mt-1 text-xs text-red-600">{adminErrors.username}</p>}
                <p className="mt-2 text-[10px] text-gray-400 italic">Un lien sera genere pour que l'utilisateur choisisse son nom et son mot de passe.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => { setShowAddAdmin(false); setNewAdmin({ username: '' }); setAdminErrors({}); }} className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={addingAdmin} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {addingAdmin ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        )}

        {latestInvite && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900">Lien de creation pour {latestInvite.username}</p>
                <p className="mt-1 text-xs text-blue-700 break-all">{latestInvite.setupUrl}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard?.writeText(latestInvite.setupUrl);
                  notify.success('Lien copie');
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-white rounded-lg border border-blue-200 hover:bg-blue-50"
              >
                Copier
              </button>
            </div>
          </div>
        )}

        {admins.length > 0 ? (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-dark">{admin.full_name || admin.username}</p>
                    <p className="text-xs text-gray-400">{admin.username} · Administrateur</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                    admin.setup_status === 'pending'
                      ? 'bg-amber-50 text-amber-700'
                      : admin.setup_status === 'expired'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {admin.setup_status === 'pending' ? 'En attente' : admin.setup_status === 'expired' ? 'Expire' : 'Actif'}
                  </span>
                  <button onClick={() => handleDeleteAdmin(admin)} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-50" title="Supprimer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <p className="text-sm text-dark-muted">Aucun administrateur configure</p>
            <button onClick={() => setShowAddAdmin(true)} className="mt-3 text-sm text-primary-500 hover:text-primary-700 font-medium">
              Ajouter un administrateur
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
