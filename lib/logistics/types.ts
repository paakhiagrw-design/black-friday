/**
 * Person 3 contract: shared by Track A (matching engine) and Track B (dashboard, map, simulator).
 * Pure types only. Safe to import from client and server code. Owner: Claude (Track A).
 * Money is integer cents; distances are kilometres unless the field name says otherwise.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export type CandidateRejection =
  | 'same_customer'
  | 'not_paid'
  | 'already_fulfilled'
  | 'no_consent'
  | 'too_far'
  | 'reserved'
  | 'unprofitable';

export const REJECTION_LABELS: Record<CandidateRejection, string> = {
  same_customer: 'Buyer is the returning customer',
  not_paid: 'Order not paid',
  already_fulfilled: 'Order already fulfilled',
  no_consent: 'Buyer has not consented to verified returns',
  too_far: 'Outside the 10-mile radius',
  reserved: 'Order already reserved by another reroute',
  unprofitable: 'Reroute would not save enough money',
};

export interface CostBreakdown {
  /** Traditional path: returner → warehouse → buyer. */
  returnLegCents: number;
  warehouseHandlingCents: number;
  outboundLegCents: number;
  traditionalCents: number;
  /** Reroute path: returner → buyer via local courier. */
  courierCents: number;
  inspectionCents: number;
  rewardCents: number;
  rerouteCents: number;
  /** traditionalCents − rerouteCents. May be negative. */
  savingsCents: number;
}

/** Road distances are straight-line × ROAD_FACTOR estimates, not real routing. */
export interface RouteEstimate {
  directKm: number;
  viaWarehouseKm: number;
  distanceSavedKm: number;
  co2SavedKg: number;
  isEstimate: true;
}

export interface Party extends GeoPoint {
  customerId: number;
  name: string;
  address: string;
}

export interface MatchCandidate {
  buyerOrderId: number;
  buyer: Party;
  orderCreatedAt: string;
  /** Straight-line (Haversine) distance between the returner and the buyer. */
  distanceKm: number;
  distanceMiles: number;
  costs: CostBreakdown;
  route: RouteEstimate;
  eligible: boolean;
  rejections: CandidateRejection[];
  /** 1-based rank among eligible candidates; null when ineligible. */
  rank: number | null;
}

export type ReturnMatchState =
  | 'matchable' // at least one eligible candidate
  | 'reserved' // has an accepted / in_transit match
  | 'no_match' // verified, but nothing eligible → warehouse fallback
  | 'ineligible'; // unverified, failed, damaged or terminal status

export interface ActiveMatchSummary {
  id: number;
  buyerOrderId: number;
  status: 'proposed' | 'accepted' | 'in_transit';
  savingsCents: number;
}

export interface ReturnMatchResult {
  returnId: number;
  orderId: number;
  condition: string;
  verificationStatus: string;
  returnStatus: string;
  product: { id: number; sku: string; name: string; priceCents: number; imageUrl: string };
  returner: Party;
  warehouse: GeoPoint;
  state: ReturnMatchState;
  ineligibleReason?: string;
  activeMatch: ActiveMatchSummary | null;
  /** Eligible candidates first (ranked by savings), then rejected ones. */
  candidates: MatchCandidate[];
  recommendation: 'reroute' | 'warehouse' | 'none';
}

export interface MatchesResponse {
  results: ReturnMatchResult[];
  generatedAt: string;
}

export type RerouteErrorCode =
  | 'not_found'
  | 'invalid_request'
  | 'return_ineligible'
  | 'candidate_ineligible'
  | 'already_reserved'
  | 'already_dispatched';

export interface RerouteErrorResponse {
  error: RerouteErrorCode;
  message: string;
  rejections?: CandidateRejection[];
}

export interface RerouteSuccessResponse {
  match: {
    id: number;
    returnId: number;
    buyerOrderId: number;
    status: 'accepted' | 'cancelled';
    distanceKm: number;
    traditionalCents: number;
    rerouteCents: number;
    savingsCents: number;
  };
}

export interface DashboardStats {
  totalReturns: number;
  pendingVerification: number;
  awaitingMatch: number;
  activeReroutes: number;
  completedReroutes: number;
  /** Realised savings from completed matches. */
  savedCents: number;
  /** Savings from accepted + in_transit matches. */
  committedSavingsCents: number;
  distanceSavedKm: number;
  co2SavedKg: number;
  /** Rerouted (accepted/in_transit/completed) ÷ verified returns, 0–1. */
  rerouteRate: number;
  recent: Array<{ at: string; kind: string; text: string }>;
}

/** Inputs to Track B's savings simulator (lib/logistics/simulator.ts). */
export interface SimulatorInputs {
  returnsPerMonth: number;
  /** 0–1 share of returns that find an eligible local buyer. */
  localMatchRate: number;
  avgMatchDistanceKm: number;
  warehouseDistanceKm: number;
  config?: Partial<CostConfig>;
}

export interface SimulatorOutputs {
  reroutesPerMonth: number;
  savingsPerRerouteCents: number;
  monthlySavingsCents: number;
  annualSavingsCents: number;
  annualDistanceSavedKm: number;
  annualCo2SavedKg: number;
}

export interface CostConfig {
  warehouse: GeoPoint;
  maxRadiusKm: number;
  roadFactor: number;
  parcelBaseCents: number;
  parcelPerKmCents: number;
  warehouseHandlingCents: number;
  courierBaseCents: number;
  courierPerKmCents: number;
  inspectionCents: number;
  rewardCents: number;
  minSavingsCents: number;
  co2KgPerKm: number;
}
