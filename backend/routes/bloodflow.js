const express = require("express");
const router  = express.Router();
const { getAll, getDoc, createDoc, updateDoc, deleteDoc, queryOne } = require("../firebase");

// ── GET all blood flow readings ─────────────────────────
router.get("/", async (req, res) => {
  try {
    const { workerId, limit = 100 } = req.query;
    let readings = await getAll('bloodflow');
    if (workerId) {
      readings = readings.filter(r => r.workerId === workerId);
    }
    readings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    readings = readings.slice(0, parseInt(limit));
    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET latest reading per worker ───────────────────────
router.get("/latest", async (req, res) => {
  try {
    const workers = await getAll('workers');
    const readings = await getAll('bloodflow');
    const latest = workers.map(w => {
      const workerReadings = readings.filter(r => r.workerId === w.workerId);
      const latestReading = workerReadings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return { worker: w, latestBloodFlow: latestReading || null };
    });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single reading ───────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const reading = await getDoc('bloodflow', req.params.id);
    if (!reading) return res.status(404).json({ error: "Reading not found" });
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST submit blood flow reading ──────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      workerId, workerName, checkType,
      systolic, diastolic, bloodFlow,
      supervisorName, notes,
    } = req.body;

    if (!workerId || !workerName) {
      return res.status(400).json({ error: "workerId and workerName are required" });
    }

    // ── Validate blood pressure ──────────────────────────────────
    let bpStatus = "normal";
    if (systolic !== undefined && diastolic !== undefined) {
      if (systolic > 180 || systolic < 80 || diastolic > 120 || diastolic < 50)
        bpStatus = "critical";
      else if (systolic > 130 || systolic < 90 || diastolic > 90 || diastolic < 60)
        bpStatus = "warning";
    }

    // ── Validate blood flow ─────────────────────────────────────
    let flowStatus = "normal";
    if (bloodFlow !== undefined && bloodFlow !== null) {
      // Assuming normal range 50-100 ml/min, adjust as needed
      if (bloodFlow < 30 || bloodFlow > 150) flowStatus = "critical";
      else if (bloodFlow < 50 || bloodFlow > 120) flowStatus = "warning";
    }

    // ── Determine overall status ────────────────────────────────
    let overallStatus = "fit";
    let clearedForWork = true;
    let blockReason = null;

    if (bpStatus === "critical" || flowStatus === "critical") {
      overallStatus = "unfit";
      clearedForWork = false;
      blockReason = [];
      if (bpStatus === "critical") blockReason.push("Critical blood pressure");
      if (flowStatus === "critical") blockReason.push("Critical blood flow");
      blockReason = blockReason.join("; ");
    } else if (bpStatus === "warning" || flowStatus === "warning") {
      overallStatus = "caution";
    }

    // ── Create reading ────────────────────────────────────
    const readingData = {
      workerId, workerName, checkType,
      bloodPressure: {
        systolic, diastolic, status: bpStatus,
      },
      bloodFlow: {
        value: bloodFlow, status: flowStatus,
      },
      overallStatus, clearedForWork, blockReason,
      supervisorName, notes,
    };

    const reading = await createDoc('bloodflow', readingData);

    // ── Create alert if unfit ─────────────────────────────
    if (!clearedForWork) {
      const alertData = {
        type: "blood-flow-fail",
        severity: "critical",
        message: `${workerName} (${workerId}) failed blood flow/pressure test`,
        workerId, workerName,
        location: "Check-in Station",
        resolved: false,
      };
      await createDoc('alerts', alertData);
    }

    res.status(201).json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT override blood flow reading ─────────────────────
router.put("/:id/override", async (req, res) => {
  try {
    const { supervisorName, overrideReason, newStatus } = req.body;
    const reading = await getDoc('bloodflow', req.params.id);
    if (!reading) return res.status(404).json({ error: "Reading not found" });

    const updateData = {
      overallStatus: newStatus,
      clearedForWork: newStatus === "fit",
      blockReason: newStatus === "fit" ? null : reading.blockReason,
      supervisorName,
      notes: overrideReason,
      supervisorNotified: true,
    };

    const updatedReading = await updateDoc('bloodflow', req.params.id, updateData);
    res.json(updatedReading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE blood flow reading ───────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const reading = await getDoc('bloodflow', req.params.id);
    if (!reading) return res.status(404).json({ error: "Reading not found" });
    await deleteDoc('bloodflow', req.params.id);
    res.json({ message: "Reading deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;