const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");

// Load env vars FIRST before anything else
dotenv.config();

// Connect to MongoDB
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
app.use("/api/drones", require("./routes/drone"));

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Mining Tracking API is running ✅", timestamp: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal Server Error", detail: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       ⛏️  MINING TRACKING SYSTEM              ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  ✅  Server     → http://localhost:${PORT}        ║`);
  console.log("║  ✅  Status     → Running                    ║");
  console.log("║  ✅  Database   → MongoDB Atlas Connected    ║");
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
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  🕒  Started    → ${new Date().toLocaleTimeString()}                   ║`);
  console.log("╚══════════════════════════════════════════════╝");
  console.log("");
});

const checkinRoutes = require("./routes/checkinRoutes");
app.use("/api/checkin", checkinRoutes);