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
import { Settings, Plus, Trash2, Edit2, Car, Home, Zap, Info, ChevronRight, History, Calendar } from 'lucide-react';

const EXPENSE_GROUPS = [
  {
    id: 'Administration',
    label: 'Administration',
    icon: <Home className="w-5 h-5" />,
    color: 'blue',
    fixed: ['Loyer', 'Employée', 'Moniteur pratique', 'Moniteur théorique'],
    variable: ['Électricité', 'Eau', 'Internet', 'Réparations', 'Publicité', 'Autres dépenses']
  },
  {
    id: 'Voiture',
    label: 'Voiture',
    icon: <Car className="w-5 h-5" />,
    color: 'orange',
    fixed: ['Assurance', 'Taxe annuelle', 'visite technique'],
    variable: ['Carburant', 'Réparations', 'Autres dépenses']
  },
  {
    id: 'Moto',
    label: 'Moto',
    icon: <History className="w-5 h-5" />, // Using History as motorcycle placeholder or similar
    color: 'purple',
    fixed: ['Assurance', 'Taxe annuelle'],
    variable: ['Carburant', 'Réparations', 'Autres dépenses']
  }
];

export default function ExpensesPage() {
  const { slug } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState('Administration');
  const [activeTab, setActiveTab] = useState('History'); // 'History' or 'Settings' (Recurring)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    group_name: 'Administration',
    expense_type: 'Variable',
    subcategory: 'Électricité',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [recurringForm, setRecurringForm] = useState({
    group_name: 'Administration',
    subcategory: 'Loyer',
    amount: '',
    notes: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Check and generate monthly expenses
      await api.expenses.recurring.check();
      
      // 2. Fetch all data
      const [data, rec, s] = await Promise.all([
        api.expenses.getAll(),
        api.expenses.recurring.getAll(),
        api.expenses.getStats()
      ]);
      setExpenses(Array.isArray(data) ? data : []);
      setRecurring(Array.isArray(rec) ? rec : []);
      setStats(s);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.expenses.create({
        ...form,
        category: form.expense_type.toLowerCase() // internal fallback
      });
      setShowAddModal(false);
      setForm({
        group_name: activeGroup,
        expense_type: 'Variable',
        subcategory: EXPENSE_GROUPS.find(g => g.id === activeGroup)?.variable[0] || '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      load();
    } finally { setSaving(false); }
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.expenses.recurring.create(recurringForm);
      setShowRecurringModal(false);
      setRecurringForm({ group_name: activeGroup, subcategory: '', amount: '', notes: '' });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    await api.expenses.delete(id);
    load();
  };

  const handleDeleteRecurring = async (id) => {
    if (!confirm('Supprimer cette dépense fixe (template) ?')) return;
    await api.expenses.recurring.delete(id);
    load();
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.group_name === activeGroup);
  }, [expenses, activeGroup]);

  const filteredRecurring = useMemo(() => {
    return recurring.filter(r => r.group_name === activeGroup);
  }, [recurring, activeGroup]);

  const currentGroup = EXPENSE_GROUPS.find(g => g.id === activeGroup);

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-sm border border-red-50/50">
            <Zap className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-dark-muted uppercase tracking-[0.2em] mb-0.5">Comptabilité & Gestion</p>
            <h1 className="text-3xl font-black text-dark tracking-tight">Dépenses</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              setForm({ ...form, group_name: activeGroup, subcategory: currentGroup.variable[0] });
              setShowAddModal(true);
            }} 
            icon={<Plus size={18} />} 
            className="shadow-lg shadow-red-500/20 !bg-red-600"
          >
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      {/* Group Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-surface-100 rounded-2xl w-fit">
        {EXPENSE_GROUPS.map(group => (
          <button
            key={group.id}
            onClick={() => setActiveGroup(group.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
              activeGroup === group.id 
                ? 'bg-white text-dark shadow-sm' 
                : 'text-dark-muted hover:text-dark hover:bg-white/50'
            }`}
          >
            {group.icon}
            {group.label}
          </button>
        ))}
      </div>

      {/* Tabs: History vs Recurring Settings */}
      <div className="flex items-center gap-8 border-b border-surface-100">
        <button 
          onClick={() => setActiveTab('History')}
          className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'History' ? 'text-primary-600' : 'text-dark-muted hover:text-dark'}`}
        >
          Journal des dépenses
          {activeTab === 'History' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('Settings')}
          className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'Settings' ? 'text-primary-600' : 'text-dark-muted hover:text-dark'}`}
        >
          Configuration Dépenses Fixes (Mensuelles)
          {activeTab === 'Settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
        </button>
      </div>

      {activeTab === 'History' ? (
        <div className="space-y-6">
          {/* Stats for the active group */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <StatCard 
              title={`Total ${activeGroup}`} 
              value={formatCurrency(filteredExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0))} 
              loading={loading}
              color="danger"
              gradient
            />
             <StatCard 
              title="Fixes (Ce mois)" 
              value={formatCurrency(filteredExpenses.filter(e => e.expense_type === 'Fixed' && e.date.startsWith(new Date().toISOString().substring(0, 7))).reduce((acc, curr) => acc + parseFloat(curr.amount), 0))} 
              loading={loading}
              color="primary"
            />
             <StatCard 
              title="Variables (Ce mois)" 
              value={formatCurrency(filteredExpenses.filter(e => e.expense_type === 'Variable' && e.date.startsWith(new Date().toISOString().substring(0, 7))).reduce((acc, curr) => acc + parseFloat(curr.amount), 0))} 
              loading={loading}
              color="warning"
            />
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-100 text-dark/60">
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Détails</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-surface-100 rounded w-full" /></td>
                      </tr>
                    ))
                  ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-dark-muted font-medium">Aucune dépense enregistrée pour cette catégorie</td></tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-surface-25 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-dark">{formatDate(exp.date)}</td>
                        <td className="px-6 py-4">
                          <Badge variant={exp.expense_type === 'Fixed' ? 'primary' : 'warning'}>
                            {exp.expense_type === 'Fixed' ? 'Fixe' : 'Variable'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-dark">{exp.subcategory}</span>
                            <span className="text-xs text-dark-muted truncate max-w-xs">{exp.notes}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-red-600">-{formatCurrency(exp.amount)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(exp.id)} className="p-2 rounded-xl text-dark-muted hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-dark">Dépenses Fixes - {activeGroup}</h3>
              <p className="text-sm text-dark-muted">Ces dépenses seront générées automatiquement chaque mois.</p>
            </div>
            <Button 
              size="sm" 
              icon={<Plus size={16} />} 
              onClick={() => {
                setRecurringForm({ ...recurringForm, group_name: activeGroup, subcategory: currentGroup.fixed[0] });
                setShowRecurringModal(true);
              }}
            >
              Ajouter une dépense fixe
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecurring.map(item => (
              <div key={item.id} className="bg-white rounded-3xl p-6 border border-surface-200 shadow-sm hover:shadow-md transition-all relative group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-${currentGroup.color}-600 bg-${currentGroup.color}-50`}>
                    {currentGroup.icon}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-2 text-dark-muted hover:text-primary-600 transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDeleteRecurring(item.id)} className="p-2 text-dark-muted hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h4 className="font-black text-dark text-lg mb-1">{item.subcategory}</h4>
                <div className="text-2xl font-black text-primary-600 mb-4">{formatCurrency(item.amount)}</div>
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-xs text-dark-muted font-bold uppercase tracking-wider">
                     <Calendar size={14} />
                     Prochaine: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                   </div>
                   {item.notes && <p className="text-sm text-dark-muted italic">"{item.notes}"</p>}
                </div>
              </div>
            ))}
            {filteredRecurring.length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-surface-200 rounded-[40px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center text-dark-muted mb-4">
                  <Info size={32} />
                </div>
                <p className="text-dark font-bold text-lg">Aucune dépense fixe configurée</p>
                <p className="text-dark-muted text-sm max-w-sm px-6">Configurez vos loyers, salaires et abonnements pour qu'ils soient ajoutés automatiquement chaque mois.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Expense (Variable) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Nouvelle Dépense Variable</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <Plus className="w-5 h-5 text-dark-muted rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body space-y-6 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Groupe</label>
                  <select 
                    value={form.group_name} 
                    onChange={e => setForm({ ...form, group_name: e.target.value, subcategory: EXPENSE_GROUPS.find(g => g.id === e.target.value).variable[0] })}
                    className="form-select w-full"
                  >
                    {EXPENSE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Sous-catégorie</label>
                  <select 
                    value={form.subcategory} 
                    onChange={e => setForm({ ...form, subcategory: e.target.value })}
                    className="form-select w-full"
                  >
                    {EXPENSE_GROUPS.find(g => g.id === form.group_name)?.variable.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Montant (DH)</label>
                  <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="form-input w-full font-black text-red-600 text-lg" placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Date</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="form-input w-full" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Notes / Justification</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-textarea w-full h-32 resize-none" placeholder="Détails de la dépense..." />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">Annuler</Button>
                <Button type="submit" loading={saving} className="flex-1 !bg-red-600">Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Recurring (Fixed) */}
      {showRecurringModal && (
        <div className="modal-overlay" onClick={() => setShowRecurringModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Dépense Fixe (Mensuelle)</h2>
              <button onClick={() => setShowRecurringModal(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <Plus className="w-5 h-5 text-dark-muted rotate-45" />
              </button>
            </div>
            <form onSubmit={handleRecurringSubmit} className="modal-body space-y-6 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Groupe</label>
                  <select 
                    value={recurringForm.group_name} 
                    onChange={e => setRecurringForm({ ...recurringForm, group_name: e.target.value, subcategory: EXPENSE_GROUPS.find(g => g.id === e.target.value).fixed[0] })}
                    className="form-select w-full"
                  >
                    {EXPENSE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Type de dépense</label>
                  <select 
                    value={recurringForm.subcategory} 
                    onChange={e => setRecurringForm({ ...recurringForm, subcategory: e.target.value })}
                    className="form-select w-full"
                  >
                    {EXPENSE_GROUPS.find(g => g.id === recurringForm.group_name)?.fixed.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Montant Mensuel (DH)</label>
                <input type="number" step="0.01" required value={recurringForm.amount} onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })} className="form-input w-full font-black text-primary-600 text-lg" placeholder="0.00" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-dark-muted uppercase tracking-wider">Nom / Détails (Optionnel)</label>
                <input type="text" value={recurringForm.notes} onChange={e => setRecurringForm({ ...recurringForm, notes: e.target.value })} className="form-input w-full" placeholder="Ex: Mme. Fatima (Salaire), Immeuble X (Loyer)..." />
              </div>

              <div className="p-4 bg-primary-50 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-primary-600 mt-0.5" />
                <p className="text-xs text-primary-700 leading-relaxed font-medium">
                  Cette dépense sera automatiquement ajoutée à votre journal chaque premier jour du mois. 
                  Vous pourrez toujours la modifier ou la supprimer dans le journal si nécessaire.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowRecurringModal(false)} className="flex-1">Annuler</Button>
                <Button type="submit" loading={saving} className="flex-1">Activer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
