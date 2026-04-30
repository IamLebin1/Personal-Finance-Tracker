import React from "react";
import { ScrollView, StyleSheet, Text, View, Pressable, StatusBar } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";

export default function HelpSupport() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const faqItems = [
    {
      q: "How do I create a wallet?",
      a: "From onboarding, choose your currency and enter a wallet name. You can also create additional wallets later from the Wallets area.",
    },
    {
      q: "Where are my transactions stored?",
      a: "Transactions are stored in the app's database (local SQLite in this project) and associated with your user session.",
    },
    {
      q: "Why am I seeing \"Invalid or expired token\"?",
      a: "Your session token is no longer valid on the backend which mean the session has expired. Please log out and log back in to refresh your session.",
    },
    {
      q: "How do I change currency?",
      a: "Go to Profile settings and update your default currency. The UI will reflect your selected currency.",
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.text }]}>{"<"}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Help &amp; Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>FAQ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {faqItems.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.faqBlock,
                idx !== faqItems.length - 1 && {
                  borderBottomColor: colors.cardBorder,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Text style={[styles.faqQ, { color: colors.text }]}>{item.q}</Text>
              <Text style={[styles.faqA, { color: colors.textMuted }]}>{item.a}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 22 }]}>Contact us</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.body, { color: colors.textMuted }]}>Email: <Text style={{ color: colors.primary, fontWeight: "700" }}>support@personalfinancetracker.com</Text></Text>
          <Text style={[styles.body, { color: colors.textMuted, marginTop: 8 }]}>We aim to respond within 1-3 business days.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 22 }]}>Need more help?</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.body, { color: colors.textMuted }]}>If you encounter issues, please include your device type and what you were doing when the error appeared.</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  faqBlock: { paddingVertical: 10 },
  faqQ: { fontSize: 14, fontWeight: "800" },
  faqA: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  body: { fontSize: 13, lineHeight: 19 },
});