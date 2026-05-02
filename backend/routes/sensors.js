const express = require("express");
const router = express.Router();
const { getAll, getDoc, createDoc, updateDoc, deleteDoc } = require("../firebase");

const collection = "sensors";

router.get("/", async (req, res) => {
  try {
    const sensors = await getAll(collection);
    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const sensor = await getDoc(collection, req.params.id);
    if (!sensor) return res.status(404).json({ error: "Sensor not found" });
    res.json(sensor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const now = new Date().toISOString();
    const sensor = await createDoc(collection, {
      ...req.body,
      status: req.body.status || "inactive",
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json(sensor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await updateDoc(collection, req.params.id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: "Sensor not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const updated = await updateDoc(collection, req.params.id, {
      status: req.body.status,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: "Sensor not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await deleteDoc(collection, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
