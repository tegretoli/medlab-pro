/**
 * Reset Script — Fshi të gjitha analizat dhe profilet
 * Run: node backend/resetData.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

const Analiza = require('./models/Analiza');
const Profili = require('./models/Profili');

async function reset() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Lidhur me MongoDB');

  const nrAnaliza = await Analiza.countDocuments();
  const nrProfilet = await Profili.countDocuments();

  console.log(`\nGjetur: ${nrAnaliza} analiza, ${nrProfilet} profil(e)`);
  console.log('Duke fshirë...');

  await Analiza.deleteMany({});
  await Profili.deleteMany({});

  console.log('✅ Të gjitha analizat dhe profilet u fshinë.\n');
  await mongoose.disconnect();
}

reset().catch(err => {
  console.error('❌ Gabim:', err.message);
  process.exit(1);
});
