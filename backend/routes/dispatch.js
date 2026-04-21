const express = require("express");
const router = express.Router();
const Dispatch = require("../models/Dispatch");

// GET dispatch data
router.get("/", async (req, res) => {
  try {
    let d = await Dispatch.findOne();
    if (!d) {
      d = new Dispatch();
      await d.save();
    }
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update dispatch
router.put("/", async (req, res) => {
  try {
    let d = await Dispatch.findOne();
    if (!d) d = new Dispatch();

    const { trucksEnRoute, avgCycleTime, activeDrivers } = req.body;
    if (trucksEnRoute !== undefined) d.trucksEnRoute = trucksEnRoute;
    if (avgCycleTime !== undefined) d.avgCycleTime = avgCycleTime;
    if (activeDrivers !== undefined) d.activeDrivers = activeDrivers;
    d.updatedAt = new Date();

    await d.save();
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
