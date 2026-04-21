const mongoose = require("mongoose");

const LightingSchema = new mongoose.Schema(
  {
    status: { type: String, default: "All lights operational" },
    faults: { type: String, default: "No faults" },
    activeLights: { type: Number, default: 42 },
    totalLights: { type: Number, default: 42 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Lighting", LightingSchema);
