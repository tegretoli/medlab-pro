const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/referuesCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/',    ctrl.listoReferuesit);
r.get('/:id', ctrl.merrReferuesin);
r.post('/',   ctrl.shtoReferuesin);
r.put('/:id', ctrl.perditesReferuesin);
r.delete('/:id', ctrl.fshiReferuesin);

module.exports = r;
