'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';
import { formatDate } from '@/lib/utils';

export default function PresencesAbsencesPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('journaliere'); // journaliere, historique

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api.students.getAll(),
        api.attendance.getToday()
      ]);
      const realStudents = Array.isArray(s) ? s.filter(st => st.status === 'En formation') : [];
      const realAttendance = Array.isArray(a) ? a : [];
      
      setStudents(realStudents);
      setTodayAttendance(realAttendance);
    } catch {
      setStudents([]);
      setTodayAttendance([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (view === 'historique') {
      const loadHistory = async () => {
        setLoadingHistory(true);
        try {
          const h = await api.attendance.getHistory();
          setHistory(Array.isArray(h) ? h : []);
        } finally {
          setLoadingHistory(false);
        }
      };
      loadHistory();
    }
  }, [view]);

  const presentIds = useMemo(() => new Set(todayAttendance.filter(a => a.time_in && !a.time_out).map(a => a.student_id)), [todayAttendance]);

  const stats = useMemo(() => {
    const total = students.length;
    const presents = presentIds.size;
    const absents = total - presents;
    const rate = total > 0 ? Math.round((presents / total) * 100) : 0;
    return { total, presents, absents, rate };
  }, [students, presentIds]);

  const { presentsList, absentsList } = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = students.filter(s => 
      !q || s.full_name?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q)
    );

    return {
      presentsList: filtered.filter(s => presentIds.has(s.id)),
      absentsList: filtered.filter(s => !presentIds.has(s.id))
    };
  }, [students, search, presentIds]);

  const exportCSV = () => {
    const dataToExport = view === 'journaliere' ? students : history;
    const headers = view === 'journaliere' 
      ? ['Nom complet', 'CIN', 'Téléphone', 'Statut', 'Date']
      : ['Nom complet', 'Date', 'Heure Entrée', 'Heure Sortie', 'Statut'];
    
    const rows = view === 'journaliere'
      ? dataToExport.map(s => [
          `"${s.full_name}"`,
          `"${s.cin || ''}"`,
          `"${s.phone || ''}"`,
          presentIds.has(s.id) ? 'Présent' : 'Absent',
          new Date().toLocaleDateString('fr-FR')
        ])
      : dataToExport.map(h => [
          `"${h.full_name}"`,
          formatDate(h.date),
          h.time_in || '--:--',
          h.time_out || '--:--',
          h.status
        ]);

    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `presences_${view}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(view === 'journaliere' ? 'Suivi des Présences (Aujourd\'hui)' : 'Historique des Présences', 14, 20);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    
    const tableHeaders = view === 'journaliere'
      ? [['Nom complet', 'CIN', 'Téléphone', 'Statut']]
      : [['Nom complet', 'Date', 'Heure Entrée', 'Heure Sortie', 'Statut']];
    
    const tableRows = view === 'journaliere'
      ? students.map(s => [
          s.full_name,
          s.cin || '',
          s.phone || '',
          presentIds.has(s.id) ? 'Présent' : 'Absent'
        ])
      : history.map(h => [
          h.full_name,
          formatDate(h.date),
          h.time_in || '--:--',
          h.time_out || '--:--',
          h.status
        ]);

    autoTable(doc, {
      startY: 40,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
      styles: { fontSize: 9 }
    });
    doc.save(`presences_${view}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Présences & Absences
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Suivi des présences des étudiants en formation</p>
        </div>
        <div className="flex items-center gap-2">
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
                <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">
                  {(view === 'journaliere' ? students : history).length} enregistrement(s)
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => router.push(`/${slug}/attendance`)}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
            className="shadow-lg shadow-purple-500/20 !bg-primary-600"
          >
            Scanner QR
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Étudiants" value={loading ? null : stats.total} loading={loading} color="primary" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <StatCard title="Présents Aujourd'hui" value={loading ? null : stats.presents} loading={loading} color="success" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Absents Aujourd'hui" value={loading ? null : stats.absents} loading={loading} color="danger" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Taux de Présence" value={loading ? null : `${stats.rate}%`} loading={loading} color="warning" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, CIN ou téléphone..." 
            className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex bg-white rounded-2xl shadow-soft p-1.5 border border-surface-200">
          <button 
            onClick={() => setView('journaliere')}
            className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'journaliere' ? 'bg-primary-500 text-white shadow-purple' : 'text-dark-muted hover:text-dark'}`}
          >
            Vue Journalière
          </button>
          <button 
            onClick={() => setView('historique')}
            className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'historique' ? 'bg-primary-500 text-white shadow-purple' : 'text-dark-muted hover:text-dark'}`}
          >
            Historique
          </button>
        </div>
      </div>

      {view === 'journaliere' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-5 h-5 rounded-full bg-accent-green/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="font-bold text-dark">Présents ({presentsList.length})</h3>
            </div>
            
            <Card padding="none" className="min-h-[400px]">
              {presentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-dark-muted">
                  <p className="text-sm font-medium">Aucun étudiant présent</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {presentsList.map((s) => (
                    <Link key={s.id} href={`/${slug}/students/${s.id}`} className="flex items-center justify-between p-4 bg-accent-green/5 border border-accent-green/10 rounded-2xl hover:shadow-soft transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center text-sm font-bold text-accent-green group-hover:bg-accent-green group-hover:text-white transition-all">
                          {s.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-dark">{s.full_name}</p>
                          <p className="text-xs text-dark-muted">Permis {s.license_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-dark-muted">{s.phone}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-5 h-5 rounded-full bg-accent-red/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <h3 className="font-bold text-dark">Absents ({absentsList.length})</h3>
            </div>
            
            <Card padding="none" className="min-h-[400px]">
              {absentsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-dark-muted">
                  <p className="text-sm font-medium">Aucun étudiant absent</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {absentsList.map((s) => (
                    <Link key={s.id} href={`/${slug}/students/${s.id}`} className="flex items-center justify-between p-4 bg-accent-red/5 border border-accent-red/10 rounded-2xl hover:shadow-soft transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center text-sm font-bold text-accent-red group-hover:bg-accent-red group-hover:text-white transition-all">
                          {s.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-dark">{s.full_name}</p>
                          <p className="text-xs text-dark-muted">Permis {s.license_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-dark-muted">{s.phone}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  {['Étudiant', 'Date', 'Heure Entrée', 'Heure Sortie', 'Statut'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-dark-muted uppercase tracking-wider px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {loadingHistory ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-dark-muted">Chargement de l'historique...</td></tr>
                ) : history.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-dark-muted">Aucun historique disponible</td></tr>
                ) : (
                  history.map((h, i) => (
                    <tr key={i} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-dark">{h.full_name}</td>
                      <td className="px-6 py-4 text-sm text-dark-muted">{formatDate(h.date)}</td>
                      <td className="px-6 py-4 text-sm text-dark-muted">{h.time_in || '--:--'}</td>
                      <td className="px-6 py-4 text-sm text-dark-muted">{h.time_out || '--:--'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={h.status === 'Présent' ? 'success' : 'gray'}>{h.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
