const asyncHandler   = require('express-async-handler');
const PakoAnalizave  = require('../models/PakoAnalizave');

// ── GET /api/paketat ──────────────────────────────────────────────────────────
const listoPaketat = asyncHandler(async (req, res) => {
  const { aktiv } = req.query;
  const filter = {};
  if (aktiv === 'true')  filter.aktiv = true;
  if (aktiv === 'false') filter.aktiv = false;

  const paketat = await PakoAnalizave.find(filter)
    .sort({ numrRendor: 1, emri: 1 })
    .populate('analizat.analiza', 'emri kodi departamenti materialBiologjik cmime')
    .lean();

  res.json({ sukses: true, paketat });
});

// ── GET /api/paketat/:id ──────────────────────────────────────────────────────
const merrPakon = asyncHandler(async (req, res) => {
  const pako = await PakoAnalizave.findById(req.params.id)
    .populate('analizat.analiza', 'emri kodi departamenti materialBiologjik cmime')
    .lean();
  if (!pako) { res.status(404); throw new Error('Pako nuk u gjet'); }
  res.json({ sukses: true, pako });
});

// ── POST /api/paketat ─────────────────────────────────────────────────────────
const shtoPakon = asyncHandler(async (req, res) => {
  const { emri, pershkrim, analizatIds = [], cmimiPromocional, shenime } = req.body;
  if (!emri) { res.status(400); throw new Error('Emri eshte i detyreshem'); }

  const maxRendor = await PakoAnalizave.findOne({}, 'numrRendor').sort({ numrRendor: -1 }).lean();
  const numrRendor = (maxRendor?.numrRendor ?? 0) + 1;

  const pako = await PakoAnalizave.create({
    emri,
    pershkrim: pershkrim || '',
    analizat:  analizatIds.map(id => ({ analiza: id })),
    cmimiPromocional: Number(cmimiPromocional) || 0,
    shenime: shenime || '',
    numrRendor,
  });

  const populated = await PakoAnalizave.findById(pako._id)
    .populate('analizat.analiza', 'emri kodi departamenti materialBiologjik cmime')
    .lean();

  res.status(201).json({ sukses: true, pako: populated });
});

// ── PUT /api/paketat/:id ──────────────────────────────────────────────────────
const perditesoPakon = asyncHandler(async (req, res) => {
  const { emri, pershkrim, analizatIds, cmimiPromocional, aktiv, shenime } = req.body;

  const pako = await PakoAnalizave.findById(req.params.id);
  if (!pako) { res.status(404); throw new Error('Pako nuk u gjet'); }

  if (emri              !== undefined) pako.emri              = emri;
  if (pershkrim         !== undefined) pako.pershkrim         = pershkrim;
  if (cmimiPromocional  !== undefined) pako.cmimiPromocional  = Number(cmimiPromocional);
  if (aktiv             !== undefined) pako.aktiv             = aktiv;
  if (shenime           !== undefined) pako.shenime           = shenime;
  if (analizatIds       !== undefined) pako.analizat          = analizatIds.map(id => ({ analiza: id }));

  await pako.save();

  const populated = await PakoAnalizave.findById(pako._id)
    .populate('analizat.analiza', 'emri kodi departamenti materialBiologjik cmime')
    .lean();

  res.json({ sukses: true, pako: populated });
});

// ── DELETE /api/paketat/:id ───────────────────────────────────────────────────
const fshiPakon = asyncHandler(async (req, res) => {
  const pako = await PakoAnalizave.findByIdAndDelete(req.params.id);
  if (!pako) { res.status(404); throw new Error('Pako nuk u gjet'); }
  res.json({ sukses: true, mesazh: 'Pako u fshi' });
});

module.exports = { listoPaketat, merrPakon, shtoPakon, perditesoPakon, fshiPakon };
