import { useState, useRef } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Search, ChevronDown, ChevronUp, Calendar, FlaskConical, Eye, FileText, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const depNgjyra = {
  Biokimi: 'bg-blue-100 text-blue-700',
  Mikrobiologji: 'bg-green-100 text-green-700',
  PCR: 'bg-purple-100 text-purple-700',
};

const flamurStyle = {
  Normal: 'text-green-700', Larte: 'text-orange-600 font-bold',
  Shume_Larte: 'text-red-700 font-bold', Ulet: 'text-blue-600 font-bold',
  Shume_Ulet: 'text-purple-700 font-bold', '·': 'text-gray-400',
};

export default function Arkiva() {
  const navigate = useNavigate();
  const [kerko, setKerko]           = useState('');
  const [sugjerimet, setSugjerimet] = useState([]);
  const [pacZgjedhur, setPacZgjedhur] = useState(null);
  const [historiku, setHistoriku]   = useState(null);
  const [ngarkimi, setNgarkimi]     = useState(false);
  const [teZgjeruara, setTeZgjeruara] = useState({});
  const [pdfDuke, setPdfDuke]       = useState(null); // porosiId qe po gjenerohet
  const timerRef = useRef(null);

  const hapPDF = async (porosiId, numrPorosi) => {
    setPdfDuke(porosiId);
    const win = window.open('', '_blank');
    try {
      const resp = await api.get(`/laborator/porosi/${porosiId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url  = window.URL.createObjectURL(blob) + '#' + encodeURIComponent(`${numrPorosi}.pdf`);
      if (win) {
        win.location.href = url;
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch {
      if (win) win.close();
      toast.error('Gabim gjatë hapjes së PDF');
    }
    setPdfDuke(null);
  };

  const kerkoPacientin = (v) => {
    setKerko(v);
    clearTimeout(timerRef.current);
    if (v.length < 2) { setSugjerimet([]); return; }
    timerRef.current = setTimeout(() => {
      api.get('/pacientet/kerko', { params: { q: v } })
        .then(r => setSugjerimet(r.data.pacientet)).catch(() => {});
    }, 300);
  };

  const zgjidhPacientin = async (pac) => {
    setPacZgjedhur(pac);
    setSugjerimet([]);
    setKerko(`${pac.emri} ${pac.mbiemri}`);
    setNgarkimi(true);
    try {
      const r = await api.get(`/laborator/historiku/${pac._id}`);
      setHistoriku(r.data);
    } catch {
      setHistoriku({ porosite: [], sipasDateve: {} });
    }
    setNgarkimi(false);
  };

  const toggleDate = (data) => setTeZgjeruara(p => ({ ...p, [data]: !p[data] }));

  const datat = historiku ? Object.keys(historiku.sipasDateve).sort().reverse() : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Arkiva e Rezultateve</h1>
        <p className="text-gray-500 text-sm">Kerko pacient per te pare historikun e plote te analizave</p>
      </div>

      {/* Kerkim */}
      <div className="card">
        <div className="relative max-w-lg">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10 text-base"
            placeholder="Kerko sipas emrit, NID, telefonit..."
            value={kerko}
            onChange={e => kerkoPacientin(e.target.value)}
            autoFocus
          />
          {sugjerimet.length > 0 && (
            <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
              {sugjerimet.map(p => (
                <button key={p._id} onClick={() => zgjidhPacientin(p)}
                  className="w-full px-4 py-3 text-left hover:bg-primary/5 flex items-center gap-3 border-b last:border-0 transition-colors">
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {p.emri[0]}{p.mbiemri[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{p.emri} {p.mbiemri}</p>
                    <p className="text-xs text-gray-400">NID: {p.numrPersonal} · {p.telefoni}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rezultatet */}
      {ngarkimi && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {pacZgjedhur && !ngarkimi && historiku && (
        <div className="space-y-4">
          {/* Header pacienti */}
          <div className="card bg-gradient-to-r from-primary/5 to-transparent flex items-center gap-4 py-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-xl">
              {pacZgjedhur.emri[0]}{pacZgjedhur.mbiemri[0]}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-xl text-gray-800">{pacZgjedhur.emri} {pacZgjedhur.mbiemri}</h2>
              <p className="text-sm text-gray-500">NID: {pacZgjedhur.numrPersonal} · Tel: {pacZgjedhur.telefoni}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{historiku.porosite.length}</p>
              <p className="text-xs text-gray-500">vizita gjithsej</p>
            </div>
          </div>

          {datat.length === 0 ? (
            <div className="card text-center py-12">
              <FlaskConical size={40} className="mx-auto mb-2 text-gray-200" />
              <p className="text-gray-400">Asnje rezultat i gjetur per kete pacient</p>
            </div>
          ) : datat.map(data => {
            const porosite = historiku.sipasDateve[data];
            const hapur    = teZgjeruara[data] !== false; // default hapur

            return (
              <div key={data} className="card overflow-hidden p-0">
                {/* Header dates */}
                <button
                  onClick={() => toggleDate(data)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-primary" />
                    <span className="font-semibold text-gray-800">
                      {new Date(data).toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="text-sm text-gray-400">· {porosite.length} porosi</span>
                  </div>
                  {hapur ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {hapur && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {porosite.map(p => (
                      <div key={p._id} className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${depNgjyra[p.departamenti] || 'bg-gray-100 text-gray-600'}`}>
                              {p.departamenti}
                            </span>
                            <span className="text-xs text-gray-400">{p.numrPorosi}</span>
                            {p.tipiPacientit === 'bashkpuntor' && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Bashkpuntor</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => hapPDF(p._id, p.numrPorosi)}
                              disabled={pdfDuke === p._id}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 hover:underline disabled:opacity-50"
                            >
                              {pdfDuke === p._id
                                ? <Loader size={12} className="animate-spin"/>
                                : <FileText size={13}/>
                              } PDF
                            </button>
                            <button
                              onClick={() => navigate(`/laboratori/rezultate/${p._id}`)}
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Eye size={13}/> Detajet
                            </button>
                          </div>
                        </div>

                        {/* Analizat me rezultate */}
                        <div className="space-y-2 ml-2">
                          {p.analizat?.map(a => (
                            <div key={a._id} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                              <span className="text-sm font-semibold text-gray-700 min-w-32">{a.analiza?.emri}:</span>
                              {a.kompletuar ? (
                                <span className="flex flex-wrap gap-1.5">
                                  {a.rezultate?.map((r, ri) => (
                                    <span key={ri} className={`text-sm ${flamurStyle[r.flamuri] || ''}`}>
                                      {r.komponenti && <span className="text-gray-400 text-xs">{r.komponenti}: </span>}
                                      <strong>{r.vlera}</strong>
                                      {r.njesia && <span className="text-gray-400 text-xs"> {r.njesia}</span>}
                                      {ri < a.rezultate.length - 1 && <span className="text-gray-300"> · </span>}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-300 italic">pa rezultate</span>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                          <span>{p.cmimi?.toLocaleString()} EUR</span>
                          <span>{new Date(p.dataPorosis).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!pacZgjedhur && !ngarkimi && (
        <div className="card text-center py-20 bg-gray-50/50">
          <Search size={52} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">Shkruaj emrin e pacientit</p>
          <p className="text-gray-300 text-sm mt-1">Shfaqen te gjitha analizat e kaluara sipas datave</p>
        </div>
      )}
    </div>
  );
}
