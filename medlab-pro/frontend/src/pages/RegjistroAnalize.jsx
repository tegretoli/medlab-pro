import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2, X, Save, FlaskConical, Search, MessageSquare, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import RichTextEditor from '../components/ui/RichTextEditor';
import toast from 'react-hot-toast';

const DEPARTAMENTET = ['Biokimi', 'Mikrobiologji', 'PCR'];

const DEP_COLORS = {
  Biokimi: '#3B82F6', Mikrobiologji: '#22C55E', PCR: '#A855F7',
};

const LLOJET_MOSTRES = [
  'Gjak venoz', 'Gjak kapilar', 'Serum', 'Plazma', 'Urine',
  'Feces', 'Kultura', 'Tampon', 'Leng cerebrospinal', 'Salive', 'Tjeter',
];

const FORMA_ZBRAZET = {
  kodi: '', emri: '', departamenti: 'Biokimi',
  profiliId: '', materialBiologjik: 'Gjak venoz',
  cmime: { pacient: 0, bashkpuntor: 0 },
  komponente: [], shenime: '', komentet: [],
};
const KOMP_BOSH  = { emri: '', njesia: '', kritikMin: '', kritikMax: '', vlerat: [] };
const VLERA_BOSH = { etiketa: '', gjinia: 'Te dyja', moshaMin: '', moshaMax: '', operatori: 'midis', vleraMin: '', vleraMax: '', vleraTekst: '', kritikMin: '', kritikMax: '', komentAuto: '' };

const opSimbol = op => ({ me_pak: '<', me_pak_baraz: '≤', me_shum_baraz: '≥', me_shum: '>' }[op] || '');

const PER_FAQE = 10;

export default function RegjistroAnalize() {
  const [depAktiv, setDepAktiv]        = useState('Biokimi');
  const [analizat, setAnalizat]        = useState([]);
  const [ngarkimi, setNgarkimi]        = useState(false);
  const [modalHapur, setModalHapur]    = useState(false);
  const [forma, setForma]              = useState({ ...FORMA_ZBRAZET });
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [editId, setEditId]            = useState(null);
  const [profilet, setProfilet]        = useState([]);
  const [kerko, setKerko]              = useState('');
  const [faqja, setFaqja]              = useState(1);

  // Import Excel state
  const [modalImport, setModalImport]  = useState(false);
  const [importSkedari, setImportSkedari] = useState(null);
  const [importGabimet, setImportGabimet] = useState(null); // null | []
  const [importSuksesi, setImportSuksesi] = useState(null); // null | number
  const [importDuke, setImportDuke]    = useState(false);
  const fileInputRef                   = useRef(null);

  const ngarko = () => {
    setNgarkimi(true);
    api.get('/laborator/analizat', { params: { departamenti: depAktiv, aktiv: 'true' } })
      .then(r => { setAnalizat(r.data.analizat || []); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  };

  useEffect(() => { ngarko(); }, [depAktiv]);
  useEffect(() => { setFaqja(1); }, [kerko, depAktiv]);
  useEffect(() => {
    api.get('/profilet')
      .then(r => setProfilet(r.data.profilet || []))
      .catch(() => {});
  }, []);

  const hapModal = (analiza = null) => {
    if (analiza) {
      setForma({
        ...FORMA_ZBRAZET,
        kodi:              analiza.kodi || '',
        emri:              analiza.emri || '',
        departamenti:      analiza.departamenti || depAktiv,
        profiliId:         analiza.profiliId?._id || analiza.profiliId || '',
        materialBiologjik: analiza.materialBiologjik || 'Gjak venoz',
        cmime:             { ...FORMA_ZBRAZET.cmime, ...analiza.cmime },
        komponente:        (analiza.komponente || []).map(k => ({
          ...KOMP_BOSH, ...k,
          kritikMin: k.kritikMin ?? '',
          kritikMax: k.kritikMax ?? '',
          vlerat: (k.vlerat || []).map(vl => ({ ...VLERA_BOSH, ...vl })),
        })),
        shenime: analiza.shenime || '',
        komentet: analiza.komentet || [],
      });
      setEditId(analiza._id);
    } else {
      setForma({ ...FORMA_ZBRAZET, departamenti: depAktiv });
      setEditId(null);
    }
    setModalHapur(true);
  };

  const ruaj = async () => {
    if (!forma.kodi || !forma.emri) return toast.error('Ploteso: ID dhe Emri');
    setDukeRuajtur(true);
    const payload = { ...forma, profiliId: forma.profiliId || null };
    try {
      if (editId) {
        await api.put(`/laborator/analizat/${editId}`, payload);
        toast.success('Analiza u perditesua!');
      } else {
        await api.post('/laborator/analizat', payload);
        toast.success('Analiza u shtua!');
      }
      setModalHapur(false);
      ngarko();
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim gjate ruajtjes');
    }
    setDukeRuajtur(false);
  };

  const fshi = async (id) => {
    if (!confirm('caktivizon kete analize?')) return;
    try {
      await api.delete(`/laborator/analizat/${id}`);
      toast.success('Analiza u caktivizua');
      ngarko();
    } catch { toast.error('Gabim gjate fshirjes'); }
  };

  /* helpers */
  const set     = (f, v) => setForma(p => ({ ...p, [f]: v }));
  const setCmim = (f, v) => setForma(p => ({ ...p, cmime: { ...p.cmime, [f]: Number(v) } }));
  const setKomp = (i, f, v) => setForma(p => { const a = [...p.komponente]; a[i] = { ...a[i], [f]: v }; return { ...p, komponente: a }; });
  const shtoKomp = () => setForma(p => ({ ...p, komponente: [...p.komponente, { ...KOMP_BOSH }] }));
  const hiqKomp  = (i) => setForma(p => ({ ...p, komponente: p.komponente.filter((_, x) => x !== i) }));
  const setKompVlera = (ki, vi, f, v) => setForma(p => {
    const a = [...p.komponente];
    const vl = [...(a[ki].vlerat || [])];
    vl[vi] = { ...vl[vi], [f]: v };
    a[ki] = { ...a[ki], vlerat: vl };
    return { ...p, komponente: a };
  });
  const shtoKompVlera = (ki) => setForma(p => {
    if ((p.komponente[ki].vlerat || []).length >= 20) return p;
    const a = [...p.komponente];
    a[ki] = { ...a[ki], vlerat: [...(a[ki].vlerat || []), { ...VLERA_BOSH }] };
    return { ...p, komponente: a };
  });
  const hiqKompVlera = (ki, vi) => setForma(p => {
    const a = [...p.komponente];
    a[ki] = { ...a[ki], vlerat: a[ki].vlerat.filter((_, x) => x !== vi) };
    return { ...p, komponente: a };
  });

  /* ── Excel import/export ── */
  const hapModalImport = () => {
    setImportSkedari(null);
    setImportGabimet(null);
    setImportSuksesi(null);
    setModalImport(true);
  };

  const zgjidhoSkedarin = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.xlsx')) { toast.error('Lejohet vetem .xlsx'); return; }
    setImportSkedari(f);
    setImportGabimet(null);
    setImportSuksesi(null);
  };

  const bejImport = async () => {
    if (!importSkedari) return;
    setImportDuke(true);
    const fd = new FormData();
    fd.append('file', importSkedari);
    try {
      const r = await api.post('/laborator/analizat/import-excel', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSuksesi(r.data.importuara);
      setImportGabimet(null);
      ngarko();
    } catch (e) {
      const data = e.response?.data;
      if (data?.gabimet) {
        setImportGabimet(data.gabimet);
      } else {
        toast.error(data?.message || 'Gabim gjate importit');
      }
    }
    setImportDuke(false);
  };

  const bejEksport = async () => {
    try {
      const r = await api.get('/laborator/analizat/eksport-excel', {
        params:       { departamenti: depAktiv },
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
      link.href     = url;
      link.download = `analyses_export_${today}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Gabim gjate eksportit'); }
  };

  const shkarkoTemplate = async () => {
    try {
      const r = await api.get('/laborator/analizat/template-excel', { responseType: 'blob' });
      const url  = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href     = url;
      link.download = 'analyses_template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Gabim gjate shkarkimit'); }
  };

  const color = DEP_COLORS[depAktiv] || '#6B7280';
  const analizatFiltruara = analizat.filter(a =>
    !kerko || `${a.emri} ${a.kodi} ${a.materialBiologjik}`.toLowerCase().includes(kerko.toLowerCase())
  );
  const totalFaqe = Math.ceil(analizatFiltruara.length / PER_FAQE);
  const analizatFaqja = analizatFiltruara.slice((faqja - 1) * PER_FAQE, faqja * PER_FAQE);

  return (
    <div className="space-y-4">

      {/* Header row: title + dept tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Regjistro Analize</h1>
          <p className="text-gray-500 text-sm">Shto dhe menaxho analizat sipas departamentit</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEPARTAMENTET.map(dep => {
            const c = DEP_COLORS[dep] || '#6B7280';
            const aktiv = depAktiv === dep;
            return (
              <button key={dep} onClick={() => setDepAktiv(dep)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
                  aktiv ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={aktiv ? { background: c, borderColor: c } : {}}>
                {dep}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: color }}/>
          {depAktiv}
          <span className="text-sm font-normal text-gray-400">· {analizat.length} analiza</span>
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <input
              className="input pl-8 text-xs py-2 w-48"
              placeholder="Kerko analizen..."
              value={kerko}
              onChange={e => setKerko(e.target.value)}
            />
          </div>
          <button onClick={bejEksport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors">
            <Download size={14}/> Export Excel
          </button>
          <button onClick={hapModalImport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
            <Upload size={14}/> Import Excel
          </button>
          <button onClick={() => hapModal()} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Shto Analize
          </button>
        </div>
      </div>

      {/* Analysis list */}
      <div className="card overflow-hidden p-0">
        {ngarkimi ? (
          <div className="p-8 text-center text-gray-400">Duke ngarkuar...</div>
        ) : analizat.length === 0 ? (
          <div className="p-12 text-center">
            <FlaskConical size={40} className="mx-auto text-gray-200 mb-3"/>
            <p className="text-gray-400">Asnje analize per {depAktiv}</p>
            <button onClick={() => hapModal()} className="btn-primary mt-4 text-sm">+ Shto Analizen e Pare</button>
          </div>
        ) : (
          <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-8">#</th>
                <th className="px-4 py-3 text-left">Emri</th>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Mostra</th>
                <th className="px-4 py-3 text-left">Profili</th>
                <th className="px-4 py-3 text-right">Pacient</th>
                <th className="px-4 py-3 text-right">Bashkpuntor</th>
                <th className="px-4 py-3 text-center">Komp.</th>
                <th className="px-4 py-3 text-center">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {analizatFaqja.map((a, idx) => (
                <tr key={a._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{(faqja - 1) * PER_FAQE + idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{a.emri}</div>
                    {a.shenime && <div className="text-xs text-gray-400 truncate max-w-48">{a.shenime}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.kodi}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{a.materialBiologjik || '·'}</td>
                  <td className="px-4 py-3">
                    {a.profiliId
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">{a.profiliId?.emri || 'Profil'}</span>
                      : <span className="text-xs text-gray-300">·</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{a.cmime?.pacient?.toLocaleString()} EUR</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {a.cmime?.bashkpuntor > 0 ? `${a.cmime.bashkpuntor.toLocaleString()} EUR` : <span className="text-gray-300 font-normal">·</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.komponente?.length > 0
                      ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.komponente.length}</span>
                      : <span className="text-gray-300 text-xs">·</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => hapModal(a)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                        <Edit2 size={14}/>
                      </button>
                      <button onClick={() => fshi(a._id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {totalFaqe > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-400">
                {(faqja - 1) * PER_FAQE + 1}–{Math.min(faqja * PER_FAQE, analizatFiltruara.length)} nga {analizatFiltruara.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setFaqja(f => Math.max(1, f - 1))} disabled={faqja === 1}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                  ‹
                </button>
                {Array.from({ length: totalFaqe }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalFaqe || Math.abs(n - faqja) <= 1)
                  .reduce((acc, n, i, arr) => {
                    if (i > 0 && n - arr[i - 1] > 1) acc.push('…');
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) => n === '…'
                    ? <span key={`e${i}`} className="px-1.5 text-xs text-gray-400">…</span>
                    : <button key={n} onClick={() => setFaqja(n)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium ${faqja === n ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                        {n}
                      </button>
                  )}
                <button onClick={() => setFaqja(f => Math.min(totalFaqe, f + 1))} disabled={faqja === totalFaqe}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                  ›
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* ── MODAL IMPORT EXCEL ── */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={18} className="text-blue-500"/>
                </div>
                <div>
                  <h2 className="font-bold text-base">Import nga Excel</h2>
                  <p className="text-xs text-gray-400">Ngarko .xlsx me lista analizash</p>
                </div>
              </div>
              <button onClick={() => setModalImport(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18}/></button>
            </div>

            <div className="p-6 space-y-4">

              {/* Sukses */}
              {importSuksesi !== null && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <CheckCircle2 size={20} className="text-green-500 flex-shrink-0"/>
                  <div>
                    <p className="font-semibold text-green-700">{importSuksesi} analiza u importuan me sukses!</p>
                    <button onClick={() => setModalImport(false)} className="text-xs text-green-600 hover:underline mt-0.5">Mbyll</button>
                  </div>
                </div>
              )}

              {/* Zona ngarkimit */}
              {importSuksesi === null && (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                    <Upload size={28} className="mx-auto text-gray-300 mb-2"/>
                    {importSkedari
                      ? <p className="font-medium text-blue-600 text-sm">{importSkedari.name}</p>
                      : <>
                          <p className="text-sm text-gray-500">Kliko ose terhiq skedarin ketu</p>
                          <p className="text-xs text-gray-400 mt-1">Vetem .xlsx · Maksimum 5 MB</p>
                        </>
                    }
                    <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={zgjidhoSkedarin}/>
                  </div>

                  {/* Kolonat e pritura */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Kolonat e pritura</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ['analysis_code',  'Kodi i analizes *',         false],
                        ['analysis_name',  'Emri i analizes *',         false],
                        ['department',     'Departamenti (opsional)',    false],
                        ['sample_type',    'Lloji mostres',             false],
                        ['profile_name',   'Emri i profilit (opsional)', true],
                        ['patient_price',  'Cmimi pacient',             false],
                        ['partner_price',  'Cmimi bashkpuntor',         false],
                      ].map(([col, desc, isNew]) => (
                        <div key={col} className="flex items-start gap-1.5">
                          <span className="font-mono text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-blue-600 flex-shrink-0">{col}</span>
                          <span className="text-xs text-gray-400 leading-tight">
                            {desc}
                            {isNew && <span className="ml-1 text-violet-500 font-medium">· profil</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <button onClick={shkarkoTemplate}
                      className="mt-3 text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1">
                      <Download size={11}/> Shkarko template
                    </button>
                  </div>

                  {/* Tabela gabimesh */}
                  {importGabimet && importGabimet.length > 0 && (
                    <div className="border border-red-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200">
                        <AlertCircle size={15} className="text-red-500 flex-shrink-0"/>
                        <p className="text-sm font-semibold text-red-700">{importGabimet.length} gabime u gjet — korrigjo dhe provo perseri</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                            <tr>
                              <th className="px-3 py-2 text-left w-16">Rreshti</th>
                              <th className="px-3 py-2 text-left w-20">Kodi</th>
                              <th className="px-3 py-2 text-left">Gabimi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importGabimet.map((g, i) => (
                              <tr key={i} className="hover:bg-red-50/40">
                                <td className="px-3 py-2 text-gray-400">{g.rreshti}</td>
                                <td className="px-3 py-2 font-mono text-gray-600">{g.kodi}</td>
                                <td className="px-3 py-2 text-red-600">{g.gabime}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Footer buttons */}
              {importSuksesi === null && (
                <div className="flex gap-3 justify-end pt-2">
                  <button onClick={() => setModalImport(false)} className="btn-ghost">Anulo</button>
                  <button onClick={bejImport} disabled={!importSkedari || importDuke}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50">
                    <Upload size={15}/>
                    {importDuke ? 'Duke importuar...' : 'Importo'}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ?? MODAL ?? */}
      {modalHapur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-base">{editId ? 'Edito Analizen' : 'Analize e Re'}</h2>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }}/>
                  {forma.departamenti}
                </p>
              </div>
              <button onClick={() => setModalHapur(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18}/></button>
            </div>

            <div className="p-6 space-y-5">

              {/* ID + Emri */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ID (Kodi) <span className="text-red-400">*</span></label>
                  <input className="input font-mono uppercase tracking-widest" value={forma.kodi}
                    onChange={e => set('kodi', e.target.value.toUpperCase())} placeholder="BIO001"/>
                </div>
                <div>
                  <label className="label">Emri i Analizes <span className="text-red-400">*</span></label>
                  <input className="input" value={forma.emri}
                    onChange={e => set('emri', e.target.value)} placeholder="p.sh. Hemogram i Plote"/>
                </div>
              </div>

              {/* Mostra */}
              <div>
                <label className="label">Mostra (Lloji Mostres)</label>
                <input className="input" list="llojet-mostres-list"
                  value={forma.materialBiologjik}
                  onChange={e => set('materialBiologjik', e.target.value)}
                  placeholder="p.sh. Serum, Gjak venoz"/>
                <datalist id="llojet-mostres-list">
                  {LLOJET_MOSTRES.map(l => <option key={l} value={l}/>)}
                </datalist>
              </div>

              {/* cmimet */}
              <div>
                <label className="label">cmimet</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Cmimi Pacient (EUR)</p>
                    <input type="number" className="input bg-white text-base font-semibold"
                      value={forma.cmime.pacient} onChange={e => setCmim('pacient', e.target.value)} placeholder="0"/>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Cmimi Bashkpuntor (EUR)</p>
                    <input type="number" className="input bg-white text-base font-semibold"
                      value={forma.cmime.bashkpuntor} onChange={e => setCmim('bashkpuntor', e.target.value)} placeholder="0"/>
                  </div>
                </div>
              </div>

              {/* Profili */}
              <div>
                <label className="label">I caktuar profilit <span className="text-xs text-gray-400 font-normal">(opsionale)</span></label>
                <select className="input" value={forma.profiliId} onChange={e => set('profiliId', e.target.value)}>
                  <option value="">— Pa profil ·</option>
                  {profilet.map(p => (
                    <option key={p._id} value={p._id}>{p.emri}</option>
                  ))}
                </select>
              </div>

              {/* Vlerat Referente */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="label mb-0">Vlerat Referente (Komponente)</label>
                    <p className="text-xs text-gray-400">Emri · Njesia · Kritik Min/Max · Intervalet referente</p>
                  </div>
                  <button onClick={shtoKomp} className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0 ml-3">
                    <Plus size={12}/> Shto
                  </button>
                </div>
                {forma.komponente.length === 0 ? (
                  <button onClick={shtoKomp} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary hover:text-primary transition-colors">
                    + Shto vlera referente (opsionale)
                  </button>
                ) : (
                  <div className="space-y-3">
                    {forma.komponente.map((k, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 relative">
                        <button onClick={() => hiqKomp(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400"><X size={12}/></button>
                        <div className="grid grid-cols-12 gap-2 pr-5">
                          <div className="col-span-4">
                            <label className="label text-xs">Komponenti</label>
                            <input className="input text-xs font-semibold" value={k.emri}
                              onChange={e => setKomp(i, 'emri', e.target.value)} placeholder="WBC, Glukoza..."/>
                          </div>
                          <div className="col-span-2">
                            <label className="label text-xs">Njesia</label>
                            <input className="input text-xs" value={k.njesia}
                              onChange={e => setKomp(i, 'njesia', e.target.value)} placeholder="mg/dL"/>
                          </div>
                          <div className="col-span-3">
                            <label className="label text-xs">Kritik Min</label>
                            <input type="number" className="input text-xs" value={k.kritikMin}
                              onChange={e => setKomp(i, 'kritikMin', e.target.value)} placeholder="min"/>
                          </div>
                          <div className="col-span-3">
                            <label className="label text-xs">Kritik Max</label>
                            <input type="number" className="input text-xs" value={k.kritikMax}
                              onChange={e => setKomp(i, 'kritikMax', e.target.value)} placeholder="max"/>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(k.vlerat || []).map((vl, vi) => (
                            <div key={vi} className="pl-3 border-l-2 border-gray-200 space-y-1.5">
                              {/* Row 1: gjinia + mosha */}
                              <div className="flex gap-2 items-center">
                                <select className="input text-xs w-28 flex-shrink-0" value={vl.gjinia || 'Te dyja'}
                                  onChange={e => setKompVlera(i, vi, 'gjinia', e.target.value)}>
                                  <option value="Te dyja">Te dyja</option>
                                  <option value="M">Mashkull</option>
                                  <option value="F">Femer</option>
                                </select>
                                <span className="text-xs text-gray-400 flex-shrink-0">Mosha:</span>
                                <input type="number" className="input text-xs w-16" value={vl.moshaMin ?? ''}
                                  onChange={e => setKompVlera(i, vi, 'moshaMin', e.target.value)} placeholder="0"/>
                                <span className="text-gray-400 text-xs flex-shrink-0">·</span>
                                <input type="number" className="input text-xs w-16" value={vl.moshaMax ?? ''}
                                  onChange={e => setKompVlera(i, vi, 'moshaMax', e.target.value)} placeholder="120"/>
                                <button onClick={() => hiqKompVlera(i, vi)} className="ml-auto text-gray-300 hover:text-red-400 flex-shrink-0"><X size={10}/></button>
                              </div>
                              {/* Row 2: etiketa + operator + values */}
                              <div className="flex gap-2 items-center">
                                <input className="input text-xs w-24" value={vl.etiketa || ''}
                                  onChange={e => setKompVlera(i, vi, 'etiketa', e.target.value)} placeholder="Etiketa"/>
                                <select className="input text-xs w-28" value={vl.operatori || 'midis'}
                                  onChange={e => setKompVlera(i, vi, 'operatori', e.target.value)}>
                                  <option value="midis">midis</option>
                                  <option value="me_pak">&lt;</option>
                                  <option value="me_pak_baraz">≤</option>
                                  <option value="me_shum_baraz">≥</option>
                                  <option value="me_shum">&gt;</option>
                                  <option value="tekst">tekst</option>
                                </select>
                                {(!vl.operatori || vl.operatori === 'midis') ? (
                                  <>
                                    <input type="number" className="input text-xs w-20" value={vl.vleraMin || ''}
                                      onChange={e => setKompVlera(i, vi, 'vleraMin', e.target.value)} placeholder="Nga"/>
                                    <span className="text-gray-400 text-xs">·</span>
                                    <input type="number" className="input text-xs w-20" value={vl.vleraMax || ''}
                                      onChange={e => setKompVlera(i, vi, 'vleraMax', e.target.value)} placeholder="Deri"/>
                                  </>
                                ) : vl.operatori === 'tekst' ? (
                                  <input className="input text-xs w-28" value={vl.vleraTekst || ''}
                                    onChange={e => setKompVlera(i, vi, 'vleraTekst', e.target.value)} placeholder="Tekst"/>
                                ) : (
                                  <>
                                    <span className="text-xs font-semibold text-gray-400 w-4 flex-shrink-0">{opSimbol(vl.operatori)}</span>
                                    <input type="number" className="input text-xs w-20" value={vl.vleraMin || ''}
                                      onChange={e => setKompVlera(i, vi, 'vleraMin', e.target.value)} placeholder="Vlera"/>
                                  </>
                                )}
                              </div>
                              {/* Row 3: kritik min/max per interval (opsional, fallback) */}
                              {vl.operatori !== 'tekst' && (
                                <div className="flex gap-2 items-center">
                                  <span className="text-xs text-gray-400 flex-shrink-0 w-24">Kritik Min/Max</span>
                                  <input type="number" className="input text-xs w-20" value={vl.kritikMin ?? ''}
                                    onChange={e => setKompVlera(i, vi, 'kritikMin', e.target.value)} placeholder="min"/>
                                  <span className="text-gray-400 text-xs">·</span>
                                  <input type="number" className="input text-xs w-20" value={vl.kritikMax ?? ''}
                                    onChange={e => setKompVlera(i, vi, 'kritikMax', e.target.value)} placeholder="max"/>
                                </div>
                              )}
                              {/* Row 4: komentAuto — me editor rich text */}
                              <div className="space-y-1">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <MessageSquare size={10}/> Koment automatik (rich text)
                                </span>
                                <RichTextEditor
                                  value={vl.komentAuto || ''}
                                  onChange={v => setKompVlera(i, vi, 'komentAuto', v)}
                                  placeholder="Koment që plotësohet automatikisht kur zgjidhet kjo vlerë..."
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        {(k.vlerat || []).length < 20 && (
                          <button onClick={() => shtoKompVlera(i)}
                            className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 pl-1 transition-colors">
                            <Plus size={10}/> Shto interval referent
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Komentet e paracaktuara */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="label mb-0 flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-gray-400"/> Komente të Paracaktuara
                    </label>
                    <p className="text-xs text-gray-400">Shfaqen si sugjerime gjatë regjistrimit të rezultateve</p>
                  </div>
                  {forma.komentet.length < 6 && (
                    <button onClick={() => set('komentet', [...forma.komentet, ''])}
                      className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0 ml-3">
                      <Plus size={12}/> Shto
                    </button>
                  )}
                </div>
                {forma.komentet.length === 0 ? (
                  <button onClick={() => set('komentet', [''])}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary hover:text-primary transition-colors">
                    + Shto koment të paracaktuar (opsionale)
                  </button>
                ) : (
                  <div className="space-y-3">
                    {forma.komentet.map((k, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Koment {i + 1}</span>
                          <button onClick={() => set('komentet', forma.komentet.filter((_, x) => x !== i))}
                            className="text-gray-300 hover:text-red-400 transition-colors">
                            <X size={14}/>
                          </button>
                        </div>
                        <RichTextEditor
                          value={k}
                          onChange={v => {
                            const arr = [...forma.komentet];
                            arr[i] = v;
                            set('komentet', arr);
                          }}
                          placeholder={`Koment ${i + 1}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button onClick={() => setModalHapur(false)} className="btn-ghost">Anulo</button>
                <button onClick={ruaj} disabled={duke_ruajtur} className="btn-primary flex items-center gap-2">
                  <Save size={15}/>
                  {duke_ruajtur ? 'Duke ruajtur...' : 'Ruaj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
