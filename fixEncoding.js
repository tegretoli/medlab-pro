/**
 * Reverses Windows-1252 mojibake in UTF-8 files.
 * What happened: PowerShell read UTF-8 as CP1252, wrote back as UTF-8.
 * Fix: read as UTF-8, encode each char with CP1252 byte table, re-read result as UTF-8.
 */
const fs = require('fs');
const path = require('path');

// Windows-1252 to Unicode mapping for the 0x80-0x9F range (the tricky part)
const CP1252_EXTRAS = {
  0x80: 0x20AC, // €
  0x82: 0x201A, // ‚
  0x83: 0x0192, // ƒ
  0x84: 0x201E, // „
  0x85: 0x2026, // …
  0x86: 0x2020, // †
  0x87: 0x2021, // ‡
  0x88: 0x02C6, // ˆ
  0x89: 0x2030, // ‰
  0x8A: 0x0160, // Š
  0x8B: 0x2039, // ‹
  0x8C: 0x0152, // Œ
  0x8E: 0x017D, // Ž
  0x91: 0x2018, // '
  0x92: 0x2019, // '
  0x93: 0x201C, // "
  0x94: 0x201D, // "
  0x95: 0x2022, // •
  0x96: 0x2013, // –
  0x97: 0x2014, // —
  0x98: 0x02DC, // ˜
  0x99: 0x2122, // ™
  0x9A: 0x0161, // š
  0x9B: 0x203A, // ›
  0x9C: 0x0153, // œ
  0x9E: 0x017E, // ž
  0x9F: 0x0178, // Ÿ
};

// Reverse map: Unicode → CP1252 byte (for the 0x80-0x9F extras)
const UNICODE_TO_CP1252 = {};
for (const [byte, unicode] of Object.entries(CP1252_EXTRAS)) {
  UNICODE_TO_CP1252[unicode] = parseInt(byte);
}

/**
 * Encodes a Unicode string to Windows-1252 bytes.
 * Returns a Buffer with the CP1252 byte representation.
 */
function encodeCP1252(str) {
  const bytes = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp <= 0x7F) {
      bytes.push(cp);
    } else if (cp >= 0xA0 && cp <= 0xFF) {
      // Latin-1 supplement maps directly
      bytes.push(cp);
    } else if (UNICODE_TO_CP1252[cp] !== undefined) {
      bytes.push(UNICODE_TO_CP1252[cp]);
    } else {
      // Can't represent in CP1252 — keep as-is by pushing a placeholder
      // This handles the fresh € we added (U+20AC → byte 0x80 in CP1252)
      // We'll handle € separately via a placeholder
      bytes.push(0x3F); // '?' fallback
    }
  }
  return Buffer.from(bytes);
}

function fixFile(filePath) {
  const raw = fs.readFileSync(filePath); // raw bytes
  const corrupted = raw.toString('utf8'); // read as UTF-8 (current state)

  // Protect the newly added € signs by using a placeholder
  const EURO_PLACEHOLDER = '\x01EURO_SIGN\x01';
  const textWithPlaceholder = corrupted.split('\u20AC').join(EURO_PLACEHOLDER);

  // Now encode the corrupted string as CP1252 bytes → these should be the original UTF-8 bytes
  const originalBytes = encodeCP1252(textWithPlaceholder);

  // Re-decode the original bytes as UTF-8
  let recovered;
  try {
    recovered = originalBytes.toString('utf8');
  } catch (e) {
    console.error(`  Failed to decode as UTF-8: ${e.message}`);
    return false;
  }

  // Restore € signs
  recovered = recovered.split(EURO_PLACEHOLDER).join('€');

  fs.writeFileSync(filePath, recovered, 'utf8');
  return true;
}

// Files to fix
const srcDir = 'C:\\Users\\PC\\Desktop\\medlab-pro-v3\\medlab-pro\\frontend\\src';
const targets = [
  'pages\\Dashboard.jsx',
  'pages\\RegjistroAnalize.jsx',
  'pages\\arkiva\\Arkiva.jsx',
  'pages\\financa\\Financa.jsx',
  'pages\\pagesat\\PagesatDitore.jsx',
  'pages\\laboratori\\Departamentet.jsx',
  'pages\\laboratori\\KatalogAnalizave.jsx',
  'pages\\laboratori\\KrijoPorosin\u00EB.jsx',
  'pages\\laboratori\\ProfiletAnalizave.jsx',
];

for (const rel of targets) {
  const fullPath = path.join(srcDir, rel);
  if (!fs.existsSync(fullPath)) {
    console.log(`NOT FOUND: ${rel}`);
    continue;
  }
  const ok = fixFile(fullPath);
  console.log(`${ok ? '✅' : '❌'} ${path.basename(fullPath)}`);
}

console.log('\nDone. Verifying PagesatDitore...');
const sample = fs.readFileSync(path.join(srcDir, 'pages\\pagesat\\PagesatDitore.jsx'), 'utf8');
const idx = sample.indexOf('toLocaleString');
if (idx >= 0) console.log('Sample:', sample.slice(idx, idx + 40));
