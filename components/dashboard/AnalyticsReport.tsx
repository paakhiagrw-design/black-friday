import type { AnalyticsReport as Report } from '@/lib/dashboard/queries';
import { formatDay, formatEmissions, formatEuro, formatInteger, ui } from './format';

function SavingsTrend({ daily }: { daily: Report['daily'] }) {
  const total = daily.reduce((sum, day) => sum + day.savedCents, 0);
  const completions = daily.reduce((sum, day) => sum + day.completedReroutes, 0);
  const emissionsSaved = daily.reduce((sum, day) => sum + day.co2SavedKg, 0);
  const max = Math.max(0, ...daily.map((day) => day.savedCents));
  const min = Math.min(0, ...daily.map((day) => day.savedCents));
  const range = max - min || 1;

  return (
    <section aria-labelledby="savings-trend-heading" className={ui.card}>
      <p className={ui.eyebrow}>History</p>
      <h2 id="savings-trend-heading" className={ui.heading}>Daily savings</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Last {daily.length} days · completed reroutes</p>
      {completions === 0 ? (
        <p className={ui.empty}>
          No reroutes were completed in this period.
        </p>
      ) : (
        <>
          <p className="mt-5 text-4xl font-semibold tracking-[-0.05em] tabular-nums text-[var(--ink)]">{formatEuro(total)}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{formatEmissions(emissionsSaved)} avoided (est.)</p>
          <div aria-hidden="true" className="relative mt-4 h-32">
            <span className="absolute inset-x-0 border-t border-[var(--line)]" style={{ bottom: `${-min / range * 100}%` }} />
            <div className="absolute inset-0 grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}>
              {daily.map(({ day, savedCents }) => (
                <div key={day} className="relative">
                  <span
                    title={`${formatDay(new Date(day))} · ${formatEuro(savedCents)}`}
                    className={`absolute inset-x-0 min-h-px ${savedCents < 0 ? 'bg-[var(--danger)]' : 'bg-[var(--olive)]'}`}
                    style={{
                      height: `${Math.abs(savedCents) / range * 100}%`,
                      bottom: `${(Math.min(savedCents, 0) - min) / range * 100}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
            <span>{formatDay(new Date(daily[0].day))}</span>
            <span>{formatDay(new Date(daily[daily.length - 1].day))}</span>
          </div>
          <details className="mt-6 border-t border-[var(--line)] pt-4 text-sm">
            <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--olive)]">View daily figures</summary>
            <table aria-label="Daily savings figures" className="mt-2 w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
                  <th scope="col" className="py-2 font-medium">Date</th>
                  <th scope="col" className="py-2 text-right font-medium">Reroutes</th>
                  <th scope="col" className="py-2 text-right font-medium">Savings</th>
                  <th scope="col" className="py-2 text-right font-medium">CO₂e (est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] tabular-nums">
                {daily.map(({ day, savedCents, completedReroutes, co2SavedKg }) => (
                  <tr key={day}>
                    <th scope="row" className="py-2 font-medium">{formatDay(new Date(day))}</th>
                    <td className="py-2 text-right">{formatInteger(completedReroutes)}</td>
                    <td className="py-2 text-right">{formatEuro(savedCents)}</td>
                    <td className="py-2 text-right">{formatEmissions(co2SavedKg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

function SavingsByProduct({ byProduct, days }: { byProduct: Report['byProduct']; days: number }) {
  return (
    <section aria-labelledby="product-savings-heading" className={ui.card}>
      <p className={ui.eyebrow}>Catalogue</p>
      <h2 id="product-savings-heading" className={ui.heading}>Savings by product</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Last {days} days · completed reroutes</p>
      {byProduct.length === 0 ? (
        <p className={ui.empty}>
          Products appear after their first completed reroute in this period.
        </p>
      ) : (
        <table aria-label="Savings by product" className="mt-3 w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
              <th scope="col" className="py-2 font-medium">Product</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Reroutes</th>
              <th scope="col" className="py-2 text-right font-medium">Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {byProduct.map(({ productId, sku, name, savedCents, completedReroutes }) => (
              <tr key={productId}>
                <th scope="row" className="py-2.5 font-medium">
                  {name}<span className="mt-0.5 block text-xs font-normal text-[var(--muted)]">{sku}</span>
                </th>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatInteger(completedReroutes)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-[var(--olive)]">{formatEuro(savedCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function AnalyticsReport({ report }: { report: Report }) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <SavingsTrend daily={report.daily} />
      <SavingsByProduct byProduct={report.byProduct} days={report.daily.length} />
    </div>
  );
}
