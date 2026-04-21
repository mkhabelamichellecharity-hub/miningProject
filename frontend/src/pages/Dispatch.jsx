import React, { useEffect, useState, useCallback } from "react";
import { getDispatch, updateDispatch } from "../api/api";
import { PageHeader, Btn, Spinner, useToast, StatCard } from "../components/UI";

export default function Dispatch() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ trucksEnRoute: 3, avgCycleTime: 18, activeDrivers: 5 });
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getDispatch();
      setData(res.data);
      setForm({
        trucksEnRoute: res.data.trucksEnRoute,
        avgCycleTime: res.data.avgCycleTime,
        activeDrivers: res.data.activeDrivers,
      });
    } catch (err) {
      show("Failed to load dispatch: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDispatch(form);
      show("Dispatch data updated", "success");
      load();
    } catch (err) {
      show("Update failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const NumberInput = ({ label, field, min = 0, max = 100 }) => (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, border: "1px solid #334155", flex: 1, minWidth: 200 }}>
      <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
        <button
          onClick={() => setForm((f) => ({ ...f, [field]: Math.max(min, f[field] - 1) }))}
          style={{ background: "#334155", border: "none", color: "#e2e8f0", width: 32, height: 32, borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 700 }}
        >−</button>
        <span style={{ color: "#f1f5f9", fontSize: 32, fontWeight: 700, minWidth: 60, textAlign: "center" }}>
          {form[field]}
        </span>
        <button
          onClick={() => setForm((f) => ({ ...f, [field]: Math.min(max, f[field] + 1) }))}
          style={{ background: "#334155", border: "none", color: "#e2e8f0", width: 32, height: 32, borderRadius: 6, fontSize: 18, cursor: "pointer", fontWeight: 700 }}
        >+</button>
      </div>
    </div>
  );

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="🚛 Dispatch"
        subtitle={data?.updatedAt ? `Last updated: ${new Date(data.updatedAt).toLocaleString()}` : ""}
      >
        <Btn onClick={handleSave} variant="primary" disabled={saving}>
          {saving ? "Saving…" : "💾 Save Changes"}
        </Btn>
      </PageHeader>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard title="Trucks En Route" value={data?.trucksEnRoute} color="#f59e0b" icon="🚛" />
        <StatCard title="Avg Cycle Time" value={`${data?.avgCycleTime} min`} color="#3b82f6" icon="⏱️" />
        <StatCard title="Active Drivers" value={data?.activeDrivers} color="#22c55e" icon="🧑‍✈️" />
      </div>

      {/* Edit Controls */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <NumberInput label="Trucks En Route" field="trucksEnRoute" min={0} max={50} />
        <NumberInput label="Avg Cycle Time (min)" field="avgCycleTime" min={1} max={120} />
        <NumberInput label="Active Drivers" field="activeDrivers" min={0} max={100} />
      </div>
    </div>
  );
}
