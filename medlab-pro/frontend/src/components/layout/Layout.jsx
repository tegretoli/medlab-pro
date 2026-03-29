import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { dalje } from '../../store/slices/authSlice';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FlaskConical, Calendar, CreditCard,
  Archive, TrendingUp, Settings, LogOut, Menu, ChevronDown, UserCheck, Layers, Microscope, Package, TestTube2,
  BarChart2, ShieldAlert, BellRing,
} from 'lucide-react';
import api from '../../services/api';
import { QASJA_DEFAULT } from '../../pages/settings/Settings';

const NAV_RAW = [
  { path: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, moduliId: 'dashboard' },
  { path: '/pacientet',   label: 'Pacientet',  icon: Users,           moduliId: 'pacientet' },
  { path: '/referuesit',  label: 'Referuesit', icon: UserCheck,       moduliId: 'referuesit' },
  {
    label: 'Laboratori', icon: FlaskConical, moduliId: 'laboratori',
    nen: [
      { path: '/laboratori/departamentet', label: 'Departamentet' },
      { path: '/laboratori/porosi/krijo',  label: '+ Porosi e Re' },
    ]
  },
  { path: '/regjistro-analize',     label: 'Regjistro Analize',  icon: TestTube2,    moduliId: 'regjistro-analize' },
  { path: '/regjistro-profilet',    label: 'Regjistro Profilet', icon: Layers,       moduliId: 'regjistro-profilet' },
  { path: '/regjistro-antibiogram', label: 'Antibiogrami',       icon: Microscope,   moduliId: 'antibiogram' },
  { path: '/paketat-analizave', label: 'Paketat',     icon: Package,    moduliId: 'paketat-analizave' },
  { path: '/kontrollet', label: 'Kontrollet', icon: Calendar,    moduliId: 'kontrollet' },
  { path: '/pagesat',    label: 'Pagesat',    icon: CreditCard,  moduliId: 'pagesat' },
  { path: '/arkiva',     label: 'Arkiva',     icon: Archive,     moduliId: 'arkiva' },
  { path: '/financa',     label: 'Financa',    icon: TrendingUp,  moduliId: 'financa' },
  { path: '/statistikat', label: 'Statistikat', icon: BarChart2,  moduliId: 'statistikat' },
  { path: '/alarmet',     label: 'Alarmet',     icon: BellRing,    moduliId: 'alarmet',    badge: true },
  { path: '/audit-logs',  label: 'Audit Logs',  icon: ShieldAlert, moduliId: 'audit-logs', vetemAdmin: true },
  { path: '/settings',    label: 'Cilesimet',   icon: Settings,    moduliId: 'settings' },
];

export default function Layout() {
  const { perdoruesi } = useSelector(s => s.auth);
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [sidHapur, setSidHapur] = useState(false);
  const [zgj, setZgj]           = useState({ Laboratori: false });
  const [alarmCount, setAlarmCount] = useState(0);

  useEffect(() => {
    const fetch = () => api.get('/alarmet/count').then(r => setAlarmCount(r.data.total || 0)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000); // poll çdo 30s
    return () => clearInterval(interval);
  }, []);

  const eAdmin = perdoruesi?.roli === 'admin';
  const qasjet = perdoruesi?.qasjet || [];
  const kaCes  = (id) => {
    if (!id || eAdmin) return true;
    if (qasjet.length > 0) return qasjet.includes(id);
    return (QASJA_DEFAULT[perdoruesi?.roli] || []).includes(id);
  };
  const NAV = NAV_RAW.filter(item => {
    if (item.vetemAdmin && !eAdmin) return false;
    return kaCes(item.moduliId);
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — icon-only by default on desktop, expands on hover */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        w-60 lg:w-16 lg:hover:w-60
        bg-[#1B4F8A] text-white flex flex-col
        transition-all duration-300 ease-in-out
        overflow-hidden group
        lg:translate-x-0 lg:static
        ${sidHapur ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 bg-[#0D7377] rounded-lg flex items-center justify-center font-bold text-base flex-shrink-0">M</div>
          <div className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <div className="font-bold text-base leading-tight">MedLab Pro</div>
            <div className="text-xs text-blue-300">Sistemi Klinik</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {NAV.map(item => {
            const Icon = item.icon;
            if (item.nen) {
              const hapurSek = zgj[item.label];
              return (
                <div key={item.label}>
                  <button onClick={() => setZgj(p => ({...p, [item.label]: !p[item.label]}))}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-200 hover:bg-white/10 hover:text-white transition-colors">
                    <Icon size={17} className="flex-shrink-0"/>
                    <span className="flex-1 text-left lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{item.label}</span>
                    <ChevronDown size={13} className={`lg:opacity-0 lg:group-hover:opacity-100 duration-200 flex-shrink-0 transition-all ${hapurSek ? 'rotate-180' : ''}`}/>
                  </button>
                  {hapurSek && (
                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                      {item.nen.map(n => (
                        <NavLink key={n.path} to={n.path} onClick={() => setSidHapur(false)}
                          className={({ isActive }) => `block px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${isActive ? 'bg-[#0D7377] text-white font-medium' : 'text-blue-300 hover:text-white hover:bg-white/10'}`}>
                          {n.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <NavLink key={item.path} to={item.path} onClick={() => setSidHapur(false)}
                className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#0D7377] text-white font-medium' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}>
                <div className="relative flex-shrink-0">
                  <Icon size={17}/>
                  {item.badge && alarmCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5 leading-none">
                      {alarmCount > 99 ? '99+' : alarmCount}
                    </span>
                  )}
                </div>
                <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap flex-1">{item.label}</span>
                {item.badge && alarmCount > 0 && (
                  <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-4.5 flex items-center justify-center px-1 flex-shrink-0">
                    {alarmCount > 99 ? '99+' : alarmCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 bg-[#0D7377] rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0">
              {perdoruesi?.emri?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              <div className="text-sm font-medium truncate">{perdoruesi?.emri} {perdoruesi?.mbiemri}</div>
              <div className="text-xs text-blue-300 capitalize">{perdoruesi?.roli}</div>
            </div>
          </div>
          <button onClick={() => { dispatch(dalje()); navigate('/hyrje'); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-300 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut size={15} className="flex-shrink-0"/>
            <span className="lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">Dil</span>
          </button>
        </div>
      </aside>

      {sidHapur && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidHapur(false)}/>}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidHapur(true)} className="lg:hidden text-gray-500"><Menu size={22}/></button>
          <div className="flex-1"/>
          <span className="text-sm text-gray-500 hidden md:block">Dr. <strong>{perdoruesi?.emri} {perdoruesi?.mbiemri}</strong></span>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
