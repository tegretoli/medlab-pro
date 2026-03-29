const asyncHandler = require('express-async-handler');
const Referues = require('../models/Referues');

// GET /api/referuesit
const listoReferuesit = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.tipi) filter.tipi = req.query.tipi;
  if (req.query.aktiv !== 'te_gjithe') filter.aktiv = true;

  const lista = await Referues.find(filter).sort({ mbiemri: 1, emri: 1 });
  res.json({ sukses: true, data: lista });
});

// GET /api/referuesit/:id
const merrReferuesin = asyncHandler(async (req, res) => {
  const ref = await Referues.findById(req.params.id);
  if (!ref) return res.status(404).json({ sukses: false, mesazh: 'Referuesi nuk u gjet' });
  res.json({ sukses: true, data: ref });
});

// POST /api/referuesit
const shtoReferuesin = asyncHandler(async (req, res) => {
  const ref = await Referues.create(req.body);
  res.status(201).json({ sukses: true, data: ref });
});

// PUT /api/referuesit/:id
const perditesReferuesin = asyncHandler(async (req, res) => {
  const ref = await Referues.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!ref) return res.status(404).json({ sukses: false, mesazh: 'Referuesi nuk u gjet' });
  res.json({ sukses: true, data: ref });
});

// DELETE /api/referuesit/:id  (soft delete)
const fshiReferuesin = asyncHandler(async (req, res) => {
  const ref = await Referues.findByIdAndUpdate(req.params.id, { aktiv: false }, { new: true });
  if (!ref) return res.status(404).json({ sukses: false, mesazh: 'Referuesi nuk u gjet' });
  res.json({ sukses: true, mesazh: 'Referuesi u fshi' });
});

module.exports = { listoReferuesit, merrReferuesin, shtoReferuesin, perditesReferuesin, fshiReferuesin };
