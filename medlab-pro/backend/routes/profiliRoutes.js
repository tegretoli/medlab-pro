const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/profiliCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/',    ctrl.listoProfilet);
r.post('/',   ctrl.shtoProfilin);
r.get('/:id', ctrl.merrProfilin);
r.put('/:id', ctrl.perditesProfilin);
r.delete('/:id', ctrl.fshiProfilin);

module.exports = r;
