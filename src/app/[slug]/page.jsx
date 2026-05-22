'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useTenant } from '@/lib/TenantContext';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { formatDate, formatCurrency, formatDuration } from '@/lib/utils';

function SkeletonBlock({ width = 'w-16', height = 'h-8' }) {
  return <div className={`animate-pulse bg-gray-100 rounded-lg ${width} ${height}`} />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
        <div className="space-y-1.5">
          <div className="animate-pulse bg-gray-100 rounded h-3.5 w-28" />
          <div className="animate-pulse bg-gray-100 rounded h-3 w-20" />
        </div>
      </div>
      <div className="animate-pulse bg-gray-100 rounded-lg h-5 w-16" />
    </div>
  );
}

const alertStyles = {
  danger:  'bg-red-50 border border-red-100 text-red-700',
  warning: 'bg-amber-50 border border-amber-100 text-amber-700',
  info:    'bg-blue-50 border border-blue-100 text-blue-700',
  success: 'bg-emerald-50 border border-emerald-100 text-emerald-700',
};

const alertIconColors = {
  danger:  'bg-red-100 text-red-500',
  warning: 'bg-amber-100 text-amber-500',
  info:    'bg-blue-100 text-blue-500',
  success: 'bg-emerald-100 text-emerald-600',
};

const alertIconPaths = {
  danger:  'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  warning: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
};

function AlertIcon({ severity }) {
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alertIconColors[severity] || alertIconColors.info}`}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={alertIconPaths[severity] || alertIconPaths.info} />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const { slug } = useTenant();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [sessionStats, setSessionStats] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showProfit, setShowProfit] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(false);
      const [s, a, ss, settings] = await Promise.all([
        api.dashboard.getStats(),
        api.alerts.getAll(),
        api.stages.getSessionTimeStats(),
        api.settings.get(),
      ]);
      if (s && !s.error) setStats(s);
      if (Array.isArray(a)) setAlerts(a.slice(0, 8));
      if (ss && !ss.error) setSessionStats(ss);
      if (settings && !settings.error) setSchoolName(settings.school_name || '');
    } catch (e) {
      console.error('Error loading stats:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const [period, setPeriod] = useState('month'); // Default to month
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  const periodLabels = {
    today: {
      revenue: "Revenus Aujourd'hui",
      fixed: "Fixes Aujourd'hui",
      variable: "Variables Aujourd'hui",
      profit: "Bénéfice Aujourd'hui",
    },
    week: {
      revenue: "Revenus Cette Semaine",
      fixed: "Fixes Cette Semaine",
      variable: "Variables Cette Semaine",
      profit: "Bénéfice Cette Semaine",
    },
    month: {
      revenue: "Revenus Ce Mois",
      fixed: "Fixes Ce Mois",
      variable: "Variables Ce Mois",
      profit: "Bénéfice Ce Mois",
    },
    total: {
      revenue: "Revenus Totaux",
      fixed: "Dépenses Fixes",
      variable: "Dépenses Variables",
      profit: "Bénéfice Net",
    },
  };

  const currentPeriodStats = stats?.periods?.[period] || {
    revenue: period === 'month' ? (stats?.monthlyRevenue ?? stats?.totalRevenue) : stats?.totalRevenue,
    fixed: period === 'month' ? (stats?.currentMonthFixedExpenses ?? stats?.fixedExpenses) : stats?.fixedExpenses,
    variable: period === 'month' ? (stats?.currentMonthVariableExpenses ?? stats?.variableExpenses) : stats?.variableExpenses,
    expenses: period === 'month' ? (stats?.currentMonthExpenses ?? stats?.totalExpenses) : stats?.totalExpenses,
    profit: period === 'month' ? (stats?.currentMonthProfit ?? stats?.profit) : stats?.profit,
  };

  const periodRevenue = currentPeriodStats.revenue;
  const periodFixedExpenses = currentPeriodStats.fixed;
  const periodVariableExpenses = currentPeriodStats.variable;
  const periodProfit = currentPeriodStats.profit;

  return (
    <div className="animate-fadeIn space-y-6">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Bonjour, <span style={{color:'#2563eb'}}>{schoolName || 'Admin'}</span> 👋
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Voici ce qui se passe dans votre auto-école aujourd'hui.</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white border rounded-xl px-4 py-2.5 self-start sm:self-auto" style={{borderColor:'#e8edf6', boxShadow:'0 1px 3px rgba(13,27,46,0.06)'}}>
          <svg className="w-4 h-4" style={{color:'#2563eb'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold" style={{color:'#3d5068'}}>{todayCapitalized}</span>
        </div>
      </div>

      {/* Top 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Étudiants"
          value={loading ? null : (stats?.totalStudents ?? 0)}
          loading={loading}
          color="primary"
          icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          title="En Formation"
          value={loading ? null : (stats?.activeStudents ?? 0)}
          loading={loading}
          color="success"
          icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <StatCard
          title="Permis Obtenus"
          value={loading ? null : (stats?.licensesObtained ?? 0)}
          loading={loading}
          color="info"
          icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <StatCard
          title="Activité"
          value={loading ? null : (stats?.todayAttendance ?? 0)}
          loading={loading}
          color="warning"
          icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
      </div>

      {/* Financial Stats Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#e8edf6] p-2.5 rounded-2xl animate-fadeIn" style={{ boxShadow:'0 1px 3px rgba(13,27,46,0.04)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-[#2563eb]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 8.293A1 1 0 013 7.586V4z" />
            </svg>
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7f93ae]">Période de comptabilité :</span>
        </div>
        <div className="flex bg-[#f8fafc] border border-[#e2e8f0] p-1 rounded-xl">
          {[
            { id: 'today', label: "Aujourd'hui" },
            { id: 'week', label: 'Cette Semaine' },
            { id: 'month', label: 'Ce Mois' },
            { id: 'total', label: 'Cumulé' }
          ].map((item) => {
            const isActive = period === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-[#2563eb] shadow-sm border border-[#e2e8f0]'
                    : 'text-[#5c6e84] hover:text-[#0d1b2e]'
                }`}
                style={isActive ? { boxShadow: '0 2px 4px rgba(13,27,46,0.05)' } : {}}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={periodLabels[period].revenue} value={loading ? null : formatCurrency(periodRevenue)} loading={loading} color="success" gradient />
        <StatCard title={periodLabels[period].fixed} value={loading ? null : formatCurrency(periodFixedExpenses)} loading={loading} color="danger" gradient />
        <StatCard title={periodLabels[period].variable} value={loading ? null : formatCurrency(periodVariableExpenses)} loading={loading} color="warning" gradient />
        <StatCard
          title={periodLabels[period].profit}
          value={
            loading ? null : (
              showProfit ? (
                <div className="flex items-center justify-between w-full">
                  <span>{formatCurrency(periodProfit)}</span>
                  <svg className="w-5 h-5 opacity-80 shrink-0 ml-2 inline-block cursor-pointer select-none" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full select-none cursor-pointer">
                  <span className="blur-sm select-none tracking-widest font-mono font-medium">••• •••,••</span>
                  <svg className="w-5 h-5 opacity-80 shrink-0 ml-2 inline-block" fill="none" stroke="#ffffff" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              )
            )
          }
          loading={loading}
          color="primary"
          gradient
          onClick={() => setShowProfit(!showProfit)}
        />
      </div>

      {/* Session time cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Aujourd'hui", key: 'day', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', colorAccent: '#059669', colorBg: '#f0fdf4', colorIcon: '#059669', colorIconBg: '#dcfce7' },
          { label: 'Semaine', key: 'week', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', colorAccent: '#2563eb', colorBg: '#eff6ff', colorIcon: '#2563eb', colorIconBg: '#dbeafe' },
          { label: 'Ce Mois', key: 'month', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', colorAccent: '#0284c7', colorBg: '#f0f9ff', colorIcon: '#0284c7', colorIconBg: '#e0f2fe' },
        ].map(({ label, key, icon, colorAccent, colorBg, colorIcon, colorIconBg }) => (
          <div key={key} style={{ background: '#ffffff', border: '1px solid #e8edf6', borderRadius: '14px', padding: '20px 22px', boxShadow: '0 1px 3px rgba(13,27,46,0.06)', position: 'relative', overflow: 'hidden' }}>
            {/* top accent */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg, ${colorAccent} 0%, ${colorAccent}44 100%)`, borderRadius:'14px 14px 0 0' }} />
            <div className="flex items-start justify-between mb-5" style={{paddingTop:'4px'}}>
              <div>
                <p style={{ fontSize:'10.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#7f93ae', marginBottom:'8px' }}>{label}</p>
                <p style={{ fontSize:'28px', fontWeight:800, color:'#0d1b2e', letterSpacing:'-0.03em', lineHeight:1 }}>
                  {loading ? <span className="inline-block animate-pulse rounded-lg align-middle" style={{height:28, width:80, background:'#f1f4f9', display:'inline-block'}} /> : formatDuration(sessionStats?.[key]?.completed_minutes)}
                </p>
              </div>
              <div style={{ width:42, height:42, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', background: colorIconBg, flexShrink:0 }}>
                <svg style={{ width:20, height:20, color: colorIcon }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { lbl: 'Code', val: sessionStats?.[key]?.code_minutes || 0 },
                { lbl: 'Conduite', val: sessionStats?.[key]?.seance_minutes || 0 },
              ].map(({ lbl, val }) => (
                <div key={lbl} style={{ background: colorBg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${colorAccent}18` }}>
                  <p style={{ fontSize:'9.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color: colorIcon, opacity:0.7, marginBottom:4 }}>{lbl}</p>
                  <p style={{ fontSize:'13px', fontWeight:700, color:'#0d1b2e' }}>{loading ? '—' : formatDuration(val)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div style={{ background:'#ffffff', border:'1px solid #e8edf6', borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 3px rgba(13,27,46,0.06)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid #e8edf6'}}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'#fef3c7'}}>
              <svg className="w-4 h-4" style={{color:'#d97706'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold" style={{color:'#0d1b2e'}}>
              Alertes {!loading && `(${stats?.alertsCounts?.total || alerts.length})`}
            </h3>
            {!loading && stats?.alertsCounts?.danger > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-lg" style={{background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca'}}>
                {stats.alertsCounts.danger} urgentes
              </span>
            )}
          </div>
          <Link href={`/${slug}/alerts`} className="text-xs font-semibold hover:opacity-75 transition-opacity" style={{color:'#2563eb'}}>
            Voir tout →
          </Link>
        </div>
        <div className="p-4 space-y-2">
          {loading ? (
            [0,1,2].map(i => (
              <div key={i} className="p-3.5 rounded-xl bg-gray-50 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded w-40" />
                    <div className="h-3 bg-gray-200 rounded w-56" />
                  </div>
                </div>
              </div>
            ))
          ) : alerts.length > 0 ? (
            alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className={`p-3.5 rounded-xl ${alertStyles[alert.severity]} animate-slideUp`} style={{ animationDelay: `${40 * i}ms` }}>
                <div className="flex items-start gap-3">
                  <AlertIcon severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{alert.title}</p>
                    <p className="text-sm opacity-75 mt-0.5 truncate">{alert.message}</p>
                  </div>
                  <span className="text-xs opacity-60 flex-shrink-0 mt-0.5">{formatDate(alert.date)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Aucune alerte active</p>
          )}
        </div>
      </div>

      {/* Today's stages */}
      {!loading && stats?.todayStages?.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#eef1f7] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef1f7]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Séances Aujourd'hui ({stats.todayStages.length})</h3>
            </div>
            <Link href={`/${slug}/stages`} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Gérer →</Link>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.todayStages.map((stage) => (
              <div key={stage.id} className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant={stage.type === 'Examen' ? 'warning' : 'info'}>{stage.type}</Badge>
                  <span className="text-sm font-semibold text-gray-700">{stage.scheduled_time || '--:--'}</span>
                </div>
                <p className="font-medium text-gray-800 text-sm">{stage.title}</p>
                <Link href={`/${slug}/students/${stage.student_id}`} className="text-xs text-blue-600 hover:underline mt-0.5 block">
                  {stage.full_name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent students + payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div style={{ background:'#ffffff', border:'1px solid #e8edf6', borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 3px rgba(13,27,46,0.06)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid #e8edf6'}}>
            <h3 className="text-sm font-semibold" style={{color:'#0d1b2e'}}>Étudiants Récents</h3>
            <Link href={`/${slug}/students`} className="text-xs font-semibold hover:opacity-75 transition-opacity" style={{color:'#2563eb'}}>Voir tout →</Link>
          </div>
          <div className="px-4 divide-y" style={{borderColor:'#f2f5fb'}}>
            {loading ? (
              [0,1,2,3,4].map(i => <SkeletonRow key={i} />)
            ) : !stats?.recentStudents?.length ? (
              <p className="text-sm text-center py-8" style={{color:'#7f93ae'}}>Aucun étudiant</p>
            ) : stats.recentStudents.map(student => (
              <Link
                key={student.id}
                href={`/${slug}/students/${student.id}`}
                className="flex items-center justify-between py-3 -mx-4 px-4 transition-colors"
                style={{borderBottom:'1px solid #f2f5fb'}}
                onMouseEnter={e => e.currentTarget.style.background='#f7f9fc'}
                onMouseLeave={e => e.currentTarget.style.background=''}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#dbeafe'}}>
                    <span className="text-xs font-semibold" style={{color:'#2563eb'}}>{student.full_name?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{color:'#0d1b2e'}}>{student.full_name}</p>
                    <p className="text-xs" style={{color:'#7f93ae'}}>Permis {student.license_type}</p>
                  </div>
                </div>
                <Badge variant={student.status === 'En formation' ? 'info' : student.status === 'Permis obtenu' ? 'success' : 'gray'}>
                  {student.status}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ background:'#ffffff', border:'1px solid #e8edf6', borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 3px rgba(13,27,46,0.06)' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{borderBottom:'1px solid #e8edf6'}}>
            <h3 className="text-sm font-semibold" style={{color:'#0d1b2e'}}>Paiements Récents</h3>
            <Link href={`/${slug}/payments`} className="text-xs font-semibold hover:opacity-75 transition-opacity" style={{color:'#2563eb'}}>Voir tout →</Link>
          </div>
          <div className="px-4">
            {loading ? (
              [0,1,2,3,4].map(i => <SkeletonRow key={i} />)
            ) : !stats?.recentPayments?.length ? (
              <p className="text-sm text-center py-8" style={{color:'#7f93ae'}}>Aucun paiement</p>
            ) : stats.recentPayments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-3" style={{borderBottom:'1px solid #f2f5fb'}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#dcfce7'}}>
                    <svg className="w-3.5 h-3.5" style={{color:'#059669'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{color:'#0d1b2e'}}>{payment.full_name}</p>
                    <p className="text-xs" style={{color:'#7f93ae'}}>{formatDate(payment.payment_date)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{color:'#059669'}}>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming reminders */}
        {!loading && stats?.upcomingReminders?.length > 0 && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#eef1f7] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#eef1f7]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Rappels à Venir</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.upcomingReminders.map(reminder => (
                <Link
                  key={reminder.id}
                  href={`/${slug}/students/${reminder.id}`}
                  className="flex items-start p-3.5 bg-amber-50/60 rounded-xl border border-amber-100 hover:bg-amber-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{reminder.full_name}</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Rappel: {formatDate(reminder.reminder_date)}
                      {reminder.interested_licenses && ` • ${reminder.interested_licenses}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && !loading && (
        <div className="mt-4">
          <EmptyState.Error message="Erreur de chargement des statistiques" onRetry={loadData} />
        </div>
      )}
    </div>
  );
}
