const asyncHandler   = require('express-async-handler');
const Analiza        = require('../models/Analiza');
const Profili        = require('../models/Profili');
const PorosiLab      = require('../models/PorosiLab');
const Fatura         = require('../models/Fatura');
const Pacienti       = require('../models/Pacienti');
const Referues       = require('../models/Referues');
const PakoAnalizave  = require('../models/PakoAnalizave');
const AlarmKritik    = require('../models/AlarmKritik');
const XLSX           = require('xlsx');
const { logVeprimin }     = require('../utils/logAction');
const { dergoWhatsApp }   = require('../utils/whatsappUtil');

// ══════════════════════════════════════════════
// KATALOGU I ANALIZAVE
// ══════════════════════════════════════════════

const listoAnalizat = asyncHandler(async (req, res) => {
  const { departamenti, kerko, aktiv = 'true', profiliId } = req.query;
  const filter = { aktiv: aktiv === 'true' };
  if (departamenti) filter.departamenti = departamenti;
  if (profiliId)    filter.profiliId = profiliId;
  if (kerko) filter.$or = [
    { emri: new RegExp(kerko, 'i') },
    { kodi: new RegExp(kerko, 'i') },
  ];
  const analizat = await Analiza.find(filter)
    .populate('profiliId', 'emri departamenti')
    .sort({ departamenti: 1, emri: 1 });
  res.json({ sukses: true, analizat });
});

const merrAnalizen = asyncHandler(async (req, res) => {
  const a = await Analiza.findById(req.params.id).populate('profiliId', 'emri');
  if (!a) { res.status(404); throw new Error('Analiza nuk u gjet'); }
  res.json({ sukses: true, analiza: a });
});

const shtoAnalizen = asyncHandler(async (req, res) => {
  const a = await Analiza.create(req.body);

  logVeprimin(req, 'CREATE_ANALIZA', {
    kategorija:     'Laborator',
    moduliDetajuar: 'Analiza',
    rekordId:       a._id,
    rekordEmri:     a.emri,
    vleraRe:        { emri: a.emri, kodi: a.kodi, departamenti: a.departamenti, cmime: a.cmime },
    pershkrimi:     `Analiza e re u shtua: ${a.emri} (${a.kodi})`,
  });

  res.status(201).json({ sukses: true, analiza: a });
});

const perditesAnalizen = asyncHandler(async (req, res) => {
  const vjeter = await Analiza.findById(req.params.id).lean();

  // Krahaso çmimet — normalize si numra për krahasim të saktë
  const pVj = Number(vjeter?.cmime?.pacient     ?? 0);
  const bVj = Number(vjeter?.cmime?.bashkpuntor ?? 0);
  const pRe = Number(req.body.cmime?.pacient     ?? 0);
  const bRe = Number(req.body.cmime?.bashkpuntor ?? 0);
  const cmimNdryshoi = vjeter && req.body.cmime !== undefined && (pVj !== pRe || bVj !== bRe);

  // Step 1 — ruaj historikun para update-it kryesor (operacion i veçuar)
  if (cmimNdryshoi) {
    await Analiza.findByIdAndUpdate(req.params.id, {
      $push: {
        historikuCmimeve: {
          cmimeVjeter:  { pacient: pVj, bashkpuntor: bVj },
          cmimeRe:      { pacient: pRe, bashkpuntor: bRe },
          ndryshuarNe:  new Date(),
          ndryshuarNga: req.perdoruesi
            ? `${req.perdoruesi.emri || ''} ${req.perdoruesi.mbiemri || ''}`.trim()
            : 'Sistemi',
        },
      },
    });
  }

  // Step 2 — update-o fushat e analizës
  const { historikuCmimeve: _h, ...bodyPaHistorik } = req.body;
  const a = await Analiza.findByIdAndUpdate(req.params.id, bodyPaHistorik, { new: true, runValidators: false });
  if (!a) { res.status(404); throw new Error('Analiza nuk u gjet'); }

  // Kontrollo ndryshim çmimi — log shtesë
  logVeprimin(req, cmimNdryshoi ? 'EDIT_ANALIZA_PRICE' : 'EDIT_ANALIZA', {
    kategorija:     'Laborator',
    moduliDetajuar: 'Analiza',
    rekordId:       a._id,
    rekordEmri:     a.emri,
    vleraVjeter:    cmimNdryshoi ? vjeter?.cmime : undefined,
    vleraRe:        cmimNdryshoi ? a.cmime      : undefined,
    pershkrimi:     `Analiza u ndryshua: ${a.emri}${cmimNdryshoi ? ' (çmimi ndryshoi)' : ''}`,
  });

  res.json({ sukses: true, analiza: a });
});

const fshiAnalizen = asyncHandler(async (req, res) => {
  const a = await Analiza.findByIdAndUpdate(req.params.id, { aktiv: false });
  logVeprimin(req, 'DELETE_ANALIZA', {
    kategorija:     'Laborator',
    moduliDetajuar: 'Analiza',
    rekordId:       req.params.id,
    rekordEmri:     a?.emri,
    pershkrimi:     `Analiza u çaktivizua: ${a?.emri}`,
  });
  res.json({ sukses: true, mesazh: 'Analiza u caktivizua' });
});

// ══════════════════════════════════════════════
// POROSITE LABORATORIKE
// ══════════════════════════════════════════════

const fshiPorosine = asyncHandler(async (req, res) => {
  const p = await PorosiLab.findById(req.params.id).populate('pacienti', 'emri mbiemri').lean();
  if (!p) { res.status(404); throw new Error('Porosi nuk u gjet'); }

  await PorosiLab.findByIdAndDelete(req.params.id);

  logVeprimin(req, 'DELETE_POROSI', {
    kategorija:     'Laborator',
    moduliDetajuar: 'Porosi',
    rekordId:       p._id,
    rekordEmri:     `${p.numrPorosi} — ${p.pacienti?.emri || ''} ${p.pacienti?.mbiemri || ''}`,
    alarmi:         true,
    alarmTipi:      'POROSI_FSHIRE',
    pershkrimi:     `Porosi u fshi: ${p.numrPorosi} (pacient: ${p.pacienti?.emri} ${p.pacienti?.mbiemri})`,
  });

  res.json({ sukses: true, mesazh: 'Porosi u fshi' });
});

const listoPorosite = asyncHandler(async (req, res) => {
  const { departamenti, statusi, data, dataFillim, dataMbarim: dataMbarimQ, pacientiId, kerko, seancaId, faqe = 1, limit = 50 } = req.query;
  const filter = {};
  if (departamenti) filter.departamenti = departamenti;
  if (statusi)      filter.statusi = statusi;
  if (pacientiId)   filter.pacienti = pacientiId;
  if (seancaId)     filter.seancaId = seancaId;

  // Kur filtrojme sipas seancaId, nuk nevojitet filtri i dates
  if (!seancaId) {
    const d0 = new Date(dataFillim || data || new Date()); d0.setHours(0,0,0,0);
    const d1 = dataMbarimQ ? new Date(dataMbarimQ) : new Date(d0); d1.setHours(23,59,59,999);
    filter.dataPorosis = { $gte: d0, $lte: d1 };
  }

  const [total, porosite] = await Promise.all([
    PorosiLab.countDocuments(filter),
    PorosiLab.find(filter)
      .populate('pacienti', 'emri mbiemri numrPersonal datelindja gjinia telefoni')
      .populate('derguesit', 'emri mbiemri roli')
      .populate('laboranti', 'emri mbiemri')
      .populate('referuesId', 'emri mbiemri institucioni')
      .populate('analizat.analiza', 'emri kodi departamenti cmime materialBiologjik')
      .sort({ numrRendor: -1 })
      .skip((faqe-1)*limit).limit(Number(limit))
  ]);
  
  res.json({ sukses: true, total, porosite });
});

const merrPorosine = asyncHandler(async (req, res) => {
  const p = await PorosiLab.findById(req.params.id)
    .populate('pacienti')
    .populate('derguesit', 'emri mbiemri roli specialiteti')
    .populate('laboranti', 'emri mbiemri')
    .populate('referuesId', 'emri mbiemri institucioni tipi specialiteti')
    .populate('analizat.analiza');
  if (!p) { res.status(404); throw new Error('Porosi nuk u gjet'); }
  res.json({ sukses: true, porosi: p });
});

const krijoPorosine = asyncHandler(async (req, res) => {
  const { pacientiId, analizatIds = [], profiletIds = [], departamenti, tipiPacientit, urgente, shenime, seancaId, pakoId, cmimiPako } = req.body;

  // Nese nuk eshte zgjedhur referues specifik, cakto automatikisht defaultin (Vete Ardhur)
  let referuesId = req.body.referuesId || null;
  if (!referuesId) {
    const refDef = await Referues.findOne({ eshteDefault: true, aktiv: true }).select('_id');
    if (refDef) referuesId = refDef._id;
  }

  const tipiC = tipiPacientit || 'pacient';

  // Merr analizat individuale (te zgjedhura direkt)
  const analizatIndiv = analizatIds.length
    ? await Analiza.find({ _id: { $in: analizatIds }, aktiv: true })
    : [];

  // Merr profilet (per emra dhe cmime) — nga modeli Profili
  const profilet = profiletIds.length
    ? await Profili.find({ _id: { $in: profiletIds }, aktiv: true })
    : [];
  const profEmratMap = {};
  profilet.forEach(p => { profEmratMap[p._id.toString()] = p.emri; });

  // Merr emrat e profileve per analizat individuale (nga profiliId i Analizes)
  const profiliIdsIndiv = [...new Set(
    analizatIndiv.filter(a => a.profiliId).map(a => a.profiliId.toString())
  )];
  const profiletIndiv = profiliIdsIndiv.length
    ? await Profili.find({ _id: { $in: profiliIdsIndiv } }, 'emri')
    : [];
  profiletIndiv.forEach(p => { profEmratMap[p._id.toString()] = p.emri; });

  // Merr analizat perberese te profileve (analizat qe i perkasin profiliId)
  const analizatNgaProfile = profiletIds.length
    ? await Analiza.find({ profiliId: { $in: profiletIds }, aktiv: true })
    : [];

  // Nderto listen finale
  const analizatNePorosi = [
    ...analizatIndiv.map(a => ({
      analiza:     a,
      profiliId:   a.profiliId || null,
      profiliEmri: a.profiliId ? (profEmratMap[a.profiliId.toString()] || '') : '',
    })),
    ...analizatNgaProfile.map(a => ({
      analiza:     a,
      profiliId:   a.profiliId,
      profiliEmri: profEmratMap[a.profiliId?.toString()] || '',
    })),
  ];

  if (!analizatNePorosi.length) { res.status(400); throw new Error('Asnje analiza e vlefshme'); }

  // Cmimi: nese vjen nga pako, perdor cmimiPako, ndryshe shuma individuale
  let cmimi;
  let pakoDoc = null;
  if (pakoId && cmimiPako != null) {
    pakoDoc = await PakoAnalizave.findById(pakoId).lean();
    cmimi = Number(cmimiPako);
  } else {
    const cmimiIndiv    = analizatIndiv.reduce((s, a) => s + (tipiC === 'bashkpuntor' ? (a.cmime?.bashkpuntor||0) : (a.cmime?.pacient||0)), 0);
    const cmimiProfilet = profilet.reduce((s, p)      => s + (tipiC === 'bashkpuntor' ? (p.cmime?.bashkpuntor||0) : (p.cmime?.pacient||0)), 0);
    cmimi = cmimiIndiv + cmimiProfilet;
  }

  // Krijo porosi — retry nese numrPorosi ka konflikt (duplicate key)
  let porosi;
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      porosi = await PorosiLab.create({
        pacienti:      pacientiId,
        derguesit:     req.perdoruesi._id,
        referuesId:    referuesId || null,
        departamenti,
        tipiPacientit: tipiC,
        urgente:       urgente || false,
        shenime,
        cmimi,
        tipiCmimit:    tipiC,
        seancaId:      seancaId || null,
        pakoId:        pakoDoc?._id || null,
        pakoEmri:      pakoDoc?.emri || '',
        analizat: analizatNePorosi.map(({ analiza, profiliId, profiliEmri }) => ({
          analiza:     analiza._id,
          profiliId:   profiliId || undefined,
          profiliEmri: profiliEmri || '',
        })),
      });
      break; // sukses
    } catch (err) {
      if (err.code === 11000 && tentativa < 4) continue; // duplicate key — provo perseri
      throw err;
    }
  }

  // Krijo fature
  const zeratFature = [
    ...analizatIndiv.map(a => ({
      lloji: 'Test_Lab', referenca: a._id,
      pershkrim: `${a.emri} (${a.kodi})`,
      cmimi: tipiC === 'bashkpuntor' ? a.cmime.bashkpuntor : a.cmime.pacient,
    })),
    ...profilet.map(p => ({
      lloji: 'Test_Lab', referenca: p._id,
      pershkrim: `${p.emri} — Profil`,
      cmimi: tipiC === 'bashkpuntor' ? (p.cmime?.bashkpuntor || 0) : (p.cmime?.pacient || 0),
    })),
  ];

  const fatura = await Fatura.create({
    pacienti: pacientiId,
    krijoNga:  req.perdoruesi._id,
    zerat:     zeratFature,
    totali:    cmimi,
  });

  await PorosiLab.findByIdAndUpdate(porosi._id, { fatura: fatura._id });

  await porosi.populate([
    { path: 'pacienti', select: 'emri mbiemri numrPersonal' },
    { path: 'analizat.analiza', select: 'emri kodi' },
  ]);

  const emriPac = porosi.pacienti ? `${porosi.pacienti.emri} ${porosi.pacienti.mbiemri}` : '';
  logVeprimin(req, 'CREATE_POROSI', {
    kategorija:     'Laborator',
    moduliDetajuar: 'Porosi',
    rekordId:       porosi._id,
    rekordEmri:     `${porosi.numrPorosi} — ${emriPac}`,
    vleraRe:        { numrPorosi: porosi.numrPorosi, departamenti, analizat: analizatNePorosi.length, cmimi },
    pershkrimi:     `Porosi e re u krijua: ${porosi.numrPorosi} (${departamenti}) për ${emriPac}`,
  });

  res.status(201).json({ sukses: true, porosi, fatura });
});

const regjistroRezultatet = asyncHandler(async (req, res) => {
  const { analizaId, rezultate, koment, profiliId, komentProfili } = req.body;
  const porosi = await PorosiLab.findById(req.params.id)
    .populate('pacienti')
    .populate('analizat.analiza', 'emri kodi departamenti komponente');
  if (!porosi) { res.status(404); throw new Error('Porosi nuk u gjet'); }

  const moshaP  = porosi.pacienti.mosha;
  const gjiniaP = porosi.pacienti.gjinia;

  const row = porosi.analizat.find(a => a.analiza._id.toString() === analizaId);
  if (!row) { res.status(404); throw new Error('Analiza nuk eshte ne kete porosi'); }

  // Vendos rezultatet me flamurim automatik (bazuar ne komponente te katalogut)
  // Kap snapshot-in e komponenteve PARA ruajtjes (vetem here te pare — mos mbishkruaj)
  if (!row.komponenteSnapshot || row.komponenteSnapshot.length === 0) {
    row.komponenteSnapshot = (row.analiza.komponente || []).map(k => ({
      emri:      k.emri      || '',
      njesia:    k.njesia    || '',
      kritikMin: k.kritikMin ?? undefined,
      kritikMax: k.kritikMax ?? undefined,
      vlerat: (k.vlerat || []).map(vl => ({
        etiketa:    vl.etiketa    || '',
        gjinia:     vl.gjinia     || 'Te dyja',
        moshaMin:   vl.moshaMin   ?? 0,
        moshaMax:   vl.moshaMax   ?? 120,
        operatori:  vl.operatori  || 'midis',
        vleraMin:   vl.vleraMin   ?? undefined,
        vleraMax:   vl.vleraMax   ?? undefined,
        vleraTekst: vl.vleraTekst || '',
        komentAuto: vl.komentAuto || '',
        kritikMin:  vl.kritikMin  ?? undefined,
        kritikMax:  vl.kritikMax  ?? undefined,
      })),
    }));
  }

  // Snapshot i vlerave të vjetra PARA ndryshimit (për audit diff)
  const vjetraRezultate = (row.rezultate || []).map(r => ({
    komponenti: r.komponenti,
    vlera:      r.vlera,
    flamuri:    r.flamuri,
  }));
  const kishteRezultate = vjetraRezultate.some(r => r.vlera != null && r.vlera !== '');

  row.rezultate = rezultate.map(r => {
    // Gjej komponentin perkatese ne katalogun e analizes
    const komp = (row.analiza.komponente || []).find(k => k.emri === r.komponenti)
      || (row.analiza.komponente?.length === 1 ? row.analiza.komponente[0] : null);

    // Flamurim: prioritet komponent-level, fallback per-interval (sipas gjinise + moshes)
    let vMin, vMax;
    if (komp?.kritikMin != null && komp?.kritikMax != null) {
      // Nivel komponent (global) — prioritet i larte
      vMin = Number(komp.kritikMin);
      vMax = Number(komp.kritikMax);
    } else {
      // Fallback: gjej intervalin qe perputhet me gjinine + moshen e pacientit
      const gjiniaMatch = g => !g || g === 'Te dyja' || g === gjiniaP;
      const moshaMatch  = vl => moshaP >= (vl.moshaMin ?? 0) && moshaP <= (vl.moshaMax ?? 120);
      const vlMatch = (komp?.vlerat || []).find(vl =>
        gjiniaMatch(vl.gjinia) && moshaMatch(vl) &&
        vl.kritikMin != null && vl.kritikMax != null
      );
      vMin = vlMatch?.kritikMin != null ? Number(vlMatch.kritikMin) : undefined;
      vMax = vlMatch?.kritikMax != null ? Number(vlMatch.kritikMax) : undefined;
    }

    let flamuri = '—';
    const numVlera = Number(r.vlera);
    if (komp && r.vlera !== '' && r.vlera != null && !isNaN(numVlera) && vMin != null && vMax != null) {
      if      (numVlera < vMin * 0.7) flamuri = 'Shume_Ulet';
      else if (numVlera < vMin)       flamuri = 'Ulet';
      else if (numVlera > vMax * 1.5) flamuri = 'Shume_Larte';
      else if (numVlera > vMax)       flamuri = 'Larte';
      else                            flamuri = 'Normal';
    }
    return {
      komponenti: r.komponenti || '',
      vlera:      r.vlera,
      njesia:     r.njesia || komp?.njesia || '',
      koment:     r.koment || '',
      flamuri,
      vleraMin:   vMin,
      vleraMax:   vMax,
    };
  });
  // Kompletuar VETEM nese ka te pakten nje vlere reale (0 eshte vlere e vlefshme)
  const kaVleraReale = rezultate.some(r => r.vlera != null && String(r.vlera).trim() !== '');
  row.kompletuar = kaVleraReale;
  row.koment     = koment;

  // Ruaj koment profili nese eshte dhene
  if (profiliId && komentProfili !== undefined) {
    if (!porosi.komentetProfileve) porosi.komentetProfileve = [];
    const existing = porosi.komentetProfileve.find(k => k.profiliId?.toString() === profiliId);
    if (existing) {
      existing.koment = komentProfili;
    } else {
      const profiliEmri = row.profiliEmri || '';
      porosi.komentetProfileve.push({ profiliId, profiliEmri, koment: komentProfili });
    }
  }

  // Ruaj antibiogram nese eshte dhene (vetem Mikrobiologji)
  if (req.body.antibiogram) {
    row.antibiogram = req.body.antibiogram;
  }

  // Kontrollo nese te gjitha analizat jane kompletuar
  const teGjitha = porosi.analizat.every(a => a.kompletuar);
  if (teGjitha) {
    porosi.statusi         = 'Kompletuar';
    porosi.dataKompletimit = new Date();
    porosi.laboranti       = req.perdoruesi._id;
  } else {
    porosi.statusi = 'NeProcesim';
  }

  // Auto-vendos datën e validimit teknik kur ruhet çdo rezultat me vlera reale
  // (nëse validimi nuk është aplikuar manualisht ende)
  if (kaVleraReale && !porosi.validimTeknik?.data) {
    const pu  = req.perdoruesi;
    const nga = pu ? `${pu.emri || ''} ${pu.mbiemri || ''}`.trim() : '';
    porosi.validimTeknik = {
      bere: false,          // vulë zyrtare ende nuk është shtypur
      data: new Date(),     // por data shfaqet në PDF
      nga,
    };
  }

  // Kontroll alarmi — rezultat ndryshuar pas validimi
  const ishteValiduar   = porosi.validimTeknik?.bere || porosi.validimMjekesor?.bere;

  await porosi.save();

  const emriAnaliza = row.analiza?.emri || analizaId;
  const emriPac     = `${porosi.pacienti?.emri || ''} ${porosi.pacienti?.mbiemri || ''}`.trim();

  // ── Krijo alarme kritike për vlera jashtë rangut kritik ──────
  const alarmeFlamuj = ['Shume_Larte', 'Shume_Ulet'];
  const alarmeRe = row.rezultate.filter(r => alarmeFlamuj.includes(r.flamuri));
  if (alarmeRe.length > 0) {
    const komp = (row.analiza.komponente || []);
    await Promise.all(alarmeRe.map(r => {
      const k = komp.find(c => c.emri === r.komponenti);
      return AlarmKritik.create({
        porosiId:    porosi._id,
        numrPorosi:  porosi.numrPorosi,
        pacientEmri: emriPac,
        analizaEmri: emriAnaliza,
        komponenti:  r.komponenti,
        vlera:       String(r.vlera),
        njesia:      r.njesia || '',
        flamuri:     r.flamuri,
        kritikMin:   r.vleraMin,
        kritikMax:   r.vleraMax,
      });
    }));
  }

  // Gjej komponentet qe ndryshuan vlerën konkretisht (A → B)
  const ndryshuara = kishteRezultate
    ? rezultate.map(rRe => {
        const rVj = vjetraRezultate.find(v => v.komponenti === rRe.komponenti);
        if (rVj && rVj.vlera != null && rVj.vlera !== '' && String(rVj.vlera) !== String(rRe.vlera)) {
          return { komponenti: rRe.komponenti, vjeter: rVj.vlera, ri: rRe.vlera, flamurVjeter: rVj.flamuri };
        }
        return null;
      }).filter(Boolean)
    : [];

  const eshteNdryshim   = ndryshuara.length > 0;
  const eshteAlarm      = ishteValiduar || eshteNdryshim;

  const veprimi = ishteValiduar
    ? 'EDIT_RESULT_POST_VALIDATION'
    : eshteNdryshim ? 'CHANGE_RESULT'
    : kishteRezultate ? 'EDIT_RESULT'
    : 'ENTER_RESULT';

  const alarmTipiVal = ishteValiduar
    ? 'REZULTAT_PAS_VALIDIMIT'
    : eshteNdryshim ? 'NDRYSHIM_REZULTATI'
    : undefined;

  const diffTxt = ndryshuara.map(n => `${n.komponenti}: ${n.vjeter} → ${n.ri}`).join(' | ');

  const pershkrimiLog = ishteValiduar
    ? `⚠️ ALARM: Rezultat ndryshuar PAS VALIDIMIT: ${emriAnaliza}${eshteNdryshim ? ` (${diffTxt})` : ''} — Pacient: ${emriPac} (Porosi: ${porosi.numrPorosi})`
    : eshteNdryshim
      ? `⚠️ Rezultat ndryshuar: ${emriAnaliza} — ${diffTxt} — Pacient: ${emriPac} (Porosi: ${porosi.numrPorosi})`
      : `Rezultat u regjistrua: ${emriAnaliza} — Pacient: ${emriPac} (Porosi: ${porosi.numrPorosi})`;

  logVeprimin(req, veprimi, {
    kategorija:     'Rezultat',
    moduliDetajuar: 'Rezultat',
    rekordId:       porosi._id,
    rekordEmri:     `${emriPac} — ${emriAnaliza}`,
    vleraVjeter:    kishteRezultate ? vjetraRezultate : undefined,
    vleraRe:        rezultate.map(r => ({ komponenti: r.komponenti, vlera: r.vlera, njesia: r.njesia })),
    alarmi:         eshteAlarm,
    alarmTipi:      alarmTipiVal,
    pershkrimi:     pershkrimiLog,
  });

  res.json({ sukses: true, porosi });
});

const ndryshoStatusin = asyncHandler(async (req, res) => {
  const p = await PorosiLab.findByIdAndUpdate(req.params.id, { statusi: req.body.statusi }, { new: true });
  if (!p) { res.status(404); throw new Error('Porosi nuk u gjet'); }
  res.json({ sukses: true, porosi: p });
});

const bejValidimin = asyncHandler(async (req, res) => {
  const { tipi } = req.body; // 'teknik' | 'mjekesor'
  if (!['teknik', 'mjekesor'].includes(tipi)) {
    res.status(400); throw new Error('Tipi i validimit i pavlefshem');
  }
  const fushe = tipi === 'teknik' ? 'validimTeknik' : 'validimMjekesor';
  const pu  = req.perdoruesi;
  const nga = pu ? `${pu.emri || ''} ${pu.mbiemri || ''}`.trim() : '';
  const update = {
    [`${fushe}.bere`]: true,
    [`${fushe}.data`]: new Date(),
    [`${fushe}.nga`]:  nga,
  };
  const p = await PorosiLab.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate('pacienti', 'emri mbiemri telefoni datelindja');
  if (!p) { res.status(404); throw new Error('Porosi nuk u gjet'); }

  const emriPac = `${p.pacienti?.emri || ''} ${p.pacienti?.mbiemri || ''}`.trim();
  logVeprimin(req, tipi === 'teknik' ? 'VALIDIM_TEKNIK' : 'VALIDIM_MJEKESOR', {
    kategorija:     'Rezultat',
    moduliDetajuar: 'Validim',
    rekordId:       p._id,
    rekordEmri:     `${p.numrPorosi} — ${emriPac}`,
    pershkrimi:     `Validim ${tipi === 'teknik' ? 'teknik' : 'mjekësor'} u bë nga ${nga} — Porosi: ${p.numrPorosi} (${emriPac})`,
  });

  // ── Dërgo njoftim WhatsApp pas validimit ──────────────────────
  if (tipi === 'teknik') {
    dergoWhatsApp(p, emriPac).catch(() => {}); // non-blocking
  }

  res.json({ sukses: true, porosi: p });
});

// Historiku i pacientit per te gjitha departamentet
const historikuPacientit = asyncHandler(async (req, res) => {
  const { pacientiId } = req.params;
  const porosite = await PorosiLab.find({ pacienti: pacientiId })
    .populate('analizat.analiza', 'emri kodi departamenti')
    .sort({ dataPorosis: -1 })
    .limit(100);

  // Grupo sipas dates
  const sipasDateve = {};
  porosite.forEach(p => {
    const data = p.dataPorosis.toISOString().split('T')[0];
    if (!sipasDateve[data]) sipasDateve[data] = [];
    sipasDateve[data].push(p);
  });

  res.json({ sukses: true, porosite, sipasDateve });
});

// GET /historiku/:pacientiId/grafiku — të dhëna për grafikë (trend analitic)
const historikuGrafiku = asyncHandler(async (req, res) => {
  const { pacientiId } = req.params;
  const porosite = await PorosiLab.find({
    pacienti: pacientiId,
    statusi: 'Kompletuar',
  })
    .populate('analizat.analiza', 'emri')
    .sort({ dataPorosis: 1 })
    .limit(200)
    .lean();

  // { "analizaEmri::komponentiEmri": [ { data, vlera, flamuri, njesia, kritikMin, kritikMax } ] }
  const trendet = {};

  porosite.forEach(por => {
    const dataStr = por.dataPorosis ? new Date(por.dataPorosis).toISOString().split('T')[0] : null;
    if (!dataStr) return;
    por.analizat.forEach(an => {
      const anEmri = an.analiza?.emri || 'E panjohur';
      (an.rezultate || []).forEach(rez => {
        if (!rez.komponenti || rez.vlera === undefined || rez.vlera === null || rez.vlera === '') return;
        const vleraNum = parseFloat(rez.vlera);
        if (isNaN(vleraNum)) return; // skip text results
        const key = `${anEmri}||${rez.komponenti}`;
        if (!trendet[key]) trendet[key] = {
          analiza: anEmri,
          komponenti: rez.komponenti,
          njesia: rez.njesia || '',
          kritikMin: rez.vleraMin,
          kritikMax: rez.vleraMax,
          pikat: [],
        };
        trendet[key].pikat.push({
          data: dataStr,
          vlera: vleraNum,
          flamuri: rez.flamuri || '—',
        });
        // Keep reference range from latest entry
        if (rez.vleraMin != null) trendet[key].kritikMin = rez.vleraMin;
        if (rez.vleraMax != null) trendet[key].kritikMax = rez.vleraMax;
      });
    });
  });

  // Return only components with at least 2 data points (useful for charting)
  const rezultati = Object.values(trendet).filter(t => t.pikat.length >= 1);
  res.json({ sukses: true, trendet: rezultati });
});

// Statistika ditore per dashboard
const statistikaDitore = asyncHandler(async (req, res) => {
  const { data } = req.query;
  const dataFilter = data ? new Date(data) : new Date();
  dataFilter.setHours(0,0,0,0);
  const dataMbarim = new Date(dataFilter); dataMbarim.setHours(23,59,59,999);
  const filter = { dataPorosis: { $gte: dataFilter, $lte: dataMbarim } };

  const [total, sipasDeprt, sipasStatusit, faturimi] = await Promise.all([
    PorosiLab.countDocuments(filter),
    PorosiLab.aggregate([{ $match: filter }, { $group: { _id: '$departamenti', count: { $sum: 1 }, total: { $sum: '$cmimi' } } }]),
    PorosiLab.aggregate([{ $match: filter }, { $group: { _id: '$statusi', count: { $sum: 1 } } }]),
    PorosiLab.aggregate([{ $match: filter }, { $group: { _id: null, totalCmimi: { $sum: '$cmimi' } } }]),
  ]);

  res.json({ sukses: true, total, sipasDeprt, sipasStatusit, totalFaturimi: faturimi[0]?.totalCmimi || 0 });
});

// ── PDF Raport ──────────────────────────────────────────────────
const gjeneroRaportPDF = asyncHandler(async (req, res) => {
  const { gjeneroRaportPDF: gjeneroPDF } = require('../utils/pdfGenerator');
  const Settings   = require('../models/Settings');
  const Nenshkrim  = require('../models/Nenshkrim');

  const [porosi, dbSettings, teGjithaNenshkrimet] = await Promise.all([
    PorosiLab.findById(req.params.id)
      .populate('pacienti')
      .populate('laboranti',  'emri mbiemri')
      .populate('derguesit',  'emri mbiemri roli specialiteti')
      .populate('referuesId', 'emri mbiemri tipi specialiteti institucioni eshteDefault')
      .populate({
        path:   'analizat.analiza',
        select: 'emri kodi departamenti intervale komponente profiliId',
        populate: { path: 'profiliId', model: 'Profili', select: 'emri numrRendor' },
      })
      .lean(),
    Settings.findOne().lean(),
    Nenshkrim.find({ aktiv: true }).sort({ createdAt: 1 }).lean(),
  ]);

  if (!porosi) return res.status(404).json({ sukses: false, mesazh: 'Porosi nuk u gjet' });

  // Filter signatures by department (supports both legacy departamenti and new departamentet[])
  const dep = porosi.departamenti || '';
  const perDep = teGjithaNenshkrimet.filter(n => {
    const depts = n.departamentet?.length ? n.departamentet : [n.departamenti || 'Te gjitha'];
    return depts.includes('Te gjitha') || depts.includes(dep);
  });

  // Stamps are NOT automatic — only those explicitly activated by user appear
  const vulaParam = (req.query.vula || '').trim();
  const vulatAktiveIds = vulaParam
    ? new Set(vulaParam.split(',').map(id => id.trim()).filter(Boolean))
    : new Set();
  const nenshkrimet = perDep.filter(n => vulatAktiveIds.has(String(n._id)));

  const s = dbSettings || {};
  const settings = {
    emriKlinikes:     s.emriKlinikes     || 'MedLab Pro',
    adresaKlinikes:   s.adresaKlinikes   || '',
    telefonKlinikes:  s.telefonKlinikes  || '',
    emailKlinikes:    s.emailKlinikes    || '',
    logo:             s.logo             || '',
    headerTekst:      s.headerTekst      || '',
    footer:           s.footer           || '',
    referuesiDefault: s.referuesiDefault || 'Vete ardhur',
    qrBaseUrl:        s.qrBaseUrl        || '',
    qrKodAktiv:       s.qrKodAktiv       ?? true,
    nenshkrimet,
  };

  // Nese tokenPublik mungon (porosi e vjeter), gjenero dhe ruaj
  if (!porosi.tokenPublik) {
    const tok = require('crypto').randomBytes(20).toString('hex');
    await PorosiLab.findByIdAndUpdate(porosi._id, { tokenPublik: tok });
    porosi.tokenPublik = tok;
  }
  let pdfBuffer;
  try {
    pdfBuffer = await gjeneroPDF(porosi, settings);
  } catch (err) {
    console.error('[PDF GENERATION ERROR]', {
      porosiId: req.params.id,
      numrPorosi: porosi.numrPorosi,
      pacientiId: porosi.pacienti?._id,
      kaLogo: Boolean(settings.logo),
      qrBaseUrl: settings.qrBaseUrl,
      vulaParam,
      nenshkrimeAktive: nenshkrimet.map((n) => ({
        id: String(n._id),
        emri: `${n.emri || ''} ${n.mbiemri || ''}`.trim(),
        kaFoto: Boolean(n.foto),
      })),
      errorMessage: err.message,
      stack: err.stack,
    });
    throw err;
  }

  const pac = porosi.pacienti || {};
  const emriSkedar = [pac.emri, pac.mbiemri, porosi.numrPorosi]
    .filter(Boolean)
    .join('_')
    .replace(/\s+/g, '_');

  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `inline; filename="${emriSkedar}.pdf"`,
    'Content-Length':      pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

// Listo profilet me analizat perberese — nga modeli Profili
const listoProfilet = asyncHandler(async (req, res) => {
  const profilet = await Profili.find({ aktiv: true }).sort({ numrRendor: 1, emri: 1 });

  const profiletMeAnaliza = await Promise.all(profilet.map(async prof => {
    const analizatProfil = await Analiza.find(
      { profiliId: prof._id, aktiv: true },
      'emri kodi departamenti cmime komponente'
    ).sort({ emri: 1 });
    return { ...prof.toObject(), analizatProfil };
  }));

  res.json({ sukses: true, profilet: profiletMeAnaliza });
});

const shtoAnalizaNePorosi = asyncHandler(async (req, res) => {
  const { analizatIds = [] } = req.body;
  const porosi = await PorosiLab.findById(req.params.id);
  if (!porosi) { res.status(404); throw new Error('Porosi nuk u gjet'); }

  const analizatRe = await Analiza.find({ _id: { $in: analizatIds }, aktiv: true });
  analizatRe.forEach(a => {
    porosi.analizat.push({ analiza: a._id, profiliId: undefined, profiliEmri: '' });
  });
  if (porosi.statusi === 'Kompletuar') porosi.statusi = 'NeProcesim';
  await porosi.save();
  res.json({ sukses: true, porosi });
});

// ══════════════════════════════════════════════
// IMPORT / EXPORT EXCEL
// ══════════════════════════════════════════════

const DEPARTAMENTET_VLEFSHME = ['Biokimi', 'Mikrobiologji', 'PCR'];

// POST /api/laborator/analizat/import-excel
// Body: multipart/form-data — field "file" (.xlsx)
const importoAnalizatExcel = asyncHandler(async (req, res) => {
  if (!req.file) { res.status(400); throw new Error('Skedari nuk u ngarkua'); }

  const workbook  = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet     = workbook.Sheets[workbook.SheetNames[0]];
  const rows      = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) { res.status(400); throw new Error('Skedari eshte bosh'); }

  // Merr kodet ekzistuese per kontroll duplikatesh
  const kodetEkzistuese = new Set(
    (await Analiza.find({}, 'kodi').lean()).map(a => a.kodi.toUpperCase())
  );

  // Merr te gjithe profilet — lookup me emer (case-insensitive)
  const profiletDB = await Profili.find({}, '_id emri').lean();
  const profiliMap = new Map(profiletDB.map(p => [p.emri.toLowerCase().trim(), p._id]));

  const gabimet  = [];
  const vlefshme = [];

  rows.forEach((row, idx) => {
    const nr = idx + 2; // rreshti 1 = header
    const errs = [];

    const kodi              = String(row.analysis_code   || '').trim().toUpperCase();
    const emri              = String(row.analysis_name   || '').trim();
    const materialBiologjik = String(row.sample_type     || '').trim() || 'Gjak venoz';
    const departamenti      = String(row.departamenti     || row.department || 'Biokimi').trim();
    const cmimiPacient      = parseFloat(row.patient_price  ?? row.cmimi_pacient  ?? 0);
    const cmimiBashkpuntor  = parseFloat(row.partner_price  ?? row.cmimi_bashkpuntor ?? 0);
    const profiliEmri       = String(row.profile_name    || row.profili || '').trim();

    if (!kodi)  errs.push('analysis_code mungon');
    if (!emri)  errs.push('analysis_name mungon');
    if (isNaN(cmimiPacient))    errs.push('patient_price jo numerike');
    if (isNaN(cmimiBashkpuntor)) errs.push('partner_price jo numerike');
    if (kodetEkzistuese.has(kodi)) errs.push(`Kodi "${kodi}" ekziston tashme`);

    // Normalizon departamentin — fallback ne Biokimi
    const dep = DEPARTAMENTET_VLEFSHME.find(d => d.toLowerCase() === departamenti.toLowerCase()) || 'Biokimi';

    // Gjej profiliId — nese eshte dhene emer por nuk gjendet, shto gabim
    let profiliId = null;
    if (profiliEmri) {
      profiliId = profiliMap.get(profiliEmri.toLowerCase()) || null;
      if (!profiliId) errs.push(`Profili "${profiliEmri}" nuk u gjet`);
    }

    if (errs.length) {
      gabimet.push({ rreshti: nr, kodi: kodi || '—', gabime: errs.join('; ') });
    } else {
      kodetEkzistuese.add(kodi); // shmangu duplikate brenda skedarit
      vlefshme.push({
        kodi,
        emri,
        departamenti: dep,
        materialBiologjik,
        cmime: { pacient: cmimiPacient, bashkpuntor: cmimiBashkpuntor },
        profiliId: profiliId || null,
        aktiv: true,
      });
    }
  });

  if (gabimet.length) {
    return res.status(422).json({ sukses: false, gabimet, totali: rows.length });
  }

  await Analiza.insertMany(vlefshme, { ordered: false });

  res.status(201).json({ sukses: true, importuara: vlefshme.length });
});

// GET /api/laborator/analizat/eksport-excel
const eksportoAnalizatExcel = asyncHandler(async (req, res) => {
  const { departamenti } = req.query;
  const filter = { aktiv: true };
  if (departamenti) filter.departamenti = departamenti;

  const analizat = await Analiza.find(filter).populate('profiliId', 'emri').sort({ departamenti: 1, emri: 1 }).lean();

  const rreshtat = analizat.map(a => ({
    analysis_code:  a.kodi,
    analysis_name:  a.emri,
    department:     a.departamenti,
    sample_type:    a.materialBiologjik || '',
    profile_name:   a.profiliId?.emri   || '',
    patient_price:  a.cmime?.pacient    ?? 0,
    partner_price:  a.cmime?.bashkpuntor ?? 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rreshtat);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analizat');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '_');
  res.set({
    'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="analyses_export_${today}.xlsx"`,
    'Content-Length':      buffer.length,
  });
  res.send(buffer);
});

// GET /api/laborator/analizat/template-excel  — download blank template
const templateExcel = asyncHandler(async (req, res) => {
  const rreshtat = [
    { analysis_code: 'GLU', analysis_name: 'Glucose',    department: 'Biokimi', sample_type: 'Serum',      profile_name: 'Biokimi Baze', patient_price: 3.00, partner_price: 2.00 },
    { analysis_code: 'HGB', analysis_name: 'Hemoglobin', department: 'Biokimi', sample_type: 'Gjak venoz', profile_name: '',             patient_price: 5.00, partner_price: 4.00 },
  ];
  const ws = XLSX.utils.json_to_sheet(rreshtat);
  ws['!cols'] = [
    { wch: 14 }, { wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.set({
    'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="analyses_template.xlsx"',
    'Content-Length':      buffer.length,
  });
  res.send(buffer);
});

// ── Ndrysho flagjet e analizes (shfaqNeRaport / primare) ─────────────────────
const perditesoFlagetAnalizen = asyncHandler(async (req, res) => {
  const { rowId, shfaqNeRaport, primare } = req.body;
  const porosi = await PorosiLab.findById(req.params.id);
  if (!porosi) { res.status(404); throw new Error('Porosi nuk u gjet'); }
  const row = porosi.analizat.id(rowId);
  if (!row) { res.status(404); throw new Error('Analiza nuk u gjet'); }
  if (shfaqNeRaport !== undefined) row.shfaqNeRaport = shfaqNeRaport;
  if (primare !== undefined) row.primare = primare;
  await porosi.save();
  res.json({ sukses: true });
});

// GET /api/laborator/publik/pdf/:token — pa auth, për QR code
const pdfPublik = asyncHandler(async (req, res) => {
  const porosi = await PorosiLab.findOne({ tokenPublik: req.params.token })
    .populate('pacienti')
    .populate('referuesId', 'emri mbiemri institucioni tipi eshteDefault')
    .populate('analizat.analiza', 'emri kodi departamenti komponente profiliId');
  if (!porosi) { res.status(404); throw new Error('Raport nuk u gjet ose link i pavlefshëm'); }
  // Lejohet vetëm nëse është validuar
  if (!porosi.validimTeknik?.bere) {
    res.status(403); throw new Error('Rezultatet nuk janë ende gati');
  }
  const Settings = require('../models/Settings');
  const settings = await Settings.findOne().lean() || {};
  const { gjeneroRaportPDFBuffer } = require('../utils/pdfGenerator');
  const buf = await gjeneroRaportPDFBuffer(porosi, settings);
  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `inline; filename="rezultate_${porosi.numrPorosi}.pdf"`,
    'Content-Length':      buf.length,
  });
  res.send(buf);
});

module.exports = {
  listoAnalizat, merrAnalizen, shtoAnalizen, perditesAnalizen, fshiAnalizen,
  listoPorosite, merrPorosine, krijoPorosine, fshiPorosine, regjistroRezultatet,
  ndryshoStatusin, bejValidimin, historikuPacientit, historikuGrafiku, statistikaDitore,
  gjeneroRaportPDF, listoProfilet, shtoAnalizaNePorosi,
  importoAnalizatExcel, eksportoAnalizatExcel, templateExcel,
  perditesoFlagetAnalizen, pdfPublik,
};
