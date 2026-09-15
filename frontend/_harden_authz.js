const fs = require('fs');
const path = require('path');

const API = path.join(__dirname, 'pages', 'api');
const modified = [];

function read(rel) {
  return fs.readFileSync(path.join(API, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(API, rel), content, 'utf8');
  modified.push(rel.replace(/\\/g, '/'));
}

function depthImport(rel, name) {
  const parts = rel.replace(/\\/g, '/').split('/');
  const depth = parts.length - 1;
  return '../'.repeat(depth) + `lib/${name}`;
}

function ensureImport(src, rel, importLine) {
  if (/from\s*['"][^'"]*requireStaff['"]/.test(src)) {
    return src.replace(
      /import\s*\{[^}]*\}\s*from\s*['"][^'"]*requireStaff['"];?\s*\r?\n/,
      importLine + '\n'
    );
  }
  if (/import\s*\{[^}]*authMiddleware[^}]*\}\s*from\s*['"][^'"]+['"];?/.test(src)) {
    return src.replace(
      /(import\s*\{[^}]*authMiddleware[^}]*\}\s*from\s*['"][^'"]+['"];?\s*\r?\n)/,
      `$1${importLine}\n`
    );
  }
  return src.replace(/(^import[^\n]+\n)/, `$1${importLine}\n`);
}

function addForbiddenCatch(src) {
  if (src.includes('isForbiddenError(error)')) return src;

  // Prefer inserting at the start of the outermost handler catch (indent 2 spaces)
  let applied = false;
  const out = src.replace(/} catch \(error\) \{\r?\n(  )(?!\s)/g, (m, indent) => {
    if (applied) return m;
    applied = true;
    return `} catch (error) {\n${indent}if (isForbiddenError(error)) {\n${indent}  return res.status(403).json(forbiddenJson(error));\n${indent}}\n${indent}`;
  });
  if (applied) return out;

  // Fallback: first catch (error)
  return src.replace(/} catch \(error\) \{\r?\n(\s*)/, (m, indent) => {
    return `} catch (error) {\n${indent}if (isForbiddenError(error)) {\n${indent}  return res.status(403).json(forbiddenJson(error));\n${indent}}\n${indent}`;
  });
}

function staffImport(rel) {
  return `import {requireStaff, isForbiddenError, forbiddenJson} from '${depthImport(rel, 'requireStaff')}';`;
}
function selfImport(rel) {
  return `import {requireStaffOrSelfStudent, isForbiddenError, forbiddenJson} from '${depthImport(rel, 'requireStaff')}';`;
}
function bothImport(rel) {
  return `import {requireStaff, requireStaffOrSelfStudent, isForbiddenError, forbiddenJson} from '${depthImport(rel, 'requireStaff')}';`;
}

function insertAfterAuth(src, insertion) {
  if (src.includes('await requireStaff(user)') || src.includes('await requireStaffOrSelfStudent')) {
    return src;
  }
  if (/const user = await authMiddleware\(req\);/.test(src)) {
    return src.replace(
      /const user = await authMiddleware\(req\);/,
      `const user = await authMiddleware(req);\n    ${insertion}`
    );
  }
  if (/await authMiddleware\(req\);/.test(src)) {
    return src.replace(
      /await authMiddleware\(req\);/,
      `const user = await authMiddleware(req);\n    ${insertion}`
    );
  }
  if (/user = await authMiddleware\(req\);/.test(src)) {
    return src.replace(
      /user = await authMiddleware\(req\);/,
      `user = await authMiddleware(req);\n      ${insertion}`
    );
  }
  return src;
}

// ---------- STAFF-ONLY files ----------
const staffFiles = [
  'students/index.js',
  'students/reset-all.js',
  'students/history.js',
  'students/[id]/attend.js',
  'students/[id]/reset.js',
  'students/[id]/reset-homework.js',
  'students/[id]/reset-quiz.js',
  'students/[id]/reset-mock-exam.js',
  'students/[id]/hw.js',
  'students/[id]/hw_degree.js',
  'students/[id]/quiz_degree.js',
  'students/[id]/comment.js',
  'students/[id]/update-message-state.js',
  'students/[id]/message_state.js',
  'students/[id]/send-whatsapp.js',
  'students/[id]/attendance_lesson.js',
  'students/[id]/attendance_week.js',
  'students/[id]/check-quiz.js',
  'students/[id]/check-homework.js',
  'students/[id]/check-mock-exam.js',
];

for (const rel of staffFiles) {
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = insertAfterAuth(src, 'await requireStaff(user);');
  src = addForbiddenCatch(src);
  write(rel, src);
}

// devices: replace ad-hoc role check with requireStaff
{
  const rel = 'students/devices.js';
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = src.replace(
`    // Authenticate user
    const user = await authMiddleware(req);
    if (!user || !['admin', 'developer', 'assistant'].includes(user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }`,
`    // Authenticate user
    const user = await authMiddleware(req);
    await requireStaff(user);`
  );
  src = addForbiddenCatch(src);
  write(rel, src);
}

// payments
{
  const rel = 'payments/index.js';
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = src.replace(
`      user = await authMiddleware(req);
      console.log('✅ Authentication successful for user:', user.assistant_id);
    } catch (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed. Please log in again.',
        message: 'Unauthorized access'
      });
    }`,
`      user = await authMiddleware(req);
      await requireStaff(user);
      console.log('✅ Authentication successful for user:', user.assistant_id);
    } catch (authError) {
      console.log('❌ Authentication failed:', authError.message);
      if (isForbiddenError(authError) || authError.message === 'Forbidden' || String(authError.message||'').includes('Forbidden')) {
        return res.status(403).json(forbiddenJson(authError));
      }
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed. Please log in again.',
        message: 'Unauthorized access'
      });
    }`
  );
  write(rel, src);
}

// centers/index.js — staff for non-GET
{
  const rel = 'centers/index.js';
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = src.replace(
`    // Authenticate user
    console.log('🔐 Authenticating user...');
    const user = await authMiddleware(req);
    console.log('✅ User authenticated:', user.id);`,
`    // Authenticate user
    console.log('🔐 Authenticating user...');
    const user = await authMiddleware(req);
    // Students need centers for schedule; only staff can create/edit
    if (req.method !== 'GET') {
      await requireStaff(user);
    }
    console.log('✅ User authenticated:', user.assistant_id || user.id);`
  );
  src = addForbiddenCatch(src);
  write(rel, src);
}

// centers/[id].js — always staff
{
  const rel = 'centers/[id].js';
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = src.replace(
`    // Authenticate user
    const user = await authMiddleware(req);

    if (req.method === 'PUT') {`,
`    // Authenticate user
    const user = await authMiddleware(req);
    await requireStaff(user);

    if (req.method === 'PUT') {`
  );
  src = addForbiddenCatch(src);
  write(rel, src);
}

// lessons/index.js — staff for non-GET
{
  const rel = 'lessons/index.js';
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = src.replace(
`    // Authenticate user
    console.log('🔐 Authenticating user...');
    const user = await authMiddleware(req);
    console.log('✅ User authenticated:', user.id);`,
`    // Authenticate user
    console.log('🔐 Authenticating user...');
    const user = await authMiddleware(req);
    // Students need lesson list for their dashboard; only staff can create lessons
    if (req.method !== 'GET') {
      await requireStaff(user);
    }
    console.log('✅ User authenticated:', user.assistant_id || user.id);`
  );
  src = addForbiddenCatch(src);
  write(rel, src);
}

// lessons/[id].js — always staff
{
  const rel = 'lessons/[id].js';
  let src = read(rel);
  src = ensureImport(src, rel, staffImport(rel));
  src = src.replace(
`    // Authenticate user
    const user = await authMiddleware(req);

    if (req.method === 'PUT') {`,
`    // Authenticate user
    const user = await authMiddleware(req);
    await requireStaff(user);

    if (req.method === 'PUT') {`
  );
  src = addForbiddenCatch(src);
  write(rel, src);
}

console.log('Staff batch modified', modified.length, 'files:');
console.log(modified.join('\n'));
