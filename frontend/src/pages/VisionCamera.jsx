import React, { useEffect, useState } from "react";
import {
  getVisionCameras,
  createVisionCamera,
  updateVisionCamera,
  deleteVisionCamera,
  startVisionCameraRecording,
  stopVisionCameraRecording,
} from "../api/api";
import { PageHeader, Btn, Input, Select, Spinner, useToast, StatCard, StatusBadge, Table, TR, TD } from "../components/UI";

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

export default function VisionCamera() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    cameraId: "",
    location: "",
    resolution: "1920x1080",
    frameRate: 30,
    ipAddress: "",
    nightVision: true,
    motionDetection: true,
  });
  const toast = useToast();

  // ── Load cameras ───────────────────────────────────────
  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await getVisionCameras();
      setCameras(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast?.("Failed to load cameras", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Handle form submission ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.cameraId || !form.location) {
      toast?.("Please fill in all required fields", "error");
      return;
    }

    try {
      if (editingId) {
        await updateVisionCamera(editingId, form);
        toast?.("Camera updated successfully", "success");
      } else {
        await createVisionCamera(form);
        toast?.("Camera created successfully", "success");
      }
      resetForm();
      fetchCameras();
    } catch (error) {
      toast?.(error.message || "Failed to save camera", "error");
    }
  };

  // ── Reset form ─────────────────────────────────────────
  const resetForm = () => {
    setForm({
      name: "",
      cameraId: "",
      location: "",
      resolution: "1920x1080",
      frameRate: 30,
      ipAddress: "",
      nightVision: true,
      motionDetection: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // ── Edit camera ────────────────────────────────────────
  const handleEdit = (camera) => {
    setForm({
      name: camera.name,
      cameraId: camera.cameraId,
      location: camera.location,
      resolution: camera.resolution || "1920x1080",
      frameRate: camera.frameRate || 30,
      ipAddress: camera.ipAddress || "",
      nightVision: camera.nightVision !== false,
      motionDetection: camera.motionDetection !== false,
    });
    setEditingId(camera.id);
    setShowForm(true);
  };

  // ── Delete camera ──────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this camera?")) return;
    try {
      await deleteVisionCamera(id);
      toast?.("Camera deleted successfully", "success");
      fetchCameras();
    } catch (error) {
      toast?.(error.message || "Failed to delete camera", "error");
    }
  };

  // ── Toggle recording ───────────────────────────────────
  const handleToggleRecording = async (camera) => {
    try {
      if (camera.isRecording) {
        await stopVisionCameraRecording(camera.id);
        toast?.("Recording stopped", "success");
      } else {
        await startVisionCameraRecording(camera.id);
        toast?.("Recording started", "success");
      }
      fetchCameras();
    } catch (error) {
      toast?.(error.message || "Failed to toggle recording", "error");
    }
  };

  // ── Toggle status ──────────────────────────────────────
  const handleToggleStatus = async (camera) => {
    try {
      const newStatus = camera.status === "active" ? "inactive" : "active";
      await updateVisionCamera(camera.id, { status: newStatus });
      toast?.(`Camera ${newStatus}`, "success");
      fetchCameras();
    } catch (error) {
      toast?.(error.message || "Failed to update status", "error");
    }
  };

  // ── Stats ──────────────────────────────────────────────
  const stats = {
    total: cameras.length,
    active: cameras.filter((c) => c.status === "active").length,
    recording: cameras.filter((c) => c.isRecording).length,
    offline: cameras.filter((c) => !c.connected).length,
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: 20, background: C.bg, minHeight: "100vh" }}>
      <PageHeader
        title="📹 Vision Cameras"
        subtitle="Monitor mining site with installed surveillance cameras"
        actions={
          <Btn label="➕ Add Camera" onClick={() => setShowForm(true)} variant="primary" />
        }
      />

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 15,
          marginBottom: 30,
        }}
      >
        <StatCard label="Total Cameras" value={stats.total} color={C.blue} />
        <StatCard label="Active" value={stats.active} color={C.green} />
        <StatCard label="Recording" value={stats.recording} color={C.cyan} />
        <StatCard label="Offline" value={stats.offline} color={C.red} />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div
          style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 30,
          }}
        >
          <h3 style={{ color: C.text, marginTop: 0 }}>
            {editingId ? "Edit Camera" : "Add New Camera"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
              <Input
                label="Camera Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main Entrance"
              />
              <Input
                label="Camera ID *"
                value={form.cameraId}
                onChange={(e) => setForm({ ...form, cameraId: e.target.value })}
                placeholder="e.g., CAM-001"
              />
              <Input
                label="Location *"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g., Zone A"
              />
              <Input
                label="IP Address"
                value={form.ipAddress}
                onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                placeholder="192.168.1.100"
              />
              <Select
                label="Resolution"
                value={form.resolution}
                onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                options={[
                  { value: "1280x720", label: "720p" },
                  { value: "1920x1080", label: "1080p" },
                  { value: "2560x1440", label: "1440p" },
                  { value: "3840x2160", label: "4K" },
                ]}
              />
              <Input
                label="Frame Rate (fps)"
                type="number"
                value={form.frameRate}
                onChange={(e) => setForm({ ...form, frameRate: parseInt(e.target.value) || 30 })}
                min="15"
                max="60"
              />
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
              <label style={{ color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.nightVision}
                  onChange={(e) => setForm({ ...form, nightVision: e.target.checked })}
                />
                Night Vision
              </label>
              <label style={{ color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.motionDetection}
                  onChange={(e) => setForm({ ...form, motionDetection: e.target.checked })}
                />
                Motion Detection
              </label>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Btn label="Save" type="submit" variant="primary" />
              <Btn label="Cancel" onClick={resetForm} variant="secondary" />
            </div>
          </form>
        </div>
      )}

      {/* Cameras Table */}
      {cameras.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: C.muted,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
          }}
        >
          No cameras added yet. Click "Add Camera" to get started.
        </div>
      ) : (
        <Table>
          <thead>
            <TR header>
              <TD width="15%">Camera</TD>
              <TD width="12%">Location</TD>
              <TD width="12%">Status</TD>
              <TD width="12%">Resolution</TD>
              <TD width="12%">Recording</TD>
              <TD width="12%">Connection</TD>
              <TD width="25%">Actions</TD>
            </TR>
          </thead>
          <tbody>
            {cameras.map((camera) => (
              <TR key={camera.id}>
                <TD>
                  <div style={{ color: C.text, fontSize: 13 }}>
                    <strong>{camera.name}</strong>
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                      {camera.cameraId}
                    </div>
                  </div>
                </TD>
                <TD style={{ color: C.text }}>{camera.location}</TD>
                <TD>
                  <StatusBadge
                    status={camera.status}
                    statusMap={{
                      active: { bg: C.green, text: "#000" },
                      inactive: { bg: C.yellow, text: "#000" },
                      maintenance: { bg: C.yellow, text: "#000" },
                      offline: { bg: C.red, text: "#fff" },
                    }}
                  />
                </TD>
                <TD style={{ color: C.muted, fontSize: 12 }}>
                  {camera.resolution} @ {camera.frameRate}fps
                </TD>
                <TD>
                  <StatusBadge
                    status={camera.isRecording ? "recording" : "idle"}
                    statusMap={{
                      recording: { bg: C.red, text: "#fff" },
                      idle: { bg: C.dim, text: C.muted },
                    }}
                  />
                </TD>
                <TD>
                  <StatusBadge
                    status={camera.connected ? "online" : "offline"}
                    statusMap={{
                      online: { bg: C.green, text: "#000" },
                      offline: { bg: C.red, text: "#fff" },
                    }}
                  />
                </TD>
                <TD>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn
                      label={camera.isRecording ? "⏹️ Stop" : "⏺️ Record"}
                      onClick={() => handleToggleRecording(camera)}
                      variant={camera.isRecording ? "danger" : "primary"}
                      size="sm"
                    />
                    <Btn
                      label={camera.status === "active" ? "🔴 Disable" : "🟢 Enable"}
                      onClick={() => handleToggleStatus(camera)}
                      variant="secondary"
                      size="sm"
                    />
                    <Btn
                      label="✏️"
                      onClick={() => handleEdit(camera)}
                      variant="secondary"
                      size="sm"
                    />
                    <Btn
                      label="🗑️"
                      onClick={() => handleDelete(camera.id)}
                      variant="danger"
                      size="sm"
                    />
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
