const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

export const formatCents = (cents: number) => euro.format(cents / 100);
export const formatMiles = (miles: number) => `${miles.toFixed(1)} mi`;
