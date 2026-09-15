const fs = require('fs');
const path = require('path');

const API = path.join(__dirname, 'pages', 'api');
const modified = [];

function read(rel) {
  return fs.readFileSync(path.join(API, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(API, rel), content, 'utf8');
  modified.push(rel);
}

function requireStaffPath(rel) {
  const dirs = rel.replace(/\\/g, '/').split('/').length - 1;
  return '../'.repeat(dirs + 2) + 'lib/requireStaff';
}
function hmacServerPath(rel) {
  const dirs = rel.replace(/\\/g, '/').split('/').length - 1;
  return '../'.repeat(dirs + 2) + 'lib/hmacServer';
}

function ensureImport(src, importLine) {
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

function addHandlerForbiddenCatch(src) {
  if (!src.includes('isForbiddenError')) return src;
  const catches = [...src.matchAll(/\} catch \(error\) \{/g)];
  if (!catches.length) return src;
  const last = catches[catches.length - 1];
  const idx = last.index;
  const after = src.slice(idx);
  // Look ahead ~500 chars for existing forbidden in this catch
  const peek = after.slice(0, 500);
  if (peek.includes('isForbiddenError')) return src;
  return (
    src.slice(0, idx) +
    `} catch (error) {\n    if (isForbiddenError(error)) {\n      return res.status(403).json(forbiddenJson(error));\n    }\n` +
    after.slice('} catch (error) {\n'.length)
  );
}

function selfImport(rel) {
  return `import {requireStaffOrSelfStudent, isForbiddenError, forbiddenJson} from '${requireStaffPath(rel)}';`;
}
function bothImport(rel) {
  return `import {requireStaff, requireStaffOrSelfStudent, isForbiddenError, forbiddenJson} from '${requireStaffPath(rel)}';`;
}

// ---------- students/[id].js ----------
{
  const rel = 'students/[id].js';
  let src = read(rel);
  src = ensureImport(src, bothImport(rel));
  src = src.replace(
`    // Verify authentication
    const user = await authMiddleware(req);
    
    if (req.method === 'GET') {`,
`    // Verify authentication
    const user = await authMiddleware(req);
    // GET: student may read own record; staff may read any. Mutations: staff only.
    if (req.method === 'GET') {
      await requireStaffOrSelfStudent(user, student_id);
    } else {
      await requireStaff(user);
    }
    
    if (req.method === 'GET') {`
  );
  src = addHandlerForbiddenCatch(src);
  write(rel, src);
}

// ---------- Simple auth-only -> requireStaffOrSelfStudent (online-*, preview-*) ----------
const simpleSelf = [
  'students/[id]/online-mock-exams.js',
  'students/[id]/online-quizzes.js',
  'students/[id]/online-homeworks.js',
  'students/[id]/preview-mock-exam-details.js',
  'students/[id]/preview-homework-details.js',
  'students/[id]/preview-quiz-details.js',
];

for (const rel of simpleSelf) {
  let src = read(rel);
  src = ensureImport(src, selfImport(rel));
  // These use await authMiddleware(req) without assignment
  if (/await authMiddleware\(req\);/.test(src) && !/const user = await authMiddleware\(req\);/.test(src)) {
    src = src.replace(
      /await authMiddleware\(req\);/,
      `const user = await authMiddleware(req);\n    await requireStaffOrSelfStudent(user, student_id);`
    );
  } else if (/const user = await authMiddleware\(req\);/.test(src) && !src.includes('requireStaffOrSelfStudent')) {
    src = src.replace(
      /const user = await authMiddleware\(req\);/,
      `const user = await authMiddleware(req);\n    await requireStaffOrSelfStudent(user, student_id);`
    );
  }
  src = addHandlerForbiddenCatch(src);
  write(rel, src);
}

// ---------- Result / details: replace student-only ad-hoc checks ----------
const resultDetails = [
  'students/[id]/quiz-result.js',
  'students/[id]/homework-result.js',
  'students/[id]/mock-exam-result.js',
  'students/[id]/quiz-details.js',
  'students/[id]/homework-details.js',
  'students/[id]/mock-exam-details.js',
];

for (const rel of resultDetails) {
  let src = read(rel);
  src = ensureImport(src, selfImport(rel));
  src = src.replace(
    /\/\/ Verify authentication[^\n]*\n\s*const user = await authMiddleware\(req\);\s*\n\s*const userId = user\.assistant_id \|\| user\.id;[^\n]*\n\s*if \(user\.role !== 'student' \|\| userId !== student_id\) \{\s*\n\s*return res\.status\(403\)\.json\(\{ error: 'Forbidden: You can only (?:save|view) your own results' \}\);\s*\n\s*\}/,
    `// Verify authentication — staff any student, or student self\n    const user = await authMiddleware(req);\n    await requireStaffOrSelfStudent(user, student_id);`
  );
  src = addHandlerForbiddenCatch(src);
  write(rel, src);
}

// ---------- online-sessions ----------
{
  const rel = 'students/[id]/online-sessions.js';
  let src = read(rel);
  src = ensureImport(src, selfImport(rel));
  src = src.replace(
`    // Verify authentication - allow students
    const user = await authMiddleware(req);
    if (!['student', 'admin', 'developer', 'assistant'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    const { id } = req.query;
    const student_id = parseInt(id);
    const userId = parseInt(user.assistant_id || user.id);

    // Students can only view their own data
    if (user.role === 'student' && userId !== student_id) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own data' });
    }`,
`    // Verify authentication — staff any student, or student self
    const user = await authMiddleware(req);
    const { id } = req.query;
    const student_id = parseInt(id);
    await requireStaffOrSelfStudent(user, student_id);`
  );
  src = addHandlerForbiddenCatch(src);
  write(rel, src);
}

// ---------- watch-video / watch-homework-video ----------
function patchWatch(rel) {
  let src = read(rel);
  src = ensureImport(src, selfImport(rel));
  // Replace role allowlist + self check block with requireStaffOrSelfStudent
  src = src.replace(
`    // Verify authentication - allow students
    const user = await authMiddleware(req);
    if (!['student', 'admin', 'developer', 'assistant'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    const { id } = req.query;
    const student_id = parseInt(id);
    // For students, the ID is in assistant_id, for others it's in id
    // Handle both string and number types
    const getUserId = (val) => {
      if (val === null || val === undefined) return null;
      return typeof val === 'number' ? val : parseInt(val);
    };
    
    const userId = user.role === 'student' 
      ? getUserId(user.assistant_id) || getUserId(user.id)
      : getUserId(user.id) || getUserId(user.assistant_id);

    // Students can only update their own data
    if (user.role === 'student' && userId !== student_id) {
      console.error('❌ Student ID mismatch:', { 
        userId, 
        student_id, 
        assistant_id: user.assistant_id, 
        user_id: user.id,
        role: user.role 
      });
      return res.status(403).json({ 
        error: 'Forbidden: You can only update your own data',
        details: { userId, student_id, assistant_id: user.assistant_id, user_id: user.id }
      });
    }`,
`    // Verify authentication — staff any student, or student self
    const user = await authMiddleware(req);
    const { id } = req.query;
    const student_id = parseInt(id);
    await requireStaffOrSelfStudent(user, student_id);`
  );
  src = addHandlerForbiddenCatch(src);
  write(rel, src);
}
patchWatch('students/[id]/watch-video.js');
patchWatch('students/[id]/watch-homework-video.js');

// ---------- Performance routes with sig ----------
function patchPerf(rel) {
  let src = read(rel);
  // hmac -> hmacServer
  src = src.replace(
    /import \{ verifySignature \} from ['"][^'"]*hmac['"];/,
    `import { verifySignature } from '${hmacServerPath(rel)}';`
  );
  src = ensureImport(src, selfImport(rel));
  src = src.replace(
`    // If not public access, verify authentication
    if (!isPublicAccess) {
      // Verify authentication - allow students to view their own results, or admins/assistants/developers to view any student
      const user = await authMiddleware(req);
      const userId = user.assistant_id || user.id; // JWT contains assistant_id for students
      
      // Students can only view their own results
      if (user.role === 'student' && userId !== student_id) {
        return res.status(403).json({ error: 'Forbidden: You can only view your own results' });
      }
      
      // Admins, assistants, and developers can view any student's results
      if (!['student', 'admin', 'assistant', 'developer'].includes(user.role)) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }
    }`,
`    // If not public access, verify authentication
    if (!isPublicAccess) {
      const user = await authMiddleware(req);
      await requireStaffOrSelfStudent(user, student_id);
    }`
  );
  src = addHandlerForbiddenCatch(src);
  write(rel, src);
}
patchPerf('students/[id]/quiz-performance.js');
patchPerf('students/[id]/homework-performance.js');
patchPerf('students/[id]/mock-exam-performance.js');

// ---------- hmac-only import fixes ----------
for (const rel of [
  'users/[id]/email.js',
  'profile-picture/student/[id].js',
  'students/public/[id].js',
]) {
  let src = read(rel);
  const before = src;
  src = src.replace(
    /import \{ verifySignature \} from ['"][^'"]*hmac['"];/,
    `import { verifySignature } from '${hmacServerPath(rel)}';`
  );
  if (src !== before) write(rel, src);
}

console.log('Self/perf/hmac modified', modified.length, 'files:');
console.log(modified.join('\n'));
