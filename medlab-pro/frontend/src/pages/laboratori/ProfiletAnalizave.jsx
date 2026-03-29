import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2, Trash2, X, Save, Layers, FlaskConical, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';

const DEPARTAMENTET = ['Biokimi', 'Mikrobiologji', 'PCR'];

const DEP_COLORS = {
  Biokimi:       '#3B82F6',
  Mikrobiologji: '#22C55E',
  PCR:           '#A855F7',
};

const FORMA_ZBRAZET = {
  emri: '', departamenti: 'Biokimi', numrRendor: 0,
  cmime: { pacient: 0, bashkpuntor: 0 },
  shenime: '',
};

export default function ProfiletAnalizave() {
  const [profilet, setProfilet]        = useState([]);
  const [ngarkimi, setNgarkimi]        = useState(true);
  const [modalHapur, setModalHapur]    = useState(false);
  const [forma, setForma]              = useState(FORMA_ZBRAZET);
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [editId, setEditId]            = useState(null);

  const ngarko = () => {
    setNgarkimi(true);
    api.get('/profilet')
      .then(r => { setProfilet(r.data.profilet || []); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  };

  useEffect(() => { ngarko(); }, []);

  const hapModal = (profili = null) => {
    if (profili) {
      setForma({
        emri:        profili.emri || '',
        departamenti:profili.departamenti || 'Biokimi',
        numrRendor:  profili.numrRendor ?? 0,
        cmime:       { pacient: profili.cmime?.pacient || 0, bashkpuntor: profili.cmime?.bashkpuntor || 0 },
        shenime:     profili.shenime || '',
      });
      setEditId(profili._id);
    } else {
      const maxNr = profilet.reduce((m, p) => Math.max(m, p.numrRendor || 0), 0);
      setForma({ ...FORMA_ZBRAZET, numrRendor: maxNr + 1 });
      setEditId(null);
    }
    setModalHapur(true);
  };

  const ruaj = async () => {
    if (!forma.emri.trim()) return toast.error('Emri i profilit eshte i detyrueshem');
    setDukeRuajtur(true);
    try {
      if (editId) {
        await api.put(`/profilet/${editId}`, forma);
        toast.success('Profili u perditesua!');
      } else {
        await api.post('/profilet', forma);
        toast.success('Profili u krijua!');
      }
      setModalHapur(false);
      ngarko();
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim gjate ruajtjes');
    }
    setDukeRuajtur(false);
  };

  const fshi = async (id) => {
    if (!confirm('caktivizon kete profil?')) return;
    try {
      await api.delete(`/profilet/${id}`);
      toast.success('Profili u caktivizua');
      ngarko();
    } catch {
      toast.error('Gabim gjate fshirjes');
    }
  };

  const ndryshoRendor = async (profili, drejtimi) => {
    const renditja = [...profilet].sort((a, b) => (a.numrRendor || 0) - (b.numrRendor || 0));
    const idx = renditja.findIndex(p => p._id === profili._id);
    const targetIdx = drejtimi === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= renditja.length) return;

    const tjetri = renditja[targetIdx];
    try {
      await Promise.all([
        api.put(`/profilet/${profili._id}`, { numrRendor: tjetri.numrRendor }),
        api.put(`/profilet/${tjetri._id}`,  { numrRendor: profili.numrRendor }),
      ]);
      ngarko();
    } catch {
      toast.error('Gabim gjate ndryshimit te renditjes');
    }
  };

  const set     = (f, v) => setForma(p => ({ ...p, [f]: v }));
  const setCmim = (f, v) => setForma(p => ({ ...p, cmime: { ...p.cmime, [f]: Number(v) } }));

  const renditja = [...profilet].sort((a, b) => (a.numrRendor || 0) - (b.numrRendor || 0));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Layers size={20} className="text-violet-600" /> Profilet e Analizave
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Krijo dhe rendit profile · analizat caktohen nga Katalogu i Analizave
          </p>
        </div>
        <button onClick={() => hapModal()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
          <Plus size={15} /> Shto Profil
        </button>
      </div>

      {/* Lista e profileve */}
      {ngarkimi ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-36 animate-pulse bg-gray-50" />)}
        </div>
      ) : renditja.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Layers size={40} className="mx-auto mb-3 opacity-30 text-violet-400" />
          <p className="font-medium">Nuk ka profile akoma</p>
          <p className="text-sm mt-1">Shto profilin e pare duke klikuar butonin lart</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {renditja.map((p, idx) => {
            const color = DEP_COLORS[p.departamenti] || '#7C3AED';
            return (
              <div key={p._id} className="card border border-violet-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Nr rendor */}
                    <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 font-bold text-xs flex-shrink-0">
                      {p.numrRendor || idx + 1}
                    </div>
                    <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Layers size={16} className="text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight">{p.emri}</h3>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block"
                        style={{ background: color + '18', color }}>{p.departamenti}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-col items-center">
                    <button onClick={() => ndryshoRendor(p, 'up')} disabled={idx === 0}
                      className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => ndryshoRendor(p, 'down')} disabled={idx === renditja.length - 1}
                      className="p-1 hover:bg-gray-100 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ArrowDown size={12} />
                    </button>
                  </div>
                </div>

                {/* cmimet */}
                <div className="mt-3 flex gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Pacient</div>
                    <div className="font-bold text-gray-800">{(p.cmime?.pacient || 0).toLocaleString()} EUR</div>
                  </div>
                  {(p.cmime?.bashkpuntor || 0) > 0 && (
                    <div>
                      <div className="text-xs text-gray-500">Bashkpuntor</div>
                      <div className="font-bold text-emerald-700">{p.cmime.bashkpuntor.toLocaleString()} EUR</div>
                    </div>
                  )}
                </div>

                {/* Analizat perberese */}
                {p.analizatProfil?.length > 0 ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <FlaskConical size={11} className="text-violet-400" />
                      <span>{p.analizatProfil.length} analiza:</span>
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      {p.analizatProfil.slice(0, 5).map(a => a.emri).join(' · ')}
                      {p.analizatProfil.length > 5 && ` +${p.analizatProfil.length - 5} tjera`}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-400 italic">
                    Pa analiza · cakto nga Katalogu i Analizave
                  </p>
                )}

                {/* Butonat */}
                <div className="mt-3 flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => hapModal(p)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={11} /> Edito
                  </button>
                  <button onClick={() => fshi(p._id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 hover:bg-red-50 rounded-lg transition-colors ml-auto">
                    <Trash2 size={11} /> caktivizon
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-700">
        <p className="font-medium mb-1">Si funksionon sistemi i profileve:</p>
        <ul className="text-xs text-violet-600 space-y-0.5 list-disc list-inside">
          <li>Krijo profile ketu me emer, departament dhe cmim</li>
          <li>Ne <strong>Katalogu i Analizave</strong>, cdo analize mund te caktohet tek nje profil</li>
          <li>Gjate krijimit te porosise, mund te zgjidhni profil (gjitha analizat e tij perfshihen)</li>
          <li>Numri rendor percakton radhitjen ne raport PDF</li>
        </ul>
      </div>

      {/* Modal */}
      {modalHapur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Layers size={16} className="text-violet-600" />
                {editId ? 'Edito Profilin' : 'Profil i Ri'}
              </h2>
              <button onClick={() => setModalHapur(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Emri */}
              <div>
                <label className="label">Emri i Profilit <span className="text-red-400">*</span></label>
                <input className="input" value={forma.emri}
                  onChange={e => set('emri', e.target.value)}
                  placeholder="p.sh. Hemogram i Plote, Panel Biokimik" autoFocus />
              </div>

              {/* Departamenti + Nr rendor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Departamenti <span className="text-red-400">*</span></label>
                  <select className="input" value={forma.departamenti} onChange={e => set('departamenti', e.target.value)}>
                    {DEPARTAMENTET.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Nr. Rendor <span className="text-xs text-gray-400 font-normal">(radhitja)</span></label>
                  <input type="number" className="input" value={forma.numrRendor}
                    onChange={e => set('numrRendor', Number(e.target.value))} min="0" />
                </div>
              </div>

              {/* cmimet */}
              <div>
                <label className="label">cmimet</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Cmimi Pacient (L)</p>
                    <input type="number" className="input bg-white font-semibold"
                      value={forma.cmime.pacient} onChange={e => setCmim('pacient', e.target.value)} placeholder="0" />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1.5">Cmimi Bashkpuntor (L)</p>
                    <input type="number" className="input bg-white font-semibold"
                      value={forma.cmime.bashkpuntor} onChange={e => setCmim('bashkpuntor', e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Shenime */}
              <div>
                <label className="label">Shenime <span className="text-xs text-gray-400 font-normal">(opsionale)</span></label>
                <textarea className="input resize-none h-16" value={forma.shenime}
                  onChange={e => set('shenime', e.target.value)} placeholder="Shenime shtese..." />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t">
                <button onClick={() => setModalHapur(false)} className="btn-ghost">Anulo</button>
                <button onClick={ruaj} disabled={duke_ruajtur}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  <Save size={14} />
                  {duke_ruajtur ? 'Duke ruajtur...' : 'Ruaj Profilin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
