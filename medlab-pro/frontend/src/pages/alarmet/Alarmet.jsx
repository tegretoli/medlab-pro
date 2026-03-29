import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCheck, Check, RefreshCw,
  ArrowUpCircle, ArrowDownCircle, Clock,
} from 'lucide-react';

const flamuriInfo = {
  Shume_Larte: { label: 'Shumë Lartë', cls: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    icon: ArrowUpCircle   },
  Larte:       { label: 'Lartë',       cls: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', icon: ArrowUpCircle   },
  Ulet:        { label: 'Ulët',        cls: 'bg-blue-100 text-blue-700 border-blue-200',   dot: 'bg-blue-400',   icon: ArrowDownCircle },
  Shume_Ulet:  { label: 'Shumë Ulët', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', icon: ArrowDownCircle },
};

export default function Alarmet() {
  const [alarmet, setAlarmet]         = useState([]);
  const [ngarkimi, setNgarkimi]       = useState(true);
  const [filtri, setFiltri]           = useState('false'); // 'false' | 'true' | 'all'
  const [totalPalexuara, setTotal]    = useState(0);

  const ngarko = useCallback(() => {
    setNgarkimi(true);
    api.get(`/alarmet?lexuar=${filtri}&limit=100`)
      .then(r => {
        setAlarmet(r.data.alarmet || []);
        setTotal(r.data.totalPalexuara || 0);
        setNgarkimi(false);
      })
      .catch(() => setNgarkimi(false));
  }, [filtri]);

  useEffect(() => { ngarko(); }, [ngarko]);

  const lexo = async (id) => {
    try {
      const r = await api.put(`/alarmet/${id}/lexo`);
      setTotal(r.data.totalPalexuara ?? 0);
      setAlarmet(p => p.map(a => a._id === id ? { ...a, lexuar: true } : a));
    } catch { toast.error('Gabim'); }
  };

  const lexoTeGjithe = async () => {
    try {
      await api.put('/alarmet/lexo-te-gjitha');
      setTotal(0);
      setAlarmet(p => p.map(a => ({ ...a, lexuar: true })));
      toast.success('Të gjitha alarmet u shënuan si të lexuara');
    } catch { toast.error('Gabim'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500"/>
            Alarmet Kritike
          </h1>
          <p className="text-gray-400 text-xs mt-0.5">Vlera jashtë rangut kritik që kërkojnë vëmendje</p>
        </div>
        <div className="flex items-center gap-2">
          {totalPalexuara > 0 && filtri !== 'true' && (
            <button onClick={lexoTeGjithe}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <CheckCheck size={14}/> Shëno të gjitha si lexuar
            </button>
          )}
          <button onClick={ngarko}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw size={14} className={ngarkimi ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'false', label: 'Palexuara', badge: totalPalexuara },
          { id: 'true',  label: 'Lexuara' },
          { id: 'all',   label: 'Të gjitha' },
        ].map(f => (
          <button key={f.id} onClick={() => setFiltri(f.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtri === f.id ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {f.label}
            {f.badge > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-bold min-w-[18px] text-center">
                {f.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {ngarkimi ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse"/>)}
        </div>
      ) : alarmet.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <CheckCheck size={32} className="text-green-400 mx-auto mb-2"/>
          <p className="text-gray-500 font-medium">
            {filtri === 'false' ? 'Asnjë alarm i palexuar — mirë!' : 'Asnjë alarm gjetur'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alarmet.map(alarm => {
            const fi = flamuriInfo[alarm.flamuri] || flamuriInfo.Shume_Larte;
            const Icon = fi.icon;
            return (
              <div key={alarm._id}
                className={`bg-white border rounded-2xl px-4 py-3 flex items-center gap-3 transition-all ${
                  alarm.lexuar ? 'border-gray-100 opacity-70' : 'border-red-100 shadow-sm'
                }`}>
                {/* Flag indicator */}
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${fi.dot}`}/>

                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  alarm.flamuri.includes('Shume') ? 'bg-red-50' : 'bg-orange-50'
                }`}>
                  <Icon size={17} className={alarm.flamuri.includes('Shume') ? 'text-red-500' : 'text-orange-400'}/>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{alarm.pacientEmri}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${fi.cls}`}>
                      {fi.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium text-gray-700">{alarm.analizaEmri}</span>
                    {alarm.komponenti && alarm.komponenti !== alarm.analizaEmri && (
                      <span> · {alarm.komponenti}</span>
                    )}
                    {' '}&mdash;{' '}
                    <span className={`font-bold ${alarm.flamuri.includes('Shume') ? 'text-red-600' : 'text-orange-500'}`}>
                      {alarm.vlera} {alarm.njesia}
                    </span>
                    {alarm.kritikMin != null && alarm.kritikMax != null && (
                      <span className="text-gray-400 ml-1">(kritike: {alarm.kritikMin}–{alarm.kritikMax})</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock size={10}/>
                    {new Date(alarm.createdAt).toLocaleString('sq-AL', { dateStyle: 'short', timeStyle: 'short' })}
                    <span className="text-gray-300">·</span>
                    {alarm.numrPorosi}
                  </p>
                </div>

                {/* Action */}
                {!alarm.lexuar && (
                  <button onClick={() => lexo(alarm._id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors flex-shrink-0">
                    <Check size={12}/> Lexova
                  </button>
                )}
                {alarm.lexuar && (
                  <span className="text-xs text-gray-300 flex items-center gap-1 flex-shrink-0">
                    <CheckCheck size={12}/> Lexuar
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
