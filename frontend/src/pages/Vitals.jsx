import React, { useEffect, useState, useCallback } from "react";
import { getWorkers, submitVitals, getVitals, overrideVitals, deleteVital } from "../api/api";
import {
  PageHeader, Btn, Input, Select, Spinner,
  useToast, StatCard, Table, TR, TD,
} from "../components/UI";

// ── Constants ─────────────────────────────────────────────
const RANGES = {
  heartRate:    { normal: "60–100 BPM",      warning: "50–59 / 101–120",       critical: "<50 or >120" },
  temperature:  { normal: "36.1–37.2°C",     warning: "35.5–36.0 / 37.3–38.0", critical: "<35.5 or >38.1°C" },
  bloodOxygen:  { normal: "≥95%",            warning: "90–94%",                 critical: "<90%" },
  bloodPressure:{ normal: "90–120 / 60–80",  warning: "130+/90+",               critical: "180+/120+" },
  drugs:        { normal: "Negative",        warning: "—",                      critical: "Positive (FAIL)" },
};

const DRUG_OPTIONS = ["Cannabis","Opioids","Cocaine","Amphetamines","Benzodiazepines","Methamphetamine","MDMA","Other"];
const SC = { normal:"#22c55e", warning:"#f59e0b", critical:"#ef4444", pass:"#22c55e", fail:"#ef4444", "not-tested":"#475569", fit:"#22c55e", caution:"#f59e0b", unfit:"#ef4444" };
const SB = { normal:"#14532d33", warning:"#78350f33", critical:"#7f1d1d33", pass:"#14532d33", fail:"#7f1d1d33", fit:"#14532d33", caution:"#78350f33", unfit:"#7f1d1d33" };

// ── Sub-components ────────────────────────────────────────
function VitalCard({ label, value, unit, status }) {
  const col = SC[status] || "#94a3b8";
  return (
    <div style={{ background: SB[status]||"#1e293b33", border:`1px solid ${col}44`, borderLeft:`4px solid ${col}`, borderRadius:10, padding:"14px 16px", flex:1, minWidth:130 }}>
      <div style={{ color:"#94a3b8", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
      <div style={{ color:col, fontSize:24, fontWeight:700, marginTop:4 }}>{value || "—"}{value ? unit : ""}</div>
      <div style={{ color:col, fontSize:11, marginTop:4, fontWeight:600, textTransform:"uppercase" }}>{status}</div>
    </div>
  );
}

function FitnessBadge({ status, blockReason }) {
  const map = {
    fit:     { bg:"#14532d", color:"#4ade80", icon:"✅", label:"FIT FOR WORK" },
    caution: { bg:"#78350f", color:"#fbbf24", icon:"⚠️", label:"CLEARED — CAUTION" },
    unfit:   { bg:"#7f1d1d", color:"#f87171", icon:"🚫", label:"UNFIT — ENTRY BLOCKED" },
  };
  const s = map[status] || map.fit;
  return (
    <div>
      <div style={{ background:s.bg, color:s.color, padding:"10px 20px", borderRadius:10, fontWeight:700, fontSize:15, display:"inline-flex", alignItems:"center", gap:8 }}>
        {s.icon} {s.label}
      </div>
      {blockReason && (
        <div style={{ color:"#f87171", fontSize:12, marginTop:6, fontWeight:500 }}>
          Reason: {blockReason}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <h3 style={{ color:"#94a3b8", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:16, paddingBottom:8, borderBottom:"1px solid #1e293b" }}>
      {title}
    </h3>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <label style={{ color:"#64748b", fontSize:12, display:"block", marginBottom:6 }}>
      {children}
      {hint && <span style={{ color:"#334155", marginLeft:6, fontStyle:"italic" }}>{hint}</span>}
    </label>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function Vitals() {
  const [workers, setWorkers]     = useState([]);
  const [vitals, setVitals]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [tab, setTab]             = useState("submit");
  const [supervisorModal, setSupervisorModal] = useState(null);
  const [overrideModal, setOverrideModal]     = useState(null);
  const { show, ToastEl } = useToast();

  const emptyForm = {
    workerId:"", workerName:"", checkType:"check-in",
    heartRate:"", temperature:"", bloodOxygen:"", bpSystolic:"", bpDiastolic:"",
    drugResult:"not-tested", drugSubstances:[], drugMethod:"urine",
    supervisorName:"", notes:"",
  };
  const [form, setForm] = useState(emptyForm);
  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const loadData = useCallback(async () => {
    try {
      const [wRes, vRes] = await Promise.all([getWorkers(), getVitals({ limit:200 })]);
      setWorkers(wRes.data);
      setVitals(vRes.data);
    } catch (err) { show("Load failed: " + err.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleWorkerSelect = (e) => {
    const id = e.target.value;
    const w  = workers.find(w => w.workerId === id);
    setForm(p => ({ ...p, workerId:id, workerName: w ? w.name : "" }));
  };

  const toggleDrugSubstance = (sub) => {
    setForm(p => ({
      ...p,
      drugSubstances: p.drugSubstances.includes(sub)
        ? p.drugSubstances.filter(s => s !== sub)
        : [...p.drugSubstances, sub],
    }));
  };

  const handleSubmit = async () => {
    if (!form.workerId) { show("Select a worker first", "error"); return; }
    const anyVital = form.heartRate || form.temperature || form.bloodOxygen || form.bpSystolic || form.drugResult !== "not-tested";
    if (!anyVital) { show("Enter at least one vital sign or test result", "error"); return; }

    setSubmitting(true);
    setLastResult(null);
    try {
      const payload = {
        workerId:    form.workerId,
        workerName:  form.workerName,
        checkType:   form.checkType,
        heartRate:   form.heartRate   ? Number(form.heartRate)   : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        bloodOxygen: form.bloodOxygen ? Number(form.bloodOxygen) : undefined,
        bloodPressure: form.bpSystolic ? { systolic: Number(form.bpSystolic), diastolic: Number(form.bpDiastolic) } : undefined,
        drugTest: form.drugResult !== "not-tested"
          ? { result: form.drugResult, substances: form.drugSubstances, testMethod: form.drugMethod }
          : undefined,
        supervisorName: form.supervisorName || undefined,
        notes: form.notes,
      };

      const res = await submitVitals(payload);
      setLastResult(res.data);

      if (res.data.overallStatus === "unfit") {
        show("🚫 " + form.workerName + " is UNFIT — entry BLOCKED. " + (res.data.alertsCreated) + " alert(s) created.", "error");
      } else if (res.data.overallStatus === "caution") {
        show("⚠️ " + form.workerName + " cleared with CAUTION. " + res.data.alertsCreated + " alert(s) created.", "warning");
      } else {
        show("✅ " + form.workerName + " is FIT for work.", "success");
      }

      setForm(p => ({ ...emptyForm, workerId: p.workerId, workerName: p.workerName, checkType: p.checkType }));
      loadData();
    } catch (err) {
      show("Submit failed: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotify = async (id, supervisorName) => {
    try {
      await notifyVitals(id, { supervisorName });
      show("Supervisor " + supervisorName + " notified ✅", "success");
      setSupervisorModal(null);
      loadData();
    } catch (err) { show("Notify failed: " + err.message, "error"); }
  };

  const handleOverride = async (id, overriddenBy, overrideReason) => {
    try {
      await overrideVitals(id, { overriddenBy, overrideReason });
      show("Override applied by " + overriddenBy, "success");
      setOverrideModal(null);
      loadData();
    } catch (err) { show("Override failed: " + err.message, "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reading?")) return;
    try {
      await deleteVital(id);
      show("Deleted", "success");
      loadData();
    } catch (err) { show("Delete failed: " + err.message, "error"); }
  };

  // Stats
  const today       = new Date().toDateString();
  const todayCount  = vitals.filter(v => new Date(v.createdAt).toDateString() === today).length;
  const unfitCount  = vitals.filter(v => v.overallStatus === "unfit"   && !v.overriddenBy).length;
  const cautionCount= vitals.filter(v => v.overallStatus === "caution").length;
  const drugFails   = vitals.filter(v => v.drugTest?.status === "fail").length;

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{ background: tab===id?"#334155":"#1e293b", border:`1px solid ${tab===id?"#64748b":"#334155"}`, color: tab===id?"#f1f5f9":"#64748b", padding:"8px 20px", borderRadius:8, fontSize:14, fontWeight:tab===id?600:400, cursor:"pointer" }}>
      {label}
    </button>
  );

  // ── Supervisor modal ──────────────────────────────────
  const SupervisorModal = () => {
    const [name, setName] = useState("");
    if (!supervisorModal) return null;
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
        <div style={{ background:"#1e293b", borderRadius:12, padding:28, width:360, border:"1px solid #ef4444" }}>
          <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16, marginBottom:8 }}>🔔 Notify Supervisor</div>
          <div style={{ color:"#94a3b8", fontSize:13, marginBottom:16 }}>
            Worker <strong style={{color:"#f1f5f9"}}>{supervisorModal.workerName}</strong> has an abnormal reading. Enter supervisor name to log notification.
          </div>
          <div style={{ marginBottom:16 }}>
            <FieldLabel>Supervisor name</FieldLabel>
            <Input placeholder="e.g. John Dlamini" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="warning" onClick={() => handleNotify(supervisorModal.id, name)} disabled={!name.trim()}>
              Send Notification
            </Btn>
            <Btn variant="ghost" onClick={() => setSupervisorModal(null)}>Cancel</Btn>
          </div>
        </div>
      </div>
    );
  };

  // ── Override modal ────────────────────────────────────
  const OverrideModal = () => {
    const [name, setName]     = useState("");
    const [reason, setReason] = useState("");
    if (!overrideModal) return null;
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
        <div style={{ background:"#1e293b", borderRadius:12, padding:28, width:400, border:"1px solid #f59e0b" }}>
          <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:16, marginBottom:8 }}>🔓 Supervisor Override</div>
          <div style={{ color:"#94a3b8", fontSize:13, marginBottom:16 }}>
            Overriding UNFIT status for <strong style={{color:"#f1f5f9"}}>{overrideModal.workerName}</strong>. This action is logged and creates an alert.
          </div>
          <div style={{ marginBottom:12 }}>
            <FieldLabel>Supervisor name *</FieldLabel>
            <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div style={{ marginBottom:16 }}>
            <FieldLabel>Reason for override *</FieldLabel>
            <Input placeholder="e.g. Medical clearance obtained" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="warning" onClick={() => handleOverride(overrideModal.id, name, reason)} disabled={!name.trim() || !reason.trim()}>
              Apply Override
            </Btn>
            <Btn variant="ghost" onClick={() => setOverrideModal(null)}>Cancel</Btn>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div>
      {ToastEl}
      <SupervisorModal />
      <OverrideModal />

      <PageHeader title="🫀 Human Vitals Monitor" subtitle="Health screening at check-in and check-out — vitals and drug testing" />

      {/* Stats */}
      <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:24 }}>
        <StatCard title="Readings Today"   value={todayCount}   color="#3b82f6" icon="📋" />
        <StatCard title="Currently Blocked" value={unfitCount}   color={unfitCount>0?"#ef4444":"#22c55e"} icon="🚫" />
        <StatCard title="Caution"           value={cautionCount} color={cautionCount>0?"#f59e0b":"#22c55e"} icon="⚠️" />
        <StatCard title="Drug Fails"        value={drugFails}    color={drugFails>0?"#ef4444":"#22c55e"} icon="💊" />
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <TabBtn id="submit"  label="📋 Submit Reading" />
        <TabBtn id="history" label="📜 History" />
        <TabBtn id="ranges"  label="📊 Normal Ranges" />
      </div>

      {/* ═══════════════════════════════ TAB: SUBMIT ══ */}
      {tab === "submit" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Worker selector */}
          <div style={{ background:"#1e293b", borderRadius:12, padding:24, border:"1px solid #334155" }}>
            <SectionHeader title="Worker & check type" />
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:2, minWidth:200 }}>
                <FieldLabel>Select worker</FieldLabel>
                <Select value={form.workerId} onChange={handleWorkerSelect}>
                  <option value="">— Select worker —</option>
                  {workers.map(w => <option key={w.workerId} value={w.workerId}>{w.name} ({w.workerId})</option>)}
                </Select>
              </div>
              <div style={{ flex:1, minWidth:160 }}>
                <FieldLabel>Check type</FieldLabel>
                <Select value={form.checkType} onChange={e => f("checkType", e.target.value)}>
                  <option value="check-in">Check-in</option>
                  <option value="check-out">Check-out</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Vital signs */}
          <div style={{ background:"#1e293b", borderRadius:12, padding:24, border:"1px solid #334155" }}>
            <SectionHeader title="❤️ Vital signs" />
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:140 }}>
                <FieldLabel hint="Normal: 60–100">Heart rate (BPM)</FieldLabel>
                <Input type="number" placeholder="e.g. 72" value={form.heartRate} onChange={e => f("heartRate", e.target.value)} />
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <FieldLabel hint="Normal: 36.1–37.2">Temperature (°C)</FieldLabel>
                <Input type="number" placeholder="e.g. 36.6" value={form.temperature} onChange={e => f("temperature", e.target.value)} />
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <FieldLabel hint="Normal: ≥95%">SpO2 (%)</FieldLabel>
                <Input type="number" placeholder="e.g. 98" value={form.bloodOxygen} onChange={e => f("bloodOxygen", e.target.value)} />
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <FieldLabel hint="Normal: 90–120/60–80">Blood pressure (mmHg)</FieldLabel>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <Input type="number" placeholder="Systolic" value={form.bpSystolic}  onChange={e => f("bpSystolic",  e.target.value)} />
                  <span style={{ color:"#475569" }}>/</span>
                  <Input type="number" placeholder="Diastolic" value={form.bpDiastolic} onChange={e => f("bpDiastolic", e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Drug test */}
          <div style={{ background:"#1e293b", borderRadius:12, padding:24, border:"1px solid #334155" }}>
            <SectionHeader title="💊 Drug test" />
            <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:16 }}>
              <div style={{ flex:1, minWidth:160 }}>
                <FieldLabel>Result</FieldLabel>
                <Select value={form.drugResult} onChange={e => f("drugResult", e.target.value)}>
                  <option value="not-tested">Not tested</option>
                  <option value="negative">Negative (Pass)</option>
                  <option value="positive">Positive (Fail)</option>
                </Select>
              </div>
              <div style={{ flex:1, minWidth:150 }}>
                <FieldLabel>Test method</FieldLabel>
                <Select value={form.drugMethod} onChange={e => f("drugMethod", e.target.value)}>
                  <option value="urine">Urine</option>
                  <option value="saliva">Saliva</option>
                  <option value="blood">Blood</option>
                  <option value="not-tested">Not tested</option>
                </Select>
              </div>
            </div>
            {form.drugResult === "positive" && (
              <div>
                <FieldLabel>Substances detected (select all that apply)</FieldLabel>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:4 }}>
                  {DRUG_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => toggleDrugSubstance(s)}
                      style={{
                        background: form.drugSubstances.includes(s) ? "#7f1d1d" : "#0f172a",
                        border: `1px solid ${form.drugSubstances.includes(s) ? "#ef4444" : "#334155"}`,
                        color: form.drugSubstances.includes(s) ? "#f87171" : "#64748b",
                        padding:"6px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Supervisor + Notes */}
          <div style={{ background:"#1e293b", borderRadius:12, padding:24, border:"1px solid #334155" }}>
            <SectionHeader title="🔔 Supervisor & notes" />
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:200 }}>
                <FieldLabel hint="Auto-notified if result is abnormal">Supervisor on duty</FieldLabel>
                <Input placeholder="e.g. John Dlamini" value={form.supervisorName} onChange={e => f("supervisorName", e.target.value)} />
              </div>
              <div style={{ flex:2, minWidth:200 }}>
                <FieldLabel>Notes (optional)</FieldLabel>
                <Input placeholder="Any observations…" value={form.notes} onChange={e => f("notes", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div>
            <Btn onClick={handleSubmit} variant="success" disabled={submitting}>
              {submitting ? "Submitting…" : "🫀 Submit Health Screening"}
            </Btn>
          </div>

          {/* Result */}
          {lastResult && (() => {
            const r = lastResult.reading;
            return (
              <div style={{ background: SB[lastResult.overallStatus]||"#1e293b33", border:`2px solid ${SC[lastResult.overallStatus]}`, borderRadius:12, padding:24 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12, marginBottom:20 }}>
                  <div>
                    <div style={{ color:"#f1f5f9", fontSize:18, fontWeight:700 }}>{r.workerName}</div>
                    <div style={{ color:"#64748b", fontSize:13 }}>{r.workerId} · {r.checkType} · {new Date(r.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <FitnessBadge status={lastResult.overallStatus} blockReason={lastResult.blockReason} />
                </div>

                <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:16 }}>
                  {r.heartRate.value    != null && <VitalCard label="Heart rate"     value={r.heartRate.value}    unit=" BPM"    status={r.heartRate.status} />}
                  {r.temperature.value  != null && <VitalCard label="Temperature"    value={r.temperature.value}  unit="°C"      status={r.temperature.status} />}
                  {r.bloodOxygen.value  != null && <VitalCard label="SpO2"           value={r.bloodOxygen.value}  unit="%"       status={r.bloodOxygen.status} />}
                  {r.bloodPressure.systolic != null && <VitalCard label="Blood pressure" value={r.bloodPressure.systolic + "/" + r.bloodPressure.diastolic} unit=" mmHg" status={r.bloodPressure.status} />}
                  {r.drugTest.result !== "not-tested" && <VitalCard label="Drug test" value={r.drugTest.result}  unit="" status={r.drugTest.status === "fail" ? "critical" : "normal"} />}
                </div>

                {lastResult.alertsCreated > 0 && (
                  <div style={{ background:"#78350f33", border:"1px solid #f59e0b44", borderRadius:8, padding:"10px 14px", marginBottom:12, color:"#fbbf24", fontSize:13 }}>
                    ⚠️ {lastResult.alertsCreated} medical alert(s) auto-created and visible on the Alerts page.
                  </div>
                )}
                {lastResult.supervisorNotified && (
                  <div style={{ background:"#1e3a5f33", border:"1px solid #3b82f644", borderRadius:8, padding:"10px 14px", color:"#60a5fa", fontSize:13 }}>
                    🔔 Supervisor notified and logged in this record.
                  </div>
                )}
                {!lastResult.clearedForWork && (
                  <div style={{ background:"#7f1d1d33", border:"1px solid #ef444444", borderRadius:8, padding:"10px 14px", marginTop:12, color:"#f87171", fontSize:13, fontWeight:600 }}>
                    🚫 Worker is NOT cleared. A supervisor override is required before entry is permitted.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════ TAB: HISTORY ══ */}
      {tab === "history" && (
        <div>
          {loading ? <Spinner /> : (
            <Table headers={["Worker","Type","Vitals","Drug","Overall","Supervisor","Time","Actions"]}>
              {vitals.map(v => (
                <TR key={v.id || v._id}>
                  <TD>
                    <div style={{ fontWeight:600, color:"#f1f5f9" }}>{v.workerName}</div>
                    <div style={{ color:"#475569", fontSize:11 }}>{v.workerId}</div>
                  </TD>
                  <TD><span style={{ textTransform:"capitalize", fontSize:12, color:"#94a3b8" }}>{v.checkType}</span></TD>
                  <TD>
                    <div style={{ display:"flex", flexDirection:"column", gap:2, fontSize:12 }}>
                      {v.heartRate.value    != null && <span style={{ color: SC[v.heartRate.status] }}>HR: {v.heartRate.value} BPM</span>}
                      {v.temperature.value  != null && <span style={{ color: SC[v.temperature.status] }}>T: {v.temperature.value}°C</span>}
                      {v.bloodOxygen.value  != null && <span style={{ color: SC[v.bloodOxygen.status] }}>SpO2: {v.bloodOxygen.value}%</span>}
                      {v.bloodPressure.systolic != null && <span style={{ color: SC[v.bloodPressure.status] }}>BP: {v.bloodPressure.systolic}/{v.bloodPressure.diastolic}</span>}
                    </div>
                  </TD>
                  <TD>
                    {v.drugTest.result !== "not-tested"
                      ? <div>
                          <span style={{ color: v.drugTest.status==="fail" ? "#ef4444" : "#22c55e", fontWeight:600 }}>{v.drugTest.result.toUpperCase()}</span>
                          {v.drugTest.substances.length > 0 && <div style={{ color:"#f87171", fontSize:11 }}>{v.drugTest.substances.join(", ")}</div>}
                        </div>
                      : <span style={{ color:"#334155" }}>Not tested</span>}
                  </TD>
                  <TD>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      <span style={{ color: SC[v.overallStatus], fontWeight:700, fontSize:12 }}>
                        {v.overallStatus==="fit" ? "✅ FIT" : v.overallStatus==="caution" ? "⚠️ CAUTION" : "🚫 UNFIT"}
                      </span>
                      {v.overriddenBy && <span style={{ color:"#fbbf24", fontSize:11 }}>Override: {v.overriddenBy}</span>}
                      {v.blockReason  && !v.overriddenBy && <span style={{ color:"#f87171", fontSize:11 }}>{v.blockReason}</span>}
                    </div>
                  </TD>
                  <TD>
                    {v.supervisorNotified
                      ? <span style={{ color:"#60a5fa", fontSize:12 }}>🔔 {v.supervisorName}</span>
                      : <span style={{ color:"#334155", fontSize:12 }}>—</span>}
                  </TD>
                  <TD><span style={{ fontSize:11, color:"#64748b" }}>{new Date(v.createdAt).toLocaleString()}</span></TD>
                  <TD>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {(v.overallStatus === "unfit" || v.overallStatus === "caution") && !v.supervisorNotified && (
                        <Btn small variant="primary" onClick={() => setSupervisorModal({ id: v._id, workerName: v.workerName })}>
                          🔔 Notify
                        </Btn>
                      )}
                      {v.overallStatus === "unfit" && !v.overriddenBy && (
                        <Btn small variant="warning" onClick={() => setOverrideModal({ id: v._id, workerName: v.workerName })}>
                          Override
                        </Btn>
                      )}
                      <Btn small variant="danger" onClick={() => handleDelete(v._id)}>Delete</Btn>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
          {!loading && vitals.length === 0 && (
            <div style={{ textAlign:"center", padding:40, color:"#475569" }}>No readings yet. Submit a health screening above.</div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════ TAB: RANGES ══ */}
      {tab === "ranges" && (
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {Object.entries(RANGES).map(([key, range]) => {
            const labels = { heartRate:"❤️ Heart rate", temperature:"🌡️ Temperature", bloodOxygen:"🫁 Blood oxygen", bloodPressure:"💉 Blood pressure", drugs:"💊 Drug test" };
            return (
              <div key={key} style={{ flex:1, minWidth:220, background:"#1e293b", borderRadius:12, padding:20, border:"1px solid #334155" }}>
                <div style={{ fontWeight:600, color:"#f1f5f9", marginBottom:14, fontSize:15 }}>{labels[key]}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[["normal","#22c55e","✅ Normal / Pass"],["warning","#f59e0b","⚠️ Warning"],["critical","#ef4444","🚫 Critical / Fail"]].map(([level, color, label]) => (
                    <div key={level} style={{ display:"flex", justifyContent:"space-between", background:`${color}11`, border:`1px solid ${color}44`, borderRadius:6, padding:"8px 12px" }}>
                      <span style={{ color, fontSize:12, fontWeight:600 }}>{label}</span>
                      <span style={{ color:"#94a3b8", fontSize:12 }}>{range[level]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
