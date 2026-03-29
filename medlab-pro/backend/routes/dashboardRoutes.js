const express = require('express');
const router  = express.Router();
const asyncHandler = require('express-async-handler');
const Pacienti  = require('../models/Pacienti');
const PorosiLab = require('../models/PorosiLab');
const Analiza   = require('../models/Analiza');
const Kontrolli = require('../models/Kontrolli');
const Fatura    = require('../models/Fatura');
const { mbrojtRoute } = require('../middleware/auth');

router.get('/', mbrojtRoute, asyncHandler(async (req, res) => {
  // ─── Date range (default: today) ─────────────────────────────────────────
  const d0 = req.query.dataFillim ? new Date(req.query.dataFillim) : new Date();
  d0.setHours(0, 0, 0, 0);
  const d1 = req.query.dataMbarim ? new Date(req.query.dataMbarim) : new Date(d0);
  d1.setHours(23, 59, 59, 999);

  // ─── Takime + Vizitat ─────────────────────────────────────────────────────
  const [takime, vizitat] = await Promise.all([
    Kontrolli.countDocuments({ dataTakimit: { $gte: d0, $lte: d1 }, statusiTakimit: { $nin: ['Anuluar','NukErdhi'] } }),
    Kontrolli.find({ dataTakimit: { $gte: d0, $lte: d1 } })
      .populate('pacienti','emri mbiemri').populate('mjeku','emri mbiemri')
      .sort({ kohaFillimit: 1 }).limit(6),
  ]);

  // ─── Top 5 analiza ────────────────────────────────────────────────────────
  const testeteRaw = await PorosiLab.aggregate([
    { $match: { dataPorosis: { $gte: d0, $lte: d1 } } },
    { $unwind: '$analizat' },
    { $group: { _id: '$analizat.analiza', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const analizaIds = testeteRaw.map(t => t._id).filter(Boolean);
  const analizatDet = analizaIds.length
    ? await Analiza.find({ _id: { $in: analizaIds } }, 'emri')
    : [];
  const aMap = {};
  analizatDet.forEach(a => { aMap[String(a._id)] = a.emri; });
  const testeteTop5 = testeteRaw.map(t => ({ emri: aMap[String(t._id)] || '—', count: t.count }));

  // ─── Të gjitha porositë e periudhës (statusi + pagesa) ───────────────────
  const porosite_sot = await PorosiLab.find(
    { dataPorosis: { $gte: d0, $lte: d1 } },
    'pacienti statusi pagesa cmimi'
  ).populate('pacienti', 'emri mbiemri');

  // Per-order: payment totals
  let pagesatKryera = 0, borxhi = 0;
  porosite_sot.forEach(p => {
    if (p.pagesa?.statusi === 'Paguar') pagesatKryera += (p.pagesa.shumaFinal || 0);
    else borxhi += (p.cmimi || 0);
  });

  // Per-patient grouping
  const pacMap = new Map();
  porosite_sot.forEach(p => {
    const pid = String(p.pacienti?._id);
    if (!p.pacienti?._id) return;
    if (!pacMap.has(pid)) pacMap.set(pid, { pacienti: p.pacienti, statuset: [], pagesaStatuset: [] });
    pacMap.get(pid).statuset.push(p.statusi);
    pacMap.get(pid).pagesaStatuset.push(p.pagesa?.statusi || 'Papaguar');
  });

  const pacienteDitor = pacMap.size;
  let pacienteKryer = 0, pacienteNeProcesim = 0;
  let paguarCount = 0;
  const papaguarList = [];

  pacMap.forEach((val) => {
    const allDone = val.statuset.every(s => s === 'Kompletuar' || s === 'Anuluar');
    const hasPending = val.statuset.some(s => s === 'Porositur' || s === 'NeProcesim');
    if (allDone) pacienteKryer++;
    if (hasPending) pacienteNeProcesim++;

    const allPaid = val.pagesaStatuset.every(s => s === 'Paguar');
    if (allPaid) paguarCount++;
    else papaguarList.push({ _id: val.pacienti._id, emri: val.pacienti.emri, mbiemri: val.pacienti.mbiemri });
  });

  res.json({
    sukses: true,
    kartela: {
      pacienteDitor,
      pacienteNeProcesim,
      pagesatKryera,
      borxhi,
      takime,
    },
    vizitetSot: vizitat,
    testeteTop5,
    pacienteKryer,
    pacienteNeProcesim,
    paguarCount,
    papaguarit: papaguarList.slice(0, 5),
    papaguaritTotal: papaguarList.length,
  });
}));

module.exports = router;
