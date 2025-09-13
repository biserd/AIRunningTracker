import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Replace this with your actual Replit URL
const API_BASE_URL = 'https://your-repl-name.repl.co';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activities, setActivities] = useState([]);
  const [insights, setInsights] = useState([]);

  // Check server connection
  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      Alert.alert('Connection Status', data.message || 'Connected to RunAnalytics!');
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to server. Check if the Replit is running.');
    }
  };

  // Login function
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        Alert.alert('Success', 'Logged in successfully!');
        fetchUserData();
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during login');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user activities and insights
  const fetchUserData = async () => {
    try {
      // Fetch activities
      const activitiesResponse = await fetch(`${API_BASE_URL}/api/activities`);
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData.slice(0, 5)); // Show latest 5
      }

      // Fetch insights
      const insightsResponse = await fetch(`${API_BASE_URL}/api/insights`);
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        setInsights(insightsData.slice(0, 3)); // Show latest 3
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
    }
  };

  // Logout function
  const handleLogout = () => {
    setUser(null);
    setActivities([]);
    setInsights([]);
    setEmail('');
    setPassword('');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
          <Text style={styles.subtitle}>Mobile App</Text>
        </View>

        {/* Connection Test */}
        <TouchableOpacity style={styles.testButton} onPress={checkConnection}>
          <Text style={styles.testButtonText}>Test Connection</Text>
        </TouchableOpacity>

        {/* Login Form */}
        <View style={styles.loginForm}>
          <Text style={styles.formTitle}>Login to Your Account</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          This mobile app connects to your RunAnalytics backend running on Replit.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
        <Text style={styles.subtitle}>Welcome, {user.email}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <View key={index} style={styles.activityCard}>
              <Text style={styles.activityName}>{activity.name || 'Running Activity'}</Text>
              <Text style={styles.activityDetails}>
                Distance: {(activity.distance / 1000).toFixed(2)} km
              </Text>
              <Text style={styles.activityDetails}>
                Duration: {Math.floor(activity.duration / 60)} min
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No activities found</Text>
        )}
      </View>

      {/* AI Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Insights</Text>
        {insights.length > 0 ? (
          insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightContent}>{insight.content}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No insights available</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4F46E5',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  testButton: {
    backgroundColor: '#10B981',
    margin: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loginForm: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    textAlign: 'center',
    color: '#666',
    margin: 20,
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    margin: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  activityCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  activityDetails: {
    fontSize: 14,
    color: '#666',
  },
  insightCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4F46E5',
  },
  insightContent: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
});