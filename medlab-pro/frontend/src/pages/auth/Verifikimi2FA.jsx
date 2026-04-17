import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { verifikto2FA, pastroGabim, pastro2FA } from '../../store/slices/authSlice';
import { ShieldCheck, FlaskConical, ArrowLeft } from 'lucide-react';

export default function Verifikimi2FA() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#0e2648_0%,#163d70_48%,#0d7377_100%)] p-4 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_24%)]" />

      <div className="relative w-full max-w-md rounded-[2rem] border border-white/20 bg-white/92 p-5 shadow-[0_30px_90px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#1A3A6B_0%,#0D7377_100%)] shadow-[0_16px_35px_rgba(26,58,107,0.28)] sm:h-16 sm:w-16">
            <FlaskConical size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">Verifikimi 2FA</h1>
          <p className="mt-1 text-sm text-gray-500">
            {needsSetup
              ? 'Konfiguro Google Authenticator — skanoni kodin QR'
              : 'Futni kodin 6-shifror nga Google Authenticator'}
          </p>
        </div>

        {needsSetup && qrCode && (
          <div className="mb-6">
            <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Hapi 1:</strong> Hapni aplikacionin <strong>Google Authenticator</strong> në telefon dhe skanoni kodin QR më poshtë.
            </div>
            <div className="mb-4 flex justify-center">
              <div className="inline-block rounded-2xl border-2 border-gray-200 bg-white p-3 shadow-sm">
                <img src={qrCode} alt="QR Code 2FA" className="h-40 w-40 sm:h-48 sm:w-48" />
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Hapi 2:</strong> Futni kodin 6-shifror që shfaqet në aplikacion.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-center text-sm font-medium text-gray-700">
              Kodi nga Google Authenticator
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              className="input w-full text-center font-mono text-2xl tracking-[0.45em]"
              placeholder="000000"
              value={kodi}
              onChange={e => handleKodi(e.target.value)}
              autoComplete="one-time-code"
              required
            />
          </div>

          {gabim && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {gabim}
            </div>
          )}

          <button
            type="submit"
            disabled={ngarkimi || kodi.length !== 6}
            className="btn-primary flex w-full items-center justify-center gap-2 bg-[linear-gradient(135deg,#1A3A6B_0%,#0D7377_100%)] py-3 text-base hover:opacity-95 disabled:opacity-50"
          >
            {ngarkimi
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <ShieldCheck size={18} />}
            {ngarkimi ? 'Duke verifikuar...' : 'Verifiko & Hyr'}
          </button>
        </form>

        <button
          onClick={handleKthehu}
          className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          <ArrowLeft size={14} /> Kthehu te hyrja
        </button>
      </div>
    </div>
  );
}
