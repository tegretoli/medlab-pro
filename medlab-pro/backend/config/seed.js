const bcrypt = require('bcryptjs');
const Perdoruesi = require('../models/Perdoruesi');
const Referues = require('../models/Referues');

const seed = async () => {
  try {
    const adminEmail = 'arber.shala@exact.com';
    const adminExists = await Perdoruesi.findOne({ email: adminEmail });
    const adminSalt = await bcrypt.genSalt(12);
    const adminHashedPassword = await bcrypt.hash('Lolilanda', adminSalt);

    await Perdoruesi.collection.updateOne(
      { email: adminEmail },
      {
        $set: {
          emri: 'Arber',
          mbiemri: 'Shala',
          email: adminEmail,
          fjalekalimi: adminHashedPassword,
          roli: 'admin',
          aktiv: true,
          njoftimetEmail: true,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          __v: 0,
        },
      },
      { upsert: true }
    );

    console.log(`Seed user synced: ${adminEmail}${adminExists ? '' : ' (created)'}`);

    const bypassEmail = 'rinesasmajli11@gmail.com';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('rinkirinki12', salt);
    const bypassUser = await Perdoruesi.findOne({ email: bypassEmail });

    await Perdoruesi.collection.updateOne(
      { email: bypassEmail },
      {
        $set: {
          emri: 'Rines',
          mbiemri: 'Asmajli',
          email: bypassEmail,
          fjalekalimi: hashedPassword,
          roli: 'admin',
          aktiv: true,
          njoftimetEmail: true,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          qasjet: [],
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          __v: 0,
        },
      },
      { upsert: true }
    );

    console.log(`Seed user synced: ${bypassEmail}${bypassUser ? '' : ' (created)'}`);

    const refDefault = await Referues.findOne({ eshteDefault: true });
    if (!refDefault) {
      await Referues.create({
        emri: 'Vete',
        mbiemri: 'Ardhur',
        tipi: 'Vete_Ardhur',
        institucioni: 'V/A',
        shenime: 'Referuesi default i sistemit per paciente pa referues specifik',
        aktiv: true,
        eshteDefault: true,
      });
      console.log('Seed referues default created: Vete Ardhur (V/A)');
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

module.exports = seed;
