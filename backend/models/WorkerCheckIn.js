const mongoose = require("mongoose");

const WorkerCheckInSchema = new mongoose.Schema({
  name: String,
  badgeNumber: String,
  fingerprint: String, // Added fingerprint field
  location: String,

  helmet: {
    id: String,
    battery: Number,
    highFrequencySensor: {
      enabled: { type: Boolean, default: true },
      frequency: { type: Number, default: 0 }, // MHz
      status: { type: String, enum: ["active", "inactive", "error"], default: "active" },
    },
  },

  belt: {
    id: String,
    battery: Number,
    gasLevel: Number,
    heartRate: Number,
    rfidReader: {
      enabled: { type: Boolean, default: true },
      lastScan: { type: Date, default: null },
      status: { type: String, enum: ["active", "inactive", "error"], default: "active" },
    },
    liveTracker: {
      enabled: { type: Boolean, default: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null }, // meters
      lastUpdate: { type: Date, default: Date.now },
      status: { type: String, enum: ["active", "inactive", "error"], default: "active" },
    },
  },

  checkInTime: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("WorkerCheckIn", WorkerCheckInSchema);
