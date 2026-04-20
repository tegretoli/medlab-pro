const mapPaymentMethod = (metodaPagese) => {
  if (metodaPagese === 'Kesh') return 'cash';
  if (metodaPagese === 'Bank') return 'card';
  if (metodaPagese === 'ZbritjeTotale') return 'discount_total';
  return 'unknown';
};

const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const roundPercent = (value) => Math.round(Number(value || 0) * 100) / 100;

const hashToFiscalArticleId = (input) => {
  const text = String(input || '').trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 31) + text.charCodeAt(i)) % 900000;
  }
  return hash + 1000;
};

const resolveFiscalArticleId = (analysis, fallbackName, fallbackOrderId) => {
  const explicit = Number(analysis?.fiskalArticleId);
  if (Number.isInteger(explicit) && explicit > 0) return explicit;

  const code = String(analysis?.kodi || '').trim().toUpperCase();
  if (code) return hashToFiscalArticleId(code);

  return hashToFiscalArticleId(`${fallbackName || ''}_${fallbackOrderId || ''}`);
};

const distributeFixedDiscount = (items, totalDiscount) => {
  const roundedDiscount = roundMoney(totalDiscount);
  if (!items.length || roundedDiscount <= 0) {
    return items.map((item) => ({
      ...item,
      discountPercent: 0,
      discountAmount: 0,
      unitPrice: roundMoney(item.unitPrice),
      lineTotal: roundMoney(item.lineTotal),
    }));
  }

  const subtotal = roundMoney(items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0));
  if (subtotal <= 0) {
    return items.map((item) => ({
      ...item,
      discountPercent: 0,
      discountAmount: 0,
      unitPrice: roundMoney(item.unitPrice),
      lineTotal: roundMoney(item.lineTotal),
    }));
  }

  let allocated = 0;
  return items.map((item, index) => {
    const gross = roundMoney(item.lineTotal);
    const proportional = index === items.length - 1
      ? roundMoney(roundedDiscount - allocated)
      : roundMoney((gross / subtotal) * roundedDiscount);
    const discountAmount = Math.max(0, Math.min(gross, proportional));
    allocated = roundMoney(allocated + discountAmount);

    return {
      ...item,
      discountPercent: 0,
      discountAmount,
      unitPrice: roundMoney(item.unitPrice),
      lineTotal: gross,
    };
  });
};

const applyReceiptDiscounts = (items, payment, subtotal, total) => {
  const normalizedItems = items.map((item) => ({
    ...item,
    unitPrice: roundMoney(item.unitPrice),
    lineTotal: roundMoney(item.lineTotal),
  }));
  const discountPercent = roundPercent(payment?.zbritjaPerqind || 0);
  const discountTotal = Math.max(0, roundMoney(subtotal - total));

  if (!normalizedItems.length || discountTotal <= 0) {
    return normalizedItems.map((item) => ({
      ...item,
      discountPercent: 0,
      discountAmount: 0,
    }));
  }

  if (discountPercent > 0) {
    return normalizedItems.map((item) => ({
      ...item,
      discountPercent,
      discountAmount: 0,
    }));
  }

  return distributeFixedDiscount(normalizedItems, discountTotal);
};

const buildFiscalPayloadFromOrders = (orders) => {
  const firstOrder = orders[0] || {};
  const firstPayment = firstOrder.pagesa || {};
  const pacienti = firstOrder.pacienti || {};

  const subtotal = orders.reduce((sum, order) => sum + Number(order.pagesa?.shumaTotale || order.cmimi || 0), 0);
  const total = orders.reduce((sum, order) => sum + Number(order.pagesa?.shumaFinal || order.cmimi || 0), 0);
  const discount = Math.max(0, subtotal - total);
  const vatRate = Number(process.env.FISCAL_DEFAULT_VAT_RATE || 0);

  const rawItems = orders.flatMap((order) => {
    const tipi = order.tipiPacientit || 'pacient';
    const analyses = Array.isArray(order.analizat) ? order.analizat : [];

    if (!analyses.length) {
      return [{
        name: order.departamenti || 'Sherbim laboratorik',
        qty: 1,
        unitPrice: Number(order.pagesa?.shumaFinal || order.cmimi || 0),
        lineTotal: Number(order.pagesa?.shumaFinal || order.cmimi || 0),
        vatCode: process.env.FISCAL_DEFAULT_VAT_CODE || '',
        vatRate,
        fiscalArticleId: hashToFiscalArticleId(`${order.departamenti || 'SHERBIM'}_${order._id}`),
        orderId: order._id,
      }];
    }

    return analyses.map((analysis) => {
      const analysisDoc = analysis.analiza || {};
      const price = Number(
        analysisDoc?.cmime?.[tipi] ??
        analysisDoc?.cmime?.pacient ??
        0
      );
      const name = analysisDoc?.fiskalArticleName || analysisDoc?.emri || 'Sherbim laboratorik';

      return {
        name,
        qty: 1,
        unitPrice: price,
        lineTotal: price,
        vatCode: process.env.FISCAL_DEFAULT_VAT_CODE || '',
        vatRate,
        fiscalArticleId: resolveFiscalArticleId(analysisDoc, name, order._id),
        orderId: order._id,
      };
    });
  });

  const items = applyReceiptDiscounts(rawItems, firstPayment, subtotal, total);

  const invoiceNumber = firstOrder.numrPorosi || firstOrder.numrRendor || '';

  return {
    invoiceNumber: String(invoiceNumber),
    patientName: [pacienti.emri, pacienti.mbiemri].filter(Boolean).join(' ').trim(),
    currency: process.env.FISCAL_CURRENCY || 'EUR',
    paymentMethod: mapPaymentMethod(firstPayment.metodaPagese),
    subtotal,
    discount,
    total,
    vatTotal: vatRate > 0 ? Number((total * vatRate / (100 + vatRate)).toFixed(2)) : 0,
    items,
    raw: {
      orderIds: orders.map((order) => String(order._id)),
      patientId: pacienti._id ? String(pacienti._id) : '',
      paymentMethodOriginal: firstPayment.metodaPagese || '',
      paidAt: firstPayment.dataPageses || null,
    },
  };
};

module.exports = {
  buildFiscalPayloadFromOrders,
  mapPaymentMethod,
};
