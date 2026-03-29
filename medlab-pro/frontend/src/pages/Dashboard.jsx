import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import DateFilter, { labelData } from '../components/ui/DateFilter';
import {
  Users, FlaskConical, Calendar, AlertCircle, TrendingUp,
  CheckCircle, Clock, CreditCard, ChevronRight, Wallet,
} from 'lucide-react';

function Kartela({ titulli, vlera, icon: Icon, ngjyra, to }) {
  const inner = (
    <div className="card flex items-start gap-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className={`p-3 rounded-xl ${ngjyra}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{titulli}</p>
        <p className="text-2xl font-bold text-gray-800 mt-0.5">{vlera ?? '—'}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function Dashboard() {
  const { perdoruesi } = useSelector(s => s.auth);
  const sot = new Date().toISOString().split('T')[0];
  const [dataFillim, setDataFillim] = useState(sot);
  const [dataMbarim, setDataMbarim] = useState(sot);
  const [data, setData]       = useState(null);
  const [ngarkimi, setNgarkimi] = useState(true);

  useEffect(() => {
    setNgarkimi(true);
    api.get('/dashboard', { params: { dataFillim, dataMbarim } })
      .then(r => { setData(r.data); setNgarkimi(false); })
      .catch(() => setNgarkimi(false));
  }, [dataFillim, dataMbarim]);

  const k = data?.kartela;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Miresevini, {perdoruesi?.emri}!</h1>
          <p className="text-gray-500 text-sm mt-1">{labelData(dataFillim, dataMbarim)}</p>
        </div>
        <DateFilter dataFillim={dataFillim} dataMbarim={dataMbarim}
          onChange={({ dataFillim: f, dataMbarim: t }) => { setDataFillim(f); setDataMbarim(t); }}/>
      </div>

      {/* Veprime te Shpejta — above cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Regjistro Pacient',   path: '/pacientet/regjistro',     bg: 'bg-[#1B4F8A]' },
          { label: 'Porosi Laboratorike', path: '/laboratori/porosi/krijo', bg: 'bg-teal-600' },
          { label: 'Cakto Takim',         path: '/kontrollet/krijo',        bg: 'bg-purple-500' },
          { label: 'Pagesat',             path: '/pagesat',                  bg: 'bg-orange-500' },
        ].map(item => (
          <Link key={item.path} to={item.path}
            className={`${item.bg} text-white px-4 py-3 rounded-xl text-sm font-medium text-center hover:opacity-90 transition-opacity`}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Kartela — clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Kartela titulli="Pacientë Ditor"   vlera={k?.pacienteDitor}       icon={Users}        ngjyra="bg-[#1B4F8A]"  to="/laboratori/departamentet" />
        <Kartela titulli="Pacientë në Proces" vlera={k?.pacienteNeProcesim} icon={Clock}        ngjyra="bg-purple-500" to="/laboratori/departamentet" />
        <Kartela titulli="Takime"           vlera={k?.takime}              icon={Calendar}     ngjyra="bg-teal-600"   to="/kontrollet" />
        <Kartela titulli="Pagesat e Kryera" vlera={`${(k?.pagesatKryera||0).toLocaleString()} €`} icon={TrendingUp} ngjyra="bg-green-600" to="/pagesat" />
        <Kartela titulli="Borxhi"           vlera={`${(k?.borxhi||0).toLocaleString()} €`}    icon={AlertCircle}  ngjyra="bg-red-500"    to="/pagesat" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Laboratori Sot ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FlaskConical size={17} className="text-purple-500"/> Laboratori
            </h2>
            <Link to="/laboratori/departamentet" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Shih te gjitha <ChevronRight size={13}/>
            </Link>
          </div>

          {/* Top 5 analiza */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Testet e ditës</p>
            {ngarkimi ? (
              <div className="space-y-1.5">{[1,2,3].map(i=><div key={i} className="h-7 bg-gray-100 rounded animate-pulse"/>)}</div>
            ) : data?.testeteTop5?.length ? (
              <div className="space-y-1">
                {data.testeteTop5.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700 truncate">{t.emri}</span>
                    <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                      {t.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-3">Asnjë test për këtë periudhë</p>
            )}
          </div>

          {/* Pacientet: kryer / ne procesim */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
            <Link to="/laboratori/departamentet"
              className="bg-green-50 border border-green-100 rounded-xl p-3 hover:bg-green-100 transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-green-500"/>
                <span className="text-xs font-semibold text-green-700">Pacientë të kryer</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{ngarkimi ? '—' : (data?.pacienteKryer ?? 0)}</p>
              <span className="text-xs text-green-500 group-hover:underline">Shiko të gjitha →</span>
            </Link>
            <Link to="/laboratori/departamentet"
              className="bg-orange-50 border border-orange-100 rounded-xl p-3 hover:bg-orange-100 transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-orange-500"/>
                <span className="text-xs font-semibold text-orange-700">Në procesim</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{ngarkimi ? '—' : (data?.pacienteNeProcesim ?? 0)}</p>
              <span className="text-xs text-orange-500 group-hover:underline">Shiko të gjitha →</span>
            </Link>
          </div>
        </div>

        {/* ── Pagesat Sot ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard size={17} className="text-green-500"/> Pagesat
            </h2>
            <Link to="/pagesat" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Shih te gjitha <ChevronRight size={13}/>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* E paguar */}
            <Link to="/pagesat"
              className="bg-green-50 border border-green-100 rounded-xl p-3 hover:bg-green-100 transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-green-500"/>
                <span className="text-xs font-semibold text-green-700">Pagesat e kryera</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{ngarkimi ? '—' : (data?.paguarCount ?? 0)}</p>
              <span className="text-xs text-green-500 group-hover:underline">Shiko të gjitha →</span>
            </Link>

            {/* Pa paguar — count */}
            <Link to="/pagesat"
              className="bg-red-50 border border-red-100 rounded-xl p-3 hover:bg-red-100 transition-colors group">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-red-400"/>
                <span className="text-xs font-semibold text-red-600">Pa paguar</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{ngarkimi ? '—' : (data?.papaguaritTotal ?? 0)}</p>
              <span className="text-xs text-red-400 group-hover:underline">Shiko të gjitha →</span>
            </Link>
          </div>

          {/* Lista e papaguarve */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pacientë pa paguar</p>
            {ngarkimi ? (
              <div className="space-y-1.5">{[1,2,3].map(i=><div key={i} className="h-8 bg-gray-100 rounded animate-pulse"/>)}</div>
            ) : data?.papaguarit?.length ? (
              <div className="space-y-1">
                {data.papaguarit.map(p => (
                  <Link key={p._id} to="/pagesat"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors">
                    <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"/>
                    <span className="text-sm text-gray-700 flex-1 truncate">{p.emri} {p.mbiemri}</span>
                    <ChevronRight size={13} className="text-gray-300"/>
                  </Link>
                ))}
                {data.papaguaritTotal > 5 && (
                  <Link to="/pagesat"
                    className="block text-center text-xs text-primary hover:underline py-1.5">
                    + {data.papaguaritTotal - 5} të tjerë pa paguar
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-3">Të gjithë kanë paguar</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
