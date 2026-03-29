const express = require('express');
const multer  = require('multer');
const r = express.Router();
const ctrl = require('../controllers/laboratorCtrl');
const { mbrojtRoute } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Lejohet vetem .xlsx'));
    }
  },
});

// ── Route publike (pa auth) — akses me token QR ───────────────
r.get('/publik/pdf/:token', ctrl.pdfPublik);

r.use(mbrojtRoute);

// Katalogu Analizave
r.get('/analizat',                  ctrl.listoAnalizat);
r.get('/analizat/profilet',         ctrl.listoProfilet);
r.get('/analizat/eksport-excel',    ctrl.eksportoAnalizatExcel);
r.get('/analizat/template-excel',   ctrl.templateExcel);
r.post('/analizat/import-excel',    upload.single('file'), ctrl.importoAnalizatExcel);
r.get('/analizat/:id',              ctrl.merrAnalizen);
r.post('/analizat',                 ctrl.shtoAnalizen);
r.put('/analizat/:id',              ctrl.perditesAnalizen);
r.delete('/analizat/:id',           ctrl.fshiAnalizen);

// Porosite
r.get('/porosi',               ctrl.listoPorosite);
r.post('/porosi',              ctrl.krijoPorosine);
r.get('/porosi/:id',           ctrl.merrPorosine);
r.delete('/porosi/:id',        ctrl.fshiPorosine);
r.put('/porosi/:id/rezultate', ctrl.regjistroRezultatet);
r.put('/porosi/:id/statusi',   ctrl.ndryshoStatusin);
r.put('/porosi/:id/validim',   ctrl.bejValidimin);
r.put('/porosi/:id/shto-analiza',   ctrl.shtoAnalizaNePorosi);
r.patch('/porosi/:id/analiza-flags', ctrl.perditesoFlagetAnalizen);

// PDF Raport — SHTUAR
r.get('/porosi/:id/pdf',       ctrl.gjeneroRaportPDF);

// Historiku dhe Statistika
r.get('/historiku/:pacientiId',         ctrl.historikuPacientit);
r.get('/historiku/:pacientiId/grafiku', ctrl.historikuGrafiku);
r.get('/statistika/ditore',     ctrl.statistikaDitore);

module.exports = r;
