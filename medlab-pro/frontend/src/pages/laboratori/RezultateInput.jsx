import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ChevronLeft, Save, CheckCircle, FileDown, Loader, Layers, FlaskConical, MessageSquare, Pencil, Plus, Search, X, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

// Textarea qe zgjerohet automatikisht sipas permbajtjes
function AutoTextarea({ value, onChange, onKeyDown, placeholder, disabled, className, rows }) {
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
      maxLength={500}
      rows={rows || 1}
      className={className}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  );
}

const flamurInfo = {
  Normal:      { label: 'Normal',        cls: 'bg-green-100 text-green-700 border-green-200'              },
  Larte:       { label: '↑ Larte',       cls: 'bg-red-100 text-red-700 border-red-200'                   },
  Shume_Larte: { label: '↑↑ Shum Lart',  cls: 'bg-red-200 text-red-800 border-red-300 font-bold'         },
  Ulet:        { label: '↓ Ulet',        cls: 'bg-blue-100 text-blue-700 border-blue-200'                },
  Shume_Ulet:  { label: '↓↓ Shum Ulet',  cls: 'bg-blue-200 text-blue-800 border-blue-300 font-bold'      },
  Kritik:      { label: '!! Kritik',     cls: 'bg-red-200 text-red-900 border-red-400 font-bold'         },
  '—':         { label: '—',             cls: 'bg-gray-100 text-gray-500'                                },
};

// Renditet nga me kritiket tek me normale
const FLAMUR_RANK = { Shume_Larte: 5, Larte: 4, Shume_Ulet: 3, Ulet: 2, Normal: 1, '—': 0 };

// Llogarit live nga vlerat e inputit
// Zinxhiri: kritikMin/Max komponent → kritikMin/Max interval → vleraMin/Max interval (fallback final)
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
      // Fallback 1: interval me kritikMin/kritikMax qe i pershtatet pacientit
      const gjM = g => !g || g === 'Te dyja' || g === pacGjinia;
      const mM  = vl => pacMosha >= (vl.moshaMin ?? 0) && pacMosha <= (vl.moshaMax ?? 120);
      const vl1 = (ref.vlerat || []).find(v => gjM(v.gjinia) && mM(v) && v.kritikMin != null && v.kritikMax != null)
               || (ref.vlerat || []).find(v => v.kritikMin != null && v.kritikMax != null);
      if (vl1) { kMin = Number(vl1.kritikMin); kMax = Number(vl1.kritikMax); }
    }

    if (kMin == null || kMax == null) {
      // Fallback 2: vleraMin/vleraMax nga intervali qe i pershtatet (diapazoni normal)
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

const flamurBadge = {
  Shume_Larte: { label: '↑↑ HIGH',  cls: 'bg-red-100 text-red-700 border-red-300' },
  Larte:       { label: '↑ High',   cls: 'bg-red-50  text-red-600 border-red-200' },
  Shume_Ulet:  { label: '↓↓ LOW',   cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  Ulet:        { label: '↓ Low',    cls: 'bg-blue-50  text-blue-600 border-blue-200' },
};

const inputNgjyra = (f) => {
  if (f === 'Shume_Larte' || f === 'Larte') return 'text-red-700 bg-red-50 border-red-300';
  if (f === 'Shume_Ulet'  || f === 'Ulet')  return 'text-blue-700 bg-blue-50 border-blue-300';
  if (f === 'Normal')                        return 'text-green-700 bg-green-50 border-green-300';
  return '';
};

const invNgjyra = {
  red:'bg-red-100 text-red-700', orange:'bg-orange-100 text-orange-700',
  yellow:'bg-yellow-100 text-yellow-700', green:'bg-green-100 text-green-700',
  blue:'bg-blue-100 text-blue-700', gray:'bg-gray-100 text-gray-600',
};
const invDot = {
  red:'bg-red-500', orange:'bg-orange-500', yellow:'bg-yellow-500',
  green:'bg-green-500', blue:'bg-blue-500', gray:'bg-gray-400',
};

// Tekst per vleren referente te nje komponenti
const kompRefTekst = (ref) => {
  const op = ref.operatori || 'midis';
  const v1 = ref.vleraMin, v2 = ref.vleraMax, u = ref.njesia || '';
  switch (op) {
    case 'me_pak':        return `< ${v1} ${u}`.trim();
    case 'me_pak_baraz':  return `≤ ${v1} ${u}`.trim();
    case 'midis':         return v1 != null && v2 != null ? `${v1} – ${v2} ${u}`.trim() : (v1 != null ? `${v1} ${u}`.trim() : '—');
    case 'me_shum_baraz': return `≥ ${v1} ${u}`.trim();
    case 'me_shum':       return `> ${v1} ${u}`.trim();
    case 'tekst':         return ref.vleraTekst || '—';
    default:              return v1 != null && v2 != null ? `${v1} – ${v2} ${u}`.trim() : '—';
  }
};

const invTekst = (inv) => {
  const v1 = inv.vleraMin ?? '', v2 = inv.vleraMax ?? '', u = inv.njesia || '';
  switch (inv.operatori) {
    case 'me_pak':        return `< ${v1} ${u}`.trim();
    case 'me_pak_baraz':  return `≤ ${v1} ${u}`.trim();
    case 'midis':         return `${v1} – ${v2} ${u}`.trim();
    case 'me_shum_baraz': return `≥ ${v1} ${u}`.trim();
    case 'me_shum':       return `> ${v1} ${u}`.trim();
    default:              return `${v1} ${u}`.trim();
  }
};

// ─── Komponent per toggle-in e komentit (per analize) ───────────────────────
function KomentSekcioni({ vlera, onChange, presets, disabled }) {
  const [hapur, setHapur] = useState(false);
  return (
    <div className="space-y-1.5">
      <button type="button"
        onClick={() => setHapur(h => !h)}
        className={`flex items-center gap-1.5 text-xs py-0.5 pl-1 transition-colors ${vlera ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-primary'}`}>
        <MessageSquare size={12}/>
        {vlera
          ? <span className="truncate max-w-xs">{vlera.length > 50 ? vlera.slice(0, 50) + '…' : vlera}</span>
          : 'Shto/Zgjidh koment'}
      </button>
      {hapur && (
        <div className="space-y-1.5">
          {(presets || []).filter(Boolean).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-5">
              {(presets || []).filter(Boolean).map((k, ki) => (
                <button key={ki} type="button" disabled={disabled}
                  onClick={() => onChange(k)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors text-left max-w-xs truncate ${vlera === k ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'}`}
                  title={k}>{k.length > 60 ? k.slice(0, 60) + '…' : k}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-start gap-2">
            <textarea
              autoFocus
              className="input text-sm flex-1"
              value={vlera}
              onChange={e => onChange(e.target.value)}
              placeholder="Shkruaj koment..."
              disabled={disabled}
              maxLength={2500}
              rows={1}
              style={{ resize: 'none', overflow: 'hidden' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}/>
            <button type="button" onClick={() => setHapur(false)}
              className="text-gray-300 hover:text-gray-500 mt-1.5 flex-shrink-0">
              <X size={13}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Komponent per toggle-in e komentit (per komponent brenda analize) ───────
function KomentKomponenti({ vlera, onChange, disabled }) {
  const [hapur, setHapur] = useState(false);
  return (
    <div className="space-y-1 mt-1">
      <button type="button"
        onClick={() => setHapur(h => !h)}
        className={`flex items-center gap-1 text-xs py-0.5 pl-1 transition-colors ${vlera ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-primary'}`}>
        <MessageSquare size={11}/>
        {vlera
          ? <span className="truncate max-w-40">{vlera.length > 35 ? vlera.slice(0, 35) + '…' : vlera}</span>
          : 'Shto/Zgjidh koment'}
      </button>
      {hapur && (
        <div className="flex items-start gap-1.5 pl-1">
          <textarea
            autoFocus
            className="input text-xs flex-1"
            value={vlera}
            onChange={e => onChange(e.target.value)}
            placeholder="Shkruaj koment..."
            disabled={disabled}
            maxLength={500}
            rows={1}
            style={{ resize: 'none', overflow: 'hidden' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}/>
          <button type="button" onClick={() => setHapur(false)}
            className="text-gray-300 hover:text-gray-500 mt-1 flex-shrink-0">
            <X size={12}/>
          </button>
        </div>
      )}
    </div>
  );
}

// Ruan si tekst per te ruajtur formatimin e sakte (p.sh. "6.0", "1.010")
const parseVlera = v => {
  if (v === '' || v == null) return '';
  return String(v).slice(0, 500);
};

// Grupon analizat sipas profiliId (null = individuale)
const grupoSipasProfilit = (analizat) => {
  const grupet = new Map();
  grupet.set(null, { profiliId: null, profiliEmri: '', analizat: [] });
  analizat.forEach(row => {
    const pid = row.profiliId ? String(row.profiliId) : null;
    const key = pid || null;
    if (!grupet.has(key)) {
      grupet.set(key, { profiliId: pid, profiliEmri: row.profiliEmri || '', analizat: [] });
    }
    grupet.get(key).analizat.push(row);
  });
  return [...grupet.values()].filter(g => g.analizat.length > 0);
};

export default function RezultateInput() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [porosi, setPorosi]           = useState(null);
  const [vlerat, setVlerat]           = useState({});
  const [komente, setKomente]         = useState({});
  const [komentetProf, setKomentetProf] = useState({}); // profiliId -> koment
  const [komentetKomp, setKomentetKomp] = useState({}); // rowId_key -> koment per komponent
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [duke_pdf, setDukePDF]        = useState(false);
  const [modoEdit, setModoEdit]       = useState(false);
  const [hapurProfilet, setHapurProfilet] = useState(new Set());

  const toggleProfil = (pid) => setHapurProfilet(prev => {
    const next = new Set(prev);
    next.has(pid) ? next.delete(pid) : next.add(pid);
    return next;
  });

  // Modal shto analiza
  const [modalShtoAnaliza, setModalShtoAnaliza]     = useState(false);
  const [analizatGjitha, setAnalizatGjitha]         = useState([]);
  const [kerkoAnaliza, setKerkoAnaliza]             = useState('');
  const [analizatZgjedhura, setAnalizatZgjedhura]   = useState([]);
  const [dukeShtuarAnaliza, setDukeShtuarAnaliza]   = useState(false);

  const ngarko = () => {
    api.get(`/laborator/porosi/${id}`)
      .then(r => {
        const p = r.data.porosi;
        setPorosi(p);
        const v = {}, k = {}, kp = {}, kk = {};
        p.analizat?.forEach(a => {
          v[a._id] = {};
          a.rezultate?.forEach(rez => {
            v[a._id][rez.komponenti || 'vlera'] = rez.vlera;
            if (rez.koment) kk[`${a._id}_${rez.komponenti || 'vlera'}`] = rez.koment;
          });
          k[a._id] = a.koment || '';
        });
        // Ngarko komentet e profileve
        p.komentetProfileve?.forEach(kf => {
          kp[String(kf.profiliId)] = kf.koment || '';
        });
        setVlerat(v);
        setKomente(k);
        setKomentetProf(kp);
        setKomentetKomp(kk);
      })
      .catch(() => toast.error('Porosi nuk u gjet'));
  };

  useEffect(() => { ngarko(); }, [id]);

  const setVlera = (analizaId, key, val) =>
    setVlerat(p => ({ ...p, [analizaId]: { ...p[analizaId], [key]: val } }));

  // ── Ruaj nje analize ──
  const ruajAnalizen = async (row, komentProfiliOverride) => {
    const refs = row.analiza?.komponente || [];
    const rezultate = refs.length > 0
      ? refs.map(ref => ({
          komponenti: ref.emri || '',
          vlera:      parseVlera(vlerat[row._id]?.[ref.emri || 'vlera'] ?? ''),
          njesia:     ref.njesia || '',
          koment:     komentetKomp[`${row._id}_${ref.emri || 'vlera'}`] || '',
        }))
      : [{ komponenti: '', vlera: parseVlera(vlerat[row._id]?.['vlera'] ?? ''), njesia: '', koment: '' }];

    const payload = {
      analizaId: row.analiza._id,
      rezultate,
      koment: komente[row._id] || '',
    };

    // Shto koment profili nese ka
    if (row.profiliId) {
      payload.profiliId    = String(row.profiliId);
      payload.komentProfili = komentProfiliOverride !== undefined
        ? komentProfiliOverride
        : (komentetProf[String(row.profiliId)] || '');
    }

    await api.put(`/laborator/porosi/${id}/rezultate`, payload);
    toast.success(`${row.analiza.emri} — u ruajt!`);
    // Perditeso vetem kete analize ne state (mos rinderto faqen)
    setPorosi(prev => {
      if (!prev) return prev;
      const analizatRe = prev.analizat.map(a =>
        a._id === row._id ? { ...a, kompletuar: true } : a
      );
      const nKompRe = analizatRe.filter(a => a.kompletuar).length;
      return { ...prev, analizat: analizatRe,
        statusi: nKompRe === analizatRe.length ? 'Kompletuar' : prev.statusi };
    });
  };

  // ── Ruaj te gjitha ──
  const ruajTeGjitha = async () => {
    setDukeRuajtur(true);
    try {
      for (const row of (porosi?.analizat || [])) {
        await ruajAnalizen(row);
      }
      toast.success('Te gjitha rezultatet u ruajten!');
      if (modoEdit) setModoEdit(false);
      ngarko();
    } catch {
      toast.error('Gabim gjate ruajtjes');
    }
    setDukeRuajtur(false);
  };

  // ── Toggle flags (shfaqNeRaport / primare) ──
  const toggleFlag = async (row, flag) => {
    const newVal = row[flag] === false ? true : false; // default true, so toggle
    try {
      await api.patch(`/laborator/porosi/${id}/analiza-flags`, { rowId: row._id, [flag]: newVal });
      setPorosi(prev => {
        if (!prev) return prev;
        return { ...prev, analizat: prev.analizat.map(a =>
          a._id === row._id ? { ...a, [flag]: newVal } : a
        )};
      });
    } catch { toast.error('Gabim duke ndryshuar opsionin'); }
  };

  // ── PDF ──
  const shkarko = async () => {
    setDukePDF(true);
    try {
      const resp = await api.get(`/laborator/porosi/${id}/pdf`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.setAttribute('download', `raport-${porosi?.numrPorosi || id}.pdf`);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF u shkarkua!');
    } catch { toast.error('Gabim gjate gjenerimit te PDF'); }
    setDukePDF(false);
  };

  const hapPDF = async () => {
    setDukePDF(true);
    const win = window.open('', '_blank'); // hap para await — shmang popup blocker
    try {
      const resp = await api.get(`/laborator/porosi/${id}/pdf`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
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

  // ── Modal: Shto Analiza ──
  const hapModalShtoAnaliza = async () => {
    try {
      const { data } = await api.get('/laborator/analizat', { params: { departamenti: porosi.departamenti } });
      setAnalizatGjitha(data.analizat || []);
    } catch { toast.error('Gabim duke ngarkuar analizat'); }
    setAnalizatZgjedhura([]);
    setKerkoAnaliza('');
    setModalShtoAnaliza(true);
  };

  const toggleZgjedhur = (analizaId) => {
    setAnalizatZgjedhura(prev =>
      prev.includes(analizaId) ? prev.filter(x => x !== analizaId) : [...prev, analizaId]
    );
  };

  const konfirmoShtoAnaliza = async () => {
    if (!analizatZgjedhura.length) { toast.error('Zgjidh te pakten nje analize'); return; }
    setDukeShtuarAnaliza(true);
    try {
      await api.put(`/laborator/porosi/${id}/shto-analiza`, { analizatIds: analizatZgjedhura });
      toast.success('Analizat u shtuan!');
      setModalShtoAnaliza(false);
      ngarko();
    } catch { toast.error('Gabim gjate shtimit te analizave'); }
    setDukeShtuarAnaliza(false);
  };

  if (!porosi) return (
    <div className="flex justify-center py-24">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pac        = porosi.pacienti;
  const mosha      = pac?.datelindja
    ? `${new Date().getFullYear() - new Date(pac.datelindja).getFullYear()} vj.` : '—';
  const kompletuar = porosi.statusi === 'Kompletuar';
  const nKomp      = porosi.analizat?.filter(a => a.kompletuar).length || 0;
  const nTotal     = porosi.analizat?.length || 0;
  const kaRezultate = nKomp > 0;
  const editAktiv  = kompletuar && modoEdit;

  const grupet = grupoSipasProfilit(porosi.analizat || []);

  // Filtro analizat per modal (perjashtoje ato qe jan tashme ne porosi)
  const analizatNePorosi = new Set((porosi.analizat || []).map(r => r.analiza?._id?.toString()));
  const analizatFiltruara = analizatGjitha
    .filter(a => !analizatNePorosi.has(a._id?.toString()))
    .filter(a => !kerkoAnaliza || a.emri.toLowerCase().includes(kerkoAnaliza.toLowerCase()) || a.kodi?.toLowerCase().includes(kerkoAnaliza.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ChevronLeft size={20}/></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">Regjistro Rezultate</h1>
          <p className="text-sm text-gray-500">{porosi.numrPorosi} · {porosi.departamenti}</p>
        </div>
        <button onClick={hapModalShtoAnaliza}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
          <Plus size={15}/> Shto Analiza
        </button>
        {kaRezultate && (
          <div className="flex gap-2">
            <button onClick={hapPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
              <FileDown size={15}/> Shiko PDF
            </button>
            <button onClick={shkarko} disabled={duke_pdf}
              className="btn-primary flex items-center gap-1.5 text-sm">
              {duke_pdf ? <><Loader size={15} className="animate-spin"/> Duke gjeneruar...</> : <><FileDown size={15}/> Shkarko PDF</>}
            </button>
          </div>
        )}
        {kompletuar && !modoEdit && (
          <span className="flex items-center gap-1.5 text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle size={15}/> Kompletuar
          </span>
        )}
        {modoEdit && (
          <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full text-sm font-medium">
            <Pencil size={15}/> Menyre Editimi
          </span>
        )}
      </div>

      {/* Info pacienti */}
      <div className="card bg-gradient-to-r from-primary/5 to-transparent py-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {pac?.emri?.[0]}{pac?.mbiemri?.[0]}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 text-sm">
          <div><p className="text-gray-400 text-xs">Pacienti</p><p className="font-semibold">{pac?.emri} {pac?.mbiemri}</p></div>
          <div><p className="text-gray-400 text-xs">NID</p><p className="font-mono text-xs">{pac?.numrPersonal}</p></div>
          <div><p className="text-gray-400 text-xs">Mosha / Gjinia</p><p>{mosha} / {pac?.gjinia === 'M' ? 'Mashkull' : 'Femer'}</p></div>
          <div><p className="text-gray-400 text-xs">Progresi</p><p className="font-semibold text-primary">{nKomp} / {nTotal}</p></div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${nTotal > 0 ? (nKomp / nTotal) * 100 : 0}%` }}/>
      </div>

      {/* Analizat grupuara */}
      {grupet.map((grup, gi) => (
        <div key={gi} className="space-y-3">

          {/* Header profili — klikueshme per hapje/mbyllje */}
          {grup.profiliId && (
            <button onClick={() => toggleProfil(grup.profiliId)}
              className="w-full flex items-center gap-3 my-1 group">
              <div className="flex-1 h-px bg-gray-200"/>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-1.5 group-hover:border-primary/40 group-hover:bg-primary/5 transition-all">
                <Layers size={13} className="text-primary"/>
                <span className="font-bold text-primary text-sm uppercase tracking-wide">{grup.profiliEmri}</span>
                <span className="text-gray-400 text-xs">· {grup.analizat.length} analiza</span>
                {hapurProfilet.has(grup.profiliId)
                  ? <ChevronUp size={13} className="text-gray-400"/>
                  : <ChevronDown size={13} className="text-gray-400"/>
                }
              </div>
              <div className="flex-1 h-px bg-gray-200"/>
            </button>
          )}

          {/* Analizat e grupit — shfaqen vetem kur profili eshte hapur (ose nese jane individuale) */}
          {(!grup.profiliId || hapurProfilet.has(grup.profiliId)) && grup.analizat.map(row => {
            const analiza = row.analiza;
            const refs    = analiza?.komponente || [];
            return (
              <div key={row._id}
                className={`card border-2 transition-colors ${row.kompletuar && !editAktiv ? 'border-green-200 bg-green-50/20' : editAktiv ? 'border-orange-100' : 'border-gray-100'}`}>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FlaskConical size={15} className="text-primary"/>
                    <div>
                      <h3 className="font-bold text-gray-800">{analiza?.emri}</h3>
                      <p className="text-xs text-gray-400">{analiza?.kodi} · {analiza?.departamenti}</p>
                      {analiza?.metodaPunuese && (
                        <p className="text-xs text-purple-600 font-medium mt-0.5">Metoda: {analiza.metodaPunuese}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Flamuri live — llogaritet nga vlerat e inputit, kritikMin/kritikMax */}
                    {(() => {
                      const pacMosha = pac?.datelindja ? new Date().getFullYear() - new Date(pac.datelindja).getFullYear() : 30;
                      const wf = worstFlamuriLive(row, vlerat, pac?.gjinia, pacMosha);
                      const badge = flamurBadge[wf];
                      return badge ? (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      ) : null;
                    })()}
                    {/* Shfaq ne raport toggle */}
                    <button
                      onClick={() => toggleFlag(row, 'shfaqNeRaport')}
                      title={row.shfaqNeRaport === false ? 'Nuk shfaqet në raport — kliko për ta aktivizuar' : 'Shfaqet në raport — kliko për ta fshehur'}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        row.shfaqNeRaport === false
                          ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      }`}>
                      {row.shfaqNeRaport === false ? <EyeOff size={11}/> : <Eye size={11}/>}
                      Raport: {row.shfaqNeRaport === false ? 'OFF' : 'ON'}
                    </button>
                    {row.kompletuar && !editAktiv && (
                      <span className="text-green-600 text-sm flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                        <CheckCircle size={14}/> Kompletuar
                      </span>
                    )}
                  </div>
                </div>


                <div className="space-y-3">
                  {/* Inputet e vlerave */}
                  {refs.length > 0 ? refs.map((ref, ri) => {
                    const key     = ref.emri || 'vlera';
                    const val     = vlerat[row._id]?.[key] ?? '';
                    // isTekst: te gjitha vlerat e komponentit jane tip 'tekst' (p.sh. Sedimenti i Urines)
                    const isTekst = (ref.vlerat || []).length > 0
                      && (ref.vlerat || []).every(vl => vl.operatori === 'tekst');
                    const op      = ref.vlerat?.[0]?.operatori || 'midis';
                    const numVal  = Number(val);
                    let flamuri   = '—';
                    if (!isTekst && val !== '' && !isNaN(numVal)) {
                      if (op === 'midis' && ref.vleraMin != null && ref.vleraMax != null) {
                        if      (numVal < ref.vleraMin * 0.7) flamuri = 'Shume_Ulet';
                        else if (numVal < ref.vleraMin)        flamuri = 'Ulet';
                        else if (numVal > ref.vleraMax * 1.5)  flamuri = 'Shume_Larte';
                        else if (numVal > ref.vleraMax)        flamuri = 'Larte';
                        else                                   flamuri = 'Normal';
                      } else if ((op === 'me_pak' || op === 'me_pak_baraz') && ref.vleraMin != null) {
                        flamuri = numVal < ref.vleraMin ? 'Normal' : 'Larte';
                      } else if ((op === 'me_shum' || op === 'me_shum_baraz') && ref.vleraMin != null) {
                        flamuri = numVal > ref.vleraMin ? 'Normal' : 'Ulet';
                      }
                    }
                    return (
                      <div key={ri} className="flex flex-col bg-gray-50 rounded-xl p-3 gap-2">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {ref.emri && <p className="text-xs font-semibold text-gray-600 mb-1">{ref.emri}</p>}
                          <div className="flex items-start gap-2">
                            {isTekst && (ref.vlerat || []).length > 0 ? (
                              <div className="flex-1">
                                <div className="flex flex-wrap gap-2">
                                  {(ref.vlerat || []).map((vl, vi) => (
                                    <button key={vi} type="button"
                                      disabled={kompletuar && !modoEdit}
                                      onClick={() => {
                                        setVlera(row._id, key, vl.vleraTekst);
                                        setKomente(p => ({ ...p, [row._id]: vl.komentAuto || '' }));
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                                        val === vl.vleraTekst
                                          ? 'bg-primary text-white border-primary'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                                      }`}>
                                      {vl.vleraTekst}
                                    </button>
                                  ))}
                                </div>
                                {(ref.vlerat || []).find(vl => vl.vleraTekst === val)?.komentAuto && (
                                  <p className="text-xs text-gray-500 italic mt-2">
                                    {(ref.vlerat || []).find(vl => vl.vleraTekst === val).komentAuto}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <AutoTextarea
                                className={`input flex-1 text-base font-bold leading-5 ${inputNgjyra(flamuri)}`}
                                value={val}
                                onChange={e => setVlera(row._id, key, e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ruajAnalizen(row); } }}
                                placeholder={isTekst ? 'Vlera...' : '0.00'}
                                disabled={kompletuar && !modoEdit}/>
                            )}
                            {!isTekst && <span className="text-gray-400 text-sm pt-1">{ref.njesia}</span>}
                          </div>
                        </div>
                        {!isTekst && (
                          <div className="text-right min-w-36 flex-shrink-0">
                            <p className="text-xs text-gray-400 mb-1">Referenca normale</p>
                            <p className="text-sm font-mono text-gray-600">{kompRefTekst(ref)}</p>
                            {(ref.vlerat || []).map((vl, vi) => (
                              <p key={vi} className="text-xs text-gray-400 font-mono">{vl.etiketa ? `${vl.etiketa}: ` : ''}{kompRefTekst(vl)}</p>
                            ))}
                            {flamuri !== '—' && (
                              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${flamurInfo[flamuri]?.cls}`}>
                                {flamurInfo[flamuri]?.label}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Koment per komponent */}
                      {(!kompletuar || modoEdit) && (
                        <KomentKomponenti
                          vlera={komentetKomp[`${row._id}_${key}`] || ''}
                          onChange={val => setKomentetKomp(p => ({ ...p, [`${row._id}_${key}`]: val }))}
                          disabled={false}
                        />
                      )}
                      </div>
                    );
                  }) : (
                    <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                      <AutoTextarea
                        className="input flex-1 text-lg font-bold leading-5"
                        value={vlerat[row._id]?.['vlera'] ?? ''}
                        onChange={e => setVlera(row._id, 'vlera', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ruajAnalizen(row); } }}
                        placeholder="Vlera..."
                        disabled={kompletuar && !modoEdit}/>
                    </div>
                  )}

                  {/* Intervalet klinike */}
                  {analiza?.intervale?.length > 0 && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-2">Zonat klinike:</p>
                      <div className="flex flex-wrap gap-2">
                        {analiza.intervale.map((inv, ii) => (
                          <span key={ii} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${invNgjyra[inv.ngjyra] || 'bg-gray-100 text-gray-600'}`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${invDot[inv.ngjyra] || 'bg-gray-400'}`}/>
                            <strong>{inv.etiketa}</strong>
                            <span className="opacity-70">{invTekst(inv)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Koment per analizen */}
                  {(!kompletuar || modoEdit) && (
                    <KomentSekcioni
                      vlera={komente[row._id] || ''}
                      onChange={val => setKomente(p => ({ ...p, [row._id]: val }))}
                      presets={row.analiza?.komentet}
                      disabled={false}
                    />
                  )}
                </div>

                {(!kompletuar || modoEdit) && (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => ruajAnalizen(row)}
                      className="btn-secondary text-sm flex items-center gap-1.5">
                      <Save size={14}/> Ruaj kete analize
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Koment i profilit — vetem kur profili eshte hapur */}
          {grup.profiliId && hapurProfilet.has(grup.profiliId) && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-violet-500"/>
                <p className="text-sm font-semibold text-violet-700">Koment per profilin: {grup.profiliEmri}</p>
              </div>
              <textarea
                className="input resize-none h-20 text-sm w-full bg-white"
                value={komentetProf[grup.profiliId] || ''}
                onChange={e => setKomentetProf(p => ({ ...p, [grup.profiliId]: e.target.value }))}
                placeholder="Koment i pergjithshem per profilin (shfaqet ne PDF)..."
                disabled={kompletuar && !modoEdit}
              />
              {(!kompletuar || modoEdit) && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={async () => {
                      // Ruaj komentin e profilit me analizen e pare jo te kompletuar
                      const firstRow = grup.analizat.find(r => !r.kompletuar) || grup.analizat[0];
                      if (firstRow) await ruajAnalizen(firstRow, komentetProf[grup.profiliId] || '');
                      else toast.success('Komenti i profilit u ruajt!');
                    }}
                    className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium">
                    <Save size={12}/> Ruaj komentin e profilit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      {!kompletuar ? (
        <div className="card flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-700">{nKomp} / {nTotal} analiza te kompletuara</p>
            {kaRezultate && <p className="text-xs text-gray-400 mt-0.5">PDF disponibel me rezultatet e deritanishme</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(-1)} className="btn-ghost text-sm">Kthehu</button>
            {kaRezultate && (
              <button onClick={shkarko} disabled={duke_pdf}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                {duke_pdf ? <Loader size={14} className="animate-spin"/> : <FileDown size={14}/>} PDF
              </button>
            )}
            <button onClick={ruajTeGjitha} disabled={duke_ruajtur}
              className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle size={15}/>
              {duke_ruajtur ? 'Duke ruajtur...' : 'Kompletoj te Gjitha'}
            </button>
          </div>
        </div>
      ) : modoEdit ? (
        <div className="card bg-orange-50 border-2 border-orange-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Pencil size={18} className="text-orange-600"/>
            </div>
            <div>
              <p className="font-bold text-orange-800">Menyre Editimi</p>
              <p className="text-xs text-orange-600">Ndryshimet ruhen mbi rezultatet ekzistuese</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModoEdit(false)} className="btn-ghost text-sm">Anulo</button>
            <button onClick={ruajTeGjitha} disabled={duke_ruajtur} className="btn-primary flex items-center gap-2 text-sm">
              <Save size={15}/>
              {duke_ruajtur ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card bg-green-50 border-2 border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={22} className="text-green-600"/>
            </div>
            <div>
              <p className="font-bold text-green-800">Rezultatet u kompletuan!</p>
              <p className="text-xs text-green-600">Raporti PDF eshte gati</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModoEdit(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-300 text-orange-700 text-sm font-medium hover:bg-orange-50 transition-colors">
              <Pencil size={15}/> Edito Rezultatet
            </button>
            <button onClick={hapPDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green-300 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors">
              <FileDown size={15}/> Shiko
            </button>
            <button onClick={shkarko} disabled={duke_pdf} className="btn-primary flex items-center gap-2 text-sm">
              {duke_pdf ? <><Loader size={15} className="animate-spin"/> Duke gjeneruar...</> : <><FileDown size={15}/> Shkarko PDF</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Shto Analiza */}
      {modalShtoAnaliza && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Shto Analiza ne Porosi</h2>
              <button onClick={() => setModalShtoAnaliza(false)} className="btn-ghost p-1"><X size={20}/></button>
            </div>
            <div className="p-4 border-b">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-9" placeholder="Kerko analize..." value={kerkoAnaliza} onChange={e => setKerkoAnaliza(e.target.value)} autoFocus/>
              </div>
              <p className="text-xs text-gray-400 mt-2">Departamenti: {porosi.departamenti} · {analizatZgjedhura.length} zgjedhur</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {analizatFiltruara.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Nuk u gjeten analiza te tjera</p>
              ) : analizatFiltruara.map(a => (
                <label key={a._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary"
                    checked={analizatZgjedhura.includes(a._id)}
                    onChange={() => toggleZgjedhur(a._id)}/>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{a.emri}</p>
                    <p className="text-xs text-gray-400">{a.kodi}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setModalShtoAnaliza(false)} className="btn-ghost">Anulo</button>
              <button onClick={konfirmoShtoAnaliza} disabled={dukeShtuarAnaliza || !analizatZgjedhura.length}
                className="btn-primary flex items-center gap-1.5">
                {dukeShtuarAnaliza ? <Loader size={14} className="animate-spin"/> : <Plus size={14}/>}
                Shto {analizatZgjedhura.length > 0 ? `(${analizatZgjedhura.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
