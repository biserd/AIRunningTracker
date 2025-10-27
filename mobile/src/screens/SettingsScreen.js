import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';

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

export default function SettingsScreen({ navigation, user, token, dashboardData }) {
  const [unitPreference, setUnitPreference] = useState('km');

  useEffect(() => {
    if (dashboardData?.user?.unitPreference) {
      setUnitPreference(dashboardData.user.unitPreference);
    }
  }, [dashboardData]);

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
                  color: dashboardData?.user?.stravaConnected ? colors.achievementGreen : colors.mutedForeground 
                }]}>
                  {dashboardData?.user?.stravaConnected ? '✓ Connected' : 'Not connected'}
                </Text>
              </View>
            </View>
          </View>
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
});
