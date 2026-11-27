import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { DeliveryView, ReturnView } from "./types";

export class WorkflowError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.status = status;
  }
}
export function positiveId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new WorkflowError("A positive integer ID is required.", 400);
  return value;
}
function note(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 3 ||
    value.length > 2000
  )
    throw new WorkflowError("Enter notes between 3 and 2,000 characters.", 400);
  return value.trim();
}
const returnQuery = `SELECT r.*, p.name product_name, p.sku, p.description, p.price, p.image_url catalogue_image,
  c.name customer_name, o.payment_status,
  (SELECT m.id FROM matches m WHERE m.return_id=r.id AND m.match_status IN ('proposed','accepted','in_transit') LIMIT 1) active_match
  FROM returns r JOIN orders o ON o.id=r.order_id JOIN products p ON p.id=o.product_id JOIN customers c ON c.id=o.customer_id`;

export function operations(database: Database.Database) {
  function returns() {
    return database
      .prepare(`${returnQuery} ORDER BY r.created_at DESC, r.id DESC`)
      .all() as ReturnView[];
  }
  function returnById(id: number) {
    const row = database
      .prepare(`${returnQuery} WHERE r.id=?`)
      .get(positiveId(id)) as ReturnView | undefined;
    if (!row) throw new WorkflowError("Return not found.", 404);
    return row;
  }
  const decide = database.transaction(
    (id: number, action: unknown, notes: unknown) => {
      const r = returnById(id);
      const text = note(notes);
      if (!["approve", "reject", "review"].includes(String(action)))
        throw new WorkflowError("Unknown verification action.", 400);
      if (
        !["requested", "approved"].includes(r.return_status) ||
        r.active_match
      )
        throw new WorkflowError(
          "This return has moved beyond verification. Its linked workflow must be resolved first.",
        );
      if (action === "approve" && r.condition === "damaged")
        throw new WorkflowError(
          "Reported damage requires the standard return process.",
        );
      if (action === "approve" && r.payment_status !== "paid")
        throw new WorkflowError(
          "Only paid orders are eligible for local rerouting.",
        );
      const verification =
        action === "approve"
          ? "verified"
          : action === "reject"
            ? "failed"
            : "pending";
      const status =
        action === "approve"
          ? "approved"
          : action === "reject"
            ? "rejected"
            : "requested";
      database
        .prepare(
          "UPDATE returns SET verification_status=?, return_status=?, verification_notes=? WHERE id=?",
        )
        .run(verification, status, text, id);
      return returnById(id);
    },
  );
  function deliveries(): DeliveryView[] {
    const rows = database
      .prepare(
        `SELECT m.id match_id,m.return_id,m.buyer_order_id,m.match_status,m.distance_km,m.savings,m.traditional_cost,m.reroute_cost,
      d.id delivery_id,d.tracking_code,d.delivery_status,d.collected_at,d.delivered_at,d.created_at,
      oc.method,oc.created_at arranged_at,p.name product_name,p.sku,p.price,p.image_url catalogue_image,
      rc.name returner_name,bc.name buyer_name,rc.latitude returner_lat,rc.longitude returner_lng,bc.latitude buyer_lat,bc.longitude buyer_lng,
      r.verification_status,r.return_status,r.refund_status,r.reward_amount
      FROM matches m JOIN returns r ON r.id=m.return_id JOIN orders ro ON ro.id=r.order_id JOIN products p ON p.id=ro.product_id
      JOIN customers rc ON rc.id=ro.customer_id JOIN orders bo ON bo.id=m.buyer_order_id JOIN customers bc ON bc.id=bo.customer_id
      LEFT JOIN deliveries d ON d.match_id=m.id LEFT JOIN operation_collections oc ON oc.delivery_id=d.id
      ORDER BY m.created_at DESC,m.id DESC`,
      )
      .all() as DeliveryView[];
    return rows.map((row) => ({
      ...row,
      inspection:
        (database
          .prepare("SELECT * FROM operation_inspections WHERE delivery_id=?")
          .get(row.delivery_id) as DeliveryView["inspection"]) ?? null,
      receipt:
        (database
          .prepare("SELECT * FROM operation_refund_receipts WHERE return_id=?")
          .get(row.return_id) as DeliveryView["receipt"]) ?? null,
      events: database
        .prepare(
          "SELECT event,created_at FROM operation_delivery_events WHERE delivery_id=? ORDER BY id",
        )
        .all(row.delivery_id) as DeliveryView["events"],
    }));
  }
  function delivery(id: number) {
    positiveId(id);
    const row = deliveries().find((d) => d.delivery_id === id);
    if (!row) throw new WorkflowError("Delivery not found.", 404);
    return row;
  }
  function eligible(d: DeliveryView) {
    if (
      d.verification_status !== "verified" ||
      !["approved", "matched", "in_transit"].includes(d.return_status)
    )
      throw new WorkflowError("Return is not eligible for local rerouting.");
    const buyer = database
      .prepare(
        `SELECT bo.payment_status,bo.fulfillment_status,bo.reroute_consent,bo.product_id,ro.product_id return_product
      FROM orders bo JOIN returns r ON r.id=? JOIN orders ro ON ro.id=r.order_id WHERE bo.id=?`,
      )
      .get(d.return_id, d.buyer_order_id) as {
      payment_status: string;
      fulfillment_status: string;
      reroute_consent: number;
      product_id: number;
      return_product: number;
    };
    if (
      buyer.payment_status !== "paid" ||
      !buyer.reroute_consent ||
      buyer.product_id !== buyer.return_product ||
      !["unfulfilled", "processing", "shipped"].includes(
        buyer.fulfillment_status,
      )
    )
      throw new WorkflowError("The receiving order is no longer eligible.");
    return buyer;
  }
  function event(id: number, name: string) {
    database
      .prepare(
        "INSERT INTO operation_delivery_events(delivery_id,event) VALUES(?,?)",
      )
      .run(id, name);
  }
  const arrange = database.transaction((matchId: number, method: unknown) => {
    positiveId(matchId);
    if (method !== "courier" && method !== "locker")
      throw new WorkflowError("Choose courier or locker collection.", 400);
    const d = deliveries().find((r) => r.match_id === matchId);
    if (!d) throw new WorkflowError("Match not found.", 404);
    if (d.method) throw new WorkflowError("Collection is already arranged.");
    if (d.match_status !== "accepted")
      throw new WorkflowError(
        "The matching team must accept this match before collection can be arranged.",
      );
    const buyer = eligible(d);
    if (!["unfulfilled", "processing"].includes(buyer.fulfillment_status))
      throw new WorkflowError("Receiving order has already shipped.");
    if (d.delivery_status && d.delivery_status !== "pending")
      throw new WorkflowError("Delivery has already started.");
    const id =
      d.delivery_id ??
      Number(
        database
          .prepare(`INSERT INTO deliveries(match_id,tracking_code) VALUES(?,?)`)
          .run(matchId, `RR-${randomUUID().slice(0, 8).toUpperCase()}`)
          .lastInsertRowid,
      );
    database
      .prepare(
        "INSERT INTO operation_collections(delivery_id,method) VALUES(?,?)",
      )
      .run(id, method);
    database
      .prepare(
        `UPDATE returns SET return_status='matched' WHERE id=? AND return_status='approved'`,
      )
      .run(d.return_id);
    event(id, "scheduled");
    return delivery(id);
  });
  const inspect = database.transaction(
    (id: number, body: Record<string, unknown>) => {
      const d = delivery(id);
      const notes = note(body.notes);
      if (d.inspection)
        throw new WorkflowError(
          "This delivery already has a final inspection.",
        );
      if (
        d.delivery_status !== "collected" ||
        d.match_status !== "accepted" ||
        !d.method
      )
        throw new WorkflowError(
          "Collect an accepted delivery before physical inspection.",
        );
      eligible(d);
      if (body.outcome !== "passed" && body.outcome !== "failed")
        throw new WorkflowError("Choose a valid inspection outcome.", 400);
      const checks = body.checks;
      if (!checks || typeof checks !== "object" || Array.isArray(checks))
        throw new WorkflowError("An inspection checklist is required.", 400);
      const map = checks as Record<string, unknown>;
      if (
        ["identity", "sku", "condition", "packaging", "accessories"].some(
          (key) => typeof map[key] !== "boolean",
        )
      )
        throw new WorkflowError("All checklist values must be boolean.", 400);
      if (typeof body.sku !== "string" || body.sku.length > 100)
        throw new WorkflowError("Enter the inspected SKU.", 400);
      if (
        body.outcome === "passed" &&
        (["identity", "sku", "condition", "packaging", "accessories"].some(
          (k) => map[k] !== true,
        ) ||
          body.sku.trim() !== d.sku)
      )
        throw new WorkflowError(
          "Confirm every mandatory check and the exact SKU before passing inspection.",
          400,
        );
      const cleanChecks = Object.fromEntries(
        ["identity", "sku", "condition", "packaging", "accessories"].map(
          (k) => [k, map[k]],
        ),
      );
      database
        .prepare(
          "INSERT INTO operation_inspections(delivery_id,outcome,checks_json,sku_confirmed,notes) VALUES(?,?,?,?,?)",
        )
        .run(
          id,
          body.outcome,
          JSON.stringify(cleanChecks),
          body.sku.trim(),
          notes,
        );
      event(
        id,
        body.outcome === "passed" ? "inspection_passed" : "inspection_failed",
      );
      if (body.outcome === "failed") {
        database
          .prepare(`UPDATE deliveries SET delivery_status='failed' WHERE id=?`)
          .run(id);
        database
          .prepare(`UPDATE matches SET match_status='failed' WHERE id=?`)
          .run(d.match_id);
        database
          .prepare(
            `UPDATE returns SET verification_status='failed', return_status='rejected' WHERE id=?`,
          )
          .run(d.return_id);
      }
      return delivery(id);
    },
  );
  const advance = database.transaction((id: number, target: unknown) => {
    const d = delivery(id);
    const next: Record<string, string> = {
      pending: "collected",
      collected: "in_transit",
      in_transit: "delivered",
    };
    if (typeof target !== "string" || next[d.delivery_status ?? ""] !== target)
      throw new WorkflowError("Invalid or duplicate delivery transition.");
    if (!d.method || !["accepted", "in_transit"].includes(d.match_status))
      throw new WorkflowError(
        "An accepted match and arranged collection are required.",
      );
    eligible(d);
    if (target !== "collected" && d.inspection?.outcome !== "passed")
      throw new WorkflowError(
        "A passed physical inspection is required before dispatch.",
      );
    if (target === "collected")
      database
        .prepare(
          `UPDATE deliveries SET delivery_status='collected',collected_at=datetime('now') WHERE id=?`,
        )
        .run(id);
    if (target === "in_transit") {
      database
        .prepare(
          `UPDATE deliveries SET delivery_status='in_transit' WHERE id=?`,
        )
        .run(id);
      database
        .prepare(`UPDATE matches SET match_status='in_transit' WHERE id=?`)
        .run(d.match_id);
      database
        .prepare(`UPDATE returns SET return_status='in_transit' WHERE id=?`)
        .run(d.return_id);
      database
        .prepare(
          `UPDATE orders SET fulfillment_status='shipped' WHERE id=? AND fulfillment_status IN ('unfulfilled','processing')`,
        )
        .run(d.buyer_order_id);
    }
    if (target === "delivered") {
      database
        .prepare(
          `UPDATE deliveries SET delivery_status='delivered',delivered_at=datetime('now') WHERE id=?`,
        )
        .run(id);
      database
        .prepare(`UPDATE matches SET match_status='completed' WHERE id=?`)
        .run(d.match_id);
      database
        .prepare(`UPDATE returns SET return_status='completed' WHERE id=?`)
        .run(d.return_id);
      database
        .prepare(
          `UPDATE orders SET fulfillment_status='delivered' WHERE id=? AND fulfillment_status='shipped'`,
        )
        .run(d.buyer_order_id);
    }
    event(id, target);
    return delivery(id);
  });
  const refund = database.transaction((id: number) => {
    const d = delivery(id);
    if (d.receipt) return d; // Idempotent retries return the existing receipt.
    if (
      !d.collected_at ||
      d.inspection?.outcome !== "passed" ||
      !["collected", "in_transit", "delivered"].includes(
        d.delivery_status ?? "",
      ) ||
      !["accepted", "in_transit", "completed"].includes(d.match_status)
    )
      throw new WorkflowError(
        "Successful handover and physical inspection are required.",
      );
    const r = returnById(d.return_id);
    if (
      !["pending", "approved"].includes(r.refund_status) ||
      r.payment_status !== "paid"
    )
      throw new WorkflowError(
        "This return cannot be refunded through this workflow.",
      );
    database
      .prepare(
        "INSERT INTO operation_refund_receipts(return_id,reference,refund_amount,reward_amount) VALUES(?,?,?,?)",
      )
      .run(r.id, `SIM-${randomUUID().toUpperCase()}`, r.price, r.reward_amount);
    database
      .prepare(`UPDATE returns SET refund_status='refunded' WHERE id=?`)
      .run(r.id);
    database
      .prepare(`UPDATE orders SET payment_status='refunded' WHERE id=?`)
      .run(r.order_id);
    return delivery(id);
  });
  return {
    returns,
    returnById,
    deliveries,
    delivery,
    decide: (id: number, action: unknown, notes: unknown) =>
      decide.immediate(id, action, notes),
    arrange: (id: number, method: unknown) => arrange.immediate(id, method),
    inspect: (id: number, body: Record<string, unknown>) =>
      inspect.immediate(id, body),
    advance: (id: number, target: unknown) => advance.immediate(id, target),
    refund: (id: number) => refund.immediate(id),
  };
}
