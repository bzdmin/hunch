import type { MetadataRoute } from "next";
import { NAME, TAGLINE } from "@/lib/brand";

/** PNG raster assets for Android/PWA WebView discovery. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NAME,
    short_name: NAME,
    description: TAGLINE,
    start_url: "/",
    display: "standalone",
    background_color: "#131110",
    theme_color: "#131110",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
