import React, { useEffect, useState, useCallback } from "react";
import { getWorkers, submitAlcoholReading, getAlcoholReadings, overrideAlcoholReading, deleteAlcoholReading } from "../api/api";
import {
  PageHeader, Btn, Input, Select, Spinner,
  useToast, StatCard, Table, TR, TD,
} from "../components/UI";

// ── Constants ─────────────────────────────────────────────
const RANGES = {
  alcohol: { normal: "<0.02 mg/100ml", warning: "0.02–0.04", critical: ">0.04 (FAIL)" },
};

const SC = { normal: "#22c55e", warning: "#f59e0b", critical: "#ef4444", pass: "#22c55e", fail: "#ef4444", "not-tested": "#475569", fit: "#22c55e", caution: "#f59e0b", unfit: "#ef4444" };
const SB = { normal: "#14532d33", warning: "#78350f33", critical: "#7f1d1d33", pass: "#14532d33", fail: "#7f1d1d33", fit: "#14532d33", caution: "#78350f33", unfit: "#7f1d1d33" };

// ── Sub-components ────────────────────────────────────────
function VitalCard({ label, value, unit, status }) {
  const col = SC[status] || "#94a3b8";
  return (
    <div style={{ background: SB[status] || "#1e293b33", border: `1px solid ${col}44`, borderLeft: `4px solid ${col}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 130 }}>
      <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ color: col, fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value || "—"}{value ? unit : ""}</div>
      <div style={{ color: col, fontSize: 11, marginTop: 4, fontWeight: 600, textTransform: "uppercase" }}>{status}</div>
    </div>
  );
}

function FitnessBadge({ status, blockReason }) {
  const map = {
    fit: { bg: "#14532d", color: "#4ade80", icon: "✅", label: "FIT FOR WORK" },
    caution: { bg: "#78350f", color: "#fbbf24", icon: "⚠️", label: "CLEARED — CAUTION" },
    unfit: { bg: "#7f1d1d", color: "#f87171", icon: "🚫", label: "UNFIT — ENTRY BLOCKED" },
  };
  const s = map[status] || map.fit;
  return (
    <div>
      <div style={{ background: s.bg, color: s.color, padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}>
        {s.icon} {s.label}
      </div>
      {blockReason && (
        <div style={{ color: "#f87171", fontSize: 12, marginTop: 6, fontWeight: 500 }}>
          Reason: {blockReason}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <h3 style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #1e293b" }}>
      {title}
    </h3>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <label style={{ color: "#64748b", fontSize: 12, display: "block", marginBottom: 6 }}>
      {children}
      {hint && <span style={{ color: "#334155", marginLeft: 6, fontStyle: "italic" }}>{hint}</span>}
    </label>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function Alcohol() {
  const [workers, setWorkers] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [tab, setTab] = useState("submit");
  const [supervisorModal, setSupervisorModal] = useState(null);
  const [overrideModal, setOverrideModal] = useState(null);
  const { show, ToastEl } = useToast();

  const emptyForm = {
    workerId: "", workerName: "", checkType: "check-in",
    alcoholValue: "", alcoholMethod: "breathalyser",
    supervisorName: "", notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const loadData = useCallback(async () => {
    try {
      const [wRes, rRes] = await Promise.all([getWorkers(), getAlcoholReadings({ limit: 200 })]);
      setWorkers(wRes.data);
      setReadings(rRes.data);
    } catch (err) { show("Load failed: " + err.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!form.workerId.trim() || !form.workerName.trim()) {
      show("Worker ID and Name are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const data = await submitAlcoholReading(form);
      show("Alcohol reading submitted successfully", "success");
      setLastResult(data.data);
      setForm(emptyForm);
      loadData();
    } catch (err) {
      show("Submit failed: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideModal.supervisorName.trim()) {
      show("Supervisor name is required", "error");
      return;
    }
    try {
      await overrideAlcoholReading(overrideModal.id, {
        supervisorName: overrideModal.supervisorName,
        overrideReason: overrideModal.reason,
        newStatus: overrideModal.newStatus,
      });
      show("Reading overridden", "success");
      setOverrideModal(null);
      loadData();
    } catch (err) {
      show("Override failed: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this alcohol reading?")) return;
    try {
      await deleteAlcoholReading(id);
      show("Reading deleted", "success");
      loadData();
    } catch (err) {
      show("Delete failed: " + err.message, "error");
    }
  };

  const filtered = readings.filter(r => !form.workerId || r.workerId === form.workerId);
  const failed = readings.filter(r => r.alcoholTest.status === "fail").length;
  const passed = readings.filter(r => r.alcoholTest.status === "pass").length;

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="🍺 Alcohol Testing"
        subtitle={`${readings.length} tests · ${passed} passed · ${failed} failed`}
      />

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard
          title="Tests Passed"
          value={passed}
          sub={`of ${readings.length} total`}
          color="#22c55e"
          icon="✅"
        />
        <StatCard
          title="Tests Failed"
          value={failed}
          sub="Entry blocked"
          color="#ef4444"
          icon="🚫"
        />
        <StatCard
          title="Pass Rate"
          value={readings.length > 0 ? Math.round((passed / readings.length) * 100) + "%" : "—"}
          sub="Overall"
          color="#3b82f6"
          icon="📊"
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Btn variant={tab === "submit" ? "primary" : "secondary"} onClick={() => setTab("submit")}>Submit Test</Btn>
        <Btn variant={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>Test History</Btn>
      </div>

      {tab === "submit" && (
        <div style={{ display: "flex", gap: 24 }}>
          {/* Form */}
          <div style={{ flex: 1, maxWidth: 400 }}>
            <SectionHeader title="Submit Alcohol Test" />
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Worker</FieldLabel>
                <Select
                  value={form.workerId}
                  onChange={(e) => {
                    const w = workers.find(w => w.workerId === e.target.value);
                    f("workerId", e.target.value);
                    f("workerName", w ? w.name : "");
                  }}
                >
                  <option value="">Select Worker</option>
                  {workers.map(w => <option key={w.workerId || w.id || w._id} value={w.workerId}>{w.name} ({w.workerId})</option>)}
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Check Type</FieldLabel>
                <Select value={form.checkType} onChange={(e) => f("checkType", e.target.value)}>
                  <option value="check-in">Check-In</option>
                  <option value="check-out">Check-Out</option>
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Alcohol Level (mg/100ml)</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.015"
                  value={form.alcoholValue}
                  onChange={(e) => f("alcoholValue", e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Test Method</FieldLabel>
                <Select value={form.alcoholMethod} onChange={(e) => f("alcoholMethod", e.target.value)}>
                  <option value="breathalyser">Breathalyser</option>
                  <option value="blood">Blood Test</option>
                </Select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <FieldLabel>Supervisor Name (optional)</FieldLabel>
                <Input
                  placeholder="Supervisor overseeing test"
                  value={form.supervisorName}
                  onChange={(e) => f("supervisorName", e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <FieldLabel>Notes</FieldLabel>
                <Input
                  placeholder="Additional notes"
                  value={form.notes}
                  onChange={(e) => f("notes", e.target.value)}
                />
              </div>
              <Btn onClick={handleSubmit} variant="success" disabled={submitting} style={{ width: "100%" }}>
                {submitting ? "Submitting…" : "Submit Alcohol Test"}
              </Btn>
            </div>

            {/* Last Result */}
            {lastResult && (
              <div style={{ marginTop: 24 }}>
                <SectionHeader title="Last Test Result" />
                <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    <VitalCard label="Alcohol Level" value={lastResult.alcoholTest.value} unit=" mg/100ml" status={lastResult.alcoholTest.status} />
                  </div>
                  <FitnessBadge status={lastResult.overallStatus} blockReason={lastResult.blockReason} />
                </div>
              </div>
            )}
          </div>

          {/* Ranges */}
          <div style={{ flex: 1, maxWidth: 400 }}>
            <SectionHeader title="Alcohol Test Ranges" />
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>PASS: &lt; 0.02 mg/100ml</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Safe to work</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4 }}>WARNING: 0.02 – 0.04 mg/100ml</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Caution advised</div>
              </div>
              <div>
                <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>FAIL: &gt; 0.04 mg/100ml</div>
                <div style={{ color: "#94a3b8", fontSize: 14 }}>Entry blocked</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div>
          <SectionHeader title="Test History" />
          {loading ? (
            <Spinner />
          ) : (
            <Table headers={["Worker", "Check Type", "Alcohol Level", "Status", "Fitness", "Date", "Actions"]}>
              {filtered.map((r) => (
                <TR key={r.id || r._id}>
                  <TD><span style={{ fontWeight: 600, color: "#f1f5f9" }}>{r.workerName}</span><br /><code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{r.workerId}</code></TD>
                  <TD>{r.checkType}</TD>
                  <TD>{r.alcoholTest.value ? `${r.alcoholTest.value} mg/100ml` : "—"}</TD>
                  <TD><span style={{ color: SC[r.alcoholTest.status], fontWeight: 600, textTransform: "uppercase", fontSize: 12 }}>{r.alcoholTest.status}</span></TD>
                  <TD><FitnessBadge status={r.overallStatus} blockReason={r.blockReason} /></TD>
                  <TD>{new Date(r.createdAt).toLocaleString()}</TD>
                  <TD>
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.overallStatus === "unfit" && (
                        <Btn small variant="warning" onClick={() => setOverrideModal({ id: r._id, supervisorName: "", reason: "", newStatus: "fit" })}>
                          Override
                        </Btn>
                      )}
                      <Btn small variant="danger" onClick={() => handleDelete(r._id)}>
                        Delete
                      </Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* Override Modal */}
      {overrideModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155", maxWidth: 400, width: "100%" }}>
            <h3 style={{ color: "#f1f5f9", marginBottom: 16 }}>Override Alcohol Test</h3>
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>Supervisor Name</FieldLabel>
              <Input
                value={overrideModal.supervisorName}
                onChange={(e) => setOverrideModal(p => ({ ...p, supervisorName: e.target.value }))}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <FieldLabel>New Status</FieldLabel>
              <Select
                value={overrideModal.newStatus}
                onChange={(e) => setOverrideModal(p => ({ ...p, newStatus: e.target.value }))}
              >
                <option value="fit">Fit for Work</option>
                <option value="caution">Caution</option>
                <option value="unfit">Unfit</option>
              </Select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <FieldLabel>Override Reason</FieldLabel>
              <Input
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal(p => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn onClick={handleOverride} variant="success">Override</Btn>
              <Btn onClick={() => setOverrideModal(null)} variant="secondary">Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}