import type { Metadata } from "next";

import BrandKit from "@/components/brand/brand-kit";

export const metadata: Metadata = {
  title: "Brand Kit",
  description: "Logo, colores, tipografía y tokens oficiales de TorkeOS, listos para descargar.",
};

export default function BrandPage() {
  return <BrandKit />;
}
