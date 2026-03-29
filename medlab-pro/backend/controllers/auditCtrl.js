const asyncHandler = require('express-async-handler');
const AuditLog    = require('../models/AuditLog');
const XLSX        = require('xlsx');
const PDFDocument = require('pdfkit');

// ── Nderto filter nga query ────────────────────────────────────────
const buildFilter = (q) => {
  const {
    perdorues, kategorija, veprimi, statusi, moduliDetajuar,
    dataFillim, dataMbarim, kerko, alarmi, rekordId,
  } = q;

  const filter = {};
  if (perdorues)      filter.perdoruesEmri  = { $regex: perdorues, $options: 'i' };
  if (kategorija)     filter.kategorija     = kategorija;
  if (veprimi)        filter.veprimi        = { $regex: veprimi, $options: 'i' };
  if (statusi)        filter.statusi        = statusi;
  if (moduliDetajuar) filter.moduliDetajuar = moduliDetajuar;
  if (rekordId)       filter.rekordId       = rekordId;
  if (alarmi === 'true' || alarmi === true)  filter.alarmi = true;

  if (kerko) {
    filter.$or = [
      { perdoruesEmri: { $regex: kerko, $options: 'i' } },
      { veprimi:       { $regex: kerko, $options: 'i' } },
      { rekordEmri:    { $regex: kerko, $options: 'i' } },
      { pershkrimi:    { $regex: kerko, $options: 'i' } },
    ];
  }
  if (dataFillim || dataMbarim) {
    filter.createdAt = {};
    if (dataFillim) { const d = new Date(dataFillim); d.setHours(0,0,0,0);      filter.createdAt.$gte = d; }
    if (dataMbarim) { const d = new Date(dataMbarim); d.setHours(23,59,59,999); filter.createdAt.$lte = d; }
  }
  return filter;
};

// ── GET /api/audit ────────────────────────────────────────────────
const listoLogs = asyncHandler(async (req, res) => {
  const { faqe = 1, limit = 50 } = req.query;
  const filter = buildFilter(req.query);

  const skip  = (Number(faqe) - 1) * Number(limit);
  const total = await AuditLog.countDocuments(filter);
  const logs  = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Shto numrin e alarmeve
  const totalAlarme = await AuditLog.countDocuments({ alarmi: true });

  res.json({
    sukses: true,
    total,
    totalAlarme,
    faqe: Number(faqe),
    faqetTotal: Math.ceil(total / Number(limit)),
    logs,
  });
});

// ── GET /api/audit/meta ────────────────────────────────────────────
const merrKategorite = asyncHandler(async (req, res) => {
  const [kategorite, veprimet, modulet] = await Promise.all([
    AuditLog.distinct('kategorija'),
    AuditLog.distinct('veprimi'),
    AuditLog.distinct('moduliDetajuar'),
  ]);
  res.json({ sukses: true, kategorite, veprimet, modulet });
});

// ── GET /api/audit/eksport-excel ──────────────────────────────────
const eksportoExcel = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(5000).lean();

  const fmtD = (d) => d ? new Date(d).toLocaleString('sq-AL') : '—';
  const rows = logs.map((l, i) => ({
    '#':             i + 1,
    'Koha':          fmtD(l.createdAt),
    'Perdoruesi':    l.perdoruesEmri,
    'Roli':          l.perdoruesRoli,
    'Kategorija':    l.kategorija,
    'Veprimi':       l.veprimi,
    'Objekti':       l.rekordEmri || '—',
    'Pershkrimi':    l.pershkrimi || '—',
    'IP Adresa':     l.ipAdresa || '—',
    'Statusi':       l.statusi,
    'Alarm Kritik':  l.alarmi ? 'PO' : 'JO',
    'Tipi Alarmit':  l.alarmTipi || '—',
    'Vlera Vjeter':  l.vleraVjeter || '—',
    'Vlera Re':      l.vleraRe    || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().slice(0,10)}.xlsx"`);
  res.send(buf);
});

// ── GET /api/audit/eksport-pdf ────────────────────────────────────
const eksportoPDF = asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(500).lean();

  const doc    = new PDFDocument({ size: 'A4', margin: 35, bufferPages: true });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const PW = 595, M = 35, CW = PW - M * 2;
  const PRIMARY = '#1A3A6B', BORDER = '#E5E7EB', GREY = '#6B7280', RED = '#DC2626';
  const fmtD = (d) => d ? new Date(d).toLocaleString('sq-AL') : '—';

  // Header
  doc.rect(M, 30, CW, 40).fill(PRIMARY);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(15).text('MedLab Pro — Audit Logs', M + 10, 39);
  doc.font('Helvetica').fontSize(8).fillColor('#bfdbfe')
     .text(`Gjeneruar: ${fmtD(new Date())} · ${logs.length} regjistrime`, M + 10, 57);

  let y = 86;
  const ROW_H = 22;
  const SAFE_BOT = 842 - 50;

  // Kolona gjerësi
  const C = { koha: 82, pers: 80, kat: 55, vep: 90, obj: 90, ip: 60, stat: 28 };

  const vizatoKoke = () => {
    doc.rect(M, y, CW, 14).fill('#F1F5F9');
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(6.5);
    let cx = M + 3;
    [['Koha', C.koha], ['Perdoruesi', C.pers], ['Kategoria', C.kat],
     ['Veprimi', C.vep], ['Objekti', C.obj], ['IP', C.ip], ['St.', C.stat]
    ].forEach(([lbl, w]) => {
      doc.text(lbl, cx, y + 4, { width: w - 3 });
      cx += w;
    });
    y += 14;
  };

  vizatoKoke();

  logs.forEach((l, i) => {
    if (y + ROW_H > SAFE_BOT) {
      doc.addPage();
      y = 35;
      vizatoKoke();
    }

    const isAlarm = l.alarmi;
    if (i % 2 === 0) doc.rect(M, y, CW, ROW_H).fill(isAlarm ? '#FEF2F2' : '#FAFAFA');
    if (isAlarm) doc.rect(M, y, 3, ROW_H).fill(RED);
    doc.rect(M, y, CW, ROW_H).stroke(BORDER).lineWidth(0.3);

    doc.fillColor(isAlarm ? RED : '#374151').font('Helvetica').fontSize(6.5);
    let cx = M + 3;
    const cols = [
      [fmtD(l.createdAt), C.koha],
      [`${l.perdoruesEmri}\n${l.perdoruesRoli}`, C.pers],
      [l.kategorija || '—', C.kat],
      [l.veprimi || '—', C.vep],
      [l.rekordEmri || '—', C.obj],
      [l.ipAdresa || '—', C.ip],
      [l.statusi === 'sukses' ? '✓' : '✗', C.stat],
    ];
    cols.forEach(([txt, w]) => {
      doc.text(String(txt), cx, y + 4, { width: w - 3, lineBreak: true, height: ROW_H - 4 });
      cx += w;
    });

    y += ROW_H;
  });

  // Faqe + footer
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.rect(M, 842 - 28, CW, 0.5).fill(BORDER);
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
       .text(`MedLab Pro · Audit Logs · Konfidencial`, M, 842 - 20, { width: CW - 50 });
    doc.text(`Faqe ${i + 1} / ${range.count}`, M, 842 - 20, { width: CW, align: 'right' });
  }

  doc.end();
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().slice(0,10)}.pdf"`);
    res.send(buf);
  });
});

module.exports = { listoLogs, merrKategorite, eksportoExcel, eksportoPDF };
