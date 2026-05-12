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

const STATUS_OPTIONS = ['Émise', 'Payée', 'Annulée', 'En attente'];
const STATUS_BADGE = { Payée: 'success', 'En attente': 'info', Annulée: 'danger', 'Émise': 'gray' };
const METHOD_LABEL = { Cash: 'Espèces', Transfer: 'Virement', Cheque: 'Chèque', TPE: 'TPE' };

export default function InvoicesPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student_id: '', amount: '', issue_date: today(), notes: '' });
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, s] = await Promise.all([api.invoices.getAll(), api.students.getAll()]);
      setInvoices(Array.isArray(inv) ? inv : []);
      setStudents(Array.isArray(s) ? s : []);
    } catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, dateRange]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const q = search.toLowerCase();
      const matchesSearch = !q || 
        inv.full_name?.toLowerCase().includes(q) || 
        inv.cin?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q);
      
      const matchesStatus = !filterStatus || inv.status === filterStatus;
      
      let matchesDate = true;
      if (dateRange.start) matchesDate = matchesDate && inv.issue_date >= dateRange.start;
      if (dateRange.end) matchesDate = matchesDate && inv.issue_date <= dateRange.end;
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, search, filterStatus, dateRange]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, amount: 0, paid: 0, pending: 0 };
    filtered.forEach(inv => {
      const amt = parseFloat(inv.amount || 0);
      s.amount += amt;
      if (inv.status === 'Payée') s.paid += amt;
      else if (inv.status !== 'Annulée') s.pending += amt;
    });
    return s;
  }, [filtered]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filtered.slice(indexOfFirstItem, indexOfLastItem);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.invoices.create({ ...form, student_id: parseInt(form.student_id), amount: parseFloat(form.amount) });
      notify.success('Facture créée avec succès');
      setShowModal(false);
      setForm({ student_id: '', amount: '', issue_date: today(), notes: '' });
      await load();
    } catch { notify.error('Erreur lors de la création'); }
    finally { setSaving(false); }
  }

  async function handleUpdateStatus(invoice, status) {
    try {
      await api.invoices.updateStatus(invoice.id, status);
      notify.success(`Statut mis à jour: ${status}`);
      await load();
    } catch { notify.error('Erreur lors de la mise à jour'); }
  }

  async function handleDelete(invoice) {
    const ok = await confirmDelete(`la facture ${invoice.invoice_number || ''}`);
    if (!ok) return;
    try { await api.invoices.delete(invoice.id); notify.success('Facture supprimée'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Factures
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Gérez les factures et les règlements de vos clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowModal(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
            Nouvelle Facture
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Factures" value={loading ? null : stats.total} loading={loading} color="primary" />
        <StatCard title="Montant Total" value={loading ? null : formatCurrency(stats.amount)} loading={loading} color="info" />
        <StatCard title="Payées" value={loading ? null : formatCurrency(stats.paid)} loading={loading} color="success" />
        <StatCard title="En attente" value={loading ? null : formatCurrency(stats.pending)} loading={loading} color="warning" />
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, CIN ou numéro..." className="form-input pl-9" />
          </div>
          <div className="w-auto relative">
             <input type="date" value={dateRange.start} onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} className="form-input text-xs w-36" />
             <span className="mx-1 text-dark-muted self-center">-</span>
             <input type="date" value={dateRange.end} onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} className="form-input text-xs w-36" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select w-auto">
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} title="Aucune facture" onAction={() => setShowModal(true)} actionLabel="Créer une facture" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr className="text-dark-muted font-bold text-[10px] uppercase tracking-wider">
                  <th className="text-left px-4 py-4">N° Facture</th>
                  <th className="text-left px-4 py-4">Date</th>
                  <th className="text-left px-4 py-4">Client</th>
                  <th className="text-left px-4 py-4">CIN</th>
                  <th className="text-left px-4 py-4">Montant</th>
                  <th className="text-left px-4 py-4">Payé</th>
                  <th className="text-left px-4 py-4">Reste</th>
                  <th className="text-left px-4 py-4">Paiement</th>
                  <th className="text-left px-4 py-4">Statut</th>
                  <th className="text-center px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {currentInvoices.map(inv => {
                  const isPaid = inv.status === 'Payée';
                  const paidAmt = isPaid ? inv.amount : 0;
                  const remainingAmt = isPaid ? 0 : inv.amount;
                  
                  return (
                    <tr key={inv.id} className="hover:bg-surface-50 transition-colors group">
                      <td className="px-4 py-4 text-xs font-bold text-dark-muted uppercase">{inv.invoice_number}</td>
                      <td className="px-4 py-4 text-xs text-dark-muted font-medium">{formatDate(inv.issue_date)}</td>
                      <td className="px-4 py-4">
                        <Link href={`/${slug}/students/${inv.student_id}`} className="text-xs font-bold text-primary-500 hover:underline uppercase">{inv.full_name}</Link>
                      </td>
                      <td className="px-4 py-4 text-xs text-dark-muted font-bold">{inv.cin || '—'}</td>
                      <td className="px-4 py-4 text-xs font-bold text-dark">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-4 text-xs font-bold text-accent-green">{formatCurrency(paidAmt)}</td>
                      <td className="px-4 py-4 text-xs font-bold text-accent-red">{formatCurrency(remainingAmt)}</td>
                      <td className="px-4 py-4">
                        {inv.payment_method ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-dark">{METHOD_LABEL[inv.payment_method] || inv.payment_method}</span>
                            <span className="text-[9px] text-dark-muted">Réf: {inv.payment_id || 'Auto'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-dark-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <select 
                          value={inv.status} 
                          onChange={(e) => handleUpdateStatus(inv, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer ${
                            inv.status === 'Payée' ? 'bg-accent-green/10 text-accent-green' : 
                            inv.status === 'Annulée' ? 'bg-accent-red/10 text-accent-red' : 
                            'bg-accent-blue/10 text-accent-blue'
                          }`}
                        >
                          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 rounded-xl bg-surface-100 text-dark-muted hover:bg-surface-200 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(inv)} className="p-2 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
            <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
          </div>
        )}
      </Card>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Nouvelle facture</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="md:col-span-2">
                     <label className="form-label">Étudiant *</label>
                     <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required className="form-select">
                        <option value="">Sélectionner un étudiant</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="form-label">Montant (MAD) *</label>
                     <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="form-input font-bold text-dark" placeholder="0.00" />
                   </div>
                   <div>
                     <label className="form-label">Date d'émission *</label>
                     <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} required className="form-input" />
                   </div>
                </div>
                <div><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="form-textarea resize-none" placeholder="Détails de la facture..." /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving}>Créer la facture</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
