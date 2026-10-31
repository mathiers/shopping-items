
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

import { getCurrency, formatMoney } from '../utils/currency';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { saveShoppingTrip } from '../utils/shoppingHistory';

import {
  Category,
  DEFAULT_CATEGORIES,
  getCategories,
  categoryByName,
  ITEMS_KEY,
  OLD_ITEMS_KEY,
} from '../utils/shoppingCategories';

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  purchased: boolean;
  category?: string;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BUDGET_KEY = '@shopping_budget';



const iconName = (name: string): IconName =>
  name as IconName;

function parseItems(raw: string | null): ShoppingItem[] {
  if (!raw) return [];

  const parsed: ShoppingItem[] = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid shopping list data');
  }

  return parsed.map(item => ({
    ...item,
    quantity: item.quantity ?? 1,
    purchased: item.purchased ?? false,
    category: item.category || 'Other',
  }));
}

export default function ShoppingScreen() {
  const [currency, setCurrency] = useState('GBP');
  const money = (value: number) => formatMoney(value, currency);
    useFocusEffect(
    useCallback(() => {
      let active = true;

      getCurrency().then(saved => {
        if (active) {
          setCurrency(saved);
        }
      });

      return () => {
        active = false;
      };
    }, [])
  );
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(
    DEFAULT_CATEGORIES
  );

  const [budget, setBudget] = useState('100');
  const [isLoaded, setIsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [finishingTrip, setFinishingTrip] = useState(false);

  const [budgetExpanded, setBudgetExpanded] =
    useState(false);
  const [addExpanded, setAddExpanded] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemCategory, setItemCategory] =
    useState('Other');

  const [editingItem, setEditingItem] =
    useState<ShoppingItem | null>(null);

  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] =
    useState('Other');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState('All');

  const finishingRef = useRef(false);
  const skipNextSaveRef = useRef(false);
  const localVersionRef = useRef(0);
  const saveQueue = useRef<Promise<void>>(
    Promise.resolve()
  );

  const readStoredItems = useCallback(async () => {
    const [current, old] = await Promise.all([
      AsyncStorage.getItem(ITEMS_KEY),
      AsyncStorage.getItem(OLD_ITEMS_KEY),
    ]);

    return parseItems(current ?? old);
  }, []);

  // INITIAL LOAD
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [storedItems, storedBudget, storedCategories] =
          await Promise.all([
            readStoredItems(),
            AsyncStorage.getItem(BUDGET_KEY),
            getCategories(),
          ]);

        if (!mounted) return;

        skipNextSaveRef.current = true;
        setItems(storedItems);
        setCategories(storedCategories);

        if (storedBudget !== null) {
          setBudget(storedBudget);
        }
      } catch (error) {
        console.error('Initial shopping load:', error);

        if (mounted) {
          Alert.alert(
            'Loading failed',
            'Could not load shopping data.'
          );
        }
      } finally {
        if (mounted) setIsLoaded(true);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [readStoredItems]);

  // SAVE ITEMS
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
          ITEMS_KEY,
          serialized
        );
      })
      .catch(error => {
        console.error('Saving shopping items:', error);
      });
  }, [items, isLoaded]);

  // SAVE BUDGET
  useEffect(() => {
    if (!isLoaded) return;

    AsyncStorage.setItem(BUDGET_KEY, budget).catch(
      console.error
    );
  }, [budget, isLoaded]);

  // REFRESH ITEMS AND CATEGORIES ON FOCUS
  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return;

      let active = true;

      const refresh = async () => {
        const version = localVersionRef.current;

        try {
          setRefreshing(true);

          await saveQueue.current;

          if (!active || finishingRef.current) return;

          const [storedItems, storedCategories] =
            await Promise.all([
              readStoredItems(),
              getCategories(),
            ]);

          if (!active || finishingRef.current) return;

          setCategories(storedCategories);

          if (localVersionRef.current !== version) {
            return;
          }

          setItems(previous => {
            if (
              JSON.stringify(previous) ===
              JSON.stringify(storedItems)
            ) {
              return previous;
            }

            skipNextSaveRef.current = true;
            return storedItems;
          });

          // Reset filters if the selected category was deleted.
          setSelectedCategory(previous =>
            previous === 'All' ||
            storedCategories.some(
              category => category.name === previous
            )
              ? previous
              : 'All'
          );
        } catch (error) {
          console.error('Refresh shopping:', error);

          if (active) {
            Alert.alert(
              'Refresh failed',
              'Could not refresh shopping data.'
            );
          }
        } finally {
          if (active) setRefreshing(false);
        }
      };

      refresh();

      return () => {
        active = false;
      };
    }, [isLoaded, readStoredItems])
  );

  const updateItems = (
    updater: (previous: ShoppingItem[]) =>
      ShoppingItem[]
  ) => {
    if (!isLoaded || finishingRef.current) return;

    localVersionRef.current += 1;
    setItems(updater);
  };

  const spent = items
    .filter(item => item.purchased)
    .reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );

  const planned = items.reduce(
    (total, item) =>
      total + item.price * item.quantity,
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

  const filteredItems = items.filter(item => {
    const searchMatch = item.name
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());

    const categoryMatch =
      selectedCategory === 'All' ||
      categoryByName(categories, item.category).name ===
        selectedCategory;

    return searchMatch && categoryMatch;
  });

  const hasActiveFilter =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All';

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

  const addItem = () => {
    const valid = validateItem(
      itemName,
      itemPrice,
      itemQuantity
    );

    if (!valid) return;

    updateItems(previous => [
      ...previous,
      {
        id: `${Date.now()}-${Math.random()}`,
        ...valid,
        category: categoryByName(
          categories,
          itemCategory
        ).name,
        purchased: false,
      },
    ]);

    setItemName('');
    setItemPrice('');
    setItemQuantity('1');
    setItemCategory('Other');
    setAddExpanded(false);
    setSearchQuery('');
    setSelectedCategory('All');
  };

  const openEditItem = (item: ShoppingItem) => {
    if (finishingRef.current) return;

    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditQuantity(String(item.quantity));
    setEditCategory(
      categoryByName(categories, item.category).name
    );
  };

  const closeEditItem = () => {
    setEditingItem(null);
    setEditName('');
    setEditPrice('');
    setEditQuantity('');
    setEditCategory('Other');
  };

  const saveEditedItem = () => {
    if (!editingItem) return;

    const valid = validateItem(
      editName,
      editPrice,
      editQuantity
    );

    if (!valid) return;

    const targetId = editingItem.id;

    updateItems(previous =>
      previous.map(item =>
        item.id === targetId
          ? {
              ...item,
              ...valid,
              category: categoryByName(
                categories,
                editCategory
              ).name,
            }
          : item
      )
    );

    closeEditItem();
  };

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

  const deleteItem = (id: string) => {
    updateItems(previous =>
      previous.filter(item => item.id !== id)
    );
  };

  const finishTrip = () => {
    if (!isLoaded || finishingRef.current) return;

    const purchasedItems = items.filter(
      item => item.purchased
    );

    if (!purchasedItems.length) {
      Alert.alert(
        'Nothing purchased',
        'Tick at least one item first.'
      );
      return;
    }

    Alert.alert(
      'Finish shopping trip?',
      'Purchased items will move to History. Unpurchased items will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
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
                  category: categoryByName(
                    categories,
                    item.category
                  ).name,
                }))
              );

              await AsyncStorage.setItem(
                ITEMS_KEY,
                JSON.stringify(remainingItems)
              );

              skipNextSaveRef.current = true;
              setItems(remainingItems);

              Alert.alert(
                'Trip saved!',
                'Your purchases are in History.'
              );
            } catch (error) {
              console.error(error);

              Alert.alert(
                'Save failed',
                'Check History before trying again to avoid duplicates.'
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

  const categorySelector = (
    selected: string,
    onSelect: (name: string) => void
  ) => (
    <View style={styles.categoryGrid}>
      {categories.map(category => {
        const active = selected === category.name;

        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryOption,
              {
                backgroundColor: category.background,
                borderColor: active
                  ? category.accent
                  : 'transparent',
                borderWidth: active ? 2 : 1,
              },
            ]}
            onPress={() => onSelect(category.name)}
          >
            <Ionicons
              name={iconName(category.icon)}
              size={19}
              color={category.accent}
            />

            <Text
              style={[
                styles.categoryOptionText,
                { color: category.accent },
              ]}
            >
              {category.name}
            </Text>

            {active && (
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={category.accent}
              />
            )}
          </TouchableOpacity>
        );
      })}
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
                  color="#15803d"
                  size="small"
                />
              )}
            </View>

            {/* BUDGET */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.headerRow}
                onPress={() =>
                  setBudgetExpanded(!budgetExpanded)
                }
              >
                <Text style={styles.cardTitle}>
                  Shopping Budget
                </Text>

                <Ionicons
                  name={
                    budgetExpanded
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={19}
                  color="#64748b"
                />
              </TouchableOpacity>

              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.smallLabel}>
                    Spent
                  </Text>

                  <Text style={styles.amount}>
                    {money(spent)}
                  </Text>
                </View>

                <View>
                  <Text style={styles.smallLabel}>
                    Remaining
                  </Text>

                  <Text
                    style={[
                      styles.amount,
                      remaining < 0 && {
                        color: '#dc2626',
                      },
                    ]}
                  >
                    {money(remaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
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
                <View style={styles.expanded}>
                  <Text style={styles.label}>
                    Budget ({currency})
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={budget}
                    onChangeText={setBudget}
                    keyboardType="decimal-pad"
                  />

                  <Text style={styles.hint}>
                    Planned total: {money(planned)}
                  </Text>

                  <Text style={styles.hint}>
                    {percentage}% spent
                  </Text>
                </View>
              )}

              {remaining < 0 && (
                <Text style={styles.warning}>
                  ⚠️ Over budget
                </Text>
              )}
            </View>

            {/* ADD ITEM */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                setAddExpanded(!addExpanded)
              }
              disabled={!isLoaded || finishingTrip}
            >
              <Ionicons
                name={addExpanded ? 'close' : 'add'}
                size={20}
                color="#ffffff"
              />

              <Text style={styles.primaryText}>
                {addExpanded
                  ? 'Close Item Form'
                  : 'Add Shopping Item'}
              </Text>
            </TouchableOpacity>

            {addExpanded && (
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="Item name"
                />

                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.half]}
                    value={itemPrice}
                    onChangeText={setItemPrice}
                    placeholder="Unit price"
                    keyboardType="decimal-pad"
                  />

                  <TextInput
                    style={[styles.input, styles.half]}
                    value={itemQuantity}
                    onChangeText={setItemQuantity}
                    placeholder="Quantity"
                    keyboardType="number-pad"
                  />
                </View>

                <Text style={styles.label}>
                  Category
                </Text>

                {categorySelector(
                  itemCategory,
                  setItemCategory
                )}

                <TouchableOpacity
                  style={styles.darkButton}
                  onPress={addItem}
                  disabled={!isLoaded || finishingTrip}
                >
                  <Text style={styles.primaryText}>
                    Save Item
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SEARCH */}
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#94a3b8"
              />

              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search shopping items..."
                autoCapitalize="none"
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* COLOURED CATEGORY FILTERS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedCategory === 'All'
                        ? '#15803d'
                        : '#ffffff',
                    borderColor:
                      selectedCategory === 'All'
                        ? '#15803d'
                        : '#d0d5dd',
                  },
                ]}
                onPress={() => setSelectedCategory('All')}
              >
                <Ionicons
                  name="apps-outline"
                  size={16}
                  color={
                    selectedCategory === 'All'
                      ? '#ffffff'
                      : '#64748b'
                  }
                />

                <Text
                  style={{
                    color:
                      selectedCategory === 'All'
                        ? '#ffffff'
                        : '#475569',
                    fontWeight: '600',
                  }}
                >
                  All
                </Text>
              </TouchableOpacity>

              {categories.map(category => {
                const active =
                  selectedCategory === category.name;

                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor:
                          category.background,
                        borderColor: active
                          ? category.accent
                          : 'transparent',
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                    onPress={() =>
                      setSelectedCategory(category.name)
                    }
                  >
                    <Ionicons
                      name={iconName(category.icon)}
                      size={16}
                      color={category.accent}
                    />

                    <Text
                      style={{
                        color: category.accent,
                        fontWeight: '600',
                      }}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>
                My Shopping List
              </Text>

              <Text style={styles.smallLabel}>
                {purchasedCount}/{items.length} purchased
              </Text>
            </View>

            {hasActiveFilter && (
              <View style={styles.headerRow}>
                <Text style={styles.hint}>
                  Showing {filteredItems.length} of{' '}
                  {items.length}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  <Text style={styles.clearText}>
                    Clear filters
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.darkButton,
                { marginVertical: 14 },
                purchasedCount === 0 && {
                  opacity: 0.5,
                },
              ]}
              onPress={finishTrip}
              disabled={
                !isLoaded ||
                finishingTrip ||
                purchasedCount === 0
              }
            >
              <Text style={styles.primaryText}>
                {finishingTrip
                  ? 'Saving Trip...'
                  : '✓ Finish Shopping Trip'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const category = categoryByName(
            categories,
            item.category
          );

          return (
            <View
              style={[
                styles.itemRow,
                {
                  backgroundColor:
                    category.background,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.itemMain}
                onPress={() =>
                  togglePurchased(item.id)
                }
                disabled={finishingTrip}
              >
                <Ionicons
                  name={
                    item.purchased
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={24}
                  color={category.accent}
                />

                <View style={styles.itemInfo}>
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

                  <View style={styles.categoryLabel}>
                    <Ionicons
                      name={iconName(category.icon)}
                      size={12}
                      color={category.accent}
                    />

                    <Text
                      style={[
                        styles.categoryLabelText,
                        { color: category.accent },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </View>
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

              <TouchableOpacity
                style={styles.action}
                onPress={() => openEditItem(item)}
                disabled={finishingTrip}
              >
                <Ionicons
                  name="pencil-outline"
                  size={19}
                  color="#15803d"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.action}
                onPress={() => deleteItem(item.id)}
                disabled={finishingTrip}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color="#dc2626"
                />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {hasActiveFilter
              ? 'No items match your filters.'
              : 'Your shopping list is empty. Add your first item!'}
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
              <View style={styles.headerRow}>
                <Text style={styles.modalTitle}>
                  Edit Shopping Item
                </Text>

                <TouchableOpacity
                  onPress={closeEditItem}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                Item name
              </Text>

              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
              />

              <View style={styles.inputRow}>
                <View style={styles.half}>
                  <Text style={styles.label}>
                    Unit price ({currency})
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.half}>
                  <Text style={styles.label}>
                    Quantity
                  </Text>

                  <TextInput
                    style={styles.input}
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={styles.label}>
                Category
              </Text>

              {categorySelector(
                editCategory,
                setEditCategory
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeEditItem}
                >
                  <Text style={styles.cancelText}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={saveEditedItem}
                >
                  <Text style={styles.primaryText}>
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
  },
  subtitle: {
    color: '#667085',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  smallLabel: {
    color: '#667085',
    fontSize: 12,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#15803d',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  expanded: {
    marginTop: 16,
  },
  label: {
    color: '#344054',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    backgroundColor: '#ffffff',
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
  half: {
    width: '48%',
  },
  hint: {
    fontSize: 12,
    color: '#667085',
    marginTop: 5,
  },
  warning: {
    color: '#dc2626',
    marginTop: 10,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#15803d',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  darkButton: {
    backgroundColor: '#153c2e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  categoryOptionText: {
    fontWeight: '600',
    fontSize: 12,
  },
  searchBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 12,
    color: '#101828',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
    paddingRight: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  clearText: {
    color: '#15803d',
    fontWeight: 'bold',
    fontSize: 12,
  },
  itemRow: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '500',
  },
  purchased: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  categoryLabelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceColumn: {
    alignItems: 'flex-end',
    marginHorizontal: 4,
  },
  itemPrice: {
    fontWeight: 'bold',
    color: '#344054',
    fontSize: 13,
  },
  quantityText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  action: {
    padding: 7,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: 'bold',
    color: '#475569',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#15803d',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
});
