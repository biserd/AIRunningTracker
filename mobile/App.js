import React, { useState, useEffect } from 'react';
import { AppRegistry } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Authentication state management
  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator 
          isAuthenticated={isAuthenticated} 
          onLogin={handleLogin}
          onLogout={handleLogout}
          user={user}
          token={token}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Register the main component
AppRegistry.registerComponent('main', () => App);
