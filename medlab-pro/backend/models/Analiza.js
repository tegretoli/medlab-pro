const mongoose = require('mongoose');
const { Schema } = mongoose;

// Katalogu i Analizave me cmime dhe profile
const skemaAnaliza = new Schema({
  kodi:         { type: String, unique: true, required: true, uppercase: true },
  emri:         { type: String, required: true, trim: true },
  fiskalArticleId: { type: Number, default: null },
  fiskalArticleName: { type: String, default: '' },
  emriAnglisht: String,
  departamenti: {
    type: String,
    enum: ['Biokimi', 'Mikrobiologji', 'PCR'],
    required: true,
  },
  // Analiza caktohet tek nje profil (ref. modeli Profili)
  profiliId: { type: Schema.Types.ObjectId, ref: 'Profili', default: null },

  cmime: {
    pacient:      { type: Number, required: true, default: 0 },
    bashkpuntor:  { type: Number, default: 0 },  // cmim special per bashkepunetore
    sigurimi:     { type: Number, default: 0 },
  },
  
  pergatitjaPacienti: { type: String, default: 'Pa kufizime' },
  materialBiologjik:  { type: String, default: 'Gjak venoz' },
  kohaPërgatitjes:    { type: Number, default: 24 }, // ore
  
  vleratReference: [{
    gjinia:   { type: String, enum: ['M', 'F', 'Te dyja'], default: 'Te dyja' },
    moshaMin: { type: Number, default: 0 },
    moshaMax: { type: Number, default: 120 },
    vleraMin: Number,
    vleraMax: Number,
    njesia:   String,
    komponenti: String, // p.sh. "Glukoza", "Kreatinina"
  }],
  
  komponente: [{ // vlerat referente per cdo komponent
    emri:      String,
    njesia:    String,
    kritikMin: Number,  // kufiri i poshtëm normal (per flamurim + diagram PDF)
    kritikMax: Number,  // kufiri i sipërm normal (per flamurim + diagram PDF)
    vlerat: [{          // te gjitha intervalet referente
      etiketa:    String,
      gjinia:     { type: String, enum: ['M', 'F', 'Te dyja'], default: 'Te dyja' },
      moshaMin:   { type: Number, default: 0 },
      moshaMax:   { type: Number, default: 120 },
      // njesia e moshes per kete interval (Dite/Muaj/Vjet) — per saktesi neonatale/pediatrike
      moshaJedesi: { type: String, enum: ['Dite', 'Muaj', 'Vjet'], default: 'Vjet' },
      operatori:  { type: String, enum: ['midis', 'me_pak', 'me_pak_baraz', 'me_shum_baraz', 'me_shum', 'tekst'] },
      vleraMin:   Number,
      vleraMax:   Number,
      vleraTekst: String,
      komentAuto: String,  // koment automatik kur zgidhet ky rezultat (per PCR)
      kritikMin:  Number,  // kufiri i poshtëm personal per kete interval (fallback)
      kritikMax:  Number,  // kufiri i sipërm personal per kete interval (fallback)
    }],
  }],
  numrRendorNeProfil: { type: Number, default: 0 }, // renditja brenda profilit (per PDF)
  historikuCmimeve: [{
    cmimeVjeter: { pacient: Number, bashkpuntor: Number },
    cmimeRe:     { pacient: Number, bashkpuntor: Number },
    ndryshuarNe:  { type: Date, default: Date.now },
    ndryshuarNga: String,
  }],
  aktiv: { type: Boolean, default: true },
  shenime: String,
  komentet: [{ type: String, maxlength: 2500 }], // komente te paracaktuara (shfaqen si sugjerime ne rezultate)
}, { timestamps: true });

skemaAnaliza.index({ emri: 'text', kodi: 'text' });
module.exports = mongoose.model('Analiza', skemaAnaliza);
