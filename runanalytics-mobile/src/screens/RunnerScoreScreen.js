import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';

const API_BASE_URL = 'https://aitracker.run';

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

export default function RunnerScoreScreen({ navigation, user, token }) {
  const [runnerScore, setRunnerScore] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchRunnerScore();
    }
  }, [user, token]);

  const fetchRunnerScore = async () => {
    if (!user || !token) return;
    
    setDataLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/runner-score/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRunnerScore(data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch runner score');
    } finally {
      setDataLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    const gradeColors = {
      'A+': colors.achievementGreen,
      'A': colors.achievementGreen,
      'B+': colors.performanceBlue,
      'B': colors.performanceBlue,
      'C+': colors.warning,
      'C': colors.warning,
      'D': colors.destructive,
      'F': colors.destructive
    };
    return gradeColors[grade] || colors.mutedForeground;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading runner score...</Text>
        </View>
      ) : runnerScore ? (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Runner Score</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.scoreDisplay}>
                  <Text style={[styles.scoreValue, { color: getGradeColor(runnerScore.grade) }]}>
                    {runnerScore.totalScore}
                  </Text>
                  <Text style={[styles.scoreGrade, { color: getGradeColor(runnerScore.grade) }]}>
                    Grade {runnerScore.grade}
                  </Text>
                  <Text style={styles.scorePercentile}>
                    {runnerScore.percentile}th percentile
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Score Breakdown</Text>
            <View style={styles.componentsGrid}>
              {Object.entries(runnerScore.components).map(([key, value]) => (
                <View key={key} style={styles.componentCard}>
                  <Text style={styles.componentValue}>{Math.round(value)}</Text>
                  <Text style={styles.componentLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <Text style={styles.componentMax}>/ 25</Text>
                </View>
              ))}
            </View>
          </View>

          {runnerScore.badges && runnerScore.badges.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <View style={styles.badgesContainer}>
                {runnerScore.badges.map((badge, index) => (
                  <View key={index} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>Loading Runner Score</Text>
        </View>
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.charcoal,
    marginBottom: 16,
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
  scoreDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreGrade: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  scorePercentile: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  componentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  componentCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  componentValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  componentLabel: {
    fontSize: 14,
    color: colors.cardForeground,
    fontWeight: '600',
    marginBottom: 2,
  },
  componentMax: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: colors.primaryForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
