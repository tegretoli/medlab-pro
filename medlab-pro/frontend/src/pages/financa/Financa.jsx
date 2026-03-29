import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Users, UserCheck, Calendar, BarChart2,
  FlaskConical, Building2, Download, RefreshCw, ChevronRight,
  Banknote, AlertCircle, Percent, Award, FileText, Eye, Printer, Archive, User, Plus, X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const muajEmri = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nen','Dhj'];
const fmt  = (n) => Number(n || 0).toFixed(1);
const fmtN = (n) => Number(n || 0).toLocaleString('sq-AL');

const DEP_COLORS = {
  Biokimi:      '#3B82F6',
  Mikrobiologji:'#22C55E',
  PCR:          '#A855F7',
  Hematologji:  '#EF4444',
  Urinalize:    '#F59E0B',
  Hormoni:      '#EC4899',
  Serologji:    '#14B8A6',
};

const TABS = [
  { id: 'dashboard',      label: 'Dashboard',              icon: BarChart2 },
  { id: 'raportet',       label: 'Raportet',               icon: TrendingUp },
  { id: 'komisjonet',     label: 'Komisjonet',             icon: Percent },
  { id: 'borxhet',        label: 'Borxhet',                icon: AlertCircle },
  { id: 'faturat',        label: 'Faturat Kompanive',      icon: Building2 },
  { id: 'arkiva',         label: 'Fatura Kompani Arkivë',  icon: Archive },
  { id: 'fat-pac',        label: 'Fatura Pacient',         icon: User },
  { id: 'arkiva-pac',     label: 'Fatura Pacient Arkivë',  icon: Archive },
];

// ─── Date input row ───────────────────────────────────────────────────────────
function DateFilter({ df, dm, onDf, onDm, onApply, onClear, loading }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" className="input text-sm py-1.5 w-36" value={df} max="9999-12-31" onChange={e => onDf(e.target.value)} />
      <span className="text-gray-400 text-sm">—</span>
      <input type="date" className="input text-sm py-1.5 w-36" value={dm} max="9999-12-31" onChange={e => onDm(e.target.value)} />
      <button onClick={onApply} disabled={loading}
        className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1.5">
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Filtro
      </button>
      {(df || dm) && (
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600 underline">Pastro</button>
      )}
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function TabDashboard() {
  const [data, setData]       = useState(null);
  const [raport, setRaport]   = useState([]);
  const [viti, setViti]       = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const ngarko = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/financa/dashboard'),
      api.get('/financa/raport/mujor', { params: { viti } }),
    ]).then(([d, r]) => {
      setData(d.data);
      setRaport(r.data.raport || []);
    }).catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  }, [viti]);

  useEffect(() => { ngarko(); }, [ngarko]);

  if (loading && !data) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>;

  const maxMuaj = Math.max(...raport.map(r => r.total), 1);

  const kartelat = [
    { label: 'Sot',  val: data?.sotTotal,  cnt: data?.sotCount,  color: 'bg-blue-500',   icon: Calendar },
    { label: 'Java', val: data?.javaTotal, cnt: data?.javaCount, color: 'bg-indigo-500',  icon: TrendingUp },
    { label: 'Muaji',val: data?.muajiTotal,cnt: data?.muajiCount,color: 'bg-green-500',   icon: TrendingUp },
    { label: 'Viti', val: data?.vitiTotal, cnt: data?.vitiCount, color: 'bg-primary',     icon: Award },
    { label: 'Borxhe',val:data?.borxhTotal,cnt: data?.borxhCount,color: 'bg-red-500',     icon: TrendingDown },
  ];

  return (
    <div className="space-y-6">
      {/* Year selector for chart */}
      <div className="flex justify-end">
        <select className="input w-auto text-sm" value={viti} onChange={e => setViti(Number(e.target.value))}>
          {[2024,2025,2026,2027].map(v => <option key={v}>{v}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kartelat.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card py-4">
              <div className={`${k.color} w-9 h-9 rounded-xl flex items-center justify-center text-white mb-2.5`}>
                <Icon size={17}/>
              </div>
              <p className="text-xl font-bold text-gray-800">{fmt(k.val)} <span className="text-sm font-normal text-gray-400">EUR</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label} · {fmtN(k.cnt)} porosi</p>
            </div>
          );
        })}
      </div>

      {/* Bar chart + Top analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly chart */}
        <div className="card lg:col-span-2">
          <h2 className="font-bold text-gray-800 mb-4">Te Ardhura Mujore · {viti}</h2>
          <div className="flex items-end gap-1 h-36">
            {muajEmri.map((emri, i) => {
              const d = raport.find(r => r._id === i + 1);
              const total = d?.total || 0;
              const lart  = maxMuaj > 0 ? Math.max(Math.round((total / maxMuaj) * 100), total > 0 ? 3 : 0) : 0;
              return (
                <div key={emri} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                    {fmt(total)}
                  </span>
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100px' }}>
                    <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all duration-500 hover:bg-blue-400"
                      style={{ height: `${lart}%` }}/>
                  </div>
                  <span className="text-[10px] text-gray-500">{emri}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top analyses */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FlaskConical size={15} className="text-primary"/> Top Analiza
          </h2>
          {(data?.topAnaliza || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Asnje te dhene</p>
          ) : (
            <div className="space-y-2.5">
              {(data?.topAnaliza || []).map((a, i) => (
                <div key={a._id} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{a.emri}</p>
                    <p className="text-xs text-gray-400">{a.departamenti}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 flex-shrink-0">{fmtN(a.count)}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top departments + Top doctors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Departments */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-indigo-500"/> Te Ardhura sipas Departamentit
          </h2>
          {(data?.topDep || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Asnje te dhene</p>
          ) : (() => {
            const maxDep = Math.max(...(data.topDep).map(d => d.total), 1);
            const gjithsej = (data.topDep).reduce((s, d) => s + d.total, 0);
            return (
              <div className="space-y-3">
                {data.topDep.map(d => {
                  const prc = maxDep > 0 ? Math.round(d.total / maxDep * 100) : 0;
                  const prcTotal = gjithsej > 0 ? Math.round(d.total / gjithsej * 100) : 0;
                  const col = DEP_COLORS[d._id] || '#6B7280';
                  return (
                    <div key={d._id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="flex items-center gap-1.5 font-medium text-gray-700">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }}/>
                          {d._id}
                          <span className="text-xs text-gray-400 font-normal">({fmtN(d.count)})</span>
                        </span>
                        <span className="text-gray-600 font-semibold">{fmt(d.total)} EUR <span className="text-xs text-gray-400 font-normal">{prcTotal}%</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${prc}%`, background: col }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Top doctors */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserCheck size={15} className="text-green-600"/> Top Doktoret Referues
          </h2>
          {(data?.topDoktor || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Asnje referim i regjistruar</p>
          ) : (
            <div className="space-y-3">
              {data.topDoktor.map((d, i) => (
                <div key={d._id} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.emri}</p>
                    <p className="text-xs text-gray-400 truncate">{d.institucioni || d.tipi}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-700">{fmtN(d.count)} pac.</p>
                    <p className="text-xs text-gray-400">{fmt(d.totalSherbime)} EUR</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── RAPORTET TAB ─────────────────────────────────────────────────────────────
function TabRaportet() {
  const [nenTab, setNenTab]         = useState('departamenteve');
  const [loading, setLoading]       = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [df, setDf]                 = useState('');
  const [dm, setDm]                 = useState('');
  const [dataAnaliza, setDA]    = useState([]);
  const [dataDep, setDD]        = useState({ raporti: [], gjithsej: 0 });

  const ngarko = useCallback(() => {
    setLoading(true);
    const params = {};
    if (df) params.dataFillim = df;
    if (dm) params.dataMbarim = dm;
    const endpoint = nenTab === 'analizave'
      ? api.get('/financa/raport/analizave', { params })
      : api.get('/financa/raport/departamenteve', { params });
    endpoint
      .then(r => {
        if (nenTab === 'analizave') setDA(r.data.raporti || []);
        else setDD({ raporti: r.data.raporti || [], gjithsej: r.data.gjithsej || 0 });
      })
      .catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  }, [nenTab, df, dm]);

  useEffect(() => { ngarko(); }, [ngarko]);

  const eksport = async () => {
    setLoadingExp(true);
    try {
      const params = { tipi: nenTab };
      if (df) params.dataFillim = df;
      if (dm) params.dataMbarim = dm;
      const resp = await api.get('/financa/eksport/excel', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url; a.download = `Raporti_${nenTab}_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Gabim gjate eksportit Excel'); }
    setLoadingExp(false);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'departamenteve', label: 'Sipas Departamentit' },
          { id: 'analizave',      label: 'Sipas Analizave' },
        ].map(t => (
          <button key={t.id} onClick={() => setNenTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${nenTab === t.id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateFilter df={df} dm={dm} onDf={setDf} onDm={setDm}
          onApply={ngarko} onClear={() => { setDf(''); setDm(''); }}
          loading={loading}/>
        <button onClick={eksport} disabled={loadingExp} className="btn-ghost text-sm flex items-center gap-1.5 border border-gray-200 disabled:opacity-60">
          <Download size={14} className={loadingExp ? 'animate-bounce' : ''}/> {loadingExp ? 'Duke shkarkuar...' : 'Eksport Excel'}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>
      ) : nenTab === 'departamenteve' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Departamenti</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Nr Testeve</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Te Ardhura</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Mesatarja</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">% Totalit</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dataDep.raporti.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Asnje te dhene</td></tr>
              ) : dataDep.raporti.map(r => {
                const col = DEP_COLORS[r._id] || '#6B7280';
                return (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: col }}/>
                        {r._id || 'Pa departament'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.numriTesteve)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(r.totalTe_ardhura)} EUR</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(r.mesatarja)} EUR</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{r.perqindja}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-1.5 rounded-full" style={{ width: `${r.perqindja}%`, background: col }}/>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {dataDep.raporti.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                  <td className="px-4 py-3 text-gray-800">Gjithsej</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmtN(dataDep.raporti.reduce((s,r)=>s+r.numriTesteve,0))}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(dataDep.gjithsej)} EUR</td>
                  <td colSpan={3}/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Analiza</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Departamenti</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Nr Testeve</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Te Ardhura</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Mesatarja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dataAnaliza.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Asnje te dhene</td></tr>
              ) : dataAnaliza.map((r, i) => (
                <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.emri}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: (DEP_COLORS[r.departamenti] || '#6B7280') + '20', color: DEP_COLORS[r.departamenti] || '#6B7280' }}>
                      {r.departamenti || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.count)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{fmt(r.totalTe_ardhura)} EUR</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(r.mesatarja)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── KOMISJONET TAB ───────────────────────────────────────────────────────────
function TabKomisjonet() {
  const [data, setData]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [df, setDf]               = useState('');
  const [dm, setDm]               = useState('');

  const ngarko = useCallback(() => {
    setLoading(true);
    const params = {};
    if (df) params.dataFillim = df;
    if (dm) params.dataMbarim = dm;
    api.get('/financa/komisjonet', { params })
      .then(r => { setData(r.data.raporti || []); setTotal(r.data.totalKomisione || 0); })
      .catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  }, [df, dm]);

  useEffect(() => { ngarko(); }, [ngarko]);

  const eksport = async () => {
    setLoadingExp(true);
    try {
      const params = { tipi: 'komisjoneve' };
      if (df) params.dataFillim = df;
      if (dm) params.dataMbarim = dm;
      const resp = await api.get('/financa/eksport/excel', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url; a.download = `Raporti_komisjoneve_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Gabim gjate eksportit Excel'); }
    setLoadingExp(false);
  };

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card py-4">
          <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center mb-2.5">
            <Percent size={17} className="text-purple-600"/>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmt(total)} <span className="text-sm font-normal text-gray-400">EUR</span></p>
          <p className="text-xs text-gray-500">Total Komisione</p>
        </div>
        <div className="card py-4">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center mb-2.5">
            <UserCheck size={17} className="text-green-600"/>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtN(data.length)}</p>
          <p className="text-xs text-gray-500">Doktore/Referues Aktiv</p>
        </div>
        <div className="card py-4">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center mb-2.5">
            <Users size={17} className="text-blue-600"/>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtN(data.reduce((s,r)=>s+r.numriPacienteve,0))}</p>
          <p className="text-xs text-gray-500">Gjithsej Paciente te Referuar</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateFilter df={df} dm={dm} onDf={setDf} onDm={setDm}
          onApply={ngarko} onClear={() => { setDf(''); setDm(''); }}
          loading={loading}/>
        <button onClick={eksport} disabled={loadingExp} className="btn-ghost text-sm flex items-center gap-1.5 border border-gray-200 disabled:opacity-60">
          <Download size={14} className={loadingExp ? 'animate-bounce' : ''}/> {loadingExp ? 'Duke shkarkuar...' : 'Eksport Excel'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Doktori / Referuesi</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Institucioni</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Nr Pac.</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Sherbime</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Komisioni</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Vlera Kom.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Asnje te dhene</td></tr>
              ) : data.map(r => (
                <tr key={r.referuesId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{r.emri}</p>
                    {r.specialiteti && <p className="text-xs text-gray-400">{r.specialiteti}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.institucioni || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.tipi === 'Doktor' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {r.tipi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.numriPacienteve)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{fmt(r.totalSherbime)} EUR</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {r.komisioniTipi === '—' ? (
                      <span className="text-gray-300">Pa komisioni</span>
                    ) : r.komisioniTipi === 'Perqindje' ? (
                      <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">{r.komisioniVlera}%</span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{fmt(r.komisioniVlera)} EUR/pac</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.komisionShuma > 0 ? (
                      <span className="font-bold text-green-700">{fmt(r.komisionShuma)} EUR</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {data.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                  <td className="px-4 py-3 text-gray-800" colSpan={4}>Gjithsej</td>
                  <td className="px-4 py-3 text-right text-gray-800">{fmt(data.reduce((s,r)=>s+r.totalSherbime,0))} EUR</td>
                  <td/>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(total)} EUR</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {data.some(r => r.komisioniTipi === '—') && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <AlertCircle size={12}/> Disa referues nuk kane komisioni te konfiguruar. Shkoni tek faqja Referuesit per ta vendosur.
        </p>
      )}
    </div>
  );
}

// ─── BORXHET TAB ──────────────────────────────────────────────────────────────
function TabBorxhet() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [nenTab, setNenTab]   = useState('pacientet');
  const [kerko, setKerko]     = useState('');

  const ngarko = useCallback(() => {
    setLoading(true);
    api.get('/financa/borxhet')
      .then(r => setData(r.data))
      .catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { ngarko(); }, [ngarko]);

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>;

  const pacientet  = (data?.borxhetPacienteve || []).filter(p => !kerko || p.emri?.toLowerCase().includes(kerko.toLowerCase()));
  const referuesit = (data?.borxhetReferuesve  || []).filter(r => !kerko || r.emri?.toLowerCase().includes(kerko.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card py-4 border-l-4 border-red-400">
          <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center mb-2.5">
            <TrendingDown size={17} className="text-red-600"/>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmt(data?.totalPapaguar)} <span className="text-sm font-normal text-gray-400">EUR</span></p>
          <p className="text-xs text-gray-500">Total Borxhe te Pa-paguara</p>
        </div>
        <div className="card py-4">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center mb-2.5">
            <Users size={17} className="text-orange-600"/>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtN(data?.borxhetPacienteve?.length)}</p>
          <p className="text-xs text-gray-500">Paciente me Borxh</p>
        </div>
        <div className="card py-4">
          <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center mb-2.5">
            <FileText size={17} className="text-yellow-600"/>
          </div>
          <p className="text-xl font-bold text-gray-800">{fmtN(data?.numriPapaguar)}</p>
          <p className="text-xs text-gray-500">Porosi te Pa-paguara</p>
        </div>
      </div>

      {/* Sub-tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: 'pacientet',  label: `Pacientet (${data?.borxhetPacienteve?.length || 0})` },
            { id: 'referuesit', label: `Referuesit (${data?.borxhetReferuesve?.length || 0})` },
          ].map(t => (
            <button key={t.id} onClick={() => { setNenTab(t.id); setKerko(''); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${nenTab === t.id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <input className="input text-sm py-1.5 w-52" placeholder="Kerko emrin..." value={kerko} onChange={e => setKerko(e.target.value)}/>
      </div>

      {/* Table */}
      {nenTab === 'pacientet' ? (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Pacienti</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nr Personal</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Telefoni</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Nr Porosive</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Borxhi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Porosia e Fundit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pacientet.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Asnje borxh {kerko ? `per "${kerko}"` : ''}</td></tr>
              ) : pacientet.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.emri}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.numrPersonal || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{p.telefoni || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(p.numriPorosive)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(p.totalBorxhi)} EUR</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {p.fundit ? new Date(p.fundit).toLocaleDateString('sq-AL') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {pacientet.length > 0 && (
              <tfoot>
                <tr className="bg-red-50 border-t border-red-100 font-bold">
                  <td className="px-4 py-3 text-red-800" colSpan={4}>Gjithsej</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmt(pacientet.reduce((s,p)=>s+p.totalBorxhi,0))} EUR</td>
                  <td/>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Referuesi</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Institucioni</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipi</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Nr Porosive</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Borxhi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referuesit.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Asnje borxh {kerko ? `per "${kerko}"` : ''}</td></tr>
              ) : referuesit.map(r => (
                <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{r.emri}</td>
                  <td className="px-4 py-3 text-gray-600">{r.institucioni || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.tipi === 'Doktor' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {r.tipi}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{fmtN(r.numriPorosive)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">{fmt(r.totalBorxhi)} EUR</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── FATURAT KOMPANIVE TAB ────────────────────────────────────────────────────
function TabFaturatKompanive() {
  const [referuesit, setReferuesit]   = useState([]);
  const [refId, setRefId]             = useState('');
  const [df, setDf]                   = useState('');
  const [dm, setDm]                   = useState('');
  const [loading, setLoading]         = useState(false);
  const [loadingPDF, setLoadingPDF]   = useState(false);
  const [data, setData]               = useState(null);
  const [expandedPac, setExpandedPac] = useState(new Set());
  const [zbritja, setZbritja]         = useState('');

  useEffect(() => {
    api.get('/referuesit').then(r => setReferuesit(r.data.data || [])).catch(() => {});
  }, []);

  const ngarko = () => {
    if (!refId) return toast.error('Zgjidhni nje referues/kompani');
    setLoading(true);
    const params = { referuesId: refId };
    if (df) params.dataFillim = df;
    if (dm) params.dataMbarim = dm;
    api.get('/financa/fatura-kompanise', { params })
      .then(r => { setData(r.data); setExpandedPac(new Set()); })
      .catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  };

  const gjeneroFature = async () => {
    if (!refId) return;
    setLoadingPDF(true);
    const win = window.open('', '_blank');
    try {
      const params = { referuesId: refId };
      if (df) params.dataFillim = df;
      if (dm) params.dataMbarim = dm;
      if (zbritja) params.zbritja = zbritja;
      const resp = await api.get('/financa/fatura-kompanise/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      if (win) { win.location.href = url; setTimeout(() => window.URL.revokeObjectURL(url), 60000); }
    } catch { if (win) win.close(); toast.error('Gabim gjate gjenerimit te PDF'); }
    setLoadingPDF(false);
  };

  const togglePac = (id) => setExpandedPac(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  const refZgjedhur = referuesit.find(r => r._id === refId);

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Building2 size={15} className="text-primary"/> Zgjidhni Kompaninë / Partnerin
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Kompania / Referuesi</label>
            <select className="input" value={refId} onChange={e => { setRefId(e.target.value); setData(null); }}>
              <option value="">— Zgjidhni —</option>
              {referuesit.map(r => (
                <option key={r._id} value={r._id}>
                  {r.institucioni ? `${r.institucioni} (${r.emri} ${r.mbiemri})` : `${r.emri} ${r.mbiemri}`} · {r.tipi}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data Fillimit</label>
            <input type="date" className="input" value={df} max="9999-12-31" onChange={e => setDf(e.target.value)}/>
          </div>
          <div>
            <label className="label">Data Mbarimit</label>
            <input type="date" className="input" value={dm} max="9999-12-31" onChange={e => setDm(e.target.value)}/>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={ngarko} disabled={!refId || loading}
            className="btn-primary flex items-center gap-1.5">
            <Eye size={14}/> {loading ? 'Duke ngarkuar...' : 'Shiko Faturën'}
          </button>
          {(df || dm) && (
            <button onClick={() => { setDf(''); setDm(''); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline">Pastro datat</button>
          )}
        </div>
      </div>

      {/* Invoice data */}
      {data && (
        <>
          {/* Summary bar */}
          <div className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  {data.referues?.institucioni || `${data.referues?.emri} ${data.referues?.mbiemri}`}
                </h2>
                <p className="text-sm text-gray-500">
                  {data.referues?.tipi} · {data.numriPacienteve} pacientë · {data.numriPorosive} porosi
                  {(df || dm) && ` · ${df || '?'} — ${dm || '?'}`}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${data.referues?.tipi === 'Bashkpuntor' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                  {data.referues?.tipi === 'Bashkpuntor' ? 'Çmimet Bashkëpunëtore' : 'Çmimet Pacient'}
                </span>
              </div>

              {/* Generate invoice */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.5"
                    className="input text-sm py-1.5 w-28 pr-6" placeholder="Zbritje %"
                    value={zbritja} onChange={e => setZbritja(e.target.value)}/>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium pointer-events-none">%</span>
                </div>
                <button onClick={gjeneroFature} disabled={loadingPDF}
                  className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-70">
                  <Printer size={14} className={loadingPDF ? 'animate-spin' : ''}/> {loadingPDF ? 'Duke gjeneruar...' : 'Gjenero PDF'}
                </button>
              </div>
            </div>

            {/* KPI mini-cards */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Total Shërbime', val: data.gjithsejCmimi,    col: 'text-gray-800' },
                { label: 'Total i Paguar', val: data.gjithsejPaguar,   col: 'text-green-700' },
                { label: 'Total Papaguar', val: data.gjithsejPapaguar, col: 'text-red-600' },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className={`text-lg font-bold ${k.col}`}>{fmt(k.val)} EUR</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Patients list */}
          <div className="space-y-2">
            {data.pacientet.length === 0 ? (
              <div className="card p-10 text-center text-gray-400">Asnje porosi e gjetur per kete periudhe.</div>
            ) : data.pacientet.map((pac, i) => {
              const isOpen = expandedPac.has(i);
              return (
                <div key={i} className="card p-0 overflow-hidden">
                  {/* Patient header */}
                  <button onClick={() => togglePac(i)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 text-xs font-bold">{(pac.pacienti?.emri?.[0] || '?').toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-semibold text-gray-800 text-sm">
                          {pac.pacienti?.emri} {pac.pacienti?.mbiemri}
                          {pac.pacienti?.numrPersonal && <span className="text-gray-400 font-normal text-xs ml-2">ID: {pac.pacienti.numrPersonal}</span>}
                        </p>
                        <p className="text-xs text-gray-500">{pac.porosite.length} porosi</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-800">{fmt(pac.totalCmimi)} EUR</p>
                        {pac.totalPapaguar > 0 && (
                          <p className="text-xs text-red-600 font-medium">Papaguar: {fmt(pac.totalPapaguar)} EUR</p>
                        )}
                        {pac.totalPapaguar === 0 && (
                          <p className="text-xs text-green-600 font-medium">Paguar plotësisht</p>
                        )}
                      </div>
                      <ChevronRight size={15} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}/>
                    </div>
                  </button>

                  {/* Expanded orders */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Nr Porosi</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Analiza</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Dep.</th>
                            <th className="text-left px-4 py-2 font-semibold text-gray-500">Data</th>
                            <th className="text-right px-4 py-2 font-semibold text-gray-500">Statusi</th>
                            <th className="text-right px-4 py-2 font-semibold text-gray-500">Shuma</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {pac.porosite.map(p => {
                            const anNames = (p.analizat || []).map(a => a.analiza?.emri || '?');
                            const display = p.pakoEmri ? `[Pako] ${p.pakoEmri}` : anNames.join(', ') || '—';
                            const paguar  = p.pagesa?.statusi === 'Paguar';
                            return (
                              <tr key={p._id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono text-gray-600">{p.numrPorosi}</td>
                                <td className="px-4 py-2 text-gray-700 max-w-[200px]">
                                  <span className="truncate block" title={display}>{display}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                    style={{ background: (DEP_COLORS[p.departamenti] || '#6B7280') + '20', color: DEP_COLORS[p.departamenti] || '#6B7280' }}>
                                    {p.departamenti}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-500">
                                  {p.dataPorosis ? new Date(p.dataPorosis).toLocaleDateString('sq-AL') : '—'}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paguar ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {paguar ? 'Paguar' : 'Papaguar'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-semibold text-gray-800">
                                  {fmt(p.cmimi)} EUR
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50 border-t border-blue-100">
                            <td colSpan={5} className="px-4 py-2 font-semibold text-blue-800 text-xs">
                              Nën-total: {pac.pacienti?.emri} {pac.pacienti?.mbiemri}
                            </td>
                            <td className="px-4 py-2 text-right font-bold text-gray-800 text-xs">
                              {fmt(pac.totalCmimi)} EUR
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand total footer */}
          <div className="card p-4 border-2 border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-600">Grand Total</p>
                <p className="text-xs text-gray-500">{data.numriPacienteve} pac. · {data.numriPorosive} porosi</p>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-gray-800">{fmt(data.gjithsejCmimi)} EUR</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paguar</p>
                  <p className="font-bold text-green-700">{fmt(data.gjithsejPaguar)} EUR</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Papaguar</p>
                  <p className="font-bold text-red-600">{fmt(data.gjithsejPapaguar)} EUR</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── TAB: ARKIVA FATURAVE ─────────────────────────────────────────────────────
function TabArkivaFaturave() {
  const [faturat, setFaturat]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(null);

  useEffect(() => {
    api.get('/financa/arkiva-faturave')
      .then(r => setFaturat(r.data.faturat || []))
      .catch(() => toast.error('Gabim gjate ngarkimit te arkives'))
      .finally(() => setLoading(false));
  }, []);

  const shikoPDF = async (id) => {
    setLoadingPDF(id);
    const win = window.open('', '_blank');
    try {
      const r = await api.get(`/financa/arkiva-faturave/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      if (win) { win.location.href = url; setTimeout(() => window.URL.revokeObjectURL(url), 60000); }
    } catch { if (win) win.close(); toast.error('Gabim gjate hapjes se PDF'); }
    setLoadingPDF(null);
  };

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('sq-AL') : '—';

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Archive size={15} className="text-primary"/> Arkiva e Faturave të Lëshuara
          </h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{faturat.length} fatura</span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Duke ngarkuar...</div>
        ) : faturat.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Asnjë faturë e lëshuar ende.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">Nr. Faturës</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">Bashkëpunëtori</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs">Periudha</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs">Total</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs">Zbritje</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs">Pagesa</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-500 text-xs">Data Lëshimit</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {faturat.map(f => (
                  <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-primary">{f.numrFatures}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-800">{f.referuesEmri || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {f.dataFillim || f.dataMbarim
                        ? `${f.dataFillim ? fmtD(f.dataFillim + 'T00:00:00') : '?'} — ${f.dataMbarim ? fmtD(f.dataMbarim + 'T00:00:00') : '?'}`
                        : 'Të gjitha'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(f.gjithsejCmimi)} {f.monedha}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {f.zbritjaPrc > 0 ? `${f.zbritjaPrc}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{fmt(f.totalFinal)} {f.monedha}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{fmtD(f.dataLeshimit)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => shikoPDF(f._id)} disabled={loadingPDF === f._id}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 ml-auto">
                        <Printer size={12} className={loadingPDF === f._id ? 'animate-spin' : ''}/>
                        {loadingPDF === f._id ? 'Duke hapur...' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB: FATURA PACIENT ─────────────────────────────────────────────────────
function TabFaturaPatient() {
  const sot = new Date().toISOString().split('T')[0];
  const [df, setDf]                 = useState(sot);
  const [dm, setDm]                 = useState(sot);
  const [loading, setLoading]       = useState(false);
  const [porosite, setPorosite]     = useState([]);
  const [totali, setTotali]         = useState(0);
  const [paguar, setPaguar]         = useState(0);
  const [loadingPDF, setLoadingPDF] = useState(null);
  const [expandedPac, setExpandedPac] = useState(new Set());

  const ngarko = useCallback(() => {
    setLoading(true);
    api.get('/pagesat/porosi-ditore', { params: { dataFillim: df, dataMbarim: dm || df } })
      .then(r => {
        setPorosite(r.data.porosite || []);
        setTotali(r.data.totali || 0);
        setPaguar(r.data.paguar || 0);
      })
      .catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  }, [df, dm]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { ngarko(); }, []);

  const pacientet = useMemo(() => {
    const map = {};
    for (const p of porosite) {
      const pid = p.pacienti?._id?.toString() || 'x';
      if (!map[pid]) map[pid] = { pacienti: p.pacienti, porosite: [], totalCmimi: 0, totalPaguar: 0 };
      map[pid].porosite.push(p);
      map[pid].totalCmimi += p.cmimiTotal || 0;
      if (p.pagesa?.statusi === 'Paguar') map[pid].totalPaguar += p.pagesa?.shumaFinal || p.cmimiTotal || 0;
    }
    return Object.values(map).sort((a, b) =>
      `${a.pacienti?.emri} ${a.pacienti?.mbiemri}`.localeCompare(`${b.pacienti?.emri} ${b.pacienti?.mbiemri}`)
    );
  }, [porosite]);

  const togglePac = (pid) => setExpandedPac(prev => {
    const s = new Set(prev);
    if (s.has(pid)) s.delete(pid); else s.add(pid);
    return s;
  });

  const gjeneroFature = async (pacId) => {
    if (loadingPDF) return;
    setLoadingPDF(pacId);
    const win = window.open('', '_blank');
    try {
      const params = { pacientiId: pacId, dataFillim: df, dataMbarim: dm || df };
      const resp = await api.get('/financa/fatura-patient/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      if (win) { win.location.href = url; setTimeout(() => window.URL.revokeObjectURL(url), 60000); }
      toast.success('Fatura u gjenerua dhe u ruajt ne arkive!');
    } catch { if (win) win.close(); toast.error('Gabim gjate gjenerimit te PDF'); }
    setLoadingPDF(null);
  };

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('sq-AL') : '—';
  const borxhi = totali - paguar;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Nga data</label>
            <input type="date" className="input w-36" value={df} max="9999-12-31" onChange={e => setDf(e.target.value)}/>
          </div>
          <div>
            <label className="label">Deri me</label>
            <input type="date" className="input w-36" value={dm} max="9999-12-31" onChange={e => setDm(e.target.value)}/>
          </div>

          <button onClick={ngarko} disabled={loading} className="btn-primary flex items-center gap-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Filtro
          </button>
          <button onClick={() => { setDf(sot); setDm(sot); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">Sot</button>
        </div>
      </div>

      {/* KPI row */}
      {porosite.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Sherbime', val: totali, col: 'text-gray-800' },
            { label: 'Paguar',         val: paguar, col: 'text-green-700' },
            { label: 'Papaguar',       val: borxhi, col: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="card py-3">
              <p className={`text-lg font-bold ${k.col}`}>{fmt(k.val)} <span className="text-xs font-normal text-gray-400">EUR</span></p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Patient list */}
      {loading ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Duke ngarkuar...</div>
      ) : pacientet.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm">
          Asnje porosi e gjetur per periudhen e zgjedhur.
        </div>
      ) : (
        <div className="space-y-2">
          {pacientet.map(pac => {
            const pid    = pac.pacienti?._id?.toString() || 'x';
            const isOpen = expandedPac.has(pid);
            const isPDF  = loadingPDF === pid;
            const paciNm = `${pac.pacienti?.emri || ''} ${pac.pacienti?.mbiemri || ''}`.trim();
            const paguarPac = pac.totalPaguar;
            const allPaid   = paguarPac > 0 && paguarPac >= pac.totalCmimi * 0.99;

            return (
              <div key={pid} className="card p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Expand toggle */}
                  <button onClick={() => togglePac(pid)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 text-xs font-bold">{(pac.pacienti?.emri?.[0] || '?').toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {paciNm}
                        {pac.pacienti?.numrPersonal && (
                          <span className="text-gray-400 font-normal text-xs ml-2">{pac.pacienti.numrPersonal}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{pac.porosite.length} porosi</p>
                    </div>
                    <ChevronRight size={14} className={`text-gray-400 ml-auto flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}/>
                  </button>

                  {/* Total + Generate */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{fmt(pac.totalCmimi)} EUR</p>
                      <p className={`text-xs font-medium ${allPaid ? 'text-green-600' : 'text-red-500'}`}>
                        {allPaid ? 'Paguar' : `Papaguar: ${fmt(pac.totalCmimi - paguarPac)} EUR`}
                      </p>
                    </div>
                    <button onClick={() => gjeneroFature(pid)} disabled={!!loadingPDF}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap">
                      <Printer size={11} className={isPDF ? 'animate-spin' : ''}/>
                      {isPDF ? 'Duke gjeneruar...' : 'Gjenero Faturen'}
                    </button>
                  </div>
                </div>

                {/* Expanded orders */}
                {isOpen && (
                  <div className="border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2 font-semibold text-gray-500">Nr. Porosie</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500">Analiza</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500">Data</th>
                          <th className="text-left px-4 py-2 font-semibold text-gray-500">Dept.</th>
                          <th className="text-right px-4 py-2 font-semibold text-gray-500">Statusi</th>
                          <th className="text-right px-4 py-2 font-semibold text-gray-500">Shuma</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pac.porosite.map(p => {
                          const anNames = (p.analizat || []).map(a => a.analiza?.emri || '?');
                          const display = p.pakoEmri ? `[Pako] ${p.pakoEmri}` : anNames.join(', ') || '—';
                          const paid    = p.pagesa?.statusi === 'Paguar';
                          return (
                            <tr key={p._id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 font-mono text-gray-600">{p.numrPorosi}</td>
                              <td className="px-4 py-2 text-gray-700 max-w-[180px]">
                                <span className="truncate block" title={display}>{display}</span>
                              </td>
                              <td className="px-4 py-2 text-gray-500">{fmtD(p.dataPorosis)}</td>
                              <td className="px-4 py-2">
                                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: (DEP_COLORS[p.departamenti] || '#6B7280') + '20', color: DEP_COLORS[p.departamenti] || '#6B7280' }}>
                                  {p.departamenti}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {paid ? 'Paguar' : 'Papaguar'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(p.cmimiTotal)} EUR</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 border-t border-blue-100">
                          <td colSpan={5} className="px-4 py-2 font-semibold text-blue-800 text-xs">Nen-total: {paciNm}</td>
                          <td className="px-4 py-2 text-right font-bold text-blue-800 text-xs">{fmt(pac.totalCmimi)} EUR</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



// ─── TAB: ARKIVA FATURA PACIENT ───────────────────────────────────────────────
function TabArkivaFatPac() {
  const [faturat, setFaturat]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingPDF, setLoadingPDF] = useState(null);

  useEffect(() => {
    api.get('/financa/arkiva-fatura-patient')
      .then(r => setFaturat(r.data.faturat || []))
      .catch(() => toast.error('Gabim gjate ngarkimit'))
      .finally(() => setLoading(false));
  }, []);

  const shikoPDF = async (id) => {
    setLoadingPDF(id);
    const win = window.open('', '_blank');
    try {
      const r = await api.get(`/financa/arkiva-fatura-patient/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }));
      if (win) { win.location.href = url; setTimeout(() => window.URL.revokeObjectURL(url), 60000); }
    } catch { if (win) win.close(); toast.error('Gabim gjate hapjes se PDF'); }
    setLoadingPDF(null);
  };

  const fmtD = (d) => d ? new Date(d).toLocaleDateString('sq-AL') : '—';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Archive size={15} className="text-primary"/> Fatura Pacient Arkivë
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{faturat.length} fatura</span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Duke ngarkuar...</div>
      ) : faturat.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Asnjë faturë pacient e lëshuar ende.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Nr. Faturës</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Pacienti</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Periudha</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Totali</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Data</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {faturat.map(f => (
                <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-primary">{f.numrFatures}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{f.pacientEmri || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {f.dataFillim || f.dataMbarim
                      ? `${f.dataFillim ? fmtD(f.dataFillim + 'T00:00:00') : '?'} — ${f.dataMbarim ? fmtD(f.dataMbarim + 'T00:00:00') : '?'}`
                      : 'Të gjitha'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{fmt(f.totalFinal)} {f.monedha}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500">{fmtD(f.dataLeshimit)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => shikoPDF(f._id)} disabled={loadingPDF === f._id}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50 ml-auto">
                      <Printer size={12} className={loadingPDF === f._id ? 'animate-spin' : ''}/>
                      {loadingPDF === f._id ? 'Duke hapur...' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Financa() {
  const [tab, setTab] = useState('dashboard');
  const TAB_CONTENT = { dashboard: TabDashboard, raportet: TabRaportet, komisjonet: TabKomisjonet, borxhet: TabBorxhet, faturat: TabFaturatKompanive, arkiva: TabArkivaFaturave, 'fat-pac': TabFaturaPatient, 'arkiva-pac': TabArkivaFatPac };
  const ActiveTab = TAB_CONTENT[tab];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Banknote size={24} className="text-primary"/> Financa
        </h1>
        <p className="text-gray-500 text-sm">Pasqyre financiare · raporte · komisione · borxhe</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <ActiveTab/>
    </div>
  );
}
