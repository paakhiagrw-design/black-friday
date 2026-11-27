"use client";
import type { DeliveryView } from "@/lib/operations/types";
import { s } from "@/components/verification/ui";

export default function RouteVisual({
  delivery: d,
}: {
  delivery: DeliveryView;
}) {
  // A local equirectangular projection preserves the direction between real endpoints.
  const latitude = (d.returner_lat + d.buyer_lat) / 2;
  const dx =
    (d.buyer_lng - d.returner_lng) * Math.cos((latitude * Math.PI) / 180);
  const dy = -(d.buyer_lat - d.returner_lat);
  const scale = 170 / Math.max(Math.abs(dx), Math.abs(dy), 0.00001);
  const start = { x: 240 - (dx * scale) / 2, y: 125 - (dy * scale) / 2 };
  const end = { x: 240 + (dx * scale) / 2, y: 125 + (dy * scale) / 2 };
  const active =
    d.delivery_status === "in_transit" || d.delivery_status === "delivered";
  return (
    <div className={s.routeCanvas}>
      <div className={s.routeHeader}>
        <strong>A shorter journey.</strong>
        <span>DUBLIN · COORDINATE VIEW</span>
      </div>
      <svg
        viewBox="0 0 480 290"
        role="img"
        aria-label={`Straight-line connection from ${d.returner_name} to ${d.buyer_name}. Inspection hub location is not specified.`}
      >
        <circle
          cx="240"
          cy="125"
          r="107"
          fill="none"
          stroke="#304b3c"
          strokeDasharray="2 7"
        />
        <circle cx="240" cy="125" r="66" fill="none" stroke="#243c30" />
        <path
          d={`M${start.x} ${start.y}L${end.x} ${end.y}`}
          stroke="#233f30"
          strokeWidth="8"
        />
        <path
          d={`M${start.x} ${start.y}L${end.x} ${end.y}`}
          stroke={active ? "#34d399" : "#5e8973"}
          strokeWidth="2"
          className={active ? s.routeLine : undefined}
          strokeDasharray={active ? undefined : "5 5"}
        />
        {[
          { ...start, name: "RETURNING CUSTOMER", n: d.returner_name },
          { ...end, name: "RECEIVING CUSTOMER", n: d.buyer_name },
        ].map((point, i) => (
          <g key={point.name}>
            <circle
              cx={point.x}
              cy={point.y}
              r="16"
              fill="#34d39910"
              stroke="#34d39930"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill={
                i === 0 || d.delivery_status === "delivered"
                  ? "#34d399"
                  : "#b4d4c2"
              }
            />
            <text
              x={point.x + (i === 0 ? -24 : 24)}
              y={point.y - 7}
              textAnchor={i === 0 ? "end" : "start"}
              fill="#739481"
              fontSize="8"
              letterSpacing=".8"
            >
              {point.name}
            </text>
            <text
              x={point.x + (i === 0 ? -24 : 24)}
              y={point.y + 9}
              textAnchor={i === 0 ? "end" : "start"}
              fill="#d2e4d8"
              fontSize="11"
            >
              {point.n.split(" ")[0]}
            </text>
          </g>
        ))}
        <g transform="translate(115 248)">
          <rect
            width="250"
            height="30"
            rx="6"
            fill="#18261e"
            stroke="#35533f"
          />
          <text x="125" y="19" textAnchor="middle" fill="#99b8a5" fontSize="10">
            Collection → physical inspection → delivery
          </text>
        </g>
        <text x="453" y="30" fill="#779583" fontSize="9">
          N
        </text>
        <path d="m456 37-3 8h6Z" fill="#779583" />
      </svg>
      <p className={s.routeCaption}>
        Real customer coordinates · straight-line illustration, not a road
        route. Inspection point is schematic; its location has not been
        assigned.
      </p>
    </div>
  );
}
