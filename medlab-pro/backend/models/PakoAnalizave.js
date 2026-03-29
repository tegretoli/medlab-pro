const mongoose = require('mongoose');
const { Schema } = mongoose;

const skemanPako = new Schema({
  emri:             { type: String, required: true, trim: true },
  pershkrim:        { type: String, default: '' },
  analizat: [{
    analiza: { type: Schema.Types.ObjectId, ref: 'Analiza', required: true },
  }],
  cmimiPromocional: { type: Number, required: true, default: 0 },
  aktiv:            { type: Boolean, default: true },
  numrRendor:       { type: Number, default: 0 },
  shenime:          { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PakoAnalizave', skemanPako);
