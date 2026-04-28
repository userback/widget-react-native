import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { UserbackProvider, UserbackSDK } from '@userback/react-native-sdk';
import HomeScreen from './screens/HomeScreen';
import BasicScreen from './screens/BasicScreen';
import AuthFlowScreen from './screens/AuthFlowScreen';
import AdvancedScreen from './screens/AdvancedScreen';

export type Screen = 'home' | 'basic' | 'auth' | 'advanced';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  useEffect(() => {
    // Start once at the app root — all screens share this instance
    UserbackSDK.start({
        accessToken: 'YOUR_ACCESS_TOKEN',
        userData: {
          id: 'user-123',
          info: {
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
    });
    return () => UserbackSDK.stop();
  }, []);

  return (
    <UserbackProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="auto" />
        {screen === 'home' && <HomeScreen navigate={setScreen} />}
        {screen === 'basic' && <BasicScreen goBack={() => setScreen('home')} />}
        {screen === 'auth' && <AuthFlowScreen goBack={() => setScreen('home')} />}
        {screen === 'advanced' && <AdvancedScreen goBack={() => setScreen('home')} />}
      </SafeAreaView>
    </UserbackProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
});
