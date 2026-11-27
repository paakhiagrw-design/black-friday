import { kmToMiles } from '@/lib/logistics/geo';

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const number = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en-IE');
const percent = new Intl.NumberFormat('en-IE', { style: 'percent', maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export const formatEuro = (cents: number) => eur.format(cents / 100);
export const formatNumber = (value: number) => number.format(value);
export const formatInteger = (value: number) => integer.format(value);
export const formatPercent = (share: number) => percent.format(share);
export const formatMiles = (km: number) => `${formatNumber(kmToMiles(km))} mi`;
export const formatEmissions = (kg: number) => `${formatNumber(kg)} kg CO₂e`;
export const formatDay = (date: Date) => shortDate.format(date);

/* Shared RIP store-language class names for seller pages (tokens come from seller-theme.css). */
export const ui = {
  page: 'mx-auto w-full max-w-[1440px] px-[4%] pt-10 pb-20 font-sans text-[var(--ink)] sm:pt-14',
  eyebrow: 'text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]',
  pageTitle: 'mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl',
  heading: 'mt-2 text-2xl font-semibold leading-tight tracking-[-0.04em] text-[var(--ink)]',
  card: 'border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8',
  empty: 'mt-5 border border-dashed border-[var(--line)] bg-[var(--paper)] p-4 text-sm text-[var(--muted)]',
  primaryButton:
    'inline-flex min-h-12 items-center justify-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-110',
  outlineButton:
    'inline-flex min-h-12 items-center justify-center gap-2 border border-[var(--ink)] bg-transparent px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--ink)] hover:text-[var(--paper)]',
} as const;
