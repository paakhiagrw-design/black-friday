"use client";
import Link from "next/link";
import { useState } from "react";
import { mandatoryChecks } from "@/lib/operations/types";
import type { DeliveryView } from "@/lib/operations/types";
import {
  Badge,
  Empty,
  Icon,
  Loading,
  Notice,
  Shell,
  post,
  s,
  stamp,
  useFeed,
} from "@/components/verification/ui";
import RefundCard from "./refund-card";

export default function InspectionWorkspace() {
  const feed = useFeed<{ deliveries: DeliveryView[] }>("/api/inspection");
  const [selected, setSelected] = useState<number | null>(null);
  const rows = feed.data?.deliveries ?? [];
  const d =
    rows.find((r) => r.delivery_id === selected) ??
    rows.find((r) => r.delivery_status === "collected" && !r.inspection) ??
    rows[0];
  return (
    <Shell
      active="inspection"
      title="Physical inspection"
      subtitle="The final quality checkpoint. Confirm the item, then unlock its next journey."
      onRefresh={feed.refresh}
      loading={feed.loading}
    >
      {feed.error && <Notice error>{feed.error}</Notice>}
      {feed.loading ? (
        <Loading />
      ) : !d ? (
        <section className={s.panel}>
          <Empty
            title="No items to inspect yet"
            detail="Arrange collection for an accepted match. Collected items become available for physical inspection."
          />
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
                  {r.tracking_code} · {r.product_name} · {r.delivery_status}
                </option>
              ))}
            </select>
          </label>
          <InspectionForm
            key={d.delivery_id}
            delivery={d}
            refresh={feed.refresh}
          />
        </>
      )}
    </Shell>
  );
}
function InspectionForm({
  delivery: d,
  refresh,
}: {
  delivery: DeliveryView;
  refresh: () => Promise<void>;
}) {
  const [checks, setChecks] = useState<Record<string, boolean>>({
    identity: false,
    sku: false,
    condition: false,
    packaging: false,
    accessories: false,
  });
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const count = Object.values(checks).filter(Boolean).length;
  const ready =
    d.delivery_status === "collected" &&
    d.match_status === "accepted" &&
    !!d.method &&
    !d.inspection;
  async function submit(outcome: string) {
    if (busy) return;
    setBusy(outcome);
    setError("");
    try {
      await post("/api/inspection", {
        deliveryId: d.delivery_id,
        outcome,
        checks,
        sku,
        notes,
      });
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Inspection could not be saved.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <div className={s.twoColumn}>
      <section className={s.panel}>
        <div className={s.panelHead}>
          <h2>
            <Icon name="shield" />
            Inspection checklist
          </h2>
          <Badge
            value={d.inspection?.outcome ?? d.delivery_status ?? "pending"}
          />
        </div>
        <div className={s.panelPadding}>
          <div className={s.eyebrow}>{d.sku}</div>
          <h2 style={{ fontSize: 23, marginTop: 8 }}>{d.product_name}</h2>
          <p className={s.muted}>
            {d.returner_name} · {d.tracking_code}
          </p>
          {d.inspection ? (
            <>
              <Notice error={d.inspection.outcome === "failed"}>
                {d.inspection.outcome === "passed"
                  ? "Inspection passed. Dispatch and a simulated refund are available."
                  : "Inspection failed. Local delivery is blocked; continue through the standard warehouse return process."}
              </Notice>
              <dl className={s.detailList}>
                <div>
                  <dt>Inspected</dt>
                  <dd>{stamp(d.inspection.created_at)}</dd>
                </div>
                <div>
                  <dt>SKU recorded</dt>
                  <dd>{d.inspection.sku_confirmed || "Not confirmed"}</dd>
                </div>
              </dl>
              <div className={s.quote}>
                <span>Inspector notes</span>
                <p>{d.inspection.notes}</p>
              </div>
              <p className={s.operationalNote}>
                Refund eligibility is not automatically denied when an
                inspection fails.
              </p>
              <Link
                className={s.secondary}
                href={`/tracking?delivery=${d.delivery_id}`}
              >
                View tracking
              </Link>
            </>
          ) : !ready ? (
            <>
              <Empty
                title="Awaiting collected item"
                detail="An accepted match must be arranged and collected before its physical inspection can be recorded."
              />
              <Link className={s.secondary} href="/delivery">
                Open collection plan
              </Link>
              <Link
                className={s.emptyStateLink}
                style={{ marginLeft: 16 }}
                href={`/tracking?delivery=${d.delivery_id}`}
              >
                Open tracking
              </Link>
            </>
          ) : (
            <>
              <div
                className={s.row}
                style={{ justifyContent: "space-between", marginTop: 24 }}
              >
                <span className={s.muted}>Mandatory checks</span>
                <span className={s.mono}>{count} / 5 COMPLETE</span>
              </div>
              <div
                className={s.progressTrack}
                role="progressbar"
                aria-label="Inspection completion"
                aria-valuenow={count}
                aria-valuemin={0}
                aria-valuemax={5}
              >
                <div style={{ width: `${count * 20}%` }} />
              </div>
              {mandatoryChecks.map(([key, title, description]) => (
                <div className={s.inspectionCheck} key={key}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checks[key]}
                      disabled={!!busy}
                      onChange={(e) =>
                        setChecks({ ...checks, [key]: e.target.checked })
                      }
                    />
                    <div>
                      <strong>{title}</strong>
                      <p>{description}</p>
                    </div>
                  </label>
                  <details>
                    <summary>Inspection guidance</summary>
                    <p>
                      Examine the physical item directly. An uploaded photograph
                      alone cannot establish functionality, internal condition,
                      or authenticity. If uncertain, fail this local inspection
                      and use the warehouse return process.
                    </p>
                  </details>
                </div>
              ))}
              <label className={s.field}>
                SKU observed on product
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  maxLength={100}
                  placeholder={`Confirm ${d.sku}`}
                  disabled={!!busy}
                />
              </label>
              <label className={s.field}>
                Inspector notes
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                  placeholder="Record the physical checks performed and any findings…"
                  disabled={!!busy}
                />
              </label>
              <div className={s.buttonPair}>
                <button
                  className={s.primary}
                  disabled={
                    !!busy ||
                    count !== 5 ||
                    sku.trim() !== d.sku ||
                    notes.trim().length < 3
                  }
                  onClick={() => void submit("passed")}
                >
                  <Icon name="check" />
                  {busy === "passed" ? "Saving…" : "Pass inspection"}
                </button>
                <button
                  className={s.danger}
                  disabled={!!busy || notes.trim().length < 3}
                  onClick={() => void submit("failed")}
                >
                  {busy === "failed" ? "Saving…" : "Fail · warehouse fallback"}
                </button>
              </div>
              <p className={s.operationalNote}>
                Final decisions are saved once. Failure stops the local journey
                and preserves the original refund status for separate review.
              </p>
            </>
          )}
          {error && <Notice error>{error}</Notice>}
        </div>
      </section>
      <div className={s.stack}>
        <RefundCard delivery={d} refresh={refresh} />
        <section className={`${s.panel} ${s.panelPadding}`}>
          <div className={s.eyebrow}>HUMAN VERIFIED</div>
          <h2 style={{ marginTop: 12 }}>Confidence comes from care.</h2>
          <p className={s.operationalNote}>
            Vision Scan helps organise the evidence. A person confirms the
            physical product. All five checks and an exact SKU match are
            required for a successful inspection.
          </p>
        </section>
      </div>
    </div>
  );
}
