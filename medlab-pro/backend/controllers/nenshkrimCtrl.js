const asyncHandler = require('express-async-handler');
const Nenshkrim   = require('../models/Nenshkrim');

const listoNenshkrimet = asyncHandler(async (req, res) => {
  const nenshkrimet = await Nenshkrim.find().sort({ createdAt: 1 });
  res.json({ sukses: true, nenshkrimet });
});

const shtoNenshkrimin = asyncHandler(async (req, res) => {
  const { emri, mbiemri, titulli, foto, departamenti, aktiv } = req.body;
  if (!emri || !mbiemri) { res.status(400); throw new Error('Emri dhe mbiemri janë të detyrueshëm'); }
  if (!foto)             { res.status(400); throw new Error('Foto e nënshkrimit është e detyrueshme'); }
  const n = await Nenshkrim.create({ emri, mbiemri, titulli, foto, departamenti, aktiv });
  res.status(201).json({ sukses: true, nenshkrimi: n });
});

const perditesNenshkrimin = asyncHandler(async (req, res) => {
  const n = await Nenshkrim.findByIdAndUpdate(
    req.params.id, req.body, { new: true, runValidators: true }
  );
  if (!n) { res.status(404); throw new Error('Nënshkrimi nuk u gjet'); }
  res.json({ sukses: true, nenshkrimi: n });
});

const fshiNenshkrimin = asyncHandler(async (req, res) => {
  await Nenshkrim.findByIdAndDelete(req.params.id);
  res.json({ sukses: true, mesazh: 'Nënshkrimi u fshi' });
});

module.exports = { listoNenshkrimet, shtoNenshkrimin, perditesNenshkrimin, fshiNenshkrimin };
