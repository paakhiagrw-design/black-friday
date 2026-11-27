"use client";
import { useState } from "react";
import type { DeliveryView } from "@/lib/operations/types";
import {
  Badge,
  Icon,
  Notice,
  money,
  post,
  s,
  stamp,
} from "@/components/verification/ui";
export default function RefundCard({
  delivery: d,
  refresh,
}: {
  delivery: DeliveryView;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const receipt = d.receipt;
  const eligible =
    !!d.collected_at &&
    d.inspection?.outcome === "passed" &&
    ["collected", "in_transit", "delivered"].includes(
      d.delivery_status ?? "",
    ) &&
    ["pending", "approved"].includes(d.refund_status);
  async function refund() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await post("/api/tracking", {
        deliveryId: d.delivery_id,
        action: "refund",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${s.panel} ${receipt ? s.successPanel : ""}`}>
      <div className={s.panelHead}>
        <h2>
          <Icon name="wallet" />
          Refund & reward
        </h2>
        <Badge value="simulated" tone="blue" />
      </div>
      <div className={s.panelPadding}>
        {receipt ? (
          <>
            <div className={s.successCheck}>
              <Icon name="check" size={26} />
            </div>
            <h2 style={{ marginTop: 18 }}>Value returned.</h2>
            <p className={s.muted}>
              Simulated refund recorded for {d.returner_name}.
            </p>
          </>
        ) : (
          <>
            <h2>A little closer. A little more back.</h2>
            <p className={s.muted}>
              The return value and assigned reward, ready after handover and
              successful inspection.
            </p>
          </>
        )}
        <p className={s.refundAmount}>
          {money(
            (receipt?.refund_amount ?? d.price) +
              (receipt?.reward_amount ?? d.reward_amount),
          )}
        </p>
        <Badge value={receipt ? "refunded" : d.refund_status} />
        <div className={s.refundBreakdown}>
          <div>
            <span>Original refund</span>
            <strong>{money(receipt?.refund_amount ?? d.price)}</strong>
          </div>
          <div>
            <span>Additional reward</span>
            <strong style={{ color: "#6ee7b7" }}>
              + {money(receipt?.reward_amount ?? d.reward_amount)}
            </strong>
          </div>
          <div>
            <span>Total returned value</span>
            <strong>
              {money(
                (receipt?.refund_amount ?? d.price) +
                  (receipt?.reward_amount ?? d.reward_amount),
              )}
            </strong>
          </div>
        </div>
        {receipt ? (
          <>
            <div className={s.receiptRef}>{receipt.reference}</div>
            <p className={s.finePrint}>
              {stamp(receipt.created_at)} · No funds were transferred.
            </p>
          </>
        ) : (
          <>
            <button
              className={`${s.primary} ${s.fullWidth}`}
              style={{ marginTop: 16 }}
              disabled={busy || !eligible}
              onClick={() => void refund()}
            >
              <Icon name="wallet" />
              {busy ? "Recording…" : "Issue simulated refund"}
            </button>
            <p className={s.finePrint}>
              {eligible
                ? "No actual payment will be made."
                : "Available after collection and passed inspection."}{" "}
              The reward is taken from the existing return record.
            </p>
          </>
        )}
        {error && <Notice error>{error}</Notice>}
      </div>
    </section>
  );
}
