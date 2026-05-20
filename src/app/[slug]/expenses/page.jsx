'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { formatDate, formatCurrency, today } from '@/lib/utils';
import { Settings, Plus, Trash2, Edit2, Car, Home, Wallet, Info, ChevronRight, Bike, Calendar, Search, Filter, Download, Database, PieChart, AlertCircle, History, FileText } from 'lucide-react';

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
    icon: <Bike className="w-5 h-5" />,
    color: 'purple',
    fixed: ['Assurance', 'Taxe annuelle'],
    variable: ['Carburant', 'Réparations', 'Autres dépenses']
  }
];

export default function ExpensesPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [expenses, setExpenses] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeGroup, setActiveGroup] = useState('Administration');
  const [activeTab, setActiveTab] = useState('History'); // 'History' or 'Settings'
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const loadingTimeout = useRef(null);

  // Vehicle plates states
  const [vehiclePlates, setVehiclePlates] = useState([]);
  const [showQuickAddPlate, setShowQuickAddPlate] = useState(false);
  const [showQuickAddPlateRecurring, setShowQuickAddPlateRecurring] = useState(false);
  const [quickPlate, setQuickPlate] = useState('');

  const handleQuickAddPlate = async (isRecurring = false) => {
    const trimmed = quickPlate.trim().toUpperCase();
    if (!trimmed) return;
    if (vehiclePlates.includes(trimmed)) {
      notify.error('Cette plaque existe déjà');
      return;
    }
    const updatedPlates = [...vehiclePlates, trimmed];
    setVehiclePlates(updatedPlates);
    if (isRecurring) {
      setRecurringForm(f => ({ ...f, vehicle_plate: trimmed }));
      setShowQuickAddPlateRecurring(false);
    } else {
      setForm(f => ({ ...f, vehicle_plate: trimmed }));
      setShowQuickAddPlate(false);
    }
    setQuickPlate('');
    try {
      const currentSettings = await api.settings.get().catch(() => null);
      if (currentSettings) {
        await api.settings.update({ ...currentSettings, vehicle_plates: updatedPlates });
        notify.success('Plaque enregistrée avec succès');
      }
    } catch {
      notify.error('Erreur lors de l\'enregistrement de la plaque');
    }
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    group_name: 'Administration',
    expense_type: 'Variable',
    subcategory: 'Électricité',
    custom_subcategory: '',
    vehicle_plate: '',
    amount: '',
    date: today(),
    reference: '',
    notes: ''
  });

  const [recurringForm, setRecurringForm] = useState({
    group_name: 'Administration',
    subcategory: 'Loyer',
    vehicle_plate: '',
    amount: '',
    notes: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
    loadingTimeout.current = setTimeout(() => {
      setLoading(curr => {
        if (curr) {
          setError('Le chargement prend plus de temps que prévu...');
          return false;
        }
        return false;
      });
    }, 8000);

    try {
      const [data, rec, settingsData] = await Promise.all([
        api.expenses.getAll().catch(() => []),
        api.expenses.recurring.getAll().catch(() => []),
        api.settings.get().catch(() => null)
      ]);
      setExpenses(Array.isArray(data) ? data : []);
      setRecurring(Array.isArray(rec) ? rec : []);
      setVehiclePlates(settingsData?.vehicle_plates || []);
    } catch (err) {
      notify.error('Erreur de chargement');
      setError('Impossible de récupérer les données.');
    } finally { 
      if (loadingTimeout.current) clearTimeout(loadingTimeout.current);
      setLoading(false); 
    }
  }, [notify]);

  useEffect(() => { 
    load(); 
    return () => { if (loadingTimeout.current) clearTimeout(loadingTimeout.current); };
  }, [load]);

  const seedSampleData = async () => {
    setSaving(true);
    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lm = lastMonth.toISOString().split('T')[0];

      const samples = [
        // Current Month - Admin
        { group_name: 'Administration', subcategory: 'Loyer', amount: 5000, expense_type: 'Fixed', reference: 'LOY-05-26', notes: 'Loyer local principal', date: today() },
        { group_name: 'Administration', subcategory: 'Électricité', amount: 640, expense_type: 'Variable', reference: 'REDAL-99', notes: 'Facture Avril/Mai', date: today() },
        { group_name: 'Administration', subcategory: 'Publicité', amount: 1200, expense_type: 'Variable', reference: 'FB-ADS', notes: 'Campagne Facebook Inscriptions', date: today() },
        
        // Current Month - Voiture
        { group_name: 'Voiture', subcategory: 'Carburant', amount: 450, expense_type: 'Variable', reference: 'SHELL-01', notes: 'Duster - Plein #1', date: today() },
        { group_name: 'Voiture', subcategory: 'Carburant', amount: 480, expense_type: 'Variable', reference: 'SHELL-02', notes: 'Duster - Plein #2', date: today() },
        { group_name: 'Voiture', subcategory: 'Réparations', amount: 1500, expense_type: 'Variable', reference: 'MECH-X', notes: 'Vidange + Filtres', date: today() },
        
        // Current Month - Moto
        { group_name: 'Moto', subcategory: 'Assurance', amount: 1200, expense_type: 'Fixed', reference: 'MOTO-INS', notes: 'Assurance annuelle MT-07', date: today() },
        
        // Last Month Data (for historical context)
        { group_name: 'Administration', subcategory: 'Loyer', amount: 5000, expense_type: 'Fixed', reference: 'LOY-04-26', notes: 'Loyer Avril', date: lm },
        { group_name: 'Voiture', subcategory: 'Carburant', amount: 1800, expense_type: 'Variable', reference: 'HIST-01', notes: 'Total Carburant Avril', date: lm },
        { group_name: 'Administration', subcategory: 'Publicité', amount: 2000, expense_type: 'Variable', reference: 'GOOGLE-ADS', notes: 'Google Ads Launch', date: lm }
      ];

      for (const s of samples) {
        await api.expenses.create({
          ...s,
          category: s.expense_type.toLowerCase()
        });
      }
      
      // Add recurring templates
      const templates = [
        { group_name: 'Administration', subcategory: 'Loyer', amount: 5000, notes: 'Paiement auto 1er du mois' },
        { group_name: 'Administration', subcategory: 'Fibre Internet', amount: 249, notes: 'Orange Fibre' },
        { group_name: 'Voiture', subcategory: 'Assurance', amount: 3500, notes: 'Pack Flotte AXA' },
        { group_name: 'Administration', subcategory: 'Employée', amount: 3000, notes: 'Salaire Secrétariat' }
      ];

      for (const t of templates) {
        await api.expenses.recurring.create(t);
      }

      notify.success('20+ enregistrements et modèles générés !');
      await load();
    } catch (err) {
      notify.error('Erreur lors de la génération');
    } finally {
      setSaving(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q || 
        e.subcategory?.toLowerCase().includes(q) || 
        e.notes?.toLowerCase().includes(q) || 
        e.reference?.toLowerCase().includes(q);
      return e.group_name === activeGroup && matchSearch;
    });
  }, [expenses, activeGroup, search]);

  const filteredRecurring = useMemo(() => {
    return recurring.filter(r => r.group_name === activeGroup);
  }, [recurring, activeGroup]);

  const groupStats = useMemo(() => {
    const groupExpenses = expenses.filter(e => e.group_name === activeGroup);
    const total = groupExpenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const month = today().substring(0, 7);
    const fixed = groupExpenses.filter(e => e.expense_type === 'Fixed' && e.date.startsWith(month)).reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const variable = groupExpenses.filter(e => e.expense_type === 'Variable' && e.date.startsWith(month)).reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    return { total, fixed, variable };
  }, [expenses, activeGroup]);

  const allGroupBreakdown = useMemo(() => {
    const stats = { Administration: 0, Voiture: 0, Moto: 0, total: 0 };
    expenses.forEach(e => {
      const amt = parseFloat(e.amount || 0);
      stats.total += amt;
      if (stats[e.group_name] !== undefined) stats[e.group_name] += amt;
    });
    return stats;
  }, [expenses]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const isOther = form.subcategory === 'Autres dépenses';
      const submitData = {
        ...form,
        subcategory: isOther ? (form.custom_subcategory || 'Autres dépenses') : form.subcategory,
        category: form.expense_type.toLowerCase()
      };
      await api.expenses.create(submitData);
      notify.success('Dépense enregistrée');
      setShowAddModal(false);
      setForm({
        group_name: activeGroup,
        expense_type: 'Variable',
        subcategory: EXPENSE_GROUPS.find(g => g.id === activeGroup)?.variable[0] || '',
        custom_subcategory: '',
        vehicle_plate: '',
        amount: '',
        date: today(),
        reference: '',
        notes: ''
      });
      await load();
    } catch { notify.error('Erreur lors de l\'enregistrement'); }
    finally { setSaving(false); }
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.expenses.recurring.create(recurringForm);
      notify.success('Dépense fixe configurée et activée');
      setShowRecurringModal(false);
      setRecurringForm({ group_name: activeGroup, subcategory: currentGroup.fixed[0], vehicle_plate: '', amount: '', notes: '' });
      await load();
    } catch { notify.error('Erreur lors de la configuration'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (exp) => {
    const ok = await confirmDelete(`la dépense de ${formatCurrency(exp.amount)} (${exp.subcategory})`);
    if (!ok) return;
    try {
      await api.expenses.delete(exp.id);
      notify.success('Dépense supprimée');
      await load();
    } catch { notify.error('Erreur lors de la suppression'); }
  };

  const handleDeleteRecurring = async (item) => {
    const ok = await confirmDelete(`la configuration de dépense fixe "${item.subcategory}"`);
    if (!ok) return;
    try {
      await api.expenses.recurring.delete(item.id);
      notify.success('Template supprimé');
      await load();
    } catch { notify.error('Erreur lors de la suppression'); }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Catégorie', 'Détails', 'Référence', 'Montant'];
    const rows = filteredExpenses.map(e => [
      formatDate(e.date),
      e.expense_type === 'Fixed' ? 'Fixe' : 'Variable',
      `"${e.group_name}"`,
      `"${e.subcategory} ${e.notes ? '- ' + e.notes : ''}"`,
      `"${e.reference || ''}"`,
      e.amount
    ]);
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `depenses_${activeGroup}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Journal des Dépenses - ${activeGroup}`, 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} | ${filteredExpenses.length} enregistrements`, 14, 30);
    const tableHeaders = [['Date', 'Type', 'Détails', 'Ref', 'Montant']];
    const tableRows = filteredExpenses.map(e => [
      formatDate(e.date),
      e.expense_type === 'Fixed' ? 'Fixe' : 'Variable',
      `${e.subcategory}${e.notes ? ' (' + e.notes + ')' : ''}`,
      e.reference || '',
      `${e.amount} MAD`
    ]);
    autoTable(doc, {
      startY: 40,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], fontSize: 10 },
      styles: { fontSize: 9 },
      columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } }
    });
    doc.save(`depenses_${activeGroup}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const currentGroup = EXPENSE_GROUPS.find(g => g.id === activeGroup);

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Customized Swapped Header Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:items-center gap-4">
        {/* Left: Navigation Tabs */}
        <div className="flex justify-start">
          <div className="flex items-center gap-1 p-1 bg-white border border-surface-200 rounded-xl shadow-sm">
            {EXPENSE_GROUPS.map(group => (
              <button
                key={group.id}
                onClick={() => { setActiveGroup(group.id); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                  activeGroup === group.id 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'text-dark-muted hover:text-dark hover:bg-surface-50'
                }`}
              >
                <span className="opacity-70 scale-90">{group.icon}</span>
                {group.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Title block */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 shadow-sm border border-red-50/50">
            <Wallet size={16} />
          </div>
          <h1 className="text-lg font-black text-dark tracking-tight leading-none">Dépenses</h1>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2">
          <div className="relative group">
            <Button variant="secondary" size="sm" icon={<Download size={16} />}>
              Exporter
            </Button>
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-surface-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-right scale-95 group-hover:scale-100">
              <div className="p-1.5 space-y-0.5">
                <button onClick={exportCSV} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 transition-colors group/item text-left">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all">
                    <Download size={14} />
                  </div>
                  <p className="text-xs font-bold text-dark">CSV</p>
                </button>
                <button onClick={exportPDF} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-red-50 transition-colors group/item text-left">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover/item:bg-red-600 group-hover/item:text-white transition-all">
                    <Download size={14} />
                  </div>
                  <p className="text-xs font-bold text-dark">PDF</p>
                </button>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => {
              setForm({ 
                ...form, 
                group_name: activeGroup, 
                subcategory: currentGroup.variable[0],
                custom_subcategory: ''
              });
              setShowAddModal(true);
            }} 
            size="sm"
            icon={<Plus size={16} />} 
            className="shadow-lg shadow-red-500/10 !bg-red-600"
          >
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      {/* Sub Tabs: History vs Settings */}
      <div className="flex justify-start border-b border-surface-100 pb-2">
        <div className="flex items-center gap-1 p-1 bg-white border border-surface-200 rounded-xl shadow-sm">
          <button 
            onClick={() => setActiveTab('History')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              activeTab === 'History' 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'text-dark-muted hover:text-dark hover:bg-surface-50'
            }`}
          >
            <History size={14} />
            Journal des dépenses
          </button>
          <button 
            onClick={() => setActiveTab('Settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              activeTab === 'Settings' 
                ? 'bg-primary-600 text-white shadow-sm' 
                : 'text-dark-muted hover:text-dark hover:bg-surface-50'
            }`}
          >
            <Settings size={14} />
            Configuration Dépenses Fixes
          </button>
        </div>
      </div>

      {activeTab === 'History' ? (
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatCard 
              title={`Total ${activeGroup}`} 
              value={loading ? null : formatCurrency(groupStats.total)} 
              loading={loading}
              color="danger"
              gradient
              size="sm"
            />
            <StatCard 
              title="Fixes (Ce mois)" 
              value={loading ? null : formatCurrency(groupStats.fixed)} 
              loading={loading}
              color="primary"
              size="sm"
              icon={<Calendar className="w-full h-full" />}
            />
            <StatCard 
              title="Variables (Ce mois)" 
              value={loading ? null : formatCurrency(groupStats.variable)} 
              loading={loading}
              color="warning"
              size="sm"
              icon={<Wallet className="w-full h-full" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {EXPENSE_GROUPS.map(group => {
              const groupTotal = allGroupBreakdown[group.id] || 0;
              const totalAll = allGroupBreakdown.total || 1;
              const percentage = (groupTotal / totalAll) * 100;
              const groupColors = { blue: 'bg-blue-500', orange: 'bg-orange-500', purple: 'bg-purple-500' };
              return (
                <div key={group.id} className="bg-white px-3 py-2 rounded-xl border border-surface-200 shadow-sm flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${groupColors[group.color]}`}>
                    <span className="scale-75">{group.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-dark truncate uppercase tracking-tight">{group.label}</span>
                      <span className="text-[10px] font-black text-dark">
                        {loading ? <div className="w-10 h-2 bg-surface-100 animate-pulse rounded" /> : formatCurrency(groupTotal)}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-surface-50 rounded-full overflow-hidden relative">
                      <div className={`h-full ${groupColors[group.color]} rounded-full transition-all duration-1000`} style={{ width: loading ? '0%' : `${percentage}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-dark-muted min-w-[20px] text-right">{loading ? '—' : `${Math.round(percentage)}%`}</span>
                </div>
              );
            })}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-surface-200 shadow-sm">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Rechercher par libellé, note ou référence..." 
                className="w-full pl-10 pr-4 py-2 bg-surface-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" 
              />
            </div>
            <div className="px-4 py-2 text-xs font-bold text-dark-muted uppercase tracking-wider bg-surface-50 rounded-xl">
              {filteredExpenses.length} résultat(s)
            </div>
          </div>

          {/* Data Table */}
          <Card padding="none">
            {loading ? (
              <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center text-dark-muted mb-4">
                  <Filter size={32} />
                </div>
                <p className="text-dark font-bold text-lg">Aucune dépense trouvée</p>
                <p className="text-dark-muted text-sm mb-6">Essayez de modifier vos filtres ou ajoutez une nouvelle dépense.</p>
                <Button variant="secondary" onClick={seedSampleData} loading={saving} icon={<Database size={16} />}>
                  Générer des données de test
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-50 border-b border-surface-200">
                    <tr>
                      {['Date', 'Type', 'Détails', 'Ref', 'Montant', 'Actions'].map(h => (
                        <th key={h} className="text-left text-[10px] font-black text-dark-muted uppercase tracking-wider px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {currentExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-surface-50 transition-colors group">
                        <td className="px-5 py-2.5 text-xs font-bold text-dark">{formatDate(exp.date)}</td>
                        <td className="px-5 py-2.5">
                          <Badge variant={exp.expense_type === 'Fixed' ? 'primary' : 'warning'}>
                            {exp.expense_type === 'Fixed' ? 'Fixe' : 'Var'}
                          </Badge>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[13px] font-black text-dark">{exp.subcategory}</span>
                              {exp.vehicle_plate && (
                                <span className="text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded uppercase">
                                  {exp.vehicle_plate}
                                </span>
                              )}
                            </div>
                            {/* Staff, landlord, or custom details shown clearly and prominently */}
                            {['Employée', 'Moniteur pratique', 'Moniteur théorique', 'Loyer'].includes(exp.subcategory) && exp.notes ? (
                              <div className="mt-1 text-xs font-black text-primary-700 bg-primary-50/50 border border-primary-100/40 px-2.5 py-1 rounded-lg w-fit flex items-center gap-1.5 animate-fadeIn">
                                <span>👤</span>
                                {exp.notes.replace(/^Généré automatiquement - /, '')}
                              </div>
                            ) : (
                              exp.notes && (
                                <span className="text-[11px] font-bold text-dark-muted mt-0.5">
                                  {exp.notes}
                                </span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="text-[9px] font-black text-primary-600 uppercase bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
                            {exp.reference || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="text-xs font-black text-red-600">-{formatCurrency(exp.amount)}</span>
                        </td>
                        <td className="px-5 py-2.5">
                          <button 
                            onClick={() => handleDelete(exp)} 
                            className="p-1.5 rounded-lg text-dark-muted hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredExpenses.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-surface-200 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-dark uppercase tracking-tight">Dépenses Fixes - {activeGroup}</h3>
              <p className="text-sm text-dark-muted font-medium">Modèles de dépenses générés automatiquement chaque début de mois.</p>
            </div>
            <Button 
              icon={<Plus size={18} />} 
              onClick={() => {
                const firstFixed = currentGroup.fixed[0] || '';
                setRecurringForm({ group_name: activeGroup, subcategory: firstFixed, vehicle_plate: '', amount: '', notes: '' });
                setShowRecurringModal(true);
              }}
              className="!bg-primary-600"
            >
              Ajouter un modèle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredRecurring.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-3.5 border border-surface-200 shadow-soft hover:shadow-xl hover:border-primary-100 transition-all transform hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-600" />
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 text-primary-600">
                    {currentGroup.icon}
                  </div>
                  <button onClick={() => handleDeleteRecurring(item)} className="p-2 text-dark-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                  <h4 className="font-black text-dark text-sm mb-0">{item.subcategory}</h4>
                  {item.vehicle_plate && (
                    <span className="text-[8px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-1 py-0.5 rounded uppercase">
                      {item.vehicle_plate}
                    </span>
                  )}
                </div>
                <div className="text-lg font-black text-primary-600 mb-3">{formatCurrency(item.amount)}</div>
                <div className="space-y-2">
                   <div className="flex items-center gap-1.5 text-[9px] font-black text-dark-muted uppercase tracking-wider">
                     <Calendar size={14} className="text-primary-400" />
                     Prochaine: {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                   </div>
                   {item.notes && (
                     ['Employée', 'Moniteur pratique', 'Moniteur théorique', 'Loyer'].includes(item.subcategory) ? (
                       <div className="text-xs font-black text-primary-700 bg-primary-50 border border-primary-100/50 px-2 py-1.5 rounded-xl flex items-center gap-1.5 mt-2 animate-fadeIn w-fit">
                         <span>👤</span>
                         <span className="truncate">{item.notes}</span>
                       </div>
                     ) : (
                       <p className="text-[11px] font-black text-dark bg-surface-50 p-2 rounded-xl border border-surface-100 mt-2">
                         {item.notes}
                       </p>
                     )
                   )}
                </div>
              </div>
            ))}
            {filteredRecurring.length === 0 && (
              <div className="col-span-full py-20 border-4 border-dashed border-surface-100 rounded-[3rem] flex flex-col items-center justify-center text-center bg-white/50">
                <div className="w-20 h-20 bg-surface-50 rounded-3xl flex items-center justify-center text-dark-muted mb-6">
                  <Settings size={40} />
                </div>
                <h3 className="text-xl font-black text-dark uppercase tracking-tight mb-2">Aucun modèle configuré</h3>
                <p className="text-dark-muted font-medium max-w-sm">Configurez vos frais récurrents (loyer, salaires) pour automatiser votre comptabilité.</p>
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
              <h2 className="text-xl font-black text-dark uppercase tracking-tight">Nouvelle Dépense</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <Plus className="w-5 h-5 text-dark-muted rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="form-label">Groupe *</label>
                    <select 
                      value={form.group_name} 
                      onChange={e => setForm({ ...form, group_name: e.target.value, subcategory: EXPENSE_GROUPS.find(g => g.id === e.target.value).variable[0], vehicle_plate: '' })}
                      className="form-select w-full"
                    >
                      {EXPENSE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                  {(form.group_name === 'Voiture' || form.group_name === 'Moto') && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="form-label">Plaque d'immatriculation / N° Véhicule *</label>
                      <select 
                        value={form.vehicle_plate || ''} 
                        onChange={e => {
                          if (e.target.value === '__new__') {
                            setShowQuickAddPlate(true);
                          } else {
                            setForm({ ...form, vehicle_plate: e.target.value });
                          }
                        }}
                        className="form-select w-full font-bold border-orange-200 focus:border-orange-500 focus:ring-orange-500/20 animate-fadeIn"
                        required
                      >
                        <option value="" disabled>Sélectionner une plaque...</option>
                        {vehiclePlates.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__new__" className="text-orange-600 font-bold">+ Enregistrer une nouvelle plaque</option>
                      </select>

                      {showQuickAddPlate && (
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2 animate-fadeIn">
                          <label className="text-xs font-bold text-orange-800">Ajouter et enregistrer une plaque</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ex: 12345-A-66"
                              value={quickPlate}
                              onChange={e => setQuickPlate(e.target.value.toUpperCase())}
                              className="form-input text-sm font-bold uppercase w-full bg-white"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddPlate(false);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleQuickAddPlate(false)}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                              Ajouter
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowQuickAddPlate(false)}
                              className="px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-dark text-sm rounded-lg transition-colors whitespace-nowrap"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="form-label">Sous-catégorie *</label>
                    <select 
                      value={form.subcategory} 
                      onChange={e => setForm({ ...form, subcategory: e.target.value })}
                      className="form-select w-full"
                    >
                      {EXPENSE_GROUPS.find(g => g.id === form.group_name)?.variable.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {form.subcategory === 'Autres dépenses' && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="form-label">Nom de la dépense *</label>
                      <input 
                        type="text" 
                        required 
                        value={form.custom_subcategory} 
                        onChange={e => setForm({ ...form, custom_subcategory: e.target.value })} 
                        className="form-input w-full font-bold border-red-200 focus:border-red-500 focus:ring-red-500/20" 
                        placeholder="Ex: Achat café, Fournitures de bureau..." 
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="form-label">
                      {form.subcategory === 'Autres dépenses' ? 'Prix (MAD) *' : 'Montant (MAD) *'}
                    </label>
                    <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="form-input w-full font-black text-red-600 text-lg" placeholder="0.00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="form-label">Date *</label>
                    <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="form-input w-full" />
                  </div>
                  {form.subcategory !== 'Autres dépenses' && (
                    <>
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="form-label">Référence (N° Facture/Reçu)</label>
                        <input type="text" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="form-input w-full font-bold" placeholder="Ex: FAC-2026-001" />
                      </div>
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="form-label">Notes / Justification</label>
                        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="form-textarea w-full h-24 resize-none" placeholder="Détails de la dépense..." />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving} className="!bg-red-600 shadow-lg shadow-red-500/20">Enregistrer la dépense</Button>
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
              <h2 className="text-xl font-black text-dark uppercase tracking-tight">Modèle de Dépense Fixe</h2>
              <button onClick={() => setShowRecurringModal(false)} className="p-2 hover:bg-surface-100 rounded-xl transition-colors">
                <Plus className="w-5 h-5 text-dark-muted rotate-45" />
              </button>
            </div>
            <form onSubmit={handleRecurringSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="form-label">Groupe *</label>
                    <select 
                      value={recurringForm.group_name} 
                      onChange={e => setRecurringForm({ ...recurringForm, group_name: e.target.value, subcategory: EXPENSE_GROUPS.find(g => g.id === e.target.value).fixed[0], vehicle_plate: '' })}
                      className="form-select w-full"
                    >
                      {EXPENSE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                  {(recurringForm.group_name === 'Voiture' || recurringForm.group_name === 'Moto') && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="form-label">Plaque d'immatriculation / N° Véhicule *</label>
                      <select 
                        value={recurringForm.vehicle_plate || ''} 
                        onChange={e => {
                          if (e.target.value === '__new__') {
                            setShowQuickAddPlateRecurring(true);
                          } else {
                            setRecurringForm({ ...recurringForm, vehicle_plate: e.target.value });
                          }
                        }}
                        className="form-select w-full font-bold border-orange-200 focus:border-orange-500 focus:ring-orange-500/20 animate-fadeIn"
                        required
                      >
                        <option value="" disabled>Sélectionner une plaque...</option>
                        {vehiclePlates.map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__new__" className="text-orange-600 font-bold">+ Enregistrer une nouvelle plaque</option>
                      </select>

                      {showQuickAddPlateRecurring && (
                        <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2 animate-fadeIn">
                          <label className="text-xs font-bold text-orange-800">Ajouter et enregistrer une plaque</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Ex: 12345-A-66"
                              value={quickPlate}
                              onChange={e => setQuickPlate(e.target.value.toUpperCase())}
                              className="form-input text-sm font-bold uppercase w-full bg-white"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleQuickAddPlate(true);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleQuickAddPlate(true)}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                            >
                              Ajouter
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowQuickAddPlateRecurring(false)}
                              className="px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-dark text-sm rounded-lg transition-colors whitespace-nowrap"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="form-label">Type de dépense *</label>
                    <select 
                      value={recurringForm.subcategory} 
                      onChange={e => setRecurringForm({ ...recurringForm, subcategory: e.target.value })}
                      className="form-select w-full"
                    >
                      {EXPENSE_GROUPS.find(g => g.id === recurringForm.group_name)?.fixed.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="form-label">Montant Mensuel (MAD) *</label>
                    <input type="number" step="0.01" required value={recurringForm.amount} onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })} className="form-input w-full font-black text-primary-600 text-lg" placeholder="0.00" />
                  </div>
                   <div className="md:col-span-2 space-y-1.5">
                    <label className="form-label">
                      {recurringForm.subcategory === 'Employée' ? "Nom de l'employé(e) *" :
                       (recurringForm.subcategory === 'Moniteur pratique' || recurringForm.subcategory === 'Moniteur théorique') ? "Nom du moniteur *" :
                       "Nom / Détails (Optionnel)"}
                    </label>
                    <input 
                      type="text" 
                      required={['Employée', 'Moniteur pratique', 'Moniteur théorique'].includes(recurringForm.subcategory)}
                      value={recurringForm.notes} 
                      onChange={e => setRecurringForm({ ...recurringForm, notes: e.target.value })} 
                      className={`form-input w-full font-bold ${['Employée', 'Moniteur pratique', 'Moniteur théorique'].includes(recurringForm.subcategory) ? 'border-primary-200 focus:border-primary-500 focus:ring-primary-500/20' : ''}`}
                      placeholder={
                        recurringForm.subcategory === 'Employée' ? "Ex: Mme. Fatima, M. Ahmed..." :
                        (recurringForm.subcategory === 'Moniteur pratique' || recurringForm.subcategory === 'Moniteur théorique') ? "Ex: M. Rachid, M. Youssef..." :
                        "Ex: Immeuble X (Loyer), Agence Y..."
                      } 
                    />
                  </div>
                </div>

                <div className="p-5 bg-primary-50/50 border border-primary-100 rounded-2xl flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary-600 shadow-sm flex-shrink-0">
                    <Info size={20} />
                  </div>
                  <p className="text-xs text-primary-800 leading-relaxed font-bold uppercase tracking-wider">
                    Automatisation Active: Cette dépense sera générée chaque 1er du mois dans votre journal.
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <Button type="button" variant="secondary" onClick={() => setShowRecurringModal(false)}>Annuler</Button>
                <Button type="submit" loading={saving} className="!bg-primary-600 shadow-lg shadow-primary-500/20">Activer l'automatisation</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
