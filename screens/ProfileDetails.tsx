import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { config } from '../config/appConfig';
import { getAuthSession, setAuthSession } from '../services/authSession';

export default function ProfileDetails() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const session = getAuthSession();
    if (!session?.token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${config.apiBaseUrl}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsername(data.username || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
      } else {
        Alert.alert('Error', 'Failed to load profile details');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while loading profile');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    const session = getAuthSession();
    if (!session?.token) return;

    if (!username.trim()) {
      Alert.alert('Validation', 'Username is required');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`${config.apiBaseUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      if (response.ok) {
        // Update local session if username changed
        if (username.trim() !== session.username) {
          await setAuthSession({
            ...session,
            username: username.trim(),
          });
        }
        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'An error occurred while saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickProfileImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Failed to select image');
      }

      const selectedImage = result.assets?.[0];
      if (selectedImage?.uri) {
        setProfileImageUri(selectedImage.uri);
      }
    } catch (error: any) {
      Alert.alert('Image Error', error?.message || 'Could not select profile image.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#8a6eff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Personal Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.formCard}>
          <Text style={styles.label}>PROFILE PICTURE</Text>
          <View style={styles.profileImageRow}>
            <View style={styles.profileImageWrap}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileImagePlaceholder}>
                  {username.trim().charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.uploadButton} onPress={handlePickProfileImage}>
              <Text style={styles.uploadButtonText}>Upload Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#636781"
            autoCapitalize="none"
          />

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            placeholderTextColor="#636781"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            placeholderTextColor="#636781"
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#070817',
  },
  loadingBox: {
    flex: 1,
    backgroundColor: '#070817',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 24 : 8,
    paddingBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    color: '#f4f6ff',
    fontSize: 24,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#f4f6ff',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },  formCard: {
    backgroundColor: '#16193b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#232859',
  },
  label: {
    color: '#8a90c6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  profileImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0a0c1f',
    borderWidth: 1,
    borderColor: '#232859',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    color: '#f4f6ff',
    fontSize: 28,
    fontWeight: '800',
  },
  uploadButton: {
    marginLeft: 14,
    backgroundColor: '#232859',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a4188',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  uploadButtonText: {
    color: '#d7dcff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#0a0c1f',
    borderWidth: 1,
    borderColor: '#232859',
    borderRadius: 16,
    color: '#f4f6ff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8a6eff',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    shadowColor: '#8a6eff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
