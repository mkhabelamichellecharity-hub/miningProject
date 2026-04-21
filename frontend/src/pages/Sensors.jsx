import React, { useEffect, useState, useCallback } from "react";
import { getSensors, updateSensorStatus, getWorkers } from "../api/api";
import {
  PageHeader, Btn, Input, Select, Spinner, StatusBadge,
  Table, TR, TD, useToast, StatCard,
} from "../components/UI";

const SENSOR_TYPES = ["helmet", "belt"];
const SENSOR_STATUS = ["active", "inactive", "maintenance", "fault"];
const LOCATIONS = ["Surface", "Level 1", "Level 2", "Level 3", "Shaft", "Stockpile", "Workshop"];

export default function Sensors() {
  const [sensors, setSensors] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const [sensorsRes, workersRes] = await Promise.all([
        getSensors(),
        getWorkers()
      ]);
      setSensors(sensorsRes.data || []);
      setWorkers(workersRes.data || []);
    } catch (err) {
      show("Failed to load data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (sensorId, newStatus) => {
    try {
      await updateSensorStatus(sensorId, { status: newStatus });
      show("Sensor status updated successfully", "success");
      load();
    } catch (err) {
      show("Failed to update sensor: " + err.message, "error");
    }
  };

  const filtered = sensors.filter((s) => {
    const matchesSearch = 
      s.sensorId?.toLowerCase().includes(search.toLowerCase()) ||
      s.workerName?.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || s.type === filterType;
    const matchesStatus = !filterStatus || s.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const activeSensors = sensors.filter((s) => s.status === "active").length;
  const helmetSensors = sensors.filter((s) => s.type === "helmet").length;
  const beltSensors = sensors.filter((s) => s.type === "belt").length;

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="📡 Sensor Monitoring"
        subtitle={`${activeSensors} active · ${sensors.length} total`}
      />

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard title="Active Sensors" value={activeSensors} sub={`of ${sensors.length} total`} color="#22c55e" icon="&#x1F521;" />
        <StatCard title="Helmet Sensors" value={helmetSensors} sub="Safety monitoring" color="#3b82f6" icon="&#x26D1;&#xFE0F;" />
        <StatCard title="Belt Sensors" value={beltSensors} sub="Vital monitoring" color="#a78bfa" icon="&#x1F517;" />
        <StatCard title="Workers Tracked" value={sensors.filter(s => s.workerName).length} sub={`of ${workers.length} workers`} color="#f59e0b" icon="&#x1F477;" />
        <StatCard title="Fault Sensors" value={sensors.filter(s => s.status === "fault").length} sub="Need attention" color="#ef4444" icon="&#x26A0;&#xFE0F;" />
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#1e293b", borderRadius: 12, padding: 20,
          marginBottom: 24, border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
              🔍 Search
            </label>
            <Input
              placeholder="Search by sensor ID, worker, or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Sensor Type
            </label>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {SENSOR_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </Select>
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
              Status
            </label>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              {SENSOR_STATUS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
          </div>
          <Btn onClick={() => { setSearch(""); setFilterType(""); setFilterStatus(""); }} variant="ghost">
            Clear Filters
          </Btn>
        </div>
      </div>

      {/* Worker Tracking Panel */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 2, minWidth: 300 }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
              &#x1F477; Worker Sensor Assignments
            </h3>
            <Table headers={["Worker Name", "Worker ID", "Helmet Sensor", "Belt Sensor", "Location", "Status"]}>
              {workers.filter(w => w.status === "checked-in").slice(0, 6).map((worker) => {
                const helmetSensor = sensors.find(s => s.workerName === worker.name && s.type === "helmet");
                const beltSensor = sensors.find(s => s.workerName === worker.name && s.type === "belt");
                return (
                  <TR key={worker._id}>
                    <TD><span style={{ fontWeight: 600, color: "#f1f5f9" }}>{worker.name}</span></TD>
                    <TD><code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{worker.workerId}</code></TD>
                    <TD>
                      {helmetSensor ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#3b82f6" }}>
                          &#x26D1;&#xFE0F; {helmetSensor.sensorId}
                        </span>
                      ) : (
                        <span style={{ color: "#475569" }}>&mdash;</span>
                      )}
                    </TD>
                    <TD>
                      {beltSensor ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#a78bfa" }}>
                          &#x1F517; {beltSensor.sensorId}
                        </span>
                      ) : (
                        <span style={{ color: "#475569" }}>&mdash;</span>
                      )}
                    </TD>
                    <TD>{worker.location}</TD>
                    <TD><StatusBadge status={worker.status} /></TD>
                  </TR>
                );
              })}
            </Table>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155", marginBottom: 16 }}>
            <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
              &#x1F521; Sensor Coverage
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontSize: 12 }}>Workers with Helmets</span>
                <span style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600 }}>
                  {workers.filter(w => sensors.some(s => s.workerName === w.name && s.type === "helmet")).length}/{workers.length}
                </span>
              </div>
              <div style={{ background: "#334155", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ 
                  width: `${workers.length > 0 ? (workers.filter(w => sensors.some(s => s.workerName === w.name && s.type === "helmet")).length / workers.length * 100) : 0}%`, 
                  height: "100%", 
                  background: "#3b82f6", 
                  borderRadius: 4 
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontSize: 12 }}>Workers with Belts</span>
                <span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>
                  {workers.filter(w => sensors.some(s => s.workerName === w.name && s.type === "belt")).length}/{workers.length}
                </span>
              </div>
              <div style={{ background: "#334155", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ 
                  width: `${workers.length > 0 ? (workers.filter(w => sensors.some(s => s.workerName === w.name && s.type === "belt")).length / workers.length * 100) : 0}%`, 
                  height: "100%", 
                  background: "#a78bfa", 
                  borderRadius: 4 
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#e2e8f0", fontSize: 12 }}>Full Equipment</span>
                <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 600 }}>
                  {workers.filter(w => 
                    sensors.some(s => s.workerName === w.name && s.type === "helmet") && 
                    sensors.some(s => s.workerName === w.name && s.type === "belt")
                  ).length}/{workers.length}
                </span>
              </div>
              <div style={{ background: "#334155", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{ 
                  width: `${workers.length > 0 ? (workers.filter(w => 
                    sensors.some(s => s.workerName === w.name && s.type === "helmet") && 
                    sensors.some(s => s.workerName === w.name && s.type === "belt")
                  ).length / workers.length * 100) : 0}%`, 
                  height: "100%", 
                  background: "#22c55e", 
                  borderRadius: 4 
                }} />
              </div>
            </div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
              &#x1F4E1; Location Tracking
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["Surface", "Level 1", "Level 2", "Shaft"].map((location) => {
                const workersAtLocation = workers.filter(w => w.location === location && w.status === "checked-in");
                const trackedWorkers = workersAtLocation.filter(w => sensors.some(s => s.workerName === w.name));
                return (
                  <div key={location} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#e2e8f0", fontSize: 12 }}>{location}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "#4ade80", fontSize: 11 }}>{trackedWorkers.length}</span>
                      <span style={{ color: "#475569", fontSize: 11 }}>/</span>
                      <span style={{ color: "#e2e8f0", fontSize: 11 }}>{workersAtLocation.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : (
        <Table headers={["Sensor ID", "Type", "Worker", "Status", "Location", "Battery", "Last Signal", "Actions"]}>
          {filtered.map((sensor) => (
            <TR key={sensor._id}>
              <TD>
                <code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>
                  {sensor.sensorId}
                </code>
              </TD>
              <TD>
                <span style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 6,
                  color: sensor.type === "helmet" ? "#3b82f6" : "#a78bfa"
                }}>
                  {sensor.type === "helmet" ? "⛑️" : "🔗"}
                  {sensor.type.charAt(0).toUpperCase() + sensor.type.slice(1)}
                </span>
              </TD>
              <TD>{sensor.workerName || <span style={{ color: "#475569" }}>—</span>}</TD>
              <TD><StatusBadge status={sensor.status} /></TD>
              <TD>{sensor.location}</TD>
              <TD>
                <span style={{ 
                  color: sensor.batteryLevel > 50 ? "#4ade80" : sensor.batteryLevel > 20 ? "#fbbf24" : "#ef4444"
                }}>
                  {sensor.batteryLevel || 0}%
                </span>
              </TD>
              <TD>
                {sensor.lastSignal
                  ? new Date(sensor.lastSignal).toLocaleString()
                  : <span style={{ color: "#475569" }}>—</span>}
              </TD>
              <TD>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Select
                    value={sensor.status}
                    onChange={(e) => handleStatusUpdate(sensor._id, e.target.value)}
                    style={{ padding: "4px 8px", fontSize: 12 }}
                  >
                    {SENSOR_STATUS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </Select>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
          {search || filterType || filterStatus 
            ? "No sensors match your filters." 
            : "No sensors found. Check in workers to activate their sensors."}
        </div>
      )}
    </div>
  );
}
