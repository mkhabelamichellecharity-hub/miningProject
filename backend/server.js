const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");

// Load env vars explicitly from the backend folder before any database modules
dotenv.config({ path: path.resolve(__dirname, ".env") });

const connectDB = require("./config/db");

// Initialize Firebase / Firestore
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/workers", require("./routes/workers"));
app.use("/api/tools", require("./routes/tools"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/material", require("./routes/material"));
app.use("/api/dispatch", require("./routes/dispatch"));
app.use("/api/geotechnical", require("./routes/geotechnical"));
app.use("/api/lighting", require("./routes/lighting"));
app.use("/api/vitals", require("./routes/vitals"));
app.use("/api/alcohol", require("./routes/alcohol"));
app.use("/api/bloodflow", require("./routes/bloodflow"));
app.use("/api/drugtests", require("./routes/drugtests"));
app.use("/api/drones", require("./routes/drone"));
app.use("/api/visioncamera", require("./routes/visioncamera"));
app.use("/api/integratedtracking", require("./routes/integratedtracking"));
app.use("/api/sensors", require("./routes/sensors"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Mining Tracking API is running ✅", timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal Server Error", detail: err.message });
});

const checkinRoutes = require("./routes/checkinRoutes");
app.use("/api/checkin", checkinRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       ⛏️  MINING TRACKING SYSTEM              ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  ✅  Server     → http://localhost:${PORT}        ║`);
  console.log("║  ✅  Status     → Running                    ║");
  console.log("║  ✅  Database   → Firebase Realtime DB      ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║  📡  API Routes available:                   ║");
  console.log("║      GET  /api/workers                       ║");
  console.log("║      GET  /api/tools                         ║");
  console.log("║      GET  /api/alerts                        ║");
  console.log("║      GET  /api/material                      ║");
  console.log("║      GET  /api/dispatch                      ║");
  console.log("║      GET  /api/geotechnical                  ║");
  console.log("║      GET  /api/lighting                      ║");
  console.log("║      GET  /api/vitals                        ║");
  console.log("║      GET  /api/drones                        ║");
  console.log("║      GET  /api/sensors                       ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  🕒  Started    → ${new Date().toLocaleTimeString()}                   ║`);
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
});
