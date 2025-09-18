    const fetch = require("node-fetch");

// ✅ Fetch street & area from OpenStreetMap Nominatim API
async function getAddressFromCoordinates(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          // ✅ REQUIRED → Without this, OSM will block you
          "User-Agent": "DisasterManagementApp/1.0 (contact@yourdomain.com)",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OSM HTTP Error ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.address) {
      return { street: "Unknown Street", area: "Unknown Area" };
    }

    const address = data.address;

    // ✅ Street detection with fallback options
    const street =
      address.road ||
      address.residential ||
      address.street ||
      address.pedestrian ||
      address.path ||
      address.neighbourhood ||
      address.suburb ||
      address.highway ||
      "Unknown Street";

    // ✅ Area detection with fallback options
    const area =
      address.suburb ||
      address.village ||
      address.locality ||
      address.town ||
      address.city ||
      address.municipality ||
      address.district ||
      address.county ||
      address.state ||
      address.country ||
      "Unknown Area";

    return { street, area };
  } catch (error) {
    console.error("OSM Error:", error.message);
    return { street: "Unknown Street", area: "Unknown Area" };
  }
}

module.exports = getAddressFromCoordinates;
