import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../App';

interface Props {
  navigate: (screen: Screen) => void;
}

const DEMOS: { label: string; screen: Screen; description: string }[] = [
  { screen: 'basic', label: 'Basic Usage', description: 'Open feedback form with a button' },
  { screen: 'auth', label: 'Auth Flow', description: 'Identify user on login, clear on logout' },
  { screen: 'advanced', label: 'Advanced', description: 'Custom trigger, setData, session replay' },
];

export default function HomeScreen({ navigate }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Userback SDK</Text>
      <Text style={styles.subtitle}>React Native Examples</Text>
      {DEMOS.map(({ screen, label, description }) => (
        <TouchableOpacity key={screen} style={styles.card} onPress={() => navigate(screen)}>
          <Text style={styles.cardTitle}>{label}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardDescription: { fontSize: 14, color: '#666' },
});
