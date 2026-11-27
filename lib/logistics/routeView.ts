import type Database from 'better-sqlite3';
import { DEFAULT_COST_CONFIG } from './config';
import { computeCosts, legDistances, routeEstimate } from './costs';
import type { CostBreakdown, GeoPoint, RouteEstimate } from './types';

interface ReturnRow extends GeoPoint {
  productName: string;
  reward: number;
  sku: string;
}

type RouteView =
  | {
      status: 'ready';
      returner: GeoPoint;
      buyer: GeoPoint;
      warehouse: GeoPoint;
      product: { name: string; sku: string };
      costs: CostBreakdown;
      route: RouteEstimate;
    }
  | { status: 'not_found'; missingReturn: boolean; missingBuyerOrder: boolean };

interface RouteOption {
  id: number;
  customerName: string;
  sku: string;
}

export function getRouteOptions(db: Database.Database) {
  const returns = db.prepare<[], RouteOption>(`
    SELECT r.id, c.name AS customerName, p.sku
    FROM returns r
    JOIN orders o ON o.id = r.order_id
    JOIN customers c ON c.id = o.customer_id
    JOIN products p ON p.id = o.product_id
    ORDER BY r.id
  `).all();

  const buyerOrders = db.prepare<[], RouteOption>(`
    SELECT o.id, c.name AS customerName, p.sku
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    JOIN products p ON p.id = o.product_id
    ORDER BY o.id
  `).all();

  return { returns, buyerOrders };
}

/** Load the selected pair and compare both paths using the same cost model as matching. */
export function getRouteView(
  db: Database.Database,
  returnId: number,
  buyerOrderId: number,
): RouteView {
  const returnRow = db.prepare<[number], ReturnRow>(`
    SELECT c.name AS label, c.latitude AS lat, c.longitude AS lng,
           p.name AS productName, p.sku, r.reward_amount AS reward
    FROM returns r
    JOIN orders o ON o.id = r.order_id
    JOIN customers c ON c.id = o.customer_id
    JOIN products p ON p.id = o.product_id
    WHERE r.id = ?
  `).get(returnId);

  const buyer = db.prepare<[number], GeoPoint>(`
    SELECT c.name AS label, c.latitude AS lat, c.longitude AS lng
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ?
  `).get(buyerOrderId);

  if (!returnRow || !buyer) {
    return { status: 'not_found', missingReturn: !returnRow, missingBuyerOrder: !buyer };
  }

  const { productName, sku, reward, ...returner } = returnRow;
  const config = reward > 0 ? { ...DEFAULT_COST_CONFIG, rewardCents: reward } : DEFAULT_COST_CONFIG;
  const legs = legDistances(returner, buyer, config);

  return {
    status: 'ready',
    returner,
    buyer,
    warehouse: config.warehouse,
    product: { name: productName, sku },
    costs: computeCosts(legs, config),
    route: routeEstimate(legs, config),
  };
}
