const express = require("express");
const router  = express.Router();
const { getAll, getDoc, createDoc, updateDoc, deleteDoc, queryOne } = require("../firebase");

// ── GET all alcohol readings ─────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { workerId, limit = 100 } = req.query;
    let readings = await getAll('alcohol');
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

// ── GET latest reading per worker ────────────────────────
router.get("/latest", async (req, res) => {
  try {
    const workers = await getAll('workers');
    const readings = await getAll('alcohol');
    const latest = workers.map(w => {
      const workerReadings = readings.filter(r => r.workerId === w.workerId);
      const latestReading = workerReadings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      return { worker: w, latestAlcohol: latestReading || null };
    });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single reading ───────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const reading = await getDoc('alcohol', req.params.id);
    if (!reading) return res.status(404).json({ error: "Reading not found" });
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST submit alcohol reading ──────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      workerId, workerName, checkType,
      alcoholValue, alcoholMethod,
      supervisorName, notes,
    } = req.body;

    if (!workerId || !workerName) {
      return res.status(400).json({ error: "workerId and workerName are required" });
    }

    // ── Validate alcohol ──────────────────────────────────
    let alcoholStatus = "not-tested";
    let overallStatus = "fit";
    let clearedForWork = true;
    let blockReason = null;

    if (alcoholValue !== undefined && alcoholValue !== null) {
      if (alcoholValue < 0.02) alcoholStatus = "pass";
      else if (alcoholValue <= 0.04) alcoholStatus = "warning";
      else alcoholStatus = "fail";
    }

    if (alcoholStatus === "fail") {
      overallStatus = "unfit";
      clearedForWork = false;
      blockReason = `Alcohol level: ${alcoholValue} mg/100ml (FAIL)`;
    } else if (alcoholStatus === "warning") {
      overallStatus = "caution";
    }

    // ── Create reading ────────────────────────────────────
    const readingData = {
      workerId, workerName, checkType,
      alcoholTest: {
        value: alcoholValue,
        status: alcoholStatus,
        testMethod: alcoholMethod || "breathalyser",
      },
      overallStatus, clearedForWork, blockReason,
      supervisorName, notes,
    };

    const reading = await createDoc('alcohol', readingData);

    // ── Create alert if unfit ─────────────────────────────
    if (!clearedForWork) {
      const alertData = {
        type: "alcohol-fail",
        severity: "critical",
        message: `${workerName} (${workerId}) failed alcohol test: ${alcoholValue} mg/100ml`,
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

// ── PUT override alcohol reading ─────────────────────────
router.put("/:id/override", async (req, res) => {
  try {
    const { supervisorName, overrideReason, newStatus } = req.body;
    const reading = await getDoc('alcohol', req.params.id);
    if (!reading) return res.status(404).json({ error: "Reading not found" });

    const updateData = {
      overallStatus: newStatus,
      clearedForWork: newStatus === "fit",
      blockReason: newStatus === "fit" ? null : reading.blockReason,
      supervisorName,
      notes: overrideReason,
      supervisorNotified: true,
    };

    const updatedReading = await updateDoc('alcohol', req.params.id, updateData);
    res.json(updatedReading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE alcohol reading ───────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const reading = await getDoc('alcohol', req.params.id);
    if (!reading) return res.status(404).json({ error: "Reading not found" });
    await deleteDoc('alcohol', req.params.id);
    res.json({ message: "Reading deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;