import React, { useReducer, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";

type LocationType = { lat: number | null; lng: number | null };

type State = {
  disasterType: string;
  additionalInfo: string;
  location: LocationType;
  address: string;
  status: string;
  loading: boolean;
};

type Action =
  | { type: "SET_DISASTER_TYPE"; payload: string }
  | { type: "SET_ADDITIONAL_INFO"; payload: string }
  | { type: "SET_LOCATION"; payload: LocationType }
  | { type: "SET_ADDRESS"; payload: string }
  | { type: "SET_STATUS"; payload: string }
  | { type: "SET_LOADING"; payload: boolean };

const initialState: State = {
  disasterType: "",
  additionalInfo: "",
  location: { lat: null, lng: null },
  address: "",
  status: "",
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DISASTER_TYPE":
      return { ...state, disasterType: action.payload };
    case "SET_ADDITIONAL_INFO":
      return { ...state, additionalInfo: action.payload };
    case "SET_LOCATION":
      return { ...state, location: action.payload, status: "✅ Location retrieved" };
    case "SET_ADDRESS":
      return { ...state, address: action.payload };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

const DISASTER_OPTIONS = [
  { label: "Select Disaster", value: "" },
  { label: "🌊 Flood", value: "Flood" },
  { label: "🌍 Earthquake", value: "Earthquake" },
  { label: "🔥 Fire", value: "Fire" },
  { label: "🌪️ Cyclone", value: "Cyclone" },
  { label: "⚠️ Other", value: "Other" },
];

export default function EmergencyScreen() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { disasterType, additionalInfo, location, address, status, loading } = state;

  // Get location and address
  useEffect(() => {
    (async () => {
      let { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") {
        dispatch({ type: "SET_STATUS", payload: "❌ Permission to access location was denied" });
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      dispatch({ type: "SET_LOCATION", payload: coords });

      // Reverse geocode
      let addr = await Location.reverseGeocodeAsync({
        latitude: coords.lat!,
        longitude: coords.lng!,
      });
      if (addr && addr[0]) {
        const { name, street, city, region, country } = addr[0];
        dispatch({
          type: "SET_ADDRESS",
          payload: [name, street, city, region, country].filter(Boolean).join(", "),
        });
      } else {
        dispatch({ type: "SET_ADDRESS", payload: "Address not found" });
      }
    })();
  }, []);

  // Use your backend IP here!
  const BACKEND_URL = "http://172.20.50.176:5001/api/emergency-call";

  const sendEmergencyAlert = useCallback(
    async (mode: "call" | "sms") => {
      if (!disasterType) {
        dispatch({ type: "SET_STATUS", payload: "❌ Please select a disaster type" });
        return;
      }
      if (!location.lat) {
        dispatch({ type: "SET_STATUS", payload: "❌ Location required. Please allow location access" });
        return;
      }
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_STATUS", payload: "🚨 Sending alert..." });
      try {
        const response = await fetch(BACKEND_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "+918870348008",
            disasterType,
            location,
            address,
            additionalInfo: additionalInfo.trim() || "No additional info provided",
            mode,
          }),
        });
        const data = await response.json();
        dispatch({
          type: "SET_STATUS",
          payload: data.success ? `✅ Alert sent: ${data.sid}` : `❌ Error: ${data.error || "Unknown error"}`,
        });
      } catch (err: any) {
        dispatch({ type: "SET_STATUS", payload: `❌ Failed: ${err.message}` });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [disasterType, location, address, additionalInfo]
  );

  const isFormValid = disasterType && location.lat;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🚨 Emergency Call</Text>
      {location.lat ? (
        <>
          <Text style={styles.coord}>
            Lat: {location.lat?.toFixed(4)} | Lng: {location.lng?.toFixed(4)}
          </Text>
          <Text style={styles.address}>📍 {address || "Fetching address..."}</Text>
        </>
      ) : (
        <Text style={styles.error}>Waiting for location...</Text>
      )}

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Disaster Type</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={disasterType}
            onValueChange={(value) => dispatch({ type: "SET_DISASTER_TYPE", payload: value })}
            style={styles.picker}
          >
            {DISASTER_OPTIONS.map((opt) => (
              <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>

      <TextInput
        style={[styles.input, { height: 60 }]}
        placeholder="Additional info..."
        value={additionalInfo}
        onChangeText={(text) => dispatch({ type: "SET_ADDITIONAL_INFO", payload: text })}
        multiline
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isFormValid ? "#ef4444" : "#a1a1aa" },
          ]}
          disabled={!isFormValid || loading}
          onPress={() => sendEmergencyAlert("call")}
        >
          <Text style={styles.buttonText}>📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: isFormValid ? "#22c55e" : "#a1a1aa" },
          ]}
          disabled={!isFormValid || loading}
          onPress={() => sendEmergencyAlert("sms")}
        >
          <Text style={styles.buttonText}>📩 SMS</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 10 }} />}

      {status ? (
        <Text
          style={[
            styles.status,
            status.startsWith("✅")
              ? { color: "#16a34a" }
              : status.startsWith("🚨")
              ? { color: "#ca8a04" }
              : { color: "#dc2626" },
          ]}
        >
          {status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#f1f5f9" },
  header: { fontSize: 22, fontWeight: "bold", color: "#2563eb", marginBottom: 16, textAlign: "center" },
  coord: { fontSize: 14, color: "#334155", marginBottom: 2, textAlign: "center" },
  address: { fontSize: 12, color: "#64748b", marginBottom: 10, textAlign: "center" },
  error: { fontSize: 14, color: "#dc2626", marginBottom: 10, textAlign: "center" },
  pickerContainer: { width: "100%", marginBottom: 10 },
  label: { fontSize: 14, color: "#334155", marginBottom: 2 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: { width: "100%", height: 44 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
    width: "100%",
    marginBottom: 10,
    fontSize: 15,
  },
  buttonRow: { flexDirection: "row", width: "100%", justifyContent: "space-between", marginTop: 5 },
  button: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  status: { marginTop: 15, fontSize: 14, fontWeight: "600", textAlign: "center" },
});
