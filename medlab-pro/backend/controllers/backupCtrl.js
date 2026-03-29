const asyncHandler  = require('express-async-handler');
const fs            = require('fs');
const path          = require('path');
const Settings      = require('../models/Settings');
const { krijoBackup, listoBackupet, rrugaBackupit } = require('../utils/backupUtil');

// GET /api/backup — lista e backup-eve
const listoBackupetCtrl = asyncHandler(async (req, res) => {
  const lista = listoBackupet();
  const settings = await Settings.findOne().lean();
  res.json({
    sukses: true,
    backupet: lista,
    settings: {
      backupAktiv:    settings?.backupAktiv    ?? false,
      backupOrari:    settings?.backupOrari    || 'ditore_02:00',
      backupMaksimum: settings?.backupMaksimum ?? 10,
    },
  });
});

// POST /api/backup — krijon backup manual
const krijoBackupCtrl = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne().lean();
  const max = settings?.backupMaksimum ?? 10;
  const rezultat = await krijoBackup(max);
  res.json({
    sukses:  true,
    mesazh:  'Backup u krijua me sukses',
    backup: {
      filename: rezultat.filename,
      madhesia: rezultat.madhesia,
      data:     new Date(),
    },
  });
});

// GET /api/backup/:filename — shkarko backup
const shkarkoBackupCtrl = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  if (!/^backup_\d{8}_\d{6}\.zip$/.test(filename)) {
    res.status(400); throw new Error('Emër skedari i pavlefshëm');
  }
  const filepath = rrugaBackupit(filename);
  if (!fs.existsSync(filepath)) {
    res.status(404); throw new Error('Backup nuk u gjet');
  }
  res.download(filepath, filename);
});

// DELETE /api/backup/:filename — fshin backup
const fshiBackupCtrl = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  if (!/^backup_\d{8}_\d{6}\.zip$/.test(filename)) {
    res.status(400); throw new Error('Emër skedari i pavlefshëm');
  }
  const filepath = rrugaBackupit(filename);
  if (!fs.existsSync(filepath)) {
    res.status(404); throw new Error('Backup nuk u gjet');
  }
  fs.unlinkSync(filepath);
  res.json({ sukses: true, mesazh: 'Backup u fshi' });
});

// PUT /api/backup/settings — ruan konfigurimet e backup
const ruajSettingsBackup = asyncHandler(async (req, res) => {
  const { backupAktiv, backupOrari, backupMaksimum } = req.body;
  const s = await Settings.findOneAndUpdate(
    {},
    { backupAktiv, backupOrari, backupMaksimum },
    { new: true, upsert: true }
  );
  // Rinifiloi cron-in
  const { rifiloCronin } = require('../utils/backupCron');
  rifiloCronin(s);
  res.json({ sukses: true, mesazh: 'Konfigurimet u ruajtën' });
});

module.exports = { listoBackupetCtrl, krijoBackupCtrl, shkarkoBackupCtrl, fshiBackupCtrl, ruajSettingsBackup };
