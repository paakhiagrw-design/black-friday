import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AnalyticsReport } from '@/components/dashboard/AnalyticsReport';
import { SavingsSimulator } from '@/components/dashboard/SavingsSimulator';
import { ui } from '@/components/dashboard/format';
import { getAnalytics } from '@/lib/dashboard/queries';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Savings Analytics | RIP — Return In Proximity' };

async function CompletedRerouteReport() {
  await connection();
  return <AnalyticsReport report={getAnalytics(db)} />;
}

export default function AnalyticsPage() {
  return (
    <main className={ui.page}>
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-8 sm:mb-12">
        <div>
          <p className={ui.eyebrow}>Seller workspace · Analytics</p>
          <h1 className={ui.pageTitle}>Savings analytics</h1>
          <p className="mt-4 max-w-xl text-base text-[var(--muted)]">Plan the financial and environmental impact of local reroutes.</p>
        </div>
        <Link href="/dashboard" className={ui.outlineButton}>
          <span aria-hidden="true">←</span> Seller dashboard
        </Link>
      </header>
      <div className="grid gap-6">
        <SavingsSimulator />
        <Suspense fallback={<p className={`${ui.card} text-sm text-[var(--muted)]`}>Loading savings history…</p>}>
          <CompletedRerouteReport />
        </Suspense>
      </div>
    </main>
  );
}
