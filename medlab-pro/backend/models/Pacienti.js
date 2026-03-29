const mongoose = require('mongoose');
const { Schema } = mongoose;

const skemaPacienti = new Schema({
  // ─── Identifikimi ───────────────────────────────────────────────
  numrPersonal: { type: String, unique: true, sparse: true, trim: true },
  emri:         { type: String, required: [true, 'Emri eshte i detyreshem'], trim: true },
  mbiemri:      { type: String, required: [true, 'Mbiemri eshte i detyreshem'], trim: true },
  datelindja:   { type: Date, required: [true, 'Data e lindjes eshte e detyreshme'] },
  gjinia:       { type: String, enum: ['M', 'F', 'Tjeter'], required: true },

  // ─── Kontakti ───────────────────────────────────────────────────
  telefoni:  { type: String, required: [true, 'Telefoni eshte i detyreshem'] },
  email:     { type: String, lowercase: true, sparse: true },
  adresa: {
    rruga:   String,
    qyteti:  String,
    rajoni:  String,
    kodi:    String,
    shteti:  { type: String, default: 'Shqiperi' },
  },
  kontaktUrgjence: {
    emri:     String,
    lidhja:   String,
    telefoni: String,
  },

  // ─── Informacion Mjekesor ────────────────────────────────────────
  grupiGjaku: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'I panjohur', ''] },
  lartesiaCm: Number,
  peshaKg:    Number,
  alergjite: [{
    substance:  { type: String, required: true },
    reagimi:    String,
    renda:      { type: String, enum: ['E lehtë', 'Mesatare', 'E rende'] },
  }],
  kushtetKronike: [{
    diagnoza:    { type: String, required: true },
    kodi_ICD10:  String,
    qeSiMj:      Date,
    aktive:      { type: Boolean, default: true },
  }],
  barnatAktuale: [{
    emri:       { type: String, required: true },
    doza:       String,
    shpeshesia: String,
    qeSiDate:   Date,
    mjeku:      String,
  }],
  vaksinat: [{
    emri:       String,
    data:       Date,
    partia:     String,
    shenime:    String,
  }],

  // ─── Sigurimi Shendetsor ─────────────────────────────────────────
  sigurimiShendetesor: {
    kompania:   String,
    numer:      String,
    tipi:       { type: String, enum: ['Publik', 'Privat', 'Pa siguracion'] },
    skadon:     Date,
    mbulimet:   String,
  },

  // ─── Metadata ───────────────────────────────────────────────────
  referuesit:    { type: Schema.Types.ObjectId, ref: 'Referues', default: null },
  mjekuKryesor:  { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  fotoProfili:   { type: String, default: '' },
  dokumente: [{
    emri:    String,
    url:     String,
    tipi:    String,
    ngarkuarNe: { type: Date, default: Date.now },
    ngarkuarNga: { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  }],
  aktiv:          { type: Boolean, default: true },
  statusiPageses: { type: String, enum: ['Pa borxh', 'Borxh'], default: 'Pa borxh' },
  shenimeExtra: String,
  portalAktiv:  { type: Boolean, default: false },
  portalEmail:  String,
}, { timestamps: true });

// ─── Virtuals ───────────────────────────────────────────────────────────────
skemaPacienti.virtual('emriPlote').get(function () {
  return `${this.emri} ${this.mbiemri}`;
});

skemaPacienti.virtual('mosha').get(function () {
  if (!this.datelindja) return null;
  const sot = new Date();
  const lindja = new Date(this.datelindja);
  let mosha = sot.getFullYear() - lindja.getFullYear();
  const m = sot.getMonth() - lindja.getMonth();
  if (m < 0 || (m === 0 && sot.getDate() < lindja.getDate())) mosha--;
  return mosha;
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
skemaPacienti.index({ emri: 'text', mbiemri: 'text', numrPersonal: 'text' });
skemaPacienti.index({ telefoni: 1 });
skemaPacienti.index({ aktiv: 1 });

module.exports = mongoose.model('Pacienti', skemaPacienti);
