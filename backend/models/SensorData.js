const mongoose = require("mongoose");

const SensorDataSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    index: true
  },
  sensorType: {
    type: String,
    required: true,
    enum: ["belt", "helmet", "alcohol", "bloodflow", "drugtest"]
  },
  data: {
    // Flexible data object for different sensor types
    location: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    },
    rfid: String,
    frequency: Number, // For helmet high frequency sensor
    alcoholLevel: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    bloodFlow: Number,
    drugTestResult: {
      type: String,
      enum: ["positive", "negative", "pending"]
    },
    batteryLevel: Number,
    signalStrength: Number,
    rawData: mongoose.Schema.Types.Mixed // For any additional sensor data
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  deviceId: String, // Unique identifier for the sensor device
  status: {
    type: String,
    enum: ["active", "inactive", "error"],
    default: "active"
  }
}, {
  timestamps: true
});

// Index for efficient queries
SensorDataSchema.index({ workerId: 1, sensorType: 1, timestamp: -1 });

module.exports = mongoose.model("SensorData", SensorDataSchema);