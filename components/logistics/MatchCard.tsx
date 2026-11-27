import Link from 'next/link';
import {
  REJECTION_LABELS,
  type MatchCandidate,
  type ReturnMatchResult,
  type ReturnMatchState,
} from '@/lib/logistics/types';
import { ApproveButton } from './ApproveButton';
import { CostBreakdown } from './CostBreakdown';
import { formatCents, formatMiles } from './format';

const STATE_BADGE: Record<ReturnMatchState, { label: string; className: string }> = {
  matchable: { label: 'Matches found', className: 'bg-emerald-100 text-emerald-800' },
  reserved: { label: 'Reroute approved', className: 'bg-sky-100 text-sky-800' },
  no_match: { label: 'Warehouse fallback', className: 'bg-amber-100 text-amber-800' },
  ineligible: { label: 'Not eligible', className: 'bg-neutral-200 text-neutral-700' },
};

const routeHref = (returnId: number, buyerOrderId: number) =>
  `/logistics?returnId=${returnId}&buyerOrderId=${buyerOrderId}`;

function EligibleCandidate({ result, c }: { result: ReturnMatchResult; c: MatchCandidate }) {
  const canApprove = result.state === 'matchable';
  const isProposed = result.activeMatch?.status === 'proposed' && result.activeMatch.buyerOrderId === c.buyerOrderId;
  return (
    <li className="rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">
            #{c.rank} · {c.buyer.name}{' '}
            <span className="text-xs font-normal text-neutral-500">order #{c.buyerOrderId}</span>
            {isProposed && (
              <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Proposed</span>
            )}
          </p>
          <p className="text-xs text-neutral-500">{c.buyer.address}</p>
          <p className="mt-1 text-sm text-neutral-700">
            {formatMiles(c.distanceMiles)} away (straight line) ·{' '}
            <span className="font-semibold text-emerald-700">saves {formatCents(c.costs.savingsCents)}</span> ·{' '}
            {c.route.distanceSavedKm.toFixed(0)} km / {c.route.co2SavedKg.toFixed(1)} kg CO₂e saved (est.)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={routeHref(result.returnId, c.buyerOrderId)} className="text-sm text-sky-700 hover:underline">
            View route
          </Link>
          {canApprove && <ApproveButton returnId={result.returnId} buyerOrderId={c.buyerOrderId} />}
        </div>
      </div>
      <div className="mt-3">
        <CostBreakdown costs={c.costs} />
      </div>
    </li>
  );
}

export function MatchCard({ result }: { result: ReturnMatchResult }) {
  const badge = STATE_BADGE[result.state];
  const eligible = result.candidates.filter((c) => c.eligible);
  const rejected = result.candidates.filter((c) => !c.eligible);
  const reservedMatch =
    result.state === 'reserved' && result.activeMatch ? result.activeMatch : null;

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Return #{result.returnId} · {result.product.name}
          </h2>
          <p className="text-sm text-neutral-600">
            SKU {result.product.sku} · condition {result.condition.replace('_', ' ')} · returned by{' '}
            {result.returner.name} ({result.returner.address})
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
      </header>

      {result.state === 'ineligible' && (
        <p className="mt-4 text-sm text-neutral-600">
          Not eligible for rerouting: {result.ineligibleReason}.
        </p>
      )}

      {result.state === 'no_match' && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Recommended: standard warehouse return.</strong> No eligible, profitable local buyer was found.
        </div>
      )}

      {reservedMatch && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <span>
            Rerouted to order #{reservedMatch.buyerOrderId} ({reservedMatch.status.replace('_', ' ')}) · saves{' '}
            <strong>{formatCents(reservedMatch.savingsCents)}</strong>
          </span>
          <Link href={routeHref(result.returnId, reservedMatch.buyerOrderId)} className="text-sky-700 hover:underline">
            View route
          </Link>
        </div>
      )}

      {eligible.length > 0 && result.state !== 'reserved' && (
        <ol className="mt-4 space-y-3">
          {eligible.map((c) => (
            <EligibleCandidate key={c.buyerOrderId} result={result} c={c} />
          ))}
        </ol>
      )}

      {rejected.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rejected buyers</h3>
          <ul className="mt-2 divide-y divide-neutral-100 text-sm">
            {rejected.map((c) => (
              <li key={c.buyerOrderId} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-neutral-800">
                  {c.buyer.name} <span className="text-xs text-neutral-500">order #{c.buyerOrderId} · {formatMiles(c.distanceMiles)}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {c.rejections.map((r) => (
                    <span key={r} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">
                      {REJECTION_LABELS[r]}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.state !== 'ineligible' && result.candidates.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500">No other orders for this SKU.</p>
      )}
    </article>
  );
}
