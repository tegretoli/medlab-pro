const mongoose = require('mongoose');
const { Schema } = mongoose;

const fiscalPrintJobSchema = new Schema({
  correlationId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'queued_to_flink', 'issued', 'failed'],
    default: 'pending',
    index: true,
  },
  source: {
    type: String,
    default: 'pagesat',
  },
  orderIds: [{
    type: Schema.Types.ObjectId,
    ref: 'PorosiLab',
    required: true,
  }],
  pacienti: {
    id: { type: Schema.Types.ObjectId, ref: 'Pacienti', default: null },
    emri: { type: String, default: '' },
  },
  requestedBy: {
    id: { type: Schema.Types.ObjectId, ref: 'Perdoruesi', default: null },
    emri: { type: String, default: '' },
  },
  payload: {
    invoiceNumber: { type: String, default: '' },
    currency: { type: String, default: 'EUR' },
    paymentMethod: { type: String, default: '' },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    vatTotal: { type: Number, default: 0 },
    items: [{
      name: { type: String, default: '' },
      qty: { type: Number, default: 1 },
      unitPrice: { type: Number, default: 0 },
      lineTotal: { type: Number, default: 0 },
      vatCode: { type: String, default: '' },
      vatRate: { type: Number, default: 0 },
      orderId: { type: Schema.Types.ObjectId, ref: 'PorosiLab', default: null },
    }],
    raw: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  adapter: {
    type: {
      type: String,
      default: 'f-link-folder',
    },
    payloadFormat: {
      type: String,
      default: 'unverified-json-v1',
    },
    watchedFolder: { type: String, default: '' },
    requestFileName: { type: String, default: '' },
    requestFilePath: { type: String, default: '' },
    responseFileName: { type: String, default: '' },
    responseFilePath: { type: String, default: '' },
  },
  bridge: {
    claimedAt: { type: Date, default: null },
    claimedBy: { type: String, default: '' },
    queuedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  result: {
    receiptNumber: { type: String, default: '' },
    fiscalNumber: { type: String, default: '' },
    issuedAt: { type: Date, default: null },
    rawResponse: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

fiscalPrintJobSchema.index({ status: 1, requestedAt: 1 });

module.exports = mongoose.model('FiscalPrintJob', fiscalPrintJobSchema);
