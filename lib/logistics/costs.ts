import { resolveConfig } from './config';
import { haversineKm, round, roadKm } from './geo';
import type { CostBreakdown, CostConfig, GeoPoint, RouteEstimate } from './types';

type LatLng = Pick<GeoPoint, 'lat' | 'lng'>;

/** Straight-line legs for one returner → buyer pairing. */
export interface LegDistances {
  /** Returner → buyer. */
  directKm: number;
  /** Returner → warehouse. */
  returnLegKm: number;
  /** Warehouse → buyer. */
  outboundLegKm: number;
}

export function legDistances(returner: LatLng, buyer: LatLng, config: CostConfig): LegDistances {
  return {
    directKm: haversineKm(returner, buyer),
    returnLegKm: haversineKm(returner, config.warehouse),
    outboundLegKm: haversineKm(config.warehouse, buyer),
  };
}

/** Cost of both paths from straight-line leg distances. Pure; shared by the engine and simulator. */
export function computeCosts(legs: LegDistances, overrides?: Partial<CostConfig>): CostBreakdown {
  const c = resolveConfig(overrides);
  const parcel = (km: number) =>
    Math.round(c.parcelBaseCents + c.parcelPerKmCents * roadKm(km, c.roadFactor));

  const returnLegCents = parcel(legs.returnLegKm);
  const outboundLegCents = parcel(legs.outboundLegKm);
  const traditionalCents = returnLegCents + c.warehouseHandlingCents + outboundLegCents;

  const courierCents = Math.round(
    c.courierBaseCents + c.courierPerKmCents * roadKm(legs.directKm, c.roadFactor),
  );
  const rerouteCents = courierCents + c.inspectionCents + c.rewardCents;

  return {
    returnLegCents,
    warehouseHandlingCents: c.warehouseHandlingCents,
    outboundLegCents,
    traditionalCents,
    courierCents,
    inspectionCents: c.inspectionCents,
    rewardCents: c.rewardCents,
    rerouteCents,
    savingsCents: traditionalCents - rerouteCents,
  };
}

/** Estimated road distance and CO₂e saved by skipping the warehouse round trip. */
export function routeEstimate(legs: LegDistances, overrides?: Partial<CostConfig>): RouteEstimate {
  const c = resolveConfig(overrides);
  const directKm = roadKm(legs.directKm, c.roadFactor);
  const viaWarehouseKm = roadKm(legs.returnLegKm + legs.outboundLegKm, c.roadFactor);
  const distanceSavedKm = Math.max(0, viaWarehouseKm - directKm);
  return {
    directKm: round(directKm),
    viaWarehouseKm: round(viaWarehouseKm),
    distanceSavedKm: round(distanceSavedKm),
    co2SavedKg: round(distanceSavedKm * c.co2KgPerKm),
    isEstimate: true,
  };
}
