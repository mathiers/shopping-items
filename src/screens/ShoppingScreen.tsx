
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  purchased: boolean;
};

const STORAGE_KEY = '@shopping_items_v2';
const BUDGET_KEY = '@shopping_budget';

export default function App() {
  const [budget, setBudget] = useState('100');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved shopping data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Read old storage key too, so existing items are retained
        const savedItems =
          (await AsyncStorage.getItem(STORAGE_KEY)) ??
          (await AsyncStorage.getItem('@shopping_items'));

        const savedBudget =
          await AsyncStorage.getItem(BUDGET_KEY);

        if (savedItems !== null) {
          const parsed: ShoppingItem[] = JSON.parse(savedItems);

          setItems(
            parsed.map(item => ({
              ...item,
              quantity: item.quantity ?? 1,
            }))
          );
        }

        if (savedBudget !== null) {
          setBudget(savedBudget);
        }
      } catch (error) {
        console.error('Loading failed:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Save changes automatically
  useEffect(() => {
    if (!isLoaded) return;

    const saveData = async () => {
      try {
        await AsyncStorage.multiSet([
          [STORAGE_KEY, JSON.stringify(items)],
          [BUDGET_KEY, budget],
        ]);
      } catch (error) {
        console.error('Saving failed:', error);
      }
    };

    saveData();
  }, [items, budget, isLoaded]);

  const spent = items
    .filter(item => item.purchased)
    .reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

  const planned = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const budgetAmount = Number(budget) || 0;
  const remaining = budgetAmount - spent;
  const progress =
    budgetAmount > 0
      ? Math.min((spent / budgetAmount) * 100, 100)
      : 0;

  const addItem = () => {
    const price = Number(itemPrice);
    const quantity = Number(itemQuantity);

    if (
      !itemName.trim() ||
      !itemPrice.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      Alert.alert(
        'Invalid item',
        'Enter a name, valid price and quantity.'
      );
      return;
    }

    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: itemName.trim(),
      price,
      quantity,
      purchased: false,
    };

    setItems(previous => [...previous, newItem]);
    setItemName('');
    setItemPrice('');
    setItemQuantity('1');
  };

  const togglePurchased = (id: string) => {
    setItems(previous =>
      previous.map(item =>
        item.id === id
          ? { ...item, purchased: !item.purchased }
          : item
      )
    );
  };

  const deleteItem = (id: string) => {
    setItems(previous =>
      previous.filter(item => item.id !== id)
    );
  };

  const money = (amount: number) => `£${amount.toFixed(2)}`;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>🛒 Shopping Items</Text>
            <Text style={styles.subtitle}>
              Shop smarter. Stay on budget.
            </Text>

            <View style={styles.budgetCard}>
              <Text style={styles.label}>Shopping Budget (£)</Text>

              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
              />

              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>Spent</Text>
                  <Text style={styles.amount}>
                    {money(spent)}
                  </Text>
                </View>

                <View>
                  <Text style={styles.summaryLabel}>Remaining</Text>
                  <Text
                    style={[
                      styles.amount,
                      remaining < 0 && styles.overBudget,
                    ]}
                  >
                    {money(remaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor:
                        remaining < 0 ? '#dc2626' : '#16a34a',
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {budgetAmount > 0
                  ? Math.round((spent / budgetAmount) * 100)
                  : 0}
                % of budget spent
              </Text>

              {remaining < 0 && (
                <Text style={styles.warning}>
                  ⚠️ You have exceeded your budget!
                </Text>
              )}

              <Text style={styles.plannedText}>
                Planned shopping total: {money(planned)}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Add Shopping Item
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Item name e.g. Milk"
              value={itemName}
              onChangeText={setItemName}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Unit price"
                keyboardType="decimal-pad"
                value={itemPrice}
                onChangeText={setItemPrice}
              />

              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Quantity"
                keyboardType="number-pad"
                value={itemQuantity}
                onChangeText={setItemQuantity}
              />
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={addItem}
            >
              <Text style={styles.addButtonText}>
                + Add Item
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>
              My Shopping List
            </Text>

            <Text style={styles.itemCounter}>
              {items.filter(item => item.purchased).length}
              {' / '}
              {items.length} items purchased
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity
              style={styles.itemDetails}
              onPress={() => togglePurchased(item.id)}
            >
              <Text style={styles.checkbox}>
                {item.purchased ? '☑' : '☐'}
              </Text>

              <Text
                style={[
                  styles.itemName,
                  item.purchased && styles.purchased,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>

            <View style={styles.priceColumn}>
              <Text style={styles.itemPrice}>
                {money(item.price * item.quantity)}
              </Text>
              <Text style={styles.quantityText}>
                {item.quantity} × {money(item.price)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => deleteItem(item.id)}
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Your shopping list is empty.
            Add your first item!
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: StatusBar.currentHeight || 0,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 24,
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 3,
  },
  label: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#344054',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: '#101828',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  summaryLabel: {
    color: '#667085',
    marginBottom: 4,
  },
  amount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#16834a',
  },
  overBudget: {
    color: '#dc2626',
  },
  progressBackground: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#667085',
  },
  warning: {
    color: '#dc2626',
    marginTop: 12,
    fontWeight: '600',
  },
  plannedText: {
    marginTop: 15,
    fontWeight: '600',
    color: '#344054',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 14,
    color: '#153c2e',
  },
  addButton: {
    backgroundColor: '#16834a',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 26,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemCounter: {
    color: '#667085',
    marginBottom: 12,
  },
  itemRow: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  itemDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    fontSize: 24,
    marginRight: 10,
    color: '#16834a',
  },
  itemName: {
    fontSize: 16,
    flexShrink: 1,
    color: '#101828',
  },
  purchased: {
    textDecorationLine: 'line-through',
    color: '#98a2b3',
  },
  priceColumn: {
    alignItems: 'flex-end',
    marginHorizontal: 10,
  },
  itemPrice: {
    fontWeight: 'bold',
    color: '#344054',
  },
  quantityText: {
    fontSize: 11,
    color: '#667085',
    marginTop: 3,
  },
  deleteText: {
    color: '#dc2626',
    fontSize: 20,
    paddingHorizontal: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#98a2b3',
    marginTop: 25,
  },
});
