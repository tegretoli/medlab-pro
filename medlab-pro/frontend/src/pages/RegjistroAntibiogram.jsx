import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Save, X, ChevronDown, ChevronUp,
  Pencil, Microscope, FlaskConical, ArrowUp, ArrowDown,
  BookOpen, Tag,
} from 'lucide-react';

export default function RegjistroAntibiogram() {
  const [pageTab, setPageTab] = useState('grupet'); // 'grupet' | 'sablonet'

  // ── Grupet ────────────────────────────────────────────────────────────────
  const [grupet, setGrupet]       = useState([]);
  const [ngarkimi, setNgarkimi]   = useState(true);
  const [hapurId, setHapurId]     = useState(null);
  const [modalGrup, setModalGrup] = useState(null);
  const [emriAb, setEmriAb]       = useState('');

  // ── Sablonet ──────────────────────────────────────────────────────────────
  const [sablonet, setSablonet]         = useState([]);
  const [ngarkonSab, setNgarkonSab]     = useState(false);
  const [modalSablon, setModalSablon]   = useState(null);
  // modalSablon = null | { _id?, emri, grupiId, zgjedhura: Set<string> }

  const ngarko = () => {
    setNgarkimi(true);
    api.get('/antibiogram/grupet')
      .then(r => { setGrupet(r.data.grupet || []); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  };

  const ngarkoSablonet = () => {
    setNgarkonSab(true);
    api.get('/antibiogram/sablonet')
      .then(r => { setSablonet(r.data.sablonet || []); setNgarkonSab(false); })
      .catch(() => setNgarkonSab(false));
  };

  useEffect(() => { ngarko(); }, []);
  useEffect(() => { if (pageTab === 'sablonet') ngarkoSablonet(); }, [pageTab]);

  // ── Group CRUD ────────────────────────────────────────────────────────────
  const ruajGrupin = async () => {
    if (!modalGrup?.emri?.trim()) return toast.error('Emri i grupit është i detyrueshëm');
    try {
      if (modalGrup._id) {
        await api.put(`/antibiogram/grupet/${modalGrup._id}`, {
          emri: modalGrup.emri.trim(),
          numrRendor: Number(modalGrup.numrRendor) || 0,
        });
        toast.success('Grupi u përditësua!');
      } else {
        await api.post('/antibiogram/grupet', {
          emri: modalGrup.emri.trim(),
          numrRendor: Number(modalGrup.numrRendor) || 0,
        });
        toast.success('Grupi u shtua!');
      }
      setModalGrup(null);
      ngarko();
    } catch { toast.error('Gabim gjatë ruajtjes'); }
  };

  const fshiGrupin = async (id, emri) => {
    if (!confirm(`Fshi grupin "${emri}"?`)) return;
    try {
      await api.delete(`/antibiogram/grupet/${id}`);
      toast.success('Grupi u fshi');
      ngarko();
    } catch { toast.error('Gabim gjatë fshirjes'); }
  };

  // ── Antibiotics within group ──────────────────────────────────────────────
  const shtoAntibiotikun = async (grup) => {
    const emri = emriAb.trim();
    if (!emri) return;
    const antibiotikeTa = [
      ...(grup.antibiotike || []),
      { emri, numrRendor: (grup.antibiotike?.length || 0) },
    ];
    try {
      await api.put(`/antibiogram/grupet/${grup._id}`, { antibiotike: antibiotikeTa });
      setEmriAb('');
      ngarko();
    } catch { toast.error('Gabim gjatë shtimit'); }
  };

  const fshiAntibiotikun = async (grup, idx) => {
    const antibiotikeTa = (grup.antibiotike || []).filter((_, i) => i !== idx);
    try {
      await api.put(`/antibiogram/grupet/${grup._id}`, { antibiotike: antibiotikeTa });
      ngarko();
    } catch { toast.error('Gabim gjatë fshirjes'); }
  };

  const levizAntibiotikun = async (grup, idx, drejtim) => {
    const arr = [...(grup.antibiotike || [])];
    const swap = idx + drejtim;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    arr.forEach((a, i) => { a.numrRendor = i; });
    try {
      await api.put(`/antibiogram/grupet/${grup._id}`, { antibiotike: arr });
      ngarko();
    } catch { toast.error('Gabim gjatë rirenditjes'); }
  };

  const levizGrupin = async (idx, drejtim) => {
    const arr = [...grupet];
    const swap = idx + drejtim;
    if (swap < 0 || swap >= arr.length) return;
    const g1 = arr[idx], g2 = arr[swap];
    const nr1 = g1.numrRendor, nr2 = g2.numrRendor;
    try {
      await Promise.all([
        api.put(`/antibiogram/grupet/${g1._id}`, { numrRendor: nr2 }),
        api.put(`/antibiogram/grupet/${g2._id}`, { numrRendor: nr1 }),
      ]);
      ngarko();
    } catch { toast.error('Gabim gjatë rirenditjes'); }
  };

  // ── Sablon CRUD ───────────────────────────────────────────────────────────
  const hapModalSablon = (sab = null) => {
    if (sab) {
      setModalSablon({
        _id: sab._id,
        emri: sab.emri,
        grupiId: sab.grupiId,
        zgjedhura: new Set(sab.antibiotike || []),
      });
    } else {
      setModalSablon({ emri: '', grupiId: '', zgjedhura: new Set() });
    }
  };

  const ruajSablonin = async () => {
    if (!modalSablon?.emri?.trim()) return toast.error('Emri i shabllonit është i detyrueshëm');
    if (!modalSablon?.grupiId) return toast.error('Zgjedh bakterien/grupin');
    try {
      const payload = {
        emri: modalSablon.emri.trim(),
        grupiId: modalSablon.grupiId,
        antibiotike: [...modalSablon.zgjedhura],
      };
      if (modalSablon._id) {
        await api.put(`/antibiogram/sablonet/${modalSablon._id}`, payload);
        toast.success('Shablloni u përditësua!');
      } else {
        await api.post('/antibiogram/sablonet', payload);
        toast.success('Shablloni u shtua!');
      }
      setModalSablon(null);
      ngarkoSablonet();
    } catch { toast.error('Gabim gjatë ruajtjes'); }
  };

  const fshiSablonin = async (id, emri) => {
    if (!confirm(`Fshi shabllonin "${emri}"?`)) return;
    try {
      await api.delete(`/antibiogram/sablonet/${id}`);
      toast.success('Shablloni u fshi');
      ngarkoSablonet();
    } catch { toast.error('Gabim gjatë fshirjes'); }
  };

  const toggleAntibiotik = (emri) => {
    setModalSablon(prev => {
      const next = new Set(prev.zgjedhura);
      if (next.has(emri)) next.delete(emri); else next.add(emri);
      return { ...prev, zgjedhura: next };
    });
  };

  // Antibiotiket e grupit të zgjedhur për modal
  const grupiZgjedhur = grupet.find(g => g._id === modalSablon?.grupiId);
  const antibiotikeTGrupit = grupiZgjedhur?.antibiotike || [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Microscope size={20} className="text-green-600"/>
            Antibiogrami
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Regjistro bakteriet, antibiotiket dhe shabllonët</p>
        </div>
        {pageTab === 'grupet' ? (
          <button
            onClick={() => setModalGrup({ emri: '', numrRendor: grupet.length })}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
            <Plus size={15}/> Shto Bakterie
          </button>
        ) : (
          <button
            onClick={() => hapModalSablon()}
            className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
            <Plus size={15}/> Shto Shabllon
          </button>
        )}
      </div>

      {/* Page tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'grupet',   label: 'Bakteriet & Antibiotiket', icon: FlaskConical },
          { id: 'sablonet', label: 'Shabllonët',               icon: BookOpen },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setPageTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pageTab === t.id ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* ══ TAB: GRUPET ══ */}
      {pageTab === 'grupet' && (
        <>
          {ngarkimi ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse"/>)}
            </div>
          ) : grupet.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <Microscope size={32} className="text-gray-300 mx-auto mb-2"/>
              <p className="text-gray-400 font-medium">Asnjë bakterie e regjistruar</p>
              <p className="text-gray-300 text-sm mt-1">Kliko "Shto Bakterie" për të filluar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grupet.map((grup, gi) => (
                <div key={grup._id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => levizGrupin(gi, -1)} disabled={gi === 0}
                        className="text-gray-300 hover:text-primary disabled:opacity-20 transition-colors">
                        <ArrowUp size={13}/>
                      </button>
                      <button onClick={() => levizGrupin(gi, 1)} disabled={gi === grupet.length - 1}
                        className="text-gray-300 hover:text-primary disabled:opacity-20 transition-colors">
                        <ArrowDown size={13}/>
                      </button>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <FlaskConical size={15} className="text-green-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{grup.emri}</p>
                      <p className="text-xs text-gray-400">{grup.antibiotike?.length || 0} antibiotike</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setModalGrup({ _id: grup._id, emri: grup.emri, numrRendor: grup.numrRendor })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Pencil size={14}/>
                      </button>
                      <button onClick={() => fshiGrupin(grup._id, grup.emri)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                      <button onClick={() => setHapurId(hapurId === grup._id ? null : grup._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
                        {hapurId === grup._id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                      </button>
                    </div>
                  </div>

                  {hapurId === grup._id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                      {(grup.antibiotike || []).length === 0 ? (
                        <p className="text-xs text-gray-400 py-2 text-center">Asnjë antibiotik — shto më poshtë</p>
                      ) : (
                        <div className="space-y-1 mb-3">
                          {(grup.antibiotike || []).map((ab, ai) => (
                            <div key={ai} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                              <div className="flex flex-col gap-0">
                                <button onClick={() => levizAntibiotikun(grup, ai, -1)} disabled={ai === 0}
                                  className="text-gray-300 hover:text-primary disabled:opacity-20 transition-colors leading-none">
                                  <ArrowUp size={11}/>
                                </button>
                                <button onClick={() => levizAntibiotikun(grup, ai, 1)} disabled={ai === (grup.antibiotike.length - 1)}
                                  className="text-gray-300 hover:text-primary disabled:opacity-20 transition-colors leading-none">
                                  <ArrowDown size={11}/>
                                </button>
                              </div>
                              <span className="w-5 h-5 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {ai + 1}
                              </span>
                              <span className="flex-1 text-sm text-gray-700">{ab.emri}</span>
                              <button onClick={() => fshiAntibiotikun(grup, ai)}
                                className="text-gray-300 hover:text-red-500 transition-colors p-0.5">
                                <X size={13}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          className="input flex-1 text-sm py-1.5"
                          placeholder="Emri i antibiotikut (p.sh. Ciprofloxacin)..."
                          value={emriAb}
                          onChange={e => setEmriAb(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') shtoAntibiotikun(grup); }}/>
                        <button onClick={() => shtoAntibiotikun(grup)}
                          disabled={!emriAb.trim()}
                          className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1 disabled:opacity-50">
                          <Plus size={14}/> Shto
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ TAB: SABLONET ══ */}
      {pageTab === 'sablonet' && (
        <>
          {ngarkonSab ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse"/>)}
            </div>
          ) : sablonet.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <BookOpen size={32} className="text-gray-300 mx-auto mb-2"/>
              <p className="text-gray-400 font-medium">Asnjë shabllon i regjistruar</p>
              <p className="text-gray-300 text-sm mt-1">Kliko "Shto Shabllon" për të filluar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sablonet.map(sab => (
                <div key={sab._id} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BookOpen size={15} className="text-blue-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{sab.emri}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Tag size={10}/> {sab.grupiEmri}
                      </p>
                      {(sab.antibiotike || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sab.antibiotike.map((ab, i) => (
                            <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
                              {ab}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => hapModalSablon(sab)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors">
                        <Pencil size={14}/>
                      </button>
                      <button onClick={() => fshiSablonin(sab._id, sab.emri)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Add/Edit group */}
      {modalGrup !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">
                {modalGrup._id ? 'Edito Bakterien' : 'Shto Bakterie të Re'}
              </h3>
              <button onClick={() => setModalGrup(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Emri i Bakteries / Mikroorganizmit *
                </label>
                <input
                  className="input w-full"
                  placeholder="p.sh. Escherichia coli"
                  value={modalGrup.emri}
                  onChange={e => setModalGrup(p => ({ ...p, emri: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') ruajGrupin(); }}
                  autoFocus/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Nr. Rendor</label>
                <input
                  type="number"
                  className="input w-full"
                  value={modalGrup.numrRendor}
                  onChange={e => setModalGrup(p => ({ ...p, numrRendor: e.target.value }))}/>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t">
              <button onClick={() => setModalGrup(null)} className="btn-secondary px-4 py-2 text-sm">Anulo</button>
              <button onClick={ruajGrupin} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
                <Save size={14}/> Ruaj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit sablon */}
      {modalSablon !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <h3 className="font-bold text-gray-800">
                {modalSablon._id ? 'Edito Shabllonin' : 'Shto Shabllon të Ri'}
              </h3>
              <button onClick={() => setModalSablon(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Emri i Shabllonit *</label>
                <input
                  className="input w-full"
                  placeholder="p.sh. Panel Gram Negativ"
                  value={modalSablon.emri}
                  onChange={e => setModalSablon(p => ({ ...p, emri: e.target.value }))}
                  autoFocus/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Bakteria / Grupi *</label>
                <select
                  className="input w-full"
                  value={modalSablon.grupiId}
                  onChange={e => setModalSablon(p => ({ ...p, grupiId: e.target.value, zgjedhura: new Set() }))}>
                  <option value="">-- Zgjedh grupin --</option>
                  {grupet.map(g => (
                    <option key={g._id} value={g._id}>{g.emri}</option>
                  ))}
                </select>
              </div>

              {/* Antibiotics checkboxes */}
              {modalSablon.grupiId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-600">
                      Antibiotiket e Parazgjedhura
                      <span className="ml-1 text-gray-400 font-normal">({modalSablon.zgjedhura.size} zgjedhur)</span>
                    </label>
                    {antibiotikeTGrupit.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setModalSablon(p => ({
                          ...p,
                          zgjedhura: p.zgjedhura.size === antibiotikeTGrupit.length
                            ? new Set()
                            : new Set(antibiotikeTGrupit.map(a => a.emri)),
                        }))}
                        className="text-xs text-primary hover:underline">
                        {modalSablon.zgjedhura.size === antibiotikeTGrupit.length ? 'Hiq të gjitha' : 'Zgjedh të gjitha'}
                      </button>
                    )}
                  </div>
                  {antibiotikeTGrupit.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-3 text-center border border-dashed border-gray-200 rounded-xl">
                      Ky grup nuk ka antibiotike. Shto antibiotiket tek tab-i "Bakteriet & Antibiotiket".
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {antibiotikeTGrupit.map((ab, i) => {
                        const sel = modalSablon.zgjedhura.has(ab.emri);
                        return (
                          <label key={i}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer transition-all select-none ${
                              sel ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}>
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={() => toggleAntibiotik(ab.emri)}
                              className="w-3.5 h-3.5 accent-green-600 flex-shrink-0"/>
                            <span className="text-xs text-gray-700 truncate">{ab.emri}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t flex-shrink-0">
              <button onClick={() => setModalSablon(null)} className="btn-secondary px-4 py-2 text-sm">Anulo</button>
              <button onClick={ruajSablonin} className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
                <Save size={14}/> Ruaj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
