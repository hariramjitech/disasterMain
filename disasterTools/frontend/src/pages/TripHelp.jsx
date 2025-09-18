import React, { useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const GEMINI_API_KEY = "AIzaSyB6y0VGX3YiIsWYddgdLj4fGQScqiHC7FA";

export default function TripHelp() {
  const [tripInput, setTripInput] = useState("");
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [emergencyLocations, setEmergencyLocations] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const pdfRef = useRef();

  const handleSearch = async () => {
    if (!tripInput) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `The user is planning a trip to: "${tripInput}". 
                    Extract the main place and provide detailed travel guidance focused on safety and disaster preparedness in JSON format with the following structure:
                    {
                      "place": "extracted place name",
                      "area": "region or country",
                      "lat": "latitude coordinate",
                      "lng": "longitude coordinate",
                      "map_link": "Google Maps link",
                      "disasters": ["list of possible natural disasters or risks"],
                      "preventions": ["specific prevention measures for each risk"],
                      "survival": ["detailed survival tips in case of emergency"],
                      "things_to_carry": ["safety and emergency items to pack"],
                      "emergency_contacts": {
                        "general": { "police": "number", "ambulance": "number", "fire": "number" },
                        "local": { 
                          "local_police": "number with station locations", 
                          "hospitals": "numbers with locations", 
                          "disaster_mgmt": "number",
                          "coast_guard": "number (if applicable)",
                          "mountain_rescue": "number (if applicable)"
                        }
                      },
                      "travel_tips": ["safety-focused travel advice"],
                      "best_time_to_visit": "recommended time to visit considering safety",
                      "cultural_notes": ["safety-related cultural considerations"],
                      "emergency_meeting_points": ["designated safe locations in case of disaster"],
                      "evacuation_routes": ["known evacuation routes if available"],
                      "risk_level": "low/medium/high",
                      "weather_alerts": ["common weather warnings for this area"],
                      "safety_score": "score out of 10"
                    }
                    
                    Focus heavily on safety, disasters, and emergency preparedness. For coordinates and map links, use real data. Include specific hospital and police station locations when possible. Return only valid JSON.`
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      let textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Clean markdown wrapping
      textResponse = textResponse.replace(/```json|```/g, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(textResponse);
      } catch {
        console.warn("Gemini output not JSON, raw text:", textResponse);
        // Fallback data structure
        parsed = {
          place: tripInput,
          area: "Unknown",
          disasters: [],
          preventions: [],
          survival: [],
          things_to_carry: [],
          travel_tips: [],
          best_time_to_visit: "Unknown",
          cultural_notes: [],
          emergency_contacts: {
            general: { police: "100", ambulance: "102", fire: "101" },
            local: { 
              local_police: "—", 
              hospitals: "—", 
              disaster_mgmt: "—",
              coast_guard: "—",
              mountain_rescue: "—"
            },
          },
          emergency_meeting_points: [],
          evacuation_routes: [],
          risk_level: "Unknown",
          weather_alerts: [],
          safety_score: "—",
          raw: textResponse,
        };
      }

      // Process data to ensure all arrays contain strings, not objects
      const stringifyArrayItems = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => {
          if (typeof item === 'object' && item !== null) {
            return JSON.stringify(item);
          }
          return String(item);
        });
      };

      // Process the parsed data to ensure all array items are strings
      const processedData = {
        ...parsed,
        disasters: stringifyArrayItems(parsed.disasters),
        preventions: stringifyArrayItems(parsed.preventions),
        survival: stringifyArrayItems(parsed.survival),
        things_to_carry: stringifyArrayItems(parsed.things_to_carry),
        travel_tips: stringifyArrayItems(parsed.travel_tips),
        cultural_notes: stringifyArrayItems(parsed.cultural_notes),
        emergency_meeting_points: stringifyArrayItems(parsed.emergency_meeting_points),
        evacuation_routes: stringifyArrayItems(parsed.evacuation_routes),
        weather_alerts: stringifyArrayItems(parsed.weather_alerts),
      };

      setTripData(processedData);
      setActiveTab("overview");
      
      // Fetch emergency locations from OpenStreetMap
      await fetchEmergencyLocations(processedData.place, processedData.lat, processedData.lng);
    } catch (err) {
      console.error("Gemini error:", err);
      setError(err.message);
      setTripData(null);
    }

    setLoading(false);
  };

  const fetchEmergencyLocations = async (place, lat, lng) => {
    try {
      // Fetch hospitals
      const hospitalResponse = await fetch(
        `https://overpass-api.de/api/interpreter?data=[out:json];node[amenity=hospital](${parseFloat(lat)-0.1},${parseFloat(lng)-0.1},${parseFloat(lat)+0.1},${parseFloat(lng)+0.1});out;`
      );
      const hospitalData = await hospitalResponse.json();
      
      // Fetch police stations
      const policeResponse = await fetch(
        `https://overpass-api.de/api/interpreter?data=[out:json];node[amenity=police](${parseFloat(lat)-0.1},${parseFloat(lng)-0.1},${parseFloat(lat)+0.1},${parseFloat(lng)+0.1});out;`
      );
      const policeData = await policeResponse.json();
      
      setEmergencyLocations({
        hospitals: hospitalData.elements || [],
        police: policeData.elements || []
      });
    } catch (err) {
      console.error("Error fetching emergency locations:", err);
      // Set empty locations if API fails
      setEmergencyLocations({
        hospitals: [],
        police: []
      });
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    const input = pdfRef.current;
    
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${tripData.place}-safety-guide.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
    
    setDownloading(false);
  };

  const InfoCard = ({ title, icon, items, className = "", type = "list" }) => (
    <div className={`bg-white shadow-md rounded-xl p-4 hover:shadow-lg transition ${className}`}>
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span> {title}
      </h3>
      {items && items.length > 0 ? (
        type === "list" ? (
          <ul className="space-y-2 text-gray-700">
            {items.map((item, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-2 text-gray-700">
            {items.map((item, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded-lg">
                {item}
              </div>
            ))}
          </div>
        )
      ) : (
        <p className="text-gray-400 italic">No information available</p>
      )}
    </div>
  );

  const ContactSection = ({ title, contacts }) => (
    <div className="mb-4 last:mb-0">
      <h4 className="font-semibold text-gray-800 mb-2">{title}:</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(contacts).map(([service, number]) => (
          <div key={service} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
            <span className="capitalize font-medium text-gray-700">{service.replace(/_/g, " ")}:</span>
            <span className="font-semibold text-blue-600">{number}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const EmergencyLocationCard = ({ title, icon, locations, type }) => (
    <div className="bg-white shadow-md rounded-xl p-4 hover:shadow-lg transition">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span> {title}
      </h3>
      {locations && locations.length > 0 ? (
        <div className="space-y-3">
          {locations.slice(0, 5).map((location, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-800">
                {location.tags.name || `Unnamed ${type}`}
              </h4>
              {location.tags['addr:street'] && (
                <p className="text-sm text-gray-600 mt-1">
                  {location.tags['addr:street']}
                  {location.tags['addr:city'] && `, ${location.tags['addr:city']}`}
                </p>
              )}
              <a
                href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=17/${location.lat}/${location.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm mt-2 inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                View on Map
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 italic">No {type} locations found in the area</p>
      )}
    </div>
  );

  const RiskIndicator = ({ level }) => {
    let color, text;
    switch (level?.toLowerCase()) {
      case "high": color = "bg-red-500"; text = "High Risk"; break;
      case "medium": color = "bg-yellow-500"; text = "Medium Risk"; break;
      case "low": color = "bg-green-500"; text = "Low Risk"; break;
      default: color = "bg-gray-500"; text = "Risk Unknown";
    }
    
    return (
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full ${color} mr-2`}></div>
        <span className="font-medium">{text}</span>
      </div>
    );
  };

  const SafetyScore = ({ score }) => {
    const numericScore = parseInt(score) || 0;
    const percentage = (numericScore / 10) * 100;
    
    return (
      <div className="flex items-center">
        <div className="w-24 h-2 bg-gray-200 rounded-full mr-3">
          <div 
            className={`h-full rounded-full ${
              numericScore >= 7 ? "bg-green-500" : 
              numericScore >= 4 ? "bg-yellow-500" : "bg-red-500"
            }`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <span className="font-semibold">{numericScore}/10</span>
      </div>
    );
  };

  const safeData = tripData || {
    place: "—",
    area: "—",
    lat: "—",
    lng: "—",
    map_link: null,
    disasters: [],
    preventions: [],
    survival: [],
    things_to_carry: [],
    travel_tips: [],
    best_time_to_visit: "—",
    cultural_notes: [],
    emergency_contacts: {
      general: { police: "100", ambulance: "102", fire: "101" },
      local: { 
        local_police: "—", 
        hospitals: "—", 
        disaster_mgmt: "—",
        coast_guard: "—",
        mountain_rescue: "—"
      },
    },
    emergency_meeting_points: [],
    evacuation_routes: [],
    risk_level: "Unknown",
    weather_alerts: [],
    safety_score: "—",
  };

  return (
    <div className="p-4 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden" ref={pdfRef}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">🌍 Disaster Safety Trip Planner</h2>
              <p className="text-blue-100">Get personalized travel safety information with focus on disaster preparedness</p>
            </div>
            {tripData && (
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="bg-white text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 disabled:opacity-50 font-medium flex items-center"
              >
                {downloading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating PDF...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download PDF Guide
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Input Section */}
        <div className="p-6 border-b">
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Where are you planning to go? (e.g., 'I'm traveling to Ooty next month')"
              value={tripInput}
              onChange={(e) => setTripInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-grow p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Safety Guide...
                </span>
              ) : "Generate Safety Guide"}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-600 rounded-lg">
              ❌ Error: {error}
            </div>
          )}
        </div>

        {/* Results */}
        {tripData && (
          <div className="p-6">
            {/* Location Header */}
            <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">📍 {safeData.place}</h3>
                  <p className="text-gray-600 mb-3">{safeData.area}</p>
                </div>
                
                {safeData.map_link && (
                  <a
                    href={safeData.map_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center mt-3 md:mt-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293a1 1 0 00-1.414 0l-1 1a1 1 0 000 1.414l6 6a1 1 0 001.414 0l1-1a1 1 0 000-1.414l-6-6z" clipRule="evenodd" />
                    </svg>
                    Open in Google Maps
                  </a>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-white p-3 rounded-lg border flex flex-col justify-center">
                  <span className="font-semibold text-gray-600 mb-1">Coordinates:</span>
                  <span>{safeData.lat}, {safeData.lng}</span>
                </div>
                
                {safeData.best_time_to_visit && safeData.best_time_to_visit !== "—" && (
                  <div className="bg-white p-3 rounded-lg border flex flex-col justify-center">
                    <span className="font-semibold text-gray-600 mb-1">Safest Time to Visit:</span>
                    <span>{safeData.best_time_to_visit}</span>
                  </div>
                )}
                
                <div className="bg-white p-3 rounded-lg border flex flex-col justify-center">
                  <span className="font-semibold text-gray-600 mb-1">Risk Level:</span>
                  <RiskIndicator level={safeData.risk_level} />
                </div>
                
                {safeData.safety_score && safeData.safety_score !== "—" && (
                  <div className="bg-white p-3 rounded-lg border flex flex-col justify-center">
                    <span className="font-semibold text-gray-600 mb-1">Safety Score:</span>
                    <SafetyScore score={safeData.safety_score} />
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto mb-6 border-b">
              {[
                { id: "overview", label: "Overview", icon: "📋" },
                { id: "risks", label: "Risk Assessment", icon: "⚠️" },
                { id: "preparation", label: "Safety Prep", icon: "🎒" },
                { id: "emergency", label: "Emergency", icon: "🚨" },
                { id: "locations", label: "Safe Locations", icon: "📍" },
                { id: "weather", label: "Weather", icon: "🌤️" },
                { id: "services", label: "Emergency Services", icon: "🏥" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 font-medium flex items-center whitespace-nowrap ${activeTab === tab.id ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <InfoCard 
                    title="Safety Overview" 
                    icon="🛡️" 
                    items={safeData.travel_tips} 
                    className="md:col-span-2"
                  />
                  <InfoCard 
                    title="Safest Time to Visit" 
                    icon="📅" 
                    items={[safeData.best_time_to_visit]} 
                  />
                  <InfoCard 
                    title="Safety-Cultural Notes" 
                    icon="🎎" 
                    items={safeData.cultural_notes} 
                  />
                </div>
              )}

              {/* Risk Assessment Tab */}
              {activeTab === "risks" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <InfoCard 
                    title="Potential Hazards & Risks" 
                    icon="⚠️" 
                    items={safeData.disasters} 
                  />
                  <InfoCard 
                    title="Prevention Measures" 
                    icon="🛡️" 
                    items={safeData.preventions} 
                  />
                  <InfoCard 
                    title="Emergency Survival Procedures" 
                    icon="⛑️" 
                    items={safeData.survival} 
                    className="md:col-span-2"
                  />
                </div>
              )}

              {/* Preparation Tab */}
              {activeTab === "preparation" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <InfoCard 
                    title="Safety Equipment to Pack" 
                    icon="🎒" 
                    items={safeData.things_to_carry} 
                    className="md:col-span-2"
                  />
                  {safeData.travel_tips && safeData.travel_tips.length > 0 && (
                    <InfoCard 
                      title="Safety Tips" 
                      icon="💡" 
                      items={safeData.travel_tips} 
                      className="md:col-span-2"
                    />
                  )}
                </div>
              )}

              {/* Emergency Tab */}
              {activeTab === "emergency" && (
                <div className="bg-red-50 rounded-xl p-5 border border-red-200">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <span className="mr-2">🚨</span> Emergency Contacts & Procedures
                  </h3>
                  
                  <ContactSection title="General Emergency Numbers" contacts={safeData.emergency_contacts.general} />
                  <ContactSection title="Local Emergency Services" contacts={safeData.emergency_contacts.local} />
                  
                  {safeData.survival && safeData.survival.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-800 mb-3">Emergency Procedures</h4>
                      <InfoCard 
                        title="" 
                        icon="" 
                        items={safeData.survival} 
                        className="bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Safe Locations Tab */}
              {activeTab === "locations" && (
                <div className="grid md:grid-cols-2 gap-6">
                  {safeData.emergency_meeting_points && safeData.emergency_meeting_points.length > 0 && (
                    <InfoCard 
                      title="Designated Emergency Meeting Points" 
                      icon="📍" 
                      items={safeData.emergency_meeting_points} 
                      type="blocks"
                    />
                  )}
                  {safeData.evacuation_routes && safeData.evacuation_routes.length > 0 && (
                    <InfoCard 
                      title="Evacuation Routes" 
                      icon="🛣️" 
                      items={safeData.evacuation_routes} 
                      type="blocks"
                    />
                  )}
                  <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="mr-2">🗺️</span> Map Resources
                    </h3>
                    <p className="mb-3">Use these map resources to identify safe locations and emergency services:</p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={safeData.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293a1 1 0 00-1.414 0l-1 1a1 1 0 000 1.414l6 6a1 1 0 001.414 0l1-1a1 1 0 000-1.414l-6-6z" clipRule="evenodd" />
                        </svg>
                        View Area Map
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(safeData.place)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-green-600 px-4 py-2 rounded-lg border border-green-200 hover:bg-green-50 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293a1 1 0 00-1.414 0l-1 1a1 1 0 000 1.414l6 6a1 1 0 001.414 0l1-1a1 1 0 000-1.414l-6-6z" clipRule="evenodd" />
                        </svg>
                        OpenStreetMap
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Weather Tab */}
              {activeTab === "weather" && (
                <div className="grid md:grid-cols-2 gap-6">
                  {safeData.weather_alerts && safeData.weather_alerts.length > 0 && (
                    <InfoCard 
                      title="Weather Alerts & Warnings" 
                      icon="🌪️" 
                      items={safeData.weather_alerts} 
                      className="md:col-span-2"
                    />
                  )}
                  <div className="md:col-span-2 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="mr-2">📡</span> Weather Resources
                    </h3>
                    <p className="mb-3">Check these resources for up-to-date weather information:</p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`https://www.google.com/search?q=weather+${encodeURIComponent(safeData.place)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                        Check Weather Forecast
                      </a>
                      <a
                        href={`https://www.google.com/search?q=weather+warnings+${encodeURIComponent(safeData.place)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-red-600 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Check Weather Warnings
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Services Tab */}
              {activeTab === "services" && (
                <div className="grid md:grid-cols-2 gap-6">
                  {emergencyLocations ? (
                    <>
                      <EmergencyLocationCard 
                        title="Nearby Hospitals" 
                        icon="🏥" 
                        locations={emergencyLocations.hospitals} 
                        type="hospital"
                      />
                      <EmergencyLocationCard 
                        title="Nearby Police Stations" 
                        icon="👮" 
                        locations={emergencyLocations.police} 
                        type="police station"
                      />
                    </>
                  ) : (
                    <div className="md:col-span-2 flex justify-center items-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p>Loading emergency service locations...</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="mr-2">🗺️</span> Emergency Service Maps
                    </h3>
                    <p className="mb-3">Use these map resources to find emergency services:</p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={`https://www.openstreetmap.org/search?query=hospital%20${encodeURIComponent(safeData.place)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-red-600 px-4 py-2 rounded-lg border border-red-200 hover:bg-red-50 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 4a1 1 0 011-1h8a1 1 0 011 1v1.5a.5.5 0 01.5.5v1a.5.5 0 01-.5.5H15a1 1 0 00-1 1v1.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V8a1 1 0 00-1-1H9a1 1 0 00-1 1v1.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V8a1 1 0 00-1-1H5a1 1 0 00-1 1v6a1 1 0 001 1h10a1 1 0 001-1v-1.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5V15a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h1.5a.5.5 0 01.5.5V5a1 1 0 001 1h4a1 1 0 001-1v-.5a.5.5 0 01.5-.5H15a1 1 0 011 1v1a1 1 0 01-1 1h-1.5a.5.5 0 00-.5.5V7a1 1 0 01-1 1H9a1 1 0 01-1-1v-.5a.5.5 0 00-.5-.5H6a1 1 0 01-1-1V4z" clipRule="evenodd" />
                        </svg>
                        Find Hospitals on Map
                      </a>
                      <a
                        href={`https://www.openstreetmap.org/search?query=police%20${encodeURIComponent(safeData.place)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-blue-800 px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 font-medium flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        Find Police Stations on Map
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!tripData && !loading && (
          <div className="p-12 text-center text-gray-500">
            <div className="text-6xl mb-4">🛡️</div>
            <h3 className="text-xl font-medium mb-2">Your Safety Guide Awaits</h3>
            <p>Enter your destination to get personalized safety information with focus on disaster preparedness.</p>
          </div>
        )}
      </div>
    </div>
  );
}