import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏃‍♂️ RunAnalytics</Text>
      <Text style={styles.subtitle}>Mobile App Test</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FC4C02',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
  },
});
