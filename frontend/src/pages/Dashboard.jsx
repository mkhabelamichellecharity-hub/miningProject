import React, { useEffect, useState, useCallback } from "react";
import { getWorkers, getTools, getAlerts, getDispatch, getGeo, getLighting, getSensors } from "../api/api";
import { StatCard, Spinner, PageHeader } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    try {
      const [w, t, a, d, g, l, s] = await Promise.all([
        getWorkers(), getTools(), getAlerts(), getDispatch(), getGeo(), getLighting(), getSensors(),
      ]);
      setData({
        workers: w.data,
        tools: t.data,
        alerts: a.data,
        dispatch: d.data,
        geo: g.data,
        lighting: l.data,
        sensors: s.data || [],
      });
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Dashboard load error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <Spinner />;
  if (!data) return <div style={{ color: "#f87171" }}>Failed to load dashboard data. Is the backend running?</div>;

  const checkedIn = data.workers.filter((w) => w.status === "checked-in").length;
  const activeAlerts = data.alerts.filter((a) => !a.resolved).length;
  const availableTools = data.tools.filter((t) => t.status === "available").length;
  const activeSensors = data.sensors.filter((s) => s.status === "active").length;
  const helmetSensors = data.sensors.filter((s) => s.type === "helmet").length;
  const beltSensors = data.sensors.filter((s) => s.type === "belt").length;

  const toolStatusData = ["available", "assigned", "maintenance", "lost"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: data.tools.filter((t) => t.status === s).length,
  }));

  const alertSeverityData = ["low", "medium", "high", "critical"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    count: data.alerts.filter((a) => a.severity === s && !a.resolved).length,
  }));

  return (
    <div>
      <PageHeader
        title="⛏️ Operations Dashboard"
        subtitle={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
      >
        <button
          onClick={load}
          style={{
            background: "#1e293b", border: "1px solid #334155", color: "#94a3b8",
            padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
          }}
        >
          🔄 Refresh
        </button>
      </PageHeader>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard title="Workers On-Site" value={checkedIn} sub={`of ${data.workers.length} total`} color="#3b82f6" icon="👷" />
        <StatCard title="Active Sensors" value={activeSensors} sub={`${helmetSensors} helmets · ${beltSensors} belts`} color="#22c55e" icon="📡" />
        <StatCard title="Active Alerts" value={activeAlerts} sub={`${data.alerts.length} total logged`} color={activeAlerts > 0 ? "#ef4444" : "#22c55e"} icon="🚨" />
        <StatCard title="Available Tools" value={availableTools} sub={`of ${data.tools.length} total`} color="#22c55e" icon="🔧" />
        <StatCard title="Trucks En Route" value={data.dispatch?.trucksEnRoute ?? "—"} sub={`Avg cycle: ${data.dispatch?.avgCycleTime ?? "—"} min`} color="#f59e0b" icon="🚛" />
        <StatCard title="Ground Stability" value={`${data.geo?.stability ?? "—"}%`} sub={`Risk: ${data.geo?.riskLevel ?? "—"}`} color={data.geo?.stability >= 80 ? "#22c55e" : "#ef4444"} icon="🪨" />
        <StatCard title="Lighting" value={`${data.lighting?.activeLights ?? "—"}/${data.lighting?.totalLights ?? "—"}`} sub={data.lighting?.faults ?? "—"} color="#a78bfa" icon="💡" />
      </div>

      {/* Charts Row */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Tool Status Pie */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, flex: 1, minWidth: 280 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            Tool Status
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={toolStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                {toolStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Severity Bar */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, flex: 1, minWidth: 280 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            Active Alerts by Severity
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={alertSeverityData}>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, flex: 1, minWidth: 280 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            Recent Alerts
          </h3>
          {data.alerts.slice(0, 5).length === 0 ? (
            <p style={{ color: "#475569", fontSize: 14 }}>No alerts yet.</p>
          ) : (
            data.alerts.slice(0, 5).map((a) => {
              const col = { low: "#3b82f6", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" }[a.severity] || "#94a3b8";
              return (
                <div key={a._id} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 13 }}>{a.message}</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>
                      {a.severity} · {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
