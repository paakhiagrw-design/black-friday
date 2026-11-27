import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { operations, WorkflowError, positiveId } from "./core.ts";

function fixture(filename = ":memory:") {
  const db = new Database(filename);
  db.pragma("foreign_keys=ON");
  db.exec(
    readFileSync(new URL("../../database/schema.sql", import.meta.url), "utf8"),
  );
  db.exec(
    readFileSync(
      new URL(
        "../../database/migrations/001_verification_delivery.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  db.exec(`INSERT INTO customers VALUES(1,'Returner','returner@example.test',53.35,-6.26,'Dublin'),(2,'Buyer','buyer@example.test',53.34,-6.25,'Dublin');
    INSERT INTO products VALUES(1,'TEST-001','Test product','Test description',12999,'');
    INSERT INTO orders(id,customer_id,product_id,payment_status,fulfillment_status,reroute_consent) VALUES(1,1,1,'paid','delivered',0),(2,2,1,'paid','unfulfilled',1);
    INSERT INTO returns(id,order_id,reason,condition,reward_amount) VALUES(1,1,'Wrong colour','like_new',500);`);
  return { db, ops: operations(db) };
}
function matched(db, ops) {
  ops.decide(1, "approve", "Manually reviewed evidence");
  db.prepare(
    `INSERT INTO matches(id,return_id,buyer_order_id,distance_km,traditional_cost,reroute_cost,savings,match_status) VALUES(1,1,2,.7,1200,450,750,'accepted')`,
  ).run();
  return ops.arrange(1, "courier").delivery_id;
}
const checks = {
  identity: true,
  sku: true,
  condition: true,
  packaging: true,
  accessories: true,
};
const pass = {
  outcome: "passed",
  sku: "TEST-001",
  notes: "Physical item and function checked",
  checks,
};
const conflict = (fn) =>
  assert.throws(
    fn,
    (error) => error instanceof WorkflowError && error.status === 409,
  );

test("complete journey persists, refund is atomic and idempotent, events cannot repeat", () => {
  const file = path.join(
    mkdtempSync(path.join(tmpdir(), "rip-workflow-")),
    "test.db",
  );
  const { db, ops } = fixture(file);
  const id = matched(db, ops);
  conflict(() => ops.arrange(1, "locker"));
  conflict(() => ops.advance(id, "delivered"));
  conflict(() => ops.refund(id));
  ops.advance(id, "collected");
  conflict(() => ops.advance(id, "collected"));
  conflict(() => ops.advance(id, "in_transit"));
  assert.throws(
    () =>
      ops.inspect(id, { ...pass, checks: { ...checks, accessories: false } }),
    /every mandatory/,
  );
  assert.throws(() => ops.inspect(id, { ...pass, sku: "WRONG" }), /exact SKU/);
  ops.inspect(id, pass);
  conflict(() => ops.inspect(id, pass));
  const first = ops.refund(id).receipt;
  const retry = ops.refund(id).receipt;
  assert.deepEqual(retry, first);
  assert.equal(first.refund_amount, 12999);
  assert.equal(first.reward_amount, 500);
  assert.equal(
    db.prepare("SELECT payment_status FROM orders WHERE id=1").get()
      .payment_status,
    "refunded",
  );
  ops.advance(id, "in_transit");
  ops.advance(id, "delivered");
  conflict(() => ops.advance(id, "delivered"));
  assert.equal(
    db.prepare("SELECT fulfillment_status FROM orders WHERE id=2").get()
      .fulfillment_status,
    "delivered",
  );
  assert.equal(ops.returnById(1).return_status, "completed");
  assert.equal(ops.delivery(id).events.length, 5);
  db.close();
  const reopened = new Database(file);
  const persisted = operations(reopened).delivery(id);
  assert.equal(persisted.delivery_status, "delivered");
  assert.deepEqual(persisted.receipt, first);
  reopened.close();
});
test("failed inspection blocks dispatch and refund without denying refund rights", () => {
  const { db, ops } = fixture();
  const id = matched(db, ops);
  ops.advance(id, "collected");
  ops.inspect(id, {
    ...pass,
    outcome: "failed",
    checks: { ...checks, condition: false },
    notes: "Functional check failed; warehouse review required",
  });
  conflict(() => ops.advance(id, "in_transit"));
  conflict(() => ops.refund(id));
  assert.equal(ops.returnById(1).refund_status, "pending");
  assert.equal(ops.delivery(id).match_status, "failed");
  assert.equal(ops.delivery(id).delivery_status, "failed");
  db.close();
});
test("proposed seeded deliveries require acceptance and are reused, never duplicated", () => {
  const { db, ops } = fixture();
  ops.decide(1, "approve", "Manual review complete");
  db.exec(
    `INSERT INTO matches VALUES(1,1,2,.7,1200,450,750,'proposed',datetime('now')); INSERT INTO deliveries(id,match_id,tracking_code) VALUES(1,1,'RR-DEMO-0001');`,
  );
  conflict(() => ops.arrange(1, "courier"));
  conflict(() => ops.advance(1, "collected"));
  db.exec(`UPDATE matches SET match_status='accepted' WHERE id=1`);
  ops.arrange(1, "locker");
  assert.equal(db.prepare("SELECT count(*) n FROM deliveries").get().n, 1);
  assert.equal(ops.delivery(1).tracking_code, "RR-DEMO-0001");
  db.close();
});
test("verification review/exclusion preserve unrelated fields and protect active matches", () => {
  const { db, ops } = fixture();
  ops.decide(1, "review", "Need more evidence");
  assert.equal(ops.returnById(1).verification_status, "pending");
  ops.decide(1, "reject", "Needs warehouse inspection");
  const r = ops.returnById(1);
  assert.equal(r.refund_status, "pending");
  assert.equal(r.reward_amount, 500);
  conflict(() => ops.decide(1, "approve", "Reopen silently"));
  db.close();
  const f = fixture();
  matched(f.db, f.ops);
  conflict(() => f.ops.decide(1, "review", "Cannot change active match"));
  f.db.close();
});
test("eligibility is rechecked against buyer consent, SKU, payment, and reported damage", () => {
  for (const change of [
    "UPDATE orders SET reroute_consent=0 WHERE id=2",
    "UPDATE orders SET payment_status='refunded' WHERE id=2",
    "UPDATE orders SET fulfillment_status='delivered' WHERE id=2",
  ]) {
    const { db, ops } = fixture();
    const id = matched(db, ops);
    db.exec(change);
    conflict(() => ops.advance(id, "collected"));
    assert.equal(ops.delivery(id).events.length, 1);
    db.close();
  }
  const { db, ops } = fixture();
  db.exec("UPDATE returns SET condition='damaged' WHERE id=1");
  conflict(() => ops.decide(1, "approve", "Damaged evidence"));
  db.close();
});
test("invalid IDs and malformed checks fail with clear errors; scan makes no unsupported findings", () => {
  for (const id of [0, -1, 1.2, "1", null, Infinity])
    assert.throws(() => positiveId(id), /positive integer/);
  const { db, ops } = fixture();
  assert.throws(
    () => ops.returnById(999),
    (error) => error.status === 404,
  );
  const scan = ops.assess(1);
  assert.equal(scan.mode, "demo");
  assert.match(scan.findings[2].detail, /No return photograph/);
  assert.equal("confidence" in scan, false);
  const id = matched(db, ops);
  ops.advance(id, "collected");
  assert.throws(
    () => ops.inspect(id, { ...pass, checks: { identity: "true" } }),
    /boolean/,
  );
  assert.equal(ops.delivery(id).inspection, null);
  db.close();
});
test("a failed receipt write rolls back every related financial update", () => {
  const { db, ops } = fixture();
  const id = matched(db, ops);
  ops.advance(id, "collected");
  ops.inspect(id, pass);
  db.exec(
    "CREATE TRIGGER block_order_refund BEFORE UPDATE OF payment_status ON orders BEGIN SELECT RAISE(ABORT,'test failure'); END;",
  );
  assert.throws(() => ops.refund(id), /test failure/);
  assert.equal(ops.delivery(id).receipt, null);
  assert.equal(ops.returnById(1).refund_status, "pending");
  assert.equal(ops.returnById(1).payment_status, "paid");
  db.close();
});
