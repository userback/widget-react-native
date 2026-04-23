import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserbackSDK } from '@userback/react-native-sdk';

interface Props {
  goBack: () => void;
}

export default function AdvancedScreen({ goBack }: Props) {
  const [replayActive, setReplayActive] = useState(false);

  function toggleReplay() {
    if (replayActive) {
      UserbackSDK.stopSessionReplay();
      setReplayActive(false);
    } else {
      UserbackSDK.startSessionReplay();
      setReplayActive(true);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Advanced</Text>

      <Text style={styles.sectionLabel}>Feedback Modes</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.chip} onPress={() => UserbackSDK.openForm('bug')}>
          <Text style={styles.chipText}>Bug</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => UserbackSDK.openForm('feature_request')}>
          <Text style={styles.chipText}>Feature</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => UserbackSDK.openForm('general')}>
          <Text style={styles.chipText}>General</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>Attach Metadata</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() =>
          UserbackSDK.setData({
            screen: 'AdvancedScreen',
            appVersion: '2.4.1',
            experiment: 'new-onboarding-v3',
          })
        }
      >
        <Text style={styles.buttonText}>setData (screen + version)</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Session Replay</Text>
      <TouchableOpacity
        style={[styles.button, replayActive ? styles.active : styles.inactive]}
        onPress={toggleReplay}
      >
        <Text style={styles.buttonText}>
          {replayActive ? 'Stop Session Replay' : 'Start Session Replay'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.back} onPress={goBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8, marginTop: 8 },
  row: { flexDirection: 'row', marginBottom: 16 },
  chip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  chipText: { color: '#5C6BC0', fontWeight: '600' },
  button: {
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  active: { backgroundColor: '#e53935' },
  inactive: { backgroundColor: '#5C6BC0' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  back: { marginTop: 8, alignItems: 'center' },
  backText: { color: '#5C6BC0', fontSize: 16 },
});
