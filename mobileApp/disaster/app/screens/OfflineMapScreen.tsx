import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import MapView, { Marker, UrlTile, PROVIDER_GOOGLE, Region } from "react-native-maps";
import NetInfo from "@react-native-community/netinfo";
import axios from "axios";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Location from "expo-location"; // <-- Add this

// Default center (India)
const defaultRegion: Region = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

type Place = {
  id: number;
  lat: number;
  lon: number;
  tags?: {
    amenity?: string;
    name?: string;
  };
};

export default function OfflineMapScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  // Monitor internet status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Fetch nearby places (Overpass API)
  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const query = `
        [out:json][timeout:25];
        (
          node(around:5000,${lat},${lon})[amenity=hospital];
          node(around:5000,${lat},${lon})[amenity=police];
          node(around:5000,${lat},${lon})[amenity=fire_station];
          node(around:5000,${lat},${lon})[amenity=shelter];
        );
        out body;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await axios.get(url);
      const data = res.data.elements || [];
      setPlaces(data);
    } catch (err: any) {
      console.warn("Failed to fetch places:", err.message);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  // On first load: get device location using expo-location
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Permission to access location was denied");
        }
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const newRegion: Region = {
          latitude,
          longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };
        setRegion(newRegion);
        fetchNearbyPlaces(latitude, longitude);
      } catch (error) {
        console.warn("Location API not available:", error);
        setRegion(defaultRegion);
        fetchNearbyPlaces(defaultRegion.latitude, defaultRegion.longitude);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick icon based on amenity
  const getIcon = (amenity?: string) => {
    switch (amenity) {
      case "hospital":
        return { name: "hospital", color: "red" };
      case "police":
        return { name: "shield-alt", color: "blue" };
      case "fire_station":
        return { name: "fire-extinguisher", color: "orange" };
      case "shelter":
        return { name: "home", color: "green" };
      default:
        return { name: "map-marker-alt", color: "gray" };
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation
        onRegionChangeComplete={setRegion}
      >
        {/* Use Carto OSM tiles */}
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* Markers */}
        {places.map((place, idx) => {
          const { name, color } = getIcon(place.tags?.amenity);
          return (
            <Marker
              key={place.id || idx}
              coordinate={{
                latitude: place.lat,
                longitude: place.lon,
              }}
              title={place.tags?.name || place.tags?.amenity}
              description={place.tags?.amenity}
            >
              <FontAwesome5 name={name as any} size={20} color={color} />
            </Marker>
          );
        })}
      </MapView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 5 }}>
            Loading nearby places...
          </Text>
        </View>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            ⚠️ Offline Mode: Cached/default tiles only
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  offlineBanner: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 6,
  },
  offlineText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  loading: {
    position: "absolute",
    top: "40%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
