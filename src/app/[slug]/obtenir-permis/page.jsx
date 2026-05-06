'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/lib/utils';

export default function ObtenirPermisPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLicense, setFilterLicense] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.students.getAll();
      // Filter for those who obtained their license
      setStudents(Array.isArray(s) ? s.filter(st => st.license_obtained) : []);
    } catch { 
      notify.error('Erreur de chargement'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q) || s.phone?.toLowerCase().includes(q);
      const matchLicense = !filterLicense || s.license_type === filterLicense;
      return matchSearch && matchLicense;
    });
  }, [students, search, filterLicense]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const stats = useMemo(() => {
    return {
      A: students.filter(s => s.license_type === 'A').length,
      B: students.filter(s => s.license_type === 'B').length,
      C: students.filter(s => s.license_type === 'C').length,
      D: students.filter(s => s.license_type === 'D').length,
    };
  }, [students]);

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark">Permis Obtenus</h1>
          <p className="text-sm text-dark-muted">Étudiants ayant obtenu leur permis - Envoyer de nouvelles offres</p>
        </div>
        <div className="bg-accent-green/10 text-accent-green px-4 py-2 rounded-xl font-bold text-sm">
          {students.length} permis obtenus
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Permis A', value: stats.A },
          { label: 'Permis B', value: stats.B },
          { label: 'Permis C', value: stats.C },
          { label: 'Permis D', value: stats.D },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-3xl shadow-soft p-6 group hover:shadow-card transition-all">
            <p className="text-xs font-bold text-primary-500 mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-dark">{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Rechercher par nom, CIN ou téléphone..." 
            className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="relative min-w-[180px]">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <select 
            value={filterLicense} 
            onChange={(e) => { setFilterLicense(e.target.value); setCurrentPage(1); }}
            className="w-full h-12 bg-white rounded-2xl shadow-soft border border-surface-200 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary-500 appearance-none transition-all cursor-pointer"
          >
            <option value="">Tous les permis</option>
            {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>Permis {l}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-surface-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-dark-muted">Aucun étudiant trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50/50 border-b border-surface-200">
                <tr>
                  {['Nom complet', 'CIN', 'Téléphone', 'Permis obtenu', 'Date d\'obtention', 'Intéressé par', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-dark-muted uppercase tracking-wider px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/${slug}/students/${s.id}`} className="text-sm font-bold text-primary-600 hover:underline">
                        {s.full_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-muted">{s.cin || '—'}</td>
                    <td className="px-6 py-4 text-sm text-dark-muted">{s.phone || '—'}</td>
                    <td className="px-6 py-4">
                      <Badge variant="success" className="!bg-accent-green/10 !text-accent-green border-none">
                        Permis {s.license_obtained_type || s.license_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-muted">
                      {s.license_obtained_date ? formatDate(s.license_obtained_date) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-dark-muted">—</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                          className="!bg-primary-500 shadow-purple"
                        >
                          Envoyer Offre
                        </Button>
                        <Link href={`/${slug}/students/${s.id}`} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t border-surface-200">
            <Pagination 
              currentPage={currentPage}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

