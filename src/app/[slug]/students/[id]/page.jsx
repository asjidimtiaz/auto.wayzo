'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import api from '@/lib/api';
import { useNotification } from '@/lib/notification';
import { useConfirm } from '@/lib/confirm';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import StatCard from '@/components/StatCard';
import Pagination from '@/components/Pagination';
import { formatDate, formatCurrency, formatDuration, today, LICENSE_TYPES } from '@/lib/utils';
import { X, FileText, Download, ExternalLink, Printer, Eye } from 'lucide-react';

const TABS = ['Informations', 'Paiements', 'Présences', 'Stages', 'Documents', 'Incidents'];
const STATUS_BADGE = { 'En formation': 'info', 'Permis obtenu': 'success', 'Inactif': 'gray' };
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
  const [documents, setDocuments] = useState([]);
  const [invoices, setInvoices] = useState([]);
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

  // Avancement Modal
  const [showAvancementModal, setShowAvancementModal] = useState(false);
  const [avancementStep, setAvancementStep] = useState(1);
  const [avancementForm, setAvancementForm] = useState({
    school_name: '', address: '', phone: '', city: '', doc_date: today(),
    full_name: '', cin: '', birth_date: '', birth_place: '', student_address: '',
    web_ref: '', license_type: 'Permis B (Voiture)',
    date_code_prevue: '', date_code_demandee: '',
    date_conduite_prevue: '', date_conduite_demandee: '',
    motif: ''
  });
  const [avancementLoading, setAvancementLoading] = useState(false);

  // Doc Review modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [docForm, setDocForm] = useState({});
  const [docLoading, setDocLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const qrValue = useMemo(() => student ? (student.qr_code || `STU-${student.id}`) : '', [student]);
  const qrImageUrl = useMemo(() => {
    if (!qrValue) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrValue)}&color=0033cc`;
  }, [qrValue]);

  useEffect(() => {
    let cancelled = false;

    async function generateQr() {
      if (!qrValue) {
        setQrDataUrl('');
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(qrValue, {
          width: 600,
          margin: 2,
          color: { dark: '#0033cc', light: '#ffffff' }
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('QR generation failed:', err);
        if (!cancelled) setQrDataUrl('');
      }
    }

    generateQr();
    return () => { cancelled = true; };
  }, [qrValue]);

  const load = useCallback(async () => {
    if (!id) return;
    
    console.log('Loading student data for ID:', id);
    setLoading(true);
    
    try {
      // 1. Load core student data first (Essential)
      const s = await api.students.getById(id).catch(err => {
        console.error('Core data fetch error:', err);
        return { error: 'Fetch failed' };
      });

      if (!s || s.error) {
        console.error('Student not found or error:', s?.error);
        notify.error('Étudiant non trouvé');
        router.push(`/${slug}/students`);
        return;
      }

      setStudent(s);
      setPayments(s.payments || []);
      setAttendance(s.attendance || []);

      // 2. Load secondary data in parallel with independent error handling
      // We wrap each in a try-catch or catch block to ensure one failure doesn't block others
      const secondaryData = await Promise.allSettled([
        api.stages.getByStudent(id),
        api.incidents.getByStudent(id),
        api.documents.getByStudent(id),
        api.paymentSchedules.getByStudent(id),
        api.invoices.getByStudent(id)
      ]);

      if (secondaryData[0].status === 'fulfilled') setStages(Array.isArray(secondaryData[0].value) ? secondaryData[0].value : []);
      if (secondaryData[1].status === 'fulfilled') setIncidents(Array.isArray(secondaryData[1].value) ? secondaryData[1].value : []);
      if (secondaryData[2].status === 'fulfilled') setDocuments(Array.isArray(secondaryData[2].value) ? secondaryData[2].value : []);
      if (secondaryData[3].status === 'fulfilled') setSchedules(Array.isArray(secondaryData[3].value) ? secondaryData[3].value : []);
      if (secondaryData[4].status === 'fulfilled') setInvoices(Array.isArray(secondaryData[4].value) ? secondaryData[4].value : []);

      // 3. Optional: Load session stats separately as it might be slower/missing
      api.stages.getStudentSessionTimeStats(id)
        .then(res => setSessionStats(res))
        .catch(err => console.warn('Session stats failed:', err));

    } catch (err) {
      console.error('Fatal load error:', err);
      notify.error('Erreur lors du chargement des données');
    } finally {
      console.log('Loading complete for ID:', id);
      setLoading(false);
    }
  }, [id, slug, router]);

  // Safety timeout to ensure loading state is always released
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('Loading safety timeout reached');
        setLoading(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (id) {
      load();
    }
  }, [id, load]);

  function prependDocument(doc) {
    if (!doc?.id) return;
    setDocuments((current) => [doc, ...current.filter((item) => item.id !== doc.id)]);
  }

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

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await api.files.upload(file);
      const filePath = res.path || res.filePath;
      if (filePath) {
        await api.documents.create({
          student_id: parseInt(id),
          name: file.name,
          file_path: filePath,
          type: 'Upload',
          file_type: file.name.split('.').pop() || null,
          file_size: file.size
        });
        notify.success('Document ajouté');
        await load();
      }
    } catch { 
      notify.error('Erreur lors de l\'envoi'); 
    }
  }

  async function handleDocumentAction(doc, mode = 'view') {
    let path = doc.file_path || doc.path || doc.url;
    
    if (!path) return notify.error('Chemin du fichier introuvable');
    
    // Standard path-based handling
    if (path.toLowerCase().endsWith('.pdf')) {
      try {
        const result = await api.files.viewAsJson(path);
        if (result && result.data) {
          const binaryString = window.atob(result.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const blob = new Blob([bytes], { type: result.mime || 'application/pdf' });
          const fileURL = URL.createObjectURL(blob);
          processFileAction(fileURL, mode, doc.name || doc.title || 'document.pdf');
          return;
        }
      } catch (err) {
        console.warn('Document action failed, falling back to direct link:', err);
      }
    }
    
    window.open(`/api/files/view?path=${encodeURIComponent(path)}`, '_blank');
  }

  function processFileAction(fileURL, mode, filename) {
    if (mode === 'print') {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = fileURL;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 200);
      };
    } else if (mode === 'download') {
      const a = document.createElement('a');
      a.href = fileURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(fileURL, '_blank');
    }
  }

  function handleViewDocument(doc) {
    handleDocumentAction(doc, 'view');
  }

  function handleDownloadDocument(doc) {
    handleDocumentAction(doc, 'download');
  }

  function handlePrintDocument(doc) {
    handleDocumentAction(doc, 'print');
  }

  async function handleDeleteDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    
    const ok = await confirmDelete('ce document');
    if (!ok) return;

    try {
      // Delete record from DB
      await api.documents.delete(docId);
      
      // Attempt to delete physical file if path exists
      const filePath = doc.file_path || doc.path;
      if (filePath) {
        await api.files.deleteFile(filePath).catch(err => console.warn('File deletion failed, but DB record removed:', err));
      }
      
      notify.success('Document supprimé');
      await load();
    } catch (err) { 
      console.error('Delete error:', err);
      notify.error('Erreur lors de la suppression'); 
    }
  }

  async function handleDeleteAllDocuments() {
    const ok = await confirmDelete('TOUS les documents de cet étudiant');
    if (!ok) return;
    try {
      await api.documents.deleteAllByStudent(id);
      notify.success('Tous les documents ont été supprimés');
      await load();
    } catch { notify.error('Erreur lors de la suppression massive'); }
  }

  async function handleDeleteStudent() {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'étudiant ${student.full_name} ?`)) return;
    try {
      await api.students.delete(id);
      notify.success('Étudiant supprimé');
      router.push(`/${slug}/students`);
    } catch { notify.error('Erreur lors de la suppression'); }
  }

  async function handleGenerate(type) {
    setDocType(type);
    setDocLoading(true);
    try {
      const settings = await api.settings.get() || {};
      const now = new Date().toISOString().split('T')[0];
      
      setDocForm({
        // School Info
        school_name: settings.school_name || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        city: settings.city || '',
        fax: settings.fax || '',
        tax_register: settings.tax_register || '',
        commercial_register: settings.commercial_register || '',
        
        // Candidate Info
        full_name: student.full_name || '',
        cin: student.cin || '',
        birth_place: student.birth_place || '',
        birth_date: student.birth_date || '',
        student_address: student.address || '',
        web_reference: student.web_reference || '',
        license_type: student.license_type || 'B',
        registration_date: student.registration_date ? new Date(student.registration_date).toISOString().split('T')[0] : now,
        contract_number: '1',
        document_date: now,
        
        // Specific for Demande 15
        last_name: (student.full_name || '').split(' ')[0] || '',
        first_name: (student.full_name || '').split(' ').slice(1).join(' ') || '',
        exam_date_planned: '',
        exam_date_requested: ''
      });
      if (type === 'avancement') {
        setAvancementForm({
          ...avancementForm,
          school_name: settings.school_name || '',
          address: settings.address || '',
          phone: settings.phone || '',
          city: settings.city || '',
          doc_date: today(),
          full_name: student.full_name || '',
          cin: student.cin || '',
          birth_date: student.birth_date || '',
          birth_place: student.birth_place || '',
          student_address: student.address || '',
          web_ref: student.web_reference || '',
          license_type: student.license_type === 'B' ? 'Permis B (Voiture)' : student.license_type || 'Permis B (Voiture)'
        });
        setAvancementStep(1);
        setShowAvancementModal(true);
        return;
      }

      setShowDocModal(true);
    } catch { 
      notify.error('Erreur lors de la préparation du document'); 
    } finally {
      setDocLoading(false);
    }
  }

  async function submitGenerate() {
    setDocLoading(true);
    try {
      let res;
      if (docType === 'contract') res = await api.contracts.generate(id, docForm);
      else if (docType === 'demande15') res = await api.demande15.generate(id, docForm);
      else if (docType === 'avancement') res = await api.contratAvancement.generate(id, docForm);
      
      if (res?.success) {
        setShowDocModal(false);
        prependDocument(res.document);
        notify.success('Document généré avec succès');
        
        // Finalize the URL and filename if path exists
        const path = res.path || res.url;
        if (path) {
          const rawPath = path.startsWith('/') ? path : `/${path}`;
          const fileName = rawPath.split('/').pop();
          const finalUrl = encodeURI(rawPath);
          
          // Trigger download
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = finalUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            document.body.removeChild(a);
          }, 100);
        }
        
        await load();
      } else {
        notify.error('Le serveur n\'a pas renvoyé de document');
      }
    } catch (err) { 
      console.error('Submission error:', err);
      notify.error('Erreur de connexion : ' + (err.message || 'Serveur indisponible')); 
    } finally {
      setDocLoading(false);
    }
  }
   async function handleAvancementSubmit() {
    setAvancementLoading(true);
    try {
      const res = await api.contratAvancement.generate(id, avancementForm);
      if (res?.success) {
        setShowAvancementModal(false);
        prependDocument(res.document);
        notify.success('Contrat d\'avancement généré');
        const path = res.path || res.url;
        if (path) {
          const rawPath = path.startsWith('/') ? path : `/${path}`;
          const finalUrl = encodeURI(rawPath);
          const a = document.createElement('a');
          a.href = finalUrl;
          a.download = rawPath.split('/').pop();
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        
        // Targeted refresh for documents to ensure they show up immediately
        const docs = await api.documents.getByStudent(id);
        if (Array.isArray(docs)) setDocuments(docs);
        
        // Full reload to be safe
        load();
      }
    } catch (err) {
      console.error('Avancement error:', err);
      notify.error('Erreur lors de la génération');
    } finally {
      setAvancementLoading(false);
      setDocLoading(false); // Reset this too to clear any stuck UI
    }
  }


  async function handlePrintInvoice(invoiceId) {
    try {
      const res = await api.invoices.print(invoiceId);
      if (res && res.data) {
        prependDocument(res.document);
        const binaryString = window.atob(res.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
            }, 1000);
          }, 200);
        };
        notify.success('Facture générée avec succès');
        await load();
      } else {
        notify.error('Erreur lors de la génération de la facture');
      }
    } catch (err) {
      console.error(err);
      notify.error('Erreur de connexion');
    }
  }

  async function handlePrintReceipt(paymentId) {
    try {
      const res = await api.payments.generateReceipt(paymentId);
      if (res.success && res.path) {
        prependDocument(res.document);
        window.open(res.path, '_blank');
        await load();
      } else {
        notify.error('Erreur lors de la génération du reçu');
      }
    } catch { notify.error('Erreur de connexion'); }
  }

  async function getQrDataUrl() {
    if (qrDataUrl) return qrDataUrl;
    return QRCode.toDataURL(qrValue, {
      width: 600,
      margin: 2,
      color: { dark: '#0033cc', light: '#ffffff' }
    });
  }

  function sanitizeFileName(value) {
    return String(value || 'etudiant').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'etudiant';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  async function handleDownloadQrCode() {
    try {
      const dataUrl = await getQrDataUrl();
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qr-code-${sanitizeFileName(student?.full_name)}-${sanitizeFileName(qrValue)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify.success('Code QR téléchargé');
    } catch (err) {
      console.error('QR download failed:', err);
      notify.error('Impossible de télécharger le code QR');
    }
  }

  async function handlePrintQrCode() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify.error("Impossible d'ouvrir la fenêtre d'impression");
      return;
    }

    try {
      const dataUrl = await getQrDataUrl();
      const studentName = escapeHtml(student.full_name);
      const safeQrValue = escapeHtml(qrValue);
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${studentName}</title></head>
          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
            <h2>${studentName}</h2>
            <img src="${dataUrl}" style="width:300px; height:300px; margin-bottom:20px;" />
            <p style="font-size:24px; font-weight:bold; letter-spacing:2px;">${safeQrValue}</p>
            <script>setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 500);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('QR print failed:', err);
      printWindow.close();
      notify.error("Impossible d'imprimer le code QR");
    }
  }

  if (loading) return (
    <div className="animate-fadeIn space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-white rounded-xl shadow-soft animate-pulse" />
          <div className="h-4 w-40 bg-white/60 rounded-lg shadow-soft animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-white rounded-xl shadow-soft animate-pulse" />
          <div className="h-10 w-28 bg-white rounded-xl shadow-soft animate-pulse" />
        </div>
      </div>
      
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl shadow-soft animate-pulse" />
        ))}
      </div>

      {/* 3-Column Dashboard Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 bg-white rounded-2xl shadow-soft animate-pulse" />
          <div className="h-[400px] bg-white rounded-2xl shadow-soft animate-pulse" />
          <div className="h-64 bg-white rounded-2xl shadow-soft animate-pulse" />
        </div>
        
        <div className="space-y-6">
          <div className="h-64 bg-white rounded-2xl shadow-soft animate-pulse" />
          <div className="h-40 bg-white rounded-2xl shadow-soft animate-pulse" />
          <div className="h-80 bg-white rounded-2xl shadow-soft animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (!student) return null;

  const paid = parseFloat(student.paid_amount || 0);
  const total = parseFloat(student.total_price || 0);
  const balance = total - paid;
  const paymentPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

  return (
    <>
      <div className="animate-fadeIn">
        {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${slug}/students`} className="p-2.5 rounded-xl bg-white border border-surface-100 text-dark-muted hover:text-dark hover:shadow-sm transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-black text-blue-600">{student.full_name?.substring(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#0d1b2e] leading-tight">{student.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={STATUS_BADGE[student.status] || 'gray'}>{student.status}</Badge>
                <Badge variant="primary">Permis {student.license_type}</Badge>
                {student.license_obtained && <Badge variant="success">Permis obtenu</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="secondary" onClick={() => router.push(`/${slug}/students`)} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>Nouveau</Button>
           <Button variant="danger" onClick={handleDeleteStudent} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg>}>Supprimer</Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations */}
          <Card padding="lg">
             <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                ['Nom complet', student.full_name],
                ['CIN', student.cin || '—'],
                ['Téléphone', student.phone || '—'],
                ['Date de naissance', formatDate(student.birth_date)],
                ['Lieu de naissance', student.birth_place || '—'],
                ['Adresse', student.address || '—'],
                ['Ville', student.ville || '—'],
                ['Type de permis', student.license_type],
                ['Statut', student.status, true],
                ['Date inscription', formatDate(student.registration_date)],
                ['Offre', student.offer_name || '—'],
                ['Date de rappel', student.reminder_date ? formatDate(student.reminder_date) : '—'],
              ].map(([label, value, isBadge]) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-dark-muted mb-1">{label}</p>
                  {isBadge ? (
                    <Badge variant={STATUS_BADGE[value] || 'gray'}>{value}</Badge>
                  ) : (
                    <p className="text-sm font-bold text-dark">{value}</p>
                  )}
                </div>
              ))}
             </div>
             {student.internal_notes && (
                <div className="mt-6">
                  <span className="text-xs font-semibold text-dark-muted uppercase tracking-wider">Notes internes</span>
                  <p className="text-sm text-dark mt-1 p-3 bg-surface-50 rounded-xl">{student.internal_notes}</p>
                </div>
             )}
          </Card>

          {/* Formation */}
          <Card padding="lg">
             <h3 className="font-semibold text-dark mb-4">Formation</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                 <div>
                   <p className="text-xs font-semibold text-dark-muted mb-1">Date début</p>
                   <p className="text-sm font-bold text-dark">{formatDate(student.training_start_date) || formatDate(student.registration_date)}</p>
                 </div>
                 <div>
                   <p className="text-xs font-semibold text-dark-muted mb-1">Durée</p>
                   <p className="text-sm font-bold text-dark">{student.training_duration_days || 30} jours</p>
                 </div>
                 <div>
                   <p className="text-xs font-semibold text-dark-muted mb-1">Jours restants</p>
                   <p className="text-sm font-bold text-accent-green">{student.training_duration_days || 30} jours</p>
                 </div>
                 <div>
                   <p className="text-xs font-semibold text-dark-muted mb-1">Statut formation</p>
                   <Badge variant="info">En cours</Badge>
                 </div>
             </div>
             {!student.license_obtained && (
                <Button size="sm" variant="success" onClick={async () => {
                   if (window.confirm('Voulez-vous marquer ce permis comme obtenu ?')) {
                      try {
                         await api.students.update(id, { license_obtained: true, status: 'Permis obtenu' });
                         notify.success('Statut mis à jour avec succès');
                         load();
                      } catch {
                         notify.error('Erreur lors de la mise à jour');
                      }
                   }
                }} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}>Marquer Permis Obtenu</Button>
             )}
          </Card>

          {/* Paiements & Factures */}
          <Card padding="lg">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-dark">Paiements & Factures</h3>
                <Button size="sm" onClick={() => { setPayForm({ amount: '', payment_method: 'Cash', payment_date: today(), notes: '' }); setShowPayModal(true); }}>+ Paiement</Button>
             </div>
             
             <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-surface-50 rounded-xl p-3">
                   <p className="text-xs text-dark-muted mb-1">Total</p>
                   <p className="font-bold text-dark">{formatCurrency(total)}</p>
                </div>
                <div className="bg-accent-green/10 rounded-xl p-3">
                   <p className="text-xs text-accent-green mb-1">Payé</p>
                   <p className="font-bold text-accent-green">{formatCurrency(paid)}</p>
                </div>
                <div className="bg-accent-red/10 rounded-xl p-3">
                   <p className="text-xs text-accent-red mb-1">Restant</p>
                   <p className="font-bold text-accent-red">{formatCurrency(balance > 0 ? balance : 0)}</p>
                </div>
             </div>

             {payments.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-4">Aucun paiement enregistré</p>
             ) : (
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
                            {p.reference && <span className="text-[10px] font-black text-primary-600 uppercase bg-primary-50 px-2 py-0.5 rounded ml-2 border border-primary-100">{p.reference}</span>}
                            {p.notes && <p className="text-xs text-dark-muted">{p.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <p className="text-xs text-dark-muted mr-1">{formatDate(p.payment_date)}</p>
                           <button onClick={() => handlePrintReceipt(p.id)} className="p-1 rounded-lg hover:bg-primary-50 text-dark-muted hover:text-primary-600 transition-colors" title="Quittance">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                           </button>
                           <button onClick={() => handleDeletePayment(p)} className="p-1 rounded-lg hover:bg-accent-red/10 text-dark-muted hover:text-accent-red transition-colors" title="Supprimer">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                      </div>
                    ))}
                    <Pagination
                      currentPage={pagePay}
                      totalItems={payments.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setPagePay}
                    />
                </div>
             )}

              {invoices.length > 0 && (
                <div className="mt-8 border-t border-surface-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-dark-muted uppercase tracking-wider">Factures</h4>
                    <Link href={`/${slug}/invoices`} className="text-[10px] font-bold text-primary-500 hover:underline">Voir tout</Link>
                  </div>
                  <div className="space-y-2">
                    {invoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-100 bg-white group hover:border-primary-100 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.status === 'Payée' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-blue/10 text-accent-blue'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-dark">{inv.invoice_number}</p>
                            <p className="text-[10px] text-dark-muted">{formatDate(inv.issue_date)} · {formatCurrency(inv.amount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handlePrintInvoice(inv.id)} 
                            className="p-1.5 rounded-lg hover:bg-primary-50 text-dark-muted hover:text-primary-600 transition-colors"
                            title="Imprimer la facture"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          </button>
                          <Badge variant={inv.status === 'Payée' ? 'success' : 'info'}>{inv.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </Card>

          {/* Echéancier */}
          {schedules.length > 0 && (
            <Card padding="lg">
               <h3 className="font-semibold text-dark mb-4">Echéancier de paiement</h3>
               <div className="space-y-3">
                  {schedules.map(sch => (
                     <div key={sch.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-100 bg-white">
                        <div className="flex items-center gap-3">
                           <div className={`w-2.5 h-2.5 rounded-full ${sch.paid_at ? 'bg-accent-green' : new Date(sch.due_date) < new Date() ? 'bg-accent-red' : 'bg-accent-blue'}`} />
                           <div>
                              <p className="text-sm font-bold text-dark">{formatCurrency(sch.amount)}</p>
                              <p className="text-[10px] text-dark-muted font-medium">Échéance : {formatDate(sch.due_date)}</p>
                           </div>
                        </div>
                        <Badge variant={sch.paid_at ? 'success' : new Date(sch.due_date) < new Date() ? 'danger' : 'info'}>
                           {sch.paid_at ? 'Payé' : new Date(sch.due_date) < new Date() ? 'En retard' : 'À venir'}
                        </Badge>
                     </div>
                  ))}
               </div>
            </Card>
          )}

          {/* Stages & Séances */}
          <Card padding="lg">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-dark">Stages & Séances</h3>
                <Button size="sm" onClick={() => { setStageForm({ type: 'Séance', title: '', scheduled_date: today(), scheduled_time: '', duration_minutes: 60, status: 'Planifié', notes: '' }); setShowStageModal(true); }}>Planifier séance</Button>
             </div>
             
             {stages.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-4">Aucune séance planifiée</p>
             ) : (
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
                    <Pagination
                      currentPage={pageStages}
                      totalItems={stages.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setPageStages}
                    />
                </div>
             )}
          </Card>

          {/* Présences */}
          <Card padding="lg">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-dark">Historique des présences</h3>
                <Badge variant="info">{attendance.length} présences</Badge>
             </div>
             
             {attendance.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-4">Aucune présence enregistrée</p>
             ) : (
                <div className="space-y-2">
                   {attendance.slice((pageAtt-1)*itemsPerPage, pageAtt*itemsPerPage).map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.time_out ? 'bg-dark-muted' : 'bg-accent-green'}`} />
                          <div>
                            <span className="text-sm font-medium text-dark">{formatDate(a.date)}</span>
                            <p className="text-xs text-dark-muted">
                              {a.time_in || ''}
                              {a.time_out ? ` → ${a.time_out}` : ''}
                            </p>
                          </div>
                        </div>
                        <Badge variant={a.time_out ? 'gray' : 'success'}>{a.time_out ? 'Sorti' : 'Présent'}</Badge>
                      </div>
                    ))}
                    <Pagination
                      currentPage={pageAtt}
                      totalItems={attendance.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setPageAtt}
                    />
                </div>
             )}
          </Card>

          {/* Incidents */}
          <Card padding="lg">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-dark">Incidents & Remarques</h3>
                <Button size="sm" variant="warning" onClick={() => { setIncidentForm({ type: '', severity: 'Avertissement', description: '', date: today() }); setShowIncidentModal(true); }}>
                  + Signaler
                </Button>
             </div>
             
             {incidents.length === 0 ? (
                <p className="text-sm text-dark-muted text-center py-4">Aucun incident signalé</p>
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
                        <p className="text-sm text-dark-light mt-1">{inc.description}</p>
                        {inc.resolved && <p className="text-xs text-accent-green mt-2 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Résolu</p>}
                      </div>
                    );
                  })}
                </div>
             )}
          </Card>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-6">
           {/* Copie CIN */}
           <Card padding="lg">
              <h3 className="font-semibold text-dark mb-4">Copie CIN</h3>
              <div className="border-2 border-dashed border-surface-200 rounded-xl p-8 flex flex-col items-center justify-center text-center mb-4 bg-surface-50/50">
                 <svg className="w-8 h-8 text-surface-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 <p className="text-sm text-dark-muted">Aucun document CIN</p>
              </div>
              <Button variant="secondary" className="w-full text-sm" onClick={() => notify.info('Gérer les documents est en cours de développement')}>Ajouter CIN</Button>
           </Card>

           {/* Code QR */}
           <Card padding="lg">
              <h3 className="font-semibold text-dark mb-4">Code QR</h3>
              <div className="border border-surface-100 rounded-xl p-6 flex flex-col items-center justify-center mb-4">
                 <img src={qrDataUrl || qrImageUrl} alt="QR Code" className="w-48 h-48 mb-4 mix-blend-multiply" />
                 <div className="bg-surface-50 w-full text-center py-2 rounded-lg text-xs font-mono font-bold text-dark-muted">
                    {qrValue}
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button variant="secondary" className="w-full text-sm" onClick={handleDownloadQrCode} icon={<Download size={16} />}>
                   Télécharger
                </Button>
                <Button variant="secondary" className="w-full text-sm" onClick={handlePrintQrCode} icon={<Printer size={16} />}>
                   Imprimer
                </Button>
              </div>
           </Card>

           {/* Formulaires Administratifs */}
           <Card padding="lg">
              <h3 className="font-semibold text-dark mb-4">Formulaires Administratifs</h3>
              <div className="flex flex-wrap gap-2">
                 <button onClick={() => handleGenerate('contract')} className="px-4 py-2 rounded-full bg-[#7c3aed] text-white text-[11px] font-bold hover:opacity-90 transition-all shadow-sm">Contrat PDF</button>
                 <button onClick={() => handleGenerate('demande15')} className="px-4 py-2 rounded-full bg-[#f59e0b] text-white text-[11px] font-bold hover:opacity-90 transition-all shadow-sm">Demande 15 Jours</button>
                 <button onClick={() => handleGenerate('avancement')} className="px-4 py-2 rounded-full bg-[#10b981] text-white text-[11px] font-bold hover:opacity-90 transition-all shadow-sm">Contrat Avancement</button>
              </div>
           </Card>

           {/* Documents */}
           <Card padding="lg">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-dark">Documents</h3>
                  {documents.length > 0 && (
                    <button onClick={handleDeleteAllDocuments} className="p-1.5 rounded-lg hover:bg-accent-red/10 text-accent-red transition-colors tooltip" title="Supprimer tous les documents">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg>
                    </button>
                  )}
                 <label className="cursor-pointer p-1.5 rounded-lg hover:bg-surface-100 text-primary-600 transition-colors tooltip" title="Ajouter un document">
                    <input type="file" className="hidden" onChange={handleFileUpload} />
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                 </label>
              </div>
              
              <div className="space-y-3">
                 {/* Static Contract Generator */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50 shadow-sm">
                     <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-accent-red/10 flex items-center justify-center text-accent-red flex-shrink-0">
                           <FileText size={20} />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-dark">Contrat de formation</p>
                           <p className="text-[10px] uppercase tracking-wider font-extrabold text-primary-600">Document Système</p>
                        </div>
                     </div>
                      <button 
                        onClick={() => handleGenerate('contract')} 
                        disabled={docLoading}
                        className="px-5 py-2 rounded-xl bg-white border border-surface-200 text-dark font-bold text-sm hover:bg-surface-100 transition-all shadow-sm disabled:opacity-50"
                      >
                        {docLoading && docType === 'contract' ? '...' : 'Ouvrir'}
                      </button>
                  </div>

                 {/* Dynamic Documents List */}
                 {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-surface-100 bg-white hover:border-primary-300 transition-all shadow-sm">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.type === 'Facture' ? 'bg-accent-blue/10 text-accent-blue' : doc.type === 'Reçu' ? 'bg-accent-green/10 text-accent-green' : 'bg-primary-50 text-primary-600'}`}>
                             <FileText size={20} />
                          </div>
                          <div className="min-w-0 overflow-hidden">
                             <p className="text-sm font-bold text-dark truncate">{doc.name || doc.title || 'Document'}</p>
                             <div className="flex items-center gap-2">
                               <p className="text-[10px] text-dark-muted uppercase font-bold tracking-wider">{doc.type || 'Fichier'}</p>
                               <span className="text-[10px] text-dark-muted/60">·</span>
                               <p className="text-[10px] text-dark-muted font-medium">{formatDate(doc.created_at)}</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 ml-4">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedDoc(doc); 
                              setShowPreviewModal(true); 
                            }} 
                            className="p-2 rounded-xl bg-surface-50 text-dark-muted hover:bg-primary-50 hover:text-primary-600 transition-all border border-surface-200" 
                            title="Voir le document"
                          >
                            <Eye size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }} className="p-2 rounded-xl bg-surface-50 text-accent-red hover:bg-accent-red/10 transition-all border border-surface-200" title="Supprimer"><X size={18} /></button>
                       </div>
                    </div>
                 ))}

                 {documents.length === 0 && (
                    <p className="text-[10px] text-center text-dark-muted py-2 italic">Aucun document additionnel</p>
                 )}
              </div>
           </Card>
         </div>
      </div>
      </div>

      {/* Payment modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Ajouter un paiement</h2>
              <button onClick={() => setShowPayModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handlePaySubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="p-3 bg-accent-yellow/5 border border-accent-yellow/20 rounded-xl flex items-center justify-between animate-fadeIn">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-accent-yellow/10 flex items-center justify-center">
                       <svg className="w-4 h-4 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     </div>
                     <span className="text-xs font-bold text-dark uppercase tracking-wider">Solde restant actuel</span>
                   </div>
                   <span className={`text-sm font-black ${balance > 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                     {formatCurrency(balance)}
                   </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                   <div><label className="form-label">Montant (MAD) *</label><input type="number" min="0.01" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required className="form-input" /></div>
                   <div><label className="form-label">Méthode *</label><select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))} className="form-select">{['Cash', 'Transfer', 'Cheque', 'TPE'].map(m => <option key={m}>{m}</option>)}</select></div>
                   <div><label className="form-label">Date *</label><input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} required className="form-input" /></div>
                </div>
                <div><label className="form-label">Notes</label><textarea value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} className="form-textarea resize-none" rows={2} placeholder="Référence du chèque, détails du transfert..." /></div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowPayModal(false)}>Annuler</Button>
                <Button type="submit" loading={payLoading}>Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avancement Modal */}
      {showAvancementModal && (
        <div className="modal-overlay" onClick={() => setShowAvancementModal(false)}>
          <div className="modal-content !max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Informations - Contrat d'Avancement</h2>
              <button onClick={() => setShowAvancementModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><X size={20} /></button>
            </div>
            
            <div className="modal-body p-8 overflow-y-auto space-y-10 custom-scrollbar">
              {/* Section 1: Auto-école */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center text-accent-green">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <h3 className="font-bold text-dark uppercase tracking-wider text-sm">Auto-École</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="form-label !text-dark-light">Nom de l'Auto-École</label><input value={avancementForm.school_name} onChange={e => setAvancementForm({...avancementForm, school_name: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Adresse</label><input value={avancementForm.address} onChange={e => setAvancementForm({...avancementForm, address: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Téléphone</label><input value={avancementForm.phone} onChange={e => setAvancementForm({...avancementForm, phone: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Ville</label><input value={avancementForm.city} onChange={e => setAvancementForm({...avancementForm, city: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Date du Document</label><input type="date" value={avancementForm.doc_date} onChange={e => setAvancementForm({...avancementForm, doc_date: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                </div>
              </div>

              {/* Section 2: Candidat */}
              <div className="pt-8 border-t border-surface-100">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <h3 className="font-bold text-dark uppercase tracking-wider text-sm">Informations du Candidat</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2"><label className="form-label !text-dark-light">Nom Complet</label><input value={avancementForm.full_name} onChange={e => setAvancementForm({...avancementForm, full_name: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">CIN</label><input value={avancementForm.cin} onChange={e => setAvancementForm({...avancementForm, cin: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Date de Naissance</label><input type="date" value={avancementForm.birth_date} onChange={e => setAvancementForm({...avancementForm, birth_date: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Lieu de Naissance</label><input value={avancementForm.birth_place} onChange={e => setAvancementForm({...avancementForm, birth_place: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Adresse du Candidat</label><input value={avancementForm.student_address} onChange={e => setAvancementForm({...avancementForm, student_address: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                </div>
              </div>

              {/* Section 3: Dates d'Examen */}
              <div className="pt-8 border-t border-surface-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div><label className="form-label !text-dark-light">Réf. Web</label><input value={avancementForm.web_ref} onChange={e => setAvancementForm({...avancementForm, web_ref: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div>
                    <label className="form-label !text-dark-light">Type de Permis</label>
                    <select value={avancementForm.license_type} onChange={e => setAvancementForm({...avancementForm, license_type: e.target.value})} className="form-select !py-3 !rounded-xl">
                      {LICENSE_TYPES.map(l => <option key={l.label} value={l.label}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                  </div>
                  <h3 className="font-bold text-dark uppercase tracking-wider text-sm">Dates d'Examen</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="form-label !text-dark-light">Date examen Code (prévue)</label><input type="date" value={avancementForm.date_code_prevue} onChange={e => setAvancementForm({...avancementForm, date_code_prevue: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Date Code demandée</label><input type="date" value={avancementForm.date_code_demandee} onChange={e => setAvancementForm({...avancementForm, date_code_demandee: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Date examen Conduite (prévue)</label><input type="date" value={avancementForm.date_conduite_prevue} onChange={e => setAvancementForm({...avancementForm, date_conduite_prevue: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                  <div><label className="form-label !text-dark-light">Date Conduite demandée</label><input type="date" value={avancementForm.date_conduite_demandee} onChange={e => setAvancementForm({...avancementForm, date_conduite_demandee: e.target.value})} className="form-input !py-3 !rounded-xl" /></div>
                </div>
              </div>

              {/* Section 4: Motif */}
              <div className="pt-8 border-t border-surface-100">
                <h3 className="font-bold text-dark uppercase tracking-wider text-sm mb-4">Motif</h3>
                <div>
                  <textarea 
                    value={avancementForm.motif} 
                    onChange={e => setAvancementForm({...avancementForm, motif: e.target.value})} 
                    className="form-textarea !h-32 !rounded-2xl !p-6 !text-base" 
                    placeholder="Motif de la demande d'avancement..."
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer !p-8 !bg-white border-t border-surface-100">
              <div className="flex items-center justify-end gap-3 w-full">
                <button onClick={() => setShowAvancementModal(false)} className="px-6 py-2.5 rounded-xl text-dark-muted font-bold hover:bg-surface-100 transition-all border border-surface-200">Annuler</button>
                <button 
                  onClick={handleAvancementSubmit} 
                  disabled={avancementLoading}
                  className="flex items-center gap-2 bg-[#10b981] hover:bg-[#0d9488] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-500/20"
                >
                  {avancementLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  Générer le Contrat d'Avancement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showStageModal && (
        <div className="modal-overlay" onClick={() => setShowStageModal(false)}>
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Nouveau stage</h2>
              <button onClick={() => setShowStageModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleStageSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div><label className="form-label">Type *</label><select value={stageForm.type} onChange={e => setStageForm(f => ({ ...f, type: e.target.value }))} className="form-select">{['Séance', 'Examen', 'Code', 'Plateau'].map(t => <option key={t}>{t}</option>)}</select></div>
                   <div><label className="form-label">Titre *</label><input value={stageForm.title} onChange={e => setStageForm(f => ({ ...f, title: e.target.value }))} required className="form-input" placeholder="Ex: Séance de conduite 1" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><label className="form-label">Date *</label><input type="date" value={stageForm.scheduled_date} onChange={e => setStageForm(f => ({ ...f, scheduled_date: e.target.value }))} required className="form-input" /></div>
                  <div><label className="form-label">Heure</label><input type="time" value={stageForm.scheduled_time} onChange={e => setStageForm(f => ({ ...f, scheduled_time: e.target.value }))} className="form-input" /></div>
                  <div><label className="form-label">Durée (min)</label><input type="number" min="15" value={stageForm.duration_minutes} onChange={e => setStageForm(f => ({ ...f, duration_minutes: e.target.value }))} className="form-input" /></div>
                </div>
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
          <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl font-bold text-dark">Signaler un incident</h2>
              <button onClick={() => setShowIncidentModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-dark-muted"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleIncidentSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="modal-body space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div><label className="form-label">Type *</label><input value={incidentForm.type} onChange={e => setIncidentForm(f => ({ ...f, type: e.target.value }))} required placeholder="Ex: Absence injustifiée" className="form-input" /></div>
                   <div><label className="form-label">Sévérité</label><select value={incidentForm.severity} onChange={e => setIncidentForm(f => ({ ...f, severity: e.target.value }))} className="form-select">{['Avertissement', 'Moyen', 'Grave'].map(s => <option key={s}>{s}</option>)}</select></div>
                </div>
                <div><label className="form-label">Description *</label><textarea value={incidentForm.description} onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))} required rows={3} className="form-textarea resize-none" placeholder="Détails de l'incident..." /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div><label className="form-label">Date *</label><input type="date" value={incidentForm.date} onChange={e => setIncidentForm(f => ({ ...f, date: e.target.value }))} required className="form-input" /></div>
                   <div className="flex-1"></div>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" type="button" onClick={() => setShowIncidentModal(false)}>Annuler</Button>
                <Button variant="warning" type="submit" loading={incidentLoading}>Signaler</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Doc Review Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-dark/60 backdrop-blur-md animate-fadeIn" onClick={() => setShowDocModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-slideUp border border-surface-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-surface-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-dark">{docType === 'demande15' ? 'Informations - Demande 15 Jours' : 'Informations du Contrat'}</h2>
              <button onClick={() => setShowDocModal(false)} className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-surface-100 text-dark-muted transition-all border border-surface-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8 bg-surface-50/30">
              {docType === 'demande15' ? (
                <>
                  {/* Demande 15 Jours Refined Layout */}
                  <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-light">Date du Document</label>
                        <input type="date" value={docForm.document_date || ''} onChange={(e) => setDocForm({...docForm, document_date: e.target.value})} className="form-input" />
                      </div>
                    </div>
                  </section>

                  <section className="pt-6 border-t border-surface-100">
                    <div className="flex items-center gap-2 mb-6">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <h4 className="text-[11px] font-black text-dark/60 uppercase tracking-[0.2em]">CANDIDAT</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-light">Nom</label>
                        <input type="text" value={docForm.last_name || ''} onChange={(e) => setDocForm({...docForm, last_name: e.target.value})} className="form-input" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-light">Prenom</label>
                        <input type="text" value={docForm.first_name || ''} onChange={(e) => setDocForm({...docForm, first_name: e.target.value})} className="form-input" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-light">CINE N°</label>
                        <input type="text" value={docForm.cin || ''} onChange={(e) => setDocForm({...docForm, cin: e.target.value})} className="form-input" />
                      </div>
                    </div>
                  </section>

                  <section className="pt-6 border-t border-surface-100">
                    <div className="flex items-center gap-2 mb-6">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <h4 className="text-[11px] font-black text-dark/60 uppercase tracking-[0.2em]">DATES D'EXAMEN</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-light">Date examen prevue</label>
                        <input type="date" value={docForm.exam_date_planned || ''} onChange={(e) => setDocForm({...docForm, exam_date_planned: e.target.value})} className="form-input" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-dark-light">Date demandee</label>
                        <input type="date" value={docForm.exam_date_requested || ''} onChange={(e) => setDocForm({...docForm, exam_date_requested: e.target.value})} className="form-input" />
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  {/* Existing Contract Layout */}
              {/* Auto-École Info */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <h4 className="text-[13px] font-bold text-primary-600 uppercase tracking-widest">Informations Auto-École</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Nom de l'Auto-École</label>
                    <input type="text" value={docForm.school_name || ''} onChange={(e) => setDocForm({...docForm, school_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Adresse</label>
                    <input type="text" value={docForm.address || ''} onChange={(e) => setDocForm({...docForm, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Téléphone</label>
                    <input type="text" value={docForm.phone || ''} onChange={(e) => setDocForm({...docForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Email</label>
                    <input type="email" value={docForm.email || ''} onChange={(e) => setDocForm({...docForm, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Ville</label>
                    <input type="text" value={docForm.city || ''} onChange={(e) => setDocForm({...docForm, city: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light flex justify-between"><span>Fax - الفاكس</span></label>
                    <input type="text" value={docForm.fax || ''} onChange={(e) => setDocForm({...docForm, fax: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light flex justify-between"><span>Registre fiscal - السجل الضريبي</span></label>
                    <input type="text" value={docForm.tax_register || ''} onChange={(e) => setDocForm({...docForm, tax_register: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light flex justify-between"><span>Registre commerce - السجل التجاري</span></label>
                    <input type="text" value={docForm.commercial_register || ''} onChange={(e) => setDocForm({...docForm, commercial_register: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                </div>
              </section>

              {/* Candidate Info */}
              <section className="pt-8 border-t border-surface-100">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <h4 className="text-[13px] font-bold text-primary-600 uppercase tracking-widest">Informations du Candidat</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Nom Complet</label>
                    <input type="text" value={docForm.full_name || ''} onChange={(e) => setDocForm({...docForm, full_name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">CIN</label>
                    <input type="text" value={docForm.cin || ''} onChange={(e) => setDocForm({...docForm, cin: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Lieu de Naissance</label>
                    <input type="text" value={docForm.birth_place || ''} onChange={(e) => setDocForm({...docForm, birth_place: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Date de Naissance</label>
                    <input type="date" value={docForm.birth_date || ''} onChange={(e) => setDocForm({...docForm, birth_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Adresse du Candidat</label>
                    <input type="text" value={docForm.student_address || ''} onChange={(e) => setDocForm({...docForm, student_address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light flex justify-between"><span>Référence web - المرجع على الويب</span></label>
                    <input type="text" value={docForm.web_reference || ''} onChange={(e) => setDocForm({...docForm, web_reference: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Type de Permis</label>
                    <select value={docForm.license_type || 'B'} onChange={(e) => setDocForm({...docForm, license_type: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white appearance-none">
                      {LICENSE_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Date d'Inscription</label>
                    <input type="date" value={docForm.registration_date || ''} onChange={(e) => setDocForm({...docForm, registration_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">N° du Contrat</label>
                    <input type="text" value={docForm.contract_number || '1'} onChange={(e) => setDocForm({...docForm, contract_number: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dark-light">Date du Document</label>
                    <input type="date" value={docForm.document_date || ''} onChange={(e) => setDocForm({...docForm, document_date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white" />
                  </div>
                </div>
                </section>
              </>
            )}
            </div>
            
            <div className="p-6 border-t border-surface-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button 
                type="button"
                onClick={() => setShowDocModal(false)} 
                disabled={docLoading} 
                className="px-8 h-12 rounded-xl text-dark-muted font-bold hover:bg-surface-100 transition-all border border-surface-200"
              >
                Annuler
              </button>
              <Button 
                onClick={submitGenerate} 
                loading={docLoading} 
                className={`!rounded-xl px-10 h-12 shadow-lg flex items-center gap-2 bg-primary-600 hover:bg-primary-700 shadow-primary-500/20`}
              >
                {docType === 'demande15' && !docLoading && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {docLoading ? 'Génération...' : docType === 'demande15' ? 'Générer la Demande' : 'Générer le PDF'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreviewModal && selectedDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-surface-100">
              <h3 className="text-[22px] font-bold text-dark">{selectedDoc.name || selectedDoc.title || 'Document'}</h3>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleViewDocument(selectedDoc)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-[13px] font-bold hover:bg-primary-700 transition-all shadow-sm"
                  >
                    <ExternalLink size={16} />
                    Ouvrir le PDF
                  </button>
                  <button 
                    onClick={() => handlePrintDocument(selectedDoc)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-dark border border-surface-200 rounded-xl text-[13px] font-bold hover:bg-surface-50 transition-all"
                  >
                    <Printer size={16} />
                    Imprimer
                  </button>
                  <button 
                    onClick={() => handleDownloadDocument(selectedDoc)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-dark border border-surface-200 rounded-xl text-[13px] font-bold hover:bg-surface-50 transition-all"
                  >
                    <Download size={16} />
                    Télécharger
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowPreviewModal(false)} 
                  className="p-1 text-surface-400 hover:text-dark transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-red-50/50 rounded-3xl flex items-center justify-center mb-8">
                <FileText size={56} className="text-red-500" strokeWidth={1.5} />
              </div>
              
              <h4 className="text-[24px] font-bold text-dark mb-3">{selectedDoc.name || selectedDoc.title}</h4>
              <p className="text-[15px] text-surface-500 mb-10 max-w-md leading-relaxed">
                Cliquez sur "Ouvrir le PDF" pour visualiser le document ou utilisez les options ci-dessus.
              </p>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleViewDocument(selectedDoc)}
                  className="bg-primary-600 text-white px-10 h-14 rounded-2xl text-[15px] font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2"
                >
                  <ExternalLink size={20} />
                  Ouvrir le PDF
                </button>
                <button 
                  onClick={() => handleDownloadDocument(selectedDoc)}
                  className="bg-white text-dark border border-surface-200 px-10 h-14 rounded-2xl text-[15px] font-bold hover:bg-surface-50 transition-all flex items-center gap-2"
                >
                  <Download size={20} />
                  Télécharger
                </button>
              </div>
            </div>
            
            {/* Empty Footer for spacing as per design */}
            <div className="h-4 bg-surface-50/30"></div>
          </div>
        </div>
      )}
    </>
  );
}
