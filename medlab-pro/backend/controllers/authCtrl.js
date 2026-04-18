const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const Perdoruesi = require('../models/Perdoruesi');
const { logVeprimin } = require('../utils/logAction');

const BYPASS_2FA_EMAILS = new Set([
  'rinesasmajli11@gmail.com',
  'arber.shala@exact.com',
]);

const LOGIN_IDENTIFIER_ALIASES = new Map([
  ['arbershaa', 'arber.shala@exact.com'],
  ['rinesmsjali', 'rinesasmajli11@gmail.com'],
]);

const formatoPerdoruesin = (perdoruesi) => ({
  _id: perdoruesi._id,
  emri: perdoruesi.emri,
  mbiemri: perdoruesi.mbiemri,
  email: perdoruesi.email,
  roli: perdoruesi.roli,
  fotoProfili: perdoruesi.fotoProfili,
});

const krijoReqAudit = (req, perdoruesi) => ({
  perdoruesi: {
    _id: perdoruesi._id,
    emri: perdoruesi.emri,
    mbiemri: perdoruesi.mbiemri,
    roli: perdoruesi.roli,
  },
  headers: req.headers,
  ip: req.ip,
  connection: req.connection,
});

const hyrje = asyncHandler(async (req, res) => {
  const { email, fjalekalimi } = req.body;
  const identifikuesi = String(email || '').trim().toLowerCase();
  const emailNormalizuar = LOGIN_IDENTIFIER_ALIASES.get(identifikuesi) || identifikuesi;

  if (!emailNormalizuar || !fjalekalimi) {
    res.status(400);
    throw new Error('Email/username dhe fjalekalimi jane te detyrueshem');
  }

  const perdoruesi = await Perdoruesi
    .findOne({ email: emailNormalizuar })
    .select('+fjalekalimi +twoFactorSecret +twoFactorEnabled');

  if (!perdoruesi || !perdoruesi.aktiv) {
    res.status(401);
    throw new Error('Email ose fjalekalim i gabuar');
  }

  const valid = await perdoruesi.verifiko(fjalekalimi);
  if (!valid) {
    logVeprimin(
      { headers: req.headers, ip: req.ip, connection: req.connection },
      'LOGIN_FAILED',
      {
        kategorija: 'Auth',
        rekordEmri: emailNormalizuar,
        pershkrimi: `Tentative e deshtuar hyrjeje: ${emailNormalizuar}`,
        statusi: 'deshtoi',
      }
    );
    res.status(401);
    throw new Error('Email ose fjalekalim i gabuar');
  }

  if (BYPASS_2FA_EMAILS.has(perdoruesi.email)) {
    const token = perdoruesi.krijoToken();

    logVeprimin(krijoReqAudit(req, perdoruesi), 'LOGIN', {
      kategorija: 'Auth',
      pershkrimi: `Hyrje e suksesshme pa 2FA: ${perdoruesi.email}`,
    });

    return res.json({
      sukses: true,
      token,
      perdoruesi: formatoPerdoruesin(perdoruesi),
    });
  }

  const tempToken = jwt.sign(
    { id: perdoruesi._id, pending2FA: true },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  if (!perdoruesi.twoFactorEnabled || !perdoruesi.twoFactorSecret) {
    const secret = speakeasy.generateSecret({
      name: `MedLab Pro (${perdoruesi.email})`,
      length: 20,
    });

    await Perdoruesi.findByIdAndUpdate(perdoruesi._id, {
      twoFactorSecret: secret.base32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    return res.json({
      sukses: true,
      requires2FA: true,
      needsSetup: true,
      tempToken,
      qrCode,
    });
  }

  res.json({ sukses: true, requires2FA: true, needsSetup: false, tempToken });
});

const verifikto2FA = asyncHandler(async (req, res) => {
  const { tempToken, kodi } = req.body;
  if (!tempToken || !kodi) {
    res.status(400);
    throw new Error('Token dhe kodi jane te detyrueshem');
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Token i pavlefshem ose i skaduar, rihyri');
  }

  if (!payload.pending2FA) {
    res.status(401);
    throw new Error('Token i pavlefshem');
  }

  const perdoruesi = await Perdoruesi
    .findById(payload.id)
    .select('+twoFactorSecret +twoFactorEnabled');

  if (!perdoruesi || !perdoruesi.aktiv) {
    res.status(401);
    throw new Error('Llogaria nuk u gjet ose eshte caktivizuar');
  }

  const valid = speakeasy.totp.verify({
    secret: perdoruesi.twoFactorSecret,
    encoding: 'base32',
    token: String(kodi).trim(),
    window: 1,
  });

  if (!valid) {
    res.status(401);
    throw new Error('Kodi i autentikimit eshte i gabuar');
  }

  if (!perdoruesi.twoFactorEnabled) {
    await Perdoruesi.findByIdAndUpdate(perdoruesi._id, { twoFactorEnabled: true });
  }

  const token = perdoruesi.krijoToken();

  logVeprimin(krijoReqAudit(req, perdoruesi), 'LOGIN', {
    kategorija: 'Auth',
    pershkrimi: `Hyrje e suksesshme: ${perdoruesi.email}`,
  });

  res.json({
    sukses: true,
    token,
    perdoruesi: formatoPerdoruesin(perdoruesi),
  });
});

const regjistro = asyncHandler(async (req, res) => {
  const { emri, mbiemri, email, fjalekalimi, roli, specialiteti, telefoni } = req.body;
  if (!emri || !mbiemri || !email || !fjalekalimi) {
    res.status(400);
    throw new Error('Ploteso te gjitha fushat e detyrueshme');
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
  const arsyeja = req.body?.arsyeja || 'manual';
  logVeprimin(req, arsyeja === 'timeout' ? 'SESSION_TIMEOUT' : 'LOGOUT', {
    kategorija: 'Auth',
    pershkrimi: arsyeja === 'timeout'
      ? `Sesioni skadoi automatikisht (30 min pa aktivitet): ${req.perdoruesi?.email}`
      : `Dalja e suksesshme: ${req.perdoruesi?.email}`,
  });
  res.json({ sukses: true });
});

const ndryshoFjalekalimin = asyncHandler(async (req, res) => { res.json({ sukses: true }); });
const perditesoProfil = asyncHandler(async (req, res) => { res.json({ sukses: true }); });

module.exports = { regjistro, hyrje, verifikto2FA, merreProfilin, logout, ndryshoFjalekalimin, perditesoProfil };
