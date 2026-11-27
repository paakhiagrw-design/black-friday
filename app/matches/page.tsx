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
    return <p className="text-sm text-neutral-600">No returns yet.</p>;
  }
  return (
    <div className="space-y-5">
      {results.map((result) => (
        <MatchCard key={result.returnId} result={result} />
      ))}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <main className="rip-seller min-h-screen bg-neutral-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Smart matches</h1>
            <p className="text-sm text-neutral-600">
              Verified returns matched to nearby buyers of the same SKU (within 10 miles), ranked by savings.
              Distances are straight-line; road costs are estimates.
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-sky-700 hover:underline">
            ← Dashboard
          </Link>
        </div>
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading matches…</p>}>
          <MatchList />
        </Suspense>
      </div>
    </main>
  );
}
