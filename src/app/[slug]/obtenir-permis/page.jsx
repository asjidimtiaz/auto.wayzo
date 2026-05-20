'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';
import Pagination from '@/components/Pagination';
import { formatDate, LICENSE_TYPES } from '@/lib/utils';

const MOCK_STUDENTS = [
  { id: 'mock-1', full_name: 'Mohamed El Amrani', cin: 'AB123456', phone: '0612345678', license_obtained: true, license_type: 'B', license_obtained_type: 'B', license_obtained_date: '2024-01-15' },
  { id: 'mock-2', full_name: 'Fatima Zahra', cin: 'CD789012', phone: '0676543210', license_obtained: true, license_type: 'B', license_obtained_type: 'B', license_obtained_date: '2024-02-10' },
  { id: 'mock-3', full_name: 'Yassine Benali', cin: 'EF345678', phone: '0655443322', license_obtained: true, license_type: 'A', license_obtained_type: 'A', license_obtained_date: '2023-11-20' },
  { id: 'mock-4', full_name: 'Sanaa Mansouri', cin: 'GH901234', phone: '0688776655', license_obtained: true, license_type: 'C', license_obtained_type: 'C', license_obtained_date: '2024-03-05' },
  { id: 'mock-5', full_name: 'Ahmed Touzani', cin: 'IJ567890', phone: '0644332211', license_obtained: true, license_type: 'D', license_obtained_type: 'D', license_obtained_date: '2024-04-12' },
  { id: 'mock-6', full_name: 'Khadija Radi', cin: 'KL123456', phone: '0699887766', license_obtained: true, license_type: 'B', license_obtained_type: 'B', license_obtained_date: '2023-12-28' },
];

export default function ObtenirPermisPage() {
  const { slug } = useParams();
  const notify = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLicense, setFilterLicense] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([api.students.getAll(), api.offers.getAll()]);
      const realStudents = Array.isArray(s) ? s.filter(st => st.license_obtained) : [];
      setStudents([...realStudents, ...MOCK_STUDENTS]);
      setOffers(Array.isArray(o) ? o : []);
    } catch { 
      setStudents(MOCK_STUDENTS);
      notify.error('Erreur de chargement (Mode démo activé)'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  const openOfferModal = (s) => {
    setSelectedStudent(s);
    setSelectedOffer('');
    setOfferMessage(`Bonjour ${s.full_name},\n\nFélicitations pour l'obtention de votre permis ${s.license_obtained_type || s.license_type} !\n\nNous avons le plaisir de vous proposer une offre spéciale pour obtenir un nouveau permis. Contactez-nous pour plus d'informations.\n\nCordialement,\nAuto-École`);
    setShowOfferModal(true);
  };

  const handleSendOffer = async (e) => {
    e.preventDefault();
    notify.success(`Offre envoyée à ${selectedStudent.full_name}`);
    setShowOfferModal(false);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Permis Obtenus
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Historique des étudiants ayant réussi leur examen.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-bold text-sm border border-emerald-100">
          {students.length} permis obtenus
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Permis A" value={loading ? null : stats.A} loading={loading} color="primary" />
        <StatCard title="Permis B" value={loading ? null : stats.B} loading={loading} color="success" />
        <StatCard title="Permis C" value={loading ? null : stats.C} loading={loading} color="warning" />
        <StatCard title="Permis D" value={loading ? null : stats.D} loading={loading} color="info" />
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
            {LICENSE_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
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
                          onClick={() => openOfferModal(s)}
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

      {/* Offer Modal */}
      {showOfferModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-dark">Envoyer une offre à {selectedStudent.full_name}</h2>
              <button 
                onClick={() => setShowOfferModal(false)}
                className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted transition-colors border border-surface-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSendOffer} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Sélectionner une offre</label>
                <select 
                  value={selectedOffer}
                  onChange={(e) => setSelectedOffer(e.target.value)}
                  className="w-full h-12 bg-surface-50 border border-surface-200 rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="">-- Choisir une offre --</option>
                  {offers.map(o => (
                    <option key={o.id} value={o.id}>{o.title} - {o.price} MAD</option>
                  ))}
                  <option value="custom">Offre personnalisée</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-dark-muted uppercase tracking-wider mb-2">Message personnalisé</label>
                <textarea 
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  rows={8}
                  className="w-full p-4 bg-surface-50 border border-surface-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowOfferModal(false)}>Annuler</Button>
                <Button type="submit">Envoyer l'Offre</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

