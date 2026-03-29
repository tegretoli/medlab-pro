import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, Search, Filter, ChevronLeft, ChevronRight,
  RefreshCw, Clock, AlertTriangle, Download, FileText, X,
} from 'lucide-react';
import api from '../../services/api';

const KATEGORITE = ['', 'Auth', 'Pacient', 'Laborator', 'Rezultat', 'Financa', 'Settings', 'Perdorues', 'Tjeter'];

const KAT_C = {
  Auth:      { bg: 'bg-blue-100',   text: 'text-blue-700' },
  Pacient:   { bg: 'bg-green-100',  text: 'text-green-700' },
  Laborator: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Rezultat:  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  Financa:   { bg: 'bg-orange-100', text: 'text-orange-700' },
  Settings:  { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Perdorues: { bg: 'bg-pink-100',   text: 'text-pink-700' },
  Tjeter:    { bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('sq-AL') + ' ' + dt.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const parseJson = (s) => {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
};

function VleraDisplay({ label, vlera }) {
  if (!vlera) return null;
  const parsed = parseJson(vlera);
  const isObj  = typeof parsed === 'object' && parsed !== null;
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      {isObj ? (
        <div className="space-y-0.5">
          {Object.entries(parsed).map(([k, v]) => (
            <div key={k} className="text-xs font-mono">
              <span className="text-gray-500">{k}: </span>
              <span className="text-gray-800">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs font-mono text-gray-800">{String(parsed)}</div>
      )}
    </div>
  );
}

export default function AuditLogs() {
  const [logs,      setLogs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [totalAlr,  setTotalAlr]  = useState(0);
  const [faqe,      setFaqe]      = useState(1);
  const [faqetTot,  setFaqetTot]  = useState(1);
  const [duke,      setDuke]      = useState(false);
  const [zgjeruarId, setZgjeruarId] = useState(null);

  // Filtra
  const [kerko,      setKerko]      = useState('');
  const [kategorija, setKategorija] = useState('');
  const [statusi,    setStatusi]    = useState('');
  const [dataFillim, setDataFillim] = useState('');
  const [dataMbarim, setDataMbarim] = useState('');
  const [perdorues,  setPerdorues]  = useState('');
  const [veprimi,    setVeprimi]    = useState('');
  const [vetemAlarme, setVetemAlarme] = useState(false);

  const ngarko = useCallback(async (f = 1) => {
    setDuke(true);
    try {
      const params = { faqe: f, limit: 50 };
      if (kerko)      params.kerko      = kerko;
      if (kategorija) params.kategorija = kategorija;
      if (statusi)    params.statusi    = statusi;
      if (dataFillim) params.dataFillim = dataFillim;
      if (dataMbarim) params.dataMbarim = dataMbarim;
      if (perdorues)  params.perdorues  = perdorues;
      if (veprimi)    params.veprimi    = veprimi;
      if (vetemAlarme) params.alarmi    = 'true';

      const { data } = await api.get('/audit', { params });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalAlr(data.totalAlarme || 0);
      setFaqe(data.faqe);
      setFaqetTot(data.faqetTotal);
    } catch { /* silent */ }
    finally { setDuke(false); }
  }, [kerko, kategorija, statusi, dataFillim, dataMbarim, perdorues, veprimi, vetemAlarme]);

  useEffect(() => { ngarko(1); }, []);

  const handleSearch = (e) => { e.preventDefault(); ngarko(1); };

  const pastroFiltrat = () => {
    setKerko(''); setKategorija(''); setStatusi('');
    setDataFillim(''); setDataMbarim(''); setPerdorues(''); setVeprimi(''); setVetemAlarme(false);
  };

  // Export
  const eksporto = async (tipi) => {
    const params = new URLSearchParams();
    if (kerko)      params.set('kerko', kerko);
    if (kategorija) params.set('kategorija', kategorija);
    if (statusi)    params.set('statusi', statusi);
    if (dataFillim) params.set('dataFillim', dataFillim);
    if (dataMbarim) params.set('dataMbarim', dataMbarim);
    if (perdorues)  params.set('perdorues', perdorues);
    if (vetemAlarme) params.set('alarmi', 'true');

    const token = sessionStorage.getItem('token');
    const url   = `/api/audit/eksport-${tipi}?${params}`;
    const resp  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob  = await resp.blob();
    const a     = document.createElement('a');
    a.href      = URL.createObjectURL(blob);
    a.download  = `audit_logs.${tipi === 'pdf' ? 'pdf' : 'xlsx'}`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldAlert size={22} className="text-[#1A3A6B]"/> Audit Logs — Regjistri i Veprimeve
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gjurmimi i të gjitha veprimeve në sistem</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => eksporto('excel')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download size={14}/> Excel
          </button>
          <button onClick={() => eksporto('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50">
            <FileText size={14}/> PDF
          </button>
          <button onClick={() => ngarko(1)} disabled={duke}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1A3A6B] text-white rounded-lg text-sm hover:bg-[#15305a] disabled:opacity-60">
            <RefreshCw size={14} className={duke ? 'animate-spin' : ''}/> Rifreso
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="text-xl font-bold text-gray-800">{total.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-0.5">Regjistrime gjithsej</div>
        </div>
        <div className={`rounded-xl border px-4 py-3 cursor-pointer transition-colors ${vetemAlarme ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-200'}`}
          onClick={() => { setVetemAlarme(!vetemAlarme); }}>
          <div className="text-xl font-bold text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={16}/> {totalAlr.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Alarme kritike {vetemAlarme ? '(aktiv)' : '— kliko për filtër'}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="text-xl font-bold text-gray-800">{faqetTot}</div>
          <div className="text-xs text-gray-500 mt-0.5">Faqe gjithsej</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch}>
          <div className="flex flex-wrap gap-2.5 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 block mb-1">Kërkim i lirë</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={kerko} onChange={e => setKerko(e.target.value)}
                  className="input pl-7 text-sm py-1.5 w-full" placeholder="Kërko veprim, objekt..."/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Përdoruesi</label>
              <input value={perdorues} onChange={e => setPerdorues(e.target.value)}
                className="input text-sm py-1.5 w-36" placeholder="Emri..."/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Kategoria</label>
              <select value={kategorija} onChange={e => setKategorija(e.target.value)} className="input text-sm py-1.5">
                {KATEGORITE.map(k => <option key={k} value={k}>{k || 'Të gjitha'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Veprimi</label>
              <input value={veprimi} onChange={e => setVeprimi(e.target.value)}
                className="input text-sm py-1.5 w-36" placeholder="p.sh. LOGIN..."/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Statusi</label>
              <select value={statusi} onChange={e => setStatusi(e.target.value)} className="input text-sm py-1.5">
                <option value="">Të gjitha</option>
                <option value="sukses">Sukses</option>
                <option value="deshtoi">Dështoi</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Nga data</label>
              <input type="date" value={dataFillim} onChange={e => setDataFillim(e.target.value)} className="input text-sm py-1.5"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Deri më</label>
              <input type="date" value={dataMbarim} onChange={e => setDataMbarim(e.target.value)} className="input text-sm py-1.5"/>
            </div>
            <button type="submit" className="px-4 py-1.5 bg-[#1A3A6B] text-white rounded-lg text-sm hover:bg-[#15305a]">
              <Filter size={13} className="inline mr-1"/> Filtro
            </button>
            <button type="button" onClick={pastroFiltrat} className="px-3 py-1.5 text-gray-500 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
              <X size={13} className="inline mr-1"/> Pastro
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {duke ? (
          <div className="text-center py-14 text-gray-400">
            <RefreshCw size={28} className="mx-auto mb-3 animate-spin opacity-40"/>
            <p className="text-sm">Duke ngarkuar logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <ShieldAlert size={36} className="mx-auto mb-3 opacity-20"/>
            <p className="text-sm">Nuk u gjetën log-e për këto filtra</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-3 w-6"></th>
                  <th className="px-3 py-3">Koha</th>
                  <th className="px-3 py-3">Përdoruesi</th>
                  <th className="px-3 py-3">Kategoria</th>
                  <th className="px-3 py-3">Veprimi</th>
                  <th className="px-3 py-3">Objekti</th>
                  <th className="px-3 py-3">Përshkrimi</th>
                  <th className="px-3 py-3">IP</th>
                  <th className="px-3 py-3 text-center">St.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => {
                  const kn      = KAT_C[log.kategorija] || KAT_C.Tjeter;
                  const isAlarm = log.alarmi;
                  const zgjeruar = zgjeruarId === log._id;
                  return (
                    <>
                      <tr key={log._id}
                        className={`cursor-pointer transition-colors ${isAlarm ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                        onClick={() => setZgjeruarId(zgjeruar ? null : log._id)}>
                        {/* Alarm indicator */}
                        <td className="pl-3 py-2.5">
                          {isAlarm && <AlertTriangle size={13} className="text-red-500"/>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap font-mono">
                          <div className="flex items-center gap-1">
                            <Clock size={10} className="text-gray-400"/>
                            {fmtDate(log.createdAt)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 bg-[#1A3A6B] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {log.perdoruesEmri?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className={`font-medium text-xs whitespace-nowrap ${isAlarm ? 'text-red-800' : 'text-gray-800'}`}>{log.perdoruesEmri}</div>
                              <div className="text-gray-400 text-xs capitalize">{log.perdoruesRoli}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${kn.bg} ${kn.text}`}>
                            {log.kategorija || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${isAlarm ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            {log.veprimi}
                          </code>
                          {log.alarmTipi && (
                            <div className="text-xs text-red-500 mt-0.5 font-medium">⚠ {log.alarmTipi}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[130px] truncate" title={log.rekordEmri}>
                          {log.rekordEmri || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[180px] truncate" title={log.pershkrimi}>
                          {log.pershkrimi || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-400 font-mono whitespace-nowrap">{log.ipAdresa || '—'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${log.statusi === 'sukses' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.statusi === 'sukses' ? '✓' : '✗'}
                          </span>
                        </td>
                      </tr>

                      {/* Rreshti i zgjeruar — vlerat e vjetra/re */}
                      {zgjeruar && (log.vleraVjeter || log.vleraRe || log.pershkrimi) && (
                        <tr key={`${log._id}_det`} className={isAlarm ? 'bg-red-50' : 'bg-blue-50'}>
                          <td colSpan={9} className="px-6 py-3">
                            <div className="flex gap-6 flex-wrap">
                              {log.pershkrimi && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 mb-0.5">Përshkrimi i plotë</div>
                                  <div className="text-xs text-gray-700">{log.pershkrimi}</div>
                                </div>
                              )}

                              {/* Diff kritik: krahaso vlerat e vjetra vs te reja per-komponent */}
                              {(log.alarmTipi === 'NDRYSHIM_REZULTATI' || log.alarmTipi === 'REZULTAT_PAS_VALIDIMIT') &&
                               Array.isArray(log.vleraVjeter) && Array.isArray(log.vleraRe) && (() => {
                                const ndryshimet = log.vleraRe
                                  .map(rRe => {
                                    const rVj = log.vleraVjeter.find(v => v.komponenti === rRe.komponenti);
                                    const ndryshoi = rVj && rVj.vlera != null && rVj.vlera !== '' && String(rVj.vlera) !== String(rRe.vlera);
                                    return ndryshoi ? { komponenti: rRe.komponenti, vjeter: rVj.vlera, ri: rRe.vlera, njesia: rRe.njesia || '' } : null;
                                  })
                                  .filter(Boolean);
                                if (!ndryshimet.length) return null;
                                return (
                                  <div className="bg-white rounded-xl border-2 border-red-300 px-4 py-3 min-w-[240px]">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <span className="text-xs font-bold text-red-700 uppercase tracking-wide">⚠ Ndryshimet e Rezultateve</span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {ndryshimet.map((n, ni) => (
                                        <div key={ni} className="flex items-center gap-2 text-xs">
                                          <span className="font-medium text-gray-600 w-24 truncate" title={n.komponenti}>{n.komponenti}</span>
                                          <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-mono font-bold line-through">{n.vjeter}</span>
                                          <span className="text-gray-400">→</span>
                                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-mono font-bold">{n.ri}</span>
                                          {n.njesia && <span className="text-gray-400">{n.njesia}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Vlerat e plota (pa diff) */}
                              {log.vleraVjeter && log.alarmTipi !== 'NDRYSHIM_REZULTATI' && log.alarmTipi !== 'REZULTAT_PAS_VALIDIMIT' && (
                                <div className="bg-white/70 rounded-lg px-3 py-2 border border-red-100 min-w-[160px]">
                                  <VleraDisplay label="⬅ Vlera e vjetër" vlera={log.vleraVjeter}/>
                                </div>
                              )}
                              {log.vleraRe && log.alarmTipi !== 'NDRYSHIM_REZULTATI' && log.alarmTipi !== 'REZULTAT_PAS_VALIDIMIT' && (
                                <div className="bg-white/70 rounded-lg px-3 py-2 border border-green-100 min-w-[160px]">
                                  <VleraDisplay label="➡ Vlera e re" vlera={log.vleraRe}/>
                                </div>
                              )}

                              {log.rekordId && (
                                <div>
                                  <div className="text-xs text-gray-400">Rekord ID</div>
                                  <code className="text-xs font-mono text-gray-600">{log.rekordId}</code>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {faqetTot > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => ngarko(faqe - 1)} disabled={faqe <= 1 || duke}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft size={16}/>
          </button>
          <span className="text-sm text-gray-600">Faqe <strong>{faqe}</strong> nga <strong>{faqetTot}</strong></span>
          <button onClick={() => ngarko(faqe + 1)} disabled={faqe >= faqetTot || duke}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <ChevronRight size={16}/>
          </button>
        </div>
      )}
    </div>
  );
}
