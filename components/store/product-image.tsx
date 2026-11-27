/* eslint-disable @next/next/no-img-element -- Remote catalogue fallbacks support an explicit error state. */
"use client";
import { useState } from "react";
// Presentation assets only. Product identity, descriptions and prices come from SQLite.
const photos: Record<string, string> = {
  "RR-AUD-001": "1505740420928-5e560c06d30e",
  "RR-HOM-002": "1544787219-7f47ccb76574",
  "RR-TEC-003": "1625842268584-8f3296236761",
  "RR-BAG-004": "1553062407-98eeb64c6a62",
  "RR-KIT-005": "1556911220-bff31c812dba",
  "RR-LGT-006": "1507473885765-e6ed057f782c",
  "RR-FIT-007": "1601925260368-ae2f83cf8b7f",
  "RR-OUT-008": "1602143407151-7111542de6e8",
  "RR-BOO-009": "1587829741301-dc798b83add3",
  "RR-HOM-010": "1600369672770-985fd30004eb",
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
      : `https://images.unsplash.com/photo-${photos[sku] || photos["RR-AUD-001"]}?auto=format&fit=crop&w=${hero ? 1400 : 700}&q=85`;
  return failed ? (
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
