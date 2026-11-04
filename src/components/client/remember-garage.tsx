"use client";

import { useEffect } from "react";

import { rememberGarage } from "@/lib/garage-context";

/** Adds the garage page the client is viewing to "Mis talleres frecuentes". */
export function RememberGarage({ slug }: { slug: string }) {
  useEffect(() => rememberGarage(slug), [slug]);
  return null;
}
