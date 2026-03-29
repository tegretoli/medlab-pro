import { useState } from 'react';
import { Calendar } from 'lucide-react';

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function djeStr() {
  const d = new Date(); d.setDate(d.getDate() - 1); return isoDate(d);
}
function fillimJaves() {
  const d = new Date();
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const m = new Date(d); m.setDate(d.getDate() - diff);
  return isoDate(m);
}
function fillimMuajit() {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function labelData(dataFillim, dataMbarim) {
  if (!dataFillim) return '';
  if (dataFillim === dataMbarim) {
    return new Date(dataFillim + 'T00:00:00').toLocaleDateString('sq-AL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }
  const f = new Date(dataFillim + 'T00:00:00').toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
  const t = new Date(dataMbarim  + 'T00:00:00').toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f} – ${t}`;
}

// Props: dataFillim, dataMbarim, onChange({ dataFillim, dataMbarim })
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
    { label: 'Sot',       f: sot,  t: sot  },
    { label: 'Dje',       f: dje,  t: dje  },
    { label: 'Kete Javë', f: java, t: sot  },
    { label: 'Kete Muaj', f: muaj, t: sot  },
  ];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {OPSIONET.map(o => (
        <button key={o.label} onClick={() => set(o.f, o.t)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors whitespace-nowrap ${
            isActive(o.f, o.t)
              ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}>
          {o.label}
        </button>
      ))}

      <button onClick={() => setManual(v => !v)}
        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
          manual ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}>
        <Calendar size={12}/> Manual
      </button>

      {manual && (
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 shadow-sm">
          <input type="date" value={dataFillim} max="9999-12-31"
            onChange={e => onChange({ dataFillim: e.target.value, dataMbarim })}
            className="text-xs text-gray-700 focus:outline-none bg-transparent"/>
          <span className="text-gray-300 text-xs">–</span>
          <input type="date" value={dataMbarim} min={dataFillim} max="9999-12-31"
            onChange={e => onChange({ dataFillim, dataMbarim: e.target.value })}
            className="text-xs text-gray-700 focus:outline-none bg-transparent"/>
        </div>
      )}
    </div>
  );
}
