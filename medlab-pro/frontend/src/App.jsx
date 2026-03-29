import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useInactivityTimer } from './hooks/useInactivityTimer';
import Layout from './components/layout/Layout';
import Hyrje from './pages/auth/Hyrje';
import Verifikimi2FA from './pages/auth/Verifikimi2FA';
import Dashboard from './pages/Dashboard';

// Pacientet
import ListaPacienteve  from './pages/pacientet/ListaPacienteve';
import ProfiliPacientit from './pages/pacientet/ProfiliPacientit';
import RegjistroPatient from './pages/pacientet/RegjistroPatient';

// Laboratori
import Departamentet    from './pages/laboratori/Departamentet';
import KrijoPorosi    from './pages/laboratori/KrijoPorosi';
import RezultateInput   from './pages/laboratori/RezultateInput';
import FletaPunuese     from './pages/laboratori/FletaPunuese';
import RegjistroAnalize     from './pages/RegjistroAnalize';
import RegjistroProfilet    from './pages/RegjistroProfilet';
import RegjistroAntibiogram from './pages/RegjistroAntibiogram';

// Kontrollet
import Kontrollet      from './pages/kontrollet/Kontrollet';
import KrijoKontrollin from './pages/kontrollet/KrijoKontrollin';

// Pagesat
import PagesatDitore   from './pages/pagesat/PagesatDitore';

// Referuesit
import Referuesit from './pages/referuesit/Referuesit';

// Paketat
import PaketaAnalizave from './pages/paketat/PaketaAnalizave';

// Arkiva & Financa & Settings
import Arkiva      from './pages/arkiva/Arkiva';
import Financa     from './pages/financa/Financa';
import Settings    from './pages/settings/Settings';
import Statistikat from './pages/statistikat/Statistikat';
import AuditLogs   from './pages/audit/AuditLogs';
import Alarmet          from './pages/alarmet/Alarmet';
import RezultatePublike from './pages/RezultatePublike';

const RutePrivate = ({ children }) => {
  const { perdoruesi } = useSelector(s => s.auth);
  useInactivityTimer(!!perdoruesi);
  if (!perdoruesi) return <Navigate to="/hyrje" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/hyrje" element={<Hyrje />} />
        <Route path="/2fa"   element={<Verifikimi2FA />} />
        <Route path="/" element={<RutePrivate><Layout /></RutePrivate>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Pacientet */}
          <Route path="pacientet" element={<ListaPacienteve />} />
          <Route path="pacientet/regjistro" element={<RegjistroPatient />} />
          <Route path="pacientet/:id" element={<ProfiliPacientit />} />

          {/* Laboratori */}
          <Route path="laboratori/departamentet" element={<Departamentet />} />
          <Route path="laboratori/porosi/krijo"  element={<KrijoPorosi />} />
          <Route path="laboratori/rezultate/:id" element={<RezultateInput />} />

          {/* Regjistrim */}
          <Route path="regjistro-analize"      element={<RegjistroAnalize />} />
          <Route path="regjistro-profilet"     element={<RegjistroProfilet />} />
          <Route path="regjistro-antibiogram"  element={<RegjistroAntibiogram />} />

          {/* Kontrollet */}
          <Route path="kontrollet"       element={<Kontrollet />} />
          <Route path="kontrollet/krijo" element={<KrijoKontrollin />} />

          {/* Pagesat */}
          <Route path="pagesat" element={<PagesatDitore />} />

          {/* Referuesit */}
          <Route path="referuesit" element={<Referuesit />} />

          {/* Paketat */}
          <Route path="paketat-analizave" element={<PaketaAnalizave />} />

          {/* Arkiva, Financa, Settings */}
          <Route path="arkiva"      element={<Arkiva />} />
          <Route path="financa"     element={<Financa />} />
          <Route path="settings"    element={<Settings />} />
          <Route path="statistikat" element={<Statistikat />} />
          <Route path="alarmet"     element={<Alarmet />} />
          <Route path="audit-logs"  element={<AuditLogs />} />
        </Route>
        {/* Fleta punuese — standalone print page, pa Layout */}
        <Route path="laboratori/fleta-punuese/:id" element={<RutePrivate><FletaPunuese /></RutePrivate>} />
        {/* Rezultate publike — pa auth, aksesuar me QR kod */}
        <Route path="r/:token" element={<RezultatePublike />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
