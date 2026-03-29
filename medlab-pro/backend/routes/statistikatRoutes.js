const express = require('express');
const router  = express.Router();
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');
const { merrStatistikat, eksportoExcel, eksportoPDF } = require('../controllers/statistikatCtrl');

router.use(mbrojtRoute);

router.get('/',              merrStatistikat);
router.get('/eksport-excel', eksportoExcel);
router.get('/eksport-pdf',   eksportoPDF);

module.exports = router;
