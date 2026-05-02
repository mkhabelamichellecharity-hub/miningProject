const express = require("express");
const router  = express.Router();
const { getAll, getDoc, createDoc, updateDoc, deleteDoc, queryOne } = require("../firebase");

// ── GET all selections ──────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { date, limit = 50 } = req.query;
    let selections = await getAll('drugtests');
    if (date) {
      const targetDate = new Date(date).toISOString().split('T')[0];
      selections = selections.filter(s => s.date && s.date.startsWith(targetDate));
    }
    selections.sort((a, b) => new Date(b.date) - new Date(a.date));
    selections = selections.slice(0, parseInt(limit));
    res.json(selections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET today's selection ───────────────────────────────
router.get("/today", async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let selections = await getAll('drugtests');
    let selection = selections.find(s => s.date && s.date.startsWith(todayStr));

    if (!selection) {
      // Generate random selection for today
      const workers = await getAll('workers');
      const testPercentage = 20; // 20% of workers
      const numToTest = Math.max(1, Math.floor(workers.length * testPercentage / 100));

      // Random selection
      const shuffled = workers.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numToTest).map(w => ({
        workerId: w.workerId,
        workerName: w.name,
        selectedAt: new Date().toISOString(),
        tested: false,
        result: "pending",
      }));

      const selectionData = {
        date: today.toISOString(),
        selectedWorkers: selected,
        selectionCriteria: { percentage: testPercentage, method: "random" },
        status: "pending",
      };

      selection = await createDoc('drugtests', selectionData);
    }

    res.json(selection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST generate selection for date ────────────────────
router.post("/generate", async (req, res) => {
  try {
    const { date, percentage = 20 } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Check if already exists
    const selections = await getAll('drugtests');
    const existing = selections.find(s => s.date && s.date.startsWith(targetDateStr));
    if (existing) return res.status(400).json({ error: "Selection already exists for this date" });

    const workers = await getAll('workers');
    const numToTest = Math.max(1, Math.floor(workers.length * percentage / 100));

    const shuffled = workers.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numToTest).map(w => ({
      workerId: w.workerId,
      workerName: w.name,
      selectedAt: new Date().toISOString(),
      tested: false,
      result: "pending",
    }));

    const selectionData = {
      date: targetDate.toISOString(),
      selectedWorkers: selected,
      selectionCriteria: { percentage, method: "random" },
      status: "pending",
    };

    const selection = await createDoc('drugtests', selectionData);
    res.status(201).json(selection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update test result ──────────────────────────────
router.put("/:id/result", async (req, res) => {
  try {
    const { workerId, result } = req.body;
    const selection = await getDoc('drugtests', req.params.id);
    if (!selection) return res.status(404).json({ error: "Selection not found" });

    const worker = selection.selectedWorkers.find(w => w.workerId === workerId);
    if (!worker) return res.status(404).json({ error: "Worker not in selection" });

    worker.tested = true;
    worker.result = result;

    // Check if all tested
    const allTested = selection.selectedWorkers.every(w => w.tested);
    if (allTested) selection.status = "completed";

    const updatedSelection = await updateDoc('drugtests', req.params.id, selection);
    res.json(updatedSelection);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE selection ────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const selection = await getDoc('drugtests', req.params.id);
    if (!selection) return res.status(404).json({ error: "Selection not found" });
    await deleteDoc('drugtests', req.params.id);
    res.json({ message: "Selection deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;