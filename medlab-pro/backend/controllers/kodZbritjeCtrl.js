const asyncHandler   = require('express-async-handler');
const KodZbritje     = require('../models/KodZbritje');
const KodZbritjeLog  = require('../models/KodZbritjeLog');

// POST /api/zbritjet/valido
// { kodi, totalBruto, porosiId?, pacientiId?, pacientEmri? }
const validoKodin = asyncHandler(async (req, res) => {
  const { kodi } = req.body;
  if (!kodi) { res.status(400); throw new Error('Kodi është i detyrueshëm'); }

  const kod = await KodZbritje.findOne({ kodi: kodi.toUpperCase().trim() });

  if (!kod || !kod.aktiv) {
    return res.status(200).json({ valid: false, mesazhi: 'Kod i pavlefshëm ose joaktiv' });
  }
  if (new Date() > new Date(kod.validDeri)) {
    return res.status(200).json({ valid: false, mesazhi: 'Kodi ka skaduar' });
  }
  if (kod.limitPerdorimesh !== null) {
    const perdorimet = await KodZbritjeLog.countDocuments({ kodZbritjeId: kod._id });
    if (perdorimet >= kod.limitPerdorimesh) {
      return res.status(200).json({ valid: false, mesazhi: 'Kodi ka arritur limitin e përdorimeve' });
    }
  }

  res.json({
    valid:     true,
    zbritja:   kod.zbritja,
    pershkrim: kod.pershkrim || '',
    mesazhi:   `Zbritje ${kod.zbritja}% u aplikua`,
  });
});

// Internal helper — called from pagesaCtrl after payment
const ruajLogun = async ({ kodi, porosiId, pacientiId, pacientEmri, totalPara, totalPas, perdorurNga }) => {
  const kod = await KodZbritje.findOne({ kodi: kodi.toUpperCase().trim() });
  if (!kod) return;
  await KodZbritjeLog.create({
    kodi:           kod.kodi,
    kodZbritjeId:   kod._id,
    porosiId,
    pacientiId,
    pacientEmri,
    zbritjaPerqind: kod.zbritja,
    totalPara,
    totalPas,
    zbritjaSHuma:   totalPara - totalPas,
    perdorurNga,
  });
};

// GET /api/zbritjet/perdorimet
const perdorimet = asyncHandler(async (req, res) => {
  const logs = await KodZbritjeLog.aggregate([
    {
      $group: {
        _id:            '$kodi',
        numriPerdorimeve: { $sum: 1 },
        totalZbritje:   { $sum: '$zbritjaSHuma' },
        perdorimet:     { $push: { data: '$perdorurMe', pacienti: '$pacientEmri', zbritje: '$zbritjaSHuma' } },
      },
    },
    { $sort: { numriPerdorimeve: -1 } },
  ]);
  res.json({ sukses: true, logs });
});

// GET /api/zbritjet/:id/perdorimet-detaje
// Returns all usages for one code, grouped by patient, sorted by usage count desc
const perdorimetDetaje = asyncHandler(async (req, res) => {
  const kod = await KodZbritje.findById(req.params.id).lean();
  if (!kod) { res.status(404); throw new Error('Kodi nuk u gjet'); }

  const logs = await KodZbritjeLog.aggregate([
    { $match: { kodZbritjeId: kod._id } },

    // Join with PorosiLab to get analyses
    { $lookup: {
        from: 'porosilabs',
        localField: 'porosiId',
        foreignField: '_id',
        as: '_porosi',
    }},
    { $addFields: { porosi: { $arrayElemAt: ['$_porosi', 0] } } },

    // Join analyses names
    { $lookup: {
        from: 'analizas',
        localField: 'porosi.analizat.analiza',
        foreignField: '_id',
        as: '_analizat',
    }},

    // Build per-usage object
    { $project: {
        pacientiId:    1,
        pacientEmri:   1,
        perdorurMe:    1,
        zbritjaSHuma:  1,
        totalPara:     1,
        totalPas:      1,
        numrPorosi:    '$porosi.numrPorosi',
        analizat: {
          $map: {
            input: '$_analizat',
            as:    'a',
            in:    '$$a.emri',
          },
        },
    }},

    // Group by patient
    { $group: {
        _id:          '$pacientiId',
        pacientEmri:  { $first: '$pacientEmri' },
        numriHereve:  { $sum: 1 },
        totalZbritje: { $sum: '$zbritjaSHuma' },
        perdorimet:   { $push: {
          data:         '$perdorurMe',
          numrPorosi:   '$numrPorosi',
          analizat:     '$analizat',
          zbritjaSHuma: '$zbritjaSHuma',
          totalPara:    '$totalPara',
          totalPas:     '$totalPas',
        }},
    }},

    // Sort by usage count desc
    { $sort: { numriHereve: -1 } },
  ]);

  res.json({ sukses: true, kodi: kod.kodi, zbritja: kod.zbritja, perdorimet: logs });
});

// ── Admin CRUD ────────────────────────────────────────────────────────────────

// GET /api/zbritjet
const listoKodet = asyncHandler(async (req, res) => {
  const kodet = await KodZbritje.find().sort({ createdAt: -1 }).lean();
  // attach usage count
  const ids   = kodet.map(k => k._id);
  const counts = await KodZbritjeLog.aggregate([
    { $match: { kodZbritjeId: { $in: ids } } },
    { $group: { _id: '$kodZbritjeId', numri: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.numri]));
  const result   = kodet.map(k => ({ ...k, numriPerdorimeve: countMap[k._id.toString()] || 0 }));
  res.json({ sukses: true, kodet: result });
});

// POST /api/zbritjet
const krijoKodin = asyncHandler(async (req, res) => {
  const { kodi, zbritja, pershkrim, validDeri, aktiv, limitPerdorimesh } = req.body;
  if (!kodi || !zbritja || !validDeri) { res.status(400); throw new Error('Kodi, zbritja dhe validDeri janë të detyrueshme'); }
  const ekziston = await KodZbritje.findOne({ kodi: kodi.toUpperCase().trim() });
  if (ekziston) { res.status(400); throw new Error('Ky kod ekziston tashmë'); }
  const kod = await KodZbritje.create({
    kodi, zbritja, pershkrim, validDeri, aktiv, limitPerdorimesh,
    krijoNga: req.perdoruesi._id,
  });
  res.status(201).json({ sukses: true, kod });
});

// PUT /api/zbritjet/:id
const perditsoKodin = asyncHandler(async (req, res) => {
  const kod = await KodZbritje.findById(req.params.id);
  if (!kod) { res.status(404); throw new Error('Kodi nuk u gjet'); }
  const { zbritja, pershkrim, validDeri, aktiv, limitPerdorimesh } = req.body;
  if (zbritja !== undefined)         kod.zbritja          = zbritja;
  if (pershkrim !== undefined)       kod.pershkrim        = pershkrim;
  if (validDeri !== undefined)       kod.validDeri        = validDeri;
  if (aktiv !== undefined)           kod.aktiv            = aktiv;
  if (limitPerdorimesh !== undefined) kod.limitPerdorimesh = limitPerdorimesh;
  await kod.save();
  res.json({ sukses: true, kod });
});

// DELETE /api/zbritjet/:id
const fshiKodin = asyncHandler(async (req, res) => {
  await KodZbritje.findByIdAndDelete(req.params.id);
  res.json({ sukses: true });
});

module.exports = { validoKodin, ruajLogun, perdorimet, perdorimetDetaje, listoKodet, krijoKodin, perditsoKodin, fshiKodin };
