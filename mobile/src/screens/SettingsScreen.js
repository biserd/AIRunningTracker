import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar, ActivityIndicator } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

const API_BASE_URL = 'https://8569cb03-f268-4195-b845-f9a7784a2141-00-5cx90hqzmtzl.riker.replit.dev';

const colors = {
  primary: '#FC4C02',
  primaryForeground: '#FAFAFA',
  performanceBlue: '#3B82F6',
  achievementGreen: '#22C55E',
  darkSlate: '#334155',
  charcoal: '#333333',
  lightGrey: '#F8FAFC',
  card: '#FFFFFF',
  cardForeground: '#333333',
  border: '#E2E8F0',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  background: '#F8FAFC',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = '145066';

export default function SettingsScreen({ navigation, user, token, onLogout }) {
  const [unitPreference, setUnitPreference] = useState('km');
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'com.runanalytics.app',
    path: 'strava-callback'
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    if (!user || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUnitPreference(data.user.unitPreference || 'km');
          setIsStravaConnected(data.user.stravaConnected || false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!user || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ unitPreference })
      });

      if (response.ok) {
        Alert.alert('Success', 'Settings updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error updating settings');
    }
  };

  const handleConnectStrava = async () => {
    setConnectingStrava(true);
    
    try {
      const nonce = await Crypto.randomUUID();
      const stateValue = `${user.id}_${nonce}`;
      
      const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=read,activity:read_all&state=${stateValue}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success') {
        const url = result.url;
        const urlParams = new URL(url).searchParams;
        const code = urlParams.get('code');
        const returnedState = urlParams.get('state');
        
        if (!code || !returnedState) {
          Alert.alert('Error', 'Invalid OAuth response');
          return;
        }
        
        if (returnedState !== stateValue) {
          Alert.alert('Security Error', 'OAuth state mismatch. Please try again.');
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/strava/connect`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code })
        });

        if (response.ok) {
          setIsStravaConnected(true);
          fetchUserData();
          Alert.alert('Success', 'Strava connected successfully! Your activities will be synced automatically.');
        } else {
          const errorData = await response.json();
          Alert.alert('Connection Failed', errorData.message || 'Failed to connect to Strava');
        }
      } else if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Strava connection was cancelled');
      }
    } catch (error) {
      console.error('Strava OAuth error:', error);
      Alert.alert('Error', 'Failed to connect to Strava');
    } finally {
      setConnectingStrava(false);
    }
  };

  const handleDisconnectStrava = async () => {
    Alert.alert(
      'Disconnect Strava',
      'Are you sure you want to disconnect your Strava account? Your existing activities will remain, but new activities will not be synced.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/strava/disconnect/${user.id}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                }
              });

              if (response.ok) {
                setIsStravaConnected(false);
                fetchUserData();
                Alert.alert('Success', 'Strava disconnected successfully');
              } else {
                Alert.alert('Error', 'Failed to disconnect Strava');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error disconnecting Strava');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Units & Display</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.settingsLabel}>Distance Units</Text>
              <View style={styles.radioGroup}>
                {[
                  { value: 'km', label: 'Kilometers (km)' },
                  { value: 'miles', label: 'Miles (mi)' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.radioOption}
                    onPress={() => setUnitPreference(option.value)}
                  >
                    <View style={[styles.radio, unitPreference === option.value && styles.radioSelected]}>
                      {unitPreference === option.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={updateSettings}>
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Account Information</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Email</Text>
                <Text style={styles.accountValue}>{user?.email}</Text>
              </View>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Strava Status</Text>
                <Text style={[styles.accountValue, { 
                  color: isStravaConnected ? colors.achievementGreen : colors.mutedForeground 
                }]}>
                  {isStravaConnected ? '✓ Connected' : 'Not connected'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Strava Integration</Text>
            </View>
            <View style={styles.cardContent}>
              {!isStravaConnected ? (
                <>
                  <Text style={styles.integrationDescription}>
                    Connect your Strava account to automatically sync your running activities and get AI-powered insights.
                  </Text>
                  <TouchableOpacity 
                    style={[styles.primaryButton, connectingStrava && styles.buttonDisabled]} 
                    onPress={handleConnectStrava}
                    disabled={connectingStrava}
                  >
                    {connectingStrava ? (
                      <ActivityIndicator color={colors.primaryForeground} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Connect Strava</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.integrationDescription}>
                    Your Strava account is connected. Your activities are automatically synced.
                  </Text>
                  <TouchableOpacity 
                    style={styles.disconnectButton} 
                    onPress={handleDisconnectStrava}
                  >
                    <Text style={styles.disconnectButtonText}>Disconnect Strava</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.charcoal,
  },
  cardContent: {
    padding: 20,
    paddingTop: 0,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 12,
  },
  radioGroup: {
    marginBottom: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: colors.cardForeground,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  accountLabel: {
    fontSize: 16,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  accountValue: {
    fontSize: 16,
    color: colors.cardForeground,
    fontWeight: '600',
  },
  integrationDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  disconnectButton: {
    backgroundColor: colors.destructive,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  logoutButtonText: {
    color: colors.destructive,
    fontWeight: '600',
    fontSize: 16,
  },
});
