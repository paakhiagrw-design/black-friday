"use client";
import Link from "next/link";
import { useState } from "react";
import type { DeliveryView } from "@/lib/operations/types";
import {
  Badge,
  Empty,
  Icon,
  Loading,
  Notice,
  Shell,
  human,
  post,
  s,
  stamp,
  useFeed,
} from "@/components/verification/ui";
import RefundCard from "./refund-card";
import RouteVisual from "./route-visual";
export default function TrackingWorkspace({
  initialDelivery = null,
  reference,
}: {
  initialDelivery?: number | null;
  reference?: string;
}) {
  const feed = useFeed<{ deliveries: DeliveryView[] }>("/api/tracking");
  const [selected, setSelected] = useState<number | null>(initialDelivery);
  const rows = feed.data?.deliveries ?? [];
  const d = selected !== null ? rows.find(r => r.delivery_id === selected) : reference !== undefined ? rows.find(r => r.tracking_code === reference) : rows[0];
  return (
    <Shell
      active="tracking"
      title="Delivery tracking"
      subtitle="Every handover, in view. Follow the journey from return to rediscovery."
      onRefresh={feed.refresh}
      loading={feed.loading}
    >
      {feed.error && <Notice error>{feed.error}</Notice>}
      {feed.loading ? (
        <Loading />
      ) : !d ? (
        <section className={s.panel}>
          <Empty
            title={selected !== null || reference !== undefined ? "Tracking reference not found" : "No deliveries yet"}
            detail="Check the reference or open the delivery list to select a collection."
          />
          <Link className={s.secondary} href="/delivery">View deliveries</Link>
        </section>
      ) : (
        <>
          <label className={s.field}>
            Select a delivery
            <select
              className={s.select}
              value={d.delivery_id!}
              onChange={(e) => setSelected(Number(e.target.value))}
            >
              {rows.map((r) => (
                <option key={r.delivery_id} value={r.delivery_id!}>
                  {r.tracking_code} · {r.product_name}
                </option>
              ))}
            </select>
          </label>
          <TrackingDetail
            key={d.delivery_id}
            delivery={d}
            refresh={feed.refresh}
          />
        </>
      )}
    </Shell>
  );
}
function TrackingDetail({
  delivery: d,
  refresh,
}: {
  delivery: DeliveryView;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const steps = [
    ["scheduled", "Collection scheduled", "Collection plan recorded"],
    [
      "collected",
      "Product collected",
      "Item handed over by returning customer",
    ],
    [
      "inspection_passed",
      "Physical inspection completed",
      "Mandatory quality checks passed",
    ],
    [
      "in_transit",
      "In transit",
      "On its local journey to the receiving customer",
    ],
    ["delivered", "Delivered", "The next chapter begins"],
  ];
  const failed = d.delivery_status === "failed";
  const scheduled = !!d.method;
  const states = [
    scheduled,
    !!d.collected_at,
    d.inspection?.outcome === "passed",
    ["in_transit", "delivered"].includes(d.delivery_status ?? ""),
    d.delivery_status === "delivered",
  ];
  const activeIndex = states.lastIndexOf(true);
  const current = failed
    ? "Local journey stopped"
    : !scheduled
      ? "Awaiting collection plan"
      : activeIndex === 4
        ? "Delivered. Rediscovered."
        : steps[Math.max(activeIndex, 0)][1];
  const next =
    d.delivery_status === "pending"
      ? "collected"
      : d.delivery_status === "collected"
        ? "in_transit"
        : d.delivery_status === "in_transit"
          ? "delivered"
          : null;
  const canAdvance =
    scheduled &&
    ["accepted", "in_transit"].includes(d.match_status) &&
    !!next &&
    (next === "collected" || d.inspection?.outcome === "passed");
  async function advance() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/tracking", {
        deliveryId: d.delivery_id,
        action: "advance",
        status: next,
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not advance delivery.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(d.tracking_code!);
      setCopied(true);
    } catch {
      setError(
        "Clipboard unavailable. Select the tracking reference to copy it manually.",
      );
    }
  }
  return (
    <div className={s.twoColumn}>
      <div className={s.stack}>
        <section className={s.panel}>
          <div className={s.heroStatus}>
            <div className={s.scanOrb}>
              <Icon
                name={failed ? "alert" : activeIndex === 4 ? "check" : "route"}
                size={34}
              />
            </div>
            <div className={s.eyebrow}>THE LOCAL JOURNEY</div>
            <h2>{current}</h2>
            <p>{d.product_name}</p>
            <div className={s.trackingRef}>
              <span>{d.tracking_code}</span>
              <button
                className={s.iconButton}
                aria-label="Copy tracking reference"
                onClick={() => void copy()}
              >
                <Icon name={copied ? "check" : "copy"} size={17} />
              </button>
            </div>
            {copied && (
              <span className={s.smallLabel} role="status">
                Tracking reference copied
              </span>
            )}
          </div>
          <div className={s.timeline}>
            {steps.map(([key, title, description], index) => {
              const event = d.events.find((e) => e.event === key);
              return (
                <div
                  key={key}
                  className={`${s.timelineItem} ${states[index] ? s.timelineDone : ""} ${index === activeIndex ? s.timelineActive : ""}`}
                  aria-current={index === activeIndex ? "step" : undefined}
                >
                  <span className={s.timelineNode}>
                    {states[index] ? (
                      <Icon name="check" size={14} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>
                      {event
                        ? stamp(event.created_at)
                        : states[index]
                          ? "Recorded in the existing delivery record"
                          : description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={s.simulation}>
            <div>
              <Badge value="courier simulation" tone="blue" />
              <span className={s.smallLabel}>Manual demo events</span>
            </div>
            {failed ? (
              <Notice error>
                Use the standard warehouse return process. This delivery cannot
                be dispatched.
              </Notice>
            ) : !scheduled ? (
              <>
                <p>
                  Collection has not been arranged. Proposed matches need
                  acceptance by the matching team first.
                </p>
                <Link className={s.secondary} href="/delivery">
                  Open collection plan
                </Link>
              </>
            ) : d.delivery_status === "collected" && !d.inspection ? (
              <>
                <p>The collected item is ready for its physical inspection.</p>
                <Link className={s.primary} href="/inspection">
                  Inspect collected item
                </Link>
              </>
            ) : next ? (
              <>
                <p>
                  Advance one event at a time. These are persisted demo events,
                  not a live courier feed.
                </p>
                <button
                  className={s.primary}
                  disabled={busy || !canAdvance}
                  onClick={() => void advance()}
                >
                  <Icon name="truck" />
                  {busy
                    ? "Saving event…"
                    : `Simulate ${next === "collected" ? "collection" : next === "in_transit" ? "dispatch" : "delivery"}`}
                </button>
              </>
            ) : (
              <Notice>Delivery complete. Every recorded event is saved.</Notice>
            )}
            {error && <Notice error>{error}</Notice>}
          </div>
        </section>
      </div>
      <div className={s.stack}>
        <RouteVisual delivery={d} />
        <RefundCard delivery={d} refresh={refresh} />
        <section className={`${s.panel} ${s.panelPadding}`}>
          <h2>Journey details</h2>
          <dl className={s.detailList}>
            <div>
              <dt>From</dt>
              <dd>{d.returner_name}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{d.buyer_name}</dd>
            </div>
            <div>
              <dt>Product SKU</dt>
              <dd className={s.mono}>{d.sku}</dd>
            </div>
            <div>
              <dt>Collection method</dt>
              <dd>{d.method ? human(d.method) : "Not arranged"}</dd>
            </div>
          </dl>
          <div className={s.events}>
            <div className={s.eyebrow}>PERSISTED EVENT LOG</div>
            {d.events.length ? (
              d.events.map((e) => (
                <div key={e.event}>
                  <strong>{human(e.event)}</strong>
                  <span>{stamp(e.created_at)}</span>
                </div>
              ))
            ) : (
              <p className={s.operationalNote}>
                No simulation events have been recorded yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
