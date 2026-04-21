import React, { useEffect, useState, useCallback } from "react";
import { getGeo, updateGeo } from "../api/api";
import { PageHeader, Btn, Input, Select, Spinner, StatusBadge, useToast, StatCard } from "../components/UI";

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

function GaugeBar({ value, label }) {
  const color = value >= 90 ? "#22c55e" : value >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#94a3b8", fontSize: 14 }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontSize: 18 }}>{value}%</span>
      </div>
      <div style={{ background: "#0f172a", borderRadius: 8, height: 16, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 8, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

export default function Geotechnical() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ stability: 95, lastSeismicEvent: "None", riskLevel: "Low" });
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getGeo();
      setData(res.data);
      setForm({ stability: res.data.stability, lastSeismicEvent: res.data.lastSeismicEvent, riskLevel: res.data.riskLevel });
    } catch (err) {
      show("Failed to load geo data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGeo(form);
      show("Geotechnical data updated", "success");
      load();
    } catch (err) {
      show("Update failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="🪨 Geotechnical"
        subtitle={data?.updatedAt ? `Last updated: ${new Date(data.updatedAt).toLocaleString()}` : ""}
      >
        <Btn onClick={handleSave} variant="primary" disabled={saving}>
          {saving ? "Saving…" : "💾 Save Changes"}
        </Btn>
      </PageHeader>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard title="Ground Stability" value={`${data?.stability}%`} color={data?.stability >= 80 ? "#22c55e" : "#ef4444"} icon="🪨" />
        <StatCard title="Risk Level" value={data?.riskLevel} color="#f59e0b" icon="⚠️" />
        <StatCard title="Last Seismic Event" value={data?.lastSeismicEvent} color="#a78bfa" icon="📡" />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Stability Control */}
        <div style={{ flex: 1, minWidth: 280, background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Ground Stability
          </h3>
          <GaugeBar value={form.stability} label="Current Stability" />
          <input
            type="range" min={0} max={100} value={form.stability}
            onChange={(e) => setForm({ ...form, stability: Number(e.target.value) })}
            style={{ width: "100%", marginTop: 16, accentColor: "#3b82f6", cursor: "pointer" }}
          />
          <div style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>
            {form.stability >= 90 ? "✅ Safe — normal operations" : form.stability >= 70 ? "⚠️ Caution — monitor closely" : "🚨 Danger — consider evacuation"}
          </div>
        </div>

        {/* Risk and Seismic */}
        <div style={{ flex: 1, minWidth: 280, background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Risk Assessment
          </h3>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Risk Level</label>
            <Select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}>
              {RISK_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <div style={{ marginTop: 8 }}><StatusBadge status={form.riskLevel} /></div>
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Last Seismic Event</label>
            <Input
              placeholder="e.g. 2.1 magnitude at 14:32"
              value={form.lastSeismicEvent}
              onChange={(e) => setForm({ ...form, lastSeismicEvent: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
