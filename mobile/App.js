import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar, AppRegistry } from 'react-native';

// Your RunAnalytics backend URL - using Replit's direct URL
const API_BASE_URL = 'https://8569cb03-f268-4195-b845-f9a7784a2141-00-5cx90hqzmtzl.riker.replit.dev';

// Strava-inspired color scheme matching the web app
const colors = {
  primary: '#FC4C02',           // Strava Orange hsl(13, 98%, 49%)
  primaryForeground: '#FAFAFA', // hsl(0, 0%, 98%)
  performanceBlue: '#3B82F6',   // hsl(207, 90%, 54%)
  achievementGreen: '#22C55E',  // hsl(122, 39%, 49%)
  darkSlate: '#334155',         // hsl(215, 15%, 22%)
  charcoal: '#333333',          // hsl(0, 0%, 20%)
  lightGrey: '#F8FAFC',         // hsl(0, 0%, 97%)
  card: '#FFFFFF',
  cardForeground: '#333333',
  border: '#E2E8F0',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  background: '#F8FAFC',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [runnerScore, setRunnerScore] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Settings state
  const [unitPreference, setUnitPreference] = useState('km');

  // Check server connection
  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      Alert.alert('Connection Status', data.message || 'Connected to RunAnalytics!');
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to server.');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        setToken(data.token);
        Alert.alert('Success', 'Logged in successfully!');
        fetchAllData(data.user.id, data.token);
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error during login');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data
  const fetchAllData = async (userId, authToken) => {
    setDataLoading(true);
    try {
      // Fetch dashboard data
      const dashboardResponse = await fetch(`${API_BASE_URL}/api/dashboard/${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setDashboardData(dashboardData);
        setUnitPreference(dashboardData.user?.unitPreference || 'km');
      }

      // Fetch runner score
      const scoreResponse = await fetch(`${API_BASE_URL}/api/runner-score/${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json();
        setRunnerScore(scoreData);
      }

      // Fetch AI predictions
      const predictionsResponse = await fetch(`${API_BASE_URL}/api/ml/predictions/${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (predictionsResponse.ok) {
        const predictionsData = await predictionsResponse.json();
        setPredictions(predictionsData.predictions);
      }

    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setDataLoading(false);
    }
  };

  // Update settings
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
        // Refresh dashboard data to get updated units
        fetchAllData(user.id, token);
      } else {
        Alert.alert('Error', 'Failed to update settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error updating settings');
    }
  };

  // Logout function
  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setDashboardData(null);
    setRunnerScore(null);
    setPredictions(null);
    setEmail('');
    setPassword('');
    setActiveTab('dashboard');
  };

  // Helper functions
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

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        
        <View style={styles.header}>
          <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
          <Text style={styles.subtitle}>AI-Powered Running Insights</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.testButton} onPress={checkConnection}>
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Login to Your Account</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.primaryButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const insightsArray = getInsightsArray(dashboardData?.insights);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
        <Text style={styles.subtitle}>Welcome, {user.email}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'dashboard', label: 'Dashboard', icon: '📊' },
          { key: 'score', label: 'Score', icon: '🏆' },
          { key: 'predictions', label: 'Predictions', icon: '🎯' },
          { key: 'settings', label: 'Settings', icon: '⚙️' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Monthly Stats */}
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

              {/* Recent Activities */}
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

              {/* AI Insights */}
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
            </>
          )}

          {/* Runner Score Tab */}
          {activeTab === 'score' && (
            <>
              {runnerScore ? (
                <>
                  {/* Main Score */}
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

                  {/* Score Components */}
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

                  {/* Badges */}
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
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🏆</Text>
                  <Text style={styles.emptyTitle}>Loading Runner Score</Text>
                </View>
              )}
            </>
          )}

          {/* Predictions Tab */}
          {activeTab === 'predictions' && (
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
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <>
              {/* Unit Preferences */}
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

              {/* Account Info */}
              <View style={styles.section}>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Account Information</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.accountRow}>
                      <Text style={styles.accountLabel}>Email</Text>
                      <Text style={styles.accountValue}>{user.email}</Text>
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
            </>
          )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: colors.primary,
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
  testButton: {
    backgroundColor: colors.achievementGreen,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: colors.cardForeground,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
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

// Register the main component
AppRegistry.registerComponent('main', () => App);