
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrency, formatMoney } from '../utils/currency';
import { lightColors, darkColors } from '../theme/colors';

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

type CategoryTotal = {
  category: Category;
  amount: number;
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BUDGET_KEY = '@shopping_budget';


export default function BudgetScreen() {
  const { dark } = useTheme();
  const colors = dark ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors, dark), [dark]);
  const [currency, setCurrency] = useState('GBP');

  const money = (value: number) => formatMoney(value, currency);

    useFocusEffect(
      useCallback(() => {
        let active = true;

        getCurrency().then(saved => {
          if (active) {
            setCurrency(saved);
          }
        }).catch(error => {
          console.error('Currency loading error:', error);
        });

        return () => {
          active = false;
        };
      }, [])
    );

  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState('');
  const [editing, setEditing] = useState(false);

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(
    DEFAULT_CATEGORIES
  );

  const loadData = useCallback(async () => {
    try {
      const [savedBudget, savedItems, legacyItems, savedCategories] =
        await Promise.all([
          AsyncStorage.getItem(BUDGET_KEY),
          AsyncStorage.getItem(ITEMS_KEY),
          AsyncStorage.getItem(OLD_ITEMS_KEY),
          getCategories(),
        ]);

      const parsedBudget = savedBudget
        ? Number(JSON.parse(savedBudget))
        : 0;

      const safeBudget = Number.isFinite(parsedBudget)
        ? parsedBudget
        : 0;

      const parsedItems = JSON.parse(
        savedItems ?? legacyItems ?? '[]'
      );

      setBudget(safeBudget);
      setBudgetInput(String(safeBudget));

      setItems(
        Array.isArray(parsedItems) ? parsedItems : []
      );

      setCategories(savedCategories);
    } catch (error) {
      console.error('Budget loading error:', error);
      Alert.alert(
        'Unable to load budget',
        'Please try reopening the Budget tab.'
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const saveBudget = async () => {
    const value = Number(budgetInput);

    if (
      budgetInput.trim() === '' ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      Alert.alert(
        'Invalid budget',
        'Enter a valid amount of zero or more.'
      );
      return;
    }

    try {
      await AsyncStorage.setItem(
        BUDGET_KEY,
        JSON.stringify(value)
      );

      setBudget(value);
      setEditing(false);
    } catch (error) {
      console.error('Budget save error:', error);
      Alert.alert(
        'Save failed',
        'Could not update your budget.'
      );
    }
  };

  const plannedTotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.quantity || 1),
    0
  );

  const spentTotal = items
    .filter(item => item.purchased)
    .reduce(
      (sum, item) =>
        sum +
        Number(item.price || 0) *
          Number(item.quantity || 1),
      0
    );

  const remaining = budget - spentTotal;

  const percentage =
    budget > 0 ? (spentTotal / budget) * 100 : 0;

  const displayPercentage = Math.round(percentage);

  const purchasedCount = items.filter(
    item => item.purchased
  ).length;

  const progressColor =
    budget <= 0
      ? '#94A3B8'
      : percentage > 100
        ? '#EF4444'
        : percentage >= 85
          ? '#F59E0B'
          : '#16A34A';

  const statusMessage =
    budget <= 0
      ? 'Set your shopping budget to get started'
      : remaining < 0
        ? `Over budget by ${money(Math.abs(remaining))}`
        : percentage >= 85
          ? 'Approaching your budget limit'
          : 'You are within your shopping budget';

  const categoryTotals: CategoryTotal[] = categories
    .map(category => {
      const amount = items
        .filter(item => {
          const matched = categoryByName(
            categories,
            item.category
          );

          return (
            matched.id === category.id &&
            item.purchased
          );
        })
        .reduce(
          (sum, item) =>
            sum +
            Number(item.price || 0) *
              Number(item.quantity || 1),
          0
        );

      return { category, amount };
    })
    .filter(entry => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = Math.max(
    1,
    ...categoryTotals.map(entry => entry.amount)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            Shopping Budget
          </Text>

          <Text style={styles.subtitle}>
            Your money, at a glance
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="wallet-outline"
            size={25}
            color={colors.primary}
          />
        </View>
      </View>

      {/* HERO CARD */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>
            Remaining budget
          </Text>

          <Ionicons
            name="wallet-outline"
            size={22}
            color="#C6E8D4"
          />
        </View>

        <Text style={styles.heroAmount}>
          {money(remaining)}
        </Text>

        <View style={styles.heroMeta}>
          <Text style={styles.heroMetaText}>
            {money(spentTotal)} spent
          </Text>

          <Text style={styles.heroMetaText}>
            {money(budget)} budget
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(
                  100,
                  Math.max(0, percentage)
                )}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>

        <View style={styles.statusRow}>
          <Ionicons
            name={
              remaining < 0
                ? 'alert-circle-outline'
                : 'checkmark-circle-outline'
            }
            size={17}
            color={
              remaining < 0
                ? '#FCA5A5'
                : '#A7E9BF'
            }
          />

          <Text style={styles.statusText}>
            {statusMessage}
          </Text>
        </View>
      </View>

      {/* SUMMARY CARDS */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons
            name="receipt-outline"
            size={23}
            color="#E28C50"
          />

          <Text style={styles.summaryLabel}>
            Purchased
          </Text>

          <Text style={styles.summaryAmount}>
            {money(spentTotal)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons
            name="cart-outline"
            size={23}
            color="#447CC4"
          />

          <Text style={styles.summaryLabel}>
            Planned total
          </Text>

          <Text style={styles.summaryAmount}>
            {money(plannedTotal)}
          </Text>
        </View>
      </View>

      {/* SPENDING PROGRESS */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Spending Progress
        </Text>

        <View style={styles.progressSummary}>
          <View style={styles.percentageCircle}>
            <Text
              style={[
                styles.percentageText,
                { color: progressColor },
              ]}
            >
              {displayPercentage}%
            </Text>

            <Text style={styles.percentageCaption}>
              used
            </Text>
          </View>

          <View style={styles.progressDetails}>
            <View style={styles.legendRow}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: progressColor },
                ]}
              />

              <Text style={styles.legendText}>
                Spent {money(spentTotal)}
              </Text>
            </View>

            <View style={styles.legendRow}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: dark ? '#475569' : '#D5EBDD' },
                ]}
              />

              <Text style={styles.legendText}>
                Remaining {money(remaining)}
              </Text>
            </View>

            <Text style={styles.progressHint}>
              {purchasedCount} of {items.length}{' '}
              items purchased
            </Text>
          </View>
        </View>

        <View style={styles.secondaryTrack}>
          <View
            style={[
              styles.secondaryFill,
              {
                width: `${Math.min(
                  100,
                  Math.max(0, percentage)
                )}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      </View>

      {/* CATEGORY BREAKDOWN */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Spending by Category
        </Text>

        <Text style={styles.cardHint}>
          Based on purchased items in your current list
        </Text>

        {categoryTotals.length === 0 ? (
          <Text style={styles.emptyText}>
            Purchased items will appear here.
          </Text>
        ) : (
          categoryTotals.map(entry => (
            <View
              key={entry.category.id}
              style={styles.categoryRow}
            >
              <View style={styles.categoryHeading}>
                <View style={styles.categoryNameRow}>
                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor: dark ? colors.input : entry.category.background,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        entry.category.icon as IconName
                      }
                      size={19}
                      color={entry.category.accent}
                    />
                  </View>

                  <Text style={styles.categoryName}>
                    {entry.category.name}
                  </Text>
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
                      width: `${
                        (entry.amount /
                          maxCategoryAmount) *
                        100
                      }%`,
                      backgroundColor:
                        entry.category.accent,
                    },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* BUDGET EDITOR */}
      <View style={styles.card}>
        <View style={styles.editHeader}>
          <View>
            <Text style={styles.cardTitle}>
              Budget Settings
            </Text>

            <Text style={styles.cardHint}>
              Set your spending limit
            </Text>
          </View>

          {!editing && (
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={colors.primary}
              />

              <Text style={styles.editButtonText}>
                Edit
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View>
            <TextInput
              style={styles.input}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
              placeholder="Enter budget amount"
              placeholderTextColor={colors.secondaryText}
            />

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setBudgetInput(String(budget));
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelText}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveBudget}
              >
                <Text style={styles.saveText}>
                  Save Budget
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.currentBudget}>
            {money(budget)}
          </Text>
        )}
      </View>
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
    paddingBottom: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: 13,
    marginTop: 4,
  },
  headerIcon: {
    backgroundColor: dark ? '#1D4032' : '#E2F3E8',
    padding: 12,
    borderRadius: 14,
  },
  hero: {
    backgroundColor: dark ? '#123D30' : '#153C2E',
    padding: 22,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: '#BBD7C8',
    fontSize: 14,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 35,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 18,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroMetaText: {
    color: '#D5E7DC',
    fontSize: 12,
  },
  progressTrack: {
    height: 9,
    borderRadius: 10,
    backgroundColor: '#436B57',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
  },
  statusText: {
    color: '#D5E7DC',
    fontSize: 12,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 10,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 17,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardHint: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 5,
    marginBottom: 14,
  },
  progressSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    gap: 20,
  },
  percentageCircle: {
    width: 115,
    height: 115,
    borderRadius: 58,
    borderWidth: 11,
    borderColor: dark ? '#334155' : '#D5EBDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 23,
    fontWeight: 'bold',
  },
  percentageCaption: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  progressDetails: {
    flex: 1,
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.text,
    fontSize: 13,
  },
  progressHint: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  secondaryTrack: {
    height: 8,
    backgroundColor: dark ? '#334155' : '#EDF2F7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  secondaryFill: {
    height: '100%',
    borderRadius: 10,
  },
  categoryRow: {
    marginTop: 14,
  },
  categoryHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  categoryTrack: {
    height: 7,
    backgroundColor: dark ? '#334155' : '#F1F5F9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 10,
  },
  emptyText: {
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: 18,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: dark ? '#1D4032' : '#EAF7EF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  currentBudget: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 17,
    marginBottom: 12,
    color: colors.text,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 13,
    backgroundColor: dark ? '#334155' : '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.secondaryText,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 13,
    backgroundColor: '#15803D',
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
