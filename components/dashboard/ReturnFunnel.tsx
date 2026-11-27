import { formatInteger, ui } from './format';
import type { ReturnFunnelStats } from '@/lib/dashboard/queries';

export function ReturnFunnel({ stats }: { stats: ReturnFunnelStats }) {
  const stages = [
    { label: 'All returns', count: stats.totalReturns, color: 'bg-[var(--ink)]' },
    { label: 'Pending verification', count: stats.pendingVerification, color: 'bg-[var(--muted)] opacity-60' },
    { label: 'Awaiting match', count: stats.awaitingMatch, color: 'bg-[var(--muted)]' },
    { label: 'Active reroutes', count: stats.activeReroutes, color: 'bg-[var(--olive)] opacity-70' },
    { label: 'Completed reroutes', count: stats.completedReroutes, color: 'bg-[var(--olive)]' },
  ];

  return (
    <section aria-labelledby="return-funnel-heading" className={ui.card}>
      <p className={ui.eyebrow}>Pipeline</p>
      <h2 id="return-funnel-heading" className={ui.heading}>
        Return status
      </h2>
      {stats.totalReturns === 0 ? (
        <p className={ui.empty}>
          Return stages will appear once the first return is requested.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {stages.map(({ label, count, color }) => (
            <li key={label} className="grid grid-cols-[minmax(8rem,11rem)_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-[var(--ink)]">{label}</span>
              <span aria-hidden="true" className="h-2.5 overflow-hidden bg-[var(--soft)] outline outline-1 -outline-offset-1 outline-[var(--line)]">
                <span
                  className={`block h-full ${color}`}
                  style={{ width: `${Math.min(100, count / stats.totalReturns * 100)}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-[var(--ink)]">{formatInteger(count)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
