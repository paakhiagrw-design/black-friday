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
