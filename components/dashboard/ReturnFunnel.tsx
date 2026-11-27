import { formatInteger } from './format';
import type { ReturnFunnelStats } from '@/lib/dashboard/queries';

export function ReturnFunnel({ stats }: { stats: ReturnFunnelStats }) {
  const stages = [
    { label: 'All returns', count: stats.totalReturns, color: 'bg-slate-700' },
    { label: 'Pending verification', count: stats.pendingVerification, color: 'bg-slate-400' },
    { label: 'Awaiting match', count: stats.awaitingMatch, color: 'bg-slate-500' },
    { label: 'Active reroutes', count: stats.activeReroutes, color: 'bg-emerald-500' },
    { label: 'Completed reroutes', count: stats.completedReroutes, color: 'bg-emerald-700' },
  ];

  return (
    <section aria-labelledby="return-funnel-heading" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 id="return-funnel-heading" className="text-lg font-semibold tracking-tight text-slate-950">
        Return status
      </h2>
      {stats.totalReturns === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Return stages will appear once the first return is requested.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {stages.map(({ label, count, color }) => (
            <li key={label} className="grid grid-cols-[minmax(8rem,11rem)_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-slate-700">{label}</span>
              <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100">
                <span
                  className={`block h-full rounded-full ${color}`}
                  style={{ width: `${Math.min(100, count / stats.totalReturns * 100)}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-slate-900">{formatInteger(count)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
