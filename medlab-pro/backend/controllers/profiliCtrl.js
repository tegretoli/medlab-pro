const asyncHandler = require('express-async-handler');
const Profili = require('../models/Profili');
const Analiza = require('../models/Analiza');

const listoProfilet = asyncHandler(async (req, res) => {
  const { aktiv = 'true' } = req.query;
  const filter = {};
  if (aktiv !== 'all') filter.aktiv = aktiv === 'true';

  const profilet = await Profili.find(filter).sort({ numrRendor: 1, emri: 1 });

  // Shto analizat perberese per secilin profil
  const profiletMeAnaliza = await Promise.all(profilet.map(async prof => {
    const analizatProfil = await Analiza.find(
      { profiliId: prof._id, aktiv: true },
      'emri kodi departamenti cmime komponente numrRendorNeProfil'
    ).sort({ numrRendorNeProfil: 1, emri: 1 });
    return { ...prof.toObject(), analizatProfil };
  }));

  res.json({ sukses: true, profilet: profiletMeAnaliza });
});

const merrProfilin = asyncHandler(async (req, res) => {
  const profili = await Profili.findById(req.params.id);
  if (!profili) { res.status(404); throw new Error('Profili nuk u gjet'); }
  const analizatProfil = await Analiza.find(
    { profiliId: profili._id, aktiv: true },
    'emri kodi departamenti numrRendorNeProfil'
  ).sort({ numrRendorNeProfil: 1, emri: 1 });
  res.json({ sukses: true, profili: { ...profili.toObject(), analizatProfil } });
});

const shtoProfilin = asyncHandler(async (req, res) => {
  const profili = await Profili.create(req.body);
  res.status(201).json({ sukses: true, profili });
});

const perditesProfilin = asyncHandler(async (req, res) => {
  const profili = await Profili.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!profili) { res.status(404); throw new Error('Profili nuk u gjet'); }
  res.json({ sukses: true, profili });
});

const fshiProfilin = asyncHandler(async (req, res) => {
  await Profili.findByIdAndUpdate(req.params.id, { aktiv: false });
  res.json({ sukses: true, mesazh: 'Profili u çaktivizua' });
});

module.exports = { listoProfilet, merrProfilin, shtoProfilin, perditesProfilin, fshiProfilin };
