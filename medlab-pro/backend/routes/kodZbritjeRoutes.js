const express = require('express');
const r       = express.Router();
const { mbrojtRoute, kontrolloRolin } = require('../middleware/auth');
const ctrl = require('../controllers/kodZbritjeCtrl');

r.use(mbrojtRoute);

r.post('/valido',    ctrl.validoKodin);           // any authenticated staff
r.get('/perdorimet', kontrolloRolin('admin'), ctrl.perdorimet);

// Admin CRUD
r.get('/',                    kontrolloRolin('admin'), ctrl.listoKodet);
r.get('/:id/perdorimet',     kontrolloRolin('admin'), ctrl.perdorimetDetaje);
r.post('/',      kontrolloRolin('admin'), ctrl.krijoKodin);
r.put('/:id',    kontrolloRolin('admin'), ctrl.perditsoKodin);
r.delete('/:id', kontrolloRolin('admin'), ctrl.fshiKodin);

module.exports = r;
