const express = require("express");
const router = express.Router();
const WorkerCheckIn = require("../models/WorkerCheckIn");

// CREATE check-in
router.post("/", async (req, res) => {
  try {
    const checkin = new WorkerCheckIn(req.body);
    await checkin.save();
    res.status(201).json(checkin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all check-ins
router.get("/", async (req, res) => {
  const data = await WorkerCheckIn.find().sort({ checkInTime: -1 });
  res.json(data);
});

module.exports = router;