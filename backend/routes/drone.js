const express = require("express");
const router  = express.Router();
const Drone   = require("../models/Drone");
const Alert   = require("../models/Alert");

// ── GET all drones ────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const drones = await Drone.find().sort({ createdAt: -1 });
    res.json(drones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single drone ──────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const drone = await Drone.findById(req.params.id);
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

    const drone = new Drone({ name, serialNumber, missionArea: missionArea || "Zone A", notes: notes || "" });
    await drone.save();
    res.status(201).json(drone);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ error: "Serial number already exists" });
    res.status(500).json({ error: err.message });
  }
});

// ── PUT launch drone ──────────────────────────────────────
router.put("/:id/launch", async (req, res) => {
  try {
    const { missionName, missionArea, waypoints } = req.body;
    const drone = await Drone.findById(req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });
    if (drone.telemetry.batteryLevel < 20)
      return res.status(400).json({ error: "Battery too low to launch (minimum 20%)" });

    drone.status          = "flying";
    drone.cameraActive    = true;
    drone.mappingActive   = true;
    drone.missionName     = missionName || "Survey Mission";
    drone.missionArea     = missionArea || drone.missionArea;
    drone.launchedAt      = new Date();
    drone.landedAt        = null;
    drone.currentWaypoint = 0;
    if (waypoints && waypoints.length > 0) drone.waypoints = waypoints;

    await drone.save();

    await Alert.create({
      type: "equipment",
      severity: "low",
      message: drone.name + " launched — mission: " + drone.missionName + " in " + drone.missionArea,
    });

    res.json({ success: true, drone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT land drone ────────────────────────────────────────
router.put("/:id/land", async (req, res) => {
  try {
    const drone = await Drone.findById(req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });

    const flightMins = drone.launchedAt
      ? Math.round((Date.now() - drone.launchedAt) / 60000)
      : 0;

    drone.status           = "idle";
    drone.cameraActive     = false;
    drone.mappingActive    = false;
    drone.landedAt         = new Date();
    drone.totalFlightTime += flightMins;
    drone.telemetry.altitude = 0;
    drone.telemetry.speed    = 0;

    await drone.save();
    res.json({ success: true, drone, flightMins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update telemetry (called by frontend simulation) ──
router.put("/:id/telemetry", async (req, res) => {
  try {
    const { batteryLevel, altitude, speed, heading, signalStrength, temperature, posX, posY } = req.body;
    const drone = await Drone.findById(req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });

    if (batteryLevel   !== undefined) drone.telemetry.batteryLevel   = batteryLevel;
    if (altitude       !== undefined) drone.telemetry.altitude        = altitude;
    if (speed          !== undefined) drone.telemetry.speed           = speed;
    if (heading        !== undefined) drone.telemetry.heading         = heading;
    if (signalStrength !== undefined) drone.telemetry.signalStrength  = signalStrength;
    if (temperature    !== undefined) drone.telemetry.temperature     = temperature;
    if (posX           !== undefined) drone.telemetry.posX            = posX;
    if (posY           !== undefined) drone.telemetry.posY            = posY;

    // Low battery warning
    if (drone.telemetry.batteryLevel <= 15 && drone.status === "flying") {
      await Alert.create({
        type: "equipment",
        severity: "high",
        message: drone.name + " battery critical: " + drone.telemetry.batteryLevel + "% — returning to base",
      });
      drone.status = "returning";
    }

    await drone.save();
    res.json({ success: true, drone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT add map tile ──────────────────────────────────────
router.put("/:id/map-tile", async (req, res) => {
  try {
    const { x, y, type, label } = req.body;
    const drone = await Drone.findById(req.params.id);
    if (!drone) return res.status(404).json({ error: "Drone not found" });

    const exists = drone.mapTiles.find(t => t.x === x && t.y === y);
    if (!exists) {
      drone.mapTiles.push({ x, y, type: type || "clear", label: label || "", discoveredAt: new Date() });
      drone.mapCoverage = Math.min(100, Math.round((drone.mapTiles.length / 400) * 100));
    }

    await drone.save();
    res.json({ success: true, mapTiles: drone.mapTiles, mapCoverage: drone.mapCoverage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT clear map ─────────────────────────────────────────
router.put("/:id/clear-map", async (req, res) => {
  try {
    const drone = await Drone.findByIdAndUpdate(
      req.params.id,
      { mapTiles: [], mapCoverage: 0 },
      { new: true }
    );
    if (!drone) return res.status(404).json({ error: "Drone not found" });
    res.json({ success: true, drone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT toggle camera ─────────────────────────────────────
router.put("/:id/camera", async (req, res) => {
  try {
    const { active } = req.body;
    const drone = await Drone.findByIdAndUpdate(
      req.params.id,
      { cameraActive: active },
      { new: true }
    );
    if (!drone) return res.status(404).json({ error: "Drone not found" });
    res.json({ success: true, drone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE drone ──────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await Drone.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
