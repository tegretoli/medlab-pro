const mongoose  = require('mongoose');
const fs        = require('fs');
const path      = require('path');
const archiver  = require('archiver');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Sigurohu qe direktoria ekziston
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

/**
 * Eksporton të gjitha koleksionet e MongoDB dhe i paketon si ZIP.
 * @param {number} maxBackups - numri maksimal i backup-eve për të mbajtur (0 = pa limit)
 * @returns {Promise<{filename, filepath, madhesia}>}
 */
async function krijoBackup(maxBackups = 10) {
  const tani     = new Date();
  const stamp    = `${tani.getFullYear()}${String(tani.getMonth()+1).padStart(2,'0')}${String(tani.getDate()).padStart(2,'0')}_${String(tani.getHours()).padStart(2,'0')}${String(tani.getMinutes()).padStart(2,'0')}${String(tani.getSeconds()).padStart(2,'0')}`;
  const filename = `backup_${stamp}.zip`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Merr të gjitha koleksionet aktive nga mongoose
  const koleksionet = mongoose.connection.db
    ? await mongoose.connection.db.listCollections().toArray()
    : [];

  return new Promise((resolve, reject) => {
    const output  = fs.createWriteStream(filepath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', async () => {
      const stats = fs.statSync(filepath);
      // Pastro backup-et e vjetra nëse maxBackups > 0
      if (maxBackups > 0) pastroBevjet(maxBackups);
      resolve({ filename, filepath, madhesia: stats.size });
    });
    archive.on('error', err => { reject(err); });
    archive.pipe(output);

    // Shkruaj çdo koleksion si skedar JSON brenda ZIP
    const premtimet = koleksionet.map(async col => {
      try {
        const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
        archive.append(JSON.stringify(docs, null, 2), { name: `${col.name}.json` });
      } catch {}
    });

    Promise.all(premtimet).then(() => archive.finalize()).catch(reject);
  });
}

/**
 * Kthen listën e backup-eve ekzistuese, të renditura nga më i riu.
 */
function listoBackupet() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.zip'))
    .map(f => {
      const fp    = path.join(BACKUP_DIR, f);
      const stats = fs.statSync(fp);
      return { filename: f, madhesia: stats.size, data: stats.mtime };
    })
    .sort((a, b) => b.data - a.data);
}

/**
 * Fshin backup-et e vjetër duke mbajtur vetëm `max` të fundit.
 */
function pastroBevjet(max) {
  const lista = listoBackupet();
  if (lista.length > max) {
    lista.slice(max).forEach(b => {
      try { fs.unlinkSync(path.join(BACKUP_DIR, b.filename)); } catch {}
    });
  }
}

function rrugaBackupit(filename) {
  return path.join(BACKUP_DIR, path.basename(filename));
}

module.exports = { krijoBackup, listoBackupet, rrugaBackupit, BACKUP_DIR };
