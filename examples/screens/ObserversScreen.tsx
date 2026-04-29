import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  goBack: () => void;
}

const LOG_BUTTONS: { label: string; action: () => void; color: string }[] = [
  { label: 'console.log', action: () => console.log('Test log message', { foo: 'bar' }), color: '#2196F3' },
  { label: 'console.warn', action: () => console.warn('Test warning message'), color: '#FF9800' },
  { label: 'console.error', action: () => console.error('Test error message'), color: '#F44336' },
  { label: 'console.info', action: () => console.info('Test info message'), color: '#4CAF50' },
  { label: 'console.debug', action: () => console.debug('Test debug message'), color: '#9C27B0' },
];

export default function ObserversScreen({ goBack }: Props) {
  const [networkLog, setNetworkLog] = useState<string[]>([]);

  const fireSuccessRequest = async () => {
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      setNetworkLog(prev => [...prev, `GET /todos/1 → ${res.status}`]);
    } catch {
      setNetworkLog(prev => [...prev, 'GET /todos/1 → failed']);
    }
  };

  const fireFailRequest = async () => {
    try {
      await fetch('https://this-domain-does-not-exist-userback-test.io/fail');
      setNetworkLog(prev => [...prev, 'GET /fail → unexpected success']);
    } catch {
      setNetworkLog(prev => [...prev, 'GET /fail → network error (expected)']);
    }
  };

  const firePost = async () => {
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'test', body: 'body', userId: 1 }),
      });
      setNetworkLog(prev => [...prev, `POST /posts → ${res.status}`]);
    } catch {
      setNetworkLog(prev => [...prev, 'POST /posts → failed']);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={goBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Observers Test</Text>
      <Text style={styles.subtitle}>
        Open the Userback widget and check the Console Logs and Network tabs.
      </Text>

      <Text style={styles.sectionTitle}>Console Logs</Text>
      <Text style={styles.hint}>Tap each button — the log should appear in the widget.</Text>
      <View style={styles.row}>
        {LOG_BUTTONS.map(({ label, action, color }) => (
          <TouchableOpacity
            key={label}
            style={[styles.btn, { backgroundColor: color }]}
            onPress={action}
          >
            <Text style={styles.btnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Network Requests</Text>
      <Text style={styles.hint}>Tap to fire requests — they should appear in the widget network tab.</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#2196F3' }]} onPress={fireSuccessRequest}>
          <Text style={styles.btnText}>GET 200</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#F44336' }]} onPress={fireFailRequest}>
          <Text style={styles.btnText}>GET fail</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#4CAF50' }]} onPress={firePost}>
          <Text style={styles.btnText}>POST 201</Text>
        </TouchableOpacity>
      </View>

      {networkLog.length > 0 && (
        <View style={styles.logBox}>
          <Text style={styles.logTitle}>Local log (for reference):</Text>
          {networkLog.map((line, i) => (
            <Text key={i} style={styles.logLine}>{line}</Text>
          ))}
          <TouchableOpacity onPress={() => setNetworkLog([])}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#2196F3' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  hint: { fontSize: 13, color: '#888', marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  logBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  logTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  logLine: { fontSize: 12, color: '#333', marginBottom: 4, fontFamily: 'monospace' },
  clearText: { fontSize: 12, color: '#F44336', marginTop: 8 },
});
