import type { DashboardStats } from '@/lib/logistics/types';
import { formatDay, ui } from './format';

function getActivityDate(value: string) {
  const sqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  return new Date(sqliteTimestamp.test(value) ? `${value.replace(' ', 'T')}Z` : value);
}

export function RecentActivity({ recent }: { recent: DashboardStats['recent'] }) {
  return (
    <section aria-labelledby="activity-heading" className={ui.card}>
      <p className={ui.eyebrow}>Latest updates</p>
      <h2 id="activity-heading" className={ui.heading}>Recent activity</h2>
      {recent.length === 0 ? (
        <p className={ui.empty}>
          Return requests and reroutes will appear here as activity comes in.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {recent.map(({ at, kind, text }, index) => {
            const date = getActivityDate(at);
            const isReturn = kind === 'return_requested';
            return (
              <li key={`${at}-${kind}-${index}`} className="flex items-start gap-4 py-4 text-sm">
                <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 ${isReturn ? 'border border-[var(--muted)]' : 'bg-[var(--olive)]'}`} />
                <span className="flex-1 text-[var(--ink)]">{text}</span>
                {Number.isFinite(date.getTime()) && (
                  <time dateTime={date.toISOString()} className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-[var(--muted)] tabular-nums">{formatDay(date)}</time>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
