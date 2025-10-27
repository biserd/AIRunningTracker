import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RunnerScoreScreen from '../screens/RunnerScoreScreen';
import RacePredictionsScreen from '../screens/RacePredictionsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ActivityDetailsScreen from '../screens/ActivityDetailsScreen';
import MLInsightsScreen from '../screens/MLInsightsScreen';
import PerformanceScreen from '../screens/PerformanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Strava Orange color
const STRAVA_ORANGE = '#FC4C02';

function MainTabs({ user, token, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Runner Score') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Race Predictions') {
            iconName = focused ? 'analytics' : 'analytics-outline';
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
      <Tab.Screen name="Runner Score">
        {props => <RunnerScoreScreen {...props} user={user} token={token} />}
      </Tab.Screen>
      <Tab.Screen name="Race Predictions">
        {props => <RacePredictionsScreen {...props} user={user} token={token} />}
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
          <Stack.Screen name="MLInsights" component={MLInsightsScreen} />
          <Stack.Screen name="Performance" component={PerformanceScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
