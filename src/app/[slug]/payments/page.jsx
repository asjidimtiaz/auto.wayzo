'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Pagination from '@/components/Pagination';
import { formatDate, formatCurrency, today } from '@/lib/utils';

const PAYMENT_METHODS = ['Cash', 'Transfer', 'Cheque', 'TPE'];
const METHOD_LABEL = { Cash: 'Espèces', Transfer: 'Virement', Cheque: 'Chèque', TPE: 'TPE' };

export default function PaymentsPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', amount: '', payment_method: 'Cash', payment_date: today(), notes: '' });
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.payments.getAll(), api.students.getAll()]);
      setPayments(Array.isArray(p) ? p : []);
      setStudents(Array.isArray(s) ? s : []);
    } catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMethod]);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.full_name?.toLowerCase().includes(q)) && (!filterMethod || p.payment_method === filterMethod);
  });

  const methodStats = useMemo(() => {
    const stats = { Total: 0, Cash: 0, Transfer: 0, Cheque: 0, TPE: 0 };
    filtered.forEach(p => {
      const amt = parseFloat(p.amount || 0);
      stats.Total += amt;
      if (stats[p.payment_method] !== undefined) stats[p.payment_method] += amt;
    });
    return stats;
  }, [filtered]);

  const unpaidStudents = useMemo(() => {
    return students
      .map(s => ({
        ...s,
        total: parseFloat(s.total_price || 0),
        paid: parseFloat(s.paid_amount || 0),
        remaining: parseFloat(s.total_price || 0) - parseFloat(s.paid_amount || 0)
      }))
      .filter(s => s.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);
  }, [students]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = filtered.slice(indexOfFirstItem, indexOfLastItem);

  function F(key) { return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }; }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.payments.create({ ...form, student_id: parseInt(form.student_id), amount: parseFloat(form.amount) });
      notify.success('Paiement enregistré avec succès');
      setShowModal(false);
      setForm({ student_id: '', amount: '', payment_method: 'Cash', payment_date: today(), notes: '' });
      await load();
    } catch { notify.error('Erreur lors de l\'enregistrement'); }
    finally { setSaving(false); }
  }

  async function handleDelete(payment) {
    const ok = await confirmDelete(`le paiement de ${formatCurrency(payment.amount)}`);
    if (!ok) return;
    try { await api.payments.delete(payment.id); notify.success('Paiement supprimé'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  const exportCSV = () => {
    const headers = ['Étudiant', 'Montant', 'Mode de Paiement', 'Date', 'Notes'];
    const rows = filtered.map(p => [
      `"${p.full_name}"`,
      p.amount,
      `"${METHOD_LABEL[p.payment_method] || p.payment_method}"`,
      formatDate(p.payment_date),
      `"${p.notes || ''}"`
    ]);
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `paiements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Liste des Paiements', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} | ${filtered.length} enregistrements`, 14, 30);
    
    const tableHeaders = [['Étudiant', 'Montant', 'Mode', 'Date', 'Notes']];
    const tableRows = filtered.map(p => [
      p.full_name,
      `${p.amount} MAD`,
      METHOD_LABEL[p.payment_method] || p.payment_method,
      formatDate(p.payment_date),
      p.notes || ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { fontStyle: 'bold', halign: 'right' },
      }
    });

    doc.save(`paiements_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Consolidated Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-xl font-black text-dark tracking-tight leading-none">Paiements</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Button variant="secondary" size="sm" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>
              Exporter
            </Button>
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-surface-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
              <div className="p-1.5 space-y-0.5">
                <button onClick={exportCSV} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 transition-colors group/item text-left">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </div>
                  <p className="text-xs font-bold text-dark">CSV</p>
                </button>
                <button onClick={exportPDF} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 transition-colors group/item text-left">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover/item:bg-red-600 group-hover/item:text-white transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-xs font-bold text-dark">PDF</p>
                </button>
              </div>
            </div>
          </div>
          <Link href={`/${slug}/calculateur#payment-plan`}>
            <Button variant="secondary" size="sm" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}>
              Plan
            </Button>
          </Link>
          <Button onClick={() => setShowModal(true)} size="sm" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>} className="shadow-lg shadow-emerald-500/10 !bg-emerald-600">
            Nouveau Paiement
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compressed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total" value={loading ? null : formatCurrency(methodStats.Total)} loading={loading} color="primary" gradient size="sm" />
        <StatCard title="Espèces" value={loading ? null : formatCurrency(methodStats.Cash)} loading={loading} color="success" size="sm" icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <StatCard title="Virements" value={loading ? null : formatCurrency(methodStats.Transfer)} loading={loading} color="info" size="sm" icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>} />
        <StatCard title="Chèques" value={loading ? null : formatCurrency(methodStats.Cheque)} loading={loading} color="primary" size="sm" icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <StatCard title="TPE" value={loading ? null : formatCurrency(methodStats.TPE)} loading={loading} color="warning" size="sm" icon={<svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>} />
      </div>

      {/* Solde Impayé section - Extreme Compression */}
      <div className="space-y-1 bg-white border border-surface-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-2 bg-surface-50/50 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <span className="text-[10px] font-black text-dark uppercase tracking-tight">Solde Impayé</span>
            <span className="text-[10px] text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded-md">{unpaidStudents.length}</span>
          </div>
          <Link href={`/${slug}/students`} className="text-[10px] font-black text-primary-600 hover:underline uppercase tracking-wider">Tout voir</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-2">
          {unpaidStudents.slice(0, 8).map((s) => {
            const progress = s.total > 0 ? (s.paid / s.total) * 100 : 0;
            return (
              <Link href={`/${slug}/students/${s.id}`} key={s.id} className="group flex items-center justify-between p-2 rounded-xl hover:bg-surface-50 border border-transparent hover:border-surface-100 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center text-dark font-black text-[10px] group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors shrink-0">
                    {s.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-dark truncate leading-none mb-1">{s.full_name}</p>
                    <div className="w-24 h-1 bg-surface-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <p className="text-[11px] font-black text-red-600 leading-none">-{formatCurrency(s.remaining)}</p>
                  <p className="text-[8px] font-bold text-dark-muted uppercase mt-0.5">{Math.round(progress)}%</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Filters & Search - Compressed */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-surface-200">
        <div className="flex-1 min-w-[180px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-8 pr-3 py-1.5 bg-surface-50 border-none rounded-lg text-xs focus:ring-1 focus:ring-primary-500/20 outline-none transition-all font-medium" />
        </div>
        <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="bg-surface-50 border-none px-3 py-1.5 rounded-lg text-xs font-bold text-dark-muted focus:ring-1 focus:ring-primary-500/20 outline-none cursor-pointer uppercase tracking-wider">
          <option value="">Tous les modes</option>
          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState.NoPayments onAction={() => setShowModal(true)} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Étudiant', 'Montant', 'Mode de paiement', 'Date', 'Facture', 'Notes', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-dark-muted uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {currentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${slug}/students/${p.student_id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-full bg-accent-green/10 flex items-center justify-center">
                          <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <span className="text-sm font-medium text-dark group-hover:text-primary-500 transition-colors">{p.full_name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-accent-green">{formatCurrency(p.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{METHOD_LABEL[p.payment_method] || p.payment_method}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-muted">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black text-primary-600 uppercase bg-primary-50 px-2 py-1 rounded-md border border-primary-100">{p.reference || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-muted">{p.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-accent-red/10 text-dark-muted hover:text-accent-red transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
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
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Nouveau paiement</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="md:col-span-2">
                     <label className="form-label">Étudiant *</label>
                     <select {...F('student_id')} required className="form-select">
                        <option value="">Sélectionner un étudiant</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                     </select>
                   </div>
                   {form.student_id && (() => {
                     const s = students.find(x => x.id === parseInt(form.student_id));
                     if (!s) return null;
                     const remaining = parseFloat(s.total_price || 0) - parseFloat(s.paid_amount || 0);
                     return (
                       <div className="md:col-span-2 p-3 bg-accent-yellow/5 border border-accent-yellow/20 rounded-xl flex items-center justify-between animate-fadeIn">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-lg bg-accent-yellow/10 flex items-center justify-center">
                             <svg className="w-4 h-4 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           </div>
                           <span className="text-xs font-bold text-dark uppercase tracking-wider">Solde restant de l'étudiant</span>
                         </div>
                         <span className={`text-sm font-black ${remaining > 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                           {formatCurrency(remaining)}
                         </span>
                       </div>
                     );
                   })()}
                   <div>
                     <label className="form-label">Montant (MAD) *</label>
                     <input type="number" min="0" step="0.01" {...F('amount')} required className="form-input font-bold text-accent-green" placeholder="0.00" />
                   </div>
                   <div>
                     <label className="form-label">Mode de paiement</label>
                     <select {...F('payment_method')} className="form-select">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select>
                   </div>
                   <div>
                     <label className="form-label">Date *</label>
                     <input type="date" {...F('payment_date')} required className="form-input" />
                   </div>
                   <div className="hidden md:block"></div>
                </div>
                <div><label className="form-label">Notes</label><textarea {...F('notes')} rows={2} className="form-textarea resize-none" placeholder="Notes optionnelles (Référence chèque, virement...)" /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving}>Enregistrer le paiement</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
