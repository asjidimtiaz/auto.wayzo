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

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Paiements</h1>
          <p className="text-sm text-dark-muted">Gestion des paiements des étudiants</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-medium text-dark-muted hover:bg-surface-50 transition-all">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             Exporter
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
           </button>
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl text-sm font-medium text-dark-muted hover:bg-surface-50 transition-all">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             Plan de Paiement
           </button>
           <Button onClick={() => setShowModal(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
             Nouveau paiement
           </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
         {/* Row 1 */}
         <div className="bg-white rounded-3xl shadow-soft p-6 flex items-center justify-between border border-surface-100">
            <div>
              <p className="text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Total des paiements</p>
              <p className="text-2xl font-bold text-dark">{formatCurrency(methodStats.Total)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
         </div>

         <div className="bg-accent-green/5 rounded-3xl shadow-soft p-6 flex items-center justify-between border border-accent-green/10">
            <div>
              <p className="text-xs font-bold text-accent-green uppercase tracking-wider mb-2">Espèces</p>
              <p className="text-2xl font-bold text-accent-green">{formatCurrency(methodStats.Cash)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
         </div>

         <div className="bg-accent-blue/5 rounded-3xl shadow-soft p-6 flex items-center justify-between border border-accent-blue/10">
            <div>
              <p className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-2">Virements</p>
              <p className="text-2xl font-bold text-accent-blue">{formatCurrency(methodStats.Transfer)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
         </div>

         <div className="bg-primary-50 rounded-3xl shadow-soft p-6 flex items-center justify-between border border-primary-100">
            <div>
              <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Chèques</p>
              <p className="text-2xl font-bold text-primary-600">{formatCurrency(methodStats.Cheque)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
         </div>

         <div className="bg-accent-yellow/5 rounded-3xl shadow-soft p-6 flex items-center justify-between border border-accent-yellow/10">
            <div>
              <p className="text-xs font-bold text-accent-yellow uppercase tracking-wider mb-2">TPE</p>
              <p className="text-2xl font-bold text-accent-yellow">{formatCurrency(methodStats.TPE)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-accent-yellow/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
         </div>
      </div>

      {/* Solde Impayé section */}
      <Card>
        <Card.Header 
          title={
            <div className="flex items-center gap-2 text-dark font-bold">
              <svg className="w-5 h-5 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              Solde Impayé
            </div>
          }
          action={
            <Badge variant="warning" className="!bg-accent-yellow/10 !text-accent-yellow border-none px-3 py-1">
              {unpaidStudents.length} étudiants
            </Badge>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
          {unpaidStudents.slice(0, 6).map((s) => {
            const progress = s.total > 0 ? (s.paid / s.total) * 100 : 0;
            return (
              <div key={s.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-dark truncate pr-2 uppercase">{s.full_name}</h3>
                  <span className="text-sm font-bold text-accent-red">-{formatCurrency(s.remaining)}</span>
                </div>
                <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                   <div className="h-full bg-accent-yellow rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-dark-muted">
                  <span>{formatCurrency(s.paid)} / {formatCurrency(s.total)}</span>
                  <span>({Math.round(progress)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
        {unpaidStudents.length > 6 && (
          <div className="mt-6 pt-4 border-t border-surface-100 text-center">
            <Link href={`/${slug}/students`} className="text-xs font-bold text-dark-muted hover:text-primary-500 transition-colors">
              + {unpaidStudents.length - 6} autres étudiants
            </Link>
          </div>
        )}
      </Card>

      {/* Filters */}
      <Card className="mb-4" padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par étudiant..." className="form-input pl-9" />
          </div>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="form-select w-auto">
            <option value="">Tous les modes</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </select>
        </div>
      </Card>

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
                  {['Étudiant', 'Montant', 'Mode de paiement', 'Date', 'Notes', ''].map(h => (
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
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Nouveau paiement</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-4">
                <div><label className="form-label">Étudiant *</label><select {...F('student_id')} required className="form-select"><option value="">Sélectionner</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                <div><label className="form-label">Montant (MAD) *</label><input type="number" min="0" step="0.01" {...F('amount')} required className="form-input" placeholder="0.00" /></div>
                <div><label className="form-label">Mode de paiement</label><select {...F('payment_method')} className="form-select">{PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></div>
                <div><label className="form-label">Date *</label><input type="date" {...F('payment_date')} required className="form-input" /></div>
                <div><label className="form-label">Notes</label><textarea {...F('notes')} rows={2} className="form-textarea resize-none" placeholder="Notes optionnelles..." /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving}>Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
