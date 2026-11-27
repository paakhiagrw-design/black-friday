/* eslint-disable @next/next/no-img-element -- Remote catalogue fallbacks support an explicit error state. */
"use client";
import { useState } from "react";
// Presentation assets only. Product identity, descriptions and prices come from SQLite.
const photos: Record<string, string> = {
  "RR-AUD-001": "/catalogue/headphones.webp",
  "RR-HOM-002": "/catalogue/pourover.webp",
  "RR-TEC-003": "/catalogue/hub.webp",
  "RR-BAG-004": "/catalogue/backpack.webp",
  "RR-KIT-005": "/catalogue/cookware.webp",
  "RR-LGT-006": "/catalogue/lamp.webp",
  "RR-FIT-007": "/catalogue/yogamat.webp",
  "RR-OUT-008": "/catalogue/bottle.webp",
  "RR-BOO-009": "/catalogue/keyboard.webp",
  "RR-HOM-010": "/catalogue/throw.webp",
};
export function ProductImage({
  sku,
  name,
  url,
  hero = false,
}: {
  sku: string;
  name: string;
  url: string;
  hero?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src =
    url && !url.includes("example.test")
      ? url
      : photos[sku];
  return failed || !src ? (
    <div
      role="img"
      aria-label={name}
      style={{
        display: "grid",
        placeItems: "center",
        height: "100%",
        minHeight: 150,
        background: "var(--surface)",
        color: "var(--ink)",
      }}
    >
      RIP · {name}
    </div>
  ) : (
    <img
      src={src}
      alt={name}
      loading={hero ? "eager" : "lazy"}
      onError={() => setFailed(true)}
    />
  );
}
