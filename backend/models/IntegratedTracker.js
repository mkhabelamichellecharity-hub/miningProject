const mongoose = require("mongoose");

const IntegratedTrackerSchema = new mongoose.Schema(
  {
    // ── Worker Info ───────────────────────────────────────
    workerId: { type: String, required: true },
    workerName: { type: String, required: true },
    
    // ── Helmet Sensor Data ────────────────────────────────
    helmet: {
      deviceId: { type: String, required: true },
      highFrequencyData: {
        frequency: { type: Number, default: 2400 }, // MHz (2.4 GHz)
        enabled: { type: Boolean, default: true },
        signalStrength: { type: Number, min: 0, max: 100, default: 100 }, // %
        dataRate: { type: Number, default: 50 }, // Hz (measurements per second)
        lastReading: { type: Date, default: Date.now },
        sensorType: { type: String, default: "IMU+Proximity" }, // Type of high-freq sensor
      },
      battery: { type: Number, min: 0, max: 100, default: 100 },
      temperature: { type: Number, default: 22 }, // °C
      status: { type: String, enum: ["active", "inactive", "error", "low_battery"], default: "active" },
    },

    // ── Belt Tracker Data ─────────────────────────────────
    belt: {
      deviceId: { type: String, required: true },
      rfidReader: {
        enabled: { type: Boolean, default: true },
        lastScan: { type: Date, default: null },
        lastScannedTag: { type: String, default: null },
        status: { type: String, enum: ["active", "inactive", "error"], default: "active" },
      },
      liveTracker: {
        enabled: { type: Boolean, default: true },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        altitude: { type: Number, default: null },
        accuracy: { type: Number, default: null }, // meters
        speed: { type: Number, default: 0 }, // m/s
        heading: { type: Number, default: 0 }, // degrees (0-360)
        updateFrequency: { type: Number, default: 10 }, // Hz
        lastUpdate: { type: Date, default: Date.now },
        status: { type: String, enum: ["active", "inactive", "error", "gps_lost"], default: "active" },
      },
      battery: { type: Number, min: 0, max: 100, default: 100 },
      status: { type: String, enum: ["active", "inactive", "error", "low_battery"], default: "active" },
    },

    // ── Synchronized Tracking ─────────────────────────────
    integratedTracking: {
      syncStatus: { type: String, enum: ["synchronized", "out_of_sync", "searching"], default: "synchronized" },
      lastSyncTime: { type: Date, default: Date.now },
      syncFrequency: { type: Number, default: 100 }, // Hz
      helmetBeltDistance: { type: Number, default: 0 }, // cm (proximity detection)
      combinedSignalStrength: { type: Number, min: 0, max: 100, default: 100 },
      trackingMode: { type: String, enum: ["gps+imu", "imu+proximity", "dead_reckoning"], default: "gps+imu" },
    },

    // ── Location Tracking History ─────────────────────────
    trackingHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        helmetLocation: { latitude: Number, longitude: Number },
        beltLocation: { latitude: Number, longitude: Number },
        distance: Number, // meters between helmet and belt
        speed: Number,
        heading: Number,
      },
    ],

    // ── Safety & Alerts ───────────────────────────────────
    alerts: [
      {
        timestamp: { type: Date, default: Date.now },
        type: { type: String, enum: ["separation", "low_battery", "signal_loss", "gps_lost", "sensor_error"] },
        severity: { type: String, enum: ["critical", "warning", "info"], default: "warning" },
        message: String,
        resolved: { type: Boolean, default: false },
        resolvedAt: { type: Date, default: null },
      },
    ],

    // ── Metadata ──────────────────────────────────────────
    zone: { type: String, default: "Surface" },
    checkInTime: { type: Date, default: Date.now },
    lastActivityTime: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for fast queries
IntegratedTrackerSchema.index({ workerId: 1, isActive: 1 });
IntegratedTrackerSchema.index({ "integratedTracking.lastSyncTime": -1 });

module.exports = mongoose.model("IntegratedTracker", IntegratedTrackerSchema);
