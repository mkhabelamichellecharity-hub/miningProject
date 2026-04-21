import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  getDrones, createDrone, launchDrone, landDrone,
  updateTelemetry, addMapTile, clearDroneMap, deleteDrone,
  getSensors, getWorkers,
} from "../api/api";
import { PageHeader, Btn, Input, Select, Spinner, useToast, StatCard, StatusBadge, Table, TR, TD } from "../components/UI";

// ── Palette ───────────────────────────────────────────────
const C = {
  bg: "#0f172a", panel: "#1e293b", border: "#334155",
  text: "#e2e8f0", muted: "#64748b", dim: "#334155",
  green: "#22c55e", yellow: "#f59e0b", red: "#ef4444",
  blue: "#3b82f6", purple: "#a78bfa", cyan: "#06b6d4",
};

// tile type colours for map
const TILE_COLORS = {
  clear: "#1e3a2f",
  obstacle: "#7f1d1d",
  hazard: "#78350f",
  "point-of-interest": "#1e3a5f",
  drone: "#06b6d4",
  scanned: "#14532d",
};

const MAP_SIZE  = 20; // 20×20 grid cells
const CELL_SIZE = 22; // px per cell

// ── Telemetry gauge bar ───────────────────────────────────
function GaugeBar({ label, value, max = 100, unit = "%", warnAt = 30, critAt = 15, reverse = false }) {
  const pct  = Math.min(100, Math.max(0, (value / max) * 100));
  const bad  = reverse ? pct > (100 - warnAt) : pct <= warnAt;
  const crit = reverse ? pct > (100 - critAt)  : pct <= critAt;
  const col  = crit ? C.red : bad ? C.yellow : C.green;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ color: C.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ color: col, fontSize: 12, fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <div style={{ background: C.dim, borderRadius: 4, height: 6, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: col, borderRadius: 4, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ── Map grid ──────────────────────────────────────────────
function DroneMap({ mapTiles, dronePos, waypoints, isFlying }) {
  const canvasRef = useRef(null);
  const W = MAP_SIZE * CELL_SIZE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, W);

    // Background grid
    for (let row = 0; row < MAP_SIZE; row++) {
      for (let col = 0; col < MAP_SIZE; col++) {
        ctx.fillStyle = "#0d1b2a";
        ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        ctx.strokeStyle = "#1a2744";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }

    // Scanned / discovered tiles
    mapTiles.forEach(tile => {
      const px = tile.x * CELL_SIZE;
      const py = tile.y * CELL_SIZE;
      ctx.fillStyle = TILE_COLORS[tile.type] || TILE_COLORS.clear;
      ctx.fillRect(px, py, CELL_SIZE - 1, CELL_SIZE - 1);
      if (tile.type === "obstacle") {
        ctx.fillStyle = "#f87171";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("X", px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 3);
      }
      if (tile.type === "hazard") {
        ctx.fillStyle = "#fbbf24";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 3);
      }
      if (tile.type === "point-of-interest") {
        ctx.fillStyle = "#60a5fa";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("★", px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 3);
      }
    });

    // Waypoints
    waypoints.forEach((wp, i) => {
      const px = wp.x * CELL_SIZE + CELL_SIZE / 2;
      const py = wp.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = wp.scanned ? "#22c55e" : "#f59e0b";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(i + 1, px, py + 3);
    });

    // Waypoint path lines
    if (waypoints.length > 1) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#f59e0b55";
      ctx.lineWidth = 1;
      waypoints.forEach((wp, i) => {
        const px = wp.x * CELL_SIZE + CELL_SIZE / 2;
        const py = wp.y * CELL_SIZE + CELL_SIZE / 2;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Drone icon
    if (dronePos) {
      const dx = dronePos.x * CELL_SIZE + CELL_SIZE / 2;
      const dy = dronePos.y * CELL_SIZE + CELL_SIZE / 2;

      // Glow
      if (isFlying) {
        const grad = ctx.createRadialGradient(dx, dy, 2, dx, dy, 14);
        grad.addColorStop(0, "#06b6d455");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(dx, dy, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(dx, dy, 7, 0, Math.PI * 2);
      ctx.fillStyle = isFlying ? "#06b6d4" : "#475569";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Rotor arms
      const arms = [[dx - 8, dy - 8], [dx + 8, dy - 8], [dx - 8, dy + 8], [dx + 8, dy + 8]];
      arms.forEach(([ax, ay]) => {
        ctx.beginPath();
        ctx.arc(ax, ay, 3, 0, Math.PI * 2);
        ctx.fillStyle = isFlying ? "#06b6d4aa" : "#47556999";
        ctx.fill();
        ctx.strokeStyle = isFlying ? "#06b6d4" : "#475569";
        ctx.lineWidth = 1;
        ctx.moveTo(dx, dy);
        ctx.lineTo(ax, ay);
        ctx.stroke();
      });
    }

    // Legend
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(2, W - 22, 196, 20);
    const legend = [["■", "#14532d", "Scanned"], ["■", "#7f1d1d", "Obstacle"], ["■", "#78350f", "Hazard"], ["■", "#1e3a5f", "POI"]];
    legend.forEach(([sym, col, lbl], i) => {
      ctx.fillStyle = col;
      ctx.font = "10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(sym, 6 + i * 50, W - 8);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(lbl, 16 + i * 50, W - 8);
    });
  }, [mapTiles, dronePos, waypoints, isFlying, W]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={W}
      style={{ borderRadius: 8, border: `1px solid ${C.border}`, display: "block" }}
    />
  );
}

// ── Camera feed ───────────────────────────────────────────
function CameraFeed({ isActive, dronePos, altitude, heading, mapTiles }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(0);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      frameRef.current++;
      const t = frameRef.current;

      if (!isActive) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#334155";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CAMERA OFF", W / 2, H / 2 - 10);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#475569";
        ctx.fillText("Launch drone to activate", W / 2, H / 2 + 14);
        return;
      }

      // Simulate aerial view of terrain
      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(0, 0, W, H);

      // Ground texture – random "terrain" based on position
      const seed = (dronePos?.x || 0) * 13 + (dronePos?.y || 0) * 7;
      for (let i = 0; i < 40; i++) {
        const px = ((seed * 17 + i * 43) % W);
        const py = ((seed * 31 + i * 61) % H);
        const sz = 4 + (i % 8);
        ctx.fillStyle = i % 5 === 0 ? "#2d4a2d" : i % 3 === 0 ? "#1e3a1e" : "#263826";
        ctx.fillRect(px, py, sz, sz);
      }

      // Show discovered map features as terrain elements
      mapTiles.slice(-15).forEach((tile, i) => {
        const px = 20 + (i * 31 % (W - 40));
        const py = 20 + (i * 47 % (H - 40));
        if (tile.type === "obstacle") {
          ctx.fillStyle = "#5a1a1a";
          ctx.fillRect(px, py, 18, 18);
        } else if (tile.type === "hazard") {
          ctx.fillStyle = "#4a3a10";
          ctx.beginPath();
          ctx.arc(px + 9, py + 9, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile.type === "point-of-interest") {
          ctx.fillStyle = "#1a2a4a";
          ctx.fillRect(px, py, 14, 14);
        }
      });

      // Scan lines overlay
      for (let row = 0; row < H; row += 3) {
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(0, row, W, 1);
      }

      // Crosshair
      ctx.strokeStyle = "#06b6d4aa";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "#06b6d466";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2);
      ctx.strokeStyle = "#06b6d4";
      ctx.stroke();

      // HUD overlays
      ctx.fillStyle = "#06b6d4cc";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText("ALT: " + altitude + "m", 8, 16);
      ctx.fillText("HDG: " + heading + "°", 8, 30);
      ctx.fillText("POS: " + (dronePos?.x || 0) + "," + (dronePos?.y || 0), 8, 44);

      ctx.textAlign = "right";
      ctx.fillText("REC ●", W - 8, 16);
      ctx.fillText("LIVE", W - 8, 30);

      // Animated recording dot
      if (Math.floor(t / 30) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(W - 26, 12, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      }

      // Corner brackets
      const b = 16;
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2;
      [[[0,0],[b,0],[0,b]], [[W,0],[W-b,0],[W,b]], [[0,H],[b,H],[0,H-b]], [[W,H],[W-b,H],[W,H-b]]].forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.stroke();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isActive, dronePos, altitude, heading, mapTiles]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={240}
      style={{ borderRadius: 8, border: `2px solid ${isActive ? C.cyan : C.border}`, display: "block", width: "100%" }}
    />
  );
}

// ── Main page ─────────────────────────────────────────────
export default function DronePage() {
  const [drones, setDrones]     = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm]   = useState({ name: "Drone-1", serialNumber: "DRN-001", missionArea: "Zone A" });
  const [missionForm, setMissionForm] = useState({ missionName: "Survey Mission", missionArea: "Zone A" });
  const [tab, setTab]           = useState("map");
  const simRef                  = useRef(null);
  const { show, ToastEl }       = useToast();

  // Local simulated telemetry (client-side for smooth animation)
  const [telem, setTelem] = useState({
    batteryLevel: 100, altitude: 0, speed: 0,
    heading: 0, signalStrength: 98, temperature: 22,
    posX: 10, posY: 10,
  });
  const [mapTiles, setMapTiles]     = useState([]);
  const [mapCoverage, setMapCoverage] = useState(0);
  const [waypoints, setWaypoints]   = useState([]);
  const [sensors, setSensors]     = useState([]);
  const [workers, setWorkers]     = useState([]);

  const loadDrones = useCallback(async () => {
    try {
      const [dronesRes, sensorsRes, workersRes] = await Promise.all([
        getDrones(),
        getSensors(),
        getWorkers()
      ]);
      setDrones(dronesRes.data);
      setSensors(sensorsRes.data || []);
      setWorkers(workersRes.data || []);
      if (dronesRes.data.length > 0 && !selected) {
        const d = dronesRes.data[0];
        setSelected(d);
        setTelem(d.telemetry || telem);
        setMapTiles(d.mapTiles || []);
        setMapCoverage(d.mapCoverage || 0);
        setWaypoints(d.waypoints || []);
      }
    } catch (err) { show("Failed to load data: " + err.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDrones(); }, [loadDrones]);

  // ── Simulation loop when flying ───────────────────────
  useEffect(() => {
    if (simRef.current) clearInterval(simRef.current);
    if (!selected || selected.status !== "flying") return;

    let posX  = telem.posX;
    let posY  = telem.posY;
    let dir   = 1;
    let wpIdx = 0;

    simRef.current = setInterval(() => {
      setTelem(prev => {
        const battery = Math.max(0, prev.batteryLevel - 0.08);
        const heading = (prev.heading + 2) % 360;

        // Move toward next waypoint if any, else serpentine sweep
        let nextX = posX, nextY = posY;
        if (waypoints.length > 0 && wpIdx < waypoints.length) {
          const wp = waypoints[wpIdx];
          const dx = wp.x - posX, dy = wp.y - posY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1.5) {
            wpIdx = Math.min(wpIdx + 1, waypoints.length - 1);
          } else {
            nextX = posX + (dx / dist) * 0.4;
            nextY = posY + (dy / dist) * 0.4;
          }
        } else {
          // Lawnmower sweep
          nextX = posX + dir * 0.5;
          if (nextX >= MAP_SIZE - 1 || nextX <= 0) {
            dir = -dir;
            nextY = Math.min(posY + 1, MAP_SIZE - 1);
          }
        }

        posX = Math.max(0, Math.min(MAP_SIZE - 1, nextX));
        posY = Math.max(0, Math.min(MAP_SIZE - 1, nextY));

        const speed    = 8 + Math.sin(Date.now() / 1000) * 3;
        const altitude = 45 + Math.sin(Date.now() / 800) * 5;

        // Discover new map tile
        const gx = Math.round(posX), gy = Math.round(posY);
        setMapTiles(tiles => {
          if (!tiles.find(t => t.x === gx && t.y === gy)) {
            const rand = Math.random();
            const type = rand < 0.03 ? "obstacle" : rand < 0.06 ? "hazard" : rand < 0.08 ? "point-of-interest" : "clear";
            const newTiles = [...tiles, { x: gx, y: gy, type, label: "", discoveredAt: new Date() }];
            setMapCoverage(Math.min(100, Math.round((newTiles.length / (MAP_SIZE * MAP_SIZE)) * 100)));
            return newTiles;
          }
          return tiles;
        });

        return { ...prev, batteryLevel: parseFloat(battery.toFixed(1)), altitude: Math.round(altitude), speed: Math.round(speed), heading: Math.round(heading), posX, posY };
      });
    }, 400);

    return () => clearInterval(simRef.current);
  }, [selected?.status, waypoints]);

  const handleCreate = async () => {
    if (!newForm.name || !newForm.serialNumber) { show("Name and serial number required", "error"); return; }
    try {
      const res = await createDrone(newForm);
      show(res.data.name + " created ✅", "success");
      setCreating(false);
      setNewForm({ name: "Drone-1", serialNumber: "DRN-001", missionArea: "Zone A" });
      loadDrones();
    } catch (err) { show("Create failed: " + err.message, "error"); }
  };

  const handleLaunch = async () => {
    if (!selected) return;
    if (telem.batteryLevel < 20) { show("Battery too low to launch!", "error"); return; }
    try {
      const res = await launchDrone(selected._id, missionForm);
      setSelected(res.data.drone);
      show("🚁 " + selected.name + " launched!", "success");
      loadDrones();
    } catch (err) { show("Launch failed: " + err.message, "error"); }
  };

  const handleLand = async () => {
    if (!selected) return;
    clearInterval(simRef.current);
    try {
      const res = await landDrone(selected._id);
      setSelected(res.data.drone);
      show("🛬 " + selected.name + " landed. Flight time: " + res.data.flightMins + " min", "success");
      // Save final telemetry to DB
      await updateTelemetry(selected._id, telem);
      loadDrones();
    } catch (err) { show("Land failed: " + err.message, "error"); }
  };

  const handleClearMap = async () => {
    if (!selected || !window.confirm("Clear all map data for " + selected.name + "?")) return;
    try {
      await clearDroneMap(selected._id);
      setMapTiles([]);
      setMapCoverage(0);
      show("Map cleared", "success");
    } catch (err) { show("Clear failed: " + err.message, "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this drone?")) return;
    try {
      await deleteDrone(id);
      if (selected?._id === id) setSelected(null);
      show("Drone deleted", "success");
      loadDrones();
    } catch (err) { show("Delete failed: " + err.message, "error"); }
  };

  const addWaypoint = (x, y) => {
    setWaypoints(prev => [...prev, { x, y, label: "WP" + (prev.length + 1), scanned: false }]);
  };

  const isFlying = selected?.status === "flying";
  const battCol  = telem.batteryLevel > 50 ? C.green : telem.batteryLevel > 20 ? C.yellow : C.red;
  const sigCol   = telem.signalStrength > 60 ? C.green : telem.signalStrength > 30 ? C.yellow : C.red;

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ background: tab === id ? "#334155" : "#1e293b", border: `1px solid ${tab === id ? "#64748b" : "#334155"}`, color: tab === id ? "#f1f5f9" : "#64748b", padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: tab === id ? 600 : 400, cursor: "pointer" }}>
      {label}
    </button>
  );

  const StatusDot = ({ status }) => {
    const col = { flying: C.cyan, idle: C.green, returning: C.yellow, charging: C.purple, maintenance: C.yellow, offline: C.red }[status] || C.muted;
    return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: col, marginRight: 6, boxShadow: status === "flying" ? "0 0 6px " + col : "none" }} />;
  };

  if (loading) return <Spinner />;

  return (
    <div>
      {ToastEl}
      <PageHeader title="🚁 Drone Control Panel" subtitle="Live camera feed, real-time terrain mapping and flight controls">
        <Btn variant="primary" onClick={() => setCreating(true)}>➕ Add Drone</Btn>
      </PageHeader>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard title="Total Drones" value={drones.length}                   color={C.blue}   icon="🚁" />
        <StatCard title="Flying Now"   value={drones.filter(d => d.status === "flying").length}   color={isFlying ? C.cyan : C.muted} icon="✈️" />
        <StatCard title="Map Coverage" value={mapCoverage + "%"}                color={C.purple} icon="🗺️" />
        <StatCard title="Battery"      value={telem.batteryLevel + "%"}         color={battCol}  icon="🔋" />
        <StatCard title="Altitude"     value={telem.altitude + "m"}             color={C.blue}   icon="📡" />
      </div>

      {/* Add drone form */}
      {creating && (
        <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 20 }}>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Register New Drone</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Name</label>
              <Input placeholder="Drone-1" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Serial number</label>
              <Input placeholder="DRN-001" value={newForm.serialNumber} onChange={e => setNewForm(p => ({ ...p, serialNumber: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ color: C.muted, fontSize: 12, display: "block", marginBottom: 4 }}>Mission area</label>
              <Select value={newForm.missionArea} onChange={e => setNewForm(p => ({ ...p, missionArea: e.target.value }))}>
                {["Zone A", "Zone B", "Zone C", "Shaft 1", "Shaft 2", "Perimeter", "Stockpile"].map(z => <option key={z}>{z}</option>)}
              </Select>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <Btn variant="success" onClick={handleCreate}>Create</Btn>
              <Btn variant="ghost" onClick={() => setCreating(false)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Drone selector list */}
      {drones.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚁</div>
          <div>No drones registered. Click <strong style={{ color: C.text }}>+ Add Drone</strong> to get started.</div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* ── Left: drone list ─────────────────────────── */}
          <div style={{ width: 200, flexShrink: 0 }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Fleet</div>
            {drones.map(d => (
              <div
                key={d._id}
                onClick={() => { setSelected(d); setMapTiles(d.mapTiles || []); setMapCoverage(d.mapCoverage || 0); setWaypoints(d.waypoints || []); setTelem(d.telemetry || telem); }}
                style={{ background: selected?._id === d._id ? "#1e3a5f" : C.panel, border: `1px solid ${selected?._id === d._id ? C.blue : C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", transition: "all 0.15s" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{d.name}</span>
                  <StatusDot status={d.status} />
                </div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{d.serialNumber}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{d.missionArea}</div>
                <div style={{ color: d.status === "flying" ? C.cyan : C.muted, fontSize: 11, fontWeight: 600, textTransform: "capitalize", marginTop: 4 }}>{d.status}</div>
              </div>
            ))}
          </div>

          {/* ── Right: selected drone panel ──────────────── */}
          {selected && (
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Header + controls */}
              <div style={{ background: C.panel, borderRadius: 12, padding: 18, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusDot status={selected.status} />
                      <span style={{ color: C.text, fontWeight: 700, fontSize: 18 }}>{selected.name}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>· {selected.serialNumber}</span>
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                      Area: {selected.missionArea} · Flight hours: {Math.round(selected.totalFlightTime)} min · Tiles: {mapTiles.length}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!isFlying ? (
                      <Btn variant="success" onClick={handleLaunch}>🚀 Launch</Btn>
                    ) : (
                      <Btn variant="danger" onClick={handleLand}>🛬 Land</Btn>
                    )}
                    <Btn variant="ghost" small onClick={handleClearMap}>🗑️ Clear Map</Btn>
                    <Btn variant="danger" small onClick={() => handleDelete(selected._id)}>Delete</Btn>
                  </div>
                </div>

                {/* Mission form (only when idle) */}
                {!isFlying && (
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <div style={{ flex: 2, minWidth: 160 }}>
                      <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 4 }}>Mission name</label>
                      <Input placeholder="Survey Mission" value={missionForm.missionName} onChange={e => setMissionForm(p => ({ ...p, missionName: e.target.value }))} />
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={{ color: C.muted, fontSize: 11, display: "block", marginBottom: 4 }}>Zone</label>
                      <Select value={missionForm.missionArea} onChange={e => setMissionForm(p => ({ ...p, missionArea: e.target.value }))}>
                        {["Zone A", "Zone B", "Zone C", "Shaft 1", "Shaft 2", "Perimeter", "Stockpile"].map(z => <option key={z}>{z}</option>)}
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <TabBtn id="map"      label="🗺️ Live Map" />
                <TabBtn id="camera"   label="📷 Camera Feed" />
                <TabBtn id="telemetry"label="📡 Telemetry" />
                <TabBtn id="sensors"  label="📡 Sensors" />
                <TabBtn id="workers"  label="👷 Workers" />
                <TabBtn id="waypoints"label="📍 Waypoints" />
              </div>

              {/* ── MAP TAB ──────────────────────────────── */}
              {tab === "map" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>
                      Coverage: <strong style={{ color: C.text }}>{mapCoverage}%</strong> · Tiles discovered: <strong style={{ color: C.text }}>{mapTiles.length}</strong>
                      {isFlying && <span style={{ color: C.cyan, marginLeft: 8 }}>● LIVE</span>}
                    </div>
                    <DroneMap
                      mapTiles={mapTiles}
                      dronePos={{ x: telem.posX, y: telem.posY }}
                      waypoints={waypoints}
                      isFlying={isFlying}
                    />
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                      Drone position: ({Math.round(telem.posX)}, {Math.round(telem.posY)}) · Click map to add waypoint
                    </div>
                  </div>

                  {/* Map legend + stats */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ background: C.panel, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Map Statistics</div>
                      {[["clear", "Scanned clear"], ["obstacle", "Obstacles"], ["hazard", "Hazards"], ["point-of-interest", "Points of interest"]].map(([type, label]) => {
                        const count = mapTiles.filter(t => t.type === type).length;
                        return (
                          <div key={type} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: TILE_COLORS[type] }} />
                              <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
                            </div>
                            <span style={{ color: C.text, fontWeight: 600, fontSize: 12 }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ background: C.panel, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Coverage</div>
                      <div style={{ background: C.dim, borderRadius: 6, height: 12, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ width: mapCoverage + "%", height: "100%", background: mapCoverage > 70 ? C.green : mapCoverage > 30 ? C.yellow : C.blue, borderRadius: 6, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ color: C.text, fontSize: 20, fontWeight: 700, textAlign: "center" }}>{mapCoverage}%</div>
                      <div style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>{mapTiles.length} / {MAP_SIZE * MAP_SIZE} tiles</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CAMERA TAB ───────────────────────────── */}
              {tab === "camera" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 300 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ color: C.muted, fontSize: 12 }}>
                        {isFlying ? <span style={{ color: C.cyan }}>● LIVE FEED</span> : "Camera offline"}
                      </span>
                      <span style={{ color: C.muted, fontSize: 11 }}>{selected.name} · {selected.missionArea}</span>
                    </div>
                    <CameraFeed
                      isActive={isFlying}
                      dronePos={{ x: Math.round(telem.posX), y: Math.round(telem.posY) }}
                      altitude={telem.altitude}
                      heading={telem.heading}
                      mapTiles={mapTiles}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ color: C.muted, fontSize: 10 }}>RESOLUTION</div>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>4K · 30fps</div>
                      </div>
                      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ color: C.muted, fontSize: 10 }}>ZOOM</div>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>1× optical</div>
                      </div>
                      <div style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                        <div style={{ color: C.muted, fontSize: 10 }}>GIMBAL</div>
                        <div style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>-90° nadir</div>
                      </div>
                    </div>
                  </div>

                  {/* Camera info panel */}
                  <div style={{ minWidth: 180 }}>
                    <div style={{ background: C.panel, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Camera Status</div>
                      {[
                        ["Status",     isFlying ? "🟢 Active" : "🔴 Offline"],
                        ["Mode",       "Mapping / Survey"],
                        ["Sensor",     "1/2.3\" CMOS"],
                        ["FOV",        "83° wide angle"],
                        ["Stabiliser", "3-axis gimbal"],
                        ["Night mode", "IR capable"],
                        ["Storage",    "64GB onboard"],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, borderBottom: `1px solid ${C.dim}`, paddingBottom: 6 }}>
                          <span style={{ color: C.muted, fontSize: 12 }}>{k}</span>
                          <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TELEMETRY TAB ────────────────────────── */}
              {tab === "telemetry" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220, background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Power & Signal</div>
                    <GaugeBar label="Battery"        value={telem.batteryLevel}   max={100} unit="%" warnAt={30} critAt={15} />
                    <GaugeBar label="Signal Strength" value={telem.signalStrength} max={100} unit="%" warnAt={40} critAt={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220, background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Flight Data</div>
                    <GaugeBar label="Altitude (m)"   value={telem.altitude} max={120} unit="m" warnAt={10} critAt={5} />
                    <GaugeBar label="Speed (km/h)"   value={telem.speed}    max={60}  unit=" km/h" warnAt={5} critAt={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 220, background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Live Readings</div>
                    {[
                      ["Heading",    telem.heading + "°"],
                      ["Temperature",telem.temperature + "°C"],
                      ["Position X", Math.round(telem.posX)],
                      ["Position Y", Math.round(telem.posY)],
                      ["Status",     selected.status],
                      ["Camera",     isFlying ? "Active" : "Offline"],
                      ["Mapping",    isFlying ? "Running" : "Paused"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: C.muted, fontSize: 12 }}>{k}</span>
                        <span style={{ color: isFlying ? C.cyan : C.text, fontSize: 12, fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SENSORS TAB ─────────────────────────── */}
              {tab === "sensors" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: 300 }}>
                    <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Sensor Overview · {sensors.length} total
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <StatCard title="Helmet Sensors" value={sensors.filter(s => s.type === "helmet").length} sub="Safety monitoring" color={C.blue} icon="⛑️" />
                        <StatCard title="Belt Sensors" value={sensors.filter(s => s.type === "belt").length} sub="Vital monitoring" color={C.purple} icon="🔗" />
                        <StatCard title="Active" value={sensors.filter(s => s.status === "active").length} sub="Currently online" color={C.green} icon="📡" />
                      </div>
                      <Table headers={["Sensor ID", "Type", "Worker", "Status", "Battery", "Location"]}>
                        {sensors.slice(0, 8).map((sensor) => (
                          <TR key={sensor._id}>
                            <TD><code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{sensor.sensorId}</code></TD>
                            <TD>
                              <span style={{ display: "flex", alignItems: "center", gap: 6, color: sensor.type === "helmet" ? C.blue : C.purple }}>
                                {sensor.type === "helmet" ? "⛑️" : "🔗"}
                                {sensor.type}
                              </span>
                            </TD>
                            <TD>{sensor.workerName || <span style={{ color: C.muted }}>—</span>}</TD>
                            <TD><StatusBadge status={sensor.status} /></TD>
                            <TD>
                              <span style={{ 
                                color: sensor.batteryLevel > 50 ? C.green : sensor.batteryLevel > 20 ? C.yellow : C.red
                              }}>
                                {sensor.batteryLevel || 0}%
                              </span>
                            </TD>
                            <TD>{sensor.location}</TD>
                          </TR>
                        ))}
                      </Table>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Sensor Status Distribution
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {["active", "inactive", "maintenance", "fault"].map((status) => {
                          const count = sensors.filter(s => s.status === status).length;
                          const percentage = sensors.length > 0 ? (count / sensors.length * 100).toFixed(1) : 0;
                          const colors = { active: C.green, inactive: C.muted, maintenance: C.yellow, fault: C.red };
                          return (
                            <div key={status}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ color: C.text, fontSize: 12, textTransform: "capitalize" }}>{status}</span>
                                <span style={{ color: colors[status], fontSize: 12, fontWeight: 600 }}>{count} ({percentage}%)</span>
                              </div>
                              <div style={{ background: C.dim, borderRadius: 4, height: 6, overflow: "hidden" }}>
                                <div style={{ width: percentage + "%", height: "100%", background: colors[status], borderRadius: 4 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Drone Sensor Integration
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Sensor Scan</span>
                          <span style={{ color: isFlying ? C.cyan : C.muted, fontSize: 11 }}>
                            {isFlying ? "● ACTIVE" : "○ PAUSED"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Coverage Area</span>
                          <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{mapCoverage}%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Last Sync</span>
                          <span style={{ color: C.muted, fontSize: 11 }}>Just now</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── WORKERS TAB ─────────────────────────── */}
              {tab === "workers" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: 300 }}>
                    <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Workers On Site · {workers.filter(w => w.status === "checked-in").length} active
                      </div>
                      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <StatCard title="Checked In" value={workers.filter(w => w.status === "checked-in").length} sub={`of ${workers.length} total`} color={C.green} icon="👷" />
                        <StatCard title="With Sensors" value={workers.filter(w => w.sensorId).length} sub="Equipment assigned" color={C.blue} icon="📡" />
                        <StatCard title="In Zone A" value={workers.filter(w => w.location === "Zone A").length} sub="Current area" color={C.yellow} icon="📍" />
                      </div>
                      <Table headers={["Name", "Worker ID", "Status", "Location", "Check-in Time", "Sensor"]}>
                        {workers.slice(0, 8).map((worker) => (
                          <TR key={worker._id}>
                            <TD><span style={{ fontWeight: 600, color: C.text }}>{worker.name}</span></TD>
                            <TD><code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{worker.workerId}</code></TD>
                            <TD><StatusBadge status={worker.status} /></TD>
                            <TD>{worker.location}</TD>
                            <TD>
                              {worker.checkInTime
                                ? new Date(worker.checkInTime).toLocaleTimeString()
                                : <span style={{ color: C.muted }}>—</span>}
                            </TD>
                            <TD>
                              {worker.sensorId ? (
                                <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.cyan }}>
                                  📡 {worker.sensorId}
                                </span>
                              ) : (
                                <span style={{ color: C.muted }}>—</span>
                              )}
                            </TD>
                          </TR>
                        ))}
                      </Table>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Location Distribution
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {["Zone A", "Zone B", "Zone C", "Shaft", "Surface"].map((location) => {
                          const count = workers.filter(w => w.location === location).length;
                          const percentage = workers.length > 0 ? (count / workers.length * 100).toFixed(1) : 0;
                          return (
                            <div key={location}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <span style={{ color: C.text, fontSize: 12 }}>{location}</span>
                                <span style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}>{count} ({percentage}%)</span>
                              </div>
                              <div style={{ background: C.dim, borderRadius: 4, height: 6, overflow: "hidden" }}>
                                <div style={{ width: percentage + "%", height: "100%", background: C.blue, borderRadius: 4 }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
                      <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                        Drone Worker Tracking
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Worker Detection</span>
                          <span style={{ color: isFlying ? C.cyan : C.muted, fontSize: 11 }}>
                            {isFlying ? "● SCANNING" : "○ STANDBY"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Tracked Workers</span>
                          <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{workers.filter(w => w.status === "checked-in").length}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Drone Altitude</span>
                          <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{telem.altitude}m</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: C.text, fontSize: 12 }}>Coverage</span>
                          <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{mapCoverage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── WAYPOINTS TAB ────────────────────────── */}
              {tab === "waypoints" && (
                <div>
                  <div style={{ background: C.panel, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                    <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                      Mission Waypoints · {waypoints.length} set
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      {[
                        { label: "Shaft entrance", x: 3,  y: 3  },
                        { label: "Stockpile A",    x: 15, y: 4  },
                        { label: "Conveyor end",   x: 16, y: 14 },
                        { label: "Perimeter NE",   x: 18, y: 2  },
                        { label: "Perimeter SW",   x: 2,  y: 17 },
                      ].map(wp => (
                        <Btn key={wp.label} variant="ghost" small onClick={() => addWaypoint(wp.x, wp.y)}>
                          + {wp.label}
                        </Btn>
                      ))}
                      <Btn variant="danger" small onClick={() => setWaypoints([])}>Clear all</Btn>
                    </div>

                    {waypoints.length === 0 ? (
                      <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>
                        No waypoints set. Click a preset above or add custom coordinates.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {waypoints.map((wp, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                              <span style={{ background: C.yellow, color: "#0f172a", fontWeight: 700, fontSize: 11, borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                              <span style={{ color: C.text, fontSize: 13 }}>{wp.label}</span>
                              <span style={{ color: C.muted, fontSize: 12 }}>({wp.x}, {wp.y})</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ color: wp.scanned ? C.green : C.muted, fontSize: 11 }}>{wp.scanned ? "✅ Scanned" : "Pending"}</span>
                              <Btn variant="danger" small onClick={() => setWaypoints(prev => prev.filter((_, j) => j !== i))}>✕</Btn>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}
