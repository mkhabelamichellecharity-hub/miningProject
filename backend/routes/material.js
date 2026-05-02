const express = require("express");
const router = express.Router();
const { getSingleton, createDoc, updateDoc } = require("../firebase");

const materialCol = "materialHandling";
const defaultMaterial = {
  conveyor1: "Running",
  conveyor2: "Running",
  stockpileA: 45,
  stockpileB: 30,
};

// GET material handling data
router.get("/", async (req, res) => {
  try {
    let mat = await getSingleton(materialCol);
    if (!mat) {
      mat = await createDoc(materialCol, defaultMaterial);
    }
    res.json(mat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update material handling
router.put("/", async (req, res) => {
  try {
    let mat = await getSingleton(materialCol);
    if (!mat) mat = await createDoc(materialCol, defaultMaterial);

    const { conveyor1, conveyor2, stockpileA, stockpileB } = req.body;
    const updates = {};
    if (conveyor1 !== undefined) updates.conveyor1 = conveyor1;
    if (conveyor2 !== undefined) updates.conveyor2 = conveyor2;
    if (stockpileA !== undefined) updates.stockpileA = stockpileA;
    if (stockpileB !== undefined) updates.stockpileB = stockpileB;
    updates.updatedAt = new Date();

    const updated = await updateDoc(materialCol, mat.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
