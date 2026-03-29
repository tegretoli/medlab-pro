const mongoose = require('mongoose');
const { Schema } = mongoose;

const skema = new Schema({
  emri:       { type: String, required: true, trim: true },
  grupiId:    { type: Schema.Types.ObjectId, ref: 'AntibiogramGrupi', required: true },
  grupiEmri:  { type: String, default: '' },                 // denormalizuar për shpejtësi
  antibiotike: [{ type: String, trim: true }],               // emrat e antibiotikeve të parazgjedhura
  aktiv:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('SablonAntibiogram', skema);
