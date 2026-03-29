const express = require('express');
const { mbrojtRoute } = require('../middleware/auth');
const {
  listoBackupetCtrl,
  krijoBackupCtrl,
  shkarkoBackupCtrl,
  fshiBackupCtrl,
  ruajSettingsBackup,
} = require('../controllers/backupCtrl');

const r = express.Router();

r.get('/',                mbrojtRoute, listoBackupetCtrl);
r.post('/',               mbrojtRoute, krijoBackupCtrl);
r.put('/settings',        mbrojtRoute, ruajSettingsBackup);
r.get('/:filename',       mbrojtRoute, shkarkoBackupCtrl);
r.delete('/:filename',    mbrojtRoute, fshiBackupCtrl);

module.exports = r;
