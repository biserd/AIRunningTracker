import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { decode } from '@googlemaps/polyline-codec';
import { LineChart } from 'react-native-chart-kit';

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

export default function ActivityDetailsScreen({ route, navigation, token }) {
  const { activityId } = route.params;
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityDetails();
  }, [activityId]);

  const fetchActivityDetails = async () => {
    if (!activityId || !token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/activities/${activityId}/performance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setActivityData(data);
      } else {
        Alert.alert('Error', 'Failed to load activity details');
      }
    } catch (error) {
      console.error('Activity fetch error:', error);
      Alert.alert('Error', 'Network error loading activity');
    } finally {
      setLoading(false);
    }
  };

  const decodePolyline = (polyline) => {
    if (!polyline) return [];
    try {
      const decoded = decode(polyline);
      return decoded.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    } catch (e) {
      console.error('Error decoding polyline:', e);
      return [];
    }
  };

  const getMapRegion = (coordinates) => {
    if (!coordinates || coordinates.length === 0) return null;
    
    const lats = coordinates.map(c => c.latitude);
    const lngs = coordinates.map(c => c.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5,
      longitudeDelta: (maxLng - minLng) * 1.5,
    };
  };

  const formatLapTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLapPace = (metersPerSecond) => {
    if (!metersPerSecond || metersPerSecond === 0) return 'N/A';
    const minPerKm = 1000 / (metersPerSecond * 60);
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const prepareChartData = (streamData, label) => {
    if (!streamData || !streamData.data || streamData.data.length === 0) {
      return null;
    }

    // Sample data points to max 50 for readability
    const rawData = streamData.data;
    const sampleRate = Math.max(1, Math.ceil(rawData.length / 50));
    
    // Sample and filter in one pass, keeping arrays aligned
    const sampledPairs = [];
    for (let i = 0; i < rawData.length; i += sampleRate) {
      const value = rawData[i];
      if (value !== null && value !== undefined && !isNaN(value)) {
        sampledPairs.push({
          index: i,
          value: value
        });
      }
    }

    // If no valid data, return null
    if (sampledPairs.length === 0) {
      return null;
    }

    // Create aligned labels and data arrays
    const labels = sampledPairs.map((_, i) => 
      i % 10 === 0 ? `${Math.round(sampledPairs[i].index / 60)}` : ''
    );
    const dataValues = sampledPairs.map(p => p.value);

    return {
      labels: labels,
      datasets: [{
        data: dataValues,
        color: (opacity = 1) => `rgba(${label === 'Heart Rate' ? '239, 68, 68' : label === 'Cadence' ? '168, 85, 247' : '234, 179, 8'}, ${opacity})`,
        strokeWidth: 2
      }],
      legend: [label]
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading activity details...</Text>
      </View>
    );
  }

  if (!activityData || !activityData.activity) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Activity not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { activity, laps, streams } = activityData;
  const routeCoordinates = decodePolyline(activity.polyline);
  const mapRegion = getMapRegion(routeCoordinates);

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} data-testid="button-back">
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.activityName} data-testid="text-activity-name">{activity.name}</Text>
        <Text style={styles.activityDate} data-testid="text-activity-date">
          {new Date(activity.startDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
      </View>

      {/* Route Map */}
      {routeCoordinates.length > 0 && mapRegion && (
        <View style={styles.mapContainer}>
          <Text style={styles.sectionTitle}>Route</Text>
          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            data-testid="map-route"
          >
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
            {activity.startLatitude && activity.startLongitude && (
              <Marker
                coordinate={{
                  latitude: activity.startLatitude,
                  longitude: activity.startLongitude
                }}
                title="Start"
                pinColor={colors.achievementGreen}
              />
            )}
            {activity.endLatitude && activity.endLongitude && (
              <Marker
                coordinate={{
                  latitude: activity.endLatitude,
                  longitude: activity.endLongitude
                }}
                title="Finish"
                pinColor={colors.destructive}
              />
            )}
          </MapView>
        </View>
      )}

      {/* Primary Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: '#DBEAFE' }]}>
            <Text style={styles.metricIcon}>📍</Text>
            <Text style={styles.metricValue} data-testid="text-distance">{activity.formattedDistance}</Text>
            <Text style={styles.metricLabel}>{activity.distanceUnit}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.metricIcon}>⏱️</Text>
            <Text style={styles.metricValue} data-testid="text-duration">{activity.formattedDuration}</Text>
            <Text style={styles.metricLabel}>Duration</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={styles.metricIcon}>📈</Text>
            <Text style={styles.metricValue} data-testid="text-pace">{activity.formattedPace}</Text>
            <Text style={styles.metricLabel}>{activity.paceUnit}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.metricIcon}>❤️</Text>
            <Text style={styles.metricValue} data-testid="text-heart-rate">
              {activity.averageHeartrate ? Math.round(activity.averageHeartrate) : 'N/A'}
            </Text>
            <Text style={styles.metricLabel}>Avg HR</Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      {(activity.calories || activity.averageCadence || activity.averageWatts || activity.sufferScore) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
          <View style={styles.performanceGrid}>
            {activity.calories && (
              <View style={styles.performanceCard}>
                <Text style={styles.performanceIcon}>🔥</Text>
                <Text style={styles.performanceValue} data-testid="text-calories">{Math.round(activity.calories)}</Text>
                <Text style={styles.performanceLabel}>Calories</Text>
              </View>
            )}
            {activity.averageCadence && (
              <View style={styles.performanceCard}>
                <Text style={styles.performanceIcon}>👟</Text>
                <Text style={styles.performanceValue} data-testid="text-cadence">{Math.round(activity.averageCadence)}</Text>
                <Text style={styles.performanceLabel}>Cadence</Text>
              </View>
            )}
            {activity.averageWatts && (
              <View style={styles.performanceCard}>
                <Text style={styles.performanceIcon}>⚡</Text>
                <Text style={styles.performanceValue} data-testid="text-power">{Math.round(activity.averageWatts)}</Text>
                <Text style={styles.performanceLabel}>Power</Text>
              </View>
            )}
            {activity.sufferScore && (
              <View style={styles.performanceCard}>
                <Text style={styles.performanceIcon}>💪</Text>
                <Text style={styles.performanceValue} data-testid="text-suffer-score">{activity.sufferScore}</Text>
                <Text style={styles.performanceLabel}>Suffer Score</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Detailed Splits */}
      {laps && laps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Splits</Text>
          <View style={styles.splitsContainer}>
            <View style={styles.splitsHeader}>
              <Text style={[styles.splitsHeaderText, { flex: 1 }]}>Split</Text>
              <Text style={[styles.splitsHeaderText, { flex: 1.5 }]}>Distance</Text>
              <Text style={[styles.splitsHeaderText, { flex: 1.5 }]}>Time</Text>
              <Text style={[styles.splitsHeaderText, { flex: 1.5 }]}>Pace</Text>
            </View>
            {laps.map((lap, index) => (
              <View key={index} style={styles.splitRow} data-testid={`split-${index}`}>
                <Text style={[styles.splitText, { flex: 1, fontWeight: '600' }]}>{index + 1}</Text>
                <Text style={[styles.splitText, { flex: 1.5 }]}>
                  {(lap.distance / 1000).toFixed(2)} km
                </Text>
                <Text style={[styles.splitText, { flex: 1.5 }]}>
                  {formatLapTime(lap.moving_time || lap.elapsed_time)}
                </Text>
                <Text style={[styles.splitText, { flex: 1.5 }]}>
                  {formatLapPace(lap.average_speed)} /km
                </Text>
              </View>
            ))}
          </View>
          
          {/* Splits Summary */}
          {laps.length > 1 && (
            <View style={styles.splitsSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Fastest Split:</Text>
                <Text style={styles.summaryValue}>
                  {formatLapPace(Math.max(...laps.map(l => l.average_speed)))} /km
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Slowest Split:</Text>
                <Text style={styles.summaryValue}>
                  {formatLapPace(Math.min(...laps.map(l => l.average_speed)))} /km
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Average Pace:</Text>
                <Text style={styles.summaryValue}>
                  {formatLapPace(laps.reduce((sum, l) => sum + l.average_speed, 0) / laps.length)} /km
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Activity Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{activity.type}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Elevation Gain</Text>
            <Text style={styles.detailValue}>{activity.totalElevationGain} m</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Avg Speed</Text>
            <Text style={styles.detailValue}>{activity.formattedSpeed} {activity.speedUnit}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Max Speed</Text>
            <Text style={styles.detailValue}>{activity.formattedMaxSpeed} {activity.speedUnit}</Text>
          </View>
          {activity.maxHeartrate && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Max HR</Text>
              <Text style={styles.detailValue}>{Math.round(activity.maxHeartrate)} bpm</Text>
            </View>
          )}
          {activity.maxCadence && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Max Cadence</Text>
              <Text style={styles.detailValue}>{Math.round(activity.maxCadence)} spm</Text>
            </View>
          )}
        </View>
      </View>

      {/* Performance Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Analysis</Text>
        
        <View style={[styles.analysisCard, { backgroundColor: '#DBEAFE' }]}>
          <Text style={styles.analysisTitle}>📊 Pace Analysis</Text>
          <Text style={styles.analysisText}>
            Your average pace of {activity.formattedPace} {activity.paceUnit} shows consistent effort throughout the activity.
          </Text>
        </View>

        {activity.averageHeartrate && (
          <View style={[styles.analysisCard, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.analysisTitle}>❤️ Heart Rate Zone</Text>
            <Text style={styles.analysisText}>
              Average HR of {Math.round(activity.averageHeartrate)} bpm indicates {
                activity.averageHeartrate < 140 ? "aerobic base" : 
                activity.averageHeartrate < 160 ? "aerobic threshold" : 
                "anaerobic"
              } training zone.
            </Text>
          </View>
        )}

        {activity.averageCadence && (
          <View style={[styles.analysisCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={styles.analysisTitle}>👟 Running Form</Text>
            <Text style={styles.analysisText}>
              Cadence of {Math.round(activity.averageCadence)} spm is {
                activity.averageCadence < 160 ? "below optimal range" :
                activity.averageCadence < 180 ? "in good range" :
                activity.averageCadence < 190 ? "excellent form" :
                "very high turnover"
              }.
            </Text>
          </View>
        )}

        {activity.sufferScore && (
          <View style={[styles.analysisCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.analysisTitle}>💪 Training Load</Text>
            <Text style={styles.analysisText}>
              Suffer score of {activity.sufferScore} indicates {
                activity.sufferScore < 50 ? "low intensity" :
                activity.sufferScore < 100 ? "moderate load" :
                activity.sufferScore < 150 ? "challenging workout" :
                "very demanding session"
              }.
            </Text>
          </View>
        )}
      </View>

      {/* Performance Charts */}
      {streams && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Charts</Text>
          
          {/* Heart Rate Chart */}
          {streams.heartrate && prepareChartData(streams.heartrate, 'Heart Rate') && (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>❤️ Heart Rate Analysis</Text>
                <View style={styles.chartBadge}>
                  <Text style={styles.chartBadgeText}>Real Data</Text>
                </View>
              </View>
              <LineChart
                data={prepareChartData(streams.heartrate, 'Heart Rate')}
                width={Dimensions.get('window').width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '0',
                  }
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                fromZero={false}
                yAxisSuffix=" bpm"
              />
              <Text style={styles.chartXLabel}>Time (minutes)</Text>
            </View>
          )}

          {/* Cadence Chart */}
          {streams.cadence && prepareChartData(streams.cadence, 'Cadence') && (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>👟 Cadence Analysis</Text>
                <View style={styles.chartBadge}>
                  <Text style={styles.chartBadgeText}>Real Data</Text>
                </View>
              </View>
              <LineChart
                data={prepareChartData(streams.cadence, 'Cadence')}
                width={Dimensions.get('window').width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '0',
                  }
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                fromZero={false}
                yAxisSuffix=" spm"
              />
              <Text style={styles.chartXLabel}>Time (minutes)</Text>
            </View>
          )}

          {/* Power Chart */}
          {streams.watts && prepareChartData(streams.watts, 'Power') && (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>⚡ Power Analysis</Text>
                <View style={styles.chartBadge}>
                  <Text style={styles.chartBadgeText}>Real Data</Text>
                </View>
              </View>
              <LineChart
                data={prepareChartData(streams.watts, 'Power')}
                width={Dimensions.get('window').width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: colors.card,
                  backgroundGradientFrom: colors.card,
                  backgroundGradientTo: colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(234, 179, 8, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '0',
                  }
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                fromZero={false}
                yAxisSuffix="W"
              />
              <Text style={styles.chartXLabel}>Time (minutes)</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.mutedForeground,
  },
  errorText: {
    fontSize: 18,
    color: colors.destructive,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    backgroundColor: colors.card,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backLink: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 12,
  },
  backButton: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignSelf: 'center',
  },
  backButtonText: {
    color: colors.primaryForeground,
    fontSize: 16,
    fontWeight: '600',
  },
  activityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.charcoal,
    marginBottom: 8,
  },
  activityDate: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  mapContainer: {
    padding: 20,
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 12,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.charcoal,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: '22%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  performanceIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.charcoal,
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
  },
  splitsContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitsHeader: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  splitsHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.charcoal,
    textTransform: 'uppercase',
  },
  splitRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  splitsSummary: {
    marginTop: 16,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.charcoal,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.charcoal,
  },
  analysisCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 13,
    color: colors.charcoal,
    lineHeight: 20,
  },
  chartContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.charcoal,
  },
  chartBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chartBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16A34A',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartXLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
  },
});
