const asyncHandler = require('express-async-handler');
const PorosiLab   = require('../models/PorosiLab');
const XLSX        = require('xlsx');
const PDFDocument = require('pdfkit');

// ── Nderto filtrin e datës ────────────────────────────────────────
const buildPeriudha = (periudha, dataFillim, dataMbarim) => {
  const tani = new Date();
  let nga, deri;

  switch (periudha) {
    case 'sot':
      nga  = new Date(tani.getFullYear(), tani.getMonth(), tani.getDate());
      deri = new Date(tani.getFullYear(), tani.getMonth(), tani.getDate(), 23, 59, 59, 999);
      break;
    case 'jave':
      nga  = new Date(tani);
      nga.setDate(nga.getDate() - 6);
      nga.setHours(0, 0, 0, 0);
      deri = new Date(tani.getFullYear(), tani.getMonth(), tani.getDate(), 23, 59, 59, 999);
      break;
    case 'muaj':
      nga  = new Date(tani.getFullYear(), tani.getMonth(), 1);
      deri = new Date(tani.getFullYear(), tani.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'vit':
      nga  = new Date(tani.getFullYear(), 0, 1);
      deri = new Date(tani.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      if (dataFillim) { nga = new Date(dataFillim); nga.setHours(0,0,0,0); }
      if (dataMbarim) { deri = new Date(dataMbarim); deri.setHours(23,59,59,999); }
  }
  return { nga, deri };
};

// ── GET /api/statistikat ─────────────────────────────────────────
const merrStatistikat = asyncHandler(async (req, res) => {
  const { periudha = 'muaj', dataFillim, dataMbarim } = req.query;
  const { nga, deri } = buildPeriudha(periudha, dataFillim, dataMbarim);

  const match = { statusi: { $ne: 'Anuluar' } };
  if (nga || deri) {
    match.dataPorosis = {};
    if (nga)  match.dataPorosis.$gte = nga;
    if (deri) match.dataPorosis.$lte = deri;
  }

  const [kpiArr, analizatTop, perDepartament, perDite] = await Promise.all([

    // ── KPI totale ────────────────────────────────────────────────
    PorosiLab.aggregate([
      { $match: match },
      { $group: {
          _id:            null,
          totalPorosi:    { $sum: 1 },
          totalAnaliza:   { $sum: { $size: '$analizat' } },
          totalTe:        { $sum: '$cmimi' },
          pacientet:      { $addToSet: '$pacienti' },
      }},
      { $project: {
          totalPorosi:    1,
          totalAnaliza:   1,
          totalTe:        { $round: ['$totalTe', 2] },
          totalPacientet: { $size: '$pacientet' },
      }},
    ]),

    // ── Top 20 analizat sipas numrit ──────────────────────────────
    PorosiLab.aggregate([
      { $match: match },
      { $unwind: '$analizat' },
      { $group: {
          _id:   '$analizat.analiza',
          emri:  { $first: '$analizat.emri' },
          count: { $sum: 1 },
      }},
      { $sort: { count: -1 } },
      { $lookup: {
          from:         'analizas',
          localField:   '_id',
          foreignField: '_id',
          as:           'meta',
      }},
      { $project: {
          emri:         { $ifNull: [{ $arrayElemAt: ['$meta.emri', 0] }, '$emri'] },
          departamenti: { $arrayElemAt: ['$meta.departamenti', 0] },
          count:        1,
      }},
    ]),

    // ── Ndarja sipas departamentit ────────────────────────────────
    PorosiLab.aggregate([
      { $match: match },
      { $group: {
          _id:          '$departamenti',
          totalPorosi:  { $sum: 1 },
          totalAnaliza: { $sum: { $size: '$analizat' } },
          totalTe:      { $sum: '$cmimi' },
      }},
      { $sort: { totalPorosi: -1 } },
    ]),

    // ── Trend ditor ───────────────────────────────────────────────
    PorosiLab.aggregate([
      { $match: match },
      { $group: {
          _id: {
            viti:  { $year:        '$dataPorosis' },
            muaji: { $month:       '$dataPorosis' },
            dita:  { $dayOfMonth:  '$dataPorosis' },
          },
          count:   { $sum: 1 },
          totalTe: { $sum: '$cmimi' },
      }},
      { $sort: { '_id.viti': 1, '_id.muaji': 1, '_id.dita': 1 } },
    ]),
  ]);

  const kpi = kpiArr[0] || { totalPorosi: 0, totalAnaliza: 0, totalTe: 0, totalPacientet: 0 };

  res.json({ sukses: true, periudha: { nga, deri }, kpi, analizatTop, perDepartament, perDite });
});

// ── GET /api/statistikat/eksport-excel ───────────────────────────
const eksportoExcel = asyncHandler(async (req, res) => {
  const { periudha = 'muaj', dataFillim, dataMbarim } = req.query;
  const { nga, deri } = buildPeriudha(periudha, dataFillim, dataMbarim);

  const match = { statusi: { $ne: 'Anuluar' } };
  if (nga || deri) {
    match.dataPorosis = {};
    if (nga)  match.dataPorosis.$gte = nga;
    if (deri) match.dataPorosis.$lte = deri;
  }

  const analizatTop = await PorosiLab.aggregate([
    { $match: match },
    { $unwind: '$analizat' },
    { $group: {
        _id:   '$analizat.analiza',
        emri:  { $first: '$analizat.emri' },
        count: { $sum: 1 },
    }},
    { $sort: { count: -1 } },
    { $lookup: {
        from: 'analizas', localField: '_id', foreignField: '_id', as: 'meta',
    }},
    { $project: {
        emri:         { $ifNull: [{ $arrayElemAt: ['$meta.emri', 0] }, '$emri'] },
        departamenti: { $arrayElemAt: ['$meta.departamenti', 0] },
        count:        1,
    }},
  ]);

  const rows = analizatTop.map((a, i) => ({
    '#':            i + 1,
    'Analiza':      a.emri || '—',
    'Departamenti': a.departamenti || '—',
    'Numri':        a.count,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Top Analiza');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const periudhaTxt = nga ? `${nga.toISOString().slice(0,10)}_${deri?.toISOString().slice(0,10) || ''}` : periudha;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="statistikat_${periudhaTxt}.xlsx"`);
  res.send(buf);
});

// ── GET /api/statistikat/pdf ─────────────────────────────────────
const eksportoPDF = asyncHandler(async (req, res) => {
  const { periudha = 'muaj', dataFillim, dataMbarim } = req.query;
  const { nga, deri } = buildPeriudha(periudha, dataFillim, dataMbarim);

  const match = { statusi: { $ne: 'Anuluar' } };
  if (nga || deri) {
    match.dataPorosis = {};
    if (nga)  match.dataPorosis.$gte = nga;
    if (deri) match.dataPorosis.$lte = deri;
  }

  const [kpiArr, analizatTop, perDepartament] = await Promise.all([
    PorosiLab.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          totalPorosi:  { $sum: 1 },
          totalAnaliza: { $sum: { $size: '$analizat' } },
          totalTe:      { $sum: '$cmimi' },
          pacientet:    { $addToSet: '$pacienti' },
      }},
      { $project: { totalPorosi: 1, totalAnaliza: 1, totalTe: { $round: ['$totalTe', 2] }, totalPacientet: { $size: '$pacientet' } }},
    ]),
    PorosiLab.aggregate([
      { $match: match },
      { $unwind: '$analizat' },
      { $group: { _id: '$analizat.analiza', emri: { $first: '$analizat.emri' }, count: { $sum: 1 } }},
      { $sort: { count: -1 } },
      { $lookup: { from: 'analizas', localField: '_id', foreignField: '_id', as: 'meta' }},
      { $project: {
          emri:         { $ifNull: [{ $arrayElemAt: ['$meta.emri', 0] }, '$emri'] },
          departamenti: { $arrayElemAt: ['$meta.departamenti', 0] },
          count:        1,
      }},
    ]),
    PorosiLab.aggregate([
      { $match: match },
      { $group: { _id: '$departamenti', totalPorosi: { $sum: 1 }, totalAnaliza: { $sum: { $size: '$analizat' } }, totalTe: { $sum: '$cmimi' } }},
      { $sort: { totalPorosi: -1 } },
    ]),
  ]);

  const kpi = kpiArr[0] || { totalPorosi: 0, totalAnaliza: 0, totalTe: 0, totalPacientet: 0 };

  // ── PDF ───────────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks = [];
  doc.on('data', c => chunks.push(c));

  const PW = 595, M = 40, CW = PW - M * 2;
  const PRIMARY = '#1A3A6B';
  const GREY    = '#6B7280';
  const BORDER  = '#E5E7EB';
  const DEPT_C  = { Biokimi: '#1A3A6B', Mikrobiologji: '#059669', PCR: '#7C3AED' };

  const fmtN  = (n, d = 0) => (n ?? 0).toLocaleString('sq-AL', { maximumFractionDigits: d });
  const fmtD  = (d) => d ? new Date(d).toLocaleDateString('sq-AL') : '—';
  const periudhaTxt = nga ? `${fmtD(nga)} — ${fmtD(deri)}` : periudha.toUpperCase();

  // Header
  doc.rect(M, 35, CW, 42).fill(PRIMARY);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(16).text('MedLab Pro', M + 12, 44);
  doc.font('Helvetica').fontSize(9).fillColor('#bfdbfe').text('Raport Statistikat Laboratorike', M + 12, 63);
  doc.font('Helvetica').fontSize(9).fillColor('#fff').text(periudhaTxt, M + CW - 160, 44, { width: 150, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor('#bfdbfe').text(`Gjeneruar: ${new Date().toLocaleString('sq-AL')}`, M + CW - 160, 60, { width: 150, align: 'right' });

  let y = 95;

  // KPI row
  const kpis = [
    { label: 'Porosi Totale',  val: fmtN(kpi.totalPorosi) },
    { label: 'Analiza Kryer',  val: fmtN(kpi.totalAnaliza) },
    { label: 'Pacientë Unikë', val: fmtN(kpi.totalPacientet) },
    { label: 'Të Ardhura',     val: `${fmtN(kpi.totalTe, 2)} €` },
  ];
  const kW = (CW - 9) / 4;
  kpis.forEach((k, i) => {
    const x = M + i * (kW + 3);
    doc.rect(x, y, kW, 44).stroke(BORDER);
    doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(16).text(k.val, x + 6, y + 8, { width: kW - 12, align: 'center' });
    doc.fillColor(GREY).font('Helvetica').fontSize(7.5).text(k.label, x + 6, y + 29, { width: kW - 12, align: 'center' });
  });
  y += 56;

  // Departament summary
  if (perDepartament.length) {
    doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8).text('SIPAS DEPARTAMENTIT', M, y);
    y += 10;
    const dW = (CW - (perDepartament.length - 1) * 4) / Math.max(perDepartament.length, 1);
    perDepartament.forEach((d, i) => {
      const x = M + i * (dW + 4);
      const c = DEPT_C[d._id] || '#6B7280';
      doc.rect(x, y, dW, 36).fill(c + '15').stroke(c + '40');
      doc.fillColor(c).font('Helvetica-Bold').fontSize(9).text(d._id || '—', x + 6, y + 6, { width: dW - 12 });
      doc.fillColor('#374151').font('Helvetica').fontSize(7.5)
         .text(`${fmtN(d.totalPorosi)} porosi · ${fmtN(d.totalAnaliza)} analiza`, x + 6, y + 20, { width: dW - 12 });
    });
    y += 48;
  }

  // Table header
  doc.fillColor(GREY).font('Helvetica-Bold').fontSize(8).text('RENDITJA E ANALIZAVE SIPAS FREKUENCËS', M, y);
  y += 10;

  const COL = { nr: 28, emri: 220, dept: 90, count: 60, bar: CW - 28 - 220 - 90 - 60 - 8 };
  const ROW_H = 16;

  // Table head row
  doc.rect(M, y, CW, 16).fill('#F9FAFB');
  doc.fillColor(GREY).font('Helvetica-Bold').fontSize(7);
  let cx = M + 4;
  doc.text('#',            cx, y + 5, { width: COL.nr   }); cx += COL.nr;
  doc.text('Analiza',      cx, y + 5, { width: COL.emri  }); cx += COL.emri;
  doc.text('Departamenti', cx, y + 5, { width: COL.dept  }); cx += COL.dept;
  doc.text('Kryerje',      cx, y + 5, { width: COL.count, align: 'right' }); cx += COL.count + 4;
  doc.text('Frekuenca',    cx, y + 5, { width: COL.bar   });
  y += 16;

  const maxCount = analizatTop[0]?.count || 1;
  const SAFE_BOT = 595 - 60;

  analizatTop.forEach((a, i) => {
    if (y + ROW_H > SAFE_BOT) {
      doc.addPage();
      y = 40;
    }
    if (i % 2 === 0) doc.rect(M, y, CW, ROW_H).fill('#FAFAFA');
    doc.rect(M, y, CW, ROW_H).stroke(BORDER).lineWidth(0.3);

    const pct = a.count / maxCount;
    const c   = DEPT_C[a.departamenti] || '#6B7280';

    doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7);
    cx = M + 4;
    doc.text(String(i + 1), cx, y + 5, { width: COL.nr }); cx += COL.nr;

    doc.fillColor('#111827').font('Helvetica').fontSize(7.5)
       .text(a.emri || '—', cx, y + 5, { width: COL.emri - 4, lineBreak: false }); cx += COL.emri;

    // Dept badge
    if (a.departamenti) {
      doc.rect(cx, y + 4, COL.dept - 8, 8).fill(c + '20');
      doc.fillColor(c).font('Helvetica-Bold').fontSize(6).text(a.departamenti, cx + 2, y + 5.5, { width: COL.dept - 12 });
    }
    cx += COL.dept;

    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8)
       .text(fmtN(a.count), cx, y + 4, { width: COL.count, align: 'right' }); cx += COL.count + 4;

    // Bar
    const barW = COL.bar - 8;
    doc.rect(cx, y + 6, barW, 4).fill('#F3F4F6');
    doc.rect(cx, y + 6, Math.max(barW * pct, 2), 4).fill(c);

    y += ROW_H;
  });

  // Footer
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const pH = 842;
    doc.rect(M, pH - 30, CW, 0.5).fill(BORDER);
    doc.fillColor(GREY).font('Helvetica').fontSize(7)
       .text(`MedLab Pro — Statistikat Laboratorike — ${periudhaTxt}`, M, pH - 22, { width: CW - 60 });
    doc.text(`Faqe ${i + 1} / ${range.count}`, M, pH - 22, { width: CW, align: 'right' });
  }

  doc.end();
  doc.on('end', () => {
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="statistikat_${periudha}.pdf"`);
    res.send(buf);
  });
});

module.exports = { merrStatistikat, eksportoExcel, eksportoPDF };
