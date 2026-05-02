const mongoose = require("mongoose");

const BloodFlowReadingSchema = new mongoose.Schema(
  {
    workerId:   { type: String, required: true, trim: true },
    workerName: { type: String, required: true, trim: true },
    checkType: {
      type: String,
      enum: ["check-in", "check-out"],
      required: true,
    },

    // ── Blood pressure and flow ──────────────────────────────────────
    bloodPressure: {
      systolic:  { type: Number, default: null },
      diastolic: { type: Number, default: null },
      status:    { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
    },
    bloodFlow: {
      value:     { type: Number, default: null }, // e.g., ml/min
      status:    { type: String, enum: ["normal", "warning", "critical"], default: "normal" },
    },

    // ── Decision ─────────────────────────────────────────
    overallStatus:  { type: String, enum: ["fit", "caution", "unfit"], default: "fit" },
    clearedForWork: { type: Boolean, default: true },
    blockReason:    { type: String, default: null },

    // ── Supervisor notification ───────────────────────────
    supervisorNotified: { type: Boolean, default: false },
    supervisorName:     { type: String, default: null },
    notes:              { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BloodFlowReading", BloodFlowReadingSchema);