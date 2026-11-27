import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ReturnFunnel } from '@/components/dashboard/ReturnFunnel';
import {
  formatEmissions,
  formatEuro,
  formatInteger,
  formatMiles,
  formatPercent,
} from '@/components/dashboard/format';
import { getDashboardStats } from '@/lib/dashboard/queries';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Seller Dashboard | RIP — Return In Proximity' };

const sellerLinks = [
  { href: '/verification', label: 'Verify returns' },
  { href: '/delivery', label: 'Manage deliveries' },
  { href: '/analytics', label: 'View analytics' },
] as const;

async function DashboardContent() {
  await connection();
  const stats = getDashboardStats(db);

  const metrics = [
    { label: 'Realised savings', value: formatEuro(stats.savedCents), detail: 'From completed reroutes' },
    { label: 'Committed savings', value: formatEuro(stats.committedSavingsCents), detail: 'Reserved or in transit' },
    { label: 'Distance saved', value: formatMiles(stats.distanceSavedKm), detail: 'Est. · completed reroutes' },
    { label: 'Emissions avoided', value: formatEmissions(stats.co2SavedKg), detail: 'Est. · completed reroutes' },
  ];

  return (
    <div className="grid gap-5">
      <section aria-label="Savings and environmental impact" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {metrics.map(({ label, value, detail }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-sm font-medium text-slate-700">{label}</h2>
            <p className="mt-2 text-xl font-semibold tracking-tight text-emerald-800 tabular-nums sm:text-3xl">{value}</p>
            <p className="mt-2 text-xs text-slate-600">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="reroute-rate-heading" className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <h2 id="reroute-rate-heading" className="text-sm font-medium text-slate-200">Reroute rate</h2>
          <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">{formatPercent(stats.rerouteRate)}</p>
          <p className="mt-3 text-sm text-slate-300">Share of verified returns approved for local delivery.</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-700 pt-5">
            <div>
              <dt className="text-xs text-slate-300">Total returns</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatInteger(stats.totalReturns)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-300">Active reroutes</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{formatInteger(stats.activeReroutes)}</dd>
            </div>
          </dl>
        </section>
        <ReturnFunnel stats={stats} />
      </div>
      <RecentActivity recent={stats.recent} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5 sm:mb-9">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Seller Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">Track returns, local reroutes and their impact.</p>
          </div>
          <nav aria-label="Seller tools" className="flex flex-wrap gap-2">
            {sellerLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
                {label}
              </Link>
            ))}
            <Link href="/matches" className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
              Review matches <span aria-hidden="true">→</span>
            </Link>
          </nav>
        </header>
        <Suspense fallback={<p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading return metrics…</p>}>
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}
