/** "Pintura de rines" → "pintura_de_rines": keys for specialties and repairs (max 60 chars). */
export function catalogKey(label: string) {
  return label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "item";
}
