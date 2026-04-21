import React, { useEffect, useState, useCallback } from "react";
import { getTools, createTool, updateTool, deleteTool } from "../api/api";
import {
  PageHeader, Btn, Input, Select, Spinner, StatusBadge,
  Table, TR, TD, useToast,
} from "../components/UI";

const TYPES = ["drill", "detector", "sensor", "helmet", "other"];
const STATUSES = ["available", "assigned", "maintenance", "lost"];

export default function Tools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", type: "drill", rfidTag: "" });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getTools();
      setTools(res.data);
    } catch (err) {
      show("Failed to load tools: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name.trim()) { show("Tool name is required", "error"); return; }
    setSubmitting(true);
    try {
      await createTool({ name: form.name, type: form.type, rfidTag: form.rfidTag || undefined });
      show(`Tool "${form.name}" added`, "success");
      setForm({ name: "", type: "drill", rfidTag: "" });
      load();
    } catch (err) {
      show("Add failed: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateTool(id, { status });
      show("Tool status updated", "success");
      load();
    } catch (err) {
      show("Update failed: " + err.message, "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete tool "${name}"?`)) return;
    try {
      await deleteTool(id);
      show(`"${name}" deleted`, "success");
      load();
    } catch (err) {
      show("Delete failed: " + err.message, "error");
    }
  };

  const filtered = tools.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="🔧 Tools"
        subtitle={`${tools.filter((t) => t.status === "available").length} available · ${tools.length} total`}
      />

      {/* Add Form */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 24, border: "1px solid #334155" }}>
        <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Add New Tool
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 160 }}>
            <Input placeholder="Tool Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Input placeholder="RFID Tag (optional)" value={form.rfidTag} onChange={(e) => setForm({ ...form, rfidTag: e.target.value })} />
          </div>
          <Btn onClick={handleAdd} variant="primary" disabled={submitting}>
            {submitting ? "Adding…" : "➕ Add Tool"}
          </Btn>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, maxWidth: 280 }}>
          <Input placeholder="🔍 Search tools…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: 160 }}>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </Select>
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
        <Table headers={["Name", "Type", "RFID Tag", "Status", "Assigned To", "Last Checked", "Actions"]}>
          {filtered.map((t) => (
            <TR key={t._id}>
              <TD><span style={{ fontWeight: 600, color: "#f1f5f9" }}>{t.name}</span></TD>
              <TD><span style={{ textTransform: "capitalize" }}>{t.type}</span></TD>
              <TD>
                {t.rfidTag
                  ? <code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{t.rfidTag}</code>
                  : <span style={{ color: "#475569" }}>—</span>}
              </TD>
              <TD>
                <select
                  value={t.status}
                  onChange={(e) => handleStatusChange(t._id, e.target.value)}
                  style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 6, padding: "4px 8px", color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </TD>
              <TD>
                {t.currentWorker
                  ? <span style={{ color: "#60a5fa" }}>{t.currentWorker.name}</span>
                  : <span style={{ color: "#475569" }}>—</span>}
              </TD>
              <TD style={{ fontSize: 12 }}>{new Date(t.lastChecked).toLocaleDateString()}</TD>
              <TD>
                <Btn small variant="danger" onClick={() => handleDelete(t._id, t.name)}>Delete</Btn>
              </TD>
            </TR>
          ))}
        </Table>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
          {search || filterStatus !== "all" ? "No tools match your filters." : "No tools yet. Add one above."}
        </div>
      )}
    </div>
  );
}
