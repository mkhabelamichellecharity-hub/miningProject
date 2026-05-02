const mongoose = require("mongoose");

const LoRaNetworkSchema = new mongoose.Schema(
  {
    // ── Network Configuration ─────────────────────────────
    networkId: { type: String, required: true, unique: true, trim: true },
    networkName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "idle", "degraded", "offline"],
      default: "active",
    },

    // ── LoRa Parameters ───────────────────────────────────
    frequency: { type: Number, default: 915 }, // MHz (915 MHz ISM band)
    spreadingFactor: { type: Number, default: 7, min: 7, max: 12 }, // SF7-SF12
    bandwidth: { type: Number, default: 125 }, // kHz
    codingRate: { type: String, default: "4/5" }, // 4/5, 4/6, 4/7, 4/8
    txPower: { type: Number, default: 20, min: 2, max: 27 }, // dBm
    dataRate: { type: Number, default: 980 }, // bps (depends on SF)

    // ── Gateway Configuration ─────────────────────────────
    gateways: [
      {
        gatewayId: { type: String, required: true },
        name: { type: String, required: true },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        altitude: { type: Number, default: 0 },
        status: { type: String, enum: ["online", "offline", "low_signal"], default: "online" },
        signalStrength: { type: Number, min: -200, max: 0, default: -100 }, // dBm
        lastActivity: { type: Date, default: Date.now },
        uplinkCount: { type: Number, default: 0 },
        downlinkCount: { type: Number, default: 0 },
      },
    ],

    // ── Connected Devices ─────────────────────────────────
    devices: [
      {
        deviceId: { type: String, required: true },
        deviceType: { type: String, enum: ["helmet", "belt", "gateway", "repeater"], required: true },
        deviceName: { type: String, required: true },
        devEUI: { type: String, required: true }, // Device EUI for LoRaWAN
        appKey: { type: String, required: true }, // Application Key
        status: { type: String, enum: ["active", "inactive", "lost"], default: "active" },
        signalStrength: { type: Number, min: -200, max: 0, default: -100 }, // RSSI
        snr: { type: Number, default: 0 }, // Signal-to-Noise Ratio (dB)
        lastContact: { type: Date, default: Date.now },
        battery: { type: Number, min: 0, max: 100, default: 100 }, // %
        messagesReceived: { type: Number, default: 0 },
        messagesSent: { type: Number, default: 0 },
        messagesFailed: { type: Number, default: 0 },
      },
    ],

    // ── Network Statistics ────────────────────────────────
    statistics: {
      totalDevices: { type: Number, default: 0 },
      activeDevices: { type: Number, default: 0 },
      packetLossRate: { type: Number, default: 0 }, // %
      averageRSSI: { type: Number, default: -100 }, // dBm
      averageSNR: { type: Number, default: 0 }, // dB
      totalPacketsSent: { type: Number, default: 0 },
      totalPacketsReceived: { type: Number, default: 0 },
      networkCapacity: { type: Number, default: 100 }, // % usage
      lastStatUpdate: { type: Date, default: Date.now },
    },

    // ── Message Queue ─────────────────────────────────────
    pendingMessages: [
      {
        messageId: { type: String, required: true },
        fromDeviceId: String,
        toDeviceId: String,
        payload: String,
        priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal" },
        createdAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["pending", "sent", "delivered", "failed"], default: "pending" },
        retries: { type: Number, default: 0 },
        maxRetries: { type: Number, default: 3 },
      },
    ],

    // ── Message History ──────────────────────────────────
    messageHistory: [
      {
        messageId: String,
        timestamp: { type: Date, default: Date.now },
        fromDeviceId: String,
        toDeviceId: String,
        type: String, // "alert", "data", "heartbeat", "command"
        rssi: Number,
        snr: Number,
        status: String,
      },
    ],

    // ── Network Health ───────────────────────────────────
    health: {
      uptime: { type: Number, default: 0 }, // seconds
      lastErrorTime: { type: Date, default: null },
      lastErrorMessage: { type: String, default: "" },
      recoveryAttempts: { type: Number, default: 0 },
      healthCheckInterval: { type: Number, default: 60 }, // seconds
    },

    // ── Metadata ──────────────────────────────────────────
    region: { type: String, default: "US915" }, // LoRaWAN region
    mode: { type: String, enum: ["lora", "lorawan", "mesh"], default: "lorawan" },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for fast queries
LoRaNetworkSchema.index({ networkId: 1, status: 1 });
LoRaNetworkSchema.index({ "devices.deviceId": 1 });
LoRaNetworkSchema.index({ "gateways.gatewayId": 1 });

module.exports = mongoose.model("LoRaNetwork", LoRaNetworkSchema);
