'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import StatCard from '@/components/StatCard';
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
  internal_notes: '', ville: '', email: '',
  profile_image: '', cin_document: '',
};

const STATUS_BADGE = { 'En formation': 'info', 'Permis obtenu': 'success', 'Suspendu': 'warning', 'Abandonné': 'danger' };

const getAvatarColor = (name) => {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-amber-100 text-amber-600',
    'bg-emerald-100 text-emerald-600',
    'bg-rose-100 text-rose-600',
    'bg-indigo-100 text-indigo-600',
    'bg-cyan-100 text-cyan-600',
    'bg-white text-dark shadow-sm',
  ];
  const index = (name || '').length % colors.length;
  return colors[index];
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [createdStudent, setCreatedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('Informations');
  const [uploading, setUploading] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, o] = await Promise.all([api.students.getAll(), api.offers.getAll()]);
      setStudents(Array.isArray(s) ? s : []);
      setOffers(Array.isArray(o) ? o : []);
    } catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [notify]);

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
    permisObtenu: students.filter(s => s.status === 'Permis obtenu').length,
    pendingPayments: students.filter(s => parseFloat(s.total_price || 0) > parseFloat(s.paid_amount || 0)).length,
  };

  function openAdd() { setCreatedStudent(null); setEditStudent(null); setForm(FORM_DEFAULT); setActiveTab('Informations'); setShowModal(true); }
  function openEdit(student) {
    setEditStudent(student);
    setForm({
      full_name: student.full_name || '', cin: student.cin || '', phone: student.phone || '',
      address: student.address || '', birth_date: student.birth_date || '', birth_place: student.birth_place || '',
      license_type: student.license_type || 'B',
      registration_date: student.registration_date || today(),
      status: student.status || 'En formation',
      offer_id: student.offer_id || '', total_price: student.total_price || 0,
      interested_licenses: student.interested_licenses || '', reminder_date: student.reminder_date || '',
      internal_notes: student.internal_notes || '', ville: student.ville || '',
      email: student.email || '',
      profile_image: student.profile_image || '',
      cin_document: student.cin_document || '',
    });
    setActiveTab('Informations'); setShowModal(true);
  }

  function F(key) { return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }; }

  async function handleUpload(file, field) {
    if (!file) return;
    setUploading(field);
    try {
      const res = await api.files.upload(file, 'students');
      if (res.path) {
        setForm(f => ({ ...f, [field]: res.path }));
        notify.success('Fichier téléchargé');
      }
    } catch {
      notify.error('Erreur lors du téléchargement');
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, offer_id: form.offer_id || null, total_price: parseFloat(form.total_price) || 0 };
      if (editStudent) {
        await api.students.update(editStudent.id, data);
        notify.success('Étudiant modifié avec succès');
        setShowModal(false); 
      } else {
        const res = await api.students.create(data);
        const newStudent = await api.students.getById(res.id);
        setCreatedStudent(newStudent);
        notify.success('Étudiant ajouté avec succès');
        setActiveTab('Contrat');
      }
      await load();
    } catch (err) { notify.error(err.message || 'Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  }

  async function handleGenerateContract(studentId) {
    setSaving(true);
    try {
      const res = await api.contracts.generate(studentId);
      if (res.success) {
        notify.success('Contrat généré');
        window.open(res.path, '_blank');
      }
    } catch {
      notify.error('Erreur lors de la génération du contrat');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student) {
    const confirmed = await confirmDelete(student.full_name);
    if (!confirmed) return;
    try { await api.students.delete(student.id); notify.success('Étudiant supprimé'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  return (
    <>
      <div className="animate-fadeIn p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
              Étudiants
            </h1>
            <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Gérez et suivez les dossiers d'inscription de vos étudiants.</p>
          </div>
          <Button onClick={openAdd} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>} className="shadow-lg shadow-blue-500/20">
            Ajouter un étudiant
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Étudiants', value: stats.total, color: 'primary', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'En Formation', value: stats.enFormation, color: 'success', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { label: 'Permis Obtenus', value: stats.permisObtenu, color: 'info', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'En Attente', value: stats.pendingPayments, color: 'warning', icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z' },
          ].map((s) => (
            <StatCard
              key={s.label}
              title={s.label}
              value={loading ? '—' : s.value}
              color={s.color}
              loading={loading}
              icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>}
              onClick={() => {}}
            />
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
                    {[
                      { label: 'Étudiant', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                      { label: 'CIN / Tél', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
                      { label: 'Permis', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622' },
                      { label: 'Statut', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                      { label: 'Paiement', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2' },
                      { label: 'Inscription', icon: 'M8 7V3m8 4V3m-9 8h10' },
                      { label: '', icon: '' },
                    ].map(h => (
                      <th key={h.label} className="text-left px-4 py-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-dark-muted uppercase tracking-widest">
                          {h.icon && <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={h.icon} /></svg>}
                          {h.label}
                        </div>
                      </th>
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
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs ${getAvatarColor(s.full_name)}`}>
                              {s.full_name?.substring(0, 2).toUpperCase()}
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
                            <Link href={`/${slug}/students/${s.id}`} className="p-1.5 rounded-lg hover:bg-accent-blue/10 text-dark-muted hover:text-accent-blue transition-colors" title="Voir">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
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

              <div className="p-4 border-t border-surface-100">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setCreatedStudent(null); }}>
          {/* Modal Content */}
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-8 pb-4">
                <h2 className="text-2xl font-black text-dark tracking-tight">{editStudent ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-surface-100 text-dark-muted transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="flex items-center gap-1 p-1 bg-surface-100 mx-6 mt-4 rounded-2xl">
                  {[
                    { id: 'Informations', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
                    { id: 'Contrat', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                        activeTab === tab.id 
                          ? 'bg-white text-primary-500 shadow-sm' 
                          : 'text-dark-muted hover:text-dark hover:bg-white/50'
                      }`}
                    >
                      {tab.icon}
                      {tab.id}
                    </button>
                  ))}
                </div>

                <div className="modal-body space-y-4 overflow-y-auto max-h-[60vh] p-8">
                  {activeTab === 'Informations' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-fadeIn">
                      {/* Section: Formation */}
                      <div className="md:col-span-2 flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-dark/50">Détails de l'Inscription</h4>
                      </div>

                      <div className="md:col-span-2">
                        <label className="form-label">Nom Complet *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <input {...F('full_name')} required className="form-input !pl-11" placeholder="Prénom et Nom" />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Type de permis *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </div>
                          <select {...F('license_type')} required className="form-select !pl-11">
                            {LICENSE_TYPES.map(l => <option key={l} value={l}>Permis {l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Date d'inscription *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <input type="date" {...F('registration_date')} required className="form-input !pl-11" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Prix Total (MAD) *</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1m-7-14h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
                          </div>
                          <input type="number" min="0" {...F('total_price')} required className="form-input !pl-11" placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Statut</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <select {...F('status')} className="form-select !pl-11">
                            {STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Section: Personal Info */}
                      <div className="md:col-span-2 flex items-center gap-2 mt-4 mb-2">
                        <div className="w-1 h-4 bg-primary-500 rounded-full"></div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-dark/50">Détails Personnels</h4>
                      </div>

                      <div>
                        <label className="form-label">Numéro CIN</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                          </div>
                          <input {...F('cin')} className="form-input !pl-11" placeholder="Ex: AB123456" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Téléphone</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </div>
                          <input {...F('phone')} className="form-input !pl-11" placeholder="06XXXXXXXX" />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Date de naissance</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <input type="date" {...F('birth_date')} className="form-input !pl-11" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Lieu de naissance</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <input {...F('birth_place')} className="form-input !pl-11" placeholder="Ville" />
                        </div>
                      </div>

                      <div>
                        <label className="form-label">Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <input type="email" {...F('email')} className="form-input !pl-11" placeholder="email@exemple.com" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Ville de résidence</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" /></svg>
                          </div>
                          <input {...F('ville')} className="form-input !pl-11" placeholder="Ville" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="form-label">Adresse complète</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <input {...F('address')} className="form-input !pl-11" placeholder="Adresse complète" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'Contrat' && (
                    <div className="flex flex-col items-center justify-center py-6 animate-fadeIn text-center">
                      {!(createdStudent || editStudent) ? (
                        <div className="space-y-6">
                          <div className="w-20 h-20 bg-primary-50 rounded-[2rem] flex items-center justify-center text-primary-500 mx-auto shadow-inner">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-dark">Prêt pour la création ?</h3>
                            <p className="text-dark-muted text-sm mt-1 max-w-[280px] mx-auto">
                              Vérifiez les informations saisies avant de confirmer l'inscription de l'étudiant.
                            </p>
                          </div>
                          <Button 
                            type="submit" 
                            loading={saving} 
                            className="!rounded-2xl h-14 px-12 shadow-primary text-base"
                          >
                            Créer l'étudiant
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6 animate-scaleUp">
                          <div className="w-20 h-20 bg-accent-green/10 rounded-[2rem] flex items-center justify-center text-accent-green mx-auto shadow-inner">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-black text-dark">{createdStudent ? 'Étudiant Créé !' : 'Informations Étudiant'}</h3>
                            <p className="text-dark-muted font-medium mt-1">
                              Étudiant : <span className="text-primary-600 font-bold">{(createdStudent || editStudent).full_name}</span>
                            </p>
                          </div>

                          <div className="bg-surface-50 rounded-[2.5rem] p-6 border border-surface-200 shadow-inner w-full max-w-[260px]">
                            <div className="w-32 h-32 bg-white mx-auto rounded-2xl flex items-center justify-center shadow-soft mb-3 overflow-hidden p-2">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${(createdStudent || editStudent).qr_code}`} 
                                alt="QR Code" 
                                className="w-full h-full mix-blend-multiply"
                              />
                            </div>
                            <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">{(createdStudent || editStudent).qr_code}</p>
                          </div>

                          <div className="flex flex-col gap-3 w-full">
                            <Button 
                              className="w-full !rounded-2xl h-12 shadow-primary hover:scale-[1.02] transition-transform"
                              onClick={() => handleGenerateContract((createdStudent || editStudent).id)}
                              loading={saving}
                              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            >
                              Générer le Contrat
                            </Button>
                            
                            {editStudent && (
                              <Button 
                                variant="secondary"
                                className="w-full !rounded-2xl h-12"
                                type="submit"
                                loading={saving}
                              >
                                Mettre à jour & Fermer
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="modal-footer p-8 pt-0">
                  <Button variant="secondary" type="button" onClick={() => { setShowModal(false); setCreatedStudent(null); }} className="!rounded-2xl">Annuler</Button>
                  {activeTab !== 'Contrat' && (
                    <Button type="button" onClick={() => setActiveTab('Contrat')} className="!rounded-2xl px-12">Suivant</Button>
                  )}
                </div>
              </form>
            </div>
        </div>
      )}
    </>
  );
}
