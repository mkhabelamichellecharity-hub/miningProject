import React, { useEffect, useState, useCallback } from "react";
import { getAlerts, createAlert, resolveAlert, deleteAlert, clearResolvedAlerts } from "../api/api";
import { PageHeader, Btn, Input, Select, Spinner, useToast } from "../components/UI";

const SEVERITIES = ["low", "medium", "high", "critical"];
const TYPES = ["safety", "equipment", "environmental", "geotechnical", "fire", "medical", "other"];

const SEV_COLORS = {
  low: { border: "#3b82f6", bg: "#1e3a5f22", dot: "#3b82f6", label: "#60a5fa" },
  medium: { border: "#f59e0b", bg: "#78350f22", dot: "#f59e0b", label: "#fbbf24" },
  high: { border: "#f97316", bg: "#7c2d1222", dot: "#f97316", label: "#fb923c" },
  critical: { border: "#ef4444", bg: "#7f1d1d22", dot: "#ef4444", label: "#f87171" },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: "safety", severity: "low", message: "" });
  const [filterSev, setFilterSev] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getAlerts();
      setAlerts(res.data);
    } catch (err) {
      show("Failed to load alerts: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.message.trim()) { show("Message is required", "error"); return; }
    setSubmitting(true);
    try {
      await createAlert(form);
      show("Alert created", "success");
      setForm({ ...form, message: "" });
      load();
    } catch (err) {
      show("Failed: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
      show("Alert resolved ✅", "success");
      load();
    } catch (err) {
      show("Failed: " + err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      await deleteAlert(id);
      show("Alert deleted", "success");
      load();
    } catch (err) {
      show("Failed: " + err.message, "error");
    }
  };

  const handleClearResolved = async () => {
    if (!window.confirm("Delete all resolved alerts?")) return;
    try {
      const res = await clearResolvedAlerts();
      show(`Cleared ${res.data.deleted} resolved alerts`, "success");
      load();
    } catch (err) {
      show("Failed: " + err.message, "error");
    }
  };

  const filtered = alerts.filter((a) => {
    const matchSev = filterSev === "all" || a.severity === filterSev;
    const matchResolved = showResolved ? true : !a.resolved;
    return matchSev && matchResolved;
  });

  const activeCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="🚨 Alerts"
        subtitle={`${activeCount} active · ${alerts.length} total`}
      >
        <Btn variant="ghost" small onClick={() => setShowResolved((p) => !p)}>
          {showResolved ? "Hide Resolved" : "Show Resolved"}
        </Btn>
        <Btn variant="danger" small onClick={handleClearResolved}>
          Clear Resolved
        </Btn>
      </PageHeader>

      {/* Create Form */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #334155" }}>
        <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Log New Alert
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </div>
          <div style={{ flex: 3, minWidth: 240 }}>
            <Input
              placeholder="Alert message…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <Btn onClick={handleCreate} variant="danger" disabled={submitting}>
            {submitting ? "Logging…" : "🚨 Log Alert"}
          </Btn>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", ...SEVERITIES].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSev(s)}
            style={{
              background: filterSev === s ? "#334155" : "#1e293b",
              border: `1px solid ${filterSev === s ? "#64748b" : "#334155"}`,
              color: filterSev === s ? "#f1f5f9" : "#64748b",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: filterSev === s ? 600 : 400,
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Alert Cards */}
      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
              No alerts to display.
            </div>
          )}
          {filtered.map((a) => {
            const c = SEV_COLORS[a.severity] || SEV_COLORS.low;
            return (
              <div
                key={a.id || a._id}
                style={{
                  background: a.resolved ? "#1e293b55" : c.bg,
                  border: `1px solid ${a.resolved ? "#334155" : c.border}`,
                  borderLeft: `4px solid ${a.resolved ? "#334155" : c.border}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  opacity: a.resolved ? 0.6 : 1,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ color: c.label, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                      {a.severity}
                    </span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>·</span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>{a.type}</span>
                    {a.resolved && (
                      <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>✅ Resolved</span>
                    )}
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, marginBottom: 4 }}>{a.message}</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>
                    {new Date(a.createdAt).toLocaleString()}
                    {a.resolvedAt && ` · Resolved ${new Date(a.resolvedAt).toLocaleString()}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {!a.resolved && (
                    <Btn small variant="success" onClick={() => handleResolve(a._id)}>Resolve</Btn>
                  )}
                  <Btn small variant="danger" onClick={() => handleDelete(a._id)}>Delete</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
