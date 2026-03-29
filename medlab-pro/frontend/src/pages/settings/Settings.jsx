import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus, X, Save, Users, Settings, FileText, Image, Upload, Trash2,
  Pencil, PenLine, ToggleLeft, ToggleRight, Eye, EyeOff, ShieldCheck, Banknote,
  HardDrive, Download, RotateCcw, Clock, CheckCircle2, AlertTriangle,
  BellRing, QrCode, MessageCircle, Globe,
  Tag, CalendarDays, ToggleLeft as TL,
} from 'lucide-react';
import RichTextEditor from '../../components/ui/RichTextEditor';

// ── Module sidebar (ID = perdoret per qasje) ────────────────────────────────
export const MODULET = [
  { id: 'dashboard',          label: 'Dashboard',          group: 'Kryesor' },
  { id: 'pacientet',          label: 'Pacientet',          group: 'Kryesor' },
  { id: 'referuesit',         label: 'Referuesit',         group: 'Kryesor' },
  { id: 'laboratori',         label: 'Laboratori',         group: 'Laborator' },
  { id: 'regjistro-analize',  label: 'Regjistro Analizë',  group: 'Laborator' },
  { id: 'regjistro-profilet', label: 'Regjistro Profilet', group: 'Laborator' },
  { id: 'antibiogram',        label: 'Antibiogrami',       group: 'Laborator' },
  { id: 'kontrollet',         label: 'Kontrollet',         group: 'Menaxhim' },
  { id: 'pagesat',            label: 'Pagesat',            group: 'Menaxhim' },
  { id: 'arkiva',             label: 'Arkiva',             group: 'Menaxhim' },
  { id: 'financa',            label: 'Financa',            group: 'Menaxhim' },
  { id: 'alarmet',            label: 'Alarmet Kritike',    group: 'Sistem' },
  { id: 'statistikat',        label: 'Statistikat',        group: 'Sistem' },
  { id: 'settings',           label: 'Cilësimet',          group: 'Sistem' },
];

export const QASJA_DEFAULT = {
  admin:        MODULET.map(m => m.id),
  mjek:         ['dashboard', 'pacientet', 'referuesit', 'laboratori', 'kontrollet', 'arkiva', 'alarmet'],
  laborant:     ['dashboard', 'pacientet', 'laboratori', 'regjistro-analize', 'regjistro-profilet', 'antibiogram', 'arkiva', 'alarmet'],
  recepsionist: ['dashboard', 'pacientet', 'referuesit', 'kontrollet', 'pagesat'],
};

const ROLET = ['admin', 'mjek', 'laborant', 'recepsionist'];

const TABS = [
  { id: 'perdoruesit', label: 'Perdoruesit', icon: Users },
  { id: 'pdf',         label: 'Raporte PDF', icon: FileText },
  { id: 'financa',     label: 'Financa',     icon: Banknote },
  { id: 'njoftimet',   label: 'Njoftimet',   icon: BellRing },
  { id: 'zbritjet',    label: 'Kodet Zbritje', icon: Tag },
  { id: 'backup',      label: 'Backup',      icon: HardDrive },
  { id: 'sistemi',     label: 'Sistemi',     icon: Settings },
];

const FINANCE_BOSH = {
  nrTvsh: '', nrBiznesit: '',
  llogarite: [],
  shenimFature: 'Ju lutemi që pagesa të realizohet brenda 14 ditëve nga pranimi i faturës.',
  shenimFaturePatient: '',
  invoicePrefix: 'FAT', invoicePatientPrefix: 'FAT-PAC', monedha: 'EUR', tvshNorma: 8,
  fatureHeaderTekst: '', fatureFooterTekst: '',
  shfaqLogoFature: true, shfaqNIPTFature: true,
  shfaqZbritjenFature: true, shfaqBorxhinFature: true,
  shfaqAnalizatFature: true, shfaqPaketatFature: true,
};

const roliStyle = {
  admin:        'bg-red-100 text-red-700',
  mjek:         'bg-blue-100 text-blue-700',
  laborant:     'bg-green-100 text-green-700',
  recepsionist: 'bg-orange-100 text-orange-700',
};

const roliLabel = {
  admin: 'Administrator', mjek: 'Mjek', laborant: 'Laborant / Teknik', recepsionist: 'Recepsionist',
};

const FORMA_USER = { emri: '', mbiemri: '', email: '', fjalekalimi: '', roli: 'laborant', specialiteti: '', telefoni: '' };

const EDIT_BOSH = {
  _id: null, emri: '', mbiemri: '', email: '', fjalekalimi: '', roli: 'laborant',
  specialiteti: '', telefoni: '', qasjet: [],
};

const PDF_BOSH = {
  emriKlinikes: '', adresaKlinikes: '', telefonKlinikes: '', emailKlinikes: '', nrUnik: '', nrFiskal: '',
  logo: '', headerTekst: '', footer: '', referuesiDefault: 'Vete ardhur',
};

const DEPARTAMENTET = ['Te gjitha', 'Biokimi', 'Mikrobiologji', 'PCR', 'Hematologji', 'Urinalizë', 'Serologji', 'Hormoni'];
const NENSHKRIM_BOSH = { emri: '', mbiemri: '', titulli: '', licenca: '', foto: '', departamentet: ['Te gjitha'], aktiv: true, align: 'left', validimTipi: 'teknik' };
const KOD_BOSH = { kodi: '', zbritja: '', pershkrim: '', validDeri: '', aktiv: true, limitPerdorimesh: '' };

// Grupet e moduleve (per UI)
const GROUPS = [...new Set(MODULET.map(m => m.group))];

export default function SettingsPage() {
  const [tab, setTab]   = useState('perdoruesit');
  const [nenpTab, setNenpTab] = useState('stafi'); // 'stafi' | 'rolet'

  // ── Perdoruesit ──────────────────────────────────────────────
  const [perdoruesit, setPerdoruesit] = useState([]);
  const [ngarkimi, setNgarkimi]       = useState(false);
  const [duke_ruajtur, setDukeRuajtur] = useState(false);

  // Modal shto perdorues (te ri)
  const [modalHapur, setModalHapur] = useState(false);
  const [forma, setForma]           = useState(FORMA_USER);

  // Modal edito perdorues
  const [editModal, setEditModal]   = useState(null); // null | EDIT_BOSH
  const [shfaqFjal, setShfaqFjal]   = useState(false);

  // Rolet & Qasja
  const [roletQasjet, setRoletQasjet] = useState({
    mjek:         [...QASJA_DEFAULT.mjek],
    laborant:     [...QASJA_DEFAULT.laborant],
    recepsionist: [...QASJA_DEFAULT.recepsionist],
  });
  const [roliAktiv, setRoliAktiv] = useState('mjek');
  const [ruanRolet, setRuanRolet] = useState(false);

  // ── PDF / Klinika ────────────────────────────────────────────
  const [pdf, setPdf]               = useState(PDF_BOSH);
  const [ngarkonPdf, setNgarkonPdf] = useState(false);
  const [ruanPdf, setRuanPdf]       = useState(false);
  const logoInputRef                = useRef(null);

  // ── Finance Settings ─────────────────────────────────────────
  const [finance, setFinance]       = useState(FINANCE_BOSH);
  const [ruanFinance, setRuanFinance] = useState(false);

  // ── Njoftimet (QR + WhatsApp) ─────────────────────────────────
  const [njoft, setNjoft] = useState({
    qrKodAktiv: false, qrBaseUrl: '',
    whatsappAktiv: false, whatsappProvider: 'callmebot',
    whatsappApiKey: '', whatsappTwilioSid: '', whatsappTwilioToken: '',
    whatsappTwilioFrom: '', whatsappWebhookUrl: '',
    whatsappTemplate: '',
  });
  const [ruanNjoft, setRuanNjoft]   = useState(false);
  const [testingWa, setTestingWa]   = useState(false);
  const [testNrWa, setTestNrWa]     = useState('');

  // ── Backup ────────────────────────────────────────────────────
  const [backupet, setBackupet]         = useState([]);
  const [backupSettings, setBackupSettings] = useState({
    backupAktiv: false, backupOrari: 'ditore_02:00', backupMaksimum: 10,
  });
  const [ngarkonBackup, setNgarkonBackup] = useState(false);
  const [dukeBackupuar, setDukeBackupuar] = useState(false);
  const [ruanBackup, setRuanBackup]       = useState(false);

  // Nënshkrimet
  const [nenshkrimet, setNenshkrimet]       = useState([]);
  const [nenshkrimModal, setNenshkrimModal] = useState(null);
  const [ruanNenshkrim, setRuanNenshkrim]   = useState(false);
  const nenshkrimFotoRef                    = useRef(null);

  // Kodet e Zbritjes
  const [kodetZbritje, setKodetZbritje]   = useState([]);
  const [ngarkonKodet, setNgarkonKodet]   = useState(false);
  const [kodModal, setKodModal]           = useState(null);
  const [ruanKodin, setRuanKodin]         = useState(false);
  const [perdorimetModal, setPerdorimetModal] = useState(null); // null | { kodi, zbritja, perdorimet[] }
  const [ngarkonPerdorimet, setNgarkonPerdorimet] = useState(false);

  // ── Ngarkim perdoruesit + roletQasjet ───────────────────────
  useEffect(() => {
    if (tab !== 'perdoruesit') return;
    setNgarkimi(true);
    Promise.all([api.get('/perdorues'), api.get('/settings')])
      .then(([ru, rs]) => {
        setPerdoruesit(ru.data.perdoruesit || []);
        const rq = rs.data.settings?.roletQasjet || {};
        setRoletQasjet({
          mjek:         rq.mjek         || [...QASJA_DEFAULT.mjek],
          laborant:     rq.laborant     || [...QASJA_DEFAULT.laborant],
          recepsionist: rq.recepsionist || [...QASJA_DEFAULT.recepsionist],
        });
        setNgarkimi(false);
      })
      .catch(() => setNgarkimi(false));
  }, [tab]);

  // ── Ngarkim PDF settings ─────────────────────────────────────
  useEffect(() => {
    if (tab !== 'pdf') return;
    setNgarkonPdf(true);
    Promise.all([api.get('/settings'), api.get('/nenshkrimet')])
      .then(([rs, rn]) => {
        setPdf({ ...PDF_BOSH, ...rs.data.settings });
        setNenshkrimet(rn.data.nenshkrimet || []);
        setNgarkonPdf(false);
      }).catch(() => setNgarkonPdf(false));
  }, [tab]);

  // ── Ngarkim Finance settings ──────────────────────────────────
  useEffect(() => {
    if (tab !== 'financa') return;
    api.get('/settings')
      .then(r => setFinance({ ...FINANCE_BOSH, ...r.data.settings }))
      .catch(() => {});
  }, [tab]);

  const ruajFinance = async () => {
    setRuanFinance(true);
    try {
      await api.put('/settings', finance);
      toast.success('Cilësimet e financës u ruajtën!');
    } catch { toast.error('Gabim gjatë ruajtjes'); }
    setRuanFinance(false);
  };

  // ── Njoftimet helpers ─────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'njoftimet') return;
    api.get('/settings').then(r => {
      const s = r.data.settings || {};
      setNjoft({
        qrKodAktiv:          s.qrKodAktiv          ?? false,
        qrBaseUrl:           s.qrBaseUrl            || '',
        whatsappAktiv:       s.whatsappAktiv        ?? false,
        whatsappProvider:    s.whatsappProvider     || 'callmebot',
        whatsappApiKey:      s.whatsappApiKey       || '',
        whatsappTwilioSid:   s.whatsappTwilioSid    || '',
        whatsappTwilioToken: s.whatsappTwilioToken  || '',
        whatsappTwilioFrom:  s.whatsappTwilioFrom   || '',
        whatsappWebhookUrl:  s.whatsappWebhookUrl   || '',
        whatsappTemplate:    s.whatsappTemplate     || '',
      });
    }).catch(() => {});
  }, [tab]);

  const ruajNjoftimet = async () => {
    setRuanNjoft(true);
    try {
      await api.put('/settings', njoft);
      toast.success('Cilësimet e njoftimeve u ruajtën!');
    } catch { toast.error('Gabim gjatë ruajtjes'); }
    setRuanNjoft(false);
  };

  // ── Backup helpers ────────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'backup') return;
    setNgarkonBackup(true);
    api.get('/backup')
      .then(r => {
        setBackupet(r.data.backupet || []);
        const s = r.data.settings || {};
        setBackupSettings({
          backupAktiv:    s.backupAktiv    ?? false,
          backupOrari:    s.backupOrari    || 'ditore_02:00',
          backupMaksimum: s.backupMaksimum ?? 10,
        });
        setNgarkonBackup(false);
      })
      .catch(() => setNgarkonBackup(false));
  }, [tab]);

  const krijoBackup = async () => {
    setDukeBackupuar(true);
    try {
      await api.post('/backup');
      toast.success('Backup u krijua me sukses!');
      const r = await api.get('/backup');
      setBackupet(r.data.backupet || []);
    } catch { toast.error('Gabim gjatë krijimit të backup'); }
    setDukeBackupuar(false);
  };

  const shkarkoBackup = (filename) => {
    const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
    const url = `${baseUrl}/backup/${filename}`;
    api.get(`/backup/${filename}`, { responseType: 'blob' })
      .then(r => {
        const burl = URL.createObjectURL(r.data);
        const a = document.createElement('a');
        a.href = burl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(burl); document.body.removeChild(a); }, 1000);
      })
      .catch(() => toast.error('Gabim gjatë shkarkimit'));
  };

  const fshiBackup = async (filename) => {
    if (!confirm(`Fshi backup-in "${filename}"?`)) return;
    try {
      await api.delete(`/backup/${filename}`);
      setBackupet(p => p.filter(b => b.filename !== filename));
      toast.success('Backup u fshi');
    } catch { toast.error('Gabim gjatë fshirjes'); }
  };

  const ruajSettingsBackup = async () => {
    setRuanBackup(true);
    try {
      await api.put('/backup/settings', backupSettings);
      toast.success('Cilësimet e backup u ruajtën!');
    } catch { toast.error('Gabim gjatë ruajtjes'); }
    setRuanBackup(false);
  };

  // Parse backup orari: 'ditore_02:00' -> { tipi: 'ditore', ora: '02:00' }
  const parseOrari = (orari = 'ditore_02:00') => {
    const [tipi, ora = '02:00'] = (orari || 'ditore_02:00').split('_');
    return { tipi, ora };
  };
  const bsOrari = parseOrari(backupSettings.backupOrari);
  const setBsOrari = (tipi, ora) => setBackupSettings(p => ({ ...p, backupOrari: `${tipi}_${ora}` }));

  // Discount codes
  const ngarkoKodet = () => {
    setNgarkonKodet(true);
    api.get('/zbritjet').then(r => setKodetZbritje(r.data.kodet || [])).catch(() => {}).finally(() => setNgarkonKodet(false));
  };
  useEffect(() => { if (tab === 'zbritjet') ngarkoKodet(); }, [tab]);

  const ruajKodin = async () => {
    if (!kodModal) return;
    const payload = {
      ...kodModal,
      zbritja:          Number(kodModal.zbritja),
      limitPerdorimesh: kodModal.limitPerdorimesh !== '' ? Number(kodModal.limitPerdorimesh) : null,
    };
    setRuanKodin(true);
    try {
      if (kodModal._id) {
        await api.put(`/zbritjet/${kodModal._id}`, payload);
        toast.success('Kodi u përditësua!');
      } else {
        await api.post('/zbritjet', payload);
        toast.success('Kodi u krijua!');
      }
      setKodModal(null);
      ngarkoKodet();
    } catch (e) { toast.error(e.response?.data?.mesazh || 'Gabim gjatë ruajtjes'); }
    finally { setRuanKodin(false); }
  };

  const fshiKodin = async (id) => {
    if (!window.confirm('Fshi këtë kod zbritjeje?')) return;
    await api.delete(`/zbritjet/${id}`).catch(() => {});
    ngarkoKodet();
  };

  const hapPerdorimet = async (k) => {
    setNgarkonPerdorimet(true);
    setPerdorimetModal({ kodi: k.kodi, zbritja: k.zbritja, perdorimet: [] });
    try {
      const { data } = await api.get(`/zbritjet/${k._id}/perdorimet`);
      setPerdorimetModal({ kodi: data.kodi, zbritja: data.zbritja, perdorimet: data.perdorimet || [] });
    } catch { toast.error('Gabim gjatë ngarkimit'); }
    finally { setNgarkonPerdorimet(false); }
  };

  const set = (k, v) => setPdf(p => ({ ...p, [k]: v }));

  // ── Helpers qasje ───────────────────────────────────────────
  const efektiveQasjet = (user) => {
    if (user.qasjet?.length > 0) return user.qasjet;
    return user.roli === 'admin' ? QASJA_DEFAULT.admin : (roletQasjet[user.roli] || QASJA_DEFAULT[user.roli] || []);
  };

  const hapEditModal = (user) => {
    setEditModal({
      _id:         user._id,
      emri:        user.emri,
      mbiemri:     user.mbiemri,
      email:       user.email,
      fjalekalimi: '',
      roli:        user.roli,
      specialiteti: user.specialiteti || '',
      telefoni:    user.telefoni || '',
      qasjet:      efektiveQasjet(user),
    });
    setShfaqFjal(false);
  };

  const setEditRoli = (roli) => {
    setEditModal(p => ({
      ...p, roli,
      qasjet: roli === 'admin' ? [...QASJA_DEFAULT.admin] : [...(roletQasjet[roli] || QASJA_DEFAULT[roli] || [])],
    }));
  };

  const toggleEditQasje = (id) => {
    if (editModal.roli === 'admin') return; // admin ka gjithmonë të gjitha
    setEditModal(p => ({
      ...p,
      qasjet: p.qasjet.includes(id) ? p.qasjet.filter(q => q !== id) : [...p.qasjet, id],
    }));
  };

  const toggleRolQasje = (id) => {
    if (roliAktiv === 'admin') return;
    setRoletQasjet(p => ({
      ...p,
      [roliAktiv]: p[roliAktiv].includes(id)
        ? p[roliAktiv].filter(q => q !== id)
        : [...p[roliAktiv], id],
    }));
  };

  // ── CRUD perdoruesit ─────────────────────────────────────────
  const ruajUser = async () => {
    if (!forma.emri || !forma.mbiemri || !forma.email) return toast.error('Ploteso fushat e detyrueshme');
    if (!forma.fjalekalimi) return toast.error('Fjalekalimi eshte i detyrueshem');
    setDukeRuajtur(true);
    try {
      await api.post('/auth/regjistro', forma);
      toast.success(`${forma.emri} ${forma.mbiemri} u shtua!`);
      setModalHapur(false);
      setForma(FORMA_USER);
      const r = await api.get('/perdorues');
      setPerdoruesit(r.data.perdoruesit || []);
    } catch (e) { toast.error(e.response?.data?.mesazh || 'Gabim'); }
    setDukeRuajtur(false);
  };

  const ruajEditUser = async () => {
    if (!editModal.emri || !editModal.mbiemri || !editModal.email)
      return toast.error('Emri, mbiemri dhe email janë të detyrueshme');
    setDukeRuajtur(true);
    try {
      const payload = {
        emri: editModal.emri, mbiemri: editModal.mbiemri, email: editModal.email,
        roli: editModal.roli, telefoni: editModal.telefoni,
        specialiteti: editModal.specialiteti, qasjet: editModal.qasjet,
      };
      if (editModal.fjalekalimi?.trim()) payload.fjalekalimi = editModal.fjalekalimi;
      await api.put(`/perdorues/${editModal._id}`, payload);
      toast.success('Perdoruesi u përditësua!');
      setEditModal(null);
      const r = await api.get('/perdorues');
      setPerdoruesit(r.data.perdoruesit || []);
    } catch (e) { toast.error(e.response?.data?.mesazh || 'Gabim'); }
    setDukeRuajtur(false);
  };

  const ndryshAktiv = async (id, aktiv) => {
    await api.put(`/perdorues/${id}/aktiv`, { aktiv });
    setPerdoruesit(p => p.map(u => u._id === id ? { ...u, aktiv } : u));
    toast.success(aktiv ? 'Llogaria u aktivizua' : 'Llogaria u çaktivizua');
  };

  const ruajRoletQasjet = async () => {
    setRuanRolet(true);
    try {
      await api.put('/settings', { roletQasjet });
      toast.success('Cilësimet e roleve u ruajtën!');
    } catch { toast.error('Gabim gjatë ruajtjes'); }
    setRuanRolet(false);
  };

  // ── PDF helpers ──────────────────────────────────────────────
  const zgjedhLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Zgjedh nje imazh (PNG, JPG...)');
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo duhet te jete nen 2 MB');
    const reader = new FileReader();
    reader.onload = (ev) => set('logo', ev.target.result);
    reader.readAsDataURL(file);
  };

  const zgjedhFotoNenshkrimit = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Zgjedh një imazh (PNG, JPG...)');
    if (file.size > 2 * 1024 * 1024) return toast.error('Foto duhet të jetë nën 2 MB');
    const reader = new FileReader();
    reader.onload = (ev) => setNenshkrimModal(p => ({ ...p, foto: ev.target.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const ruajNenshkrimin = async () => {
    setRuanNenshkrim(true);
    try {
      if (nenshkrimModal._id) {
        const r = await api.put(`/nenshkrimet/${nenshkrimModal._id}`, nenshkrimModal);
        setNenshkrimet(p => p.map(n => n._id === nenshkrimModal._id ? r.data.nenshkrimi : n));
        toast.success('Nënshkrimi u përditësua!');
      } else {
        const r = await api.post('/nenshkrimet', nenshkrimModal);
        setNenshkrimet(p => [...p, r.data.nenshkrimi]);
        toast.success('Nënshkrimi u shtua!');
      }
      setNenshkrimModal(null);
    } catch (e) { toast.error(e.response?.data?.mesazh || 'Gabim gjatë ruajtjes'); }
    setRuanNenshkrim(false);
  };

  const fshiNenshkrimin = async (id) => {
    if (!confirm('Fshi nënshkrimin?')) return;
    try {
      await api.delete(`/nenshkrimet/${id}`);
      setNenshkrimet(p => p.filter(n => n._id !== id));
      toast.success('Nënshkrimi u fshi');
    } catch { toast.error('Gabim gjatë fshirjes'); }
  };

  const ruajPDF = async () => {
    setRuanPdf(true);
    try {
      await api.put('/settings', pdf);
      toast.success('Cilesimet u ruajten!');
    } catch { toast.error('Gabim gjate ruajtjes'); }
    setRuanPdf(false);
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cilësimet</h1>
        <p className="text-gray-500 text-sm">Menaxho sistemin, perdoruesit dhe raportet</p>
      </div>

      {/* Tabs kryesore */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={15}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: PERDORUESIT ══ */}
      {tab === 'perdoruesit' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {[{ id: 'stafi', label: 'Stafi & Perdoruesit' }, { id: 'rolet', label: 'Rolet & Qasja' }].map(st => (
              <button key={st.id} onClick={() => setNenpTab(st.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  nenpTab === st.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {st.label}
              </button>
            ))}
          </div>

          {/* ─── Sub-tab: STAFI ─────────────────────────────────── */}
          {nenpTab === 'stafi' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-700">Stafi i Klinikës</h2>
                <button onClick={() => { setForma(FORMA_USER); setModalHapur(true); }}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Plus size={16}/> Shto Perdorues
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ngarkimi ? [...Array(4)].map((_,i) => (
                  <div key={i} className="h-36 bg-gray-50 rounded-xl animate-pulse" />
                )) : perdoruesit.map(p => (
                  <div key={p._id} className={`card border-2 ${p.aktiv ? 'border-gray-100' : 'border-red-100 bg-red-50/30 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                        {p.emri[0]}{p.mbiemri[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{p.emri} {p.mbiemri}</p>
                        <p className="text-xs text-gray-400 truncate">{p.email}</p>
                        {p.specialiteti && <p className="text-xs text-gray-500">{p.specialiteti}</p>}
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${roliStyle[p.roli] || 'bg-gray-100 text-gray-600'}`}>
                          {roliLabel[p.roli] || p.roli}
                        </span>
                      </div>
                    </div>
                    {/* Qasjet — numër modulesh */}
                    <div className="mt-2 text-xs text-gray-400">
                      <ShieldCheck size={11} className="inline mr-1"/>
                      {efektiveQasjet(p).length}/{MODULET.length} module
                      {p.qasjet?.length > 0 && <span className="ml-1 text-blue-500">(i personalizuar)</span>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => hapEditModal(p)}
                        className="flex-1 text-xs py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-1">
                        <Pencil size={11}/> Edito
                      </button>
                      <button onClick={() => ndryshAktiv(p._id, !p.aktiv)}
                        className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                          p.aktiv ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}>
                        {p.aktiv ? 'Çaktivizo' : '✓ Aktivizo'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Sub-tab: ROLET & QASJA ─────────────────────────── */}
          {nenpTab === 'rolet' && (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-700">Qasja sipas Roleve</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cakto se cilat module shfaqen për çdo rol. Perdoruesit me qasje të personalizuar nuk ndikohen.
                  </p>
                </div>
                <button onClick={ruajRoletQasjet} disabled={ruanRolet}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <Save size={15}/> {ruanRolet ? 'Duke ruajtur...' : 'Ruaj Rolet'}
                </button>
              </div>

              {/* Rol tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {ROLET.map(r => (
                  <button key={r} onClick={() => setRoliAktiv(r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      roliAktiv === r ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    {roliLabel[r]}
                  </button>
                ))}
              </div>

              {/* Admin notice */}
              {roliAktiv === 'admin' ? (
                <div className="card border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-primary"/>
                    <div>
                      <p className="font-semibold text-gray-800">Administrator</p>
                      <p className="text-sm text-gray-500">Administratori ka qasje në të gjitha modulet gjithmonë. Nuk mund të kufizohet.</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MODULET.map(m => (
                      <div key={m.id} className="flex items-center gap-2 py-1.5 px-3 bg-primary/10 rounded-lg opacity-75">
                        <span className="w-3.5 h-3.5 rounded border-2 border-primary bg-primary flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 10 10" className="w-2 h-2 text-white fill-white"><path d="M1 5l3 3 5-5"/></svg>
                        </span>
                        <span className="text-xs text-gray-700">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card space-y-4">
                  <p className="text-sm font-medium text-gray-700">
                    Module të aksesueshme për <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roliStyle[roliAktiv]}`}>{roliLabel[roliAktiv]}</span>
                  </p>
                  {GROUPS.map(grp => (
                    <div key={grp}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{grp}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MODULET.filter(m => m.group === grp).map(m => {
                          const aktiv = roletQasjet[roliAktiv]?.includes(m.id);
                          return (
                            <label key={m.id} className={`flex items-center gap-2 py-2 px-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                              aktiv ? 'border-primary/30 bg-primary/5' : 'border-gray-100 bg-gray-50 opacity-60'
                            }`}>
                              <input type="checkbox" checked={aktiv}
                                onChange={() => toggleRolQasje(m.id)}
                                className="w-4 h-4 rounded accent-[#1A3A6B]"/>
                              <span className="text-xs text-gray-700 font-medium">{m.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: PDF ══ */}
      {tab === 'pdf' && (
        <div className="max-w-2xl space-y-5">
          {ngarkonPdf ? (
            <div className="space-y-3">
              {[...Array(4)].map((_,i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}
            </div>
          ) : <>
            {/* Logo */}
            <div className="card space-y-4">
              <h3 className="font-medium text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                <Image size={14}/> Logo Klinikes
              </h3>
              <p className="text-xs text-gray-400">
                Logoja shfaqet ne krye te cdo raporti PDF, mbi gjeresine e plote te tabeles. PNG ose JPG, maks 2 MB.
              </p>
              {pdf.logo ? (
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <img src={pdf.logo} alt="Logo" className="w-full h-auto block" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                      <Upload size={14}/> Ndrysho
                    </button>
                    <button onClick={() => set('logo', '')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={14}/> Hiq Logo
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => logoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors">
                  <Upload size={22}/>
                  <span className="text-sm font-medium">Ngarko Logo</span>
                  <span className="text-xs">PNG, JPG · maks 2 MB</span>
                </button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={zgjedhLogo}/>
              <div className="border-t border-gray-100 pt-4">
                <label className="label">Teksti i Header-it <span className="text-red-400">*</span></label>
                <p className="text-xs text-gray-400 mb-2">
                  Shfaqet ne anen e djathte, mbi te dhenat e pacientit. Cdo rresht del si rresht i ri — rreshti i pare del i theksuar (i madh).
                </p>
                <RichTextEditor value={pdf.headerTekst || ''} onChange={v => set('headerTekst', v)}
                  placeholder="LABORATORI MJEKESOR&#10;Rr. Shembull 1, Tiranë&#10;Tel: 04 xxx xxxx" minHeight="5rem"/>
              </div>
            </div>

            {/* Klinika */}
            <div className="card space-y-4">
              <h3 className="font-medium text-gray-600 text-sm uppercase tracking-wide">Klinika</h3>
              {[
                ['emriKlinikes', 'Emri i Klinikes'], ['adresaKlinikes', 'Adresa'],
                ['telefonKlinikes', 'Telefoni'], ['emailKlinikes', 'Email'],
                ['nrUnik', 'No. Unik (NUIS)'],
                ['nrFiskal', 'No. Fiskal'],
              ].map(([k, l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" value={pdf[k] || ''} onChange={e => set(k, e.target.value)} />
                </div>
              ))}
            </div>

            {/* Nënshkrimet */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-600 text-sm uppercase tracking-wide flex items-center gap-2">
                    <PenLine size={14}/> Nënshkrimet (Footer PDF)
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Nënshkrimet <span className="font-semibold text-green-600">Active</span> shfaqen në PDF sipas departamentit.
                  </p>
                </div>
                <button onClick={() => setNenshkrimModal({ ...NENSHKRIM_BOSH })}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <Plus size={13}/> Shto Nënshkrim
                </button>
              </div>
              {nenshkrimet.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <PenLine size={24} className="text-gray-300 mx-auto mb-2"/>
                  <p className="text-sm text-gray-400">Asnjë nënshkrim i shtuar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nenshkrimet.map(n => (
                    <div key={n._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      n.aktiv ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}>
                      <div className="w-20 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200">
                        {n.foto ? <img src={n.foto} alt="" className="w-full h-full object-contain p-1"/>
                          : <PenLine size={18} className="text-gray-300"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{n.emri} {n.mbiemri}</p>
                        {n.titulli && <p className="text-xs text-gray-500">{n.titulli}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{n.departamenti}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${n.aktiv ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {n.aktiv ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setNenshkrimModal({ ...n })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => fshiNenshkrimin(n._id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="card space-y-4">
              <h3 className="font-medium text-gray-600 text-sm uppercase tracking-wide">Footer Raporti</h3>
              <div>
                <label className="label">Teksti i Footer-it</label>
                <RichTextEditor value={pdf.footer || ''} onChange={v => set('footer', v)}
                  placeholder="p.sh. Konfidencial — Vetëm për qëllime mjekësore..." minHeight="3.5rem"/>
              </div>
            </div>

            <button onClick={ruajPDF} disabled={ruanPdf} className="btn-primary flex items-center gap-2">
              <Save size={16}/> {ruanPdf ? 'Duke ruajtur...' : 'Ruaj Cilesimet'}
            </button>
          </>}
        </div>
      )}

      {/* ══ TAB: FINANCA ══ */}
      {tab === 'financa' && (
        <div className="max-w-2xl space-y-5">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Banknote size={17} className="text-primary"/> Cilësimet e Financës & Faturimit
          </h2>

          {/* Seller company fields */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Të dhënat e Shitësit (Kompania Jonë)</h3>
            <p className="text-xs text-gray-400">Këto të dhëna do të shfaqen automatikisht si "Shitësi" në faturat PDF.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nr. TVSH</label>
                <input className="input" value={finance.nrTvsh || ''}
                  onChange={e => setFinance(p => ({ ...p, nrTvsh: e.target.value }))}
                  placeholder="p.sh. AL1234567890"/>
              </div>
              <div>
                <label className="label">Nr. Biznesit (NUIS)</label>
                <input className="input" value={finance.nrBiznesit || ''}
                  onChange={e => setFinance(p => ({ ...p, nrBiznesit: e.target.value }))}
                  placeholder="p.sh. K12345678A"/>
              </div>
            </div>
            <p className="text-xs text-gray-400">Emri, adresa, tel, email, No. Unik dhe No. Fiskal vendosen tek tab-i <strong>Raporte PDF</strong>.</p>
          </div>

          {/* Invoice prefix + currency */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Numërtimi & Monedha</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Prefiksi Faturë Kompanie</label>
                <input className="input font-mono" value={finance.invoicePrefix || ''}
                  onChange={e => setFinance(p => ({ ...p, invoicePrefix: e.target.value.toUpperCase() }))}
                  placeholder="FAT"/>
                <p className="text-xs text-gray-400 mt-1">Shembull: {finance.invoicePrefix || 'FAT'}-2026-001</p>
              </div>
              <div>
                <label className="label">Prefiksi Faturë Pacienti</label>
                <input className="input font-mono" value={finance.invoicePatientPrefix || ''}
                  onChange={e => setFinance(p => ({ ...p, invoicePatientPrefix: e.target.value.toUpperCase() }))}
                  placeholder="FAT-PAC"/>
                <p className="text-xs text-gray-400 mt-1">Shembull: {finance.invoicePatientPrefix || 'FAT-PAC'}-2026-001</p>
              </div>
              <div>
                <label className="label">Monedha</label>
                <select className="input" value={finance.monedha || 'EUR'}
                  onChange={e => setFinance(p => ({ ...p, monedha: e.target.value }))}>
                  <option value="EUR">EUR — Euro</option>
                  <option value="ALL">ALL — Lekë</option>
                  <option value="USD">USD — Dollar</option>
                  <option value="CHF">CHF — Frank</option>
                  <option value="GBP">GBP — Pound</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Norma TVSH % <span className="text-xs text-gray-400 font-normal">(default në Faturë Pacienti)</span></label>
                <input type="number" min="0" max="100" className="input" value={finance.tvshNorma ?? 8}
                  onChange={e => setFinance(p => ({ ...p, tvshNorma: parseFloat(e.target.value) || 0 }))}
                  placeholder="8"/>
              </div>
            </div>
          </div>

          {/* Payment info — multiple bank accounts */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Të dhënat për Pagesë</h3>
                <p className="text-xs text-gray-400 mt-0.5">Shfaqen në seksionin e pagesës të faturës PDF.</p>
              </div>
              <button
                onClick={() => setFinance(p => ({ ...p, llogarite: [...(p.llogarite || []), { banka: '', nrLlogarise: '', perfituesi: '' }] }))}
                className="btn-outline text-xs flex items-center gap-1.5 py-1.5 px-3">
                <Plus size={13}/> Shto Bankë
              </button>
            </div>

            {(finance.llogarite || []).length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-2">Nuk ka llogari bankare. Klikoni "Shto Bankë" për të shtuar.</p>
            )}

            {(finance.llogarite || []).map((ll, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Llogaria {i + 1}</span>
                  <button
                    onClick={() => setFinance(p => ({ ...p, llogarite: (p.llogarite || []).filter((_, idx) => idx !== i) }))}
                    className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <X size={13}/>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Banka</label>
                    <input className="input" value={ll.banka || ''}
                      onChange={e => setFinance(p => { const a = [...(p.llogarite||[])]; a[i]={...a[i],banka:e.target.value}; return {...p,llogarite:a}; })}
                      placeholder="p.sh. Raiffeisen Bank"/>
                  </div>
                  <div>
                    <label className="label">Nr. i Llogarisë</label>
                    <input className="input font-mono" value={ll.nrLlogarise || ''}
                      onChange={e => setFinance(p => { const a = [...(p.llogarite||[])]; a[i]={...a[i],nrLlogarise:e.target.value}; return {...p,llogarite:a}; })}
                      placeholder="p.sh. 1234-5678-9012"/>
                  </div>
                </div>
                <div>
                  <label className="label">Përfituesi</label>
                  <input className="input" value={ll.perfituesi || ''}
                    onChange={e => setFinance(p => { const a = [...(p.llogarite||[])]; a[i]={...a[i],perfituesi:e.target.value}; return {...p,llogarite:a}; })}
                    placeholder="p.sh. EXACT LAB sh.p.k"/>
                </div>
              </div>
            ))}

            <div>
              <label className="label">Shënim Fature <span className="text-xs text-gray-400 font-normal">(Fatura Kompanie — afati pagese etj.)</span></label>
              <input className="input" value={finance.shenimFature || ''}
                onChange={e => setFinance(p => ({ ...p, shenimFature: e.target.value }))}
                placeholder="p.sh. Pagesa brenda 14 ditëve..."/>
            </div>
            <div>
              <label className="label">Tekst shtesë — Fatura Pacient <span className="text-xs text-gray-400 font-normal">(del poshtë bankës tek çdo faturë pacienti)</span></label>
              <textarea className="input min-h-[70px] resize-y" value={finance.shenimFaturePatient || ''}
                onChange={e => setFinance(p => ({ ...p, shenimFaturePatient: e.target.value }))}
                placeholder="p.sh. Faleminderit per besimin tuaj. Rezultatet jane konfidenciale."/>
            </div>
          </div>

          {/* Invoice header/footer text */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Teksti i Faturës PDF</h3>
            <div>
              <label className="label">Header i Faturës <span className="text-xs text-gray-400 font-normal">(rreshti ne krye)</span></label>
              <input className="input" value={finance.fatureHeaderTekst || ''}
                onChange={e => setFinance(p => ({ ...p, fatureHeaderTekst: e.target.value }))}
                placeholder="p.sh. Faleminderit per besimin tuaj!"/>
            </div>
            <div>
              <label className="label">Footer i Faturës <span className="text-xs text-gray-400 font-normal">(rreshti ne fund)</span></label>
              <input className="input" value={finance.fatureFooterTekst || ''}
                onChange={e => setFinance(p => ({ ...p, fatureFooterTekst: e.target.value }))}
                placeholder="p.sh. Pagesa duhet te kryhet brenda 30 diteve."/>
            </div>
          </div>

          {/* Fields to show in invoice */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Fushat ne Faturë PDF</h3>
            <p className="text-xs text-gray-400">Zgjidhni cilat informacione do te shfaqen ne faturat PDF te kompanive.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'shfaqLogoFature',     label: 'Logo e laboratorit' },
                { key: 'shfaqNIPTFature',     label: 'No. Unik / No. Fiskal' },
                { key: 'shfaqZbritjenFature', label: 'Zbritjet e aplikuara' },
                { key: 'shfaqBorxhinFature',  label: 'Shuma e papaguar' },
                { key: 'shfaqAnalizatFature', label: 'Analizat individuale' },
                { key: 'shfaqPaketatFature',  label: 'Paketat promocionale' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => setFinance(p => ({ ...p, [key]: !p[key] }))}
                    className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${finance[key] ? 'bg-primary' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${finance[key] ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={ruajFinance} disabled={ruanFinance} className="btn-primary flex items-center gap-2">
            <Save size={16}/> {ruanFinance ? 'Duke ruajtur...' : 'Ruaj Cilësimet e Financës'}
          </button>
        </div>
      )}

      {/* ══ TAB: NJOFTIMET ══ */}
      {tab === 'njoftimet' && (
        <div className="max-w-2xl space-y-5">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <BellRing size={17} className="text-primary"/> Njoftimet & QR Code
          </h2>

          {/* QR Code */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <QrCode size={14}/> QR Code në PDF
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Pacienti skanon QR-in nga raporti dhe sheh rezultatet online</p>
              </div>
              <div onClick={() => setNjoft(p => ({ ...p, qrKodAktiv: !p.qrKodAktiv }))}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${njoft.qrKodAktiv ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${njoft.qrKodAktiv ? 'translate-x-4' : 'translate-x-0.5'}`}/>
              </div>
            </div>
            {njoft.qrKodAktiv && (
              <div>
                <label className="label flex items-center gap-1"><Globe size={12}/> URL Bazë e Aplikacionit *</label>
                <input className="input" value={njoft.qrBaseUrl}
                  onChange={e => setNjoft(p => ({ ...p, qrBaseUrl: e.target.value }))}
                  placeholder="https://lab.shembull.com"/>
                <p className="text-xs text-gray-400 mt-1">
                  QR kodi do të pikasë: <code className="bg-gray-100 px-1 rounded">{njoft.qrBaseUrl || 'https://...'}/r/TOKEN</code>
                </p>
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
                  <MessageCircle size={14}/> WhatsApp Njoftimet
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Dërgo mesazh automatik kur rezultatet validohen</p>
              </div>
              <div onClick={() => setNjoft(p => ({ ...p, whatsappAktiv: !p.whatsappAktiv }))}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${njoft.whatsappAktiv ? 'bg-green-500' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${njoft.whatsappAktiv ? 'translate-x-4' : 'translate-x-0.5'}`}/>
              </div>
            </div>

            {njoft.whatsappAktiv && (<>
              <div>
                <label className="label">Provider</label>
                <select className="input" value={njoft.whatsappProvider}
                  onChange={e => setNjoft(p => ({ ...p, whatsappProvider: e.target.value }))}>
                  <option value="callmebot">CallMeBot (falas)</option>
                  <option value="twilio">Twilio</option>
                  <option value="custom">Webhook i personalizuar</option>
                </select>
              </div>

              {njoft.whatsappProvider === 'callmebot' && (
                <div>
                  <label className="label">CallMeBot API Key</label>
                  <input className="input font-mono" value={njoft.whatsappApiKey}
                    onChange={e => setNjoft(p => ({ ...p, whatsappApiKey: e.target.value }))}
                    placeholder="p.sh. 123456"/>
                  <p className="text-xs text-gray-400 mt-1">
                    Regjistrohu falas te <strong>callmebot.com</strong> duke dërguar mesazhin "I allow callmebot to send me messages" te numri +34 644 44 21 08 në WhatsApp.
                  </p>
                </div>
              )}

              {njoft.whatsappProvider === 'twilio' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Account SID</label>
                      <input className="input font-mono text-xs" value={njoft.whatsappTwilioSid}
                        onChange={e => setNjoft(p => ({ ...p, whatsappTwilioSid: e.target.value }))}
                        placeholder="ACxxxxxxxxxxxxxxxx"/>
                    </div>
                    <div>
                      <label className="label">Auth Token</label>
                      <input type="password" className="input font-mono text-xs" value={njoft.whatsappTwilioToken}
                        onChange={e => setNjoft(p => ({ ...p, whatsappTwilioToken: e.target.value }))}/>
                    </div>
                  </div>
                  <div>
                    <label className="label">Numri Dërgues (Twilio Sandbox)</label>
                    <input className="input font-mono" value={njoft.whatsappTwilioFrom}
                      onChange={e => setNjoft(p => ({ ...p, whatsappTwilioFrom: e.target.value }))}
                      placeholder="whatsapp:+14155238886"/>
                  </div>
                </div>
              )}

              {njoft.whatsappProvider === 'custom' && (
                <div>
                  <label className="label">Webhook URL (POST)</label>
                  <input className="input font-mono" value={njoft.whatsappWebhookUrl}
                    onChange={e => setNjoft(p => ({ ...p, whatsappWebhookUrl: e.target.value }))}
                    placeholder="https://api.shembull.com/whatsapp"/>
                  <p className="text-xs text-gray-400 mt-1">Do të dërgohet: <code className="bg-gray-100 px-1 rounded">{'{ "telefoni": "...", "mesazhi": "..." }'}</code></p>
                </div>
              )}

              <div>
                <label className="label">Template i Mesazhit <span className="text-gray-400 font-normal">(opsional)</span></label>
                <textarea className="input min-h-[80px] resize-y text-sm" value={njoft.whatsappTemplate}
                  onChange={e => setNjoft(p => ({ ...p, whatsappTemplate: e.target.value }))}
                  placeholder="Të nderuari {emri}, rezultatet tuaja ({numrPorosi}) janë gati. {link}"/>
                <p className="text-xs text-gray-400 mt-1">
                  Variabla: <code className="bg-gray-100 px-1 rounded">{'{emri}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{numrPorosi}'}</code>{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{link}'}</code>
                </p>
              </div>
            </>)}
          </div>

          <button onClick={ruajNjoftimet} disabled={ruanNjoft} className="btn-primary flex items-center gap-2">
            <Save size={16}/> {ruanNjoft ? 'Duke ruajtur...' : 'Ruaj Cilësimet'}
          </button>
        </div>
      )}

      {/* ══ TAB: KODET ZBRITJE ══ */}
      {tab === 'zbritjet' && (
        <div className="max-w-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Kodet e Zbritjes</h2>
              <p className="text-sm text-gray-500">Menaxho kodet e zbritjes (p.sh. Karta e Rinisë)</p>
            </div>
            <button onClick={() => setKodModal({ ...KOD_BOSH })}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15}/> Kod i Ri
            </button>
          </div>

          {ngarkonKodet ? (
            <div className="text-center py-10 text-gray-400 text-sm">Duke ngarkuar...</div>
          ) : kodetZbritje.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Nuk ka kode të zbritjes</div>
          ) : (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Kodi</th>
                    <th className="px-4 py-3 text-left">Zbritja</th>
                    <th className="px-4 py-3 text-left">Përshkrim</th>
                    <th className="px-4 py-3 text-left">Valid deri</th>
                    <th className="px-4 py-3 text-left">Pérdorime</th>
                    <th className="px-4 py-3 text-left">Statusi</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kodetZbritje.map(k => {
                    const skaduar = new Date() > new Date(k.validDeri);
                    return (
                      <tr key={k._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-semibold text-primary">{k.kodi}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{k.zbritja}%</td>
                        <td className="px-4 py-3 text-gray-600">{k.pershkrim || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <span className={skaduar ? 'text-red-500' : ''}>
                            {k.validDeri ? new Date(k.validDeri).toLocaleDateString('sq') : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {k.numriPerdorimeve || 0}
                          {k.limitPerdorimesh ? ` / ${k.limitPerdorimesh}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          {skaduar ? (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Skaduar</span>
                          ) : k.aktiv ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktiv</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Joaktiv</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => hapPerdorimet(k)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">
                              <Eye size={12}/> Përdorimet
                            </button>
                            <button onClick={() => setKodModal({ ...k, validDeri: k.validDeri?.slice(0,10) || '', limitPerdorimesh: k.limitPerdorimesh || '' })}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Pencil size={14}/></button>
                            <button onClick={() => fshiKodin(k._id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal perdorimet */}
          {perdorimetModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Përdorimet — <span className="font-mono text-primary">{perdorimetModal.kodi}</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">Zbritje {perdorimetModal.zbritja}% · Grupuar sipas pacientit</p>
                  </div>
                  <button onClick={() => setPerdorimetModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4">
                  {ngarkonPerdorimet ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
                    </div>
                  ) : perdorimetModal.perdorimet.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      Ky kod nuk është përdorur ende.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {perdorimetModal.perdorimet.map((grup, gi) => (
                        <div key={gi} className="border border-gray-200 rounded-xl overflow-hidden">
                          {/* Patient header */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                {gi + 1}
                              </div>
                              <span className="font-semibold text-gray-800 text-sm">{grup.pacientEmri || 'I panjohur'}</span>
                            </div>
                            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                              {grup.numriHereve} {grup.numriHereve === 1 ? 'herë' : 'herë'}
                            </span>
                          </div>
                          {/* Per-usage rows */}
                          <div className="divide-y divide-gray-100">
                            {[...grup.perdorimet]
                              .sort((a, b) => new Date(b.data) - new Date(a.data))
                              .map((p, pi) => (
                                <div key={pi} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                                  <span className="text-gray-400 text-xs w-24 flex-shrink-0 pt-0.5">
                                    {p.data ? new Date(p.data).toLocaleDateString('sq-AL') : '—'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    {p.analizat?.filter(Boolean).length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {p.analizat.filter(Boolean).map((a, ai) => (
                                          <span key={ai} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{a}</span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">#{p.numrPorosi || '—'}</span>
                                    )}
                                  </div>
                                  <span className="text-green-700 font-medium text-xs flex-shrink-0">
                                    −{p.zbritjaSHuma?.toFixed(2)} €
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 border-t flex-shrink-0 flex justify-between items-center">
                  {!ngarkonPerdorimet && perdorimetModal.perdorimet.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {perdorimetModal.perdorimet.reduce((s, g) => s + g.numriHereve, 0)} përdorime gjithsej ·{' '}
                      {perdorimetModal.perdorimet.reduce((s, g) => s + (g.totalZbritje || 0), 0).toFixed(2)} € zbritje totale
                    </p>
                  )}
                  <button onClick={() => setPerdorimetModal(null)} className="btn-ghost text-sm ml-auto">Mbyll</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal create/edit */}
          {kodModal && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{kodModal._id ? 'Ndrysho Kodin' : 'Kod i Ri Zbritjeje'}</h3>
                  <button onClick={() => setKodModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16}/></button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Kodi *</label>
                      <input className="input uppercase" placeholder="p.sh. RINOR25"
                        value={kodModal.kodi} disabled={!!kodModal._id}
                        onChange={e => setKodModal(p => ({ ...p, kodi: e.target.value.toUpperCase() }))}/>
                    </div>
                    <div>
                      <label className="label">Zbritja (%) *</label>
                      <input className="input" type="number" min="1" max="100" placeholder="20"
                        value={kodModal.zbritja}
                        onChange={e => setKodModal(p => ({ ...p, zbritja: e.target.value }))}/>
                    </div>
                  </div>
                  <div>
                    <label className="label">Përshkrim</label>
                    <input className="input" placeholder="p.sh. Karta e Rinisë"
                      value={kodModal.pershkrim}
                      onChange={e => setKodModal(p => ({ ...p, pershkrim: e.target.value }))}/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Valid deri *</label>
                      <input className="input" type="date"
                        value={kodModal.validDeri}
                        onChange={e => setKodModal(p => ({ ...p, validDeri: e.target.value }))}/>
                    </div>
                    <div>
                      <label className="label">Limit përdorimesh</label>
                      <input className="input" type="number" min="1" placeholder="Pa limit"
                        value={kodModal.limitPerdorimesh}
                        onChange={e => setKodModal(p => ({ ...p, limitPerdorimesh: e.target.value }))}/>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setKodModal(p => ({ ...p, aktiv: !p.aktiv }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${kodModal.aktiv ? 'bg-primary' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${kodModal.aktiv ? 'translate-x-6' : 'translate-x-1'}`}/>
                    </button>
                    <span className="text-sm text-gray-600">Kodi {kodModal.aktiv ? 'aktiv' : 'joaktiv'}</span>
                  </div>
                </div>
                <div className="px-6 py-4 border-t flex gap-3">
                  <button onClick={() => setKodModal(null)} className="btn-ghost flex-1 text-sm">Anulo</button>
                  <button onClick={ruajKodin} disabled={ruanKodin} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                    <Save size={14}/>{ruanKodin ? 'Duke ruajtur...' : 'Ruaj'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: BACKUP ══ */}
      {tab === 'backup' && (
        <div className="max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <HardDrive size={17} className="text-primary"/> Backup Databazës
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Eksporto të gjitha të dhënat si ZIP — ruaj dhe shkarko kur të duash</p>
            </div>
            <button
              onClick={krijoBackup}
              disabled={dukeBackupuar}
              className="btn-primary flex items-center gap-2 text-sm">
              <RotateCcw size={15} className={dukeBackupuar ? 'animate-spin' : ''}/>
              {dukeBackupuar ? 'Duke krijuar...' : 'Backup Tani'}
            </button>
          </div>

          {/* Schedule settings */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
              <Clock size={14}/> Orari Automatik
            </h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setBackupSettings(p => ({ ...p, backupAktiv: !p.backupAktiv }))}
                className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative cursor-pointer ${backupSettings.backupAktiv ? 'bg-primary' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${backupSettings.backupAktiv ? 'translate-x-4' : 'translate-x-0.5'}`}/>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Backup automatik</span>
                <p className="text-xs text-gray-400">{backupSettings.backupAktiv ? 'Aktivizuar — backup kryhet sipas orarit' : 'Çaktivizuar'}</p>
              </div>
            </label>

            {backupSettings.backupAktiv && (
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="label">Frekuenca</label>
                  <select className="input" value={bsOrari.tipi}
                    onChange={e => setBsOrari(e.target.value, bsOrari.ora)}>
                    <option value="ditore">Çdo ditë</option>
                    <option value="javore">Çdo javë (E hënë)</option>
                    <option value="mujore">Çdo muaj (Dita 1)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Ora</label>
                  <input type="time" className="input" value={bsOrari.ora}
                    onChange={e => setBsOrari(bsOrari.tipi, e.target.value)}/>
                </div>
                <div>
                  <label className="label">Maks. backup ruajtur</label>
                  <input type="number" min="1" max="50" className="input"
                    value={backupSettings.backupMaksimum}
                    onChange={e => setBackupSettings(p => ({ ...p, backupMaksimum: parseInt(e.target.value) || 10 }))}/>
                </div>
              </div>
            )}

            {!backupSettings.backupAktiv && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="label">Maks. backup ruajtur</label>
                  <input type="number" min="1" max="50" className="input"
                    value={backupSettings.backupMaksimum}
                    onChange={e => setBackupSettings(p => ({ ...p, backupMaksimum: parseInt(e.target.value) || 10 }))}/>
                </div>
              </div>
            )}

            <button onClick={ruajSettingsBackup} disabled={ruanBackup}
              className="btn-primary flex items-center gap-2 text-sm w-fit">
              <Save size={14}/> {ruanBackup ? 'Duke ruajtur...' : 'Ruaj Cilësimet'}
            </button>
          </div>

          {/* Backup list */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Backup-et e Ruajtura
                {backupet.length > 0 && <span className="ml-2 text-gray-400 font-normal normal-case">({backupet.length})</span>}
              </h3>
            </div>

            {ngarkonBackup ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse"/>)}
              </div>
            ) : backupet.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                <HardDrive size={28} className="text-gray-300 mx-auto mb-2"/>
                <p className="text-sm text-gray-400">Asnjë backup i ruajtur</p>
                <p className="text-xs text-gray-300 mt-1">Kliko "Backup Tani" për të krijuar të parin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backupet.map((b, i) => (
                  <div key={b.filename}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${i === 0 ? 'border-green-200 bg-green-50/50' : 'border-gray-100 bg-white'}`}>
                    {i === 0 ? (
                      <CheckCircle2 size={16} className="text-green-500 flex-shrink-0"/>
                    ) : (
                      <HardDrive size={16} className="text-gray-300 flex-shrink-0"/>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-gray-700 truncate">{b.filename}</p>
                      <p className="text-xs text-gray-400">
                        {b.madhesia ? `${(b.madhesia / 1024 / 1024).toFixed(2)} MB · ` : ''}
                        {b.data ? new Date(b.data).toLocaleString('sq-AL', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                        {i === 0 && <span className="ml-2 text-green-600 font-medium">Më i fundit</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => shkarkoBackup(b.filename)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                        title="Shkarko">
                        <Download size={14}/>
                      </button>
                      <button onClick={() => fshiBackup(b.filename)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Fshi">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <span>Backup-et ruhen lokalisht në server. Rekomandohet të shkarkoni periodikisht dhe t'i ruani në vend të sigurt të jashtëm.</span>
          </div>
        </div>
      )}

      {/* ══ TAB: SISTEMI ══ */}
      {tab === 'sistemi' && (
        <div className="max-w-xl space-y-5">
          <h2 className="font-semibold text-gray-700">Informacioni i Sistemit</h2>
          <div className="card space-y-3 text-sm">
            {[
              ['Versioni', '1.0.0'],
              ['Stack', 'MERN (MongoDB, Express, React, Node.js)'],
              ['Frontend', 'React 18 + Vite + Tailwind CSS'],
              ['Backend', 'Node.js + Express.js'],
              ['Databaza', 'MongoDB'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ MODAL: EDITO PERDORUESIN ══ */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <h2 className="font-bold text-lg">Edito Perdoruesin</h2>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Info bazë */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Emri *</label>
                  <input className="input" value={editModal.emri}
                    onChange={e => setEditModal(p => ({ ...p, emri: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Mbiemri *</label>
                  <input className="input" value={editModal.mbiemri}
                    onChange={e => setEditModal(p => ({ ...p, mbiemri: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={editModal.email}
                  onChange={e => setEditModal(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fjalëkalimi i Ri <span className="text-gray-400 font-normal">(lëre bosh për të ruajtur të vjetrin)</span></label>
                <div className="relative">
                  <input type={shfaqFjal ? 'text' : 'password'} className="input pr-10"
                    placeholder="••••••••" value={editModal.fjalekalimi}
                    onChange={e => setEditModal(p => ({ ...p, fjalekalimi: e.target.value }))} />
                  <button type="button" onClick={() => setShfaqFjal(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {shfaqFjal ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Roli</label>
                  <select className="input" value={editModal.roli} onChange={e => setEditRoli(e.target.value)}>
                    {ROLET.map(r => <option key={r} value={r}>{roliLabel[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Telefoni</label>
                  <input className="input" value={editModal.telefoni}
                    onChange={e => setEditModal(p => ({ ...p, telefoni: e.target.value }))} />
                </div>
              </div>
              {editModal.roli === 'mjek' && (
                <div>
                  <label className="label">Specialiteti</label>
                  <input className="input" value={editModal.specialiteti}
                    onChange={e => setEditModal(p => ({ ...p, specialiteti: e.target.value }))}
                    placeholder="p.sh. Mjekësi e Brendshme" />
                </div>
              )}

              {/* Qasja */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-primary"/> Qasja në Module
                    </p>
                    <p className="text-xs text-gray-400">
                      {editModal.roli === 'admin'
                        ? 'Administratori ka qasje në të gjitha modulet'
                        : 'Checkbox-et e zgjedhura do të shfaqen në menunë anësore'}
                    </p>
                  </div>
                  {editModal.roli !== 'admin' && (
                    <button onClick={() => setEditModal(p => ({ ...p, qasjet: roletQasjet[p.roli] || QASJA_DEFAULT[p.roli] || [] }))}
                      className="text-xs text-blue-600 hover:underline">
                      Rivendos nga roli
                    </button>
                  )}
                </div>

                {GROUPS.map(grp => (
                  <div key={grp}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{grp}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MODULET.filter(m => m.group === grp).map(m => {
                        const aktiv = editModal.roli === 'admin' || editModal.qasjet.includes(m.id);
                        return (
                          <label key={m.id} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg border cursor-pointer select-none transition-all ${
                            editModal.roli === 'admin' ? 'opacity-60 cursor-default' : ''
                          } ${aktiv ? 'border-primary/30 bg-primary/5' : 'border-gray-100 bg-gray-50'}`}>
                            <input type="checkbox" checked={aktiv}
                              onChange={() => toggleEditQasje(m.id)}
                              disabled={editModal.roli === 'admin'}
                              className="w-3.5 h-3.5 rounded accent-[#1A3A6B]"/>
                            <span className="text-xs text-gray-700">{m.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
              <button onClick={() => setEditModal(null)} className="btn-ghost flex-1">Anulo</button>
              <button onClick={ruajEditUser} disabled={duke_ruajtur}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={15}/> {duke_ruajtur ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: SHTO PERDORUES ══ */}
      {modalHapur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">Shto Perdorues të Ri</h2>
              <button onClick={() => setModalHapur(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Emri *</label>
                  <input className="input" value={forma.emri} onChange={e => setForma(p => ({ ...p, emri: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Mbiemri *</label>
                  <input className="input" value={forma.mbiemri} onChange={e => setForma(p => ({ ...p, mbiemri: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={forma.email} onChange={e => setForma(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="label">Fjalëkalimi *</label>
                <input type="password" className="input" value={forma.fjalekalimi} onChange={e => setForma(p => ({ ...p, fjalekalimi: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Roli</label>
                  <select className="input" value={forma.roli} onChange={e => setForma(p => ({ ...p, roli: e.target.value }))}>
                    {ROLET.map(r => <option key={r} value={r}>{roliLabel[r]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Telefoni</label>
                  <input className="input" value={forma.telefoni} onChange={e => setForma(p => ({ ...p, telefoni: e.target.value }))} />
                </div>
              </div>
              {forma.roli === 'mjek' && (
                <div>
                  <label className="label">Specialiteti</label>
                  <input className="input" value={forma.specialiteti} onChange={e => setForma(p => ({ ...p, specialiteti: e.target.value }))} placeholder="p.sh. Mjekesi e Brendshme" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalHapur(false)} className="btn-ghost flex-1">Anulo</button>
                <button onClick={ruajUser} disabled={duke_ruajtur} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Save size={16}/> {duke_ruajtur ? 'Duke shtuar...' : 'Shto Perdoruesin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: NËNSHKRIMI ══ */}
      {nenshkrimModal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">{nenshkrimModal._id ? 'Edito Nënshkrimin' : 'Shto Nënshkrim'}</h2>
              <button onClick={() => setNenshkrimModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Emri *</label>
                  <input className="input" value={nenshkrimModal.emri}
                    onChange={e => setNenshkrimModal(p => ({ ...p, emri: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Mbiemri *</label>
                  <input className="input" value={nenshkrimModal.mbiemri}
                    onChange={e => setNenshkrimModal(p => ({ ...p, mbiemri: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Titulli / Pozita</label>
                <input className="input" value={nenshkrimModal.titulli}
                  placeholder="p.sh. Biolog Klinik, MSc"
                  onChange={e => setNenshkrimModal(p => ({ ...p, titulli: e.target.value }))} />
              </div>
              <div>
                <label className="label">Licenca <span className="text-gray-400 font-normal text-xs">(opsionale)</span></label>
                <input className="input" value={nenshkrimModal.licenca || ''}
                  placeholder="p.sh. Nr. 12345"
                  onChange={e => setNenshkrimModal(p => ({ ...p, licenca: e.target.value }))} />
              </div>
              <div>
                <label className="label">Lloji i Validimit</label>
                <div className="flex gap-3 mt-1">
                  {[['teknik', 'Validim Teknik'], ['mjekesor', 'Validim Mjekësor']].map(([val, lbl]) => (
                    <label key={val} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="radio" name="validimTipi"
                        checked={(nenshkrimModal.validimTipi || 'teknik') === val}
                        onChange={() => setNenshkrimModal(p => ({ ...p, validimTipi: val }))} />
                      {lbl}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Departamentet</label>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {DEPARTAMENTET.map(d => {
                    const depts = nenshkrimModal.departamentet || ['Te gjitha'];
                    const checked = depts.includes(d);
                    return (
                      <label key={d} className="flex items-center gap-1.5 cursor-pointer text-sm">
                        <input type="checkbox" checked={checked}
                          onChange={e => {
                            const cur = nenshkrimModal.departamentet || [];
                            let next;
                            if (e.target.checked) {
                              next = d === 'Te gjitha' ? ['Te gjitha'] : [...cur.filter(x => x !== 'Te gjitha'), d];
                            } else {
                              next = cur.filter(x => x !== d);
                              if (!next.length) next = ['Te gjitha'];
                            }
                            setNenshkrimModal(p => ({ ...p, departamentet: next }));
                          }} />
                        {d === 'Te gjitha' ? 'Të gjitha' : d}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Foto Nënshkrimit <span className="text-red-400">*</span></label>
                {nenshkrimModal.foto ? (
                  <div className="space-y-2">
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex items-center justify-center min-h-[64px]">
                      <img src={nenshkrimModal.foto} alt="Nënshkrim" className="max-h-16 object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => nenshkrimFotoRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                        <Upload size={13}/> Ndrysho Foton
                      </button>
                      <button onClick={() => setNenshkrimModal(p => ({ ...p, foto: '' }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 size={13}/> Hiq
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => nenshkrimFotoRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors">
                    <Upload size={20}/>
                    <span className="text-sm font-medium">Ngarko Foton e Nënshkrimit</span>
                    <span className="text-xs">PNG, JPG · maks 2 MB</span>
                  </button>
                )}
                <input ref={nenshkrimFotoRef} type="file" accept="image/*" className="hidden" onChange={zgjedhFotoNenshkrimit} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Pozicioni i tekstit</p>
                  <p className="text-xs text-gray-400">Drejtimi i emrit dhe titullit në PDF</p>
                </div>
                <div className="flex gap-1">
                  {['left', 'right'].map(a => (
                    <button key={a} onClick={() => setNenshkrimModal(p => ({ ...p, align: a }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        (nenshkrimModal.align || 'left') === a
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-300 text-gray-500 hover:border-gray-400'
                      }`}>
                      {a === 'left' ? '← Majtë' : 'Djathtë →'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">Statusi</p>
                  <p className="text-xs text-gray-400">Nënshkrimet Active shfaqen në PDF</p>
                </div>
                <button onClick={() => setNenshkrimModal(p => ({ ...p, aktiv: !p.aktiv }))}>
                  {nenshkrimModal.aktiv
                    ? <ToggleRight size={32} className="text-primary"/>
                    : <ToggleLeft  size={32} className="text-gray-400"/>}
                </button>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setNenshkrimModal(null)} className="btn-ghost flex-1">Anulo</button>
              <button onClick={ruajNenshkrimin} disabled={ruanNenshkrim}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={15}/> {ruanNenshkrim ? 'Duke ruajtur...' : 'Ruaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
