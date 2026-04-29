import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, StatusBar } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";

function PrivacyParagraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export default function PrivacyPolicy() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.text }]}>{"<"}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: 2026-04-29</Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Overview</Text>
          <PrivacyParagraph>
            This app helps you track personal finances. This Privacy Policy explains how we handle information you provide and the data we store to run the app.
          </PrivacyParagraph>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>2. Data We Collect</Text>
          <PrivacyParagraph>
            When you create an account, we store your username and hashed password on the backend database. You may also provide optional profile information such as email and phone.
          </PrivacyParagraph>
          <PrivacyParagraph>
            The app also stores wallet and transaction data so you can view budgets and history.
          </PrivacyParagraph>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>3. Session &amp; Authentication</Text>
          <PrivacyParagraph>
            The app uses a session token to authenticate requests to the backend. If your token expires or is invalid, you will be asked to log in again.
          </PrivacyParagraph>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>4. How We Use Data</Text>
          <PrivacyParagraph>
            We use your stored data to power features like wallet creation, transaction history, analytics, and recurring transactions.
          </PrivacyParagraph>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>5. Data Storage</Text>
          <PrivacyParagraph>
            In this project setup, data is stored in an SQLite database on the backend. Your session token is stored in a sessions table until you log out.
          </PrivacyParagraph>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>6. Contact</Text>
          <PrivacyParagraph>
            If you have questions about this policy, contact us at{' '}
            <Text style={{ color: colors.primary, fontWeight: "800" }}>support@personalfinancetracker.com</Text>.
          </PrivacyParagraph>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  backText: { fontSize: 18, fontWeight: "800" },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "800" },
  content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  updated: { fontSize: 12, marginBottom: 10, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "900", marginBottom: 8 },
  paragraph: { fontSize: 13, lineHeight: 20, color: "#9aa3b2" },
});