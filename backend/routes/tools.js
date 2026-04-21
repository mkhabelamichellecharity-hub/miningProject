const express = require("express");
const router = express.Router();
const Tool = require("../models/Tool");

// GET all tools
router.get("/", async (req, res) => {
  try {
    const tools = await Tool.find()
      .populate("currentWorker", "name workerId")
      .sort({ createdAt: -1 });
    res.json(tools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single tool
router.get("/:id", async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id).populate(
      "currentWorker",
      "name workerId"
    );
    if (!tool) return res.status(404).json({ error: "Tool not found" });
    res.json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create tool
router.post("/", async (req, res) => {
  try {
    const { name, type, rfidTag } = req.body;
    if (!name || !type)
      return res.status(400).json({ error: "name and type are required" });

    const tool = new Tool({ name, type, rfidTag: rfidTag || undefined });
    await tool.save();
    res.status(201).json(tool);
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ error: "RFID tag already exists" });
    res.status(500).json({ error: err.message });
  }
});

// PUT update tool
router.put("/:id", async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!tool) return res.status(404).json({ error: "Tool not found" });
    res.json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tool
router.delete("/:id", async (req, res) => {
  try {
    const tool = await Tool.findByIdAndDelete(req.params.id);
    if (!tool) return res.status(404).json({ error: "Tool not found" });
    res.json({ success: true, message: "Tool deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
