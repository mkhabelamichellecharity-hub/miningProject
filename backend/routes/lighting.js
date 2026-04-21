const express = require("express");
const router = express.Router();
const Lighting = require("../models/Lighting");

// GET lighting data
router.get("/", async (req, res) => {
  try {
    let light = await Lighting.findOne();
    if (!light) {
      light = new Lighting();
      await light.save();
    }
    res.json(light);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update lighting
router.put("/", async (req, res) => {
  try {
    let light = await Lighting.findOne();
    if (!light) light = new Lighting();

    const { status, faults, activeLights, totalLights } = req.body;
    if (status !== undefined) light.status = status;
    if (faults !== undefined) light.faults = faults;
    if (activeLights !== undefined) light.activeLights = activeLights;
    if (totalLights !== undefined) light.totalLights = totalLights;
    light.updatedAt = new Date();

    await light.save();
    res.json(light);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
