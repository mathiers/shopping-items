
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import './src/i18n';
import { loadSavedLanguage } from './src/i18n';

import AuthScreen from './src/screens/AuthScreen';
import ShoppingScreen from './src/screens/ShoppingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';

import {
  getCurrentUser,
  logoutUser,
} from './src/services/appwrite';

import {
  authenticateWithBiometrics,
  isBiometricEnabled,
  clearLegacyBiometricPreference,
} from './src/services/biometrics';

import type { SettingsStackParams } from './src/screens/SettingsScreen';

import { lightColors, darkColors } from './src/theme/colors';

import {
  ThemeProvider,
  useAppTheme,
} from './src/theme/ThemeContext';

type RootTabParamList = {
  Shop: undefined;
  History: undefined;
  Budget: undefined;
  Settings: undefined;
};

type AccessMode = 'login' | 'authenticated' | 'guest';

type AuthNavigationProps = {
  onSignOut: () => void;
  isGuest: boolean;
};

const LOCK_AFTER_MS = 5 * 60 * 1000;

const Tab = createBottomTabNavigator<RootTabParamList>();

const SettingsStack =
  createNativeStackNavigator<SettingsStackParams>();

function SettingsNavigator({
  onSignOut,
  isGuest,
}: AuthNavigationProps) {
  const { darkMode } = useAppTheme();
  const colors = darkMode ? darkColors : lightColors;

  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <SettingsStack.Screen
        name="SettingsMain"
        options={{ headerShown: false }}
      >
        {props => (
          <SettingsScreen
            {...props}
            onSignOut={onSignOut}
            isGuest={isGuest}
          />
        )}
      </SettingsStack.Screen>

      <SettingsStack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ title: 'Categories' }}
      />
    </SettingsStack.Navigator>
  );
}

function MainNavigator({
  onSignOut,
  isGuest,
}: AuthNavigationProps) {
  const insets = useSafeAreaInsets();
  const { darkMode } = useAppTheme();

  const colors = darkMode ? darkColors : lightColors;
  const baseTheme = darkMode ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        initialRouteName="Shop"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.secondaryText,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 65 + insets.bottom,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 12),
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: React.ComponentProps<
              typeof Ionicons
            >['name'];

            switch (route.name) {
              case 'Shop':
                iconName = focused ? 'cart' : 'cart-outline';
                break;
              case 'History':
                iconName = focused ? 'time' : 'time-outline';
                break;
              case 'Budget':
                iconName = focused ? 'wallet' : 'wallet-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'ellipse-outline';
            }

            return (
              <Ionicons
                name={iconName}
                size={size}
                color={color}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Shop" component={ShoppingScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Budget" component={BudgetScreen} />

        <Tab.Screen name="Settings">
          {() => (
            <SettingsNavigator
              onSignOut={onSignOut}
              isGuest={isGuest}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<AccessMode>('login');
  const [locked, setLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [leavingSession, setLeavingSession] = useState(false);

  const accessRef = useRef<AccessMode>('login');
  const accountIdRef = useRef<string | null>(null);
  const lockedRef = useRef(false);
  const backgroundAt = useRef<number | null>(null);
  const authenticationRunning = useRef(false);
  const appState = useRef<AppStateStatus>((AppState.currentState ?? 'active') as AppStateStatus);

  const updateAccess = useCallback((next: AccessMode) => {
    accessRef.current = next;
    setAccess(next);
  }, []);

  const updateLocked = useCallback((value: boolean) => {
    lockedRef.current = value;
    setLocked(value);
  }, []);

  const unlock = useCallback(async () => {
    if (
      authenticationRunning.current ||
      accessRef.current !== 'authenticated' ||
      !lockedRef.current ||
      !accountIdRef.current
    ) {
      return;
    }

    authenticationRunning.current = true;
    setUnlocking(true);

    try {
      const successful = await authenticateWithBiometrics();

      if (
        successful &&
        accessRef.current === 'authenticated'
      ) {
        updateLocked(false);
      }
    } catch (error) {
      console.error('Fingerprint unlock error:', error);
    } finally {
      authenticationRunning.current = false;
      setUnlocking(false);
    }
  }, [updateLocked]);

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      try {
        await loadSavedLanguage();

        const user = await getCurrentUser();

        if (!active) return;
        accountIdRef.current = user?.$id ?? null;

        if (!user) {
          updateAccess('login');
          return;
        }

        // Keep the app covered while checking security settings.
        await clearLegacyBiometricPreference();
        const enabled = await isBiometricEnabled(user.$id);

        if (!active) return;

        if (enabled) {
          updateLocked(true);
        }

        updateAccess('authenticated');
      } catch (error) {
        console.error('Startup error:', error);

        if (active) {
          updateAccess('login');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initialise();

    return () => {
      active = false;
    };
  }, [updateAccess, updateLocked]);

  // Automatically prompt after a locked startup.
  useEffect(() => {
    if (
      !loading &&
      access === 'authenticated' &&
      locked
    ) {
      void unlock();
    }
  }, [loading, access, locked, unlock]);

  // Track time away from the app.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async nextState => {
        const previous = appState.current;
        appState.current = nextState;

        if (
          nextState === 'background' ||
          nextState === 'inactive'
        ) {
          if (backgroundAt.current === null) {
            backgroundAt.current = Date.now();
          }
          return;
        }

        if (nextState !== 'active') return;

        const awaySince = backgroundAt.current;
        backgroundAt.current = null;

        if (
          previous === 'active' ||
          awaySince === null ||
          accessRef.current !== 'authenticated' ||
          lockedRef.current
        ) {
          return;
        }

        if (Date.now() - awaySince < LOCK_AFTER_MS) {
          return;
        }

        // Cover the app immediately, before asynchronous checks.
        updateLocked(true);

        try {
          const accountId = accountIdRef.current;
          if (!accountId) return;
          const enabled = await isBiometricEnabled(accountId);

          if (
            accessRef.current !== 'authenticated'
          ) {
            return;
          }

          if (!enabled) {
            updateLocked(false);
          }
        } catch (error) {
          console.error('Biometric preference check error:', error);
          // Fail closed: keep the app locked.
        }
      }
    );

    return () => subscription.remove();
  }, [updateLocked]);

  const usePasswordInstead = async () => {
    if (leavingSession) return;

    setLeavingSession(true);

    try {
      // End the existing Appwrite session so password login
      // requires a new authentication.
      await logoutUser();

      accountIdRef.current = null;
      updateLocked(false);
      updateAccess('login');
    } catch (error) {
      console.error('Password fallback error:', error);
    } finally {
      setLeavingSession(false);
    }
  };

  const handleSignOut = () => {
    accountIdRef.current = null;
    backgroundAt.current = null;
    updateLocked(false);
    updateAccess('login');
  };

  if (loading) {
    return (
      <View style={authStyles.loadingContainer}>
        <Text style={authStyles.loadingText}>
          Shopping Items
        </Text>
        <Text style={authStyles.loadingSubtext}>
          Loading your shopping companion...
        </Text>
      </View>
    );
  }

  if (access === 'login') {
    return (
      <AuthScreen
        onAuthenticated={() => {
          // Verify the new Appwrite account before mounting its data screens.
          setLoading(true);
          void (async () => {
            try {
              const user = await getCurrentUser();
              if (!user) throw new Error('No authenticated account');
              accountIdRef.current = user.$id;
              await clearLegacyBiometricPreference();
              const enabled = await isBiometricEnabled(user.$id);
              backgroundAt.current = null;
              updateLocked(enabled);
              updateAccess('authenticated');
            } catch (error) {
              console.error('Sign-in verification error:', error);
              accountIdRef.current = null;
              updateAccess('login');
            } finally {
              setLoading(false);
            }
          })();
        }}
        onGuest={() => {
          accountIdRef.current = null;
          backgroundAt.current = null;
          updateLocked(false);
          updateAccess('guest');
        }}
      />
    );
  }

  if (access === 'authenticated' && locked) {
    return (
      <View style={authStyles.lockContainer}>
        <View style={authStyles.lockIcon}>
          <Ionicons
            name="finger-print-outline"
            size={68}
            color="#FFFFFF"
          />
        </View>

        <Text style={authStyles.lockTitle}>
          Shopping Items Locked
        </Text>

        <Text style={authStyles.lockDescription}>
          Verify your fingerprint to access your shopping lists.
        </Text>

        <TouchableOpacity
          style={authStyles.unlockButton}
          onPress={() => void unlock()}
          disabled={unlocking || leavingSession}
        >
          {unlocking ? (
            <ActivityIndicator color="#064E3B" />
          ) : (
            <Text style={authStyles.unlockButtonText}>
              Unlock with Fingerprint
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={authStyles.passwordButton}
          onPress={() => void usePasswordInstead()}
          disabled={unlocking || leavingSession}
        >
          <Text style={authStyles.passwordButtonText}>
            {leavingSession
              ? 'Signing out...'
              : 'Use Account Password Instead'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <MainNavigator
      onSignOut={handleSignOut}
      isGuest={access === 'guest'}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const authStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingSubtext: {
    color: '#D1FAE5',
    marginTop: 12,
  },
  lockContainer: {
    flex: 1,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  lockIcon: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  lockTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  lockDescription: {
    color: '#D1FAE5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginTop: 12,
    marginBottom: 30,
  },
  unlockButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  unlockButtonText: {
    color: '#064E3B',
    fontSize: 16,
    fontWeight: '800',
  },
  passwordButton: {
    padding: 12,
  },
  passwordButtonText: {
    color: '#D1FAE5',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});



