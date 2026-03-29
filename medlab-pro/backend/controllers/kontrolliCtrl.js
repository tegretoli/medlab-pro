const asyncHandler = require('express-async-handler');
const Kontrolli = require('../models/Kontrolli');
const Fatura = require('../models/Fatura');

// @route GET /api/kontrollet
const listoKontrollet = asyncHandler(async (req, res) => {
  const { mjekuId, pacientiId, statusi, dataFillim, dataMbarim, faqe = 1, limit = 20 } = req.query;
  const filter = {};
  if (mjekuId)   filter.mjeku = mjekuId;
  if (pacientiId) filter.pacienti = pacientiId;
  if (statusi)   filter.statusiTakimit = statusi;
  if (dataFillim || dataMbarim) {
    filter.dataTakimit = {};
    if (dataFillim) filter.dataTakimit.$gte = new Date(dataFillim);
    if (dataMbarim) filter.dataTakimit.$lte = new Date(dataMbarim);
  }
  // Nese roli mjek, shfaq vetem vizitat e tij
  if (req.perdoruesi.roli === 'mjek') filter.mjeku = req.perdoruesi._id;

  const total = await Kontrolli.countDocuments(filter);
  const kontrollet = await Kontrolli.find(filter)
    .populate('pacienti', 'emri mbiemri numrPersonal datelindja gjinia telefoni')
    .populate('mjeku', 'emri mbiemri specialiteti')
    .sort({ dataTakimit: -1 })
    .skip((faqe - 1) * limit)
    .limit(Number(limit));

  res.json({ sukses: true, total, faqe: Number(faqe), faqetTotal: Math.ceil(total / limit), kontrollet });
});

// @route GET /api/kontrollet/kalendar
const merreKalendarin = asyncHandler(async (req, res) => {
  const { data, mjekuId } = req.query;
  const dataFillim = data ? new Date(data) : new Date();
  dataFillim.setHours(0, 0, 0, 0);
  const dataMbarim = new Date(dataFillim);
  dataMbarim.setDate(dataMbarim.getDate() + 7);

  const filter = { dataTakimit: { $gte: dataFillim, $lte: dataMbarim } };
  if (mjekuId) filter.mjeku = mjekuId;
  if (req.perdoruesi.roli === 'mjek') filter.mjeku = req.perdoruesi._id;

  const takimet = await Kontrolli.find(filter)
    .populate('pacienti', 'emri mbiemri numrPersonal telefoni')
    .populate('mjeku', 'emri mbiemri specialiteti')
    .sort({ dataTakimit: 1 });

  res.json({ sukses: true, takimet });
});

// @route GET /api/kontrollet/:id
const merrKontrollin = asyncHandler(async (req, res) => {
  const kontrolli = await Kontrolli.findById(req.params.id)
    .populate('pacienti')
    .populate('mjeku', 'emri mbiemri specialiteti licenca')
    .populate('testetEKerkuara', 'emri kodi kategoria')
    .populate('rezultateLab');
  if (!kontrolli) { res.status(404); throw new Error('Vizita nuk u gjet'); }
  res.json({ sukses: true, kontrolli });
});

// @route POST /api/kontrollet
const krijoKontrollin = asyncHandler(async (req, res) => {
  const { pacientiId, mjekuId, dataTakimit, kohaFillimit, lloji, arsyjaVizites } = req.body;

  // Kontroilo konfliktet e orarit
  const konflikt = await Kontrolli.findOne({
    mjeku: mjekuId,
    dataTakimit: new Date(dataTakimit),
    kohaFillimit,
    statusiTakimit: { $nin: ['Anuluar', 'NukErdhi'] },
  });
  if (konflikt) { res.status(400); throw new Error('Mjeku ka nje takim tjeter ne kete ore'); }

  const kontrolli = await Kontrolli.create({
    pacienti:     pacientiId,
    mjeku:        mjekuId || req.perdoruesi._id,
    dataTakimit:  new Date(dataTakimit),
    kohaFillimit,
    lloji:        lloji || 'Kontrolle_Rutine',
    arsyjaVizites,
  });

  await kontrolli.populate([
    { path: 'pacienti', select: 'emri mbiemri numrPersonal telefoni' },
    { path: 'mjeku', select: 'emri mbiemri specialiteti' },
  ]);

  res.status(201).json({ sukses: true, kontrolli });
});

// @route PUT /api/kontrollet/:id
const perditesKontrollin = asyncHandler(async (req, res) => {
  const kontrolli = await Kontrolli.findById(req.params.id);
  if (!kontrolli) { res.status(404); throw new Error('Vizita nuk u gjet'); }

  const perditesuar = await Kontrolli.findByIdAndUpdate(
    req.params.id, req.body, { new: true, runValidators: true }
  ).populate('pacienti').populate('mjeku', 'emri mbiemri specialiteti');

  // Nese u kompletua, krijo fature per viziten
  if (req.body.statusiTakimit === 'Kompletuar' && !kontrolli.pagesa) {
    const mjek = await require('../models/Perdoruesi').findById(kontrolli.mjeku);
    const fatura = await Fatura.create({
      pacienti: kontrolli.pacienti,
      krijoNga: req.perdoruesi._id,
      zerat: [{
        lloji: 'Vizite_Mjekesore',
        referenca: kontrolli._id,
        pershkrim: `Vizite Mjekesore - ${mjek?.specialiteti || 'Mjekesor i Pergjithshem'}`,
        cmimi: 2000,
      }],
      totali: 2000,
    });
    perditesuar.pagesa = fatura._id;
    await perditesuar.save();
  }

  res.json({ sukses: true, kontrolli: perditesuar });
});

// @route PUT /api/kontrollet/:id/statusi
const ndryshoStatusin = asyncHandler(async (req, res) => {
  const { statusi, arsyja } = req.body;
  const update = { statusiTakimit: statusi };
  if (arsyja) update.arsyjaAnulimit = arsyja;
  const kontrolli = await Kontrolli.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!kontrolli) { res.status(404); throw new Error('Vizita nuk u gjet'); }
  res.json({ sukses: true, kontrolli });
});

// @route GET /api/kontrollet/statistika
const merreStatistikat = asyncHandler(async (req, res) => {
  const { mjekuId, nga, deri } = req.query;
  const filter = {};
  if (mjekuId) filter.mjeku = mjekuId;
  if (req.perdoruesi.roli === 'mjek') filter.mjeku = req.perdoruesi._id;
  if (nga || deri) {
    filter.dataTakimit = {};
    if (nga)  filter.dataTakimit.$gte = new Date(nga);
    if (deri) filter.dataTakimit.$lte = new Date(deri);
  }
  const [total, sipasStatusit, sipasLlojit] = await Promise.all([
    Kontrolli.countDocuments(filter),
    Kontrolli.aggregate([{ $match: filter }, { $group: { _id: '$statusiTakimit', count: { $sum: 1 } } }]),
    Kontrolli.aggregate([{ $match: filter }, { $group: { _id: '$lloji', count: { $sum: 1 } } }]),
  ]);
  res.json({ sukses: true, total, sipasStatusit, sipasLlojit });
});

module.exports = { listoKontrollet, merreKalendarin, merrKontrollin, krijoKontrollin, perditesKontrollin, ndryshoStatusin, merreStatistikat };
