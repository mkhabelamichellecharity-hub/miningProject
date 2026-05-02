const mongoose = require("mongoose");

const AlcoholReadingSchema = new mongoose.Schema(
  {
    workerId:   { type: String, required: true, trim: true },
    workerName: { type: String, required: true, trim: true },
    checkType: {
      type: String,
      enum: ["check-in", "check-out"],
      required: true,
    },

    // ── Alcohol test ──────────────────────────────────────
    alcoholTest: {
      value:      { type: Number, default: null },
      status:     { type: String, enum: ["pass", "warning", "fail", "not-tested"], default: "not-tested" },
      testMethod: { type: String, enum: ["breathalyser", "blood", "not-tested"], default: "not-tested" },
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

module.exports = mongoose.model("AlcoholReading", AlcoholReadingSchema);