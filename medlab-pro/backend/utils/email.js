const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

const dergEmailRezultate = async (porosi) => {
  const pacienti = porosi.pacienti;
  if (!pacienti.email) return;

  const flamurTekst = { Normal: '✅', Larte: '⬆️', Shume_Larte: '🔴', Ulet: '⬇️', Shume_Ulet: '🟣', Kritik: '🚨' };
  const rreshtat = porosi.testet.map(t =>
    `<tr><td>${t.testi?.emri || '-'}</td><td><b>${t.vlera ?? '-'} ${t.njesia || ''}</b></td><td>${flamurTekst[t.flamuri] || ''} ${t.flamuri || '-'}</td></tr>`
  ).join('');

  await transporter.sendMail({
    from:    `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to:      pacienti.email,
    subject: `Rezultatet e Analizave Laboratorike — ${porosi.numrPorosi}`,
    html: `
      <div style="font-family:Arial;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#1B4F8A;padding:20px;color:white">
          <h2 style="margin:0">MedLab Pro</h2>
          <p style="margin:4px 0 0">Rezultatet e Analizave Laboratorike</p>
        </div>
        <div style="padding:24px">
          <p>I/E dashur <b>${pacienti.emri} ${pacienti.mbiemri}</b>,</p>
          <p>Rezultatet e analizave tuaja laboratorike me numër porosie <b>${porosi.numrPorosi}</b> jane gati:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#EEF5FB">
                <th style="padding:8px;text-align:left;border:1px solid #ccc">Analiza</th>
                <th style="padding:8px;text-align:left;border:1px solid #ccc">Rezultati</th>
                <th style="padding:8px;text-align:left;border:1px solid #ccc">Statusi</th>
              </tr>
            </thead>
            <tbody>${rreshtat}</tbody>
          </table>
          <p style="color:#E74C3C;font-size:12px">⚠️ Keto rezultate jane vetem per qellime informative. Konsultohuni me mjekun tuaj per interpretim profesional.</p>
        </div>
        <div style="background:#f5f5f5;padding:12px;text-align:center;font-size:11px;color:#888">
          MedLab Pro — ${new Date().getFullYear()}
        </div>
      </div>`,
  });
};

const dergEmailFatura = async (fatura) => {
  const pacienti = fatura.pacienti;
  if (!pacienti.email) return;

  const zeratHTML = fatura.zerat.map(z =>
    `<tr><td>${z.pershkrim}</td><td style="text-align:right">${z.subtotal} L</td></tr>`
  ).join('');

  await transporter.sendMail({
    from:    `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to:      pacienti.email,
    subject: `Fatura ${fatura.numrFatures} — MedLab Pro`,
    html: `
      <div style="font-family:Arial;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
        <div style="background:#1B4F8A;padding:20px;color:white">
          <h2 style="margin:0">MedLab Pro</h2>
          <p style="margin:4px 0 0">Fatura ${fatura.numrFatures}</p>
        </div>
        <div style="padding:24px">
          <p>I/E dashur <b>${pacienti.emri} ${pacienti.mbiemri}</b>,</p>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#EEF5FB">
              <th style="padding:8px;border:1px solid #ccc;text-align:left">Sherbimi</th>
              <th style="padding:8px;border:1px solid #ccc;text-align:right">Cmimi</th>
            </tr></thead>
            <tbody>${zeratHTML}</tbody>
            <tfoot>
              <tr style="font-weight:bold;background:#1B4F8A;color:white">
                <td style="padding:8px">TOTALI</td>
                <td style="padding:8px;text-align:right">${fatura.totali} L</td>
              </tr>
            </tfoot>
          </table>
          <p>Statusi: <b style="color:${fatura.statusiPag === 'Pagezur' ? '#1A7A4A' : '#E74C3C'}">${fatura.statusiPag}</b></p>
        </div>
      </div>`,
  });
};

module.exports = { dergEmailRezultate, dergEmailFatura };
