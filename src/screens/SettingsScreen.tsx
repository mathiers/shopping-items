
import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeContext';

import {
  getCurrentUser,
  logoutUser,
} from '../services/appwrite';

import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometricLogin,
  disableBiometricLogin,
} from '../services/biometrics';

export type SettingsStackParams = {
  SettingsMain: undefined;
  Categories: undefined;
};

type Navigation = NativeStackNavigationProp<
  SettingsStackParams,
  'SettingsMain'
>;

type SettingsProps = {
  onSignOut?: () => void;
  isGuest?: boolean;
};

const CURRENCY_KEY = '@shopping_currency';

const CURRENCIES = [
  { code: 'GBP', label: '🇬🇧 British Pound (£)' },
  { code: 'USD', label: '🇺🇸 US Dollar ($)' },
  { code: 'EUR', label: '🇪🇺 Euro (€)' },
  { code: 'JPY', label: '🇯🇵 Japanese Yen (¥)' },
  { code: 'CNY', label: '🇨🇳 Chinese Yuan (¥)' },
  { code: 'INR', label: '🇮🇳 Indian Rupee (₹)' },
  { code: 'CAD', label: '🇨🇦 Canadian Dollar ($)' },
  { code: 'AUD', label: '🇦🇺 Australian Dollar ($)' },
  { code: 'ZAR', label: '🇿🇦 South African Rand (R)' },
  { code: 'ZWG', label: '🇿🇼 Zimbabwe Gold (ZiG)' },
];

export default function SettingsScreen({
  onSignOut,
  isGuest = false,
}: SettingsProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { darkMode, setDarkMode } = useAppTheme();

  const [currency, setCurrency] = useState('GBP');
  const [currencyExpanded, setCurrencyExpanded] = useState(false);

  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  // Theme colours
  const background = darkMode ? '#111827' : '#F5F7FA';
  const surface = darkMode ? '#1F2937' : '#FFFFFF';
  const primary = darkMode ? '#F9FAFB' : '#153C2E';
  const secondary = darkMode ? '#9CA3AF' : '#667085';
  const divider = darkMode ? '#374151' : '#E5E7EB';

  // Load currency
  useFocusEffect(
    useCallback(() => {
      let active = true;

      AsyncStorage.getItem(CURRENCY_KEY)
        .then(saved => {
          if (active) setCurrency(saved || 'GBP');
        })
        .catch(error => {
          console.error('Currency load error:', error);
        });

      return () => {
        active = false;
      };
    }, [])
  );

  // Load account information
  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (isGuest) {
        setAccountName('');
        setAccountEmail('');
        setAccountId(null);
        setAccountLoading(false);
      } else {
        setAccountLoading(true);

        getCurrentUser()
          .then(user => {
            if (!active) return;

            setAccountName(user?.name || 'Shopping Items User');
            setAccountEmail(user?.email || '');
            setAccountId(user?.$id ?? null);
          })
          .catch(error => {
            if (!active) return;

            console.error('Account load error:', error);
            setAccountName('My Account');
            setAccountEmail('Unable to load account details');
            setAccountId(null);
          })
          .finally(() => {
            if (active) setAccountLoading(false);
          });
      }

      return () => {
        active = false;
      };
    }, [isGuest])
  );

  // Load fingerprint settings
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadBiometrics = async () => {
        try {
          if (isGuest || !accountId) {
            if (active) {
              setBiometricAvailable(false);
              setBiometricEnabled(false);
            }
            return;
          }

          const [available, enabled] = await Promise.all([
            isBiometricAvailable(),
            isBiometricEnabled(accountId),
          ]);

          if (active) {
            setBiometricAvailable(available);
            setBiometricEnabled(enabled);
          }
        } catch (error) {
          console.error('Biometric settings error:', error);
        }
      };

      void loadBiometrics();

      return () => {
        active = false;
      };
    }, [isGuest, accountId])
  );

  const updateCurrency = async (code: string) => {
    try {
      await AsyncStorage.setItem(CURRENCY_KEY, code);
      setCurrency(code);
      setCurrencyExpanded(false);
    } catch (error) {
      console.error('Currency save error:', error);
      Alert.alert('Error', 'Could not save currency.');
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (biometricBusy || isGuest || !accountId) return;

    setBiometricBusy(true);

    try {
      if (value) {
        const enabled = await enableBiometricLogin(accountId);

        if (enabled) {
          setBiometricEnabled(true);
        } else {
          Alert.alert(
            'Fingerprint not enabled',
            'Biometric verification was cancelled or unsuccessful.'
          );
        }
      } else {
        await disableBiometricLogin(accountId);
        setBiometricEnabled(false);
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);

      Alert.alert(
        'Error',
        'Could not update fingerprint settings.'
      );
    } finally {
      setBiometricBusy(false);
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

  const performSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);

    try {
      // Remove this account's preference before ending its session.
      // If this fails, do not sign out with stale local security state.
      if (accountId) await disableBiometricLogin(accountId);
      await logoutUser();

      setBiometricEnabled(false);
      setAccountName('');
      setAccountEmail('');
      setAccountId(null);

      onSignOut?.();
    } catch (error: any) {
      Alert.alert(
        'Sign out failed',
        error?.message ?? 'Please try again.'
      );
    } finally {
      setSigningOut(false);
    }
  };

  const handleSignOut = () => {
    if (signingOut) return;

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void performSignOut();
          },
        },
      ]
    );
  };

  const selectedCurrency = CURRENCIES.find(
    item => item.code === currency
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: background },
      ]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12 },
      ]}
    >
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
      />

      <Text style={[styles.title, { color: primary }]}>
        Settings
      </Text>

      <Text style={[styles.subtitle, { color: secondary }]}>
        Personalise your shopping experience
      </Text>

      {/* MY ACCOUNT */}

      <Text style={[styles.section, { color: secondary }]}>
        MY ACCOUNT
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: '#EAF7EF' },
            ]}
          >
            <Ionicons
              name={isGuest ? 'person-outline' : 'person-circle-outline'}
              size={25}
              color="#15803D"
            />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              {isGuest
                ? 'Guest Mode'
                : accountLoading
                  ? 'Loading account...'
                  : accountName || 'My Account'}
            </Text>

            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              {isGuest
                ? 'Using Shopping Items without an account'
                : accountEmail || 'Signed in'}
            </Text>
          </View>

          {accountLoading && (
            <ActivityIndicator size="small" color="#15803D" />
          )}
        </View>
      </View>

      {/* APPEARANCE */}

      <Text style={[styles.section, { color: secondary }]}>
        APPEARANCE
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: darkMode ? '#374151' : '#EAF7EF',
              },
            ]}
          >
            <Ionicons
              name={darkMode ? 'moon-outline' : 'sunny-outline'}
              size={23}
              color="#16A34A"
            />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              Dark Mode
            </Text>

            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              Dark appearance for the app
            </Text>
          </View>

          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{
              false: '#CBD5E1',
              true: '#86EFAC',
            }}
            thumbColor={darkMode ? '#15803D' : '#FFFFFF'}
          />
        </View>
      </View>

      {/* REGION */}

      <Text style={[styles.section, { color: secondary }]}>
        REGION
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => setCurrencyExpanded(value => !value)}
          accessibilityRole="button"
          accessibilityLabel="Select currency"
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: '#EAF7EF' },
            ]}
          >
            <Ionicons
              name="cash-outline"
              size={23}
              color="#15803D"
            />
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
            name={
              currencyExpanded ? 'chevron-up' : 'chevron-down'
            }
            size={20}
            color={secondary}
          />
        </TouchableOpacity>

        {currencyExpanded &&
          CURRENCIES.map(item => (
            <TouchableOpacity
              key={item.code}
              style={[
                styles.option,
                { borderTopColor: divider },
              ]}
              onPress={() => updateCurrency(item.code)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${item.code}`}
            >
              <Text style={[styles.optionText, { color: primary }]}>
                {item.label}
              </Text>

              {currency === item.code && (
                <Ionicons
                  name="checkmark-circle"
                  size={21}
                  color="#15803D"
                />
              )}
            </TouchableOpacity>
          ))}
      </View>

      {/* SHOPPING PREFERENCES */}

      <Text style={[styles.section, { color: secondary }]}>
        SHOPPING PREFERENCES
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Categories')}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: '#F2EAFB' },
            ]}
          >
            <Ionicons
              name="grid-outline"
              size={23}
              color="#9564C5"
            />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: primary }]}>
              Categories
            </Text>

            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              Manage categories, icons, colours and order
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={secondary}
          />
        </TouchableOpacity>
      </View>

      {/* ACCOUNT ACCESS */}

      <Text style={[styles.section, { color: secondary }]}>
        ACCOUNT ACCESS
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={isGuest ? () => onSignOut?.() : handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel={
            isGuest ? 'Sign in or register' : 'Sign out'
          }
        >
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isGuest ? '#EAF7EF' : '#FEE2E2',
              },
            ]}
          >
            <Ionicons
              name={isGuest ? 'log-in-outline' : 'log-out-outline'}
              size={23}
              color={isGuest ? '#15803D' : '#DC2626'}
            />
          </View>

          <View style={styles.rowText}>
            <Text
              style={[
                styles.rowTitle,
                { color: isGuest ? primary : '#DC2626' },
              ]}
            >
              {isGuest
                ? 'Sign In or Register'
                : signingOut
                  ? 'Signing out...'
                  : 'Sign Out'}
            </Text>

            <Text style={[styles.rowSubtitle, { color: secondary }]}>
              {isGuest
                ? 'Access your Shopping Items account'
                : 'Securely end your current session'}
            </Text>
          </View>

          {signingOut ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={secondary}
            />
          )}
        </TouchableOpacity>

        {/* FINGERPRINT UNLOCK - INSIDE THE CARD */}

        {!isGuest && (
          <View
            style={[
              styles.row,
              {
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: divider,
              },
            ]}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: '#EAF7EF' },
              ]}
            >
              <Ionicons
                name="finger-print-outline"
                size={23}
                color="#15803D"
              />
            </View>

            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: primary }]}>
                Fingerprint Unlock
              </Text>

              <Text style={[styles.rowSubtitle, { color: secondary }]}>
                {biometricAvailable
                  ? 'Require fingerprint after 5 minutes away'
                  : 'Biometrics unavailable on this device'}
              </Text>
            </View>

            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricAvailable || biometricBusy}
              trackColor={{
                false: '#CBD5E1',
                true: '#86EFAC',
              }}
              thumbColor={
                biometricEnabled ? '#15803D' : '#FFFFFF'
              }
            />
          </View>
        )}
      </View>

      {/* ABOUT */}

      <Text style={[styles.section, { color: secondary }]}>
        ABOUT
      </Text>

      <View style={[styles.card, { backgroundColor: surface }]}>
        <View style={styles.row}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: '#EAF7EF' },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={23}
              color="#15803D"
            />
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

      {/* FOOTER */}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: secondary }]}>
          Developed by Mathias Moyo
        </Text>

        <TouchableOpacity
          onPress={contactDeveloper}
          accessibilityRole="link"
        >
          <Text style={styles.email}>
            Contact Developer · mrmoyomathias@gmail.com
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    flexShrink: 1,
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
