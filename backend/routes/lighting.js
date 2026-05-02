const express = require("express");
const router = express.Router();
const { getSingleton, createDoc, updateDoc } = require("../firebase");

const lightingCol = "lighting";
const defaultLighting = {
  status: "All lights operational",
  faults: "No faults",
  activeLights: 42,
  totalLights: 42,
};

// GET lighting data
router.get("/", async (req, res) => {
  try {
    let light = await getSingleton(lightingCol);
    if (!light) {
      light = await createDoc(lightingCol, defaultLighting);
    }
    res.json(light);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update lighting
router.put("/", async (req, res) => {
  try {
    let light = await getSingleton(lightingCol);
    if (!light) light = await createDoc(lightingCol, defaultLighting);

    const { status, faults, activeLights, totalLights } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (faults !== undefined) updates.faults = faults;
    if (activeLights !== undefined) updates.activeLights = activeLights;
    if (totalLights !== undefined) updates.totalLights = totalLights;
    updates.updatedAt = new Date();

    const updated = await updateDoc(lightingCol, light.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
