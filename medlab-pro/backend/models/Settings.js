const mongoose = require('mongoose');

// Singleton — always 1 document
const skema = new mongoose.Schema({
  emriKlinikes:     { type: String, default: 'MedLab Pro' },
  adresaKlinikes:   { type: String, default: '' },
  telefonKlinikes:  { type: String, default: '' },
  emailKlinikes:    { type: String, default: '' },
  nrUnik:           { type: String, default: '' },
  nrFiskal:         { type: String, default: '' },

  // Logo — base64 data URL (PNG/JPG)
  logo: { type: String, default: '' },

  // Firmat
  nenshkrimTeknik:        { type: String, default: '' },
  nenshkrimTeknikTitulli: { type: String, default: '' },
  nenshkrimMjek:          { type: String, default: '' },
  nenshkrimMjekTitulli:   { type: String, default: '' },

  // Tekstet PDF (raport laboratori)
  headerTekst:     { type: String, default: '' },
  footer:          { type: String, default: '' },
  referuesiDefault:{ type: String, default: 'Vetë ardhur' },

  // ─── Finance / Invoice Settings ───────────────────────────
  nrTvsh:              { type: String, default: '' },
  nrBiznesit:          { type: String, default: '' },
  invoiceCounter:        { type: Number, default: 0 },
  invoicePatientCounter: { type: Number, default: 0 },
  invoicePatientPrefix:  { type: String, default: 'FAT-PAC' },
  tvshNorma:             { type: Number, default: 8 },
  // Array of bank accounts for invoice payment section
  llogarite: [{
    banka:       { type: String, default: '' },
    nrLlogarise: { type: String, default: '' },
    perfituesi:  { type: String, default: '' },
  }],
  shenimFature:        { type: String, default: 'Ju lutemi që pagesa të realizohet brenda 14 ditëve nga pranimi i faturës.' },
  shenimFaturePatient: { type: String, default: '' }, // tekst shtese vetem per faturat e pacienteve
  invoicePrefix:       { type: String, default: 'FAT' },
  monedha:             { type: String, default: 'EUR' },
  fatureHeaderTekst:   { type: String, default: '' },
  fatureFooterTekst:   { type: String, default: '' },
  // Fushat qe shfaqen ne fature PDF
  shfaqLogoFature:     { type: Boolean, default: true  },
  shfaqNIPTFature:     { type: Boolean, default: true  },
  shfaqZbritjenFature: { type: Boolean, default: true  },
  shfaqBorxhinFature:  { type: Boolean, default: true  },
  shfaqAnalizatFature: { type: Boolean, default: true  },
  shfaqPaketatFature:  { type: Boolean, default: true  },

  // Qasja default per rol (mund te override-ohet per-user)
  roletQasjet: {
    mjek:         { type: [String], default: ['dashboard', 'pacientet', 'referuesit', 'laboratori', 'kontrollet', 'arkiva'] },
    laborant:     { type: [String], default: ['dashboard', 'pacientet', 'laboratori', 'regjistro-analize', 'regjistro-profilet', 'antibiogram', 'arkiva'] },
    recepsionist: { type: [String], default: ['dashboard', 'pacientet', 'referuesit', 'kontrollet', 'pagesat'] },
  },

  // ─── Backup automatik ───────────────────────────────────────────────────────
  backupAktiv:    { type: Boolean, default: false },
  backupOrari:    { type: String,  default: 'ditore_02:00' },
  backupMaksimum: { type: Number,  default: 10 },

  // ─── QR Code në PDF ─────────────────────────────────────────────────────────
  qrKodAktiv: { type: Boolean, default: false },
  qrBaseUrl:  { type: String,  default: '' },

  // ─── WhatsApp Njoftimet ──────────────────────────────────────────────────────
  whatsappAktiv:       { type: Boolean, default: false },
  whatsappProvider:    { type: String,  default: 'callmebot', enum: ['callmebot', 'twilio', 'custom'] },
  whatsappApiKey:      { type: String,  default: '' },
  whatsappTwilioSid:   { type: String,  default: '' },
  whatsappTwilioToken: { type: String,  default: '' },
  whatsappTwilioFrom:  { type: String,  default: '' },
  whatsappWebhookUrl:  { type: String,  default: '' },
  whatsappTemplate:    { type: String,  default: '' },

}, { timestamps: true });

module.exports = mongoose.model('Settings', skema);
