const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/nenshkrimCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/',    ctrl.listoNenshkrimet);
r.post('/',   ctrl.shtoNenshkrimin);
r.put('/:id', ctrl.perditesNenshkrimin);
r.delete('/:id', ctrl.fshiNenshkrimin);

module.exports = r;
