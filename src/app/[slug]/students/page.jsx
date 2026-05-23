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
import { formatDate, formatCurrency, today, LICENSE_TYPES } from '@/lib/utils';
const STATUS_TYPES = ['En formation', 'Permis obtenu', 'Inactif'];

const FORM_DEFAULT = {
  full_name: '', cin: '', phone: '', address: '', birth_date: '', birth_place: '',
  license_type: 'B', registration_date: today(), status: 'En formation',
  training_start_date: today(), training_duration_days: 30,
  offer_id: '', total_price: 0, interested_licenses: '', reminder_date: '',
  internal_notes: '', ville: '', email: '',
  profile_image: '', cin_document: '',
  autre_ville: '',
};

const STATUS_BADGE = { 'En formation': 'info', 'Permis obtenu': 'success', 'Inactif': 'gray' };

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

  function openAdd() { setEditStudent(null); setForm(FORM_DEFAULT); setShowModal(true); }
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
      autre_ville: student.autre_ville || '',
    });
    setShowModal(true);
  }

  function handleOfferChange(offerId) {
    const offer = offers.find(o => o.id === parseInt(offerId));
    setForm(f => ({
      ...f,
      offer_id: offerId,
      total_price: offer ? offer.price : f.total_price,
      license_type: offer ? offer.license_type : f.license_type
    }));
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
        await api.students.create(data);
        notify.success('Étudiant ajouté avec succès');
        setShowModal(false);
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

  const exportCSV = () => {
    const headers = ['Nom complet', 'CIN', 'Téléphone', 'Permis', 'Statut', 'Prix Total', 'Payé', 'Date Inscription'];
    const rows = students.map(s => [
      `"${s.full_name}"`,
      `"${s.cin || ''}"`,
      `"${s.phone || ''}"`,
      s.license_type,
      s.status,
      s.total_price,
      s.paid_amount || 0,
      formatDate(s.registration_date)
    ]);
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `etudiants_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF('landscape');
    doc.setFontSize(18);
    doc.text('Liste des Étudiants', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} | ${students.length} enregistrements`, 14, 30);
    const tableHeaders = [['Nom complet', 'CIN / Tél', 'Permis', 'Statut', 'Paiement', 'Inscription']];
    const tableRows = students.map(s => [
      s.full_name,
      `${s.cin || ''}\n${s.phone || ''}`,
      s.license_type,
      s.status,
      `${s.paid_amount || 0} / ${s.total_price || 0} MAD`,
      formatDate(s.registration_date)
    ]);
    autoTable(doc, {
      startY: 40,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontSize: 10 },
      styles: { fontSize: 9 }
    });
    doc.save(`etudiants_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <div className="animate-fadeIn space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 shadow-sm border border-primary-50/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-dark-muted mb-0.5">Gestion des étudiants de l'auto-école</p>
              <h1 className="text-[22px] font-extrabold text-dark tracking-tight leading-none">Étudiants</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Button variant="secondary" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
                Exporter
                <svg className="ml-1 w-3 h-3 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </Button>
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-surface-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
                <div className="p-2 space-y-1">
                  <button onClick={exportCSV} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 transition-colors group/item text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-dark">Exporter CSV</p>
                      <p className="text-[10px] text-dark-muted font-medium">Fichier Excel</p>
                    </div>
                  </button>
                  <button onClick={exportPDF} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors group/item text-left">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover/item:bg-red-600 group-hover/item:text-white transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-dark">Exporter PDF</p>
                      <p className="text-[10px] text-dark-muted font-medium">Pour impression</p>
                    </div>
                  </button>
                </div>
                <div className="bg-surface-50 px-4 py-3 border-t border-surface-100">
                  <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">{students.length} enregistrement(s)</p>
                </div>
              </div>
            </div>
            <Button onClick={openAdd} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>} className="shadow-lg shadow-purple-500/20 !bg-primary-600">
              Ajouter un étudiant
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Étudiants', value: stats.total, color: 'primary', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { label: 'En Formation', value: stats.enFormation, color: 'success', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { label: 'Permis Obtenu', value: stats.permisObtenu, color: 'info', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Inactif', value: students.filter(s => s.status === 'Inactif').length, color: 'danger', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
          ].map((s) => (
            <StatCard
              key={s.label}
              title={s.label}
              value={loading ? null : s.value}
              color={s.color}
              loading={loading}
              icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>}
            />
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, CIN ou téléphone..." className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 transition-all" />
          </div>
          
          <div className="relative min-w-[200px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <input type="text" placeholder="---------- ----" className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer" readOnly />
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative min-w-[180px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 appearance-none transition-all cursor-pointer">
              <option value="">Tous les statuts</option>
              {STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>

          <div className="relative min-w-[180px]">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
            <select value={filterLicense} onChange={e => setFilterLicense(e.target.value)} className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 appearance-none transition-all cursor-pointer">
              <option value="">Tous les permis</option>
              {LICENSE_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Table */}
        <Card padding="none">
          {loading ? (
            <div className="p-6 space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-surface-100 rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState.NoStudents onAction={openAdd} />
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full">
                <thead className="bg-surface-50/50 border-b border-surface-200">
                  <tr>
                    {[
                      { label: 'Étudiant', key: 'full_name' },
                      { label: 'Permis / Statut', key: 'status' },
                      { label: 'Inscription', key: 'registration_date' },
                      { label: 'Formation', key: 'duration' },
                      { label: 'Paiement', key: 'payment' },
                      { label: '', key: 'actions' },
                    ].map(h => (
                      <th key={h.label} className="text-left px-4 py-4">
                        <div className="flex items-center gap-2 group cursor-pointer">
                          <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">{h.label}</span>
                          {h.key !== 'actions' && (
                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-2 h-2 text-dark-muted" fill="currentColor" viewBox="0 0 20 20"><path d="M5 15l5-5 5 5H5z" /></svg>
                              <svg className="w-2 h-2 text-dark-muted" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5l5 5 5-5H5z" /></svg>
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {currentStudents.map(s => {
                    const paid = parseFloat(s.paid_amount || 0);
                    const total = parseFloat(s.total_price || 0);
                    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
                    const remainingDays = 27; // Mock for reference consistency
                    
                    return (
                      <tr key={s.id} className="hover:bg-surface-50 transition-all duration-200 group">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-sm border border-white/50 ${getAvatarColor(s.full_name)}`}>
                              {s.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/${slug}/students/${s.id}`} className="text-[14px] font-bold text-dark hover:text-primary-600 transition-colors block truncate">
                                {s.full_name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-dark-muted font-medium">{s.qr_code}</span>
                                <span className="text-dark-muted/30">•</span>
                                <span className="text-[10px] text-dark-muted font-medium">{s.phone || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-50 text-primary-700 text-[10px] font-bold border border-primary-100/50">
                              Permis {s.license_type}
                            </div>
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${s.status === 'En formation' ? 'text-primary-600' : s.status === 'Permis obtenu' ? 'text-emerald-600' : 'text-dark-muted'}`}>
                              <div className={`w-1 h-1 rounded-full ${s.status === 'En formation' ? 'bg-primary-500' : s.status === 'Permis obtenu' ? 'bg-emerald-500' : 'bg-dark-muted'}`} />
                              {s.status}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[13px] font-bold text-dark">{formatDate(s.registration_date)}</div>
                          <div className="text-[10px] text-dark-muted font-medium">Né: {s.birth_date ? formatDate(s.birth_date) : '05/05/2000'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-[12px] font-bold text-emerald-600">{remainingDays}j restants</div>
                          <div className="text-[10px] text-dark-muted font-medium">{s.training_duration_days || 30}j total</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-dark">{formatCurrency(paid)}</span>
                            <span className="text-[10px] font-bold text-dark-muted">{percent}%</span>
                          </div>
                          <div className="w-20 h-1.5 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 transition-all">
                            <Link href={`/${slug}/students/${s.id}`} className="p-1.5 rounded-lg bg-surface-100/50 hover:bg-surface-100 text-dark-muted hover:text-dark transition-all" title="Voir">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </Link>
                            <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg bg-surface-100/50 hover:bg-surface-100 text-dark-muted hover:text-dark transition-all" title="Modifier">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg bg-red-50 text-dark-muted hover:text-red-600 transition-all" title="Supprimer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg>
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

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); }}>
          {/* Modal Content */}
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-8 pb-4">
                <h2 className="text-2xl font-black text-dark tracking-tight">{editStudent ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-surface-100 text-dark-muted transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="modal-body space-y-6 overflow-y-auto max-h-[75vh] p-8">
                  <div className="space-y-6 animate-fadeIn">
                    {/* Full Name */}
                    <div className="w-full">
                      <label className="form-label text-dark font-bold mb-2">Nom Complet *</label>
                      <input {...F('full_name')} required className="form-input" placeholder="Entrez le nom complet" />
                    </div>

                    {/* CIN & Lieu de Naissance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-dark font-bold mb-2">CIN</label>
                        <input {...F('cin')} className="form-input" placeholder="AB123456" />
                      </div>
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Lieu de naissance</label>
                        <input {...F('birth_place')} className="form-input" placeholder="Lieu de naissance" />
                      </div>
                    </div>

                    {/* Date de Naissance & Téléphone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Date de naissance</label>
                        <input type="date" {...F('birth_date')} className="form-input" />
                      </div>
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Téléphone</label>
                        <input {...F('phone')} className="form-input" placeholder="0612345678" />
                      </div>
                    </div>

                    {/* Email & Adresse */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Email</label>
                        <input type="email" {...F('email')} className="form-input" placeholder="email@exemple.com" />
                      </div>
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Adresse</label>
                        <input {...F('address')} className="form-input" placeholder="Adresse complète" />
                      </div>
                    </div>

                    {/* Ville & Autre Ville */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Ville</label>
                        <input {...F('ville')} className="form-input" placeholder="Ex: Agadir, Marrakech..." />
                      </div>
                      <div className="flex items-center gap-3 pb-3">
                        <input 
                          type="checkbox" 
                          id="autre_ville_toggle"
                          className="w-5 h-5 rounded border-surface-300 text-primary-500 focus:ring-primary-500 transition-all cursor-pointer"
                          checked={!!form.autre_ville}
                          onChange={e => setForm(f => ({ ...f, autre_ville: e.target.checked ? 'Oui' : '' }))}
                        />
                        <label htmlFor="autre_ville_toggle" className="text-sm font-bold text-dark cursor-pointer">Autre ville</label>
                      </div>
                    </div>

                    <div className="h-px bg-surface-100 my-2" />

                    {/* Offre & Type de Permis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Offre</label>
                        <select 
                          value={form.offer_id} 
                          onChange={e => handleOfferChange(e.target.value)}
                          className="form-select"
                        >
                          <option value="">-- Sélectionner --</option>
                          {offers.map(o => <option key={o.id} value={o.id}>{o.name} ({formatCurrency(o.price)})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Type de Permis *</label>
                        <select {...F('license_type')} required className="form-select">
                          {LICENSE_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Prix Total & Statut */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Prix Total (MAD)</label>
                        <input type="number" min="0" {...F('total_price')} className="form-input" placeholder="Ex: 3500" />
                      </div>
                      <div>
                        <label className="form-label text-dark font-bold mb-2">Statut</label>
                        <select {...F('status')} className="form-select">
                          {STATUS_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer p-8 pt-0">
                  <Button 
                    variant="secondary" 
                    type="button" 
                    onClick={() => { setShowModal(false); }} 
                    className="!rounded-xl px-8 h-12 border-surface-200"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    loading={saving} 
                    className="!rounded-xl px-10 h-12 shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }}
                  >
                    {!saving && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {editStudent ? 'Modifier l\'étudiant' : 'Créer l\'étudiant'}
                  </Button>
                </div>
              </form>
            </div>
        </div>
      )}
    </>
  );
}
