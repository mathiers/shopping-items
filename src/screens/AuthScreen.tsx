
import React, { useRef, useState } from 'react';

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

import { Ionicons } from '@expo/vector-icons';

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

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

 const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
 const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const submit = async () => {
    if (loading) return;

    if (registering && !name.trim()) {
      Alert.alert(
        'Missing name',
        'Please enter your full name.'
      );
      return;
    }

    if (!email.trim() || !password) {
      Alert.alert(
        'Missing details',
        'Please enter your email and password.'
      );
      return;
    }

    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!validEmail) {
      Alert.alert(
        'Invalid email',
        'Please enter a valid email address.'
      );
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

      setPassword('');
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

  const toggleMode = () => {
    if (loading) return;

    setRegistering(previous => !previous);
    setPassword('');
    setShowPassword(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
            {registering
              ? 'Create account'
              : 'Welcome back'}
          </Text>

          {registering && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() =>
                emailRef.current?.focus()
              }
              editable={!loading}
            />
          )}

          <TextInput
            ref={emailRef}
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() =>
              passwordRef.current?.focus()
            }
            editable={!loading}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordRef}
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={
                registering
                  ? 'new-password'
                  : 'current-password'
              }
              returnKeyType="done"
              onSubmitEditing={submit}
              editable={!loading}
            />

            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() =>
                setShowPassword(previous => !previous)
              }
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={21}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.disabledButton,
            ]}
            onPress={submit}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>
                {registering
                  ? 'Create Account'
                  : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={toggleMode}
            disabled={loading}
            accessibilityRole="button"
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
            accessibilityRole="button"
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
    width: '100%',
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

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    marginBottom: 10,
  },

  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },

  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  primaryButton: {
    backgroundColor: '#15803D',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 4,
  },

  disabledButton: {
    opacity: 0.65,
  },

  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  switchButton: {
    padding: 9,
    alignItems: 'center',
  },

  switchText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
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
    fontSize: 13,
  },

  footer: {
    color: '#D1FAE5',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 11,
  },
});
