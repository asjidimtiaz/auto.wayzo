'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import { formatCurrency } from '@/lib/utils';

const LICENSE_TYPES = ['B', 'A', 'C', 'D', 'BE', 'CE', 'A1', 'AM'];
const FORM_DEFAULT = { name: '', license_type: 'B', price: '', description: '' };

export default function OffersPage() {
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOffer, setEditOffer] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await api.offers.getAll(); setOffers(Array.isArray(data) ? data : []); }
    catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function F(key) { return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }; }
  function openAdd() { setEditOffer(null); setForm(FORM_DEFAULT); setShowModal(true); }
  function openEdit(offer) { setEditOffer(offer); setForm({ name: offer.name, license_type: offer.license_type, price: offer.price, description: offer.description || '' }); setShowModal(true); }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, price: parseFloat(form.price) };
      if (editOffer) { await api.offers.update(editOffer.id, data); notify.success('Offre modifiée'); }
      else { await api.offers.create(data); notify.success('Offre créée'); }
      setShowModal(false); await load();
    } catch { notify.error('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  }

  async function handleDelete(offer) {
    const ok = await confirmDelete(offer.name);
    if (!ok) return;
    try { await api.offers.delete(offer.id); notify.success('Offre supprimée'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Offres de Formation
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Configurez les différentes offres et tarifs de votre auto-école.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAdd} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
            Nouvelle offre
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl shadow-soft animate-pulse" />)}</div>
      ) : offers.length === 0 ? (
        <Card><EmptyState icon={<svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>} title="Aucune offre" description="Créez vos premières offres de formation." onAction={openAdd} actionLabel="Créer une offre" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map(offer => (
            <Card key={offer.id} hover className="animate-fadeIn">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-primary-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                </div>
                <Badge variant="primary">Permis {offer.license_type}</Badge>
              </div>
              <h3 className="font-semibold text-dark mb-1">{offer.name}</h3>
              {offer.description && <p className="text-sm text-dark-muted mb-3">{offer.description}</p>}
              <p className="text-2xl font-bold text-primary-500">{formatCurrency(offer.price)}</p>
              <Card.Footer>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" fullWidth onClick={() => openEdit(offer)}>Modifier</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(offer)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </Button>
                </div>
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">{editOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="md:col-span-2">
                     <label className="form-label">Nom de l'offre *</label>
                     <input {...F('name')} required className="form-input" placeholder="Ex: Formation Permis B Standard" />
                   </div>
                   <div>
                     <label className="form-label">Type de permis *</label>
                     <select {...F('license_type')} required className="form-select">{LICENSE_TYPES.map(l => <option key={l} value={l}>Permis {l}</option>)}</select>
                   </div>
                   <div>
                     <label className="form-label">Prix (MAD) *</label>
                     <input type="number" min="0" step="0.01" {...F('price')} required className="form-input font-bold" placeholder="0.00" />
                   </div>
                </div>
                <div><label className="form-label">Description</label><textarea {...F('description')} rows={3} className="form-textarea resize-none" placeholder="Description de l'offre et avantages inclus..." /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving}>{editOffer ? 'Enregistrer les modifications' : 'Créer l\'offre'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
