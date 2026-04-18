const asyncHandler = require('express-async-handler');
const Fatura    = require('../models/Fatura');
const PorosiLab = require('../models/PorosiLab');
const Profili   = require('../models/Profili');
const { gjeneroPDF_Fatura } = require('../utils/pdfGenerator');
const { dergEmailFatura } = require('../utils/email');
const { ruajLogun } = require('./kodZbritjeCtrl');

// @route GET /api/pagesat/faturat
const listoFaturat = asyncHandler(async (req, res) => {
  const { statusi, pacientiId, dataFillim, dataMbarim, faqe = 1, limit = 20 } = req.query;
  const filter = { anuluar: false };
  if (statusi)    filter.statusiPag = statusi;
  if (pacientiId) filter.pacienti = pacientiId;
  if (dataFillim || dataMbarim) {
    filter.createdAt = {};
    if (dataFillim) filter.createdAt.$gte = new Date(dataFillim);
    if (dataMbarim) filter.createdAt.$lte = new Date(dataMbarim);
  }
  const total = await Fatura.countDocuments(filter);
  const faturat = await Fatura.find(filter)
    .populate('pacienti', 'emri mbiemri numrPersonal telefoni')
    .populate('krijoNga', 'emri mbiemri')
    .sort({ createdAt: -1 })
    .skip((faqe - 1) * limit)
    .limit(Number(limit));
  res.json({ sukses: true, total, faqe: Number(faqe), faqetTotal: Math.ceil(total / limit), faturat });
});

// @route GET /api/pagesat/faturat/:id
const merrFaturen = asyncHandler(async (req, res) => {
  const fatura = await Fatura.findById(req.params.id)
    .populate('pacienti')
    .populate('krijoNga', 'emri mbiemri');
  if (!fatura) { res.status(404); throw new Error('Fatura nuk u gjet'); }
  res.json({ sukses: true, fatura });
});

// @route POST /api/pagesat/faturat
const krijoFaturen = asyncHandler(async (req, res) => {
  const { pacientiId, zerat, sigurimi, shenime } = req.body;
  const totali = zerat.reduce((s, z) => s + z.sasia * z.cmimi * (1 - (z.zbritja || 0) / 100), 0);
  const fatura = await Fatura.create({
    pacienti:  pacientiId,
    krijoNga:  req.perdoruesi._id,
    zerat,
    totali,
    sigurimi,
    shenime,
  });
  await fatura.populate('pacienti', 'emri mbiemri numrPersonal');
  res.status(201).json({ sukses: true, fatura });
});

// @route PUT /api/pagesat/faturat/:id/paguaj
const regjistroPagesen = asyncHandler(async (req, res) => {
  const { shuma, metoda, transaksionId, shenime } = req.body;
  const fatura = await Fatura.findById(req.params.id);
  if (!fatura) { res.status(404); throw new Error('Fatura nuk u gjet'); }
  if (fatura.statusiPag === 'Pagezur') { res.status(400); throw new Error('Fatura eshte pagezur tashme'); }
  if (fatura.statusiPag === 'Anuluar') { res.status(400); throw new Error('Fatura eshte anuluar'); }

  fatura.pagesat.push({ shuma, metoda, transaksionId, shenime, regjistuarNga: req.perdoruesi._id });
  await fatura.save(); // Pre-hook llogarit totalet

  await fatura.populate('pacienti', 'emri mbiemri numrPersonal email');
  res.json({ sukses: true, fatura });
});

// @route GET /api/pagesat/faturat/:id/pdf
const shkarkoFaturenPDF = asyncHandler(async (req, res) => {
  const fatura = await Fatura.findById(req.params.id).populate('pacienti').populate('krijoNga', 'emri mbiemri');
  if (!fatura) { res.status(404); throw new Error('Fatura nuk u gjet'); }
  const pdfBuffer = await gjeneroPDF_Fatura(fatura);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${fatura.numrFatures}.pdf"` });
  res.send(pdfBuffer);
});

// @route POST /api/pagesat/faturat/:id/email
const dergFaturenEmail = asyncHandler(async (req, res) => {
  const fatura = await Fatura.findById(req.params.id).populate('pacienti');
  if (!fatura) { res.status(404); throw new Error('Fatura nuk u gjet'); }
  if (!fatura.pacienti.email) { res.status(400); throw new Error('Pacienti nuk ka email'); }
  await dergEmailFatura(fatura);
  await Fatura.findByIdAndUpdate(fatura._id, { emailDerguar: true, emailDerguarNe: new Date() });
  res.json({ sukses: true, mesazh: 'Fatura u dergua me email' });
});

// @route GET /api/pagesat/detyrime
const merreDetyrimet = asyncHandler(async (req, res) => {
  const detyrimet = await Fatura.find({ statusiPag: { $in: ['Hapur', 'PagezurPjeserisht'] }, anuluar: false })
    .populate('pacienti', 'emri mbiemri numrPersonal telefoni')
    .sort({ createdAt: 1 });
  const total = detyrimet.reduce((s, f) => s + f.totalNgelur, 0);
  res.json({ sukses: true, detyrimet, totalDetyrimeve: total });
});

// @route GET /api/pagesat/statistika
const merreStatistikat = asyncHandler(async (req, res) => {
  const sot = new Date();
  const fillimMuajit = new Date(sot.getFullYear(), sot.getMonth(), 1);
  const fillimVitit  = new Date(sot.getFullYear(), 0, 1);

  const [sot_te, muaji, viti, sipasMetodes] = await Promise.all([
    Fatura.aggregate([
      { $match: { statusiPag: 'Pagezur', createdAt: { $gte: new Date(sot.setHours(0,0,0,0)) } } },
      { $group: { _id: null, total: { $sum: '$totali' }, count: { $sum: 1 } } },
    ]),
    Fatura.aggregate([
      { $match: { statusiPag: 'Pagezur', createdAt: { $gte: fillimMuajit } } },
      { $group: { _id: null, total: { $sum: '$totali' }, count: { $sum: 1 } } },
    ]),
    Fatura.aggregate([
      { $match: { statusiPag: 'Pagezur', createdAt: { $gte: fillimVitit } } },
      { $group: { _id: null, total: { $sum: '$totali' }, count: { $sum: 1 } } },
    ]),
    Fatura.aggregate([
      { $match: { statusiPag: 'Pagezur' } },
      { $unwind: '$pagesat' },
      { $group: { _id: '$pagesat.metoda', total: { $sum: '$pagesat.shuma' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    sukses: true,
    sotTotal:   sot_te[0]?.total || 0,
    muajTotal:  muaji[0]?.total  || 0,
    vitiTotal:  viti[0]?.total   || 0,
    sipasMetodes,
  });
});

// @route GET /api/pagesat/raport/mujor
const raportMujor = asyncHandler(async (req, res) => {
  const { viti = new Date().getFullYear() } = req.query;
  const raport = await Fatura.aggregate([
    { $match: { statusiPag: 'Pagezur', createdAt: { $gte: new Date(`${viti}-01-01`), $lte: new Date(`${viti}-12-31`) } } },
    { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totali' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ sukses: true, raport });
});

// @route GET /api/pagesat/porosi-ditore
const listoPorosiPagesat = asyncHandler(async (req, res) => {
  const { data, dataFillim, dataMbarim: dataMbarimQ, referuesId } = req.query;
  const d0 = new Date((dataFillim || data || new Date().toISOString().split('T')[0]) + 'T00:00:00');
  d0.setHours(0, 0, 0, 0);
  const d1 = dataMbarimQ ? new Date(dataMbarimQ + 'T00:00:00') : new Date(d0);
  d1.setHours(23, 59, 59, 999);

  const filter = { dataPorosis: { $gte: d0, $lte: d1 } };
  if (referuesId === 'vete') filter.referuesId = null;
  else if (referuesId) filter.referuesId = referuesId;

  const porosite = await PorosiLab.find(filter)
    .populate('pacienti', 'emri mbiemri numrPersonal')
    .populate('referuesId', 'emri mbiemri institucioni tipi')
    .populate('analizat.analiza', 'emri kodi cmime')
    .sort({ createdAt: -1 });

  // Collect unique profiliIds stored in analizat[].profiliId
  const profiliIdSet = new Set();
  porosite.forEach(p => p.analizat.forEach(a => {
    if (a.profiliId) profiliIdSet.add(a.profiliId.toString());
  }));

  const profilet = profiliIdSet.size > 0
    ? await Profili.find({ _id: { $in: [...profiliIdSet] } }, 'emri cmime')
    : [];
  const profMap = {};
  profilet.forEach(pr => { profMap[pr._id.toString()] = pr.toObject(); });

  const porositeComputed = porosite.map(p => {
    const tipi = p.tipiPacientit || 'pacient';
    const countedProf = new Set();

    p.analizat.forEach(a => {
      if (a.profiliId) countedProf.add(a.profiliId.toString());
    });

    const obj = p.toObject();
    // Use the price computed at order creation (accurate, includes profile discounts)
    obj.cmimiTotal = p.cmimi || 0;
    // Keep profile info for breakdown display in modal
    obj.profiletInfo = Object.fromEntries(
      [...countedProf].map(pid => [pid, profMap[pid]])
    );
    return obj;
  });

  const totali  = porositeComputed.reduce((s, p) => s + p.cmimiTotal, 0);
  const paguar  = porositeComputed
    .filter(p => p.pagesa?.statusi === 'Paguar')
    .reduce((s, p) => s + (p.pagesa?.shumaFinal || 0), 0);
  const borxhi  = porositeComputed
    .filter(p => p.pagesa?.statusi !== 'Paguar')
    .reduce((s, p) => s + p.cmimiTotal, 0);

  res.json({ sukses: true, porosite: porositeComputed, totali, paguar, borxhi });
});

// @route PUT /api/pagesat/porosi/:id/paguaj
const regjistroPagesenPorosi = asyncHandler(async (req, res) => {
  const { metodaPagese, zbritjaPerqind = 0, zbritjaFikse = 0, shumaTotale, shumaFinal, kodZbritjes } = req.body;
  const porosi = await PorosiLab.findById(req.params.id).populate('pacienti', 'emri mbiemri');
  if (!porosi) { res.status(404); throw new Error('Porosi nuk u gjet'); }

  porosi.pagesa = {
    statusi: 'Paguar',
    metodaPagese,
    zbritjaPerqind: Number(zbritjaPerqind) || 0,
    zbritjaFikse:   Number(zbritjaFikse)   || 0,
    shumaTotale:    Number(shumaTotale)    || 0,
    shumaFinal:     Number(shumaFinal)     || 0,
    dataPageses:    new Date(),
    kodZbritjes:    kodZbritjes || null,
  };
  await porosi.save();

  // Log discount code usage if provided
  if (kodZbritjes && shumaTotale && shumaFinal) {
    const pac = porosi.pacienti;
    ruajLogun({
      kodi:          kodZbritjes,
      porosiId:      porosi._id,
      pacientiId:    pac?._id,
      pacientEmri:   pac ? `${pac.emri} ${pac.mbiemri}` : '',
      totalPara:     Number(shumaTotale),
      totalPas:      Number(shumaFinal),
      perdorurNga:   req.perdoruesi?._id,
    }).catch(() => {});
  }

  res.json({ sukses: true, porosi });
});

// @route GET /api/pagesat/borxhet-pacienteve
// Returns a map { [pacientiId]: { shuma, numriPorosive } } for all patients with unpaid orders
const borxhetPacienteve = asyncHandler(async (req, res) => {
  const porosite = await PorosiLab.find({ 'pagesa.statusi': 'Papaguar' })
    .select('pacienti cmimi')
    .lean();
  const borxhet = {};
  for (const p of porosite) {
    const pid = p.pacienti?.toString();
    if (!pid) continue;
    if (!borxhet[pid]) borxhet[pid] = { shuma: 0, numriPorosive: 0 };
    borxhet[pid].shuma += p.cmimi || 0;
    borxhet[pid].numriPorosive++;
  }
  res.json({ sukses: true, borxhet });
});

// @route GET /api/pagesat/pacienti/:id/borxhi
// Returns unpaid orders for a specific patient
const borxhiPacienti = asyncHandler(async (req, res) => {
  const porosite = await PorosiLab.find({
    pacienti: req.params.id,
    'pagesa.statusi': 'Papaguar',
  })
    .select('numrPorosi dataPorosis cmimi departamenti analizat')
    .populate('analizat.analiza', 'emri')
    .lean();
  const totalShuma = porosite.reduce((s, p) => s + (p.cmimi || 0), 0);
  res.json({ sukses: true, porosite, totalShuma });
});

module.exports = { listoFaturat, merrFaturen, krijoFaturen, regjistroPagesen, shkarkoFaturenPDF, dergFaturenEmail, merreDetyrimet, merreStatistikat, raportMujor, listoPorosiPagesat, regjistroPagesenPorosi, borxhetPacienteve, borxhiPacienti };
