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
