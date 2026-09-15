/**
 * Escape user input for safe use inside MongoDB $regex / RegExp.
 */
export function escapeRegex(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
