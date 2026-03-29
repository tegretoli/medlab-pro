import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { verifikto2FA, pastroGabim, pastro2FA } from '../../store/slices/authSlice';
import { ShieldCheck, FlaskConical, ArrowLeft } from 'lucide-react';

export default function Verifikimi2FA() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { perdoruesi, ngarkimi, gabim, requires2FA, needsSetup, qrCode } = useSelector(s => s.auth);

  const [kodi, setKodi] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (perdoruesi) navigate('/dashboard', { replace: true });
  }, [perdoruesi]);

  useEffect(() => {
    if (!requires2FA) navigate('/hyrje', { replace: true });
  }, [requires2FA]);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { dispatch(pastroGabim()); };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (kodi.length !== 6) return;
    dispatch(verifikto2FA({ kodi }));
  };

  const handleKodi = (v) => {
    const vetem = v.replace(/\D/g, '').slice(0, 6);
    setKodi(vetem);
  };

  const handleKthehu = () => {
    dispatch(pastro2FA());
    dispatch(pastroGabim());
    navigate('/hyrje', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A3A6B] to-[#0f2347] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#1A3A6B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FlaskConical size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Verifikimi 2FA</h1>
          <p className="text-gray-500 text-sm mt-1">
            {needsSetup
              ? 'Konfiguro Google Authenticator — skanoni kodin QR'
              : 'Futni kodin 6-shifror nga Google Authenticator'}
          </p>
        </div>

        {needsSetup && qrCode && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-sm text-blue-800">
              <strong>Hapi 1:</strong> Hapni aplikacionin <strong>Google Authenticator</strong> në telefon dhe skanoni kodin QR më poshtë.
            </div>
            <div className="flex justify-center mb-4">
              <div className="bg-white border-2 border-gray-200 rounded-xl p-3 inline-block">
                <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48"/>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>Hapi 2:</strong> Futni kodin 6-shifror që shfaqet në aplikacion.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Kodi nga Google Authenticator
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              className="input w-full text-center text-2xl tracking-widest font-mono"
              placeholder="000000"
              value={kodi}
              onChange={e => handleKodi(e.target.value)}
              autoComplete="one-time-code"
              required
            />
          </div>

          {gabim && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm text-center">
              {gabim}
            </div>
          )}

          <button
            type="submit"
            disabled={ngarkimi || kodi.length !== 6}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {ngarkimi
              ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
              : <ShieldCheck size={18}/>}
            {ngarkimi ? 'Duke verifikuar...' : 'Verifiko & Hyr'}
          </button>
        </form>

        <button
          onClick={handleKthehu}
          className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          <ArrowLeft size={14}/> Kthehu te hyrja
        </button>
      </div>
    </div>
  );
}
