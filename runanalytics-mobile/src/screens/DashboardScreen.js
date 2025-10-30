import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar, RefreshControl } from 'react-native';

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

export default function DashboardScreen({ navigation, user, token, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [insightHistory, setInsightHistory] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchDashboardData();
      fetchInsightHistory();
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
      } else {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      Alert.alert('Error', 'Network error loading dashboard');
    } finally {
      setDataLoading(false);
    }
  };

  const fetchInsightHistory = async () => {
    if (!user || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/insights/history/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.timeline && Array.isArray(data.timeline)) {
          const allInsights = [];
          data.timeline.forEach(day => {
            Object.keys(day.insights || {}).forEach(category => {
              if (Array.isArray(day.insights[category])) {
                day.insights[category].forEach(insight => {
                  allInsights.push({
                    ...insight,
                    category,
                    date: day.date
                  });
                });
              }
            });
          });
          setInsightHistory(allInsights.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          ));
        }
      }
    } catch (error) {
      console.error('Insight history fetch error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchInsightHistory()]);
    setRefreshing(false);
  };

  const handleSyncActivities = async () => {
    if (!user || !token) return;
    
    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/strava/sync/${user.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        Alert.alert('Success', 'Activities synced successfully!');
        await fetchDashboardData();
      } else {
        Alert.alert('Sync Failed', 'Failed to sync activities');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during sync');
    } finally {
      setSyncing(false);
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
      performance: { borderColor: colors.performanceBlue, icon: '📊' },
      pattern: { borderColor: colors.achievementGreen, icon: '📈' },
      recovery: { borderColor: colors.destructive, icon: '❤️' },
      motivation: { borderColor: colors.warning, icon: '⚡' },
      technique: { borderColor: '#8B5CF6', icon: '💪' },
    };
    return stylings[type] || { borderColor: colors.primary, icon: '💡' };
  };

  const getInsightsByCategory = (insights) => {
    if (!insights) return {};
    
    const categories = {};
    ['performance', 'pattern', 'recovery', 'motivation', 'technique'].forEach(category => {
      if (insights[category]) {
        if (!categories[category]) categories[category] = [];
        categories[category].push(insights[category]);
      }
    });
    
    return categories;
  };

  const insightsByCategory = getInsightsByCategory(dashboardData?.insights);
  const stats = dashboardData?.stats || {};
  const runnerScore = dashboardData?.runnerScore || {};
  const goals = dashboardData?.goals || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} data-testid="button-logout">
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {dataLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {/* Strava Sync Section */}
          {dashboardData?.user?.stravaConnected && (
            <View style={styles.section}>
              <TouchableOpacity 
                style={[styles.syncButton, syncing && styles.syncButtonDisabled]} 
                onPress={handleSyncActivities}
                disabled={syncing}
                data-testid="button-sync-activities"
              >
                {syncing ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.syncButtonText}>🔄 Sync Activities</Text>
                )}
              </TouchableOpacity>
              {dashboardData?.user?.lastSyncAt && (
                <Text style={styles.lastSyncText}>
                  Last sync: {new Date(dashboardData.user.lastSyncAt).toLocaleString()}
                </Text>
              )}
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalDistance || '0.0'}</Text>
                <Text style={styles.statLabel}>Total Distance</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.avgPace || '0:00'}</Text>
                <Text style={styles.statLabel}>Avg Pace</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.trainingLoad || '0'}</Text>
                <Text style={styles.statLabel}>Training Load</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.recovery || 'N/A'}</Text>
                <Text style={styles.statLabel}>Recovery</Text>
              </View>
            </View>
          </View>

          {/* Runner Score */}
          {runnerScore.overall && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>🏆 Runner Score</Text>
                  <Text style={styles.runnerScoreValue}>{runnerScore.overall}/100</Text>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Endurance</Text>
                    <View style={styles.scoreBar}>
                      <View style={[styles.scoreBarFill, { width: `${runnerScore.endurance || 0}%` }]} />
                    </View>
                    <Text style={styles.scoreValue}>{runnerScore.endurance || 0}</Text>
                  </View>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Speed</Text>
                    <View style={styles.scoreBar}>
                      <View style={[styles.scoreBarFill, { width: `${runnerScore.speed || 0}%` }]} />
                    </View>
                    <Text style={styles.scoreValue}>{runnerScore.speed || 0}</Text>
                  </View>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Consistency</Text>
                    <View style={styles.scoreBar}>
                      <View style={[styles.scoreBarFill, { width: `${runnerScore.consistency || 0}%` }]} />
                    </View>
                    <Text style={styles.scoreValue}>{runnerScore.consistency || 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* AI Insights by Category */}
          {Object.keys(insightsByCategory).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Insights</Text>
              {Object.entries(insightsByCategory).map(([category, categoryInsights]) => {
                const styling = getInsightStyling(category);
                return (
                  <View key={category} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.insightCategoryHeader}>
                        <Text style={styles.insightCategoryIcon}>{styling.icon}</Text>
                        <Text style={styles.cardTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      {categoryInsights.map((insight, idx) => (
                        <View key={idx} style={[styles.insightCard, { borderLeftColor: styling.borderColor }]}>
                          <Text style={styles.insightTitle}>{insight.title}</Text>
                          <Text style={styles.insightContent}>{insight.content}</Text>
                          {insight.recommendation && (
                            <Text style={styles.insightRecommendation}>💡 {insight.recommendation}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Training Recommendations */}
          {dashboardData?.insights?.recommendations && dashboardData.insights.recommendations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.insightCategoryHeader}>
                    <Text style={styles.insightCategoryIcon}>💪</Text>
                    <Text style={styles.cardTitle}>Training Recommendations</Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  {dashboardData.insights.recommendations.map((rec, idx) => (
                    <View key={idx} style={styles.recommendationCard}>
                      <Text style={styles.recommendationTitle}>{rec.title}</Text>
                      <Text style={styles.recommendationContent}>{rec.content}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Historical Runner Score */}
          {dashboardData?.historicalRunnerScore && dashboardData.historicalRunnerScore.length > 0 && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>📈 Runner Score History</Text>
                </View>
                <View style={styles.cardContent}>
                  {dashboardData.historicalRunnerScore.slice(0, 5).map((score, idx) => (
                    <View key={idx} style={styles.historyRow}>
                      <Text style={styles.historyDate}>{new Date(score.date).toLocaleDateString()}</Text>
                      <View style={styles.historyScoreBar}>
                        <View style={[styles.historyScoreFill, { width: `${score.score}%` }]} />
                      </View>
                      <Text style={styles.historyScore}>{score.score}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Fitness Trends */}
          {dashboardData?.chartData && dashboardData.chartData.length > 0 && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>📊 Fitness Trends</Text>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Recent Distance (7 days)</Text>
                    <Text style={styles.trendValue}>
                      {dashboardData.chartData.slice(-7).reduce((sum, d) => sum + (d.distance || 0), 0).toFixed(1)} km
                    </Text>
                  </View>
                  <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Avg Pace (7 days)</Text>
                    <Text style={styles.trendValue}>
                      {(dashboardData.chartData.slice(-7).reduce((sum, d) => sum + (d.pace || 0), 0) / 
                        Math.max(dashboardData.chartData.slice(-7).filter(d => d.pace).length, 1)).toFixed(1)} min/km
                    </Text>
                  </View>
                  <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Total Runs</Text>
                    <Text style={styles.trendValue}>{dashboardData.chartData.length}</Text>
                  </View>
                  <View style={styles.trendRow}>
                    <Text style={styles.trendLabel}>Avg Activities/Week</Text>
                    <Text style={styles.trendValue}>
                      {(dashboardData.chartData.slice(-4).reduce((sum, d) => sum + (d.activitiesCount || 0), 0) / 4).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Goal Progress */}
          {goals && goals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>🎯 Goal Progress</Text>
                </View>
                <View style={styles.cardContent}>
                  {goals.map((goal, idx) => (
                    <View key={idx} style={styles.goalCard}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <View style={styles.goalProgressBar}>
                        <View style={[styles.goalProgressFill, { width: `${Math.min(goal.progress, 100)}%` }]} />
                      </View>
                      <Text style={styles.goalText}>
                        {goal.current} / {goal.target} {goal.unit} ({Math.round(goal.progress)}%)
                      </Text>
                      <Text style={styles.goalStatus}>{goal.status}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* AI Insights Timeline - Chronological */}
          {insightHistory.length > 0 && (
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>🕐 Insights Timeline</Text>
                </View>
                <View style={styles.cardContent}>
                  {insightHistory.slice(0, 10).map((insight, idx) => {
                    const styling = getInsightStyling(insight.category);
                    return (
                      <View key={idx} style={styles.timelineItem}>
                        <View style={[styles.timelineDot, { backgroundColor: styling.borderColor }]} />
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineDate}>
                            {new Date(insight.createdAt).toLocaleDateString()} at {new Date(insight.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <Text style={styles.insightCategoryIcon}>{styling.icon}</Text>
                            <Text style={styles.timelineCategory}>{insight.category.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.timelineTitle}>{insight.title}</Text>
                          <Text style={styles.timelineText}>{insight.content}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Recent Activities */}
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Activities</Text>
              </View>
              
              {dashboardData?.activities && dashboardData.activities.length > 0 ? (
                <View style={styles.cardContent}>
                  {dashboardData.activities.slice(0, 5).map((activity, index) => {
                    const iconStyle = getActivityIconColor(index);
                    return (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.activityRow}
                        onPress={() => navigation.navigate('ActivityDetails', { activityId: activity.id })}
                        data-testid={`activity-${activity.id}`}
                      >
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
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🏃</Text>
                  <Text style={styles.emptyTitle}>No activities yet</Text>
                  <Text style={styles.emptyText}>Connect to Strava and sync your activities to get started.</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primaryForeground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.primaryForeground,
    opacity: 0.9,
  },
  logoutButton: {
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.charcoal,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
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
  syncButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
  lastSyncText: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 22,
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
  runnerScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.cardForeground,
    fontWeight: '500',
    width: 90,
  },
  scoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    width: 30,
    textAlign: 'right',
  },
  insightCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightCategoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  insightCard: {
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 8,
  },
  insightContent: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
  },
  insightRecommendation: {
    fontSize: 13,
    color: colors.performanceBlue,
    marginTop: 8,
    fontWeight: '500',
  },
  recommendationCard: {
    backgroundColor: colors.muted,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.achievementGreen,
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 8,
  },
  recommendationContent: {
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
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
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 12,
    color: colors.mutedForeground,
    width: 90,
  },
  historyScoreBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.muted,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  historyScoreFill: {
    height: '100%',
    backgroundColor: colors.performanceBlue,
  },
  historyScore: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.performanceBlue,
    width: 30,
    textAlign: 'right',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  trendLabel: {
    fontSize: 14,
    color: colors.cardForeground,
    fontWeight: '500',
  },
  trendValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  goalCard: {
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 8,
  },
  goalProgressBar: {
    height: 10,
    backgroundColor: colors.muted,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.achievementGreen,
  },
  goalText: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  goalStatus: {
    fontSize: 12,
    color: colors.achievementGreen,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDate: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  timelineCategory: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
});
