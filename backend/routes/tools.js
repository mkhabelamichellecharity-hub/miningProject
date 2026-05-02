const express = require("express");
const router = express.Router();
const {
  getAll,
  getDoc,
  createDoc,
  updateDoc,
  deleteDoc,
} = require("../firebase");

const toolsCol = "tools";
const workersCol = "workers";

const attachWorker = async (tool) => {
  if (!tool || !tool.currentWorker) return tool;
  const worker = await getDoc(workersCol, tool.currentWorker);
  if (worker) {
    tool.currentWorker = {
      id: worker.id,
      name: worker.name,
      workerId: worker.workerId,
    };
  }
  return tool;
};

// GET all tools
router.get("/", async (req, res) => {
  try {
    const tools = await getAll(toolsCol, {
      orderBy: "createdAt",
      direction: "desc",
    });
    const enriched = await Promise.all(tools.map(attachWorker));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single tool
router.get("/:id", async (req, res) => {
  try {
    const tool = await getDoc(toolsCol, req.params.id);
    if (!tool) return res.status(404).json({ error: "Tool not found" });
    res.json(await attachWorker(tool));
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

    const tool = await createDoc(toolsCol, {
      name,
      type,
      rfidTag: rfidTag || null,
      currentWorker: null,
    });
    res.status(201).json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update tool
router.put("/:id", async (req, res) => {
  try {
    const existing = await getDoc(toolsCol, req.params.id);
    if (!existing) return res.status(404).json({ error: "Tool not found" });

    const tool = await updateDoc(toolsCol, req.params.id, req.body);
    res.json(tool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tool
router.delete("/:id", async (req, res) => {
  try {
    const existing = await getDoc(toolsCol, req.params.id);
    if (!existing) return res.status(404).json({ error: "Tool not found" });

    await deleteDoc(toolsCol, req.params.id);
    res.json({ success: true, message: "Tool deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
