import { z } from "zod";

/** Opening hours of one day in garage time ("HH:MM", 24 h internally), or null when closed. */
export type DaySchedule = { open: string; close: string } | null;
/** Sunday (0) to Saturday (6), like `Date#getDay`. */
export type WeekSchedule = DaySchedule[];

export const SLOT_MINUTES = 30;
export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
/** Monday first, the order owners expect to read the week in. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DEFAULT_SCHEDULE: WeekSchedule = Array.from({ length: 7 }, () => ({ open: "08:00", close: "18:00" }));

const toMinutes = (time: string) => { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; };
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Every half hour of the day, for the opening/closing pickers. */
export const HALF_HOURS = Array.from({ length: 48 }, (_, index) => toTime(index * SLOT_MINUTES));

/** "14:30" → "2:30 PM" (Venezuela reads the 12-hour clock). */
export function formatSlotTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/);
export const weekScheduleSchema = z.array(z.object({ open: timeSchema, close: timeSchema }).refine((day) => toMinutes(day.close) > toMinutes(day.open), "El cierre debe ser después de la apertura.").nullable()).length(7);

/** Stored schedule, falling back to the default for malformed rows. */
export function parseSchedule(value: unknown): WeekSchedule {
  const parsed = weekScheduleSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SCHEDULE;
}

/** Slot start times ("HH:MM") of a calendar date: from opening until before closing. */
export function scheduleSlots(schedule: WeekSchedule, date: string) {
  const day = schedule[new Date(`${date}T12:00:00Z`).getUTCDay()];
  if (!day) return [];
  const slots: string[] = [];
  for (let minutes = toMinutes(day.open); minutes < toMinutes(day.close); minutes += SLOT_MINUTES) slots.push(toTime(minutes));
  return slots;
}

/** "Lunes a viernes 8:00 AM – 6:00 PM · Sábado …" style one-liner for headers and lists. */
export function scheduleSummary(schedule: WeekSchedule) {
  const groups: { days: number[]; label: string }[] = [];
  for (const weekday of WEEKDAY_ORDER) {
    const day = schedule[weekday];
    const label = day ? `${formatSlotTime(day.open)} – ${formatSlotTime(day.close)}` : "Cerrado";
    const last = groups.at(-1);
    if (last && last.label === label) last.days.push(weekday);
    else groups.push({ days: [weekday], label });
  }
  return groups.map(({ days, label }) => {
    const first = WEEKDAY_LABELS[days[0]];
    const range = days.length === 1 ? first : days.length === 2 ? `${first} y ${WEEKDAY_LABELS[days[1]].toLowerCase()}` : `${first} a ${WEEKDAY_LABELS[days.at(-1)!].toLowerCase()}`;
    return `${range}: ${label}`;
  }).join(" · ");
}
