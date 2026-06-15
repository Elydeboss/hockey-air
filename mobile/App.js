import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function ConnectScreen({ onConnect }) {
  const [url, setUrl] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.center}>
        <Text style={styles.title}>AIR HOCKEY</Text>
        <Text style={styles.subtitle}>NEON EDITION</Text>

        <TextInput
          style={styles.input}
          placeholder="Server URL"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.button, !url.trim() && styles.buttonDisabled]}
          onPress={() => onConnect(url.trim())}
          disabled={!url.trim()}
        >
          <Text style={styles.buttonText}>CONNECT</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Enter the server address{'\n'}(e.g. http://192.168.1.100:3000)
        </Text>
      </View>
    </SafeAreaView>
  );
}

function GameWebView({ uri, onDisconnect }) {
  const webRef = useRef(null);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <WebView
        ref={webRef}
        source={{ uri }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
}

export default function App() {
  const [serverUrl, setServerUrl] = useState(null);

  if (!serverUrl) {
    return (
      <SafeAreaProvider>
        <ConnectScreen onConnect={setServerUrl} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GameWebView uri={serverUrl} />
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
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    color: '#fff',
    padding: 14,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    borderRadius: 4,
    width: '100%',
    marginBottom: 16,
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
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hint: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
