// Stub pages — zevendesohen me implementim te plote
import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';

const StubPage = ({ titulli, pershkrim }) => (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold text-gray-800">{titulli}</h1>
    <div className="card text-center py-16">
      <FlaskConical size={48} className="mx-auto mb-4 text-gray-300" />
      <p className="text-gray-500">{pershkrim}</p>
      <p className="text-xs text-gray-400 mt-2">Moduli eshte gati per implementim</p>
    </div>
  </div>
);

export const ListaTesteve      = () => <StubPage titulli="Katalogu i Testeve"          pershkrim="Menaxho listen e testeve laboratorike" />;
export const PorosiLab         = () => <StubPage titulli="Krijo Porosi Laboratorike"   pershkrim="Zgjidh pacientin dhe testet" />;
export const ListaPorositeve   = () => <StubPage titulli="Porosite Laboratorike"        pershkrim="Lista e te gjitha porosive" />;
export const RezultateInput    = () => <StubPage titulli="Regjistro Rezultate"          pershkrim="Fut rezultatet laboratorike" />;
export const KalendarTakimesh  = () => <StubPage titulli="Kalendari i Takimeve"        pershkrim="Pamja javore dhe ditore" />;
export const ListaKontrolleve  = () => <StubPage titulli="Lista e Kontrolleve"         pershkrim="Te gjitha vizitat mjekesore" />;
export const DetaljeKontrolli  = () => <StubPage titulli="Detajet e Vizites"           pershkrim="Informacioni i plote i vizites" />;
export const KrijoKontrollin   = () => <StubPage titulli="Cakto Takim"                pershkrim="Regjistro vizite te re" />;
export const ListaFaturave     = () => <StubPage titulli="Faturat"                     pershkrim="Menaxho pagesat dhe faturat" />;
export const KrijoFaturen      = () => <StubPage titulli="Krijo Fature"               pershkrim="Fature e re per sherbime" />;
export const DetaljetFatures   = () => <StubPage titulli="Detajet e Fatures"          pershkrim="Informacion i plote i fatures" />;
export const DashboardFinanciar= () => <StubPage titulli="Dashboard Financiar"        pershkrim="Statistika dhe raporte financiare" />;
