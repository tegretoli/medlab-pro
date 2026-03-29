const mongoose = require('mongoose');

const skema = new mongoose.Schema({
  numrFatures:     { type: String, required: true, unique: true },
  numrSerial:      { type: Number, required: true },
  pacientiId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Pacienti' },
  pacientEmri:     { type: String, default: '' },
  dataFillim:      { type: String, default: '' },
  dataMbarim:      { type: String, default: '' },
  dataLeshimit:    { type: Date, default: Date.now },
  gjithsejPaTvsh:  { type: Number, default: 0 },
  tvshPrc:         { type: Number, default: 0 },
  tvshEUR:         { type: Number, default: 0 },
  totalFinal:      { type: Number, default: 0 },
  monedha:         { type: String, default: 'EUR' },
  numriAnalizave:  { type: Number, default: 0 },
  shenime:         { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('FaturaPatient', skema, 'faturat_pacient');
