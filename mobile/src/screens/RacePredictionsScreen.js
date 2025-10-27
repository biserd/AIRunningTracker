import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';

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

export default function RacePredictionsScreen({ navigation, user, token }) {
  const [predictions, setPredictions] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchPredictions();
    }
  }, [user, token]);

  const fetchPredictions = async () => {
    if (!user || !token) return;
    
    setDataLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/ml/predictions/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch predictions');
    } finally {
      setDataLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading predictions...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Race Predictions</Text>
              </View>
              
              {predictions && predictions.length > 0 ? (
                <View style={styles.cardContent}>
                  {predictions.map((prediction, index) => (
                    <View key={index} style={styles.predictionCard}>
                      <View style={styles.predictionHeader}>
                        <Text style={styles.predictionDistance}>{prediction.distance}</Text>
                        <Text style={styles.predictionTime}>{prediction.predictedTime}</Text>
                      </View>
                      <View style={styles.predictionMeta}>
                        <Text style={styles.predictionConfidence}>
                          {prediction.confidence}% confidence
                        </Text>
                      </View>
                      <Text style={styles.predictionRecommendation}>
                        {prediction.recommendation}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🎯</Text>
                  <Text style={styles.emptyTitle}>Loading Predictions</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.mutedForeground,
    fontSize: 16,
  },
  predictionCard: {
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionDistance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.cardForeground,
  },
  predictionTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  predictionMeta: {
    marginBottom: 8,
  },
  predictionConfidence: {
    fontSize: 14,
    color: colors.performanceBlue,
    fontWeight: '500',
  },
  predictionRecommendation: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 8,
  },
});
