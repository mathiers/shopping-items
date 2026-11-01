
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  purchased: boolean;
};

export default function BudgetScreen() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [budget, setBudget] = useState(100);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadBudget = async () => {
        try {
          setLoading(true);

          const savedItems =
            (await AsyncStorage.getItem('@shopping_items_v2')) ??
            (await AsyncStorage.getItem('@shopping_items'));

          const savedBudget =
            await AsyncStorage.getItem('@shopping_budget');

          if (!active) return;

          setItems(savedItems ? JSON.parse(savedItems) : []);
          setBudget(
            savedBudget !== null ? Number(savedBudget) || 0 : 100
          );
        } catch (error) {
          console.error('Budget loading error:', error);
        } finally {
          if (active) setLoading(false);
        }
      };

      loadBudget();

      return () => {
        active = false;
      };
    }, [])
  );

  const planned = items.reduce(
    (sum, item) => sum + item.price * (item.quantity ?? 1),
    0
  );

  const spent = items
    .filter(item => item.purchased)
    .reduce(
      (sum, item) => sum + item.price * (item.quantity ?? 1),
      0
    );

  const remaining = budget - spent;
  const purchased = items.filter(item => item.purchased).length;

  const percentage =
    budget > 0 ? Math.round((spent / budget) * 100) : 0;

  const progress = Math.min(Math.max(percentage, 0), 100);

  const money = (amount: number) => `£${amount.toFixed(2)}`;

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
      <Text style={styles.title}>Budget Overview</Text>
      <Text style={styles.subtitle}>
        Track your shopping spending.
      </Text>

      <View style={styles.mainCard}>
        <Text style={styles.cardLabel}>Total Shopping Budget</Text>
        <Text style={styles.budgetAmount}>{money(budget)}</Text>

        <View style={styles.progressTrack}>
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

        <Text style={styles.progressLabel}>
          {percentage}% of budget spent
        </Text>

        {remaining < 0 && (
          <Text style={styles.warning}>
            ⚠️ You are over budget by {money(Math.abs(remaining))}
          </Text>
        )}
      </View>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={styles.statValue}>{money(spent)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text
            style={[
              styles.statValue,
              remaining < 0 && styles.negative,
            ]}
          >
            {money(remaining)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Planned Total</Text>
          <Text style={styles.statValue}>{money(planned)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Purchased Items</Text>
          <Text style={styles.statValue}>
            {purchased} / {items.length}
          </Text>
        </View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 6,
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    marginBottom: 24,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 22,
    elevation: 3,
    marginBottom: 20,
  },
  cardLabel: {
    color: '#667085',
    marginBottom: 8,
  },
  budgetAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 20,
  },
  progressTrack: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressLabel: {
    color: '#667085',
    marginTop: 10,
  },
  warning: {
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  statLabel: {
    color: '#667085',
    fontSize: 13,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#16834a',
  },
  negative: {
    color: '#dc2626',
  },
});
