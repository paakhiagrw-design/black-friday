import type { Database } from 'better-sqlite3';
import { DEFAULT_COST_CONFIG } from '@/lib/logistics/config';
import { legDistances, routeEstimate } from '@/lib/logistics/costs';
import { round } from '@/lib/logistics/geo';
import type { DashboardStats } from '@/lib/logistics/types';

interface ReturnCounts {
  totalReturns: number;
  pendingVerification: number;
  awaitingMatch: number;
  verifiedReturns: number;
  reroutedReturns: number;
}

interface MatchTotals {
  activeReroutes: number;
  completedReroutes: number;
  savedCents: number;
  committedSavingsCents: number;
}

interface RouteCoordinates {
  returnerLat: number;
  returnerLng: number;
  buyerLat: number;
  buyerLng: number;
}

export type ReturnFunnelStats = Pick<
  DashboardStats,
  'totalReturns' | 'pendingVerification' | 'awaitingMatch' | 'activeReroutes' | 'completedReroutes'
>;

interface DailySavings {
  day: string;
  savedCents: number;
  completedReroutes: number;
  co2SavedKg: number;
}

interface ProductSavings {
  productId: number;
  sku: string;
  name: string;
  savedCents: number;
  completedReroutes: number;
}

type CompletedMatch = RouteCoordinates & Omit<ProductSavings, 'completedReroutes'> & { day: string };

export interface AnalyticsReport {
  daily: DailySavings[];
  byProduct: ProductSavings[];
  funnel: ReturnFunnelStats;
}

const returnCountsSql = `
  SELECT
    COUNT(*) AS totalReturns,
    COUNT(*) FILTER (WHERE verification_status = 'pending') AS pendingVerification,
    COUNT(*) FILTER (
      WHERE verification_status = 'verified'
        AND return_status IN ('requested', 'approved')
        AND NOT EXISTS (
          SELECT 1 FROM matches m
          WHERE m.return_id = r.id AND m.match_status IN ('proposed', 'accepted', 'in_transit')
        )
    ) AS awaitingMatch,
    COUNT(*) FILTER (WHERE verification_status = 'verified') AS verifiedReturns,
    COUNT(*) FILTER (
      WHERE verification_status = 'verified'
        AND EXISTS (
          SELECT 1 FROM matches m
          WHERE m.return_id = r.id AND m.match_status IN ('accepted', 'in_transit', 'completed')
        )
    ) AS reroutedReturns
  FROM returns r
`;

const matchTotalsSql = `
  SELECT
    COUNT(*) FILTER (WHERE match_status IN ('accepted', 'in_transit')) AS activeReroutes,
    COUNT(*) FILTER (WHERE match_status = 'completed') AS completedReroutes,
    COALESCE(SUM(savings) FILTER (WHERE match_status = 'completed'), 0) AS savedCents,
    COALESCE(SUM(savings) FILTER (
      WHERE match_status IN ('accepted', 'in_transit')
    ), 0) AS committedSavingsCents
  FROM matches
`;

const recentActivitySql = `
  WITH activity AS (
    SELECT
      r.created_at AS at,
      'return_requested' AS kind,
      'Return requested · ' || p.name AS text,
      r.id AS sourceId,
      0 AS matchEvent
    FROM returns r
    JOIN orders o ON o.id = r.order_id
    JOIN products p ON p.id = o.product_id
    UNION ALL
    SELECT
      CASE m.match_status
        WHEN 'completed' THEN COALESCE(d.delivered_at, m.created_at)
        WHEN 'in_transit' THEN COALESCE(d.collected_at, m.created_at)
        ELSE m.created_at
      END AS at,
      m.match_status AS kind,
      CASE m.match_status
        WHEN 'proposed' THEN 'Match suggested · '
        WHEN 'accepted' THEN 'Reroute reserved · '
        WHEN 'in_transit' THEN 'Reroute in transit · '
        WHEN 'completed' THEN 'Reroute completed · '
      END || p.name AS text,
      m.id AS sourceId,
      1 AS matchEvent
    FROM matches m
    JOIN returns r ON r.id = m.return_id
    JOIN orders o ON o.id = r.order_id
    JOIN products p ON p.id = o.product_id
    LEFT JOIN deliveries d ON d.match_id = m.id
    WHERE m.match_status IN ('proposed', 'accepted', 'in_transit', 'completed')
  )
  SELECT at, kind, text
  FROM activity
  ORDER BY datetime(at) DESC, matchEvent DESC, sourceId DESC
  LIMIT 6
`;

const coordinatesSql = `
  returner.latitude AS returnerLat, returner.longitude AS returnerLng,
  buyer.latitude AS buyerLat, buyer.longitude AS buyerLng
`;

const routeJoinsSql = `
  FROM matches m
  JOIN returns r ON r.id = m.return_id
  JOIN orders original_order ON original_order.id = r.order_id
  JOIN customers returner ON returner.id = original_order.customer_id
  JOIN orders buyer_order ON buyer_order.id = m.buyer_order_id
  JOIN customers buyer ON buyer.id = buyer_order.customer_id
`;

function estimateCompletedRoute(route: RouteCoordinates) {
  return routeEstimate(legDistances(
    { lat: route.returnerLat, lng: route.returnerLng },
    { lat: route.buyerLat, lng: route.buyerLng },
    DEFAULT_COST_CONFIG,
  ));
}

export function getDashboardStats(db: Database): DashboardStats {
  // Use one read snapshot for the counts, match totals and their environmental estimates.
  return db.transaction(() => {
    const returns = db.prepare<[], ReturnCounts>(returnCountsSql).get()!;
    const matches = db.prepare<[], MatchTotals>(matchTotalsSql).get()!;

    const completedRoutes = db.prepare<[], RouteCoordinates>(`
      SELECT ${coordinatesSql}
      ${routeJoinsSql}
      WHERE m.match_status = 'completed'
    `).iterate();

    let distanceSavedKm = 0;
    let co2SavedKg = 0;
    for (const route of completedRoutes) {
      const estimate = estimateCompletedRoute(route);
      distanceSavedKm += estimate.distanceSavedKm;
      co2SavedKg += estimate.co2SavedKg;
    }

    return {
      totalReturns: returns.totalReturns,
      pendingVerification: returns.pendingVerification,
      awaitingMatch: returns.awaitingMatch,
      ...matches,
      distanceSavedKm: round(distanceSavedKm),
      co2SavedKg: round(co2SavedKg),
      rerouteRate: returns.verifiedReturns > 0 ? returns.reroutedReturns / returns.verifiedReturns : 0,
      recent: db.prepare<[], DashboardStats['recent'][number]>(recentActivitySql).all(),
    };
  })();
}

export const DEFAULT_ANALYTICS_DAYS = 30;

export function getAnalytics(db: Database, days = DEFAULT_ANALYTICS_DAYS, now = new Date()): AnalyticsReport {
  const calendar = Array.from({ length: days }, (_, index) => {
    const daysAgo = days - 1 - index;
    const day = new Date(now.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10);
    return { day, savedCents: 0, completedReroutes: 0, co2SavedKg: 0 };
  });
  const startDay = calendar[0].day;
  const endDay = calendar[calendar.length - 1].day;
  const window = { startDay, endDay };

  return db.transaction(() => {
    const completedMatches = db.prepare<typeof window, CompletedMatch>(`
      SELECT
        ${coordinatesSql},
        date(COALESCE(d.delivered_at, m.created_at)) AS day,
        m.savings AS savedCents,
        p.id AS productId,
        p.sku,
        p.name
      ${routeJoinsSql}
      JOIN products p ON p.id = original_order.product_id
      LEFT JOIN deliveries d ON d.match_id = m.id
      WHERE m.match_status = 'completed'
        AND date(COALESCE(d.delivered_at, m.created_at)) BETWEEN @startDay AND @endDay
    `).iterate(window);
    const dailyByDate = new Map(calendar.map((day) => [day.day, day]));
    const byProductId = new Map<number, ProductSavings>();

    for (const match of completedMatches) {
      const day = dailyByDate.get(match.day)!;
      day.savedCents += match.savedCents;
      day.completedReroutes += 1;
      day.co2SavedKg += estimateCompletedRoute(match).co2SavedKg;

      const product = byProductId.get(match.productId) ?? {
        productId: match.productId,
        sku: match.sku,
        name: match.name,
        savedCents: 0,
        completedReroutes: 0,
      };
      product.savedCents += match.savedCents;
      product.completedReroutes += 1;
      byProductId.set(product.productId, product);
    }

    const byProduct = Array.from(byProductId.values()).sort(
      (left, right) => right.savedCents - left.savedCents || left.sku.localeCompare(right.sku),
    );

    const { totalReturns, pendingVerification, awaitingMatch } =
      db.prepare<[], ReturnCounts>(returnCountsSql).get()!;
    const { activeReroutes, completedReroutes } =
      db.prepare<[], MatchTotals>(matchTotalsSql).get()!;

    return {
      daily: calendar.map((day) => ({ ...day, co2SavedKg: round(day.co2SavedKg) })),
      byProduct,
      funnel: { totalReturns, pendingVerification, awaitingMatch, activeReroutes, completedReroutes },
    };
  })();
}
