const express = require("express");
const router  = express.Router();
const VitalReading = require("../models/VitalReading");
const Alert        = require("../models/Alert");
const Worker       = require("../models/Worker");

// ── GET all vitals ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { workerId, limit = 100 } = req.query;
    const filter = workerId ? { workerId } : {};
    const vitals = await VitalReading.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET latest reading per worker ─────────────────────────
router.get("/latest", async (req, res) => {
  try {
    const workers = await Worker.find();
    const latest  = await Promise.all(
      workers.map(async (w) => {
        const reading = await VitalReading.findOne({ workerId: w.workerId }).sort({ createdAt: -1 });
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
    const vital = await VitalReading.findById(req.params.id);
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
      heartRate, temperature, bloodOxygen, bloodPressure,
      alcoholTest, drugTest,
      supervisorName, notes,
    } = req.body;

    if (!workerId || !workerName || !checkType)
      return res.status(400).json({ error: "workerId, workerName and checkType are required" });

    const reading = new VitalReading({
      workerId,
      workerName,
      checkType,
      heartRate:    { value: heartRate ?? null },
      temperature:  { value: temperature ?? null },
      bloodOxygen:  { value: bloodOxygen ?? null },
      bloodPressure: {
        systolic:  bloodPressure?.systolic  ?? null,
        diastolic: bloodPressure?.diastolic ?? null,
      },
      alcoholTest: {
        value:      alcoholTest?.value      ?? null,
        testMethod: alcoholTest?.testMethod ?? "not-tested",
      },
      drugTest: {
        result:     drugTest?.result     ?? "not-tested",
        substances: drugTest?.substances ?? [],
        testMethod: drugTest?.testMethod ?? "not-tested",
      },
      notes: notes || "",
    });

    await reading.save(); // pre-save hook calculates all statuses

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

    if (reading.bloodPressure.status === "critical")
      addAlert("critical", workerName + " (" + workerId + ") — critical BP: " + bloodPressure?.systolic + "/" + bloodPressure?.diastolic + " mmHg");
    else if (reading.bloodPressure.status === "warning")
      addAlert("medium",   workerName + " (" + workerId + ") — abnormal BP: " + bloodPressure?.systolic + "/" + bloodPressure?.diastolic + " mmHg");

    if (reading.alcoholTest.status === "fail")
      addAlert("critical", workerName + " (" + workerId + ") — FAILED alcohol test: BAC " + alcoholTest?.value + " mg/100ml — entry blocked");
    else if (reading.alcoholTest.status === "warning")
      addAlert("high",     workerName + " (" + workerId + ") — alcohol test warning: BAC " + alcoholTest?.value + " mg/100ml");

    if (reading.drugTest.status === "fail") {
      const subs = reading.drugTest.substances.length > 0 ? reading.drugTest.substances.join(", ") : "unspecified";
      addAlert("critical", workerName + " (" + workerId + ") — FAILED drug test: " + subs + " — entry blocked");
    }

    if (alertsToCreate.length > 0)
      await Alert.insertMany(alertsToCreate);

    // ── Supervisor notification record ────────────────────
    let notified = false;
    if ((reading.overallStatus === "unfit" || reading.overallStatus === "caution") && supervisorName) {
      await VitalReading.findByIdAndUpdate(reading._id, {
        supervisorNotified:   true,
        supervisorNotifiedAt: new Date(),
        supervisorName,
      });
      notified = true;
    }

    res.status(201).json({
      success:        true,
      reading,
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
    const reading = await VitalReading.findByIdAndUpdate(
      req.params.id,
      { supervisorNotified: true, supervisorNotifiedAt: new Date(), supervisorName },
      { new: true }
    );
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
    const reading = await VitalReading.findByIdAndUpdate(
      req.params.id,
      {
        clearedForWork: true,
        overallStatus:  "caution",
        overriddenBy,
        overriddenAt:   new Date(),
        overrideReason: overrideReason || "Supervisor override",
      },
      { new: true }
    );
    if (!reading) return res.status(404).json({ error: "Reading not found" });

    // Log override as alert
    await Alert.create({
      type:     "medical",
      severity: "high",
      message:  "Supervisor " + overriddenBy + " overrode UNFIT status for " +
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
    await VitalReading.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
