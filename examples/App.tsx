import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { UserbackProvider, UserbackSDK } from '@userback/react-native-sdk';
import HomeScreen from './screens/HomeScreen';
import BasicScreen from './screens/BasicScreen';
import AuthFlowScreen from './screens/AuthFlowScreen';
import AdvancedScreen from './screens/AdvancedScreen';
import ObserversScreen from './screens/ObserversScreen';

export type Screen = 'home' | 'basic' | 'auth' | 'advanced' | 'observers';

const SCREEN_NAMES: Record<Screen, string> = {
  home:      'HomeScreen',
  basic:     'BasicScreen',
  auth:      'AuthFlowScreen',
  advanced:  'AdvancedScreen',
  observers: 'ObserversScreen',
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const prevScreen = useRef<Screen | null>(null);

  useEffect(() => {
    // Start once at the app root — all screens share this instance
    UserbackSDK.start({
        accessToken: 'Your Userback mobile access token',
        userData: {
          id: "123456", // example data
          info: {
            name: "someone", // example data
            email: "someone@example.com" // example data
          }
        }
    });
    return () => UserbackSDK.stop();
  }, []);

  useEffect(() => {
    if (prevScreen.current) {
      UserbackSDK.leaveScreen(SCREEN_NAMES[prevScreen.current]);
    }
    UserbackSDK.enterScreen(SCREEN_NAMES[screen]);
    prevScreen.current = screen;
  }, [screen]);

  return (
    <UserbackProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="auto" />
        {screen === 'home' && <HomeScreen navigate={setScreen} />}
        {screen === 'basic' && <BasicScreen goBack={() => setScreen('home')} />}
        {screen === 'auth' && <AuthFlowScreen goBack={() => setScreen('home')} />}
        {screen === 'advanced' && <AdvancedScreen goBack={() => setScreen('home')} />}
        {screen === 'observers' && <ObserversScreen goBack={() => setScreen('home')} />}
      </SafeAreaView>
    </UserbackProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
});
