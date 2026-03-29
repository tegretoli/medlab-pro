const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════
// MODELI: TestiLab — Katalogu i Testeve Laboratorike
// ═══════════════════════════════════════════════════════════
const skemaTestiLab = new Schema({
  kodi:  { type: String, unique: true, required: true, uppercase: true, trim: true },
  emri:  { type: String, required: true, trim: true },
  emriAnglisht: String,
  kategoria: {
    type: String,
    enum: ['Hematologji', 'Biokimi', 'Imunologji', 'Mikrobiologji',
           'Hormoni', 'Urinalize', 'Koagulim', 'Serologji', 'Gjenetike', 'Tjeter'],
    required: true,
  },
  metodaAnalizes:     String,
  kohaPergatitjes:    { type: Number, default: 24 },  // ore
  pergatitjaPacienti: { type: String, default: 'Pa kufizime te veçanta' },
  materialBiologjik:  { type: String, default: 'Gjak venoz' },
  vleratReference: [{
    gjinia:    { type: String, enum: ['M', 'F', 'Te dyja'], default: 'Te dyja' },
    moshaMin:  { type: Number, default: 0 },
    moshaMax:  { type: Number, default: 120 },
    vleraMin:  Number,
    vleraMax:  Number,
    njesia:    String,
  }],
  cmimi:          { type: Number, required: true, min: 0 },
  cmimiSigurimit: Number,
  aktiv:          { type: Boolean, default: true },
  shenime:        String,
}, { timestamps: true });

skemaTestiLab.index({ emri: 'text', kodi: 'text' });

// ═══════════════════════════════════════════════════════════
// MODELI: RezultatLab — Porositë dhe Rezultatet
// ═══════════════════════════════════════════════════════════
const skemaRezultatLab = new Schema({
  numrPorosi:   { type: String, unique: true },
  pacienti:     { type: Schema.Types.ObjectId, ref: 'Pacienti', required: true },
  mjeku:        { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  laboranti:    { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  kontrolli:    { type: Schema.Types.ObjectId, ref: 'Kontrolli' },
  pagesa:       { type: Schema.Types.ObjectId, ref: 'Fatura' },

  statusi: {
    type: String,
    enum: ['Porositur', 'Mbledhur', 'NeProcesim', 'Kompletuar', 'Anuluar'],
    default: 'Porositur',
  },
  urgente: { type: Boolean, default: false },

  testet: [{
    testi:           { type: Schema.Types.ObjectId, ref: 'TestiLab', required: true },
    vlera:           Schema.Types.Mixed,
    vleraStr:        String,
    njesia:          String,
    flamuri: {
      type: String,
      enum: ['Normal', 'Larte', 'Shume_Larte', 'Ulet', 'Shume_Ulet', 'Kritik', 'Pa_Referenc'],
      default: 'Normal',
    },
    vleraMin:        Number,
    vleraMax:        Number,
    komentLaboranti: String,
    kompletuar:      { type: Boolean, default: false },
  }],

  shenimetKlinike: String,
  komentMjeku:     String,
  dateMbledhjes:   Date,
  dateKompletimit: Date,
  raportiPDF:      String,
  emailDerguar:    { type: Boolean, default: false },
  emailDerguarNe:  Date,
}, { timestamps: true });

// Auto-gjenero numrin e porosise
skemaRezultatLab.pre('save', async function (next) {
  if (!this.numrPorosi) {
    const viti   = new Date().getFullYear();
    const muaji  = String(new Date().getMonth() + 1).padStart(2, '0');
    const count  = await this.constructor.countDocuments();
    this.numrPorosi = `LAB-${viti}${muaji}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const TestiLab     = mongoose.model('TestiLab',     skemaTestiLab);
const RezultatLab  = mongoose.model('RezultatLab',  skemaRezultatLab);
module.exports = { TestiLab, RezultatLab };
