import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';

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

export default function DashboardScreen({ navigation, user, token, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
    }
  }, [user, token]);

  const fetchDashboardData = async () => {
    if (!user || !token) return;
    
    setDataLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch dashboard data');
    } finally {
      setDataLoading(false);
    }
  };

  const getActivityIconColor = (index) => {
    const colorOptions = [
      { bg: colors.primary + '20', color: colors.primary },
      { bg: colors.performanceBlue + '20', color: colors.performanceBlue },
      { bg: colors.achievementGreen + '20', color: colors.achievementGreen }
    ];
    return colorOptions[index % colorOptions.length];
  };

  const getInsightStyling = (type) => {
    const stylings = {
      performance: { borderColor: colors.performanceBlue },
      pattern: { borderColor: colors.achievementGreen },
      recovery: { borderColor: colors.destructive },
      motivation: { borderColor: colors.warning },
      technique: { borderColor: '#8B5CF6' },
      recommendation: { borderColor: colors.primary }
    };
    return stylings[type] || stylings.performance;
  };

  const getInsightsArray = (insights) => {
    if (!insights) return [];
    
    const insightArray = [];
    ['performance', 'pattern', 'recovery', 'motivation', 'technique'].forEach(type => {
      if (insights[type]) {
        insightArray.push({ ...insights[type], type });
      }
    });
    
    if (insights.recommendations && insights.recommendations.length > 0) {
      insights.recommendations.forEach(rec => {
        insightArray.push({ ...rec, type: 'recommendation' });
      });
    }
    
    return insightArray;
  };

  const insightsArray = getInsightsArray(dashboardData?.insights);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
        <Text style={styles.subtitle}>Welcome, {user?.email}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {dashboardData?.monthlyStats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>This Month</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{dashboardData.monthlyStats.formattedDistance}</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{dashboardData.monthlyStats.activities}</Text>
                  <Text style={styles.statLabel}>Runs</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{dashboardData.monthlyStats.formattedPace}</Text>
                  <Text style={styles.statLabel}>Avg Pace</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Activities</Text>
              </View>
              
              {dashboardData?.activities && dashboardData.activities.length > 0 ? (
                <View style={styles.cardContent}>
                  {dashboardData.activities.slice(0, 3).map((activity, index) => {
                    const iconStyle = getActivityIconColor(index);
                    return (
                      <View key={index} style={styles.activityRow}>
                        <View style={[styles.activityIcon, { backgroundColor: iconStyle.bg }]}>
                          <Text style={[styles.activityIconText, { color: iconStyle.color }]}>🏃</Text>
                        </View>
                        <View style={styles.activityDetails}>
                          <Text style={styles.activityName}>{activity.name || 'Running Activity'}</Text>
                          <Text style={styles.activityMeta}>
                            {(activity.distance / 1000).toFixed(2)} km • {Math.floor(activity.movingTime / 60)} min
                          </Text>
                          <Text style={styles.activityDate}>
                            {new Date(activity.startDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🏃</Text>
                  <Text style={styles.emptyTitle}>No activities yet</Text>
                  <Text style={styles.emptyText}>Connect to Strava and sync your activities.</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIconContainer}>
                    <Text style={styles.insightIcon}>🧠</Text>
                  </View>
                  <Text style={styles.cardTitle}>AI Insights</Text>
                </View>
              </View>
              
              {insightsArray && insightsArray.length > 0 ? (
                <View style={styles.cardContent}>
                  {insightsArray.slice(0, 3).map((insight, index) => {
                    const styling = getInsightStyling(insight.type);
                    return (
                      <View key={index} style={[styles.insightCard, { borderLeftColor: styling.borderColor }]}>
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                        <Text style={styles.insightContent}>{insight.content}</Text>
                        <Text style={[styles.insightType, { color: styling.borderColor }]}>
                          {insight.type?.toUpperCase()}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🧠</Text>
                  <Text style={styles.emptyTitle}>No insights yet</Text>
                  <Text style={styles.emptyText}>Generate AI insights to see performance analysis.</Text>
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
  header: {
    backgroundColor: colors.primary,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primaryForeground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primaryForeground,
    opacity: 0.9,
  },
  logoutButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  logoutText: {
    color: colors.primaryForeground,
    fontWeight: '600',
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
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.mutedForeground,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    fontWeight: '500',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  activityIconText: {
    fontSize: 20,
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  activityMeta: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: colors.performanceBlue + '20',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  insightIcon: {
    fontSize: 16,
  },
  insightCard: {
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 8,
  },
  insightContent: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: 8,
  },
  insightType: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
});
