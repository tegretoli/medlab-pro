const asyncHandler = require('express-async-handler');
const Settings = require('../models/Settings');
const { logVeprimin } = require('../utils/logAction');

// Merr cilësimet (singleton — krijon nëse nuk ekziston)
const merrSettings = asyncHandler(async (req, res) => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});
  res.json({ sukses: true, settings: s });
});

// Perditeso cilësimet
const perditesSettings = asyncHandler(async (req, res) => {
  let s = await Settings.findOne();
  if (!s) s = await Settings.create({});

  // Ruaj vlerën e vjetër para ndryshimit
  const vjeter = s.toObject();

  Object.assign(s, req.body);
  await s.save();

  // Gjej fushat e ndryshuara
  const ndryshuara = {};
  Object.keys(req.body).forEach(f => {
    const vj = JSON.stringify(vjeter[f]);
    const re = JSON.stringify(req.body[f]);
    if (vj !== re) ndryshuara[f] = { nga: vjeter[f], ne: req.body[f] };
  });

  logVeprimin(req, 'EDIT_SETTINGS', {
    kategorija:     'Settings',
    moduliDetajuar: 'Settings',
    vleraVjeter:    Object.keys(ndryshuara).length ? ndryshuara : undefined,
    vleraRe:        req.body,
    pershkrimi:     `Cilësimet e sistemit u ndryshuan (${Object.keys(ndryshuara).join(', ')})`,
  });

  res.json({ sukses: true, settings: s });
});

module.exports = { merrSettings, perditesSettings };
