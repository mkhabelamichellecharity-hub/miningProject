import React, { useState } from "react";

// ── Status Badge ─────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    "checked-in": { bg: "#166534", color: "#4ade80", label: "Checked In" },
    "checked-out": { bg: "#7f1d1d", color: "#f87171", label: "Checked Out" },
    available: { bg: "#14532d", color: "#4ade80", label: "Available" },
    assigned: { bg: "#1e3a5f", color: "#60a5fa", label: "Assigned" },
    maintenance: { bg: "#78350f", color: "#fbbf24", label: "Maintenance" },
    lost: { bg: "#7f1d1d", color: "#f87171", label: "Lost" },
    Running: { bg: "#14532d", color: "#4ade80", label: "Running" },
    Stopped: { bg: "#7f1d1d", color: "#f87171", label: "Stopped" },
    Maintenance: { bg: "#78350f", color: "#fbbf24", label: "Maintenance" },
    Fault: { bg: "#6b21a8", color: "#c084fc", label: "Fault" },
    Low: { bg: "#14532d", color: "#4ade80", label: "Low" },
    Medium: { bg: "#78350f", color: "#fbbf24", label: "Medium" },
    High: { bg: "#7c2d12", color: "#fb923c", label: "High" },
    Critical: { bg: "#7f1d1d", color: "#f87171", label: "Critical" },
  };
  const s = map[status] || { bg: "#1e293b", color: "#94a3b8", label: status };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        border: `1px solid ${s.color}33`,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────
export function StatCard({ title, value, sub, color = "#3b82f6", icon }) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${color}33`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        padding: "20px 24px",
        minWidth: 160,
        flex: 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
            {title}
          </div>
          <div style={{ color: "#f1f5f9", fontSize: 32, fontWeight: 700, marginTop: 4 }}>
            {value}
          </div>
          {sub && <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && (
          <span style={{ fontSize: 28, opacity: 0.7 }}>{icon}</span>
        )}
      </div>
    </div>
  );
}

// ── Page Header ──────────────────────────────────────────
export function PageHeader({ title, subtitle, children }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9" }}>{title}</h1>
        {subtitle && <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #334155",
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Button ───────────────────────────────────────────────
export function Btn({ onClick, children, variant = "primary", disabled = false, small = false }) {
  const variants = {
    primary: { bg: "#3b82f6", hover: "#2563eb", color: "#fff" },
    success: { bg: "#16a34a", hover: "#15803d", color: "#fff" },
    danger: { bg: "#dc2626", hover: "#b91c1c", color: "#fff" },
    warning: { bg: "#d97706", hover: "#b45309", color: "#fff" },
    ghost: { bg: "#1e293b", hover: "#334155", color: "#94a3b8" },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#334155" : v.bg,
        color: disabled ? "#64748b" : v.color,
        border: "none",
        borderRadius: 8,
        padding: small ? "6px 12px" : "8px 16px",
        fontSize: small ? 12 : 14,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => { if (!disabled) e.target.style.background = v.hover; }}
      onMouseLeave={(e) => { if (!disabled) e.target.style.background = v.bg; }}
    >
      {children}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#e2e8f0",
        fontSize: 14,
        outline: "none",
        width: "100%",
      }}
      onFocus={(e) => (e.target.style.border = "1px solid #3b82f6")}
      onBlur={(e) => (e.target.style.border = "1px solid #334155")}
    />
  );
}

// ── Select ────────────────────────────────────────────────
export function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#e2e8f0",
        fontSize: 14,
        outline: "none",
        width: "100%",
        cursor: "pointer",
      }}
    >
      {children}
    </select>
  );
}

// ── Table ────────────────────────────────────────────────
export function Table({ headers, children, emptyMsg = "No data found" }) {
  const hasHeader = Array.isArray(headers) && headers.length > 0;

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #1e293b" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        {hasHeader ? (
          <thead>
            <tr style={{ background: "#1e293b" }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    color: "#94a3b8",
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        {hasHeader ? <tbody>{children}</tbody> : children}
      </table>
      {!children || (Array.isArray(children) && children.length === 0) ? (
        <div style={{ textAlign: "center", padding: 32, color: "#475569" }}>{emptyMsg}</div>
      ) : null}
    </div>
  );
}

export function TR({ children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: "1px solid #1e293b",
        background: hovered ? "#1e293b55" : "transparent",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.1s",
      }}
    >
      {children}
    </tr>
  );
}

export function TD({ children }) {
  return (
    <td style={{ padding: "12px 16px", color: "#cbd5e1", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

// ── Toast Notification ───────────────────────────────────
export function Toast({ message, type = "success", onClose }) {
  const colors = { success: "#16a34a", error: "#dc2626", info: "#3b82f6", warning: "#d97706" };
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        background: "#1e293b",
        border: `1px solid ${colors[type]}`,
        borderLeft: `4px solid ${colors[type]}`,
        color: "#e2e8f0",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        zIndex: 9999,
        maxWidth: 360,
        display: "flex",
        gap: 12,
        alignItems: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "#64748b", fontSize: 16, cursor: "pointer", lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── useToast hook ────────────────────────────────────────
export function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const ToastEl = toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null;
  return { show, ToastEl };
}
