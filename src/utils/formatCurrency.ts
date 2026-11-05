export function formatCurrency(
  amount: number,
  currency: string = 'GBP'
): string {
  if (!Number.isFinite(amount)) {
    return 'Invalid amount';
  }

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
