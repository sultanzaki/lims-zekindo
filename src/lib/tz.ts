// The lab operates in one timezone (WIB / Indonesia Western Time, UTC+7)
// regardless of where the server runs (Vercel functions default to UTC) or
// where a viewer's browser is set. This file is the single source of truth
// for that offset so every date shown or parsed in the app means the same
// wall-clock time in Jakarta.
export const APP_TIME_ZONE = "Asia/Jakarta";
const APP_UTC_OFFSET = "+07:00";

// Interprets a `datetime-local` input value (e.g. "2026-08-23T14:30", which
// carries no timezone of its own) as Jakarta local time, returning the
// correct UTC instant to store — instead of letting `new Date(raw)` silently
// assume whatever timezone the Node process happens to be running in.
export function parseJakartaLocalDateTime(raw: string): Date {
  return new Date(`${raw}:00${APP_UTC_OFFSET}`);
}

// The current moment, formatted as a `datetime-local` input value in
// Jakarta time — used as a form default so it's correct for the lab
// regardless of the device's own timezone.
// The calendar-day key (YYYY-MM-DD) a given instant falls on in Jakarta
// time — used to group/compare dates by their local day regardless of the
// server's own timezone.
export function jakartaDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

// Formats any instant as a `datetime-local` input value in Jakarta time —
// used both for "now" defaults and for prefilling a form that edits an
// existing Jakarta-time timestamp.
export function dateAsJakartaLocalInput(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function nowAsJakartaLocalInput(): string {
  return dateAsJakartaLocalInput(new Date());
}
