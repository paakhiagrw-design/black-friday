import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { approveReroute, cancelReroute, getMatchResults } from './repository';

const schema = readFileSync(path.join(process.cwd(), 'database', 'schema.sql'), 'utf8');

let db: Database.Database;

const DUBLIN = [53.3498, -6.2603] as const;
const NEAR = [53.3438, -6.2546] as const; // ~0.8 km
const NEAR2 = [53.3561, -6.2644] as const; // ~0.75 km
const FAR = [53.5748, -6.2603] as const; // ~25 km
const EDGE = [53.3498, -6.042] as const; // ~14.5 km, unprofitable

function customer(id: number, [lat, lng]: readonly [number, number]) {
  db.prepare('INSERT INTO customers (id, name, email, latitude, longitude, address) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, `Customer ${id}`, `c${id}@example.test`, lat, lng, `${id} Test St`,
  );
}

function order(id: number, customerId: number, productId = 1, o: { pay?: string; ful?: string; consent?: number } = {}) {
  db.prepare(
    `INSERT INTO orders (id, customer_id, product_id, payment_status, fulfillment_status, reroute_consent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, customerId, productId, o.pay ?? 'paid', o.ful ?? 'unfulfilled', o.consent ?? 1, `2026-11-01 10:${String(id).padStart(2, '0')}:00`);
}

function ret(id: number, orderId: number, o: { ver?: string; status?: string; cond?: string } = {}) {
  db.prepare(
    `INSERT INTO returns (id, order_id, reason, condition, verification_status, return_status) VALUES (?, ?, 'x', ?, ?, ?)`,
  ).run(id, orderId, o.cond ?? 'like_new', o.ver ?? 'verified', o.status ?? 'approved');
}

const result = (returnId: number) => getMatchResults(db, returnId)[0];
const activeMatches = () =>
  db.prepare(`SELECT * FROM matches WHERE match_status IN ('proposed','accepted','in_transit')`).all() as Array<{
    return_id: number; buyer_order_id: number; match_status: string;
  }>;

beforeEach(() => {
  db = new Database(':memory:');
  db.exec(schema);
  db.prepare(`INSERT INTO products (id, sku, name, description, price) VALUES (1, 'SKU-1', 'Headphones', '', 9999), (2, 'SKU-2', 'Lamp', '', 4999)`).run();
  customer(1, DUBLIN); // returner
  order(1, 1, 1, { ful: 'delivered', consent: 0 });
});

describe('repository: matching', () => {
  it('successful match: nearby paid, consented buyer is rank 1', () => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1);
    const r = result(1);
    expect(r.state).toBe('matchable');
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0]).toMatchObject({ buyerOrderId: 2, eligible: true, rank: 1 });
    expect(r.candidates[0].costs.savingsCents).toBeGreaterThan(0);
  });

  it('incorrect SKU: an order for a different product is never a candidate', () => {
    customer(2, NEAR);
    order(2, 2, 2);
    ret(1, 1);
    const r = result(1);
    expect(r.candidates).toHaveLength(0);
    expect(r.state).toBe('no_match');
  });

  it('distant buyer (~25 km) is rejected as too_far', () => {
    customer(2, FAR);
    order(2, 2);
    ret(1, 1);
    expect(result(1).candidates[0].rejections).toContain('too_far');
    expect(result(1).recommendation).toBe('warehouse');
  });

  it.each(['pending', 'failed'])('unverified return (%s) is ineligible', (ver) => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1, { ver });
    expect(result(1)).toMatchObject({ state: 'ineligible', recommendation: 'none', candidates: [] });
    expect(approveReroute(db, 1, 2)).toMatchObject({ ok: false, code: 'return_ineligible' });
  });

  it('damaged return is ineligible', () => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1, { cond: 'damaged' });
    expect(result(1).state).toBe('ineligible');
  });

  it('missing consent is rejected as no_consent', () => {
    customer(2, NEAR);
    order(2, 2, 1, { consent: 0 });
    ret(1, 1);
    expect(result(1).candidates[0].rejections).toEqual(['no_consent']);
    expect(approveReroute(db, 1, 2)).toMatchObject({ ok: false, code: 'candidate_ineligible', rejections: ['no_consent'] });
  });

  it('unprofitable buyer within radius → warehouse recommendation', () => {
    customer(2, EDGE);
    order(2, 2);
    ret(1, 1);
    const r = result(1);
    expect(r.candidates[0].distanceKm).toBeLessThan(16.0934);
    expect(r.candidates[0].rejections).toEqual(['unprofitable']);
    expect(r).toMatchObject({ state: 'no_match', recommendation: 'warehouse' });
  });

  it('same customer and unpaid orders are rejected', () => {
    order(3, 1); // returner's own second order
    customer(4, NEAR);
    order(4, 4, 1, { pay: 'pending' });
    ret(1, 1);
    const by = Object.fromEntries(result(1).candidates.map((c) => [c.buyerOrderId, c.rejections]));
    expect(by[3]).toContain('same_customer');
    expect(by[4]).toEqual(['not_paid']);
  });

  it('ranks closer, cheaper buyer first', () => {
    customer(2, [53.3700, -6.2603]); // ~2.2 km
    customer(3, NEAR);
    order(2, 2);
    order(3, 3);
    ret(1, 1);
    expect(result(1).candidates.map((c) => [c.buyerOrderId, c.rank])).toEqual([[3, 1], [2, 2]]);
  });
});

describe('repository: approve / cancel', () => {
  it('approves, reserves the buyer and updates statuses', () => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1);
    const res = approveReroute(db, 1, 2);
    expect(res).toMatchObject({ ok: true, match: { returnId: 1, buyerOrderId: 2, status: 'accepted' } });
    expect(db.prepare('SELECT return_status FROM returns WHERE id = 1').get()).toEqual({ return_status: 'matched' });
    expect(db.prepare('SELECT fulfillment_status FROM orders WHERE id = 2').get()).toEqual({ fulfillment_status: 'processing' });
    expect(result(1).state).toBe('reserved');
  });

  it('duplicate reservation: approving the same buyer twice fails with already_reserved', () => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1);
    expect(approveReroute(db, 1, 2).ok).toBe(true);
    expect(approveReroute(db, 1, 2)).toMatchObject({ ok: false, code: 'already_reserved' });
    expect(activeMatches()).toHaveLength(1);
  });

  it('duplicate reservation: two returns of the same SKU compete for one buyer', () => {
    customer(2, NEAR);
    order(2, 2);
    customer(3, NEAR2);
    order(3, 3, 1, { ful: 'delivered' });
    ret(1, 1);
    ret(2, 3);
    expect(approveReroute(db, 1, 2).ok).toBe(true);
    expect(result(2).candidates.find((c) => c.buyerOrderId === 2)?.rejections).toEqual(['reserved']);
    expect(approveReroute(db, 2, 2)).toMatchObject({ ok: false, code: 'already_reserved' });
    expect(activeMatches()).toEqual([expect.objectContaining({ return_id: 1, buyer_order_id: 2, match_status: 'accepted' })]);
  });

  it('upgrades an existing proposed row and cancels competing proposals', () => {
    customer(2, NEAR);
    customer(3, NEAR2);
    order(2, 2);
    order(3, 3);
    ret(1, 1, { status: 'matched' });
    db.prepare(`INSERT INTO matches (id, return_id, buyer_order_id, distance_km, traditional_cost, reroute_cost, savings) VALUES (1, 1, 3, 1, 2000, 900, 1100)`).run();
    // Proposed for the wrong buyer: approving order 2 cancels it.
    const res = approveReroute(db, 1, 2);
    expect(res.ok).toBe(true);
    expect(db.prepare('SELECT match_status FROM matches WHERE id = 1').get()).toEqual({ match_status: 'cancelled' });

    // Fresh scenario: proposed row for the same pair is upgraded in place.
    cancelReroute(db, res.ok ? res.match.id : 0);
    db.prepare(`INSERT INTO matches (id, return_id, buyer_order_id, distance_km, traditional_cost, reroute_cost, savings) VALUES (10, 1, 3, 1, 2000, 900, 1100)`).run();
    const upgraded = approveReroute(db, 1, 3);
    expect(upgraded).toMatchObject({ ok: true, match: { id: 10, status: 'accepted' } });
    const row = db.prepare('SELECT * FROM matches WHERE id = 10').get() as { savings: number; traditional_cost: number; reroute_cost: number };
    expect(row.savings).toBe(row.traditional_cost - row.reroute_cost);
    expect(row.savings).not.toBe(1100);
  });

  it('cancel releases the reservation; cannot cancel twice', () => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1);
    const res = approveReroute(db, 1, 2);
    if (!res.ok) throw new Error('expected ok');
    expect(cancelReroute(db, res.match.id)).toMatchObject({ ok: true, match: { status: 'cancelled' } });
    expect(db.prepare('SELECT return_status FROM returns WHERE id = 1').get()).toEqual({ return_status: 'approved' });
    expect(db.prepare('SELECT fulfillment_status FROM orders WHERE id = 2').get()).toEqual({ fulfillment_status: 'unfulfilled' });
    expect(cancelReroute(db, res.match.id)).toMatchObject({ ok: false, code: 'already_dispatched' });
    expect(result(1).state).toBe('matchable');
  });

  it.each([
    { status: 'pending', collectionTable: false, scheduled: false, cancellable: true },
    { status: 'pending', collectionTable: true, scheduled: false, cancellable: true },
    { status: 'pending', collectionTable: true, scheduled: true, cancellable: false },
    { status: 'collected', collectionTable: false, scheduled: false, cancellable: false },
  ])('cancel with a $status delivery (collection table: $collectionTable, scheduled: $scheduled)', ({ status, collectionTable, scheduled, cancellable }) => {
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1);
    const res = approveReroute(db, 1, 2);
    if (!res.ok) throw new Error('expected ok');
    const delivery = db.prepare(`
      INSERT INTO deliveries (match_id, tracking_code, delivery_status)
      VALUES (?, 'RR-DEMO-0001', ?) RETURNING id
    `).get(res.match.id, status) as { id: number };
    if (collectionTable) {
      db.exec(`
        CREATE TABLE operation_collections (
          delivery_id INTEGER PRIMARY KEY REFERENCES deliveries(id),
          method TEXT NOT NULL
        );
      `);
    }
    if (scheduled) {
      db.prepare(`INSERT INTO operation_collections (delivery_id, method) VALUES (?, 'courier')`)
        .run(delivery.id);
    }

    const cancellation = cancelReroute(db, res.match.id);
    expect(cancellation).toMatchObject(cancellable
      ? { ok: true, match: { status: 'cancelled' } }
      : { ok: false, code: 'already_dispatched' });
    expect(db.prepare('SELECT match_status FROM matches WHERE id = ?').get(res.match.id))
      .toEqual({ match_status: cancellable ? 'cancelled' : 'accepted' });
    expect(db.prepare('SELECT return_status FROM returns WHERE id = 1').get())
      .toEqual({ return_status: cancellable ? 'approved' : 'matched' });
    expect(db.prepare('SELECT fulfillment_status FROM orders WHERE id = 2').get())
      .toEqual({ fulfillment_status: cancellable ? 'unfulfilled' : 'processing' });
    expect(db.prepare('SELECT delivery_status FROM deliveries WHERE id = ?').get(delivery.id))
      .toEqual({ delivery_status: status });
  });

  it('returns not_found for missing return or order', () => {
    expect(approveReroute(db, 99, 1)).toMatchObject({ ok: false, code: 'not_found' });
    customer(2, NEAR);
    order(2, 2);
    ret(1, 1);
    expect(approveReroute(db, 1, 999)).toMatchObject({ ok: false, code: 'not_found' });
  });
});
