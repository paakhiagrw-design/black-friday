import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

test("fresh startup and repeated migrations preserve historical data and seed the demo only once", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "rip-storage-"));
  const file = path.join(root, "volume", "reroute.db");
  const run = (script) =>
    execFileSync(process.execPath, ["database/" + script], {
      env: { ...process.env, DATABASE_PATH: file },
    });
  const counts = (db) =>
    ["customers", "products", "orders", "returns", "matches", "deliveries"].map(
      (name) => db.prepare("SELECT COUNT(*) AS n FROM " + name).get().n,
    );
  try {
    run("startup.mjs");
    let db = new Database(file);
    const fresh = counts(db);
    assert.equal(fresh[0], 20);
    assert.equal(
      db
        .prepare("SELECT count(*) AS n FROM products WHERE image_url LIKE '/%'")
        .get().n,
      11,
    );
    db.close();
    run("seed.mjs");
    run("startup.mjs");
    db = new Database(file);
    assert.deepEqual(counts(db), fresh);
    assert.deepEqual(db.pragma("foreign_key_check"), []);
    db.close();

    const legacyFile = path.join(root, "legacy.db");
    // A SQLite online backup captures a consistent snapshot without touching the source.
    const original = new Database("database/reroute.db", { readonly: true });
    try {
      await original.backup(legacyFile);
    } finally {
      original.close();
    }
    const old = new Database(legacyFile);
    old
      .prepare("UPDATE orders SET created_at=? WHERE id=1")
      .run("2020-01-01 00:00:00");
    const oldOrders = old.prepare("SELECT * FROM orders ORDER BY id").all();
    const oldReturns = old.prepare("SELECT * FROM returns ORDER BY id").all();
    old.close();
    for (let i = 0; i < 2; i++)
      execFileSync(process.execPath, ["database/init.mjs"], {
        env: { ...process.env, DATABASE_PATH: legacyFile },
      });
    const upgraded = new Database(legacyFile);
    assert.deepEqual(
      upgraded.prepare("SELECT * FROM orders ORDER BY id").all(),
      oldOrders,
    );
    assert.deepEqual(
      upgraded.prepare("SELECT * FROM returns ORDER BY id").all(),
      oldReturns,
    );
    assert(
      upgraded
        .prepare("SELECT 1 FROM sqlite_master WHERE name='checkout_receipts'")
        .get(),
    );
    assert(
      upgraded
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE name='operation_refund_receipts'",
        )
        .get(),
    );
    assert.deepEqual(upgraded.pragma("foreign_key_check"), []);
    upgraded.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
