export function formatEventDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function eventTimestamp(event) {
  const raw = String(event?.date || '').trim();
  if (!raw) return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : null;
}

export function sortUpcomingEvents(events) {
  return [...(Array.isArray(events) ? events : [])].sort((a, b) => {
    const ta = eventTimestamp(a);
    const tb = eventTimestamp(b);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  });
}

export function sortPreviousEvents(events) {
  return [...(Array.isArray(events) ? events : [])].sort((a, b) => {
    const ta = eventTimestamp(a);
    const tb = eventTimestamp(b);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return tb - ta;
  });
}

export function selectHomepageEvents(events, limit = 3) {
  const list = Array.isArray(events) ? events : [];
  const upcoming = sortUpcomingEvents(list.filter((item) => item.state === 'Upcoming'));
  const previous = sortPreviousEvents(list.filter((item) => item.state === 'Previous'));
  return [...upcoming, ...previous].slice(0, limit);
}

export function partitionPublicEvents(events, { upcomingLimit, previousLimit } = {}) {
  const list = Array.isArray(events) ? events : [];
  let upcoming = sortUpcomingEvents(list.filter((item) => item.state === 'Upcoming'));
  let previous = sortPreviousEvents(list.filter((item) => item.state === 'Previous'));
  if (upcomingLimit) upcoming = upcoming.slice(0, upcomingLimit);
  if (previousLimit) previous = previous.slice(0, previousLimit);
  return { upcoming, previous };
}
