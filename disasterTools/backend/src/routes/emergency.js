const express = require("express");
const router = express.Router();
const Twilio = require("twilio");
const sanitizeForXml = require("../utils/sanitizeForXml");

// Initialize Twilio client once
const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

router.post("/emergency-call", async (req, res) => {
  const { to, disasterType, location, address, additionalInfo, mode } = req.body;

  // Basic validation
  if (!to || !disasterType || !location?.lat || !location?.lng) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const locationUrl = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  try {
    if (mode === "call") {
      // Prepare safe message for TTS
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
      // Prepare SMS body with Google Maps link
      const smsBody = `🚨 Emergency Alert 🚨\nDisaster: ${disasterType}\nLocation: ${locationUrl}\nAdditional Info: ${additionalInfo || "None"}`;

      console.log(`Sending SMS to ${to} from ${process.env.TWILIO_FROM} with body:\n${smsBody}`);

      const sms = await client.messages.create({
        to,
        from: process.env.TWILIO_FROM,
        body: smsBody,
      });

      return res.json({ success: true, sid: sms.sid });
    }

    return res.status(400).json({ success: false, error: "Invalid mode, must be 'call' or 'sms'" });
  } catch (err) {
    console.error("Twilio error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
