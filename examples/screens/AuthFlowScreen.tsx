import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserbackSDK } from '@userback/react-native-sdk';

interface Props {
  goBack: () => void;
}

type User = { id: string; name: string; email: string };

export default function AuthFlowScreen({ goBack }: Props) {
  const [user, setUser] = useState<User | null>(null);

  function handleLogin() {
    const loggedInUser = { id: 'user-42', name: 'Jane Doe', email: 'jane@example.com' };
    setUser(loggedInUser);
    // Tag all feedback from this point on with the user's identity
    UserbackSDK.identify(loggedInUser.id, {
      name: loggedInUser.name,
      email: loggedInUser.email,
    });
  }

  function handleLogout() {
    UserbackSDK.clearIdentity();
    setUser(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Flow</Text>

      <View style={styles.status}>
        <Text style={styles.statusLabel}>Status</Text>
        <Text style={styles.statusValue}>{user ? `Logged in as ${user.name}` : 'Logged out'}</Text>
      </View>

      {user ? (
        <>
          <TouchableOpacity style={styles.button} onPress={() => UserbackSDK.openForm()}>
            <Text style={styles.buttonText}>Send Feedback (as {user.name})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.danger]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Log out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Log in as Jane</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.back} onPress={goBack}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  status: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  statusLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  statusValue: { fontSize: 16, fontWeight: '500' },
  button: {
    backgroundColor: '#5C6BC0',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  danger: { backgroundColor: '#e53935' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  back: { marginTop: 8, alignItems: 'center' },
  backText: { color: '#5C6BC0', fontSize: 16 },
});
