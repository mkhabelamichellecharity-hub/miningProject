import React, { useEffect, useState, useCallback } from "react";
import { getMaterial, updateMaterial } from "../api/api";
import { PageHeader, Btn, Select, Spinner, StatusBadge, useToast } from "../components/UI";

const CONVEYOR_STATES = ["Running", "Stopped", "Maintenance", "Fault"];

function ProgressBar({ value, color = "#3b82f6" }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 6, height: 12, overflow: "hidden", marginTop: 6 }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          background: value > 70 ? "#ef4444" : value > 40 ? "#f59e0b" : color,
          borderRadius: 6,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

export default function Material() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ conveyor1: "Running", conveyor2: "Running", stockpileA: 45, stockpileB: 30 });
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getMaterial();
      setData(res.data);
      setForm({
        conveyor1: res.data.conveyor1,
        conveyor2: res.data.conveyor2,
        stockpileA: res.data.stockpileA,
        stockpileB: res.data.stockpileB,
      });
    } catch (err) {
      show("Failed to load material data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMaterial(form);
      show("Material handling updated", "success");
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
        title="⚙️ Material Handling"
        subtitle={data?.updatedAt ? `Last updated: ${new Date(data.updatedAt).toLocaleString()}` : ""}
      >
        <Btn onClick={handleSave} variant="primary" disabled={saving}>
          {saving ? "Saving…" : "💾 Save Changes"}
        </Btn>
      </PageHeader>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {/* Conveyors */}
        <div style={{ flex: 1, minWidth: 280, background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Conveyor Belts
          </h3>
          {["conveyor1", "conveyor2"].map((key, i) => (
            <div key={key} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Conveyor {i + 1}</span>
                <StatusBadge status={form[key]} />
              </div>
              <Select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
                {CONVEYOR_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          ))}
        </div>

        {/* Stockpiles */}
        <div style={{ flex: 1, minWidth: 280, background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Stockpile Levels
          </h3>
          {[{ key: "stockpileA", label: "Stockpile A" }, { key: "stockpileB", label: "Stockpile B" }].map(({ key, label }) => (
            <div key={key} style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{label}</span>
                <span style={{ color: "#94a3b8", fontWeight: 700 }}>{form[key]}%</span>
              </div>
              <ProgressBar value={form[key]} />
              <input
                type="range"
                min={0}
                max={100}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                style={{ width: "100%", marginTop: 8, accentColor: "#3b82f6", cursor: "pointer" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
