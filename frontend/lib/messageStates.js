export const MESSAGE_STATES = ['New', 'Read', 'Contacted', 'Resolved', 'Archived'];

export function isMessageState(value) {
  return MESSAGE_STATES.includes(String(value || '').trim());
}
