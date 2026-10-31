
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  getShoppingHistory,
  ShoppingTrip,
} from '../utils/shoppingHistory';

export default function HistoryScreen() {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadHistory = async () => {
        try {
          setLoading(true);
          const saved = await getShoppingHistory();

          if (active) setTrips(saved);
        } catch (error) {
          console.error('History loading error:', error);
        } finally {
          if (active) setLoading(false);
        }
      };

      loadHistory();

      return () => {
        active = false;
      };
    }, [])
  );

  const money = (value: number) => `£${value.toFixed(2)}`;

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16834a" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Shopping History</Text>
      <Text style={styles.subtitle}>
        Your completed shopping trips.
      </Text>

      {trips.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No shopping trips yet
          </Text>
          <Text style={styles.emptyText}>
            Complete a shopping trip in the Shop tab
            to see your purchases here.
          </Text>
        </View>
      ) : (
        trips.map(trip => (
          <View key={trip.id} style={styles.tripCard}>
            <View style={styles.headerRow}>
              <Text style={styles.tripTitle}>
                Shopping Trip
              </Text>
              <Text style={styles.date}>
                {new Date(trip.date).toLocaleDateString('en-GB')}
              </Text>
            </View>

            <Text style={styles.tripSummary}>
              {trip.items.length} purchased items
            </Text>

            <Text style={styles.tripTotal}>
              {money(trip.total)}
            </Text>

            <View style={styles.divider} />

            {trip.items.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={styles.itemPrice}>
                  {money(item.price * item.quantity)}
                </Text>
              </View>
            ))}
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
    padding: 20,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 6,
  },
  subtitle: {
    color: '#667085',
    marginBottom: 24,
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
});
