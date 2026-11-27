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
  ui,
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
    <div className="grid gap-6">
      <section aria-label="Savings and environmental impact" className="grid grid-cols-2 border-t border-l border-[var(--line)] lg:grid-cols-4">
        {metrics.map(({ label, value, detail }) => (
          <article key={label} className="border-r border-b border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
            <h2 className={ui.eyebrow}>{label}</h2>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)] tabular-nums sm:text-4xl">{value}</p>
            <p className="mt-3 text-xs text-[var(--muted)]">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <section aria-labelledby="reroute-rate-heading" className="flex flex-col bg-[var(--accent)] p-6 text-[var(--on-accent)] sm:p-8">
          <h2 id="reroute-rate-heading" className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-80">Reroute rate</h2>
          <p className="mt-4 text-6xl font-semibold tracking-[-0.06em] tabular-nums">{formatPercent(stats.rerouteRate)}</p>
          <p className="mt-3 mb-8 text-sm opacity-85">Share of verified returns approved for local delivery.</p>
          <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-current/25 pt-5">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] opacity-80">Total returns</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatInteger(stats.totalReturns)}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.1em] opacity-80">Active reroutes</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatInteger(stats.activeReroutes)}</dd>
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
    <main className={ui.page}>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-8 sm:mb-12">
        <div>
          <p className={ui.eyebrow}>Seller workspace · Overview</p>
          <h1 className={ui.pageTitle}>Seller dashboard</h1>
          <p className="mt-4 max-w-xl text-base text-[var(--muted)]">Track returns, local reroutes and their impact.</p>
        </div>
        <nav aria-label="Seller tools" className="flex flex-wrap gap-2">
          {sellerLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={ui.outlineButton}>
              {label}
            </Link>
          ))}
          <Link href="/matches" className={ui.primaryButton}>
            Review matches <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </header>
      <Suspense fallback={<p className={`${ui.card} text-sm text-[var(--muted)]`}>Loading return metrics…</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
