import type { CostBreakdown as Costs } from '@/lib/logistics/types';
import { formatCents } from './format';

function Row({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatCents(cents)}</dd>
    </div>
  );
}

export function CostBreakdown({ costs }: { costs: Costs }) {
  return (
    <div className="grid gap-3 text-[13px] sm:grid-cols-2">
      <dl className="space-y-1.5 border border-[var(--line)] bg-[var(--soft)] p-4 text-[var(--ink)]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">Traditional (via warehouse)</p>
        <Row label="Return parcel" cents={costs.returnLegCents} />
        <Row label="Warehouse handling" cents={costs.warehouseHandlingCents} />
        <Row label="Outbound parcel" cents={costs.outboundLegCents} />
        <div className="flex justify-between border-t border-[var(--line)] pt-2 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(costs.traditionalCents)}</dd>
        </div>
      </dl>
      <dl className="space-y-1.5 border border-[var(--good-line)] bg-[var(--good-bg)] p-4 text-[var(--ink)]">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--olive)]">Reroute (local courier)</p>
        <Row label="Courier" cents={costs.courierCents} />
        <Row label="Inspection" cents={costs.inspectionCents} />
        <Row label="Returner reward" cents={costs.rewardCents} />
        <div className="flex justify-between border-t border-[var(--good-line)] pt-2 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(costs.rerouteCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
