import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const SERVER_URL = 'https://hockey-air.onrender.com';

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.center}>
        <Text style={styles.title}>AIR HOCKEY</Text>
        <Text style={styles.subtitle}>NEON EDITION</Text>
        <ActivityIndicator size="large" color="#ff0" style={{ marginTop: 32 }} />
        <Text style={styles.hint}>Connecting...</Text>
      </View>
    </SafeAreaView>
  );
}

function ErrorScreen({ message, onRetry, onBack }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.center}>
        <Text style={styles.title}>AIR HOCKEY</Text>
        <Text style={styles.subtitle}>NEON EDITION</Text>
        <Text style={styles.errorText}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>RETRY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function GameWebView({ uri, onError }) {
  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      {loading && (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen />
        </View>
      )}
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          onError(nativeEvent.description || 'Failed to load game');
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [error, setError] = useState(null);
  const [key, setKey] = useState(0);

  if (error) {
    return (
      <SafeAreaProvider>
        <ErrorScreen
          message={error}
          onRetry={() => { setError(null); setKey(k => k + 1); }}
          onBack={() => { setError(null); setKey(k => k + 1); }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider key={key}>
      <GameWebView uri={SERVER_URL} onError={setError} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 40,
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorText: {
    color: '#f44',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  hint: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
