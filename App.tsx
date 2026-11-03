
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

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

import { getCurrentUser } from './src/services/appwrite';

import type { SettingsStackParams } from './src/screens/SettingsScreen';

import { lightColors, darkColors } from './src/theme/colors';

import {
  ThemeProvider,
  useAppTheme,
} from './src/theme/ThemeContext';

// --------------------------------------------------
// TYPES
// --------------------------------------------------

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

const Tab = createBottomTabNavigator<RootTabParamList>();

const SettingsStack =
  createNativeStackNavigator<SettingsStackParams>();

// --------------------------------------------------
// SETTINGS STACK NAVIGATOR
// --------------------------------------------------

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
        options={{
          headerShown: false,
        }}
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
        options={{
          title: 'Categories',
        }}
      />
    </SettingsStack.Navigator>
  );
}

// --------------------------------------------------
// MAIN BOTTOM TAB NAVIGATOR
// --------------------------------------------------

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
                iconName = focused
                  ? 'cart'
                  : 'cart-outline';
                break;

              case 'History':
                iconName = focused
                  ? 'time'
                  : 'time-outline';
                break;

              case 'Budget':
                iconName = focused
                  ? 'wallet'
                  : 'wallet-outline';
                break;

              case 'Settings':
                iconName = focused
                  ? 'settings'
                  : 'settings-outline';
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
        <Tab.Screen
          name="Shop"
          component={ShoppingScreen}
        />

        <Tab.Screen
          name="History"
          component={HistoryScreen}
        />

        <Tab.Screen
          name="Budget"
          component={BudgetScreen}
        />

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

// --------------------------------------------------
// APP AUTHENTICATION AND STARTUP
// --------------------------------------------------

function AppContent() {
  const [loading, setLoading] = useState(true);

  const [access, setAccess] = useState<AccessMode>('login');

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      try {
        await loadSavedLanguage();

        const user = await getCurrentUser();

        if (active) {
          setAccess(
            user ? 'authenticated' : 'login'
          );
        }
      } catch (error) {
        console.error('Startup error:', error);

        if (active) {
          setAccess('login');
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
  }, []);

  // Loading screen

  if (loading) {
    return (
      <View style={authStyles.loadingContainer}>
        <Text style={authStyles.loadingText}>
          🛒 Shopping Items
        </Text>

        <Text style={authStyles.loadingSubtext}>
          Loading your shopping companion...
        </Text>
      </View>
    );
  }

  // Login / registration screen

  if (access === 'login') {
    return (
      <AuthScreen
        onAuthenticated={() =>
          setAccess('authenticated')
        }
        onGuest={() =>
          setAccess('guest')
        }
      />
    );
  }

  // Main app, signed in or guest

  return (
    <MainNavigator
      onSignOut={() => setAccess('login')}
      isGuest={access === 'guest'}
    />
  );
}

// --------------------------------------------------
// APP ROOT
// --------------------------------------------------

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// --------------------------------------------------
// LOADING SCREEN STYLES
// --------------------------------------------------

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
});
