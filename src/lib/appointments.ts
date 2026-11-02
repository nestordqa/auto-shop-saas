export const GARAGE_TIME_ZONE = "America/Caracas";
/** Caracas is UTC-4 all year (no DST), in `Date#getTimezoneOffset` minutes. */
export const GARAGE_TIMEZONE_OFFSET = 240;

export function appointmentIso(date: string, time: string, timezoneOffset: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + timezoneOffset * 60_000).toISOString();
}

/** Time of day in garage time on the 12-hour clock: "2:30 PM". */
export function formatTime12(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: GARAGE_TIME_ZONE }).format(new Date(value));
}

/** Date plus 12-hour time (Venezuela does not use the 24-hour clock): "5 nov 2026, 2:30 PM". */
export function formatAppointmentDateTime(value: string | Date, dateStyle: "short" | "medium" | "long" = "medium") {
  return `${formatAppointmentDate(value, dateStyle)}, ${formatTime12(value)}`;
}

export function formatAppointmentDate(value: string | Date, dateStyle: "short" | "medium" | "long" = "short") {
  return new Intl.DateTimeFormat("es-VE", { dateStyle, timeZone: GARAGE_TIME_ZONE }).format(new Date(value));
}

export function appointmentDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: GARAGE_TIME_ZONE }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function appointmentMonthKey(value: string | Date) {
  return appointmentDateKey(value).slice(0, 7);
}