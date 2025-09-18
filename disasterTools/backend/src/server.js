const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const emergencyRoutes = require("./routes/emergency");
const capRoutes = require("./routes/cap");

app.use("/api", emergencyRoutes);
app.use("/api/cap", capRoutes);
// Default route
app.get("/", (req, res) => {
  res.send("✅ Disaster management backend is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
  