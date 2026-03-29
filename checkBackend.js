const fs = require('fs');
const path = require('path');
function walk(dir) {
  let files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
    else if (f.endsWith('.js')) files.push(full);
  }
  return files;
}
const backendFiles = walk('C:/Users/PC/Desktop/medlab-pro-v3/medlab-pro/backend');
for (const f of backendFiles) {
  const c = fs.readFileSync(f, 'utf8');
  const alb = (c.match(/[\u00EB\u00E7\u00CB\u00C7]/g) || []).length;
  if (alb > 0) {
    const name = f.split('backend\\').pop() || f.split('backend/').pop();
    console.log(name + ' -> ' + alb + ' chars');
    // Show the matching lines
    const lines = c.split('\n');
    lines.forEach((l, i) => {
      if (/[\u00EB\u00E7\u00CB\u00C7]/.test(l)) console.log('  L' + (i+1) + ': ' + l.trim().slice(0,80));
    });
  }
}
