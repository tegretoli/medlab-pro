const mongoose = require('mongoose');

const skema = new mongoose.Schema({
  numrFatures:     { type: String, required: true, unique: true },
  numrSerial:      { type: Number, required: true },
  referuesId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Referues' },
  referuesEmri:    { type: String, default: '' },
  dataFillim:      { type: String, default: '' },
  dataMbarim:      { type: String, default: '' },
  dataLeshimit:    { type: Date, default: Date.now },
  gjithsejCmimi:   { type: Number, default: 0 },
  zbritjaPrc:      { type: Number, default: 0 },
  zbritjaEUR:      { type: Number, default: 0 },
  totalFinal:      { type: Number, default: 0 },
  monedha:         { type: String, default: 'EUR' },
  numriPorosive:   { type: Number, default: 0 },
  numriPacienteve: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('FaturaKompanise', skema, 'faturat_kompanive');
