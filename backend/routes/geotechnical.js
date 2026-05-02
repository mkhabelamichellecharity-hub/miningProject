const express = require("express");
const router = express.Router();
const { getSingleton, createDoc, updateDoc } = require("../firebase");

const geotechnicalCol = "geotechnical";
const defaultGeotechnical = {
  stability: 95,
  lastSeismicEvent: "None",
  riskLevel: "Low",
};

// GET geotechnical data
router.get("/", async (req, res) => {
  try {
    let geo = await getSingleton(geotechnicalCol);
    if (!geo) {
      geo = await createDoc(geotechnicalCol, defaultGeotechnical);
    }
    res.json(geo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update geotechnical
router.put("/", async (req, res) => {
  try {
    let geo = await getSingleton(geotechnicalCol);
    if (!geo) geo = await createDoc(geotechnicalCol, defaultGeotechnical);

    const { stability, lastSeismicEvent, riskLevel } = req.body;
    const updates = {};
    if (stability !== undefined) updates.stability = stability;
    if (lastSeismicEvent !== undefined) updates.lastSeismicEvent = lastSeismicEvent;
    if (riskLevel !== undefined) updates.riskLevel = riskLevel;
    updates.updatedAt = new Date();

    const updated = await updateDoc(geotechnicalCol, geo.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
