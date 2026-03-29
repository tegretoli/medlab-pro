const asyncHandler = require('express-async-handler');
const PorosiLab        = require('../models/PorosiLab');
const Referues         = require('../models/Referues');
const Pacienti         = require('../models/Pacienti');
const Settings         = require('../models/Settings');
const FaturaKompanise  = require('../models/FaturaKompanise');
const FaturaPatient    = require('../models/FaturaPatient');
const XLSX             = require('xlsx');
const { gjeneroPDF_FaturaKompanise, gjeneroPDF_FaturaPatient } = require('../utils/pdfGenerator');

// Helper: build date range filter from query strings
const buildDateFilter = (dataFillim, dataMbarim) => {
  if (!dataFillim && !dataMbarim) return null;
  const f = {};
  if (dataFillim) f.$gte = new Date(dataFillim + 'T00:00:00');
  if (dataMbarim) f.$lte = new Date(dataMbarim + 'T23:59:59');
  return f;
};

// Helper: pick analysis price based on referrer type
// Bashkpuntor → bashkpuntor price (or pacient as fallback)
// Doktor/any  → pacient price
const pickCmimi = (analiza, refTipi) => {
  if (refTipi === 'Bashkpuntor') {
    return analiza?.cmime?.bashkpuntor || analiza?.cmime?.pacient || 0;
  }
  return analiza?.cmime?.pacient || 0;
};

// Helper: compute total for one order using referrer-type-aware catalog prices
const cmimiPorosi = (porosi, refTipi) => {
  if (porosi.pakoEmri) return porosi.cmimi || 0; // packages: use stored price
  return (porosi.analizat || []).reduce((s, a) => s + pickCmimi(a.analiza, refTipi), 0);
};

// ─── GET /api/financa/dashboard ──────────────────────────────────────────────
const dashboard = asyncHandler(async (req, res) => {
  const sot = new Date();

  const fillimSotit = new Date(sot);
  fillimSotit.setHours(0, 0, 0, 0);

  const dita = sot.getDay(); // 0=Sun
  const diffHene = dita === 0 ? -6 : 1 - dita;
  const fillimJaves = new Date(sot);
  fillimJaves.setDate(sot.getDate() + diffHene);
  fillimJaves.setHours(0, 0, 0, 0);

  const fillimMuajit = new Date(sot.getFullYear(), sot.getMonth(), 1);
  const fillimVitit  = new Date(sot.getFullYear(), 0, 1);

  const paidMatch = (extraDate) => ({
    'pagesa.statusi': 'Paguar',
    'pagesa.dataPageses': { $gte: extraDate },
  });

  const [sotD, javaD, muajiD, vitiD, topAnaliza, topDep, topDoktor, borxhD, raportMujorD] = await Promise.all([

    // Sot
    PorosiLab.aggregate([
      { $match: paidMatch(fillimSotit) },
      { $group: { _id: null, total: { $sum: '$pagesa.shumaFinal' }, count: { $sum: 1 } } },
    ]),

    // Java
    PorosiLab.aggregate([
      { $match: paidMatch(fillimJaves) },
      { $group: { _id: null, total: { $sum: '$pagesa.shumaFinal' }, count: { $sum: 1 } } },
    ]),

    // Muaji
    PorosiLab.aggregate([
      { $match: paidMatch(fillimMuajit) },
      { $group: { _id: null, total: { $sum: '$pagesa.shumaFinal' }, count: { $sum: 1 } } },
    ]),

    // Viti
    PorosiLab.aggregate([
      { $match: paidMatch(fillimVitit) },
      { $group: { _id: null, total: { $sum: '$pagesa.shumaFinal' }, count: { $sum: 1 } } },
    ]),

    // Top 5 analyses by times performed
    PorosiLab.aggregate([
      { $match: { 'pagesa.statusi': 'Paguar' } },
      { $unwind: '$analizat' },
      { $lookup: { from: 'analizas', localField: 'analizat.analiza', foreignField: '_id', as: 'an' } },
      { $unwind: { path: '$an', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$analizat.analiza',
        emri: { $first: { $ifNull: ['$an.emri', '?'] } },
        departamenti: { $first: '$an.departamenti' },
        count: { $sum: 1 },
        totalTe_ardhura: { $sum: { $ifNull: ['$an.cmime.pacient', 0] } },
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),

    // Top departments by revenue
    PorosiLab.aggregate([
      { $match: { 'pagesa.statusi': 'Paguar' } },
      { $group: {
        _id: '$departamenti',
        total: { $sum: '$pagesa.shumaFinal' },
        count: { $sum: 1 },
      }},
      { $sort: { total: -1 } },
    ]),

    // Top 5 doctors by referrals
    PorosiLab.aggregate([
      { $match: { referuesId: { $ne: null } } },
      { $group: {
        _id: '$referuesId',
        count: { $sum: 1 },
        totalSherbime: { $sum: '$pagesa.shumaFinal' },
      }},
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'referues', localField: '_id', foreignField: '_id', as: 'ref' } },
      { $unwind: { path: '$ref', preserveNullAndEmptyArrays: true } },
      { $project: {
        emri: { $concat: ['$ref.emri', ' ', '$ref.mbiemri'] },
        institucioni: '$ref.institucioni',
        tipi: '$ref.tipi',
        komisioni: '$ref.komisioni',
        count: 1,
        totalSherbime: 1,
      }},
    ]),

    // Total borxhi (unpaid)
    PorosiLab.aggregate([
      { $match: { 'pagesa.statusi': 'Papaguar' } },
      { $group: { _id: null, total: { $sum: '$cmimi' }, count: { $sum: 1 } } },
    ]),

    // Monthly bar chart for current year
    PorosiLab.aggregate([
      { $match: {
        'pagesa.statusi': 'Paguar',
        'pagesa.dataPageses': { $gte: fillimVitit },
      }},
      { $group: {
        _id: { $month: '$pagesa.dataPageses' },
        total: { $sum: '$pagesa.shumaFinal' },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  res.json({
    sukses: true,
    sotTotal:    sotD[0]?.total   || 0, sotCount:    sotD[0]?.count   || 0,
    javaTotal:   javaD[0]?.total  || 0, javaCount:   javaD[0]?.count  || 0,
    muajiTotal:  muajiD[0]?.total || 0, muajiCount:  muajiD[0]?.count || 0,
    vitiTotal:   vitiD[0]?.total  || 0, vitiCount:   vitiD[0]?.count  || 0,
    borxhTotal:  borxhD[0]?.total || 0, borxhCount:  borxhD[0]?.count || 0,
    topAnaliza,
    topDep,
    topDoktor,
    raportMujor: raportMujorD,
  });
});

// ─── GET /api/financa/raport/mujor?viti= ────────────────────────────────────
const raportMujor = asyncHandler(async (req, res) => {
  const { viti = new Date().getFullYear() } = req.query;
  const raport = await PorosiLab.aggregate([
    { $match: {
      'pagesa.statusi': 'Paguar',
      'pagesa.dataPageses': {
        $gte: new Date(`${viti}-01-01`),
        $lte: new Date(`${viti}-12-31T23:59:59`),
      },
    }},
    { $group: {
      _id: { $month: '$pagesa.dataPageses' },
      total: { $sum: '$pagesa.shumaFinal' },
      count: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);
  res.json({ sukses: true, raport });
});

// ─── GET /api/financa/raport/analizave?dataFillim=&dataMbarim= ───────────────
const raportiAnalizave = asyncHandler(async (req, res) => {
  const { dataFillim, dataMbarim } = req.query;
  const match = { 'pagesa.statusi': 'Paguar' };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match['pagesa.dataPageses'] = df;

  const raporti = await PorosiLab.aggregate([
    { $match: match },
    { $unwind: '$analizat' },
    { $lookup: { from: 'analizas', localField: 'analizat.analiza', foreignField: '_id', as: 'an' } },
    { $unwind: { path: '$an', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: '$analizat.analiza',
      emri:            { $first: { $ifNull: ['$an.emri', 'E panjohur'] } },
      departamenti:    { $first: '$an.departamenti' },
      count:           { $sum: 1 },
      totalTe_ardhura: { $sum: { $ifNull: ['$an.cmime.pacient', 0] } },
    }},
    { $addFields: {
      mesatarja: { $cond: [{ $gt: ['$count', 0] }, { $divide: ['$totalTe_ardhura', '$count'] }, 0] },
    }},
    { $sort: { totalTe_ardhura: -1 } },
  ]);

  res.json({ sukses: true, raporti });
});

// ─── GET /api/financa/raport/departamenteve?dataFillim=&dataMbarim=&viti= ────
const raportiDepartamenteve = asyncHandler(async (req, res) => {
  const { dataFillim, dataMbarim, viti } = req.query;
  const match = { 'pagesa.statusi': 'Paguar' };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) {
    match['pagesa.dataPageses'] = df;
  } else if (viti) {
    match['pagesa.dataPageses'] = {
      $gte: new Date(`${viti}-01-01`),
      $lte: new Date(`${viti}-12-31T23:59:59`),
    };
  }

  const [raporti, totalArr] = await Promise.all([
    PorosiLab.aggregate([
      { $match: match },
      { $group: {
        _id: '$departamenti',
        numriTesteve:    { $sum: 1 },
        totalTe_ardhura: { $sum: '$pagesa.shumaFinal' },
      }},
      { $addFields: {
        mesatarja: { $cond: [{ $gt: ['$numriTesteve', 0] }, { $divide: ['$totalTe_ardhura', '$numriTesteve'] }, 0] },
      }},
      { $sort: { totalTe_ardhura: -1 } },
    ]),
    PorosiLab.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$pagesa.shumaFinal' } } },
    ]),
  ]);

  const gjithsej = totalArr[0]?.total || 0;
  const raportiMe_perqind = raporti.map(r => ({
    ...r,
    perqindja: gjithsej > 0 ? Math.round((r.totalTe_ardhura / gjithsej) * 100) : 0,
  }));

  res.json({ sukses: true, raporti: raportiMe_perqind, gjithsej });
});

// ─── GET /api/financa/komisjonet?dataFillim=&dataMbarim= ────────────────────
const raportiKomisioneve = asyncHandler(async (req, res) => {
  const { dataFillim, dataMbarim } = req.query;
  const match = { referuesId: { $ne: null } };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match.dataPorosis = df;

  const referues = await Referues.find({}).lean();
  const refMap = {};
  referues.forEach(r => { refMap[r._id.toString()] = r; });

  const grupuara = await PorosiLab.aggregate([
    { $match: match },
    { $group: {
      _id: '$referuesId',
      numriPacienteve: { $sum: 1 },
      totalSherbime:   { $sum: '$pagesa.shumaFinal' },
      totalCmimi:      { $sum: '$cmimi' },
    }},
    { $sort: { totalSherbime: -1 } },
  ]);

  const raporti = grupuara.map(g => {
    const ref = refMap[g._id?.toString()];
    if (!ref) return null;
    const kom = ref.komisioni || {};
    let komisionShuma = 0;
    if (kom.tipi === 'Perqindje' && kom.vlera > 0) {
      komisionShuma = Math.round(g.totalSherbime * kom.vlera / 100 * 100) / 100;
    } else if (kom.tipi === 'Fikse' && kom.vlera > 0) {
      komisionShuma = Math.round(kom.vlera * g.numriPacienteve * 100) / 100;
    }
    return {
      referuesId:      g._id,
      emri:            ref.emri + ' ' + ref.mbiemri,
      tipi:            ref.tipi,
      institucioni:    ref.institucioni || '',
      specialiteti:    ref.specialiteti || '',
      komisioniTipi:   kom.tipi || '—',
      komisioniVlera:  kom.vlera || 0,
      numriPacienteve: g.numriPacienteve,
      totalSherbime:   g.totalSherbime || 0,
      komisionShuma,
    };
  }).filter(Boolean);

  const totalKomisione = raporti.reduce((s, r) => s + r.komisionShuma, 0);
  res.json({ sukses: true, raporti, totalKomisione });
});

// ─── GET /api/financa/borxhet ────────────────────────────────────────────────
const borxhet = asyncHandler(async (req, res) => {
  const [borxhetPacienteve, totalArr, borxhetReferuesve] = await Promise.all([

    // Patients grouped by debt
    PorosiLab.aggregate([
      { $match: { 'pagesa.statusi': 'Papaguar' } },
      { $group: {
        _id: '$pacienti',
        numriPorosive: { $sum: 1 },
        totalBorxhi:   { $sum: '$cmimi' },
        fundit:        { $max: '$dataPorosis' },
      }},
      { $sort: { totalBorxhi: -1 } },
      { $limit: 200 },
      { $lookup: { from: 'pacientis', localField: '_id', foreignField: '_id', as: 'pac' } },
      { $unwind: { path: '$pac', preserveNullAndEmptyArrays: true } },
      { $project: {
        emri:         { $concat: ['$pac.emri', ' ', '$pac.mbiemri'] },
        numrPersonal: '$pac.numrPersonal',
        telefoni:     '$pac.telefoni',
        numriPorosive: 1,
        totalBorxhi:   1,
        fundit:        1,
      }},
    ]),

    // Totals
    PorosiLab.aggregate([
      { $match: { 'pagesa.statusi': 'Papaguar' } },
      { $group: { _id: null, total: { $sum: '$cmimi' }, count: { $sum: 1 } } },
    ]),

    // Referrers with unpaid orders
    PorosiLab.aggregate([
      { $match: { 'pagesa.statusi': 'Papaguar', referuesId: { $ne: null } } },
      { $group: {
        _id: '$referuesId',
        numriPorosive: { $sum: 1 },
        totalBorxhi:   { $sum: '$cmimi' },
      }},
      { $sort: { totalBorxhi: -1 } },
      { $lookup: { from: 'referues', localField: '_id', foreignField: '_id', as: 'ref' } },
      { $unwind: { path: '$ref', preserveNullAndEmptyArrays: true } },
      { $project: {
        emri:          { $concat: ['$ref.emri', ' ', '$ref.mbiemri'] },
        institucioni:  '$ref.institucioni',
        tipi:          '$ref.tipi',
        numriPorosive: 1,
        totalBorxhi:   1,
      }},
    ]),
  ]);

  res.json({
    sukses: true,
    borxhetPacienteve,
    borxhetReferuesve,
    totalPapaguar: totalArr[0]?.total || 0,
    numriPapaguar: totalArr[0]?.count || 0,
  });
});

// ─── GET /api/financa/eksport/excel?tipi=&dataFillim=&dataMbarim= ────────────
const eksportExcel = asyncHandler(async (req, res) => {
  const { tipi = 'departamenteve', dataFillim, dataMbarim } = req.query;
  const match = { 'pagesa.statusi': 'Paguar' };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match['pagesa.dataPageses'] = df;

  let headers = [];
  let data    = [];
  let sheetName = 'Raporti';

  if (tipi === 'departamenteve') {
    const rows = await PorosiLab.aggregate([
      { $match: match },
      { $group: {
        _id: '$departamenti',
        numriTesteve:    { $sum: 1 },
        totalTe_ardhura: { $sum: '$pagesa.shumaFinal' },
      }},
      { $sort: { totalTe_ardhura: -1 } },
    ]);
    const gjithsej = rows.reduce((s, r) => s + r.totalTe_ardhura, 0);
    headers   = ['Departamenti', 'Nr Testeve', 'Te Ardhura (EUR)', 'Mesatarja (EUR)', '% e Totalit'];
    data      = rows.map(r => [
      r._id, r.numriTesteve,
      r.totalTe_ardhura.toFixed(2),
      (r.numriTesteve > 0 ? r.totalTe_ardhura / r.numriTesteve : 0).toFixed(2),
      gjithsej > 0 ? (r.totalTe_ardhura / gjithsej * 100).toFixed(1) + '%' : '0%',
    ]);
    sheetName = 'Raporti_Departamenteve';

  } else if (tipi === 'analizave') {
    const rows = await PorosiLab.aggregate([
      { $match: match },
      { $unwind: '$analizat' },
      { $lookup: { from: 'analizas', localField: 'analizat.analiza', foreignField: '_id', as: 'an' } },
      { $unwind: { path: '$an', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$analizat.analiza',
        emri:            { $first: { $ifNull: ['$an.emri', '?'] } },
        departamenti:    { $first: '$an.departamenti' },
        count:           { $sum: 1 },
        totalTe_ardhura: { $sum: { $ifNull: ['$an.cmime.pacient', 0] } },
      }},
      { $sort: { totalTe_ardhura: -1 } },
    ]);
    headers   = ['Analiza', 'Departamenti', 'Nr Testeve', 'Te Ardhura (EUR)', 'Mesatarja (EUR)'];
    data      = rows.map(r => [
      r.emri, r.departamenti || '—', r.count,
      r.totalTe_ardhura.toFixed(2),
      (r.count > 0 ? r.totalTe_ardhura / r.count : 0).toFixed(2),
    ]);
    sheetName = 'Raporti_Analizave';

  } else if (tipi === 'komisjoneve') {
    const refAll = await Referues.find({}).lean();
    const refMap = {};
    refAll.forEach(r => { refMap[r._id.toString()] = r; });
    const matchK = { referuesId: { $ne: null } };
    if (df) matchK.dataPorosis = df;
    const grupuara = await PorosiLab.aggregate([
      { $match: matchK },
      { $group: {
        _id:             '$referuesId',
        numriPacienteve: { $sum: 1 },
        totalSherbime:   { $sum: '$pagesa.shumaFinal' },
      }},
      { $sort: { totalSherbime: -1 } },
    ]);
    headers = ['Doktori/Referuesi', 'Institucioni', 'Tipi', 'Nr Pacienteve', 'Total Sherbime (EUR)', 'Tipi Komisionit', 'Vlera %/Fikse', 'Komisioni (EUR)'];
    data = grupuara.map(g => {
      const ref = refMap[g._id?.toString()];
      if (!ref) return null;
      const kom = ref.komisioni || {};
      let sh = 0;
      if (kom.tipi === 'Perqindje') sh = g.totalSherbime * (kom.vlera || 0) / 100;
      else if (kom.tipi === 'Fikse') sh = (kom.vlera || 0) * g.numriPacienteve;
      return [
        ref.emri + ' ' + ref.mbiemri, ref.institucioni || '—', ref.tipi,
        g.numriPacienteve, g.totalSherbime.toFixed(2),
        kom.tipi || '—', kom.vlera || 0, sh.toFixed(2),
      ];
    }).filter(Boolean);
    sheetName = 'Raporti_Komisjoneve';
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  // Auto column width
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(h.length, ...(data.map(r => String(r[i] ?? '').length))),
  }));
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
  });
  res.send(buf);
});

// ─── GET /api/financa/fatura-kompanise?referuesId=&dataFillim=&dataMbarim= ───
// Returns all orders for a specific referrer/company grouped by patient
const faturaKompanise = asyncHandler(async (req, res) => {
  const { referuesId, dataFillim, dataMbarim } = req.query;
  if (!referuesId) { res.status(400); throw new Error('referuesId eshte i detyreshem'); }

  const match = { referuesId };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match.dataPorosis = df;

  const [referues, porosite] = await Promise.all([
    Referues.findById(referuesId).lean(),
    PorosiLab.find(match)
      .populate('pacienti', 'emri mbiemri numrPersonal datelindja gjinia telefoni')
      .populate('analizat.analiza', 'emri kodi departamenti cmime')
      .sort({ dataPorosis: 1 })
      .lean(),
  ]);

  if (!referues) { res.status(404); throw new Error('Referuesi nuk u gjet'); }

  const refTipi = referues.tipi; // 'Bashkpuntor' or 'Doktor'

  // Group by patient — use referrer-type-aware catalog prices for totals
  const pacMap = {};
  for (const p of porosite) {
    const pid = p.pacienti?._id?.toString() || 'unknown';
    if (!pacMap[pid]) {
      pacMap[pid] = {
        pacienti: p.pacienti,
        porosite: [],
        totalCmimi:    0,
        totalPaguar:   0,
        totalPapaguar: 0,
      };
    }
    // Compute price using catalog prices based on referrer type (consistent with PDF)
    const cmimiRef = cmimiPorosi(p, refTipi);
    const paguar   = p.pagesa?.statusi === 'Paguar'   ? cmimiRef : 0;
    const papaguar = p.pagesa?.statusi !== 'Paguar'   ? cmimiRef : 0;
    pacMap[pid].porosite.push({
      _id:          p._id,
      numrPorosi:   p.numrPorosi,
      dataPorosis:  p.dataPorosis,
      departamenti: p.departamenti,
      statusi:      p.statusi,
      cmimi:        cmimiRef,
      pagesa:       p.pagesa,
      analizat:     p.analizat,
      pakoEmri:     p.pakoEmri,
      urgente:      p.urgente,
    });
    pacMap[pid].totalCmimi    += cmimiRef;
    pacMap[pid].totalPaguar   += paguar;
    pacMap[pid].totalPapaguar += papaguar;
  }

  const pacientet = Object.values(pacMap);
  const gjithsejCmimi    = pacientet.reduce((s, p) => s + p.totalCmimi,    0);
  const gjithsejPaguar   = pacientet.reduce((s, p) => s + p.totalPaguar,   0);
  const gjithsejPapaguar = pacientet.reduce((s, p) => s + p.totalPapaguar, 0);

  res.json({
    sukses: true,
    referues,
    pacientet,
    gjithsejCmimi,
    gjithsejPaguar,
    gjithsejPapaguar,
    numriPorosive: porosite.length,
    numriPacienteve: pacientet.length,
  });
});

// ─── GET /api/financa/fatura-kompanise/pdf?referuesId=&dataFillim=&dataMbarim= ─
const faturaKompanisePDF = asyncHandler(async (req, res) => {
  const { referuesId, dataFillim, dataMbarim, numrFatures, zbritja } = req.query;
  if (!referuesId) { res.status(400); throw new Error('referuesId eshte i detyreshem'); }

  const match = { referuesId };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match.dataPorosis = df;

  const [referues, porosite, settings] = await Promise.all([
    Referues.findById(referuesId).lean(),
    PorosiLab.find(match)
      .populate('pacienti', 'emri mbiemri numrPersonal datelindja gjinia')
      .populate('analizat.analiza', 'emri kodi departamenti cmime')
      .sort({ dataPorosis: 1 })
      .lean(),
    Settings.findOne().lean(),
  ]);

  if (!referues) { res.status(404); throw new Error('Referuesi nuk u gjet'); }

  const refTipi = referues.tipi; // 'Bashkpuntor' or 'Doktor'

  // Build grouped data — use referrer-type-aware catalog prices (same logic as API preview)
  const pacMap = {};
  for (const p of porosite) {
    const pid = p.pacienti?._id?.toString() || 'unknown';
    if (!pacMap[pid]) pacMap[pid] = { pacienti: p.pacienti, porosite: [], totalCmimi: 0, totalPaguar: 0, totalPapaguar: 0 };
    const cmimiRef = cmimiPorosi(p, refTipi);
    const paguar   = p.pagesa?.statusi === 'Paguar' ? cmimiRef : 0;
    const papaguar = p.pagesa?.statusi !== 'Paguar' ? cmimiRef : 0;
    pacMap[pid].porosite.push({ ...p });
    pacMap[pid].totalCmimi    += cmimiRef;
    pacMap[pid].totalPaguar   += paguar;
    pacMap[pid].totalPapaguar += papaguar;
  }

  const pacientet       = Object.values(pacMap);
  const gjithsejCmimi   = pacientet.reduce((s, p) => s + p.totalCmimi,    0);
  const gjithsejPaguar  = pacientet.reduce((s, p) => s + p.totalPaguar,   0);
  const gjithsejPapaguar= pacientet.reduce((s, p) => s + p.totalPapaguar, 0);

  // Auto-increment invoice counter atomically
  const updatedSettings = await Settings.findOneAndUpdate(
    {},
    { $inc: { invoiceCounter: 1 } },
    { new: true, upsert: true }
  );
  const counter        = updatedSettings.invoiceCounter;
  const year           = new Date().getFullYear();
  const prefix         = updatedSettings.invoicePrefix || 'FAT';
  const autoNumrFatures = `${prefix}-${year}-${String(counter).padStart(3, '0')}`;

  const zbritjaPrc = parseFloat(zbritja) || 0;
  const zbritjaEUR = Math.round(gjithsejCmimi * zbritjaPrc / 100 * 100) / 100;
  const totalFinal = Math.round((gjithsejCmimi - zbritjaEUR) * 100) / 100;

  // Save to archive
  await FaturaKompanise.create({
    numrFatures:     autoNumrFatures,
    numrSerial:      counter,
    referuesId:      referues._id,
    referuesEmri:    referues.institucioni || `${referues.emri} ${referues.mbiemri}`,
    dataFillim:      dataFillim || '',
    dataMbarim:      dataMbarim || '',
    gjithsejCmimi,
    zbritjaPrc,
    zbritjaEUR,
    totalFinal,
    monedha:         updatedSettings.monedha || 'EUR',
    numriPorosive:   porosite.length,
    numriPacienteve: pacientet.length,
  });

  const payload = {
    referues,
    refTipi,
    pacientet,
    gjithsejCmimi,
    gjithsejPaguar,
    gjithsejPapaguar,
    numriPorosive:   porosite.length,
    numriPacienteve: pacientet.length,
    dataFillim,
    dataMbarim,
    numrFatures:     autoNumrFatures,
    monedha:         updatedSettings.monedha || 'EUR',
    zbritja:         zbritjaPrc,
    settings:        settings || {},
  };

  const buf = await gjeneroPDF_FaturaKompanise(payload);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="Fatura-${referues.institucioni || referues.mbiemri}-${new Date().toISOString().slice(0,10)}.pdf"`,
  });
  res.send(buf);
});

// ─── GET /api/financa/arkiva-faturave ────────────────────────────────────────
const listoArkiveFaturave = asyncHandler(async (req, res) => {
  const faturat = await FaturaKompanise.find()
    .populate('referuesId', 'emri mbiemri institucioni tipi')
    .sort({ numrSerial: -1 })
    .lean();
  res.json({ sukses: true, faturat });
});

// ─── GET /api/financa/arkiva-faturave/:id/pdf ────────────────────────────────
const riGjeneroPDF = asyncHandler(async (req, res) => {
  const fatura = await FaturaKompanise.findById(req.params.id).lean();
  if (!fatura) { res.status(404); throw new Error('Fatura nuk u gjet'); }

  const match = { referuesId: fatura.referuesId };
  const df = buildDateFilter(fatura.dataFillim, fatura.dataMbarim);
  if (df) match.dataPorosis = df;

  const [referues, porosite, settings] = await Promise.all([
    Referues.findById(fatura.referuesId).lean(),
    PorosiLab.find(match)
      .populate('pacienti', 'emri mbiemri numrPersonal datelindja gjinia')
      .populate('analizat.analiza', 'emri kodi departamenti cmime')
      .sort({ dataPorosis: 1 })
      .lean(),
    Settings.findOne().lean(),
  ]);

  if (!referues) { res.status(404); throw new Error('Referuesi nuk u gjet'); }

  const refTipi = referues.tipi;
  const pacMap = {};
  for (const p of porosite) {
    const pid = p.pacienti?._id?.toString() || 'unknown';
    if (!pacMap[pid]) pacMap[pid] = { pacienti: p.pacienti, porosite: [], totalCmimi: 0 };
    const cmimiRef = cmimiPorosi(p, refTipi);
    pacMap[pid].porosite.push({ ...p });
    pacMap[pid].totalCmimi += cmimiRef;
  }

  const payload = {
    referues,
    refTipi,
    pacientet:       Object.values(pacMap),
    gjithsejCmimi:   fatura.gjithsejCmimi,
    gjithsejPaguar:  0,
    gjithsejPapaguar:0,
    numriPorosive:   fatura.numriPorosive,
    numriPacienteve: fatura.numriPacienteve,
    dataFillim:      fatura.dataFillim,
    dataMbarim:      fatura.dataMbarim,
    numrFatures:     fatura.numrFatures,
    monedha:         fatura.monedha,
    zbritja:         fatura.zbritjaPrc,
    settings:        settings || {},
  };

  const buf = await gjeneroPDF_FaturaKompanise(payload);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="Fatura-${fatura.numrFatures}.pdf"`,
  });
  res.send(buf);
});

// ─── helpers ─────────────────────────────────────────────────────────────────
const _buildAnalizatFromPorosite = (porosite) => {
  const analizat = [];
  for (const p of porosite) {
    if (p.pakoEmri) {
      analizat.push({ emri: `[Pako] ${p.pakoEmri}`, sasia: 1, cmimi: p.cmimi || 0 });
    } else {
      for (const a of (p.analizat || [])) {
        analizat.push({ emri: a.analiza?.emri || '?', sasia: 1, cmimi: a.analiza?.cmime?.pacient || 0 });
      }
    }
  }
  return analizat;
};

// ─── GET /api/financa/fatura-patient ─────────────────────────────────────────
const faturaPatientData = asyncHandler(async (req, res) => {
  const { pacientiId, dataFillim, dataMbarim } = req.query;
  if (!pacientiId) { res.status(400); throw new Error('pacientiId eshte i detyreshem'); }
  const match = { pacienti: pacientiId };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match.dataPorosis = df;
  const [pacienti, porosite] = await Promise.all([
    Pacienti.findById(pacientiId).lean(),
    PorosiLab.find(match).populate('analizat.analiza', 'emri kodi departamenti cmime').sort({ dataPorosis: 1 }).lean(),
  ]);
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }
  const analizat = _buildAnalizatFromPorosite(porosite);
  res.json({ sukses: true, pacienti, analizat, gjithsejCmimi: analizat.reduce((s, a) => s + a.cmimi, 0) });
});

// ─── GET /api/financa/fatura-patient/pdf ─────────────────────────────────────
const faturaPatientPDF = asyncHandler(async (req, res) => {
  const { pacientiId, dataFillim, dataMbarim, shenime } = req.query;
  if (!pacientiId) { res.status(400); throw new Error('pacientiId eshte i detyreshem'); }
  const match = { pacienti: pacientiId };
  const df = buildDateFilter(dataFillim, dataMbarim);
  if (df) match.dataPorosis = df;
  const [pacienti, porosite, settings] = await Promise.all([
    Pacienti.findById(pacientiId).lean(),
    PorosiLab.find(match).populate('analizat.analiza', 'emri kodi departamenti cmime').sort({ dataPorosis: 1 }).lean(),
    Settings.findOne().lean(),
  ]);
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }
  const analizat = _buildAnalizatFromPorosite(porosite);

  const updSettings = await Settings.findOneAndUpdate({}, { $inc: { invoicePatientCounter: 1 } }, { new: true, upsert: true });
  const counter   = updSettings.invoicePatientCounter;
  const year      = new Date().getFullYear();
  const prefix    = updSettings.invoicePatientPrefix || 'FAT-PAC';
  const numrFatures = `${prefix}-${year}-${String(counter).padStart(3, '0')}`;

  const totalFinal = Math.round(analizat.reduce((s, a) => s + a.cmimi * a.sasia, 0) * 100) / 100;

  await FaturaPatient.create({
    numrFatures, numrSerial: counter,
    pacientiId: pacienti._id,
    pacientEmri: `${pacienti.emri} ${pacienti.mbiemri}`,
    dataFillim: dataFillim || '', dataMbarim: dataMbarim || '',
    gjithsejPaTvsh: totalFinal, tvshPrc: 0, tvshEUR: 0, totalFinal,
    monedha: settings?.monedha || 'EUR',
    numriAnalizave: analizat.length, shenime: shenime || '',
  });

  const buf = await gjeneroPDF_FaturaPatient({
    pacienti, analizat, numrFatures, dataFatures: new Date(),
    monedha: settings?.monedha || 'EUR',
    settings: settings || {}, shenime: shenime || '',
  });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Fatura-${pacienti.mbiemri}-${numrFatures}.pdf"` });
  res.send(buf);
});

// ─── GET /api/financa/arkiva-fatura-patient ───────────────────────────────────
const listoArkiveFatPac = asyncHandler(async (req, res) => {
  const faturat = await FaturaPatient.find().populate('pacientiId', 'emri mbiemri numrPersonal').sort({ numrSerial: -1 }).lean();
  res.json({ sukses: true, faturat });
});

// ─── GET /api/financa/arkiva-fatura-patient/:id/pdf ───────────────────────────
const riGjeneroPDFFatPac = asyncHandler(async (req, res) => {
  const fatura = await FaturaPatient.findById(req.params.id).lean();
  if (!fatura) { res.status(404); throw new Error('Fatura nuk u gjet'); }
  const match = { pacienti: fatura.pacientiId };
  const df = buildDateFilter(fatura.dataFillim, fatura.dataMbarim);
  if (df) match.dataPorosis = df;
  const [pacienti, porosite, settings] = await Promise.all([
    Pacienti.findById(fatura.pacientiId).lean(),
    PorosiLab.find(match).populate('analizat.analiza', 'emri kodi departamenti cmime').sort({ dataPorosis: 1 }).lean(),
    Settings.findOne().lean(),
  ]);
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }
  const analizat = _buildAnalizatFromPorosite(porosite);
  const buf = await gjeneroPDF_FaturaPatient({
    pacienti, analizat, numrFatures: fatura.numrFatures, dataFatures: fatura.dataLeshimit,
    monedha: fatura.monedha,
    settings: settings || {}, shenime: fatura.shenime,
  });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="Fatura-${pacienti.mbiemri}-${fatura.numrFatures}.pdf"` });
  res.send(buf);
});

module.exports = { dashboard, raportMujor, raportiAnalizave, raportiDepartamenteve, raportiKomisioneve, borxhet, eksportExcel, faturaKompanise, faturaKompanisePDF, listoArkiveFaturave, riGjeneroPDF, faturaPatientData, faturaPatientPDF, listoArkiveFatPac, riGjeneroPDFFatPac };
