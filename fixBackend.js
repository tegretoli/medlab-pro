/**
 * Fixes Albanian chars in backend files that must match frontend strings.
 * Ignores node_modules and comment-only changes.
 */
const fs = require('fs');
const path = require('path');

// Only fix specific backend files (not node_modules)
const targets = [
  'medlab-pro/backend/models/Fatura.js',
  'medlab-pro/backend/routes/dashboardRoutes.js',
  'medlab-pro/backend/controllers/pagesaCtrl.js',
  'medlab-pro/backend/controllers/laboratorCtrl.js',
  'medlab-pro/backend/routes/laboratorRoutes.js',
  'medlab-pro/backend/utils/pdfGenerator.js',
];

const base = 'C:/Users/PC/Desktop/medlab-pro-v3/';

for (const rel of targets) {
  const f = base + rel;
  if (!fs.existsSync(f)) { console.log('NOT FOUND: ' + rel); continue; }
  const before = fs.readFileSync(f, 'utf8');
  let after = before;

  // Replace Albanian chars
  after = after.replace(/ë/g, 'e');
  after = after.replace(/ç/g, 'c');
  after = after.replace(/Ë/g, 'E');
  after = after.replace(/Ç/g, 'C');

  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8');
    console.log('✅ ' + rel.split('/').pop());
  } else {
    console.log('— ' + rel.split('/').pop() + ' (no change)');
  }
}

console.log('\nDone.');
