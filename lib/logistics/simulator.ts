import { resolveConfig } from './config';
import { computeCosts, routeEstimate } from './costs';
import { round } from './geo';
import type { SimulatorInputs, SimulatorOutputs } from './types';

export function simulateSavings(inputs: SimulatorInputs): SimulatorOutputs {
  const config = resolveConfig(inputs.config);
  const legs = {
    directKm: inputs.avgMatchDistanceKm,
    returnLegKm: inputs.warehouseDistanceKm,
    outboundLegKm: inputs.warehouseDistanceKm,
  };
  const { savingsCents } = computeCosts(legs, config);
  const route = routeEstimate(legs, config);
  const isEligible =
    legs.directKm <= config.maxRadiusKm && savingsCents >= config.minSavingsCents;
  const reroutesPerMonth = isEligible ? inputs.returnsPerMonth * inputs.localMatchRate : 0;
  const annualReroutes = reroutesPerMonth * 12;

  return {
    reroutesPerMonth,
    savingsPerRerouteCents: savingsCents,
    monthlySavingsCents: Math.round(reroutesPerMonth * savingsCents) || 0,
    annualSavingsCents: Math.round(annualReroutes * savingsCents) || 0,
    annualDistanceSavedKm: round(annualReroutes * route.distanceSavedKm),
    annualCo2SavedKg: round(annualReroutes * route.co2SavedKg),
  };
}
