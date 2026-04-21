const mongoose = require("mongoose");

const MaterialHandlingSchema = new mongoose.Schema(
  {
    conveyor1: {
      type: String,
      enum: ["Running", "Stopped", "Maintenance", "Fault"],
      default: "Running",
    },
    conveyor2: {
      type: String,
      enum: ["Running", "Stopped", "Maintenance", "Fault"],
      default: "Running",
    },
    stockpileA: { type: Number, min: 0, max: 100, default: 45 },
    stockpileB: { type: Number, min: 0, max: 100, default: 30 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("MaterialHandling", MaterialHandlingSchema);
