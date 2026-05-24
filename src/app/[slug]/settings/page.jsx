'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Car, Plus, Trash2, Coins } from 'lucide-react';

const FORM_DEFAULT = {
  school_name: '', address: '', phone: '', gsm: '', email: '', fax: '', city: '',
  license_number: '', tax_register: '', commercial_register: '', tp: '', cnss: '', ice: '', capital: '',
  web_reference: '', default_training_days: 30, logo: '', vehicle_plates: [],
  license_costs: { A: 0, B: 0, C: 0, D: 0, E: 0 },
};

export default function SettingsPage() {
  const notify = useNotification();
  const [form, setForm] = useState(FORM_DEFAULT);
  const [newPlate, setNewPlate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [logoPreview, setLogoPreview] = useState(null);
  const fileRef = useRef(null);

  const addPlate = () => {
    const trimmed = newPlate.trim().toUpperCase();
    if (!trimmed) return;
    if (form.vehicle_plates?.includes(trimmed)) {
      notify.error('Cette plaque existe déjà');
      return;
    }
    setForm(f => ({
      ...f,
      vehicle_plates: [...(f.vehicle_plates || []), trimmed]
    }));
    setNewPlate('');
  };

  const removePlate = (plateToRemove) => {
    setForm(f => ({
      ...f,
      vehicle_plates: (f.vehicle_plates || []).filter(p => p !== plateToRemove)
    }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.settings.get();
      if (data && !data.error) {
        setForm({
          ...FORM_DEFAULT,
          ...data,
          license_costs: {
            ...FORM_DEFAULT.license_costs,
            ...(data.license_costs || {})
          }
        });
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

  async function handlePasswordUpdate() {
    if (!passwordForm.password || passwordForm.password.length < 6) {
      notify.error('Le mot de passe doit faire au moins 6 caracteres');
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      notify.error('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await api.auth.updateProfile({ password: passwordForm.password });
      if (res?.error) throw new Error(res.error);
      setPasswordForm({ password: '', confirm: '' });
      notify.success('Mot de passe mis a jour');
    } catch (err) {
      notify.error(err.message || 'Erreur lors de la mise a jour');
    } finally {
      setPasswordSaving(false);
    }
  }

  const Section = ({ title, icon, children }) => (
    <Card className="mb-6" title={title} icon={icon}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">{children}</div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Paramètres
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Configurez les informations de votre auto-école.</p>
        </div>
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

        {/* Parc Automobile (Plaques d'immatriculation) */}
        <Card className="mb-6">
          <Card.Header title={
            <div className="flex items-center gap-2">
              <span className="text-orange-500">
                <Car className="w-5 h-5" />
              </span>
              <span>Parc Automobile (Plaques d'immatriculation)</span>
            </div>
          } />
          <div className="space-y-4">
            <p className="text-sm text-dark-muted">
              Enregistrez les plaques d'immatriculation des véhicules (voitures, motos) de votre auto-école pour pouvoir les sélectionner lors de la saisie des dépenses.
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Ex: 12345-A-66"
                value={newPlate}
                onChange={e => setNewPlate(e.target.value)}
                className="form-input font-bold uppercase"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addPlate();
                  }
                }}
              />
              <Button type="button" onClick={addPlate} variant="secondary">
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {(form.vehicle_plates || []).length === 0 ? (
                <div className="col-span-full py-6 text-center text-sm text-dark-muted border border-dashed border-surface-300 rounded-2xl">
                  Aucun véhicule enregistré. Ajoutez-en un ci-dessus.
                </div>
              ) : (
                (form.vehicle_plates || []).map(plate => (
                  <div key={plate} className="flex items-center justify-between p-3 bg-surface-50 border border-surface-200 rounded-xl hover:border-orange-200 transition-all group">
                    <span className="font-bold text-dark-dark">{plate}</span>
                    <button
                      type="button"
                      onClick={() => removePlate(plate)}
                      className="p-1.5 text-danger-500 hover:bg-danger-50 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Frais Fixes de Dossier par Étudiant */}
        <Card className="mb-6">
          <Card.Header title={
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">
                <Coins className="w-5 h-5" />
              </span>
              <span>Frais de Dossier / Dépenses par Étudiant</span>
            </div>
          } />
          <div className="space-y-4">
            <p className="text-sm text-dark-muted">
              Définissez les frais de dossier ou taxes applicables à chaque étudiant en fonction de son type de permis. Ces coûts seront automatiquement déduits du bénéfice net global sur votre tableau de bord (comptabilisés en dépenses variables).
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {[
                { type: 'A', label: 'Permis A (Moto)' },
                { type: 'B', label: 'Permis B (Voiture)' },
                { type: 'C', label: 'Permis C (Camion)' },
                { type: 'D', label: 'Permis D (Bus)' },
                { type: 'E', label: 'Permis E' },
              ].map(({ type, label }) => (
                <div key={type} className="flex flex-col gap-1.5 p-4 bg-surface-50 border border-surface-200 rounded-2xl hover:border-emerald-200 transition-all duration-200">
                  <label className="text-xs font-bold text-dark-dark uppercase tracking-wide">{label}</label>
                  <div className="relative rounded-xl shadow-sm">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={form.license_costs?.[type] || ''}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                        setForm(f => ({
                          ...f,
                          license_costs: {
                            ...(f.license_costs || {}),
                            [type]: val
                          }
                        }));
                      }}
                      className="form-input pr-12 font-bold"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-dark-muted text-xs font-bold">MAD</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Compte & Sécurité */}
        <Card className="mb-6">
          <Card.Header title={<div className="flex items-center gap-2"><span className="text-primary-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span>Compte & Sécurité</div>} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nouveau mot de passe</label>
              <input 
                type="password" 
                placeholder="Laisser vide pour ne pas changer"
                value={passwordForm.password}
                onChange={e => setPasswordForm(f => ({ ...f, password: e.target.value }))}
                className="form-input"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="form-label">Confirmer le mot de passe</label>
              <input
                type="password"
                placeholder="Retapez le mot de passe"
                value={passwordForm.confirm}
                onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                className="form-input"
                autoComplete="new-password"
              />
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <p className="text-xs text-dark-muted">Minimum 6 caracteres. Le nom d'utilisateur reste fixe.</p>
              <Button 
                type="button" 
                variant="secondary"
                loading={passwordSaving}
                onClick={handlePasswordUpdate}
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
