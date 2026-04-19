import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, Printer, ReceiptText, X } from 'lucide-react';
import api from '../services/api';

export default function FiscalPrintModal({ grup, settings, fiscalState, onClose, onRefresh }) {
  const allPorosite = grup.porosite || [];
  const allPaid = allPorosite.every((p) => p.pagesa?.statusi === 'Paguar');
  const brutoTotal = allPorosite.reduce((s, p) => s + (p.cmimiTotal || 0), 0);
  const paguarTotal = allPaid
    ? allPorosite.reduce((s, p) => s + (p.pagesa?.shumaFinal || 0), 0)
    : brutoTotal;
  const firstPagesa = allPorosite[0]?.pagesa;
  const zPct = allPaid ? (firstPagesa?.zbritjaPerqind || 0) : 0;
  const zFix = allPaid ? (firstPagesa?.zbritjaFikse || 0) : 0;
  const isZbritjeTotale = allPaid && firstPagesa?.metodaPagese === 'ZbritjeTotale';
  const hasZbritje = isZbritjeTotale || zPct > 0 || zFix > 0;
  const zbritjaTxt = isZbritjeTotale
    ? `- ${brutoTotal.toFixed(2)} €`
    : zPct > 0 ? `- ${(brutoTotal * zPct / 100).toFixed(2)} € (${zPct}%)`
    : zFix > 0 ? `- ${zFix.toFixed(2)} €` : '';

  const tani = new Date();
  const dataTxt = tani.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const kohaTxt = tani.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const numrSerial = `${String(tani.getFullYear()).slice(-2)}${String(tani.getMonth() + 1).padStart(2, '0')}${String(tani.getDate()).padStart(2, '0')}-${String(tani.getHours()).padStart(2, '0')}${String(tani.getMinutes()).padStart(2, '0')}${String(tani.getSeconds()).padStart(2, '0')}`;

  const allItems = allPorosite.flatMap((p) => {
    const tipi = p.tipiPacientit || 'pacient';
    return (p.analizat || []).map((a) => ({
      emri: a.analiza?.emri || '—',
      cmimi: a.analiza?.cmime?.[tipi] ?? a.analiza?.cmime?.pacient ?? 0,
    }));
  });

  const [jobStatus, setJobStatus] = useState(fiscalState?.status || 'not_requested');
  const [jobId, setJobId] = useState(fiscalState?.jobId || null);
  const [jobError, setJobError] = useState(fiscalState?.errorMessage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const announcedRef = useRef('');

  useEffect(() => {
    setJobStatus(fiscalState?.status || 'not_requested');
    setJobId(fiscalState?.jobId || null);
    setJobError(fiscalState?.errorMessage || '');
  }, [fiscalState]);

  useEffect(() => {
    if (!jobId || !['pending', 'queued_to_flink'].includes(jobStatus)) return undefined;

    let cancelled = false;
    let timer = null;

    const poll = async () => {
      try {
        const { data } = await api.get(`/pagesat/fiskal/jobs/${jobId}`);
        if (cancelled) return;

        const nextJob = data.job;
        setJobStatus(nextJob.status || 'not_requested');
        setJobError(nextJob.result?.errorMessage || '');

        if (['pending', 'queued_to_flink'].includes(nextJob.status)) {
          timer = setTimeout(poll, 2500);
          return;
        }

        onRefresh?.();
      } catch {
        if (!cancelled) timer = setTimeout(poll, 4000);
      }
    };

    timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, jobStatus, onRefresh]);

  useEffect(() => {
    if (!['issued', 'failed'].includes(jobStatus)) return;
    if (announcedRef.current === jobStatus) return;

    announcedRef.current = jobStatus;
    if (jobStatus === 'issued') toast.success('Kuponi fiskal u lëshua me sukses');
    if (jobStatus === 'failed') toast.error(jobError || 'Lëshimi fiskal dështoi');
  }, [jobStatus, jobError]);

  const handlePrint = async () => {
    if (jobStatus === 'issued' || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data } = await api.post('/pagesat/fiskal/jobs', {
        orderIds: allPorosite.map((p) => p._id),
      });
      const job = data.job;
      setJobId(job._id);
      setJobStatus(job.status || 'pending');
      setJobError(job.result?.errorMessage || '');
      announcedRef.current = '';
      onRefresh?.();
      toast.success(data.created ? 'Kërkesa fiskale u regjistrua' : 'Po vazhdon job-i fiskal ekzistues');
    } catch (err) {
      const message = err.response?.data?.message || 'Nuk u krijua job-i fiskal';
      setJobError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIssued = jobStatus === 'issued';
  const isInFlight = ['pending', 'queued_to_flink'].includes(jobStatus);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isIssued ? 'bg-gray-100' : isInFlight ? 'bg-blue-100' : 'bg-green-100'}`}>
              <ReceiptText size={14} className={isIssued ? 'text-gray-400' : isInFlight ? 'text-blue-600' : 'text-green-600'} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">Kupon Fiskal</p>
              <p className="text-xs text-gray-400">Pamje paraprake dhe status i job-it fiskal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
        </div>

        {jobStatus === 'issued' && (
          <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700">
            Kuponi u lëshua me sukses{fiscalState?.receiptNumber ? ` · Nr. ${fiscalState.receiptNumber}` : ''}.
          </div>
        )}
        {jobStatus === 'pending' && (
          <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
            Job-i fiskal është krijuar dhe po pret bridge-in lokal.
          </div>
        )}
        {jobStatus === 'queued_to_flink' && (
          <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
            Kërkesa u dërgua te F-Link. Po presim konfirmimin nga pajisja fiskale.
          </div>
        )}
        {jobStatus === 'failed' && (
          <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {jobError || 'Lëshimi fiskal dështoi. Kontrolloni bridge-in lokal ose përgjigjen e F-Link.'}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <div style={{ fontFamily: "'Courier New', Courier, monospace", width: 280, fontSize: 11, color: '#111', border: `1px solid ${isIssued ? '#e5e7eb' : '#ddd'}`, padding: 12, borderRadius: 6, background: isIssued ? '#f9f9f9' : '#fafafa', opacity: isIssued ? 0.6 : 1 }}>
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

            <div style={{ borderTop: '2px solid #111', margin: '6px 0' }} />
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>KUPON FISKAL</div>
            <div style={{ textAlign: 'center', fontSize: 9, color: '#888', marginBottom: 4 }}>(Preview i të dhënave që dërgohen për fiskalizim)</div>

            <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Data:</span><span>{dataTxt}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ora:</span><span>{kohaTxt}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Nr.Kuponi:</span><span style={{ fontSize: 9 }}>{numrSerial}</span></div>

            <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
            <div style={{ fontWeight: 'bold', marginBottom: 3 }}>Shërbime:</div>
            {allItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', margin: '1px 0', fontSize: 10 }}>
                <span style={{ flex: 1, marginRight: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{it.emri}</span>
                <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{it.cmimi.toFixed(2)} €</span>
              </div>
            ))}

            <div style={{ borderTop: '1px dashed #999', margin: '4px 0' }} />
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
            <div style={{ borderTop: '2px solid #111', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14 }}>
              <span>TOTALI:</span><span>{paguarTotal.toFixed(2)} €</span>
            </div>
            <div style={{ borderTop: '2px solid #111', margin: '4px 0' }} />

            <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
            <div style={{ textAlign: 'center', fontSize: 10 }}>Faleminderit për zgjedhjen tuaj!</div>
            <div style={{ textAlign: 'center', fontSize: 9, color: '#555' }}>{settings?.emriKlinikes || 'EXACT LAB'} – Laborator Mjekësor</div>
            <div style={{ border: '1px dashed #ccc', padding: '4px 6px', marginTop: 8, textAlign: 'center', fontSize: 9, color: '#999', fontStyle: 'italic' }}>
              Kuponi real fiskal vjen nga pajisja fiskale përmes F-Link, jo nga ky preview.
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t flex gap-2 flex-shrink-0">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Mbyll</button>
          {isIssued ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed border border-gray-200">
              <CheckCircle size={14} className="text-green-500" />
              Lëshuar
            </div>
          ) : (
            <button
              onClick={handlePrint}
              disabled={isSubmitting || isInFlight}
              className="flex-1 text-sm flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {(isSubmitting || isInFlight) ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
              {isInFlight ? 'Në proces...' : jobStatus === 'failed' ? 'Provo përsëri' : 'Dërgo te printeri fiskal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
