import 'leaflet/dist/leaflet.css';

import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import RouteMap from '@/components/logistics/map/RouteMap';
import { db } from '@/lib/db';
import { kmToMiles } from '@/lib/logistics/geo';
import { getRouteOptions, getRouteView } from '@/lib/logistics/routeView';
import type { CostBreakdown, RouteEstimate } from '@/lib/logistics/types';

export const metadata: Metadata = {
  title: 'Route comparison | RIP — Return In Proximity',
};

const number = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

const miles = (km: number) => `${number.format(kmToMiles(km))} mi`;
const euros = (cents: number) => money.format(cents / 100);

function parseId(value: string | string[] | undefined, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function RouteComparison({ costs, route }: { costs: CostBreakdown; route: RouteEstimate }) {
  const savesMoney = costs.savingsCents >= 0;

  return (
    <section aria-labelledby="comparison-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="comparison-heading" className="text-lg font-semibold tracking-tight">Route comparison</h2>

      <div className={`mt-4 rounded-xl p-4 ${savesMoney ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-900'}`}>
        <p className="text-sm font-medium">{savesMoney ? 'Estimated savings' : 'Estimated extra cost'}</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">{euros(Math.abs(costs.savingsCents))}</p>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-slate-600">
          <tr>
            <th scope="col" className="py-2 font-medium">Route</th>
            <th scope="col" className="py-2 text-right font-medium">Distance</th>
            <th scope="col" className="py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 border-t border-slate-200">
          <tr>
            <th scope="row" className="py-3 font-medium text-slate-700">Via warehouse</th>
            <td className="py-3 text-right tabular-nums">{miles(route.viaWarehouseKm)}</td>
            <td className="py-3 text-right tabular-nums">{euros(costs.traditionalCents)}</td>
          </tr>
          <tr>
            <th scope="row" className="py-3 font-medium text-emerald-800">RIP direct</th>
            <td className="py-3 text-right tabular-nums">{miles(route.directKm)}</td>
            <td className="py-3 text-right tabular-nums">{euros(costs.rerouteCents)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
        <div>
          <dt className="text-sm text-slate-600">Distance saved</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{miles(route.distanceSavedKm)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">CO₂e saved (est.)</dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums">{number.format(route.co2SavedKg)} kg</dd>
        </div>
      </dl>

      <p className="mt-5 text-xs leading-relaxed text-slate-600">
        Straight-line distances with a 1.3× road factor: estimates, not actual road routing.
      </p>
    </section>
  );
}

function RouteUnavailable({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Route unavailable</h2>
      <div className="mt-2 space-y-1 text-sm text-slate-600">{children}</div>
    </section>
  );
}

type SelectedPair = { returnId: number | null; buyerOrderId: number | null };

function RoutePicker({
  options,
  returnId,
  buyerOrderId,
}: SelectedPair & { options: ReturnType<typeof getRouteOptions> }) {
  const fields = [
    { name: 'returnId', label: 'Return', choices: options.returns, selected: returnId },
    { name: 'buyerOrderId', label: 'Buyer order', choices: options.buyerOrders, selected: buyerOrderId },
  ];

  return (
    <Form action="/logistics" aria-label="Select routes to compare" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
      {fields.map(({ name, label, choices, selected }) => (
        <label key={name} className="min-w-0 text-sm font-medium text-slate-700">
          {label}
          <select
            name={name}
            defaultValue={choices.some(({ id }) => id === selected) ? String(selected) : ''}
            required
            className="mt-1.5 block h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-950 focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            <option value="" disabled>Select {label.toLowerCase()}</option>
            {choices.map(({ id, customerName, sku }) => (
              <option key={id} value={id}>#{id} · {customerName} · {sku}</option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className="h-10 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
        Compare routes
      </button>
    </Form>
  );
}

function RouteDetails({ returnId, buyerOrderId }: SelectedPair) {
  if (returnId === null || buyerOrderId === null) {
    return (
      <RouteUnavailable>
        {returnId === null && <p>Enter a positive whole number for the return ID.</p>}
        {buyerOrderId === null && <p>Enter a positive whole number for the buyer order ID.</p>}
      </RouteUnavailable>
    );
  }

  const view = getRouteView(db, returnId, buyerOrderId);

  if (view.status === 'not_found') {
    return (
      <RouteUnavailable>
        {view.missingReturn && <p>Return #{returnId} was not found.</p>}
        {view.missingBuyerOrder && <p>Buyer order #{buyerOrderId} was not found.</p>}
      </RouteUnavailable>
    );
  }

  return (
    <>
      <dl className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3 sm:p-6">
        <div>
          <dt className="text-sm text-slate-600">Product · {view.product.sku}</dt>
          <dd className="mt-1 font-semibold">{view.product.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Return #{returnId}</dt>
          <dd className="mt-1 font-semibold">{view.returner.label}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">Buyer order #{buyerOrderId}</dt>
          <dd className="mt-1 font-semibold">{view.buyer.label}</dd>
        </div>
      </dl>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
        <RouteMap key={`${returnId}:${buyerOrderId}`} returner={view.returner} buyer={view.buyer} warehouse={view.warehouse} />
        <RouteComparison costs={view.costs} route={view.route} />
      </div>
    </>
  );
}

async function RouteContent({ searchParams }: Pick<PageProps<'/logistics'>, 'searchParams'>) {
  await connection();
  const params = await searchParams;
  const returnId = parseId(params.returnId, 1);
  const buyerOrderId = parseId(params.buyerOrderId, 2);
  const options = getRouteOptions(db);

  if (options.returns.length === 0 || options.buyerOrders.length === 0) {
    return (
      <RouteUnavailable>
        {options.returns.length === 0 && <p>No returns are available for comparison.</p>}
        {options.buyerOrders.length === 0 && <p>No buyer orders are available for comparison.</p>}
      </RouteUnavailable>
    );
  }

  return (
    <>
      <RoutePicker key={`${returnId}:${buyerOrderId}`} options={options} returnId={returnId} buyerOrderId={buyerOrderId} />
      <RouteDetails returnId={returnId} buyerOrderId={buyerOrderId} />
    </>
  );
}

export default function LogisticsPage({ searchParams }: PageProps<'/logistics'>) {
  return (
    <main className="rip-seller min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-8 sm:py-9">
        <header className="space-y-4">
          <Link href="/matches" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline">
            <span aria-hidden="true">←</span> Matches
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Compare delivery routes</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">See what changes when a return goes straight to the buyer.</p>
          </div>
        </header>

        <Suspense fallback={<p role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading route comparison…</p>}>
          <RouteContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
