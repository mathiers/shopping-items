
import React, {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrency, formatMoney } from '../utils/currency';
import { lightColors, darkColors } from '../theme/colors';

import {
  getShoppingHistory,
  ShoppingTrip,
  HISTORY_KEY,
} from '../utils/shoppingHistory';

import {
  Category,
  DEFAULT_CATEGORIES,
  getCategories,
  categoryByName,
  ITEMS_KEY,
  OLD_ITEMS_KEY,
} from '../utils/shoppingCategories';

type Period = 'weekly' | 'monthly' | 'yearly';

type ChartBar = {
  label: string;
  value: number;
};

type ActiveShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  purchased: boolean;
  category: string;
};

type CategorySpending = {
  category: Category;
  amount: number;
  count: number;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];


const iconName = (value: string): IconName =>
  value as IconName;

const newId = () => `${Date.now()}-${Math.random()}`;

function buildChart(
  trips: ShoppingTrip[],
  period: Period
): ChartBar[] {
  const now = new Date();

  if (period === 'weekly') {
    const monday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);

    const labels = [
      'Mon', 'Tue', 'Wed', 'Thu',
      'Fri', 'Sat', 'Sun',
    ];

    return labels.map((label, index) => {
      const start = new Date(monday);
      start.setDate(monday.getDate() + index);

      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const value = trips.reduce((sum, trip) => {
        const date = new Date(trip.date);

        return date >= start && date < end
          ? sum + trip.total
          : sum;
      }, 0);

      return { label, value };
    });
  }

  if (period === 'monthly') {
    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(
        now.getFullYear(),
        now.getMonth() - (5 - index),
        1
      );

      const end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        1
      );

      const value = trips.reduce((sum, trip) => {
        const date = new Date(trip.date);

        return date >= start && date < end
          ? sum + trip.total
          : sum;
      }, 0);

      return {
        label: start.toLocaleDateString('en-GB', {
          month: 'short',
        }),
        value,
      };
    });
  }

  return Array.from({ length: 5 }, (_, index) => {
    const year = now.getFullYear() - (4 - index);

    const value = trips.reduce((sum, trip) => {
      const date = new Date(trip.date);

      return date.getFullYear() === year
        ? sum + trip.total
        : sum;
    }, 0);

    return {
      label: String(year),
      value,
    };
  });
}

function buildCategorySpending(
  trips: ShoppingTrip[],
  categories: Category[]
): CategorySpending[] {
  const totals = new Map<
    string,
    { amount: number; count: number }
  >();

  for (const trip of trips) {
    for (const item of trip.items) {
      const category = categoryByName(
        categories,
        item.category
      );

      const current = totals.get(category.id) || {
        amount: 0,
        count: 0,
      };

      current.amount += item.price * item.quantity;
      current.count += item.quantity;

      totals.set(category.id, current);
    }
  }

  return categories
    .filter(category => totals.has(category.id))
    .map(category => ({
      category,
      amount: totals.get(category.id)!.amount,
      count: totals.get(category.id)!.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export default function HistoryScreen() {
  const { dark } = useTheme();
  const colors = dark ? darkColors : lightColors;
  const styles = React.useMemo(() => createStyles(colors, dark), [dark]);
  const [currency, setCurrency] = useState('GBP');
  const money = (value: number) => formatMoney(value, currency);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCurrency().then(saved => {
        if (active) setCurrency(saved);
      }).catch(error => console.error('Currency loading error:', error));
      return () => { active = false; };
    }, [])
  );
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [categories, setCategories] = useState<Category[]>(
    DEFAULT_CATEGORIES
  );

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('weekly');

  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [copyingTripId, setCopyingTripId] =
    useState<string | null>(null);

  const deletingRef = useRef(false);
  const copyingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          setLoading(true);

          const [savedTrips, savedCategories] =
            await Promise.all([
              getShoppingHistory(),
              getCategories(),
            ]);

          if (!active) return;

          setTrips(savedTrips);
          setCategories(savedCategories);
        } catch (error) {
          console.error('History loading error:', error);

          if (active) {
            Alert.alert(
              'Loading failed',
              'Could not load shopping history.'
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      };

      load();

      return () => {
        active = false;
      };
    }, [])
  );

  const chartData = buildChart(trips, period);

  const chartTotal = chartData.reduce(
    (sum, bar) => sum + bar.value,
    0
  );

  const maxChartValue = Math.max(
    ...chartData.map(bar => bar.value),
    1
  );

  const average =
    chartData.length > 0
      ? chartTotal / chartData.length
      : 0;

  const categorySpending = buildCategorySpending(
    trips,
    categories
  );

  const totalCategorySpend = categorySpending.reduce(
    (sum, entry) => sum + entry.amount,
    0
  );

  const maxCategorySpend = Math.max(
    ...categorySpending.map(entry => entry.amount),
    1
  );

  const periodDescription =
    period === 'weekly'
      ? 'This week'
      : period === 'monthly'
        ? 'Last 6 months'
        : 'Last 5 years';

  // SHOP AGAIN
  const shopAgain = (trip: ShoppingTrip) => {
    if (copyingRef.current || deletingRef.current) return;

    Alert.alert(
      'Shop Again?',
      `Add ${trip.items.length} items from this trip to your current shopping list? Existing items will remain. Duplicates may be added.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Shopping List',
          onPress: async () => {
            if (copyingRef.current) return;

            copyingRef.current = true;
            setCopyingTripId(trip.id);

            try {
              const [current, previous, latestCategories] =
                await Promise.all([
                  AsyncStorage.getItem(ITEMS_KEY),
                  AsyncStorage.getItem(OLD_ITEMS_KEY),
                  getCategories(),
                ]);

              const parsed = JSON.parse(
                current ?? previous ?? '[]'
              );

              if (!Array.isArray(parsed)) {
                throw new Error(
                  'Invalid existing shopping list'
                );
              }

              const existingItems: ActiveShoppingItem[] =
                parsed;

              const copiedItems: ActiveShoppingItem[] =
                trip.items.map(item => ({
                  id: newId(),
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity ?? 1,
                  purchased: false,
                  category: categoryByName(
                    latestCategories,
                    item.category
                  ).name,
                }));

              await AsyncStorage.setItem(
                ITEMS_KEY,
                JSON.stringify([
                  ...existingItems,
                  ...copiedItems,
                ])
              );

              Alert.alert(
                'Shopping List Updated!',
                `${copiedItems.length} items added successfully. Open the Shop tab to see them.`
              );
            } catch (error) {
              console.error('Shop Again error:', error);

              Alert.alert(
                'Unable to copy items',
                'Your shopping list could not be updated.'
              );
            } finally {
              copyingRef.current = false;
              setCopyingTripId(null);
            }
          },
        },
      ]
    );
  };

  // DELETE TRIP
  const deleteTrip = (trip: ShoppingTrip) => {
    if (deletingRef.current || copyingRef.current) return;

    Alert.alert(
      'Delete Shopping Trip?',
      'This permanently removes the trip from History and updates spending analytics. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Trip',
          style: 'destructive',
          onPress: async () => {
            if (deletingRef.current) return;

            deletingRef.current = true;
            setDeletingId(trip.id);

            try {
              const latest = await getShoppingHistory();

              const updated = latest.filter(
                item => item.id !== trip.id
              );

              await AsyncStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(updated)
              );

              setTrips(updated);
            } catch (error) {
              console.error('Delete trip error:', error);

              Alert.alert(
                'Delete failed',
                'Could not delete this trip.'
              );
            } finally {
              deletingRef.current = false;
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#15803d"
        />
        <Text style={styles.loadingText}>
          Loading shopping history...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>
        Shopping History
      </Text>

      <Text style={styles.subtitle}>
        Review trips, spending and past purchases
      </Text>

      {/* PERIOD ANALYTICS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Spending Analytics
        </Text>

        <View style={styles.periodRow}>
          {(
            ['weekly', 'monthly', 'yearly'] as Period[]
          ).map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.periodButton,
                period === option &&
                  styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(option)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === option &&
                    styles.periodTextActive,
                ]}
              >
                {option.charAt(0).toUpperCase() +
                  option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.metricLabel}>
          {periodDescription} spending
        </Text>

        <Text style={styles.metricValue}>
          {money(chartTotal)}
        </Text>

        <View style={styles.chart}>
          {chartData.map((bar, index) => (
            <View
              key={`${bar.label}-${index}`}
              style={styles.barColumn}
            >
              <Text
                style={styles.barValue}
                numberOfLines={1}
              >
                {bar.value > 0
                  ? money(bar.value)
                  : ''}
              </Text>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${
                        (bar.value / maxChartValue) * 100
                      }%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={styles.barLabel}
                numberOfLines={1}
              >
                {bar.label}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.averageText}>
          Average per chart period: {money(average)}
        </Text>
      </View>

      {/* CATEGORY SPENDING */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Spending by Category
        </Text>

        <Text style={styles.hint}>
          All completed trips, grouped by category
        </Text>

        <Text style={styles.categoryTotal}>
          {money(totalCategorySpend)}
        </Text>

        {categorySpending.length === 0 ? (
          <Text style={styles.emptySection}>
            Finish a shopping trip to see your category
            spending.
          </Text>
        ) : (
          categorySpending.map(entry => (
            <View
              key={entry.category.id}
              style={styles.categoryEntry}
            >
              <View style={styles.categoryHeader}>
                <View style={styles.categoryTitleRow}>
                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor: dark ? colors.input : entry.category.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName(entry.category.icon)}
                      size={19}
                      color={dark ? colors.accent : entry.category.accent}
                    />
                  </View>

                  <View>
                    <Text style={styles.categoryName}>
                      {entry.category.name}
                    </Text>

                    <Text style={styles.categoryCount}>
                      {entry.count} units purchased
                    </Text>
                  </View>
                </View>

                <Text style={styles.categoryAmount}>
                  {money(entry.amount)}
                </Text>
              </View>

              <View style={styles.categoryTrack}>
                <View
                  style={[
                    styles.categoryFill,
                    {
                      backgroundColor:
                        entry.category.accent,
                      width: `${
                        (entry.amount / maxCategorySpend) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* COMPLETED TRIPS */}
      <Text style={styles.sectionTitle}>
        Completed Trips ({trips.length})
      </Text>

      {trips.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptySection}>
            No completed shopping trips yet.
          </Text>
        </View>
      ) : (
        trips.map(trip => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View>
                <Text style={styles.tripDate}>
                  {new Date(trip.date).toLocaleDateString(
                    'en-GB',
                    {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }
                  )}
                </Text>

                <Text style={styles.tripCount}>
                  {trip.items.length} items
                </Text>
              </View>

              <Text style={styles.tripTotal}>
                {money(trip.total)}
              </Text>
            </View>

            {trip.items.map((item, index) => {
              const category = categoryByName(
                categories,
                item.category
              );

              return (
                <View
                  key={`${item.id}-${index}`}
                  style={styles.tripItem}
                >
                  <View
                    style={[
                      styles.tripItemIcon,
                      {
                        backgroundColor: dark ? colors.input : category.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName(category.icon)}
                      size={17}
                      color={dark ? colors.accent : category.accent}
                    />
                  </View>

                  <View style={styles.tripItemInfo}>
                    <Text style={styles.tripItemName}>
                      {item.name}
                    </Text>

                    <Text style={styles.tripItemDetail}>
                      {category.name} ·{' '}
                      {item.quantity} × {money(item.price)}
                    </Text>
                  </View>

                  <Text style={styles.tripItemTotal}>
                    {money(
                      item.price * item.quantity
                    )}
                  </Text>
                </View>
              );
            })}

            <View style={styles.tripActions}>
              <TouchableOpacity
                style={[
                  styles.shopAgainButton,
                  copyingTripId === trip.id &&
                    styles.disabled,
                ]}
                onPress={() => shopAgain(trip)}
                disabled={
                  copyingTripId !== null ||
                  deletingId !== null
                }
              >
                <Ionicons
                  name="refresh-outline"
                  size={17}
                  color="#ffffff"
                />

                <Text style={styles.shopAgainText}>
                  {copyingTripId === trip.id
                    ? 'Adding...'
                    : 'Shop Again'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteTrip(trip)}
                disabled={
                  copyingTripId !== null ||
                  deletingId !== null
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color="#dc2626"
                />

                <Text style={styles.deleteText}>
                  {deletingId === trip.id
                    ? 'Deleting...'
                    : 'Delete Trip'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const createStyles = (colors: typeof lightColors, dark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.secondaryText,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 4,
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.input,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  periodTextActive: {
    color: '#ffffff',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  metricValue: {
    fontSize: 27,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 4,
  },
  chart: {
    flexDirection: 'row',
    height: 180,
    alignItems: 'flex-end',
    gap: 5,
    marginTop: 18,
    marginBottom: 14,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 9,
    color: colors.secondaryText,
    marginBottom: 5,
  },
  barTrack: {
    height: 125,
    width: '75%',
    maxWidth: 35,
    justifyContent: 'flex-end',
    backgroundColor: colors.input,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#16a34a',
    width: '100%',
    borderRadius: 5,
  },
  barLabel: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 7,
  },
  averageText: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 6,
  },
  hint: {
    color: colors.secondaryText,
    fontSize: 12,
    marginBottom: 12,
  },
  categoryTotal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 18,
  },
  categoryEntry: {
    marginBottom: 17,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryCount: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 3,
  },
  categoryAmount: {
    fontWeight: 'bold',
    color: colors.text,
    fontSize: 14,
  },
  categoryTrack: {
    height: 7,
    borderRadius: 10,
    backgroundColor: colors.input,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 10,
  },
  emptySection: {
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 13,
  },
  tripCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 10,
  },
  tripDate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  tripCount: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 4,
  },
  tripTotal: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.primary,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 10,
  },
  tripItemIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripItemInfo: {
    flex: 1,
  },
  tripItemName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tripItemDetail: {
    color: colors.secondaryText,
    fontSize: 11,
    marginTop: 4,
  },
  tripItemTotal: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  tripActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  shopAgainButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  shopAgainText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: dark ? colors.border : '#fecaca',
    backgroundColor: dark ? colors.input : '#fff7f7',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  deleteText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
});
