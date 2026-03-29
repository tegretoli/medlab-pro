import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Search, Plus, ChevronDown, ChevronUp, Clock, User } from 'lucide-react';
import DateFilter, { labelData } from '../../components/ui/DateFilter';

const statusStyle = {
  Caktuar:      'bg-blue-100 text-blue-700',
  Konfirmuar:   'bg-indigo-100 text-indigo-700',
  Ardhur:       'bg-yellow-100 text-yellow-700',
  NeProgres:    'bg-orange-100 text-orange-700',
  Kompletuar:   'bg-green-100 text-green-700',
  Anuluar:      'bg-red-100 text-red-700',
  NukErdhi:     'bg-gray-100 text-gray-500',
};

export default function Kontrollet() {
  const navigate = useNavigate();
  const sot = new Date().toISOString().split('T')[0];
  const [dataFillim, setDataFillim] = useState(sot);
  const [dataMbarim, setDataMbarim] = useState(sot);
  const [kerko, setKerko]         = useState('');
  const [kontrollet, setKontrollet] = useState([]);
  const [ngarkimi, setNgarkimi]   = useState(false);
  const [mjekFilter, setMjekFilter] = useState('');
  const [mjeket, setMjeket]       = useState([]);
  const [zgjeruara, setZgjeruara] = useState({});

  useEffect(() => {
    api.get('/perdorues').then(r => setMjeket(r.data.perdoruesit?.filter(p => p.roli === 'mjek') || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setNgarkimi(true);
    api.get('/kontrollet', { params: { dataFillim, dataMbarim, mjekuId: mjekFilter || undefined, limit: 100 } })
      .then(r => { setKontrollet(r.data.kontrollet || []); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  }, [dataFillim, dataMbarim, mjekFilter]);

  const filtruara = kontrollet.filter(k => {
    if (!kerko) return true;
    const q = kerko.toLowerCase();
    return (`${k.pacienti?.emri} ${k.pacienti?.mbiemri}`).toLowerCase().includes(q) ||
           k.pacienti?.numrPersonal?.includes(q);
  });

  // Grupo sipas mjekut
  const sipaMjekut = {};
  filtruara.forEach(k => {
    const mj = k.mjeku?._id || 'pa_mjek';
    if (!sipaMjekut[mj]) sipaMjekut[mj] = { mjeku: k.mjeku, kontrollet: [] };
    sipaMjekut[mj].kontrollet.push(k);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kontrollet / Vizitat</h1>
          <p className="text-gray-500 text-sm">{labelData(dataFillim, dataMbarim)}</p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <DateFilter dataFillim={dataFillim} dataMbarim={dataMbarim}
            onChange={({ dataFillim: f, dataMbarim: t }) => { setDataFillim(f); setDataMbarim(t); }}/>
          <button onClick={() => navigate('/kontrollet/krijo')} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16}/> Cakto Takim
          </button>
        </div>
      </div>

      {/* Filtra */}
      <div className="card py-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Kerko pacient..."
            value={kerko} onChange={e => setKerko(e.target.value)} />
        </div>
        <select className="input w-auto text-sm" value={mjekFilter} onChange={e => setMjekFilter(e.target.value)}>
          <option value="">Te gjithe mjeket</option>
          {mjeket.map(m => <option key={m._id} value={m._id}>Dr. {m.emri} {m.mbiemri}</option>)}
        </select>
        <div className="text-sm text-gray-500 flex items-center">
          <strong className="mr-1">{filtruara.length}</strong> vizita
        </div>
      </div>

      {/* Rezultatet sipas mjekut */}
      {ngarkimi ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
      ) : filtruara.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar size={40} className="mx-auto mb-2 text-gray-200"/>
          <p className="text-gray-400">Asnje vizite per {new Date(dataZgjedhur).toLocaleDateString('sq-AL')}</p>
          <button onClick={() => navigate('/kontrollet/krijo')} className="btn-primary mt-4 text-sm">
            + Cakto Takim
          </button>
        </div>
      ) : (
        Object.values(sipaMjekut).map(({ mjeku, kontrollet: kk }) => {
          const mjId = mjeku?._id || 'pa_mjek';
          const hapur = zgjeruara[mjId] !== false;
          return (
            <div key={mjId} className="card p-0 overflow-hidden">
              <button onClick={() => setZgjeruara(p => ({...p, [mjId]: !hapur}))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                    {mjeku?.emri?.[0] || '?'}{mjeku?.mbiemri?.[0] || ''}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Dr. {mjeku?.emri} {mjeku?.mbiemri}</p>
                    <p className="text-xs text-gray-400">{mjeku?.specialiteti || 'Mjek i Pergjithshem'}</p>
                  </div>
                  <span className="text-sm text-gray-500">{kk.length} vizita</span>
                </div>
                {hapur ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
              </button>

              {hapur && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {kk.map((k, idx) => (
                    <div key={k._id}
                      onClick={() => navigate(`/kontrollet/${k._id}`)}
                      className="px-5 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors flex items-center gap-4">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx+1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{k.pacienti?.emri} {k.pacienti?.mbiemri}</p>
                        <p className="text-xs text-gray-400">{k.arsyjaVizites || k.lloji}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11}/>{k.kohaFillimit || '—'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle[k.statusiTakimit] || 'bg-gray-100 text-gray-500'}`}>
                          {k.statusiTakimit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
