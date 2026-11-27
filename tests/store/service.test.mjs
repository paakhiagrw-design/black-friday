import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { storeService } from "../../lib/store/service.ts";
// Copy the actual shared seeded database into memory; never change teammates' data.
function fixture() {
  const source = new Database("database/reroute.db", { readonly: true });
  const db = new Database(":memory:");
  db.exec(readFileSync("database/schema.sql", "utf8"));
  for (const table of [
    "customers",
    "products",
    "orders",
    "returns",
    "matches",
    "deliveries",
  ]) {
    for (const row of source.prepare("SELECT * FROM " + table).all()) {
      const keys = Object.keys(row);
      db.prepare(
        "INSERT INTO " +
          table +
          " (" +
          keys.map((k) => '"' + k + '"').join(",") +
          ") VALUES (" +
          keys.map(() => "?").join(",") +
          ")",
      ).run(...Object.values(row));
    }
  }
  source.close();
  return { db, store: storeService(db) };
}
test("seeded customer A returns a delivered item; B buys identical SKU with consent", () => {
  const { db, store } = fixture();
  try {
    const candidate = db
      .prepare(
        `SELECT o.* FROM orders o LEFT JOIN returns r ON r.order_id=o.id WHERE o.fulfillment_status='delivered' AND o.payment_status='paid' AND r.id IS NULL LIMIT 1`,
      )
      .get();
    assert.ok(candidate);
    const result = store.submitReturn(
      candidate.customer_id,
      candidate.id,
      "Changed my mind about this item",
      "like_new",
      "/api/returns/photos/test.webp",
    );
    const saved = db.prepare("SELECT * FROM returns WHERE id=?").get(result.id);
    assert.equal(saved.verification_status, "pending");
    assert.ok(saved.image_url.endsWith("test.webp"));
    assert.throws(
      () =>
        store.submitReturn(
          candidate.customer_id,
          candidate.id,
          "Duplicate attempt",
          "good",
          "photo",
        ),
      /already exists/,
    );
    const b = candidate.customer_id === 2 ? 1 : 2;
    const checkout = store.checkout(b, {
      items: [{ product_id: candidate.product_id, quantity: 2 }],
      consent: true,
    });
    assert.equal(checkout.order_ids.length, 2);
    for (const id of checkout.order_ids) {
      const row = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
      assert.equal(row.quantity, 1);
      assert.equal(row.reroute_consent, 1);
      assert.equal(row.fulfillment_status, "unfulfilled");
      assert.equal(row.payment_status, "paid");
      assert.equal(row.product_id, candidate.product_id);
    }
  } finally {
    db.close();
  }
});
test("ownership, eligibility and validation are enforced", () => {
  const { db, store } = fixture();
  try {
    assert.throws(() => store.eligible(2, 1), /not found/);
    assert.throws(() => store.eligible(2, 2), /delivered/);
    assert.throws(
      () => store.checkout(99999, { items: [], consent: false }),
      /customer/,
    );
    for (const quantity of [0, -1, 1.5, 11])
      assert.throws(() =>
        store.checkout(2, {
          items: [{ product_id: 1, quantity }],
          consent: false,
        }),
      );
    assert.throws(() =>
      store.checkout(2, {
        items: [{ product_id: 1, quantity: 1 }],
        consent: "yes",
      }),
    );
    assert.throws(() => store.checkout(2, { items: [], consent: false }));
  } finally {
    db.close();
  }
});
test("checkout rolls back invalid products, ignores client price and persists no consent", () => {
  const { db, store } = fixture();
  try {
    const before = db.prepare("SELECT COUNT(*) n FROM orders").get();
    assert.throws(() =>
      store.checkout(2, {
        items: [
          { product_id: 1, quantity: 1 },
          { product_id: 99999, quantity: 1 },
        ],
        consent: false,
      }),
    );
    assert.deepEqual(db.prepare("SELECT COUNT(*) n FROM orders").get(), before);
    const result = store.checkout(2, {
      items: [{ product_id: 1, quantity: 1, price: 1 }],
      consent: false,
    });
    const product = db.prepare("SELECT price FROM products WHERE id=1").get();
    assert.equal(result.total, product.price);
    assert.deepEqual(
      db
        .prepare("SELECT reroute_consent FROM orders WHERE id=?")
        .get(result.order_ids[0]),
      { reroute_consent: 0 },
    );
  } finally {
    db.close();
  }
});
