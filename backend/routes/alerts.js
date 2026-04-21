const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");

// GET all alerts
router.get("/", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(100);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create alert
router.post("/", async (req, res) => {
  try {
    const { type, severity, message } = req.body;
    if (!type || !severity || !message)
      return res
        .status(400)
        .json({ error: "type, severity, and message are required" });

    const alert = new Alert({ type, severity, message });
    await alert.save();
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT resolve alert
router.put("/:id/resolve", async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE alert
router.delete("/:id", async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ error: "Alert not found" });
    res.json({ success: true, message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all resolved alerts
router.delete("/clear/resolved", async (req, res) => {
  try {
    const result = await Alert.deleteMany({ resolved: true });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
