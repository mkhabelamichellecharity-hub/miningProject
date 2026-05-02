const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    workerId: { type: String, required: true, unique: true, trim: true },
    fingerprint: { type: String, required: true, trim: true }, // Added fingerprint field
    status: {
      type: String,
      enum: ["checked-in", "checked-out"],
      default: "checked-out",
    },
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    assignedTools: { type: [String], default: [] },
    location: { type: String, default: "Surface" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Worker", WorkerSchema);
