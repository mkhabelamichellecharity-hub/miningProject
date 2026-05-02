const express = require("express");
const router = express.Router();
const {
  getAll,
  getDoc,
  queryOne,
  createDoc,
  updateDoc,
  deleteDoc,
} = require("../firebase");

const workersCol = "workers";

// GET all workers
router.get("/", async (req, res) => {
  try {
    const workers = await getAll(workersCol, {
      orderBy: "createdAt",
      direction: "desc",
    });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single worker
router.get("/:id", async (req, res) => {
  try {
    const worker = await getDoc(workersCol, req.params.id);
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST check-in (requires card and fingerprint)
router.post("/checkin", async (req, res) => {
  try {
    const { workerId, fingerprint, location } = req.body;
    if (!workerId || !fingerprint)
      return res.status(400).json({ error: "workerId and fingerprint are required" });

    const worker = await queryOne(workersCol, "workerId", "==", workerId);
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    if (worker.fingerprint !== fingerprint) {
      return res.status(401).json({ error: "Fingerprint mismatch" });
    }

    const updatedWorker = await updateDoc(workersCol, worker.id, {
      status: "checked-in",
      checkInTime: new Date(),
      checkOutTime: null,
      location: location || worker.location || "Surface",
    });

    res.json({ success: true, worker: updatedWorker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST check-out
router.post("/checkout", async (req, res) => {
  try {
    const { workerId } = req.body;
    if (!workerId) return res.status(400).json({ error: "workerId is required" });

    const worker = await queryOne(workersCol, "workerId", "==", workerId);
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    const updatedWorker = await updateDoc(workersCol, worker.id, {
      status: "checked-out",
      checkOutTime: new Date(),
    });

    res.json({ success: true, worker: updatedWorker });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update worker
router.put("/:id", async (req, res) => {
  try {
    const existing = await getDoc(workersCol, req.params.id);
    if (!existing) return res.status(404).json({ error: "Worker not found" });

    const worker = await updateDoc(workersCol, req.params.id, req.body);
    res.json(worker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE worker
router.delete("/:id", async (req, res) => {
  try {
    const existing = await getDoc(workersCol, req.params.id);
    if (!existing) return res.status(404).json({ error: "Worker not found" });

    await deleteDoc(workersCol, req.params.id);
    res.json({ success: true, message: "Worker deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
