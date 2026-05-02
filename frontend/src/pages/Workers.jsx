import React, { useEffect, useState, useCallback } from "react";
import { getWorkers, checkInWorker, checkOutWorker, deleteWorker } from "../api/api";
import {
  PageHeader, Btn, Input, Select, Spinner, StatusBadge,
  Table, TR, TD, useToast, StatCard,
} from "../components/UI";

const LOCATIONS = ["Surface", "Level 1", "Level 2", "Level 3", "Shaft", "Stockpile", "Workshop"];

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ workerId: "", fingerprint: "", location: "Surface" });
  const [search, setSearch] = useState("");
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    try {
      const res = await getWorkers();
      setWorkers(res.data);
    } catch (err) {
      show("Failed to load workers: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheckIn = async () => {
    if (!form.workerId.trim() || !form.fingerprint.trim()) {
      show("Card ID and Fingerprint are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await checkInWorker(form);
      show(`Worker checked in successfully`, "success");
      setForm({ workerId: "", fingerprint: "", location: "Surface" });
      load();
    } catch (err) {
      show("Check-in failed: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (workerId, name) => {
    try {
      await checkOutWorker({ workerId });
      show(`${name} checked out`, "success");
      load();
    } catch (err) {
      show("Check-out failed: " + err.message, "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete worker "${name}"?`)) return;
    try {
      await deleteWorker(id);
      show(`${name} deleted`, "success");
      load();
    } catch (err) {
      show("Delete failed: " + err.message, "error");
    }
  };

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.workerId.toLowerCase().includes(search.toLowerCase())
  );

  const checkedIn = workers.filter((w) => w.status === "checked-in").length;

  return (
    <div>
      {ToastEl}
      <PageHeader
        title="👷 Workers"
        subtitle={`${checkedIn} checked in · ${workers.length} total`}
      />

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard 
          title="Workers On-Site" 
          value={checkedIn} 
          sub={`of ${workers.length} total`} 
          color="#3b82f6" 
          icon="👷" 
        />
        <StatCard 
          title="Available Now" 
          value={workers.filter(w => w.status === "checked-out").length} 
          sub="Ready to check in" 
          color="#22c55e" 
          icon="✅" 
        />
        <StatCard 
          title="Surface Level" 
          value={workers.filter(w => w.location === "Surface" && w.status === "checked-in").length} 
          sub="Currently on surface" 
          color="#f59e0b" 
          icon="🏢" 
        />
        <StatCard 
          title="Underground" 
          value={workers.filter(w => w.location !== "Surface" && w.status === "checked-in").length} 
          sub="In mine levels" 
          color="#a78bfa" 
          icon="⛰️" 
        />
      </div>

      {/* Check-in Form */}
      <div
        style={{
          background: "#1e293b", borderRadius: 12, padding: 24,
          marginBottom: 24, border: "1px solid #334155",
        }}
      >
        <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
          Check In Worker
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Input
              placeholder="Card ID (e.g. W001)"
              value={form.workerId}
              onChange={(e) => setForm({ ...form, workerId: e.target.value })}
            />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Input
              placeholder="Fingerprint Hash"
              value={form.fingerprint}
              onChange={(e) => setForm({ ...form, fingerprint: e.target.value })}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </div>
          <Btn onClick={handleCheckIn} variant="success" disabled={submitting}>
            {submitting ? "Checking in…" : "✅ Check In"}
          </Btn>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <Input
          placeholder="🔍 Search by name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <Spinner />
      ) : (
        <Table headers={["Name", "Worker ID", "Status", "Location", "Check-In Time", "Actions"]}>
          {filtered.map((w) => (
            <TR key={w.workerId || w.id || w._id}>
              <TD><span style={{ fontWeight: 600, color: "#f1f5f9" }}>{w.name}</span></TD>
              <TD><code style={{ background: "#0f172a", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{w.workerId}</code></TD>
              <TD><StatusBadge status={w.status} /></TD>
              <TD>{w.location}</TD>
              <TD>
                {w.checkInTime
                  ? new Date(w.checkInTime).toLocaleString()
                  : <span style={{ color: "#475569" }}>—</span>}
              </TD>
              <TD>
                <div style={{ display: "flex", gap: 6 }}>
                  {w.status === "checked-in" && (
                    <Btn small variant="warning" onClick={() => handleCheckOut(w.workerId, w.name)}>
                      Check Out
                    </Btn>
                  )}
                  <Btn small variant="danger" onClick={() => handleDelete(w._id, w.name)}>
                    Delete
                  </Btn>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
          {search ? "No workers match your search." : "No workers yet. Check someone in above."}
        </div>
      )}
    </div>
  );
}
