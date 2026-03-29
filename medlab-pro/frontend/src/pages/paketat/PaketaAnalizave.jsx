import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, X, Save, Search, Package,
  Tag, ChevronDown, ChevronUp, CheckCircle2, TrendingDown,
  ToggleLeft, ToggleRight, FlaskConical,
} from 'lucide-react';

const FORMA_ZBRAZET = {
  emri: '', pershkrim: '', analizatIds: [], cmimiPromocional: '', shenime: '',
};

export default function PaketaAnalizave() {
  const [paketat, setPaketat]         = useState([]);
  const [analizatTE, setAnalizatTE]   = useState([]); // te gjitha analizat per multi-select
  const [ngarkimi, setNgarkimi]       = useState(false);
  const [modalHapur, setModalHapur]   = useState(false);
  const [forma, setForma]             = useState({ ...FORMA_ZBRAZET });
  const [editId, setEditId]           = useState(null);
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [kerkoAn, setKerkoAn]         = useState('');
  const [hapurPaketat, setHapurPaketat] = useState(new Set());

  const ngarko = () => {
    setNgarkimi(true);
    api.get('/paketat')
      .then(r => { setPaketat(r.data.paketat || []); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  };

  useEffect(() => {
    ngarko();
    // Ngarko te gjitha analizat aktive per multi-select
    Promise.all([
      api.get('/laborator/analizat', { params: { departamenti: 'Biokimi',       aktiv: 'true' } }),
      api.get('/laborator/analizat', { params: { departamenti: 'Mikrobiologji', aktiv: 'true' } }),
      api.get('/laborator/analizat', { params: { departamenti: 'PCR',           aktiv: 'true' } }),
    ]).then(([b, m, p]) => {
      setAnalizatTE([
        ...(b.data.analizat || []),
        ...(m.data.analizat || []),
        ...(p.data.analizat || []),
      ]);
    }).catch(() => {});
  }, []);

  const hapModal = (pako = null) => {
    if (pako) {
      setForma({
        emri:              pako.emri || '',
        pershkrim:         pako.pershkrim || '',
        analizatIds:       (pako.analizat || []).map(a => a.analiza?._id || a.analiza),
        cmimiPromocional:  pako.cmimiPromocional ?? '',
        shenime:           pako.shenime || '',
      });
      setEditId(pako._id);
    } else {
      setForma({ ...FORMA_ZBRAZET });
      setEditId(null);
    }
    setKerkoAn('');
    setModalHapur(true);
  };

  const ruaj = async () => {
    if (!forma.emri.trim()) return toast.error('Emri i pakos eshte i detyreshem');
    if (!forma.analizatIds.length) return toast.error('Shto te pakten nje analize');
    if (forma.cmimiPromocional === '' || isNaN(Number(forma.cmimiPromocional))) return toast.error('Cmimi promocional eshte i detyreshem');
    setDukeRuajtur(true);
    const payload = { ...forma, cmimiPromocional: Number(forma.cmimiPromocional) };
    try {
      if (editId) {
        await api.put(`/paketat/${editId}`, payload);
        toast.success('Pako u perditesua!');
      } else {
        await api.post('/paketat', payload);
        toast.success('Pako u shtua!');
      }
      setModalHapur(false);
      ngarko();
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim gjate ruajtjes');
    }
    setDukeRuajtur(false);
  };

  const fshi = async (id) => {
    if (!confirm('Fshi kete pako?')) return;
    try {
      await api.delete(`/paketat/${id}`);
      toast.success('Pako u fshi');
      ngarko();
    } catch { toast.error('Gabim gjate fshirjes'); }
  };

  const ndryshAktiv = async (pako) => {
    try {
      await api.put(`/paketat/${pako._id}`, { aktiv: !pako.aktiv });
      ngarko();
    } catch { toast.error('Gabim'); }
  };

  const toggleAnalizen = (id) => {
    setForma(p => ({
      ...p,
      analizatIds: p.analizatIds.includes(id)
        ? p.analizatIds.filter(x => x !== id)
        : [...p.analizatIds, id],
    }));
  };

  const togglePako = (id) => setHapurPaketat(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  // Analizat te filtruara per modal
  const analizatFiltruara = useMemo(() => {
    const q = kerkoAn.toLowerCase().trim();
    return q.length < 1 ? analizatTE : analizatTE.filter(a =>
      a.emri.toLowerCase().includes(q) || (a.kodi || '').toLowerCase().includes(q)
    );
  }, [analizatTE, kerkoAn]);

  // Grupuara sipas departamentit per display
  const grupuaraSipasDeprt = useMemo(() => {
    const m = {};
    analizatFiltruara.forEach(a => {
      if (!m[a.departamenti]) m[a.departamenti] = [];
      m[a.departamenti].push(a);
    });
    return m;
  }, [analizatFiltruara]);

  // Llogarit totalin normal per analizat e zgjedhura ne modal
  const totalNormal = useMemo(() => {
    return forma.analizatIds.reduce((s, id) => {
      const a = analizatTE.find(x => x._id === id);
      return s + (a?.cmime?.pacient || 0);
    }, 0);
  }, [forma.analizatIds, analizatTE]);

  const kursimi = totalNormal - Number(forma.cmimiPromocional || 0);

  const DEP_COLORS = { Biokimi: '#3B82F6', Mikrobiologji: '#22C55E', PCR: '#A855F7' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Paketat e Analizave</h1>
          <p className="text-gray-500 text-sm">Krijimi i ofertave promocionale — grupe analizash me cmim te vecante</p>
        </div>
        <button onClick={() => hapModal()} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Pako e Re
        </button>
      </div>

      {/* Lista e paketave */}
      {ngarkimi ? (
        <div className="card p-12 text-center text-gray-400">Duke ngarkuar...</div>
      ) : paketat.length === 0 ? (
        <div className="card p-14 text-center">
          <Package size={44} className="mx-auto text-gray-200 mb-3"/>
          <p className="text-gray-400 font-medium">Nuk ka pako te krijuara</p>
          <p className="text-gray-400 text-sm mt-1">Krijo paketa promocionale si PAKO HORMONALE, CHECK-UP, etj.</p>
          <button onClick={() => hapModal()} className="btn-primary mt-4 text-sm">+ Krijo Pakon e Pare</button>
        </div>
      ) : (
        <div className="space-y-3">
          {paketat.map(pako => {
            const analizatPako = pako.analizat || [];
            const totalInd     = analizatPako.reduce((s, a) => s + (a.analiza?.cmime?.pacient || 0), 0);
            const kursimI      = totalInd - pako.cmimiPromocional;
            const perqind      = totalInd > 0 ? Math.round((kursimI / totalInd) * 100) : 0;
            const zgjeruar     = hapurPaketat.has(pako._id);

            return (
              <div key={pako._id} className={`card p-0 overflow-hidden border-2 transition-colors ${pako.aktiv ? 'border-transparent' : 'border-gray-200 opacity-60'}`}>
                {/* Header bar */}
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* Badge Package */}
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-violet-600"/>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 text-base">{pako.emri}</h3>
                      {!pako.aktiv && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Joaktiv</span>
                      )}
                      {kursimI > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <TrendingDown size={10}/> -{perqind}% kursim
                        </span>
                      )}
                    </div>
                    {pako.pershkrim && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{pako.pershkrim}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{analizatPako.length} analiza</span>
                      {totalInd > 0 && (
                        <span className="line-through">{totalInd.toFixed(0)} EUR</span>
                      )}
                    </div>
                  </div>

                  {/* Cmimi promo */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-violet-600">{pako.cmimiPromocional.toFixed(0)} EUR</p>
                    {kursimI > 0 && (
                      <p className="text-xs text-green-600 font-medium">kurseni {kursimI.toFixed(0)} EUR</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => ndryshAktiv(pako)} title={pako.aktiv ? 'Cmaktivizo' : 'Aktivizo'}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {pako.aktiv
                        ? <ToggleRight size={22} className="text-green-500"/>
                        : <ToggleLeft size={22}/>}
                    </button>
                    <button onClick={() => hapModal(pako)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                      <Edit2 size={15}/>
                    </button>
                    <button onClick={() => fshi(pako._id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15}/>
                    </button>
                    <button onClick={() => togglePako(pako._id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors ml-1">
                      {zgjeruar ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </button>
                  </div>
                </div>

                {/* Expand: lista analizave */}
                {zgjeruar && (
                  <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Analizat e perfshira</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {analizatPako.map((entry, i) => {
                        const a = entry.analiza;
                        if (!a) return null;
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <FlaskConical size={12} className="text-gray-400 flex-shrink-0"/>
                            <span className="text-sm text-gray-700 flex-1 truncate">{a.emri}</span>
                            <span className="text-xs font-mono text-gray-400 flex-shrink-0"
                              style={{ color: DEP_COLORS[a.departamenti] }}>{a.departamenti?.slice(0,3)}</span>
                            <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{a.cmime?.pacient} EUR</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL CREATE/EDIT ── */}
      {modalHapur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                  <Package size={18} className="text-violet-600"/>
                </div>
                <div>
                  <h2 className="font-bold text-base">{editId ? 'Edito Pakon' : 'Pako e Re'}</h2>
                  <p className="text-xs text-gray-400">Grupo analizat dhe vendos cmim promocional</p>
                </div>
              </div>
              <button onClick={() => setModalHapur(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">

                {/* Emri + Pershkrim */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Emri i Pakos <span className="text-red-400">*</span></label>
                    <input className="input font-semibold uppercase tracking-wide"
                      value={forma.emri}
                      onChange={e => setForma(p => ({ ...p, emri: e.target.value.toUpperCase() }))}
                      placeholder="PAKO HORMONALE"/>
                  </div>
                  <div>
                    <label className="label">Pershkrim <span className="text-xs text-gray-400 font-normal">(opsional)</span></label>
                    <input className="input" value={forma.pershkrim}
                      onChange={e => setForma(p => ({ ...p, pershkrim: e.target.value }))}
                      placeholder="Pershkrim i shkurter..."/>
                  </div>
                </div>

                {/* Multi-select analizash */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Zgjidh Analizat <span className="text-red-400">*</span></label>
                    {forma.analizatIds.length > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {forma.analizatIds.length} te zgjedhura
                      </span>
                    )}
                  </div>

                  {/* Kerko analiza */}
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    <input className="input pl-8 text-sm py-2"
                      placeholder="Kerko analizen..."
                      value={kerkoAn}
                      onChange={e => setKerkoAn(e.target.value)}/>
                    {kerkoAn && (
                      <button onClick={() => setKerkoAn('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                        <X size={12}/>
                      </button>
                    )}
                  </div>

                  {/* Lista sipas departamentit */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {Object.entries(grupuaraSipasDeprt).map(([dep, analizat]) => (
                      <div key={dep}>
                        {/* Dep header */}
                        <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: DEP_COLORS[dep] || '#6B7280' }}/>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{dep}</span>
                        </div>
                        {/* Analyses */}
                        <div className="divide-y divide-gray-50">
                          {analizat.map(a => {
                            const zgjedhur = forma.analizatIds.includes(a._id);
                            return (
                              <button key={a._id} onClick={() => toggleAnalizen(a._id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${zgjedhur ? 'bg-primary/5' : 'hover:bg-gray-50'}`}>
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${zgjedhur ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                  {zgjedhur && <span className="text-white text-[10px] leading-none">✓</span>}
                                </div>
                                <span className="flex-1 text-sm text-gray-700">{a.emri}</span>
                                <span className="text-xs font-mono text-gray-400 mr-2">{a.kodi}</span>
                                <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">
                                  {a.cmime?.pacient ?? 0} EUR
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {Object.keys(grupuaraSipasDeprt).length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-8">Nuk ka rezultate per "{kerkoAn}"</p>
                    )}
                  </div>
                </div>

                {/* Llogaritje çmimi */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide flex items-center gap-1.5">
                    <Tag size={12}/> Çmimi Promocional
                  </p>

                  {/* Lista individuale e analizave te zgjedhura */}
                  {forma.analizatIds.length > 0 && (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {forma.analizatIds.map(id => {
                        const a = analizatTE.find(x => x._id === id);
                        if (!a) return null;
                        return (
                          <div key={id} className="flex items-center gap-2 text-xs">
                            <FlaskConical size={10} className="text-violet-400 flex-shrink-0"/>
                            <span className="flex-1 text-gray-600 truncate">{a.emri}</span>
                            <span className="font-semibold text-gray-700 flex-shrink-0">{a.cmime?.pacient ?? 0} EUR</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Totali normal */}
                  {forma.analizatIds.length > 0 && (
                    <div className="flex items-center justify-between text-sm border-t border-violet-100 pt-2">
                      <span className="text-gray-500">Totali normal ({forma.analizatIds.length} analiza):</span>
                      <span className="font-semibold text-gray-700 line-through">{totalNormal.toFixed(2)} EUR</span>
                    </div>
                  )}

                  {/* Input cmim promo */}
                  <div>
                    <label className="label text-violet-700">Çmimi i Pakos (EUR) <span className="text-red-400">*</span></label>
                    <input type="number" min="0" step="0.5"
                      className="input text-lg font-bold text-violet-700 border-violet-200 focus:border-violet-400"
                      value={forma.cmimiPromocional}
                      onChange={e => setForma(p => ({ ...p, cmimiPromocional: e.target.value }))}
                      placeholder="0.00"/>
                  </div>

                  {/* Kursimi */}
                  {forma.cmimiPromocional !== '' && !isNaN(Number(forma.cmimiPromocional)) && forma.analizatIds.length > 0 && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${kursimi > 0 ? 'bg-green-100 text-green-700' : kursimi < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                      <CheckCircle2 size={14}/>
                      {kursimi > 0
                        ? `Pacienti kursen ${kursimi.toFixed(2)} EUR (${totalNormal > 0 ? Math.round((kursimi/totalNormal)*100) : 0}% zbritje)`
                        : kursimi < 0
                        ? `Kujdes: çmimi i pakos eshte me i larte se totali normal!`
                        : 'Nuk ka zbritje — çmimi i njejte me totalin normal'}
                    </div>
                  )}
                </div>

                {/* Shenime */}
                <div>
                  <label className="label">Shenime <span className="text-xs text-gray-400 font-normal">(opsionale)</span></label>
                  <textarea className="input resize-none h-16 text-sm" value={forma.shenime}
                    onChange={e => setForma(p => ({ ...p, shenime: e.target.value }))}
                    placeholder="Shenime per stafin rreth ketij pakoje..."/>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end px-6 py-4 border-t flex-shrink-0 bg-white">
              <button onClick={() => setModalHapur(false)} className="btn-ghost">Anulo</button>
              <button onClick={ruaj} disabled={duke_ruajtur} className="btn-primary flex items-center gap-2">
                <Save size={15}/>
                {duke_ruajtur ? 'Duke ruajtur...' : editId ? 'Perditeso' : 'Krijo Pakon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
