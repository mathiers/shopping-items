
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';

import {
  loginUser,
  registerUser,
} from '../services/appwrite';

type Props = {
  onAuthenticated: () => void;
  onGuest: () => void;
};

export default function AuthScreen({
  onAuthenticated,
  onGuest,
}: Props) {
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing details',
        'Enter your email and password.'
      );
      return;
    }

    if (registering && !name.trim()) {
      Alert.alert('Missing name', 'Enter your name.');
      return;
    }

    if (registering && password.length < 8) {
      Alert.alert(
        'Password too short',
        'Use at least 8 characters.'
      );
      return;
    }

    setLoading(true);

    try {
      if (registering) {
        await registerUser(name, email, password);
      } else {
        await loginUser(email, password);
      }

      onAuthenticated();
    } catch (error: any) {
      Alert.alert(
        'Authentication failed',
        error?.message ?? 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>🛒</Text>

        <Text style={styles.title}>
          Shopping Items
        </Text>

        <Text style={styles.subtitle}>
          Shop smarter. Stay on budget.
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>
            {registering ? 'Create account' : 'Welcome back'}
          </Text>

          {registering && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={
              registering ? 'new-password' : 'current-password'
            }
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {registering ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            disabled={loading}
            onPress={() => setRegistering(!registering)}
          >
            <Text style={styles.switchText}>
              {registering
                ? 'Already have an account? Sign In'
                : 'New here? Create an account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.guestButton}
            onPress={onGuest}
            disabled={loading}
          >
            <Text style={styles.guestText}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Your shopping companion
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
 },
 logo: {
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 2,
 },
 title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
 },
  subtitle: {
    color: '#D1FAE5',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
  },
  heading: {
    fontSize: 19,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#15803D',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  switchButton: {
    padding: 9,
    alignItems: 'center',
  },
  switchText: {
    color: '#15803D',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  guestButton: {
    padding: 8,
    alignItems: 'center',
  },
  guestText: {
    color: '#475569',
    fontWeight: '700',
  },
  footer: {
    color: '#D1FAE5',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 11,
  },
});
