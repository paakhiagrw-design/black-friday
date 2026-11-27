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
    <div className="grid gap-3 text-xs sm:grid-cols-2">
      <dl className="space-y-1 rounded-md bg-slate-100 p-3 text-slate-700">
        <p className="mb-1 font-semibold text-slate-900">Traditional (via warehouse)</p>
        <Row label="Return parcel" cents={costs.returnLegCents} />
        <Row label="Warehouse handling" cents={costs.warehouseHandlingCents} />
        <Row label="Outbound parcel" cents={costs.outboundLegCents} />
        <div className="flex justify-between border-t border-slate-300 pt-1 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(costs.traditionalCents)}</dd>
        </div>
      </dl>
      <dl className="space-y-1 rounded-md bg-emerald-50 p-3 text-emerald-900">
        <p className="mb-1 font-semibold">Reroute (local courier)</p>
        <Row label="Courier" cents={costs.courierCents} />
        <Row label="Inspection" cents={costs.inspectionCents} />
        <Row label="Returner reward" cents={costs.rewardCents} />
        <div className="flex justify-between border-t border-emerald-200 pt-1 font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(costs.rerouteCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
