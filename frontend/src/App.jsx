import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import Sensors from "./pages/Sensors";
import Vitals from "./pages/Vitals";
import Alcohol from "./pages/Alcohol";
import BloodFlow from "./pages/BloodFlow";
import DrugTests from "./pages/DrugTests";
import Lighting from "./pages/Lighting";
import Tools from "./pages/Tools";
import Alerts from "./pages/Alerts";
import Material from "./pages/Material";
import Dispatch from "./pages/Dispatch";
import Geotechnical from "./pages/Geotechnical";
import Drone from "./pages/Drone";
import VisionCamera from "./pages/VisionCamera";
import IntegratedTracking from "./pages/IntegratedTracking";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main
          style={{
            marginLeft: 240,
            flex: 1,
            padding: "32px 32px",
            background: "#0f172a",
            minHeight: "100vh",
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/vitals" element={<Vitals />} />
            <Route path="/alcohol" element={<Alcohol />} />
            <Route path="/bloodflow" element={<BloodFlow />} />
            <Route path="/drugtests" element={<DrugTests />} />
            <Route path="/lighting" element={<Lighting />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/material" element={<Material />} />
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/geotechnical" element={<Geotechnical />} />
            <Route path="/drone" element={<Drone />} />
            <Route path="/visioncamera" element={<VisionCamera />} />
            <Route path="/integratedtracking" element={<IntegratedTracking />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
