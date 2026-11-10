import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PumpShield",
    short_name: "PumpShield",
    description:
      "Verified fuel-station operations and encrypted offline field drafts.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f5f3ee",
    theme_color: "#174c45",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
