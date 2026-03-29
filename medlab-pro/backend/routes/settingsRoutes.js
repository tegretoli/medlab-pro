const express = require('express');
const { mbrojtRoute } = require('../middleware/auth');
const { merrSettings, perditesSettings } = require('../controllers/settingsCtrl');

const r = express.Router();
r.get('/',  mbrojtRoute, merrSettings);
r.put('/',  mbrojtRoute, perditesSettings);

module.exports = r;
