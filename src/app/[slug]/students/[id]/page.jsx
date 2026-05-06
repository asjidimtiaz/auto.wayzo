'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';
import { formatDate, formatCurrency, formatDuration, today } from '@/lib/utils';

const TABS = ['Informations', 'Paiements', 'Présences', 'Stages', 'Documents', 'Incidents'];
const STATUS_BADGE = { 'En formation': 'info', 'Permis obtenu': 'success', 'Suspendu': 'warning', 'Abandonné': 'danger' };
const TYPE_BADGE = { Séance: 'info', Examen: 'warning', Code: 'purple', Plateau: 'success' };
const STATUS_STAGE_BADGE = { Planifié: 'info', Terminé: 'gray', Réussi: 'success', Échoué: 'danger', Annulé: 'gray' };

export default function StudentDetailPage() {
  const { slug, id } = useParams();
  const router = useRouter();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Informations');

  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [stages, setStages] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);

  // Pagination states
  const [pagePay, setPagePay] = useState(1);
  const [pageAtt, setPageAtt] = useState(1);
  const [pageStages, setPageStages] = useState(1);
  const itemsPerPage = 10;

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'Cash', payment_date: today(), notes: '' });
  const [payLoading, setPayLoading] = useState(false);

  // Stage modal
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageForm, setStageForm] = useState({ type: 'Séance', title: '', scheduled_date: today(), scheduled_time: '', duration_minutes: 60, status: 'Planifié', notes: '' });
  const [stageLoading, setStageLoading] = useState(false);

  // Incident modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ type: '', severity: 'Avertissement', description: '', date: today() });
  const [incidentLoading, setIncidentLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.students.getById(id);
      if (!s || s.error) { router.push(`/${slug}/students`); return; }
      setStudent(s);
      setPayments(s.payments || []);
      setAttendance(s.attendance || []);
    } catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, [id, slug, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'Stages') {
      api.stages.getByStudent(id).then(d => setStages(Array.isArray(d) ? d : [])).catch(() => {});
      api.stages.getStudentSessionTimeStats(id).then(setSessionStats).catch(() => {});
    }
    if (activeTab === 'Paiements') {
      api.paymentSchedules.getByStudent(id).then(d => setSchedules(Array.isArray(d) ? d : [])).catch(() => {});
    }
    if (activeTab === 'Incidents') {
      api.incidents.getByStudent(id).then(d => setIncidents(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [activeTab, id]);

  async function handlePaySubmit(e) {
    e.preventDefault(); setPayLoading(true);
    try {
      await api.payments.create({ ...payForm, student_id: parseInt(id), amount: parseFloat(payForm.amount) });
      notify.success('Paiement enregistré');
      setShowPayModal(false);
      await load();
    } catch { notify.error('Erreur lors de l\'enregistrement'); }
    finally { setPayLoading(false); }
  }

  async function handleDeletePayment(payment) {
    const ok = await confirmDelete(`le paiement de ${formatCurrency(payment.amount)}`);
    if (!ok) return;
    try { await api.payments.delete(payment.id); notify.success('Paiement supprimé'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  async function handleStageSubmit(e) {
    e.preventDefault(); setStageLoading(true);
    try {
      await api.stages.create({ ...stageForm, student_id: parseInt(id), duration_minutes: parseInt(stageForm.duration_minutes) });
      notify.success('Stage créé');
      setShowStageModal(false);
      const s = await api.stages.getByStudent(id); setStages(Array.isArray(s) ? s : []);
    } catch { notify.error('Erreur lors de la création'); }
    finally { setStageLoading(false); }
  }

  async function handleIncidentSubmit(e) {
    e.preventDefault(); setIncidentLoading(true);
    try {
      await api.incidents.create({ ...incidentForm, student_id: parseInt(id) });
      notify.success('Incident signalé');
      setShowIncidentModal(false);
      const inc = await api.incidents.getByStudent(id); setIncidents(Array.isArray(inc) ? inc : []);
    } catch { notify.error('Erreur lors du signalement'); }
    finally { setIncidentLoading(false); }
  }

  if (loading) return (
    <div className="animate-fadeIn space-y-4">
      <div className="h-20 bg-white rounded-2xl shadow-soft animate-pulse" />
      <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl shadow-soft animate-pulse" />)}</div>
      <div className="h-64 bg-white rounded-2xl shadow-soft animate-pulse" />
    </div>
  );

  if (!student) return null;

  const paid = parseFloat(student.paid_amount || 0);
  const total = parseFloat(student.total_price || 0);
  const balance = total - paid;
  const paymentPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href={`/${slug}/students`} className="p-2 rounded-xl bg-white shadow-soft text-dark-muted hover:text-dark hover:shadow-card transition-all mt-0.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-primary-500">{student.full_name?.substring(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark">{student.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs font-mono text-dark-muted">{student.qr_code}</span>
                <Badge variant={STATUS_BADGE[student.status] || 'gray'}>{student.status}</Badge>
                <Badge variant="primary">Permis {student.license_type}</Badge>
                {student.license_obtained && <Badge variant="success">Permis obtenu</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total formation', value: formatCurrency(total), color: 'primary' },
          { label: 'Versé', value: formatCurrency(paid), color: 'success' },
          { label: 'Restant', value: balance > 0 ? formatCurrency(balance) : 'Soldé', color: balance > 0 ? 'danger' : 'success' },
          { label: 'Présences', value: attendance.length, color: 'info' },
        ].map(s => {
          const colors = { primary: 'border-primary-500 text-primary-500', success: 'border-accent-green text-accent-green', danger: 'border-accent-red text-accent-red', info: 'border-accent-blue text-accent-blue' };
          return (
            <div key={s.label} className={`bg-white rounded-2xl shadow-soft p-4 border-l-4 ${colors[s.color].split(' ')[0]}`}>
              <p className="text-xs text-dark-muted mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${colors[s.color].split(' ')[1]}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Payment progress */}
      {total > 0 && (
        <Card className="mb-4" padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-dark">Progression paiement</span>
            <span className="text-sm font-bold text-primary-500">{paymentPct.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${paymentPct}%`, background: 'linear-gradient(90deg, #6C5CE7, #4834D4)' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-dark-muted">
            <span>{formatCurrency(paid)} versé</span>
            <span>{formatCurrency(balance > 0 ? balance : 0)} restant</span>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <Card padding="none">
        <div className="flex border-b border-surface-200 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${activeTab === tab ? 'border-primary-500 text-primary-500' : 'border-transparent text-dark-muted hover:text-dark'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Informations ── */}
          {activeTab === 'Informations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {[
                ['Nom complet', student.full_name],
                ['CIN', student.cin || '—'],
                ['Téléphone', student.phone || '—'],
                ['Date de naissance', formatDate(student.birth_date)],
                ['Lieu de naissance', student.birth_place || '—'],
                ['Adresse', student.address || '—'],
                ['Ville', student.ville || '—'],
                ['Type de permis', student.license_type],
                ['Statut', student.status],
                ['Date inscription', formatDate(student.registration_date)],
                ['Début formation', formatDate(student.training_start_date)],
                ['Durée formation', `${student.training_duration_days || 30} jours`],
                ['Prix total', formatCurrency(total)],
                ['Offre', student.offer_name || '—'],
                ['Date de rappel', student.reminder_date ? formatDate(student.reminder_date) : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-xs font-semibold text-dark-muted uppercase tracking-wider">{label}</span>
                  <p className="text-sm text-dark mt-0.5">{value}</p>
                </div>
              ))}
              {student.internal_notes && (
                <div className="md:col-span-2">
                  <span className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Notes internes</span>
                  <p className="text-sm text-dark mt-1 p-3 bg-surface-50 rounded-xl">{student.internal_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Paiements ── */}
          {activeTab === 'Paiements' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-dark">Historique des paiements</h3>
                <Button size="sm" onClick={() => { setPayForm({ amount: '', payment_method: 'Cash', payment_date: today(), notes: '' }); setShowPayModal(true); }}>
                  + Ajouter
                </Button>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-8">Aucun paiement enregistré</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {payments.slice((pagePay-1)*itemsPerPage, pagePay*itemsPerPage).map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-accent-green/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" /></svg>
                          </div>
                          <div>
                            <span className="text-sm font-bold text-accent-green">{formatCurrency(p.amount)}</span>
                            <span className="text-xs text-dark-muted ml-2">{p.payment_method}</span>
                            {p.notes && <p className="text-xs text-dark-muted">{p.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-dark-muted">{formatDate(p.payment_date)}</p>
                          <button onClick={() => handleDeletePayment(p)} className="p-1 rounded-lg hover:bg-accent-red/10 text-dark-muted hover:text-accent-red transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    currentPage={pagePay}
                    totalItems={payments.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setPagePay}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Présences ── */}
          {activeTab === 'Présences' && (
            <div>
              <h3 className="font-semibold text-dark mb-4">Historique des présences ({attendance.length})</h3>
              {attendance.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-8">Aucune présence enregistrée</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {attendance.slice((pageAtt-1)*itemsPerPage, pageAtt*itemsPerPage).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.scan_out_time ? 'bg-dark-muted' : 'bg-accent-green'}`} />
                          <div>
                            <span className="text-sm text-dark">{formatDate(a.date || a.scan_in_time)}</span>
                            <p className="text-xs text-dark-muted">
                              {a.scan_in_time ? new Date(a.scan_in_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                              {a.scan_out_time ? ` → ${new Date(a.scan_out_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant={a.scan_out_time ? 'gray' : 'success'}>{a.scan_out_time ? 'Sorti' : 'Présent'}</Badge>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    currentPage={pageAtt}
                    totalItems={attendance.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setPageAtt}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Stages ── */}
          {activeTab === 'Stages' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-dark">Stages & Examens</h3>
                <Button size="sm" onClick={() => { setStageForm({ type: 'Séance', title: '', scheduled_date: today(), scheduled_time: '', duration_minutes: 60, status: 'Planifié', notes: '' }); setShowStageModal(true); }}>
                  + Ajouter
                </Button>
              </div>
              {sessionStats && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[["Total", sessionStats.total], ["Ce mois", sessionStats.month]].map(([label, data]) => data && (
                    <div key={label} className="bg-primary-500/5 rounded-xl p-3 border border-primary-500/10">
                      <p className="text-xs text-primary-500 mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-primary-600">{formatDuration(parseInt(data.completed_minutes) || 0)}</p>
                      <p className="text-xs text-dark-muted">{data.completed_count || 0} séances</p>
                    </div>
                  ))}
                </div>
              )}
              {stages.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-8">Aucun stage enregistré</p>
              ) : (
                <>
                  <div className="space-y-2">
                    {stages.slice((pageStages-1)*itemsPerPage, pageStages*itemsPerPage).map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors">
                        <Badge variant={TYPE_BADGE[s.type] || 'gray'}>{s.type}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark truncate">{s.title}</p>
                          <p className="text-xs text-dark-muted">{formatDate(s.scheduled_date)}{s.scheduled_time ? ` ${s.scheduled_time}` : ''} · {formatDuration(s.duration_minutes)}</p>
                        </div>
                        <Badge variant={STATUS_STAGE_BADGE[s.status] || 'gray'}>{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                  <Pagination
                    currentPage={pageStages}
                    totalItems={stages.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setPageStages}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Documents ── */}
          {activeTab === 'Documents' && (
            <div className="text-center py-12 text-dark-muted">
              <svg className="w-12 h-12 mx-auto mb-3 text-surface-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-medium text-dark-light">Documents</p>
              <p className="text-xs text-dark-muted mt-1">Les documents générés apparaîtront ici</p>
            </div>
          )}

          {/* ── Incidents ── */}
          {activeTab === 'Incidents' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-dark">Incidents ({incidents.length})</h3>
                <Button size="sm" variant="warning" onClick={() => { setIncidentForm({ type: '', severity: 'Avertissement', description: '', date: today() }); setShowIncidentModal(true); }}>
                  + Signaler
                </Button>
              </div>
              {incidents.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-8">Aucun incident signalé</p>
              ) : (
                <div className="space-y-3">
                  {incidents.map(inc => {
                    const sev = { Grave: 'danger', Moyen: 'warning', Avertissement: 'info' };
                    return (
                      <div key={inc.id} className={`p-4 rounded-xl border-l-4 ${inc.severity === 'Grave' ? 'bg-accent-red/5 border-accent-red' : inc.severity === 'Moyen' ? 'bg-accent-yellow/5 border-accent-yellow' : 'bg-accent-blue/5 border-accent-blue'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-dark">{inc.type}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={sev[inc.severity] || 'gray'}>{inc.severity}</Badge>
                            <span className="text-xs text-dark-muted">{formatDate(inc.date)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-dark-light">{inc.description}</p>
                        {inc.resolved && <p className="text-xs text-accent-green mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Résolu</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Payment modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-base font-bold text-dark">Ajouter un paiement</h2>
              <button onClick={() => setShowPayModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handlePaySubmit}>
              <div className="modal-body space-y-4">
                <div><label className="form-label">Montant (MAD) *</label><input type="number" min="0.01" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required className="form-input" /></div>
                <div><label className="form-label">Méthode *</label><select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} className="form-select">{['Cash', 'Transfer', 'Cheque', 'TPE'].map(m => <option key={m}>{m}</option>)}</select></div>
                <div><label className="form-label">Date *</label><input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} required className="form-input" /></div>
                <div><label className="form-label">Notes</label><input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} className="form-input" /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowPayModal(false)}>Annuler</Button>
                <Button type="submit" loading={payLoading}>Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage modal */}
      {showStageModal && (
        <div className="modal-overlay" onClick={() => setShowStageModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-base font-bold text-dark">Nouveau stage</h2>
              <button onClick={() => setShowStageModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleStageSubmit}>
              <div className="modal-body space-y-3">
                <div><label className="form-label">Type *</label><select value={stageForm.type} onChange={e => setStageForm(f => ({ ...f, type: e.target.value }))} className="form-select">{['Séance', 'Examen', 'Code', 'Plateau'].map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="form-label">Titre *</label><input value={stageForm.title} onChange={e => setStageForm(f => ({ ...f, title: e.target.value }))} required className="form-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Date *</label><input type="date" value={stageForm.scheduled_date} onChange={e => setStageForm(f => ({ ...f, scheduled_date: e.target.value }))} required className="form-input" /></div>
                  <div><label className="form-label">Heure</label><input type="time" value={stageForm.scheduled_time} onChange={e => setStageForm(f => ({ ...f, scheduled_time: e.target.value }))} className="form-input" /></div>
                </div>
                <div><label className="form-label">Durée (min)</label><input type="number" min="15" value={stageForm.duration_minutes} onChange={e => setStageForm(f => ({ ...f, duration_minutes: e.target.value }))} className="form-input" /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowStageModal(false)}>Annuler</Button>
                <Button type="submit" loading={stageLoading}>Créer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incident modal */}
      {showIncidentModal && (
        <div className="modal-overlay" onClick={() => setShowIncidentModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-base font-bold text-dark">Signaler un incident</h2>
              <button onClick={() => setShowIncidentModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleIncidentSubmit}>
              <div className="modal-body space-y-3">
                <div><label className="form-label">Type *</label><input value={incidentForm.type} onChange={e => setIncidentForm(f => ({ ...f, type: e.target.value }))} required placeholder="Ex: Absence injustifiée" className="form-input" /></div>
                <div><label className="form-label">Sévérité</label><select value={incidentForm.severity} onChange={e => setIncidentForm(f => ({ ...f, severity: e.target.value }))} className="form-select">{['Avertissement', 'Moyen', 'Grave'].map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="form-label">Description *</label><textarea value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} required rows={3} className="form-textarea resize-none" /></div>
                <div><label className="form-label">Date *</label><input type="date" value={incidentForm.date} onChange={e => setIncidentForm(f => ({ ...f, date: e.target.value }))} required className="form-input" /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowIncidentModal(false)}>Annuler</Button>
                <Button variant="warning" type="submit" loading={incidentLoading}>Signaler</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
