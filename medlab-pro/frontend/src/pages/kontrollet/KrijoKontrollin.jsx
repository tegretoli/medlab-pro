import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ChevronLeft, Search, X } from 'lucide-react';

export default function KrijoKontrollin() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pacienti, setPacienti]     = useState(null);
  const [mjeket, setMjeket]         = useState([]);
  const [kerko, setKerko]           = useState('');
  const [sugjerimet, setSugjerimet] = useState([]);
  const [forma, setForma]           = useState({
    mjekuId: '', dataTakimit: new Date().toISOString().split('T')[0],
    kohaFillimit: '08:00', lloji: 'Kontrolle_Rutine', arsyjaVizites: '',
  });
  const [duke_ruajtur, setDukeRuajtur] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get('/perdorues').then(r => setMjeket(r.data.perdoruesit?.filter(p => p.roli === 'mjek') || [])).catch(() => {});
    const pid = params.get('pacientiId');
    if (pid) api.get(`/pacientet/${pid}`).then(r => setPacienti(r.data.pacienti)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!kerko || kerko.length < 2) { setSugjerimet([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.get('/pacientet/kerko', { params: { q: kerko } }).then(r => setSugjerimet(r.data.pacientet)).catch(() => {});
    }, 300);
  }, [kerko]);

  const dergoje = async (e) => {
    e.preventDefault();
    if (!pacienti) return toast.error('Zgjidh pacientin');
    if (!forma.mjekuId) return toast.error('Zgjidh mjekun');
    setDukeRuajtur(true);
    try {
      await api.post('/kontrollet', { pacientiId: pacienti._id, ...forma });
      toast.success('Takimi u caktua!');
      navigate('/kontrollet');
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim');
    }
    setDukeRuajtur(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ChevronLeft size={20}/></button>
        <h1 className="text-2xl font-bold text-gray-800">Cakto Takim</h1>
      </div>

      <form onSubmit={dergoje} className="space-y-5">
        {/* Pacienti */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-700">👤 Pacienti</h3>
          {pacienti ? (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <div className="w-9 h-9 bg-primary rounded-xl text-white font-bold flex items-center justify-center text-sm">
                {pacienti.emri[0]}{pacienti.mbiemri[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{pacienti.emri} {pacienti.mbiemri}</p>
                <p className="text-xs text-gray-400">NID: {pacienti.numrPersonal}</p>
              </div>
              <button type="button" onClick={() => { setPacienti(null); setKerko(''); }}><X size={16} className="text-gray-400"/></button>
            </div>
          ) : (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input className="input pl-9" placeholder="Kerko pacient..." value={kerko} onChange={e => setKerko(e.target.value)} />
              {sugjerimet.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 overflow-hidden">
                  {sugjerimet.map(p => (
                    <button type="button" key={p._id} onClick={() => { setPacienti(p); setSugjerimet([]); setKerko(''); }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b last:border-0 text-sm">
                      <strong>{p.emri} {p.mbiemri}</strong> <span className="text-gray-400">· {p.numrPersonal}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detajet e takimit */}
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-700">📅 Detajet e Takimit</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data</label>
              <input type="date" className="input" value={forma.dataTakimit} max="9999-12-31"
                onChange={e => setForma(p=>({...p, dataTakimit: e.target.value}))} required />
            </div>
            <div>
              <label className="label">Ora</label>
              <input type="time" className="input" value={forma.kohaFillimit}
                onChange={e => setForma(p=>({...p, kohaFillimit: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="label">Mjeku</label>
            <select className="input" value={forma.mjekuId} onChange={e => setForma(p=>({...p, mjekuId: e.target.value}))} required>
              <option value="">Zgjidh mjekun...</option>
              {mjeket.map(m => <option key={m._id} value={m._id}>Dr. {m.emri} {m.mbiemri} {m.specialiteti ? `— ${m.specialiteti}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Lloji</label>
            <select className="input" value={forma.lloji} onChange={e => setForma(p=>({...p, lloji: e.target.value}))}>
              <option value="Kontrolle_Rutine">Kontrolle Rutine</option>
              <option value="Kontrolle_Urgjente">Urgjente</option>
              <option value="Follow_Up">Follow-Up</option>
              <option value="Konsultim">Konsultim</option>
              <option value="Procedura">Procedure</option>
            </select>
          </div>
          <div>
            <label className="label">Arsyeja e Vizites</label>
            <textarea className="input resize-none h-20" value={forma.arsyjaVizites}
              onChange={e => setForma(p=>({...p, arsyjaVizites: e.target.value}))}
              placeholder="Pershkrim i shkurter..." />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">Anulo</button>
          <button type="submit" disabled={duke_ruajtur} className="btn-primary px-8">
            {duke_ruajtur ? 'Duke caktuar...' : '✓ Cakto Takimin'}
          </button>
        </div>
      </form>
    </div>
  );
}
