const asyncHandler      = require('express-async-handler');
const AntibiogramGrupi  = require('../models/AntibiogramGrupi');
const SablonAntibiogram = require('../models/SablonAntibiogram');

const listoGrupet = asyncHandler(async (req, res) => {
  const grupet = await AntibiogramGrupi.find({ aktiv: true }).sort({ numrRendor: 1, emri: 1 });
  res.json({ sukses: true, grupet });
});

const shtoGrupin = asyncHandler(async (req, res) => {
  const { emri, numrRendor } = req.body;
  const grupi = await AntibiogramGrupi.create({ emri, numrRendor: numrRendor || 0 });
  res.status(201).json({ sukses: true, grupi });
});

const perditesGrupin = asyncHandler(async (req, res) => {
  const grupi = await AntibiogramGrupi.findByIdAndUpdate(
    req.params.id, req.body, { new: true, runValidators: true }
  );
  if (!grupi) { res.status(404); throw new Error('Grupi nuk u gjet'); }
  res.json({ sukses: true, grupi });
});

const fshiGrupin = asyncHandler(async (req, res) => {
  await AntibiogramGrupi.findByIdAndUpdate(req.params.id, { aktiv: false });
  res.json({ sukses: true, mesazh: 'Grupi u fshi' });
});

// ─── Sablonet e Antibiogramit ─────────────────────────────────────────────────

const listoSablonet = asyncHandler(async (req, res) => {
  const sablonet = await SablonAntibiogram.find({ aktiv: true }).sort({ grupiEmri: 1, emri: 1 }).lean();
  res.json({ sukses: true, sablonet });
});

const shtoSablonin = asyncHandler(async (req, res) => {
  const { emri, grupiId, antibiotike } = req.body;
  if (!emri?.trim() || !grupiId) { res.status(400); throw new Error('Emri dhe grupi janë të detyrueshëm'); }
  const grupi  = await AntibiogramGrupi.findById(grupiId).lean();
  const sablon = await SablonAntibiogram.create({
    emri:       emri.trim(),
    grupiId,
    grupiEmri:  grupi?.emri || '',
    antibiotike: antibiotike || [],
  });
  res.status(201).json({ sukses: true, sablon });
});

const perditesaSablonin = asyncHandler(async (req, res) => {
  const { emri, grupiId, antibiotike } = req.body;
  const upd = {};
  if (emri)       upd.emri       = emri.trim();
  if (grupiId)    { upd.grupiId  = grupiId; const g = await AntibiogramGrupi.findById(grupiId).lean(); upd.grupiEmri = g?.emri || ''; }
  if (antibiotike) upd.antibiotike = antibiotike;
  const sablon = await SablonAntibiogram.findByIdAndUpdate(req.params.id, upd, { new: true });
  if (!sablon) { res.status(404); throw new Error('Shablloni nuk u gjet'); }
  res.json({ sukses: true, sablon });
});

const fshiSablonin = asyncHandler(async (req, res) => {
  await SablonAntibiogram.findByIdAndUpdate(req.params.id, { aktiv: false });
  res.json({ sukses: true, mesazh: 'Shablloni u fshi' });
});

module.exports = { listoGrupet, shtoGrupin, perditesGrupin, fshiGrupin, listoSablonet, shtoSablonin, perditesaSablonin, fshiSablonin };
