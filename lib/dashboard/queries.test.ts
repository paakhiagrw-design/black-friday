import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_COST_CONFIG } from '@/lib/logistics/config';
import { computeCosts, legDistances, routeEstimate } from '@/lib/logistics/costs';
import { round } from '@/lib/logistics/geo';
import { simulateSavings } from '@/lib/logistics/simulator';
import type { MatchStatus, ReturnStatus, VerificationStatus } from '@/lib/types';
import { getAnalytics, getDashboardStats } from './queries';

const schema = readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8');
const today = new Date('2026-11-27T15:00:00Z');
const returner = { lat: 53.35, lng: -6.26 };
const buyer = { lat: 53.36, lng: -6.25 };
const otherBuyer = { lat: 53.42, lng: -6.2 };

describe('seller reporting', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(schema);
  });

  afterEach(() => db.close());

  function addCatalogue() {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, name, email, latitude, longitude, address)
      VALUES (?, ?, ?, ?, ?, 'Dublin')
    `);
    [returner, buyer, otherBuyer].forEach(({ lat, lng }, index) => {
      const id = index + 1;
      insertCustomer.run(id, `Customer ${id}`, `customer${id}@example.test`, lat, lng);
    });
    db.exec(`
      INSERT INTO products (id, sku, name, description, price)
      VALUES (1, 'HEADSET', 'Headset', 'Audio', 10000),
             (2, 'LAMP', 'Lamp', 'Lighting', 3400);
    `);
  }

  function addReturn(id: number, verification: VerificationStatus, status: ReturnStatus, productId = 1) {
    db.prepare('INSERT INTO orders (id, customer_id, product_id) VALUES (?, 1, ?)').run(id, productId);
    db.prepare(`
      INSERT INTO returns (id, order_id, reason, condition, verification_status, return_status, created_at)
      VALUES (?, ?, 'Wrong colour', 'like_new', ?, ?, '2026-11-21 08:00:00')
    `).run(id, id, verification, status);
  }

  function addMatch({
    id,
    returnId,
    status,
    savings,
    customerId = 2,
    productId = 1,
    createdAt = '2026-11-24 08:00:00',
    deliveredAt,
  }: {
    id: number;
    returnId: number;
    status: MatchStatus;
    savings: number;
    customerId?: number;
    productId?: number;
    createdAt?: string;
    deliveredAt?: string;
  }) {
    const buyerOrderId = 100 + id;
    db.prepare('INSERT INTO orders (id, customer_id, product_id) VALUES (?, ?, ?)')
      .run(buyerOrderId, customerId, productId);
    db.prepare(`
      INSERT INTO matches (
        id, return_id, buyer_order_id, distance_km, traditional_cost, reroute_cost,
        savings, match_status, created_at
      ) VALUES (?, ?, ?, 999, ?, 1000, ?, ?, ?)
    `).run(id, returnId, buyerOrderId, 1000 + savings, savings, status, createdAt);
    if (deliveredAt) {
      db.prepare(`
        INSERT INTO deliveries (match_id, tracking_code, delivery_status, delivered_at)
        VALUES (?, ?, 'delivered', ?)
      `).run(id, `TRACK-${id}`, deliveredAt);
    }
  }

  it('returns zeros and no activity for an empty database', () => {
    const stats = {
      totalReturns: 0,
      pendingVerification: 0,
      awaitingMatch: 0,
      activeReroutes: 0,
      completedReroutes: 0,
      savedCents: 0,
      committedSavingsCents: 0,
      distanceSavedKm: 0,
      co2SavedKg: 0,
      rerouteRate: 0,
      recent: [],
    };
    expect(getDashboardStats(db)).toEqual(stats);
    expect(getAnalytics(db, 1, today)).toEqual({
      daily: [{ day: '2026-11-27', savedCents: 0, completedReroutes: 0, co2SavedKg: 0 }],
      byProduct: [],
      funnel: {
        totalReturns: 0, pendingVerification: 0, awaitingMatch: 0, activeReroutes: 0, completedReroutes: 0,
      },
    });
  });

  it('counts active and completed matches separately and sums estimated completed routes', () => {
    addCatalogue();
    addReturn(1, 'pending', 'requested');
    addReturn(2, 'verified', 'requested');
    addReturn(3, 'verified', 'approved');
    addReturn(4, 'verified', 'approved');
    addReturn(5, 'verified', 'matched');
    addReturn(6, 'verified', 'in_transit');
    addReturn(7, 'verified', 'completed');
    addReturn(8, 'failed', 'rejected');
    addReturn(9, 'verified', 'matched');
    addMatch({ id: 1, returnId: 3, status: 'proposed', savings: 1000 });
    addMatch({ id: 2, returnId: 4, status: 'cancelled', savings: 700 });
    addMatch({ id: 3, returnId: 5, status: 'accepted', savings: 600 });
    addMatch({ id: 4, returnId: 6, status: 'in_transit', savings: 850 });
    addMatch({ id: 5, returnId: 7, status: 'completed', savings: 1110, deliveredAt: '2026-11-27 11:00:00' });
    addMatch({ id: 6, returnId: 7, status: 'completed', savings: 420, customerId: 3 });
    addMatch({ id: 7, returnId: 9, status: 'proposed', savings: 1000 });

    const firstRoute = routeEstimate(legDistances(returner, buyer, DEFAULT_COST_CONFIG));
    const secondRoute = routeEstimate(legDistances(returner, otherBuyer, DEFAULT_COST_CONFIG));
    const stats = getDashboardStats(db);
    expect(stats).toMatchObject({
      totalReturns: 9,
      pendingVerification: 1,
      awaitingMatch: 2,
      activeReroutes: 2,
      completedReroutes: 2,
      savedCents: 1530,
      committedSavingsCents: 1450,
      distanceSavedKm: round(firstRoute.distanceSavedKm + secondRoute.distanceSavedKm),
      co2SavedKg: round(firstRoute.co2SavedKg + secondRoute.co2SavedKg),
      rerouteRate: 3 / 7,
    });
    expect(stats.recent[0]).toEqual({
      at: '2026-11-27 11:00:00', kind: 'completed', text: 'Reroute completed · Headset',
    });
    expect(stats.recent).toHaveLength(6);
  });

  it('reports proposed routes without counting them as realised savings', () => {
    addCatalogue();
    addReturn(1, 'verified', 'matched');
    addMatch({ id: 1, returnId: 1, status: 'proposed', savings: 750 });

    expect(getDashboardStats(db)).toMatchObject({
      activeReroutes: 0,
      completedReroutes: 0,
      savedCents: 0,
      committedSavingsCents: 0,
      distanceSavedKm: 0,
      co2SavedKg: 0,
      rerouteRate: 0,
      recent: [
        { at: '2026-11-24 08:00:00', kind: 'proposed', text: 'Match suggested · Headset' },
        { at: '2026-11-21 08:00:00', kind: 'return_requested', text: 'Return requested · Headset' },
      ],
    });
    expect(getAnalytics(db, 30, today).byProduct).toEqual([]);
  });

  it('groups realised savings by UTC completion date and product, including days with no activity', () => {
    addCatalogue();
    addReturn(1, 'verified', 'completed');
    addReturn(2, 'verified', 'completed', 2);
    addReturn(3, 'verified', 'matched');
    addMatch({
      id: 1, returnId: 1, status: 'completed', savings: 350, deliveredAt: '2026-11-26T00:30:00+01:00',
    });
    addMatch({
      id: 2, returnId: 2, status: 'completed', savings: -100, productId: 2, createdAt: '2026-11-27 10:00:00',
    });
    addMatch({ id: 3, returnId: 3, status: 'accepted', savings: 300, createdAt: '2026-11-27 10:00:00' });
    addMatch({ id: 4, returnId: 1, status: 'completed', savings: 999 });

    const { co2SavedKg } = routeEstimate(legDistances(returner, buyer, DEFAULT_COST_CONFIG));
    expect(getAnalytics(db, 3, today)).toEqual({
      daily: [
        { day: '2026-11-25', savedCents: 350, completedReroutes: 1, co2SavedKg },
        { day: '2026-11-26', savedCents: 0, completedReroutes: 0, co2SavedKg: 0 },
        { day: '2026-11-27', savedCents: -100, completedReroutes: 1, co2SavedKg },
      ],
      byProduct: [
        { productId: 1, sku: 'HEADSET', name: 'Headset', savedCents: 350, completedReroutes: 1 },
        { productId: 2, sku: 'LAMP', name: 'Lamp', savedCents: -100, completedReroutes: 1 },
      ],
      funnel: {
        totalReturns: 3, pendingVerification: 0, awaitingMatch: 0, activeReroutes: 1, completedReroutes: 3,
      },
    });
  });
});

describe('savings simulator', () => {
  const inputs = {
    returnsPerMonth: 40,
    localMatchRate: 0.25,
    avgMatchDistanceKm: 3,
    warehouseDistanceKm: 50,
    config: { rewardCents: 500, courierPerKmCents: 80 },
  };

  it('projects the same per-route costs and environmental estimates as the shared model', () => {
    const legs = { directKm: 3, returnLegKm: 50, outboundLegKm: 50 };
    const costs = computeCosts(legs, inputs.config);
    const route = routeEstimate(legs, inputs.config);

    expect(simulateSavings(inputs)).toEqual({
      reroutesPerMonth: 10,
      savingsPerRerouteCents: costs.savingsCents,
      monthlySavingsCents: costs.savingsCents * 10,
      annualSavingsCents: costs.savingsCents * 120,
      annualDistanceSavedKm: round(route.distanceSavedKm * 120),
      annualCo2SavedKg: round(route.co2SavedKg * 120),
    });
  });

  it.each([
    { avgMatchDistanceKm: DEFAULT_COST_CONFIG.maxRadiusKm + 1, config: { courierPerKmCents: 0 } },
    { config: { courierPerKmCents: 80, rewardCents: 1309 } },
    { localMatchRate: 0 },
  ])('does not project reroutes for %j', (overrides) => {
    expect(simulateSavings({ ...inputs, ...overrides })).toMatchObject({
      reroutesPerMonth: 0,
      monthlySavingsCents: 0,
      annualSavingsCents: 0,
      annualDistanceSavedKm: 0,
      annualCo2SavedKg: 0,
    });
  });
});
