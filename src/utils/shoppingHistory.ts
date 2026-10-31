
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HISTORY_KEY = '@shopping_history_v1';

export type PurchasedItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
};

export type ShoppingTrip = {
  id: string;
  date: string;
  items: PurchasedItem[];
  total: number;
};

export async function getShoppingHistory(): Promise<ShoppingTrip[]> {
  const saved = await AsyncStorage.getItem(HISTORY_KEY);

  if (!saved) return [];

  const parsed: ShoppingTrip[] = JSON.parse(saved);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid shopping history data');
  }

  return parsed.map(trip => ({
    ...trip,
    items: (trip.items || []).map(item => ({
      ...item,
      quantity: item.quantity ?? 1,
      category: item.category || 'Other',
    })),
  }));
}

export async function saveShoppingTrip(
  items: PurchasedItem[]
): Promise<ShoppingTrip> {
  if (items.length === 0) {
    throw new Error('No purchased items to save');
  }

  const normalizedItems = items.map(item => ({
    ...item,
    quantity: item.quantity ?? 1,
    category: item.category || 'Other',
  }));

  const trip: ShoppingTrip = {
    id: `${Date.now()}-${Math.random()}`,
    date: new Date().toISOString(),
    items: normalizedItems,
    total: normalizedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ),
  };

  const history = await getShoppingHistory();

  await AsyncStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([trip, ...history])
  );

  return trip;
}
