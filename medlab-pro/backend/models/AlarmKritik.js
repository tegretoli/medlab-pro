const mongoose = require('mongoose');
const { Schema } = mongoose;

const skema = new Schema({
  porosiId:    { type: Schema.Types.ObjectId, ref: 'PorosiLab', required: true },
  numrPorosi:  { type: String, default: '' },
  pacientEmri: { type: String, default: '' },
  analizaEmri: { type: String, default: '' },
  komponenti:  { type: String, default: '' },
  vlera:       { type: String, default: '' },
  njesia:      { type: String, default: '' },
  flamuri: {
    type: String,
    enum: ['Shume_Larte', 'Shume_Ulet', 'Larte', 'Ulet'],
    required: true,
  },
  kritikMin:   Number,
  kritikMax:   Number,
  lexuar:      { type: Boolean, default: false },
  lexuarNga:   { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  lexuarMe:    Date,
}, { timestamps: true });

skema.index({ lexuar: 1, createdAt: -1 });

module.exports = mongoose.model('AlarmKritik', skema);
