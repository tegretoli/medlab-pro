const express    = require('express');
const r1         = express.Router();
const asyncHandler = require('express-async-handler');
const Perdoruesi = require('../models/Perdoruesi');
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');

r1.use(mbrojtRoute);

r1.get('/', kontrolloRolin('admin'), asyncHandler(async (req, res) => {
  const perdoruesit = await Perdoruesi.find().sort({ createdAt: -1 });
  res.json({ sukses: true, perdoruesit });
}));

r1.get('/:id', asyncHandler(async (req, res) => {
  const p = await Perdoruesi.findById(req.params.id);
  if (!p) { res.status(404); throw new Error('Perdoruesi nuk u gjet'); }
  res.json({ sukses: true, perdoruesi: p });
}));

// Perditeso perdoruesin plotesisht (admin only)
r1.put('/:id', kontrolloRolin('admin'), asyncHandler(async (req, res) => {
  const { emri, mbiemri, email, roli, telefoni, specialiteti, aktiv, qasjet, fjalekalimi } = req.body;
  const p = await Perdoruesi.findById(req.params.id).select('+fjalekalimi');
  if (!p) { res.status(404); throw new Error('Perdoruesi nuk u gjet'); }

  if (emri)            p.emri         = emri;
  if (mbiemri)         p.mbiemri      = mbiemri;
  if (email)           p.email        = email;
  if (roli)            p.roli         = roli;
  if (telefoni     !== undefined) p.telefoni     = telefoni;
  if (specialiteti !== undefined) p.specialiteti = specialiteti;
  if (aktiv        !== undefined) p.aktiv        = aktiv;
  if (qasjet       !== undefined) p.qasjet       = qasjet;
  if (fjalekalimi && fjalekalimi.trim()) p.fjalekalimi = fjalekalimi; // pre-save e hash-on

  await p.save();
  res.json({ sukses: true, perdoruesi: p });
}));

r1.put('/:id/aktiv', kontrolloRolin('admin'), asyncHandler(async (req, res) => {
  const p = await Perdoruesi.findByIdAndUpdate(req.params.id, { aktiv: req.body.aktiv }, { new: true });
  res.json({ sukses: true, perdoruesi: p });
}));

module.exports = r1;
