import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FlaskConical, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function RezultatePublike() {
  const { token } = useParams();
  const [gjendje, setGjendje] = useState('duke_ngarkuar'); // duke_ngarkuar | ok | gabim | jo_gati
  const [mesazh, setMesazh]   = useState('');
  const [pdfUrl, setPdfUrl]   = useState(null);

  useEffect(() => {
    if (!token) { setGjendje('gabim'); setMesazh('Link i pavlefshëm'); return; }

    fetch(`${API_URL}/laborator/publik/pdf/${token}`)
      .then(async res => {
        if (res.ok) {
          const blob = await res.blob();
          setPdfUrl(URL.createObjectURL(blob));
          setGjendje('ok');
        } else {
          const data = await res.json().catch(() => ({}));
          if (res.status === 403) {
            setGjendje('jo_gati');
          } else if (res.status === 404) {
            setGjendje('gabim');
            setMesazh('Rezultatet nuk u gjetën. Kontrolloni QR kodin ose kontaktoni laboratorin.');
          } else {
            setGjendje('gabim');
            setMesazh(data.mesazh || 'Gabim gjatë ngarkimit.');
          }
        }
      })
      .catch(() => { setGjendje('gabim'); setMesazh('Gabim i lidhjes. Provoni përsëri.'); });

    return () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); };
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <FlaskConical size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-tight">MedLab Pro</p>
            <p className="text-xs text-gray-400">Rezultatet Laboratorike</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {gjendje === 'duke_ngarkuar' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Duke ngarkuar rezultatet...</p>
          </div>
        )}

        {gjendje === 'jo_gati' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={28} className="text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Rezultatet nuk janë gati ende</h2>
              <p className="text-gray-500 text-sm max-w-sm">
                Analizat janë në procesim. Ju lutemi provoni përsëri pas njoftimit nga laboratori.
              </p>
            </div>
          </div>
        )}

        {gjendje === 'gabim' && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Link i pavlefshëm</h2>
              <p className="text-gray-500 text-sm max-w-sm">{mesazh}</p>
            </div>
          </div>
        )}

        {gjendje === 'ok' && pdfUrl && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm">
              <CheckCircle size={16} />
              <span>Rezultatet janë gati. Mund t'i shkarkoni ose printoni nga butoni i shfletuesit.</span>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-md border border-gray-200 bg-white">
              <iframe
                src={pdfUrl}
                className="w-full"
                style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
                title="Rezultatet laboratorike"
              />
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400 border-t bg-white">
        MedLab Pro · Sistemi i Menaxhimit të Laboratorit
      </footer>
    </div>
  );
}
