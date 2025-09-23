import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";

const GEMINI_API_KEY = "AIzaSyB6y0VGX3YiIsWYddgdLj4fGQScqiHC7FA"; // Replace with your key

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="text-red-500 p-4">Something went wrong in this section.</div>;
    return this.props.children;
  }
}

// Helper to fetch nearby places from OpenStreetMap
const fetchNearbyOSM = async (lat, lng, type) => {
  const radius = 5000; // meters
  const overpassUrl = `https://overpass-api.de/api/interpreter`;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="${type}"](around:${radius},${lat},${lng});
      way["amenity"="${type}"](around:${radius},${lat},${lng});
      relation["amenity"="${type}"](around:${radius},${lat},${lng});
    );
    out center;
  `;
  const res = await fetch(overpassUrl, { method: "POST", body: query });
  const data = await res.json();
  return data.elements.map(el => ({
    id: el.id,
    name: el.tags?.name || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
    lat: el.lat || el.center?.lat,
    lng: el.lon || el.center?.lon,
  }));
};

export default function TripHelp() {
  const [tripInput, setTripInput] = useState("");
  const [tripData, setTripData] = useState(() => {
    const saved = localStorage.getItem("lastTrip");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [emergencyLocations, setEmergencyLocations] = useState(() => {
    const saved = localStorage.getItem("lastEmergencyLocations");
    return saved ? JSON.parse(saved) : { hospitals: [], police: [] };
  });

  // Retry fetch utility
  const fetchWithRetry = async (url, options, retries = 2) => {
    try { return await fetch(url, options); }
    catch (err) { if (retries > 0) return fetchWithRetry(url, options, retries - 1); throw err; }
  };

  const handleSearch = async () => {
    if (!tripInput) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `User plans a trip to: "${tripInput}". 
                Generate a detailed travel safety and disaster preparedness guide in JSON with:
                place, area, lat, lng, disasters, preventions, survival, things_to_carry, 
                emergency_contacts, travel_tips, best_time_to_visit, cultural_notes, 
                emergency_meeting_points, evacuation_routes, risk_level, weather_alerts, safety_score.
                Return only JSON.`
              }],
            }],
          }),
        }
      );

      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      const data = await res.json();
      let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      textResponse = textResponse.replace(/```json|```/g, "").trim();

      let parsed;
      try { parsed = JSON.parse(textResponse); } 
      catch { parsed = {}; }

      const stringifyArrayItems = (arr) =>
        Array.isArray(arr) ? arr.map(item => typeof item === "object" ? JSON.stringify(item) : String(item)) : [];

      const processedData = {
        place: parsed.place || tripInput,
        area: parsed.area || "Unknown",
        lat: parsed.lat || null,
        lng: parsed.lng || null,
        disasters: stringifyArrayItems(parsed.disasters),
        preventions: stringifyArrayItems(parsed.preventions),
        survival: stringifyArrayItems(parsed.survival),
        things_to_carry: stringifyArrayItems(parsed.things_to_carry),
        travel_tips: stringifyArrayItems(parsed.travel_tips),
        cultural_notes: stringifyArrayItems(parsed.cultural_notes),
        best_time_to_visit: parsed.best_time_to_visit || "Unknown",
        emergency_contacts: parsed.emergency_contacts || { general: { police:"100", ambulance:"102", fire:"101" }, local:{} },
        emergency_meeting_points: stringifyArrayItems(parsed.emergency_meeting_points),
        evacuation_routes: stringifyArrayItems(parsed.evacuation_routes),
        risk_level: parsed.risk_level || "Unknown",
        weather_alerts: stringifyArrayItems(parsed.weather_alerts),
        safety_score: parsed.safety_score || "—"
      };

      setTripData(processedData);
      localStorage.setItem("lastTrip", JSON.stringify(processedData));
      setActiveTab("overview");

    } catch (err) {
      console.error(err);
      setError(err.message);
      setTripData(null);
    }

    setLoading(false);
  };

  // Fetch nearby hospitals & police stations from OSM
  useEffect(() => {
    const fetchNearbyLocations = async () => {
      if (!tripData?.lat || !tripData?.lng) return;
      try {
        const [hospitals, police] = await Promise.all([
          fetchNearbyOSM(tripData.lat, tripData.lng, "hospital"),
          fetchNearbyOSM(tripData.lat, tripData.lng, "police"),
        ]);
        setEmergencyLocations({ hospitals, police });
        localStorage.setItem("lastEmergencyLocations", JSON.stringify({ hospitals, police }));
      } catch (err) {
        console.error("Error fetching nearby emergency locations:", err);
      }
    };

    fetchNearbyLocations();
  }, [tripData?.lat, tripData?.lng]);

  const InfoCard = ({ title, items }) => (
    <div className="bg-white shadow rounded p-4 mb-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {items?.length > 0 ? <ul className="list-disc pl-5">{items.map((i, idx) => <li key={idx}>{i}</li>)}</ul> : <p className="italic text-gray-500">No information available</p>}
    </div>
  );

  const ContactCard = ({ title, contacts }) => (
    <div className="bg-white shadow rounded p-4 mb-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {contacts && Object.keys(contacts).length > 0 ? Object.entries(contacts).map(([k, v], idx) => (
        <div key={idx} className="flex justify-between border-b py-1"><span className="capitalize">{k.replace(/_/g," ")}</span><span className="font-semibold">{v}</span></div>
      )) : <p className="italic text-gray-500">No contacts available</p>}
    </div>
  );

  const RiskBadge = ({ level }) => {
    const color = level?.toLowerCase() === "high" ? "bg-red-500" :
                  level?.toLowerCase() === "medium" ? "bg-yellow-500" : "bg-green-500";
    return <span className={`px-2 py-1 rounded text-white font-semibold ${color}`}>{level || "Unknown"}</span>;
  };

  const SafetyScore = ({ score }) => {
    const s = parseInt(score);
    const pct = !isNaN(s) ? (s / 10) * 100 : 0;
    const color = s >= 7 ? "bg-green-500" : s >= 4 ? "bg-yellow-500" : "bg-red-500";
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded">
          <div className={`h-full ${color} rounded`} style={{ width:`${pct}%` }}></div>
        </div>
        <span className="font-semibold">{!isNaN(s) ? `${s}/10` : "N/A"}</span>
      </div>
    );
  };

  const safeData = tripData || {
    place:"—", area:"—", lat:"—", lng:"—", disasters:[], preventions:[], survival:[],
    things_to_carry:[], travel_tips:[], best_time_to_visit:"—", cultural_notes:[],
    emergency_contacts:{ general:{ police:"100", ambulance:"102", fire:"101" }, local:{} },
    emergency_meeting_points:[], evacuation_routes:[], risk_level:"Unknown", weather_alerts:[], safety_score:"—"
  };

  // Full PDF Generator
  const downloadPDF = () => {
    if (!tripData) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const lineHeight = 7;
    let y = 20;

    const addSection = (title, items) => {
      pdf.setFontSize(14);
      pdf.setTextColor(20, 20, 20);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, 10, y);
      y += lineHeight;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      if (!items || items.length === 0) {
        pdf.text("No information available", 10, y);
        y += lineHeight;
      } else {
        items.forEach((item) => {
          const textLines = pdf.splitTextToSize(`• ${item}`, pageWidth - 20);
          if (y + textLines.length * lineHeight > pdf.internal.pageSize.getHeight() - 10) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(textLines, 10, y);
          y += textLines.length * lineHeight;
        });
      }
      y += lineHeight / 2;
    };

    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${safeData.place} - Travel Safety Guide`, pageWidth / 2, y, { align: "center" });
    y += 15;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Area: ${safeData.area}`, 10, y); y += lineHeight;
    pdf.text(`Location: ${safeData.lat}, ${safeData.lng}`, 10, y); y += lineHeight;
    pdf.text(`Risk Level: ${safeData.risk_level}`, 10, y); y += lineHeight;
    pdf.text(`Safety Score: ${safeData.safety_score}`, 10, y); y += lineHeight + 5;

    addSection("Travel Tips", safeData.travel_tips);
    addSection("Cultural Notes", safeData.cultural_notes);
    addSection("Best Time to Visit", [safeData.best_time_to_visit]);

    addSection("Potential Disasters", safeData.disasters);
    addSection("Prevention Measures", safeData.preventions);
    addSection("Survival Tips", safeData.survival);
    addSection("Things to Carry", safeData.things_to_carry);

    const formatContacts = (contacts) => Object.entries(contacts || {}).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
    addSection("General Contacts", formatContacts(safeData.emergency_contacts.general));
    addSection("Local Contacts", formatContacts(safeData.emergency_contacts.local));
    addSection("Emergency Meeting Points", safeData.emergency_meeting_points);
    addSection("Evacuation Routes", safeData.evacuation_routes);

    addSection("Nearby Hospitals", emergencyLocations?.hospitals?.map(h => h.name || "Unnamed"));
    addSection("Nearby Police Stations", emergencyLocations?.police?.map(p => p.name || "Unnamed"));
    addSection("Weather Alerts", safeData.weather_alerts);

    pdf.save(`${safeData.place}-trip-guide.pdf`);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto min-h-screen bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">🌍 Disaster Safety Travel Guide</h1>
        <p className="text-gray-600">Plan your trip safely with disaster preparedness and survival tips.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Enter your destination"
          value={tripInput}
          onChange={e => setTripInput(e.target.value)}
          onKeyPress={e => e.key === "Enter" && handleSearch()}
          className="flex-grow p-3 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Get Safety Guide"}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">❌ {error}</p>}

      {tripData && (
        <div className="bg-white shadow rounded p-4 mb-6">
          <h2 className="text-2xl font-bold mb-2">{safeData.place} - {safeData.area}</h2>
          <div className="flex gap-4 flex-wrap">
            <div>📍 {safeData.lat}, {safeData.lng}</div>
            <div>⚠️ Risk Level: <RiskBadge level={safeData.risk_level} /></div>
            <div>🛡️ Safety Score: <SafetyScore score={safeData.safety_score} /></div>
          </div>
        </div>
      )}

      {tripData && (
        <div className="flex gap-2 overflow-x-auto mb-6">
          {["overview","risks","preparation","emergency","locations","weather"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded ${activeTab===tab ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <button
            onClick={downloadPDF}
            className="ml-auto px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600"
          >
            📄 Download Guide
          </button>
        </div>
      )}

      {tripData && (
        <div id="trip-guide">
          <ErrorBoundary>
            {activeTab==="overview" && (
              <>
                <InfoCard title="Travel Tips" items={safeData.travel_tips} />
                <InfoCard title="Cultural Notes" items={safeData.cultural_notes} />
                <InfoCard title="Best Time to Visit" items={[safeData.best_time_to_visit]} />
              </>
            )}
            {activeTab==="risks" && (
              <>
                <InfoCard title="Potential Disasters" items={safeData.disasters} />
                <InfoCard title="Prevention Measures" items={safeData.preventions} />
                <InfoCard title="Survival Tips" items={safeData.survival} />
              </>
            )}
            {activeTab==="preparation" && (
              <InfoCard title="Things to Carry" items={safeData.things_to_carry} />
            )}
            {activeTab==="emergency" && (
              <>
                <ContactCard title="General Contacts" contacts={safeData.emergency_contacts.general} />
                <ContactCard title="Local Contacts" contacts={safeData.emergency_contacts.local} />
                <InfoCard title="Emergency Meeting Points" items={safeData.emergency_meeting_points} />
                <InfoCard title="Evacuation Routes" items={safeData.evacuation_routes} />
              </>
            )}
            {activeTab==="locations" && (
              <>
                <InfoCard title="Nearby Hospitals" items={emergencyLocations?.hospitals?.map(h => h.name || "Unnamed") || []} />
                <InfoCard title="Nearby Police Stations" items={emergencyLocations?.police?.map(p => p.name || "Unnamed") || []} />
              </>
            )}
            {activeTab==="weather" && (
              <InfoCard title="Weather Alerts" items={safeData.weather_alerts} />
            )}
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
