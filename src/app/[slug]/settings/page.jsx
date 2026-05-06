'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import Card from '@/components/Card';
import Button from '@/components/Button';

const FORM_DEFAULT = {
  school_name: '', address: '', phone: '', gsm: '', email: '', fax: '', city: '',
  license_number: '', tax_register: '', commercial_register: '', tp: '', cnss: '', ice: '', capital: '',
  web_reference: '', default_training_days: 30, logo: '',
};

export default function SettingsPage() {
  const notify = useNotification();
  const [form, setForm] = useState(FORM_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.settings.get();
      if (data && !data.error) {
        setForm({ ...FORM_DEFAULT, ...data });
        if (data.logo) {
          const b64 = await api.files.getBase64(data.logo).catch(() => null);
          if (b64) setLogoPreview(b64);
        }
      }
    } catch { notify.error('Erreur de chargement des paramètres'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function F(key) { return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }; }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
    try {
      const res = await api.files.upload(file, 'logos');
      if (res?.filePath) setForm(f => ({ ...f, logo: res.filePath }));
    } catch { notify.error('Erreur lors du téléchargement du logo'); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.settings.update(form);
      notify.success('Paramètres enregistrés avec succès');
    } catch { notify.error('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  }

  const Section = ({ title, icon, children }) => (
    <Card className="mb-6">
      <Card.Header title={<div className="flex items-center gap-2"><span className="text-primary-500">{icon}</span>{title}</div>} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </Card>
  );

  const Field = ({ label, k, type = 'text', full }) => (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="form-label">{label}</label>
      <input type={type} {...F(k)} className="form-input" />
    </div>
  );

  if (loading) return (
    <div className="animate-fadeIn">
      <div className="mb-6 h-8 bg-surface-200 rounded w-40 animate-pulse" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl shadow-soft mb-6 animate-pulse" />)}
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">Configuration</p>
        <h1 className="text-2xl font-bold text-dark">Paramètres de l'École</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Logo */}
        <Card className="mb-6">
          <Card.Header title="Logo de l'École" />
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-surface-100 border-2 border-dashed border-surface-300 flex items-center justify-center overflow-hidden">
              {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" /> : <svg className="w-8 h-8 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            </div>
            <div>
              <p className="text-sm text-dark-muted mb-3">Téléchargez votre logo (PNG, JPG, SVG)</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                Choisir un fichier
              </Button>
            </div>
          </div>
        </Card>

        {/* General info */}
        <Section title="Informations Générales" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}>
          <Field label="Nom de l'École *" k="school_name" full />
          <Field label="Adresse" k="address" full />
          <Field label="Ville" k="city" />
          <Field label="Téléphone" k="phone" />
          <Field label="GSM" k="gsm" />
          <Field label="Email" k="email" type="email" />
          <Field label="Fax" k="fax" />
          <Field label="Site Web / Référence" k="web_reference" />
        </Section>

        {/* Admin / Legal */}
        <Section title="Informations Légales" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
          <Field label="N° Agrément / Licence" k="license_number" />
          <Field label="Registre de Commerce" k="commercial_register" />
          <Field label="N° Patente (TP)" k="tp" />
          <Field label="CNSS" k="cnss" />
          <Field label="ICE" k="ice" />
          <Field label="IF / Registre Fiscal" k="tax_register" />
          <Field label="Capital" k="capital" />
        </Section>

        {/* Defaults */}
        <Card className="mb-6">
          <Card.Header title="Paramètres de Formation" />
          <div className="max-w-xs">
            <label className="form-label">Durée par défaut (jours)</label>
            <input type="number" min="1" {...F('default_training_days')} className="form-input" />
          </div>
        </Card>

        {/* Compte & Sécurité */}
        <Card className="mb-6">
          <Card.Header title={<div className="flex items-center gap-2"><span className="text-primary-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span>Compte & Sécurité</div>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Nouveau mot de passe</label>
              <input 
                type="password" 
                placeholder="Laisser vide pour ne pas changer"
                className="form-input"
                onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
              />
              <p className="mt-2 text-xs text-dark-muted">Min. 6 caractères pour plus de sécurité.</p>
            </div>
            <div className="flex items-end pb-1">
              <Button 
                type="button" 
                variant="secondary"
                onClick={async () => {
                  if (!form.new_password || form.new_password.length < 6) {
                    notify.error('Le mot de passe doit faire au moins 6 caractères');
                    return;
                  }
                  try {
                    await api.auth.updateProfile({ password: form.new_password });
                    notify.success('Mot de passe mis à jour');
                  } catch {
                    notify.error('Erreur lors de la mise à jour');
                  }
                }}
              >
                Mettre à jour le mot de passe
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">Enregistrer les paramètres</Button>
        </div>
      </form>
    </div>
  );
}

