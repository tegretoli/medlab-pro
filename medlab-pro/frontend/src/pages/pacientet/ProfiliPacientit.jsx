// ProfiliPacientit.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { merrPacientin, perditesoPacientin } from '../../store/slices/pacientetSlice';
import { FlaskConical, Calendar, ChevronLeft, Pencil, X, AlertTriangle, TrendingUp, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProfiliPacientit() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { pacientiAktual: p, ngarkimi } = useSelector(s => s.pacientet);

  const navigate = useNavigate();
  const [modalEdit, setModalEdit] = useState(false);
  const [formEdit, setFormEdit]   = useState({});
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const [borxhi, setBorxhi]           = useState(null);
  const [modalBorxh, setModalBorxh]   = useState(false);
  const [tab, setTab]                 = useState('profili');  // 'profili' | 'grafiku'
  const [trendet, setTrendet]         = useState([]);
  const [ngarkonGrafik, setNgarkonGrafik] = useState(false);
  const [grafikiZgjedhur, setGrafikiZgjedhur] = useState(null); // index of selected trend

  useEffect(() => { dispatch(merrPacientin(id)); }, [id]);

  useEffect(() => {
    if (!id) return;
    api.get(`/pagesat/pacienti/${id}/borxhi`)
      .then(r => setBorxhi(r.data))
      .catch(() => setBorxhi(null));
  }, [id]);

  useEffect(() => {
    if (tab !== 'grafiku' || !id) return;
    setNgarkonGrafik(true);
    api.get(`/laborator/historiku/${id}/grafiku`)
      .then(r => {
        setTrendet(r.data.trendet || []);
        if (r.data.trendet?.length > 0) setGrafikiZgjedhur(0);
      })
      .catch(() => {})
      .finally(() => setNgarkonGrafik(false));
  }, [tab, id]);

  const hapEdit = () => {
    setFormEdit({
      emri: p.emri || '',
      mbiemri: p.mbiemri || '',
      numrPersonal: p.numrPersonal || '',
      datelindja: p.datelindja ? p.datelindja.slice(0, 10) : '',
      gjinia: p.gjinia || '',
      telefoni: p.telefoni || '',
      email: p.email || '',
      grupiGjaku: p.grupiGjaku || '',
      adresa: {
        qyteti: p.adresa?.qyteti || '',
        rruga:  p.adresa?.rruga  || '',
      },
    });
    setModalEdit(true);
  };

  const set      = (field, val) => setFormEdit(f => ({ ...f, [field]: val }));
  const setAdresa = (field, val) => setFormEdit(f => ({ ...f, adresa: { ...f.adresa, [field]: val } }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formEdit.adresa?.qyteti?.trim()) {
      toast.error('Qyteti i vendbanimit eshte i detyrueshem');
      return;
    }
    setDukeRuajtur(true);
    const result = await dispatch(perditesoPacientin({ id, te_dhena: formEdit }));
    setDukeRuajtur(false);
    if (perditesoPacientin.fulfilled.match(result)) {
      toast.success('Te dhenat u perditesuan!');
      setModalEdit(false);
    } else {
      toast.error(result.payload || 'Gabim gjate ruajtjes');
    }
  };

  if (ngarkimi && !p) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>;
  if (!p) return <div className="text-center py-20 text-gray-400">Pacienti nuk u gjet</div>;

  const mosha = p.datelindja ? new Date().getFullYear() - new Date(p.datelindja).getFullYear() : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/pacientet" className="btn-ghost p-2"><ChevronLeft size={20}/></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{p.emri} {p.mbiemri}</h1>
          <p className="text-gray-500 text-sm">NID: {p.numrPersonal}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={hapEdit} className="btn-ghost text-sm flex items-center gap-1"><Pencil size={15}/>Ndrysho</button>
          <button
            onClick={() => borxhi?.totalShuma > 0 ? setModalBorxh(true) : navigate(`/laboratori/porosi/krijo?pacientiId=${p._id}`)}
            className="btn-secondary text-sm flex items-center gap-1"
          ><FlaskConical size={15}/>Porosi Lab</button>
          <Link to={`/kontrollet/krijo?pacientiId=${p._id}`} className="btn-outline text-sm flex items-center gap-1"><Calendar size={15}/>Cakto Takim</Link>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('profili')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'profili' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          <User size={14}/> Profili
        </button>
        <button onClick={() => setTab('grafiku')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'grafiku' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          <TrendingUp size={14}/> Historiku Analitik
        </button>
      </div>

      {/* ── TAB: GRAFIKU ── */}
      {tab === 'grafiku' && (
        <div className="space-y-5">
          {ngarkonGrafik && (
            <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>
          )}
          {!ngarkonGrafik && trendet.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Nuk ka rezultate numerike të regjistruara për këtë pacient.</p>
            </div>
          )}
          {!ngarkonGrafik && trendet.length > 0 && (
            <>
              {/* Selector i analizave */}
              <div className="flex flex-wrap gap-2">
                {trendet.map((t, i) => (
                  <button key={i} onClick={() => setGrafikiZgjedhur(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      grafikiZgjedhur === i
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
                    }`}>
                    {t.komponenti} <span className="opacity-60">({t.analiza})</span>
                  </button>
                ))}
              </div>

              {/* Grafiku */}
              {grafikiZgjedhur !== null && trendet[grafikiZgjedhur] && (() => {
                const t = trendet[grafikiZgjedhur];
                const labels = t.pikat.map(p => p.data);
                const values = t.pikat.map(p => p.vlera);
                const flamujt = t.pikat.map(p => p.flamuri);

                const pointColors = flamujt.map(f =>
                  f === 'Shume_Larte' || f === 'Shume_Ulet' ? '#991B1B' :
                  f === 'Larte' || f === 'Ulet' ? '#DC2626' : '#16A34A'
                );

                const data = {
                  labels,
                  datasets: [{
                    label: `${t.komponenti} (${t.njesia || '—'})`,
                    data: values,
                    borderColor: '#1A3A6B',
                    backgroundColor: 'rgba(26,58,107,0.08)',
                    pointBackgroundColor: pointColors,
                    pointBorderColor: pointColors,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.35,
                  }],
                };

                const opts = {
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: ctx => `${ctx.parsed.y} ${t.njesia || ''}  [${flamujt[ctx.dataIndex]}]`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      grid: { color: '#f3f4f6' },
                      ticks: { font: { size: 11 } },
                    },
                    x: { ticks: { font: { size: 11 } } },
                  },
                };

                // Annotation lines for normal range
                const hasBounds = t.kritikMin != null || t.kritikMax != null;

                return (
                  <div className="card space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{t.komponenti}</h3>
                        <p className="text-xs text-gray-400">{t.analiza} · {t.njesia || 'pa njësi'}</p>
                      </div>
                      {hasBounds && (
                        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-right">
                          <p className="text-gray-400 mb-0.5">Vlerat normale</p>
                          <p className="font-medium text-gray-700">
                            {t.kritikMin ?? '—'} – {t.kritikMax ?? '—'} {t.njesia}
                          </p>
                        </div>
                      )}
                    </div>

                    <Line data={data} options={opts} />

                    {/* Tabela e vlerave */}
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b">
                            <th className="text-left py-1.5 font-medium">Data</th>
                            <th className="text-right py-1.5 font-medium">Vlera</th>
                            <th className="text-right py-1.5 font-medium">Statusi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...t.pikat].reverse().map((pt, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-1.5 text-gray-600">{pt.data}</td>
                              <td className="py-1.5 text-right font-mono font-semibold">{pt.vlera} {t.njesia}</td>
                              <td className="py-1.5 text-right">
                                <span className={`px-2 py-0.5 rounded-full font-medium ${
                                  pt.flamuri === 'Shume_Larte' ? 'bg-red-100 text-red-800' :
                                  pt.flamuri === 'Shume_Ulet'  ? 'bg-blue-100 text-blue-800' :
                                  pt.flamuri === 'Larte'       ? 'bg-orange-100 text-orange-700' :
                                  pt.flamuri === 'Ulet'        ? 'bg-cyan-100 text-cyan-700' :
                                  pt.flamuri === 'Normal'      ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>{pt.flamuri}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── TAB: PROFILI ── */}
      {tab === 'profili' && <>

      {/* Borxh alert */}
      {borxhi?.totalShuma > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700">Ky pacient ka borxh të papaguar</p>
            <p className="text-sm text-red-600">
              Totali i papaguar: <strong>€{borxhi.totalShuma.toFixed(2)}</strong> nga {borxhi.porosite.length} porosi
            </p>
          </div>
        </div>
      )}

      {/* Info kartela */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card col-span-2">
          <h3 className="font-semibold text-gray-700 mb-4">Informacioni Personal</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Emri i plote', `${p.emri} ${p.mbiemri}`],
              ['Mosha', mosha ? `${mosha} vjec` : '—'],
              ['Gjinia', p.gjinia === 'M' ? 'Mashkull' : p.gjinia === 'F' ? 'Femer' : p.gjinia],
              ['Data Lindjes', p.datelindja ? new Date(p.datelindja).toLocaleDateString('sq-AL') : '—'],
              ['Telefoni', p.telefoni],
              ['Email', p.email || '—'],
              ['Grupi Gjaku', p.grupiGjaku || 'I panjohur'],
              ['Qyteti', p.adresa?.qyteti || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-gray-400 text-xs">{k}</p>
                <p className="font-medium text-gray-800">{v}</p>
              </div>
            ))}
            <div>
              <p className="text-gray-400 text-xs">Statusi Pagesës</p>
              {borxhi?.totalShuma > 0
                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Borxh — €{borxhi.totalShuma.toFixed(0)}</span>
                : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
              }
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {/* Alergjite */}
          <div className="card py-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Alergjite</h4>
            {p.alergjite?.length ? p.alergjite.map((a,i) => (
              <div key={i} className="text-sm py-1 border-b last:border-0">
                <span className="font-medium text-red-600">{a.substance}</span>
                {a.reagimi && <span className="text-gray-500"> — {a.reagimi}</span>}
              </div>
            )) : <p className="text-xs text-gray-400">Asnje alergjie e regjistruar</p>}
          </div>
          {/* Kushtet kronike */}
          <div className="card py-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Kushtet Kronike</h4>
            {p.kushtetKronike?.length ? p.kushtetKronike.map((k,i) => (
              <div key={i} className="text-sm py-1 border-b last:border-0">
                <p className="font-medium">{k.diagnoza}</p>
                {k.kodi_ICD10 && <p className="text-xs text-gray-400">{k.kodi_ICD10}</p>}
              </div>
            )) : <p className="text-xs text-gray-400">Asnje kusht kronik</p>}
          </div>
        </div>
      </div>

      {/* Barnat aktuale */}
      {p.barnatAktuale?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3">Barnat Aktuale</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {p.barnatAktuale.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"/>
                <div>
                  <span className="font-medium">{b.emri}</span>
                  {b.doza && <span className="text-gray-500"> {b.doza}</span>}
                  {b.shpeshesia && <span className="text-gray-400"> — {b.shpeshesia}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Borxhi — porosi të papaguara */}
      {borxhi?.porosite?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            Porosi të Papaguara
            <span className="ml-auto text-sm font-normal text-red-600">Total: €{borxhi.totalShuma.toFixed(2)}</span>
          </h3>
          <div className="space-y-2">
            {borxhi.porosite.map((por, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg text-sm">
                <div>
                  <span className="font-medium text-gray-800">#{por.numrPorosi}</span>
                  <span className="text-gray-500 ml-2">{por.departamenti}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    {por.dataPorosis ? new Date(por.dataPorosis).toLocaleDateString('sq-AL') : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-red-700">€{(por.cmimi || 0).toFixed(2)}</span>
                  <Link
                    to={`/pagesat?dataFillim=${por.dataPorosis ? new Date(por.dataPorosis).toISOString().split('T')[0] : ''}&dataMbarim=${por.dataPorosis ? new Date(por.dataPorosis).toISOString().split('T')[0] : ''}&pacientiId=${p._id}`}
                    className="text-primary text-xs hover:underline"
                  >
                    Paguaj →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal konfirmim borxhi */}
      {modalBorxh && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-base">Pacienti ka borxh të papaguar</h3>
                <p className="text-sm text-gray-600 mt-1">
                  <strong>{p.emri} {p.mbiemri}</strong> ka borxh prej{' '}
                  <span className="font-semibold text-red-600">€{borxhi.totalShuma.toFixed(2)}</span>{' '}
                  nga {borxhi.porosite.length} porosi të mëparshme.
                </p>
                <p className="text-sm text-gray-500 mt-2">Dëshironi të vazhdoni me regjistrim të porosisë së re?</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalBorxh(false)} className="btn-ghost">Anulo</button>
              <button
                onClick={() => { setModalBorxh(false); navigate(`/laboratori/porosi/krijo?pacientiId=${p._id}`); }}
                className="btn-primary"
              >Po, Vazhdo</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {modalEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Ndrysho te Dhenat e Pacientit</h2>
              <button onClick={() => setModalEdit(false)} className="btn-ghost p-1"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-5">
              {/* Informacioni Personal */}
              <div>
                <h3 className="font-medium text-gray-700 border-b pb-2 mb-3">Informacioni Personal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Emri *</label>
                    <input className="input" value={formEdit.emri} onChange={e=>set('emri',e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Mbiemri *</label>
                    <input className="input" value={formEdit.mbiemri} onChange={e=>set('mbiemri',e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Numri Personal</label>
                    <input className="input font-mono" value={formEdit.numrPersonal} onChange={e=>set('numrPersonal',e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Data e Lindjes *</label>
                    <input type="date" className="input" value={formEdit.datelindja} max="9999-12-31" onChange={e=>set('datelindja',e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Gjinia *</label>
                    <select className="input" value={formEdit.gjinia} onChange={e=>set('gjinia',e.target.value)} required>
                      <option value="">Zgjidh...</option>
                      <option value="M">Mashkull</option>
                      <option value="F">Femer</option>
                      <option value="Tjeter">Tjeter</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Grupi i Gjakut</label>
                    <select className="input" value={formEdit.grupiGjaku} onChange={e=>set('grupiGjaku',e.target.value)}>
                      <option value="">I panjohur</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {/* Kontakti & Adresa */}
              <div>
                <h3 className="font-medium text-gray-700 border-b pb-2 mb-3">Kontakti & Adresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Telefoni *</label>
                    <input className="input" value={formEdit.telefoni} onChange={e=>set('telefoni',e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={formEdit.email} onChange={e=>set('email',e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Qyteti * <span className="text-xs font-normal text-gray-400">(vendbanimi)</span></label>
                    <input className="input" value={formEdit.adresa?.qyteti || ''} onChange={e=>setAdresa('qyteti',e.target.value)} placeholder="p.sh. Tirane" required />
                  </div>
                  <div>
                    <label className="label">Rruga / Adresa</label>
                    <input className="input" value={formEdit.adresa?.rruga || ''} onChange={e=>setAdresa('rruga',e.target.value)} placeholder="p.sh. Rr. Kavajes, Nr. 5" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModalEdit(false)} className="btn-ghost">Anulo</button>
                <button type="submit" disabled={duke_ruajtur} className="btn-primary px-8">
                  {duke_ruajtur ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </> /* end tab profili */}

    </div>
  );
}
