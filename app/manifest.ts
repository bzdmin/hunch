import type { MetadataRoute } from "next";
import { NAME, TAGLINE } from "@/lib/brand";

/** PNG sizes rasterised from app/icon.svg. Android WebView ignores SVG
 *  favicons and shows a globe unless a PNG is listed here. */
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
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
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
    ],
  };
}
