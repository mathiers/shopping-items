/** Display-only money formatter. Stored amounts remain numeric. */
export function formatMoney(amount: number, currency = 'GBP'): string {
  const symbols: Record<string, string> = {
    GBP: '£', USD: '$', EUR: '€', ZAR: 'R', ZWL: 'Z$',
    CAD: 'C$', AUD: 'A$', INR: '₹', NGN: '₦', JPY: '¥',
  };
  const symbol = symbols[currency.toUpperCase()] ?? currency.toUpperCase();
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = safeAmount.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
  return `${symbol} ${formatted}`;
}
