import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import { View, Text } from 'react-native';

// Placeholder screens
function TransactionsScreen() { return <View><Text>תנועות</Text></View>; }
function BudgetsScreen() { return <View><Text>תקציב</Text></View>; }
function SettingsScreen() { return <View><Text>הגדרות</Text></View>; }

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="בית" component={HomeScreen} />
        <Tab.Screen name="תנועות" component={TransactionsScreen} />
        <Tab.Screen name="תקציב" component={BudgetsScreen} />
        <Tab.Screen name="הגדרות" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
