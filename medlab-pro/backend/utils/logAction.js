const AuditLog = require('../models/AuditLog');

/**
 * Regjistro një veprim në audit log.
 * Nuk hedh gabim — dështimet e logimit nuk prishin flow kryesor.
 *
 * @param {Object} req         - Express request (ose objekt me { perdoruesi, headers, ip })
 * @param {string} veprimi     - Emri i veprimit p.sh. 'CREATE_PATIENT', 'EDIT_RESULT'
 * @param {Object} opts
 * @param {string} opts.kategorija     - 'Auth' | 'Pacient' | 'Laborator' | 'Rezultat' | 'Financa' | 'Settings' | 'Perdorues' | 'Tjeter'
 * @param {string} opts.moduliDetajuar - p.sh. 'Analiza', 'Porosi', 'Fatura'
 * @param {string} opts.rekordId       - ID e objektit të afektuar
 * @param {string} opts.rekordEmri     - Emri i objektit (p.sh. emri i pacientit)
 * @param {any}    opts.vleraVjeter    - Vlera e vjetër (do të ruhet si JSON)
 * @param {any}    opts.vleraRe        - Vlera e re (do të ruhet si JSON)
 * @param {string} opts.pershkrimi     - Përshkrim i lirë
 * @param {boolean} opts.alarmi        - true nëse ky është ndryshim kritik
 * @param {string} opts.alarmTipi      - Tipi i alarmit p.sh. 'REZULTAT_PAS_VALIDIMIT'
 * @param {string} opts.statusi        - 'sukses' | 'deshtoi'
 */
const logVeprimin = async (req, veprimi, {
  kategorija    = 'Tjeter',
  moduliDetajuar,
  rekordId,
  rekordEmri,
  vleraVjeter,
  vleraRe,
  pershkrimi,
  alarmi     = false,
  alarmTipi,
  statusi    = 'sukses',
} = {}) => {
  try {
    const p  = req?.perdoruesi;
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
             || req?.ip
             || req?.connection?.remoteAddress
             || '—';

    const serializo = (val) => {
      if (val == null) return undefined;
      if (typeof val === 'string') return val;
      try { return JSON.stringify(val, null, 0); } catch { return String(val); }
    };

    await AuditLog.create({
      perdoruesId:   p?._id,
      perdoruesEmri: p ? `${p.emri} ${p.mbiemri}`.trim() : 'System',
      perdoruesRoli: p?.roli || 'system',
      veprimi,
      kategorija,
      moduliDetajuar,
      rekordId:    rekordId   ? String(rekordId)   : undefined,
      rekordEmri:  rekordEmri ? String(rekordEmri) : undefined,
      vleraVjeter: serializo(vleraVjeter),
      vleraRe:     serializo(vleraRe),
      pershkrimi,
      alarmi,
      alarmTipi,
      ipAdresa: ip,
      statusi,
    });
  } catch (err) {
    console.error('[AuditLog] Gabim gjatë regjistrimit:', err.message);
  }
};

module.exports = { logVeprimin };
