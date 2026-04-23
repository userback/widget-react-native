import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserbackSDK } from '@userback/react-native-sdk';

interface Props {
  goBack: () => void;
}

export default function BasicScreen({ goBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Basic Usage</Text>
      <Text style={styles.description}>
        UserbackProvider and start() live in App.tsx. Any screen can call openForm().
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => UserbackSDK.openForm()}>
        <Text style={styles.buttonText}>Open Feedback</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={goBack}>
        <Text style={styles.secondaryText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  description: { fontSize: 14, color: '#666', marginBottom: 32, lineHeight: 20 },
  button: {
    backgroundColor: '#5C6BC0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { backgroundColor: 'transparent' },
  secondaryText: { color: '#5C6BC0', fontSize: 16 },
});
