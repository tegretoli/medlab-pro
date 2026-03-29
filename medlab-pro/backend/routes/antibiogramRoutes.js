const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/antibiogramCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/grupet',        ctrl.listoGrupet);
r.post('/grupet',       ctrl.shtoGrupin);
r.put('/grupet/:id',    ctrl.perditesGrupin);
r.delete('/grupet/:id', ctrl.fshiGrupin);

r.get('/sablonet',        ctrl.listoSablonet);
r.post('/sablonet',       ctrl.shtoSablonin);
r.put('/sablonet/:id',    ctrl.perditesaSablonin);
r.delete('/sablonet/:id', ctrl.fshiSablonin);

module.exports = r;
