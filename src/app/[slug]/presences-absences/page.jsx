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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        api.students.getAll(),
        api.attendance.getToday()
      ]);
      setStudents(Array.isArray(s) ? s.filter(st => st.status === 'En formation') : []);
      setTodayAttendance(Array.isArray(a) ? a : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const presentIds = useMemo(() => new Set(todayAttendance.filter(a => !a.scan_out_time).map(a => a.student_id)), [todayAttendance]);

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

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Présences & Absences
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Suivi quotidien des présences de vos étudiants.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => router.push(`/${slug}/attendance`)}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
            className="shadow-lg shadow-blue-500/20"
          >
            Scanner QR
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Étudiants" value={loading ? null : stats.total} loading={loading} color="primary" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <StatCard title="Présents" value={loading ? null : stats.presents} loading={loading} color="success" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Absents" value={loading ? null : stats.absents} loading={loading} color="danger" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Taux" value={loading ? null : `${stats.rate}%`} loading={loading} color="warning" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>} />
      </div>

      {/* Filter & Toggle Bar */}
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

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Presents Column */}
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

        {/* Absents Column */}
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
    </div>
  );
}

