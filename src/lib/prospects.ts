export const PROSPECT_STATUSES = ["new", "contacted", "interested", "requirements_sent", "negotiating", "won", "lost"] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  interested: "Interesado",
  requirements_sent: "Requisitos enviados",
  negotiating: "En negociación",
  won: "Convertido",
  lost: "Descartado",
};

export const PROSPECT_STATUS_STYLES: Record<ProspectStatus, string> = {
  new: "bg-stone-100 text-stone-700",
  contacted: "bg-sky-100 text-sky-800",
  interested: "bg-indigo-100 text-indigo-800",
  requirements_sent: "bg-amber-100 text-amber-800",
  negotiating: "bg-orange-100 text-orange-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-700",
};

export const PROSPECT_SOURCES = ["Instagram", "Facebook", "TikTok", "Referido", "Visita", "Google Maps", "WhatsApp", "Otro"];

export type Prospect = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  website: string | null;
  city: string | null;
  /** true = Mérida, false = another city. */
  is_local: boolean;
  address: string | null;
  map_location: string | null;
  specialty: string | null;
  source: string | null;
  status: ProspectStatus;
  lost_reason: string | null;
  next_follow_up: string | null;
  notes: string | null;
  garage_id: string | null;
  created_at: string;
};

export const PROSPECT_COLUMNS = "id, name, contact_name, phone, email, instagram, facebook, tiktok, website, city, is_local, address, map_location, specialty, source, status, lost_reason, next_follow_up, notes, garage_id, created_at";

const SOCIAL_BASE = { instagram: "https://instagram.com/", facebook: "https://facebook.com/", tiktok: "https://tiktok.com/@" } as const;

/** Accepts a full URL or a handle (`@taller`, `taller`) and returns a link. */
export function socialUrl(network: keyof typeof SOCIAL_BASE, value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${SOCIAL_BASE[network]}${trimmed.replace(/^@/, "")}`;
}

export function websiteUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
}
