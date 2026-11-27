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
  matchable: { label: 'Matches found', className: 'border-[var(--good-line)] bg-[var(--good-bg)] text-[var(--olive)]' },
  reserved: { label: 'Reroute approved', className: 'border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]' },
  no_match: { label: 'Warehouse fallback', className: 'border-[var(--warn)] bg-[var(--warn-bg)] text-[var(--warn)]' },
  ineligible: { label: 'Not eligible', className: 'border-[var(--line)] bg-[var(--soft)] text-[var(--muted)]' },
};

const routeHref = (returnId: number, buyerOrderId: number) =>
  `/logistics?returnId=${returnId}&buyerOrderId=${buyerOrderId}`;

function EligibleCandidate({ result, c }: { result: ReturnMatchResult; c: MatchCandidate }) {
  const canApprove = result.state === 'matchable';
  const isProposed = result.activeMatch?.status === 'proposed' && result.activeMatch.buyerOrderId === c.buyerOrderId;
  return (
    <li className="border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold tracking-[-0.01em] text-[var(--ink)]">
            #{c.rank} · {c.buyer.name}{' '}
            <span className="text-xs font-normal text-[var(--muted)]">order #{c.buyerOrderId}</span>
            {isProposed && (
              <span className="ml-2 border border-[var(--line)] bg-[var(--soft)] px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--olive)]">Proposed</span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{c.buyer.address}</p>
          <p className="mt-2 text-sm text-[var(--ink)]">
            {formatMiles(c.distanceMiles)} away (straight line) ·{' '}
            <span className="font-semibold text-[var(--olive)]">saves {formatCents(c.costs.savingsCents)}</span> ·{' '}
            {c.route.distanceSavedKm.toFixed(0)} km / {c.route.co2SavedKg.toFixed(1)} kg CO₂e saved (est.)
          </p>
        </div>
        <div className="flex items-center gap-5">
          <Link href={routeHref(result.returnId, c.buyerOrderId)} className="inline-flex min-h-11 items-center border-b border-[var(--ink)] text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--olive)] hover:text-[var(--olive)]">
            View route
          </Link>
          {canApprove && <ApproveButton returnId={result.returnId} buyerOrderId={c.buyerOrderId} />}
        </div>
      </div>
      <div className="mt-4">
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
    <article className="border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Return #{result.returnId}</p>
          <h2 className="mt-1.5 text-2xl font-semibold leading-tight tracking-[-0.04em] text-[var(--ink)]">
            {result.product.name}
          </h2>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            SKU {result.product.sku} · condition {result.condition.replace('_', ' ')} · returned by{' '}
            {result.returner.name} ({result.returner.address})
          </p>
        </div>
        <span className={`border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${badge.className}`}>{badge.label}</span>
      </header>

      {result.state === 'ineligible' && (
        <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
          Not eligible for rerouting: {result.ineligibleReason}.
        </p>
      )}

      {result.state === 'no_match' && (
        <div className="mt-5 border border-[var(--warn)] bg-[var(--warn-bg)] p-4 text-sm text-[var(--warn)]">
          <strong>Recommended: standard warehouse return.</strong> No eligible, profitable local buyer was found.
        </div>
      )}

      {reservedMatch && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-[var(--good-line)] bg-[var(--good-bg)] p-4 text-sm text-[var(--ink)]">
          <span>
            Rerouted to order #{reservedMatch.buyerOrderId} ({reservedMatch.status.replace('_', ' ')}) · saves{' '}
            <strong>{formatCents(reservedMatch.savingsCents)}</strong>
          </span>
          <div className="flex flex-wrap items-center gap-5">
            <Link href={routeHref(result.returnId, reservedMatch.buyerOrderId)} className="inline-flex min-h-11 items-center border-b border-[var(--ink)] text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--olive)] hover:text-[var(--olive)]">
              View route
            </Link>
            {reservedMatch.status === 'accepted' && (
              <Link href="/delivery" className="inline-flex min-h-12 items-center border border-[var(--ink)] px-5 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper)]">
                Arrange collection
              </Link>
            )}
          </div>
        </div>
      )}

      {eligible.length > 0 && result.state !== 'reserved' && (
        <ol className="mt-5 space-y-3">
          {eligible.map((c) => (
            <EligibleCandidate key={c.buyerOrderId} result={result} c={c} />
          ))}
        </ol>
      )}

      {rejected.length > 0 && (
        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Rejected buyers</h3>
          <ul className="mt-2 divide-y divide-[var(--line)] text-sm">
            {rejected.map((c) => (
              <li key={c.buyerOrderId} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="text-[var(--ink)]">
                  {c.buyer.name} <span className="text-xs text-[var(--muted)]">order #{c.buyerOrderId} · {formatMiles(c.distanceMiles)}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  {c.rejections.map((r) => (
                    <span key={r} className="border border-[var(--line)] bg-[var(--soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
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
        <p className="mt-4 text-xs text-[var(--muted)]">No other orders for this SKU.</p>
      )}
    </article>
  );
}
