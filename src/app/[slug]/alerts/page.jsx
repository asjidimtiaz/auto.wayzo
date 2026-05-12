'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';
import Pagination from '@/components/Pagination';
import { formatDate } from '@/lib/utils';

const SEV_CONFIG = {
  danger: { 
    label: 'Urgentes',
    color: 'accent-red', 
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
    border: 'border-l-4 border-l-accent-red',
    text: 'text-accent-red'
  },
  warning: { 
    label: 'Avertissements',
    color: 'accent-yellow', 
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    border: 'border-l-4 border-l-accent-yellow',
    text: 'text-accent-yellow'
  },
  info: { 
    label: 'Informations',
    color: 'accent-blue', 
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    border: 'border-l-4 border-l-accent-blue',
    text: 'text-accent-blue'
  },
  success: { 
    label: 'Succès',
    color: 'accent-green', 
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    border: 'border-l-4 border-l-accent-green',
    text: 'text-accent-green'
  },
};

export default function AlertsPage() {
  const { slug } = useParams();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.alerts.getAll();
      setAlerts(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [priorityFilter, typeFilter]);

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      const matchesPriority = !priorityFilter || a.severity === priorityFilter;
      const matchesType = !typeFilter || a.type === typeFilter;
      return matchesPriority && matchesType;
    });
  }, [alerts, priorityFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      urgentes: alerts.filter(a => a.severity === 'danger').length,
      avertissements: alerts.filter(a => a.severity === 'warning').length,
      informations: alerts.filter(a => a.severity === 'info').length,
      total: alerts.length
    };
  }, [alerts]);

  const types = useMemo(() => {
    const t = new Set();
    alerts.forEach(a => t.add(a.type));
    return Array.from(t);
  }, [alerts]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAlerts = filtered.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Alertes & Notifications
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Paiements, formations et séances à surveiller.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="secondary" size="sm" icon={<svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Urgentes" value={loading ? null : stats.urgentes} loading={loading} color="danger" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>} />
        <StatCard title="Avertissements" value={loading ? null : stats.avertissements} loading={loading} color="warning" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Informations" value={loading ? null : stats.informations} loading={loading} color="info" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Total" value={loading ? null : stats.total} loading={loading} color="primary" icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} />
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-4">
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="form-select w-auto">
            <option value="">Toutes les priorités</option>
            <option value="danger">Urgent</option>
            <option value="warning">Avertissement</option>
            <option value="info">Information</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-select w-auto">
            <option value="">Tous les types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Card>

      {/* Alert List */}
      <div className="space-y-4">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-28 bg-surface-100 rounded-3xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <Card padding="lg"><p className="text-center text-dark-muted font-medium py-10">Aucune notification à afficher</p></Card>
        ) : (
          <>
            {currentAlerts.map((alert, i) => {
              const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
              return (
                <div key={i} className={`bg-white rounded-3xl shadow-soft p-5 border border-surface-100 ${cfg.border} transition-all hover:shadow-md animate-slideUp`} style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${cfg.text} bg-surface-50 flex items-center justify-center flex-shrink-0 mt-1`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} /></svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <h3 className={`font-bold text-sm uppercase tracking-wide ${cfg.text}`}>{alert.title}</h3>
                        <span className="text-[10px] font-bold text-dark-muted uppercase">{formatDate(alert.date)}</span>
                      </div>
                      <p className="text-sm text-dark-muted font-medium mb-3">{alert.message}</p>
                      {alert.student_id && (
                        <Link href={`/${slug}/students/${alert.student_id}`} className="text-xs font-bold text-primary-500 hover:underline uppercase">
                          Voir le profil
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
          </>
        )}
      </div>
    </div>
  );
}
