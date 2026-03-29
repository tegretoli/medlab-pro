import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { hyrje, pastroGabim } from '../../store/slices/authSlice';
import { Eye, EyeOff, LogIn, FlaskConical } from 'lucide-react';

export default function Hyrje() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const { perdoruesi, ngarkimi, gabim, requires2FA } = useSelector(s => s.auth);

  const [forma, setForma]         = useState({
    email:       localStorage.getItem('savedEmail') || '',
    fjalekalimi: '',
  });
  const [shfaqFjal, setShfaqFjal] = useState(false);
  const [mbajMend, setMbajMend]   = useState(!!localStorage.getItem('savedEmail'));

  useEffect(() => {
    if (perdoruesi) navigate('/dashboard', { replace: true });
  }, [perdoruesi]);

  useEffect(() => {
    if (requires2FA) navigate('/2fa', { replace: true });
  }, [requires2FA]);

  useEffect(() => () => { dispatch(pastroGabim()); }, []);

  const set = (k, v) => setForma(p => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mbajMend) {
      localStorage.setItem('savedEmail', forma.email.trim());
    } else {
      localStorage.removeItem('savedEmail');
    }
    dispatch(hyrje({ email: forma.email.trim(), fjalekalimi: forma.fjalekalimi }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A3A6B] to-[#0f2347] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1A3A6B] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FlaskConical size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MedLab Pro</h1>
          <p className="text-gray-500 text-sm mt-1">Sistemi Informativ për Klinikë Laboratorike</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input w-full"
              placeholder="emri@klinika.al"
              value={forma.email}
              onChange={e => set('email', e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fjalëkalimi</label>
            <div className="relative">
              <input
                type={shfaqFjal ? 'text' : 'password'}
                className="input w-full pr-10"
                placeholder="••••••••"
                value={forma.fjalekalimi}
                onChange={e => set('fjalekalimi', e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShfaqFjal(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {shfaqFjal ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          {/* Mbaj mend */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mbajMend}
              onChange={e => setMbajMend(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#1A3A6B] accent-[#1A3A6B]"
            />
            <span className="text-sm text-gray-600">Mbaj mend email-in</span>
          </label>

          {gabim && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              {gabim}
            </div>
          )}

          <button
            type="submit"
            disabled={ngarkimi}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base"
          >
            {ngarkimi
              ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>
              : <LogIn size={18}/>}
            {ngarkimi ? 'Duke u verifikuar...' : 'Hyr në Sistem'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Pas hyrjes do t'ju kërkohet kodi nga <strong>Google Authenticator</strong>
        </p>
      </div>
    </div>
  );
}
