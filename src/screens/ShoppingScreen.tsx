
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
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

const money = (amount: number) => `£${amount.toFixed(2)}`;

export default function ShoppingScreen() {
  const [budget, setBudget] = useState('100');

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [finishingTrip, setFinishingTrip] = useState(false);

  const [budgetExpanded, setBudgetExpanded] = useState(false);
  const [addExpanded, setAddExpanded] = useState(false);

  // Edit Item modal state
  const [editingItem, setEditingItem] =
    useState<ShoppingItem | null>(null);

  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  // Coordinate AsyncStorage writes with trip completion.
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
        console.error('Shopping data load error:', error);

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

  useEffect(() => {
    if (!isLoaded || finishingRef.current) return;

    const nextItems = JSON.stringify(items);

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (finishingRef.current) return;

        await AsyncStorage.setItem(
          STORAGE_KEY,
          nextItems
        );
      })
      .catch(error => {
        console.error('Shopping items save error:', error);
      });
  }, [items, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem(BUDGET_KEY, budget).catch(error => {
      console.error('Budget save error:', error);
    });
  }, [budget, isLoaded]);

  // Shopping totals
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

  const validateItem = (
    name: string,
    priceText: string,
    quantityText: string
  ) => {
    const price = Number(priceText);
    const quantity = Number(quantityText);

    if (
      !name.trim() ||
      !priceText.trim() ||
      !quantityText.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      Alert.alert(
        'Invalid item',
        'Enter a name, positive unit price and whole-number quantity.'
      );

      return null;
    }

    return {
      name: name.trim(),
      price,
      quantity,
    };
  };

  // ADD ITEM
  const addItem = () => {
    if (!isLoaded || finishingRef.current) return;

    const validated = validateItem(
      itemName,
      itemPrice,
      itemQuantity
    );

    if (!validated) return;

    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random()}`,
      ...validated,
      purchased: false,
    };

    setItems(previous => [...previous, newItem]);

    setItemName('');
    setItemPrice('');
    setItemQuantity('1');
    setAddExpanded(false);
  };

  // OPEN EDIT MODAL
  const openEditItem = (item: ShoppingItem) => {
    if (!isLoaded || finishingRef.current) return;

    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditQuantity(String(item.quantity ?? 1));
  };

  // CLOSE EDIT MODAL
  const closeEditItem = () => {
    if (finishingRef.current) return;

    setEditingItem(null);
    setEditName('');
    setEditPrice('');
    setEditQuantity('');
  };

  // SAVE EDITED ITEM
  const saveEditedItem = () => {
    if (!editingItem || finishingRef.current) return;

    const validated = validateItem(
      editName,
      editPrice,
      editQuantity
    );

    if (!validated) return;

    const targetId = editingItem.id;

    setItems(previous =>
      previous.map(item =>
        item.id === targetId
          ? {
              ...item,
              ...validated,
            }
          : item
      )
    );

    closeEditItem();
  };

  // TOGGLE PURCHASED
  const togglePurchased = (id: string) => {
    if (finishingRef.current) return;

    setItems(previous =>
      previous.map(item =>
        item.id === id
          ? {
              ...item,
              purchased: !item.purchased,
            }
          : item
      )
    );
  };

  // DELETE ITEM
  const deleteItem = (id: string) => {
    if (finishingRef.current) return;

    setItems(previous =>
      previous.filter(item => item.id !== id)
    );
  };

  // FINISH SHOPPING TRIP
  const finishTrip = () => {
    if (!isLoaded || finishingRef.current) return;

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
              await saveQueue.current;

              await saveShoppingTrip(
                purchasedItems.map(item => ({
                  id: item.id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity ?? 1,
                }))
              );

              await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(remainingItems)
              );

              setItems(remainingItems);

              Alert.alert(
                'Trip saved!',
                'Your purchases are now in Shopping History.'
              );
            } catch (error) {
              console.error('Finish trip error:', error);

              Alert.alert(
                'Save failed',
                'Check History before trying again to avoid duplicate trips.'
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

            {/* COMPACT BUDGET CARD */}
            <View style={styles.budgetCard}>
              <TouchableOpacity
                style={styles.compactHeader}
                onPress={() =>
                  setBudgetExpanded(previous => !previous)
                }
              >
                <Text style={styles.compactTitle}>
                  Shopping Budget
                </Text>

                <Ionicons
                  name={
                    budgetExpanded
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={18}
                  color="#667085"
                />
              </TouchableOpacity>

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

              {budgetExpanded && (
                <View style={styles.expandedContent}>
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

                  <Text style={styles.plannedText}>
                    Planned shopping total: {money(planned)}
                  </Text>

                  <Text style={styles.progressText}>
                    {percentage}% of budget spent
                  </Text>
                </View>
              )}

              {remaining < 0 && (
                <Text style={styles.warning}>
                  ⚠️ You have exceeded your budget!
                </Text>
              )}
            </View>

            {/* EXPANDABLE ADD ITEM */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                setAddExpanded(previous => !previous)
              }
              disabled={finishingTrip || !isLoaded}
            >
              <Ionicons
                name={addExpanded ? 'close' : 'add'}
                size={21}
                color="#ffffff"
              />

              <Text style={styles.addButtonText}>
                {addExpanded
                  ? 'Close Item Form'
                  : 'Add Shopping Item'}
              </Text>
            </TouchableOpacity>

            {addExpanded && (
              <View style={styles.addForm}>
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
                  style={styles.saveItemButton}
                  onPress={addItem}
                  disabled={finishingTrip || !isLoaded}
                >
                  <Text style={styles.saveItemText}>
                    Save Item
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SHOPPING LIST HEADER */}
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                My Shopping List
              </Text>

              <Text style={styles.itemCounter}>
                {purchasedCount} / {items.length} purchased
              </Text>
            </View>

            {/* FINISH TRIP BUTTON */}
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
                numberOfLines={2}
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

            {/* EDIT BUTTON */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openEditItem(item)}
              disabled={finishingTrip}
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color="#15803d"
              />
            </TouchableOpacity>

            {/* DELETE BUTTON */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteItem(item.id)}
              disabled={finishingTrip}
              accessibilityLabel={`Delete ${item.name}`}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color="#dc2626"
              />
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

      {/* EDIT ITEM MODAL */}
      <Modal
        visible={editingItem !== null}
        transparent
        animationType="slide"
        onRequestClose={closeEditItem}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit Shopping Item
              </Text>

              <TouchableOpacity
                onPress={closeEditItem}
                accessibilityLabel="Close edit item"
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#667085"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>
              Item name
            </Text>

            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Item name"
              autoFocus
            />

            <View style={styles.inputRow}>
              <View style={styles.halfInput}>
                <Text style={styles.modalLabel}>
                  Unit price (£)
                </Text>

                <TextInput
                  style={styles.input}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  keyboardType="decimal-pad"
                  placeholder="Price"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.modalLabel}>
                  Quantity
                </Text>

                <TextInput
                  style={styles.input}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="number-pad"
                  placeholder="Quantity"
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeEditItem}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={saveEditedItem}
              >
                <Text style={styles.confirmButtonText}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#667085',
    marginBottom: 16,
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 3,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16834a',
  },
  overBudget: {
    color: '#dc2626',
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  expandedContent: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
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
  plannedText: {
    marginTop: 4,
    fontWeight: '600',
    color: '#344054',
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
  addButton: {
    backgroundColor: '#16834a',
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  addForm: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  saveItemButton: {
    backgroundColor: '#153c2e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveItemText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  itemCounter: {
    fontSize: 12,
    color: '#667085',
  },
  finishButton: {
    backgroundColor: '#153c2e',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 18,
  },
  finishButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  itemRow: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  itemDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  checkbox: {
    fontSize: 24,
    marginRight: 8,
    color: '#16834a',
  },
  itemName: {
    fontSize: 15,
    flexShrink: 1,
    color: '#101828',
  },
  purchased: {
    textDecorationLine: 'line-through',
    color: '#98a2b3',
  },
  priceColumn: {
    alignItems: 'flex-end',
    marginHorizontal: 5,
  },
  itemPrice: {
    fontWeight: 'bold',
    color: '#344054',
    fontSize: 13,
  },
  quantityText: {
    fontSize: 10,
    color: '#667085',
    marginTop: 3,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#98a2b3',
    marginTop: 25,
  },

  // EDIT MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#15803d',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
