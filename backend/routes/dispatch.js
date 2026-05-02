const express = require("express");
const router = express.Router();
const { getSingleton, createDoc, updateDoc } = require("../firebase");

const dispatchCol = "dispatch";
const defaultDispatch = {
  trucksEnRoute: 3,
  avgCycleTime: 18,
  activeDrivers: 5,
};

// GET dispatch data
router.get("/", async (req, res) => {
  try {
    let d = await getSingleton(dispatchCol);
    if (!d) {
      d = await createDoc(dispatchCol, defaultDispatch);
    }
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update dispatch
router.put("/", async (req, res) => {
  try {
    let d = await getSingleton(dispatchCol);
    if (!d) d = await createDoc(dispatchCol, defaultDispatch);

    const { trucksEnRoute, avgCycleTime, activeDrivers } = req.body;
    const updates = {};
    if (trucksEnRoute !== undefined) updates.trucksEnRoute = trucksEnRoute;
    if (avgCycleTime !== undefined) updates.avgCycleTime = avgCycleTime;
    if (activeDrivers !== undefined) updates.activeDrivers = activeDrivers;
    updates.updatedAt = new Date();

    const updated = await updateDoc(dispatchCol, d.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
