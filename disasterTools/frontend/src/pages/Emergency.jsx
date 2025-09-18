import React, { useReducer, useCallback, useEffect } from "react";

const initialState = {
  disasterType: "",
  additionalInfo: "",
  location: { lat: null, lng: null },
  address: "",
  status: "",
  loading: false, // <-- add this
};

const reducer = (state, action) => {
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
    case "SET_LOADING": // <-- add this
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

const EmergencyCall = React.memo(() => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { disasterType, additionalInfo, location, address, status, loading } = state;

  // Reverse geocoding to get address
  const getAddressFromCoords = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data?.display_name) {
        dispatch({ type: "SET_ADDRESS", payload: data.display_name });
      } else {
        dispatch({ type: "SET_ADDRESS", payload: "Address not found" });
      }
    } catch (error) {
      dispatch({ type: "SET_ADDRESS", payload: "Failed to fetch address" });
    }
  }, []);

  // Auto-fetch location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          dispatch({ type: "SET_LOCATION", payload: coords });

          // Fetch address after getting location
          getAddressFromCoords(coords.lat, coords.lng);
        },
        () => dispatch({ type: "SET_STATUS", payload: "❌ Unable to retrieve location" })
      );
    } else {
      dispatch({ type: "SET_STATUS", payload: "❌ Geolocation not supported" });
    }
  }, [getAddressFromCoords]);

  // Handle input changes
  const handleInputChange = useCallback((type, value) => {
    dispatch({ type, payload: value });
  }, []);

  // Send emergency alert to backend
  const sendEmergencyAlert = useCallback(
    async (mode) => {
      if (!disasterType) {
        dispatch({ type: "SET_STATUS", payload: "❌ Please select a disaster type" });
        return;
      }
      if (!location.lat) {
        dispatch({ type: "SET_STATUS", payload: "❌ Location required. Please allow location access" });
        return;
      }

      dispatch({ type: "SET_STATUS", payload: "🚨 Sending alert..." });
      dispatch({ type: "SET_LOADING", payload: true }); // <-- add this
      try {
        const response = await fetch("http://172.20.50.176:5001/api/emergency-call", {
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
      } catch (err) {
        dispatch({ type: "SET_STATUS", payload: `❌ Failed: ${err.message}` });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false }); // <-- add this
      }
    },
    [disasterType, location, address, additionalInfo]
  );

  const isFormValid = disasterType && location.lat;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 justify-center items-center">
      <div className="bg-white shadow-lg rounded-xl p-5 w-full max-w-md border">
        <h2 className="text-xl font-bold text-blue-700 mb-4 text-center">🚨 Emergency Call</h2>

        {location.lat ? (
          <>
            <p className="text-sm text-gray-700 mb-1 text-center">
              Lat: {location.lat.toFixed(4)} | Lng: {location.lng.toFixed(4)}
            </p>
            <p className="text-xs text-gray-500 mb-3 text-center">
              📍 {address || "Fetching address..."}
            </p>
          </>
        ) : (
          <p className="text-sm text-red-600 mb-3 text-center">Waiting for location...</p>
        )}

        <select
          value={disasterType}
          onChange={(e) => handleInputChange("SET_DISASTER_TYPE", e.target.value)}
          className="mb-3 p-2 border rounded-lg w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">Select Disaster</option>
          <option value="Flood">🌊 Flood</option>
          <option value="Earthquake">🌍 Earthquake</option>
          <option value="Fire">🔥 Fire</option>
          <option value="Cyclone">🌪️ Cyclone</option>
          <option value="Other">⚠️ Other</option>
        </select>

        <textarea
          placeholder="Additional info..."
          value={additionalInfo}
          onChange={(e) => handleInputChange("SET_ADDITIONAL_INFO", e.target.value)}
          className="mb-3 p-2 border rounded-lg w-full focus:ring-1 focus:ring-blue-500 focus:outline-none"
          rows={2}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => sendEmergencyAlert("call")}
            className={`flex-1 py-2 rounded-lg text-white shadow ${
              isFormValid ? "bg-red-500 hover:bg-red-600" : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!isFormValid || loading} // <-- add loading state
          >
            {loading ? "📞 Calling..." : "📞 Call"}
          </button>
          <button
            onClick={() => sendEmergencyAlert("sms")}
            className={`flex-1 py-2 rounded-lg text-white shadow ${
              isFormValid ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 cursor-not-allowed"
            }`}
            disabled={!isFormValid || loading} // <-- add loading state
          >
            {loading ? "📩 Sending SMS..." : "📩 SMS"}
          </button>
        </div>

        {status && (
          <p
            className={`mt-3 text-center text-sm font-medium ${
              status.startsWith("✅")
                ? "text-green-600"
                : status.startsWith("🚨")
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
});

export default EmergencyCall;
