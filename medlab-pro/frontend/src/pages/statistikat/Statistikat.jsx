import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { BarChart2, Users, FlaskConical, Euro, Download, RefreshCw, Search, FileText } from 'lucide-react';
import api from '../../services/api';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

const PERIUDHAT = [
  { id: 'sot',    label: 'Sot' },
  { id: 'jave',   label: 'Kjo Javë' },
  { id: 'muaj',   label: 'Ky Muaj' },
  { id: 'vit',    label: 'Ky Vit' },
  { id: 'custom', label: 'Personalizuar' },
];

const DEPT_NGJYRA = {
  Biokimi:       '#1A3A6B',
  Mikrobiologji: '#059669',
  PCR:           '#7C3AED',
};

const fmt = (n, dec = 0) => (n ?? 0).toLocaleString('sq-AL', { maximumFractionDigits: dec });

export default function Statistikat() {
  const [periudha,   setPeriudha]   = useState('muaj');
  const [dataFillim, setDataFillim] = useState('');
  const [dataMbarim, setDataMbarim] = useState('');
  const [data,       setData]       = useState(null);
  const [duke,       setDuke]       = useState(false);
  const [dukePDF,    setDukePDF]    = useState(false);
  const [tab,        setTab]        = useState('top');
  const [kerko,      setKerko]      = useState('');

  const ngarko = useCallback(async () => {
    setDuke(true);
    try {
      const params = { periudha };
      if (periudha === 'custom') {
        if (dataFillim) params.dataFillim = dataFillim;
        if (dataMbarim) params.dataMbarim = dataMbarim;
      }
      const { data: d } = await api.get('/statistikat', { params });
      setData(d);
    } catch { /* silent */ }
    finally { setDuke(false); }
  }, [periudha, dataFillim, dataMbarim]);

  useEffect(() => { if (periudha !== 'custom') ngarko(); }, [periudha]);

  // ── Search filter (client-side) ───────────────────────────────────
  const analizatFiltruara = useMemo(() => {
    if (!data?.analizatTop) return [];
    if (!kerko.trim()) return data.analizatTop;
    const q = kerko.toLowerCase();
    return data.analizatTop.filter(a =>
      (a.emri || '').toLowerCase().includes(q) ||
      (a.departamenti || '').toLowerCase().includes(q)
    );
  }, [data?.analizatTop, kerko]);

  // ── Excel export ──────────────────────────────────────────────────
  const eksportoExcel = () => {
    if (!analizatFiltruara.length) return;
    const rows = analizatFiltruara.map((a, i) => ({
      '#': i + 1,
      'Analiza':      a.emri || '—',
      'Departamenti': a.departamenti || '—',
      'Kryerje':      a.count,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top Analiza');
    XLSX.writeFile(wb, `statistikat_${periudha}.xlsx`);
  };

  // ── PDF export (backend) ──────────────────────────────────────────
  const eksportoPDF = async () => {
    setDukePDF(true);
    try {
      const params = { periudha };
      if (periudha === 'custom') {
        if (dataFillim) params.dataFillim = dataFillim;
        if (dataMbarim) params.dataMbarim = dataMbarim;
      }
      const resp = await api.get('/statistikat/eksport-pdf', { params, responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `statistikat_${periudha}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    finally { setDukePDF(false); }
  };

  // ── Chart data ────────────────────────────────────────────────────
  const topChart = data?.analizatTop ? {
    labels: data.analizatTop.map(a => a.emri || '—'),
    datasets: [{
      label: 'Kryerje',
      data:  data.analizatTop.map(a => a.count),
      backgroundColor: data.analizatTop.map(a => DEPT_NGJYRA[a.departamenti] || '#6B7280'),
      borderRadius: 4,
    }],
  } : null;

  const trendChart = data?.perDite ? {
    labels: data.perDite.map(d => `${d._id.dita}/${d._id.muaji}`),
    datasets: [{
      label: 'Porosi',
      data:  data.perDite.map(d => d.count),
      borderColor: '#1A3A6B',
      backgroundColor: 'rgba(26,58,107,0.08)',
      tension: 0.3, fill: true, pointRadius: 3,
    }],
  } : null;

  const deptChart = data?.perDepartament ? {
    labels: data.perDepartament.map(d => d._id || '—'),
    datasets: [{
      data:            data.perDepartament.map(d => d.totalPorosi),
      backgroundColor: data.perDepartament.map(d => DEPT_NGJYRA[d._id] || '#6B7280'),
      borderWidth: 0,
    }],
  } : null;

  const kpi = data?.kpi;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart2 size={22} className="text-[#1A3A6B]"/> Statistikat e Laboratorit
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Analizë e punës laboratorike sipas periudhës</p>
        </div>
        <div className="flex gap-2">
          <button onClick={eksportoExcel} disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            <Download size={15}/> Excel
          </button>
          <button onClick={eksportoPDF} disabled={!data || dukePDF}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-40">
            {dukePDF
              ? <RefreshCw size={14} className="animate-spin"/>
              : <FileText size={15}/>
            } PDF
          </button>
          <button onClick={ngarko} disabled={duke}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1A3A6B] text-white rounded-lg text-sm hover:bg-[#15305a] disabled:opacity-60">
            <RefreshCw size={14} className={duke ? 'animate-spin' : ''}/> Rifreso
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Periudha</label>
            <div className="flex gap-1.5 flex-wrap">
              {PERIUDHAT.map(p => (
                <button key={p.id} onClick={() => setPeriudha(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${periudha === p.id ? 'bg-[#1A3A6B] text-white border-[#1A3A6B]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {periudha === 'custom' && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nga data</label>
                <input type="date" value={dataFillim} onChange={e => setDataFillim(e.target.value)}
                  className="input text-sm px-2 py-1.5"/>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Deri më</label>
                <input type="date" value={dataMbarim} onChange={e => setDataMbarim(e.target.value)}
                  className="input text-sm px-2 py-1.5"/>
              </div>
              <button onClick={ngarko} disabled={duke}
                className="px-4 py-1.5 bg-[#1A3A6B] text-white rounded-lg text-sm hover:bg-[#15305a] disabled:opacity-60">
                Kerko
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FlaskConical, label: 'Porosi Totale',   val: fmt(kpi.totalPorosi),       color: 'bg-blue-50 text-[#1A3A6B]' },
            { icon: BarChart2,    label: 'Analiza Kryer',   val: fmt(kpi.totalAnaliza),      color: 'bg-purple-50 text-purple-700' },
            { icon: Users,        label: 'Pacientë Unikë',  val: fmt(kpi.totalPacientet),    color: 'bg-green-50 text-green-700' },
            { icon: Euro,         label: 'Të Ardhura',      val: `${fmt(kpi.totalTe, 2)} €`, color: 'bg-orange-50 text-orange-700' },
          ].map(({ icon: Icon, label, val, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                <Icon size={18}/>
              </div>
              <div className="text-2xl font-bold text-gray-800">{val}</div>
              <div className="text-sm text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {data && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'top',   label: 'Top Analiza' },
              { id: 'trend', label: 'Trend Ditor' },
              { id: 'dept',  label: 'Departamentet' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-5">
            {tab === 'top' && topChart && (
              <div style={{ height: 380 }}>
                <Bar data={topChart} options={{
                  responsive: true, maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw} kryerje` } } },
                  scales: { x: { grid: { color: '#f3f4f6' } }, y: { ticks: { font: { size: 11 } } } },
                }}/>
              </div>
            )}
            {tab === 'trend' && trendChart && (
              <div style={{ height: 320 }}>
                <Line data={trendChart} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } },
                }}/>
              </div>
            )}
            {tab === 'dept' && deptChart && (
              <div className="flex items-center gap-8 flex-wrap">
                <div style={{ width: 260, height: 260 }}>
                  <Doughnut data={deptChart} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '65%',
                  }}/>
                </div>
                <div className="space-y-3">
                  {data.perDepartament.map(d => (
                    <div key={d._id} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: DEPT_NGJYRA[d._id] || '#6B7280' }}/>
                      <div>
                        <div className="font-medium text-sm text-gray-800">{d._id || '—'}</div>
                        <div className="text-xs text-gray-500">{fmt(d.totalPorosi)} porosi · {fmt(d.totalAnaliza)} analiza · {fmt(d.totalTe, 2)} €</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table with Search */}
      {data?.analizatTop?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-800 text-sm flex-1">Renditja e Analizave</h2>
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input
                value={kerko}
                onChange={e => setKerko(e.target.value)}
                placeholder="Kërko analizë..."
                className="pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/20 focus:border-[#1A3A6B] w-48"
              />
            </div>
            <span className="text-xs text-gray-400">
              {analizatFiltruara.length} / {data.analizatTop.length} analiza
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 w-10">#</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Analiza</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">Departamenti</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Kryerje</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500 w-40">Frekuenca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analizatFiltruara.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      Nuk u gjetën analiza për "{kerko}"
                    </td>
                  </tr>
                ) : (
                  analizatFiltruara.map((a, i) => {
                    const max = data.analizatTop[0]?.count || 1;
                    const pct = Math.round((a.count / max) * 100);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{a.emri || '—'}</td>
                        <td className="px-4 py-2.5">
                          {a.departamenti && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: `${DEPT_NGJYRA[a.departamenti]}18`, color: DEPT_NGJYRA[a.departamenti] || '#6B7280' }}>
                              {a.departamenti}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{fmt(a.count)}</td>
                        <td className="px-4 py-2.5">
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: DEPT_NGJYRA[a.departamenti] || '#6B7280' }}/>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !duke && (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30"/>
          <p>Zgjidh periudhën dhe kliko Rifreso</p>
        </div>
      )}
      {duke && (
        <div className="text-center py-16 text-gray-400">
          <RefreshCw size={32} className="mx-auto mb-3 animate-spin opacity-40"/>
          <p className="text-sm">Duke ngarkuar të dhënat...</p>
        </div>
      )}
    </div>
  );
}
