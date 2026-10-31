
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CURRENCY_KEY = '@shopping_currency';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'A$',
  ZAR: 'R',
  ZWG: 'ZiG ',
};

export async function getCurrency(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(CURRENCY_KEY)) || 'GBP';
  } catch {
    return 'GBP';
  }
}

export function formatMoney(
  amount: number,
  currency: string = 'GBP'
): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '£';
  const value = Number.isFinite(amount) ? amount : 0;

  return `${symbol}${value.toFixed(2)}`;
}
