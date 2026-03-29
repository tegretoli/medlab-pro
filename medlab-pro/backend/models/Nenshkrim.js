const mongoose = require('mongoose');

const skema = new mongoose.Schema({
  emri:         { type: String, default: '', trim: true },
  mbiemri:      { type: String, default: '', trim: true },
  titulli:      { type: String, default: '', trim: true },
  licenca:      { type: String, default: '', trim: true },
  foto:         { type: String, default: '' }, // base64 data URL
  departamenti:  { type: String, default: 'Te gjitha' }, // legacy — kept for backward compat
  departamentet: { type: [String], default: ['Te gjitha'] }, // multi-department assignment
  aktiv:         { type: Boolean, default: true },
  align:         { type: String, default: 'left' }, // 'left' | 'right'
  validimTipi:   { type: String, enum: ['teknik', 'mjekesor'], default: 'teknik' },
}, { timestamps: true });

module.exports = mongoose.model('Nenshkrim', skema);
