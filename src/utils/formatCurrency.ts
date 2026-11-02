
export function formatCurrency(
  amount: number | string,
  currency: string = 'GBP'
): string {
  const value = Number(amount);

  const symbols: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    ZAR: 'R',
    ZWL: 'Z$',
    CAD: 'C$',
    AUD: 'A$',
    INR: '₹',
    NGN: '₦',
    JPY: '¥',
  };

  const symbol = symbols[currency] ?? currency;

  const formattedAmount = (
    Number.isFinite(value) ? value : 0
  ).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formattedAmount}`;
}
