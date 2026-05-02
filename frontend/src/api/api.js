import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
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

// Alcohol
export const getAlcoholReadings    = (params) => api.get("/alcohol", { params });
export const submitAlcoholReading  = (data) => api.post("/alcohol", data);
export const overrideAlcoholReading = (id, data) => api.put(`/alcohol/${id}/override`, data);
export const deleteAlcoholReading  = (id) => api.delete(`/alcohol/${id}`);

// Blood Flow
export const getBloodFlowReadings    = (params) => api.get("/bloodflow", { params });
export const submitBloodFlowReading  = (data) => api.post("/bloodflow", data);
export const overrideBloodFlowReading = (id, data) => api.put(`/bloodflow/${id}/override`, data);
export const deleteBloodFlowReading  = (id) => api.delete(`/bloodflow/${id}`);

// Drug Tests
export const getDrugTestSelections    = (params) => api.get("/drugtests", { params });
export const getTodaysDrugSelection   = () => api.get("/drugtests/today");
export const generateDrugTestSelection = (data) => api.post("/drugtests/generate", data);
export const updateDrugTestResult     = (id, data) => api.put(`/drugtests/${id}/result`, data);
export const deleteDrugTestSelection  = (id) => api.delete(`/drugtests/${id}`);
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

// Vision Cameras
export const getVisionCameras        = () => api.get("/visioncamera");
export const getVisionCamera         = (id) => api.get(`/visioncamera/${id}`);
export const createVisionCamera      = (data) => api.post("/visioncamera", data);
export const updateVisionCamera      = (id, data) => api.put(`/visioncamera/${id}`, data);
export const deleteVisionCamera      = (id) => api.delete(`/visioncamera/${id}`);
export const startVisionCameraRecording = (id) => api.post(`/visioncamera/${id}/recording/start`);
export const stopVisionCameraRecording  = (id) => api.post(`/visioncamera/${id}/recording/stop`);

// Integrated Tracking (Helmet + Belt)
export const getActiveTrackers = () => api.get("/integratedtracking");
export const getWorkerTracker = (workerId) => api.get(`/integratedtracking/${workerId}`);
export const initializeTracker = (data) => api.post("/integratedtracking/init", data);
export const updateHelmetData = (workerId, data) => api.post(`/integratedtracking/${workerId}/helmet/data`, data);
export const updateBeltLocation = (workerId, data) => api.post(`/integratedtracking/${workerId}/belt/location`, data);
export const syncTrackers = (workerId, data) => api.post(`/integratedtracking/${workerId}/sync`, data);
export const recordRfidScan = (workerId, data) => api.post(`/integratedtracking/${workerId}/rfid/scan`, data);
export const getTrackerHistory = (workerId, limit = 100) => api.get(`/integratedtracking/${workerId}/history?limit=${limit}`);
export const getTrackerAlerts = (workerId) => api.get(`/integratedtracking/${workerId}/alerts`);
export const resolveTrackerAlert = (workerId, alertIndex) => api.put(`/integratedtracking/${workerId}/alerts/${alertIndex}/resolve`);
export const checkoutTracker = (workerId) => api.post(`/integratedtracking/${workerId}/checkout`);

export default api;
