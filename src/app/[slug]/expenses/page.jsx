'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';
import StatCard from '@/components/StatCard';
import { formatDate, formatCurrency } from '@/lib/utils';

const CATEGORIES = [
  { id: 'tax', label: 'Taxe Professionnelle', color: 'accent-red', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
  { id: 'repairs', label: 'Réparation Voitures', color: 'accent-yellow', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { id: 'employee', label: 'Employés & Salaires', color: 'accent-blue', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'admin', label: 'Frais Administratifs', color: 'accent-green', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z', subcategories: ['Loyer', 'Eau et électricité', 'WiFi', 'Autre'] },
];

export default function ExpensesPage() {
  const { slug } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    category: 'admin',
    subcategory: 'Loyer',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        api.expenses.getAll(),
        api.expenses.getStats()
      ]);
      setExpenses(Array.isArray(data) ? data : []);
      setStats(s);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.expenses.create(form);
      setShowModal(false);
      setForm({ category: 'admin', subcategory: 'Loyer', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    await api.expenses.delete(id);
    load();
  };

  const currentCategory = CATEGORIES.find(c => c.id === form.category);

  const exportCSV = () => {
    const headers = ['Date', 'Catégorie', 'Sous-catégorie', 'Montant', 'Notes'];
    const rows = expenses.map(e => [
      formatDate(e.date),
      `"${CATEGORIES.find(c => c.id === e.category)?.label || e.category}"`,
      `"${e.subcategory || ''}"`,
      e.amount,
      `"${e.notes || ''}"`
    ]);
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `depenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.text('Journal des Dépenses', 14, 20);
    const tableRows = expenses.map(e => [
      formatDate(e.date),
      CATEGORIES.find(c => c.id === e.category)?.label || e.category,
      e.subcategory || '',
      formatCurrency(e.amount),
      e.notes || ''
    ]);
    autoTable(doc, {
      startY: 30,
      head: [['Date', 'Catégorie', 'Sous-cat', 'Montant', 'Notes']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] }
    });
    doc.save(`depenses_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-50/50">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </div>
          <div>
            <p className="text-[10px] font-black text-dark-muted uppercase tracking-[0.2em] mb-0.5">Gestion des sorties de fonds</p>
            <h1 className="text-3xl font-black text-dark tracking-tight">Dépenses</h1>
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
                <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">{expenses.length} enregistrement(s)</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>} className="shadow-lg shadow-red-500/20 !bg-red-600">
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Dépenses Totales" value={loading ? null : formatCurrency(stats?.total || 0)} loading={loading} color="danger" gradient />
        {CATEGORIES.map(cat => {
          const s = stats?.byCategory?.find(c => c.category === cat.id);
          const colorMap = { 'accent-red': 'danger', 'accent-yellow': 'warning', 'accent-blue': 'primary', 'accent-green': 'success' };
          return (
            <StatCard
              key={cat.id}
              title={cat.label}
              value={loading ? null : formatCurrency(s?.total || 0)}
              loading={loading}
              color={colorMap[cat.color] || 'primary'}
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} /></svg>}
            />
          );
        })}
      </div>

      {/* Expense List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-6 py-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Catégorie</th>
                <th className="px-6 py-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Détails</th>
                <th className="px-6 py-4 text-xs font-bold text-dark-muted uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-xs font-bold text-dark-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-surface-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-dark-muted font-medium">Aucune dépense enregistrée</td></tr>
              ) : (
                expenses.map((exp) => {
                  const cat = CATEGORIES.find(c => c.id === exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-surface-25 transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-dark">{formatDate(exp.date)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-${cat?.color || 'gray-400'}`} />
                          <span className="font-semibold text-dark">{cat?.label || exp.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-muted">
                        {exp.subcategory && <span className="font-bold text-dark mr-2">{exp.subcategory}</span>}
                        {exp.notes}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-accent-red">-{formatCurrency(exp.amount)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(exp.id)} className="p-2 rounded-xl text-dark-muted hover:bg-accent-red/10 hover:text-accent-red transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Nouvelle Dépense</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Catégorie</label>
                    <select 
                      value={form.category} 
                      onChange={e => setForm({ ...form, category: e.target.value, subcategory: CATEGORIES.find(c => c.id === e.target.value)?.subcategories?.[0] || '' })}
                      className="form-select w-full"
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  {currentCategory?.subcategories ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Sous-catégorie</label>
                      <select 
                        value={form.subcategory} 
                        onChange={e => setForm({ ...form, subcategory: e.target.value })}
                        className="form-select w-full"
                      >
                        {currentCategory.subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ) : <div className="hidden md:block"></div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Montant (DH)</label>
                    <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="form-input w-full font-bold text-accent-red" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Date</label>
                    <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="form-input w-full" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-dark-muted uppercase tracking-wider">Notes / Justification</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-textarea w-full h-24 resize-none" placeholder="Ex: Réparation frein Peugeot 208..." />
                </div>
              </div>
              <div className="modal-footer">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
                <Button type="submit" loading={saving} className="flex-1">Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
