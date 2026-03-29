import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, X, ChevronLeft, AlertCircle, FlaskConical,
  Layers, UserCheck, CheckCircle, Printer, ChevronDown, ChevronUp,
  Package, Tag, TrendingDown, Users,
} from 'lucide-react';

const DEPARTAMENTET = ['Biokimi', 'Mikrobiologji', 'PCR'];

export default function KrijoPorosine() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Patient
  const [pacienti, setPacienti]     = useState(null);
  const [kerkoPac, setKerkoPac]     = useState('');
  const [sugjerimet, setSugjerimet] = useState([]);

  // Right column state
  const [departamenti, setDepartamenti] = useState('Biokimi');
  const [subTab, setSubTab]             = useState('profilet'); // 'profilet' | 'te_gjitha'
  const [analizat, setAnalizat]         = useState([]);
  const [profilet, setProfilet]         = useState([]);
  const [hapurProfilet, setHapurProfilet] = useState(new Set());
  const [kerkoAn, setKerkoAn]           = useState('');

  // Paketat
  const [paketat, setPaketat]           = useState([]);
  const [pakjaZgjedhur, setPakjaZgjedhur] = useState(null); // { _id, emri, cmimiPromocional }
  const [kerkoPako, setKerkoPako]       = useState('');

  // Selection · always individual analyses
  const [selektuara, setSelektuara] = useState([]);

  // Order options
  const [tipi, setTipi]       = useState('pacient');
  const [urgente, setUrgente] = useState(false);
  const [shenime, setShenime] = useState('');

  // Referues
  const [referuesit, setReferuesit] = useState([]);
  const [tipRef, setTipRef]         = useState('');
  const [referuesId, setReferuesId] = useState('');

  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [porosiKrijuar, setPorosiKrijuar] = useState(null);

  const timerRef = useRef(null);

  // Load referuesit — para-zgjidh defaultin (Vete Ardhur) automatikisht
  useEffect(() => {
    api.get('/referuesit').then(r => {
      const lista = r.data.data || [];
      setReferuesit(lista);
      const def = lista.find(r => r.eshteDefault);
      if (def) setReferuesId(def._id);
    }).catch(() => {});
  }, []);

  // Load all profiles once
  useEffect(() => {
    api.get('/profilet')
      .then(r => setProfilet(r.data.profilet || []))
      .catch(() => {});
  }, []);

  // Load active packages once
  useEffect(() => {
    api.get('/paketat', { params: { aktiv: 'true' } })
      .then(r => setPaketat(r.data.paketat || []))
      .catch(() => {});
  }, []);

  // If navigated from patient page
  useEffect(() => {
    const pid = params.get('pacientiId');
    if (pid) api.get(`/pacientet/${pid}`).then(r => setPacienti(r.data.pacienti)).catch(() => {});
  }, []);

  // Load analyses when department changes
  useEffect(() => {
    api.get('/laborator/analizat', { params: { departamenti, aktiv: 'true' } })
      .then(r => setAnalizat(r.data.analizat))
      .catch(() => {});
    setKerkoAn('');
  }, [departamenti]);

  // Patient search debounce
  useEffect(() => {
    if (!kerkoPac || kerkoPac.length < 2) { setSugjerimet([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.get('/pacientet/kerko', { params: { q: kerkoPac } })
        .then(r => setSugjerimet(r.data.pacientet))
        .catch(() => {});
    }, 300);
  }, [kerkoPac]);

  // Profiles filtered to those with analyses in selected department
  const profiletNeDep = profilet
    .map(p => ({
      ...p,
      analizatNeDep: (p.analizatProfil || []).filter(a => a.departamenti === departamenti),
    }))
    .filter(p => p.analizatNeDep.length > 0);

  const zgjidhAnalizen = (a) =>
    setSelektuara(p => p.find(x => x._id === a._id) ? p.filter(x => x._id !== a._id) : [...p, a]);

  const toggleProfil = (id) =>
    setHapurProfilet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const zgjidhTeGjithaProfilit = (analizat) =>
    setSelektuara(prev => {
      const teGjithaSelektuara = analizat.every(a => prev.find(x => x._id === a._id));
      if (teGjithaSelektuara) return prev.filter(x => !analizat.find(a => a._id === x._id));
      const newOnes = analizat.filter(a => !prev.find(x => x._id === a._id));
      return [...prev, ...newOnes];
    });

  // Analyses filtered by search (Te gjitha tab)
  const analizatFiltruara = kerkoAn.trim().length < 2
    ? analizat
    : analizat.filter(a =>
        a.emri.toLowerCase().includes(kerkoAn.toLowerCase()) ||
        (a.kodi || '').toLowerCase().includes(kerkoAn.toLowerCase())
      );

  // "Vete Ardhur" gjithmone i pari, te tjeret filtrohen sipas tipit
  const referuesitFiltrar = (tipRef
    ? referuesit.filter(r => r.eshteDefault || r.tipi === tipRef)
    : referuesit
  ).sort((a, b) => (b.eshteDefault ? 1 : 0) - (a.eshteDefault ? 1 : 0));
  const refZgjedhur = referuesit.find(r => r._id === referuesId);

  const totalCmimiIndiv = selektuara.reduce((s, a) =>
    s + ((tipi === 'bashkpuntor' ? a.cmime?.bashkpuntor : a.cmime?.pacient) || 0), 0);
  const totalCmimi = pakjaZgjedhur ? pakjaZgjedhur.cmimiPromocional : totalCmimiIndiv;

  const zgjidhPakon = (pako) => {
    // Grumbull te gjitha analizat nga pako
    const analizatPako = (pako.analizat || [])
      .map(e => e.analiza)
      .filter(Boolean);
    setSelektuara(analizatPako);
    setPakjaZgjedhur({ _id: pako._id, emri: pako.emri, cmimiPromocional: pako.cmimiPromocional });
  };

  const hiqPakon = () => {
    setPakjaZgjedhur(null);
    setSelektuara([]);
  };

  const pakotatFiltruara = kerkoPako.trim().length < 1 ? paketat
    : paketat.filter(p => p.emri.toLowerCase().includes(kerkoPako.toLowerCase()));

  const dergo = async () => {
    if (!pacienti) return toast.error('Zgjidh nje pacient!');
    if (!selektuara.length) return toast.error('Zgjidh te pakten nje analize!');
    setDukeRuajtur(true);
    try {
      // Group selected analyses by department
      const sipasDeprt = {};
      selektuara.forEach(a => {
        const dep = a.departamenti;
        if (!sipasDeprt[dep]) sipasDeprt[dep] = [];
        sipasDeprt[dep].push(a);
      });

      // Unique session ID to link all orders from this registration
      const seancaId = Date.now().toString(36) + Math.random().toString(36).slice(2);

      // Create one order per department
      const porosite = [];
      for (const [dep, analizatDep] of Object.entries(sipasDeprt)) {
        // Nese pako eshte zgjedhur, apliko çmimin promo vetem per porosi e pare
        const eshtePorosaEPare = porosite.length === 0;
        const r = await api.post('/laborator/porosi', {
          pacientiId:    pacienti._id,
          analizatIds:   analizatDep.map(a => a._id),
          profiletIds:   [],
          departamenti:  dep,
          tipiPacientit: tipi,
          urgente,
          shenime,
          referuesId:    referuesId || undefined,
          seancaId,
          ...(pakjaZgjedhur && eshtePorosaEPare
            ? { pakoId: pakjaZgjedhur._id, cmimiPako: pakjaZgjedhur.cmimiPromocional }
            : pakjaZgjedhur
            ? { pakoId: pakjaZgjedhur._id, cmimiPako: 0 }
            : {}),
        });
        porosite.push({ porosi: r.data.porosi, fatura: r.data.fatura });
      }

      // Open work sheet for first order — FletaPunuese will load all depts via seancaId
      if (porosite.length > 0) {
        window.open(`/laboratori/fleta-punuese/${porosite[0].porosi._id}`, '_blank');
      }

      setPorosiKrijuar({
        porosite,
        numrPorosi:  porosite.map(p => p.porosi.numrPorosi).join(' · '),
        numrFatures: porosite.map(p => p.fatura?.numrFatures).filter(Boolean).join(' · '),
      });
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim');
    }
    setDukeRuajtur(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Page title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ChevronLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Porosi e Re Laboratorike</h1>
          <p className="text-gray-500 text-sm">Zgjidh analizat sipas departamentit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Left: Patient + Options */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Users size={16} className="text-primary"/> Pacienti</h3>

          {pacienti ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">
                {pacienti.emri[0]}{pacienti.mbiemri[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{pacienti.emri} {pacienti.mbiemri}</p>
                <p className="text-xs text-gray-400">NID: {pacienti.numrPersonal} · Tel: {pacienti.telefoni}</p>
              </div>
              <button onClick={() => { setPacienti(null); setKerkoPac(''); }} className="text-gray-400 hover:text-red-400">
                <X size={16}/>
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" placeholder="Kerko pacient sipas emrit, NID..."
                value={kerkoPac} onChange={e => setKerkoPac(e.target.value)} autoFocus/>
              {sugjerimet.length > 0 && (
                <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {sugjerimet.map(p => (
                    <button key={p._id} onClick={() => { setPacienti(p); setSugjerimet([]); setKerkoPac(''); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-0">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                        {p.emri[0]}{p.mbiemri[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.emri} {p.mbiemri}</p>
                        <p className="text-xs text-gray-400">{p.numrPersonal} · {p.telefoni}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tipi Pacientit */}
          <div>
            <label className="label">Tipi Pacientit</label>
            <div className="grid grid-cols-2 gap-2">
              {[['pacient','Pacient'],['bashkpuntor','Bashkpuntor']].map(([v, l]) => (
                <button key={v} onClick={() => setTipi(v)}
                  className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${tipi === v ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Referues */}
          <div>
            <label className="label flex items-center gap-1.5">
              <UserCheck size={13} className="text-gray-400"/> Referuar nga
            </label>
            <div className="flex gap-1.5 mb-2">
              {[{ k: '', v: 'Te gjithe' }, { k: 'Doktor', v: 'Doktor' }, { k: 'Bashkpuntor', v: 'Bashkpuntor' }].map(t => (
                <button key={t.k} type="button"
                  onClick={() => { setTipRef(t.k); setReferuesId(''); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    tipRef === t.k ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}>
                  {t.v}
                </button>
              ))}
            </div>
            <select className="input text-sm" value={referuesId} onChange={e => setReferuesId(e.target.value)}>
              {tipRef && <option value="">— Zgjidh {tipRef} —</option>}
              {referuesitFiltrar.map(r => (
                <option key={r._id} value={r._id}>
                  {r.eshteDefault
                    ? `⬦ Vetë Ardhur (V/A)`
                    : `${r.mbiemri} ${r.emri}${r.specialiteti ? ` · ${r.specialiteti}` : ''} [${r.tipi}]`}
                </option>
              ))}
            </select>
            {refZgjedhur && (
              <div className={`mt-1.5 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs border ${
                refZgjedhur.eshteDefault
                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : 'bg-blue-50 border-blue-100 text-blue-700'
              }`}>
                <UserCheck size={12}/>
                {refZgjedhur.eshteDefault ? (
                  <span className="italic">Vetë Ardhur — pa referues specifik</span>
                ) : (
                  <>
                    <span className="font-medium">{refZgjedhur.mbiemri} {refZgjedhur.emri}</span>
                    {refZgjedhur.specialiteti && <span className="opacity-60">· {refZgjedhur.specialiteti}</span>}
                    <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${refZgjedhur.tipi === 'Doktor' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'}`}>
                      {refZgjedhur.tipi}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Urgente */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={urgente} onChange={e => setUrgente(e.target.checked)} className="w-4 h-4 rounded"/>
            <span className="text-sm font-medium text-red-600 flex items-center gap-1">
              <AlertCircle size={15}/> Urgjente
            </span>
          </label>

          <div>
            <label className="label">Shenime</label>
            <textarea className="input resize-none h-16" value={shenime}
              onChange={e => setShenime(e.target.value)} placeholder="Shenime shtese..."/>
          </div>

          {/* Selected analyses summary */}
          {selektuara.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Te zgjedhura ({selektuara.length}):
              </p>
              {selektuara.map(a => (
                <div key={a._id} className="flex items-center gap-2 text-sm">
                  <FlaskConical size={13} className="text-primary flex-shrink-0"/>
                  <span className="text-gray-700 flex-1 truncate">{a.emri}</span>
                  {a.cmime?.pacient > 0 && (
                    <span className="text-xs text-primary font-semibold flex-shrink-0">
                      {a.cmime.pacient}€
                    </span>
                  )}
                  <button onClick={() => zgjidhAnalizen(a)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                    <X size={12}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ?? Right: Department tabs + Sub-tabs ?? */}
        <div className="card space-y-3">

          {/* Department tabs · horizontal scroll on small screens */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {DEPARTAMENTET.map(d => (
              <button key={d}
                onClick={() => setDepartamenti(d)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  departamenti === d
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {d}
              </button>
            ))}
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setSubTab('profilet')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                subTab === 'profilet' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Layers size={14}/> Profilet
            </button>
            <button onClick={() => setSubTab('te_gjitha')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                subTab === 'te_gjitha' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <FlaskConical size={14}/> Te gjitha
            </button>
            <button onClick={() => setSubTab('paketat')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                subTab === 'paketat' ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Package size={14}/> Paketat
              {paketat.length > 0 && (
                <span className="ml-0.5 text-[10px] bg-violet-100 text-violet-600 rounded-full px-1.5 font-semibold">{paketat.length}</span>
              )}
            </button>
          </div>

          {/* ??? Sub-tab: Profilet ??? */}
          {subTab === 'profilet' && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {profiletNeDep.length === 0 ? (
                <div className="text-center py-8">
                  <Layers size={32} className="mx-auto text-gray-300 mb-2"/>
                  <p className="text-gray-400 text-sm">Asnje profil per {departamenti}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Shko te "Regjistro Profilet" per te krijuar profile
                  </p>
                </div>
              ) : profiletNeDep.map(p => {
                const hapur = hapurProfilet.has(p._id);
                const nrSel = p.analizatNeDep.filter(a => selektuara.find(s => s._id === a._id)).length;
                return (
                  <div key={p._id} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Profile header */}
                    <button
                      onClick={() => toggleProfil(p._id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      <Layers size={15} className="text-primary flex-shrink-0"/>
                      <span className="flex-1 font-medium text-gray-800 text-sm">{p.emri}</span>
                      {nrSel > 0 && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">
                          {nrSel}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{p.analizatNeDep.length} analiza</span>
                      {(() => {
                        const teGjitha = p.analizatNeDep.length > 0 && p.analizatNeDep.every(a => selektuara.find(s => s._id === a._id));
                        return (
                          <span
                            onClick={e => { e.stopPropagation(); zgjidhTeGjithaProfilit(p.analizatNeDep); }}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0 ${teGjitha ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                            {teGjitha ? '− të gjitha' : '+ të gjitha'}
                          </span>
                        );
                      })()}
                      {hapur ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
                    </button>

                    {/* Analyses inside profile */}
                    {hapur && (
                      <div className="border-t border-gray-100 divide-y divide-gray-50">
                        {p.analizatNeDep.map(a => {
                          const zgjedhur = !!selektuara.find(s => s._id === a._id);
                          const cmimi = tipi === 'bashkpuntor' ? a.cmime?.bashkpuntor : a.cmime?.pacient;
                          return (
                            <button key={a._id} onClick={() => zgjidhAnalizen(a)}
                              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                                zgjedhur ? 'bg-primary/5' : 'hover:bg-gray-50'
                              }`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                zgjedhur ? 'border-primary bg-primary' : 'border-gray-300'
                              }`}>
                                {zgjedhur && <span className="text-white text-xs leading-none">✓</span>}
                              </div>
                              <span className="flex-1 text-sm text-gray-700">{a.emri}</span>
                              {cmimi != null && (
                                <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">
                                  {cmimi.toLocaleString()} EUR
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ??? Sub-tab: Te gjitha ??? */}
          {subTab === 'te_gjitha' && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-8 py-1.5 text-sm"
                  placeholder="Kerko analize sipas emrit ose kodit..."
                  value={kerkoAn} onChange={e => setKerkoAn(e.target.value)}/>
                {kerkoAn && (
                  <button onClick={() => setKerkoAn('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X size={12}/>
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {analizatFiltruara.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">
                    {kerkoAn
                      ? `Asnje rezultat per "${kerkoAn}"`
                      : `Asnje analize per ${departamenti}`}
                  </p>
                ) : analizatFiltruara.map(a => {
                  const zgjedhur = !!selektuara.find(s => s._id === a._id);
                  const cmimi = tipi === 'bashkpuntor' ? a.cmime?.bashkpuntor : a.cmime?.pacient;
                  return (
                    <button key={a._id} onClick={() => zgjidhAnalizen(a)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                        zgjedhur ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                        zgjedhur ? 'border-primary bg-primary' : 'border-gray-300'
                      }`}>
                        {zgjedhur && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{a.emri}</p>
                        <p className="text-xs text-gray-400">{a.kodi}</p>
                      </div>
                      {cmimi != null && (
                        <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
                          {cmimi.toLocaleString()} EUR
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {kerkoAn.trim().length >= 2 && (
                <p className="text-xs text-gray-400 text-center">
                  {analizatFiltruara.length} rezultat{analizatFiltruara.length !== 1 ? 'e' : ''}
                </p>
              )}
            </>
          )}

          {/* ─── Sub-tab: Paketat ─── */}
          {subTab === 'paketat' && (
            <div className="space-y-2">
              {/* Banner nese pako eshte zgjedhur */}
              {pakjaZgjedhur && (
                <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5">
                  <Package size={15} className="text-violet-500 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-violet-700">{pakjaZgjedhur.emri}</p>
                    <p className="text-xs text-violet-500">Çmimi pako: {pakjaZgjedhur.cmimiPromocional} EUR</p>
                  </div>
                  <button onClick={hiqPakon} className="text-violet-400 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={14}/>
                  </button>
                </div>
              )}

              {/* Kerko pako */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input className="input pl-8 py-1.5 text-sm"
                  placeholder="Kerko pakon..."
                  value={kerkoPako} onChange={e => setKerkoPako(e.target.value)}/>
                {kerkoPako && (
                  <button onClick={() => setKerkoPako('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X size={12}/>
                  </button>
                )}
              </div>

              {/* Lista paketave */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {pakotatFiltruara.length === 0 ? (
                  <div className="text-center py-10">
                    <Package size={32} className="mx-auto text-gray-300 mb-2"/>
                    <p className="text-gray-400 text-sm">
                      {paketat.length === 0 ? 'Nuk ka pako te krijuara' : `Asnje pako per "${kerkoPako}"`}
                    </p>
                    {paketat.length === 0 && (
                      <p className="text-gray-400 text-xs mt-1">Shko te "Paketat e Analizave" per te krijuar pako</p>
                    )}
                  </div>
                ) : pakotatFiltruara.map(pako => {
                  const zgjedhur = pakjaZgjedhur?._id === pako._id;
                  const totalInd = (pako.analizat || []).reduce((s, e) => s + (e.analiza?.cmime?.pacient || 0), 0);
                  const kursimPako = totalInd - pako.cmimiPromocional;
                  const nrAn = (pako.analizat || []).length;

                  return (
                    <button key={pako._id}
                      onClick={() => zgjedhur ? hiqPakon() : zgjidhPakon(pako)}
                      className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                        zgjedhur
                          ? 'border-violet-400 bg-violet-50'
                          : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/30 bg-white'
                      }`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${zgjedhur ? 'bg-violet-200' : 'bg-violet-100'}`}>
                          <Package size={14} className="text-violet-600"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm ${zgjedhur ? 'text-violet-700' : 'text-gray-800'}`}>{pako.emri}</p>
                          {pako.pershkrim && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{pako.pershkrim}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-400">{nrAn} analiza</span>
                            {totalInd > 0 && (
                              <span className="text-xs text-gray-400 line-through">{totalInd} EUR</span>
                            )}
                            {kursimPako > 0 && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                <TrendingDown size={9}/> -{Math.round((kursimPako/totalInd)*100)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-base font-bold ${zgjedhur ? 'text-violet-600' : 'text-gray-700'}`}>
                            {pako.cmimiPromocional} EUR
                          </p>
                          {kursimPako > 0 && (
                            <p className="text-xs text-green-600">-{kursimPako} EUR</p>
                          )}
                        </div>
                      </div>
                      {/* Mini lista analizave */}
                      {zgjedhur && (
                        <div className="mt-2 pt-2 border-t border-violet-200 flex flex-wrap gap-1">
                          {(pako.analizat || []).slice(0, 6).map((e, i) => (
                            <span key={i} className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">
                              {e.analiza?.emri || '—'}
                            </span>
                          ))}
                          {nrAn > 6 && (
                            <span className="text-xs text-violet-400">+{nrAn - 6} te tjera</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success modal */}
      {porosiKrijuar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex justify-end pt-3 pr-3">
              <button onClick={() => setPorosiKrijuar(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Mbyll">
                <X size={18}/>
              </button>
            </div>
            <div className="px-6 pb-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={34} className="text-green-600"/>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">
                {porosiKrijuar.porosite?.length > 1 ? `${porosiKrijuar.porosite.length} Porosi u Krijuan!` : 'Porosi u Krijua!'}
              </h2>
              {porosiKrijuar.porosite?.length > 1 && (
                <p className="text-xs text-gray-400 mb-3">Porosi te ndara per cdo departament</p>
              )}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-2">
                {porosiKrijuar.porosite?.map(({ porosi: p, fatura: f }) => (
                  <div key={p._id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{p.departamenti}</span>
                    <span className="font-bold text-gray-800 font-mono text-sm">{p.numrPorosi}</span>
                  </div>
                ))}
                {porosiKrijuar.numrFatures && (
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">Faturat:</span>
                    <span className="font-mono text-xs text-gray-600">{porosiKrijuar.numrFatures}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-5 flex items-center justify-center gap-1.5">
                <Printer size={12}/> Fletat punuese u hapën automatikisht
              </p>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => porosiKrijuar.porosite?.forEach(({ porosi: p }) => window.open(`/laboratori/fleta-punuese/${p._id}`, '_blank'))}
                  className="flex-1 flex items-center justify-center gap-1.5 btn-ghost text-sm">
                  <Printer size={14}/> Shtyp Serisht
                </button>
                <button
                  onClick={() => navigate('/laboratori/departamentet')}
                  className="flex-1 btn-primary text-sm">
                  Departamentet →
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 btn-ghost text-sm">
                  Mbyll
                </button>
                <button
                  onClick={() => navigate('/pagesat')}
                  className="flex-1 btn-ghost text-sm">
                  Pagesa →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="card bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            {refZgjedhur && (
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <UserCheck size={11}/>
                Referuar: <span className="font-medium text-gray-600 ml-1">{refZgjedhur.mbiemri} {refZgjedhur.emri}</span>
              </p>
            )}
            {pakjaZgjedhur ? (
              <>
                <p className="text-sm font-bold text-violet-600 flex items-center gap-1.5">
                  <Package size={14}/> {pakjaZgjedhur.emri}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  {selektuara.length} analiza ·
                  <span className="line-through ml-1">{totalCmimiIndiv} EUR</span>
                </p>
                <p className="text-2xl font-bold text-violet-700">{totalCmimi.toLocaleString()} EUR</p>
                <p className="text-xs text-green-600 font-medium">
                  Kursim: {(totalCmimiIndiv - totalCmimi).toFixed(0)} EUR
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  {selektuara.length > 0
                    ? `${selektuara.length} analize${selektuara.length !== 1 ? ' te zgjedhura' : ' e zgjedhur'}`
                    : 'Asnje analize e zgjedhur'}
                </p>
                <p className="text-2xl font-bold text-gray-800">{totalCmimi.toLocaleString()} EUR</p>
                <p className="text-xs text-gray-400">Fatura krijohet automatikisht</p>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(-1)} className="btn-ghost">Anulo</button>
            <button
              onClick={dergo}
              disabled={duke_ruajtur || !pacienti || !selektuara.length}
              className="btn-primary px-8 text-base disabled:opacity-50">
              {duke_ruajtur ? 'Duke krijuar...' : 'Krijo Porosine'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
