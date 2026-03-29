const jwt        = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Perdoruesi = require('../models/Perdoruesi');

// Mbron route-t — kërkon JWT final (pas 2FA të kompletuar)
const mbrojtRoute = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401); throw new Error('Pa autorizim — identifikohu');
  }

  const token = auth.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401); throw new Error('Token i pavlefshëm ose i skaduar');
  }

  if (payload.pending2FA) {
    res.status(401); throw new Error('Autentikimi 2FA nuk është kompletuar');
  }

  const perdoruesi = await Perdoruesi.findById(payload.id);
  if (!perdoruesi || !perdoruesi.aktiv) {
    res.status(401); throw new Error('Llogaria nuk ekziston ose është e çaktivizuar');
  }

  req.perdoruesi = perdoruesi;
  next();
});

const kontrolloRolin = (...rolet) => (req, res, next) => {
  if (!rolet.includes(req.perdoruesi?.roli)) {
    res.status(403); throw new Error('Nuk keni leje për këtë veprim');
  }
  next();
};

module.exports = { mbrojtRoute, kontrolloRolin };
