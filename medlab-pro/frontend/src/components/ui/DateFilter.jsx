import { useState } from 'react';
import { Calendar } from 'lucide-react';

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function djeStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

function fillimJaves() {
  const d = new Date();
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return isoDate(m);
}

function fillimMuajit() {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function labelData(dataFillim, dataMbarim) {
  if (!dataFillim) return '';
  if (dataFillim === dataMbarim) {
    return new Date(`${dataFillim}T00:00:00`).toLocaleDateString('sq-AL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const f = new Date(`${dataFillim}T00:00:00`).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
  const t = new Date(`${dataMbarim}T00:00:00`).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f} - ${t}`;
}

export default function DateFilter({ dataFillim, dataMbarim, onChange }) {
  const [manual, setManual] = useState(false);
  const sot = isoDate(new Date());
  const dje = djeStr();
  const java = fillimJaves();
  const muaj = fillimMuajit();

  const isActive = (f, t) => !manual && dataFillim === f && dataMbarim === t;

  const set = (f, t) => {
    onChange({ dataFillim: f, dataMbarim: t });
    setManual(false);
  };

  const OPSIONET = [
    { label: 'Sot', f: sot, t: sot },
    { label: 'Dje', f: dje, t: dje },
    { label: 'Kete Jave', f: java, t: sot },
    { label: 'Kete Muaj', f: muaj, t: sot },
  ];

  return (
    <div className="w-full sm:w-auto">
      <div className="dashboard-filter-scroll flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
        {OPSIONET.map(o => (
          <button
            key={o.label}
            onClick={() => set(o.f, o.t)}
            className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              isActive(o.f, o.t)
                ? 'border-[#1B4F8A] bg-[#1B4F8A] text-white shadow-sm'
                : 'border-gray-200 bg-white/90 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
            }`}
          >
            {o.label}
          </button>
        ))}

        <button
          onClick={() => setManual(v => !v)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
            manual
              ? 'border-[#1B4F8A] bg-[#1B4F8A] text-white shadow-sm'
              : 'border-gray-200 bg-white/90 text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
          }`}
        >
          <Calendar size={12} />
          Manual
        </button>
      </div>

      {manual && (
        <div className="mt-2 flex w-full flex-col items-stretch gap-2 rounded-2xl border border-gray-200 bg-white/95 px-3 py-3 shadow-sm dark:border-slate-600 dark:bg-slate-800 sm:w-auto sm:flex-row sm:items-center sm:py-2">
          <input
            type="date"
            value={dataFillim}
            max="9999-12-31"
            onChange={e => onChange({ dataFillim: e.target.value, dataMbarim })}
            className="min-w-0 bg-transparent text-xs text-gray-700 focus:outline-none dark:text-white"
          />
          <span className="hidden text-xs text-gray-300 dark:text-slate-400 sm:inline">-</span>
          <input
            type="date"
            value={dataMbarim}
            min={dataFillim}
            max="9999-12-31"
            onChange={e => onChange({ dataFillim, dataMbarim: e.target.value })}
            className="min-w-0 bg-transparent text-xs text-gray-700 focus:outline-none dark:text-white"
          />
        </div>
      )}
    </div>
  );
}
