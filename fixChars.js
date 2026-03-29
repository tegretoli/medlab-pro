/**
 * 1. Removes Albanian diacritical chars (ë→e, ç→c, Ë→E, Ç→C) from all frontend JSX files
 * 2. Changes currency from L to EUR in display contexts
 */
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (f.endsWith('.jsx')) files.push(full);
  }
  return files;
}

const srcDir = 'C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/frontend/src';
const files = walk(srcDir);

let totalChanged = 0;

for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  let after = before;

  // 1. Albanian chars → plain ASCII
  after = after.replace(/ë/g, 'e');
  after = after.replace(/ç/g, 'c');
  after = after.replace(/Ë/g, 'E');
  after = after.replace(/Ç/g, 'C');

  // 2. Currency: L → EUR in display contexts
  after = after.replace(/\.toLocaleString\(\)} L/g, '.toLocaleString()} EUR');
  after = after.replace(/Shuma \(L\)/g, 'Shuma (EUR)');

  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8');
    const name = f.replace(srcDir.replace(/\//g, path.sep), '').replace(/^\\/,'');
    console.log('✅ ' + name);
    totalChanged++;
  }
}

console.log('\nDone. Changed ' + totalChanged + ' files.');
