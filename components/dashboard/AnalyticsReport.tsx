import type { AnalyticsReport as Report } from '@/lib/dashboard/queries';
import { formatDay, formatEmissions, formatEuro, formatInteger } from './format';

function SavingsTrend({ daily }: { daily: Report['daily'] }) {
  const total = daily.reduce((sum, day) => sum + day.savedCents, 0);
  const completions = daily.reduce((sum, day) => sum + day.completedReroutes, 0);
  const emissionsSaved = daily.reduce((sum, day) => sum + day.co2SavedKg, 0);
  const max = Math.max(0, ...daily.map((day) => day.savedCents));
  const min = Math.min(0, ...daily.map((day) => day.savedCents));
  const range = max - min || 1;

  return (
    <section aria-labelledby="savings-trend-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="savings-trend-heading" className="text-lg font-semibold tracking-tight">Daily savings</h2>
      <p className="mt-1 text-sm text-slate-600">Last {daily.length} days · completed reroutes</p>
      {completions === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          No reroutes were completed in this period.
        </p>
      ) : (
        <>
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums text-emerald-800">{formatEuro(total)}</p>
          <p className="mt-1 text-sm text-slate-600">{formatEmissions(emissionsSaved)} avoided (est.)</p>
          <div aria-hidden="true" className="relative mt-4 h-32">
            <span className="absolute inset-x-0 border-t border-slate-200" style={{ bottom: `${-min / range * 100}%` }} />
            <div className="absolute inset-0 grid gap-0.5 sm:gap-1" style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}>
              {daily.map(({ day, savedCents }) => (
                <div key={day} className="relative">
                  <span
                    title={`${formatDay(new Date(day))} · ${formatEuro(savedCents)}`}
                    className={`absolute inset-x-0 min-h-px rounded-sm ${savedCents < 0 ? 'bg-slate-600' : 'bg-emerald-600'}`}
                    style={{
                      height: `${Math.abs(savedCents) / range * 100}%`,
                      bottom: `${(Math.min(savedCents, 0) - min) / range * 100}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-slate-600">
            <span>{formatDay(new Date(daily[0].day))}</span>
            <span>{formatDay(new Date(daily[daily.length - 1].day))}</span>
          </div>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-emerald-800">View daily figures</summary>
            <table aria-label="Daily savings figures" className="mt-2 w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-600">
                  <th scope="col" className="py-2 font-medium">Date</th>
                  <th scope="col" className="py-2 text-right font-medium">Reroutes</th>
                  <th scope="col" className="py-2 text-right font-medium">Savings</th>
                  <th scope="col" className="py-2 text-right font-medium">CO₂e (est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
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
    <section aria-labelledby="product-savings-heading" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="product-savings-heading" className="text-lg font-semibold tracking-tight">Savings by product</h2>
      <p className="mt-1 text-sm text-slate-600">Last {days} days · completed reroutes</p>
      {byProduct.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Products appear after their first completed reroute in this period.
        </p>
      ) : (
        <table aria-label="Savings by product" className="mt-3 w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th scope="col" className="py-2 font-medium">Product</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Reroutes</th>
              <th scope="col" className="py-2 text-right font-medium">Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byProduct.map(({ productId, sku, name, savedCents, completedReroutes }) => (
              <tr key={productId}>
                <th scope="row" className="py-2.5 font-medium">
                  {name}<span className="mt-0.5 block text-xs text-slate-600">{sku}</span>
                </th>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatInteger(completedReroutes)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-emerald-800">{formatEuro(savedCents)}</td>
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
