import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { merrPacientet, fshiPacientin } from '../../store/slices/pacientetSlice';
import toast from 'react-hot-toast';
import { Search, Plus, User, Phone, Trash2, ChevronLeft, ChevronRight, StickyNote, MessageSquarePlus } from 'lucide-react';
import api from '../../services/api';

const gjiniaEmri = { M: 'Mashkull', F: 'Femer' };

export default function ListaPacienteve() {
  const dispatch = useDispatch();
  const { lista, total, ngarkimi } = useSelector(s => s.pacientet);
  const [kerko, setKerko] = useState('');
  const [faqe, setFaqe] = useState(1);
  const [borxhetMap, setBorxhetMap] = useState({});
  const LIMIT = 20;
  const [modalShenimi, setModalShenimi] = useState(null); // { id, emri, shenime }
  const [tekstShenimi, setTekstiShenimi] = useState('');
  const [dukeShenon, setDukeShenon] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(merrPacientet({ kerkese: kerko || undefined, faqe, limit: LIMIT }));
    }, 300);
    return () => clearTimeout(timer);
  }, [kerko, faqe]);

  useEffect(() => {
    api.get('/pagesat/borxhet-pacienteve')
      .then(r => setBorxhetMap(r.data.borxhet || {}))
      .catch(() => {});
  }, [lista]);

  const faqetTotal = Math.ceil(total / LIMIT);

  const fshi = async (id, emri) => {
    if (!confirm(`Fshi pacientin "${emri}"? Ky veprim e cmobizizon nga lista.`)) return;
    const result = await dispatch(fshiPacientin(id));
    if (fshiPacientin.fulfilled.match(result)) toast.success('Pacienti u fshi');
    else toast.error(result.payload || 'Gabim gjate fshirjes');
  };

  const ruajShenimin = async () => {
    if (!modalShenimi) return;
    setDukeShenon(true);
    try {
      await api.put(`/pacientet/${modalShenimi.id}`, { shenimeExtra: tekstShenimi });
      toast.success('Shënimi u ruajt!');
      setModalShenimi(null);
      dispatch(merrPacientet({ kerkese: kerko || undefined, faqe, limit: LIMIT }));
    } catch {
      toast.error('Gabim duke ruajtur shënimin');
    } finally {
      setDukeShenon(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pacientet</h1>
          <p className="text-gray-500 text-sm">{total} paciente gjithsej</p>
        </div>
        <Link to="/pacientet/regjistro" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Regjistro Pacient
        </Link>
      </div>

      {/* Kerkim */}
      <div className="card py-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Kerko sipas emrit, numrit personal, telefonit..."
            value={kerko} onChange={e => { setKerko(e.target.value); setFaqe(1); }} />
        </div>
      </div>

      {/* Tabela */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Pacienti','NID','Mosha','Gjinia','Telefoni','Statusi','Pagesa',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ngarkimi ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : lista.length ? lista.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                        {p.emri[0]}{p.mbiemri[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{p.emri} {p.mbiemri}</p>
                        {p.shenimeExtra
                          ? <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5 max-w-[200px] truncate">
                              <StickyNote size={10}/> {p.shenimeExtra}
                            </p>
                          : <p className="text-xs text-gray-400">{p.email || '—'}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.numrPersonal}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.datelindja ? new Date().getFullYear() - new Date(p.datelindja).getFullYear() + ' vj.' : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{gjiniaEmri[p.gjinia] || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Phone size={13} />{p.telefoni}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.aktiv ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.aktiv ? 'Aktiv' : 'Joaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {borxhetMap[p._id]
                      ? <Link to={`/pacientet/${p._id}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">
                          Borxh {borxhetMap[p._id].shuma > 0 ? `€${borxhetMap[p._id].shuma.toFixed(0)}` : ''}
                        </Link>
                      : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link to={`/pacientet/${p._id}`} className="text-primary text-xs font-medium hover:underline">
                        Shiko →
                      </Link>
                      <button
                        onClick={() => { setModalShenimi({ id: p._id, emri: `${p.emri} ${p.mbiemri}`, shenime: p.shenimeExtra || '' }); setTekstiShenimi(p.shenimeExtra || ''); }}
                        className={`p-1 rounded transition-colors ${p.shenimeExtra ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
                        title={p.shenimeExtra ? 'Shënim ekziston — kliko për të ndryshuar' : 'Shto shënim të shpejtë'}>
                        <StickyNote size={14} />
                      </button>
                      <button onClick={() => fshi(p._id, `${p.emri} ${p.mbiemri}`)}
                        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Fshi pacientin">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <User size={40} className="mx-auto mb-2 opacity-30" />
                  Asnje pacient i gjetur
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Faqezimi */}
        {faqetTotal > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Faqja {faqe} nga {faqetTotal}</p>
            <div className="flex gap-2">
              <button onClick={() => setFaqe(p => Math.max(1, p-1))} disabled={faqe===1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16}/></button>
              <button onClick={() => setFaqe(p => Math.min(faqetTotal, p+1))} disabled={faqe===faqetTotal}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight size={16}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Shënim i Shpejtë */}
      {modalShenimi && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <StickyNote size={16} className="text-amber-500"/> Shënim i Shpejtë
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{modalShenimi.emri}</p>
              </div>
              <button onClick={() => setModalShenimi(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="p-5">
              <textarea
                value={tekstShenimi}
                onChange={e => setTekstiShenimi(e.target.value)}
                rows={4}
                placeholder="Shkruaj shënim për këtë pacient..."
                className="input resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setModalShenimi(null)} className="btn-ghost text-sm">Anulo</button>
                {tekstShenimi !== modalShenimi.shenime && tekstShenimi === '' && (
                  <button onClick={ruajShenimin} disabled={dukeShenon}
                    className="text-sm px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50">
                    Fshi Shënimin
                  </button>
                )}
                <button onClick={ruajShenimin} disabled={dukeShenon}
                  className="btn-primary text-sm px-4">
                  {dukeShenon ? 'Duke ruajtur...' : 'Ruaj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
