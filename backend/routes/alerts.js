const express = require("express");
const router = express.Router();
const {
  getAll,
  createDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  deleteQuery,
} = require("../firebase");

const alertsCol = "alerts";

// GET all alerts
router.get("/", async (req, res) => {
  try {
    const alerts = await getAll(alertsCol, {
      orderBy: "createdAt",
      direction: "desc",
      limit: 100,
    });
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

    const alert = await createDoc(alertsCol, { type, severity, message });
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT resolve alert
router.put("/:id/resolve", async (req, res) => {
  try {
    const existing = await getDoc(alertsCol, req.params.id);
    if (!existing) return res.status(404).json({ error: "Alert not found" });

    const alert = await updateDoc(alertsCol, req.params.id, {
      resolved: true,
      resolvedAt: new Date(),
    });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE alert
router.delete("/:id", async (req, res) => {
  try {
    const existing = await getDoc(alertsCol, req.params.id);
    if (!existing) return res.status(404).json({ error: "Alert not found" });

    await deleteDoc(alertsCol, req.params.id);
    res.json({ success: true, message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all resolved alerts
router.delete("/clear/resolved", async (req, res) => {
  try {
    const deletedCount = await deleteQuery(alertsCol, "resolved", "==", true);
    res.json({ success: true, deleted: deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
