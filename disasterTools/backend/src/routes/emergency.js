const express = require("express");
const router = express.Router();
const Twilio = require("twilio");
const sanitizeForXml = require("../utils/sanitizeForXml");

const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

router.post("/emergency-call", async (req, res) => {
  const { to, disasterType, location, address, additionalInfo, mode } = req.body;

  // Validate required fields
  if (!to || !disasterType || !location?.lat || !location?.lng) {
    return res.status(400).json({ success: false, error: "Missing fields" });
  }

  const locationUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  try {
    if (mode === "call") {
      // Make Twilio call and say the address + info
      const safeMessage = sanitizeForXml(
        `🚨 Emergency Alert 🚨. Disaster: ${disasterType}. Location: ${address || "Address not available"}. Additional Info: ${additionalInfo || "None"}.`
      );

      const call = await client.calls.create({
        to,
        from: process.env.TWILIO_FROM,
        twiml: `<Response><Say voice="alice">${safeMessage}</Say></Response>`,
      });

      return res.json({ success: true, sid: call.sid });
    }

    if (mode === "sms") {
      // Send SMS with a Google Maps link instead of address
      const smsBody = `🚨 Emergency Alert 🚨\nDisaster: ${disasterType}\nLocation: ${locationUrl}\nAdditional Info: ${additionalInfo || "None"}`;

      const sms = await client.messages.create({
        to,
        from: process.env.TWILIO_FROM,
        body: smsBody,
      });

      return res.json({ success: true, sid: sms.sid });
    }

    res.status(400).json({ success: false, error: "Invalid mode" });
  } catch (err) {
    console.error("Twilio error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
