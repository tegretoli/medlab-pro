const mongoose = require('mongoose');
const { Schema } = mongoose;

const skemaReferues = new Schema({
  emri:         { type: String, required: true, trim: true },
  mbiemri:      { type: String, required: true, trim: true },
  tipi:         { type: String, enum: ['Doktor', 'Bashkpuntor', 'Vete_Ardhur'], required: true },
  specialiteti: { type: String, trim: true },   // kryesisht per Doktor
  institucioni: { type: String, trim: true },
  telefoni:     { type: String, trim: true },
  email:        { type: String, lowercase: true, trim: true },
  nrUnik:       { type: String, trim: true },
  nrFiskal:     { type: String, trim: true },
  nrTvsh:       { type: String, trim: true },
  nrBiznesit:   { type: String, trim: true },
  shenime:      String,
  aktiv:        { type: Boolean, default: true },
  eshteDefault: { type: Boolean, default: false }, // Referuesi "Vetë Ardhur" i sistemit
  komisjoni: {
    tipi:  { type: String, enum: ['Perqindje', 'Fikse', ''], default: '' },
    vlera: { type: Number, default: 0 },
  },
}, { timestamps: true });

skemaReferues.index({ emri: 'text', mbiemri: 'text' });

module.exports = mongoose.model('Referues', skemaReferues, 'referues');
