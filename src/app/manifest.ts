import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TorkeOS · Gestión de Taller",
    short_name: "TorkeOS",
    description: "Gestión móvil de órdenes, diagnósticos y presupuestos para talleres mecánicos.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#171a1f",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}