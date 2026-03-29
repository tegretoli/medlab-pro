const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Kush e bëri
  perdoruesId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Perdoruesi' },
  perdoruesEmri: { type: String, default: 'System' },
  perdoruesRoli: { type: String, default: 'system' },

  // Çfarë bëri
  veprimi:      { type: String, required: true },
  kategorija:   { type: String, enum: ['Auth', 'Pacient', 'Laborator', 'Rezultat', 'Financa', 'Settings', 'Perdorues', 'Tjeter'], default: 'Tjeter' },
  moduliDetajuar: { type: String },   // p.sh. "Analiza", "Porosi", "Fatura", "Settings"

  // Mbi çfarë
  rekordId:    { type: String },     // ID e objektit të afektuar
  rekordEmri:  { type: String },     // Emri i objektit (p.sh. "Arber Shala", "Hemogram")

  // Detaje ndryshimi
  vleraVjeter: { type: String },     // vlera e mëparshme (JSON ose tekst)
  vleraRe:     { type: String },     // vlera e re

  // Alarm kritik
  alarmi:     { type: Boolean, default: false },   // ndrysheim kritik
  alarmTipi:  { type: String },                    // p.sh. "REZULTAT_PAS_VALIDIMIT"

  // Teknikë
  pershkrimi: { type: String },
  ipAdresa:   { type: String },
  statusi:    { type: String, enum: ['sukses', 'deshtoi'], default: 'sukses' },
}, { timestamps: true });

// TTL — fshi automatikisht pas 2 vjetësh (regjistrat kritikë mbahen gjatë)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 3600 });

// Indekse për kërkim të shpejtë
auditLogSchema.index({ perdoruesId:  1, createdAt: -1 });
auditLogSchema.index({ kategorija:   1, createdAt: -1 });
auditLogSchema.index({ veprimi:      1, createdAt: -1 });
auditLogSchema.index({ rekordId:     1, createdAt: -1 });
auditLogSchema.index({ alarmi:       1, createdAt: -1 });
auditLogSchema.index({ createdAt:   -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
