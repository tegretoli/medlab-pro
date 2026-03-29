const express = require('express');
const router  = express.Router();
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');
const { listoLogs, merrKategorite, eksportoExcel, eksportoPDF } = require('../controllers/auditCtrl');

router.use(mbrojtRoute);
router.use(kontrolloRolin('admin'));

router.get('/',              listoLogs);
router.get('/meta',          merrKategorite);
router.get('/eksport-excel', eksportoExcel);
router.get('/eksport-pdf',   eksportoPDF);

module.exports = router;
