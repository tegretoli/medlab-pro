// kontrolliRoutes.js
const express = require('express');
const r1 = express.Router();
const ctrl = require('../controllers/kontrolliCtrl');
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');
r1.use(mbrojtRoute);
r1.get('/kalendar',        ctrl.merreKalendarin);
r1.get('/statistika',      ctrl.merreStatistikat);
r1.get('/',                ctrl.listoKontrollet);
r1.post('/',               kontrolloRolin('admin','mjek','recepsionist'), ctrl.krijoKontrollin);
r1.get('/:id',             ctrl.merrKontrollin);
r1.put('/:id',             kontrolloRolin('admin','mjek'), ctrl.perditesKontrollin);
r1.put('/:id/statusi',     kontrolloRolin('admin','mjek','recepsionist'), ctrl.ndryshoStatusin);
module.exports = r1;
