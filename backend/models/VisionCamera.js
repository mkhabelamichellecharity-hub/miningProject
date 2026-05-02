const mongoose = require("mongoose");

const VisionCameraSchema = new mongoose.Schema(
  {
    // ── Basic Info ────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    cameraId: { type: String, required: true, unique: true, trim: true },
    location: { type: String, required: true, trim: true }, // e.g., "Main Entrance", "Zone A", "Equipment Area"
    
    // ── Status ────────────────────────────────────────────
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance", "offline"],
      default: "active",
    },
    isRecording: { type: Boolean, default: false },
    
    // ── Camera Specifications ─────────────────────────────
    resolution: { type: String, default: "1920x1080" }, // e.g., 4K, 1920x1080, etc.
    frameRate: { type: Number, default: 30 }, // fps
    nightVision: { type: Boolean, default: true },
    zoomCapability: { type: Number, default: 10 }, // optical zoom
    
    // ── Feed Information ──────────────────────────────────
    feedUrl: { type: String, default: null }, // RTSP or HTTP stream URL
    lastFrameCapture: { type: Date, default: null },
    frameInterval: { type: Number, default: 5000 }, // milliseconds
    
    // ── Network ───────────────────────────────────────────
    ipAddress: { type: String, trim: true },
    macAddress: { type: String, trim: true },
    signalStrength: { type: Number, min: 0, max: 100, default: 100 },
    connected: { type: Boolean, default: true },
    
    // ── Analytics ─────────────────────────────────────────
    motionDetection: { type: Boolean, default: true },
    alertOnMotion: { type: Boolean, default: true },
    faceRecognition: { type: Boolean, default: false },
    peopleCount: { type: Number, default: 0 },
    
    // ── Recording ─────────────────────────────────────────
    storageUsage: { type: Number, default: 0 }, // GB
    retentionDays: { type: Number, default: 30 },
    
    // ── Metadata ──────────────────────────────────────────
    notes: { type: String, default: "" },
    lastMaintenance: { type: Date, default: null },
    installDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VisionCamera", VisionCameraSchema);
