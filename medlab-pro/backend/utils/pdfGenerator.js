const PDFDocument = require('pdfkit');
const axios = require('axios');

// ─── Ngjyra ──────────────────────────────────────────────────────────────────
const C = {
  primary:    '#1A3A6B',
  text:       '#111827',
  textMid:    '#374151',
  gray:       '#6B7280',
  grayLight:  '#F9FAFB',
  grayMid:    '#F3F4F6',
  border:     '#D1D5DB',
  borderDark: '#9CA3AF',
  white:      '#FFFFFF',
  normal:     '#16A34A',
  larte:      '#DC2626',
  shLarte:    '#991B1B',
  ulet:       '#2563EB',
  shUlet:     '#1D4ED8',
  kritik:     '#991B1B',
};

const DEP_COLORS = {
  Biokimi:       '#1A3A6B',
  Mikrobiologji: '#059669',
  PCR:           '#7C3AED',
};

const INV_COLORS = {
  red: '#DC2626', orange: '#EA580C', yellow: '#D97706',
  green: '#059669', blue: '#2563EB', gray: '#6B7280',
};

const flamuriInfo = (f) => {
  const map = {
    Normal:      { tekst: 'Normal',    ngjyra: C.normal  },
    Larte:       { tekst: '↑ Larte',   ngjyra: C.larte   },
    Shume_Larte: { tekst: '↑↑ S.Lart', ngjyra: C.shLarte },
    Ulet:        { tekst: '↓ Ulet',    ngjyra: C.ulet    },
    Shume_Ulet:  { tekst: '↓↓ S.Ulet', ngjyra: C.shUlet  },
    Kritik:      { tekst: '!! KRITIK', ngjyra: C.kritik  },
  };
  return map[f] || { tekst: '', ngjyra: C.gray };
};

// ─── Formaton vleren referente te komponentit ─────────────────────────────────
function fmtVleraRef(ref) {
  const op = ref.operatori || 'midis';
  const v1 = ref.vleraMin, v2 = ref.vleraMax, u = ref.njesia || '';
  switch (op) {
    case 'me_pak':        return `< ${v1} ${u}`.trim();
    case 'me_pak_baraz':  return `≤ ${v1} ${u}`.trim();
    case 'midis':
      return v1 != null && v2 != null ? `${v1}–${v2} ${u}`.trim()
           : v1 != null ? `${v1} ${u}`.trim() : '—';
    case 'me_shum_baraz': return `≥ ${v1} ${u}`.trim();
    case 'me_shum':       return `> ${v1} ${u}`.trim();
    case 'tekst':         return ref.vleraTekst || '—';
    default:
      return v1 != null && v2 != null ? `${v1}–${v2} ${u}`.trim() : '—';
  }
}

// ─── Filtron vlerat referente sipas gjinise dhe moshes se pacientit ───────────
function filtroVlerat(vlerat, gjinia, mosha) {
  if (!vlerat || vlerat.length === 0) return [];
  const matched = vlerat.filter(vl => {
    const gjiniaOk = !vl.gjinia || vl.gjinia === 'Te dyja' || vl.gjinia === gjinia;
    const moshaOk  = mosha == null
      || (mosha >= (vl.moshaMin ?? 0) && mosha <= (vl.moshaMax ?? 120));
    return gjiniaOk && moshaOk;
  });
  return matched.length > 0 ? matched : vlerat; // fallback: shfaq te gjitha nese asnje nuk perputhet
}


// ─── Barkodi (pseudo-visual) ─────────────────────────────────────────────────
function vizatoBarcode(doc, tekst, x, y, gjeresia, lartesia) {
  const chars = (tekst || '').replace(/\s/g, '').toUpperCase();
  if (!chars) return;

  const bitsPerChar = 9;
  const totalBits   = chars.length * bitsPerChar + 8;
  const bw          = gjeresia / totalBits;
  let bx            = x;

  // Mbrojtes fillestare
  [1, 0, 1, 1].forEach((b, i) => {
    if (b) doc.rect(bx, y, bw * (i % 2 === 0 ? 1.5 : 0.7), lartesia).fill(C.text);
    bx += bw;
  });

  // Te dhenat
  chars.split('').forEach(c => {
    const v = c.charCodeAt(0);
    for (let bit = 0; bit < bitsPerChar; bit++) {
      const thick = (v >> (bit % 8)) & 1;
      if (bit % 2 === 0) {
        doc.rect(bx, y, thick ? bw * 1.5 : bw * 0.7, lartesia).fill(C.text);
      }
      bx += bw;
    }
  });

  // Mbrojtes fundore
  [1, 0, 1, 1, 1].forEach((b) => {
    if (b) doc.rect(bx, y, bw, lartesia).fill(C.text);
    bx += bw;
  });

  // Teksti poshte barkodit
  doc.fillColor(C.text).font('Courier').fontSize(5.5)
     .text(tekst, x, y + lartesia + 1.5, { width: gjeresia, align: 'center', lineBreak: false });
}

// ─── Shirigu i vlerave referente ─────────────────────────────────────────────
function vizatoRefBar(doc, x, y, vlera, vMin, vMax, flamuri) {
  const barW = 76, barH = 7, barY = y + 1;

  // Sfond gri
  doc.roundedRect(x, barY, barW, barH, 2).fill('#E5E7EB');

  const hasMin = vMin != null && !isNaN(Number(vMin));
  const hasMax = vMax != null && !isNaN(Number(vMax));
  if (!hasMin && !hasMax) return;

  const numMin = hasMin ? Number(vMin) : 0;
  const numMax = hasMax ? Number(vMax) : (hasMin ? Number(vMin) * 2 : 100);
  const extend = Math.max((numMax - numMin) * 0.35, numMax * 0.05, 0.01);
  const totMin = Math.max(0, numMin - extend);
  const totMax = numMax + extend;
  const tot    = totMax - totMin || 1;

  // Zona normale (gjelber)
  const nxS = ((numMin - totMin) / tot) * barW;
  const nxW = Math.max(4, ((numMax - totMin) / tot) * barW - nxS);
  doc.roundedRect(x + nxS, barY + 1.5, nxW, barH - 3, 1).fill('#BBF7D0');

  // Pika e vleres
  if (vlera != null && !isNaN(Number(vlera))) {
    const fi       = flamuriInfo(flamuri);
    const abnorm   = flamuri && flamuri !== 'Normal' && flamuri !== '—' && flamuri !== '-';
    const dotColor = abnorm ? fi.ngjyra : C.normal;
    const dotPos   = Math.max(3.5, Math.min(barW - 3.5, ((Number(vlera) - totMin) / tot) * barW));
    doc.fillColor(dotColor).circle(x + dotPos, barY + barH / 2, 3.5).fill();
  }
}

// ─── HTML → PDF segments ─────────────────────────────────────────────────────
function htmlSegments(html) {
  if (!html) return [];
  const normalized = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '')              // closing </div> → nothing (no extra newline)
    .replace(/<div[^>]*>/gi, '\n')         // opening <div> → newline (paragraph start)
    .replace(/<\/(?:p|li|h[1-6])>/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')           // max one blank line between blocks
    .replace(/^\n+/, '')                  // trim leading newlines
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  const result = [];
  const stack  = [{ bold: false, italic: false, color: null, size: null }];
  const re     = /(<\/?[^>]+>)|([^<]+)/g;
  let m;

  while ((m = re.exec(normalized)) !== null) {
    if (m[2] !== undefined) {
      const cur   = stack[stack.length - 1];
      const parts = m[2].split('\n');
      parts.forEach((part, i) => {
        if (part) result.push({ ...cur, type: 'text', text: part });
        if (i < parts.length - 1) result.push({ type: 'br' });
      });
    } else {
      const tag  = m[1];
      const name = (tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/)?.[1] || '').toLowerCase();
      if (tag.startsWith('</')) {
        if (stack.length > 1) stack.pop();
      } else {
        const cur = { ...stack[stack.length - 1] };
        if (name === 'b' || name === 'strong') cur.bold = true;
        if (name === 'i' || name === 'em')     cur.italic = true;
        if (name === 'span' || name === 'font') {
          const sAttr = tag.match(/style="([^"]*)"/)?.[1] || '';
          const cm = sAttr.match(/color:\s*([^;,)]+)/);
          if (cm) cur.color = cm[1].trim();
          const sm = sAttr.match(/font-size:\s*(\d+(?:\.\d+)?)/);
          if (sm) cur.size = parseFloat(sm[1]) * 0.75; // px to pt
          const legSz = tag.match(/size="(\d)"/)?.[1];
          if (legSz) cur.size = [7.5, 9.75, 12, 13.5, 18, 24, 36][parseInt(legSz) - 1] || 12;
        }
        if (!tag.endsWith('/>')) stack.push(cur);
      }
    }
  }
  return result;
}

function countHtmlLines(html, charsPerLine = 90) {
  if (!html) return 0;
  const isHtml = /<[a-zA-Z]/.test(html);
  if (!isHtml) return html.split('\n').filter(l => l.trim()).length;
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/(?:p|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '');
  // Count each semantic line, accounting for word-wrap of long lines
  return text.split('\n').filter(l => l.trim()).reduce((sum, line) => {
    return sum + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0) || 1;
}

async function imageSourceToBuffer(source) {
  if (!source || typeof source !== 'string') return null;

  const value = source.trim();
  if (!value) return null;

  try {
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value)) {
      return Buffer.from(value.replace(/^data:[^;]+;base64,/i, ''), 'base64');
    }

    if (/^https?:\/\//i.test(value)) {
      const resp = await axios.get(value, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const contentType = String(resp.headers?.['content-type'] || '');
      if (!contentType.startsWith('image/')) return null;
      return Buffer.from(resp.data);
    }

    return Buffer.from(value, 'base64');
  } catch (_) {
    return null;
  }
}

function drawHtmlText(doc, html, x, y, maxW, def = {}) {
  if (!html) return y;
  const isHtml = /<[a-zA-Z]/.test(html);
  const lH = def.lineH || 12;

  if (!isHtml) {
    html.split('\n').filter(l => l.trim()).forEach(line => {
      doc.font(def.font || 'Helvetica').fontSize(def.size || 9)
         .fillColor(def.color || '#111827')
         .text(line, x, y, { width: maxW, lineBreak: false });
      y += lH;
    });
    return y;
  }

  const segs = htmlSegments(html);

  // ── Build flat token list; null = explicit line break ─────────
  const tokens = [];
  segs.forEach(seg => {
    if (seg.type === 'br') { tokens.push(null); return; }
    if (!seg.text) return;
    const fnt = seg.bold && seg.italic ? 'Helvetica-BoldOblique'
              : seg.bold               ? 'Helvetica-Bold'
              : seg.italic             ? 'Helvetica-Oblique'
              :                          (def.font || 'Helvetica');
    const sz  = seg.size  ?? def.size  ?? 9;
    const clr = seg.color ?? def.color ?? '#111827';
    seg.text.split(' ').forEach((word, wi, arr) => {
      const t = wi < arr.length - 1 ? word + ' ' : word;
      if (t.trim()) tokens.push({ text: t, fnt, sz, clr });
    });
  });

  // ── Greedy visual-line wrapping ───────────────────────────────
  const vLines = [[]];
  let lineW = 0;
  tokens.forEach(tok => {
    if (tok === null) { vLines.push([]); lineW = 0; return; }
    doc.font(tok.fnt).fontSize(tok.sz);
    const w = doc.widthOfString(tok.text);
    if (vLines[vLines.length - 1].length > 0 && lineW + w > maxW) {
      vLines.push([]); lineW = 0;
    }
    vLines[vLines.length - 1].push({ ...tok, w });
    lineW += w;
  });

  // ── Render each visual line with PDFKit continued API ─────────
  vLines.forEach(line => {
    if (line.length === 0) { y += lH; return; }
    const maxSz = Math.max(...line.map(t => t.sz));
    const lineH = Math.max(lH, Math.ceil(maxSz * 1.35));

    line.forEach((tok, i) => {
      doc.font(tok.fnt).fontSize(tok.sz).fillColor(tok.clr);
      const opts = { lineBreak: false, continued: i < line.length - 1 };
      i === 0
        ? doc.text(tok.text, x, y, opts)   // first token: absolute position
        : doc.text(tok.text, opts);          // rest: inline continuation
    });
    y += lineH;
  });

  return y;
}

// ─── Matje e sakte e lartesise se HTML text (pa renderim) ───────────────────
function measureHtmlText(doc, html, maxW, def = {}) {
  if (!html) return 0;
  const lH = def.lineH || 12;
  const isHtml = /<[a-zA-Z]/.test(html);
  if (!isHtml) {
    const lines = html.split('\n').filter(l => l.trim());
    if (lines.length === 0) return 0;
    let totalH = 0;
    doc.font(def.font || 'Helvetica').fontSize(def.size || 9);
    lines.forEach(line => {
      totalH += Math.max(lH, Math.ceil(doc.heightOfString(line, { width: maxW })));
    });
    return totalH;
  }
  const segs = htmlSegments(html);
  const tokens = [];
  segs.forEach(seg => {
    if (seg.type === 'br') { tokens.push(null); return; }
    if (!seg.text) return;
    const fnt = seg.bold && seg.italic ? 'Helvetica-BoldOblique'
              : seg.bold               ? 'Helvetica-Bold'
              : seg.italic             ? 'Helvetica-Oblique'
              :                          (def.font || 'Helvetica');
    const sz = seg.size ?? def.size ?? 9;
    seg.text.split(' ').forEach((word, wi, arr) => {
      const t = wi < arr.length - 1 ? word + ' ' : word;
      if (t.trim()) tokens.push({ text: t, fnt, sz });
    });
  });
  const vLines = [[]];
  let lineW = 0;
  tokens.forEach(tok => {
    if (tok === null) { vLines.push([]); lineW = 0; return; }
    doc.font(tok.fnt).fontSize(tok.sz);
    const w = doc.widthOfString(tok.text);
    if (vLines[vLines.length - 1].length > 0 && lineW + w > maxW) {
      vLines.push([]); lineW = 0;
    }
    vLines[vLines.length - 1].push({ ...tok, w });
    lineW += w;
  });
  let totalH = 0;
  vLines.forEach(line => {
    if (line.length === 0) { totalH += lH; return; }
    const maxSz = Math.max(...line.map(t => t.sz));
    totalH += Math.max(lH, Math.ceil(maxSz * 1.35));
  });
  return totalH;
}

// ─── Titulli i kolonave (riperdoret pas faqes se re) ─────────────────────────
function vizatoTabelenKoka(doc, x, W, cols) {
  const thY = doc.y;
  const HEADER_H = 22;
  doc.rect(x, thY, W, HEADER_H).fill(C.primary);
  let cx = x + 4;
  cols.forEach(({ alb, eng, w, align }) => {
    if (alb) {
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(6.5)
         .text(alb, cx, thY + 4,  { width: w, align, lineBreak: false });
      doc.fillColor('#BFD4F0').font('Helvetica').fontSize(5.5)
         .text(eng, cx, thY + 13, { width: w, align, lineBreak: false });
    }
    cx += w + 5;
  });
  doc.y = thY + HEADER_H;
}

// ─── Funksioni kryesor ───────────────────────────────────────────────────────
async function gjeneroRaportPDF(porosi, settings = {}) {
  // ── Pre-process QR code — shfaqet kur tokenPublik ekziston dhe baseUrl është vendosur ──
  let _qrBuf = null;
  const _qrBaseUrl = (settings.qrBaseUrl || '').replace(/\/$/, '');
  if (porosi.tokenPublik && _qrBaseUrl) {
    try {
      const QRCode = require('qrcode');
      const qrUrl  = `${_qrBaseUrl}/r/${porosi.tokenPublik}`;
      _qrBuf = await QRCode.toBuffer(qrUrl, { type: 'png', width: 80, margin: 1 });
    } catch (_) {}
  }

  const logoBuf = await imageSourceToBuffer(settings.logo);
  const nenshkrimetMeBuffer = await Promise.all(
    (settings.nenshkrimet || []).map(async (sig) => ({
      ...sig,
      _fotoBuf: await imageSourceToBuffer(sig?.foto),
    }))
  );

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 35, bottom: 8, left: 40, right: 40 },
      info: {
        Title:   `${porosi.pacienti?.emri || ''} ${porosi.pacienti?.mbiemri || ''} - ${porosi.numrPorosi || ''}`.trim(),
        Author:  settings.emriKlinikes || 'MedLab Pro',
        Subject: 'Raport Laboratorik',
      },
    });

    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Font me mbeshtetje emoji (Segoe UI Symbol) ───────────────
    let HDR_FONT = 'Helvetica-Bold';
    try {
      doc.registerFont('SegoeSym', 'C:/Windows/Fonts/seguisym.ttf');
      HDR_FONT = 'SegoeSym';
    } catch (_) {}

    const W  = doc.page.width - 80;  // 515.28pt
    const PW = doc.page.width;
    const PH = doc.page.height;

    const COL = { test: 115, rez: 135, njesi: 40, ref: 107, bar: 76 };
    const GAP = 5;

    const isPCR   = porosi.departamenti === 'PCR';
    const isMikro = porosi.departamenti === 'Mikrobiologji';

    const COL_PCR = { test: 260, rez: 245 };
    const COL_MIK = { test: 175, rez: W - 175 - GAP };

    const COLS_STD = [
      { alb: 'Analiza',          eng: 'Analysis',       w: COL.test,      align: 'left'   },
      { alb: 'Rezultati',        eng: 'Result',         w: COL.rez,       align: 'center' },
      { alb: 'Njesia',           eng: 'Unit',           w: COL.njesi,     align: 'center' },
      { alb: 'Vlerat referente', eng: 'Referent Value', w: COL.ref,       align: 'center' },
      { alb: '',                 eng: '',               w: COL.bar,       align: 'center' },
    ];
    const COLS_PCR_DEF = [
      { alb: 'Analiza',   eng: 'Analysis', w: COL_PCR.test,   align: 'left'   },
      { alb: 'Rezultati', eng: 'Result',   w: COL_PCR.rez,    align: 'center' },
    ];
    const COLS_MIKRO = [
      { alb: 'Analiza',   eng: 'Analysis', w: COL_MIK.test, align: 'left' },
      { alb: 'Rezultati', eng: 'Result',   w: COL_MIK.rez,  align: 'left' },
    ];
    const COLS_AKT = isPCR ? COLS_PCR_DEF : isMikro ? COLS_MIKRO : COLS_STD;

    const fmtD  = (d) => d ? new Date(d).toLocaleDateString('sq-AL', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
    const fmtDT = (d) => d ? `${fmtD(d)}  ${new Date(d).toLocaleTimeString('sq-AL', { hour:'2-digit', minute:'2-digit', hour12: false })}` : '—';
    const sot   = new Date();

    const qrBuf = _qrBuf;

    // ── Page layout ─────────────────────────────────────────────
    const nenshkrimet  = nenshkrimetMeBuffer;
    const hasPhotos    = nenshkrimet.some(n => n._fotoBuf);
    const SIG_AREA_H   = nenshkrimet.length > 0 ? (hasPhotos ? 95 : 52) : 30;
    const SIG_Y  = PH - SIG_AREA_H - 38;
    const FOOT_Y = PH - 30;
    const CBW    = SIG_Y - 8;  // kufiri i poshtem i permbajtjes

    // ── Funksioni i pacientit (nevojitet heret per pageAdded) ───
    const pac      = porosi.pacienti || {};
    const adresaTxt = [pac.adresa?.qyteti, pac.adresa?.rruga].filter(Boolean).join(', ') || null;
    const emriPac  = `${(pac.mbiemri || '').toUpperCase()}, ${(pac.emri || '').toUpperCase()}`.trim() || '—';

    // ── Footer + Nenshkrime (vizatohet ne cdo faqe) ─────────────
    let faqeNr = 1;
    const vizatoFooterSig = () => {

      // ── Nënshkrimet dinamike ──────────────────────────────────
      if (nenshkrimet.length > 0) {
        const N    = nenshkrimet.length;
        const colW = W / N;

        nenshkrimet.forEach((sig, i) => {
          const sX       = 40 + i * colW;
          const sW       = colW - 6;
          const txtAlign = sig.align === 'right' ? 'right' : 'left';

          // Vija e nënshkrimit
          doc.moveTo(sX, SIG_Y).lineTo(sX + sW, SIG_Y)
             .strokeColor(C.borderDark).lineWidth(0.4).stroke();

          // Emri Mbiemri
          const emriPlote = `${sig.emri} ${sig.mbiemri}`.trim();
          doc.fillColor(C.text).font('Helvetica-Bold').fontSize(7.5)
             .text(emriPlote, sX, SIG_Y + 5, { width: sW, align: txtAlign, lineBreak: false });

          // Titulli
          let nextRowY = SIG_Y + 16;
          if (sig.titulli) {
            doc.fillColor(C.gray).font('Helvetica-Oblique').fontSize(6.5)
               .text(sig.titulli, sX, nextRowY, { width: sW, align: txtAlign, lineBreak: false });
            nextRowY += 11;
          }
          // Licenca (opsionale)
          if (sig.licenca) {
            doc.fillColor(C.gray).font('Helvetica').fontSize(6)
               .text(sig.licenca, sX, nextRowY, { width: sW, align: txtAlign, lineBreak: false });
            nextRowY += 9;
          }

          // Vula/Foto — posht emrit dhe titullit
          if (sig._fotoBuf) {
            try {
              const fW      = Math.min(sW - 4, 90);
              const fH      = 45;
              const imgX    = sig.align === 'right' ? sX + sW - fW : sX;
              doc.image(sig._fotoBuf, imgX, nextRowY, { fit: [fW, fH], align: txtAlign, valign: 'top' });
              nextRowY += fH + 2;
            } catch (_) {}
          }

          // Validim tipi
          const vLabel = sig.validimTipi === 'mjekesor' ? 'Validim Mjekësor' : 'Validim Teknik';
          doc.fillColor(C.gray).font('Helvetica').fontSize(6)
             .text(vLabel, sX, nextRowY, { width: sW, align: txtAlign, lineBreak: false });
        });
      }

      // ── Footer ───────────────────────────────────────────────
      doc.rect(40, FOOT_Y, W, 0.5).fill(C.border);
      if (settings.footer) {
        const footerPlain = settings.footer.replace(/<[^>]+>/g, '').trim();
        doc.fillColor(C.gray).font('Helvetica-Oblique').fontSize(6)
           .text(footerPlain, 40, FOOT_Y - 12, { width: W, align: 'center', lineBreak: false });
      }
      doc.fillColor(C.gray).font('Helvetica').fontSize(5.5)
         .text(`${fmtD(sot)}  |  Faqe ${faqeNr}`, 40, FOOT_Y + 4,
               { width: W, align: 'right', lineBreak: false });
    };

    // ── Mberthelesi faqe e re (LAZY) — faqja krijohet vetem kur ka permbajtje ──
    let skipKolonKoka  = false;
    let startYFaqes    = 0;
    let brakeAshtePritur = false; // lazy break: scheduled but not yet applied

    // Apliko brekin e pritur (shkruaj footer + krijo faqe te re)
    // Thirret para cdo vizatimi te permbajtjes.
    // Kthen true nese nje faqe e re u krijua.
    const zbatoBrakeNesoKa = () => {
      if (!brakeAshtePritur) return false;
      brakeAshtePritur = false;
      // Nese faqja aktuale eshte ende e zbrazet (doc.y ≈ startYFaqes),
      // mos krijo faqe te re — permbajtja shkон direkt ketu.
      if (doc.y <= startYFaqes + 5) return false;
      vizatoFooterSig();
      faqeNr++;
      doc.addPage();
      return true;
    };

    // Planifiko nje brake (nuk e krijon faqen menjehere)
    const faqeRe = () => { brakeAshtePritur = true; };

    // Krijim i menjehershem (per trombofili — gjithmone ka permbajtje pas)
    // Anashkalon kontrollin e faqes zbrazet dhe krijon faqe direkt.
    const faqeReNjehershem = () => {
      brakeAshtePritur = false; // shlyej brake te mbetur
      vizatoFooterSig();
      faqeNr++;
      doc.addPage();
    };

    // ── Linjet e headerit (llogariten nje here, riperdoren) ─────
    const hdrLines = (settings.headerTekst || '').split('\n').map(l => l.trim()).filter(Boolean);

    // ── Header identik me faqen 1 per faqet 2+ (ndizet nga pageAdded) ──
    doc.on('pageAdded', () => {
      doc.rect(0, 0, PW, 3).fill(C.primary);

      const hY = 6;
      const tH = countHtmlLines(settings.headerTekst) * 12;

      // Vije ndarese vertikale
      doc.moveTo(40 + W / 2, hY + 10).lineTo(40 + W / 2, hY + boxH - 10)
         .strokeColor(C.border).lineWidth(0.5).stroke();

      // Logo
      if (logoBuf) {
        try {
          doc.image(logoBuf, 46, hY + 4,
            { fit: [W / 2 - 8, boxH - 8], align: 'center', valign: 'center' });
        } catch (_) {}
      }

      // ── E DJATHTE: Teksti i Header-it (i centruar vertikalisht) ──
      if (settings.headerTekst) {
        const txtX = 40 + W / 2 + 10;
        const txtW = W / 2 - 18;
        const nHdrLines = countHtmlLines(settings.headerTekst);
        const tHdr = nHdrLines * 12;
        const ty0  = hY + Math.max(8, Math.floor((boxH - tHdr) / 2));
        drawHtmlText(doc, settings.headerTekst, txtX, ty0, txtW,
          { font: HDR_FONT, size: 9, color: C.primary, lineH: 12 });
      }

      const bY = hY + boxH + 4;

      // Kutia e pacientit
      doc.rect(40, bY, W, boxH).fill(C.grayLight);
      doc.rect(40, bY, W, boxH).stroke(C.border).lineWidth(0.5);
      doc.rect(40, bY, 3, boxH).fill(C.primary);

      doc.fillColor(C.text).font('Helvetica-Bold').fontSize(12)
         .text(emriPac, 46, bY + 8, { lineBreak: false });

      const lr2 = [
        ['Ditelindja:', 'Date of Birth', pac.datelindja ? `${fmtD(pac.datelindja)}  |  ${mosha}` : '—'],
        ['Gjinia:',     'Gender',        gjinia],
      ];
      if (adresaTxt) lr2.push(['Adresa:', 'Address', adresaTxt]);
      lr2.forEach(([lbl, lblEng, val], i) => {
        const ly = bY + 26 + i * 16;
        doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(6.5).text(lbl,    46,      ly,     { lineBreak: false });
        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(5.5).text(lblEng,   46,      ly + 8, { lineBreak: false });
        doc.fillColor(C.text).font('Helvetica').fontSize(7).text(val,           46 + 68, ly,     { lineBreak: false });
      });

      const rX2 = 40 + W * 0.52;
      const rW2 = (40 + W) - rX2 - 4;
      const bW2 = 76;
      const bX2 = rX2 + rW2 - bW2;
      // Data validimit: shfaqet nese ka te pakten 1 rezultat real, ose validim manual
      const hasAnyResult = (porosi.analizat || []).some(a =>
        (a.rezultate || []).some(r => r.vlera != null && String(r.vlera).trim() !== '')
      );
      const dataValidimitRaw = porosi.validimTeknik?.data
        || porosi.validimMjekesor?.data
        || porosi.dataKompletimit
        || (hasAnyResult ? porosi.updatedAt : null);
      const dataValidimitStr = hasAnyResult && dataValidimitRaw ? fmtD(dataValidimitRaw) : '—';

      [
        ['Data regjistrimit:', 'Registration Date', fmtDT(porosi.dataPorosis)],
        ['Data validimit:',    'Validation Date',   dataValidimitStr],
        ['Referuar nga:',      'Referred by',       referuesEmri],
      ].forEach(([lbl, lblEng, val], i) => {
        const ly = bY + 28 + i * 16;
        doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(6.5).text(lbl,    rX2,      ly,     { lineBreak: false });
        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(5.5).text(lblEng,   rX2,      ly + 8, { lineBreak: false });
        doc.fillColor(C.text).font('Helvetica').fontSize(7).text(val,           rX2 + 82, ly,     { lineBreak: false });
      });

      vizatoBarcode(doc, porosi.numrPorosi || '', bX2, bY + 28, bW2, 3 * 16 - 8);

      if (porosi.urgente) {
        const uX = 40 + W - 46;
        const uY = bY + 6;
        doc.roundedRect(uX, uY, 42, 11, 2).fill('#FEF2F2');
        doc.roundedRect(uX, uY, 42, 11, 2).stroke('#DC2626').lineWidth(0.5);
        doc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(6)
           .text('URGJENT', uX, uY + 3, { width: 42, align: 'center', lineBreak: false });
      }

      doc.y = bY + boxH + 4;
      if (!skipKolonKoka) vizatoTabelenKoka(doc, 40, W, COLS_AKT);
      startYFaqes = doc.y; // ruaj Y-ne e fillimit te permbajtjes per kete faqe
    });

    // ── Llogarit lartesine e kutise pacientit (nevojitet para header) ──
    const llogaritMoshen = (datelindja) => {
      if (!datelindja) return '—';
      const lindur = new Date(datelindja);
      let vit = sot.getFullYear() - lindur.getFullYear();
      let mua = sot.getMonth()   - lindur.getMonth();
      let dit = sot.getDate()    - lindur.getDate();
      if (dit < 0) { const kM = new Date(sot.getFullYear(), sot.getMonth(), 0).getDate(); dit += kM; mua--; }
      if (mua < 0) { mua += 12; vit--; }
      if (vit >= 2)  return `${vit} vjec`;
      if (vit === 1) return mua === 0 ? '1 vit' : `1 vit e ${mua} muaj`;
      if (mua >= 1)  return dit === 0 ? `${mua} muaj` : `${mua} muaj e ${dit} dite`;
      return `${Math.floor((sot - new Date(datelindja)) / 86400000)} dite`;
    };

    const refExt = porosi.referuesId;
    let referuesEmri;
    if (!refExt || refExt.eshteDefault) {
      referuesEmri = settings.referuesiDefault || 'Vetë ardhur';
    } else {
      referuesEmri = (refExt.institucioni || `${refExt.emri || ''} ${refExt.mbiemri || ''}`.trim()) || settings.referuesiDefault || 'Vetë ardhur';
    }

    const mosha  = llogaritMoshen(pac.datelindja);
    const gjinia = pac.gjinia === 'M' ? 'M (Mashkull)' : pac.gjinia === 'F' ? 'F (Femer)' : '—';

    const leftRows = 2 + (adresaTxt ? 1 : 0);
    const patBoxH  = Math.max(25 + leftRows * 16 + 10, 28 + 3 * 16 + 15);

    // Masa saktë lartësinë e tekstit të headerit për ta zgjeruar boxin nëse nevojitet
    const txtColW  = W / 2 - 18;
    const hdrTxtH  = settings.headerTekst
      ? measureHtmlText(doc, settings.headerTekst, txtColW, { font: HDR_FONT, size: 9, lineH: 13 }) + 16
      : 0;
    const boxH     = Math.max(patBoxH, hdrTxtH);

    // ══════════════════════════════════════════════════════════════
    // 1. HEADER FAQES SE PARE  (majte: logo | djathte: tekst)
    //    — lartesia = boxH (e njejte me kutine e pacientit ose me e madhe)
    // ══════════════════════════════════════════════════════════════

    doc.rect(0, 0, PW, 3).fill(C.primary);

    const HDR_Y = 6;
    const HDR_H = boxH;

    // Vije ndarese vertikale mes logos dhe tekstit (pa kuti te jashtme)
    doc.moveTo(40 + W / 2, HDR_Y + 10).lineTo(40 + W / 2, HDR_Y + HDR_H - 10)
       .strokeColor(C.border).lineWidth(0.5).stroke();

    // ── E MAJTE: Logo — sa kontejneri, ruan proporcionin ────────
    if (logoBuf) {
      try {
        doc.image(logoBuf, 46, HDR_Y + 2,
          { fit: [W / 2 - 6, HDR_H - 4], align: 'center', valign: 'center' });
      } catch (_) {}
    }

    // ── E DJATHTE: Teksti — i centruar vertikalisht ──────────────
    if (settings.headerTekst) {
      const txtX  = 40 + W / 2 + 10;
      const tHdr  = hdrTxtH - 16;
      const ty0   = HDR_Y + Math.max(6, Math.floor((HDR_H - tHdr) / 2));
      drawHtmlText(doc, settings.headerTekst, txtX, ty0, txtColW,
        { font: HDR_FONT, size: 9, color: C.primary, lineH: 13 });
    }

    const curY = HDR_Y + HDR_H;
    const boxY = curY + 4;

    doc.rect(40, boxY, W, boxH).fill(C.grayLight);
    doc.rect(40, boxY, W, boxH).stroke(C.border).lineWidth(0.5);
    doc.rect(40, boxY, 3, boxH).fill(C.primary);

    const bcX = 46;
    doc.fillColor(C.text).font('Helvetica-Bold').fontSize(12)
       .text(emriPac, bcX, boxY + 8, { lineBreak: false });

    const leftRowData = [
      ['Ditelindja:', 'Date of Birth', pac.datelindja ? `${fmtD(pac.datelindja)}  |  ${mosha}` : '—'],
      ['Gjinia:',     'Gender',        gjinia],
    ];
    if (adresaTxt) leftRowData.push(['Adresa:', 'Address', adresaTxt]);
    leftRowData.forEach(([lbl, lblEng, val], i) => {
      const ly = boxY + 26 + i * 16;
      doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(6.5).text(lbl,    bcX,      ly,     { lineBreak: false });
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(5.5).text(lblEng,   bcX,      ly + 8, { lineBreak: false });
      doc.fillColor(C.text).font('Helvetica').fontSize(7).text(val,           bcX + 68, ly,     { lineBreak: false });
    });

    const rX    = 40 + W * 0.52;
    const rW    = (40 + W) - rX - 4;
    const BARC_W = 76;
    const barcX = rX + rW - BARC_W;
    const BARC_H = 3 * 16 - 8;

    [
      ['Data regjistrimit:', 'Registration Date', fmtDT(porosi.dataPorosis)],
      ['Data validimit:',    'Validation Date',   porosi.dataKompletimit ? fmtD(porosi.dataKompletimit) : '—'],
      ['Referuar nga:',      'Referred by',       referuesEmri],
    ].forEach(([lbl, lblEng, val], i) => {
      const ly = boxY + 28 + i * 16;
      doc.fillColor(C.gray).font('Helvetica-Bold').fontSize(6.5).text(lbl,    rX,      ly,     { lineBreak: false });
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(5.5).text(lblEng,   rX,      ly + 8, { lineBreak: false });
      doc.fillColor(C.text).font('Helvetica').fontSize(7).text(val,           rX + 82, ly,     { lineBreak: false });
    });

    // Nëse QR aktiv, zvogëlo barcodin dhe shto QR code djathtas
    if (qrBuf) {
      const QR_W = 44;
      const bcW  = BARC_W - QR_W - 4;
      vizatoBarcode(doc, porosi.numrPorosi || '', barcX, boxY + 28, bcW, BARC_H);
      try {
        doc.image(qrBuf, barcX + bcW + 4, boxY + 26, { width: QR_W });
      } catch (_) {}
    } else {
      vizatoBarcode(doc, porosi.numrPorosi || '', barcX, boxY + 28, BARC_W, BARC_H);
    }

    if (porosi.urgente) {
      const urgX = 40 + W - 46;
      const urgY = boxY + 6;
      doc.roundedRect(urgX, urgY, 42, 11, 2).fill('#FEF2F2');
      doc.roundedRect(urgX, urgY, 42, 11, 2).stroke('#DC2626').lineWidth(0.5);
      doc.fillColor('#DC2626').font('Helvetica-Bold').fontSize(6)
         .text('URGJENT', urgX, urgY + 3, { width: 42, align: 'center', lineBreak: false });
    }

    doc.y = boxY + boxH + 4;
    vizatoTabelenKoka(doc, 40, W, COLS_AKT);
    startYFaqes = doc.y; // Y-ja e fillimit te permbajtjes per faqen 1

    // ══════════════════════════════════════════════════════════════
    // 2. REZULTATET — grupuara sipas profilit
    // ══════════════════════════════════════════════════════════════

    const grupetPDF = (() => {
      const map = new Map();
      (porosi.analizat || []).filter(row => row.shfaqNeRaport !== false).forEach(row => {
        const key = row.profiliEmri || row.analiza?.profiliId?.emri || null;
        if (!map.has(key)) map.set(key, {
          profiliEmri: key,
          profiliId:   row.profiliId,
          numrRendor:  row.analiza?.profiliId?.numrRendor ?? 999,
          analizat:    [],
          faqePas:     false,
        });
        map.get(key).analizat.push(row);
      });
      const allValues = [...map.values()];

      const eshteHemogram = (n) => /hemogram|hematolog/i.test(n || '');
      const eshteSediment = (n) => /sediment/i.test(n || '');
      const eshteUrina    = (n) => /urin/i.test(n || '');

      // Hematologji (hemogram + sediment) gjithmone faqe 1, Urina gjithmone e fundit
      const hemogrami  = allValues.filter(g =>  g.profiliEmri && (eshteHemogram(g.profiliEmri) || eshteSediment(g.profiliEmri)));
      const urina      = allValues.filter(g =>  g.profiliEmri && eshteUrina(g.profiliEmri));
      const tjerat     = allValues
        .filter(g => g.profiliEmri && !eshteHemogram(g.profiliEmri) && !eshteSediment(g.profiliEmri) && !eshteUrina(g.profiliEmri))
        .sort((a, b) => (a.numrRendor ?? 999) - (b.numrRendor ?? 999));
      const ungrouped  = allValues.filter(g => !g.profiliEmri);

      const merged = [...hemogrami, ...tjerat, ...ungrouped, ...urina];

      // Page-break pas hematologjise/sedimentit — profilet tjera fillojne nga faqe 2
      const kaHemogram = hemogrami.length > 0;
      const kaTjera    = tjerat.length > 0 || ungrouped.length > 0 || urina.length > 0;
      if (kaHemogram && kaTjera) {
        hemogrami.forEach(g => { g.faqePas = false; });
        hemogrami[hemogrami.length - 1].faqePas = true; // break pas grupit te fundit hematologji
      }
      // Sheno page-break pas grupit te fundit para Urines
      if (urina.length > 0) {
        const idxParaUrines = merged.length - urina.length - 1;
        if (idxParaUrines >= 0) merged[idxParaUrines].faqePas = true;
      }

      return merged;
    })();

    // Llogarit lartesine e nje rreshti analize (per keep-together)
    const komH = (k) => {
      if (!k) return 0;
      const n = /<[a-zA-Z]/.test(k) ? Math.max(1, countHtmlLines(k)) : 1;
      return Math.max(14, 6 + n * 9);
    };

    // Lartesia e linjës së parë (vetëm kjo linjë merr background ngjyrë)
    const primeLinjePH = (html, defaultSz = 6.5) => {
      if (!html || !/<[a-zA-Z]/.test(html)) return 14;
      const segs = htmlSegments(html);
      let maxSz = defaultSz;
      for (const s of segs) {
        if (s.type === 'br') break;
        if (s.type === 'text' && s.size != null) maxSz = Math.max(maxSz, s.size);
      }
      return Math.max(14, maxSz + 6);
    };

    const eshteTrombofilia = (n) => /trombofil/i.test(n || '');
    const trombofiliKomentet = [];  // {row, grup} — renderohen faqe të veçanta

    const LHDR = 9; // lartesia e labelit "Koment:" / "Interpretim mjekësor:"
    const komW = W - 10; // gjeresia e zones se komentit
    const komentLartesia = (k) =>
      k ? measureHtmlText(doc, k, komW, { font: 'Helvetica-Oblique', size: 6.5, lineH: 9 }) + LHDR + 12 : 0;

    const estimoAnalizen = (row, skipKoment = false) => {
      const rez = row.rezultate || [];
      if (rez.length === 0) return 17;
      if (isPCR || isMikro) {
        let h = rez.length * 15 + 3;
        if (!skipKoment) h += rez.reduce((s, r) => s + komentLartesia(r.koment), 0);
        if (isMikro) {
          const abRez = row.antibiogram?.rezultate || [];
          if (abRez.length > 0) h += 4 + 16 + 13 + abRez.length * 13 + 13;
        }
        return h;
      }
      const an = row.analiza || {};
      // Prefer locked snapshot (set at result entry time) over live catalog data
      const kompSrc = row.komponenteSnapshot?.length ? row.komponenteSnapshot : (an.komponente || []);
      let h = rez.reduce((s, r) => {
        const kd = kompSrc.find(k => k.emri === r.komponenti)
          || (kompSrc.length === 1 ? kompSrc[0] : null);
        const nVlerat  = kd?.vlerat?.length || 0;
        const nRresht  = Math.max(1, Math.ceil(String(r.vlera || '').length / 11));
        const vleraH   = nRresht * 10;
        // Estimate name wrap: ~18 chars fit in COL.test=115pt at 7.5px
        const emriTxt  = r.komponenti || an.emri || '';
        const nEmriR   = Math.max(1, Math.ceil(emriTxt.length / 18));
        const testHEst = nEmriR * 10;
        const rowH = Math.max(15 + nVlerat * 9, vleraH + 8, testHEst + 8);
        const komentH = (!skipKoment && r.koment) ? komentLartesia(r.koment) : 0;
        return s + rowH + komentH;
      }, 0);
      h += 3;
      if ((an.intervale || []).length > 0) h += 35;
      // Antibiogram
      const abRez = row.antibiogram?.rezultate || [];
      if (abRez.length > 0) h += 4 + 16 + 13 + abRez.length * 13 + 13;
      return h;
    };

    let riGlobal = 0;

    grupetPDF.forEach((grup, gi) => {
      const eshteProf    = !!grup.profiliEmri;
      const profHdrH     = eshteProf ? 34 : 0; // header profili + margin
      const isTromboGrup = eshteTrombofilia(grup.profiliEmri);

      // Llogarit lartesine totale te grupit (komentet e trombofilia nuk llogariten ketu)
      const grupH = profHdrH + grup.analizat.reduce((s, r) => s + estimoAnalizen(r, isTromboGrup), 0);

      // Mbaj grupin komplet ne te njejten faqe nese mundesohet
      // (mos thyej faqe nese jemi ne fillim te faqes — shmang faqe boshe)
      // Pragu 35: me i madh se profHdrH (34pt) per te shmangur cascade group+row break
      if (doc.y + grupH > CBW && doc.y > startYFaqes + 35) faqeRe();

      // ── Header i profilit ───────────────────────────────────
      const tregoProfHdr = () => {
        if (!eshteProf) return;
        zbatoBrakeNesoKa(); // apliko brekin e pritur PARA vizatimit
        doc.y += 5;
        const phY = doc.y;
        const phH = 17;
        doc.rect(40, phY, W, phH).fill(C.grayMid);
        doc.rect(40, phY, W, phH).stroke(C.border).lineWidth(0.3);
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9)
           .text((grup.profiliEmri || '').toUpperCase(), 40, phY + 4,
                 { width: W, align: 'center', lineBreak: false });
        doc.y = phY + phH + 2;
      };
      tregoProfHdr();

      grup.analizat.forEach(row => {
        const analiza   = row.analiza || {};
        const rezultate = row.rezultate || [];

        const rowEst     = estimoAnalizen(row, isTromboGrup);
        const profHdrEst = eshteProf ? 24 : 0;

        // Planifiko brake nese rreshti nuk futet ne faqen aktuale.
        // Pragu profHdrEst+10: pas tregoProfHdr(24pt) doc.y=startY+24;
        // 24 > 24+10=34 eshte FALSE → shmang thyerje te menjehershme pas headerit.
        if (doc.y + rowEst > CBW && doc.y > startYFaqes + profHdrEst + 10 && rowEst + profHdrEst < CBW - startYFaqes) {
          faqeRe(); // lazy — nuk krijon faqen menjehere
        }

        // Apliko brekin e pritur (nese ka) PARA se te vizatojme permbajtjen
        const u = zbatoBrakeNesoKa();
        if (u) tregoProfHdr(); // ri-vizato header profilit ne faqen e re

        // ── Rreshtat e rezultateve ──────────────────────────────
        // Konsidero "pa vlera" nëse array bosh OSE asnjë komponent s'ka vlera reale
        // (null/"" → Ne proces; 0 është vlerë e vlefshme)
        const kaVlera = rezultate.some(r => r.vlera != null && String(r.vlera).trim() !== '');
        if (rezultate.length === 0 || !kaVlera) {
          const rY       = doc.y;
          const emriNP   = analiza.emri || '—';
          const emriNPH  = Math.ceil(doc.font('Helvetica').fontSize(7.5).heightOfString(emriNP, { width: COL.test }));
          const rowNPH   = Math.max(14, emriNPH + 8);
          doc.rect(40, rY, W, rowNPH).fill(riGlobal % 2 === 0 ? C.white : C.grayLight);
          doc.fillColor(C.text).font('Helvetica').fontSize(7.5)
             .text(emriNP, 46, rY + 4, { width: COL.test });
          doc.fillColor(C.gray).font('Helvetica-Oblique').fontSize(7)
             .text('— Ne proces', 46 + COL.test + GAP, rY + 4, { lineBreak: false });
          doc.y = rY + rowNPH;
          riGlobal++;
        } else if (isMikro) {
          rezultate.forEach(r => {
            const rY       = doc.y;
            const vleraStr  = r.vlera != null ? String(r.vlera) : '—';
            const emriStrM  = r.komponenti || analiza.emri || '—';
            const vleraH    = Math.ceil(
              doc.font('Helvetica-Bold').fontSize(9).heightOfString(vleraStr, { width: COL_MIK.rez })
            );
            const testHM    = Math.ceil(
              doc.font('Helvetica').fontSize(7.5).heightOfString(emriStrM, { width: COL_MIK.test })
            );
            const ROW_H = Math.max(15, vleraH + 8, testHM + 8);
            const textY = rY + 4;
            const bg    = riGlobal % 2 === 0 ? C.white : C.grayLight;
            const isPoz = /pozitiv/i.test(vleraStr);
            const isNeg = /negativ/i.test(vleraStr);
            const rezColor = isPoz ? C.larte : isNeg ? C.normal : C.text;

            doc.rect(40, rY, W, ROW_H).fill(bg);
            doc.fillColor(C.text).font('Helvetica').fontSize(7.5)
               .text(emriStrM, 44, textY, { width: COL_MIK.test });
            doc.fillColor(rezColor).font('Helvetica-Bold').fontSize(9)
               .text(vleraStr, 44 + COL_MIK.test + GAP, textY,
                     { width: COL_MIK.rez, align: 'left', lineBreak: false });
            doc.y = rY + ROW_H;
            doc.moveTo(40, doc.y).lineTo(40 + W, doc.y)
               .strokeColor(C.border).lineWidth(0.2).stroke();
            riGlobal++;
            // Comment
            if (r.koment) {
              const kH   = komentLartesia(r.koment);
              const komY = doc.y;
              doc.rect(40, komY, W, kH).fill('#FFFBEB');
              doc.fillColor(C.textMid).font('Helvetica-Bold').fontSize(6.5)
                 .text('Koment:', 46, komY + 3, { lineBreak: false });
              const contentY = komY + 3 + LHDR;
              drawHtmlText(doc, r.koment, 46, contentY, komW,
                { font: 'Helvetica-Oblique', size: 6.5, color: C.text, lineH: 9 });
              doc.y = komY + kH;
            }
          });
        } else if (isPCR) {
          rezultate.forEach(r => {
            const rY       = doc.y;
            const vleraStr  = r.vlera != null ? String(r.vlera) : '—';
            const emriStrP  = r.komponenti || analiza.emri || '—';
            const vleraH    = Math.ceil(
              doc.font('Helvetica-Bold').fontSize(8).heightOfString(vleraStr, { width: COL_PCR.rez })
            );
            const testHP    = Math.ceil(
              doc.font('Helvetica').fontSize(7.5).heightOfString(emriStrP, { width: COL_PCR.test })
            );
            const ROW_H  = Math.max(15, vleraH + 8, testHP + 8);
            const textY  = rY + 4;
            const fi     = flamuriInfo(r.flamuri);
            const abnorm = r.flamuri && r.flamuri !== 'Normal' && r.flamuri !== '—' && r.flamuri !== '-';
            const bg     = riGlobal % 2 === 0 ? C.white : C.grayLight;

            doc.rect(40, rY, W, ROW_H).fill(bg);

            let cx = 44;
            doc.fillColor(C.text).font('Helvetica').fontSize(7.5)
               .text(emriStrP, cx, textY, { width: COL_PCR.test });
            cx += COL_PCR.test + GAP;

            doc.fillColor(abnorm ? fi.ngjyra : C.text).font('Helvetica-Bold').fontSize(8)
               .text(vleraStr, cx, textY, { width: COL_PCR.rez, align: 'center', lineBreak: false });
            cx += COL_PCR.rez + GAP;

            doc.y = rY + ROW_H;
            doc.moveTo(40, doc.y).lineTo(40 + W, doc.y)
               .strokeColor(C.border).lineWidth(0.2).stroke();
            riGlobal++;
            // Koment per komponent (PCR)
            if (r.koment) {
              if (isTromboGrup) {
                trombofiliKomentet.push({ row, r, grup });
              } else {
                const kH   = komentLartesia(r.koment);
                const komY = doc.y;
                doc.rect(40, komY, W, kH).fill('#FFFBEB');
                doc.fillColor(C.textMid).font('Helvetica-Bold').fontSize(6.5)
                   .text('Koment:', 46, komY + 3, { lineBreak: false });
                const contentY = komY + 3 + LHDR;
                drawHtmlText(doc, r.koment, 46, contentY, komW,
                  { font: 'Helvetica-Oblique', size: 6.5, color: C.text, lineH: 9 });
                doc.y = komY + kH;
              }
            }
          });
        } else {
          // Use locked reference snapshot when available (set at result-entry time),
          // otherwise fall back to the live catalog — ensures historical PDF accuracy.
          const refKomponentet = row.komponenteSnapshot?.length
            ? row.komponenteSnapshot
            : (analiza.komponente || []);

          // Llogarit moshën numerike nga datelindja nëse virtuale .mosha nuk është e disponueshme (lean query)
          const moshaNum = (pac.mosha != null && !isNaN(pac.mosha))
            ? pac.mosha
            : (pac.datelindja ? (() => {
                const sot = new Date();
                const d   = new Date(pac.datelindja);
                let age   = sot.getFullYear() - d.getFullYear();
                const m   = sot.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && sot.getDate() < d.getDate())) age--;
                return age;
              })() : null);

          rezultate.forEach(r => {
            const kompData       = refKomponentet.find(k => k.emri === r.komponenti)
              || (refKomponentet.length === 1 ? refKomponentet[0] : null);
            const teGjithaVlerat = filtroVlerat(kompData?.vlerat || [], pac.gjinia, moshaNum);
            const vlera0         = teGjithaVlerat[0] || null;
            const extraVlerat    = teGjithaVlerat.slice(1);

            const rY        = doc.y;
            const nVlerat   = teGjithaVlerat.length;
            const refH      = nVlerat > 0 ? 8 + (nVlerat - 1) * 9 : 8;
            const vleraStr0 = r.vlera != null ? String(r.vlera) : '—';
            const emriStr0  = r.komponenti || analiza.emri || '—';
            const vleraH    = Math.ceil(
              doc.font('Helvetica-Bold').fontSize(8).heightOfString(vleraStr0, { width: COL.rez })
            );
            const testH     = Math.ceil(
              doc.font('Helvetica').fontSize(7.5).heightOfString(emriStr0, { width: COL.test })
            );
            const ROW_H     = Math.max(15 + nVlerat * 9, vleraH + 8, testH + 8);
            const textY     = rY + 4;

            const fi     = flamuriInfo(r.flamuri);
            const abnorm = r.flamuri && r.flamuri !== 'Normal' && r.flamuri !== '—' && r.flamuri !== '-';
            const bg     = riGlobal % 2 === 0 ? C.white : C.grayLight;

            doc.rect(40, rY, W, ROW_H).fill(bg);
            if (abnorm) doc.rect(40, rY, 2, ROW_H).fill(fi.ngjyra);

            let cx = 44;
            doc.fillColor(C.text).font('Helvetica').fontSize(7.5)
               .text(emriStr0, cx, textY, { width: COL.test });
            cx += COL.test + GAP;

            doc.fillColor(abnorm ? fi.ngjyra : C.text).font('Helvetica-Bold').fontSize(8)
               .text(vleraStr0, cx, textY, { width: COL.rez, align: 'center', lineBreak: false });
            cx += COL.rez + GAP;

            doc.fillColor(C.textMid).font('Helvetica').fontSize(7)
               .text(r.njesia || '', cx, textY, { width: COL.njesi, align: 'center', lineBreak: false });
            cx += COL.njesi + GAP;

            const hasMin = r.vleraMin != null && !isNaN(r.vleraMin);
            const hasMax = r.vleraMax != null && !isNaN(r.vleraMax);
            let mainRef = '—';
            if (vlera0) {
              const vt = fmtVleraRef(vlera0);
              mainRef = vlera0.etiketa ? `${vt} ${vlera0.etiketa}` : vt;
            } else if (hasMin && hasMax) { mainRef = `${r.vleraMin}–${r.vleraMax}`; }
            else if (!hasMin && hasMax)  { mainRef = `< ${r.vleraMax}`; }
            else if (hasMin && !hasMax)  { mainRef = `> ${r.vleraMin}`; }
            doc.fillColor(C.gray).font('Helvetica').fontSize(6.5)
               .text(mainRef, cx, textY, { width: COL.ref, align: 'center', lineBreak: false });

            extraVlerat.forEach((vl, vi) => {
              const vt = fmtVleraRef(vl);
              doc.fillColor(C.gray).font('Helvetica').fontSize(6)
                 .text(vl.etiketa ? `${vt} ${vl.etiketa}` : vt,
                       cx, textY + 9 * (vi + 1), { width: COL.ref, align: 'center', lineBreak: false });
            });
            cx += COL.ref + GAP;

            if (hasMin || hasMax)
              vizatoRefBar(doc, cx, textY - 1, r.vlera, r.vleraMin, r.vleraMax, r.flamuri);

            doc.y = rY + ROW_H;
            doc.moveTo(40, doc.y).lineTo(40 + W, doc.y)
               .strokeColor(C.border).lineWidth(0.2).stroke();
            riGlobal++;
            // Koment per komponent (standard)
            if (r.koment) {
              if (isTromboGrup) {
                trombofiliKomentet.push({ row, r, grup });
              } else {
                const kH   = komentLartesia(r.koment);
                const komY = doc.y;
                doc.rect(40, komY, W, kH).fill('#FFFBEB');
                doc.fillColor(C.textMid).font('Helvetica-Bold').fontSize(6.5)
                   .text('Koment:', 46, komY + 3, { lineBreak: false });
                const contentY = komY + 3 + LHDR;
                drawHtmlText(doc, r.koment, 46, contentY, komW,
                  { font: 'Helvetica-Oblique', size: 6.5, color: C.text, lineH: 9 });
                doc.y = komY + kH;
              }
            }
          });
        }

        // ── Intervale klinike ───────────────────────────────────
        if ((analiza.intervale || []).length > 0) {
          doc.y += 4;
          doc.fillColor(C.gray).font('Helvetica').fontSize(6)
             .text(`Zonat klinike — ${analiza.emri}:`, 44, doc.y, { lineBreak: false });
          doc.y += 9;
          const invCount = analiza.intervale.length;
          const invW     = Math.floor((W - (invCount - 1) * 4) / invCount);
          let invX = 40;
          analiza.intervale.forEach(inv => {
            const ng = INV_COLORS[inv.ngjyra] || C.gray;
            doc.roundedRect(invX, doc.y, invW, 20, 2).fill(ng + '18');
            doc.rect(invX, doc.y, invW, 3).fill(ng);
            doc.fillColor(ng).font('Helvetica-Bold').fontSize(6)
               .text(inv.etiketa || '', invX + 2, doc.y + 7, { width: invW - 4, align: 'center', lineBreak: false });
            const v1 = inv.vleraMin ?? '', v2 = inv.vleraMax ?? '', u = inv.njesia || '';
            const rt = inv.operatori === 'midis' ? `${v1}–${v2} ${u}` :
                       inv.operatori === 'me_pak' ? `< ${v1} ${u}` :
                       inv.operatori === 'me_pak_baraz' ? `≤ ${v1} ${u}` :
                       inv.operatori === 'me_shum_baraz' ? `≥ ${v1} ${u}` :
                       inv.operatori === 'me_shum' ? `> ${v1} ${u}` : `${v1} ${u}`;
            doc.fillColor(C.textMid).font('Helvetica').fontSize(5.5)
               .text(rt.trim(), invX + 2, doc.y + 13, { width: invW - 4, align: 'center', lineBreak: false });
            invX += invW + 4;
          });
          doc.y += 26;
        }

        // ── Antibiogram (Mikrobiologji) ───────────────────────────
        const abRez = row.antibiogram?.rezultate || [];
        if (abRez.length > 0) {
          const abGrupiEmri = row.antibiogram.grupiEmri || 'Antibiogram';
          // Header band
          doc.y += 4;
          const abHdrY = doc.y;
          doc.rect(40, abHdrY, W, 16).fill('#ECFDF5');
          doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7.5)
             .text('Antibiogrami', 46, abHdrY + 4, { lineBreak: false });
          doc.y = abHdrY + 16;
          // Column header
          const AB_NW = W - 70;
          const abColY = doc.y;
          doc.rect(40, abColY, W, 13).fill(C.primary);
          doc.fillColor(C.white).font('Helvetica-Bold').fontSize(6)
             .text('Antibiotiku', 46, abColY + 3.5, { width: AB_NW, lineBreak: false });
          doc.fillColor(C.white).font('Helvetica-Bold').fontSize(6)
             .text('Rezultati', 40 + AB_NW + 4, abColY + 3.5, { width: 60, align: 'center', lineBreak: false });
          doc.y = abColY + 13;
          // Antibiotic rows
          const abClrMap = { S: '#16A34A', I: '#D97706', R: '#DC2626' };
          abRez.forEach((ab, ai) => {
            const abRowY = doc.y;
            const abBg   = ai % 2 === 0 ? C.white : C.grayLight;
            doc.rect(40, abRowY, W, 13).fill(abBg);
            doc.fillColor(C.text).font('Helvetica').fontSize(7)
               .text(ab.antibiotiku || '', 46, abRowY + 3, { width: AB_NW, lineBreak: false });
            if (ab.vlera) {
              doc.fillColor(abClrMap[ab.vlera] || C.gray).font('Helvetica-Bold').fontSize(8)
                 .text(ab.vlera, 40 + AB_NW + 4, abRowY + 2.5, { width: 60, align: 'center', lineBreak: false });
            }
            doc.moveTo(40, abRowY + 13).lineTo(40 + W, abRowY + 13)
               .strokeColor(C.border).lineWidth(0.2).stroke();
            doc.y = abRowY + 13;
          });
          // Legend
          const legY = doc.y + 3;
          doc.fillColor(C.gray).font('Helvetica').fontSize(5.5)
             .text('S – Sensitiv     I – Intermediar     R – Rezistent', 46, legY, { lineBreak: false });
          doc.y = legY + 9;
        }

        // ── Ndares vizual ndermjet analizave ────────────────────
        const sepY = doc.y;
        doc.rect(40, sepY, W, 3).fill('#E5E7EB');
        doc.y = sepY + 3;
      });

      // ── Koment i profilit ───────────────────────────────────────
      const komentProf = (porosi.komentetProfileve || []).find(k =>
        k.profiliId && String(k.profiliId) === String(grup.profiliId)
      );
      // Trombofilia: faqja 1 = vetem tabela e rezultateve, komentet shkojne ne faqe te vecanta
      if (komentProf?.koment && !isTromboGrup) {
        const kpH  = komentLartesia(komentProf.koment);
        const kpY  = doc.y;
        doc.rect(40, kpY, W, kpH).fill('#F5F3FF');
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(6.5)
           .text('Interpretim mjekësor:', 46, kpY + 3, { lineBreak: false });
        const contentY = kpY + 3 + LHDR;
        drawHtmlText(doc, komentProf.koment, 46, contentY, komW,
          { font: 'Helvetica-Oblique', size: 6.5, color: C.text, lineH: 9 });
        doc.y = kpY + kpH;
      }

      if (eshteProf) doc.y += 3;

      // Page-break pas ketij grupi (Hemogram pas vetes, ose para Urines)
      if (grup.faqePas && gi < grupetPDF.length - 1) faqeRe();
    });

    // ══════════════════════════════════════════════════════════════
    // 3. FAQET E KOMENTEVE — Trombofilia (1 koment = 1 faqe e vecante)
    // ══════════════════════════════════════════════════════════════
    if (trombofiliKomentet.length > 0) {
      // Rendit sipas numrRendorNeProfil te analizes
      trombofiliKomentet.sort((a, b) =>
        (a.row.analiza?.numrRendorNeProfil ?? 0) - (b.row.analiza?.numrRendorNeProfil ?? 0)
      );

      skipKolonKoka = true; // faqet e komenteve nuk kane header Analiza/Rezultati

      // Maksimum 12 faqe komentesh (1 per komponent me koment)
      trombofiliKomentet.slice(0, 12).forEach(({ row, r, grup }) => {
        faqeReNjehershem();  // footer faqes aktuale + faqe e re (gjithmone ka permbajtje pas)

        const analiza = row.analiza || {};

        // Banner i profilit
        const phY = doc.y;
        doc.rect(40, phY, W, 17).fill(C.grayMid);
        doc.rect(40, phY, W, 17).stroke(C.border).lineWidth(0.3);
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(9)
           .text((grup.profiliEmri || '').toUpperCase(), 40, phY + 4,
                 { width: W, align: 'center', lineBreak: false });
        doc.y = phY + 17 + 4;

        // Titulli i komponentit + rezultati (header i komentit)
        const komponentiEmri = r.komponenti || analiza.emri || '—';
        const vleraStr       = r.vlera != null ? String(r.vlera) : '';
        const anaH  = vleraStr ? 30 : 17;
        const anaY  = doc.y;
        doc.rect(40, anaY, W, anaH).fill(C.grayLight);
        doc.rect(40, anaY, W, anaH).stroke(C.border).lineWidth(0.3);
        doc.rect(40, anaY, 3, anaH).fill(C.primary);
        doc.fillColor(C.primary).font('Helvetica-Bold').fontSize(8.5)
           .text(komponentiEmri, 46, anaY + 5, { lineBreak: false });
        if (vleraStr) {
          const fi       = flamuriInfo(r.flamuri);
          const isAbnorm = r.flamuri && r.flamuri !== 'Normal' && r.flamuri !== '—';
          doc.fillColor(isAbnorm ? fi.ngjyra : C.textMid).font('Helvetica').fontSize(7.5)
             .text(vleraStr, 46, anaY + 17, { lineBreak: false });
        }
        doc.y = anaY + anaH + 10;

        // Teksti i komentit
        const newY = drawHtmlText(doc, r.koment, 46, doc.y, W - 20,
          { font: 'Helvetica', size: 9, color: C.text, lineH: 13 });
        doc.y = newY;
      });

      skipKolonKoka = false;
    }

    // ══════════════════════════════════════════════════════════════
    // 4. FOOTER + NENSHKRIME faqja e fundit
    // Nese ka brake te pritur (nuk u zbatua sepse nuk pati permbajtje), hidhe —
    // mos krijo faqe te zbrazet. Vizato footer vetem ne faqen aktuale (me permbajtje).
    // ══════════════════════════════════════════════════════════════
    brakeAshtePritur = false; // hidhe ndonje brake te panevojshem ne fund
    // Vizato footer vetem nese faqja aktuale ka permbajtje (shmang faqen blank)
    if (doc.y > startYFaqes + 5) vizatoFooterSig();
    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATURA KOMPANISE — PDF Generator
// ═══════════════════════════════════════════════════════════════════════════════
function gjeneroPDF_FaturaKompanise(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: 'Faturë Kompanie' } });
    const bufs = [];
    doc.on('data', b => bufs.push(b));
    doc.on('end',  () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);

    const {
      referues, pacientet,
      refTipi = 'Bashkpuntor',
      gjithsejCmimi,
      numriPorosive, numriPacienteve,
      dataFillim, dataMbarim, numrFatures,
      monedha = 'EUR', zbritja = 0, settings = {},
    } = data;

    // Pick analysis price based on referrer type (consistent with API)
    const pickPrice = (analiza) => {
      if (refTipi === 'Bashkpuntor') {
        return analiza?.cmime?.bashkpuntor || analiza?.cmime?.pacient || 0;
      }
      return analiza?.cmime?.pacient || 0;
    };

    // Discount calculations
    const zbritjaPrc  = Number(zbritja) || 0;
    const zbritjaEUR  = Math.round(gjithsejCmimi * zbritjaPrc / 100 * 100) / 100;
    const totalFinal  = Math.round((gjithsejCmimi - zbritjaEUR) * 100) / 100;

    const M       = 40;  // margin
    const PW      = 595; // A4 width
    const PH      = 842; // A4 height
    const CW      = PW - M * 2; // content width
    const COL_BG  = '#F3F4F6';
    const BORDER  = '#D1D5DB';
    const ACCENT  = '#1A3A6B';
    const GREEN   = '#16A34A';
    const RED     = '#DC2626';

    const fmtNum  = (n) => Number(n || 0).toFixed(1);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('sq-AL') : '—';

    let pageNum = 1;

    // ── Draw page header — identical to lab PDF (accent line + logo left + text right) ──
    const HDR_H = 68;
    let logoBufInv = null;
    if (settings.logo) {
      try {
        const b64 = settings.logo.replace(/^data:[^;]+;base64,/, '');
        logoBufInv = Buffer.from(b64, 'base64');
      } catch {}
    }

    const vizatoHeader = () => {
      const HDR_Y = 6;
      const halfW = CW / 2;

      // Top accent line
      doc.rect(0, 0, PW, 3).fill(ACCENT);

      // Logo — left half, centred
      if (logoBufInv) {
        try {
          doc.image(logoBufInv, M, HDR_Y + 4,
            { fit: [halfW - 8, HDR_H - 8], align: 'center', valign: 'center' });
        } catch {}
      }

      // Vertical divider
      doc.moveTo(M + halfW, HDR_Y + 10)
         .lineTo(M + halfW, HDR_Y + HDR_H - 10)
         .strokeColor(BORDER).lineWidth(0.5).stroke();

      // Right half — headerTekst (rich HTML) if set, else clinic info (no MedLab Pro fallback)
      const txtX = M + halfW + 10;
      const txtW = halfW - 14;
      if (settings.headerTekst) {
        const nLines = countHtmlLines(settings.headerTekst);
        const ty0 = HDR_Y + Math.max(8, Math.floor((HDR_H - nLines * 12) / 2));
        drawHtmlText(doc, settings.headerTekst, txtX, ty0, txtW,
          { font: 'Helvetica', size: 9, color: ACCENT, lineH: 12 });
      } else {
        let iy = HDR_Y + 10;
        if (settings.emriKlinikes) {
          doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT)
             .text(settings.emriKlinikes, txtX, iy, { width: txtW });
          iy += 18;
        }
        doc.font('Helvetica').fontSize(7.5).fillColor(C.gray);
        if (settings.adresaKlinikes)  { doc.text(settings.adresaKlinikes,            txtX, iy, { width: txtW }); iy += 11; }
        if (settings.telefonKlinikes) { doc.text(`Tel: ${settings.telefonKlinikes}`, txtX, iy, { width: txtW }); iy += 11; }
        if (settings.emailKlinikes)   { doc.text(settings.emailKlinikes,             txtX, iy, { width: txtW }); }
      }

      // Bottom divider
      const divY = HDR_Y + HDR_H + 4;
      doc.moveTo(M, divY).lineTo(PW - M, divY).strokeColor(BORDER).lineWidth(0.5).stroke();
    };

    // ── Page footer ─────────────────────────────────────────────────────────────
    const vizatoFooter = () => {
      doc.moveTo(M, PH - 30).lineTo(PW - M, PH - 30).strokeColor(BORDER).lineWidth(0.3).stroke();
      doc.font('Helvetica').fontSize(6.5).fillColor(C.gray)
         .text(`Faqe ${pageNum}  ·  Gjeneruar automatikisht nga MedLab Pro  ·  ${new Date().toLocaleString('sq-AL')}`,
           M, PH - 22, { width: CW, align: 'center' });
    };

    const HDR_BOTTOM = HDR_H + 16; // space used by header + divider + gap
    const shtoFaqe = () => { doc.addPage(); pageNum++; vizatoHeader(); return HDR_BOTTOM + 10; };
    const checkY   = (h, y) => { if (y + h > PH - 50) { vizatoFooter(); return shtoFaqe(); } return y; };

    // ── Start drawing ────────────────────────────────────────────────────────────
    vizatoHeader();
    let Y = HDR_BOTTOM + 8;

    // ── Title: INVOICE / FATURË ─────────────────────────────────────────────────
    Y += 8;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(ACCENT)
       .text('INVOICE / FATURË', M, Y, { width: CW, align: 'center' });
    Y += 22;

    // ── Info row: two shaded boxes ───────────────────────────────────────────────
    const iW = CW / 2 - 4;
    const BOX_BG = '#F1F5F9';

    // Left box: Nr. Faturës + Periudha
    doc.rect(M, Y, iW, 36).fill(BOX_BG);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid)
       .text('Nr. Faturës:', M + 8, Y + 7);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text)
       .text(numrFatures || '—', M + 75, Y + 7, { width: iW - 83, align: 'left' });
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid)
       .text('Periudha:', M + 8, Y + 21);
    const periudha = dataFillim || dataMbarim
      ? `${dataFillim ? fmtDate(dataFillim + 'T00:00:00') : '?'} — ${dataMbarim ? fmtDate(dataMbarim + 'T00:00:00') : '?'}`
      : '—';
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text)
       .text(periudha, M + 75, Y + 21, { width: iW - 83 });

    // Right box: Data + Bashkëpunëtori
    const rx2 = M + iW + 8;
    doc.rect(rx2, Y, iW, 36).fill(BOX_BG);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid)
       .text('Data:', rx2 + 8, Y + 7);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text)
       .text(fmtDate(new Date()), rx2 + 55, Y + 7);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid)
       .text('Bashkëpunëtori:', rx2 + 8, Y + 21);
    const bleresTxt = referues.institucioni || `${referues.emri} ${referues.mbiemri}`;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text)
       .text(bleresTxt, rx2 + 83, Y + 21, { width: iW - 91, lineBreak: false });
    if (referues.telefoni) {
      doc.font('Helvetica').fontSize(7).fillColor(C.gray)
         .text(`  Tel: ${referues.telefoni}`, rx2 + 83, Y + 21, { width: iW - 91, lineBreak: false });
    }

    Y += 44;

    // ── Table ────────────────────────────────────────────────────────────────────
    // Pre-compute grand total using bashkpuntor prices
    let gjithsejBashk = 0;
    for (const pac of pacientet) {
      for (const p of pac.porosite) {
        if (p.pakoEmri) {
          gjithsejBashk += p.cmimi || 0;
        } else {
          for (const a of (p.analizat || [])) {
            gjithsejBashk += pickPrice(a.analiza);
          }
        }
      }
    }
    const zbritjaEURBashk  = Math.round(gjithsejBashk * zbritjaPrc / 100 * 100) / 100;
    const totalFinalBashk  = Math.round((gjithsejBashk - zbritjaEURBashk) * 100) / 100;

    const C_NR   = 20;
    const C_BAR  = 70;
    const C_PAC  = 90;
    const C_DAT  = 48;
    const C_DEP  = 58;
    const C_STS  = 48;
    const C_TOT  = 50;
    const C_AN   = CW - C_NR - C_BAR - C_PAC - C_DAT - C_DEP - C_STS - C_TOT;

    const TH = 18;
    doc.rect(M, Y, CW, TH).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
    let hx = M + 4;
    doc.text('Nr',           hx, Y + 5, { width: C_NR - 4 });   hx += C_NR;
    doc.text('Barkodi',      hx, Y + 5, { width: C_BAR - 4 });  hx += C_BAR;
    doc.text('Pacienti',     hx, Y + 5, { width: C_PAC - 4 });  hx += C_PAC;
    doc.text('Data',         hx, Y + 5, { width: C_DAT - 4 });  hx += C_DAT;
    doc.text('Departamenti', hx, Y + 5, { width: C_DEP - 4 });  hx += C_DEP;
    doc.text('Statusi',      hx, Y + 5, { width: C_STS - 4 });  hx += C_STS;
    doc.text('Analiza',      hx, Y + 5, { width: C_AN - 4 });   hx += C_AN;
    doc.text(`Totali (${monedha})`, hx, Y + 5, { width: C_TOT - 8, align: 'right' });
    Y += TH;

    let rowNr = 0;
    for (const pac of pacientet) {
      const pacNm = `${pac.pacienti?.emri || ''} ${pac.pacienti?.mbiemri || ''}`.trim();

      for (const p of pac.porosite) {
        rowNr++;
        const allAn = [];
        if (p.pakoEmri) {
          allAn.push({ emri: `[Pako] ${p.pakoEmri}`, cmimi: p.cmimi || 0 });
        } else {
          for (const a of (p.analizat || [])) {
            allAn.push({ emri: a.analiza?.emri || '?', cmimi: pickPrice(a.analiza) });
          }
        }

        const AN_LINES  = Math.max(1, allAn.length);
        const ROW_H     = Math.max(18, AN_LINES * 11 + 8);
        Y = checkY(ROW_H + 2, Y);

        const rowBg = rowNr % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
        doc.rect(M, Y, CW, ROW_H).fill(rowBg);

        const midY = Y + ROW_H / 2 - 5;
        let cx = M + 4;

        // Nr
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(ACCENT)
           .text(`${rowNr}`, cx, midY, { width: C_NR - 4, align: 'center' });
        cx += C_NR;

        // Nr. Porosie (plain text)
        doc.font('Courier').fontSize(7).fillColor(C.textMid)
           .text(p.numrPorosi || '—', cx, midY, { width: C_BAR - 4, lineBreak: false });
        cx += C_BAR;

        // Patient
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
           .text(pacNm, cx, midY, { width: C_PAC - 4, lineBreak: false });
        cx += C_PAC;

        // Data
        doc.font('Helvetica').fontSize(7).fillColor(C.textMid)
           .text(p.dataPorosis ? fmtDate(p.dataPorosis) : '—', cx, midY, { width: C_DAT - 4, lineBreak: false });
        cx += C_DAT;

        // Departamenti
        doc.font('Helvetica').fontSize(7).fillColor(C.textMid)
           .text(p.departamenti || '—', cx, midY, { width: C_DEP - 4, lineBreak: false });
        cx += C_DEP;

        // Statusi (colored)
        const isPaguar = p.pagesa?.statusi === 'Paguar';
        doc.font('Helvetica-Bold').fontSize(7).fillColor(isPaguar ? GREEN : RED)
           .text(isPaguar ? 'Paguar' : 'Papaguar', cx, midY, { width: C_STS - 4, lineBreak: false });
        cx += C_STS;

        // Analyses list
        let aY = Y + 5;
        for (const a of allAn) {
          const label = a.cmimi > 0 ? `${a.emri} – ${fmtNum(a.cmimi)}` : a.emri;
          doc.font('Helvetica').fontSize(6.5).fillColor(C.textMid)
             .text(label, cx, aY, { width: C_AN - 4, lineBreak: false });
          aY += 11;
        }
        cx += C_AN;

        // Total — sum of bashkpuntor prices (or p.cmimi for packages)
        const rowTotal = p.pakoEmri ? (p.cmimi || 0) : allAn.reduce((s, a) => s + a.cmimi, 0);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text)
           .text(`${fmtNum(rowTotal)}`, cx, midY, { width: C_TOT - 8, align: 'right', lineBreak: false });

        // Row bottom border
        doc.moveTo(M, Y + ROW_H).lineTo(PW - M, Y + ROW_H).strokeColor(BORDER).lineWidth(0.3).stroke();
        Y += ROW_H;
      }
    }

    Y += 14;

    // ── Summary section (single highlighted box, right-aligned) ──────────────────
    const sW = 200;
    const sH = 80;
    Y = checkY(sH + 20, Y);
    Y += 8;

    const sx = PW - M - sW;
    doc.rect(sx, Y, sW, sH).fillAndStroke('#F8FAFC', BORDER);
    doc.rect(sx, Y, sW, 20).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
       .text('Totali', sx + 8, Y + 6, { width: sW / 2 });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
       .text(`${fmtNum(gjithsejBashk)} ${monedha}`, sx + 8, Y + 6, { width: sW - 16, align: 'right' });

    const rRows = [
      [`Zbritje %:`, `${zbritjaPrc} %`],
      [`Zbritje ${monedha}:`, `${fmtNum(zbritjaEURBashk)} ${monedha}`],
    ];
    let rrY = Y + 25;
    for (const [k, v] of rRows) {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid).text(k, sx + 8, rrY, { width: sW - 16 });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text).text(v, sx + 8, rrY, { width: sW - 16, align: 'right' });
      rrY += 13;
    }
    // Grand total row
    doc.moveTo(sx + 4, rrY).lineTo(sx + sW - 4, rrY).strokeColor(ACCENT).lineWidth(0.6).stroke();
    rrY += 5;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT)
       .text('Totali i pagesës:', sx + 8, rrY, { width: sW - 16 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ACCENT)
       .text(`${fmtNum(totalFinalBashk)} ${monedha}`, sx + 8, rrY, { width: sW - 16, align: 'right' });

    Y += sH + 14;

    // ── Të dhënat për Pagesë (llogarite array) ──────────────────────────────────
    const llogarite = (settings.llogarite || []).filter(ll => ll.banka || ll.nrLlogarise || ll.perfituesi);
    if (llogarite.length > 0) {
      const payH = 22 + llogarite.length * 40 + 6;
      Y = checkY(payH, Y);

      // Header badge
      doc.rect(M, Y, 180, 18).fill(ACCENT);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
         .text('Të dhënat për Pagesë', M + 6, Y + 5, { width: 168 });
      Y += 22;

      for (const ll of llogarite) {
        const payRows = [
          ['Banka:', ll.banka],
          ['Nr. i Llogarisë:', ll.nrLlogarise],
          ['Përfituesi:', ll.perfituesi],
        ].filter(([, v]) => v);

        for (const [k, v] of payRows) {
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text).text(k, M, Y, { width: 80 });
          doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid).text(v, M + 82, Y, { width: CW - 82 });
          Y += 12;
        }
        // Small separator between accounts
        if (llogarite.indexOf(ll) < llogarite.length - 1) {
          Y += 4;
          doc.moveTo(M, Y).lineTo(M + 200, Y).strokeColor(BORDER).lineWidth(0.3).stroke();
          Y += 6;
        }
      }
      Y += 6;
    }

    // ── Shënim ───────────────────────────────────────────────────────────────────
    const shen = settings.shenimFature || 'Ju lutemi që pagesa të realizohet brenda 14 ditëve nga pranimi i faturës.';
    Y = checkY(24, Y);
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.gray)
       .text(`Shënim: ${shen}`, M, Y, { width: CW });
    Y += 18;

    // ── Signatures ───────────────────────────────────────────────────────────────
    Y = checkY(50, Y);
    Y += 10;
    const sigW = 130;
    doc.moveTo(M, Y + 28).lineTo(M + sigW, Y + 28).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(C.gray)
       .text('Hartuar nga', M, Y + 31, { width: sigW, align: 'center' });
    doc.moveTo(PW - M - sigW, Y + 28).lineTo(PW - M, Y + 28).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.text('Konfirmuar nga', PW - M - sigW, Y + 31, { width: sigW, align: 'center' });

    // ── Final footer ─────────────────────────────────────────────────────────────
    vizatoFooter();
    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATURA PACIENTI — PDF Generator
// ═══════════════════════════════════════════════════════════════════════════════
function gjeneroPDF_FaturaPatient(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: 'Faturë Pacienti' }, autoFirstPage: true });
    const bufs = [];
    doc.on('data', b => bufs.push(b));
    doc.on('end',  () => resolve(Buffer.concat(bufs)));
    doc.on('error', reject);

    const {
      pacienti, analizat = [],
      numrFatures, dataFatures,
      monedha = 'EUR', settings = {}, shenime = '',
    } = data;

    const M        = 40;
    const PW       = 595;
    const PH       = 842;
    const CW       = PW - M * 2;
    const ACCENT   = '#1A3A6B';
    const BORDER   = '#D1D5DB';
    const SAFE_BOT = PH - 70;

    const fmtNum  = (n) => Number(n || 0).toFixed(2);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('sq-AL') : '—';

    const totalFinal   = Math.round(analizat.reduce((s, a) => s + (a.cmimi || 0) * (a.sasia || 1), 0) * 100) / 100;

    // ── Logo ──────────────────────────────────────────────────────────────────
    const HDR_H = 68;
    let logoBuf = null;
    if (settings.logo) {
      try { logoBuf = Buffer.from(settings.logo.replace(/^data:[^;]+;base64,/, ''), 'base64'); } catch {}
    }

    let pageNum = 0;

    // ── Header (drawn on every page) ─────────────────────────────────────────
    const vizatoHeader = () => {
      const HDR_Y = 6;
      const halfW = CW / 2;
      doc.rect(0, 0, PW, 3).fill(ACCENT);
      if (logoBuf) {
        try { doc.image(logoBuf, M, HDR_Y + 4, { fit: [halfW - 8, HDR_H - 8], align: 'center', valign: 'center' }); } catch {}
      }
      doc.moveTo(M + halfW, HDR_Y + 10).lineTo(M + halfW, HDR_Y + HDR_H - 10).strokeColor(BORDER).lineWidth(0.5).stroke();
      const txtX = M + halfW + 10;
      const txtW = halfW - 14;
      if (settings.headerTekst) {
        const nLines = countHtmlLines(settings.headerTekst);
        const ty0 = HDR_Y + Math.max(8, Math.floor((HDR_H - nLines * 12) / 2));
        drawHtmlText(doc, settings.headerTekst, txtX, ty0, txtW, { font: 'Helvetica', size: 9, color: ACCENT, lineH: 12 });
      } else {
        let iy = HDR_Y + 10;
        if (settings.emriKlinikes) { doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT).text(settings.emriKlinikes, txtX, iy, { width: txtW }); iy += 18; }
        doc.font('Helvetica').fontSize(7.5).fillColor(C.gray);
        if (settings.adresaKlinikes)  { doc.text(settings.adresaKlinikes,            txtX, iy, { width: txtW }); iy += 11; }
        if (settings.telefonKlinikes) { doc.text('Tel: ' + settings.telefonKlinikes, txtX, iy, { width: txtW }); iy += 11; }
        if (settings.emailKlinikes)   { doc.text(settings.emailKlinikes,             txtX, iy, { width: txtW }); }
      }
      doc.moveTo(M, HDR_Y + HDR_H + 4).lineTo(PW - M, HDR_Y + HDR_H + 4).strokeColor(BORDER).lineWidth(0.5).stroke();
    };

    // ── Footer ────────────────────────────────────────────────────────────────
    const vizatoFooter = () => {
      doc.moveTo(M, PH - 30).lineTo(PW - M, PH - 30).strokeColor(BORDER).lineWidth(0.3).stroke();
      doc.font('Helvetica').fontSize(6.5).fillColor(C.gray)
         .text('Faqe ' + pageNum + '  ·  Gjeneruar automatikisht nga MedLab Pro  ·  ' + new Date().toLocaleString('sq-AL'),
           M, PH - 22, { width: CW, align: 'center' });
    };

    // ── Table columns ─────────────────────────────────────────────────────────
    const TC_NR  = 18;
    const TC_SAS = 26;
    const TC_CMI = 46;
    const TC_VL  = 46;
    const TC_PER = CW - TC_NR - TC_SAS - TC_CMI - TC_VL;

    let tableY = 0;
    const vizatoTableHeader = () => {
      doc.rect(M, tableY, CW, 16).fill(ACCENT);
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
      let thx = M + 3;
      doc.text('Nr.',             thx, tableY + 4, { width: TC_NR });                         thx += TC_NR;
      doc.text('Përshkrimi', thx, tableY + 4, { width: TC_PER });                        thx += TC_PER;
      doc.text('Sasia',          thx, tableY + 4, { width: TC_SAS, align: 'center' });        thx += TC_SAS;
      doc.text('Çmimi',     thx, tableY + 4, { width: TC_CMI, align: 'right' });         thx += TC_CMI;
      doc.text('Vlera (' + monedha + ')', thx, tableY + 4, { width: TC_VL - 3, align: 'right' });
    };

    // ── Page 1 ───────────────────────────────────────────────────────────────
    pageNum = 1;
    vizatoHeader();
    let Y = HDR_H + 16 + 8;

    // Clinic address row (left) + FATURË badge + Nr/Data (right)
    const halfCW = CW / 2;
    let lY = Y;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.gray);
    if (settings.adresaKlinikes)  { doc.text(settings.adresaKlinikes,            M, lY, { width: halfCW - 8 }); lY += 11; }
    if (settings.telefonKlinikes) { doc.text('Tel: ' + settings.telefonKlinikes, M, lY, { width: halfCW - 8 }); lY += 11; }
    if (settings.emailKlinikes)   { doc.text(settings.emailKlinikes,             M, lY, { width: halfCW - 8 }); lY += 11; }
    doc.font('Helvetica').fontSize(7).fillColor(C.gray);
    if (settings.nrUnik)     { doc.text('NUI: '       + settings.nrUnik,     M, lY, { width: halfCW - 8 }); lY += 10; }
    if (settings.nrBiznesit) { doc.text('Nr. Biznesit: ' + settings.nrBiznesit, M, lY, { width: halfCW - 8 }); lY += 10; }
    if (settings.nrTvsh)     { doc.text('Nr. TVSH: '  + settings.nrTvsh,     M, lY, { width: halfCW - 8 }); lY += 10; }

    const rx0 = M + halfCW + 8;
    const rW0 = halfCW - 8;
    doc.font('Helvetica-Bold').fontSize(22).fillColor(ACCENT).text('FATURË', rx0, Y, { width: rW0, align: 'right' });
    let rY0 = Y + 32;
    for (const [k, v] of [['Numri:', numrFatures || '—'], ['Data:', fmtDate(dataFatures)]]) {
      doc.font('Helvetica').fontSize(8).fillColor(C.textMid).text(k, rx0, rY0, { width: 44 });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text).text(v, rx0 + 46, rY0, { width: rW0 - 46 });
      rY0 += 13;
    }

    Y = Math.max(lY, rY0) + 8;
    doc.moveTo(M, Y).lineTo(PW - M, Y).strokeColor(BORDER).lineWidth(0.5).stroke();
    Y += 10;

    // ── Patient info box (compact, full-width) ────────────────────────────────
    const PAC_PAD = 8;
    const PAC_COL = Math.floor(CW / 2) - PAC_PAD;
    let pacY = Y + PAC_PAD;

    // Measure patient box height first
    const pacNm = ((pacienti?.emri || '') + ' ' + (pacienti?.mbiemri || '')).trim();
    const adresaTxt = [pacienti?.adresa?.rruga, pacienti?.adresa?.qyteti].filter(Boolean).join(', ');
    const pacLeftRows = [
      pacNm,
      adresaTxt,
      pacienti?.telefoni ? 'Tel: ' + pacienti.telefoni : null,
    ].filter(Boolean);
    const pacRightRows = [
      pacienti?.numrPersonal ? 'Nr. Personal: ' + pacienti.numrPersonal : null,
      pacienti?.datelindja   ? 'Datëlindja: ' + fmtDate(pacienti.datelindja) : null,
      pacienti?.gjinia       ? 'Gjinia: ' + (pacienti.gjinia === 'M' ? 'Mashkull' : 'Femër') : null,
    ].filter(Boolean);
    const pacRows = Math.max(pacLeftRows.length, pacRightRows.length);
    const PAC_H = PAC_PAD * 2 + 14 + pacRows * 11 + 4; // label + rows + padding

    doc.rect(M, Y, CW, PAC_H).fill('#F8FAFC').stroke(BORDER);
    doc.font('Helvetica-Bold').fontSize(7).fillColor(ACCENT).text('BLERËSI / PACIENTI', M + PAC_PAD, Y + PAC_PAD);
    pacY = Y + PAC_PAD + 13;

    // Left column: name + address + phone
    let pli = 0;
    if (pacNm) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text(pacNm, M + PAC_PAD, pacY + pli * 11, { width: PAC_COL });
      pli++;
    }
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid);
    if (adresaTxt)          { doc.text(adresaTxt,                      M + PAC_PAD, pacY + pli * 11, { width: PAC_COL }); pli++; }
    if (pacienti?.telefoni) { doc.text('Tel: ' + pacienti.telefoni,   M + PAC_PAD, pacY + pli * 11, { width: PAC_COL }); pli++; }

    // Right column: ID + birthday + gender
    const rcPacX = M + CW / 2 + PAC_PAD;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid);
    let pri = 0;
    if (pacienti?.numrPersonal) { doc.text('Nr. Personal: ' + pacienti.numrPersonal,                                  rcPacX, pacY + pri * 11, { width: PAC_COL }); pri++; }
    if (pacienti?.datelindja)   { doc.text('Datëlindja: ' + fmtDate(pacienti.datelindja),                             rcPacX, pacY + pri * 11, { width: PAC_COL }); pri++; }
    if (pacienti?.gjinia)       { doc.text('Gjinia: ' + (pacienti.gjinia === 'M' ? 'Mashkull' : 'Femër'),             rcPacX, pacY + pri * 11, { width: PAC_COL }); pri++; }

    Y += PAC_H + 12;

    // ── Full-width analyses table ─────────────────────────────────────────────
    tableY = Y;
    vizatoTableHeader();
    let rowY = Y + 16;

    for (let i = 0; i < analizat.length; i++) {
      const an    = analizat[i];
      const rowH  = 13;

      if (rowY + rowH > SAFE_BOT) {
        vizatoFooter();
        doc.addPage();
        pageNum++;
        vizatoHeader();
        rowY = HDR_H + 20;
        tableY = rowY;
        vizatoTableHeader();
        rowY += 16;
      }

      const rowBg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(M, rowY, CW, rowH).fill(rowBg);
      const vlera = (an.cmimi || 0) * (an.sasia || 1);
      let rx2 = M + 3;
      doc.font('Helvetica').fontSize(7).fillColor(C.textMid).text((i + 1) + '.', rx2, rowY + 3, { width: TC_NR });             rx2 += TC_NR;
      doc.font('Helvetica').fontSize(7).fillColor(C.text).text(an.emri || '—',   rx2, rowY + 3, { width: TC_PER, lineBreak: false }); rx2 += TC_PER;
      doc.font('Helvetica').fontSize(7).fillColor(C.textMid).text(String(an.sasia || 1), rx2, rowY + 3, { width: TC_SAS, align: 'center' }); rx2 += TC_SAS;
      doc.font('Helvetica').fontSize(7).fillColor(C.textMid).text(fmtNum(an.cmimi || 0), rx2, rowY + 3, { width: TC_CMI, align: 'right' }); rx2 += TC_CMI;
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text).text(fmtNum(vlera),        rx2, rowY + 3, { width: TC_VL - 3, align: 'right' });
      doc.moveTo(M, rowY + rowH).lineTo(M + CW, rowY + rowH).strokeColor(BORDER).lineWidth(0.2).stroke();
      rowY += rowH;
    }

    rowY += 5;

    // ── Summary ───────────────────────────────────────────────────────────────
    const vatRows = [['Gjithsej:', fmtNum(totalFinal) + ' ' + monedha]];

    const vatH = vatRows.length * 13 + 20 + 10;
    if (rowY + vatH > SAFE_BOT) {
      vizatoFooter();
      doc.addPage();
      pageNum++;
      vizatoHeader();
      rowY = HDR_H + 20;
    }

    for (const [k, v] of vatRows) {
      doc.font('Helvetica').fontSize(8).fillColor(C.textMid).text(k, M + 3, rowY, { width: CW - 6 });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text).text(v, M + 3, rowY, { width: CW - 6, align: 'right' });
      rowY += 13;
    }
    // Total bar
    doc.rect(M, rowY, CW, 18).fill(ACCENT);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
       .text('Totali (' + monedha + '):', M + 4, rowY + 4.5, { width: CW / 2 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
       .text(fmtNum(totalFinal) + ' ' + monedha, M + 4, rowY + 4.5, { width: CW - 8, align: 'right' });
    rowY += 22;

    // ── Signature line (just a line, no circle) ───────────────────────────────
    rowY += 14;
    const sigW = 140;
    doc.font('Helvetica').fontSize(7).fillColor(C.gray).text('Lëshuar nga:', M, rowY); rowY += 20;
    doc.moveTo(M, rowY).lineTo(M + sigW, rowY).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(6.5).fillColor(C.gray).text('Emri i Plotë & Nënshkrimi', M, rowY + 3, { width: sigW, align: 'center' });
    rowY += 18;

    // ── Bank + texts ──────────────────────────────────────────────────────────
    const llogarite = (settings.llogarite || []).filter(ll => ll.banka || ll.nrLlogarise || ll.perfituesi);
    if (llogarite.length > 0) {
      rowY += 8;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.text).text('Llogaria Bankare:', M, rowY); rowY += 13;
      for (const ll of llogarite) {
        const parts = [
          ll.banka       && 'Banka: ' + ll.banka,
          ll.nrLlogarise && 'IBAN: ' + ll.nrLlogarise,
          ll.perfituesi  && 'Përfituesi: ' + ll.perfituesi,
        ].filter(Boolean);
        doc.font('Helvetica').fontSize(7.5).fillColor(C.textMid).text(parts.join('   '), M, rowY, { width: CW }); rowY += 12;
      }
    }

    if (settings.shenimFaturePatient) {
      rowY += 6;
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.textMid)
         .text(settings.shenimFaturePatient, M, rowY, { width: CW }); rowY += 14;
    }

    if (shenime) {
      rowY += 4;
      doc.moveTo(M, rowY).lineTo(PW - M, rowY).strokeColor(BORDER).lineWidth(0.3).stroke(); rowY += 8;
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.textMid).text(shenime, M, rowY, { width: CW }); rowY += 14;
    }

    vizatoFooter();
    doc.end();
  });
}
module.exports = {
  gjeneroRaportPDF,
  gjeneroRaportPDFBuffer: gjeneroRaportPDF, // alias për kontrollerin publik
  gjeneroPDF_FaturaKompanise,
  gjeneroPDF_FaturaPatient,
};
