const express = require("express");
const router  = express.Router();
const { getAll, getDoc, createDoc, updateDoc, deleteDoc, queryOne } = require("../firebase");

// ── GET all drones ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const drones = await getAll('drones');
    drones.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(drones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single drone ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const drone = await getDoc('drones', req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });
    res.json(drone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create drone ─────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, serialNumber, missionArea, notes } = req.body;
    if (!name || !serialNumber)
      return res.status(400).json({ error: "name and serialNumber are required" });

    // Check unique serialNumber
    const existing = await queryOne('drones', 'serialNumber', '==', serialNumber);
    if (existing) return res.status(400).json({ error: "Serial number already exists" });

    const droneData = {
      name,
      serialNumber,
      missionArea: missionArea || "Zone A",
      notes: notes || "",
      status: "idle",
      cameraActive: false,
      mappingActive: false,
      telemetry: {
        batteryLevel: 100,
        altitude: 0,
        speed: 0,
        heading: 0,
        signalStrength: 100,
        temperature: 22,
        posX: 50,
        posY: 50,
      },
      missionName: null,
      waypoints: [],
      currentWaypoint: 0,
      mapTiles: [],
      mapCoverage: 0,
      totalFlightTime: 0,
      totalDistance: 0,
      launchedAt: null,
      landedAt: null,
    };

    const drone = await createDoc('drones', droneData);
    res.status(201).json(drone);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT launch drone ──────────────────────────────────────
router.put("/:id/launch", async (req, res) => {
  try {
    const { missionName, missionArea, waypoints } = req.body;
    const drone = await getDoc('drones', req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });
    if (drone.telemetry.batteryLevel < 20)
      return res.status(400).json({ error: "Battery too low to launch (minimum 20%)" });

    const updateData = {
      status: "flying",
      cameraActive: true,
      mappingActive: true,
      missionName: missionName || "Survey Mission",
      missionArea: missionArea || drone.missionArea,
      launchedAt: new Date().toISOString(),
      landedAt: null,
      currentWaypoint: 0,
    };
    if (waypoints && waypoints.length > 0) updateData.waypoints = waypoints;

    const updatedDrone = await updateDoc('drones', req.params.id, updateData);

    const alertData = {
      type: "equipment",
      severity: "low",
      message: updatedDrone.name + " launched — mission: " + updatedDrone.missionName + " in " + updatedDrone.missionArea,
      location: "Drone Bay",
      resolved: false,
    };
    await createDoc('alerts', alertData);

    res.json({ success: true, drone: updatedDrone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT land drone ────────────────────────────────────────
router.put("/:id/land", async (req, res) => {
  try {
    const drone = await getDoc('drones', req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });

    const flightMins = drone.launchedAt
      ? Math.round((Date.now() - new Date(drone.launchedAt)) / 60000)
      : 0;

    const updateData = {
      status: "idle",
      cameraActive: false,
      mappingActive: false,
      landedAt: new Date().toISOString(),
      totalFlightTime: drone.totalFlightTime + flightMins,
      telemetry: {
        ...drone.telemetry,
        altitude: 0,
        speed: 0,
      },
    };

    const updatedDrone = await updateDoc('drones', req.params.id, updateData);
    res.json({ success: true, drone: updatedDrone, flightMins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update telemetry (called by frontend simulation) ──
router.put("/:id/telemetry", async (req, res) => {
  try {
    const { batteryLevel, altitude, speed, heading, signalStrength, temperature, posX, posY } = req.body;
    const drone = await getDoc('drones', req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });

    const telemetry = { ...drone.telemetry };
    if (batteryLevel !== undefined) telemetry.batteryLevel = batteryLevel;
    if (altitude !== undefined) telemetry.altitude = altitude;
    if (speed !== undefined) telemetry.speed = speed;
    if (heading !== undefined) telemetry.heading = heading;
    if (signalStrength !== undefined) telemetry.signalStrength = signalStrength;
    if (temperature !== undefined) telemetry.temperature = temperature;
    if (posX !== undefined) telemetry.posX = posX;
    if (posY !== undefined) telemetry.posY = posY;

    const updateData = { telemetry };

    // Low battery warning
    if (telemetry.batteryLevel <= 15 && drone.status === "flying") {
      const alertData = {
        type: "equipment",
        severity: "high",
        message: drone.name + " battery critical: " + telemetry.batteryLevel + "% — returning to base",
        location: "Drone Bay",
        resolved: false,
      };
      await createDoc('alerts', alertData);
      updateData.status = "returning";
    }

    const updatedDrone = await updateDoc('drones', req.params.id, updateData);
    res.json({ success: true, drone: updatedDrone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT add map tile ──────────────────────────────────────
router.put("/:id/map-tile", async (req, res) => {
  try {
    const { x, y, type, label } = req.body;
    const drone = await getDoc('drones', req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });

    const exists = drone.mapTiles.find(t => t.x === x && t.y === y);
    if (!exists) {
      const newTile = {
        x,
        y,
        type: type || "clear",
        label: label || "",
        discoveredAt: new Date().toISOString(),
      };
      const mapTiles = [...drone.mapTiles, newTile];
      const mapCoverage = Math.min(100, Math.round((mapTiles.length / 400) * 100));
      const updateData = { mapTiles, mapCoverage };
      const updatedDrone = await updateDoc('drones', req.params.id, updateData);
      res.json({ success: true, mapTiles: updatedDrone.mapTiles, mapCoverage: updatedDrone.mapCoverage });
    } else {
      res.json({ success: true, mapTiles: drone.mapTiles, mapCoverage: drone.mapCoverage });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT clear map ─────────────────────────────────────────
router.put("/:id/clear-map", async (req, res) => {
  try {
    const updateData = { mapTiles: [], mapCoverage: 0 };
    const updatedDrone = await updateDoc('drones', req.params.id, updateData);
    if (!updatedDrone) return res.status(404).json({ error: "Drone not found" });
    res.json({ success: true, drone: updatedDrone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT toggle camera ─────────────────────────────────────
router.put("/:id/camera", async (req, res) => {
  try {
    const { active } = req.body;
    const updateData = { cameraActive: active };
    const updatedDrone = await updateDoc('drones', req.params.id, updateData);
    if (!updatedDrone) return res.status(404).json({ error: "Drone not found" });
    res.json({ success: true, drone: updatedDrone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE drone ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const drone = await getDoc('drones', req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });
    await deleteDoc('drones', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
