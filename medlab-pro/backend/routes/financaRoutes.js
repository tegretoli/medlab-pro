const express = require('express');
const r       = express.Router();
const ctrl    = require('../controllers/financaCtrl');
const { mbrojtRoute } = require('../middleware/auth');

r.use(mbrojtRoute);

r.get('/dashboard',             ctrl.dashboard);
r.get('/raport/mujor',          ctrl.raportMujor);
r.get('/raport/analizave',      ctrl.raportiAnalizave);
r.get('/raport/departamenteve', ctrl.raportiDepartamenteve);
r.get('/komisjonet',            ctrl.raportiKomisioneve);
r.get('/borxhet',               ctrl.borxhet);
r.get('/eksport/excel',            ctrl.eksportExcel);
r.get('/fatura-kompanise/pdf',     ctrl.faturaKompanisePDF);
r.get('/fatura-kompanise',         ctrl.faturaKompanise);
r.get('/arkiva-faturave',                ctrl.listoArkiveFaturave);
r.get('/arkiva-faturave/:id/pdf',        ctrl.riGjeneroPDF);
r.get('/fatura-patient/pdf',             ctrl.faturaPatientPDF);
r.get('/fatura-patient',                 ctrl.faturaPatientData);
r.get('/arkiva-fatura-patient',          ctrl.listoArkiveFatPac);
r.get('/arkiva-fatura-patient/:id/pdf',  ctrl.riGjeneroPDFFatPac);

module.exports = r;
