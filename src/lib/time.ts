const APP_TZ = process.env.APP_TZ || 'Asia/Makassar';

/**
 * Returns YYYY-MM-DD formatted date string in WITA timezone.
 */
export function getWitaDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Formats a Date object into WITA display format, e.g. "04 Sep 2026, 14:25 WITA".
 */
export function formatWitaDisplay(date: Date): string {
  const day = new Intl.DateTimeFormat('id-ID', { timeZone: APP_TZ, day: '2-digit' }).format(date);
  const month = new Intl.DateTimeFormat('id-ID', { timeZone: APP_TZ, month: 'short' }).format(date);
  const year = new Intl.DateTimeFormat('id-ID', { timeZone: APP_TZ, year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${day} ${month} ${year}, ${time} WITA`;
}

/**
 * Checks whether two Date objects fall on the same day in WITA.
 */
export function isSameWitaDay(date1: Date, date2: Date): boolean {
  return getWitaDateString(date1) === getWitaDateString(date2);
}

/**
 * Returns YYYY-MM-DD string N days ago in WITA calendar.
 */
export function getWitaDateNDaysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from.getTime() - n * 24 * 3600 * 1000);
  return getWitaDateString(d);
}

/**
 * Returns yesterday's YYYY-MM-DD in WITA calendar.
 */
export function getWitaYesterdayString(from: Date = new Date()): string {
  return getWitaDateNDaysAgo(1, from);
}

/**
 * Converts a WITA calendar day (YYYY-MM-DD) to a UTC range [start, end).
 * WITA = UTC+8 (no DST).
 */
export function witaDayRangeToUtc(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}
