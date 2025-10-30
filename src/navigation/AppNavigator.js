import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityDetailsScreen from '../screens/ActivityDetailsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const STRAVA_ORANGE = '#FC4C02';

function MainTabs({ user, token, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: STRAVA_ORANGE,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard">
        {props => <DashboardScreen {...props} user={user} token={token} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Settings">
        {props => <SettingsScreen {...props} user={user} token={token} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ isAuthenticated, onLogin, onLogout, user, token }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login">
          {props => <LoginScreen {...props} onLogin={onLogin} />}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="MainTabs">
            {props => <MainTabs {...props} user={user} token={token} onLogout={onLogout} />}
          </Stack.Screen>
          <Stack.Screen name="ActivityDetails">
            {props => <ActivityDetailsScreen {...props} user={user} token={token} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}
