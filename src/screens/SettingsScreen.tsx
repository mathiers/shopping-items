
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type SettingsStackParams = {
  SettingsMain: undefined;
  Categories: undefined;
};

type Navigation = NativeStackNavigationProp<
  SettingsStackParams,
  'SettingsMain'
>;

const THEME_KEY = '@shopping_theme';
const CURRENCY_KEY = '@shopping_currency';
const LANGUAGE_KEY = '@shopping_language';

const CURRENCIES = [
  { code: 'GBP', label: '🇬🇧 British Pound (£)' },
  { code: 'USD', label: '🇺🇸 US Dollar ($)' },
  { code: 'EUR', label: '🇩🇪 Euro (€)' },
  { code: 'JPY', label: '🇯🇵 Japanese Yen (¥)' },
  { code: 'CNY', label: '🇨🇳 Chinese Yuan (¥)' },
  { code: 'INR', label: '🇮🇳 Indian Rupee (₹)' },
  { code: 'CAD', label: '🇨🇦 Canadian Dollar ($)' },
  { code: 'AUD', label: '🇦🇺 Australian Dollar ($)' },
  { code: 'ZAR', label: '🇿🇦 South African Rand (R)' },
  { code: 'ZWG', label: '🇿🇼 Zimbabwe Gold (ZiG)' },
];

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'sw', label: '🇰🇪 Kiswahili' },
  { code: 'sn', label: '🇿🇼 Shona' },
  { code: 'nd', label: '🇿🇼 isiNdebele' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { darkMode, setDarkMode } = useAppTheme();
  const dark = darkMode;
  const [currency, setCurrency] = useState('GBP');
  const [language, setLanguage] = useState('en');
  const [expanded, setExpanded] = useState<
    'currency' | 'language' | null
  >(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const values = await AsyncStorage.multiGet([
            CURRENCY_KEY,
            LANGUAGE_KEY,
          ]);

          if (!active) return;

          const stored = Object.fromEntries(values);

          setCurrency(stored[CURRENCY_KEY] || 'GBP');
          setLanguage(stored[LANGUAGE_KEY] || 'en');
        } catch (error) {
          console.error('Settings load error:', error);
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [])
  );



  const updateCurrency = async (code: string) => {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, code);
      setCurrency(code);
      setExpanded(null);
    } catch {
      Alert.alert('Error', 'Could not save currency.');
    }
  };

  const updateLanguage = async (code: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
      setLanguage(code);
      setExpanded(null);
    } catch {
      Alert.alert('Error', 'Could not save language.');
    }
  };

  const contactDeveloper = async () => {
    const url =
      'mailto:mrmoyomathias@gmail.com?subject=Shopping%20Items%20App';

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Email unavailable',
        'Contact: mrmoyomathias@gmail.com'
      );
    }
  };

  const background = dark ? '#111827' : '#F5F7FA';
  const surface = dark ? '#1F2937' : '#FFFFFF';
  const primary = dark ? '#F9FAFB' : '#153C2E';
  const secondary = dark ? '#9CA3AF' : '#667085';
  const divider = dark ? '#374151' : '#E5E7EB';

  const selectedCurrency =
    CURRENCIES.find(item => item.code === currency);

  const selectedLanguage =
    LANGUAGES.find(item => item.code === language);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12 },
      ]}
    >
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
      />

      <Text style={[styles.title, { color: primary }]}>
        Settings
      </Text>

      <Text style={[styles.subtitle, { color: secondary }]}>
        Personalise your shopping experience
      </Text>

      <Text style={[styles.section, { color: secondary }]}>
        APPEARANCE
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: dark ? '#374151' : '#EAF7EF' }]}>
            <Ionicons
              name={dark ? 'moon-outline' : 'sunny-outline'}
              size={23}
              color="#16A34A"
            />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              Dark Mode
            </Text>
            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              Dark appearance for Settings
            </Text>
          </View>

          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
            thumbColor={dark ? '#15803D' : '#FFFFFF'}
          />
        </View>
      </View>

      <Text style={[styles.section, { color: secondary }]}>
        REGION & LANGUAGE
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            setExpanded(expanded === 'language' ? null : 'language')
          }
        >
          <View style={[styles.iconBox, { backgroundColor: '#EAF1FB' }]}>
            <Ionicons name="language-outline" size={23} color="#447CC4" />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              App Language
            </Text>
            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              {selectedLanguage?.label || 'English'}
            </Text>
          </View>

          <Ionicons
            name={expanded === 'language' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={secondary}
          />
        </TouchableOpacity>

        {expanded === 'language' &&
          LANGUAGES.map(item => (
            <TouchableOpacity
              key={item.code}
              style={[styles.option, { borderTopColor: divider }]}
              onPress={() => updateLanguage(item.code)}
            >
              <Text style={[styles.optionText, { color: primary }]}>
                {item.label}
              </Text>
              {language === item.code && (
                <Ionicons name="checkmark-circle" size={21} color="#15803D" />
              )}
            </TouchableOpacity>
          ))}

        <View style={[styles.separator, { backgroundColor: divider }]} />

        <TouchableOpacity
          style={styles.row}
          onPress={() =>
            setExpanded(expanded === 'currency' ? null : 'currency')
          }
        >
          <View style={[styles.iconBox, { backgroundColor: '#EAF7EF' }]}>
            <Ionicons name="cash-outline" size={23} color="#15803D" />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              Currency
            </Text>
            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              {selectedCurrency?.label || 'British Pound'}
            </Text>
          </View>

          <Ionicons
            name={expanded === 'currency' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={secondary}
          />
        </TouchableOpacity>

        {expanded === 'currency' &&
          CURRENCIES.map(item => (
            <TouchableOpacity
              key={item.code}
              style={[styles.option, { borderTopColor: divider }]}
              onPress={() => updateCurrency(item.code)}
            >
              <Text style={[styles.optionText, { color: primary }]}>
                {item.label}
              </Text>
              {currency === item.code && (
                <Ionicons name="checkmark-circle" size={21} color="#15803D" />
              )}
            </TouchableOpacity>
          ))}
      </View>

      <Text style={[styles.section, { color: secondary }]}>
        SHOPPING PREFERENCES
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Categories')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F2EAFB' }]}>
            <Ionicons name="grid-outline" size={23} color="#9564C5" />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              Categories
            </Text>
            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              Manage categories, icons, colours and order
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={secondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.section, { color: secondary }]}>
        ABOUT
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#EAF7EF' }]}>
            <Ionicons name="information-circle-outline" size={23} color="#15803D" />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              Shopping Items
            </Text>
            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              Shopping list and budget manager
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: secondary }]}>
          Developed by Mathias Moyo
        </Text>

        <TouchableOpacity onPress={contactDeveloper}>
          <Text style={styles.email}>
            Contact Developer · mrmoyomathias@gmail.com
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 45,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 5,
    marginBottom: 22,
  },
  section: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 9,
  },
  card: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 53,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  separator: {
    height: 1,
    marginVertical: 15,
  },
  option: {
    paddingVertical: 13,
    paddingHorizontal: 7,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 7,
  },
  footerText: {
    fontSize: 11,
  },
  email: {
    color: '#15803D',
    fontSize: 11,
    textAlign: 'center',
  },
});
