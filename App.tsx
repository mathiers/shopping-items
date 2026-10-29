
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  purchased: boolean;
};

export default function App() {
  const [budget, setBudget] = useState('100');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [items, setItems] = useState<ShoppingItem[]>([]);

  // Calculate purchased items total
  const spent = items
    .filter(item => item.purchased)
    .reduce((total, item) => total + item.price, 0);

  const budgetAmount = Number(budget) || 0;
  const remaining = budgetAmount - spent;

  const progress =
    budgetAmount > 0
      ? Math.min((spent / budgetAmount) * 100, 100)
      : 0;

  // Add a new shopping item
  const addItem = () => {
    const price = Number(itemPrice);

    if (
      !itemName.trim() ||
      !itemPrice.trim() ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return;
    }

    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: itemName.trim(),
      price,
      purchased: false,
    };

    setItems(previous => [...previous, newItem]);
    setItemName('');
    setItemPrice('');
  };

  // Mark an item purchased or unpurchased
  const togglePurchased = (id: string) => {
    setItems(previous =>
      previous.map(item =>
        item.id === id
          ? { ...item, purchased: !item.purchased }
          : item
      )
    );
  };

  // Delete a shopping item
  const deleteItem = (id: string) => {
    setItems(previous =>
      previous.filter(item => item.id !== id)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>🛒 Shopping Items</Text>

            <Text style={styles.subtitle}>
              Shop smarter. Stay on budget.
            </Text>

            {/* BUDGET CARD */}
            <View style={styles.budgetCard}>
              <Text style={styles.label}>
                Shopping Budget (£)
              </Text>

              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
                placeholder="Enter your budget"
              />

              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>Spent</Text>
                  <Text style={styles.amount}>
                    £{spent.toFixed(2)}
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
                    £{remaining.toFixed(2)}
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
            </View>

            {/* ADD ITEM */}
            <Text style={styles.sectionTitle}>
              Add Shopping Item
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Item name e.g. Milk"
              value={itemName}
              onChangeText={setItemName}
            />

            <TextInput
              style={styles.input}
              placeholder="Price e.g. 2.50"
              keyboardType="decimal-pad"
              value={itemPrice}
              onChangeText={setItemPrice}
            />

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

            <Text style={styles.itemPrice}>
              £{item.price.toFixed(2)}
            </Text>

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
    fontSize: 13,
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
  itemPrice: {
    fontWeight: 'bold',
    marginHorizontal: 12,
    color: '#344054',
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
