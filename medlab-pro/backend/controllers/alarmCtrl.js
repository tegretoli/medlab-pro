const asyncHandler = require('express-async-handler');
const AlarmKritik  = require('../models/AlarmKritik');

// GET /api/alarmet?lexuar=false|true|all&limit=50
const listoAlarmet = asyncHandler(async (req, res) => {
  const { lexuar = 'false', limit = 50 } = req.query;
  const filter = lexuar === 'all' ? {} : { lexuar: lexuar === 'true' };
  const [alarmet, totalPalexuara] = await Promise.all([
    AlarmKritik.find(filter).sort({ createdAt: -1 }).limit(Number(limit)).lean(),
    AlarmKritik.countDocuments({ lexuar: false }),
  ]);
  res.json({ sukses: true, alarmet, totalPalexuara });
});

// PUT /api/alarmet/:id/lexo
const lexoAllarmin = asyncHandler(async (req, res) => {
  await AlarmKritik.findByIdAndUpdate(req.params.id, {
    lexuar:    true,
    lexuarNga: req.perdoruesi._id,
    lexuarMe:  new Date(),
  });
  const totalPalexuara = await AlarmKritik.countDocuments({ lexuar: false });
  res.json({ sukses: true, totalPalexuara });
});

// PUT /api/alarmet/lexo-te-gjitha
const lexoTeGjitheAlarmet = asyncHandler(async (req, res) => {
  await AlarmKritik.updateMany({ lexuar: false }, {
    lexuar:    true,
    lexuarNga: req.perdoruesi._id,
    lexuarMe:  new Date(),
  });
  res.json({ sukses: true, totalPalexuara: 0 });
});

// GET /api/alarmet/count  — për badge
const numriAlarmeve = asyncHandler(async (req, res) => {
  const total = await AlarmKritik.countDocuments({ lexuar: false });
  res.json({ sukses: true, total });
});

module.exports = { listoAlarmet, lexoAllarmin, lexoTeGjitheAlarmet, numriAlarmeve };
