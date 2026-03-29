const mongoose = require('mongoose');

const kodZbritjeSchema = new mongoose.Schema({
  kodi:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  zbritja:     { type: Number, required: true, min: 1, max: 100 },  // %
  pershkrim:   { type: String, trim: true },                         // p.sh. "Karta e Rinise"
  validDeri:   { type: Date, required: true },
  aktiv:       { type: Boolean, default: true },
  limitPerdorimesh: { type: Number, default: null },                 // null = pa limit
  krijoNga:    { type: mongoose.Schema.Types.ObjectId, ref: 'Perdoruesi' },
}, { timestamps: true });

module.exports = mongoose.model('KodZbritje', kodZbritjeSchema);
