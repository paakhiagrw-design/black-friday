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
    <section aria-labelledby="comparison-heading" className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Cost &amp; carbon</p>
      <h2 id="comparison-heading" className="mt-1.5 text-2xl font-semibold tracking-[-0.04em]">Route comparison</h2>

      <div className={`mt-5 border p-5 ${savesMoney ? 'border-[var(--good-line)] bg-[var(--good-bg)]' : 'border-[var(--line)] bg-[var(--soft)]'}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${savesMoney ? 'text-[var(--olive)]' : 'text-[var(--muted)]'}`}>{savesMoney ? 'Estimated savings' : 'Estimated extra cost'}</p>
        <p className="mt-2 text-5xl font-semibold leading-none tracking-[-0.05em] tabular-nums">{euros(Math.abs(costs.savingsCents))}</p>
      </div>

      <table className="mt-5 w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
          <tr>
            <th scope="col" className="py-2 font-semibold">Route</th>
            <th scope="col" className="py-2 text-right font-semibold">Distance</th>
            <th scope="col" className="py-2 text-right font-semibold">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          <tr>
            <th scope="row" className="py-3 font-medium text-[var(--muted)]">Via warehouse</th>
            <td className="py-3 text-right tabular-nums">{miles(route.viaWarehouseKm)}</td>
            <td className="py-3 text-right tabular-nums">{euros(costs.traditionalCents)}</td>
          </tr>
          <tr>
            <th scope="row" className="py-3 font-semibold text-[var(--olive)]">RIP direct</th>
            <td className="py-3 text-right tabular-nums">{miles(route.directKm)}</td>
            <td className="py-3 text-right tabular-nums">{euros(costs.rerouteCents)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Distance saved</dt>
          <dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{miles(route.distanceSavedKm)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">CO₂e saved (est.)</dt>
          <dd className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{number.format(route.co2SavedKg)} kg</dd>
        </div>
      </dl>

      <p className="mt-6 border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-[var(--muted)]">
        Straight-line distances with a 1.3× road factor: estimates, not actual road routing.
      </p>
    </section>
  );
}

function RouteUnavailable({ children }: { children: ReactNode }) {
  return (
    <section className="border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Nothing to compare</p>
      <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.04em]">Route unavailable</h2>
      <div className="mt-3 space-y-1 text-sm text-[var(--danger)]">{children}</div>
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
    <Form action="/logistics" aria-label="Select routes to compare" className="grid gap-4 border border-[var(--line)] bg-[var(--surface)] p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6">
      {fields.map(({ name, label, choices, selected }) => (
        <label key={name} className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
          {label}
          <select
            name={name}
            defaultValue={choices.some(({ id }) => id === selected) ? String(selected) : ''}
            required
            className="mt-2 block min-h-12 w-full border border-[var(--line)] bg-[var(--paper)] px-3 text-sm font-normal normal-case tracking-normal text-[var(--ink)]"
          >
            <option value="" disabled>Select {label.toLowerCase()}</option>
            {choices.map(({ id, customerName, sku }) => (
              <option key={id} value={id}>#{id} · {customerName} · {sku}</option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className="min-h-12 border border-[var(--accent)] bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--on-accent)] transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-px">
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
      <dl className="grid border border-[var(--line)] bg-[var(--surface)] sm:grid-cols-3">
        <div className="border-b border-[var(--line)] p-5 sm:border-b-0 sm:border-r sm:p-6">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Product · {view.product.sku}</dt>
          <dd className="mt-2 text-lg font-semibold tracking-[-0.02em]">{view.product.name}</dd>
        </div>
        <div className="border-b border-[var(--line)] p-5 sm:border-b-0 sm:border-r sm:p-6">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Return #{returnId}</dt>
          <dd className="mt-2 text-lg font-semibold tracking-[-0.02em]">{view.returner.label}</dd>
        </div>
        <div className="p-5 sm:p-6">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Buyer order #{buyerOrderId}</dt>
          <dd className="mt-2 text-lg font-semibold tracking-[-0.02em]">{view.buyer.label}</dd>
        </div>
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,1fr)]">
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
    <main className="px-[4%] pb-20 pt-10 text-[var(--ink)] sm:pt-14">
      <div className="mx-auto max-w-[1240px] space-y-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Seller · Logistics</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl">Compare delivery routes</h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">See what changes when a return goes straight to the buyer.</p>
          </div>
          <Link
            href="/matches"
            className="inline-flex min-h-11 items-center gap-2 border-b border-[var(--ink)] text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--olive)] hover:text-[var(--olive)]"
          >
            <span aria-hidden="true">←</span> Matches
          </Link>
        </header>

        <Suspense fallback={<p role="status" className="border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">Loading route comparison…</p>}>
          <RouteContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
