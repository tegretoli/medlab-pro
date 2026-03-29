import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Pencil, Trash2, X, Check, Stethoscope, Handshake, Percent } from 'lucide-react';

const API = '/referuesit';

const FORMA_ZBRAZET = {
  emri: '', mbiemri: '', tipi: 'Doktor',
  specialiteti: '', institucioni: '', telefoni: '', email: '',
  nrUnik: '', nrFiskal: '', nrTvsh: '', nrBiznesit: '',
  shenime: '',
  komisjoni: { tipi: '', vlera: 0 },
};

const TIPET = [
  { vlera: 'Doktor',      etiketa: 'Doktor',      ikona: Stethoscope, ngjyra: 'blue'   },
  { vlera: 'Bashkpuntor', etiketa: 'Bashkpuntor', ikona: Handshake,   ngjyra: 'violet' },
];

const tipNgjyra = (tipi) =>
  tipi === 'Doktor'
    ? 'bg-blue-50 text-blue-700 border border-blue-200'
    : 'bg-violet-50 text-violet-700 border border-violet-200';

export default function Referuesit() {
  const [lista,    setLista]    = useState([]);
  const [ngarkimi, setNgarkimi] = useState(true);
  const [filter,   setFilter]   = useState('');       // '' | 'Doktor' | 'Bashkpuntor'
  const [forma,    setForma]    = useState(null);      // null = mbyllur | {} = hapur
  const [duke,     setDuke]     = useState(false);

  const ngarko = async () => {
    setNgarkimi(true);
    try {
      const { data } = await api.get(API);
      setLista(data.data || []);
    } catch { toast.error('Gabim gjate ngarkimit'); }
    finally { setNgarkimi(false); }
  };

  useEffect(() => { ngarko(); }, []);

  const set = (k, v) => setForma(p => ({ ...p, [k]: v }));

  const setKom = (k, v) => setForma(p => ({ ...p, komisjoni: { ...p.komisjoni, [k]: v } }));

  const hap = (ref = null) =>
    setForma(ref ? { ...ref, komisjoni: ref.komisjoni || { tipi: '', vlera: 0 } } : { ...FORMA_ZBRAZET });

  const mbyll = () => setForma(null);

  const ruaj = async (e) => {
    e.preventDefault();
    if (!forma.emri || !forma.mbiemri) return toast.error('Emri dhe mbiemri jane te detyrueshem');
    setDuke(true);
    try {
      if (forma._id) {
        await api.put(`${API}/${forma._id}`, forma);
        toast.success('Referuesi u perditesua');
      } else {
        await api.post(API, forma);
        toast.success('Referuesi u shtua');
      }
      mbyll(); ngarko();
    } catch (err) {
      toast.error(err.response?.data?.mesazh || 'Gabim gjate ruajtjes');
    } finally { setDuke(false); }
  };

  const fshi = async (id, emri) => {
    if (!window.confirm(`Fshi "${emri}"?`)) return;
    try {
      await api.delete(`${API}/${id}`);
      toast.success('Referuesi u fshi');
      ngarko();
    } catch { toast.error('Gabim gjate fshirjes'); }
  };

  const listaFiltrar = filter ? lista.filter(r => r.tipi === filter) : lista;
  const doktore      = lista.filter(r => r.tipi === 'Doktor').length;
  const bashkpuntoret = lista.filter(r => r.tipi === 'Bashkpuntor').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Referuesit</h1>
          <p className="text-gray-500 text-sm mt-0.5">Doktore dhe bashkpuntore te regjistruar</p>
        </div>
        <button onClick={() => hap()} className="btn-primary flex items-center gap-2">
          <UserPlus size={16}/> Shto Referues
        </button>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Gjithsej',      vlera: lista.length,    ngjyra: 'gray'   },
          { label: 'Doktore',       vlera: doktore,         ngjyra: 'blue'   },
          { label: 'Bashkpuntore',  vlera: bashkpuntoret,   ngjyra: 'violet' },
        ].map(s => (
          <div key={s.label} className="card text-center py-4">
            <div className={`text-2xl font-bold ${s.ngjyra === 'blue' ? 'text-blue-600' : s.ngjyra === 'violet' ? 'text-violet-600' : 'text-gray-700'}`}>
              {s.vlera}
            </div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[{ k: '', v: 'Te gjithe' }, { k: 'Doktor', v: 'Doktore' }, { k: 'Bashkpuntor', v: 'Bashkpuntore' }].map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === t.k ? 'bg-[#1B4F8A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.v}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="card p-0 overflow-hidden">
        {ngarkimi ? (
          <div className="p-10 text-center text-gray-400">Duke ngarkuar...</div>
        ) : listaFiltrar.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <UserPlus size={32} className="mx-auto mb-2 opacity-30"/>
            <p>Nuk ka referues te regjistruar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Emri</th>
                <th className="px-4 py-3">Tipi</th>
                <th className="px-4 py-3">Specialiteti / Institucioni</th>
                <th className="px-4 py-3">Kontakti</th>
                <th className="px-4 py-3">Komisioni</th>
                <th className="px-4 py-3 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrar.map((ref, i) => (
                <tr key={ref._id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {ref.mbiemri} {ref.emri}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipNgjyra(ref.tipi)}`}>
                      {ref.tipi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ref.specialiteti && <div>{ref.specialiteti}</div>}
                    {ref.institucioni && <div className="text-xs text-gray-400">{ref.institucioni}</div>}
                    {!ref.specialiteti && !ref.institucioni && <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {ref.telefoni && <div>{ref.telefoni}</div>}
                    {ref.email    && <div>{ref.email}</div>}
                    {!ref.telefoni && !ref.email && <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {ref.komisjoni?.tipi === 'Perqindje' ? (
                      <span className="bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                        <Percent size={10}/>{ref.komisjoni.vlera}%
                      </span>
                    ) : ref.komisjoni?.tipi === 'Fikse' ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-medium w-fit block">
                        {ref.komisjoni.vlera} EUR/pac
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => hap(ref)}
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14}/>
                      </button>
                      <button onClick={() => fshi(ref._id, `${ref.emri} ${ref.mbiemri}`)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
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

      {/* Modal forma */}
      {forma && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <h2 className="font-semibold text-gray-800">
                {forma._id ? 'Ndrysho Referuesin' : 'Shto Referues te Ri'}
              </h2>
              <button onClick={mbyll} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>

            <form onSubmit={ruaj} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Tipi toggle */}
              <div>
                <label className="label">Tipi *</label>
                <div className="flex gap-2 mt-1">
                  {TIPET.map(t => {
                    const Ik = t.ikona;
                    const aktiv = forma.tipi === t.vlera;
                    return (
                      <button key={t.vlera} type="button"
                        onClick={() => set('tipi', t.vlera)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors
                          ${aktiv
                            ? t.vlera === 'Doktor'
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-violet-50 border-violet-400 text-violet-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}>
                        <Ik size={15}/>{t.etiketa}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emri + Mbiemri */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Emri *</label>
                  <input className="input" value={forma.emri}
                    onChange={e => set('emri', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Mbiemri *</label>
                  <input className="input" value={forma.mbiemri}
                    onChange={e => set('mbiemri', e.target.value)} required />
                </div>
              </div>

              {/* Specialiteti (kryesisht per Doktor) */}
              <div>
                <label className="label">
                  {forma.tipi === 'Doktor' ? 'Specialiteti' : 'Pozita / Roli'}
                </label>
                <input className="input" value={forma.specialiteti}
                  onChange={e => set('specialiteti', e.target.value)}
                  placeholder={forma.tipi === 'Doktor' ? 'p.sh. Kardiologji' : 'p.sh. Farmacist'} />
              </div>

              {/* Institucioni */}
              <div>
                <label className="label">Institucioni / Klinika</label>
                <input className="input" value={forma.institucioni}
                  onChange={e => set('institucioni', e.target.value)} />
              </div>

              {/* Kontakti */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefoni</label>
                  <input className="input" value={forma.telefoni}
                    onChange={e => set('telefoni', e.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={forma.email}
                    onChange={e => set('email', e.target.value)} />
                </div>
              </div>

              {/* Të dhënat ligjore (për faturim) */}
              <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Të dhënat ligjore / faturimi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">No. Unik (NUIS)</label>
                    <input className="input text-sm" value={forma.nrUnik || ''}
                      onChange={e => set('nrUnik', e.target.value)} placeholder="p.sh. L12345678A"/>
                  </div>
                  <div>
                    <label className="label">No. Fiskal</label>
                    <input className="input text-sm" value={forma.nrFiskal || ''}
                      onChange={e => set('nrFiskal', e.target.value)} placeholder="p.sh. 123456789"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nr. TVSH</label>
                    <input className="input text-sm" value={forma.nrTvsh || ''}
                      onChange={e => set('nrTvsh', e.target.value)} placeholder="p.sh. AL1234567890"/>
                  </div>
                  <div>
                    <label className="label">Nr. Biznesit</label>
                    <input className="input text-sm" value={forma.nrBiznesit || ''}
                      onChange={e => set('nrBiznesit', e.target.value)} placeholder="p.sh. K12345678A"/>
                  </div>
                </div>
              </div>

              {/* Shenime */}
              <div>
                <label className="label">Shenime</label>
                <textarea className="input" rows={2} value={forma.shenime}
                  onChange={e => set('shenime', e.target.value)} />
              </div>

              {/* Bashkpuntor note */}
              {forma.tipi === 'Bashkpuntor' && (
                <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 text-xs text-violet-700">
                  Bashkpuntoret do te kene cmimet speciale te analizave (cmimi bashkpuntor).
                </div>
              )}

              {/* Komisioni */}
              <div className="border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Percent size={11}/> Komisioni (opsional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Tipi Komisionit</label>
                    <select className="input text-sm"
                      value={forma.komisjoni?.tipi || ''}
                      onChange={e => setKom('tipi', e.target.value)}>
                      <option value="">Pa komisioni</option>
                      <option value="Perqindje">Perqindje (%)</option>
                      <option value="Fikse">Shume Fikse (EUR/pac)</option>
                    </select>
                  </div>
                  {forma.komisjoni?.tipi && (
                    <div>
                      <label className="label">
                        {forma.komisjoni.tipi === 'Perqindje' ? 'Perqindja (%)' : 'Shuma (EUR / pacient)'}
                      </label>
                      <input type="number" min="0" step="0.5" className="input text-sm"
                        value={forma.komisjoni?.vlera || ''}
                        onChange={e => setKom('vlera', parseFloat(e.target.value) || 0)}
                        placeholder={forma.komisjoni.tipi === 'Perqindje' ? '10' : '5'}/>
                    </div>
                  )}
                </div>
                {forma.komisjoni?.tipi && forma.komisjoni?.vlera > 0 && (
                  <p className="text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-2">
                    {forma.komisjoni.tipi === 'Perqindje'
                      ? `Per cdo 100 EUR sherbim → ${forma.komisjoni.vlera} EUR komisioni`
                      : `Per cdo pacient te referuar → ${forma.komisjoni.vlera} EUR komisioni`}
                  </p>
                )}
              </div>

              {/* Veprime */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={mbyll} className="btn-ghost flex-1">Anulo</button>
                <button type="submit" disabled={duke}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check size={15}/>
                  {duke ? 'Duke ruajtur...' : forma._id ? 'Ruaj Ndryshimet' : 'Shto Referuesin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
