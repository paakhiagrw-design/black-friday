import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AnalyticsReport } from '@/components/dashboard/AnalyticsReport';
import { SavingsSimulator } from '@/components/dashboard/SavingsSimulator';
import { getAnalytics } from '@/lib/dashboard/queries';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Savings Analytics | RIP — Return In Proximity' };

async function CompletedRerouteReport() {
  await connection();
  return <AnalyticsReport report={getAnalytics(db)} />;
}

export default function AnalyticsPage() {
  return (
    <main className="rip-seller min-h-screen bg-slate-50 px-4 py-8 font-sans text-slate-950 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5 sm:mb-9">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Savings Analytics</h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">Plan the financial and environmental impact of local reroutes.</p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700">
            <span aria-hidden="true">←</span> Seller dashboard
          </Link>
        </header>
        <div className="grid gap-5">
          <SavingsSimulator />
          <Suspense fallback={<p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading savings history…</p>}>
            <CompletedRerouteReport />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
