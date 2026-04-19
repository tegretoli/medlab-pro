const mongoose = require('mongoose');
const { Schema } = mongoose;

// Counter atomik per numrPorosi (shmang race condition)
const Counter = mongoose.models.Counter || mongoose.model('Counter', new Schema({
  _id: String,
  seq: { type: Number, default: 0 },
}));

const skemaPorosiLab = new Schema({
  numrPorosi:   { type: String, unique: true },
  pacienti:     { type: Schema.Types.ObjectId, ref: 'Pacienti', required: true },
  derguesit:    { type: Schema.Types.ObjectId, ref: 'Perdoruesi' }, // perdoruesi i brendshem
  referuesId:   { type: Schema.Types.ObjectId, ref: 'Referues', default: null }, // referues i jashtem
  laboranti:    { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  
  departamenti: {
    type: String,
    enum: ['Biokimi', 'Mikrobiologji', 'PCR'],
    required: true,
  },
  
  tipiPacientit: {
    type: String,
    enum: ['pacient', 'bashkpuntor'],
    default: 'pacient',
  },
  
  statusi: {
    type: String,
    enum: ['Porositur', 'NeProcesim', 'Kompletuar', 'Anuluar'],
    default: 'Porositur',
  },
  urgente: { type: Boolean, default: false },
  
  analizat: [{
    analiza:     { type: Schema.Types.ObjectId, ref: 'Analiza', required: true },
    profiliId:   { type: Schema.Types.ObjectId, ref: 'Analiza', default: null },
    profiliEmri: { type: String, default: '' },
    rezultate: [{
      komponenti: String,
      vlera:      Schema.Types.Mixed,
      njesia:     String,
      vleraMin:   Number,
      vleraMax:   Number,
      flamuri: {
        type: String,
        enum: ['Normal', 'Larte', 'Shume_Larte', 'Ulet', 'Shume_Ulet', 'Kritik', '—'],
        default: '—',
      },
      koment: String,
    }],
    // Snapshot i komponenteve ne kohen e regjistrimit te rezultateve.
    // I pandryshueshem pas validimit — shfaqet ne PDF pa marre parasysh ndryshimet e metejshme.
    komponenteSnapshot: [{
      emri:      String,
      njesia:    String,
      kritikMin: Number,
      kritikMax: Number,
      vlerat: [{
        etiketa:    String,
        gjinia:     String,
        moshaMin:   Number,
        moshaMax:   Number,
        operatori:  String,
        vleraMin:   Number,
        vleraMax:   Number,
        vleraTekst: String,
        komentAuto: String,
        kritikMin:  Number,
        kritikMax:  Number,
      }],
    }],
    kompletuar:     { type: Boolean, default: false },
    koment:         String,
    shfaqNeRaport:  { type: Boolean, default: true },
    primare:        { type: Boolean, default: true },
    antibiogram: {
      grupiId:   { type: Schema.Types.ObjectId, ref: 'AntibiogramGrupi', default: null },
      grupiEmri: { type: String, default: '' },
      rezultate: [{
        antibiotiku: String,
        vlera:       { type: String, enum: ['S', 'I', 'R', ''] },
      }],
    },
  }],

  komentetProfileve: [{
    profiliId:   { type: Schema.Types.ObjectId, ref: 'Analiza' },
    profiliEmri: String,
    koment:      String,
  }],
  
  cmimi:         Number,
  tipiCmimit:    { type: String, enum: ['pacient', 'bashkpuntor', 'sigurimi'], default: 'pacient' },
  fatura:        { type: Schema.Types.ObjectId, ref: 'Fatura' },
  
  dataPorosis:   { type: Date, default: Date.now },
  dataKompletimit: Date,
  
  raportiPDF:    String,
  emailDerguar:  { type: Boolean, default: false },
  shenime:       String,

  pagesa: {
    statusi:        { type: String, enum: ['Papaguar', 'Paguar'], default: 'Papaguar' },
    zbritjaPerqind: { type: Number, default: 0 },
    zbritjaFikse:   { type: Number, default: 0 },
    shumaTotale:    Number,
    shumaFinal:     Number,
    metodaPagese:   { type: String, enum: ['Kesh', 'Bank', 'ZbritjeTotale'] },
    dataPageses:    Date,
    kodZbritjes:    { type: String, default: null },
    fiskal: {
      status: {
        type: String,
        enum: ['not_requested', 'pending', 'queued_to_flink', 'issued', 'failed'],
        default: 'not_requested',
      },
      jobId: {
        type: Schema.Types.ObjectId,
        ref: 'FiscalPrintJob',
        default: null,
      },
      receiptNumber: { type: String, default: '' },
      fiscalNumber:  { type: String, default: '' },
      requestedAt:   { type: Date, default: null },
      issuedAt:      { type: Date, default: null },
      updatedAt:     { type: Date, default: null },
      errorMessage:  { type: String, default: '' },
    },
  },
  
  numrRendor:    Number, // 1, 2, 3... resetohet cdo dite
  dataRendor:    String, // "2026-03-01" per te resetuar numrin ditor
  seancaId:      { type: String, default: null }, // UUID per te grupuar porosi te se njejtes seance
  tokenPublik:   { type: String, default: () => require('crypto').randomBytes(20).toString('hex') },

  // Pako promocionale (opsionale) — cmimi i PorosiLab eshte cmimiPako, jo shuma individuale
  pakoId:        { type: require('mongoose').Schema.Types.ObjectId, ref: 'PakoAnalizave', default: null },
  pakoEmri:      { type: String, default: '' },

  validimTeknik: {
    bere: { type: Boolean, default: false },
    data: { type: Date,    default: null  },
    nga:  { type: String,  default: ''    },
  },
  validimMjekesor: {
    bere: { type: Boolean, default: false },
    data: { type: Date,    default: null  },
    nga:  { type: String,  default: ''    },
  },
}, { timestamps: true });

// Auto numri rendor ditor — counter atomik (pa race condition)
skemaPorosiLab.pre('save', async function(next) {
  if (!this.numrPorosi) {
    const sot = new Date();
    const viti  = sot.getFullYear();
    const muaji = String(sot.getMonth()+1).padStart(2,'0');
    const dita  = String(sot.getDate()).padStart(2,'0');
    const dataStr = `${viti}-${muaji}-${dita}`;

    // Counter 1: always increments → unique numrPorosi per day
    const counter = await Counter.findOneAndUpdate(
      { _id: `porosi_${dataStr}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );

    this.dataRendor = dataStr;
    this.numrPorosi = `${viti}${muaji}${dita}-${String(counter.seq).padStart(3,'0')}`;

    // Counter 2: every new registration gets its own unique sequential numrRendor.
    // Counter is per-department per-day so each department has its own 1, 2, 3...
    const pacCounter = await Counter.findOneAndUpdate(
      { _id: `pacient_${dataStr}_${this.departamenti}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.numrRendor = pacCounter.seq;
  }
  next();
});

skemaPorosiLab.index({ pacienti: 1, createdAt: -1 });
skemaPorosiLab.index({ departamenti: 1, dataRendor: 1 });
skemaPorosiLab.index({ dataRendor: 1, numrRendor: 1 });

module.exports = mongoose.model('PorosiLab', skemaPorosiLab);
