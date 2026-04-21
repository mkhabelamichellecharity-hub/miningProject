const mongoose = require("mongoose");

const WorkerCheckInSchema = new mongoose.Schema({
  name: String,
  badgeNumber: String,
  location: String,

  helmet: {
    id: String,
    battery: Number,
  },

  belt: {
    id: String,
    battery: Number,
    gasLevel: Number,
    heartRate: Number,
  },

  checkInTime: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("WorkerCheckIn", WorkerCheckInSchema);
