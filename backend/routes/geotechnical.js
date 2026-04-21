const express = require("express");
const router = express.Router();
const Geotechnical = require("../models/Geotechnical");

// GET geotechnical data
router.get("/", async (req, res) => {
  try {
    let geo = await Geotechnical.findOne();
    if (!geo) {
      geo = new Geotechnical();
      await geo.save();
    }
    res.json(geo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update geotechnical
router.put("/", async (req, res) => {
  try {
    let geo = await Geotechnical.findOne();
    if (!geo) geo = new Geotechnical();

    const { stability, lastSeismicEvent, riskLevel } = req.body;
    if (stability !== undefined) geo.stability = stability;
    if (lastSeismicEvent !== undefined) geo.lastSeismicEvent = lastSeismicEvent;
    if (riskLevel !== undefined) geo.riskLevel = riskLevel;
    geo.updatedAt = new Date();

    await geo.save();
    res.json(geo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
