import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import DateFilter, { labelData } from '../components/ui/DateFilter';
import {
  Users, FlaskConical, Calendar, AlertCircle, TrendingUp,
  CheckCircle, Clock, CreditCard, ChevronRight, ArrowUpRight,
} from 'lucide-react';

function Kartela({ titulli, vlera, icon: Icon, ngjyra, to }) {
  const inner = (
    <div className="card group relative min-h-[100px] cursor-pointer overflow-hidden border-white/60 bg-white/90 p-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800 sm:min-h-[100px] sm:p-3.5">
      <div className="relative flex h-full items-start gap-3 sm:gap-4">
        <div className={`rounded-2xl p-3 shadow-sm ${ngjyra}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
          <div className="min-h-[34px]">
            <p className="line-clamp-2 text-sm leading-5 text-gray-500 dark:text-white">{titulli}</p>
          </div>
          <p className="mt-1 text-[2.1rem] font-bold leading-none tracking-tight text-gray-800 dark:text-white">
            {vlera ?? '—'}
          </p>
        </div>
        <ArrowUpRight size={16} className="mt-1 text-gray-300 transition-colors group-hover:text-gray-500 dark:text-slate-300 dark:group-hover:text-white" />
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
  const [data, setData] = useState(null);
  const [ngarkimi, setNgarkimi] = useState(true);

  useEffect(() => {
    setNgarkimi(true);
    api.get('/dashboard', { params: { dataFillim, dataMbarim } })
      .then(r => {
        setData(r.data);
        setNgarkimi(false);
      })
      .catch(() => setNgarkimi(false));
  }, [dataFillim, dataMbarim]);

  const k = data?.kartela;

  const veprimeTeShpejta = [
    { label: 'Regjistro Pacient', path: '/pacientet/regjistro', bg: 'from-[#355f99] to-[#416fae]' },
    { label: 'Porosi Laboratorike', path: '/laboratori/porosi/krijo', bg: 'from-[#226f6a] to-[#2d8a83]' },
    { label: 'Cakto Takim', path: '/kontrollet/krijo', bg: 'from-[#6a56a7] to-[#7965b5]' },
    { label: 'Pagesat', path: '/pagesat', bg: 'from-[#9a6b2a] to-[#b17c32]' },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-[#f7fbff] to-[#eef5ff] px-4 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:from-[#182234] dark:via-[#182234] dark:to-[#182234] dark:shadow-none sm:px-6 sm:py-6">
        <div className="relative flex flex-col gap-4">
          <div>
            <div>
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                Miresevini, {perdoruesi?.emri}!
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300 sm:text-base">{labelData(dataFillim, dataMbarim)}</p>
            </div>
          </div>

          <DateFilter
            dataFillim={dataFillim}
            dataMbarim={dataMbarim}
            onChange={({ dataFillim: f, dataMbarim: t }) => {
              setDataFillim(f);
              setDataMbarim(t);
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {veprimeTeShpejta.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`group relative overflow-hidden rounded-[1.4rem] bg-gradient-to-r ${item.bg} px-4 py-4 text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5`}
          >
            <div className="relative flex items-center justify-between gap-3">
              <p className="min-w-0 text-left text-base font-semibold leading-tight sm:text-[15px]">{item.label}</p>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12">
                <ArrowUpRight size={18} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kartela titulli="Pacientë Ditor" vlera={k?.pacienteDitor} icon={Users} ngjyra="bg-[#1B4F8A]" to="/laboratori/departamentet" />
        <Kartela titulli="Pacientë në Proces" vlera={k?.pacienteNeProcesim} icon={Clock} ngjyra="bg-purple-500" to="/laboratori/departamentet" />
        <Kartela titulli="Takime" vlera={k?.takime} icon={Calendar} ngjyra="bg-teal-600" to="/kontrollet" />
        <Kartela titulli="Pagesat e Kryera" vlera={`${(k?.pagesatKryera || 0).toLocaleString()} €`} icon={TrendingUp} ngjyra="bg-green-600" to="/pagesat" />
        <Kartela titulli="Borxhi" vlera={`${(k?.borxhi || 0).toLocaleString()} €`} icon={AlertCircle} ngjyra="bg-red-500" to="/pagesat" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card space-y-4 border-white/60 bg-white/90 shadow-[0_12px_35px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
              <FlaskConical size={17} className="text-purple-500" /> Laboratori
            </h2>
            <Link to="/laboratori/departamentet" className="flex items-center gap-0.5 text-xs text-primary hover:underline dark:text-white">
              Shih te gjitha <ChevronRight size={13} />
            </Link>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white">Testet e ditës</p>
            {ngarkimi ? (
              <div className="space-y-1.5">{[1, 2, 3].map(i => <div key={i} className="h-7 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />)}</div>
            ) : data?.testeteTop5?.length ? (
              <div className="space-y-1">
                {data.testeteTop5.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 dark:bg-slate-700">
                    <span className="truncate text-sm text-gray-700 dark:text-white">{t.emri}</span>
                    <span className="ml-2 shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-600 dark:bg-violet-500/20 dark:text-white">
                      {t.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-gray-400 dark:text-white">Asnjë test për këtë periudhë</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-1 dark:border-slate-700 sm:grid-cols-2">
            <Link to="/laboratori/departamentet" className="group rounded-xl border border-green-100 bg-green-50 p-3 transition-colors hover:bg-green-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50">
              <div className="mb-1 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500 dark:text-emerald-300" />
                <span className="text-xs font-semibold text-green-700 dark:text-white">Pacientë të kryer</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-white">{ngarkimi ? '—' : (data?.pacienteKryer ?? 0)}</p>
              <span className="text-xs text-green-500 group-hover:underline dark:text-white">Shiko të gjitha →</span>
            </Link>

            <Link to="/laboratori/departamentet" className="group rounded-xl border border-orange-100 bg-orange-50 p-3 transition-colors hover:bg-orange-100 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-950/50">
              <div className="mb-1 flex items-center gap-2">
                <Clock size={14} className="text-orange-500 dark:text-amber-300" />
                <span className="text-xs font-semibold text-orange-700 dark:text-white">Në procesim</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-white">{ngarkimi ? '—' : (data?.pacienteNeProcesim ?? 0)}</p>
              <span className="text-xs text-orange-500 group-hover:underline dark:text-white">Shiko të gjitha →</span>
            </Link>
          </div>
        </div>

        <div className="card space-y-4 border-white/60 bg-white/90 shadow-[0_12px_35px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-white">
              <CreditCard size={17} className="text-green-500" /> Pagesat
            </h2>
            <Link to="/pagesat" className="flex items-center gap-0.5 text-xs text-primary hover:underline dark:text-white">
              Shih te gjitha <ChevronRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link to="/pagesat" className="group rounded-xl border border-green-100 bg-green-50 p-3 transition-colors hover:bg-green-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50">
              <div className="mb-1 flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500 dark:text-emerald-300" />
                <span className="text-xs font-semibold text-green-700 dark:text-white">Pagesat e kryera</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-white">{ngarkimi ? '—' : (data?.paguarCount ?? 0)}</p>
              <span className="text-xs text-green-500 group-hover:underline dark:text-white">Shiko të gjitha →</span>
            </Link>

            <Link to="/pagesat" className="group rounded-xl border border-red-100 bg-red-50 p-3 transition-colors hover:bg-red-100 dark:border-rose-800 dark:bg-rose-950/30 dark:hover:bg-rose-950/50">
              <div className="mb-1 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 dark:text-rose-300" />
                <span className="text-xs font-semibold text-red-600 dark:text-white">Pa paguar</span>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-white">{ngarkimi ? '—' : (data?.papaguaritTotal ?? 0)}</p>
              <span className="text-xs text-red-400 group-hover:underline dark:text-white">Shiko të gjitha →</span>
            </Link>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white">Pacientë pa paguar</p>
            {ngarkimi ? (
              <div className="space-y-1.5">{[1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-gray-100 dark:bg-slate-700" />)}</div>
            ) : data?.papaguarit?.length ? (
              <div className="space-y-1">
                {data.papaguarit.map(p => (
                  <Link key={p._id} to="/pagesat" className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700/70">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                    <span className="flex-1 truncate text-sm text-gray-700 dark:text-white">{p.emri} {p.mbiemri}</span>
                    <ChevronRight size={13} className="text-gray-300 dark:text-white" />
                  </Link>
                ))}

                {data.papaguaritTotal > 5 && (
                  <Link to="/pagesat" className="block py-1.5 text-center text-xs text-primary hover:underline dark:text-white">
                    + {data.papaguaritTotal - 5} të tjerë pa paguar
                  </Link>
                )}
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-gray-400 dark:text-white">Të gjithë kanë paguar</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
