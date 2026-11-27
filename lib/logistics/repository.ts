import type Database from 'better-sqlite3';
import { evaluateReturn, type EngineCandidateInput, type EngineInput } from './engine';
import type {
  ActiveMatchSummary,
  CandidateRejection,
  CostConfig,
  RerouteErrorCode,
  RerouteSuccessResponse,
  ReturnMatchResult,
} from './types';

/** Server-only SQL for Track A. Takes a Database so tests can pass an in-memory one. */

type DB = Database.Database;

interface ReturnRow {
  return_id: number;
  order_id: number;
  condition: string;
  verification_status: string;
  return_status: string;
  reward_amount: number;
  product_id: number;
  sku: string;
  product_name: string;
  price: number;
  image_url: string;
  customer_id: number;
  customer_name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface CandidateRow {
  order_id: number;
  customer_id: number;
  customer_name: string;
  address: string;
  latitude: number;
  longitude: number;
  payment_status: string;
  fulfillment_status: string;
  reroute_consent: number;
  created_at: string;
  reserved_by_other: number;
}

interface MatchRow {
  id: number;
  return_id: number;
  buyer_order_id: number;
  distance_km: number;
  traditional_cost: number;
  reroute_cost: number;
  savings: number;
  match_status: string;
}

const RETURN_SQL = `
  SELECT r.id AS return_id, r.order_id, r.condition, r.verification_status, r.return_status, r.reward_amount,
         p.id AS product_id, p.sku, p.name AS product_name, p.price, p.image_url,
         c.id AS customer_id, c.name AS customer_name, c.address, c.latitude, c.longitude
  FROM returns r
  JOIN orders o ON o.id = r.order_id
  JOIN products p ON p.id = o.product_id
  JOIN customers c ON c.id = o.customer_id`;

const CANDIDATES_SQL = `
  SELECT o.id AS order_id, c.id AS customer_id, c.name AS customer_name, c.address,
         c.latitude, c.longitude, o.payment_status, o.fulfillment_status, o.reroute_consent,
         o.created_at,
         EXISTS (SELECT 1 FROM matches m
                 WHERE m.buyer_order_id = o.id AND m.return_id != @returnId
                   AND m.match_status IN ('accepted','in_transit')) AS reserved_by_other
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.product_id = @productId AND o.id != @orderId
  ORDER BY o.id`;

const ACTIVE_MATCH_SQL = `
  SELECT id, buyer_order_id, match_status, savings FROM matches
  WHERE return_id = ? AND match_status IN ('proposed','accepted','in_transit')
  ORDER BY CASE match_status WHEN 'proposed' THEN 1 ELSE 0 END, id DESC
  LIMIT 1`;

function loadEngineInput(database: DB, row: ReturnRow): EngineInput {
  const candidates = database
    .prepare(CANDIDATES_SQL)
    .all({ returnId: row.return_id, productId: row.product_id, orderId: row.order_id }) as CandidateRow[];
  const active = database.prepare(ACTIVE_MATCH_SQL).get(row.return_id) as
    | { id: number; buyer_order_id: number; match_status: ActiveMatchSummary['status']; savings: number }
    | undefined;

  return {
    ret: {
      returnId: row.return_id,
      orderId: row.order_id,
      condition: row.condition,
      verificationStatus: row.verification_status,
      returnStatus: row.return_status,
      product: {
        id: row.product_id,
        sku: row.sku,
        name: row.product_name,
        priceCents: row.price,
        imageUrl: row.image_url,
      },
      returner: {
        customerId: row.customer_id,
        name: row.customer_name,
        address: row.address,
        lat: row.latitude,
        lng: row.longitude,
        label: row.customer_name,
      },
    },
    candidates: candidates.map(
      (c): EngineCandidateInput => ({
        buyerOrderId: c.order_id,
        buyer: {
          customerId: c.customer_id,
          name: c.customer_name,
          address: c.address,
          lat: c.latitude,
          lng: c.longitude,
          label: c.customer_name,
        },
        orderCreatedAt: c.created_at,
        paymentStatus: c.payment_status,
        fulfillmentStatus: c.fulfillment_status,
        rerouteConsent: c.reroute_consent === 1,
        reservedByOther: c.reserved_by_other === 1,
      }),
    ),
    activeMatch: active
      ? {
          id: active.id,
          buyerOrderId: active.buyer_order_id,
          status: active.match_status,
          savingsCents: active.savings,
        }
      : null,
  };
}

function evaluateRow(database: DB, row: ReturnRow, overrides?: Partial<CostConfig>) {
  return evaluateReturn(loadEngineInput(database, row), row.reward_amount > 0 ? { ...overrides, rewardCents: row.reward_amount } : overrides);
}

/** Match results for every return (ordered by id), or just one when returnId is given. */
export function getMatchResults(
  database: DB,
  returnId?: number,
  overrides?: Partial<CostConfig>,
): ReturnMatchResult[] {
  const rows =
    returnId === undefined
      ? (database.prepare(`${RETURN_SQL} ORDER BY r.id`).all() as ReturnRow[])
      : (database.prepare(`${RETURN_SQL} WHERE r.id = ?`).all(returnId) as ReturnRow[]);
  return rows.map((row) => evaluateRow(database, row, overrides));
}

export type RerouteResult =
  | ({ ok: true } & RerouteSuccessResponse)
  | { ok: false; code: RerouteErrorCode; message: string; rejections?: CandidateRejection[] };

const fail = (
  code: RerouteErrorCode,
  message: string,
  rejections?: CandidateRejection[],
): RerouteResult => ({ ok: false, code, message, rejections });

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: unknown }).code).startsWith('SQLITE_CONSTRAINT_UNIQUE')
  );
}

/**
 * Approve a reroute atomically. Re-runs eligibility and costing server-side; client numbers are
 * never trusted. The partial unique indexes on matches are the final guard against races.
 */
export function approveReroute(
  database: DB,
  returnId: number,
  buyerOrderId: number,
  overrides?: Partial<CostConfig>,
): RerouteResult {
  const run = database.transaction((): RerouteResult => {
    const row = database.prepare(`${RETURN_SQL} WHERE r.id = ?`).get(returnId) as ReturnRow | undefined;
    if (!row) return fail('not_found', `Return ${returnId} not found`);

    const result = evaluateRow(database, row, overrides);
    if (result.state === 'ineligible') {
      return fail('return_ineligible', result.ineligibleReason ?? 'Return is not eligible for reroute');
    }
    if (result.state === 'reserved') {
      return fail('already_reserved', `Return ${returnId} already has an active reroute`);
    }

    const candidate = result.candidates.find((c) => c.buyerOrderId === buyerOrderId);
    if (!candidate) {
      const exists = database.prepare('SELECT 1 FROM orders WHERE id = ?').get(buyerOrderId);
      if (!exists) return fail('not_found', `Order ${buyerOrderId} not found`);
      return fail('candidate_ineligible', `Order ${buyerOrderId} is not for the same product`);
    }
    if (!candidate.eligible) {
      if (candidate.rejections.length === 1 && candidate.rejections[0] === 'reserved') {
        return fail('already_reserved', `Order ${buyerOrderId} is already reserved`, candidate.rejections);
      }
      return fail('candidate_ineligible', `Order ${buyerOrderId} is not eligible`, candidate.rejections);
    }

    const { costs, distanceKm } = candidate;

    // Cancel other proposed matches for this return and this buyer order.
    database
      .prepare(
        `UPDATE matches SET match_status = 'cancelled'
         WHERE match_status = 'proposed' AND (return_id = @r OR buyer_order_id = @b)
           AND NOT (return_id = @r AND buyer_order_id = @b)`,
      )
      .run({ r: returnId, b: buyerOrderId });

    const existing = database
      .prepare(
        `SELECT id FROM matches WHERE return_id = ? AND buyer_order_id = ? AND match_status = 'proposed'`,
      )
      .get(returnId, buyerOrderId) as { id: number } | undefined;

    const values = {
      r: returnId,
      b: buyerOrderId,
      d: distanceKm,
      t: costs.traditionalCents,
      rc: costs.rerouteCents,
      s: costs.savingsCents,
    };
    let matchId: number;
    if (existing) {
      database
        .prepare(
          `UPDATE matches SET match_status = 'accepted', distance_km = @d, traditional_cost = @t,
             reroute_cost = @rc, savings = @s WHERE id = @id`,
        )
        .run({ ...values, id: existing.id });
      matchId = existing.id;
    } else {
      const info = database
        .prepare(
          `INSERT INTO matches (return_id, buyer_order_id, distance_km, traditional_cost, reroute_cost, savings, match_status)
           VALUES (@r, @b, @d, @t, @rc, @s, 'accepted')`,
        )
        .run(values);
      matchId = Number(info.lastInsertRowid);
    }

    database.prepare(`UPDATE returns SET return_status = 'matched', reward_amount = ? WHERE id = ?`).run(costs.rewardCents, returnId);
    database
      .prepare(`UPDATE orders SET fulfillment_status = 'processing' WHERE id = ?`)
      .run(buyerOrderId);

    return {
      ok: true,
      match: {
        id: matchId,
        returnId,
        buyerOrderId,
        status: 'accepted',
        distanceKm,
        traditionalCents: costs.traditionalCents,
        rerouteCents: costs.rerouteCents,
        savingsCents: costs.savingsCents,
      },
    };
  });

  try {
    return run.immediate();
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail('already_reserved', 'This return or order was reserved by another reroute');
    }
    throw error;
  }
}

/** Cancel an accepted reroute before collection is arranged and release the reservation. */
export function cancelReroute(database: DB, matchId: number): RerouteResult {
  const run = database.transaction((): RerouteResult => {
    const match = database.prepare('SELECT * FROM matches WHERE id = ?').get(matchId) as
      | MatchRow
      | undefined;
    if (!match) return fail('not_found', `Match ${matchId} not found`);
    if (match.match_status !== 'accepted') {
      return fail('already_dispatched', `Match ${matchId} is '${match.match_status}' and cannot be cancelled`);
    }

    const delivery = database.prepare<[number], { id: number; delivery_status: string }>(
      'SELECT id, delivery_status FROM deliveries WHERE match_id = ?',
    ).get(matchId);
    if (delivery) {
      if (delivery.delivery_status !== 'pending') {
        return fail('already_dispatched', `Collection has already started for match ${matchId}`);
      }

      const collectionsTable = database.prepare(
        "SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'operation_collections'",
      ).get();
      if (collectionsTable && database.prepare(
        'SELECT 1 FROM main.operation_collections WHERE delivery_id = ?',
      ).get(delivery.id)) {
        return fail('already_dispatched', `Collection has already been arranged for match ${matchId}`);
      }
    }

    database.prepare(`UPDATE matches SET match_status = 'cancelled' WHERE id = ?`).run(matchId);
    database
      .prepare(`UPDATE returns SET return_status = 'approved' WHERE id = ? AND return_status = 'matched'`)
      .run(match.return_id);
    database
      .prepare(
        `UPDATE orders SET fulfillment_status = 'unfulfilled' WHERE id = ? AND fulfillment_status = 'processing'`,
      )
      .run(match.buyer_order_id);
    return {
      ok: true,
      match: {
        id: match.id,
        returnId: match.return_id,
        buyerOrderId: match.buyer_order_id,
        status: 'cancelled',
        distanceKm: match.distance_km,
        traditionalCents: match.traditional_cost,
        rerouteCents: match.reroute_cost,
        savingsCents: match.savings,
      },
    };
  });
  return run.immediate();
}
