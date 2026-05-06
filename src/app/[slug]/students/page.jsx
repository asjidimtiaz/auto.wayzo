'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import { formatDate, formatCurrency, today } from '@/lib/utils';

const LICENSE_TYPES = ['B', 'A', 'C', 'D', 'BE', 'CE', 'A1', 'AM'];
const STATUS_TYPES = ['En formation', 'Suspendu', 'Abandonné', 'Permis obtenu'];

const FORM_DEFAULT = {
  full_name: '', cin: '', phone: '', address: '', birth_date: '', birth_place: '',
  license_type: 'B', registration_date: today(), status: 'En formation',
  training_start_date: today(), training_duration_days: 30,
  offer_id: '', total_price: 0, interested_licenses: '', reminder_date: '',
  internal_notes: '', ville: '', autre_ville: '',
};

const STATUS_BADGE = { 'En formation': 'info', 'Permis obtenu': 'success', 'Suspendu': 'warning', 'Abandonné': 'danger' };

export default function StudentsPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [students, setStudents] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLicense, setFilterLicense] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, o] = await Promise.all([api.students.getAll(), api.offers.getAll()]);
      setStudents(Array.isArray(s) ? s : []);
      setOffers(Array.isArray(o) ? o : []);
    } catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterLicense]);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q) || s.qr_code?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchLicense = !filterLicense || s.license_type === filterLicense;
    return matchSearch && matchStatus && matchLicense;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const stats = {
    total: students.length,
    enFormation: students.filter(s => s.status === 'En formation').length,
    permisObtenu: students.filter(s => s.license_obtained).length,
    pendingPayments: students.filter(s => parseFloat(s.total_price || 0) > parseFloat(s.paid_amount || 0)).length,
  };

  function openAdd() { setEditStudent(null); setForm(FORM_DEFAULT); setErrors({}); setShowModal(true); }
  function openEdit(student) {
    setEditStudent(student);
    setForm({
      full_name: student.full_name || '', cin: student.cin || '', phone: student.phone || '',
      address: student.address || '', birth_date: student.birth_date || '', birth_place: student.birth_place || '',
      license_type: student.license_type || 'B',
      registration_date: student.registration_date || today(),
      status: student.status || 'En formation',
      training_start_date: student.training_start_date || student.registration_date || '',
      training_duration_days: student.training_duration_days || 30,
      offer_id: student.offer_id || '', total_price: student.total_price || 0,
      interested_licenses: student.interested_licenses || '', reminder_date: student.reminder_date || '',
      internal_notes: student.internal_notes || '', ville: student.ville || '', autre_ville: student.autre_ville || '',
    });
    setErrors({}); setShowModal(true);
  }

  function F(key) { return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }; }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setErrors({});
    try {
      const data = { ...form, offer_id: form.offer_id || null, total_price: parseFloat(form.total_price) || 0 };
      if (editStudent) {
        await api.students.update(editStudent.id, data);
        notify.success('Étudiant modifié avec succès');
      } else {
        const res = await api.students.create(data);
        notify.success(res?.contractGenerated ? 'Étudiant ajouté et contrat généré avec succès' : 'Étudiant ajouté avec succès');
      }
      setShowModal(false); await load();
    } catch (err) { notify.error(err.message || 'Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  }

  async function handleDelete(student) {
    const confirmed = await confirmDelete(student.full_name);
    if (!confirmed) return;
    try { await api.students.delete(student.id); notify.success('Étudiant supprimé'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">Gestion</p>
          <h1 className="text-2xl font-bold text-dark">Étudiants</h1>
        </div>
        <Button onClick={openAdd} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Ajouter un étudiant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Étudiants', value: stats.total, color: 'text-primary-500', bg: 'bg-primary-50', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
          { label: 'En Formation', value: stats.enFormation, color: 'text-accent-green', bg: 'bg-accent-green/10', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
          { label: 'Permis Obtenus', value: stats.permisObtenu, color: 'text-accent-blue', bg: 'bg-accent-blue/10', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Paiements en attente', value: stats.pendingPayments, color: 'text-accent-yellow', bg: 'bg-accent-yellow/10', icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl shadow-soft p-6 flex items-center justify-between group hover:shadow-card transition-all">
            <div>
              <p className="text-xs font-bold text-dark-muted mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
              <svg className={`w-6 h-6 ${s.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4" padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, CIN, téléphone..." className="form-input pl-9" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select w-auto">
            <option value="">Tous les statuts</option>
            {STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterLicense} onChange={e => setFilterLicense(e.target.value)} className="form-select w-auto">
            <option value="">Tous les permis</option>
            {LICENSE_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState.NoStudents onAction={openAdd} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Étudiant', 'CIN / Tél', 'Permis', 'Statut', 'Paiement', 'Inscription', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-dark-muted uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {currentStudents.map(s => {
                  const paid = parseFloat(s.paid_amount || 0);
                  const total = parseFloat(s.total_price || 0);
                  const balance = total - paid;
                  return (
                    <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/${slug}/students/${s.id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary-500">{s.full_name?.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-dark group-hover:text-primary-500 transition-colors">{s.full_name}</p>
                            <p className="text-xs text-dark-muted">{s.qr_code}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-light">
                        <div>{s.cin || '—'}</div>
                        <div className="text-xs text-dark-muted">{s.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="primary">{s.license_type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[s.status] || 'gray'}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className={balance > 0 ? 'text-accent-red font-medium' : 'text-accent-green font-medium'}>
                          {balance > 0 ? `−${formatCurrency(balance)}` : 'Soldé'}
                        </div>
                        <div className="text-xs text-dark-muted">{formatCurrency(paid)} / {formatCurrency(total)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-muted">{formatDate(s.registration_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-primary-500/10 text-dark-muted hover:text-primary-500 transition-colors" title="Modifier">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-accent-red/10 text-dark-muted hover:text-accent-red transition-colors" title="Supprimer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <Pagination
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark">{editStudent ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="form-label">Nom Complet *</label>
                    <input {...F('full_name')} required className="form-input" placeholder="Prénom et nom" />
                  </div>
                  <div><label className="form-label">CIN</label><input {...F('cin')} className="form-input" placeholder="Numéro CIN" /></div>
                  <div><label className="form-label">Téléphone</label><input {...F('phone')} className="form-input" placeholder="06XXXXXXXX" /></div>
                  <div><label className="form-label">Date de naissance</label><input type="date" {...F('birth_date')} className="form-input" /></div>
                  <div><label className="form-label">Lieu de naissance</label><input {...F('birth_place')} className="form-input" placeholder="Ville de naissance" /></div>
                  <div><label className="form-label">Ville</label><input {...F('ville')} className="form-input" placeholder="Ville" /></div>
                  <div><label className="form-label">Adresse</label><input {...F('address')} className="form-input" placeholder="Adresse complète" /></div>
                  <div>
                    <label className="form-label">Type de permis *</label>
                    <select {...F('license_type')} required className="form-select">
                      {LICENSE_TYPES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Offre</label>
                    <select value={form.offer_id} onChange={e => {
                      const offer = offers.find(o => String(o.id) === e.target.value);
                      setForm(f => ({ ...f, offer_id: e.target.value, total_price: offer ? offer.price : f.total_price }));
                    }} className="form-select">
                      <option value="">Sans offre</option>
                      {offers.map(o => <option key={o.id} value={o.id}>{o.name} — {o.price} MAD</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Prix Total (MAD)</label><input type="number" min="0" {...F('total_price')} className="form-input" /></div>
                  <div><label className="form-label">Date Inscription *</label><input type="date" {...F('registration_date')} required className="form-input" /></div>
                  <div><label className="form-label">Date début formation</label><input type="date" {...F('training_start_date')} className="form-input" /></div>
                  <div><label className="form-label">Durée (jours)</label><input type="number" min="1" {...F('training_duration_days')} className="form-input" /></div>
                  <div>
                    <label className="form-label">Statut</label>
                    <select {...F('status')} className="form-select">
                      {STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="form-label">Date de rappel</label><input type="date" {...F('reminder_date')} className="form-input" /></div>
                  <div className="md:col-span-2">
                    <label className="form-label">Notes internes</label>
                    <textarea {...F('internal_notes')} rows={3} className="form-textarea" placeholder="Notes privées..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving}>{editStudent ? 'Enregistrer' : 'Créer l\'étudiant'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
