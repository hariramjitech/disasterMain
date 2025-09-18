import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker } from "react-native-maps";

type AlertItem = {
  title?: string;
  author?: string;
  pubDate?: string;
  lat: number;
  lon: number;
};

export default function CapAlertsScreen() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://172.20.50.176:5001/api/cap/cap-feed");
        const data = await res.json();

        if (data?.rss?.channel?.item) {
          const items = Array.isArray(data.rss.channel.item)
            ? data.rss.channel.item
            : [data.rss.channel.item];

          const withCoords = items.map((alert: any) => ({
            ...alert,
            lat: 20 + Math.random() * 10,
            lon: 75 + Math.random() * 10,
          }));

          setAlerts(withCoords);
        }
      } catch (err) {
        setError("Failed to load alerts");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const focusOnAlert = (alert: AlertItem) => {
    setSelectedAlert(alert);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: alert.lat,
        longitude: alert.lon,
        latitudeDelta: 2,
        longitudeDelta: 2,
      });
    }
  };

  // Show only first 5 alerts in the list
  const visibleAlerts = alerts.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 22.9734,
          longitude: 78.6569,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
      >
        {selectedAlert && (
          <Marker
            key={`${selectedAlert.title ?? "alert"}-${selectedAlert.pubDate ?? "selected"}`}
            coordinate={{ latitude: selectedAlert.lat, longitude: selectedAlert.lon }}
            title={selectedAlert.title ?? ""}
            description={selectedAlert.author ?? ""}
          />
        )}
      </MapView>

      {/* Bottom Alerts List */}
      <View style={styles.bottomSheet}>
        <Text style={styles.header}>⚠️ Disaster Alerts</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#e74c3c" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            data={visibleAlerts}
            keyExtractor={(item, i) => `${item.title ?? "alert"}-${item.pubDate ?? i}-${i}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.alertCard}
                onPress={() => focusOnAlert(item)}
              >
                <Text style={styles.title}>{item.title ?? "No Title"}</Text>
                <Text style={styles.meta}>📌 {item.author || "Unknown Source"}</Text>
                <Text style={styles.meta}>🕒 {item.pubDate ?? "Unknown Date"}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: "40%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  header: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  alertCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  meta: { fontSize: 12, color: "#555" },
  error: { color: "red", textAlign: "center", marginTop: 10 },
});
