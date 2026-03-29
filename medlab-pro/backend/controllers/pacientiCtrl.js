const asyncHandler = require('express-async-handler');
const Pacienti = require('../models/Pacienti');
const { RezultatLab } = require('../models/TestiLab');
const Kontrolli = require('../models/Kontrolli');
const Fatura = require('../models/Fatura');
const { logVeprimin } = require('../utils/logAction');

// @desc   Listo te gjithe pacientet me filtrim dhe faqezim
// @route  GET /api/pacientet
const listoPacientet = asyncHandler(async (req, res) => {
  const { kerkese, qyteti, gjinia, aktiv = true, faqe = 1, limit = 20 } = req.query;
  const filter = { aktiv };

  if (kerkese) {
    const fjalet = kerkese.trim().split(/\s+/).filter(Boolean);
    if (fjalet.length > 1) {
      filter.$and = fjalet.map(fjala => ({
        $or: [
          { emri:    new RegExp(fjala, 'i') },
          { mbiemri: new RegExp(fjala, 'i') },
        ],
      }));
    } else {
      filter.$or = [
        { emri:         new RegExp(kerkese, 'i') },
        { mbiemri:      new RegExp(kerkese, 'i') },
        { numrPersonal: new RegExp(kerkese, 'i') },
        { telefoni:     new RegExp(kerkese, 'i') },
        { email:        new RegExp(kerkese, 'i') },
      ];
    }
  }
  if (qyteti) filter['adresa.qyteti'] = new RegExp(qyteti, 'i');
  if (gjinia) filter.gjinia = gjinia;

  const total = await Pacienti.countDocuments(filter);
  const pacientet = await Pacienti.find(filter)
    .select('emri mbiemri numrPersonal datelindja gjinia telefoni email adresa aktiv fotoProfili createdAt')
    .populate('mjekuKryesor', 'emri mbiemri specialiteti')
    .sort({ createdAt: -1 })
    .skip((faqe - 1) * limit)
    .limit(Number(limit));

  res.json({ sukses: true, total, faqe: Number(faqe), faqetTotal: Math.ceil(total / limit), pacientet });
});

// @desc   Kerko pacientin (real-time search)
// @route  GET /api/pacientet/kerko
const kerkoPacientin = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ sukses: true, pacientet: [] });

  const fjalet = q.trim().split(/\s+/).filter(Boolean);
  let filter;
  if (fjalet.length > 1) {
    filter = { aktiv: true, $and: fjalet.map(fjala => ({ $or: [{ emri: new RegExp(fjala, 'i') }, { mbiemri: new RegExp(fjala, 'i') }] })) };
  } else {
    filter = { aktiv: true, $or: [{ emri: new RegExp(q, 'i') }, { mbiemri: new RegExp(q, 'i') }, { numrPersonal: new RegExp(q, 'i') }, { telefoni: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] };
  }

  const pacientet = await Pacienti.find(filter)
    .select('emri mbiemri numrPersonal datelindja gjinia telefoni fotoProfili')
    .limit(10);

  res.json({ sukses: true, pacientet });
});

// @desc   Merr pacientin me historikun e plote
// @route  GET /api/pacientet/:id
const merrPacientin = asyncHandler(async (req, res) => {
  const pacienti = await Pacienti.findById(req.params.id)
    .populate('mjekuKryesor', 'emri mbiemri specialiteti telefoni');
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }
  res.json({ sukses: true, pacienti });
});

// @desc   Regjistro pacient te ri
// @route  POST /api/pacientet
const regjistroPatient = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (!data.numrPersonal?.trim()) delete data.numrPersonal;
  const pacienti = await Pacienti.create(data);

  logVeprimin(req, 'CREATE_PATIENT', {
    kategorija:     'Pacient',
    moduliDetajuar: 'Pacient',
    rekordId:       pacienti._id,
    rekordEmri:     `${pacienti.emri} ${pacienti.mbiemri}`,
    vleraRe:        { emri: pacienti.emri, mbiemri: pacienti.mbiemri, numrPersonal: pacienti.numrPersonal, datelindja: pacienti.datelindja },
    pershkrimi:     `Pacient i ri u regjistrua: ${pacienti.emri} ${pacienti.mbiemri}`,
  });

  res.status(201).json({ sukses: true, pacienti });
});

// @desc   Perditeso pacientin
// @route  PUT /api/pacientet/:id
const perditesoPacientin = asyncHandler(async (req, res) => {
  // Merr vlerën e vjetër para ndryshimit
  const vjeter = await Pacienti.findById(req.params.id).lean();

  const { numrPersonal: np, ...setData } = req.body;
  const npTrim = (np || '').trim();
  const updateOp = npTrim
    ? { $set: { ...setData, numrPersonal: npTrim } }
    : { $set: setData, $unset: { numrPersonal: '' } };

  const pacienti = await Pacienti.findByIdAndUpdate(
    req.params.id,
    updateOp,
    { new: true, runValidators: false }
  );
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }

  // Gjej fushat e ndryshuara
  const ndryshuara = {};
  const fusha = ['emri', 'mbiemri', 'datelindja', 'gjinia', 'telefoni', 'email', 'numrPersonal'];
  fusha.forEach(f => {
    const vj = String(vjeter?.[f] || '');
    const re = String(req.body[f] || '');
    if (req.body[f] !== undefined && vj !== re) ndryshuara[f] = { nga: vj, ne: re };
  });

  logVeprimin(req, 'EDIT_PATIENT', {
    kategorija:     'Pacient',
    moduliDetajuar: 'Pacient',
    rekordId:       pacienti._id,
    rekordEmri:     `${pacienti.emri} ${pacienti.mbiemri}`,
    vleraVjeter:    Object.keys(ndryshuara).length ? ndryshuara : undefined,
    vleraRe:        req.body,
    pershkrimi:     `Të dhënat e pacientit u ndryshuan: ${pacienti.emri} ${pacienti.mbiemri}`,
  });

  res.json({ sukses: true, pacienti });
});

// @desc   Cmobilizo pacientin (soft delete)
// @route  DELETE /api/pacientet/:id
const fshiPacientin = asyncHandler(async (req, res) => {
  const pacienti = await Pacienti.findByIdAndUpdate(
    req.params.id,
    { aktiv: false },
    { new: true }
  );
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }

  logVeprimin(req, 'DELETE_PATIENT', {
    kategorija:     'Pacient',
    moduliDetajuar: 'Pacient',
    rekordId:       pacienti._id,
    rekordEmri:     `${pacienti.emri} ${pacienti.mbiemri}`,
    pershkrimi:     `Pacienti u çmobilizua: ${pacienti.emri} ${pacienti.mbiemri}`,
  });

  res.json({ sukses: true, mesazh: 'Pacienti u cmobilizua' });
});

// @desc   Historiku i plote i pacientit
// @route  GET /api/pacientet/:id/histori
const merreHistorikun = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [vizitat, testet, faturat] = await Promise.all([
    Kontrolli.find({ pacienti: id }).populate('mjeku', 'emri mbiemri specialiteti').sort({ dataTakimit: -1 }).limit(20),
    RezultatLab.find({ pacienti: id }).populate('laboranti', 'emri mbiemri').populate('testet.testi', 'emri kodi kategoria').sort({ createdAt: -1 }).limit(20),
    Fatura.find({ pacienti: id }).sort({ createdAt: -1 }).limit(20),
  ]);
  res.json({ sukses: true, vizitat, testet, faturat });
});

// @desc   Ngarko dokument mjekesor
// @route  POST /api/pacientet/:id/dokument
const ngarkoDokument = asyncHandler(async (req, res) => {
  const pacienti = await Pacienti.findById(req.params.id);
  if (!pacienti) { res.status(404); throw new Error('Pacienti nuk u gjet'); }
  const dokumentiRi = {
    emri: req.body.emri || req.file.originalname,
    url: req.file.path,
    tipi: req.file.mimetype,
    ngarkuarNga: req.perdoruesi._id,
  };
  pacienti.dokumente.push(dokumentiRi);
  await pacienti.save();
  res.status(201).json({ sukses: true, dokumenti: dokumentiRi });
});

module.exports = {
  listoPacientet, kerkoPacientin, merrPacientin,
  regjistroPatient, perditesoPacientin, fshiPacientin,
  merreHistorikun, ngarkoDokument,
};
