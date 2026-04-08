import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const settingsRows = [
  { icon: '👤', title: 'Personal Details', subtitle: 'Name, Email, Phone' },
  { icon: '🔒', title: 'Security & Credentials', subtitle: 'Password, 2FA, FaceID' },
  { icon: '🔔', title: 'Notification Preferences', subtitle: 'Alerts, Reminders' },
  { icon: '💳', title: 'Subscription', subtitle: 'Manage plan & billing' },
];

export default function Profile() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>My Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatar}>🧑🏻</Text>
          </View>
          <Text style={styles.name}>Alex Chen</Text>
          <Text style={styles.email}>alex.chen@example.com</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Premium Member</Text>
          </View>
        </View>

        {settingsRows.map(row => (
          <View key={row.title} style={styles.rowCard}>
            <Text style={styles.rowIcon}>{row.icon}</Text>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}

        <Pressable style={styles.signOutWrap} onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.signOut}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#090a1f',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 120,
  },
  header: {
    color: '#f5f6ff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#121436',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2c2f6e',
    paddingVertical: 18,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#2e315f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8e72ff',
    marginBottom: 10,
  },
  avatar: {
    fontSize: 46,
  },
  name: {
    color: '#f5f7ff',
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    color: '#8a8fc6',
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#1f224f',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#8f96ff',
    fontSize: 11,
    fontWeight: '600',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121436',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2f6e',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    color: '#eff1ff',
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#7b82bf',
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: '#767cba',
    fontSize: 24,
    fontWeight: '500',
  },
  signOutWrap: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5b2f4d',
    backgroundColor: '#1a1126',
    paddingVertical: 12,
  },
  signOut: {
    color: '#ff648f',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 15,
  },
});
