import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';

var config = require('../config/Config');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const _login = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    setSubmitting(true);

    fetch(config.settings.serverPath + '/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    })
      .then(respond => respond.json())
      .then(respondJson => {
        setSubmitting(false);

        if (respondJson.affected > 0) {
          Alert.alert('Success', 'Login successful.');
          setEmail('');
          setPassword('');
          login();
        } else {
          Alert.alert('Login failed', 'Invalid email or password.');
        }
      })
      .catch(err => {
        setSubmitting(false);
        Alert.alert('Error', 'Unable to login. Check your connection.');
      });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.bloom, styles.bloomTop]} />
      <View style={[styles.bloom, styles.bloomBottom]} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.brandWrap}>
            <View style={styles.logoSquare}>
              <Text style={styles.logoText}>$</Text>
            </View>
            <Text style={styles.brandText}>MIDNIGHT GLASS</Text>
          </View>
          <Text style={styles.helpText}>Help</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your finance journey.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@premium.com"
            placeholderTextColor="#636277"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="........"
              placeholderTextColor="#636277"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeButtonText}>{showPassword ? 'Hide' : 'View'}</Text>
            </Pressable>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={_login}
            disabled={submitting}>
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Need an account? Create one</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustCard}>
            <Text style={styles.trustTitle}>BANK GRADE</Text>
            <Text style={styles.trustBody}>AES-256 Encryption</Text>
          </View>
          <View style={styles.trustCard}>
            <Text style={styles.trustTitle}>INSTANT SYNC</Text>
            <Text style={styles.trustBody}>Real-time tracking</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f0e17',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  bloom: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(107, 70, 193, 0.16)',
  },
  bloomTop: {
    width: 300,
    height: 300,
    top: -100,
    right: -120,
  },
  bloomBottom: {
    width: 340,
    height: 340,
    bottom: -120,
    left: -130,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#6b46c1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  brandText: {
    color: '#f6f6f8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  helpText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  hero: {
    marginBottom: 22,
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 15,
    marginTop: 6,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    color: '#d8b4fe',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    color: '#f6f6f8',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 78,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(107, 70, 193, 0.22)',
  },
  eyeButtonText: {
    color: '#e9d5ff',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#6b46c1',
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    color: '#d8b4fe',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  trustRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  trustCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
  },
  trustTitle: {
    color: '#f6f6f8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trustBody: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 5,
  },
});

export default LoginScreen;