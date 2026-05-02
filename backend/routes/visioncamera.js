const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// ── GET all vision cameras ────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("visionCameras").get();
    const cameras = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single vision camera ──────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("visionCameras").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Camera not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create vision camera ─────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, cameraId, location, resolution, frameRate, ipAddress } = req.body;

    if (!name || !cameraId || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const cameraData = {
      name,
      cameraId,
      location,
      resolution: resolution || "1920x1080",
      frameRate: frameRate || 30,
      ipAddress: ipAddress || "",
      status: "active",
      isRecording: false,
      connected: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("visionCameras").add(cameraData);
    res.status(201).json({ id: docRef.id, ...cameraData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update vision camera ──────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, location, status, isRecording, motionDetection, resolution, frameRate } = req.body;

    const updates = {
      ...(name && { name }),
      ...(location && { location }),
      ...(status && { status }),
      ...(isRecording !== undefined && { isRecording }),
      ...(motionDetection !== undefined && { motionDetection }),
      ...(resolution && { resolution }),
      ...(frameRate && { frameRate }),
      updatedAt: new Date(),
    };

    await db.collection("visionCameras").doc(req.params.id).update(updates);

    const doc = await db.collection("visionCameras").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE vision camera ──────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await db.collection("visionCameras").doc(req.params.id).delete();
    res.json({ message: "Camera deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start/Stop recording ──────────────────────────────────
router.post("/:id/recording/start", async (req, res) => {
  try {
    await db.collection("visionCameras").doc(req.params.id).update({
      isRecording: true,
      updatedAt: new Date(),
    });
    const doc = await db.collection("visionCameras").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/recording/stop", async (req, res) => {
  try {
    await db.collection("visionCameras").doc(req.params.id).update({
      isRecording: false,
      updatedAt: new Date(),
    });
    const doc = await db.collection("visionCameras").doc(req.params.id).get();
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
