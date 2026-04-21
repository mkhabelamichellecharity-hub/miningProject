const express = require("express");
const router = express.Router();
const WorkerCheckIn = require("../models/WorkerCheckIn");

// CREATE check-in
router.post("/", async (req, res) => {
  try {
    const data = new WorkerCheckIn(req.body);
    await data.save();
    res.status(201).json(data);
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
