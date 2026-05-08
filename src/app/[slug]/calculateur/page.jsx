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

  useEffect(() => {
    api.students.getAll().then(data => {
      setStudents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

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

  return (
    <div className="animate-fadeIn space-y-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Calculateurs Financiers</h1>
        <p className="text-sm text-dark-muted">Outils d'aide à la décision et de calcul rapide</p>
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
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center text-accent-green">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-lg font-bold text-dark">Plan de Paiement Étudiant</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Étudiant</label>
                <select 
                  value={studentForm.student_id} 
                  onChange={e => setStudentForm({...studentForm, student_id: e.target.value})} 
                  className="form-select"
                >
                  <option value="">Sélectionner...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Nombre d'échéances</label>
                <input type="number" min="1" max="12" value={studentForm.installments} onChange={e => setStudentForm({...studentForm, installments: e.target.value})} className="form-input" />
              </div>
            </div>

            {selectedStudent ? (
              <div className="p-4 bg-surface-50 rounded-2xl border border-surface-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-dark-muted uppercase">Reste à payer</span>
                  <span className="text-lg font-bold text-accent-red">{formatCurrency(selectedStudent.total_price - selectedStudent.paid_amount)}</span>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {studentInstallments.map(i => (
                    <div key={i.num} className="flex items-center justify-between p-2 bg-white rounded-lg border border-surface-100 text-xs">
                      <span className="font-bold text-dark">Échéance {i.num}</span>
                      <span className="font-bold text-primary-500">{formatCurrency(i.amount)}</span>
                      <span className="text-dark-muted italic">{i.due}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-surface-200">
                  <Button 
                    onClick={saveSchedules}
                    loading={saving}
                    className="w-full"
                  >
                    Appliquer le Plan de Paiement
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-surface-200 rounded-2xl">
                <p className="text-sm text-dark-muted italic">Sélectionnez un étudiant pour simuler ses mensualités</p>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
