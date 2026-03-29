// pacientiRoutes.js
const express = require('express');
const r1 = express.Router();
const ctrl = require('../controllers/pacientiCtrl');
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');
const { uploadDok } = require('../config/cloudinary');

r1.use(mbrojtRoute);
r1.get('/kerko',             ctrl.kerkoPacientin);
r1.get('/',                  ctrl.listoPacientet);
r1.post('/',                 kontrolloRolin('admin','mjek','recepsionist'), ctrl.regjistroPatient);
r1.get('/:id',               ctrl.merrPacientin);
r1.put('/:id',               kontrolloRolin('admin','mjek','recepsionist'), ctrl.perditesoPacientin);
r1.delete('/:id',            kontrolloRolin('admin'), ctrl.fshiPacientin);
r1.get('/:id/histori',       ctrl.merreHistorikun);
r1.post('/:id/dokument',     uploadDok.single('skedar'), ctrl.ngarkoDokument);
module.exports = r1;
