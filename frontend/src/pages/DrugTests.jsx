import React, { useEffect, useState, useCallback } from "react";
import { getWorkers, getTodaysDrugSelection, generateDrugTestSelection, updateDrugTestResult, getDrugTestSelections } from "../api/api";
import {
  PageHeader, Btn, Input, Select, Spinner,
  useToast, StatCard, Table, TR, TD,
} from "../components/UI";

// ── Main page ─────────────────────────────────────────────
export default function DrugTests() {
  const [workers, setWorkers] = useState([]);
  const [selections, setSelections] = useState([]);
  const [todaySelection, setTodaySelection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { show, ToastEl } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [wRes, sRes, tRes] = await Promise.all([
        getWorkers(),
        getDrugTestSelections({ limit: 50 }),
        getTodaysDrugSelection()
      ]);
      setWorkers(wRes.data);
      setSelections(sRes.data);
      setTodaySelection(tRes.data);
    } catch (err) { show("Load failed: " + err.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await generateDrugTestSelection({ percentage: 20 });
      show("Drug test selection generated", "success");
      loadData();
    } catch (err) {
      show("Generate failed: " + err.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleResultUpdate = async (selectionId, workerId, result) => {
    try {
      await updateDrugTestResult(selectionId, { workerId, result });
      show("Result updated", "success");
      loadData();
    } catch (err) {
      show("Update failed: " + err.message, "error");
    }
  };

  const totalSelected = selections.reduce((sum, s) => sum + s.selectedWorkers.length, 0);
  const totalTested = selections.reduce((sum, s) => sum + s.selectedWorkers.filter(w => w.tested).length, 0);
  const positiveTests = selections.reduce((sum, s) => sum + s.selectedWorkers.filter(w => w.result === "positive").length, 0);

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="💊 Random Drug Testing"
        subtitle={`${totalSelected} selected · ${totalTested} tested · ${positiveTests} positive`}
      />

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard
          title="Workers Selected"
          value={totalSelected}
          sub="For testing"
          color="#3b82f6"
          icon="🎯"
        />
        <StatCard
          title="Tests Completed"
          value={totalTested}
          sub={`of ${totalSelected} selected`}
          color="#22c55e"
          icon="✅"
        />
        <StatCard
          title="Positive Results"
          value={positiveTests}
          sub="Failed tests"
          color="#ef4444"
          icon="🚫"
        />
        <StatCard
          title="Completion Rate"
          value={totalSelected > 0 ? Math.round((totalTested / totalSelected) * 100) + "%" : "—"}
          sub="Tests done"
          color="#f59e0b"
          icon="📊"
        />
      </div>

      {/* Today's Selection */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155", marginBottom: 24 }}>
        <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Today's Random Selection ({new Date().toLocaleDateString()})
        </h3>

        {loading ? (
          <Spinner />
        ) : todaySelection ? (
          <div>
            <div style={{ marginBottom: 16, color: "#64748b" }}>
              {todaySelection.selectedWorkers.length} workers selected for testing ({todaySelection.selectionCriteria.percentage}% of workforce)
            </div>
            <Table headers={["Worker", "Status", "Result", "Actions"]}>
              {todaySelection.selectedWorkers.map((w) => (
                <TR key={w.workerId}>
                  <TD>
                    <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{w.workerName}</span><br />
                    <code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{w.workerId}</code>
                  </TD>
                  <TD>
                    <span style={{
                      color: w.tested ? "#22c55e" : "#f59e0b",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: 12
                    }}>
                      {w.tested ? "TESTED" : "PENDING"}
                    </span>
                  </TD>
                  <TD>
                    {w.result === "positive" && <span style={{ color: "#ef4444", fontWeight: 600 }}>POSITIVE</span>}
                    {w.result === "negative" && <span style={{ color: "#22c55e", fontWeight: 600 }}>NEGATIVE</span>}
                    {!w.result && <span style={{ color: "#64748b" }}>—</span>}
                  </TD>
                  <TD>
                    {!w.tested && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn small variant="success" onClick={() => handleResultUpdate(todaySelection._id, w.workerId, "negative")}>
                          Negative
                        </Btn>
                        <Btn small variant="danger" onClick={() => handleResultUpdate(todaySelection._id, w.workerId, "positive")}>
                          Positive
                        </Btn>
                      </div>
                    )}
                  </TD>
                </TR>
              ))}
            </Table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ color: "#64748b", marginBottom: 16 }}>No selection generated for today</div>
            <Btn onClick={handleGenerate} variant="primary" disabled={generating}>
              {generating ? "Generating…" : "Generate Today's Selection"}
            </Btn>
          </div>
        )}
      </div>

      {/* Historical Selections */}
      <div>
        <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Historical Selections
        </h3>

        {loading ? (
          <Spinner />
        ) : selections.length > 0 ? (
          <Table headers={["Date", "Selected", "Tested", "Positive", "Status"]}>
            {selections.map((s) => {
              const tested = s.selectedWorkers.filter(w => w.tested).length;
              const positive = s.selectedWorkers.filter(w => w.result === "positive").length;
              return (
                <TR key={s.id || s._id}>
                  <TD>{new Date(s.date).toLocaleDateString()}</TD>
                  <TD>{s.selectedWorkers.length}</TD>
                  <TD>{tested}</TD>
                  <TD><span style={{ color: positive > 0 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{positive}</span></TD>
                  <TD>
                    <span style={{
                      color: s.status === "completed" ? "#22c55e" : "#f59e0b",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: 12
                    }}>
                      {s.status}
                    </span>
                  </TD>
                </TR>
              );
            })}
          </Table>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
            No historical selections yet
          </div>
        )}
      </div>
    </div>
  );
}