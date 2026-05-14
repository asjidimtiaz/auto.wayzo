'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { formatCurrency, today } from '@/lib/utils';
import { useNotification } from '@/lib/notification';

export default function CalculatorPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentDocuments, setStudentDocuments] = useState([]);

  // Salaries Calculator
  const [salaryForm, setSalaryForm] = useState({
    name: '',
    base: '',
    overtimeHours: '',
    overtimeRate: '',
    deductions: '',
    month: new Date().toISOString().substring(0, 7)
  });

  // Utilities Calculator
  const [utilityForm, setUtilityForm] = useState({
    type: 'Eau',
    oldReading: '',
    newReading: '',
    unitPrice: '4.50',
    standingCharge: '15.00'
  });

  // Tax Calculator
  const [taxForm, setTaxForm] = useState({
    type: 'TVA',
    basis: '',
    rate: '20'
  });

  // Student Payment Calculator
  const [studentForm, setStudentForm] = useState({
    student_id: '',
    installments: '3'
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Cash',
    notes: ''
  });

  useEffect(() => {
    api.students.getAll().then(data => {
      setStudents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (studentForm.student_id) {
      api.documents.getByStudent(studentForm.student_id).then(setStudentDocuments).catch(() => setStudentDocuments([]));
    } else {
      setStudentDocuments([]);
    }
  }, [studentForm.student_id]);

  // --- Calculations ---

  const salaryNet = useMemo(() => {
    const b = parseFloat(salaryForm.base || 0);
    const oh = parseFloat(salaryForm.overtimeHours || 0);
    const or = parseFloat(salaryForm.overtimeRate || 0);
    const d = parseFloat(salaryForm.deductions || 0);
    return b + (oh * or) - d;
  }, [salaryForm]);

  const utilityTotal = useMemo(() => {
    const o = parseFloat(utilityForm.oldReading || 0);
    const n = parseFloat(utilityForm.newReading || 0);
    const p = parseFloat(utilityForm.unitPrice || 0);
    const s = parseFloat(utilityForm.standingCharge || 0);
    const consumption = Math.max(0, n - o);
    return (consumption * p) + s;
  }, [utilityForm]);

  const taxAmount = useMemo(() => {
    const b = parseFloat(taxForm.basis || 0);
    const r = parseFloat(taxForm.rate || 0);
    return (b * r) / 100;
  }, [taxForm]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === parseInt(studentForm.student_id));
  }, [students, studentForm.student_id]);

  const studentInstallments = useMemo(() => {
    if (!selectedStudent) return [];
    const remaining = selectedStudent.total_price - selectedStudent.paid_amount;
    const count = parseInt(studentForm.installments || 1);
    const amount = remaining / count;
    const list = [];
    const baseDate = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i + 1);
      list.push({
        num: i + 1,
        amount: amount,
        due: d.toISOString().split('T')[0]
      });
    }
    return list;
  }, [selectedStudent, studentForm.installments]);

  // --- Wiring / Data Fetching ---

  const [stats, setStats] = useState(null);
  const [lastUtility, setLastUtility] = useState(null);

  useEffect(() => {
    // Load dashboard stats for revenue-based tax calculation
    api.dashboard.getStats().then(setStats).catch(() => {});
    
    // Load last utility reading
    api.expenses.getAll().then(list => {
      if (Array.isArray(list)) {
        const water = list.find(e => e.subcategory?.includes('Eau'));
        const elec = list.find(e => e.subcategory?.includes('Élec'));
        setLastUtility({ water, elec });
      }
    });
  }, []);

  const fillLastReading = (type) => {
    const item = type === 'Eau' ? lastUtility?.water : lastUtility?.elec;
    if (item && item.notes) {
      const match = item.notes.match(/Index: (\d+)/);
      if (match) {
        setUtilityForm(f => ({ ...f, oldReading: match[1] }));
        notify.info(`Dernier index ${type} récupéré: ${match[1]}`);
      }
    } else {
      notify.warning('Aucun index précédent trouvé');
    }
  };

  const useMonthlyRevenue = () => {
    if (stats?.monthlyRevenue) {
      setTaxForm(f => ({ ...f, basis: stats.monthlyRevenue }));
      notify.info(`Chiffre d'affaires du mois utilisé: ${formatCurrency(stats.monthlyRevenue)}`);
    }
  };

  // --- Actions ---

  const addExpense = async (category, subcategory, amount, notes) => {
    if (amount <= 0) return notify.error('Le montant doit être supérieur à 0');
    setSaving(true);
    try {
      await api.expenses.create({
        category,
        subcategory,
        amount,
        date: today(),
        notes
      });
      notify.success('Enregistré dans les dépenses');
    } catch {
      notify.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const saveSchedules = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await api.paymentSchedules.create(selectedStudent.id, studentInstallments.map(i => ({
        amount: i.amount,
        due_date: i.due
      })));
      notify.success('Plan de paiement enregistré');
    } catch {
      notify.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const generateContract = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const res = await api.contracts.generate(selectedStudent.id);
      if (res.success) {
        notify.success('Contrat généré');
        window.open(res.path, '_blank');
        // Refresh documents list
        api.documents.getByStudent(selectedStudent.id).then(setStudentDocuments);
      } else {
        notify.error('Erreur lors de la génération');
      }
    } catch {
      notify.error('Erreur lors de la génération');
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async () => {
    if (!selectedStudent || !paymentForm.amount) return notify.error('Veuillez saisir un montant');
    setSaving(true);
    try {
      const res = await api.payments.create({
        student_id: parseInt(studentForm.student_id),
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        payment_date: today(),
        notes: paymentForm.notes
      });
      if (res.id) {
        notify.success('Paiement enregistré');
        try {
          const recu = await api.payments.generateReceipt(res.id);
          if (recu.success) {
            window.open(recu.path, '_blank');
            // Refresh documents list
            api.documents.getByStudent(studentForm.student_id).then(setStudentDocuments);
          }
        } catch (e) {
          console.error('Receipt generation failed', e);
        }
        const data = await api.students.getAll();
        setStudents(Array.isArray(data) ? data : []);
        setPaymentForm({ amount: '', method: 'Cash', notes: '' });
      }
    } catch {
      notify.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Calculateurs Financiers
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Outils d'aide à la décision et de calcul rapide.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Salary Calculator */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-dark">Calculateur de Salaire</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Employé</label>
                <input type="text" value={salaryForm.name} onChange={e => setSalaryForm({...salaryForm, name: e.target.value})} className="form-input" placeholder="Nom..." />
              </div>
              <div>
                <label className="form-label">Mois</label>
                <input type="month" value={salaryForm.month} onChange={e => setSalaryForm({...salaryForm, month: e.target.value})} className="form-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Salaire de Base (MAD)</label>
                <input type="number" value={salaryForm.base} onChange={e => setSalaryForm({...salaryForm, base: e.target.value})} className="form-input" placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Déductions (MAD)</label>
                <input type="number" value={salaryForm.deductions} onChange={e => setSalaryForm({...salaryForm, deductions: e.target.value})} className="form-input" placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Heures Sup.</label>
                <input type="number" value={salaryForm.overtimeHours} onChange={e => setSalaryForm({...salaryForm, overtimeHours: e.target.value})} className="form-input" placeholder="0" />
              </div>
              <div>
                <label className="form-label">Taux Heure Sup.</label>
                <input type="number" value={salaryForm.overtimeRate} onChange={e => setSalaryForm({...salaryForm, overtimeRate: e.target.value})} className="form-input" placeholder="0.00" />
              </div>
            </div>

            <div className="p-4 bg-accent-blue/5 rounded-2xl border border-accent-blue/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-accent-blue uppercase tracking-wider mb-1">Salaire Net à Payer</p>
                <p className="text-2xl font-bold text-dark">{formatCurrency(salaryNet)}</p>
              </div>
              <Button 
                onClick={() => addExpense('employee', 'Salaire', salaryNet, `Salaire ${salaryForm.name} - ${salaryForm.month}`)}
                loading={saving}
                disabled={salaryNet <= 0}
                variant="secondary"
                className="!bg-white"
              >
                Enregistrer Dépense
              </Button>
            </div>
          </div>
        </Card>

        {/* Utilities Calculator */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-yellow/10 flex items-center justify-center text-accent-yellow">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-dark">Calculateur Eau / Élec</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Type de Facture</label>
              <div className="flex gap-2">
                {['Eau', 'Électricité'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setUtilityForm({...utilityForm, type: t})}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${utilityForm.type === t ? 'bg-accent-yellow border-accent-yellow text-white shadow-lg shadow-accent-yellow/20' : 'bg-white border-surface-200 text-dark-muted hover:bg-surface-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label flex justify-between">
                  Ancien Index
                  <button onClick={() => fillLastReading(utilityForm.type)} className="text-[10px] text-primary-500 hover:underline">Récupérer dernier</button>
                </label>
                <input type="number" value={utilityForm.oldReading} onChange={e => setUtilityForm({...utilityForm, oldReading: e.target.value})} className="form-input" placeholder="0" />
              </div>
              <div>
                <label className="form-label">Nouvel Index</label>
                <input type="number" value={utilityForm.newReading} onChange={e => setUtilityForm({...utilityForm, newReading: e.target.value})} className="form-input" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Prix Unitaire (MAD)</label>
                <input type="number" step="0.01" value={utilityForm.unitPrice} onChange={e => setUtilityForm({...utilityForm, unitPrice: e.target.value})} className="form-input" />
              </div>
              <div>
                <label className="form-label">Frais Fixes (MAD)</label>
                <input type="number" step="0.01" value={utilityForm.standingCharge} onChange={e => setUtilityForm({...utilityForm, standingCharge: e.target.value})} className="form-input" />
              </div>
            </div>

            <div className="p-4 bg-accent-yellow/5 rounded-2xl border border-accent-yellow/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-accent-yellow uppercase tracking-wider mb-1">Montant Total Facture</p>
                <p className="text-2xl font-bold text-dark">{formatCurrency(utilityTotal)}</p>
              </div>
              <Button 
                onClick={() => addExpense('admin', `Facture ${utilityForm.type}`, utilityTotal, `Consommation ${utilityForm.newReading - utilityForm.oldReading} unités. Index: ${utilityForm.newReading}`)}
                loading={saving}
                disabled={utilityTotal <= 0}
                variant="secondary"
                className="!bg-white"
              >
                Enregistrer Dépense
              </Button>
            </div>
          </div>
        </Card>

        {/* Tax Calculator */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center text-accent-red">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-dark">Calculateur de Taxes</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="form-label">Type de Taxe</label>
              <input type="text" value={taxForm.type} onChange={e => setTaxForm({...taxForm, type: e.target.value})} className="form-input" placeholder="TVA, Impôt..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label flex justify-between">
                  Base de Calcul (MAD)
                  <button onClick={useMonthlyRevenue} className="text-[10px] text-primary-500 hover:underline">Utiliser CA du mois</button>
                </label>
                <input type="number" value={taxForm.basis} onChange={e => setTaxForm({...taxForm, basis: e.target.value})} className="form-input" placeholder="0.00" />
              </div>
              <div>
                <label className="form-label">Taux (%)</label>
                <input type="number" value={taxForm.rate} onChange={e => setTaxForm({...taxForm, rate: e.target.value})} className="form-input" />
              </div>
            </div>

            <div className="p-4 bg-accent-red/5 rounded-2xl border border-accent-red/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-accent-red uppercase tracking-wider mb-1">Montant Taxe</p>
                <p className="text-2xl font-bold text-dark">{formatCurrency(taxAmount)}</p>
              </div>
              <Button 
                onClick={() => addExpense('tax', taxForm.type, taxAmount, `Calculé sur base de ${taxForm.basis} MAD`)}
                loading={saving}
                disabled={taxAmount <= 0}
                variant="secondary"
                className="!bg-white"
              >
                Enregistrer Dépense
              </Button>
            </div>
          </div>
        </Card>

        {/* Student Installment Calculator */}
        <Card id="payment-plan" className="lg:col-span-2 overflow-hidden border-t-4 border-accent-green">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center text-accent-green">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-dark tracking-tight">Plan de Paiement & Contrats</h2>
                <p className="text-xs text-dark-muted font-medium">Gérez les mensualités et générez les documents officiels</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1 space-y-4">
                <div>
                  <label className="form-label">Sélectionner l'étudiant</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <select 
                      value={studentForm.student_id} 
                      onChange={e => setStudentForm({...studentForm, student_id: e.target.value})} 
                      className="form-select !pl-11"
                    >
                      <option value="">Sélectionner...</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Nombre d'échéances</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <input type="number" min="1" max="12" value={studentForm.installments} onChange={e => setStudentForm({...studentForm, installments: e.target.value})} className="form-input !pl-11" />
                  </div>
                </div>

                {selectedStudent && (
                  <div className="p-4 bg-accent-green/5 rounded-2xl border border-accent-green/10">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-accent-green uppercase tracking-widest">Reste à payer</span>
                      <span className="text-xl font-black text-accent-green">{formatCurrency(selectedStudent.total_price - selectedStudent.paid_amount)}</span>
                    </div>
                  </div>
                )}

                {/* New Documents List Section */}
                {selectedStudent && (
                  <div className="pt-4 border-t border-surface-100">
                    <h3 className="text-[10px] font-black text-dark-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      Derniers Documents
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {studentDocuments.length === 0 ? (
                        <p className="text-[10px] text-dark-muted italic py-4 text-center">Aucun document généré</p>
                      ) : (
                        studentDocuments.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-surface-100 shadow-sm group hover:border-accent-green/30 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-accent-green/5 flex items-center justify-center text-accent-green flex-shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-dark truncate">{doc.name || doc.title}</p>
                                <p className="text-[9px] text-dark-muted">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => window.open(`/api/files/view?path=${encodeURIComponent(doc.file_path || doc.path)}`, '_blank')}
                              className="p-1.5 rounded-lg bg-surface-50 text-dark-muted hover:bg-accent-green hover:text-white transition-all"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                {selectedStudent ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-dark-muted uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        Calendrier Prévu
                      </h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {studentInstallments.map(i => (
                          <div key={i.num} className="flex items-center justify-between p-3 bg-white rounded-xl border border-surface-100 shadow-sm">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-surface-100 flex items-center justify-center text-[10px] font-black text-dark-muted">{i.num}</span>
                              <span className="text-sm font-bold text-dark">{formatCurrency(i.amount)}</span>
                            </div>
                            <span className="text-xs text-dark-muted font-medium">{new Date(i.due).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveSchedules} loading={saving} className="flex-1 !rounded-xl">
                          Appliquer
                        </Button>
                        <Button onClick={generateContract} loading={saving} variant="secondary" className="flex-1 !rounded-xl" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}>
                          Contrat
                        </Button>
                      </div>
                    </div>

                    <div className="p-5 bg-surface-50 rounded-[2rem] border border-surface-200 space-y-4">
                      <h3 className="text-xs font-black text-dark uppercase tracking-widest text-center">Nouveau Règlement</h3>
                      <div className="space-y-3">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-dark-muted">
                            <span className="text-xs font-bold">MAD</span>
                          </div>
                          <input 
                            type="number" 
                            placeholder="Montant" 
                            className="form-input !pl-14 !h-12 !text-lg !font-bold" 
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                          />
                        </div>
                        <select 
                          className="form-select !h-12 !font-bold"
                          value={paymentForm.method}
                          onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                        >
                          <option value="Cash">💵 Espèces</option>
                          <option value="Transfer">🏦 Virement</option>
                          <option value="Cheque">✍️ Chèque</option>
                          <option value="TPE">💳 Carte</option>
                        </select>
                        <textarea 
                          placeholder="Notes ou référence..."
                          className="form-input !h-20 py-3 text-sm"
                          value={paymentForm.notes}
                          onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}
                        />
                        <Button 
                          onClick={recordPayment}
                          loading={saving}
                          className="w-full !h-14 !rounded-2xl !bg-accent-green !text-white !border-none hover:!bg-accent-green/90 shadow-lg shadow-accent-green/20"
                          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        >
                          Enregistrer & Reçu
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-surface-200 rounded-[2.5rem] bg-surface-50/50">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-soft flex items-center justify-center text-surface-300 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <p className="text-sm text-dark-muted font-medium italic">Sélectionnez un étudiant pour simuler ses mensualités et gérer ses documents</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
