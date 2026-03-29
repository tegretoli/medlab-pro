const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const skemaPerdoruesi = new mongoose.Schema({
  emri: {
    type: String, required: [true, 'Emri eshte i detyreshem'], trim: true, maxlength: 50,
  },
  mbiemri: {
    type: String, required: [true, 'Mbiemri eshte i detyreshem'], trim: true, maxlength: 50,
  },
  email: {
    type: String, required: [true, 'Email-i eshte i detyreshem'],
    unique: true, lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email i pavlefshëm'],
  },
  fjalekalimi: {
    type: String, required: [true, 'Fjalekalimi eshte i detyreshem'],
    minlength: 6, select: false,
  },
  roli: {
    type: String,
    enum: ['admin', 'mjek', 'laborant', 'recepsionist'],
    default: 'recepsionist',
  },
  specialiteti: String,  // per mjeket
  licenca:      String,  // numri liçenses mjekesore
  telefoni:     String,
  fotoProfili:  { type: String, default: '' },
  aktiv:        { type: Boolean, default: true },
  njoftimetEmail: { type: Boolean, default: true },
  fjalekalimNdryshuarNe: Date,
  tokenRivendosjes: String,
  tokenRivendoskaSkadon: Date,
  // ── 2FA (Google Authenticator TOTP) ────────────────────────
  twoFactorSecret:  { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },
  // ── Qasja në module (zëvendëson default-in e rolit) ────────
  qasjet: { type: [String], default: [] },
}, { timestamps: true });

// Hash fjalekalimi perpara ruajtjes
skemaPerdoruesi.pre('save', async function (next) {
  if (!this.isModified('fjalekalimi')) return next();
  const salt = await bcrypt.genSalt(12);
  this.fjalekalimi = await bcrypt.hash(this.fjalekalimi, salt);
  next();
});

// Krijo JWT token
skemaPerdoruesi.methods.krijoToken = function () {
  return jwt.sign(
    { id: this._id, roli: this.roli },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Verifiko fjalekalim
skemaPerdoruesi.methods.verifiko = async function (fjalekalimFutuar) {
  return bcrypt.compare(fjalekalimFutuar, this.fjalekalimi);
};

// Virtual per emrin e plote
skemaPerdoruesi.virtual('emriPlote').get(function () {
  return `${this.emri} ${this.mbiemri}`;
});

module.exports = mongoose.model('Perdoruesi', skemaPerdoruesi);
