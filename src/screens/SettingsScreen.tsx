
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  Category,
  DEFAULT_CATEGORIES,
  ICON_OPTIONS,
  PALETTE,
  getCategories,
  saveCategories,
  reassignItemCategory,
} from '../utils/shoppingCategories';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const iconName = (value: string): IconName =>
  value as IconName;

export default function SettingsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('basket-outline');
  const [background, setBackground] = useState<string>(
    PALETTE[0].background
  );

  const [accent, setAccent] = useState<string>(
    PALETTE[0].accent
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const saved = await getCategories();

          if (active) {
            setCategories(saved);
          }
        } catch (error) {
          console.error(error);

          if (active) {
            Alert.alert(
              'Loading failed',
              'Could not load categories.'
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setIcon('basket-outline');
    setBackground(PALETTE[0].background);
    setAccent(PALETTE[0].accent);
  };

  const persist = async (next: Category[]) => {
    await saveCategories(next);
    setCategories(next);
  };

  const submit = async () => {
    const cleanName = name.trim();

    if (!cleanName || busy) {
      if (!cleanName) {
        Alert.alert('Name required', 'Enter a category name.');
      }
      return;
    }

    if (
      categories.some(
        category =>
          category.name.toLowerCase() ===
            cleanName.toLowerCase() &&
          category.id !== editingId
      )
    ) {
      Alert.alert(
        'Duplicate category',
        'A category with that name already exists.'
      );
      return;
    }

    const original = categories.find(
      category => category.id === editingId
    );

    if (original?.id === 'other' && cleanName !== 'Other') {
      Alert.alert(
        'Protected category',
        'Other must keep its name.'
      );
      return;
    }

    setBusy(true);

    try {
      if (original) {
        const updated = categories.map(category =>
          category.id === editingId
            ? {
                ...category,
                name: cleanName,
                icon,
                background,
                accent,
              }
            : category
        );

        if (original.name !== cleanName) {
          await reassignItemCategory(
            original.name,
            cleanName
          );
        }

        await persist(updated);
      } else {
        const newCategory: Category = {
          id: `custom-${Date.now()}-${Math.random()}`,
          name: cleanName,
          icon,
          background,
          accent,
        };

        // Keep Other as the final fallback category.
        const otherIndex = categories.findIndex(
          category => category.id === 'other'
        );

        const updated = [...categories];

        updated.splice(
          otherIndex < 0 ? updated.length : otherIndex,
          0,
          newCategory
        );

        await persist(updated);
      }

      resetForm();
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Save failed',
        'Could not save category changes.'
      );
    } finally {
      setBusy(false);
    }
  };

  const editCategory = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setIcon(category.icon);
    setBackground(category.background);
    setAccent(category.accent);
  };

  const moveCategory = async (
    index: number,
    direction: number
  ) => {
    if (busy) return;

    const target = index + direction;

    if (target < 0 || target >= categories.length) {
      return;
    }

    const updated = [...categories];

    [updated[index], updated[target]] = [
      updated[target],
      updated[index],
    ];

    setBusy(true);

    try {
      await persist(updated);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not reorder categories.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = (category: Category) => {
    if (busy) return;

    if (category.id === 'other') {
      Alert.alert(
        'Protected category',
        'Other cannot be deleted.'
      );
      return;
    }

    Alert.alert(
      'Delete category?',
      `Delete "${category.name}"? Existing shopping items in this category will be moved to Other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);

            try {
              await reassignItemCategory(
                category.name,
                'Other'
              );

              await persist(
                categories.filter(
                  item => item.id !== category.id
                )
              );

              if (editingId === category.id) {
                resetForm();
              }
            } catch (error) {
              console.error(error);
              Alert.alert(
                'Delete failed',
                'Could not delete the category.'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const restoreDefaults = () => {
    Alert.alert(
      'Restore default categories?',
      'This adds back missing default categories. Your custom categories and their order will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            if (busy) return;

            setBusy(true);

            try {
              const missing = DEFAULT_CATEGORIES.filter(
                fallback =>
                  !categories.some(
                    current => current.id === fallback.id
                  )
              );

              await persist([
                ...categories.filter(
                  category => category.id !== 'other'
                ),
                ...missing.filter(
                  category => category.id !== 'other'
                ),
                categories.find(
                  category => category.id === 'other'
                ) || DEFAULT_CATEGORIES[8],
              ]);
            } catch (error) {
              console.error(error);
              Alert.alert(
                'Error',
                'Could not restore defaults.'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#15803d" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Personalize your shopping experience
      </Text>

      <View style={styles.card}>
        <Text style={styles.heading}>
          {editingId ? 'Edit Category' : 'Add Category'}
        </Text>

        <Text style={styles.label}>Category name</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Toiletries"
          maxLength={32}
        />

        <Text style={styles.label}>Choose an icon</Text>

        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.iconChoice,
                icon === option && styles.iconSelected,
              ]}
              onPress={() => setIcon(option)}
            >
              <Ionicons
                name={iconName(option)}
                size={23}
                color={
                  icon === option ? '#15803d' : '#64748b'
                }
              />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          Choose a background colour
        </Text>

        <View style={styles.paletteRow}>
          {PALETTE.map(option => (
            <TouchableOpacity
              key={option.background}
              style={[
                styles.colourChoice,
                {
                  backgroundColor: option.background,
                  borderColor:
                    background === option.background
                      ? '#15803d'
                      : '#d0d5dd',
                  borderWidth:
                    background === option.background ? 3 : 1,
                },
              ]}
              onPress={() => {
                setBackground(option.background);
                setAccent(option.accent);
              }}
            >
              {background === option.background && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#15803d"
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={[
            styles.preview,
            { backgroundColor: background },
          ]}
        >
          <Ionicons
            name={iconName(icon)}
            size={26}
            color={accent}
          />

          <View>
            <Text
              style={[
                styles.previewTitle,
                { color: accent },
              ]}
            >
              {name.trim() || 'My Category'}
            </Text>

            <Text style={styles.previewSubtitle}>
              Category preview
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            busy && styles.disabled,
          ]}
          onPress={submit}
          disabled={busy}
        >
          <Text style={styles.primaryButtonText}>
            {editingId ? 'Save Changes' : 'Add Category'}
          </Text>
        </TouchableOpacity>

        {editingId && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetForm}
          >
            <Text style={styles.cancelText}>
              Cancel editing
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>
            Category Order
          </Text>

          <Text style={styles.counter}>
            {categories.length} categories
          </Text>
        </View>

        <Text style={styles.hint}>
          Use the arrows to change the order shown in
          your Shop filters and category selectors.
        </Text>

        {categories.map((category, index) => (
          <View
            key={category.id}
            style={[
              styles.categoryRow,
              {
                backgroundColor: category.background,
              },
            ]}
          >
            <Ionicons
              name={iconName(category.icon)}
              size={22}
              color={category.accent}
            />

            <Text
              style={styles.categoryName}
              numberOfLines={1}
            >
              {category.name}
            </Text>

            <TouchableOpacity
              style={styles.smallAction}
              onPress={() => moveCategory(index, -1)}
              disabled={busy || index === 0}
            >
              <Ionicons
                name="arrow-up"
                size={19}
                color={index === 0 ? '#cbd5e1' : '#475569'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.smallAction}
              onPress={() => moveCategory(index, 1)}
              disabled={
                busy || index === categories.length - 1
              }
            >
              <Ionicons
                name="arrow-down"
                size={19}
                color={
                  index === categories.length - 1
                    ? '#cbd5e1'
                    : '#475569'
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.smallAction}
              onPress={() => editCategory(category)}
              disabled={busy}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color="#15803d"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.smallAction}
              onPress={() => deleteCategory(category)}
              disabled={busy || category.id === 'other'}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={
                  category.id === 'other'
                    ? '#cbd5e1'
                    : '#dc2626'
                }
              />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restoreDefaults}
          disabled={busy}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color="#15803d"
          />

          <Text style={styles.restoreText}>
            Restore missing default categories
          </Text>
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#153c2e',
  },
  subtitle: {
    color: '#667085',
    marginTop: 4,
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 14,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    color: '#667085',
    fontSize: 12,
  },
  hint: {
    color: '#667085',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontWeight: '600',
    color: '#344054',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 18,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 20,
  },
  iconChoice: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    borderColor: '#15803d',
    borderWidth: 2,
    backgroundColor: '#edf7eb',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  colourChoice: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  primaryButton: {
    backgroundColor: '#15803d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.5,
  },
  cancelButton: {
    alignItems: 'center',
    marginTop: 14,
  },
  cancelText: {
    color: '#64748b',
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 9,
    marginBottom: 9,
  },
  categoryName: {
    flex: 1,
    color: '#344054',
    fontSize: 13,
    fontWeight: '600',
  },
  smallAction: {
    padding: 5,
  },
  restoreButton: {
    marginTop: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  restoreText: {
    color: '#15803d',
    fontWeight: '600',
  },
});
