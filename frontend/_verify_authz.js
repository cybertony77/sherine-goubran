const fs = require('fs');
const path = require('path');
const API = path.join(__dirname, 'pages', 'api');

function walk(dir, base = '', out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) walk(path.join(dir, ent.name), rel, out);
    else if (ent.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

for (const rel of walk(API)) {
  const src = fs.readFileSync(path.join(API, rel), 'utf8');
  if (!src.includes('requireStaff') && !src.includes('requireStaffOrSelfStudent')) continue;

  const importMatch = src.match(/from\s*['"]([^'"]*requireStaff)['"]/);
  console.log(`\n=== ${rel} ===`);
  console.log('import:', importMatch ? importMatch[1] : 'NONE');

  // expected depth
  const dirs = rel.split('/').length - 1;
  const expected = '../'.repeat(dirs + 2) + 'lib/requireStaff';
  if (importMatch && importMatch[1] !== expected && rel !== 'students/public-link.js') {
    // public-link already had correct ../../../ which matches dirs=1 -> ../../../ 
    console.log('WRONG PATH expected', expected);
  }
  if (rel === 'students/public-link.js' && importMatch && importMatch[1] !== '../../../lib/requireStaff') {
    console.log('public-link path unexpected');
  }

  const loadEnvSlice = src.match(/function loadEnvConfig[\s\S]*?^}/m);
  if (loadEnvSlice && loadEnvSlice[0].includes('isForbiddenError')) {
    console.log('POLLUTED loadEnvConfig');
  }

  console.log('has await requireStaff:', src.includes('await requireStaff'));
  console.log('has await requireStaffOrSelfStudent:', src.includes('await requireStaffOrSelfStudent'));

  // last catch
  const catches = [...src.matchAll(/\} catch \(error\) \{/g)];
  if (catches.length) {
    const idx = catches[catches.length - 1].index;
    const tail = src.slice(idx, idx + 400);
    console.log('last catch has forbidden:', tail.includes('isForbiddenError'));
  }
}
