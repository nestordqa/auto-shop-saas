export const APPOINTMENT_TIMES = Array.from({ length: 21 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export const GARAGE_TIME_ZONE = "America/Caracas";

export function appointmentIso(date: string, time: string, timezoneOffset: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + timezoneOffset * 60_000).toISOString();
}

export function formatAppointmentDateTime(value: string | Date, dateStyle: "short" | "medium" | "long" = "medium") {
  return new Intl.DateTimeFormat("es-VE", { dateStyle, timeStyle: "short", timeZone: GARAGE_TIME_ZONE }).format(new Date(value));
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