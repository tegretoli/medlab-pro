const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/pakoCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/',    ctrl.listoPaketat);
r.post('/',   ctrl.shtoPakon);
r.get('/:id', ctrl.merrPakon);
r.put('/:id', ctrl.perditesoPakon);
r.delete('/:id', ctrl.fshiPakon);

module.exports = r;
