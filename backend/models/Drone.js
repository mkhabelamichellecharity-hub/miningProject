const mongoose = require("mongoose");

const WaypointSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  label: { type: String, default: "" },
  scanned: { type: Boolean, default: false },
  scannedAt: { type: Date, default: null },
}, { _id: true });

const MapTileSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  type: { type: String, enum: ["clear", "obstacle", "hazard", "point-of-interest"], default: "clear" },
  label: { type: String, default: "" },
  discoveredAt: { type: Date, default: Date.now },
}, { _id: true });

const DroneSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, default: "Drone-1" },
  serialNumber: { type: String, required: true, unique: true, trim: true },

  // ── Status ────────────────────────────────────────────
  status: {
    type: String,
    enum: ["idle", "flying", "returning", "charging", "maintenance", "offline"],
    default: "idle",
  },
  cameraActive: { type: Boolean, default: false },
  mappingActive: { type: Boolean, default: false },

  // ── Telemetry ─────────────────────────────────────────
  telemetry: {
    batteryLevel:  { type: Number, min: 0, max: 100, default: 100 },
    altitude:      { type: Number, default: 0 },       // metres
    speed:         { type: Number, default: 0 },        // km/h
    heading:       { type: Number, default: 0 },        // degrees 0-360
    signalStrength:{ type: Number, min: 0, max: 100, default: 100 },
    temperature:   { type: Number, default: 22 },       // °C
    posX:          { type: Number, default: 50 },       // grid position 0-100
    posY:          { type: Number, default: 50 },
  },

  // ── Mission ───────────────────────────────────────────
  missionName:    { type: String, default: null },
  missionArea:    { type: String, default: "Zone A" },
  waypoints:      { type: [WaypointSchema], default: [] },
  currentWaypoint:{ type: Number, default: 0 },

  // ── Map data ──────────────────────────────────────────
  mapTiles:       { type: [MapTileSchema], default: [] },
  mapCoverage:    { type: Number, min: 0, max: 100, default: 0 }, // %

  // ── Flight log ────────────────────────────────────────
  totalFlightTime:{ type: Number, default: 0 },   // minutes
  totalDistance:  { type: Number, default: 0 },   // km
  launchedAt:     { type: Date, default: null },
  landedAt:       { type: Date, default: null },

  notes: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Drone", DroneSchema);
