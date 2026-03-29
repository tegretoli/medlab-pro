const asyncHandler   = require('express-async-handler');
const jwt            = require('jsonwebtoken');
const speakeasy      = require('speakeasy');
const QRCode         = require('qrcode');
const Perdoruesi     = require('../models/Perdoruesi');
const { logVeprimin } = require('../utils/logAction');

// ── Hyrja: email + fjalekalimi → kthehet tempToken + 2FA info ──
const hyrje = asyncHandler(async (req, res) => {
  const { email, fjalekalimi } = req.body;
  if (!email || !fjalekalimi) {
    res.status(400); throw new Error('Email dhe fjalekalimi janë të detyrueshëm');
  }

  const perdoruesi = await Perdoruesi
    .findOne({ email: email.toLowerCase() })
    .select('+fjalekalimi +twoFactorSecret +twoFactorEnabled');

  if (!perdoruesi || !perdoruesi.aktiv) {
    res.status(401); throw new Error('Email ose fjalekalim i gabuar');
  }

  const valid = await perdoruesi.verifiko(fjalekalimi);
  if (!valid) {
    // Log tentativë të dështuar
    logVeprimin({ headers: req.headers, ip: req.ip, connection: req.connection },
      'LOGIN_FAILED', {
        kategorija:  'Auth',
        rekordEmri:  email,
        pershkrimi:  `Tentativë e dështuar hyrjeje: ${email}`,
        statusi:     'deshtoi',
      }
    );
    res.status(401); throw new Error('Email ose fjalekalim i gabuar');
  }

  // Token i përkohshëm (10 min) — vlefshëm vetëm për hapin e 2FA
  const tempToken = jwt.sign(
    { id: perdoruesi._id, pending2FA: true },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  // Nëse 2FA nuk është konfiguruar akoma — gjenero secret + QR
  if (!perdoruesi.twoFactorEnabled || !perdoruesi.twoFactorSecret) {
    const secret = speakeasy.generateSecret({
      name:   `MedLab Pro (${perdoruesi.email})`,
      length: 20,
    });

    await Perdoruesi.findByIdAndUpdate(perdoruesi._id, {
      twoFactorSecret: secret.base32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      sukses:      true,
      requires2FA: true,
      needsSetup:  true,
      tempToken,
      qrCode,
    });
  }

  // 2FA tashmë konfiguruar — dërgoje te ekrani i kodit
  res.json({ sukses: true, requires2FA: true, needsSetup: false, tempToken });
});

// ── Verifikimi 2FA: tempToken + 6-shifror kodi → JWT final ──────
const verifikto2FA = asyncHandler(async (req, res) => {
  const { tempToken, kodi } = req.body;
  if (!tempToken || !kodi) {
    res.status(400); throw new Error('Token dhe kodi janë të detyrueshëm');
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    res.status(401); throw new Error('Token i pavlefshëm ose i skaduar — rihyri');
  }

  if (!payload.pending2FA) {
    res.status(401); throw new Error('Token i pavlefshëm');
  }

  const perdoruesi = await Perdoruesi
    .findById(payload.id)
    .select('+twoFactorSecret +twoFactorEnabled');

  if (!perdoruesi || !perdoruesi.aktiv) {
    res.status(401); throw new Error('Llogaria nuk u gjet ose është çaktivizuar');
  }

  const valid = speakeasy.totp.verify({
    secret:   perdoruesi.twoFactorSecret,
    encoding: 'base32',
    token:    String(kodi).trim(),
    window:   1,
  });

  if (!valid) {
    res.status(401); throw new Error('Kodi i autentikimit është i gabuar');
  }

  // Aktivizo 2FA nëse ishte setup i parë
  if (!perdoruesi.twoFactorEnabled) {
    await Perdoruesi.findByIdAndUpdate(perdoruesi._id, { twoFactorEnabled: true });
  }

  // Lësho JWT-in final
  const token = perdoruesi.krijoToken();

  // Audit log — login i suksesshëm
  const fakeReq = {
    perdoruesi: { _id: perdoruesi._id, emri: perdoruesi.emri, mbiemri: perdoruesi.mbiemri, roli: perdoruesi.roli },
    headers: req.headers, ip: req.ip, connection: req.connection,
  };
  logVeprimin(fakeReq, 'LOGIN', {
    kategorija:  'Auth',
    pershkrimi:  `Hyrje e suksesshme: ${perdoruesi.email}`,
  });

  res.json({
    sukses: true,
    token,
    perdoruesi: {
      _id:         perdoruesi._id,
      emri:        perdoruesi.emri,
      mbiemri:     perdoruesi.mbiemri,
      email:       perdoruesi.email,
      roli:        perdoruesi.roli,
      fotoProfili: perdoruesi.fotoProfili,
    },
  });
});

// ── Regjistro (vetëm admin) ──────────────────────────────────────
const regjistro = asyncHandler(async (req, res) => {
  const { emri, mbiemri, email, fjalekalimi, roli, specialiteti, telefoni } = req.body;
  if (!emri || !mbiemri || !email || !fjalekalimi) {
    res.status(400); throw new Error('Plotëso të gjitha fushat e detyrueshme');
  }
  const p = await Perdoruesi.create({ emri, mbiemri, email, fjalekalimi, roli, specialiteti, telefoni });
  res.status(201).json({
    sukses: true,
    perdoruesi: { _id: p._id, emri: p.emri, mbiemri: p.mbiemri, email: p.email, roli: p.roli },
  });
});

const merreProfilin = asyncHandler(async (req, res) => {
  res.json({ sukses: true, perdoruesi: req.perdoruesi });
});

const logout = asyncHandler(async (req, res) => {
  const arsyeja = req.body?.arsyeja || 'manual'; // 'manual' | 'timeout'
  logVeprimin(req, arsyeja === 'timeout' ? 'SESSION_TIMEOUT' : 'LOGOUT', {
    kategorija:  'Auth',
    pershkrimi:  arsyeja === 'timeout'
      ? `Sesioni skadoi automatikisht (30 min pa aktivitet): ${req.perdoruesi?.email}`
      : `Dalja e suksesshme: ${req.perdoruesi?.email}`,
  });
  res.json({ sukses: true });
});

const ndryshoFjalekalimin = asyncHandler(async (req, res) => { res.json({ sukses: true }); });
const perditesoProfil     = asyncHandler(async (req, res) => { res.json({ sukses: true }); });

module.exports = { regjistro, hyrje, verifikto2FA, merreProfilin, logout, ndryshoFjalekalimin, perditesoProfil };
