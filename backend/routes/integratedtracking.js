const express = require("express");
const router = express.Router();
const { getAll, createDoc, updateDoc } = require("../firebase");

const findActiveTracker = async (workerId) => {
  const trackers = await getAll("integratedTrackers");
  return trackers.find((tracker) => tracker.workerId === workerId && tracker.isActive);
};

// ── GET all active integrated trackers ─────────────────────
router.get("/", async (req, res) => {
  try {
    const trackers = await getAll("integratedTrackers");
    res.json(trackers.filter((tracker) => tracker.isActive));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single tracker with full history ──────────────────
router.get("/:workerId", async (req, res) => {
  try {
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });
    res.json(tracker);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST initialize new integrated tracker ────────────────
router.post("/init", async (req, res) => {
  try {
    const { workerId, workerName, helmetId, beltId } = req.body;

    if (!workerId || !workerName || !helmetId || !beltId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const trackerData = {
      workerId,
      workerName,
      helmet: {
        deviceId: helmetId,
        highFrequencyData: {
          frequency: 2400,
          enabled: true,
          signalStrength: 100,
          dataRate: 50,
          lastReading: new Date().toISOString(),
        },
        battery: 100,
        status: "active",
      },
      belt: {
        deviceId: beltId,
        rfidReader: { enabled: true, status: "active" },
        liveTracker: { enabled: true, status: "active" },
        battery: 100,
        status: "active",
      },
      integratedTracking: {
        syncStatus: "synchronized",
        lastSyncTime: new Date().toISOString(),
      },
      trackingHistory: [],
      alerts: [],
      isActive: true,
      checkInTime: new Date().toISOString(),
      lastActivityTime: new Date().toISOString(),
    };

    const created = await createDoc("integratedTrackers", trackerData);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST update high-frequency helmet data ────────────────
router.post("/:workerId/helmet/data", async (req, res) => {
  try {
    const { frequency, signalStrength, battery, temperature } = req.body;
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const helmet = {
      ...(tracker.helmet || {}),
      highFrequencyData: {
        frequency: frequency ?? 2400,
        enabled: true,
        signalStrength: signalStrength ?? tracker.helmet?.highFrequencyData?.signalStrength ?? 100,
        dataRate: 50,
        lastReading: new Date().toISOString(),
      },
      battery: battery !== undefined ? battery : tracker.helmet?.battery ?? 100,
      temperature: temperature !== undefined ? temperature : tracker.helmet?.temperature,
      status: signalStrength < 20 ? "error" : battery < 20 ? "low_battery" : "active",
    };

    const updated = await updateDoc("integratedTrackers", tracker.id, {
      helmet,
      lastActivityTime: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST update belt tracker & GPS data ───────────────────
router.post("/:workerId/belt/location", async (req, res) => {
  try {
    const { latitude, longitude, altitude, accuracy, speed, heading } = req.body;
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const currentBelt = tracker.belt || {};
    const newHistoryEntry = {
      timestamp: new Date().toISOString(),
      beltLocation: { latitude, longitude },
      speed: speed ?? 0,
      heading: heading ?? 0,
    };

    const history = [...(tracker.trackingHistory || [])];
    if (history.length >= 1000) history.shift();
    history.push(newHistoryEntry);

    const belt = {
      ...currentBelt,
      liveTracker: {
        enabled: true,
        latitude,
        longitude,
        altitude: altitude ?? null,
        accuracy: accuracy ?? null,
        speed: speed ?? 0,
        heading: heading ?? 0,
        updateFrequency: 10,
        lastUpdate: new Date().toISOString(),
        status: accuracy > 100 ? "low_accuracy" : "active",
      },
    };

    const updated = await updateDoc("integratedTrackers", tracker.id, {
      belt,
      trackingHistory: history,
      integratedTracking: {
        ...tracker.integratedTracking,
        lastSyncTime: new Date().toISOString(),
      },
      lastActivityTime: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST synchronize helmet & belt ────────────────────────
router.post("/:workerId/sync", async (req, res) => {
  try {
    const { helmetSignal, beltSignal, proximityDistance } = req.body;
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const alerts = [...(tracker.alerts || [])];
    if (proximityDistance && proximityDistance > 200) {
      alerts.push({
        timestamp: new Date().toISOString(),
        type: "separation",
        severity: "warning",
        message: "Helmet and belt separated by " + proximityDistance + "cm",
        resolved: false,
      });
    }

    const combinedSignal = ((helmetSignal ?? 0) + (beltSignal ?? 0)) / 2;
    const integratedTracking = {
      ...tracker.integratedTracking,
      syncStatus: proximityDistance > 500 ? "out_of_sync" : "synchronized",
      lastSyncTime: new Date().toISOString(),
      syncFrequency: 100,
      helmetBeltDistance: proximityDistance ?? 0,
      combinedSignalStrength: combinedSignal,
      trackingMode: proximityDistance < 50 ? "imu+proximity" : "gps+imu",
    };

    const updated = await updateDoc("integratedTrackers", tracker.id, {
      integratedTracking,
      alerts: alerts.slice(-50),
      lastActivityTime: new Date().toISOString(),
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST RFID scan from belt ──────────────────────────────
router.post("/:workerId/rfid/scan", async (req, res) => {
  try {
    const { rfidTag, location } = req.body;
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const belt = {
      ...(tracker.belt || {}),
      rfidReader: {
        enabled: true,
        lastScan: new Date().toISOString(),
        lastScannedTag: rfidTag,
        status: "active",
      },
    };

    const updates = {
      belt,
      lastActivityTime: new Date().toISOString(),
    };
    if (location) updates.zone = location;

    const updated = await updateDoc("integratedTrackers", tracker.id, updates);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET tracking history ──────────────────────────────────
router.get("/:workerId/history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const history = (tracker.trackingHistory || []).slice(-limit);
    res.json({ workerId: req.params.workerId, history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET alerts ────────────────────────────────────────────
router.get("/:workerId/alerts", async (req, res) => {
  try {
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });
    res.json({ workerId: req.params.workerId, alerts: tracker.alerts || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT resolve alert ─────────────────────────────────────
router.put("/:workerId/alerts/:alertIndex/resolve", async (req, res) => {
  try {
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const alerts = [...(tracker.alerts || [])];
    const index = parseInt(req.params.alertIndex, 10);
    if (index >= 0 && index < alerts.length) {
      alerts[index] = {
        ...alerts[index],
        resolved: true,
        resolvedAt: new Date().toISOString(),
      };
    }

    const updated = await updateDoc("integratedTrackers", tracker.id, { alerts });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST checkout (end tracking) ──────────────────────────
router.post("/:workerId/checkout", async (req, res) => {
  try {
    const tracker = await findActiveTracker(req.params.workerId);
    if (!tracker) return res.status(404).json({ error: "Tracker not found" });

    const updated = await updateDoc("integratedTrackers", tracker.id, {
      isActive: false,
      lastActivityTime: new Date().toISOString(),
    });

    res.json({ id: tracker.id, message: "Checkout successful", ...updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
