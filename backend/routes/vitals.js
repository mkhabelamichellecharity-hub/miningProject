const express = require("express");
const router  = express.Router();
const { getAll, getDoc, createDoc, queryOne } = require("../firebase");

// ── GET all vitals ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { workerId, limit = 100 } = req.query;
    let vitals = await getAll("vitals");
    if (workerId) {
      vitals = vitals.filter(v => v.workerId === workerId);
    }
    vitals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    vitals = vitals.slice(0, parseInt(limit));
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET latest reading per worker ─────────────────────────
router.get("/latest", async (req, res) => {
  try {
    const workers = await getAll("workers");
    const latest  = await Promise.all(
      workers.map(async (w) => {
        const allVitals = await getAll("vitals");
        const workerVitals = allVitals.filter(v => v.workerId === w.workerId);
        const reading = workerVitals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return { worker: w, latestVitals: reading };
      })
    );
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single reading ────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const vital = await getDoc("vitals", req.params.id);
    if (!vital) return res.status(404).json({ error: "Reading not found" });
    res.json(vital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST submit vitals ────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      workerId, workerName, checkType,
      heartRate, temperature, bloodOxygen,
      drugTest,
      supervisorName, notes,
    } = req.body;

    if (!workerId || !workerName || !checkType)
      return res.status(400).json({ error: "workerId, workerName and checkType are required" });

    // Calculate statuses
    const reading = {
      workerId,
      workerName,
      checkType,
      heartRate:    { value: heartRate ?? null, status: "normal" },
      temperature:  { value: temperature ?? null, status: "normal" },
      bloodOxygen:  { value: bloodOxygen ?? null, status: "normal" },
      drugTest: {
        result:     drugTest?.result     ?? "not-tested",
        substances: drugTest?.substances ?? [],
        status:     "not-tested",
        testMethod: drugTest?.testMethod ?? "not-tested",
      },
      overallStatus: "fit",
      clearedForWork: true,
      blockReason: null,
      supervisorNotified: false,
      supervisorNotifiedAt: null,
      supervisorName: null,
      overriddenBy: null,
      overriddenAt: null,
      overrideReason: null,
      notes: notes || "",
    };

    const blockReasons = [];

    if (reading.heartRate.value !== null) {
      const hr = reading.heartRate.value;
      if (hr < 50 || hr > 120)      reading.heartRate.status = "critical";
      else if (hr < 60 || hr > 100) reading.heartRate.status = "warning";
      else                           reading.heartRate.status = "normal";
      if (reading.heartRate.status === "critical")
        blockReasons.push("Critical heart rate: " + hr + " BPM");
    }

    if (reading.temperature.value !== null) {
      const t = reading.temperature.value;
      if (t > 38.1 || t < 35.5)      reading.temperature.status = "critical";
      else if (t > 37.2 || t < 36.1) reading.temperature.status = "warning";
      else                             reading.temperature.status = "normal";
      if (reading.temperature.status === "critical")
        blockReasons.push("Critical temperature: " + t + "C");
    }

    if (reading.bloodOxygen.value !== null) {
      const s = reading.bloodOxygen.value;
      if (s < 90)      reading.bloodOxygen.status = "critical";
      else if (s < 95) reading.bloodOxygen.status = "warning";
      else             reading.bloodOxygen.status = "normal";
      if (reading.bloodOxygen.status === "critical")
        blockReasons.push("Critical SpO2: " + s + "%");
    }

    if (reading.drugTest.result === "positive") {
      reading.drugTest.status = "fail";
      const subs = reading.drugTest.substances.length > 0
        ? reading.drugTest.substances.join(", ")
        : "unspecified";
      blockReasons.push("Positive drug test: " + subs);
    } else if (reading.drugTest.result === "negative") {
      reading.drugTest.status = "pass";
    }

    const vitalStatuses = [
      reading.heartRate.status,
      reading.temperature.status,
      reading.bloodOxygen.status,
    ];

    const hasCritical     = vitalStatuses.includes("critical");
    const hasWarning      = vitalStatuses.includes("warning");
    const drugFail        = reading.drugTest.status === "fail";

    if (hasCritical || drugFail) {
      reading.overallStatus  = "unfit";
      reading.clearedForWork = false;
      reading.blockReason    = blockReasons.join("; ");
    } else if (hasWarning) {
      reading.overallStatus  = "caution";
      reading.clearedForWork = true;
      reading.blockReason    = null;
    } else {
      reading.overallStatus  = "fit";
      reading.clearedForWork = true;
      reading.blockReason    = null;
    }

    const savedReading = await createDoc("vitals", reading);

    // ── Auto-create alerts ────────────────────────────────
    const alertsToCreate = [];

    const addAlert = (severity, message) => alertsToCreate.push({ type: "medical", severity, message });

    if (reading.heartRate.status === "critical")
      addAlert("critical", workerName + " (" + workerId + ") — critical heart rate: " + heartRate + " BPM");
    else if (reading.heartRate.status === "warning")
      addAlert("medium",   workerName + " (" + workerId + ") — abnormal heart rate: " + heartRate + " BPM");

    if (reading.temperature.status === "critical")
      addAlert("critical", workerName + " (" + workerId + ") — critical temperature: " + temperature + "C");
    else if (reading.temperature.status === "warning")
      addAlert("medium",   workerName + " (" + workerId + ") — elevated temperature: " + temperature + "C");

    if (reading.bloodOxygen.status === "critical")
      addAlert("critical", workerName + " (" + workerId + ") — critically low SpO2: " + bloodOxygen + "%");
    else if (reading.bloodOxygen.status === "warning")
      addAlert("high",     workerName + " (" + workerId + ") — low SpO2: " + bloodOxygen + "%");

    if (reading.drugTest.status === "fail") {
      const subs = reading.drugTest.substances.length > 0 ? reading.drugTest.substances.join(", ") : "unspecified";
      addAlert("critical", workerName + " (" + workerId + ") — FAILED drug test: " + subs + " — entry blocked");
    }

    for (const alert of alertsToCreate) {
      await createDoc("alerts", alert);
    }

    // ── Supervisor notification record ────────────────────
    let notified = false;
    if ((reading.overallStatus === "unfit" || reading.overallStatus === "caution") && supervisorName) {
      await updateDoc("vitals", savedReading.id, {
        supervisorNotified: true,
        supervisorNotifiedAt: new Date().toISOString(),
        supervisorName,
      });
      notified = true;
    }

    res.status(201).json({
      success:        true,
      reading: savedReading,
      alertsCreated:  alertsToCreate.length,
      clearedForWork: reading.clearedForWork,
      overallStatus:  reading.overallStatus,
      blockReason:    reading.blockReason,
      supervisorNotified: notified,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT notify supervisor ─────────────────────────────────
router.put("/:id/notify", async (req, res) => {
  try {
    const { supervisorName } = req.body;
    if (!supervisorName)
      return res.status(400).json({ error: "supervisorName is required" });
    const reading = await updateDoc("vitals", req.params.id, {
      supervisorNotified: true,
      supervisorNotifiedAt: new Date().toISOString(),
      supervisorName
    });
    if (!reading) return res.status(404).json({ error: "Reading not found" });
    res.json({ success: true, reading });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT supervisor override ───────────────────────────────
router.put("/:id/override", async (req, res) => {
  try {
    const { overriddenBy, overrideReason } = req.body;
    if (!overriddenBy)
      return res.status(400).json({ error: "overriddenBy is required" });
    const reading = await updateDoc("vitals", req.params.id, {
      clearedForWork: true,
      overallStatus: "caution",
      overriddenBy,
      overriddenAt: new Date().toISOString(),
      overrideReason: overrideReason || "Supervisor override",
    });
    if (!reading) return res.status(404).json({ error: "Reading not found" });

    // Log override as alert
    await createDoc("alerts", {
      type: "medical",
      severity: "high",
      message: "Supervisor " + overriddenBy + " overrode UNFIT status for " +
               reading.workerName + " (" + reading.workerId + ")" +
               (overrideReason ? ": " + overrideReason : ""),
    });

    res.json({ success: true, reading });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE reading ────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await deleteDoc("vitals", req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
