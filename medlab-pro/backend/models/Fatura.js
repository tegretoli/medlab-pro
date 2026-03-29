const mongoose = require('mongoose');
const { Schema } = mongoose;

const skemaFatura = new Schema({
  numrFatures: { type: String, unique: true },
  pacienti:    { type: Schema.Types.ObjectId, ref: 'Pacienti', required: true },
  krijoNga:    { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },

  // ─── Zerat e Fatures ────────────────────────────────────
  zerat: [{
    lloji: {
      type: String,
      enum: ['Test_Lab', 'Vizite_Mjekesore', 'Procedura', 'Barna', 'Tjeter'],
      required: true,
    },
    referenca:  Schema.Types.ObjectId,
    pershkrim:  { type: String, required: true },
    sasia:      { type: Number, default: 1, min: 1 },
    cmimi:      { type: Number, required: true, min: 0 },
    zbritja:    { type: Number, default: 0, min: 0, max: 100 },
    tvsh:       { type: Number, default: 0, min: 0, max: 100 },
    subtotal:   Number,
  }],

  // ─── Totalet ────────────────────────────────────────────
  nentotali:    Number,
  zbritjaTotal: { type: Number, default: 0 },
  tvshTotal:    { type: Number, default: 0 },
  totali:       { type: Number, required: true },

  // ─── Pagesa ─────────────────────────────────────────────
  statusiPag: {
    type: String,
    enum: ['Hapur', 'PagezurPjeserisht', 'Pagezur', 'Anuluar'],
    default: 'Hapur',
  },
  pagesat: [{
    shuma:          { type: Number, required: true },
    metoda: {
      type: String,
      enum: ['Kesh', 'KarteDebi', 'KarteKrediti', 'Transfer', 'Sigurimi'],
      required: true,
    },
    data:           { type: Date, default: Date.now },
    transaksionId:  String,
    shenime:        String,
    regjistuarNga:  { type: Schema.Types.ObjectId, ref: 'Perdoruesi' },
  }],
  totalPaguar: { type: Number, default: 0 },
  totalNgelur: Number,

  // ─── Sigurimi ────────────────────────────────────────────
  sigurimi: {
    mbulon:     { type: Boolean, default: false },
    kompania:   String,
    numer:      String,
    shumaE_mbuluar: Number,
    aprovimi:   String,
    statusi:    { type: String, enum: ['Pending', 'Aprovuar', 'Refuzuar'] },
  },

  // ─── Metadata ────────────────────────────────────────────
  dataSherbimit: { type: Date, default: Date.now },
  faturaPDF:     String,
  emailDerguar:  { type: Boolean, default: false },
  emailDerguarNe: Date,
  shenime:       String,
  anuluar:       { type: Boolean, default: false },
  arsyjaAnulimit: String,
}, { timestamps: true });

// Auto-gjenero numrin e fatures
skemaFatura.pre('save', async function (next) {
  if (!this.numrFatures) {
    const viti  = new Date().getFullYear();
    const muaji = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.constructor.countDocuments();
    this.numrFatures = `FAT-${viti}${muaji}-${String(count + 1).padStart(6, '0')}`;
  }
  // Llogarit subtotalet
  let nentotali = 0;
  this.zerat.forEach(z => {
    const subtotal = z.sasia * z.cmimi * (1 - z.zbritja / 100);
    z.subtotal = Math.round(subtotal * 100) / 100;
    nentotali += z.subtotal;
  });
  this.nentotali    = Math.round(nentotali * 100) / 100;
  this.tvshTotal    = Math.round(nentotali * (this.tvshTotal || 0) / 100 * 100) / 100;
  this.totali       = Math.round((this.nentotali + this.tvshTotal - this.zbritjaTotal) * 100) / 100;
  this.totalPaguar  = this.pagesat.reduce((s, p) => s + p.shuma, 0);
  this.totalNgelur  = Math.max(0, this.totali - this.totalPaguar);
  if (this.totalNgelur === 0 && this.totalPaguar > 0) this.statusiPag = 'Pagezur';
  else if (this.totalPaguar > 0) this.statusiPag = 'PagezurPjeserisht';
  next();
});

skemaFatura.index({ pacienti: 1, createdAt: -1 });
skemaFatura.index({ statusiPag: 1 });

module.exports = mongoose.model('Fatura', skemaFatura);
