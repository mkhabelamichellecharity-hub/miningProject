import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error?.response?.data?.error || error?.message || "Unknown error";
    return Promise.reject(new Error(msg));
  }
);

// Workers
export const getWorkers      = () => api.get("/workers");
export const checkInWorker   = (data) => api.post("/workers/checkin", data);
export const checkOutWorker  = (data) => api.post("/workers/checkout", data);
export const deleteWorker    = (id) => api.delete(`/workers/${id}`);
export const updateWorker    = (id, data) => api.put(`/workers/${id}`, data);

// Tools
export const getTools    = () => api.get("/tools");
export const createTool  = (data) => api.post("/tools", data);
export const updateTool  = (id, data) => api.put(`/tools/${id}`, data);
export const deleteTool  = (id) => api.delete(`/tools/${id}`);

// Alerts
export const getAlerts           = () => api.get("/alerts");
export const createAlert         = (data) => api.post("/alerts", data);
export const resolveAlert        = (id) => api.put(`/alerts/${id}/resolve`);
export const deleteAlert         = (id) => api.delete(`/alerts/${id}`);
export const clearResolvedAlerts = () => api.delete("/alerts/clear/resolved");

// Material
export const getMaterial    = () => api.get("/material");
export const updateMaterial = (data) => api.put("/material", data);

// Dispatch
export const getDispatch    = () => api.get("/dispatch");
export const updateDispatch = (data) => api.put("/dispatch", data);

// Geotechnical
export const getGeo    = () => api.get("/geotechnical");
export const updateGeo = (data) => api.put("/geotechnical", data);

// Lighting
export const getLighting    = () => api.get("/lighting");
export const updateLighting = (data) => api.put("/lighting", data);

// Vitals
export const getVitals       = (params) => api.get("/vitals", { params });
export const getLatestVitals = () => api.get("/vitals/latest");
export const submitVitals    = (data) => api.post("/vitals", data);
export const notifyVitals    = (id, data) => api.put(`/vitals/${id}/notify`, data);
export const overrideVitals  = (id, data) => api.put(`/vitals/${id}/override`, data);
export const deleteVital     = (id) => api.delete(`/vitals/${id}`);

// Sensors
export const getSensors         = () => api.get("/sensors");
export const createSensor       = (data) => api.post("/sensors", data);
export const updateSensor       = (id, data) => api.put(`/sensors/${id}`, data);
export const updateSensorStatus = (id, data) => api.put(`/sensors/${id}/status`, data);
export const deleteSensor       = (id) => api.delete(`/sensors/${id}`);

// Drones
export const getDrones         = () => api.get("/drones");
export const getDrone          = (id) => api.get(`/drones/${id}`);
export const createDrone       = (data) => api.post("/drones", data);
export const launchDrone       = (id, data) => api.put(`/drones/${id}/launch`, data);
export const landDrone         = (id) => api.put(`/drones/${id}/land`);
export const updateTelemetry   = (id, data) => api.put(`/drones/${id}/telemetry`, data);
export const addMapTile        = (id, data) => api.put(`/drones/${id}/map-tile`, data);
export const clearDroneMap     = (id) => api.put(`/drones/${id}/clear-map`);
export const toggleDroneCamera = (id, data) => api.put(`/drones/${id}/camera`, data);
export const deleteDrone       = (id) => api.delete(`/drones/${id}`);

export default api;
