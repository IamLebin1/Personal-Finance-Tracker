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

var config = require('../config/Config');

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const _register = () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter your full name, email, and password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'The password confirmation does not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Terms required', 'Please agree to the Terms and Privacy Policy.');
      return;
    }

    setSubmitting(true);

    fetch(config.settings.serverPath + '/api/register', {
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
          Alert.alert('Success', 'Account created. Please sign in.');
          setFullName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setAgreeTerms(false);
          navigation.navigate('Login');
        } else {
          Alert.alert('Registration failed', 'Please try again.');
        }
      })
      .catch(err => {
        setSubmitting(false);
        Alert.alert('Error', 'Unable to register. Check your connection.');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Secure your financial future today.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="John Doe"
            placeholderTextColor="#636277"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

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

          <View style={styles.passwordRow}>
            <View style={styles.passwordCol}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="........"
                placeholderTextColor="#636277"
                secureTextEntry
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.passwordCol}>
              <Text style={styles.label}>CONFIRM</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="........"
                placeholderTextColor="#636277"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
          </View>

          <Pressable style={styles.termsRow} onPress={() => setAgreeTerms(!agreeTerms)}>
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms ? <Text style={styles.checkboxMark}>X</Text> : null}
            </View>
            <Text style={styles.termsText}>I agree to the Terms of Service and Privacy Policy.</Text>
          </Pressable>

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={_register}
            disabled={submitting}>
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR JOIN WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialButtonText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Already have an account? Sign In</Text>
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
  passwordRow: {
    flexDirection: 'row',
    gap: 10,
  },
  passwordCol: {
    flex: 1,
  },
  termsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#464555',
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#1a1926',
  },
  checkboxChecked: {
    borderColor: '#6b46c1',
    backgroundColor: '#6b46c1',
  },
  checkboxMark: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
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
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: 10,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#f6f6f8',
    fontSize: 13,
    fontWeight: '600',
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

export default RegisterScreen;