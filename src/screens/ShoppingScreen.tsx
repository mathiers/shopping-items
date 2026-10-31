
import React, { useEffect, useRef, useState } from 'react';
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
import { saveShoppingTrip } from '../utils/shoppingHistory';

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  purchased: boolean;
};

const STORAGE_KEY = '@shopping_items_v2';
const OLD_STORAGE_KEY = '@shopping_items';
const BUDGET_KEY = '@shopping_budget';

export default function ShoppingScreen() {
  const [budget, setBudget] = useState('100');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [finishingTrip, setFinishingTrip] = useState(false);

  // Prevent automatic saves from racing with Finish Trip.
  const finishingRef = useRef(false);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [currentItems, oldItems, savedBudget] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(OLD_STORAGE_KEY),
            AsyncStorage.getItem(BUDGET_KEY),
          ]);

        if (!mounted) return;

        const savedItems = currentItems ?? oldItems;

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
        console.error('Failed to load shopping data:', error);
        Alert.alert(
          'Loading error',
          'Your saved shopping list could not be loaded.'
        );
      } finally {
        if (mounted) setIsLoaded(true);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // Serialize list writes so an older save cannot overwrite
  // the completed trip's cleared shopping list.
  useEffect(() => {
    if (!isLoaded || finishingRef.current) return;

    const nextItems = JSON.stringify(items);

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (finishingRef.current) return;
        await AsyncStorage.setItem(STORAGE_KEY, nextItems);
      })
      .catch(error => {
        console.error('Failed to save shopping items:', error);
      });
  }, [items, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem(BUDGET_KEY, budget).catch(error => {
      console.error('Failed to save budget:', error);
    });
  }, [budget, isLoaded]);

  const money = (amount: number) => `£${amount.toFixed(2)}`;

  const spent = items
    .filter(item => item.purchased)
    .reduce(
      (total, item) =>
        total + item.price * (item.quantity ?? 1),
      0
    );

  const planned = items.reduce(
    (total, item) =>
      total + item.price * (item.quantity ?? 1),
    0
  );

  const purchasedCount =
    items.filter(item => item.purchased).length;

  const budgetAmount = Number(budget) || 0;
  const remaining = budgetAmount - spent;

  const percentage =
    budgetAmount > 0
      ? Math.round((spent / budgetAmount) * 100)
      : 0;

  const progress = Math.min(
    Math.max(percentage, 0),
    100
  );

  const addItem = () => {
    if (finishingRef.current) return;

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
        'Enter an item name, a positive price and a whole-number quantity.'
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
    if (finishingRef.current) return;

    setItems(previous =>
      previous.map(item =>
        item.id === id
          ? { ...item, purchased: !item.purchased }
          : item
      )
    );
  };

  const deleteItem = (id: string) => {
    if (finishingRef.current) return;

    setItems(previous =>
      previous.filter(item => item.id !== id)
    );
  };

  const finishTrip = () => {
    if (finishingRef.current) return;

    const purchasedItems = items.filter(
      item => item.purchased
    );

    if (purchasedItems.length === 0) {
      Alert.alert(
        'Nothing purchased',
        'Tick at least one item before finishing your trip.'
      );
      return;
    }

    Alert.alert(
      'Finish shopping trip?',
      'Purchased items will be saved to History and removed from your current list. Unpurchased items will stay.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Finish Trip',
          onPress: async () => {
            if (finishingRef.current) return;

            finishingRef.current = true;
            setFinishingTrip(true);

            const remainingItems = items.filter(
              item => !item.purchased
            );

            try {
              // Wait for any previously queued list saves.
              await saveQueue.current;

              // Save the receipt before clearing purchases.
              await saveShoppingTrip(
                purchasedItems.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity ?? 1,
                }))
              );

              // Clear purchased items from persistent storage.
              await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(remainingItems)
              );

              setItems(remainingItems);

              Alert.alert(
                'Trip saved!',
                'Your purchased items are now in Shopping History.'
              );
            } catch (error) {
              console.error('Finish trip error:', error);
              Alert.alert(
                'Save failed',
                'The trip could not be completed. Check your History before trying again.'
              );
            } finally {
              finishingRef.current = false;
              setFinishingTrip(false);
            }
          },
        },
      ]
    );
  };

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
            <Text style={styles.title}>
              🛒 Shopping Items
            </Text>

            <Text style={styles.subtitle}>
              Shop smarter. Stay on budget.
            </Text>

            <View style={styles.budgetCard}>
              <Text style={styles.label}>
                Shopping Budget (£)
              </Text>

              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
                placeholder="Enter budget"
                editable={!finishingTrip}
              />

              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>
                    Spent
                  </Text>
                  <Text style={styles.amount}>
                    {money(spent)}
                  </Text>
                </View>

                <View>
                  <Text style={styles.summaryLabel}>
                    Remaining
                  </Text>
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
                        remaining < 0
                          ? '#dc2626'
                          : '#16a34a',
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {percentage}% of budget spent
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
              editable={!finishingTrip}
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Unit price"
                keyboardType="decimal-pad"
                value={itemPrice}
                onChangeText={setItemPrice}
                editable={!finishingTrip}
              />

              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Quantity"
                keyboardType="number-pad"
                value={itemQuantity}
                onChangeText={setItemQuantity}
                editable={!finishingTrip}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                finishingTrip && styles.disabledButton,
              ]}
              onPress={addItem}
              disabled={finishingTrip || !isLoaded}
            >
              <Text style={styles.addButtonText}>
                + Add Item
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>
              My Shopping List
            </Text>

            <Text style={styles.itemCounter}>
              {purchasedCount} / {items.length}
              {' '}items purchased
            </Text>

            <TouchableOpacity
              style={[
                styles.finishButton,
                (finishingTrip || purchasedCount === 0) &&
                  styles.disabledButton,
              ]}
              onPress={finishTrip}
              disabled={
                finishingTrip ||
                !isLoaded ||
                purchasedCount === 0
              }
            >
              <Text style={styles.finishButtonText}>
                {finishingTrip
                  ? 'Saving Trip...'
                  : '✓ Finish Shopping Trip'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <TouchableOpacity
              style={styles.itemDetails}
              onPress={() => togglePurchased(item.id)}
              disabled={finishingTrip}
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
                {money(item.price * (item.quantity ?? 1))}
              </Text>

              <Text style={styles.quantityText}>
                {item.quantity ?? 1} × {money(item.price)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => deleteItem(item.id)}
              disabled={finishingTrip}
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
    fontSize: 15,
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
  finishButton: {
    backgroundColor: '#153c2e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  finishButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.5,
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
