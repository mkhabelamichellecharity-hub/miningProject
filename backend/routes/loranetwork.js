const express = require("express");
const router = express.Router();
const { db } = require("../firebase");

// ── GET all LoRa networks ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("loraNetworks").get();
    const networks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(networks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single LoRa network ───────────────────────────────
router.get("/:networkId", async (req, res) => {
  try {
    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create new LoRa network ──────────────────────────
router.post("/", async (req, res) => {
  try {
    const { networkId, networkName, frequency, spreadingFactor, txPower, region } = req.body;

    if (!networkId || !networkName) {
      return res.status(400).json({ error: "networkId and networkName required" });
    }

    const networkData = {
      networkId,
      networkName,
      status: "active",
      frequency: frequency || 915,
      spreadingFactor: spreadingFactor || 7,
      txPower: txPower || 20,
      region: region || "US915",
      gateways: [],
      devices: [],
      statistics: {
        totalDevices: 0,
        activeDevices: 0,
        packetLossRate: 0,
        averageRSSI: -100,
        averageSNR: 0,
      },
      pendingMessages: [],
      messageHistory: [],
      health: {
        uptime: 0,
        lastErrorTime: null,
        recoveryAttempts: 0,
      },
      createdAt: new Date(),
    };

    const docRef = await db.collection("loraNetworks").add(networkData);
    res.status(201).json({ id: docRef.id, ...networkData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add gateway to network ───────────────────────────
router.post("/:networkId/gateway/add", async (req, res) => {
  try {
    const { gatewayId, name, latitude, longitude, altitude } = req.body;

    if (!gatewayId || !name) {
      return res.status(400).json({ error: "gatewayId and name required" });
    }

    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    const network = doc.data();
    const gateway = {
      gatewayId,
      name,
      latitude: latitude || null,
      longitude: longitude || null,
      altitude: altitude || 0,
      status: "online",
      signalStrength: -100,
      lastActivity: new Date(),
      uplinkCount: 0,
      downlinkCount: 0,
    };

    await db.collection("loraNetworks").doc(req.params.networkId).update({
      gateways: [...(network.gateways || []), gateway],
    });

    res.json({ message: "Gateway added", gateway });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST add device to network ────────────────────────────
router.post("/:networkId/device/add", async (req, res) => {
  try {
    const { deviceId, deviceType, deviceName, devEUI, appKey } = req.body;

    if (!deviceId || !deviceType || !deviceName || !devEUI || !appKey) {
      return res.status(400).json({ error: "Missing required device fields" });
    }

    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    const network = doc.data();
    const device = {
      deviceId,
      deviceType,
      deviceName,
      devEUI,
      appKey,
      status: "active",
      signalStrength: -100,
      snr: 0,
      lastContact: new Date(),
      battery: 100,
      messagesReceived: 0,
      messagesSent: 0,
      messagesFailed: 0,
    };

    const updatedDevices = [...(network.devices || []), device];
    await db.collection("loraNetworks").doc(req.params.networkId).update({
      devices: updatedDevices,
      "statistics.totalDevices": updatedDevices.length,
      "statistics.activeDevices": updatedDevices.filter((d) => d.status === "active").length,
    });

    res.json({ message: "Device added", device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST update device signal/battery ─────────────────────
router.post("/:networkId/device/:deviceId/update", async (req, res) => {
  try {
    const { rssi, snr, battery } = req.body;

    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    const network = doc.data();
    const deviceIndex = network.devices.findIndex((d) => d.deviceId === req.params.deviceId);

    if (deviceIndex === -1) {
      return res.status(404).json({ error: "Device not found" });
    }

    network.devices[deviceIndex] = {
      ...network.devices[deviceIndex],
      signalStrength: rssi !== undefined ? rssi : network.devices[deviceIndex].signalStrength,
      snr: snr !== undefined ? snr : network.devices[deviceIndex].snr,
      battery: battery !== undefined ? battery : network.devices[deviceIndex].battery,
      lastContact: new Date(),
      status: battery < 10 ? "inactive" : "active",
    };

    // Update statistics
    const activeDevices = network.devices.filter((d) => d.status === "active").length;
    const rssiValues = network.devices.map((d) => d.signalStrength || -100);
    const snrValues = network.devices.map((d) => d.snr || 0);

    await db.collection("loraNetworks").doc(req.params.networkId).update({
      devices: network.devices,
      "statistics.activeDevices": activeDevices,
      "statistics.averageRSSI": rssiValues.reduce((a, b) => a + b, 0) / rssiValues.length,
      "statistics.averageSNR": snrValues.reduce((a, b) => a + b, 0) / snrValues.length,
      "statistics.lastStatUpdate": new Date(),
    });

    res.json({ message: "Device updated", device: network.devices[deviceIndex] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST send message through LoRa network ────────────────
router.post("/:networkId/message/send", async (req, res) => {
  try {
    const { fromDeviceId, toDeviceId, payload, priority } = req.body;

    if (!fromDeviceId || !toDeviceId || !payload) {
      return res.status(400).json({ error: "fromDeviceId, toDeviceId, payload required" });
    }

    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      messageId,
      fromDeviceId,
      toDeviceId,
      payload,
      priority: priority || "normal",
      createdAt: new Date(),
      status: "pending",
      retries: 0,
      maxRetries: 3,
    };

    const network = doc.data();
    const updatedMessages = [...(network.pendingMessages || []), message];

    await db.collection("loraNetworks").doc(req.params.networkId).update({
      pendingMessages: updatedMessages.slice(-100), // Keep last 100 messages
    });

    res.status(201).json({ message: "Message queued", message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST confirm message delivery ─────────────────────────
router.post("/:networkId/message/:messageId/confirm", async (req, res) => {
  try {
    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    const network = doc.data();
    const messageIndex = network.pendingMessages.findIndex(
      (m) => m.messageId === req.params.messageId
    );

    if (messageIndex === -1) {
      return res.status(404).json({ error: "Message not found" });
    }

    network.pendingMessages[messageIndex].status = "delivered";
    network.pendingMessages[messageIndex].deliveredAt = new Date();

    // Add to history
    const historyEntry = {
      messageId: network.pendingMessages[messageIndex].messageId,
      timestamp: new Date(),
      fromDeviceId: network.pendingMessages[messageIndex].fromDeviceId,
      toDeviceId: network.pendingMessages[messageIndex].toDeviceId,
      type: "data",
      status: "delivered",
    };

    await db.collection("loraNetworks").doc(req.params.networkId).update({
      pendingMessages: network.pendingMessages,
      messageHistory: [...(network.messageHistory || []), historyEntry].slice(-500),
    });

    res.json({ message: "Message confirmed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET network diagnostics ──────────────────────────────
router.get("/:networkId/diagnostics", async (req, res) => {
  try {
    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    const network = doc.data();
    const diagnostics = {
      networkStatus: network.status,
      totalDevices: network.devices?.length || 0,
      activeDevices: network.devices?.filter((d) => d.status === "active").length || 0,
      totalGateways: network.gateways?.length || 0,
      onlineGateways: network.gateways?.filter((g) => g.status === "online").length || 0,
      pendingMessages: network.pendingMessages?.length || 0,
      statistics: network.statistics,
      health: network.health,
      recentMessages: (network.messageHistory || []).slice(-20),
    };

    res.json(diagnostics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET gateway status ───────────────────────────────────
router.get("/:networkId/gateways", async (req, res) => {
  try {
    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    res.json({ gateways: doc.data().gateways || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET connected devices ────────────────────────────────
router.get("/:networkId/devices", async (req, res) => {
  try {
    const doc = await db.collection("loraNetworks").doc(req.params.networkId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Network not found" });
    }

    res.json({ devices: doc.data().devices || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE network ───────────────────────────────────────
router.delete("/:networkId", async (req, res) => {
  try {
    await db.collection("loraNetworks").doc(req.params.networkId).delete();
    res.json({ message: "Network deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
