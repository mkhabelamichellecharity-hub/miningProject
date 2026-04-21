import React, { useEffect, useState, useCallback } from "react";
import { getLighting, updateLighting } from "../api/api";
import { PageHeader, Btn, Input, Spinner, useToast, StatCard } from "../components/UI";

export default function Lighting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ status: "All lights operational", faults: "No faults", activeLights: 42, totalLights: 42 });
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getLighting();
      setData(res.data);
      setForm({ status: res.data.status, faults: res.data.faults, activeLights: res.data.activeLights, totalLights: res.data.totalLights });
    } catch (err) {
      show("Failed to load lighting data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLighting(form);
      show("Lighting data updated", "success");
      load();
    } catch (err) {
      show("Update failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const pct = form.totalLights > 0 ? Math.round((form.activeLights / form.totalLights) * 100) : 0;
  const lightColor = pct >= 90 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="💡 Lighting"
        subtitle={data?.updatedAt ? `Last updated: ${new Date(data.updatedAt).toLocaleString()}` : ""}
      >
        <Btn onClick={handleSave} variant="primary" disabled={saving}>
          {saving ? "Saving…" : "💾 Save Changes"}
        </Btn>
      </PageHeader>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard title="Active Lights" value={`${data?.activeLights}/${data?.totalLights}`} color={lightColor} icon="💡" />
        <StatCard title="Coverage" value={`${pct}%`} color={lightColor} icon="📊" />
        <StatCard title="Status" value={data?.status} color="#3b82f6" icon="✅" />
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280, background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Light Counts
          </h3>
          {[{ label: "Active Lights", field: "activeLights" }, { label: "Total Lights", field: "totalLights" }].map(({ label, field }) => (
            <div key={field} style={{ marginBottom: 16 }}>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>{label}</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setForm((f) => ({ ...f, [field]: Math.max(0, f[field] - 1) }))}
                  style={{ background: "#334155", border: "none", color: "#e2e8f0", width: 30, height: 30, borderRadius: 6, fontSize: 16, cursor: "pointer" }}>−</button>
                <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 24, minWidth: 50, textAlign: "center" }}>{form[field]}</span>
                <button onClick={() => setForm((f) => ({ ...f, [field]: f[field] + 1 }))}
                  style={{ background: "#334155", border: "none", color: "#e2e8f0", width: 30, height: 30, borderRadius: 6, fontSize: 16, cursor: "pointer" }}>+</button>
              </div>
            </div>
          ))}
          {/* Coverage bar */}
          <div style={{ background: "#0f172a", borderRadius: 6, height: 10, overflow: "hidden", marginTop: 8 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: lightColor, transition: "width 0.4s ease", borderRadius: 6 }} />
          </div>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>{pct}% coverage</div>
        </div>

        <div style={{ flex: 1, minWidth: 280, background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155" }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>
            Status & Faults
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>System Status</label>
            <Input placeholder="System status message" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
          </div>
          <div>
            <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Faults</label>
            <Input placeholder="Fault description or 'No faults'" value={form.faults} onChange={(e) => setForm({ ...form, faults: e.target.value })} />
          </div>
          <div style={{
            marginTop: 16, padding: 12, borderRadius: 8,
            background: form.faults === "No faults" ? "#14532d33" : "#7f1d1d33",
            border: `1px solid ${form.faults === "No faults" ? "#16a34a" : "#ef4444"}`,
            color: form.faults === "No faults" ? "#4ade80" : "#f87171",
            fontSize: 13,
          }}>
            {form.faults === "No faults" ? "✅ All systems normal" : `⚠️ Fault detected: ${form.faults}`}
          </div>
        </div>
      </div>
    </div>
  );
}
