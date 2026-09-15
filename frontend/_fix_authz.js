const fs = require('fs');
const path = require('path');

const API = path.join(__dirname, 'pages', 'api');

function depthToLib(rel) {
  // From pages/api/<rel> up to frontend/lib: dirs under api + 2 (api, pages)
  const parts = rel.replace(/\\/g, '/').split('/');
  const dirs = parts.length - 1;
  return '../'.repeat(dirs + 2) + 'lib/requireStaff';
}

const FORBIDDEN_IN_LOADENV = `  } catch (error) {
    if (isForbiddenError(error)) {
      return res.status(403).json(forbiddenJson(error));
    }
`;

const CLEAN_LOADENV = `  } catch (error) {
`;

const files = [];
function walk(dir, base = '') {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(base, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) walk(path.join(dir, ent.name), rel);
    else if (ent.name.endsWith('.js')) files.push(rel);
  }
}
walk(API);

const fixed = [];

for (const rel of files) {
  let src = fs.readFileSync(path.join(API, rel), 'utf8');
  if (!src.includes('requireStaff') && !src.includes('isForbiddenError')) continue;
  // skip public-link which was already correct before our script
  if (rel === 'students/public-link.js') continue;

  const before = src;

  // Fix wrong requireStaff import path
  if (/from\s*['"][^'"]*requireStaff['"]/.test(src)) {
    const correct = depthToLib(rel);
    src = src.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*requireStaff['"];?/,
      `import {$1} from '${correct}';`
    );
  }

  // Remove forbidden check wrongly injected into loadEnvConfig
  while (src.includes(FORBIDDEN_IN_LOADENV)) {
    src = src.replace(FORBIDDEN_IN_LOADENV, CLEAN_LOADENV);
  }

  // Also handle variant with blank line differences - regex remove
  src = src.replace(
    /(function loadEnvConfig\(\)[\s\S]*?)\} catch \(error\) \{\s*if \(isForbiddenError\(error\)\) \{\s*return res\.status\(403\)\.json\(forbiddenJson\(error\)\);\s*\}\s*/g,
    (m, pre) => {
      // only if this is still within loadEnvConfig (before export default)
      return pre + '} catch (error) {\n    ';
    }
  );

  // Ensure handler catch has forbidden handling if file imports isForbiddenError
  if (src.includes('isForbiddenError') && src.includes('export default')) {
    // Find the last "} catch (error)" in the file (handler)
    const catches = [...src.matchAll(/\} catch \(error\) \{/g)];
    if (catches.length > 0) {
      const last = catches[catches.length - 1];
      const idx = last.index;
      const after = src.slice(idx);
      // Check if this catch already has isForbiddenError
      const catchEnd = after.search(/\n  \} finally|\n\}$/);
      const catchBody = catchEnd === -1 ? after : after.slice(0, catchEnd);
      if (!catchBody.includes('isForbiddenError')) {
        src =
          src.slice(0, idx) +
          `} catch (error) {\n    if (isForbiddenError(error)) {\n      return res.status(403).json(forbiddenJson(error));\n    }\n` +
          after.slice('} catch (error) {\n'.length);
      }
    }
  }

  // Fix devices.js if ad-hoc check still present
  if (rel === 'students/devices.js') {
    src = src.replace(
      /const user = await authMiddleware\(req\);\s*if \(!user \|\| !\['admin', 'developer', 'assistant'\]\.includes\(user\.role\)\) \{\s*return res\.status\(403\)\.json\(\{ error: 'forbidden' \}\);\s*\}/,
      `const user = await authMiddleware(req);\n    await requireStaff(user);`
    );
    if (!src.includes('await requireStaff(user)')) {
      src = src.replace(
        /const user = await authMiddleware\(req\);/,
        `const user = await authMiddleware(req);\n    await requireStaff(user);`
      );
    }
  }

  // Normalize blank line after authMiddleware import before requireStaff import
  src = src.replace(
    /(from ['"][^'"]*authMiddleware['"];)\n\n(import \{)/,
    '$1\n$2'
  );

  if (src !== before) {
    fs.writeFileSync(path.join(API, rel), src, 'utf8');
    fixed.push(rel);
  }
}

console.log('Fixed', fixed.length, 'files:');
console.log(fixed.join('\n'));
