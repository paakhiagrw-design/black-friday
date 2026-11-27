import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { MatchCard } from '@/components/logistics/MatchCard';
import { db } from '@/lib/db';
import { getMatchResults } from '@/lib/logistics/repository';

export const metadata = { title: 'Smart matches | RIP — Return In Proximity' };

async function MatchList() {
  await connection();
  const results = getMatchResults(db);
  if (results.length === 0) {
    return (
      <p className="border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">No returns yet.</p>
    );
  }
  return (
    <div className="space-y-6">
      {results.map((result) => (
        <MatchCard key={result.returnId} result={result} />
      ))}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <main className="px-[4%] pb-20 pt-10 sm:pt-14">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-[var(--line)] pb-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Seller · Return in proximity</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] sm:text-5xl">
              Smart matches
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              Verified returns matched to nearby buyers of the same SKU (within 10 miles), ranked by savings.
              Distances are straight-line; road costs are estimates.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center border-b border-[var(--ink)] text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--olive)] hover:text-[var(--olive)]"
          >
            ← Dashboard
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading matches…</p>}>
          <MatchList />
        </Suspense>
      </div>
    </main>
  );
}
