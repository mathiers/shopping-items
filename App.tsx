
import React from 'react';
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

import ShoppingScreen from './src/screens/ShoppingScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';

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

const Tab = createBottomTabNavigator<RootTabParamList>();

const SettingsStack =
  createNativeStackNavigator<SettingsStackParams>();

function SettingsNavigator() {
  const { darkMode } = useAppTheme();
  const colors = darkMode ? darkColors : lightColors;

  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />

      <SettingsStack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categories',
          headerTintColor: colors.primary,
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </SettingsStack.Navigator>
  );
}

function MainNavigator() {
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

        <Tab.Screen
          name="Settings"
          component={SettingsNavigator}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  React.useEffect(() => {
    loadSavedLanguage();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
