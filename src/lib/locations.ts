import { z } from "zod";

/** Only country for now: fixed, not editable. */
export const DEFAULT_COUNTRY = { code: "VE", name: "Venezuela" } as const;
/** `cityId` value of the "Otra ciudad…" option. */
export const OTHER_CITY = "other";

export type CityOption = { id: string; name: string };
export type StateOption = { id: string; name: string; cities: CityOption[] };
export type LocationValue = { stateId: string | null; cityId: string | null };

/** Form fields of a location. With `cityId = "other"`, `otherCity` is the typed name. */
export const locationFieldsSchema = z.object({
  stateId: z.uuid(),
  cityId: z.union([z.uuid(), z.literal(OTHER_CITY)]),
  otherCity: z.string().trim().max(80).optional(),
});
export type LocationFields = z.infer<typeof locationFieldsSchema>;

/** Same key as the `cities.name_key` column: case and accent insensitive. */
export function cityKey(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** "Mérida, Mérida" style label. */
export function locationLabel(states: StateOption[], location: LocationValue) {
  const state = states.find((item) => item.id === location.stateId);
  const city = state?.cities.find((item) => item.id === location.cityId);
  return [city?.name, state?.name].filter(Boolean).join(", ");
}
