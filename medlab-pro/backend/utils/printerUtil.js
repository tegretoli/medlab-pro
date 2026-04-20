const fs = require('fs');
const path = require('path');

let SerialPort = null;
try {
  ({ SerialPort } = require('serialport'));
} catch {
  SerialPort = null;
}

let printer = null;

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const sanitizeField = (value, maxLength = 36) => {
  return String(value || '')
    .replace(/[;\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

const formatPrice = (value) => Number(value || 0).toFixed(2);
const formatDiscountPercent = (value) => {
  const amount = Number(value || 0);
  if (!amount) return '0';
  return amount.toFixed(2).replace(/\.?0+$/, '');
};
const formatQty = (value) => {
  const qty = Number(value || 0);
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(3);
};

const hashToFiscalArticleId = (input) => {
  const text = String(input || '').trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash * 31) + text.charCodeAt(i)) % 900000;
  }
  return hash + 1000;
};

const buildFLinkSaleLine = (item, index) => {
  const itemName = sanitizeField(item.name || `ITEM ${index}`);
  const itemPrice = formatPrice(item.unitPrice ?? item.lineTotal ?? 0);
  const qty = formatQty(item.qty ?? 1);
  const fiscalArticleId = Number(item.fiscalArticleId) || hashToFiscalArticleId(itemName);
  const discountPercent = formatDiscountPercent(item.discountPercent);
  const discountAmount = formatPrice(item.discountAmount);

  if (!itemName) {
    throw new Error(`Fiscal item ${index} has an empty name`);
  }

  // The last numeric field is treated by the device as the fiscal article/PLU code,
  // not as a transient line index. It must stay stable per service.
  // FP-700KS also supports row discount fields after the PLU code.
  return `S,1,______,_,__;${itemName};${itemPrice};${qty};1;1;1;0;${fiscalArticleId};${discountPercent};${discountAmount};`;
};

/**
 * Initialize printer connection
 * @param {string} comPort - COM port (e.g., 'COM4')
 * @param {number} baudRate - Baud rate (default: 115200)
 */
const inicializeZiharjen = (comPort, baudRate = 115200) => {
  return new Promise((resolve, reject) => {
    try {
      if (!SerialPort) {
        reject({ success: false, message: 'Paketa serialport nuk eshte e instaluar' });
        return;
      }

      if (printer?.isOpen) {
        resolve({ success: true, message: 'Printer already connected' });
        return;
      }

      printer = new SerialPort({ path: comPort, baudRate });

      printer.on('open', () => {
        console.log(`Printer connected on ${comPort}`);
        resolve({ success: true, message: `Connected to ${comPort}` });
      });

      printer.on('error', (err) => {
        console.error('Printer error:', err.message);
        reject({ success: false, message: err.message });
      });
    } catch (err) {
      reject({ success: false, message: err.message });
    }
  });
};

/**
 * Send raw data to printer
 */
const dergoZiharjen = (data) => {
  return new Promise((resolve, reject) => {
    if (!printer || !printer.isOpen) {
      reject({ success: false, message: 'Printer not connected' });
      return;
    }

    printer.write(data, 'utf8', (err) => {
      if (err) reject({ success: false, message: err.message });
      else resolve({ success: true, message: 'Sent to printer' });
    });
  });
};

/**
 * Write a file atomically to the requested folder.
 */
const shkruajFileNeFolder = async (folder, filename, content) => {
  await fs.promises.mkdir(folder, { recursive: true });
  const filePath = path.join(folder, filename);
  const tempPath = `${filePath}.tmp`;

  await fs.promises.writeFile(tempPath, content, 'utf8');
  await fs.promises.rename(tempPath, filePath);

  return filePath;
};

/**
 * Format fiscal receipt preview for thermal printer.
 */
const formatoKupon = (fatura) => {
  const maxW = 40;

  const center = (text) => {
    const pad = Math.max(0, Math.floor((maxW - String(text).length) / 2));
    return ' '.repeat(pad) + text;
  };

  const rjustify = (left, right) => {
    const leftStr = String(left);
    const rightStr = String(right);
    const gap = maxW - leftStr.length - rightStr.length;
    return leftStr + ' '.repeat(Math.max(0, gap)) + rightStr;
  };

  let receipt = '';
  receipt += '\n\n';
  receipt += center('LAB A') + '\n';
  receipt += center('Tel: 35550000') + '\n';
  receipt += center('='.repeat(maxW)) + '\n';
  receipt += center('KUPON FISKAL') + '\n';
  receipt += center('(Preview - jo fiskal i vertete)') + '\n';
  receipt += center('-'.repeat(maxW)) + '\n';

  const dataObj = new Date(fatura.dataLeshimit || Date.now());
  receipt += rjustify('Data:', dataObj.toLocaleDateString('sq-AL')) + '\n';
  receipt += rjustify('Ora:', dataObj.toLocaleTimeString('sq-AL')) + '\n';
  receipt += rjustify('Nr.Kuponi:', String(fatura.numrFatures || '---').substring(0, 15)) + '\n';
  receipt += '\n';

  if (fatura.pacientEmri) {
    receipt += rjustify('Pacienti:', String(fatura.pacientEmri).substring(0, 22)) + '\n';
  }

  receipt += '-'.repeat(maxW) + '\n';

  if (Array.isArray(fatura.lineItems) && fatura.lineItems.length) {
    for (const item of fatura.lineItems) {
      const name = String(item.name || '').substring(0, 28);
      const price = `${Number(item.price || 0).toFixed(2)} EUR`;
      const gap = maxW - name.length - price.length;
      receipt += name + ' '.repeat(Math.max(1, gap)) + price + '\n';
    }
    receipt += '-'.repeat(maxW) + '\n';
  }

  if (fatura.zbritjeText) {
    receipt += rjustify('Total Bruto:', `${Number(fatura.gjithsejPaTvsh || 0).toFixed(2)} EUR`) + '\n';
    receipt += rjustify('Zbritje:', fatura.zbritjeText) + '\n';
    receipt += '-'.repeat(maxW) + '\n';
  }

  receipt += rjustify('Total Bruto:', `${Number(fatura.gjithsejPaTvsh || 0).toFixed(2)} EUR`) + '\n';
  if (fatura.tvshPrc && fatura.tvshPrc > 0) {
    receipt += rjustify(`TVSH ${fatura.tvshPrc}%:`, `${Number(fatura.tvshEUR || 0).toFixed(2)} EUR`) + '\n';
  }

  receipt += center('='.repeat(maxW)) + '\n';
  receipt += rjustify('TOTALI:', `${Number(fatura.totalFinal || 0).toFixed(2)} EUR`) + '\n';
  receipt += center('='.repeat(maxW)) + '\n';
  receipt += '\n';
  receipt += center('Faleminderit per zgjedhjen tuaj!') + '\n';
  receipt += center('Lab A - Laborator Mjekesor') + '\n';
  receipt += '\n\n';

  return receipt;
};

/**
 * Legacy print helper kept for the preview flow.
 */
const printoKupon = async (fatura, comPort = process.env.PRINTER_PORT || 'COM4') => {
  try {
    const kupon = formatoKupon(fatura);

    if (process.env.PRINTER_FOLDER) {
      const folder = process.env.PRINTER_FOLDER;
      const filename = `kupon-fiskal-${Date.now()}.inp`;
      const filePath = await shkruajFileNeFolder(folder, filename, kupon);
      return { success: true, message: `Receipt written to ${filePath}` };
    }

    if (!printer || !printer.isOpen) {
      await inicializeZiharjen(comPort);
    }

    await dergoZiharjen(kupon);
    return { success: true, message: 'Receipt printed successfully' };
  } catch (err) {
    return { success: false, message: err.message || String(err) };
  }
};

const buildFLinkInpContent = (job) => {
  const payload = job.payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    throw new Error('Fiscal job has no items to print');
  }

  const lines = [];

  for (let index = 0; index < items.length; index += 1) {
    lines.push(buildFLinkSaleLine(items[index], index + 1));
  }

  // Exactly one total/finalization line, appended only after all sale lines.
  lines.push('T,1,______,_,__;');

  return `${lines.join('\n')}\n`;
};

/**
 * Write a bridge job to the F-Link watched folder.
 */
const writeFLinkInputFile = async (job, options = {}) => {
  const watchFolder = options.watchFolder || process.env.FLINK_WATCH_FOLDER || process.env.PRINTER_FOLDER || 'C:\\Temp';
  if (!watchFolder) {
    throw new Error('FLINK_WATCH_FOLDER is not configured');
  }

  const filePrefix = options.filePrefix || process.env.FLINK_FILE_PREFIX || 'receipt';
  const baseName = options.fileBaseName || `${filePrefix}_${Date.now()}.inp`;
  const content = buildFLinkInpContent(job);
  const filePath = await shkruajFileNeFolder(watchFolder, baseName, content);

  return {
    watchFolder,
    requestFileName: baseName,
    requestFilePath: filePath,
    payloadFormat: 'fp700ks-sale-v1',
  };
};

const parseFLinkResponse = (content) => {
  const text = String(content || '').trim();
  const lower = text.toLowerCase();

  const successPatterns = [
    /\bok\b/,
    /\bsuccess\b/,
    /\bissued\b/,
    /\bprinted\b/,
  ];
  const failurePatterns = [
    /\berror\b/,
    /\bfailed\b/,
    /\btimeout\b/,
    /\bdenied\b/,
    /\binvalid\b/,
  ];

  const receiptMatch = text.match(/receipt[_\s-]*number\s*[:=]\s*([A-Za-z0-9\-\/]+)/i);
  const fiscalMatch = text.match(/fiscal[_\s-]*number\s*[:=]\s*([A-Za-z0-9\-\/]+)/i);
  const ok = successPatterns.some((pattern) => pattern.test(lower));
  const failed = failurePatterns.some((pattern) => pattern.test(lower));

  if (ok && !failed) {
    return {
      status: 'issued',
      receiptNumber: receiptMatch?.[1] || '',
      fiscalNumber: fiscalMatch?.[1] || '',
      rawResponse: text,
    };
  }

  return {
    status: 'failed',
    errorMessage: text || 'F-Link response did not match the configured success pattern',
    rawResponse: text,
  };
};

const findResponseCandidate = async (responseFolder, requestFileName) => {
  const baseName = path.parse(requestFileName).name.toLowerCase();
  const entries = await fs.promises.readdir(responseFolder, { withFileTypes: true });

  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const lower = name.toLowerCase();
      return lower !== requestFileName.toLowerCase() && lower.includes(baseName);
    })
    .sort();

  return candidates[0] || null;
};

/**
 * Poll the watched/response folder for a result file that matches the request.
 */
const waitForFLinkResponse = async (queueResult, options = {}) => {
  const responseFolder = options.responseFolder || process.env.FLINK_RESPONSE_FOLDER || queueResult.watchFolder;
  const timeoutMs = Number(options.timeoutMs || process.env.FLINK_RESPONSE_TIMEOUT_MS || 120000);
  const pollIntervalMs = Number(options.pollIntervalMs || process.env.FLINK_RESPONSE_POLL_MS || 1500);
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    const candidate = await findResponseCandidate(responseFolder, queueResult.requestFileName);
    if (candidate) {
      const responseFilePath = path.join(responseFolder, candidate);
      const responseBody = await fs.promises.readFile(responseFilePath, 'utf8');
      return {
        ...parseFLinkResponse(responseBody),
        responseFileName: candidate,
        responseFilePath,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    status: 'failed',
    errorMessage: `Timed out after ${timeoutMs} ms waiting for an F-Link response file`,
    rawResponse: '',
  };
};

const shouldWaitForFLinkResponse = (options = {}) => {
  return toBool(options.waitForResponse ?? process.env.FLINK_WAIT_FOR_RESPONSE, false);
};

/**
 * Disconnect printer
 */
const mbyllZiharjen = () => {
  return new Promise((resolve) => {
    if (printer?.isOpen) {
      printer.close(() => {
        console.log('Printer disconnected');
        resolve({ success: true });
      });
    } else {
      resolve({ success: true });
    }
  });
};

module.exports = {
  inicializeZiharjen,
  dergoZiharjen,
  formatoKupon,
  printoKupon,
  mbyllZiharjen,
  buildFLinkInpContent,
  writeFLinkInputFile,
  waitForFLinkResponse,
  shouldWaitForFLinkResponse,
};
