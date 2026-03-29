const mongoose   = require('mongoose');
const Perdoruesi = require('../models/Perdoruesi');
const Referues   = require('../models/Referues');

const seed = async () => {
  try {
    // ─── Admin user ───────────────────────────────────────────────────────────
    const exists = await Perdoruesi.findOne({ email: 'arber.shala@exact.com' });
    if (!exists) {
      await Perdoruesi.create({
        emri:        'Arber',
        mbiemri:     'Shala',
        email:       'arber.shala@exact.com',
        fjalekalimi: 'Lolilanda',
        roli:        'admin',
        aktiv:       true,
      });
      console.log('✅ Seed user created: arber.shala@exact.com');
    }

    // ─── Referuesi default "Vetë Ardhur / V/A" ───────────────────────────────
    const refDefault = await Referues.findOne({ eshteDefault: true });
    if (!refDefault) {
      await Referues.create({
        emri:         'Vetë',
        mbiemri:      'Ardhur',
        tipi:         'Vete_Ardhur',
        institucioni: 'V/A',
        shenime:      'Referuesi default i sistemit — pacientë pa referues specifik',
        aktiv:        true,
        eshteDefault: true,
      });
      console.log('✅ Seed referues default: Vetë Ardhur (V/A)');
    }
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  }
};

module.exports = seed;
