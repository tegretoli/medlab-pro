const mongoose = require('mongoose');
const { Schema } = mongoose;

const skema = new Schema({
  emri:       { type: String, required: true, trim: true },
  aktiv:      { type: Boolean, default: true },
  numrRendor: { type: Number, default: 0 },
  antibiotike: [{
    emri:       { type: String, required: true, trim: true },
    numrRendor: { type: Number, default: 0 },
  }],
}, { timestamps: true });

module.exports = mongoose.model('AntibiogramGrupi', skema);
