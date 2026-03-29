import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  FlaskConical, Microscope, Dna, Plus, Search,
  Trash2, Save, CheckCircle, FileDown, Loader, Layers,
  MessageSquare, Pencil, ChevronDown, ChevronUp, X, ShieldCheck, Maximize2,
  Eye, EyeOff, Share2, Zap,
} from 'lucide-react';
import DateFilter, { labelData } from '../../components/ui/DateFilter';

const FLAMUR_RANK = { Shume_Larte: 5, Larte: 4, Shume_Ulet: 3, Ulet: 2, Normal: 1, '—': 0 };
const flamurBadge = {
  Shume_Larte: { label: '↑↑ HIGH', cls: 'bg-red-100 text-red-700 border-red-300' },
  Larte:       { label: '↑ High',  cls: 'bg-red-50 text-red-600 border-red-200' },
  Shume_Ulet:  { label: '↓↓ LOW',  cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  Ulet:        { label: '↓ Low',   cls: 'bg-blue-50 text-blue-600 border-blue-200' },
};
const worstFlamuriLive = (row, vlerat, pacGjinia, pacMosha) => {
  const refs = row.analiza?.komponente || [];
  let worst = '—';
  for (const ref of refs) {
    const key    = ref.emri || 'vlera';
    const val    = vlerat[String(row._id)]?.[key];
    if (val === '' || val == null) continue;
    const numVal = Number(val);
    if (isNaN(numVal)) continue;
    let kMin = ref.kritikMin != null ? Number(ref.kritikMin) : null;
    let kMax = ref.kritikMax != null ? Number(ref.kritikMax) : null;
    if (kMin == null || kMax == null) {
      const gjM = g => !g || g === 'Te dyja' || g === pacGjinia;
      const mM  = vl => pacMosha >= (vl.moshaMin ?? 0) && pacMosha <= (vl.moshaMax ?? 120);
      const vl1 = (ref.vlerat || []).find(v => gjM(v.gjinia) && mM(v) && v.kritikMin != null && v.kritikMax != null)
               || (ref.vlerat || []).find(v => v.kritikMin != null && v.kritikMax != null);
      if (vl1) { kMin = Number(vl1.kritikMin); kMax = Number(vl1.kritikMax); }
    }
    if (kMin == null || kMax == null) {
      const gjM = g => !g || g === 'Te dyja' || g === pacGjinia;
      const mM  = vl => pacMosha >= (vl.moshaMin ?? 0) && pacMosha <= (vl.moshaMax ?? 120);
      const vl2 = (ref.vlerat || []).find(v => gjM(v.gjinia) && mM(v) && v.operatori === 'midis' && v.vleraMin != null && v.vleraMax != null)
               || (ref.vlerat || []).find(v => v.operatori === 'midis' && v.vleraMin != null && v.vleraMax != null);
      if (vl2) { kMin = Number(vl2.vleraMin); kMax = Number(vl2.vleraMax); }
    }
    if (kMin == null || kMax == null) continue;
    let f = '—';
    if      (numVal < kMin * 0.7) f = 'Shume_Ulet';
    else if (numVal < kMin)       f = 'Ulet';
    else if (numVal > kMax * 1.5) f = 'Shume_Larte';
    else if (numVal > kMax)       f = 'Larte';
    if ((FLAMUR_RANK[f] || 0) > (FLAMUR_RANK[worst] || 0)) worst = f;
  }
  return worst;
};

const DEPARTAMENTET = [
  { emri: 'Biokimi',       icon: FlaskConical, ngjyra: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
  { emri: 'Mikrobiologji', icon: Microscope,   ngjyra: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  { emri: 'PCR',           icon: Dna,          ngjyra: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
];

const flamurInfo = {
  Normal:      { label: 'Normal',      cls: 'bg-green-100 text-green-700 border-green-200'                   },
  Larte:       { label: '↑ Larte',     cls: 'bg-red-100 text-red-700 border-red-200'                         },
  Shume_Larte: { label: '↑↑ S.Lart',  cls: 'bg-red-200 text-red-800 border-red-300 font-bold'               },
  Ulet:        { label: '↓ Ulet',      cls: 'bg-blue-100 text-blue-700 border-blue-200'                      },
  Shume_Ulet:  { label: '↓↓ S.Ulet',  cls: 'bg-blue-200 text-blue-800 border-blue-300 font-bold'            },
  Kritik:      { label: '!! Kritik',   cls: 'bg-red-200 text-red-900 border-red-400 font-bold'               },
  '—':         { label: '—',           cls: 'bg-gray-100 text-gray-500'                                      },
};

const inputNgjyra = (f) => {
  if (f === 'Shume_Larte' || f === 'Larte') return 'text-red-700 bg-red-50 border-red-300';
  if (f === 'Shume_Ulet'  || f === 'Ulet')  return 'text-blue-700 bg-blue-50 border-blue-300';
  if (f === 'Normal')                        return 'text-green-700 bg-green-50 border-green-300';
  return '';
};

const kompRefTekst = (ref) => {
  const op = ref.operatori || 'midis';
  const v1 = ref.vleraMin, v2 = ref.vleraMax, u = ref.njesia || '';
  switch (op) {
    case 'me_pak':        return `< ${v1} ${u}`.trim();
    case 'me_pak_baraz':  return `≤ ${v1} ${u}`.trim();
    case 'midis':         return v1 != null && v2 != null ? `${v1}–${v2} ${u}`.trim() : v1 != null ? `${v1} ${u}`.trim() : '—';
    case 'me_shum_baraz': return `≥ ${v1} ${u}`.trim();
    case 'me_shum':       return `> ${v1} ${u}`.trim();
    case 'tekst':         return ref.vleraTekst || '—';
    default:              return v1 != null && v2 != null ? `${v1}–${v2} ${u}`.trim() : '—';
  }
};

const parseVlera = v => (v === '' || v == null) ? '' : String(v).slice(0, 500);

const grupoSipasProfilit = (analizat) => {
  const grupet = new Map();
  grupet.set(null, { profiliId: null, profiliEmri: '', analizat: [] });
  analizat.forEach(row => {
    const pid = row.profiliId ? String(row.profiliId) : null;
    if (!grupet.has(pid)) grupet.set(pid, { profiliId: pid, profiliEmri: row.profiliEmri || '', analizat: [] });
    grupet.get(pid).analizat.push(row);
  });
  return [...grupet.values()].filter(g => g.analizat.length > 0);
};

// Textarea qe zgjerohet automatikisht sipas permbajtjes
function AutoTextarea({ value, onChange, onKeyDown, placeholder, disabled, className, maxLength = 500 }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className={className}
      style={{ resize: 'none', overflow: 'hidden', minHeight: '1.75rem' }}
    />
  );
}

// ─── Toggle koment (state lokale — kurrë nuk resetohet nga parent) ───────────
function KomentBio({ vlera, onChange, presets, onExpand, disabled }) {
  const [hapur, setHapur]         = useState(false);
  const [openPreset, setOpenPreset] = useState(false);
  const isHtml = /^<[a-zA-Z]/.test(vlera || '');

  // Mbyll preset dropdown kur klikohet jashte
  useEffect(() => {
    if (!openPreset) return;
    const handler = (e) => { if (!e.target.closest('[data-bp]')) setOpenPreset(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPreset]);

  return (
    <div className="mt-1.5">
      {/* Buton toggle */}
      <button type="button"
        onClick={() => setHapur(h => !h)}
        className={`flex items-center gap-1 text-xs py-0.5 transition-colors ${vlera ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-primary'}`}>
        <MessageSquare size={11}/>
        {vlera
          ? <span className="truncate max-w-[160px]">{vlera.length > 35 ? vlera.slice(0, 35) + '…' : vlera}</span>
          : 'Shto/Zgjidh koment'}
      </button>

      {/* Content kur eshte hapur */}
      {hapur && (
        <div className="mt-1 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <MessageSquare size={11} className="text-gray-400 flex-shrink-0 mt-1.5"/>
            {isHtml ? (
              <div className="flex-1 relative">
                <div className="input text-xs py-1.5 min-h-[1.75rem]"
                  dangerouslySetInnerHTML={{ __html: vlera }}/>
                {!disabled && (
                  <button type="button" title="Pastro komentin"
                    onClick={() => onChange('')}
                    className="absolute top-0.5 right-1 text-gray-300 hover:text-red-400 text-xs leading-none">✕</button>
                )}
              </div>
            ) : (
              <AutoTextarea
                autoFocus
                className="input text-xs flex-1 py-1.5"
                value={vlera}
                onChange={e => onChange(e.target.value)}
                placeholder="Shkruaj koment..."
                disabled={disabled}
                maxLength={2500}/>
            )}
            {onExpand && (
              <button type="button" title="Zmadho" onClick={onExpand}
                className="flex-shrink-0 mt-1 text-gray-300 hover:text-primary transition-colors">
                <Maximize2 size={12}/>
              </button>
            )}
          </div>
          {!disabled && (presets || []).length > 0 && (
            <div className="relative ml-5" data-bp>
              <button type="button"
                onClick={() => setOpenPreset(p => !p)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors">
                <MessageSquare size={10}/>
                Zgjidh koment
                <ChevronDown size={10} className={`transition-transform ${openPreset ? 'rotate-180' : ''}`}/>
              </button>
              {openPreset && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-72 max-h-52 overflow-y-auto">
                  {(presets || []).map((km, ki) => (
                    <button key={ki} type="button"
                      onClick={() => { onChange(vlera ? vlera + '\n' + km : km); setOpenPreset(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-primary/5 hover:text-primary border-b border-gray-100 last:border-0 transition-colors leading-relaxed">
                      {km}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Panel inline per rezultate ──────────────────────────────────────────────
function InlineRezultate({ porosiId, dep, onUpdated }) {
  const [porosi, setPorosi]             = useState(null);
  const [duke_ngarkuar, setDukeNgarkuar] = useState(true);
  const [vlerat, setVlerat]             = useState({});
  const [komente, setKomente]           = useState({});
  const [komentetProf, setKomentetProf] = useState({});
  const [duke_ruajtur, setDukeRuajtur]  = useState(false);
  const [duke_pdf, setDukePDF]          = useState(false);
  const [modoEdit, setModoEdit]         = useState(false);
  const [hapurProfilet, setHapurProfilet] = useState(new Set());
  const [modalShto, setModalShto]       = useState(false);
  const [depModal, setDepModal]         = useState('Biokimi');
  const [toateAnalizat, setToateAnalizat] = useState({});
  const [zgjedhurat, setZgjedhurat]     = useState(new Set());
  const [kerkoModal, setKerkoModal]     = useState('');
  const [duke_shto, setDukeShto]        = useState(false);
  const [dukeValidimT, setDukeValidimT] = useState(false);
  const [dukeValidimM, setDukeValidimM] = useState(false);
  const [nenshkrimet, setNenshkrimet]   = useState([]);
  const [vulatAktive, setVulatAktive]   = useState(() => {
    try {
      const saved = localStorage.getItem(`vula_${porosiId}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  }); // stamp IDs toggled on, persisted per order
  // expandModal: { type:'komponent'|'profil', rowId, key, profiliId, label }
  const [expandModal, setExpandModal]   = useState(null);
  const [expandVal, setExpandVal]       = useState('');
  // Antibiogram state (Mikrobiologji)
  const [openTekstKey, setOpenTekstKey]   = useState(null); // `${row._id}-${ri}` of open dropdown
  const [openKomentKey, setOpenKomentKey] = useState(null); // key of open predefined-comment dropdown
  const [antibiogramet, setAntibiogramet] = useState({});
  const [abGrupet, setAbGrupet]           = useState([]);
  // Modal for antibiotic selection
  const [abModalRow, setAbModalRow]       = useState(null);  // row._id | null
  const [abModalGrupiId, setAbModalGrupiId] = useState('');
  const [abModalZgjedhura, setAbModalZgjedhura] = useState(new Set()); // Set of antibiotic names
  const [abSablonet, setAbSablonet]       = useState([]);
  const [abModalTab, setAbModalTab]       = useState('manual'); // 'manual' | 'sablon'

  const isMikro = dep?.emri === 'Mikrobiologji';

  // Load antibiogram groups for Mikrobiologji
  useEffect(() => {
    if (!isMikro) return;
    api.get('/antibiogram/grupet').then(r => setAbGrupet(r.data.grupet || [])).catch(() => {});
    api.get('/antibiogram/sablonet').then(r => setAbSablonet(r.data.sablonet || [])).catch(() => {});
  }, [isMikro]);

  // Close tekst dropdown on outside click
  useEffect(() => {
    if (!openTekstKey) return;
    const handler = (e) => { if (!e.target.closest('[data-tekst-dropdown]')) setOpenTekstKey(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openTekstKey]);

  // Close koment dropdown on outside click
  useEffect(() => {
    if (!openKomentKey) return;
    const handler = (e) => { if (!e.target.closest('[data-koment-picker]')) setOpenKomentKey(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openKomentKey]);

  const toggleProfil = (pid) => setHapurProfilet(prev => {
    const next = new Set(prev);
    next.has(pid) ? next.delete(pid) : next.add(pid);
    return next;
  });

  const ngarko = () => {
    setDukeNgarkuar(true);
    api.get(`/laborator/porosi/${porosiId}`)
      .then(r => {
        const p = r.data.porosi;
        setPorosi(p);
        const v = {}, k = {}, kp = {}, ab = {};
        p.analizat?.forEach(a => {
          v[a._id] = {};
          k[a._id] = {};
          a.rezultate?.forEach((rez, ri) => {
            const key = rez.komponenti || 'vlera';
            v[a._id][key] = rez.vlera;
            k[a._id][key] = rez.koment || (ri === 0 ? (a.koment || '') : '');
          });
          if (a.antibiogram?.grupiId) {
            const rezObj = {};
            (a.antibiogram.rezultate || []).forEach(r => { rezObj[r.antibiotiku] = r.vlera; });
            ab[a._id] = {
              grupiId:   String(a.antibiogram.grupiId),
              grupiEmri: a.antibiogram.grupiEmri || '',
              rezultate: rezObj,
            };
          }
        });
        p.komentetProfileve?.forEach(kf => { kp[String(kf.profiliId)] = kf.koment || ''; });
        setVlerat(v); setKomente(k); setKomentetProf(kp); setAntibiogramet(ab);
        setDukeNgarkuar(false);
      })
      .catch(() => { toast.error('Porosi nuk u gjet'); setDukeNgarkuar(false); });
  };

  useEffect(() => { ngarko(); }, [porosiId]);

  // Ruaj vulatAktive ne localStorage per kete porosi
  useEffect(() => {
    try { localStorage.setItem(`vula_${porosiId}`, JSON.stringify([...vulatAktive])); }
    catch (_) {}
  }, [vulatAktive, porosiId]);

  // Load stamps applicable to this department
  useEffect(() => {
    api.get('/nenshkrimet')
      .then(r => {
        const depEmri = dep?.emri || '';
        const filtered = (r.data.nenshkrimet || []).filter(n => {
          const depts = n.departamentet?.length ? n.departamentet : [n.departamenti || 'Te gjitha'];
          return n.aktiv !== false && (depts.includes('Te gjitha') || depts.includes(depEmri));
        });
        setNenshkrimet(filtered);
      })
      .catch(() => {});
  }, [dep?.emri]);

  useEffect(() => {
    if (!modalShto) return;
    Promise.all(['Biokimi', 'Mikrobiologji', 'PCR'].map(d =>
      api.get('/laborator/analizat', { params: { departamenti: d, aktiv: 'true' } })
        .then(r => [d, r.data.analizat || []])
    )).then(results => {
      const obj = {};
      results.forEach(([d, arr]) => { obj[d] = arr; });
      setToateAnalizat(obj);
    }).catch(() => {});
  }, [modalShto]);

  const toggleZgjedhur = (id) => setZgjedhurat(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const shtoAnaliza = async () => {
    if (!zgjedhurat.size || !porosi) return;
    setDukeShto(true);
    try {
      const sipasDeprt = {};
      ['Biokimi', 'Mikrobiologji', 'PCR'].forEach(d => {
        const sel = (toateAnalizat[d] || []).filter(a => zgjedhurat.has(a._id));
        if (sel.length > 0) sipasDeprt[d] = sel;
      });
      for (const [d, analizat] of Object.entries(sipasDeprt)) {
        await api.post('/laborator/porosi', {
          pacientiId:    porosi.pacienti._id,
          analizatIds:   analizat.map(a => a._id),
          profiletIds:   [],
          departamenti:  d,
          tipiPacientit: porosi.tipiPacientit || 'pacient',
          referuesId:    porosi.referuesId?._id || undefined,
        });
      }
      toast.success('Analizat shtese u shtuan!');
      setModalShto(false);
      setZgjedhurat(new Set());
      onUpdated?.();
    } catch { toast.error('Gabim gjate regjistrimit'); }
    setDukeShto(false);
  };

  const setVleraFn = (analizaId, key, val) =>
    setVlerat(p => ({ ...p, [analizaId]: { ...p[analizaId], [key]: val } }));

  const ruajAnalizen = async (row, komentProfiliOverride) => {
    const refs = row.analiza?.komponente || [];
    const rezultate = refs.length > 0
      ? refs.map(ref => ({
          komponenti: ref.emri || '',
          vlera:      parseVlera(vlerat[row._id]?.[ref.emri || 'vlera'] ?? ''),
          njesia:     ref.njesia || '',
          koment:     komente[row._id]?.[ref.emri || 'vlera'] || '',
        }))
      : [{ komponenti: '', vlera: parseVlera(vlerat[row._id]?.['vlera'] ?? ''), njesia: '',
           koment: komente[row._id]?.['vlera'] || '' }];

    const payload = { analizaId: row.analiza._id, rezultate, koment: '' };
    // Include antibiogram for Mikrobiologji
    const ab = antibiogramet[row._id];
    if (isMikro && ab?.grupiId) {
      payload.antibiogram = {
        grupiId:   ab.grupiId,
        grupiEmri: ab.grupiEmri,
        rezultate: Object.entries(ab.rezultate || {})
          .filter(([, v]) => v)
          .map(([antibiotiku, vlera]) => ({ antibiotiku, vlera })),
      };
    }
    if (row.profiliId) {
      payload.profiliId     = String(row.profiliId);
      payload.komentProfili = komentProfiliOverride !== undefined
        ? komentProfiliOverride
        : (komentetProf[String(row.profiliId)] || '');
    }
    await api.put(`/laborator/porosi/${porosiId}/rezultate`, payload);
    toast.success(`${row.analiza.emri} — u ruajt!`);
    // Perditeso vetem kete analize ne state — mos rinderto faqen
    setPorosi(prev => {
      if (!prev) return prev;
      const analizatRe = prev.analizat.map(a =>
        a._id === row._id ? { ...a, kompletuar: true } : a
      );
      const nKompRe = analizatRe.filter(a => a.kompletuar).length;
      return { ...prev, analizat: analizatRe,
        statusi: nKompRe === analizatRe.length ? 'Kompletuar' : prev.statusi };
    });
    onUpdated?.();
  };

  const toggleFlag = async (row, flag) => {
    const newVal = row[flag] === false ? true : false;
    try {
      await api.patch(`/laborator/porosi/${porosiId}/analiza-flags`, { rowId: row._id, [flag]: newVal });
      setPorosi(prev => {
        if (!prev) return prev;
        return { ...prev, analizat: prev.analizat.map(a =>
          a._id === row._id ? { ...a, [flag]: newVal } : a
        )};
      });
    } catch { toast.error('Gabim duke ndryshuar opsionin'); }
  };

  const ruajTeGjitha = async () => {
    setDukeRuajtur(true);
    try {
      for (const row of (porosi?.analizat || [])) {
        if (!row.kompletuar || modoEdit) await ruajAnalizen(row);
      }
      toast.success('Te gjitha u ruajten!');
      if (modoEdit) setModoEdit(false);
      ngarko(); onUpdated?.();
    } catch { toast.error('Gabim gjate ruajtjes'); }
    setDukeRuajtur(false);
  };

  const vulaParams = () => {
    const ids = [...vulatAktive].join(',');
    return ids ? { vula: ids } : {};
  };

  const emriSkedar = () => {
    const pac = porosi?.pacienti || {};
    return [pac.emri, pac.mbiemri, porosi?.numrPorosi]
      .filter(Boolean).join('_').replace(/\s+/g, '_');
  };

  const hapPDF = async () => {
    setDukePDF(true);
    const win = window.open('', '_blank');
    try {
      const resp = await api.get(`/laborator/porosi/${porosiId}/pdf`, { responseType: 'blob', params: vulaParams() });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url  = window.URL.createObjectURL(blob) + '#' + encodeURIComponent(emriSkedar() + '.pdf');
      if (win) {
        win.location.href = url;
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch {
      if (win) win.close();
      toast.error('Gabim gjate hapjes se PDF');
    }
    setDukePDF(false);
  };

  const shkarko = async () => {
    setDukePDF(true);
    try {
      const resp = await api.get(`/laborator/porosi/${porosiId}/pdf`, { responseType: 'blob', params: vulaParams() });
      const url  = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `${emriSkedar()}.pdf`);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF u shkarkua!');
    } catch { toast.error('Gabim gjate gjenerimit te PDF'); }
    setDukePDF(false);
  };

  const bejValidim = async (tipi) => {
    const setDuke = tipi === 'teknik' ? setDukeValidimT : setDukeValidimM;
    setDuke(true);
    try {
      await api.put(`/laborator/porosi/${porosiId}/validim`, { tipi });
      toast.success(tipi === 'teknik' ? 'Validim Teknik u krye!' : 'Validim Mjekësor u krye!');
      ngarko(); onUpdated?.();
    } catch { toast.error('Gabim gjate validimit'); }
    setDuke(false);
  };

  if (duke_ngarkuar) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!porosi) return null;

  const pac        = porosi.pacienti;
  const mosha      = pac?.datelindja
    ? `${new Date().getFullYear() - new Date(pac.datelindja).getFullYear()} vj.` : '—';
  const kompletuar    = porosi.statusi === 'Kompletuar';
  const validTeknik   = porosi.validimTeknik?.bere   === true;
  const validMjekesor = porosi.validimMjekesor?.bere === true;

  const nKomp     = porosi.analizat?.filter(a => a.kompletuar).length || 0;
  const nTotal    = porosi.analizat?.length || 0;
  const editAktiv = kompletuar && modoEdit;
  const grupet    = grupoSipasProfilit(porosi.analizat || []);

  const hapExpand = (type, rowId, key, profiliId, label, val) => {
    setExpandVal(val || '');
    setExpandModal({ type, rowId, key, profiliId, label });
  };
  const ruajExpand = () => {
    if (!expandModal) return;
    if (expandModal.type === 'komponent') {
      setKomente(p => ({ ...p, [expandModal.rowId]: { ...(p[expandModal.rowId] || {}), [expandModal.key]: expandVal } }));
    } else {
      setKomentetProf(p => ({ ...p, [expandModal.profiliId]: expandVal }));
    }
    setExpandModal(null);
  };

  // ── Antibiogram modal helpers ─────────────────────────────────────────────
  const konfirmoAntibiotiket = () => {
    if (!abModalRow || !abModalGrupiId) return;
    const grp = abGrupet.find(g => g._id === abModalGrupiId);
    const prevRez = antibiogramet[abModalRow]?.rezultate || {};
    const rez = {};
    abModalZgjedhura.forEach(name => { rez[name] = prevRez[name] || ''; });
    setAntibiogramet(p => ({
      ...p,
      [abModalRow]: { grupiId: abModalGrupiId, grupiEmri: grp?.emri || '', rezultate: rez },
    }));
    setAbModalRow(null);
  };

  return (
    <>
    {/* Modal selektimit te antibiotikeve */}
    {abModalRow && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '85vh' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0">
            <div className="flex items-center gap-2">
              <Microscope size={15} className="text-green-600"/>
              <p className="font-bold text-sm text-gray-800">Selekto Antibiotiket</p>
            </div>
            <button onClick={() => setAbModalRow(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
          </div>

          {/* Tabs: Manual / Nga Shablloni */}
          <div className="flex border-b flex-shrink-0">
            {[['manual','Manual'],['sablon','Nga Shablloni']].map(([id,lbl]) => (
              <button key={id} onClick={() => setAbModalTab(id)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${abModalTab === id ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                {lbl}
              </button>
            ))}
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {abModalTab === 'manual' ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Mikroorganizmi / Bakteria</label>
                  <select className="input w-full text-sm" value={abModalGrupiId}
                    onChange={e => { setAbModalGrupiId(e.target.value); setAbModalZgjedhura(new Set()); }}>
                    <option value="">— Zgjidh bakterien —</option>
                    {abGrupet.map(g => <option key={g._id} value={g._id}>{g.emri}</option>)}
                  </select>
                </div>
                {abModalGrupiId && (() => {
                  const grp = abGrupet.find(g => g._id === abModalGrupiId);
                  const abs = grp?.antibiotike || [];
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-gray-600">Antibiotiket</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setAbModalZgjedhura(new Set(abs.map(a => a.emri)))}
                            className="text-xs text-primary hover:underline">Zgjidh të gjitha</button>
                          <button type="button" onClick={() => setAbModalZgjedhura(new Set())}
                            className="text-xs text-gray-400 hover:underline">Pastro</button>
                        </div>
                      </div>
                      {abs.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Nuk ka antibiotike të regjistruara</p>
                      ) : (
                        <div className="space-y-1">
                          {abs.map((ab, ai) => (
                            <label key={ai} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${abModalZgjedhura.has(ab.emri) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                              <input type="checkbox" className="w-4 h-4 accent-green-600 flex-shrink-0"
                                checked={abModalZgjedhura.has(ab.emri)}
                                onChange={() => setAbModalZgjedhura(prev => { const n = new Set(prev); n.has(ab.emri) ? n.delete(ab.emri) : n.add(ab.emri); return n; })}/>
                              <span className="text-sm text-gray-700">{ab.emri}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              /* Tab: Nga Shablloni */
              <div>
                {abSablonet.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Microscope size={28} className="mx-auto mb-2 opacity-30"/>
                    Nuk ka shabllone. Krijo nga faqja e Antibiogramit.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {abSablonet.map(s => (
                      <button key={s._id} type="button"
                        onClick={() => {
                          setAbModalGrupiId(s.grupiId);
                          setAbModalZgjedhura(new Set(s.antibiotike));
                          setAbModalTab('manual');
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors">
                        <p className="text-sm font-semibold text-gray-800">{s.emri}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.grupiEmri} · {s.antibiotike?.length || 0} antibiotike</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-5 py-3 border-t flex-shrink-0">
            <span className="text-xs text-gray-400">{abModalZgjedhura.size} antibiotike zgjedhura</span>
            <div className="flex gap-2">
              <button onClick={() => setAbModalRow(null)} className="btn-secondary text-sm px-4 py-2">Anulo</button>
              <button onClick={konfirmoAntibiotiket}
                disabled={!abModalGrupiId || !abModalZgjedhura.size}
                className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50">
                <CheckCircle size={14}/> Konfirmo
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Modal zmadhuese per komente */}
    {expandModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-primary"/>
              <p className="font-semibold text-sm text-gray-800">{expandModal.label}</p>
            </div>
            <button onClick={() => setExpandModal(null)} className="text-gray-400 hover:text-gray-600">
              <X size={18}/>
            </button>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            <textarea
              className="input w-full text-sm resize-none"
              style={{ minHeight: '320px' }}
              value={expandVal}
              onChange={e => setExpandVal(e.target.value)}
              placeholder="Shkruaj komentin këtu..."
              maxLength={5000}
              autoFocus/>
            <p className="text-xs text-gray-400 text-right mt-1">{expandVal.length}/5000</p>
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t">
            <button onClick={() => setExpandModal(null)} className="btn-secondary text-sm px-4 py-2">Anulo</button>
            <button onClick={ruajExpand} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
              <Save size={14}/> Ruaj
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="space-y-3">

      {/* Patient header */}
      <div className={`rounded-xl p-3 border ${porosi.urgente ? 'bg-red-50 border-red-400 ring-2 ring-red-300' : `${dep.light} ${dep.border}`}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${porosi.urgente ? 'bg-red-500' : dep.ngjyra}`}>
              {pac?.emri?.[0]}{pac?.mbiemri?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-800">{pac?.emri} {pac?.mbiemri}</p>
                {porosi.urgente && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                    <Zap size={10} fill="currentColor"/> URGJENT
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{porosi.numrPorosi} · {mosha} · {pac?.gjinia}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ref: {porosi.referuesId
                  ? (porosi.referuesId.institucioni || `${porosi.referuesId.emri} ${porosi.referuesId.mbiemri}`)
                  : 'V/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">{nKomp}/{nTotal}</span>
            {kompletuar && !modoEdit && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${dep.light} ${dep.text} border ${dep.border}`}>
                <CheckCircle size={11}/> Kompletuar
              </span>
            )}
            {kompletuar && !modoEdit && (
              <button onClick={() => setModoEdit(true)}
                className="text-xs px-2 py-1 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-1">
                <Pencil size={11}/> Edito
              </button>
            )}
            <button onClick={hapPDF}
              className="text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-white flex items-center gap-1">
              <FileDown size={11}/> PDF
            </button>
          </div>
        </div>
        <div className="mt-2 h-1 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${dep.ngjyra}`}
            style={{ width: `${nTotal > 0 ? (nKomp / nTotal) * 100 : 0}%` }}/>
        </div>
      </div>

      {/* Analysis forms grouped by profile */}
      {grupet.map((grup, gi) => (
        <div key={gi} className="space-y-2">

          {grup.profiliId && (
            <button onClick={() => toggleProfil(grup.profiliId)}
              className="w-full flex items-center gap-2 my-1 group">
              <div className="flex-1 h-px bg-gray-200"/>
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                <Layers size={11} className="text-primary"/>
                <span className="font-bold text-primary text-xs uppercase tracking-wide">{grup.profiliEmri}</span>
                <span className="text-gray-400 text-xs">· {grup.analizat.length}</span>
                {hapurProfilet.has(grup.profiliId)
                  ? <ChevronUp size={11} className="text-gray-400 ml-0.5"/>
                  : <ChevronDown size={11} className="text-gray-400 ml-0.5"/>
                }
              </div>
              <div className="flex-1 h-px bg-gray-200"/>
            </button>
          )}

          {(!grup.profiliId || hapurProfilet.has(grup.profiliId)) && grup.analizat.map(row => {
            const analiza = row.analiza;
            const refs    = analiza?.komponente || [];
            return (
              <div key={row._id}
                className={`border rounded-xl p-3 transition-colors ${
                  row.kompletuar && !editAktiv ? 'border-green-200 bg-green-50/20' :
                  editAktiv ? 'border-orange-100 bg-orange-50/10' :
                  'border-gray-100 bg-white'
                }`}>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={13} className="text-primary"/>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{analiza?.emri}</p>
                      {analiza?.kodi && <p className="text-xs text-gray-400">{analiza.kodi}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Flamuri live */}
                    {(() => {
                      const pacMosha = pac?.datelindja ? new Date().getFullYear() - new Date(pac.datelindja).getFullYear() : 30;
                      const wf    = worstFlamuriLive(row, vlerat, pac?.gjinia, pacMosha);
                      const badge = flamurBadge[wf];
                      return badge ? (
                        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      ) : null;
                    })()}
                    {/* Shfaq ne raport toggle */}
                    <button
                      onClick={() => toggleFlag(row, 'shfaqNeRaport')}
                      title={row.shfaqNeRaport === false ? 'Nuk shfaqet në raport — kliko për ta aktivizuar' : 'Shfaqet në raport — kliko për ta fshehur'}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                        row.shfaqNeRaport === false
                          ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      }`}>
                      {row.shfaqNeRaport === false ? <EyeOff size={10}/> : <Eye size={10}/>}
                      <span className="hidden sm:inline">{row.shfaqNeRaport === false ? 'OFF' : 'ON'}</span>
                    </button>
{row.kompletuar && !editAktiv && <CheckCircle size={15} className="text-green-500"/>}
                  </div>
                </div>

                <div className="space-y-2">
                  {refs.length > 0 ? refs.map((ref, ri) => {
                    const key     = ref.emri || 'vlera';
                    const val     = vlerat[row._id]?.[key] ?? '';
                    const isTekst = (ref.vlerat || []).length > 0
                      && (ref.vlerat || []).every(vl => vl.operatori === 'tekst');
                    const numVal  = Number(val);
                    let flamuri = '—';
                    if (!isTekst && val !== '' && !isNaN(numVal)) {
                      const op = ref.vlerat?.[0]?.operatori || 'midis';
                      if (op === 'midis' && ref.vleraMin != null && ref.vleraMax != null) {
                        if      (numVal < ref.vleraMin * 0.7) flamuri = 'Shume_Ulet';
                        else if (numVal < ref.vleraMin)       flamuri = 'Ulet';
                        else if (numVal > ref.vleraMax * 1.5) flamuri = 'Shume_Larte';
                        else if (numVal > ref.vleraMax)       flamuri = 'Larte';
                        else                                  flamuri = 'Normal';
                      }
                    }
                    return (
                      <div key={ri} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            {ref.emri && <p className="text-xs font-semibold text-gray-600 mb-1">{ref.emri}</p>}
                            <div className="flex items-center gap-2">
                              {isTekst && (ref.vlerat || []).length > 0 ? (
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Selekto Rezultatin:</p>
                                  <div className="relative" data-tekst-dropdown>
                                    <button
                                      type="button"
                                      disabled={kompletuar && !modoEdit}
                                      onClick={() => setOpenTekstKey(openTekstKey === `${row._id}-${ri}` ? null : `${row._id}-${ri}`)}
                                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
                                        val
                                          ? 'bg-primary/10 text-primary border-primary'
                                          : 'bg-white text-gray-400 border-gray-300 hover:border-primary hover:text-primary'
                                      }`}>
                                      <span>{val || 'Kliko për të selektuar...'}</span>
                                      <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${openTekstKey === `${row._id}-${ri}` ? 'rotate-180' : ''}`}/>
                                    </button>
                                    {openTekstKey === `${row._id}-${ri}` && (
                                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                        {(ref.vlerat || []).map((vl, vi) => (
                                          <button key={vi} type="button"
                                            onClick={() => {
                                              setVleraFn(row._id, key, vl.vleraTekst);
                                              setKomente(p => ({ ...p, [row._id]: { ...(p[row._id] || {}), [key]: vl.komentAuto || '' } }));
                                              setOpenTekstKey(null);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold border-b border-gray-100 last:border-0 transition-colors ${
                                              val === vl.vleraTekst
                                                ? 'bg-primary text-white'
                                                : 'text-gray-700 hover:bg-primary/5 hover:text-primary'
                                            }`}>
                                            {vl.vleraTekst}
                                            {vl.komentAuto && <span className="block text-xs font-normal opacity-70 mt-0.5">{vl.komentAuto}</span>}
                                          </button>
                                        ))}
                                        {val && (
                                          <button type="button"
                                            onClick={() => { setVleraFn(row._id, key, ''); setOpenTekstKey(null); }}
                                            className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100">
                                            Pastro selektimin
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <AutoTextarea
                                  className={`input flex-1 text-sm font-bold leading-5 ${inputNgjyra(flamuri)}`}
                                  value={val}
                                  onChange={e => setVleraFn(row._id, key, e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ruajAnalizen(row); } }}
                                  placeholder="0.00"
                                  disabled={kompletuar && !modoEdit}/>
                              )}
                              {!isTekst && <span className="text-gray-400 text-xs whitespace-nowrap">{ref.njesia}</span>}
                            </div>
                          </div>
                          {!isTekst && (
                            <div className="text-right min-w-24 flex-shrink-0">
                              <p className="text-xs text-gray-400 font-mono">{kompRefTekst(ref)}</p>
                              {(ref.vlerat || []).map((vl, vi) => (
                                <p key={vi} className="text-xs text-gray-300 font-mono">
                                  {vl.etiketa ? `${vl.etiketa}: ` : ''}{kompRefTekst(vl)}
                                </p>
                              ))}
                              {flamuri !== '—' && (
                                <span className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-full border ${flamurInfo[flamuri]?.cls}`}>
                                  {flamurInfo[flamuri]?.label}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Koment per komponent */}
                        {(!kompletuar || modoEdit) && (
                          <KomentBio
                            vlera={komente[row._id]?.[key] || ''}
                            onChange={val => setKomente(p => ({ ...p, [row._id]: { ...(p[row._id] || {}), [key]: val } }))}
                            presets={analiza?.komentet}
                            onExpand={() => hapExpand('komponent', row._id, key, null, `Koment — ${ref.emri || analiza?.emri || ''}`, komente[row._id]?.[key] || '')}
                            disabled={false}
                          />
                        )}
                      </div>
                    );
                  }) : (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <AutoTextarea
                        className="input w-full text-sm font-bold leading-5"
                        value={vlerat[row._id]?.['vlera'] ?? ''}
                        onChange={e => setVleraFn(row._id, 'vlera', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ruajAnalizen(row); } }}
                        placeholder="Vlera..."
                        disabled={kompletuar && !modoEdit}/>
                      {/* Koment per vlere te lire */}
                      {(!kompletuar || modoEdit) && (
                        <KomentBio
                          vlera={komente[row._id]?.['vlera'] || ''}
                          onChange={val => setKomente(p => ({ ...p, [row._id]: { ...(p[row._id] || {}), vlera: val } }))}
                          presets={analiza?.komentet}
                          onExpand={() => hapExpand('komponent', row._id, 'vlera', null, `Koment — ${analiza?.emri || ''}`, komente[row._id]?.['vlera'] || '')}
                          disabled={false}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* ── Antibiogram (Mikrobiologji) ─────────────────────── */}
                {isMikro && (() => {
                  const ab = antibiogramet[row._id];
                  const hasAb = ab?.grupiId && Object.keys(ab.rezultate || {}).length > 0;
                  const rez   = ab?.rezultate || {};
                  const setVleraAb = (antibiotiku, vlera) =>
                    setAntibiogramet(p => ({
                      ...p,
                      [row._id]: { ...p[row._id], rezultate: { ...(p[row._id]?.rezultate || {}), [antibiotiku]: vlera } },
                    }));
                  return (
                    <div className="mt-2">
                      {/* Button to open selection modal */}
                      {(!kompletuar || modoEdit) && (
                        <button type="button"
                          onClick={() => {
                            const existing = antibiogramet[row._id];
                            setAbModalRow(row._id);
                            setAbModalGrupiId(existing?.grupiId || '');
                            setAbModalZgjedhura(new Set(Object.keys(existing?.rezultate || {})));
                          }}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                          <Microscope size={11}/>
                          {hasAb ? 'Ndrysho Antibiotiket' : 'Shto Antibiotiket'}
                        </button>
                      )}
                      {/* S/I/R table for selected antibiotics */}
                      {hasAb && (
                        <div className="mt-2 border border-green-200 rounded-xl overflow-hidden">
                          <div className="bg-green-50 px-3 py-1.5 flex items-center gap-2">
                            <Microscope size={12} className="text-green-600"/>
                            <p className="text-xs font-bold text-green-700 flex-1">
                              Antibiogram — {ab.grupiEmri}
                            </p>
                          </div>
                          <div className="overflow-hidden">
                            <div className="grid bg-gray-700 text-white text-xs font-bold" style={{ gridTemplateColumns: '1fr 3.5rem 3.5rem 3.5rem' }}>
                              <div className="px-2 py-1.5">Antibiotiku</div>
                              {['S','I','R'].map(v => (
                                <div key={v} className="py-1.5 text-center">{v}</div>
                              ))}
                            </div>
                            {Object.keys(rez).map((antibiotiku, ai) => {
                              const cur = rez[antibiotiku] || '';
                              return (
                                <div key={ai}
                                  className={`grid items-center text-xs border-t border-gray-100 ${ai % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                  style={{ gridTemplateColumns: '1fr 3.5rem 3.5rem 3.5rem' }}>
                                  <div className="px-2 py-1.5 font-medium text-gray-700">{antibiotiku}</div>
                                  {['S','I','R'].map(v => (
                                    <div key={v} className="flex justify-center py-1">
                                      <button type="button"
                                        disabled={kompletuar && !modoEdit}
                                        onClick={() => setVleraAb(antibiotiku, cur === v ? '' : v)}
                                        className={`w-7 h-7 rounded-full border-2 font-bold transition-all text-xs ${
                                          cur === v
                                            ? v === 'S' ? 'bg-green-500 text-white border-transparent'
                                            : v === 'I' ? 'bg-yellow-500 text-white border-transparent'
                                            : 'bg-red-500 text-white border-transparent'
                                            : 'border-gray-200 text-gray-400 hover:border-gray-400 bg-white'
                                        }`}>
                                        {v}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                            <div className="bg-gray-50 px-2 py-1 border-t border-gray-100 text-xs text-gray-400 flex gap-3">
                              <span><span className="text-green-600 font-bold">S</span> Sensitiv</span>
                              <span><span className="text-yellow-600 font-bold">I</span> Intermediar</span>
                              <span><span className="text-red-600 font-bold">R</span> Rezistent</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {(!kompletuar || modoEdit) && (
                  <div className="mt-2 flex justify-end">
                    <button onClick={() => ruajAnalizen(row)}
                      className="btn-secondary text-xs flex items-center gap-1 px-2.5 py-1">
                      <Save size={12}/> Ruaj
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Koment profili — jo per Mikrobiologji (antibiogram e zevendeson) */}
          {!isMikro && grup.profiliId && hapurProfilet.has(grup.profiliId) && (() => {
            const profKey = `prof-${grup.profiliId}`;
            const komentEtParacaktuar = [...new Set(
              grup.analizat.flatMap(r => r.analiza?.komentet || []).filter(Boolean)
            )];
            return (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={11} className="text-violet-500"/>
                    <p className="text-xs font-semibold text-violet-700">Interpretim mjekësor: {grup.profiliEmri}</p>
                  </div>
                  <button type="button" title="Zmadho"
                    onClick={() => hapExpand('profil', null, null, grup.profiliId, `Interpretim mjekësor — ${grup.profiliEmri}`, komentetProf[grup.profiliId] || '')}
                    className="text-violet-300 hover:text-violet-600 transition-colors">
                    <Maximize2 size={13}/>
                  </button>
                </div>
                <textarea
                  className="input resize-none h-14 text-xs w-full bg-white"
                  value={komentetProf[grup.profiliId] || ''}
                  onChange={e => setKomentetProf(p => ({ ...p, [grup.profiliId]: e.target.value }))}
                  placeholder="Interpretim mjekësor per profilin (del ne PDF)..."
                  disabled={kompletuar && !modoEdit}/>
                {(!kompletuar || modoEdit) && komentEtParacaktuar.length > 0 && (
                  <div className="relative mt-1.5" data-koment-picker>
                    <button type="button"
                      onClick={() => setOpenKomentKey(openKomentKey === profKey ? null : profKey)}
                      className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-600 transition-colors">
                      <MessageSquare size={10}/>
                      Zgjidh koment
                      <ChevronDown size={10} className={`transition-transform ${openKomentKey === profKey ? 'rotate-180' : ''}`}/>
                    </button>
                    {openKomentKey === profKey && (
                      <div className="absolute left-0 top-full mt-1 bg-white border border-violet-200 rounded-xl shadow-lg z-20 w-72 max-h-52 overflow-y-auto">
                        {komentEtParacaktuar.map((km, ki) => (
                          <button key={ki} type="button"
                            onClick={() => {
                              setKomentetProf(p => {
                                const cur = p[grup.profiliId] || '';
                                return { ...p, [grup.profiliId]: cur ? cur + '\n' + km : km };
                              });
                              setOpenKomentKey(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-violet-50 hover:text-violet-700 border-b border-gray-100 last:border-0 transition-colors leading-relaxed">
                            {km}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ))}

      {/* Footer actions */}
      <div className="border-t pt-3 flex flex-col gap-2">
        {/* Stamp toggle buttons — visible whenever there is at least one result */}
        {!modoEdit && nKomp > 0 && nenshkrimet.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Vulat:</span>
            {nenshkrimet.map(n => {
              const aktiv = vulatAktive.has(n._id);
              return (
                <button key={n._id}
                  onClick={() => setVulatAktive(prev => {
                    const next = new Set(prev);
                    aktiv ? next.delete(n._id) : next.add(n._id);
                    return next;
                  })}
                  className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                    aktiv
                      ? 'border-violet-400 bg-violet-50 text-violet-700 font-medium'
                      : 'border-gray-300 text-gray-500 hover:border-violet-300 hover:text-violet-600'
                  }`}>
                  <ShieldCheck size={11}/>
                  {`${n.emri} ${n.mbiemri}`.trim()}
                  {n.departamenti !== 'Te gjitha' && (
                    <span className="opacity-60">· {n.departamenti}</span>
                  )}
                  {aktiv && <span className="ml-0.5">✓</span>}
                </button>
              );
            })}
          </div>
        )}
        {kompletuar && !modoEdit ? (
          <>
            <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                <CheckCircle size={13}/> Kompletuar
              </span>
              <button onClick={() => { setModalShto(true); setDepModal('Biokimi'); setZgjedhurat(new Set()); setKerkoModal(''); }}
                className="text-xs px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                <Plus size={11}/> Shto Analiza
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(() => {
                const vTeknik   = nenshkrimet.find(n => n.validimTipi === 'teknik');
                const vMjekesor = nenshkrimet.find(n => n.validimTipi === 'mjekesor');
                const emriT = vTeknik   ? `${vTeknik.emri} ${vTeknik.mbiemri}`.trim()   : 'Validim Teknik';
                const emriM = vMjekesor ? `${vMjekesor.emri} ${vMjekesor.mbiemri}`.trim() : 'Validim Mjekësor';
                return (<>
                  <button onClick={() => bejValidim('teknik')} disabled={dukeValidimT || validTeknik}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${validTeknik ? 'border-teal-300 bg-teal-50 text-teal-700 cursor-default' : 'border-teal-400 text-teal-700 hover:bg-teal-50'}`}>
                    {dukeValidimT ? <Loader size={11} className="animate-spin"/> : <ShieldCheck size={11}/>}
                    {validTeknik ? `${emriT} ✓` : emriT}
                  </button>
                  <button onClick={() => bejValidim('mjekesor')} disabled={dukeValidimM || validMjekesor}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1 ${validMjekesor ? 'border-indigo-300 bg-indigo-50 text-indigo-700 cursor-default' : 'border-indigo-400 text-indigo-700 hover:bg-indigo-50'}`}>
                    {dukeValidimM ? <Loader size={11} className="animate-spin"/> : <ShieldCheck size={11}/>}
                    {validMjekesor ? `${emriM} ✓` : emriM}
                  </button>
                </>);
              })()}
              <button onClick={() => setModoEdit(true)}
                className="text-xs px-3 py-1.5 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 flex items-center gap-1">
                <Pencil size={12}/> Edito
              </button>
              <button onClick={hapPDF}
                className="text-xs px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 flex items-center gap-1">
                <FileDown size={12}/> Shiko PDF
              </button>
              <button onClick={shkarko} disabled={duke_pdf}
                className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
                {duke_pdf ? <Loader size={12} className="animate-spin"/> : <FileDown size={12}/>} Shkarko
              </button>
            </div>
            </div>
          </>
        ) : modoEdit ? (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                <Pencil size={12}/> Menyre Editimi
              </span>
              <button onClick={() => { setModalShto(true); setDepModal('Biokimi'); setZgjedhurat(new Set()); setKerkoModal(''); }}
                className="text-xs px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                <Plus size={11}/> Shto Analiza
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModoEdit(false)} className="btn-ghost text-xs">Anulo</button>
              <button onClick={ruajTeGjitha} disabled={duke_ruajtur}
                className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
                <Save size={12}/> {duke_ruajtur ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{nKomp}/{nTotal} analiza</span>
              <button onClick={() => { setModalShto(true); setDepModal('Biokimi'); setZgjedhurat(new Set()); setKerkoModal(''); }}
                className="text-xs px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 flex items-center gap-1">
                <Plus size={11}/> Shto Analiza
              </button>
            </div>
            <div className="flex gap-2">
              {nKomp > 0 && (
                <button onClick={hapPDF}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                  <FileDown size={12}/> PDF
                </button>
              )}
              <button onClick={ruajTeGjitha} disabled={duke_ruajtur}
                className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
                <CheckCircle size={12}/> {duke_ruajtur ? 'Duke ruajtur...' : 'Kompletoj te Gjitha'}
              </button>
            </div>
          </div>
        )}
        {/* Share buttons — visible below action buttons whenever results exist */}
        {!modoEdit && nKomp > 0 && porosi.tokenPublik && (() => {
          const linkPublik = `${window.location.origin}/r/${porosi.tokenPublik}`;
          const emriPac = [pac?.emri, pac?.mbiemri].filter(Boolean).join(' ');
          const mesazh = `Përshëndetje ${emriPac}, rezultatet tuaja të analizave laboratorike janë gati. Mund t'i shikoni këtu: ${linkPublik}`;
          // Clean phone: strip everything except digits and leading +
          const telRaw = pac?.telefoni || '';
          const telClean = telRaw.replace(/[\s\-().]/g, '');
          // Build direct-chat URLs if phone exists, otherwise generic share
          const waHref = telClean
            ? `https://wa.me/${telClean.replace(/^\+/, '')}?text=${encodeURIComponent(mesazh)}`
            : `https://wa.me/?text=${encodeURIComponent(mesazh)}`;
          const viberHref = telClean
            ? `viber://chat?number=${encodeURIComponent(telClean)}&text=${encodeURIComponent(mesazh)}`
            : `viber://forward?text=${encodeURIComponent(mesazh)}`;
          return (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Share2 size={11}/> Dërgo:
              </span>
              <a href={waHref} target="_blank" rel="noreferrer"
                className="text-xs px-2.5 py-1 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-1">
                WhatsApp
              </a>
              <a href={viberHref}
                className="text-xs px-2.5 py-1 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 flex items-center gap-1">
                Viber
              </a>
              <button onClick={() => { navigator.clipboard.writeText(linkPublik); toast.success('Linku u kopjua!'); }}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                Kopjo Link
              </button>
            </div>
          );
        })()}
      </div>

      {/* Modal: Shto Analiza Shtese */}
      {modalShto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-800">Shto Analiza Shtese</h3>
                <p className="text-xs text-gray-400 mt-0.5">{pac?.emri} {pac?.mbiemri}</p>
              </div>
              <button onClick={() => setModalShto(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            {/* Dept tabs */}
            <div className="flex gap-1.5 px-5 pt-3 flex-shrink-0">
              {[
                { emri: 'Biokimi',       cls: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-700' },
                { emri: 'Mikrobiologji', cls: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-700' },
                { emri: 'PCR',           cls: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700' },
              ].map(d => (
                <button key={d.emri} onClick={() => setDepModal(d.emri)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors flex items-center gap-1.5 ${
                    depModal === d.emri ? `${d.cls} text-white border-transparent` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {d.emri}
                  {toateAnalizat[d.emri] && (
                    <span className={`text-xs font-bold px-1 rounded-full ${depModal === d.emri ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>
                      {toateAnalizat[d.emri].length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-5 pt-2 pb-1 flex-shrink-0">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-8 text-xs py-2 w-full"
                  placeholder="Kerko analize..."
                  value={kerkoModal}
                  onChange={e => setKerkoModal(e.target.value)}/>
              </div>
            </div>

            {/* Analyses list */}
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-1">
              {!toateAnalizat[depModal] ? (
                <div className="text-center py-8 text-gray-400 text-sm">Duke ngarkuar...</div>
              ) : (toateAnalizat[depModal] || [])
                .filter(a => !kerkoModal || a.emri.toLowerCase().includes(kerkoModal.toLowerCase()) || a.kodi?.toLowerCase().includes(kerkoModal.toLowerCase()))
                .map(a => (
                  <label key={a._id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    zgjedhurat.has(a._id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                  }`}>
                    <input type="checkbox" className="w-4 h-4 accent-blue-600 flex-shrink-0"
                      checked={zgjedhurat.has(a._id)}
                      onChange={() => toggleZgjedhur(a._id)}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.emri}</p>
                      {a.kodi && <p className="text-xs text-gray-400 font-mono">{a.kodi}</p>}
                    </div>
                    <span className="text-xs font-semibold text-gray-600 flex-shrink-0">{a.cmime?.pacient || 0} €</span>
                  </label>
                ))
              }
            </div>

            <div className="px-5 py-4 border-t flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-500">
                {zgjedhurat.size > 0 ? `${zgjedhurat.size} analiza zgjedhura` : 'Asnjë zgjedhur'}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setModalShto(false)} className="btn-ghost text-sm">Anulo</button>
                <button onClick={shtoAnaliza} disabled={duke_shto || !zgjedhurat.size}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                  <Plus size={14}/>
                  {duke_shto ? 'Duke shtuar...' : 'Shto Analizat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

// ─── Historiku i vizitave te pacientit ───────────────────────────────────────
function HistorietPacientit({ pacientiId, currentPorosiId }) {
  const [historiku, setHistoriku] = useState([]);
  const [hapurDatat, setHapurDatat] = useState(new Set());

  useEffect(() => {
    if (!pacientiId) { setHistoriku([]); return; }
    api.get(`/laborator/historiku/${pacientiId}`)
      .then(r => setHistoriku(r.data.porosite || []))
      .catch(() => {});
    setHapurDatat(new Set());
  }, [pacientiId]);

  const fmtD = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('sq-AL',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
  const depText = { Biokimi: 'text-blue-600', Mikrobiologji: 'text-green-600', PCR: 'text-purple-600' };

  const grupetData = {};
  historiku.filter(p => p._id !== currentPorosiId).forEach(p => {
    const d = (p.dataPorosis || '').split('T')[0];
    if (!grupetData[d]) grupetData[d] = [];
    grupetData[d].push(p);
  });
  const datat = Object.keys(grupetData).sort((a, b) => b.localeCompare(a));

  const toggleData = (d) => setHapurDatat(prev => {
    const next = new Set(prev);
    next.has(d) ? next.delete(d) : next.add(d);
    return next;
  });

  if (!pacientiId) return (
    <div className="flex flex-col items-center justify-center h-40 text-center">
      <p className="text-gray-300 text-xs">Zgjidh nje pacient</p>
    </div>
  );

  if (datat.length === 0) return (
    <div className="text-center py-8">
      <p className="text-gray-400 text-xs font-medium">Nuk ka vizita te meparshme</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {datat.map(data => (
        <div key={data}>
          <button onClick={() => toggleData(data)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border bg-white border-gray-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
            <span className="text-xs font-semibold text-gray-700">{fmtD(data)}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">{grupetData[data].length} ord.</span>
              {hapurDatat.has(data)
                ? <ChevronUp size={11} className="text-gray-400"/>
                : <ChevronDown size={11} className="text-gray-400"/>
              }
            </div>
          </button>
          {hapurDatat.has(data) && (
            <div className="mt-1 ml-2 space-y-1.5">
              {grupetData[data].map(p => (
                <div key={p._id} className="border border-gray-100 rounded-xl p-2.5 bg-gray-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${depText[p.departamenti] || 'text-gray-600'}`}>
                      {p.departamenti}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        p.statusi === 'Kompletuar'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-orange-50 text-orange-600'
                      }`}>
                        {p.statusi === 'Kompletuar' ? '✓' : '⏳'}
                      </span>
                      <button
                        onClick={async () => {
                          const win = window.open('', '_blank');
                          try {
                            const resp = await api.get(`/laborator/porosi/${p._id}/pdf`, { responseType: 'blob' });
                            const url  = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
                            if (win) {
                              win.location.href = url;
                              setTimeout(() => window.URL.revokeObjectURL(url), 60000);
                            }
                          } catch {
                            if (win) win.close();
                            toast.error('Gabim gjate hapjes se PDF');
                          }
                        }}
                        title="Hap PDF"
                        className="p-1 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors">
                        <FileDown size={13}/>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {p.analizat?.map(a => (
                      <div key={a._id} className="flex items-center gap-1 text-xs">
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-600 truncate flex-1">{a.analiza?.emri || '—'}</span>
                        {a.kompletuar && a.rezultate?.[0]?.vlera != null && (
                          <span className="text-gray-500 font-mono flex-shrink-0">
                            {a.rezultate[0].vlera}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Departamentet() {
  const navigate = useNavigate();
  const [depAktiv, setDepAktiv]               = useState('Biokimi');
  const sot = new Date().toISOString().split('T')[0];
  const [dataFillim, setDataFillim]           = useState(sot);
  const [dataMbarim, setDataMbarim]           = useState(sot);
  const [porosite, setPorosite]               = useState([]);
  const [ngarkimi, setNgarkimi]               = useState(false);
  const [statistika, setStatistika]           = useState(null);
  const [kerko, setKerko]                     = useState('');
  const [porosiZgjedhur, setPorosiZgjedhur]   = useState(null); // porosi._id
  const [referuesit, setReferuesit]           = useState([]);
  const [referuesiZgjedhur, setReferuesiZgjedhur] = useState('');
  const [kerkoRefuesin, setKerkoRefuesin]     = useState('');
  const [referuesiHapur, setReferuesiHapur]   = useState(false);
  const refDropRef                            = useRef(null);

  useEffect(() => {
    api.get('/referuesit').then(r => setReferuesit(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!referuesiHapur) return;
    const handler = (e) => { if (refDropRef.current && !refDropRef.current.contains(e.target)) setReferuesiHapur(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [referuesiHapur]);

  useEffect(() => {
    api.get('/laborator/statistika/ditore', { params: { data: dataFillim } })
      .then(r => setStatistika(r.data))
      .catch(() => {});
  }, [dataFillim]);

  const ngarkoPorosite = () => {
    setNgarkimi(true);
    setPorosite([]);
    setPorosiZgjedhur(null);
    api.get('/laborator/porosi', { params: { departamenti: depAktiv, dataFillim, dataMbarim, limit: 200 } })
      .then(r => { setPorosite(r.data.porosite || []); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  };

  useEffect(() => { ngarkoPorosite(); }, [depAktiv, dataFillim, dataMbarim]);

  const fshiPorosi = async (id, emriPac, e) => {
    e.stopPropagation();
    if (!confirm(`Fshi porosinë e "${emriPac}"? Ky veprim nuk mund të kthehet mbrapa.`)) return;
    try {
      await api.delete(`/laborator/porosi/${id}`);
      setPorosite(porosite.filter(p => p._id !== id));
      if (porosiZgjedhur === id) setPorosiZgjedhur(null);
      toast.success('Porosi u fshi');
    } catch { toast.error('Gabim gjate fshirjes'); }
  };

  const onPorosiUpdated = () => {
    api.get('/laborator/porosi', { params: { departamenti: depAktiv, dataFillim, dataMbarim, limit: 200 } })
      .then(r => setPorosite(r.data.porosite || []))
      .catch(() => {});
  };

  const dep = DEPARTAMENTET.find(d => d.emri === depAktiv);

  const porositeFiltruara = porosite.filter(p => {
    if (kerko) {
      const q = kerko.toLowerCase();
      if (!(`${p.pacienti?.emri} ${p.pacienti?.mbiemri}`).toLowerCase().includes(q)
        && !p.pacienti?.numrPersonal?.includes(q)
        && !p.numrPorosi?.toLowerCase().includes(q)) return false;
    }
    if (referuesiZgjedhur === 'vete') { if (p.referuesId) return false; }
    else if (referuesiZgjedhur)       { if (p.referuesId?._id !== referuesiZgjedhur) return false; }
    return true;
  });

  const selectedPorosi = porosite.find(p => p._id === porosiZgjedhur);
  const pacientiIdZgjedhur = selectedPorosi?.pacienti?._id || null;

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 80px)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Laboratori · Departamentet</h1>
          <p className="text-gray-400 text-xs">{labelData(dataFillim, dataMbarim)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Compact stats */}
          {statistika && (
            <div className="flex gap-1.5">
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">
                # {statistika.total || 0} porosi
              </span>
              <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
                ✓ {statistika.sipasStatusit?.find(s => s._id === 'Kompletuar')?.count || 0}
              </span>
              <span className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg font-medium">
                ⏳ {statistika.sipasStatusit?.find(s => s._id === 'NeProcesim')?.count || 0}
              </span>
            </div>
          )}
          <DateFilter dataFillim={dataFillim} dataMbarim={dataMbarim}
            onChange={({ dataFillim: f, dataMbarim: t }) => { setDataFillim(f); setDataMbarim(t); setPorosiZgjedhur(null); }}/>
          <button onClick={() => navigate('/laboratori/porosi/krijo')}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2">
            <Plus size={14}/> Porosi e Re
          </button>
        </div>
      </div>

      {/* ── Department tabs ── */}
      <div className="flex gap-2 flex-shrink-0">
        {DEPARTAMENTET.map(d => {
          const Icon  = d.icon;
          const aktiv = depAktiv === d.emri;
          const cnt   = statistika?.sipasDeprt?.find(x => x._id === d.emri)?.count || 0;
          return (
            <button key={d.emri} onClick={() => { setDepAktiv(d.emri); setKerko(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                aktiv
                  ? `${d.ngjyra} text-white border-transparent shadow-sm`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}>
              <Icon size={14}/>
              {d.emri}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                aktiv ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
              }`}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left: patient list + filters */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-2">
          <div className="relative flex-shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-8 text-xs py-2" placeholder="Kerko pacient..."
              value={kerko} onChange={e => setKerko(e.target.value)}/>
          </div>

          {/* Referrer filter — 2-in-1 dropdown */}
          <div className="relative flex-shrink-0" ref={refDropRef}>
            <button
              onClick={() => { setReferuesiHapur(v => !v); setKerkoRefuesin(''); }}
              className="input text-xs py-2 w-full flex items-center gap-2 text-left"
            >
              <Search size={13} className="text-gray-400 flex-shrink-0"/>
              <span className={`flex-1 truncate ${referuesiZgjedhur ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                {referuesiZgjedhur === ''     ? 'Referuesit...' :
                 referuesiZgjedhur === 'vete' ? 'Vete ardhur'   :
                 (() => { const r = referuesit.find(x => x._id === referuesiZgjedhur); return r ? (r.institucioni || `${r.emri} ${r.mbiemri}`) : ''; })()}
              </span>
              {referuesiZgjedhur
                ? <span onClick={e => { e.stopPropagation(); setReferuesiZgjedhur(''); setReferuesiHapur(false); }}
                    className="text-gray-400 hover:text-gray-600 text-base leading-none flex-shrink-0">×</span>
                : <ChevronDown size={12} className="text-gray-400 flex-shrink-0"/>
              }
            </button>
            {referuesiHapur && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col">
                <div className="relative border-b border-gray-100">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  <input autoFocus
                    className="w-full text-xs pl-8 pr-3 py-2 outline-none bg-transparent placeholder-gray-400"
                    placeholder="Kerko..."
                    value={kerkoRefuesin}
                    onChange={e => setKerkoRefuesin(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {!kerkoRefuesin && (
                    <>
                      <button onClick={() => { setReferuesiZgjedhur(''); setReferuesiHapur(false); }}
                        className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 ${referuesiZgjedhur === '' ? 'text-primary font-semibold' : 'text-gray-600'}`}>
                        Te gjithe
                      </button>
                      <button onClick={() => { setReferuesiZgjedhur('vete'); setReferuesiHapur(false); }}
                        className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 ${referuesiZgjedhur === 'vete' ? 'text-primary font-semibold' : 'text-gray-600'}`}>
                        Vete ardhur
                      </button>
                    </>
                  )}
                  {(() => {
                    const q = kerkoRefuesin.toLowerCase();
                    const filtered = q ? referuesit.filter(r => (r.institucioni || `${r.emri} ${r.mbiemri}`).toLowerCase().includes(q)) : referuesit;
                    const doktore = filtered.filter(r => r.tipi === 'Doktor');
                    const bashk   = filtered.filter(r => r.tipi === 'Bashkpuntor');
                    if (q && doktore.length === 0 && bashk.length === 0)
                      return <p className="text-xs text-gray-400 px-3 py-2">Nuk u gjet</p>;
                    return (
                      <>
                        {doktore.length > 0 && (
                          <>
                            <p className="text-[10px] font-bold text-gray-400 uppercase px-3 pt-2 pb-0.5">Doktore</p>
                            {doktore.map(r => (
                              <button key={r._id}
                                onClick={() => { setReferuesiZgjedhur(r._id); setReferuesiHapur(false); setKerkoRefuesin(''); }}
                                className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 truncate ${referuesiZgjedhur === r._id ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                                {r.institucioni || `${r.emri} ${r.mbiemri}`}
                              </button>
                            ))}
                          </>
                        )}
                        {bashk.length > 0 && (
                          <>
                            <p className="text-[10px] font-bold text-gray-400 uppercase px-3 pt-2 pb-0.5">Bashkpunetor</p>
                            {bashk.map(r => (
                              <button key={r._id}
                                onClick={() => { setReferuesiZgjedhur(r._id); setReferuesiHapur(false); setKerkoRefuesin(''); }}
                                className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 truncate ${referuesiZgjedhur === r._id ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                                {r.institucioni || `${r.emri} ${r.mbiemri}`}
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <p className={`text-xs font-semibold ${dep?.text} px-1 flex-shrink-0`}>
            {dep?.emri} · {porositeFiltruara.length} porosi
          </p>

          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
            {ngarkimi ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse"/>
              ))
            ) : porositeFiltruara.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">Asnje porosi</p>
                <button onClick={() => navigate('/laboratori/porosi/krijo')}
                  className="btn-primary mt-3 text-xs px-3 py-1.5">
                  + Porosi e Re
                </button>
              </div>
            ) : porositeFiltruara.map((p) => {
              const zgjedhur = porosiZgjedhur === p._id;
              const meRez = p.analizat?.filter(a => a.rezultate?.some(r => r.vlera !== '' && r.vlera != null)).length || 0;
              const total = p.analizat?.length || 0;
              const dotColor = p.statusi === 'Kompletuar' ? 'bg-green-400'
                : meRez > 0 && meRez < total ? 'bg-yellow-400'
                : meRez > 0 ? 'bg-green-400'
                : 'bg-gray-300';
              return (
                <button key={p._id} onClick={() => setPorosiZgjedhur(zgjedhur ? null : p._id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all border ${
                    p.urgente
                      ? 'bg-red-50 border-red-400 hover:border-red-500'
                      : zgjedhur
                        ? `${dep?.light} ${dep?.border} shadow-sm`
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}>
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    p.urgente ? 'bg-red-500 text-white' : zgjedhur ? `${dep?.ngjyra} text-white` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.numrRendor ?? '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${p.urgente ? 'font-bold text-red-700' : zgjedhur ? `font-medium ${dep?.text}` : 'font-medium text-gray-700'}`}>
                      {p.pacienti?.emri} {p.pacienti?.mbiemri}
                    </p>
                    {p.dataPorosis && (
                      <p className="text-xs text-gray-400 font-mono">
                        {new Date(p.dataPorosis).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    )}
                  </div>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}/>
                  <button onClick={e => fshiPorosi(p._id, `${p.pacienti?.emri} ${p.pacienti?.mbiemri}`, e)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-0.5 rounded">
                    <Trash2 size={13}/>
                  </button>
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: inline results */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {porosiZgjedhur ? (
            <InlineRezultate
              key={porosiZgjedhur}
              porosiId={porosiZgjedhur}
              dep={dep}
              onUpdated={onPorosiUpdated}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className={`w-16 h-16 rounded-2xl ${dep?.light} flex items-center justify-center mb-3`}>
                {dep && <dep.icon size={28} className={dep.text}/>}
              </div>
              <p className="text-gray-500 font-medium">Zgjidh nje pacient</p>
              <p className="text-gray-400 text-sm mt-1">nga lista per te shenuar rezultatet</p>
            </div>
          )}
        </div>

        {/* Right: patient visit history */}
        <div className="w-52 flex-shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Historiku</p>
            {pacientiIdZgjedhur && (
              <span className="text-xs text-gray-400">{selectedPorosi?.pacienti?.emri}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-0.5">
            <HistorietPacientit
              pacientiId={pacientiIdZgjedhur}
              currentPorosiId={porosiZgjedhur}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
