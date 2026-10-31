
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveShoppingTrip } from '../utils/shoppingHistory';

const CATEGORIES = [
  'Dairy',
  'Meat',
  'Vegetables',
  'Fruit',
  'Bakery',
  'Frozen',
  'Drinks',
  'Household',
  'Other',
] as const;

type Category = (typeof CATEGORIES)[number];
type CategoryFilter = 'All' | Category;

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  purchased: boolean;
  category?: Category;
};

const STORAGE_KEY = '@shopping_items_v2';
const OLD_STORAGE_KEY = '@shopping_items';
const BUDGET_KEY = '@shopping_budget';

const money = (value: number) => `£${value.toFixed(2)}`;

function normalizeCategory(value: unknown): Category {
  if (
    typeof value === 'string' &&
    CATEGORIES.some(category => category === value)
  ) {
    return value as Category;
  }

  return 'Other';
}

function parseShoppingItems(
  savedData: string | null
): ShoppingItem[] {
  if (savedData === null) return [];

  const parsed: ShoppingItem[] = JSON.parse(savedData);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid shopping list data');
  }

  return parsed.map(item => ({
    ...item,
    quantity: item.quantity ?? 1,
    purchased: item.purchased ?? false,
    category: normalizeCategory(item.category),
  }));
}

export default function ShoppingScreen() {
  const [budget, setBudget] = useState('100');

  // ADD ITEM
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemCategory, setItemCategory] =
    useState<Category>('Other');

  // SHOPPING LIST
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [finishingTrip, setFinishingTrip] = useState(false);

  // EXPANDABLE SECTIONS
  const [budgetExpanded, setBudgetExpanded] =
    useState(false);

  const [addExpanded, setAddExpanded] =
    useState(false);

  // EDIT ITEM
  const [editingItem, setEditingItem] =
    useState<ShoppingItem | null>(null);

  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] =
    useState<Category>('Other');

  // SEARCH AND FILTER
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('All');

  const finishingRef = useRef(false);
  const saveQueue = useRef<Promise<void>>(
    Promise.resolve()
  );
  const skipNextSaveRef = useRef(false);
  const localVersionRef = useRef(0);

  // READ EXISTING ASYNCSTORAGE DATA
  const readStoredItems = useCallback(async () => {
    const [currentData, oldData] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(OLD_STORAGE_KEY),
    ]);

    return parseShoppingItems(currentData ?? oldData);
  }, []);

  // INITIAL LOAD
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [savedItems, savedBudget] =
          await Promise.all([
            readStoredItems(),
            AsyncStorage.getItem(BUDGET_KEY),
          ]);

        if (!mounted) return;

        skipNextSaveRef.current = true;
        setItems(savedItems);

        if (savedBudget !== null) {
          setBudget(savedBudget);
        }
      } catch (error) {
        console.error('Initial load error:', error);

        if (mounted) {
          Alert.alert(
            'Loading error',
            'Could not load your saved shopping data.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoaded(true);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [readStoredItems]);

  // SAVE SHOPPING ITEMS
  useEffect(() => {
    if (!isLoaded) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (finishingRef.current) return;

    const serialized = JSON.stringify(items);

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        if (finishingRef.current) return;

        await AsyncStorage.setItem(
          STORAGE_KEY,
          serialized
        );
      })
      .catch(error => {
        console.error('Save items error:', error);
      });
  }, [items, isLoaded]);

  // SAVE BUDGET
  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem(BUDGET_KEY, budget).catch(
      error => {
        console.error('Save budget error:', error);
      }
    );
  }, [budget, isLoaded]);

  // REFRESH ITEMS WHEN RETURNING FROM HISTORY
  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return;

      let active = true;

      const refreshItems = async () => {
        const versionAtStart =
          localVersionRef.current;

        try {
          setRefreshing(true);

          await saveQueue.current;

          if (!active || finishingRef.current) return;

          const storedItems = await readStoredItems();

          if (!active || finishingRef.current) return;

          if (
            localVersionRef.current !== versionAtStart
          ) {
            return;
          }

          // Update only when the stored list differs.
          const currentSnapshot = JSON.stringify(
            storedItems
          );

          setItems(previous => {
            if (
              JSON.stringify(previous) ===
              currentSnapshot
            ) {
              return previous;
            }

            skipNextSaveRef.current = true;
            return storedItems;
          });
        } catch (error) {
          console.error('Refresh items error:', error);

          if (active) {
            Alert.alert(
              'Refresh failed',
              'Could not refresh your shopping list.'
            );
          }
        } finally {
          if (active) {
            setRefreshing(false);
          }
        }
      };

      refreshItems();

      return () => {
        active = false;
      };
    }, [isLoaded, readStoredItems])
  );

  // UPDATE ITEMS AND TRACK LOCAL CHANGES
  const updateItems = (
    updater: (previous: ShoppingItem[]) =>
      ShoppingItem[]
  ) => {
    if (!isLoaded || finishingRef.current) return;

    localVersionRef.current += 1;
    setItems(updater);
  };

  // TOTALS ALWAYS USE ALL ITEMS, NOT FILTERED ITEMS
  const spent = items
    .filter(item => item.purchased)
    .reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );

  const planned = items.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );

  const purchasedCount = items.filter(
    item => item.purchased
  ).length;

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

  // SEARCH + CATEGORY FILTER
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' ||
      normalizeCategory(item.category) ===
        selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const hasActiveFilter =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All';

  // VALIDATE NAME, PRICE AND QUANTITY
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
        'Enter an item name, a positive unit price and a whole-number quantity.'
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
    const validated = validateItem(
      itemName,
      itemPrice,
      itemQuantity
    );

    if (!validated) return;

    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random()}`,
      ...validated,
      category: itemCategory,
      purchased: false,
    };

    updateItems(previous => [
      ...previous,
      newItem,
    ]);

    setItemName('');
    setItemPrice('');
    setItemQuantity('1');
    setItemCategory('Other');
    setAddExpanded(false);

    // Show the newly added item, regardless of filters.
    setSearchQuery('');
    setSelectedCategory('All');
  };

  // OPEN EDIT ITEM
  const openEditItem = (item: ShoppingItem) => {
    if (finishingRef.current) return;

    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditQuantity(String(item.quantity));
    setEditCategory(
      normalizeCategory(item.category)
    );
  };

  const closeEditItem = () => {
    setEditingItem(null);
    setEditName('');
    setEditPrice('');
    setEditQuantity('');
    setEditCategory('Other');
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

    updateItems(previous =>
      previous.map(item =>
        item.id === targetId
          ? {
              ...item,
              ...validated,
              category: editCategory,
            }
          : item
      )
    );

    closeEditItem();
  };

  // PURCHASE CHECKBOX
  const togglePurchased = (id: string) => {
    updateItems(previous =>
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
    updateItems(previous =>
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
                  quantity: item.quantity,
                }))
              );

              await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(remainingItems)
              );

              skipNextSaveRef.current = true;
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

  // REUSABLE CATEGORY SELECTOR
  const renderCategorySelector = (
    selected: Category,
    onSelect: (category: Category) => void
  ) => (
    <View style={styles.categorySelector}>
      {CATEGORIES.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChoice,
            selected === category &&
              styles.categoryChoiceActive,
          ]}
          onPress={() => onSelect(category)}
        >
          <Text
            style={[
              styles.categoryChoiceText,
              selected === category &&
                styles.categoryChoiceTextActive,
            ]}
          >
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            {/* PAGE HEADER */}
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>
                  🛒 Shopping Items
                </Text>

                <Text style={styles.subtitle}>
                  Shop smarter. Stay on budget.
                </Text>
              </View>

              {refreshing && (
                <ActivityIndicator
                  size="small"
                  color="#16834a"
                />
              )}
            </View>

            {/* SHOPPING BUDGET */}
            <View style={styles.budgetCard}>
              <TouchableOpacity
                style={styles.compactHeader}
                onPress={() =>
                  setBudgetExpanded(
                    previous => !previous
                  )
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
                      remaining < 0 &&
                        styles.overBudget,
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

            {/* ADD ITEM BUTTON */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                setAddExpanded(
                  previous => !previous
                )
              }
              disabled={!isLoaded || finishingTrip}
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

            {/* ADD ITEM FORM */}
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
                    style={[
                      styles.input,
                      styles.halfInput,
                    ]}
                    placeholder="Unit price"
                    keyboardType="decimal-pad"
                    value={itemPrice}
                    onChangeText={setItemPrice}
                    editable={!finishingTrip}
                  />

                  <TextInput
                    style={[
                      styles.input,
                      styles.halfInput,
                    ]}
                    placeholder="Quantity"
                    keyboardType="number-pad"
                    value={itemQuantity}
                    onChangeText={setItemQuantity}
                    editable={!finishingTrip}
                  />
                </View>

                <Text style={styles.label}>
                  Category
                </Text>

                {renderCategorySelector(
                  itemCategory,
                  setItemCategory
                )}

                <TouchableOpacity
                  style={styles.saveItemButton}
                  onPress={addItem}
                  disabled={!isLoaded || finishingTrip}
                >
                  <Text style={styles.saveItemText}>
                    Save Item
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SEARCH */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={21}
                color="#98a2b3"
              />

              <TextInput
                style={styles.searchInput}
                placeholder="Search shopping items..."
                placeholderTextColor="#98a2b3"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                returnKeyType="search"
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    setSearchQuery('')
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#98a2b3"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* CATEGORY FILTERS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}
            >
              {(
                ['All', ...CATEGORIES] as CategoryFilter[]
              ).map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    selectedCategory === category &&
                      styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setSelectedCategory(category)
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* SHOPPING LIST HEADER */}
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                My Shopping List
              </Text>

              <Text style={styles.itemCounter}>
                {purchasedCount} / {items.length} purchased
              </Text>
            </View>

            {hasActiveFilter && (
              <View style={styles.filterInfo}>
                <Text style={styles.filterInfoText}>
                  Showing {filteredItems.length} of{' '}
                  {items.length} items
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  <Text style={styles.clearFilters}>
                    Clear filters
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FINISH SHOPPING TRIP */}
            <TouchableOpacity
              style={[
                styles.finishButton,
                (finishingTrip ||
                  purchasedCount === 0) &&
                  styles.disabledButton,
              ]}
              onPress={finishTrip}
              disabled={
                !isLoaded ||
                finishingTrip ||
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
              onPress={() =>
                togglePurchased(item.id)
              }
              disabled={finishingTrip}
            >
              <Text style={styles.checkbox}>
                {item.purchased ? '☑' : '☐'}
              </Text>

              <View style={styles.itemTextColumn}>
                <Text
                  style={[
                    styles.itemName,
                    item.purchased &&
                      styles.purchased,
                  ]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>

                <Text style={styles.itemCategory}>
                  {normalizeCategory(item.category)}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.priceColumn}>
              <Text style={styles.itemPrice}>
                {money(
                  item.price * item.quantity
                )}
              </Text>

              <Text style={styles.quantityText}>
                {item.quantity} × {money(item.price)}
              </Text>
            </View>

            {/* EDIT */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                openEditItem(item)
              }
              disabled={finishingTrip}
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color="#15803d"
              />
            </TouchableOpacity>

            {/* DELETE */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                deleteItem(item.id)
              }
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
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                hasActiveFilter
                  ? 'search-outline'
                  : 'basket-outline'
              }
              size={36}
              color="#98a2b3"
            />

            <Text style={styles.emptyText}>
              {hasActiveFilter
                ? 'No items match your search or category.'
                : 'Your shopping list is empty. Add your first item!'}
            </Text>
          </View>
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
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.modalCard}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Edit Shopping Item
                </Text>

                <TouchableOpacity
                  onPress={closeEditItem}
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

              <Text style={styles.modalLabel}>
                Category
              </Text>

              {renderCategorySelector(
                editCategory,
                setEditCategory
              )}

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
            </ScrollView>
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

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

  // CATEGORY SELECTION
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  categoryChoice: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },

  categoryChoiceActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },

  categoryChoiceText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },

  categoryChoiceTextActive: {
    color: '#ffffff',
  },

  // SEARCH
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 12,
    paddingHorizontal: 13,
    marginTop: 5,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#101828',
    paddingVertical: 12,
    marginLeft: 8,
  },

  // FILTER CHIPS
  filterScroll: {
    marginBottom: 16,
  },

  filterRow: {
    gap: 8,
    paddingRight: 12,
  },

  filterChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },

  filterChipActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },

  filterChipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: '#ffffff',
  },

  // LIST
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

  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  filterInfoText: {
    color: '#667085',
    fontSize: 12,
  },

  clearFilters: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: 'bold',
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

  itemTextColumn: {
    flex: 1,
    minWidth: 0,
  },

  itemName: {
    fontSize: 15,
    color: '#101828',
  },

  itemCategory: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 4,
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

  emptyContainer: {
    alignItems: 'center',
    marginTop: 25,
    gap: 10,
  },

  emptyText: {
    textAlign: 'center',
    color: '#98a2b3',
    fontSize: 13,
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
    maxHeight: '85%',
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
