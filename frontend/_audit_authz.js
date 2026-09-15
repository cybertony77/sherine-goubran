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

const issues = [];

for (const rel of walk(API)) {
  const src = fs.readFileSync(path.join(API, rel), 'utf8');

  // leftover hmac (not hmacServer)
  if (/from\s*['"][^'"]*\/hmac['"]/.test(src)) {
    issues.push(`${rel}: still imports hmac (not hmacServer)`);
  }

  // polluted loadEnv
  const m = src.match(/function loadEnvConfig[\s\S]*?^}/m);
  if (m && m[0].includes('isForbiddenError')) {
    issues.push(`${rel}: loadEnvConfig polluted with isForbiddenError`);
  }

  // leftover ad-hoc forbidden patterns that should have been replaced in student id routes
  if (rel.startsWith('students/[id]/') || rel === 'students/[id].js') {
    if (src.includes("You can only view your own results") ||
        src.includes("You can only save your own results") ||
        src.includes("You can only update your own data") ||
        src.includes("You can only view your own data")) {
      issues.push(`${rel}: leftover ad-hoc self-check message`);
    }
    if (src.includes("!['student', 'admin', 'developer', 'assistant'].includes(user.role)")) {
      issues.push(`${rel}: leftover role allowlist`);
    }
  }

  if (rel === 'students/devices.js' && src.includes("['admin', 'developer', 'assistant'].includes(user.role)")) {
    issues.push(`${rel}: leftover role allowlist`);
  }
}

// Spot-check key snippets
const checks = {
  'students/[id].js': [
    'await requireStaffOrSelfStudent(user, student_id)',
    'await requireStaff(user)',
  ],
  'students/[id]/quiz-performance.js': [
    "from '../../../../lib/hmacServer'",
    'await requireStaffOrSelfStudent(user, student_id)',
  ],
  'students/[id]/quiz-result.js': [
    'await requireStaffOrSelfStudent(user, student_id)',
  ],
  'students/[id]/watch-video.js': [
    'await requireStaffOrSelfStudent(user, student_id)',
  ],
  'users/[id]/email.js': [
    "from '../../../../lib/hmacServer'",
  ],
  'profile-picture/student/[id].js': [
    "from '../../../../lib/hmacServer'",
  ],
  'students/public/[id].js': [
    "from '../../../../lib/hmacServer'",
  ],
  'payments/index.js': [
    'await requireStaff(user)',
  ],
  'centers/index.js': [
    "if (req.method !== 'GET')",
    'await requireStaff(user)',
  ],
  'lessons/index.js': [
    "if (req.method !== 'GET')",
    'await requireStaff(user)',
  ],
};

for (const [rel, needles] of Object.entries(checks)) {
  const src = fs.readFileSync(path.join(API, rel), 'utf8');
  for (const n of needles) {
    if (!src.includes(n)) issues.push(`${rel}: missing snippet: ${n}`);
  }
}

if (issues.length) {
  console.log('ISSUES:');
  issues.forEach((i) => console.log(' -', i));
  process.exit(1);
} else {
  console.log('All audits passed.');
}
