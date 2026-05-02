const mongoose = require("mongoose");

const DrugTestSelectionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    selectedWorkers: [{
      workerId:   { type: String, required: true },
      workerName: { type: String, required: true },
      selectedAt: { type: Date, default: Date.now },
      tested:     { type: Boolean, default: false },
      result:     { type: String, enum: ["pending", "negative", "positive", "not-tested"], default: "pending" },
    }],
    selectionCriteria: {
      percentage: { type: Number, default: 20 }, // % of workers to test
      method:     { type: String, enum: ["random", "scheduled"], default: "random" },
    },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DrugTestSelection", DrugTestSelectionSchema);