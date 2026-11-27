'use client';

import { useState } from 'react';
import { DEFAULT_COST_CONFIG } from '@/lib/logistics/config';
import { kmToMiles, milesToKm, round } from '@/lib/logistics/geo';
import { simulateSavings } from '@/lib/logistics/simulator';
import { formatEmissions, formatEuro, formatMiles, formatNumber, formatPercent } from './format';

const defaultInputs = {
  returns: 250,
  matchPercent: 35,
  matchMiles: 2,
  warehouseMiles: 32,
  courierCents: DEFAULT_COST_CONFIG.courierPerKmCents,
  rewardCents: DEFAULT_COST_CONFIG.rewardCents,
};

type SliderKey = keyof typeof defaultInputs;

const sliders: Array<{ key: SliderKey; label: string; min: number; max: number; step: number; format: (value: number) => string }> = [
  { key: 'returns', label: 'Returns per month', min: 0, max: 2000, step: 10, format: formatNumber },
  { key: 'matchPercent', label: 'Local match rate', min: 0, max: 100, step: 1, format: (value) => formatPercent(value / 100) },
  { key: 'matchMiles', label: 'Average local match distance', min: 0, max: 20, step: 0.1, format: (value) => `${formatNumber(value)} mi` },
  { key: 'warehouseMiles', label: 'Average warehouse distance per leg', min: 10, max: 100, step: 1, format: (value) => `${formatNumber(value)} mi` },
  { key: 'courierCents', label: 'Courier rate per kilometre', min: 0, max: 400, step: 5, format: (value) => `${formatEuro(value)}/km` },
  { key: 'rewardCents', label: 'Customer reward per reroute', min: 0, max: 1500, step: 25, format: formatEuro },
];

export function SavingsSimulator() {
  const [inputs, setInputs] = useState(defaultInputs);
  const matchKm = round(milesToKm(inputs.matchMiles), 4);
  const result = simulateSavings({
    returnsPerMonth: inputs.returns,
    localMatchRate: inputs.matchPercent / 100,
    avgMatchDistanceKm: matchKm,
    warehouseDistanceKm: milesToKm(inputs.warehouseMiles),
    config: {
      courierPerKmCents: inputs.courierCents,
      rewardCents: inputs.rewardCents,
    },
  });

  const { maxRadiusKm, minSavingsCents } = DEFAULT_COST_CONFIG;
  const outsideRadius = matchKm > maxRadiusKm;
  const belowMinimum = result.savingsPerRerouteCents < minSavingsCents;

  return (
    <section aria-labelledby="simulator-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <h2 id="simulator-heading" className="text-2xl font-semibold tracking-tight">Savings simulator</h2>
      <p className="mt-1 text-sm text-slate-600">
        Adjust your return volume, route distances and delivery costs to estimate savings.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
        <div className="grid gap-4">
          {sliders.map(({ key, label, min, max, step, format }) => (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={key} className="text-sm font-medium text-slate-700">{label}</label>
                <output aria-hidden="true" htmlFor={key} className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">
                  {format(inputs[key])}
                </output>
              </div>
              <input
                id={key}
                type="range"
                min={min}
                max={max}
                step={step}
                value={inputs[key]}
                aria-valuetext={format(inputs[key])}
                onChange={(event) => {
                  const value = event.currentTarget.valueAsNumber;
                  setInputs((previous) => ({ ...previous, [key]: value }));
                }}
                className="mt-2 h-5 w-full cursor-pointer accent-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-emerald-950">Projected annual savings</h3>
          <p aria-live="polite" className="mt-1 break-words text-3xl font-semibold tracking-tight tabular-nums text-emerald-900 sm:text-4xl">
            {formatEuro(result.annualSavingsCents)}
          </p>
          <p className="mt-2 text-sm text-emerald-900">
            {formatNumber(result.reroutesPerMonth)} expected reroutes per month
          </p>

          <table className="mt-5 w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-emerald-200 text-emerald-900">
                <th scope="col" className="sr-only">Metric</th>
                <th scope="col" className="px-1 py-2 text-right font-medium">Monthly</th>
                <th scope="col" className="py-2 text-right font-medium">Annual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 tabular-nums text-emerald-950">
              <tr>
                <th scope="row" className="py-2 pr-1 font-medium">Savings</th>
                <td className="px-1 py-2 text-right">{formatEuro(result.monthlySavingsCents)}</td>
                <td className="py-2 text-right">{formatEuro(result.annualSavingsCents)}</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-1 font-medium">Distance saved (est.)</th>
                <td className="px-1 py-2 text-right">{formatMiles(result.annualDistanceSavedKm / 12)}</td>
                <td className="py-2 text-right">{formatMiles(result.annualDistanceSavedKm)}</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-1 font-medium">Emissions avoided (est.)</th>
                <td className="px-1 py-2 text-right">{formatEmissions(result.annualCo2SavedKg / 12)}</td>
                <td className="py-2 text-right">{formatEmissions(result.annualCo2SavedKg)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-4 border-t border-emerald-200 pt-3 text-xs leading-relaxed text-emerald-900" role="status">
            <p>Cost difference per potential reroute: {formatEuro(result.savingsPerRerouteCents)}.</p>
            {outsideRadius ? (
              <p>Local reroutes require a buyer within {formatNumber(kmToMiles(maxRadiusKm))} mi.</p>
            ) : belowMinimum ? (
              <p>Local reroutes require at least {formatEuro(minSavingsCents)} savings per return.</p>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-600">
        Estimates use straight-line distances with a {DEFAULT_COST_CONFIG.roadFactor}× road factor and equal assumed warehouse legs.
      </p>
    </section>
  );
}
