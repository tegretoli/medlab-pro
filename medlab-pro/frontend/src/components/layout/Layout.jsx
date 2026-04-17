import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { dalje } from '../../store/slices/authSlice';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FlaskConical, Calendar, CreditCard,
  Archive, TrendingUp, Settings, LogOut, Menu, ChevronDown, UserCheck, Layers, Microscope, Package, TestTube2,
  BarChart2, ShieldAlert, BellRing, Moon, Sun,
} from 'lucide-react';
import api from '../../services/api';
import { QASJA_DEFAULT } from '../../pages/settings/Settings';

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', dark);
  }, [dark]);
  return [dark, setDark];
}

const NAV_RAW = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduliId: 'dashboard' },
  { path: '/pacientet', label: 'Pacientet', icon: Users, moduliId: 'pacientet' },
  { path: '/referuesit', label: 'Referuesit', icon: UserCheck, moduliId: 'referuesit' },
  {
    label: 'Laboratori', icon: FlaskConical, moduliId: 'laboratori',
    nen: [
      { path: '/laboratori/departamentet', label: 'Departamentet' },
      { path: '/laboratori/porosi/krijo', label: '+ Porosi e Re' },
    ],
  },
  { path: '/regjistro-analize', label: 'Regjistro Analize', icon: TestTube2, moduliId: 'regjistro-analize' },
  { path: '/regjistro-profilet', label: 'Regjistro Profilet', icon: Layers, moduliId: 'regjistro-profilet' },
  { path: '/regjistro-antibiogram', label: 'Antibiogrami', icon: Microscope, moduliId: 'antibiogram' },
  { path: '/paketat-analizave', label: 'Paketat', icon: Package, moduliId: 'paketat-analizave' },
  { path: '/kontrollet', label: 'Kontrollet', icon: Calendar, moduliId: 'kontrollet' },
  { path: '/pagesat', label: 'Pagesat', icon: CreditCard, moduliId: 'pagesat' },
  { path: '/arkiva', label: 'Arkiva', icon: Archive, moduliId: 'arkiva' },
  { path: '/financa', label: 'Financa', icon: TrendingUp, moduliId: 'financa' },
  { path: '/statistikat', label: 'Statistikat', icon: BarChart2, moduliId: 'statistikat' },
  { path: '/alarmet', label: 'Alarmet', icon: BellRing, moduliId: 'alarmet', badge: true },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldAlert, moduliId: 'audit-logs', vetemAdmin: true },
  { path: '/settings', label: 'Cilesimet', icon: Settings, moduliId: 'settings' },
];

export default function Layout() {
  const { perdoruesi } = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [sidHapur, setSidHapur] = useState(false);
  const [zgj, setZgj] = useState({ Laboratori: false });
  const [alarmCount, setAlarmCount] = useState(0);
  const [dark, setDark] = useDarkMode();

  useEffect(() => {
    const fetch = () => api.get('/alarmet/count').then(r => setAlarmCount(r.data.total || 0)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const eAdmin = perdoruesi?.roli === 'admin';
  const qasjet = perdoruesi?.qasjet || [];
  const kaCes = (id) => {
    if (!id || eAdmin) return true;
    if (qasjet.length > 0) return qasjet.includes(id);
    return (QASJA_DEFAULT[perdoruesi?.roli] || []).includes(id);
  };

  const NAV = NAV_RAW.filter(item => {
    if (item.vetemAdmin && !eAdmin) return false;
    return kaCes(item.moduliId);
  });

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      <aside className={`
        fixed inset-y-0 left-0 z-50
        w-[18.5rem] max-w-[85vw] lg:w-16 lg:max-w-none lg:hover:w-60
        flex flex-col text-white
        overflow-hidden group border-r border-white/10
        bg-[linear-gradient(180deg,#1c3557_0%,#162b46_52%,#132338_100%)]
        transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:static
        ${sidHapur ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4 sm:py-5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-[#2f8fa3] text-sm font-bold sm:h-10 sm:w-10 sm:text-base">M</div>
          <div className="overflow-hidden whitespace-nowrap transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
            <div className="text-sm font-bold leading-tight tracking-[0.01em] sm:text-[15px]">MedLab Pro</div>
            <div className="text-[11px] text-blue-200/80 sm:text-xs">Sistemi Klinik</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3 sm:space-y-1.5 sm:py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {NAV.map(item => {
            const Icon = item.icon;
            if (item.nen) {
              const hapurSek = zgj[item.label];
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setZgj(p => ({ ...p, [item.label]: !p[item.label] }))}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] text-slate-200/85 transition-colors hover:bg-white/10 hover:text-white sm:py-3 sm:text-sm"
                  >
                    <Icon size={18} className="flex-shrink-0 sm:h-[17px] sm:w-[17px]" />
                    <span className="flex-1 whitespace-nowrap text-left transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">{item.label}</span>
                    <ChevronDown size={14} className={`flex-shrink-0 transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 sm:h-[13px] sm:w-[13px] ${hapurSek ? 'rotate-180' : ''}`} />
                  </button>
                  {hapurSek && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3 transition-opacity duration-200 sm:ml-5 lg:opacity-0 lg:group-hover:opacity-100">
                      {item.nen.map(n => (
                        <NavLink
                          key={n.path}
                          to={n.path}
                          onClick={() => setSidHapur(false)}
                          className={({ isActive }) => `block whitespace-nowrap rounded-xl px-3 py-2 text-[15px] transition-colors sm:text-sm ${
                            isActive ? 'bg-[#3b82f6]/18 font-medium text-white' : 'text-slate-300/80 hover:bg-white/8 hover:text-white'
                          }`}
                        >
                          {n.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidHapur(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] transition-all sm:py-3 sm:text-sm ${
                  isActive ? 'bg-[#3b82f6]/18 font-medium text-white' : 'text-slate-200/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon size={18} className="sm:h-[17px] sm:w-[17px]" />
                  {item.badge && alarmCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                      {alarmCount > 99 ? '99+' : alarmCount}
                    </span>
                  )}
                </div>
                <span className="flex-1 whitespace-nowrap transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">{item.label}</span>
                {item.badge && alarmCount > 0 && (
                  <span className="flex h-4.5 min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
                    {alarmCount > 99 ? '99+' : alarmCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-white/10 px-3 py-3 sm:py-4">
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-white/6 px-3 py-2.5 sm:py-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-[#2f8fa3] text-[11px] font-bold sm:h-9 sm:w-9 sm:text-xs">
              {perdoruesi?.emri?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 whitespace-nowrap transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
              <div className="truncate text-[15px] font-medium sm:text-sm">{perdoruesi?.emri} {perdoruesi?.mbiemri}</div>
              <div className="text-[11px] capitalize text-blue-200/75 sm:text-xs">{perdoruesi?.roli}</div>
            </div>
          </div>
          <button onClick={() => { dispatch(dalje()); navigate('/hyrje'); }} className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-[15px] text-blue-100/85 transition-colors hover:bg-white/10 hover:text-white sm:text-sm">
            <LogOut size={16} className="flex-shrink-0 sm:h-[15px] sm:w-[15px]" />
            <span className="whitespace-nowrap transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">Dil</span>
          </button>
        </div>
      </aside>

      {sidHapur && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidHapur(false)} />}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/72 px-3 py-3 backdrop-blur-xl dark:border-slate-700 dark:bg-[#111827] sm:px-5">
          <div className="flex items-center gap-3 rounded-[1.35rem] border border-white/70 bg-white/55 px-3 py-2.5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
            <button onClick={() => setSidHapur(true)} className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white lg:hidden">
              <Menu size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <span className="hidden text-sm text-gray-500 dark:text-slate-300 md:block">Dr. <strong className="dark:text-slate-100">{perdoruesi?.emri} {perdoruesi?.mbiemri}</strong></span>
            </div>
            <button
              onClick={() => setDark(d => !d)}
              title={dark ? 'Modaliteti i ditës' : 'Modaliteti i natës'}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200/70 bg-white/80 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:hover:text-white"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
