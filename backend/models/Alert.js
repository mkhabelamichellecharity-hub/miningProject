const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", AlertSchema);
