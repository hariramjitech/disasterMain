const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // npm install node-fetch@2
const xml2js = require("xml2js");    // npm install xml2js

const CAP_FEED_URL =
  "https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml";

router.get("/cap-feed", async (req, res) => {
  try {
    console.log("🌐 Fetching CAP feed...");

    const response = await fetch(CAP_FEED_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": "application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlData = await response.text();

    // Parse XML → JSON
    const parser = new xml2js.Parser({ explicitArray: false });
    const jsonData = await parser.parseStringPromise(xmlData);

    return res.json(jsonData); // ✅ Return structured JSON
  } catch (err) {
    console.error("❌ CAP fetch failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch CAP feed" });
  }
});

module.exports = router;
