import { sortPreviousEvents, sortUpcomingEvents } from './eventDate';
import { formatPhoneForDB } from './phoneUtils';

export function splitEventDescription(text) {
  const raw = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!raw) return [];

  const blocks = raw
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  const paragraphs = [];

  blocks.forEach((block) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      paragraphs.push((lines[0] || block).replace(/\s+/g, ' '));
      return;
    }

    let buffer = '';
    lines.forEach((line) => {
      buffer = buffer ? `${buffer} ${line}` : line;
      if (/[.!?]"?$/.test(buffer)) {
        paragraphs.push(buffer);
        buffer = '';
      }
    });
    if (buffer) paragraphs.push(buffer.replace(/\s+/g, ' '));
  });

  return paragraphs.length ? paragraphs : [raw.replace(/\s+/g, ' ')];
}

export function filterPublicEvents(events, { type = 'all', status = 'all' } = {}) {
  return (Array.isArray(events) ? events : []).filter((event) => {
    const typeOk =
      type === 'all' ||
      (type === 'event' && event.type === 'Event') ||
      (type === 'workshop' && event.type === 'Workshop');
    const statusOk =
      status === 'all' ||
      (status === 'upcoming' && event.state === 'Upcoming') ||
      (status === 'previous' && event.state === 'Previous');
    return typeOk && statusOk;
  });
}

export function sortFilteredEvents(events) {
  const list = Array.isArray(events) ? events : [];
  const upcoming = sortUpcomingEvents(list.filter((item) => item.state === 'Upcoming'));
  const previous = sortPreviousEvents(list.filter((item) => item.state === 'Previous'));
  return [...upcoming, ...previous];
}

export function eventHighlightRows(highlights) {
  if (!highlights || typeof highlights !== 'object') return [];
  return [
    { key: 'participants', value: highlights.participants, label: 'Participants' },
    { key: 'hours', value: highlights.hours, label: 'Hours' },
    { key: 'activities', value: highlights.activities, label: 'Activities' },
  ].filter((row) => row.value != null && row.value !== '');
}

export function storeEventPreloaderName(type) {
  if (typeof window === 'undefined') return;
  const label = String(type || '').trim() === 'Workshop' ? 'WORKSHOP' : 'EVENT';
  window.sessionStorage.setItem('eventPreloaderName', label);
}

export function formatEventLocation(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      if (word === word.toUpperCase() && word.length > 1) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function eventTypeLabel(type) {
  return String(type || '').trim() === 'Workshop' ? 'Workshop' : 'Event';
}

export function eventStateLabel(state) {
  const raw = String(state || '').trim();
  if (!raw) return '';
  return raw;
}

export function eventReserveWhatsAppMessage({ firstName, eventName, eventType, formattedDate }) {
  const host = String(firstName || '').trim();
  const name = String(eventName || '').trim();
  const type = eventTypeLabel(eventType);
  const date = String(formattedDate || '').trim();
  const greeting = host ? `Hi ${host}, ` : 'Hi, ';
  if (name && date) {
    return `${greeting}I'd like to reserve a spot for the ${name} ${type} on ${date}.`;
  }
  if (name) {
    return `${greeting}I'd like to reserve a spot for the ${name} ${type}.`;
  }
  return `${greeting}I'd like to reserve a spot for an upcoming ${type.toLowerCase()}.`;
}

export function eventQuestionWhatsAppMessage({ firstName, eventName, eventType }) {
  const host = String(firstName || '').trim();
  const name = String(eventName || '').trim();
  const type = eventTypeLabel(eventType);
  const greeting = host ? `Hi ${host}, ` : 'Hi, ';
  if (name) {
    return `${greeting}I have a question about the ${name} ${type}.`;
  }
  return `${greeting}I have a question about an upcoming ${type.toLowerCase()}.`;
}

export function buildWhatsAppHref(phone, message) {
  if (!String(message || '').trim()) return '';
  const digits = formatPhoneForDB(phone);
  if (digits.length <= 2) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(String(message))}`;
}

export function adjacentPreviousEvents(events, currentSlug) {
  const list = sortPreviousEvents(
    (Array.isArray(events) ? events : []).filter(
      (item) => item?.state === 'Previous' && String(item?.slug || '').trim()
    )
  );
  const want = String(currentSlug || '').trim();
  const index = list.findIndex((item) => String(item.slug).trim() === want);
  if (index === -1) return { previous: null, next: null };

  // Sorted newest-first: previous link = older event, next link = newer past event.
  return {
    previous: index < list.length - 1 ? list[index + 1] : null,
    next: index > 0 ? list[index - 1] : null,
  };
}
