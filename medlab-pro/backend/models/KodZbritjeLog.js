const mongoose = require('mongoose');

const kodZbritjeLogSchema = new mongoose.Schema({
  kodi:             { type: String, required: true },
  kodZbritjeId:     { type: mongoose.Schema.Types.ObjectId, ref: 'KodZbritje', required: true },
  porosiId:         { type: mongoose.Schema.Types.ObjectId, ref: 'PorosiLab' },
  pacientiId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Pacienti' },
  pacientEmri:      { type: String },
  zbritjaPerqind:   { type: Number, required: true },
  totalPara:        { type: Number, required: true },
  totalPas:         { type: Number, required: true },
  zbritjaSHuma:     { type: Number, required: true },
  perdorurNga:      { type: mongoose.Schema.Types.ObjectId, ref: 'Perdoruesi' },
  perdorurMe:       { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('KodZbritjeLog', kodZbritjeLogSchema);
