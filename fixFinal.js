/**
 * Fixes U+FFFD replacement chars in JSX files (introduced by fixEncoding.js)
 * and reverts currency € → L as requested.
 */
const fs = require('fs');

const files = [
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/Dashboard.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/RegjistroAnalize.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/arkiva/Arkiva.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/financa/Financa.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/pagesat/PagesatDitore.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/laboratori/Departamentet.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/laboratori/KatalogAnalizave.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/laboratori/Krijo' + 'Porosin\u00EB.jsx',
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/laboratori/ProfiletAnalizave.jsx',
];

function fix(str) {
  // 1. Remove BOM artifact at start (0x3F that came from corrupted BOM)
  if (str.charCodeAt(0) === 0x3F && str.length > 1 && str[1] !== '?') {
    str = str.slice(1);
  }
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }

  // 2. Known ç patterns (ç always word-initial in Albanian)
  str = str.replace(/\uFFFDakti/g, 'çakti');   // çaktivizo, çaktivua
  str = str.replace(/\uFFFDmim/g, 'çmim');      // çmim, çmimet
  str = str.replace(/\uFFFDdo /g, 'çdo ');      // çdo (each/every)
  str = str.replace(/\uFFFDdo\n/g, 'çdo\n');
  str = str.replace(/\uFFFDdo\t/g, 'çdo\t');

  // 3. Known em-dash patterns (none/empty value indicators)
  str = str.replace(/\uFFFD Pa /g, '— Pa ');    // — Pa profil, — Pa referues

  // 4. Nullish coalescing default → em-dash
  str = str.replace(/\?\? '\uFFFD'/g, "?? '—'");
  str = str.replace(/\?\? "\uFFFD"/g, '?? "—"');

  // 5. Specific known button/text patterns
  str = str.replace(/\uFFFD Konfirmo/g, '✓ Konfirmo');

  // 6. Separator · for non-letter-bordered contexts
  // (spaces, brackets, quotes, operators around the char)
  str = str.replace(/(?<![a-zA-Z])\uFFFD(?![a-zA-Z])/g, '·');

  // 7. All remaining U+FFFD → ë (word-internal Albanian char)
  str = str.replace(/\uFFFD/g, 'ë');

  // 8. Revert currency: € → L wherever it was added by the PowerShell script
  str = str.replace(/\.toLocaleString\(\)} €/g, '.toLocaleString()} L');

  return str;
}

let totalFixed = 0;
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('NOT FOUND: ' + f); continue; }
  const before = fs.readFileSync(f, 'utf8');
  const after = fix(before);
  fs.writeFileSync(f, after, 'utf8');
  const remaining = (after.match(/\uFFFD/g) || []).length;
  const name = f.split('/').pop();
  console.log((remaining === 0 ? '✅' : '⚠️ ') + ' ' + name + (remaining > 0 ? ' — ' + remaining + ' FFFD left' : ''));
  totalFixed++;
}
console.log('\nDone. Fixed ' + totalFixed + ' files.');

// Quick verify on PagesatDitore
const sample = fs.readFileSync(
  'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src/pages/pagesat/PagesatDitore.jsx',
  'utf8'
);
console.log('\nSample check (PagesatDitore):');
console.log('  PagezurPjesërisht present:', sample.includes('PagezurPjesërisht'));
console.log('  toLocaleString()} L present:', sample.includes('toLocaleString()} L'));
console.log('  € remaining:', (sample.match(/€/g) || []).length);
