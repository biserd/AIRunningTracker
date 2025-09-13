import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  // Test connection to RunAnalytics backend
  const testConnection = async () => {
    try {
      setLoading(true);
      // Replace with your actual backend URL when testing on mobile
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        setIsConnected(true);
        Alert.alert('Success', 'Connected to RunAnalytics backend!');
      } else {
        setIsConnected(false);
        Alert.alert('Connection Failed', 'Could not connect to backend');
      }
    } catch (error) {
      setIsConnected(false);
      Alert.alert('Connection Error', 'Make sure RunAnalytics server is running');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>RunAnalytics Mobile</Text>
        <Text style={styles.subtitle}>AI-Powered Running Analytics</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Backend Connection</Text>
          <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]}>
            <Text style={styles.statusText}>
              {loading ? 'Testing...' : isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={testConnection}>
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Mobile App Features</Text>
          <Text style={styles.infoText}>• Native mobile interface</Text>
          <Text style={styles.infoText}>• Real-time backend connection</Text>
          <Text style={styles.infoText}>• Push notifications (future)</Text>
          <Text style={styles.infoText}>• Offline capabilities (future)</Text>
        </View>

        <View style={styles.backendInfo}>
          <Text style={styles.backendText}>Backend: localhost:5000</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  statusIndicator: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connected: {
    backgroundColor: '#d4edda',
  },
  disconnected: {
    backgroundColor: '#f8d7da',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  backendInfo: {
    alignItems: 'center',
    marginTop: 20,
  },
  backendText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});