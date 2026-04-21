const express = require("express");
const router = express.Router();
const Worker = require("../models/Worker");

// GET all workers
router.get("/", async (req, res) => {
  try {
    const workers = await Worker.find().sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single worker
router.get("/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST check-in (creates worker if new, checks in if existing)
router.post("/checkin", async (req, res) => {
  try {
    const { name, workerId, location } = req.body;
    if (!name || !workerId)
      return res.status(400).json({ error: "name and workerId are required" });

    let worker = await Worker.findOne({ workerId });
    if (!worker) {
      worker = new Worker({ name, workerId, location: location || "Surface" });
    }
    worker.status = "checked-in";
    worker.checkInTime = new Date();
    worker.checkOutTime = null;
    if (location) worker.location = location;
    await worker.save();
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST check-out
router.post("/checkout", async (req, res) => {
  try {
    const { workerId } = req.body;
    if (!workerId) return res.status(400).json({ error: "workerId is required" });

    const worker = await Worker.findOne({ workerId });
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    worker.status = "checked-out";
    worker.checkOutTime = new Date();
    await worker.save();
    res.json({ success: true, worker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update worker
router.put("/:id", async (req, res) => {
  try {
    const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE worker
router.delete("/:id", async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json({ success: true, message: "Worker deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
