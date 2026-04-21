import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/workers", label: "Workers", icon: "👷" },
  { to: "/vitals", label: "Vitals Monitor", icon: "🫀" },
  { to: "/sensors", label: "Sensors", icon: "📡" },
  { to: "/tools", label: "Tools", icon: "🔧" },
  { to: "/alerts", label: "Alerts", icon: "🚨" },
  { to: "/material", label: "Material Handling", icon: "⚙️" },
  { to: "/dispatch", label: "Dispatch", icon: "🚛" },
  { to: "/geotechnical", label: "Geotechnical", icon: "🪨" },
  { to: "/lighting", label: "Lighting", icon: "💡" },
  { to: "/drone", label: "Drone Control", icon: "🚁" },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>⛏️</span>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
              Mining Track
            </div>
            <div style={{ color: "#475569", fontSize: 11 }}>Operations System</div>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: "12px 8px" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              marginBottom: 2,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "#f1f5f9" : "#64748b",
              background: isActive ? "#1e293b" : "transparent",
              transition: "all 0.15s",
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains("active")) {
                e.currentTarget.style.background = "#1e293b55";
                e.currentTarget.style.color = "#94a3b8";
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.getAttribute("aria-current")) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#64748b";
              }
            }}
          >
            <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid #1e293b",
          color: "#475569",
          fontSize: 11,
        }}
      >
        <div>Mining Tracking System</div>
        <div>v1.0.0</div>
      </div>
    </aside>
  );
}
