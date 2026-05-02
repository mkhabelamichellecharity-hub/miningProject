const express = require("express");
const router = express.Router();
const { getAll, createDoc } = require("../firebase");

const checkinsCol = "workerCheckIns";

// CREATE check-in
router.post("/", async (req, res) => {
  try {
    const data = await createDoc(checkinsCol, req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all check-ins
router.get("/", async (req, res) => {
  try {
    const data = await getAll(checkinsCol, {
      orderBy: "checkInTime",
      direction: "desc",
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
