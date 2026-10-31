
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HISTORY_KEY = '@shopping_history_v1';

export type PurchasedItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type ShoppingTrip = {
  id: string;
  date: string;
  items: PurchasedItem[];
  total: number;
};

export async function getShoppingHistory(): Promise<ShoppingTrip[]> {
  const saved = await AsyncStorage.getItem(HISTORY_KEY);
  return saved ? JSON.parse(saved) : [];
}

export async function saveShoppingTrip(
  items: PurchasedItem[]
): Promise<ShoppingTrip> {
  if (items.length === 0) {
    throw new Error('No purchased items to save');
  }

  const trip: ShoppingTrip = {
    id: `${Date.now()}-${Math.random()}`,
    date: new Date().toISOString(),
    items,
    total: items.reduce(
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
