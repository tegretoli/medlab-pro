const mongoose = require('mongoose');
const { Schema } = mongoose;

const skemaProfili = new Schema({
  emri:         { type: String, required: true, trim: true },
  departamenti: {
    type: String,
    enum: ['Biokimi', 'Mikrobiologji', 'PCR'],
  },
  numrRendor: { type: Number, default: 0 }, // renditja në PDF dhe listë
  cmime: {
    pacient:     { type: Number, default: 0 },
    bashkpuntor: { type: Number, default: 0 },
  },
  aktiv:   { type: Boolean, default: true },
  shenime: String,
}, { timestamps: true });

module.exports = mongoose.model('Profili', skemaProfili);
