const fs = require('fs');
const files = [
  'medlab-pro/frontend/src/pages/Dashboard.jsx',
  'medlab-pro/frontend/src/pages/RegjistroAnalize.jsx',
  'medlab-pro/frontend/src/pages/arkiva/Arkiva.jsx',
  'medlab-pro/frontend/src/pages/financa/Financa.jsx',
  'medlab-pro/frontend/src/pages/pagesat/PagesatDitore.jsx',
  'medlab-pro/frontend/src/pages/laboratori/Departamentet.jsx',
  'medlab-pro/frontend/src/pages/laboratori/KatalogAnalizave.jsx',
  'medlab-pro/frontend/src/pages/laboratori/KrijoPorosin\u00EB.jsx',
  'medlab-pro/frontend/src/pages/laboratori/ProfiletAnalizave.jsx',
];
const base = 'C:/Users/PC/Desktop/medlab-pro-v3/';
let allOk = true;
for (const rel of files) {
  const c = fs.readFileSync(base + rel, 'utf8');
  const startsOk = c.startsWith('import') || c.startsWith('//') || c.startsWith('/*');
  const fffd = (c.match(/\uFFFD/g) || []).length;
  const euro = (c.match(/\u20AC/g) || []).length;
  const name = rel.split('/').pop();
  const status = (startsOk && fffd === 0) ? 'OK' : 'FAIL';
  if (status === 'FAIL') allOk = false;
  console.log('[' + status + '] ' + name + ' | starts:' + startsOk + ' FFFD:' + fffd + ' euro:' + euro);
}
console.log(allOk ? '\nAll files clean!' : '\nSome issues!');
