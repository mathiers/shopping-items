
import React, { useCallback, useRef, useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getShoppingHistory,
  ShoppingTrip,
  HISTORY_KEY,
} from '../utils/shoppingHistory';

// Existing storage keys - do not change
const SHOPPING_ITEMS_KEY = '@shopping_items_v2';
const OLD_SHOPPING_ITEMS_KEY = '@shopping_items';

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
};

const money = (value: number) => `£${value.toFixed(2)}`;

function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function buildChart(
  trips: ShoppingTrip[],
  period: Period
): ChartBar[] {
  const now = new Date();
  const today = startOfDay(now);

  let bars: ChartBar[] = [];

  if (period === 'weekly') {
    // Monday to Sunday of the current calendar week
    const mondayOffset = (today.getDay() + 6) % 7;

    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const names = [
      'Mon', 'Tue', 'Wed', 'Thu',
      'Fri', 'Sat', 'Sun',
    ];

    bars = names.map(label => ({
      label,
      value: 0,
    }));

    for (const trip of trips) {
      const date = new Date(trip.date);

      if (
        Number.isNaN(date.getTime()) ||
        date < start ||
        date >= end
      ) {
        continue;
      }

      const index = (date.getDay() + 6) % 7;

      bars[index].value += trip.total;
    }
  } else if (period === 'monthly') {
    // Current month and previous five months
    const start = new Date(
      today.getFullYear(),
      today.getMonth() - 5,
      1
    );

    const end = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1
    );

    bars = Array.from(
      { length: 6 },
      (_, index) => {
        const date = new Date(
          start.getFullYear(),
          start.getMonth() + index,
          1
        );

        return {
          label: date.toLocaleDateString('en-GB', {
            month: 'short',
          }),
          value: 0,
        };
      }
    );

    for (const trip of trips) {
      const date = new Date(trip.date);

      if (
        Number.isNaN(date.getTime()) ||
        date < start ||
        date >= end
      ) {
        continue;
      }

      const index =
        (date.getFullYear() - start.getFullYear()) * 12 +
        date.getMonth() -
        start.getMonth();

      if (index >= 0 && index < bars.length) {
        bars[index].value += trip.total;
      }
    }
  } else {
    // Current year and previous four years
    const firstYear = today.getFullYear() - 4;

    bars = Array.from(
      { length: 5 },
      (_, index) => ({
        label: String(firstYear + index),
        value: 0,
      })
    );

    for (const trip of trips) {
      const date = new Date(trip.date);

      if (Number.isNaN(date.getTime())) continue;

      const index = date.getFullYear() - firstYear;

      if (index >= 0 && index < bars.length) {
        bars[index].value += trip.total;
      }
    }
  }

  return bars;
}

export default function HistoryScreen() {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<Period>('weekly');

  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [copyingTripId, setCopyingTripId] =
    useState<string | null>(null);

  // Prevent overlapping storage operations
  const deletingRef = useRef(false);
  const copyingRef = useRef(false);

  // Refresh history when screen receives focus
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHistory = async () => {
        try {
          setLoading(true);

          const saved = await getShoppingHistory();

          if (active) {
            setTrips(saved);
          }
        } catch (error) {
          console.error('History loading error:', error);

          if (active) {
            Alert.alert(
              'Loading error',
              'Could not load shopping history.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      loadHistory();

      return () => {
        active = false;
      };
    }, [])
  );

  // Analytics calculations
  const chartData = buildChart(trips, period);

  const chartTotal = chartData.reduce(
    (sum, bar) => sum + bar.value,
    0
  );

  const maxValue = Math.max(
    ...chartData.map(bar => bar.value),
    0
  );

  const average =
    chartData.length > 0
      ? chartTotal / chartData.length
      : 0;

  const periodDescription =
    period === 'weekly'
      ? 'Current week · Monday to Sunday'
      : period === 'monthly'
      ? 'Current month and previous 5 months'
      : 'Current year and previous 4 years';

  // SHOP AGAIN
  const shopAgain = (trip: ShoppingTrip) => {
    if (copyingRef.current || deletingRef.current) return;

    Alert.alert(
      'Shop Again?',
      `Add ${trip.items.length} items from this shopping trip to your current shopping list?\n\nAll copied items will be marked as not purchased. Your existing shopping items and original History record will be preserved.\n\nItems already on your list may appear twice.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add to Shopping List',
          onPress: async () => {
            if (
              copyingRef.current ||
              deletingRef.current
            ) {
              return;
            }

            copyingRef.current = true;
            setCopyingTripId(trip.id);

            try {
              const [currentData, oldData] =
                await Promise.all([
                  AsyncStorage.getItem(SHOPPING_ITEMS_KEY),
                  AsyncStorage.getItem(
                    OLD_SHOPPING_ITEMS_KEY
                  ),
                ]);

              const savedData = currentData ?? oldData;

              const existingItems: ActiveShoppingItem[] =
                savedData ? JSON.parse(savedData) : [];

              if (!Array.isArray(existingItems)) {
                throw new Error(
                  'Invalid shopping list data'
                );
              }

              // Copy items with fresh unique IDs
              const copiedItems: ActiveShoppingItem[] =
                trip.items.map((item, index) => ({
                  id: `${Date.now()}-${index}-${Math.random()}`,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity ?? 1,
                  purchased: false,
                }));

              // Preserve existing shopping items
              const updatedItems = [
                ...existingItems,
                ...copiedItems,
              ];

              await AsyncStorage.setItem(
                SHOPPING_ITEMS_KEY,
                JSON.stringify(updatedItems)
              );

              Alert.alert(
                'Shopping List Updated!',
                `${copiedItems.length} items added successfully.\n\nOpen the Shop tab to start shopping.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Shop Again error:', error);

              Alert.alert(
                'Unable to copy items',
                'Your shopping list could not be updated. Please try again.'
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
      'Permanently delete shopping trip?',
      `You are about to delete the shopping trip from ${new Date(
        trip.date
      ).toLocaleDateString('en-GB')} worth ${money(
        trip.total
      )}.\n\nThis action is permanent. You will NOT be able to recover this shopping record once deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            if (
              deletingRef.current ||
              copyingRef.current
            ) {
              return;
            }

            deletingRef.current = true;
            setDeletingId(trip.id);

            try {
              const savedTrips =
                await getShoppingHistory();

              const updatedTrips = savedTrips.filter(
                savedTrip => savedTrip.id !== trip.id
              );

              await AsyncStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(updatedTrips)
              );

              setTrips(updatedTrips);
            } catch (error) {
              console.error('Delete trip error:', error);

              Alert.alert(
                'Delete failed',
                'Could not delete this shopping trip.'
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
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#16834a"
        />
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
        Your purchases and spending insights.
      </Text>

      {/* SPENDING ANALYTICS */}
      <View style={styles.analyticsCard}>
        <View style={styles.analyticsHeader}>
          <View>
            <Text style={styles.analyticsEyebrow}>
              SPENDING ANALYTICS
            </Text>

            <Text style={styles.analyticsTitle}>
              Expenditure Overview
            </Text>
          </View>

          <Ionicons
            name="stats-chart-outline"
            size={25}
            color="#16834a"
          />
        </View>

        {/* PERIOD SELECTOR */}
        <View style={styles.periodSelector}>
          {(
            [
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['yearly', 'Yearly'],
            ] as const
          ).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.periodButton,
                period === value && styles.periodActive,
              ]}
              onPress={() => setPeriod(value)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === value &&
                    styles.periodTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TOTAL SPENDING */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>
            Total expenditure
          </Text>

          <Text style={styles.totalAmount}>
            {money(chartTotal)}
          </Text>

          <Text style={styles.totalDescription}>
            {periodDescription}
          </Text>
        </View>

        {/* BAR CHART */}
        <View style={styles.chart}>
          {chartData.map((bar, index) => {
            const height =
              maxValue > 0
                ? (bar.value / maxValue) * 150
                : 0;

            const isHighest =
              maxValue > 0 &&
              bar.value === maxValue;

            return (
              <View
                key={`${period}-${index}`}
                style={styles.barColumn}
              >
                <View style={styles.barArea}>
                  {bar.value > 0 && (
                    <Text
                      style={styles.barValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {bar.value >= 1000
                        ? `£${(
                            bar.value / 1000
                          ).toFixed(1)}k`
                        : `£${Math.round(bar.value)}`}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: isHighest
                          ? '#15803d'
                          : '#86c9a0',
                      },
                    ]}
                  />
                </View>

                <Text
                  style={styles.barLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {bar.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ANALYTICS FOOTER */}
        <View style={styles.chartFooter}>
          <View>
            <Text style={styles.footerLabel}>
              Average per period
            </Text>

            <Text style={styles.footerValue}>
              {money(average)}
            </Text>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendDot} />

            <Text style={styles.legendText}>
              Completed trips
            </Text>
          </View>
        </View>

        <Text style={styles.analyticsNote}>
          Based on saved shopping trips. Deleted
          trips are excluded automatically.
        </Text>
      </View>

      {/* HISTORY SECTION */}
      <Text style={styles.sectionTitle}>
        Completed Shopping Trips
      </Text>

      {trips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No shopping trips yet
          </Text>

          <Text style={styles.emptyText}>
            Complete a shopping trip in the Shop tab
            to see your purchases and analytics here.
          </Text>
        </View>
      ) : (
        trips.map(trip => (
          <View
            key={trip.id}
            style={styles.tripCard}
          >
            <View style={styles.headerRow}>
              <Text style={styles.tripTitle}>
                Shopping Trip
              </Text>

              <Text style={styles.date}>
                {new Date(
                  trip.date
                ).toLocaleDateString('en-GB')}
              </Text>
            </View>

            <Text style={styles.tripSummary}>
              {trip.items.length} purchased items
            </Text>

            <Text style={styles.tripTotal}>
              {money(trip.total)}
            </Text>

            <View style={styles.divider} />

            {/* ITEMS IN TRIP */}
            {trip.items.map(item => (
              <View
                key={item.id}
                style={styles.itemRow}
              >
                <Text style={styles.itemName}>
                  {item.name} × {item.quantity}
                </Text>

                <Text style={styles.itemPrice}>
                  {money(
                    item.price * item.quantity
                  )}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* SHOP AGAIN BUTTON */}
            <TouchableOpacity
              style={[
                styles.shopAgainButton,
                (copyingTripId !== null ||
                  deletingId !== null) &&
                  styles.disabledButton,
              ]}
              onPress={() => shopAgain(trip)}
              disabled={
                copyingTripId !== null ||
                deletingId !== null
              }
            >
              <Ionicons
                name="refresh-outline"
                size={19}
                color="#ffffff"
              />

              <Text style={styles.shopAgainButtonText}>
                {copyingTripId === trip.id
                  ? 'Adding Items...'
                  : 'Shop Again'}
              </Text>
            </TouchableOpacity>

            {/* DELETE BUTTON */}
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (deletingId !== null ||
                  copyingTripId !== null) &&
                  styles.disabledButton,
              ]}
              onPress={() => deleteTrip(trip)}
              disabled={
                deletingId !== null ||
                copyingTripId !== null
              }
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#dc2626"
              />

              <Text style={styles.deleteButtonText}>
                {deletingId === trip.id
                  ? 'Deleting...'
                  : 'Delete Trip'}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 4,
  },

  subtitle: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 18,
  },

  // ANALYTICS
  analyticsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 26,
    elevation: 3,
  },

  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  analyticsEyebrow: {
    color: '#16834a',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 5,
  },

  analyticsTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#153c2e',
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },

  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },

  periodActive: {
    backgroundColor: '#15803d',
  },

  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  periodTextActive: {
    color: '#ffffff',
  },

  totalCard: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },

  totalLabel: {
    color: '#667085',
    fontSize: 12,
    marginBottom: 5,
  },

  totalAmount: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#153c2e',
  },

  totalDescription: {
    color: '#667085',
    fontSize: 11,
    marginTop: 5,
  },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 190,
    marginBottom: 12,
  },

  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },

  barArea: {
    height: 170,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  bar: {
    width: '65%',
    maxWidth: 34,
    minHeight: 0,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  barValue: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    marginBottom: 5,
  },

  barLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    width: '100%',
  },

  chartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  footerLabel: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 4,
  },

  footerValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#153c2e',
  },

  legend: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#15803d',
    marginRight: 6,
  },

  legendText: {
    fontSize: 11,
    color: '#667085',
  },

  analyticsNote: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 12,
    lineHeight: 15,
  },

  // HISTORY
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 14,
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 8,
  },

  emptyText: {
    color: '#667085',
    textAlign: 'center',
    lineHeight: 22,
  },

  tripCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#153c2e',
  },

  date: {
    color: '#667085',
    fontSize: 12,
  },

  tripSummary: {
    color: '#667085',
    marginTop: 8,
  },

  tripTotal: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#16834a',
    marginTop: 6,
  },

  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 14,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  itemName: {
    color: '#344054',
    flex: 1,
  },

  itemPrice: {
    color: '#344054',
    fontWeight: '600',
  },

  // SHOP AGAIN
  shopAgainButton: {
    backgroundColor: '#15803d',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  shopAgainButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // DELETE
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: 'bold',
  },

  disabledButton: {
    opacity: 0.5,
  },
});
