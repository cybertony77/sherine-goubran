import { formatEgyptDateTime, nowEgyptDate } from './egyptDateTime';

/**
 * Egypt/Cairo display datetime: "11/07/2026 at 02:34 PM"
 */
export function formatCertificateDateTime(date = new Date()) {
  return formatEgyptDateTime(date);
}

export { nowEgyptDate, formatEgyptDateTime };

export function parseStudentsCsv(students) {
  if (!students) return [];
  if (Array.isArray(students)) {
    return students.map((id) => String(id).trim()).filter(Boolean);
  }
  return String(students)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function studentsCsvFromIds(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))];
  return unique.join(', ');
}

export function studentHasCertificate(studentsField, studentId) {
  const ids = parseStudentsCsv(studentsField);
  const target = String(studentId);
  return ids.some((id) => id === target || Number(id) === Number(target));
}

/** Normalize stored certificate_image to a Cloudinary public_id under certificates/ */
export function normalizeCertificateImagePublicId(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('certificates/')) return raw;
  // Signed/delivery URLs — extract public id after /upload/.../
  const uploadMatch = raw.match(/\/upload\/(?:[^/]+\/)*v\d+\/(.+?)(?:\.[a-z0-9]+)?(?:\?|$)/i);
  if (uploadMatch?.[1]) {
    const id = decodeURIComponent(uploadMatch[1]);
    return id.startsWith('certificates/') ? id : `certificates/${id}`;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    return '';
  }
  return raw.includes('/') ? raw : `certificates/${raw}`;
}
