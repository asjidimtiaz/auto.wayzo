'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Pagination from '@/components/Pagination';

export default function AttendancePage() {
  const { slug } = useParams();
  const notify = useNotification();
  const [manualQr, setManualQr] = useState('');
  const [result, setResult] = useState(null);
  const [todayList, setTodayList] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tous'); // Tous, Absents, Présents
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [today, allStudents] = await Promise.all([
        api.attendance.getToday(),
        api.students.getAll()
      ]);
      setTodayList(Array.isArray(today) ? today : []);
      setStudents(Array.isArray(allStudents) ? allStudents : []);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const processQrCode = async (qrCode) => {
    if (!qrCode || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const cleanCode = qrCode.trim().toUpperCase();
      const student = students.find(s => {
        const sQr = s.qr_code ? s.qr_code.trim().toUpperCase() : '';
        const sCin = s.cin ? s.cin.trim().toUpperCase() : '';
        const sIdFallback = `STU-${s.id}`.toUpperCase();
        return sQr === cleanCode || sCin === cleanCode || sIdFallback === cleanCode;
      });

      if (!student) {
        setResult({ error: true, message: 'Étudiant non trouvé pour ce code.' });
        return;
      }
      
      const isPresent = todayList.some(a => a.student_id === student.id && !a.time_out);
      
      if (isPresent) {
        await api.attendance.scanOut(student.id);
        notify.success(`Sortie enregistrée: ${student.full_name}`);
        setResult({ success: true, action: 'out', student });
      } else {
        await api.attendance.scanIn(student.id);
        notify.success(`Entrée enregistrée: ${student.full_name}`);
        setResult({ success: true, action: 'in', student });
      }
      
      setManualQr('');
      await loadData();
    } catch (err) {
      setResult({ error: true, message: err.message || 'Erreur lors du scan.' });
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    if (scanning) return;
    setScanning(true);
    setResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = html5QrCode;
      
      const config = { fps: 15, qrbox: { width: 250, height: 250 } };
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (text) => {
          // Play beep sound
          playBeep();
          processQrCode(text);
          
          // Brief pause before next scan to prevent double scans
          html5QrCode.pause();
          setTimeout(() => {
            if (scannerInstanceRef.current?.isScanning) {
              html5QrCode.resume();
            }
          }, 2000);
        },
        (err) => {}
      );
    } catch (e) {
      console.error('Scanner init error', e);
      setScanning(false);
      notify.error('Erreur d\'accès à la caméra. Vérifiez les permissions.');
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
  };

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        if (scannerInstanceRef.current.isScanning) {
          await scannerInstanceRef.current.stop();
        }
      } catch (e) {
        console.error('Stop error', e);
      } finally {
        setScanning(false);
        scannerInstanceRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerInstanceRef.current?.isScanning) {
        scannerInstanceRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const presentIds = useMemo(() => new Set(todayList.filter(a => !a.time_out).map(a => a.student_id)), [todayList]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const fallbackQr = `STU-${s.id}`.toLowerCase();
      const matchSearch = !q || 
        s.full_name?.toLowerCase().includes(q) || 
        s.cin?.toLowerCase().includes(q) || 
        s.qr_code?.toLowerCase().includes(q) || 
        fallbackQr.includes(q);
      const isPresent = presentIds.has(s.id);
      const matchFilter = filter === 'Tous' || (filter === 'Présents' && isPresent) || (filter === 'Absents' && !isPresent);
      return matchSearch && matchFilter;
    });
  }, [students, search, filter, presentIds]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  return (
    <div className="animate-fadeIn space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight" style={{color:'#0d1b2e'}}>
            Scanner QR
          </h1>
          <p className="text-sm mt-1" style={{color:'#7f93ae'}}>Enregistrez les entrées et sorties en temps réel.</p>
        </div>
        <div className="bg-white border rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm" style={{borderColor:'#e8edf6'}}>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Mode Automatique</p>
            <p className="text-xs text-slate-500">Scan = Alternance Entrée/Sortie</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scanner */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="p-6 border-b border-surface-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark">Scanner QR Code</h2>
              {!scanning ? (
                <Button onClick={startScanner} className="!bg-primary-500 shadow-purple">
                  Démarrer Caméra
                </Button>
              ) : (
                <Button onClick={stopScanner} variant="secondary">
                  Arrêter
                </Button>
              )}
            </div>
            <div className="p-6">
              <div className="relative">
                <div id="qr-reader" className={`relative rounded-2xl overflow-hidden border-2 border-surface-200 bg-black transition-all ${scanning ? 'aspect-square max-w-[400px] mx-auto' : 'h-64'}`}>
                  {scanning && (
                    <>
                      {/* Scan Line Animation */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10 animate-scanLine" />
                      
                      {/* Scanning Indicators */}
                      <div className="absolute inset-0 border-[40px] border-black/40 z-0 pointer-events-none" />
                      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Scan</span>
                      </div>
                    </>
                  )}
                  
                  {!scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-surface-50">
                      <div className="w-16 h-16 rounded-3xl bg-white shadow-soft flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-dark font-medium">Prêt pour le scan</p>
                      <p className="text-sm text-dark-muted mt-1">Cliquez sur le bouton pour activer la caméra</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Input */}
              <div className="mt-6">
                <p className="text-sm font-medium text-dark-muted mb-2">Ou entrer le code manuellement:</p>
                <div className="flex gap-2">
                  <input
                    value={manualQr}
                    onChange={(e) => setManualQr(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && manualQr.trim() && processQrCode(manualQr.trim())}
                    placeholder="Ex: STU-ABC12345"
                    className="form-input"
                  />
                  <Button 
                    onClick={() => manualQr.trim() && processQrCode(manualQr.trim())}
                    disabled={!manualQr.trim() || loading}
                    className="!bg-primary-500 shadow-purple"
                  >
                    {loading ? '...' : 'Valider'}
                  </Button>
                </div>
              </div>

              {/* Result Notification */}
              {result && (
                <div className={`mt-4 p-4 rounded-xl animate-fadeIn ${result.error ? 'bg-accent-red/5 border border-accent-red/20' : 'bg-accent-green/5 border border-accent-green/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${result.error ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-green/10 text-accent-green'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {result.error ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${result.error ? 'text-accent-red' : 'text-accent-green'}`}>
                        {result.error ? 'Erreur' : result.action === 'in' ? 'Entrée confirmée' : 'Sortie confirmée'}
                      </p>
                      <p className="text-sm text-dark-light">{result.message || result.student?.full_name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Today's List */}
        <div>
          <Card padding="none" className="h-full">
            <div className="p-6 border-b border-surface-200">
              <h2 className="text-lg font-bold text-dark">Présence Aujourd'hui</h2>
            </div>
            <div className="p-6">
              {todayList.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-dark-muted italic">Aucune présence enregistrée aujourd'hui</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {todayList.map((att) => (
                    <div key={att.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${att.time_out ? 'bg-surface-100 text-dark-muted' : 'bg-accent-green/10 text-accent-green'}`}>
                          {att.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-dark">{att.full_name}</p>
                          <p className="text-xs text-dark-muted">
                            {att.time_in}
                            {att.time_out && ` → ${att.time_out}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={att.time_out ? 'gray' : 'success'}>
                        {att.time_out ? 'Sorti' : 'Présent'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Rapid Registration Section */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-dark">Enregistrement Rapide</h2>
            <p className="text-xs text-dark-muted uppercase tracking-wider">Absent → Entrée | Présent → Sortie</p>
          </div>
          <p className="text-xs font-bold text-dark-muted">{students.length} étudiants</p>
        </div>

        <Card padding="none">
          <div className="p-4 border-b border-surface-200 flex flex-wrap gap-4 items-center justify-between">
            <div className="relative flex-1 min-w-[300px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou CIN..."
                className="form-input pl-10 bg-surface-50 !border-transparent focus:!bg-white"
              />
            </div>
            <div className="flex bg-surface-100 p-1 rounded-xl">
              {['Tous', 'Absents', 'Présents'].map((v) => (
                <button
                  key={v}
                  onClick={() => { setFilter(v); setCurrentPage(1); }}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === v ? 'bg-primary-500 text-white shadow-soft' : 'text-dark-muted hover:text-dark'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {paginatedStudents.map((s) => {
                const isPresent = presentIds.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => processQrCode(s.qr_code || `STU-${s.id}`)}
                    className={`p-4 rounded-2xl border transition-all text-center group hover:shadow-card ${isPresent ? 'bg-accent-green/5 border-accent-green/20' : 'bg-white border-surface-200 hover:border-primary-500/50'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold transition-colors ${isPresent ? 'bg-accent-green text-white' : 'bg-surface-100 text-dark-muted group-hover:bg-primary-500 group-hover:text-white'}`}>
                      {s.full_name?.charAt(0)}
                    </div>
                    <p className="text-xs font-bold text-dark truncate mb-1">{s.full_name}</p>
                    <p className={`text-[10px] font-medium uppercase tracking-tighter ${isPresent ? 'text-accent-green' : 'text-dark-muted'}`}>
                      {isPresent ? 'Présent' : 'Absent'}
                    </p>
                  </button>
                );
              })}
            </div>

            {filteredStudents.length > itemsPerPage && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredStudents.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {filteredStudents.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-dark-muted">Aucun étudiant trouvé</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

