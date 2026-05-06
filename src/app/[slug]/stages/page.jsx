'use client';
import { useState, useEffect, useCallback } from 'react';
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
import { formatDate, formatDuration, today } from '@/lib/utils';

const STAGE_TYPES = ['Séance', 'Examen', 'Code', 'Plateau'];
const STAGE_STATUS = ['Planifié', 'Terminé', 'Réussi', 'Échoué', 'Annulé'];
const FORM_DEFAULT = {
  student_id: '', type: 'Séance', title: '', scheduled_date: today(),
  scheduled_time: '', duration_minutes: 60, status: 'Planifié', notes: '',
};
const TYPE_BADGE = { Séance: 'info', Examen: 'warning', Code: 'purple', Plateau: 'success' };
const STATUS_BADGE = { Planifié: 'info', Terminé: 'gray', Réussi: 'success', Échoué: 'danger', Annulé: 'gray' };

export default function StagesPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const { confirmDelete } = useConfirm();
  const [stages, setStages] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStage, setEditStage] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, s, ss] = await Promise.all([api.stages.getAll(), api.students.getAll(), api.stages.getSessionTimeStats()]);
      setStages(Array.isArray(st) ? st : []);
      setStudents(Array.isArray(s) ? s : []);
      if (ss && !ss.error) setSessionStats(ss);
    } catch { notify.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterStatus]);

  const filtered = stages.filter(s => {
    const q = search.toLowerCase();
    return (!q || s.full_name?.toLowerCase().includes(q) || s.title?.toLowerCase().includes(q))
      && (!filterType || s.type === filterType)
      && (!filterStatus || s.status === filterStatus);
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStages = filtered.slice(indexOfFirstItem, indexOfLastItem);

  function F(key) { return { value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) }; }
  function openAdd() { setEditStage(null); setForm(FORM_DEFAULT); setShowModal(true); }
  function openEdit(s) {
    setEditStage(s);
    setForm({ student_id: s.student_id, type: s.type, title: s.title, scheduled_date: s.scheduled_date, scheduled_time: s.scheduled_time || '', duration_minutes: s.duration_minutes || 60, status: s.status, notes: s.notes || '' });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const data = { ...form, student_id: parseInt(form.student_id), duration_minutes: parseInt(form.duration_minutes) };
      if (editStage) { await api.stages.update(editStage.id, data); notify.success('Stage modifié'); }
      else { await api.stages.create(data); notify.success('Stage créé'); }
      setShowModal(false); await load();
    } catch { notify.error('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  }

  async function handleDelete(stage) {
    const ok = await confirmDelete(stage.title || stage.full_name);
    if (!ok) return;
    try { await api.stages.delete(stage.id); notify.success('Stage supprimé'); await load(); }
    catch { notify.error('Erreur lors de la suppression'); }
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-dark-muted tracking-wider uppercase">Planning</p>
          <h1 className="text-2xl font-bold text-dark">Stages & Examens</h1>
        </div>
        <Button onClick={openAdd} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Nouveau stage
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Séances', value: filtered.length, color: 'text-primary-500', bg: 'bg-primary-50', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          { label: 'Heures de Formation', value: sessionStats ? formatDuration(sessionStats.totalMinutes) : '0h', color: 'text-accent-green', bg: 'bg-accent-green/10', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Examens Réussis', value: stages.filter(s => s.status === 'Réussi').length, color: 'text-accent-blue', bg: 'bg-accent-blue/10', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Examens Échoués', value: stages.filter(s => s.status === 'Échoué').length, color: 'text-accent-red', bg: 'bg-accent-red/10', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl shadow-soft p-6 flex items-center justify-between group hover:shadow-card transition-all">
            <div>
              <p className="text-xs font-bold text-dark-muted mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center`}>
              <svg className={`w-6 h-6 ${s.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4" padding="sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="form-input pl-9" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-select w-auto">
            <option value="">Tous les types</option>
            {STAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-select w-auto">
            <option value="">Tous les statuts</option>
            {STAGE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} title="Aucun stage" description="Commencez par planifier une séance ou un examen." onAction={openAdd} actionLabel="Nouveau stage" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Étudiant', 'Stage', 'Type', 'Date & Heure', 'Durée', 'Statut', ''].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-dark-muted uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {currentStages.map(s => (
                  <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/${slug}/students/${s.student_id}`} className="text-sm font-medium text-dark hover:text-primary-500 transition-colors">{s.full_name}</Link>
                      {s.phone && <p className="text-xs text-dark-muted">{s.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-light">{s.title}</td>
                    <td className="px-4 py-3"><Badge variant={TYPE_BADGE[s.type] || 'gray'}>{s.type}</Badge></td>
                    <td className="px-4 py-3 text-sm text-dark-light">{formatDate(s.scheduled_date)}{s.scheduled_time ? ` ${s.scheduled_time}` : ''}</td>
                    <td className="px-4 py-3 text-sm text-dark-light">{formatDuration(s.duration_minutes)}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[s.status] || 'gray'}>{s.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-primary-500/10 text-dark-muted hover:text-primary-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-accent-red/10 text-dark-muted hover:text-accent-red transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark">{editStage ? 'Modifier le stage' : 'Nouveau stage'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                <div><label className="form-label">Étudiant *</label><select {...F('student_id')} required className="form-select"><option value="">Sélectionner</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
                <div><label className="form-label">Type *</label><select {...F('type')} required className="form-select">{STAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="form-label">Titre *</label><input {...F('title')} required className="form-input" placeholder="Description du stage" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Date *</label><input type="date" {...F('scheduled_date')} required className="form-input" /></div>
                  <div><label className="form-label">Heure</label><input type="time" {...F('scheduled_time')} className="form-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Durée (min)</label><input type="number" min="15" {...F('duration_minutes')} className="form-input" /></div>
                  <div><label className="form-label">Statut</label><select {...F('status')} className="form-select">{STAGE_STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div><label className="form-label">Notes</label><textarea {...F('notes')} rows={2} className="form-textarea resize-none" /></div>
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
