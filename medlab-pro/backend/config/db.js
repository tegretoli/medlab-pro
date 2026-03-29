const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB u lidh: ${conn.connection.host}`);

    // ─── Hiq ÇFARËDO indexi unik/sparse mbi numrPersonal ─────────────────
    // (trashëgimi nga versioni i vjetër i schemës — tani lejohen duplikate)
    try {
      const col = conn.connection.collection('pacientet');
      const indexes = await col.indexes();
      for (const idx of indexes) {
        const keys = Object.keys(idx.key || {});
        if (keys.length === 1 && keys[0] === 'numrPersonal') {
          await col.dropIndex(idx.name);
          console.log(`✅ Index '${idx.name}' (numrPersonal) u hoq — duplikatet lejohen`);
        }
      }
    } catch (idxErr) {
      console.log('ℹ️  numrPersonal index: nuk ka nevojë për ndryshim');
    }
    // ─────────────────────────────────────────────────────────────────────

  } catch (err) {
    console.error(`❌ Gabim DB: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
