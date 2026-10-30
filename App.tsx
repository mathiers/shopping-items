
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import ShoppingScreen from './src/screens/ShoppingScreen';

type RootTabParamList = {
  Shop: undefined;
  History: undefined;
  Budget: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>
        Coming soon to Shopping Items
      </Text>
    </View>
  );
}

function HistoryScreen() {
  return <PlaceholderScreen title="Shopping History" />;
}

function BudgetScreen() {
  return <PlaceholderScreen title="Budget Overview" />;
}

function SettingsScreen() {
  return <PlaceholderScreen title="Settings" />;
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Shop"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#16834a',
          tabBarInactiveTintColor: '#667085',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e5e7eb',
            height: 65,
            paddingTop: 6,
            paddingBottom: 6,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
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
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#153c2e',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: '#667085',
    textAlign: 'center',
  },
});
