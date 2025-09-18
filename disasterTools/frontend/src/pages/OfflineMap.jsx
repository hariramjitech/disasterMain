import React, { useEffect, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.offline";
import "leaflet.awesome-markers/dist/leaflet.awesome-markers.css";
import "leaflet.awesome-markers";

// --- Custom Icons ---
const hospitalIcon = L.AwesomeMarkers.icon({
  icon: "plus",
  prefix: "fa",
  markerColor: "red",
});
const policeIcon = L.AwesomeMarkers.icon({
  icon: "shield",
  prefix: "fa",
  markerColor: "blue",
});
const fireIcon = L.AwesomeMarkers.icon({
  icon: "fire",
  prefix: "fa",
  markerColor: "orange",
});
const shelterIcon = L.AwesomeMarkers.icon({
  icon: "home",
  prefix: "fa",
  markerColor: "green",
});

// --- Enhanced Tile Error Handling ---
const originalCreateTile = L.TileLayer.prototype.createTile;
L.TileLayer.prototype.createTile = function (coords, done) {
  const tile = originalCreateTile.call(this, coords, done);
  
  // Completely silent error handling for offline scenarios
  tile.onerror = function () {
    // Create a blank canvas instead of showing broken image
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Draw a light gray background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw a subtle grid pattern to indicate it's a map tile
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i < 256; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    
    // Draw "Offline" text in the center
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Offline', 128, 128);
    
    // Replace the broken image with our canvas
    tile.src = canvas.toDataURL();
    done(null, tile);
  };
  
  return tile;
};

// Storage keys with expiration support
const STORAGE_KEYS = {
  LOCATION: "lastLocation",
  PLACES: "cachedPlaces",
  TILES: "tileStorage",
  EXPIRATION: "_expiration"
};

// Helper function to set data with expiration (days)
const setWithExpiration = (key, data, days = 7) => {
  const item = {
    data,
    [STORAGE_KEYS.EXPIRATION]: new Date().getTime() + (days * 24 * 60 * 60 * 1000)
  };
  localStorage.setItem(key, JSON.stringify(item));
};

// Helper function to get data with expiration check
const getWithExpiration = (key) => {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;
  
  try {
    const item = JSON.parse(itemStr);
    if (new Date().getTime() > item[STORAGE_KEYS.EXPIRATION]) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch (e) {
    console.debug(`Error parsing stored data for ${key}`);
    localStorage.removeItem(key);
    return null;
  }
};

export default function OfflineMap() {
  const [status, setStatus] = useState("Loading map...");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let map;
    
    try {
      // Restore last location if available and not expired
      const savedLocation = getWithExpiration(STORAGE_KEYS.LOCATION);
      const initialCoords = savedLocation || [20.5937, 78.9629]; // fallback: India center

      map = L.map("map", {
        center: initialCoords,
        zoom: 13,
        zoomControl: false
      });

      // Add zoom control with better position
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      // --- Tile Layer with offline support ---
      const tileURL = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";

      const offlineLayer = L.tileLayer.offline(tileURL, {
        subdomains: "abc",
        attribution: "© OpenStreetMap contributors, Humanitarian Style",
        minZoom: 5,
        maxZoom: 19,
        crossOrigin: true,
      });

      // Silent error handling for tiles
      offlineLayer.on("tileerror", () => {
        // Completely silent - no console output
      });

      offlineLayer.addTo(map);

      // Enhanced tile control with better error handling
      try {
        const control = L.control.savetiles(offlineLayer, {
          zoomLevels: [13, 14, 15],
          saveButtonText: "💾 Cache Tiles",
          rmButtonText: "🗑️ Clear Cache",
          confirm: (count, size) => {
            try {
              return window.confirm(`Download ${count} tiles (${size} MB)?`);
            } catch (e) {
              return false;
            }
          },
        });
        control.addTo(map);
      } catch (controlError) {
        // Silent fail for control errors
      }

      // --- Dynamic Places ---
      async function fetchNearbyPlaces(lat, lng) {
        setStatus("Loading nearby places...");
        
        // If we're offline, just use cached data immediately
        if (!isOnline) {
          const cached = getWithExpiration(STORAGE_KEYS.PLACES) || [];
          addPlacesToMap(cached);
          setStatus(cached.length ? "" : "No cached places available");
          return;
        }
        
        const query = `
          [out:json];
          (
            node["amenity"~"hospital|police|fire_station|shelter"](around:5000, ${lat}, ${lng});
            way["amenity"~"hospital|police|fire_station|shelter"](around:5000, ${lat}, ${lng});
            relation["amenity"~"hospital|police|fire_station|shelter"](around:5000, ${lat}, ${lng});
          );
          out center;
        `;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const res = await fetch(
            "https://overpass-api.de/api/interpreter?data=" +
              encodeURIComponent(query),
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (!res.ok) throw new Error("Server error");

          const data = await res.json();
          
          // Store with 7-day expiration
          setWithExpiration(STORAGE_KEYS.PLACES, data.elements, 7);
          
          addPlacesToMap(data.elements);
          setStatus("");
        } catch (err) {
          // Silent error handling - use cached data
          const cached = getWithExpiration(STORAGE_KEYS.PLACES) || [];
          addPlacesToMap(cached);
          setStatus(cached.length ? "" : "No cached places available");
        }
      }

      function addPlacesToMap(elements) {
        try {
          // Clear existing markers first
          map.eachLayer(layer => {
            if (layer instanceof L.Marker && !layer._isUserLocation) {
              map.removeLayer(layer);
            }
          });
          
          if (elements.length === 0) {
            return;
          }
          
          elements.forEach((el) => {
            try {
              const coords =
                el.type === "node" ? [el.lat, el.lon] : [el.center.lat, el.center.lon];
              const amenity = el.tags?.amenity;
              const name = el.tags?.name || amenity || "Unknown";

              let icon = shelterIcon;
              if (amenity === "hospital") icon = hospitalIcon;
              if (amenity === "police") icon = policeIcon;
              if (amenity === "fire_station") icon = fireIcon;

              L.marker(coords, { icon })
                .addTo(map)
                .bindPopup(name);
            } catch (markerError) {
              // Silent fail for marker errors
            }
          });
        } catch (e) {
          // Silent fail for map errors
        }
      }

      // --- Geolocation ---
      function onLocationFound(e) {
        try {
          const { lat, lng } = e.latlng;
          
          // Store location with 30-day expiration
          setWithExpiration(STORAGE_KEYS.LOCATION, [lat, lng], 30);

          // Delay to avoid _leaflet_pos crash
          setTimeout(() => {
            try {
              map.setView([lat, lng], 15);
            } catch (viewError) {
              // Silent fail for view errors
            }
          }, 200);

          // Add user location marker
          L.marker([lat, lng], { _isUserLocation: true })
            .addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();

          // Cache tiles for offline use
          if (offlineLayer && typeof offlineLayer.saveTiles === "function") {
            try {
              offlineLayer.saveTiles(map, [13, 14, 15]);
            } catch (tileError) {
              // Silent fail for tile saving errors
            }
          }

          fetchNearbyPlaces(lat, lng);
        } catch (e) {
          // Silent fail for location processing errors
        }
      }

      function onLocationError() {
        // Use saved/default location without error messages
        fetchNearbyPlaces(initialCoords[0], initialCoords[1]);
        setStatus("");
      }

      map.on("locationfound", onLocationFound);
      map.on("locationerror", onLocationError);

      // Try to locate with timeout
      try {
        map.locate({ 
          setView: true, 
          maxZoom: 15,
          timeout: 10000
        });
      } catch (locateError) {
        onLocationError();
      }

    } catch (initError) {
      setStatus("Failed to load map");
    }

    return () => {
      if (map) {
        map.off("locationfound");
        map.off("locationerror");
        map.remove();
      }
    };
  }, [isOnline]);

  return (
  <div className="relative w-full h-[calc(100vh-20px)]">
    {/* Map Container */}
    <div
      id="map"
      className="w-full h-full border-2 border-gray-300 rounded-lg shadow-md"
      style={{ zIndex: 0 }} // Add this line to ensure map stays behind sidebar
    />

    {/* Status Message */}
    {status && (
      <div
        className="
          absolute top-2 left-1/2 transform -translate-x-1/2 
          bg-blue-100 text-blue-700 border border-blue-300 
          rounded-lg shadow-lg py-2 text-sm font-medium 
          max-w-[80%] text-center z-[1000]"
      >
        {status}
      </div>
    )}
  </div>
);

}