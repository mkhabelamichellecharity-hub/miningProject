const mongoose = require("mongoose");

const GeotechnicalSchema = new mongoose.Schema(
  {
    stability: { type: Number, default: 95 },
    lastSeismicEvent: { type: String, default: "None" },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports = mongoose.model("Geotechnical", GeotechnicalSchema);
