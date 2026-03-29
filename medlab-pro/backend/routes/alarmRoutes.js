const express = require('express');
const r    = express.Router();
const ctrl = require('../controllers/alarmCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/count',           ctrl.numriAlarmeve);
r.get('/',                ctrl.listoAlarmet);
r.put('/lexo-te-gjitha',  ctrl.lexoTeGjitheAlarmet);
r.put('/:id/lexo',        ctrl.lexoAllarmin);

module.exports = r;
