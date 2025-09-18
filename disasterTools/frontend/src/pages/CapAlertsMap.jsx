import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { parseStringPromise } from "xml2js"; // XML → JS

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const CapAlertsMap = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertDetails, setAlertDetails] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/cap/cap-feed");
        const data = await res.json();

        if (data?.rss?.channel?.item) {
          const items = Array.isArray(data.rss.channel.item)
            ? data.rss.channel.item
            : [data.rss.channel.item];

          // add demo coords if not present
          const withCoords = items.map((alert, idx) => ({
            ...alert,
            lat: 20 + Math.random() * 10,
            lon: 75 + Math.random() * 10,
          }));

          setAlerts(withCoords);
        }
      } catch (err) {
        console.error("Error fetching CAP alerts:", err);
      }
    };

    fetchAlerts();
  }, []);

  // Focus map
  const focusOnAlert = (alert) => {
    setSelectedAlert(alert);
    if (mapRef.current) {
      mapRef.current.flyTo([alert.lat, alert.lon], 7, {
        animate: true,
        duration: 2,
      });
    }
  };

  // Fetch CAP XML details
  const fetchDetails = async (url) => {
    try {
      const res = await fetch(url);
      const xmlText = await res.text();
      const parsed = await parseStringPromise(xmlText);

      // Extract fields safely
      const cap = parsed["cap:alert"];
      const info = cap["cap:info"]?.[0];

      const details = {
        identifier: cap["cap:identifier"]?.[0],
        sender: cap["cap:sender"]?.[0],
        sent: cap["cap:sent"]?.[0],
        event: info?.["cap:event"]?.[0],
        urgency: info?.["cap:urgency"]?.[0],
        severity: info?.["cap:severity"]?.[0],
        certainty: info?.["cap:certainty"]?.[0],
        headline: info?.["cap:headline"]?.[0],
        description: info?.["cap:description"]?.[0],
        area: info?.["cap:area"]?.[0]?.["cap:areaDesc"]?.[0],
      };

      setAlertDetails(details);
    } catch (err) {
      console.error("Error fetching details:", err);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left: Alerts list */}
      <div
        style={{
          width: "35%",
          overflowY: "scroll",
          padding: "10px",
          borderRight: "2px solid #ccc",
        }}
      >
        <h2>⚠️ Disaster Alerts</h2>
        {alerts.length === 0 ? (
          <p>Loading alerts...</p>
        ) : (
          alerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "15px",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "#f9f9f9",
                cursor: "pointer",
              }}
              onClick={() => focusOnAlert(alert)}
            >
              <h4>{alert.title}</h4>
              <p>
                <strong>Source:</strong> {alert.author}
              </p>
              <p>
                <strong>Date:</strong> {alert.pubDate}
              </p>
              <button
                style={{
                  marginTop: "5px",
                  padding: "5px 10px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  fetchDetails(alert.link); // fetch XML details instead of opening new page
                }}
              >
                More Details
              </button>
            </div>
          ))
        )}

        {/* Details Panel */}
        {alertDetails && (
          <div
            style={{
              marginTop: "20px",
              padding: "10px",
              border: "2px solid #007bff",
              borderRadius: "8px",
              background: "#eef6ff",
            }}
          >
            <h3>📑 Alert Details</h3>
            <p><b>ID:</b> {alertDetails.identifier}</p>
            <p><b>Sender:</b> {alertDetails.sender}</p>
            <p><b>Sent:</b> {alertDetails.sent}</p>
            <p><b>Event:</b> {alertDetails.event}</p>
            <p><b>Urgency:</b> {alertDetails.urgency}</p>
            <p><b>Severity:</b> {alertDetails.severity}</p>
            <p><b>Certainty:</b> {alertDetails.certainty}</p>
            <p><b>Area:</b> {alertDetails.area}</p>
            <p><b>Headline:</b> {alertDetails.headline}</p>
            <p><b>Description:</b> {alertDetails.description}</p>
          </div>
        )}
      </div>

      {/* Right: Map */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={[22.9734, 78.6569]}
          zoom={5}
          style={{ width: "100%", height: "100%" }}
          whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {alerts.slice(0, 4).map((alert, idx) => (
            <Marker key={idx} position={[alert.lat, alert.lon]}>
              <Popup>
                <b>{alert.title}</b>
                <br />
                {alert.author}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default CapAlertsMap;
 