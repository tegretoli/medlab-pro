const express = require('express');
const router  = express.Router();
const {
  regjistro, hyrje, verifikto2FA,
  merreProfilin, logout, ndryshoFjalekalimin, perditesoProfil,
} = require('../controllers/authCtrl');
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');

router.post('/hyrje',          hyrje);
router.post('/verifikto-2fa',  verifikto2FA);
router.post('/regjistro',      mbrojtRoute, kontrolloRolin('admin'), regjistro);
router.get('/profili',         mbrojtRoute, merreProfilin);
router.post('/logout',         mbrojtRoute, logout);
router.put('/profili',         mbrojtRoute, perditesoProfil);
router.put('/fjalekalim',      mbrojtRoute, ndryshoFjalekalimin);

module.exports = router;
