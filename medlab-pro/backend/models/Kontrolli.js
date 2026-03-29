const mongoose = require('mongoose');
const { Schema } = mongoose;

const skemaKontrolli = new Schema({
  pacienti:  { type: Schema.Types.ObjectId, ref: 'Pacienti', required: true },
  mjeku:     { type: Schema.Types.ObjectId, ref: 'Perdoruesi', required: true },

  // ─── Takimi ──────────────────────────────────────────────
  dataTakimit:  { type: Date, required: true },
  kohaFillimit: String,
  kohaMbarimit: String,
  lloji: {
    type: String,
    enum: ['Kontrolle_Rutine', 'Kontrolle_Urgjente', 'Follow_Up',
           'Konsultim', 'Procedura', 'Vaksinim', 'Tjeter'],
    default: 'Kontrolle_Rutine',
  },
  statusiTakimit: {
    type: String,
    enum: ['Caktuar', 'Konfirmuar', 'Ardhur', 'NeProgres',
           'Kompletuar', 'Anuluar', 'NukErdhi'],
    default: 'Caktuar',
  },
  arsyjaAnulimit: String,

  // ─── Vizita ──────────────────────────────────────────────
  arsyjaVizites: String,
  simptomatat:  [String],
  kohezgjatjaSimptomave: String,
  gjetjet:      String,

  // Shenjat vitale
  presionGjaku: { sistolik: Number, diastolik: Number },
  temperatura:  Number,
  peshaKg:      Number,
  lartesiaCm:   Number,
  saturimiO2:   Number,
  frekuencaKardiovaskulare: Number,
  frekuencaRespiruese:      Number,
  glukozaGjaku: Number,

  // ─── Diagnoza ────────────────────────────────────────────
  diagnoza: [{
    kodi_ICD10:   String,
    pershkrim:    String,
    tipi: {
      type: String,
      enum: ['Kryesore', 'Shoqeruese', 'Diferenciale', 'Historike'],
      default: 'Kryesore',
    },
  }],

  // ─── Trajtimi ────────────────────────────────────────────
  recetat: [{
    bari:        { type: String, required: true },
    forma:       String,
    doza:        String,
    shpeshesia:  String,
    kohezgjatja: String,
    shenime:     String,
  }],
  procedurat:      [String],
  rekomandime:     String,
  referime:        String,

  // ─── Lidhjet me Lab ──────────────────────────────────────
  testetEKerkuara:  [{ type: Schema.Types.ObjectId, ref: 'TestiLab' }],
  rezultateLab:     [{ type: Schema.Types.ObjectId, ref: 'RezultatLab' }],

  // ─── Follow-up ───────────────────────────────────────────
  followUpDate:    Date,
  followUpShenime: String,
  
  shenimetMjekut:  String,
  privat:          { type: Boolean, default: false },
  pagesa:          { type: Schema.Types.ObjectId, ref: 'Fatura' },
}, { timestamps: true });

skemaKontrolli.index({ pacienti: 1, dataTakimit: -1 });
skemaKontrolli.index({ mjeku: 1, dataTakimit: -1 });
skemaKontrolli.index({ dataTakimit: 1 });

module.exports = mongoose.model('Kontrolli', skemaKontrolli);
