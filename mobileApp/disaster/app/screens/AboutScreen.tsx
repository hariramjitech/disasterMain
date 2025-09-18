import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const EMERGENCY_CONTACTS = [
  { label: "National Emergency Number", number: "112" },
  { label: "Police", number: "100" },
  { label: "Fire", number: "101" },
  { label: "Ambulance", number: "108" },
  { label: "Disaster Management", number: "102" },
];

const FEATURES = [
  { icon: "map", text: "Offline & Online Maps for disaster zones" },
  { icon: "phone", text: "One-tap Emergency Call & SMS alerts" },
  { icon: "location-arrow", text: "Auto-location & address detection" },
  { icon: "exclamation-triangle", text: "Real-time disaster alerts (CAP feed)" },
  { icon: "hospital-o", text: "Nearby hospitals, police, fire stations & shelters" },
  { icon: "language", text: "Multilingual support (coming soon)" },
];

function handleCall(number: string) {
  Linking.openURL(`tel:${number}`).catch(() =>
    Alert.alert("Error", "Unable to open dialer.")
  );
}

export default function AboutScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ℹ️ About Disaster Management App</Text>
      <Text style={styles.desc}>
        This app helps you stay safe and informed during disasters. Access emergency contacts, send alerts, and find nearby help even when offline.
      </Text>

      <Text style={styles.sectionTitle}>📞 Emergency Contacts</Text>
      {EMERGENCY_CONTACTS.map((c) => (
        <View key={c.label} style={styles.contactRow}>
          <Text style={styles.contactLabel}>{c.label}:</Text>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(c.number)}
          >
            <FontAwesome name="phone" size={16} color="#fff" />
            <Text style={styles.callButtonText}>{c.number}</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.sectionTitle}>✨ Key Features</Text>
      {FEATURES.map((f, i) => (
        <View key={i} style={styles.featureRow}>
          <FontAwesome name={f.icon as any} size={18} color="#2563eb" style={{ marginRight: 8 }} />
          <Text style={styles.featureItem}>{f.text}</Text>
        </View>
      ))}

      <Text style={styles.footer}>
        Stay alert. Stay safe. For feedback or support, contact: support@disasterapp.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: "flex-start", backgroundColor: "#f8fafc", flexGrow: 1 },
  title: { fontSize: 22, fontWeight: "bold", color: "#2563eb", marginBottom: 10 },
  desc: { fontSize: 15, color: "#334155", marginBottom: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#0f172a", marginTop: 16, marginBottom: 6 },
  contactRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  contactLabel: { fontWeight: "500", color: "#475569", width: 180 },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#22c55e",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  callButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 6, fontSize: 15 },
  featureRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, marginLeft: 4 },
  featureItem: { fontSize: 15, color: "#334155" },
  footer: { marginTop: 24, fontSize: 13, color: "#64748b" },
});
