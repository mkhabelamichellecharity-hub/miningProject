const mongoose = require("mongoose");

const ToolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["drill", "detector", "sensor", "helmet", "other"],
      required: true,
    },
    rfidTag: { type: String, unique: true, sparse: true, trim: true },
    status: {
      type: String,
      enum: ["available", "assigned", "maintenance", "lost"],
      default: "available",
    },
    currentWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      default: null,
    },
    lastChecked: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tool", ToolSchema);
