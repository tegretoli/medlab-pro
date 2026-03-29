import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown, Layers, FlaskConical, Search } from 'lucide-react';

const DEPARTAMENTET = ['Biokimi', 'Mikrobiologji', 'PCR'];

const DEP_COLORS = {
  Biokimi: '#3B82F6', Mikrobiologji: '#22C55E', PCR: '#A855F7',
};

export default function RegjistroProfilet() {
  const [depAktiv, setDepAktiv]           = useState('Biokimi');
  const [profilet, setProfilet]           = useState([]);
  const [duke_ngarkuar, setDukeNgarkuar]  = useState(true);

  // Create / edit modal (basic info only)
  const [modalHapur, setModalHapur]       = useState(false);
  const [profiliAktual, setProfiliAktual] = useState(null); // null = new
  const [form, setForm]                   = useState({ emri: '', numrRendor: 1 });
  const [duke_ruajtur, setDukeRuajtur]    = useState(false);

  // Detail modal (reorder analyses inside a profile)
  const [detajeHapur, setDetajeHapur]     = useState(false);
  const [profiliDetaje, setProfiliDetaje] = useState(null);
  const [formDetaje, setFormDetaje]       = useState({ emri: '', numrRendor: 0 });

  // ── Load all profiles (server returns with analyses sorted by numrRendorNeProfil,emri)
  const ngarko = async (keepDetajeId = null) => {
    setDukeNgarkuar(true);
    try {
      const r = await api.get('/profilet');
      const list = r.data.profilet || [];
      setProfilet(list);
      // Refresh detail modal if open
      if (keepDetajeId) {
        const updated = list.find(p => p._id === keepDetajeId);
        if (updated) {
          setProfiliDetaje(updated);
          setFormDetaje({ emri: updated.emri, numrRendor: updated.numrRendor ?? 0 });
        }
      }
    } catch {
      toast.error('Gabim gjate ngarkimit');
    }
    setDukeNgarkuar(false);
  };

  useEffect(() => { ngarko(); }, []);

  // ── Profiles shown under selected department tab
  // (profiles that have at least one analysis in the selected department)
  const [kerko, setKerko] = useState('');

  const profiletNeDep = profilet.filter(p =>
    (p.analizatProfil || []).some(a => a.departamenti === depAktiv)
  );
  const profiletFiltruara = kerko
    ? profiletNeDep.filter(p => p.emri.toLowerCase().includes(kerko.toLowerCase()))
    : profiletNeDep;

  // ── Create / Edit modal handlers ──
  const hapModal = (profili = null) => {
    setProfiliAktual(profili);
    if (profili) {
      setForm({ emri: profili.emri, numrRendor: profili.numrRendor ?? 0 });
    } else {
      const maxRendor = profilet.length > 0
        ? Math.max(...profilet.map(p => p.numrRendor ?? 0))
        : 0;
      setForm({ emri: '', numrRendor: maxRendor + 1 });
    }
    setModalHapur(true);
  };

  const ruaj = async () => {
    if (!form.emri.trim()) return toast.error('Emri i profilit eshte i detyrueshem');
    setDukeRuajtur(true);
    try {
      if (profiliAktual) {
        await api.put(`/profilet/${profiliAktual._id}`, form);
        toast.success('Profili u perditesua!');
      } else {
        await api.post('/profilet', form);
        toast.success('Profili u shtua!');
      }
      setModalHapur(false);
      await ngarko();
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim gjate ruajtjes');
    }
    setDukeRuajtur(false);
  };

  const fshi = async (id) => {
    if (!confirm('Fshi profilin? Analizat e lidhura nuk fshihen.')) return;
    try {
      await api.delete(`/profilet/${id}`);
      toast.success('Profili u fshi');
      await ngarko();
    } catch {
      toast.error('Gabim gjate fshirjes');
    }
  };

  // ── Profile list reorder (swap numrRendor) ──
  const levizProfilin = async (idx, drejt) => {
    const targetIdx = drejt === 'lart' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= profiletNeDep.length) return;
    const a = profiletNeDep[idx];
    const b = profiletNeDep[targetIdx];
    try {
      await Promise.all([
        api.put(`/profilet/${a._id}`, { numrRendor: b.numrRendor }),
        api.put(`/profilet/${b._id}`, { numrRendor: a.numrRendor }),
      ]);
      await ngarko();
    } catch {
      toast.error('Gabim gjate rirenditjes');
    }
  };

  // ── Detail modal handlers ──
  const hapDetaje = (profili) => {
    setProfiliDetaje(profili);
    setFormDetaje({ emri: profili.emri, numrRendor: profili.numrRendor ?? 0 });
    setDetajeHapur(true);
  };

  const ruajDetaje = async () => {
    if (!formDetaje.emri.trim()) return toast.error('Emri eshte i detyrueshem');
    setDukeRuajtur(true);
    try {
      await api.put(`/profilet/${profiliDetaje._id}`, formDetaje);
      toast.success('Profili u perditesua!');
      await ngarko(profiliDetaje._id);
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim');
    }
    setDukeRuajtur(false);
  };

  // ── Analysis reorder inside detail modal (swap numrRendorNeProfil) ──
  const levizAnalizen = async (anIdx, drejt) => {
    const analizat = profiliDetaje.analizatProfil;
    const targetIdx = drejt === 'lart' ? anIdx - 1 : anIdx + 1;
    if (targetIdx < 0 || targetIdx >= analizat.length) return;
    const a = analizat[anIdx];
    const b = analizat[targetIdx];
    try {
      await Promise.all([
        api.put(`/laborator/analizat/${a._id}`, { numrRendorNeProfil: targetIdx }),
        api.put(`/laborator/analizat/${b._id}`, { numrRendorNeProfil: anIdx }),
      ]);
      await ngarko(profiliDetaje._id);
    } catch {
      toast.error('Gabim gjate rirenditjes');
    }
  };

  const color = DEP_COLORS[depAktiv] || '#6B7280';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Profilet e Analizave</h1>
        <p className="text-gray-500 text-sm">Menaxho grupet e analizave dhe renditjen e tyre</p>
      </div>

      {/* Department tabs */}
      <div className="flex flex-wrap gap-2">
        {DEPARTAMENTET.map(dep => {
          const c = DEP_COLORS[dep];
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

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: color }}/>
          {depAktiv}
          <span className="text-sm font-normal text-gray-400">— {profiletNeDep.length} profil</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            <input
              className="input pl-8 text-xs py-2 w-48"
              placeholder="Kerko profilin..."
              value={kerko}
              onChange={e => setKerko(e.target.value)}
            />
          </div>
          <button onClick={() => hapModal()} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Shto Profil
          </button>
        </div>
      </div>

      {/* Profile table */}
      <div className="card overflow-hidden p-0">
        {duke_ngarkuar ? (
          <div className="p-8 text-center text-gray-400">Duke ngarkuar...</div>
        ) : profiletNeDep.length === 0 || (kerko && profiletFiltruara.length === 0) ? (
          <div className="p-12 text-center">
            <Layers size={40} className="mx-auto text-gray-200 mb-3"/>
            <p className="text-gray-400">Asnje profil per {depAktiv}</p>
            <p className="text-gray-400 text-xs mt-1">
              Krijo profile dhe lidh analizat me to nga "Regjistro Analize"
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-8">#</th>
                <th className="px-4 py-3 text-left">Emri</th>
                <th className="px-4 py-3 text-center">Nr. Analizave</th>
                <th className="px-4 py-3 text-center">Rendit</th>
                <th className="px-4 py-3 text-center">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {profiletFiltruara.map((prof, idx) => (
                <tr key={prof._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{prof.numrRendor ?? idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{prof.emri}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {(prof.analizatProfil || []).slice(0, 3).map(a => a.emri).join(' · ')}
                      {(prof.analizatProfil || []).length > 3 && ` +${prof.analizatProfil.length - 3}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {prof.analizatProfil?.length || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => levizProfilin(idx, 'lart')} disabled={idx === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-400">
                        <ChevronUp size={14}/>
                      </button>
                      <button onClick={() => levizProfilin(idx, 'poshte')} disabled={idx === profiletFiltruara.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 text-gray-400">
                        <ChevronDown size={14}/>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => hapDetaje(prof)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                        <Edit2 size={12}/> Detaje
                      </button>
                      <button onClick={() => fshi(prof._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ Create / Edit basic modal ══ */}
      {modalHapur && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800">
                {profiliAktual ? 'Edito Profilin' : 'Profil i Ri'}
              </h2>
              <button onClick={() => setModalHapur(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Emri i Profilit *</label>
                <input className="input" placeholder="p.sh. Biokimia Baze, Tiroide, Hemogrami..."
                  value={form.emri} onChange={e => setForm(f => ({ ...f, emri: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && ruaj()} autoFocus/>
              </div>
              <div>
                <label className="label">Nr. Rendor (renditja ne liste dhe PDF)</label>
                <input type="number" className="input" min="0"
                  value={form.numrRendor} onChange={e => setForm(f => ({ ...f, numrRendor: +e.target.value }))}/>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setModalHapur(false)} className="flex-1 btn-ghost">Anulo</button>
              <button onClick={ruaj} disabled={duke_ruajtur} className="flex-1 btn-primary">
                {duke_ruajtur ? 'Duke ruajtur...' : profiliAktual ? 'Perditeso' : 'Shto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Detail modal (analyses reorder + edit name/order) ══ */}
      {detajeHapur && profiliDetaje && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-primary"/>
                <h2 className="font-bold text-gray-800">Detajet e Profilit</h2>
              </div>
              <button onClick={() => setDetajeHapur(false)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* Editable fields */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="label">Emri i Profilit</label>
                  <input className="input" value={formDetaje.emri}
                    onChange={e => setFormDetaje(f => ({ ...f, emri: e.target.value }))}/>
                </div>
                <div className="w-28">
                  <label className="label">Nr. Rendor</label>
                  <input type="number" className="input" min="0" value={formDetaje.numrRendor}
                    onChange={e => setFormDetaje(f => ({ ...f, numrRendor: +e.target.value }))}/>
                </div>
                <button onClick={ruajDetaje} disabled={duke_ruajtur}
                  className="btn-primary mb-0.5 flex-shrink-0">
                  {duke_ruajtur ? '...' : 'Ruaj'}
                </button>
              </div>

              {/* Analyses list with reorder */}
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Analizat ({profiliDetaje.analizatProfil?.length || 0}) — rendit me shigjetat
                </p>

                {profiliDetaje.analizatProfil?.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FlaskConical size={28} className="mx-auto mb-2 text-gray-300"/>
                    <p className="text-sm">Asnje analize e lidhur me kete profil</p>
                    <p className="text-xs mt-1">Shko te "Regjistro Analize" dhe lidh analizat me kete profil</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {profiliDetaje.analizatProfil.map((an, anIdx) => (
                      <div key={an._id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">

                        {/* Order arrows */}
                        <div className="flex flex-col flex-shrink-0">
                          <button onClick={() => levizAnalizen(anIdx, 'lart')} disabled={anIdx === 0}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-25 text-gray-400">
                            <ChevronUp size={13}/>
                          </button>
                          <button onClick={() => levizAnalizen(anIdx, 'poshte')}
                            disabled={anIdx === profiliDetaje.analizatProfil.length - 1}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-25 text-gray-400">
                            <ChevronDown size={13}/>
                          </button>
                        </div>

                        {/* Number */}
                        <span className="w-6 text-right text-xs font-bold text-gray-400 flex-shrink-0">
                          {anIdx + 1}.
                        </span>

                        {/* Flask icon */}
                        <FlaskConical size={13} className="text-primary/60 flex-shrink-0"/>

                        {/* Name */}
                        <span className="flex-1 text-sm font-medium text-gray-800">{an.emri}</span>

                        {/* Code */}
                        {an.kodi && (
                          <span className="text-xs font-mono text-gray-400">{an.kodi}</span>
                        )}

                        {/* Department badge */}
                        {an.departamenti && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            {an.departamenti}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0 text-right">
              <button onClick={() => setDetajeHapur(false)} className="btn-ghost text-sm">
                Mbyll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
