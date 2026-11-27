import type Database from "better-sqlite3";
import type { Product, ReturnCondition } from "../types";
export class StoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
export function positiveId(value: unknown) {
  const n =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1)
    throw new StoreError("Invalid identifier.");
  return n;
}
export const conditions: ReturnCondition[] = [
  "unopened",
  "like_new",
  "good",
  "fair",
  "damaged",
];
export function storeService(db: Database.Database) {
  function customer(id: number) {
    if (!db.prepare("SELECT id FROM customers WHERE id = ?").get(id))
      throw new StoreError("Choose a demo customer.", 401);
    return id;
  }
  function eligible(customerId: number, orderId: number) {
    customer(customerId);
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND customer_id = ?")
      .get(orderId, customerId) as
      { payment_status: string; fulfillment_status: string } | undefined;
    if (!order) throw new StoreError("Order not found for this customer.", 404);
    if (db.prepare("SELECT id FROM returns WHERE order_id = ?").get(orderId))
      throw new StoreError("A return already exists for this order.", 409);
    if (
      order.fulfillment_status !== "delivered" ||
      order.payment_status !== "paid"
    )
      throw new StoreError(
        "Only paid, delivered purchases can be returned.",
        409,
      );
  }
  return {
    customer,
    eligible,
    checkout(customerId: number, body: unknown) {
      customer(customerId);
      if (!body || typeof body !== "object")
        throw new StoreError("Invalid checkout.");
      const { items, consent } = body as { items?: unknown; consent?: unknown };
      if (
        typeof consent !== "boolean" ||
        !Array.isArray(items) ||
        !items.length ||
        items.length > 50
      )
        throw new StoreError("Choose items and a valid consent preference.");
      const lines = items.map((item) => {
        if (!item || typeof item !== "object")
          throw new StoreError("Invalid cart item.");
        const productId = positiveId(item.product_id);
        const quantity = positiveId(item.quantity);
        if (quantity > 10)
          throw new StoreError("Maximum 10 units per product.");
        return { productId, quantity };
      });
      if (
        new Set(lines.map((l) => l.productId)).size !== lines.length ||
        lines.reduce((s, l) => s + l.quantity, 0) > 50
      )
        throw new StoreError(
          "Cart must contain unique products and at most 50 units.",
        );
      return db.transaction(() => {
        let total = 0;
        const orderIds: number[] = [];
        const insert = db.prepare(
          "INSERT INTO orders (customer_id, product_id, quantity, payment_status, fulfillment_status, reroute_consent) VALUES (?, ?, 1, 'paid', 'unfulfilled', ?)",
        );
        for (const line of lines) {
          const product = db
            .prepare("SELECT * FROM products WHERE id = ?")
            .get(line.productId) as Product | undefined;
          if (!product)
            throw new StoreError(
              "A product is no longer available. Refresh your cart.",
              409,
            );
          total += product.price * line.quantity;
          for (let i = 0; i < line.quantity; i++)
            orderIds.push(
              Number(
                insert.run(customerId, product.id, Number(consent))
                  .lastInsertRowid,
              ),
            );
        }
        return { order_ids: orderIds, total };
      })();
    },
    submitReturn(
      customerId: number,
      orderId: number,
      reason: string,
      condition: string,
      photo: string,
    ) {
      if (
        reason.trim().length < 5 ||
        reason.length > 1000 ||
        !conditions.includes(condition as ReturnCondition)
      )
        throw new StoreError(
          "Provide a reason (5–1000 characters) and a valid condition.",
        );
      return db.transaction(() => {
        eligible(customerId, orderId);
        const result = db
          .prepare(
            "INSERT INTO returns (order_id,reason,condition,image_url,verification_status,return_status,refund_status) VALUES (?,?,?,?,'pending','requested','pending')",
          )
          .run(orderId, reason.trim(), condition, photo);
        return {
          id: Number(result.lastInsertRowid),
          verification_status: "pending",
          return_status: "requested",
        };
      })();
    },
    orders(customerId: number) {
      customer(customerId);
      return db
        .prepare(
          `SELECT o.*, p.name, p.sku, p.price, p.image_url, r.id AS return_id, r.return_status, d.delivery_status, d.tracking_code FROM orders o JOIN products p ON p.id=o.product_id LEFT JOIN returns r ON r.order_id=o.id LEFT JOIN matches m ON m.buyer_order_id=o.id AND m.match_status IN ('accepted','in_transit','completed') LEFT JOIN deliveries d ON d.match_id=m.id WHERE o.customer_id=? ORDER BY o.id DESC`,
        )
        .all(customerId);
    },
    returns(customerId: number) {
      customer(customerId);
      return db
        .prepare(
          "SELECT r.*, p.name, p.sku FROM returns r JOIN orders o ON o.id=r.order_id JOIN products p ON p.id=o.product_id WHERE o.customer_id=? ORDER BY r.id DESC",
        )
        .all(customerId);
    },
  };
}
