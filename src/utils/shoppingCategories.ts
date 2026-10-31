
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CATEGORIES_KEY = '@shopping_categories_v1';
export const ITEMS_KEY = '@shopping_items_v2';
export const OLD_ITEMS_KEY = '@shopping_items';

export type Category = {
  id: string;
  name: string;
  icon: string;
  background: string;
  accent: string;
};

export const PALETTE = [
  { background: '#EAF5FF', accent: '#2674BD' },
  { background: '#FFF0EC', accent: '#C35D4B' },
  { background: '#EDF7EB', accent: '#38854A' },
  { background: '#FFF5DE', accent: '#BA852B' },
  { background: '#F2EDFF', accent: '#8057C5' },
  { background: '#FCECF4', accent: '#BC578B' },
] as const;

export const ICON_OPTIONS = [
  'basket-outline',
  'cart-outline',
  'nutrition-outline',
  'cafe-outline',
  'fish-outline',
  'restaurant-outline',
  'fast-food-outline',
  'home-outline',
  'shirt-outline',
  'gift-outline',
  'medkit-outline',
  'leaf-outline',
  'water-outline',
  'ice-cream-outline',
  'bag-outline',
  'flower-outline',
] as const;

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'dairy',
    name: 'Dairy',
    icon: 'water-outline',
    ...PALETTE[0],
  },
  {
    id: 'meat',
    name: 'Meat',
    icon: 'restaurant-outline',
    ...PALETTE[1],
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    icon: 'leaf-outline',
    ...PALETTE[2],
  },
  {
    id: 'household',
    name: 'Household',
    icon: 'home-outline',
    ...PALETTE[3],
  },
  {
    id: 'fruit',
    name: 'Fruit',
    icon: 'nutrition-outline',
    ...PALETTE[4],
  },
  {
    id: 'bakery',
    name: 'Bakery',
    icon: 'fast-food-outline',
    ...PALETTE[3],
  },
  {
    id: 'frozen',
    name: 'Frozen',
    icon: 'snow-outline',
    ...PALETTE[0],
  },
  {
    id: 'drinks',
    name: 'Drinks',
    icon: 'cafe-outline',
    ...PALETTE[5],
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'basket-outline',
    ...PALETTE[4],
  },
];

export function categoryByName(
  categories: Category[],
  name?: string
): Category {
  return (
    categories.find(
      category =>
        category.name.toLowerCase() ===
        (name || '').toLowerCase()
    ) ||
    categories.find(category => category.id === 'other') ||
    DEFAULT_CATEGORIES[8]
  );
}

export async function getCategories(): Promise<Category[]> {
  const saved = await AsyncStorage.getItem(CATEGORIES_KEY);

  if (!saved) {
    return DEFAULT_CATEGORIES.map(category => ({ ...category }));
  }

  const parsed: Category[] = JSON.parse(saved);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid saved categories');
  }

  // Keep the fallback category available.
  if (!parsed.some(category => category.id === 'other')) {
    parsed.push({ ...DEFAULT_CATEGORIES[8] });
  }

  return parsed;
}

export async function saveCategories(
  categories: Category[]
): Promise<void> {
  await AsyncStorage.setItem(
    CATEGORIES_KEY,
    JSON.stringify(categories)
  );
}

// Read shopping items without losing existing data.
export async function readShoppingItems(): Promise<any[]> {
  const [current, previous] = await Promise.all([
    AsyncStorage.getItem(ITEMS_KEY),
    AsyncStorage.getItem(OLD_ITEMS_KEY),
  ]);

  const parsed = JSON.parse(current ?? previous ?? '[]');

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid saved shopping items');
  }

  return parsed;
}

// Rename/delete a category without deleting shopping items.
export async function reassignItemCategory(
  oldName: string,
  newName: string
): Promise<void> {
  const items = await readShoppingItems();

  const updated = items.map(item => ({
    ...item,
    category:
      typeof item.category === 'string' &&
      item.category.toLowerCase() === oldName.toLowerCase()
        ? newName
        : item.category,
  }));

  await AsyncStorage.setItem(
    ITEMS_KEY,
    JSON.stringify(updated)
  );
}
