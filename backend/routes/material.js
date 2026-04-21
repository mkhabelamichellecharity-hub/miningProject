const express = require("express");
const router = express.Router();
const MaterialHandling = require("../models/MaterialHandling");

// GET material handling data
router.get("/", async (req, res) => {
  try {
    let mat = await MaterialHandling.findOne();
    if (!mat) {
      mat = new MaterialHandling();
      await mat.save();
    }
    res.json(mat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update material handling
router.put("/", async (req, res) => {
  try {
    let mat = await MaterialHandling.findOne();
    if (!mat) mat = new MaterialHandling();

    const { conveyor1, conveyor2, stockpileA, stockpileB } = req.body;
    if (conveyor1 !== undefined) mat.conveyor1 = conveyor1;
    if (conveyor2 !== undefined) mat.conveyor2 = conveyor2;
    if (stockpileA !== undefined) mat.stockpileA = stockpileA;
    if (stockpileB !== undefined) mat.stockpileB = stockpileB;
    mat.updatedAt = new Date();

    await mat.save();
    res.json(mat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
