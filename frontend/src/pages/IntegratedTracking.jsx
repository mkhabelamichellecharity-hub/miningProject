import React, { useEffect, useState, useRef } from "react";
import {
  getActiveTrackers,
  getWorkerTracker,
  updateHelmetData,
  updateBeltLocation,
  syncTrackers,
  getTrackerHistory,
  getTrackerAlerts,
  resolveTrackerAlert,
  checkoutTracker,
} from "../api/api";
import { PageHeader, Btn, Input, Spinner, useToast, StatCard, StatusBadge, Table, TR, TD } from "../components/UI";

// ── Palette ───────────────────────────────────────────────
const C = {
  bg: "#0f172a",
  panel: "#1e293b",
  border: "#334155",
  text: "#e2e8f0",
  muted: "#64748b",
  dim: "#334155",
  green: "#22c55e",
  yellow: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a78bfa",
  cyan: "#06b6d4",
};

// ── Real-Time Signal Indicator ────────────────────────────
function SignalIndicator({ strength = 100 }) {
  const bars = Math.ceil(strength / 25);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: (i + 1) * 4,
            background: i < bars ? C.green : C.dim,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

// ── Live Map Display ──────────────────────────────────────
function LiveMap({ beltLocation }) {
  const canvasRef = useRef(null);
  const W = 400;
  const H = 400;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !beltLocation?.latitude) return;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = C.panel;
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, W, H);

    // Center dot
    const cx = W / 2;
    const cy = H / 2;
    ctx.fillStyle = C.cyan;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Accuracy circle
    const accuracy = beltLocation.accuracy || 10;
    const scale = H / 100;
    ctx.strokeStyle = C.blue + "44";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, accuracy * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Heading indicator
    const heading = (beltLocation.heading || 0) * (Math.PI / 180);
    const len = 30;
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(heading) * len, cy - Math.cos(heading) * len);
    ctx.stroke();

    // Text info
    ctx.fillStyle = C.muted;
    ctx.font = "11px monospace";
    ctx.fillText(`Lat: ${beltLocation.latitude?.toFixed(4)}`, 10, 20);
    ctx.fillText(`Lon: ${beltLocation.longitude?.toFixed(4)}`, 10, 35);
    ctx.fillText(`Accuracy: ${accuracy}m`, 10, 50);
  }, [beltLocation]);

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} width={W} height={H} style={{ display: "block" }} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────
export default function IntegratedTracking() {
  const [trackers, setTrackers] = useState([]);
  const [selectedTracker, setSelectedTracker] = useState(null);
  const [trackerDetails, setTrackerDetails] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const toast = useToast();

  // ── Fetch trackers ─────────────────────────────────────
  useEffect(() => {
    fetchTrackers();
  }, []);

  // ── Auto-refresh ───────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (selectedTracker) {
        fetchTrackerDetails(selectedTracker);
      } else {
        fetchTrackers();
      }
    }, 500); // 2Hz refresh rate
    return () => clearInterval(interval);
  }, [autoRefresh, selectedTracker]);

  const fetchTrackers = async () => {
    try {
      setLoading(true);
      const response = await getActiveTrackers();
      setTrackers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast?.("Failed to load trackers", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrackerDetails = async (trackerId) => {
    try {
      const response = await getWorkerTracker(trackerId);
      setTrackerDetails(response.data);

      // Fetch history
      const histResponse = await getTrackerHistory(trackerId, 50);
      setHistory(histResponse.data.history || []);

      // Fetch alerts
      const alertResponse = await getTrackerAlerts(trackerId);
      setAlerts(alertResponse.data.alerts || []);
    } catch (error) {
      toast?.(error.message || "Failed to load tracker details", "error");
    }
  };

  const handleSelectTracker = (tracker) => {
    setSelectedTracker(tracker.workerId);
    setTrackerDetails(tracker);
    fetchTrackerDetails(tracker.workerId);
  };

  const handleResolveAlert = async (index) => {
    try {
      await resolveTrackerAlert(selectedTracker, index);
      toast?.("Alert resolved", "success");
      fetchTrackerDetails(selectedTracker);
    } catch (error) {
      toast?.(error.message || "Failed to resolve alert", "error");
    }
  };

  const handleCheckout = async () => {
    if (!window.confirm("End tracking session?")) return;
    try {
      await checkoutTracker(selectedTracker);
      toast?.("Checkout successful", "success");
      setSelectedTracker(null);
      setTrackerDetails(null);
      fetchTrackers();
    } catch (error) {
      toast?.(error.message || "Failed to checkout", "error");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: 20, background: C.bg, minHeight: "100vh" }}>
      <PageHeader
        title="🔗 Integrated Tracking (Helmet + Belt)"
        subtitle="High-frequency synchronized tracking system"
        actions={
          <label style={{ color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Live Update (2 Hz)
          </label>
        }
      />

      {!selectedTracker ? (
        // ── List View ──────────────────────────────────────
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 15,
              marginBottom: 30,
            }}
          >
            <StatCard label="Active Trackers" value={trackers.length} color={C.cyan} />
            <StatCard
              label="Synchronized"
              value={trackers.filter((t) => t.integratedTracking?.syncStatus === "synchronized").length}
              color={C.green}
            />
            <StatCard
              label="Out of Sync"
              value={trackers.filter((t) => t.integratedTracking?.syncStatus === "out_of_sync").length}
              color={C.yellow}
            />
            <StatCard
              label="Alerts"
              value={trackers.reduce((sum, t) => sum + (t.alerts?.length || 0), 0)}
              color={C.red}
            />
          </div>

          <Table>
            <thead>
              <TR header>
                <TD width="15%">Worker</TD>
                <TD width="15%">Helmet Status</TD>
                <TD width="15%">Belt Status</TD>
                <TD width="15%">Sync Status</TD>
                <TD width="15%">Signal</TD>
                <TD width="10%">Actions</TD>
              </TR>
            </thead>
            <tbody>
              {trackers.map((tracker) => (
                <TR key={tracker.id}>
                  <TD>
                    <div style={{ color: C.text, fontSize: 13 }}>
                      <strong>{tracker.workerName}</strong>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                        {tracker.workerId}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge
                      status={tracker.helmet?.status}
                      statusMap={{
                        active: { bg: C.green, text: "#000" },
                        error: { bg: C.red, text: "#fff" },
                        low_battery: { bg: C.yellow, text: "#000" },
                      }}
                    />
                  </TD>
                  <TD>
                    <StatusBadge
                      status={tracker.belt?.status}
                      statusMap={{
                        active: { bg: C.green, text: "#000" },
                        error: { bg: C.red, text: "#fff" },
                        low_battery: { bg: C.yellow, text: "#000" },
                      }}
                    />
                  </TD>
                  <TD>
                    <StatusBadge
                      status={tracker.integratedTracking?.syncStatus}
                      statusMap={{
                        synchronized: { bg: C.blue, text: "#fff" },
                        out_of_sync: { bg: C.yellow, text: "#000" },
                        searching: { bg: C.muted, text: "#fff" },
                      }}
                    />
                  </TD>
                  <TD>
                    <SignalIndicator strength={tracker.integratedTracking?.combinedSignalStrength} />
                  </TD>
                  <TD>
                    <Btn
                      label="View"
                      onClick={() => handleSelectTracker(tracker)}
                      variant="primary"
                      size="sm"
                    />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        // ── Detail View ────────────────────────────────────
        <div>
          <Btn
            label="← Back"
            onClick={() => setSelectedTracker(null)}
            variant="secondary"
            size="sm"
            style={{ marginBottom: 20 }}
          />

          {trackerDetails && (
            <div>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 15, marginBottom: 30 }}>
                <StatCard label="Helmet Battery" value={`${trackerDetails.helmet?.battery || 0}%`} color={C.blue} />
                <StatCard label="Belt Battery" value={`${trackerDetails.belt?.battery || 0}%`} color={C.cyan} />
                <StatCard label="Freq (MHz)" value={trackerDetails.helmet?.highFrequencyData?.frequency || 2400} color={C.purple} />
                <StatCard label="Data Rate (Hz)" value={trackerDetails.helmet?.highFrequencyData?.dataRate || 50} color={C.green} />
              </div>

              {/* Helmet & Belt Data */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
                {/* Helmet Panel */}
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 15 }}>
                  <h3 style={{ color: C.text, marginTop: 0 }}>🎧 Helmet Sensor</h3>
                  <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.8 }}>
                    <div>
                      <strong style={{ color: C.text }}>Frequency:</strong> {trackerDetails.helmet?.highFrequencyData?.frequency} MHz
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>Data Rate:</strong> {trackerDetails.helmet?.highFrequencyData?.dataRate} Hz
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>Signal:</strong>
                      <div style={{ marginTop: 4 }}>
                        <SignalIndicator strength={trackerDetails.helmet?.highFrequencyData?.signalStrength} />
                      </div>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ color: C.text }}>Battery:</strong> {trackerDetails.helmet?.battery}%
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>Temperature:</strong> {trackerDetails.helmet?.temperature}°C
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ color: C.text }}>Status:</strong>
                      <StatusBadge
                        status={trackerDetails.helmet?.status}
                        statusMap={{
                          active: { bg: C.green, text: "#000" },
                          error: { bg: C.red, text: "#fff" },
                          low_battery: { bg: C.yellow, text: "#000" },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Belt Panel */}
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 15 }}>
                  <h3 style={{ color: C.text, marginTop: 0 }}>⌚ Belt Tracker</h3>
                  <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.8 }}>
                    <div>
                      <strong style={{ color: C.text }}>RFID:</strong> {trackerDetails.belt?.rfidReader?.lastScannedTag || "No scan"}
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>Last Scan:</strong>{" "}
                      {trackerDetails.belt?.rfidReader?.lastScan
                        ? new Date(trackerDetails.belt.rfidReader.lastScan).toLocaleTimeString()
                        : "Never"}
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>Speed:</strong> {(trackerDetails.belt?.liveTracker?.speed || 0).toFixed(2)} m/s
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>Heading:</strong> {trackerDetails.belt?.liveTracker?.heading || 0}°
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ color: C.text }}>Battery:</strong> {trackerDetails.belt?.battery}%
                    </div>
                    <div>
                      <strong style={{ color: C.text }}>GPS:</strong>
                      <StatusBadge
                        status={trackerDetails.belt?.liveTracker?.status}
                        statusMap={{
                          active: { bg: C.green, text: "#000" },
                          "low_accuracy": { bg: C.yellow, text: "#000" },
                          "gps_lost": { bg: C.red, text: "#fff" },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Synchronization Info */}
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 15, marginBottom: 30 }}>
                <h3 style={{ color: C.text, marginTop: 0 }}>🔗 Synchronization Status</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15 }}>
                  <div>
                    <div style={{ color: C.muted, fontSize: 11 }}>Sync Status</div>
                    <StatusBadge
                      status={trackerDetails.integratedTracking?.syncStatus}
                      statusMap={{
                        synchronized: { bg: C.green, text: "#000" },
                        out_of_sync: { bg: C.yellow, text: "#000" },
                        searching: { bg: C.muted, text: "#fff" },
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ color: C.muted, fontSize: 11 }}>Sync Frequency</div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>
                      {trackerDetails.integratedTracking?.syncFrequency} Hz
                    </div>
                  </div>
                  <div>
                    <div style={{ color: C.muted, fontSize: 11 }}>Helmet-Belt Distance</div>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>
                      {trackerDetails.integratedTracking?.helmetBeltDistance} cm
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Map */}
              <div style={{ marginBottom: 30 }}>
                <h3 style={{ color: C.text }}>📍 Live Location (Belt GPS)</h3>
                <LiveMap beltLocation={trackerDetails.belt?.liveTracker} />
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 15, marginBottom: 30 }}>
                  <h3 style={{ color: C.text, marginTop: 0 }}>⚠️ Active Alerts ({alerts.filter((a) => !a.resolved).length})</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: C.dim,
                          border: `1px solid ${C.border}`,
                          borderRadius: 6,
                          padding: 10,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>
                            {alert.type.toUpperCase()}
                          </div>
                          <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                            {alert.message}
                          </div>
                          <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        {!alert.resolved && (
                          <Btn
                            label="✓"
                            onClick={() => handleResolveAlert(idx)}
                            variant="success"
                            size="sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking History */}
              {history.length > 0 && (
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 15, marginBottom: 30 }}>
                  <h3 style={{ color: C.text, marginTop: 0 }}>📊 Recent History (Last 50 Points)</h3>
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    <Table>
                      <thead>
                        <TR header>
                          <TD width="25%">Time</TD>
                          <TD width="25%">Latitude</TD>
                          <TD width="25%">Longitude</TD>
                          <TD width="25%">Speed</TD>
                        </TR>
                      </thead>
                      <tbody>
                        {history.slice().reverse().map((entry, idx) => (
                          <TR key={idx}>
                            <TD style={{ fontSize: 11, color: C.muted }}>
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </TD>
                            <TD style={{ fontSize: 11, color: C.muted }}>
                              {entry.beltLocation?.latitude?.toFixed(4)}
                            </TD>
                            <TD style={{ fontSize: 11, color: C.muted }}>
                              {entry.beltLocation?.longitude?.toFixed(4)}
                            </TD>
                            <TD style={{ fontSize: 11, color: C.text }}>
                              {entry.speed?.toFixed(2)} m/s
                            </TD>
                          </TR>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <Btn label="🔄 Refresh" onClick={() => fetchTrackerDetails(selectedTracker)} variant="secondary" />
                <Btn label="🚪 Checkout" onClick={handleCheckout} variant="danger" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
