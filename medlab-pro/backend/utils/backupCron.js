const cron     = require('node-cron');
const Settings = require('../models/Settings');
const { krijoBackup } = require('./backupUtil');

let taskAktuale = null;

// Konverton 'ditore_02:00' → '0 2 * * *' (cron expression)
function orariNeCron(orari) {
  if (!orari) return null;
  const [frekuenca, koha] = orari.split('_');
  const [ora, minuta] = (koha || '02:00').split(':').map(Number);
  if (frekuenca === 'ditore')  return `${minuta ?? 0} ${ora ?? 2} * * *`;
  if (frekuenca === 'javore')  return `${minuta ?? 0} ${ora ?? 2} * * 1`; // e hënë
  if (frekuenca === 'mujore')  return `${minuta ?? 0} ${ora ?? 2} 1 * *`; // 1 i muajit
  return null;
}

function rifiloCronin(settings) {
  // Ndalon taskun e vjetër nëse ekziston
  if (taskAktuale) {
    try { taskAktuale.destroy(); } catch {}
    taskAktuale = null;
  }
  if (!settings?.backupAktiv) return;

  const cronExpr = orariNeCron(settings.backupOrari);
  if (!cronExpr || !cron.validate(cronExpr)) return;

  const max = settings.backupMaksimum ?? 10;
  taskAktuale = cron.schedule(cronExpr, async () => {
    try {
      console.log(`[Backup] Duke krijuar backup automatik...`);
      const r = await krijoBackup(max);
      console.log(`[Backup] ✅ Backup i krijuar: ${r.filename} (${(r.madhesia/1024).toFixed(0)} KB)`);
    } catch (err) {
      console.error(`[Backup] ❌ Gabim gjatë backup automatik:`, err.message);
    }
  }, { timezone: 'Europe/Tirane' });

  console.log(`[Backup] Cron i konfiguruar: ${cronExpr} (${settings.backupOrari})`);
}

async function inicializoCronin() {
  try {
    const settings = await Settings.findOne().lean();
    rifiloCronin(settings);
  } catch {}
}

module.exports = { inicializoCronin, rifiloCronin };
