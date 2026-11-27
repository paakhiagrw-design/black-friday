import { resolveConfig } from './config';
import { computeCosts, legDistances, routeEstimate } from './costs';
import { kmToMiles, round } from './geo';
import type {
  ActiveMatchSummary,
  CandidateRejection,
  CostConfig,
  MatchCandidate,
  Party,
  ReturnMatchResult,
} from './types';

/** Pure input for the matching engine. No database access happens here. */
export interface EngineReturnInput {
  returnId: number;
  orderId: number;
  condition: string;
  verificationStatus: string;
  returnStatus: string;
  product: ReturnMatchResult['product'];
  returner: Party;
}

export interface EngineCandidateInput {
  buyerOrderId: number;
  buyer: Party;
  orderCreatedAt: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  /** DB stores 0/1; booleans are accepted too. */
  rerouteConsent: boolean | number;
  /** True when another return holds an accepted / in_transit match on this order. */
  reservedByOther: boolean;
}

export interface EngineInput {
  ret: EngineReturnInput;
  /** Same product_id, excluding the return's own order. */
  candidates: EngineCandidateInput[];
  activeMatch: ActiveMatchSummary | null;
}

const MATCHABLE_RETURN_STATUSES = new Set(['requested', 'approved', 'matched']);

export function returnIneligibleReason(ret: EngineReturnInput): string | null {
  if (ret.verificationStatus !== 'verified') {
    return ret.verificationStatus === 'failed' ? 'Verification failed' : 'Not yet verified';
  }
  if (ret.condition === 'damaged') return 'Item is damaged';
  if (!MATCHABLE_RETURN_STATUSES.has(ret.returnStatus)) {
    return `Return status is '${ret.returnStatus}'`;
  }
  return null;
}

export function evaluateReturn(
  input: EngineInput,
  overrides?: Partial<CostConfig>,
): ReturnMatchResult {
  const config = resolveConfig(overrides);
  const { ret, activeMatch } = input;

  const base = {
    returnId: ret.returnId,
    orderId: ret.orderId,
    condition: ret.condition,
    verificationStatus: ret.verificationStatus,
    returnStatus: ret.returnStatus,
    product: ret.product,
    returner: ret.returner,
    warehouse: config.warehouse,
    activeMatch,
  };

  const ineligibleReason = returnIneligibleReason(ret);
  if (ineligibleReason) {
    return { ...base, state: 'ineligible', ineligibleReason, candidates: [], recommendation: 'none' };
  }

  const evaluated: MatchCandidate[] = input.candidates.map((c) => {
    const legs = legDistances(ret.returner, c.buyer, config);
    const costs = computeCosts(legs, config);
    const route = routeEstimate(legs, config);
    const rejections: CandidateRejection[] = [];
    if (c.buyer.customerId === ret.returner.customerId) rejections.push('same_customer');
    if (c.paymentStatus !== 'paid') rejections.push('not_paid');
    // A reservation itself sets the order to 'processing'; report that as 'reserved' only.
    const processingBecauseReserved = c.reservedByOther && c.fulfillmentStatus === 'processing';
    if (c.fulfillmentStatus !== 'unfulfilled' && !processingBecauseReserved) {
      rejections.push('already_fulfilled');
    }
    if (!c.rerouteConsent) rejections.push('no_consent');
    if (legs.directKm > config.maxRadiusKm) rejections.push('too_far');
    if (c.reservedByOther) rejections.push('reserved');
    if (costs.savingsCents < config.minSavingsCents) rejections.push('unprofitable');
    return {
      buyerOrderId: c.buyerOrderId,
      buyer: c.buyer,
      orderCreatedAt: c.orderCreatedAt,
      distanceKm: round(legs.directKm, 3),
      distanceMiles: round(kmToMiles(legs.directKm), 2),
      costs,
      route,
      eligible: rejections.length === 0,
      rejections,
      rank: null,
    };
  });

  const eligible = evaluated
    .filter((c) => c.eligible)
    .sort(
      (a, b) =>
        b.costs.savingsCents - a.costs.savingsCents ||
        a.distanceKm - b.distanceKm ||
        a.orderCreatedAt.localeCompare(b.orderCreatedAt) ||
        a.buyerOrderId - b.buyerOrderId,
    )
    .map((c, i) => ({ ...c, rank: i + 1 }));
  const rejected = evaluated
    .filter((c) => !c.eligible)
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const candidates = [...eligible, ...rejected];

  const isReserved =
    activeMatch !== null && (activeMatch.status === 'accepted' || activeMatch.status === 'in_transit');
  if (isReserved) {
    // The reserved buyer's order is now 'processing' because of this very match; don't list it as rejected.
    const others = candidates.filter((c) => c.buyerOrderId !== activeMatch.buyerOrderId);
    return { ...base, state: 'reserved', candidates: others, recommendation: 'reroute' };
  }
  if (eligible.length > 0) {
    return { ...base, state: 'matchable', candidates, recommendation: 'reroute' };
  }
  return { ...base, state: 'no_match', candidates, recommendation: 'warehouse' };
}
