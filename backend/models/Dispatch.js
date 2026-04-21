const mongoose = require("mongoose");

const DispatchSchema = new mongoose.Schema(
  {
    trucksEnRoute: { type: Number, default: 3 },
    avgCycleTime: { type: Number, default: 18 },
    activeDrivers: { type: Number, default: 5 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Dispatch", DispatchSchema);
