import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { hyrje, pastroGabim } from '../../store/slices/authSlice';
import { Eye, EyeOff, LogIn, FlaskConical } from 'lucide-react';
import loginLabHero from '../../assets/login-lab-hero.jpg';

export default function Hyrje() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { perdoruesi, ngarkimi, gabim, requires2FA } = useSelector(s => s.auth);

  const [forma, setForma] = useState({
    email: localStorage.getItem('savedEmail') || '',
    fjalekalimi: '',
  });
  const [shfaqFjal, setShfaqFjal] = useState(false);
  const [mbajMend, setMbajMend] = useState(!!localStorage.getItem('savedEmail'));

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
    <div className="h-screen overflow-hidden bg-[linear-gradient(135deg,#1c3557_0%,#19314f_22%,#162b46_52%,#132338_100%)]">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_0.92fr]">
        <section className="relative flex h-full items-center justify-center overflow-hidden px-6 py-8 sm:px-10 lg:px-16">
          <div className="absolute inset-0 bg-[linear-gradient(145deg,#1c3557_0%,#19314f_30%,#162b46_64%,#132338_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(47,143,163,0.20),transparent_20%),radial-gradient(circle_at_68%_28%,rgba(62,178,194,0.16),transparent_22%),radial-gradient(circle_at_75%_75%,rgba(9,24,37,0.28),transparent_24%)]" />

          <div className="flex w-full max-w-[440px] -translate-y-16 flex-col justify-center px-2 py-2 sm:-translate-y-20 sm:px-4 lg:-translate-y-24">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(180deg,#2f8fa3_0%,#255f86_55%,#1c3557_100%)] shadow-[0_18px_34px_rgba(16,35,56,0.28)]">
                <FlaskConical size={30} className="text-[#eefbff]" />
              </div>
              <h1 className="text-[2.3rem] font-semibold tracking-tight text-white">
                MedLab Pro
              </h1>
              <p className="mt-2 text-[15px] leading-6 text-slate-200/90">
                Sistemi Informativ për Klinikë Laboratorike
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Email
                </label>
                <input
                  type="email"
                  className="h-14 w-full rounded-2xl border border-white/12 bg-white/90 px-4 text-[15px] text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#7be0da] focus:ring-4 focus:ring-[#7be0da]/15"
                  placeholder="Shkruani adresën tuaj të emailit"
                  value={forma.email}
                  onChange={e => set('email', e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-white">
                  Fjalëkalimi
                </label>
                <div className="relative">
                  <input
                    type={shfaqFjal ? 'text' : 'password'}
                    className="h-14 w-full rounded-2xl border border-white/12 bg-white/90 px-4 pr-12 text-[15px] text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-[#7be0da] focus:ring-4 focus:ring-[#7be0da]/15"
                    placeholder="••••••••••"
                    value={forma.fjalekalimi}
                    onChange={e => set('fjalekalimi', e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShfaqFjal(p => !p)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100/80 hover:text-slate-600"
                  >
                    {shfaqFjal ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 pt-1 select-none">
                <input
                  type="checkbox"
                  checked={mbajMend}
                  onChange={e => setMbajMend(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/20 accent-[#2f8fa3]"
                />
                <span className="text-sm font-medium text-slate-100">Mbaj mend email-in</span>
              </label>

              {gabim && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {gabim}
                </div>
              )}

                <button
                type="submit"
                disabled={ngarkimi}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#2f8fa3_0%,#255f86_42%,#1c3557_100%)] px-5 text-base font-semibold text-white shadow-[0_16px_28px_rgba(16,35,56,0.28)] transition-all hover:translate-y-[-1px] hover:shadow-[0_20px_38px_rgba(16,35,56,0.34)] disabled:translate-y-0 disabled:opacity-70"
              >
                {ngarkimi
                  ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <LogIn size={18} />}
                {ngarkimi ? 'Duke u verifikuar...' : 'Hyr në Sistem'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs leading-5 text-slate-200/85">
              Pas hyrjes do t&apos;ju kërkohet kodi nga <strong className="font-semibold text-white">Google Authenticator</strong>
            </p>
          </div>
        </section>

        <section className="relative hidden h-full lg:block">
          <img
            src={loginLabHero}
            alt="Pamje laboratorike"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(28,53,87,0.14),rgba(47,143,163,0.12))]" />
        </section>
      </div>
    </div>
  );
}
