import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Search, Edit2, Trash2, X, Save, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTAMENTET = ['Biokimi', 'Mikrobiologji', 'PCR'];

const DEP_COLORS = {
  Biokimi:       '#3B82F6',
  Mikrobiologji: '#22C55E',
  PCR:           '#A855F7',
};

const LLOJET_MOSTRES = [
  'Gjak venoz', 'Gjak kapilar', 'Serum', 'Plazma', 'Urine',
  'Feces', 'Kultura', 'Tampon', 'Leng cerebrospinal', 'Salive', 'Tjeter',
];

const FORMA_ZBRAZET = {
  kodi: '', emri: '', departamenti: 'Biokimi',
  profiliId: '',
  materialBiologjik: 'Gjak venoz',
  cmime: { pacient: 0, bashkpuntor: 0 },
  komponente: [],
  shenime: '',
};

const KOMP_BOSH  = { emri: '', njesia: '', kritikMin: '', kritikMax: '', vlerat: [] };
const VLERA_BOSH = { etiketa: '', gjinia: 'Te dyja', moshaMin: '', moshaMax: '', moshaJedesi: 'Vjet', operatori: 'midis', vleraMin: '', vleraMax: '', vleraTekst: '', komentAuto: '' };
const VLERA_PCR_BOSH = { etiketa: '', operatori: 'tekst', vleraMin: '', vleraMax: '', vleraTekst: '', komentAuto: '' };

const operatorSimbol = (op) => {
  const m = { me_pak: '<', me_pak_baraz: '?', me_shum_baraz: '?', me_shum: '>' };
  return m[op] || '';
};

// ?????????????????????????????????????????????????????????????
export default function KatalogAnalizave() {
  const [analizat, setAnalizat]        = useState([]);
  const [ngarkimi, setNgarkimi]        = useState(true);
  const [kerko, setKerko]              = useState('');
  const [depFilter, setDepFilter]      = useState('');
  const [modalHapur, setModalHapur]    = useState(false);
  const [forma, setForma]              = useState(FORMA_ZBRAZET);
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [editId, setEditId]            = useState(null);
  const [profilet, setProfilet]        = useState([]);

  const ngarko = () => {
    setNgarkimi(true);
    api.get('/laborator/analizat', { params: { departamenti: depFilter || undefined, kerko: kerko || undefined } })
      .then(r => { setAnalizat(r.data.analizat); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  };

  const ngarkoProfilet = () => {
    api.get('/profilet')
      .then(r => setProfilet(r.data.profilet || []))
      .catch(() => {});
  };

  useEffect(() => { ngarkoProfilet(); }, []);
  useEffect(() => { ngarko(); }, [kerko, depFilter]);

  const hapModal = (analiza = null) => {
    if (analiza) {
      setForma({
        ...FORMA_ZBRAZET,
        kodi:              analiza.kodi || '',
        emri:              analiza.emri || '',
        departamenti:      analiza.departamenti || 'Biokimi',
        profiliId:         analiza.profiliId?._id || analiza.profiliId || '',
        materialBiologjik: analiza.materialBiologjik || 'Gjak venoz',
        cmime:             { ...FORMA_ZBRAZET.cmime, ...analiza.cmime },
        komponente:        (analiza.komponente || []).map(k => ({
          ...KOMP_BOSH, ...k,
          kritikMin: k.kritikMin ?? '',
          kritikMax: k.kritikMax ?? '',
          vlerat:    (k.vlerat || []).map(vl => ({ ...VLERA_BOSH, ...vl, moshaJedesi: vl.moshaJedesi || 'Vjet', komentAuto: vl.komentAuto || '' })),
        })),
        shenime:           analiza.shenime || '',
      });
      setEditId(analiza._id);
    } else {
      setForma({ ...FORMA_ZBRAZET });
      setEditId(null);
    }
    setModalHapur(true);
  };

  const ruaj = async () => {
    if (!forma.kodi || !forma.emri || !forma.departamenti) return toast.error('Ploteso: Kodi, Emri, Departamenti');
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
      toast.error(e.response?.data?.mesazh || 'Gabim');
    }
    setDukeRuajtur(false);
  };

  const fshi = async (id) => {
    if (!confirm('caktivizon kete analize?')) return;
    await api.delete(`/laborator/analizat/${id}`);
    toast.success('Analiza u caktivizua');
    ngarko();
  };

  /* helpers · komponente */
  const setKomp  = (i, f, v) => setForma(p => { const a = [...p.komponente]; a[i] = { ...a[i], [f]: v }; return { ...p, komponente: a }; });
  const shtoKomp = ()        => setForma(p => ({ ...p, komponente: [...p.komponente, { ...KOMP_BOSH }] }));
  const hiqKomp  = (i)       => setForma(p => ({ ...p, komponente: p.komponente.filter((_, x) => x !== i) }));

  /* helpers · vlerat brenda komponentit */
  const setKompVlera = (ki, vi, f, v) => setForma(p => {
    const a = [...p.komponente];
    const vl = [...(a[ki].vlerat || [])];
    vl[vi] = { ...vl[vi], [f]: v };
    a[ki] = { ...a[ki], vlerat: vl };
    return { ...p, komponente: a };
  });
  const shtoKompVlera = (ki) => setForma(p => {
    const isPCR = p.departamenti === 'PCR';
    if ((p.komponente[ki].vlerat || []).length >= (isPCR ? 3 : 20)) return p;
    const a = [...p.komponente];
    const bosh = isPCR ? { ...VLERA_PCR_BOSH } : { ...VLERA_BOSH };
    a[ki] = { ...a[ki], vlerat: [...(a[ki].vlerat || []), bosh] };
    return { ...p, komponente: a };
  });
  const hiqKompVlera = (ki, vi) => setForma(p => {
    const a = [...p.komponente];
    a[ki] = { ...a[ki], vlerat: a[ki].vlerat.filter((_, x) => x !== vi) };
    return { ...p, komponente: a };
  });

  const set     = (f, v) => setForma(p => ({ ...p, [f]: v }));
  const setCmim = (f, v) => setForma(p => ({ ...p, cmime: { ...p.cmime, [f]: Number(v) } }));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Katalogu i Analizave</h2>
        <button onClick={() => hapModal()} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Shto Analize
        </button>
      </div>

      {/* Filtra */}
      <div className="card mb-4 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 text-sm" placeholder="Kerko analize..."
              value={kerko} onChange={e => setKerko(e.target.value)} />
          </div>
          <label className="text-sm text-gray-500 whitespace-nowrap">Departamenti:</label>
          <select className="input max-w-xs text-sm" value={depFilter} onChange={e => setDepFilter(e.target.value)}>
            <option value="">Te gjitha</option>
            {DEPARTAMENTET.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Grid kartash */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {ngarkimi ? (
          [...Array(6)].map((_, i) => <div key={i} className="card p-5 h-40 animate-pulse bg-gray-50" />)
        ) : analizat.length === 0 ? (
          <div className="col-span-3 card text-center py-16 text-gray-400">Asnje analize · shto te paren!</div>
        ) : analizat.map(a => {
          const color = DEP_COLORS[a.departamenti] || '#6B7280';
          return (
            <div key={a._id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '20' }}>
                    <FlaskConical size={17} style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm leading-tight">{a.emri}</h3>
                    <span className="text-xs text-gray-500 font-mono">{a.kodi}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => hapModal(a)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => fshi(a._id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="mt-3 flex gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Pacient</div>
                  <div className="font-bold text-gray-800">{a.cmime?.pacient?.toLocaleString()} EUR</div>
                </div>
                {a.cmime?.bashkpuntor > 0 && (
                  <div>
                    <div className="text-xs text-gray-500">Bashkpuntor</div>
                    <div className="font-bold text-emerald-700">{a.cmime?.bashkpuntor?.toLocaleString()} EUR</div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: color + '18', color }}>{a.departamenti}</span>
                {a.materialBiologjik && <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">{a.materialBiologjik}</span>}
                {a.profiliId && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{a.profiliId?.emri || 'Profil'}</span>}
                {a.komponente?.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{a.komponente.length} komp.</span>}
              </div>

              {a.komponente?.length > 0 && (
                <div className="mt-1.5 text-xs text-gray-400">
                  {a.komponente.slice(0, 4).map(k => k.emri || '·').join(', ')}
                  {a.komponente.length > 4 && ` +${a.komponente.length - 4}`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ??????????????????????????????????????????????
          MODAL
      ?????????????????????????????????????????????? */}
      {modalHapur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Titulli */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-base">{editId ? 'Edito Analizen' : 'Analize e Re'}</h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs font-bold" style={{ color: DEP_COLORS[forma.departamenti] }}>•</span>
                  <select
                    className="text-xs font-medium border-0 p-0 bg-transparent focus:outline-none cursor-pointer"
                    style={{ color: DEP_COLORS[forma.departamenti] }}
                    value={forma.departamenti}
                    onChange={e => set('departamenti', e.target.value)}>
                    {DEPARTAMENTET.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setModalHapur(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5">

              {/* ?? 1: Kodi + Emri ?? */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Kodi <span className="text-red-400">*</span></label>
                  <input className="input font-mono uppercase tracking-widest" value={forma.kodi}
                    onChange={e => set('kodi', e.target.value.toUpperCase())} placeholder="BIO001" />
                </div>
                <div>
                  <label className="label">Emri i Analizes <span className="text-red-400">*</span></label>
                  <input className="input" value={forma.emri}
                    onChange={e => set('emri', e.target.value)} placeholder="p.sh. Vitamina D · Hemogram i Plote" />
                </div>
              </div>

              {/* ?? 2: Mostra ?? */}
              <div>
                <label className="label">Mostra (Lloji Mostres)</label>
                <input className="input" list="llojet-mostres-list"
                  value={forma.materialBiologjik}
                  onChange={e => set('materialBiologjik', e.target.value)}
                  placeholder="p.sh. Gjak venoz, Serum, Urine..." />
                <datalist id="llojet-mostres-list">
                  {LLOJET_MOSTRES.map(l => <option key={l} value={l} />)}
                </datalist>
              </div>

              {/* ?? 4: cmimet ?? */}
              <div>
                <label className="label">cmimet</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Cmimi Pacient (EUR)</p>
                    <input type="number" className="input bg-white text-base font-semibold"
                      value={forma.cmime.pacient} onChange={e => setCmim('pacient', e.target.value)} placeholder="0" />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Cmimi Bashkpuntor (EUR)</p>
                    <input type="number" className="input bg-white text-base font-semibold"
                      value={forma.cmime.bashkpuntor} onChange={e => setCmim('bashkpuntor', e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* ?? 4: Profili (opsionale) ?? */}
              <div>
                <label className="label">I caktuar profilit <span className="text-xs text-gray-400 font-normal">(opsionale)</span></label>
                <select className="input" value={forma.profiliId} onChange={e => set('profiliId', e.target.value)}>
                  <option value="">— Pa profil (Individuale) ·</option>
                  {profilet.map(p => (
                    <option key={p._id} value={p._id}>{p.emri} · {p.departamenti}</option>
                  ))}
                </select>
                {profilet.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Nuk ka profile · krijo fillimisht nga faqja "Profilet e Analizave"</p>
                )}
              </div>

              {/* ?? 6: Komponente ?? */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="label mb-0">
                      {forma.departamenti === 'PCR' ? 'Komponente & Rezultatet e Mundshme' : 'Vlerat Referente (Komponente)'}
                    </label>
                    <p className="text-xs text-gray-400">
                      {forma.departamenti === 'PCR'
                        ? 'Emri · Rezultatet (Pozitiv/Negativ/...) · Koment automatik'
                        : 'Emri · Njesia · Kritik Min/Max · Intervalet referente'}
                    </p>
                  </div>
                  <button onClick={shtoKomp} className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0 ml-3">
                    <Plus size={12} /> Shto
                  </button>
                </div>

                {forma.komponente.length === 0 ? (
                  <button onClick={shtoKomp} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary hover:text-primary transition-colors">
                    + Shto {forma.departamenti === 'PCR' ? 'komponent' : 'vlera referente'} (opsionale)
                  </button>
                ) : (
                  <div className="space-y-3">
                    {forma.komponente.map((k, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 relative">
                        <button onClick={() => hiqKomp(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400"><X size={12} /></button>

                        {forma.departamenti === 'PCR' ? (
                          /* ── PCR: vetem emri i komponentit ── */
                          <div className="pr-5">
                            <label className="label text-xs">Emri Komponentit</label>
                            <input className="input text-xs font-semibold" value={k.emri}
                              onChange={e => setKomp(i, 'emri', e.target.value)} placeholder="p.sh. SARS-CoV-2, HBsAg" />
                          </div>
                        ) : (
                          /* ── Biokimi/Mikrobiologji: emri, njesia, kritikMin/Max ── */
                          <div className="grid grid-cols-12 gap-2 pr-5">
                            <div className="col-span-4">
                              <label className="label text-xs">Komponenti</label>
                              <input className="input text-xs font-semibold" value={k.emri}
                                onChange={e => setKomp(i, 'emri', e.target.value)} placeholder="p.sh. WBC, Glukoza" />
                            </div>
                            <div className="col-span-2">
                              <label className="label text-xs">Njesia</label>
                              <input className="input text-xs" value={k.njesia}
                                onChange={e => setKomp(i, 'njesia', e.target.value)} placeholder="mg/dL" />
                            </div>
                            <div className="col-span-3">
                              <label className="label text-xs">Kritik Min</label>
                              <input type="number" className="input text-xs" value={k.kritikMin}
                                onChange={e => setKomp(i, 'kritikMin', e.target.value)} placeholder="kufiri i poshtem" />
                            </div>
                            <div className="col-span-3">
                              <label className="label text-xs">Kritik Max</label>
                              <input type="number" className="input text-xs" value={k.kritikMax}
                                onChange={e => setKomp(i, 'kritikMax', e.target.value)} placeholder="kufiri i siperm" />
                            </div>
                          </div>
                        )}

                        {/* Vlerat / Rezultatet */}
                        <div className="space-y-1.5">
                          {(k.vlerat || []).map((vl, vi) => (
                            <div key={vi} className={`flex gap-2 items-start pl-3 border-l-2 ${forma.departamenti === 'PCR' ? 'border-purple-200' : 'border-gray-200'}`}>
                              {forma.departamenti === 'PCR' ? (
                                /* ── PCR: rezultat tekst + koment automatik ── */
                                <div className="flex-1 space-y-1">
                                  <div className="flex gap-2 items-center">
                                    <input className="input text-xs w-32 font-semibold" value={vl.vleraTekst || ''}
                                      onChange={e => setKompVlera(i, vi, 'vleraTekst', e.target.value)}
                                      placeholder="Rezultati (p.sh. Pozitiv)" />
                                    <input className="input text-xs flex-1" value={vl.komentAuto || ''}
                                      onChange={e => setKompVlera(i, vi, 'komentAuto', e.target.value)}
                                      placeholder="Koment automatik (opsionale)..." />
                                    <button onClick={() => hiqKompVlera(i, vi)} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={10} /></button>
                                  </div>
                                </div>
                              ) : (
                                /* ── Biokimi: etiketa, gjinia, mosha+jedesi, operatori, vlerat ── */
                                <div className="flex-1 space-y-1">
                                  {/* Rreshti 1: etiketa + gjinia + mosha nga–deri + njesia */}
                                  <div className="flex gap-1.5 items-center flex-wrap">
                                    <input className="input text-xs w-24" value={vl.etiketa || ''}
                                      onChange={e => setKompVlera(i, vi, 'etiketa', e.target.value)} placeholder="Etiketa" />
                                    {/* Gjinia */}
                                    <select className="input text-xs w-20" value={vl.gjinia || 'Te dyja'}
                                      onChange={e => setKompVlera(i, vi, 'gjinia', e.target.value)}>
                                      <option value="Te dyja">Të dyja</option>
                                      <option value="M">Mashkull</option>
                                      <option value="F">Femër</option>
                                    </select>
                                    {/* Mosha nga → deri */}
                                    <input type="number" min="0" className="input text-xs w-14" value={vl.moshaMin ?? ''}
                                      onChange={e => setKompVlera(i, vi, 'moshaMin', e.target.value)} placeholder="Nga" />
                                    <span className="text-gray-400 text-xs">–</span>
                                    <input type="number" min="0" className="input text-xs w-14" value={vl.moshaMax ?? ''}
                                      onChange={e => setKompVlera(i, vi, 'moshaMax', e.target.value)} placeholder="Deri" />
                                    {/* Njesia e moshes — kritike per neonatale */}
                                    <select className="input text-xs w-20" value={vl.moshaJedesi || 'Vjet'}
                                      onChange={e => setKompVlera(i, vi, 'moshaJedesi', e.target.value)}
                                      title="Njësia e moshës">
                                      <option value="Dite">Ditë</option>
                                      <option value="Muaj">Muaj</option>
                                      <option value="Vjet">Vjet</option>
                                    </select>
                                  </div>
                                  {/* Rreshti 2: operatori + vlerat referente */}
                                  <div className="flex gap-1.5 items-center">
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
                                          onChange={e => setKompVlera(i, vi, 'vleraMin', e.target.value)} placeholder="Min" />
                                        <span className="text-gray-400 text-xs">·</span>
                                        <input type="number" className="input text-xs w-20" value={vl.vleraMax || ''}
                                          onChange={e => setKompVlera(i, vi, 'vleraMax', e.target.value)} placeholder="Max" />
                                      </>
                                    ) : vl.operatori === 'tekst' ? (
                                      <input className="input text-xs w-28" value={vl.vleraTekst || ''}
                                        onChange={e => setKompVlera(i, vi, 'vleraTekst', e.target.value)} placeholder="Tekst" />
                                    ) : (
                                      <>
                                        <span className="text-xs font-semibold text-gray-400 w-4 flex-shrink-0">
                                          {operatorSimbol(vl.operatori)}
                                        </span>
                                        <input type="number" className="input text-xs w-20" value={vl.vleraMin || ''}
                                          onChange={e => setKompVlera(i, vi, 'vleraMin', e.target.value)} placeholder="Vlera" />
                                      </>
                                    )}
                                    <button onClick={() => hiqKompVlera(i, vi)} className="text-gray-300 hover:text-red-400 ml-auto flex-shrink-0"><X size={10} /></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Shto interval/rezultat */}
                        {(k.vlerat || []).length < (forma.departamenti === 'PCR' ? 3 : 20) && (
                          <button onClick={() => shtoKompVlera(i)}
                            className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 pl-1 transition-colors">
                            <Plus size={10} /> {forma.departamenti === 'PCR' ? 'Shto rezultat' : 'Shto interval referent'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ?? 6: Shenime ?? */}
              <div>
                <label className="label">Shenime</label>
                <textarea className="input resize-none h-16" value={forma.shenime}
                  onChange={e => set('shenime', e.target.value)} placeholder="Shenime shtese..." />
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end pt-3 border-t">
                <button onClick={() => setModalHapur(false)} className="btn-ghost">Anulo</button>
                <button onClick={ruaj} disabled={duke_ruajtur} className="btn-primary flex items-center gap-2">
                  <Save size={15} />
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
