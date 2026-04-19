const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pagesaCtrl');
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');

router.post('/fiskal/jobs/bridge/claim',          ctrl.bridgeClaimFiscalJob);
router.post('/fiskal/jobs/:id/bridge/queued',     ctrl.bridgeQueueFiscalJob);
router.post('/fiskal/jobs/:id/bridge/complete',   ctrl.bridgeCompleteFiscalJob);

router.use(mbrojtRoute);
router.get('/porosi-ditore',        ctrl.listoPorosiPagesat);
router.put('/porosi/:id/paguaj',   kontrolloRolin('admin','recepsionist','mjek'), ctrl.regjistroPagesenPorosi);
router.post('/fiskal/jobs',        kontrolloRolin('admin','recepsionist','mjek'), ctrl.krijoFiscalJob);
router.get('/fiskal/jobs/:id',     kontrolloRolin('admin','recepsionist','mjek'), ctrl.merrFiscalJob);
router.get('/faturat',             ctrl.listoFaturat);
router.post('/faturat',            kontrolloRolin('admin','recepsionist','mjek'), ctrl.krijoFaturen);
router.get('/faturat/:id',         ctrl.merrFaturen);
router.put('/faturat/:id/paguaj',  kontrolloRolin('admin','recepsionist'), ctrl.regjistroPagesen);
router.get('/faturat/:id/pdf',     ctrl.shkarkoFaturenPDF);
router.post('/faturat/:id/email',  kontrolloRolin('admin','recepsionist'), ctrl.dergFaturenEmail);
router.get('/borxhet-pacienteve',  ctrl.borxhetPacienteve);
router.get('/pacienti/:id/borxhi', ctrl.borxhiPacienti);
router.get('/detyrime',            kontrolloRolin('admin','recepsionist'), ctrl.merreDetyrimet);
router.get('/statistika',          kontrolloRolin('admin'), ctrl.merreStatistikat);
router.get('/raport/mujor',        kontrolloRolin('admin'), ctrl.raportMujor);
module.exports = router;
