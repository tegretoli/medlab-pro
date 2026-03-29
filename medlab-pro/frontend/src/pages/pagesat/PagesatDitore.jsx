import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Search, ChevronDown, CreditCard,
  CheckCircle, Banknote, Building2, X,
  Percent, Euro, FlaskConical, Microscope, Dna, Printer,
  ReceiptText, Tag, Loader2,
} from 'lucide-react';
import DateFilter, { labelData } from '../../components/ui/DateFilter';

// ─── Kosovo-style Fiscal Receipt Modal ───────────────────────────────────────
function ModalKuponiFiskal({ grup, settings, isLeShuar, onClose, onPrinted }) {
  const allPorosite = grup.porosite || [];
  const allPaid    = allPorosite.every(p => p.pagesa?.statusi === 'Paguar');
  const brutoTotal = allPorosite.reduce((s, p) => s + (p.cmimiTotal || 0), 0);
  const paguarTotal = allPaid
    ? allPorosite.reduce((s, p) => s + (p.pagesa?.shumaFinal || 0), 0)
    : brutoTotal;
  const firstPagesa = allPorosite[0]?.pagesa;
  const zPct = allPaid ? (firstPagesa?.zbritjaPerqind || 0) : 0;
  const zFix = allPaid ? (firstPagesa?.zbritjaFikse   || 0) : 0;
  const isZbritjeTotale = allPaid && firstPagesa?.metodaPagese === 'ZbritjeTotale';
  const hasZbritje = isZbritjeTotale || zPct > 0 || zFix > 0;
  const zbritjaTxt = isZbritjeTotale
    ? `- ${brutoTotal.toFixed(2)} €`
    : zPct > 0 ? `- ${(brutoTotal * zPct / 100).toFixed(2)} € (${zPct}%)`
    : zFix > 0 ? `- ${zFix.toFixed(2)} €` : '';

  const tani    = new Date();
  const dataTxt = tani.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const kohaTxt = tani.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const numrSerial = `${String(tani.getFullYear()).slice(-2)}${String(tani.getMonth()+1).padStart(2,'0')}${String(tani.getDate()).padStart(2,'0')}-${String(tani.getHours()).padStart(2,'0')}${String(tani.getMinutes()).padStart(2,'0')}${String(tani.getSeconds()).padStart(2,'0')}`;

  const allItems = allPorosite.flatMap(p => {
    const tipi = p.tipiPacientit || 'pacient';
    return (p.analizat || []).map(a => ({
      emri:  a.analiza?.emri || '—',
      cmimi: a.analiza?.cmime?.[tipi] ?? a.analiza?.cmime?.pacient ?? 0,
    }));
  });

  const printReceipt = () => {
    if (isLeShuar) return;
    const labEmri    = settings?.emriKlinikes || 'EXACT LAB';
    const labAdresa  = settings?.adresaKlinikes || '';
    const labTel     = settings?.telefonKlinikes || '';
    const nrUnik     = settings?.nrUnik || '';
    const nrBiznesit = settings?.nrBiznesit || '';
    const nrTvsh     = settings?.nrTvsh || '';

    const servicesRows = allItems.map(a => {
      const nm   = (a.emri).slice(0, 28);
      const pr   = a.cmimi.toFixed(2) + ' \u20ac';
      const dots = '.'.repeat(Math.max(2, 34 - nm.length - pr.length));
      return `<div style="display:flex;justify-content:space-between;margin:1px 0;"><span>${nm}</span><span style="white-space:nowrap">${dots} ${pr}</span></div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kupon Fiskal</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #111; margin:0; padding:0; }
      .center { text-align:center; } .bold { font-weight:bold; }
      .line { border-top: 1px dashed #666; margin: 5px 0; }
      .double { border-top: 2px solid #111; margin: 5px 0; }
      .row { display:flex; justify-content:space-between; margin:1px 0; }
      .total-row { display:flex; justify-content:space-between; font-weight:bold; font-size:13px; margin:3px 0; }
      .preview-note { font-size:9px; color:#888; text-align:center; margin-top:6px; font-style:italic; border:1px dashed #ccc; padding:3px; }
    </style></head><body>
    <div class="center bold" style="font-size:14px;margin-top:4px;">${labEmri}</div>
    ${labAdresa ? `<div class="center" style="font-size:9px;">${labAdresa}</div>` : ''}
    ${labTel    ? `<div class="center" style="font-size:9px;">Tel: ${labTel}</div>` : ''}
    ${nrUnik    ? `<div class="center" style="font-size:9px;">NUI: ${nrUnik}${nrBiznesit ? '  /  Nr.Biz: ' + nrBiznesit : ''}</div>` : (nrBiznesit ? `<div class="center" style="font-size:9px;">Nr.Biz: ${nrBiznesit}</div>` : '')}
    ${nrTvsh    ? `<div class="center" style="font-size:9px;">Nr.TVSH: ${nrTvsh}</div>` : ''}
    <div class="double"></div>
    <div class="center bold" style="font-size:13px;letter-spacing:2px;">KUPON FISKAL</div>
    <div class="center" style="font-size:9px;color:#555;">(Preview – jo fiskal i vërtetë)</div>
    <div class="line"></div>
    <div class="row"><span>Data:</span><span>${dataTxt}</span></div>
    <div class="row"><span>Ora:</span><span>${kohaTxt}</span></div>
    <div class="row"><span>Nr.Kuponi:</span><span>${numrSerial}</span></div>
    <div class="line"></div>
    <div class="bold" style="margin-bottom:2px;">Shërbime:</div>
    ${servicesRows}
    <div class="line"></div>
    ${hasZbritje ? `<div class="row"><span>Total Bruto:</span><span>${brutoTotal.toFixed(2)} €</span></div><div class="row"><span>Zbritje:</span><span>${zbritjaTxt}</span></div>` : ''}
    <div class="double"></div>
    <div class="total-row"><span>TOTALI:</span><span>${paguarTotal.toFixed(2)} €</span></div>
    <div class="double"></div>
    <div class="center" style="margin-top:8px;font-size:10px;">Faleminderit për zgjedhjen tuaj!</div>
    <div class="center" style="font-size:9px;">${labEmri} – Laborator Mjekësor</div>
    <div class="preview-note">⚠ Ky kupon është vetëm preview.<br/>Nuk ka vlefshmëri ligjore fiskale.</div>
    </body></html>`;

    const w = window.open('', 'KuponFiskal', 'width=360,height=600,scrollbars=yes');
    if (!w) { toast.error('Lejo dritaret pop-up për printim'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
    onPrinted?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[92vh]">

        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLeShuar ? 'bg-gray-100' : 'bg-green-100'}`}>
              <ReceiptText size={14} className={isLeShuar ? 'text-gray-400' : 'text-green-600'}/>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Kupon Fiskal</p>
              <p className="text-xs text-gray-400">Preview – jo fiskal i vërtetë</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15}/></button>
        </div>

        {/* Already issued banner */}
        {isLeShuar && (
          <div className="mx-4 mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex-shrink-0">
            <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-800">Kuponi është lëshuar</p>
              <p className="text-xs text-amber-600">Nuk mund të lëshohet përsëri</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <div style={{ fontFamily: "'Courier New', Courier, monospace", width: 280, fontSize: 11, color: '#111', border: `1px solid ${isLeShuar ? '#e5e7eb' : '#ddd'}`, padding: 12, borderRadius: 6, background: isLeShuar ? '#f9f9f9' : '#fafafa', opacity: isLeShuar ? 0.6 : 1 }}>

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>
              {settings?.emriKlinikes || 'EXACT LAB'}
            </div>
            {settings?.adresaKlinikes && <div style={{ textAlign: 'center', fontSize: 9, color: '#555' }}>{settings.adresaKlinikes}</div>}
            {settings?.telefonKlinikes && <div style={{ textAlign: 'center', fontSize: 9, color: '#555' }}>Tel: {settings.telefonKlinikes}</div>}
            {(settings?.nrUnik || settings?.nrBiznesit) && (
              <div style={{ textAlign: 'center', fontSize: 9, color: '#555' }}>
                {[settings?.nrUnik && 'NUI: ' + settings.nrUnik, settings?.nrBiznesit && 'Nr.Biz: ' + settings.nrBiznesit].filter(Boolean).join('  /  ')}
              </div>
            )}
            {settings?.nrTvsh && <div style={{ textAlign: 'center', fontSize: 9, color: '#555' }}>Nr.TVSH: {settings.nrTvsh}</div>}

            <div style={{ borderTop: '2px solid #111', margin: '6px 0' }}/>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>KUPON FISKAL</div>
            <div style={{ textAlign: 'center', fontSize: 9, color: '#888', marginBottom: 4 }}>(Preview – jo fiskal i vërtetë)</div>

            <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Data:</span><span>{dataTxt}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ora:</span><span>{kohaTxt}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Nr.Kuponi:</span><span style={{ fontSize: 9 }}>{numrSerial}</span></div>

            <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }}/>
            <div style={{ fontWeight: 'bold', marginBottom: 3 }}>Shërbime:</div>
            {allItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', margin: '1px 0', fontSize: 10 }}>
                <span style={{ flex: 1, marginRight: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{it.emri}</span>
                <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{it.cmimi.toFixed(2)} €</span>
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }}/>
            {hasZbritje && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Bruto:</span><span>{brutoTotal.toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c00' }}>
                  <span>Zbritje:</span><span>{zbritjaTxt}</span>
                </div>
              </>
            )}
            <div style={{ borderTop: '2px solid #111', margin: '4px 0' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14 }}>
              <span>TOTALI:</span><span>{paguarTotal.toFixed(2)} €</span>
            </div>
            <div style={{ borderTop: '2px solid #111', margin: '4px 0' }}/>

            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }}/>
            <div style={{ textAlign: 'center', fontSize: 10 }}>Faleminderit për zgjedhjen tuaj!</div>
            <div style={{ textAlign: 'center', fontSize: 9, color: '#555' }}>{settings?.emriKlinikes || 'EXACT LAB'} – Laborator Mjekësor</div>
            <div style={{ border: '1px dashed #ccc', padding: '4px 6px', marginTop: 8, textAlign: 'center', fontSize: 9, color: '#999', fontStyle: 'italic' }}>
              ⚠ Ky kupon është vetëm preview.<br/>Nuk ka vlefshmëri ligjore fiskale.
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Mbyll</button>
          {isLeShuar ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed border border-gray-200">
              <CheckCircle size={14} className="text-green-500"/>
              Lëshuar
            </div>
          ) : (
            <button onClick={printReceipt}
              className="flex-1 text-sm flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">
              <Printer size={14}/> Printo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const DEP_ICON = {
  Biokimi:       <FlaskConical size={12} className="text-blue-500"/>,
  Mikrobiologji: <Microscope   size={12} className="text-green-500"/>,
  PCR:           <Dna          size={12} className="text-purple-500"/>,
};

function llogaritFinal(bruto, perqind, fikse) {
  const pas = bruto * (1 - (perqind || 0) / 100);
  return Math.max(0, pas - (fikse || 0));
}

export default function PagesatDitore() {
  const sot = new Date().toISOString().split('T')[0];
  const [searchParams] = useSearchParams();
  const [dataFillim, setDataFillim] = useState(searchParams.get('dataFillim') || sot);
  const [dataMbarim, setDataMbarim] = useState(searchParams.get('dataMbarim') || sot);
  const pacientiIdFilter = searchParams.get('pacientiId') || '';
  const [porosite, setPorosite]         = useState([]);
  const [ngarkimi, setNgarkimi]         = useState(false);
  const [stats, setStats]               = useState({ totali: 0, paguar: 0, borxhi: 0 });

  const [kerko, setKerko]             = useState('');
  const [referuesit, setReferuesit]   = useState([]);
  const [refZgjedhur, setRefZgjedhur] = useState('');
  const [kerkoRef, setKerkoRef]       = useState('');
  const [refHapur, setRefHapur]       = useState(false);
  const refDropRef                    = useRef(null);

  // modal = { pacienti, allPorosite, papaguara, eshtePagezur }
  const [modal, setModal]               = useState(null);
  const [zbritjaTipi, setZbritjaTipi]   = useState('perqind');
  const [zbritjaVlera, setZbritjaVlera] = useState('');
  const [metoda, setMetoda]             = useState('Kesh');
  const [duke_ruajtur, setDukeRuajtur]  = useState(false);
  // Discount code state
  const [kodInput, setKodInput]         = useState('');
  const [kodGjendje, setKodGjendje]     = useState(null); // null | { valid, zbritja, pershkrim, mesazhi }
  const [dukeValiduar, setDukeValiduar] = useState(false);
  const [fiskalGrupi, setFiskalGrupi]   = useState(null);
  const [settings, setSettings]         = useState(null);
  const [leshuar, setLeshuar]           = useState(() => {
    try {
      const saved = localStorage.getItem('fiskal_leshuar');
      if (!saved) return new Set();
      const all = JSON.parse(saved);
      // Keep only valid keys (MongoDB _id format: 24-char hex, possibly joined with _)
      const valid = all.filter(k => /^[a-f0-9_]{24,}$/.test(k));
      if (valid.length !== all.length) {
        localStorage.setItem('fiskal_leshuar', JSON.stringify(valid));
      }
      return new Set(valid);
    } catch { return new Set(); }
  });

  useEffect(() => {
    api.get('/referuesit').then(r => setReferuesit(r.data.data || [])).catch(() => {});
    api.get('/settings').then(r => setSettings(r.data.settings || r.data || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!refHapur) return;
    const h = e => { if (refDropRef.current && !refDropRef.current.contains(e.target)) setRefHapur(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [refHapur]);

  const ngarko = () => {
    setNgarkimi(true);
    const params = { dataFillim, dataMbarim };
    if (refZgjedhur) params.referuesId = refZgjedhur;
    api.get('/pagesat/porosi-ditore', { params })
      .then(r => {
        setPorosite(r.data.porosite || []);
        setStats({ totali: r.data.totali || 0, paguar: r.data.paguar || 0, borxhi: r.data.borxhi || 0 });
        setNgarkimi(false);
      })
      .catch(() => setNgarkimi(false));
  };

  useEffect(() => { ngarko(); }, [dataFillim, dataMbarim, refZgjedhur]);

  // Each order is its own payment row — numrRendor is unique per dept per registration
  const grupuara = useMemo(() => {
    const q = kerko.toLowerCase();
    return porosite
      .filter(p => {
        if (!p.pacienti?._id) return false;
        if (pacientiIdFilter && p.pacienti._id !== pacientiIdFilter) return false;
        if (!q) return true;
        return `${p.pacienti?.emri} ${p.pacienti?.mbiemri} ${p.pacienti?.numrPersonal} ${p.numrPorosi}`.toLowerCase().includes(q);
      })
      .map(p => ({ pacienti: p.pacienti, numrRendor: p.numrRendor, porosite: [p] }));
  }, [porosite, kerko, pacientiIdFilter]);

  const hapModal = group => {
    const papaguara = group.porosite.filter(p => p.pagesa?.statusi !== 'Paguar');
    const eshtePagezur = papaguara.length === 0;
    setModal({ pacienti: group.pacienti, allPorosite: group.porosite, papaguara, eshtePagezur });
    if (eshtePagezur) {
      const pagesa = group.porosite[0]?.pagesa;
      setZbritjaTipi(pagesa?.zbritjaFikse > 0 ? 'fikse' : 'perqind');
      setZbritjaVlera(String(pagesa?.zbritjaPerqind > 0 ? pagesa.zbritjaPerqind : pagesa?.zbritjaFikse > 0 ? pagesa.zbritjaFikse : ''));
    } else {
      setZbritjaTipi('perqind');
      setZbritjaVlera('');
    }
    setMetoda(group.porosite[0]?.pagesa?.metodaPagese || 'Kesh');
    setKodInput('');
    setKodGjendje(null);
  };

  const validoKodin = async () => {
    if (!kodInput.trim()) return;
    setDukeValiduar(true);
    try {
      const { data } = await api.post('/zbritjet/valido', { kodi: kodInput.trim() });
      setKodGjendje(data);
      if (data.valid) {
        setZbritjaTipi('perqind');
        setZbritjaVlera(String(data.zbritja));
        toast.success(`Kodi i zbritjes u aplikua: ${data.zbritja}%`);
      }
    } catch {
      setKodGjendje({ valid: false, mesazhi: 'Gabim gjatë validimit' });
    } finally {
      setDukeValiduar(false);
    }
  };

  const paguaj = async () => {
    if (!modal?.papaguara?.length) return;
    const papaguara = modal.papaguara;
    const brutoTotal = papaguara.reduce((s, p) => s + (p.cmimiTotal || 0), 0);
    const zPct = zbritjaTipi === 'perqind' ? Number(zbritjaVlera || 0) : 0;
    const zFix = zbritjaTipi === 'fikse'   ? Number(zbritjaVlera || 0) : 0;
    const finalTotal = metoda === 'ZbritjeTotale' ? 0 : llogaritFinal(brutoTotal, zPct, zFix);

    setDukeRuajtur(true);
    try {
      for (const ord of papaguara) {
        const ordBruto = ord.cmimiTotal || 0;
        const ratio = brutoTotal > 0 ? ordBruto / brutoTotal : 1 / papaguara.length;
        const ordFinal = Math.round(finalTotal * ratio * 100) / 100;
        await api.put(`/pagesat/porosi/${ord._id}/paguaj`, {
          metodaPagese: metoda,
          zbritjaPerqind: zPct,
          zbritjaFikse: zFix,
          shumaTotale: ordBruto,
          shumaFinal: ordFinal,
          kodZbritjes: (kodGjendje?.valid && kodInput) ? kodInput.trim().toUpperCase() : null,
        });
      }
      toast.success('Pagesa u regjistrua!');
      setModal(null);
      ngarko();
    } catch (e) {
      toast.error(e.response?.data?.mesazh || 'Gabim gjate pageses');
    } finally {
      setDukeRuajtur(false);
    }
  };

  const refLabel = () => {
    if (!refZgjedhur) return 'Referuesit...';
    if (refZgjedhur === 'vete') return 'Vete ardhur';
    const r = referuesit.find(x => x._id === refZgjedhur);
    return r ? (r.institucioni || `${r.emri} ${r.mbiemri}`) : '—';
  };
  const refFiltruara = referuesit.filter(r =>
    !kerkoRef || `${r.emri} ${r.mbiemri} ${r.institucioni || ''}`.toLowerCase().includes(kerkoRef.toLowerCase())
  );

  // Modal computed values
  const modalPapaguara = modal?.papaguara || [];
  const modalBruto = modalPapaguara.reduce((s, p) => s + (p.cmimiTotal || 0), 0);
  const allBruto   = (modal?.allPorosite || []).reduce((s, p) => s + (p.cmimiTotal || 0), 0);
  const zPct       = zbritjaTipi === 'perqind' ? Number(zbritjaVlera || 0) : 0;
  const zFix       = zbritjaTipi === 'fikse'   ? Number(zbritjaVlera || 0) : 0;
  const totalFinal = metoda === 'ZbritjeTotale' ? 0 : llogaritFinal(modalBruto, zPct, zFix);

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Pagesat Ditore</h1>
          <p className="text-gray-400 text-xs">{labelData(dataFillim, dataMbarim)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">
              Σ {stats.totali.toLocaleString()} €
            </span>
            <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium">
              ✓ {stats.paguar.toLocaleString()} €
            </span>
            <span className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-lg font-medium">
              ⚠ {stats.borxhi.toLocaleString()} €
            </span>
          </div>
          <DateFilter dataFillim={dataFillim} dataMbarim={dataMbarim}
            onChange={({ dataFillim: f, dataMbarim: t }) => { setDataFillim(f); setDataMbarim(t); }}/>
        </div>
      </div>

      {/* Search + Referrer */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-8 text-xs py-2 w-full"
            placeholder="Kerko pacient, nr porosi..."
            value={kerko} onChange={e => setKerko(e.target.value)}/>
        </div>

        <div className="relative flex-shrink-0" ref={refDropRef}>
          <button onClick={() => { setRefHapur(v => !v); setKerkoRef(''); }}
            className="input text-xs py-2 w-48 flex items-center gap-2 text-left">
            <Search size={13} className="text-gray-400 flex-shrink-0"/>
            <span className={`flex-1 truncate ${refZgjedhur ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {refLabel()}
            </span>
            {refZgjedhur
              ? <span onClick={e => { e.stopPropagation(); setRefZgjedhur(''); }} className="text-gray-400 hover:text-gray-600 px-0.5 cursor-pointer">×</span>
              : <ChevronDown size={12} className="text-gray-400"/>}
          </button>

          {refHapur && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-56 py-1">
              <div className="px-2 pb-1 pt-1">
                <input autoFocus className="input text-xs py-1.5 w-full"
                  placeholder="Kerko referues..."
                  value={kerkoRef} onChange={e => setKerkoRef(e.target.value)}/>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {!kerkoRef && (
                  <>
                    <button onClick={() => { setRefZgjedhur(''); setRefHapur(false); }}
                      className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 ${!refZgjedhur ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                      Të gjithë
                    </button>
                    <button onClick={() => { setRefZgjedhur('vete'); setRefHapur(false); }}
                      className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 ${refZgjedhur === 'vete' ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                      Vete ardhur
                    </button>
                    {referuesit.length > 0 && <div className="border-t border-gray-100 my-1"/>}
                  </>
                )}
                {refFiltruara.filter(r => r.tipi === 'Doktor').length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 px-3 py-1">Doktore</p>
                    {refFiltruara.filter(r => r.tipi === 'Doktor').map(r => (
                      <button key={r._id} onClick={() => { setRefZgjedhur(r._id); setRefHapur(false); }}
                        className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 truncate ${refZgjedhur === r._id ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                        {r.institucioni || `${r.emri} ${r.mbiemri}`}
                      </button>
                    ))}
                  </>
                )}
                {refFiltruara.filter(r => r.tipi === 'Bashkpuntor').length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 px-3 py-1">Bashkpunëtore</p>
                    {refFiltruara.filter(r => r.tipi === 'Bashkpuntor').map(r => (
                      <button key={r._id} onClick={() => { setRefZgjedhur(r._id); setRefHapur(false); }}
                        className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 truncate ${refZgjedhur === r._id ? 'text-primary font-semibold' : 'text-gray-700'}`}>
                        {r.institucioni || `${r.emri} ${r.mbiemri}`}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient-grouped list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {ngarkimi ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 animate-pulse h-14"/>
          ))
        ) : grupuara.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <CreditCard size={32} className="text-gray-200 mb-2"/>
            <p className="text-gray-400 text-sm">Asnjë porosi për këtë datë</p>
          </div>
        ) : grupuara.map(group => {
          const allPaid  = group.porosite.every(p => p.pagesa?.statusi === 'Paguar');
          const somePaid = !allPaid && group.porosite.some(p => p.pagesa?.statusi === 'Paguar');
          const brutoTotal = group.porosite.reduce((s, p) => s + (p.cmimiTotal || 0), 0);
          const paguarTotal = group.porosite
            .filter(p => p.pagesa?.statusi === 'Paguar')
            .reduce((s, p) => s + (p.pagesa.shumaFinal || 0), 0);
          const shuma = allPaid ? paguarTotal : brutoTotal;
          const ref = group.porosite[0]?.referuesId;
          const metodaE = group.porosite[0]?.pagesa?.metodaPagese;
          const eshteZbritje  = allPaid && metodaE === 'ZbritjeTotale';
          const firstPagesa   = group.porosite[0]?.pagesa;
          const zPct          = firstPagesa?.zbritjaPerqind || 0;
          const zFix          = firstPagesa?.zbritjaFikse   || 0;
          const hasZbritje    = allPaid && (eshteZbritje || zPct > 0 || zFix > 0);
          const zbritjaTxt    = eshteZbritje ? '100%' : zPct > 0 ? `-${zPct}%` : zFix > 0 ? `-${zFix} €` : '';

          // Use order _id (unique across all days) — NOT pacientiId+numrRendor which resets daily
          const grupKey = group.porosite.map(p => p._id).sort().join('_');
          const kohaReg = group.porosite[0]?.dataPorosis
            ? new Date(group.porosite[0].dataPorosis).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', hour12: false })
            : null;

          return (
            <div key={grupKey}
              className={`bg-white rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${eshteZbritje ? 'border-yellow-100' : allPaid ? 'border-green-100' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${eshteZbritje ? 'bg-yellow-400' : allPaid ? 'bg-green-400' : somePaid ? 'bg-yellow-400' : 'bg-gray-300'}`}/>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {group.pacienti?.emri} {group.pacienti?.mbiemri}
                  </p>
                  {group.numrRendor && (
                    <span className="text-xs font-bold text-white bg-gray-500 px-1.5 py-0.5 rounded flex-shrink-0 font-mono">
                      #{group.numrRendor}
                    </span>
                  )}
                  {kohaReg && (
                    <span className="text-xs text-gray-400 font-mono flex-shrink-0">{kohaReg}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {group.porosite.map(p => (
                    <span key={p._id} className="flex items-center gap-0.5">
                      {DEP_ICON[p.departamenti]}
                      <span className="text-xs text-gray-500">{p.departamenti}</span>
                      {p.pagesa?.statusi === 'Paguar' && <CheckCircle size={10} className="text-green-400"/>}
                    </span>
                  ))}
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-gray-400">
                    {group.porosite.reduce((s, p) => s + (p.analizat?.length || 0), 0)} analiza
                  </span>
                  {ref && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400 truncate">
                        {ref.institucioni || `${ref.emri} ${ref.mbiemri}`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 text-right mr-2">
                {hasZbritje && brutoTotal > shuma && (
                  <p className="text-xs text-gray-400 line-through tabular-nums">{brutoTotal.toLocaleString()} €</p>
                )}
                <div className="flex items-center gap-1.5 justify-end">
                  <p className={`text-sm font-bold tabular-nums ${eshteZbritje ? 'text-yellow-600' : hasZbritje ? 'text-green-700' : 'text-gray-800'}`}>
                    {shuma.toLocaleString()} €
                  </p>
                  {hasZbritje && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${eshteZbritje ? 'bg-yellow-100 text-yellow-700' : 'bg-orange-100 text-orange-700'}`}>
                      {zbritjaTxt}
                    </span>
                  )}
                </div>
                {eshteZbritje ? (
                  <div className="flex items-center gap-1 text-yellow-600 text-xs font-medium justify-end">
                    <CheckCircle size={11}/> Zbritje Totale
                  </div>
                ) : allPaid ? (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-medium justify-end">
                    <CheckCircle size={11}/>
                    {metodaE === 'Bank' ? 'Bank' : 'Kesh'}
                  </div>
                ) : somePaid ? (
                  <p className="text-xs text-yellow-500 font-medium">Pjeserisht</p>
                ) : (
                  <p className="text-xs text-gray-400">Papaguar</p>
                )}
              </div>

              <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                <button
                  onClick={() => allPaid && setFiskalGrupi(group)}
                  title={allPaid ? 'Shiko kuponin fiskal' : 'Kryej pagesen fillimisht'}
                  disabled={!allPaid}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    allPaid
                      ? 'border-green-200 text-green-600 hover:text-green-800 hover:bg-green-50 cursor-pointer'
                      : 'border-gray-100 text-gray-300 cursor-not-allowed'
                  }`}>
                  <ReceiptText size={14}/>
                </button>
                <div title={leshuar.has(grupKey) ? 'Kuponi u lëshuar' : 'Nuk është lëshuar'}
                  className={`w-2 h-2 rounded-full transition-colors ${leshuar.has(grupKey) ? 'bg-green-500' : 'bg-gray-200'}`}/>
              </div>
              <button
                onClick={() => window.open(`/laboratori/fleta-punuese/${group.porosite[0]._id}`, '_blank')}
                title="Printo fletën punuese"
                className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
                <Printer size={14}/>
              </button>
              <button onClick={() => hapModal(group)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  allPaid
                    ? 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}>
                {allPaid ? 'Detaje' : 'Paguaj'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-800">
                  {modal.eshtePagezur ? 'Detajet e Pageses' : 'Regjistro Pagesen'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modal.pacienti?.emri} {modal.pacienti?.mbiemri}
                  <span className="mx-1.5 text-gray-200">·</span>
                  {modal.allPorosite.map(p => p.departamenti).join(' + ')}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X size={16}/>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* Services grouped by department/order */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Shërbime</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {modal.allPorosite.map((p, pi) => {
                    const tipi = p.tipiPacientit || 'pacient';
                    const paidDot = p.pagesa?.statusi === 'Paguar';
                    return (
                      <div key={p._id}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 ${pi % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <div className="flex items-center gap-1">
                            {DEP_ICON[p.departamenti]}
                            <span className="text-xs font-semibold text-gray-600">{p.departamenti}</span>
                          </div>
                          {paidDot && <CheckCircle size={11} className="text-green-400 ml-auto"/>}
                        </div>
                        {(p.analizat || []).map((a, i) => {
                          const cmimi = a.analiza?.cmime?.[tipi] ?? a.analiza?.cmime?.pacient ?? 0;
                          return (
                            <div key={i} className={`flex items-center justify-between px-3 py-2 pl-7 ${pi % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
                              <span className="text-xs text-gray-700">{a.analiza?.emri || '—'}</span>
                              <span className="text-xs font-semibold text-gray-800 tabular-nums">{cmimi.toLocaleString()} €</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-200">
                    <span className="text-xs font-semibold text-gray-600">Total bruto</span>
                    <span className="text-sm font-bold text-gray-800 tabular-nums">{allBruto.toLocaleString()} €</span>
                  </div>
                </div>
              </div>

              {/* All paid — show payment details */}
              {modal.eshtePagezur && (() => {
                const paidTotal = modal.allPorosite.reduce((s, p) => s + (p.pagesa?.shumaFinal || 0), 0);
                const firstPagesa = modal.allPorosite[0]?.pagesa;
                const isZbritjeTotale = firstPagesa?.metodaPagese === 'ZbritjeTotale';
                const hasZbritje = firstPagesa?.zbritjaPerqind > 0 || firstPagesa?.zbritjaFikse > 0 || isZbritjeTotale;
                return (
                  <div className={`border rounded-xl px-4 py-3 space-y-1.5 ${isZbritjeTotale ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-semibold ${isZbritjeTotale ? 'text-yellow-700' : 'text-green-700'}`}>Paguar</span>
                      <span className={`text-lg font-bold ${isZbritjeTotale ? 'text-yellow-700' : 'text-green-700'}`}>{paidTotal.toLocaleString()} €</span>
                    </div>
                    <div className={`border-t pt-1.5 space-y-1 ${isZbritjeTotale ? 'border-yellow-200' : 'border-green-200'}`}>
                      <div className={`flex justify-between text-xs ${isZbritjeTotale ? 'text-yellow-700' : 'text-green-600'}`}>
                        <span>Metoda</span>
                        <span className="font-medium flex items-center gap-1">
                          {isZbritjeTotale
                            ? <Percent size={12}/>
                            : firstPagesa?.metodaPagese === 'Kesh' ? <Banknote size={12}/> : <Building2 size={12}/>}
                          {isZbritjeTotale ? 'Zbritje Totale' : firstPagesa?.metodaPagese}
                        </span>
                      </div>
                      {hasZbritje && (
                        <div className={`flex justify-between text-xs font-semibold ${isZbritjeTotale ? 'text-yellow-700' : 'text-green-700'}`}>
                          <span>Zbritje</span>
                          <span>
                            {isZbritjeTotale
                              ? '100%'
                              : firstPagesa?.zbritjaPerqind > 0
                                ? `${firstPagesa.zbritjaPerqind}%`
                                : `${firstPagesa?.zbritjaFikse} €`}
                          </span>
                        </div>
                      )}
                      <div className={`flex justify-between text-xs ${isZbritjeTotale ? 'text-yellow-600' : 'text-green-600'}`}>
                        <span>Data</span>
                        <span className="font-medium">{new Date(firstPagesa?.dataPageses).toLocaleString('sq-AL')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Unpaid — payment method + discount */}
              {!modal.eshtePagezur && (
                <>
                  {/* Note if partially paid */}
                  {modal.papaguara.length < modal.allPorosite.length && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-xs text-blue-700 space-y-0.5">
                      <div className="flex justify-between">
                        <span>E paguar:</span>
                        <span className="font-medium">{(allBruto - modalBruto).toLocaleString()} €</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Mbetur per pagese:</span>
                        <span>{modalBruto.toLocaleString()} €</span>
                      </div>
                    </div>
                  )}

                  {/* Payment method */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Metoda e Pageses</p>
                    <div className="flex gap-2">
                      <button onClick={() => setMetoda('Kesh')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-colors ${
                          metoda === 'Kesh' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Banknote size={16}/> Kesh
                      </button>
                      <button onClick={() => setMetoda('Bank')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-colors ${
                          metoda === 'Bank' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Building2 size={16}/> Bank
                      </button>
                      <button onClick={() => setMetoda('ZbritjeTotale')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-medium text-sm transition-colors ${
                          metoda === 'ZbritjeTotale' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Percent size={16}/> Zbritje
                      </button>
                    </div>
                  </div>

                  {/* Discount code */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Kodi i Zbritjes</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input
                          type="text"
                          placeholder="p.sh. RINOR25"
                          className="input text-sm w-full pl-8 uppercase"
                          value={kodInput}
                          onChange={e => { setKodInput(e.target.value.toUpperCase()); setKodGjendje(null); if (kodGjendje?.valid) { setZbritjaVlera(''); } }}
                          onKeyDown={e => e.key === 'Enter' && validoKodin()}
                        />
                      </div>
                      <button
                        onClick={validoKodin}
                        disabled={dukeValiduar || !kodInput.trim()}
                        className="btn-ghost border border-gray-200 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
                        {dukeValiduar ? <Loader2 size={14} className="animate-spin"/> : null}
                        Verifiko
                      </button>
                    </div>
                    {kodGjendje && (
                      <div className={`mt-1.5 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
                        kodGjendje.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {kodGjendje.valid
                          ? <><CheckCircle size={12}/> Zbritje {kodGjendje.zbritja}% {kodGjendje.pershkrim ? `· ${kodGjendje.pershkrim}` : ''}</>
                          : <><X size={12}/> {kodGjendje.mesazhi}</>
                        }
                      </div>
                    )}
                  </div>

                  {/* Discount */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Zbritja (opsionale)</p>
                    <div className="flex gap-2 mb-2">
                      <button onClick={() => { setZbritjaTipi('perqind'); setZbritjaVlera(''); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                          zbritjaTipi === 'perqind' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Percent size={13}/> Zbritje %
                      </button>
                      <button onClick={() => { setZbritjaTipi('fikse'); setZbritjaVlera(''); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                          zbritjaTipi === 'fikse' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        <Euro size={13}/> Zbritje €
                      </button>
                    </div>
                    <input type="number" min="0"
                      max={zbritjaTipi === 'perqind' ? 100 : modalBruto}
                      placeholder={zbritjaTipi === 'perqind' ? 'Shkruaj perqindjen (0–100)' : 'Shkruaj shumen ne EUR'}
                      className="input text-sm w-full"
                      value={zbritjaVlera}
                      onChange={e => setZbritjaVlera(e.target.value)}/>
                  </div>

                  {/* Total pageses */}
                  <div className={`rounded-xl px-4 py-3 border space-y-1.5 ${
                    metoda === 'ZbritjeTotale' ? 'bg-yellow-50 border-yellow-200' :
                    Number(zbritjaVlera) > 0  ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Total bruto</span>
                      <span className="tabular-nums">{modalBruto.toLocaleString()} €</span>
                    </div>
                    {metoda === 'ZbritjeTotale' ? (
                      <div className="flex justify-between text-xs text-yellow-600">
                        <span>Zbritje Totale</span>
                        <span className="tabular-nums">− {modalBruto.toLocaleString()} €</span>
                      </div>
                    ) : Number(zbritjaVlera) > 0 && (
                      <div className="flex justify-between text-xs text-red-500">
                        <span>Zbritje {zbritjaTipi === 'perqind' ? `${zbritjaVlera}%` : `${zbritjaVlera} €`}</span>
                        <span className="tabular-nums">− {(modalBruto - totalFinal).toFixed(2)} €</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center border-t border-gray-200 pt-1.5">
                      <span className="text-sm font-semibold text-gray-700">Totali i Pageses</span>
                      <span className={`text-xl font-bold ${
                        metoda === 'ZbritjeTotale' ? 'text-yellow-600' :
                        Number(zbritjaVlera) > 0  ? 'text-green-700' : 'text-gray-800'
                      }`}>
                        {totalFinal.toLocaleString()} €
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-5 py-4 border-t flex gap-3 flex-shrink-0">
              <button onClick={() => setModal(null)} className="btn-ghost flex-1 text-sm">
                {modal.eshtePagezur ? 'Mbyll' : 'Anulo'}
              </button>
              {!modal.eshtePagezur && (
                <button onClick={paguaj} disabled={duke_ruajtur}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  <CheckCircle size={15}/>
                  {duke_ruajtur ? 'Duke ruajtur...' : `Konfirmo · ${totalFinal.toLocaleString()} €`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Receipt Modal */}
      {fiskalGrupi && (() => {
        const key = (fiskalGrupi.porosite || []).map(p => p._id).sort().join('_');
        return (
          <ModalKuponiFiskal
            grup={fiskalGrupi}
            settings={settings}
            isLeShuar={leshuar.has(key)}
            onClose={() => setFiskalGrupi(null)}
            onPrinted={() => setLeshuar(prev => {
              const next = new Set([...prev, key]);
              try { localStorage.setItem('fiskal_leshuar', JSON.stringify([...next])); } catch {}
              return next;
            })}
          />
        );
      })()}
    </div>
  );
}
