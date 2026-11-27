import type { CostConfig } from './types';

/** 10 miles in kilometres. */
export const MAX_RADIUS_KM = 16.0934;
export const KM_PER_MILE = 1.609344;

/**
 * Demo cost model. All values are cents except distances and factors.
 * The warehouse is a fictional central fulfilment centre in Kildare, about 50 km from Dublin.
 */
export const DEFAULT_COST_CONFIG: CostConfig = {
  warehouse: { lat: 53.1589, lng: -6.9096, label: 'ReRoute Central Fulfilment (Kildare)' },
  maxRadiusKm: MAX_RADIUS_KM,
  roadFactor: 1.3,
  parcelBaseCents: 495,
  parcelPerKmCents: 6,
  warehouseHandlingCents: 400,
  courierBaseCents: 350,
  courierPerKmCents: 90,
  inspectionCents: 150,
  rewardCents: 300,
  minSavingsCents: 100,
  co2KgPerKm: 0.21,
};

export function resolveConfig(overrides?: Partial<CostConfig>): CostConfig {
  return { ...DEFAULT_COST_CONFIG, ...overrides };
}
