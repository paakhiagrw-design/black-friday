"use client";
import Link from "next/link";
import { useState } from "react";
import type { DeliveryView } from "@/lib/operations/types";
import {
  Badge,
  Empty,
  EvidenceImage,
  Icon,
  Loading,
  Notice,
  Shell,
  Stat,
  money,
  post,
  s,
  useFeed,
} from "@/components/verification/ui";
import RouteVisual from "./route-visual";

export default function DeliveryWorkspace() {
  const feed = useFeed<{ deliveries: DeliveryView[] }>("/api/delivery");
  const [selected, setSelected] = useState<number | null>(null);
  const rows = feed.data?.deliveries ?? [];
  const d = rows.find((r) => r.match_id === selected) ?? rows[0];
  return (
    <Shell
      active="delivery"
      title="Delivery command centre"
      subtitle="From one doorstep to the next. Keep value moving closer to home."
      onRefresh={feed.refresh}
      loading={feed.loading}
    >
      <div className={s.stats}>
        <Stat
          label="Ready to arrange"
          value={
            rows.filter((r) => r.match_status === "accepted" && !r.method)
              .length
          }
          detail="Accepted by matching team"
          icon="truck"
        />
        <Stat
          label="Awaiting approval"
          value={rows.filter((r) => r.match_status === "proposed").length}
          detail="Proposed matches"
          icon="clock"
        />
        <Stat
          label="On the move"
          value={
            rows.filter((r) =>
              ["collected", "in_transit"].includes(r.delivery_status ?? ""),
            ).length
          }
          detail="Active local journeys"
          icon="route"
        />
        <Stat
          label="Delivered"
          value={rows.filter((r) => r.delivery_status === "delivered").length}
          detail="Warehouse journeys avoided"
          icon="check"
        />
      </div>
      {feed.error && <Notice error>{feed.error}</Notice>}
      {feed.loading ? (
        <Loading />
      ) : !d ? (
        <section className={s.panel}>
          <Empty
            title="Ready for the next match"
            detail="Accepted matches from the matching engine will appear here automatically. Verify returns to get the journey started."
          />
          <div className={s.panelPadding}>
            <Link className={s.secondary} href="/verification">
              Open verification
            </Link>
          </div>
        </section>
      ) : (
        <>
          <label className={s.field}>
            Select a match
            <select
              className={s.select}
              value={d.match_id}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {rows.map((r) => (
                <option key={r.match_id} value={r.match_id}>
                  Match {r.match_id} · {r.product_name} · {r.match_status}
                </option>
              ))}
            </select>
          </label>
          <DeliveryDetail
            key={d.match_id}
            delivery={d}
            refresh={feed.refresh}
          />
        </>
      )}
    </Shell>
  );
}
function DeliveryDetail({
  delivery: d,
  refresh,
}: {
  delivery: DeliveryView;
  refresh: () => Promise<void>;
}) {
  const [method, setMethod] = useState<"courier" | "locker">("courier");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function arrange() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/delivery", { matchId: d.match_id, method });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not arrange collection.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {d.match_status === "proposed" && (
        <div className={s.alertBanner}>
          <Icon name="clock" />
          <div>
            <strong>Waiting for the matching team</strong>
            <p>
              This proposed match needs approval from the matching team before
              collection can be arranged.
            </p>
          </div>
        </div>
      )}
      <div className={s.twoColumn}>
        <div className={s.stack}>
          <section className={`${s.panel} ${s.deliveryCard}`}>
            <div className={s.deliveryTop}>
              <div className={s.row}>
                <EvidenceImage
                  url={d.catalogue_image}
                  label="Catalogue image"
                  small
                />
                <div>
                  <span className={s.mono}>
                    MATCH-{String(d.match_id).padStart(4, "0")} / {d.sku}
                  </span>
                  <h2>{d.product_name}</h2>
                </div>
              </div>
              <Badge value={d.delivery_status ?? d.match_status} />
            </div>
            <div className={s.participants}>
              <div>
                <span>RETURNING CUSTOMER</span>
                <strong>{d.returner_name}</strong>
                <small>Return #{d.return_id}</small>
              </div>
              <div>
                <span>RECEIVING CUSTOMER</span>
                <strong>{d.buyer_name}</strong>
                <small>Order #{d.buyer_order_id}</small>
              </div>
            </div>
            <RouteVisual delivery={d} />
            <div className={s.metricRow}>
              <div>
                <span>Match distance</span>
                <strong>
                  {d.distance_km.toFixed(1)} <small>km</small>
                </strong>
                <small>From matching engine</small>
              </div>
              <div>
                <span>Estimated reroute cost</span>
                <strong>{money(d.reroute_cost)}</strong>
                <small>Warehouse: {money(d.traditional_cost)}</small>
              </div>
              <div>
                <span>Estimated savings</span>
                <strong style={{ color: "#6ee7b7" }}>{money(d.savings)}</strong>
                <small>Per matched return</small>
              </div>
            </div>
          </section>
        </div>
        <div className={s.stack}>
          <section className={s.panel}>
            <div className={s.panelHead}>
              <h2>
                <Icon name="truck" />
                Collection plan
              </h2>
              <Badge value="simulation" tone="blue" />
            </div>
            <div className={s.panelPadding}>
              {d.method ? (
                <>
                  <h2>Collection arranged</h2>
                  <p className={s.muted}>
                    {d.method === "courier"
                      ? "Simulated courier collection"
                      : "Simulated locker drop-off"}{" "}
                    is scheduled for this return.
                  </p>
                  <div className={s.trackingRef}>{d.tracking_code}</div>
                  <Link
                    className={`${s.primary} ${s.fullWidth}`}
                    style={{ marginTop: 20 }}
                    href={`/tracking?delivery=${d.delivery_id}`}
                  >
                    Open tracking
                  </Link>
                </>
              ) : (
                <>
                  <p className={s.muted}>
                    Choose how the item enters its next journey. A physical
                    inspection is required before dispatch.
                  </p>
                  <div className={s.methodChoices}>
                    {(["courier", "locker"] as const).map((m) => (
                      <button
                        key={m}
                        className={method === m ? s.methodSelected : ""}
                        onClick={() => setMethod(m)}
                        aria-pressed={method === m}
                      >
                        <Icon name={m === "courier" ? "truck" : "box"} />
                        <span>
                          {m === "courier"
                            ? "Courier collection"
                            : "Locker drop-off"}
                        </span>
                        <small>
                          {m === "courier"
                            ? "Simulate a doorstep pickup"
                            : "Simulate a secure handover"}
                        </small>
                      </button>
                    ))}
                  </div>
                  <button
                    className={`${s.primary} ${s.fullWidth}`}
                    disabled={
                      busy ||
                      d.match_status !== "accepted" ||
                      !["approved", "matched"].includes(d.return_status) ||
                      d.verification_status !== "verified" ||
                      (d.delivery_status !== null &&
                        d.delivery_status !== "pending")
                    }
                    onClick={() => void arrange()}
                  >
                    <Icon name="truck" />
                    {busy ? "Arranging…" : "Arrange collection"}
                  </button>
                  <p className={s.finePrint}>
                    Demo only. No courier is booked or notified.
                  </p>
                </>
              )}
              {error && <Notice error>{error}</Notice>}
            </div>
          </section>
          <section className={`${s.panel} ${s.panelPadding}`}>
            <div className={s.eyebrow}>THE LOCAL LOOP</div>
            <h2 style={{ marginTop: 10 }}>A second life. A shorter route.</h2>
            <p className={s.operationalNote}>
              Seller verification confirms eligibility. Physical inspection
              confirms the handover. The original customer receives a simulated
              refund and the reward already assigned to their return.
            </p>
            <Link href="/inspection" className={s.emptyStateLink}>
              Open physical inspection
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
