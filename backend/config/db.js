const { db } = require("../firebase");

const connectDB = async () => {
  try {
    // Test connection by trying to read from root
    await db.ref().once('value');
    console.log("✅ Firebase Realtime Database Initialized");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
