import type { DashboardStats } from '@/lib/logistics/types';
import { formatDay } from './format';

function getActivityDate(value: string) {
  const sqliteTimestamp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  return new Date(sqliteTimestamp.test(value) ? `${value.replace(' ', 'T')}Z` : value);
}

export function RecentActivity({ recent }: { recent: DashboardStats['recent'] }) {
  return (
    <section aria-labelledby="activity-heading" className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 id="activity-heading" className="text-lg font-semibold tracking-tight text-slate-950">Recent activity</h2>
      {recent.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Return requests and reroutes will appear here as activity comes in.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {recent.map(({ at, kind, text }, index) => {
            const date = getActivityDate(at);
            const isReturn = kind === 'return_requested';
            return (
              <li key={`${at}-${kind}-${index}`} className="flex items-start gap-3 py-3 text-sm">
                <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${isReturn ? 'bg-slate-400' : 'bg-emerald-600'}`} />
                <span className="flex-1 text-slate-800">{text}</span>
                {Number.isFinite(date.getTime()) && (
                  <time dateTime={date.toISOString()} className="shrink-0 text-xs text-slate-600">{formatDay(date)}</time>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
