/**
 * UTC folder stamp for file-exchange imports/exports.
 * Human-readable and lexicographically sortable.
 * @param {Date} [date]
 * @returns {string} e.g. 2026-05-23_15-59-43Z
 */
export function formatExchangeTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const iso = d.toISOString();
  const [datePart, rest] = iso.split("T");
  const hh = rest.slice(0, 2);
  const mm = rest.slice(3, 5);
  const ss = rest.slice(6, 8);
  return `${datePart}_${hh}-${mm}-${ss}Z`;
}

/**
 * Convert legacy compact stamps (20260523T154523Z) to human-readable form.
 * @param {string} stamp
 * @returns {string}
 */
export function normalizeExchangeStamp(stamp) {
  const s = String(stamp || "").trim();
  const legacy = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
  const m = s.match(legacy);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}_${m[4]}-${m[5]}-${m[6]}Z`;
  }
  return s;
}

/**
 * Human-readable stamp for work-log filenames (date + time).
 * @param {Date} [date]
 * @returns {{ date: string, time: string, folder: string }}
 */
export function formatWorkLogTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const iso = d.toISOString();
  const [datePart, timePart] = iso.slice(0, 16).split("T");
  const time = timePart.replace(":", "-");
  return {
    date: datePart,
    time,
    folder: formatExchangeTimestamp(d)
  };
}

/**
 * Long-form UTC label for log headers (e.g. "Sunday, 24 May 2026, 14:53 UTC").
 * @param {Date} [date]
 * @returns {string}
 */
export function formatHumanReadableUtc(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(d);
}
