import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { regjistroPatient } from '../../store/slices/pacientetSlice';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';

const Seksion = ({ titulli, children }) => (
  <div className="card">
    <h3 className="font-semibold text-gray-700 border-b pb-3 mb-4">{titulli}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);

export default function RegjistroPatient() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { ngarkimi } = useSelector(s => s.pacientet);
  const [form, setForm] = useState({
    emri: '', mbiemri: '', numrPersonal: '', datelindja: '', gjinia: '',
    telefoni: '', email: '', grupiGjaku: '',
    adresa: { rruga: '', qyteti: '', rajoni: '' },
  });

  const set      = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const setAdresa = (field, val) => setForm(p => ({ ...p, adresa: { ...p.adresa, [field]: val } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.adresa.qyteti.trim()) {
      toast.error('Qyteti i vendbanimit eshte i detyrueshem');
      return;
    }
    const result = await dispatch(regjistroPatient(form));
    if (regjistroPatient.fulfilled.match(result)) {
      toast.success('Pacienti u regjistrua me sukses!');
      navigate(`/pacientet/${result.payload._id}`);
    } else {
      toast.error(result.payload || 'Gabim gjate regjistrimit');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ChevronLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Regjistro Pacient</h1>
          <p className="text-gray-500 text-sm">Shto pacient te ri ne sistem</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Seksion titulli="Informacioni Personal">
          <div>
            <label className="label">Emri *</label>
            <input className="input" value={form.emri} onChange={e=>set('emri',e.target.value)} required />
          </div>
          <div>
            <label className="label">Mbiemri *</label>
            <input className="input" value={form.mbiemri} onChange={e=>set('mbiemri',e.target.value)} required />
          </div>
          <div>
            <label className="label">Numri Personal</label>
            <input className="input font-mono" value={form.numrPersonal} onChange={e=>set('numrPersonal',e.target.value)} />
          </div>
          <div>
            <label className="label">Data e Lindjes *</label>
            <input type="date" className="input" value={form.datelindja} max="9999-12-31" onChange={e=>set('datelindja',e.target.value)} required />
          </div>
          <div>
            <label className="label">Gjinia *</label>
            <select className="input" value={form.gjinia} onChange={e=>set('gjinia',e.target.value)} required>
              <option value="">Zgjidh...</option>
              <option value="M">Mashkull</option>
              <option value="F">Femer</option>
              <option value="Tjeter">Tjeter</option>
            </select>
          </div>
          <div>
            <label className="label">Grupi i Gjakut</label>
            <select className="input" value={form.grupiGjaku} onChange={e=>set('grupiGjaku',e.target.value)}>
              <option value="">I panjohur</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
        </Seksion>

        <Seksion titulli="Kontakti & Adresa">
          <div>
            <label className="label">Telefoni *</label>
            <input className="input" value={form.telefoni} onChange={e=>set('telefoni',e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={e=>set('email',e.target.value)} />
          </div>
          <div>
            <label className="label">Qyteti * <span className="text-xs font-normal text-gray-400">(vendbanimi)</span></label>
            <input className="input" value={form.adresa.qyteti}
              onChange={e=>setAdresa('qyteti',e.target.value)}
              placeholder="p.sh. Tirane" required />
          </div>
          <div>
            <label className="label">Rruga / Adresa</label>
            <input className="input" value={form.adresa.rruga}
              onChange={e=>setAdresa('rruga',e.target.value)}
              placeholder="p.sh. Rr. Kavajes, Nr. 5" />
          </div>
        </Seksion>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">Anulo</button>
          <button type="submit" disabled={ngarkimi} className="btn-primary px-8">
            {ngarkimi ? 'Duke ruajtur...' : 'Regjistro Pacientin'}
          </button>
        </div>
      </form>
    </div>
  );
}
