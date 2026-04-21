const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  try {
    console.log("🔗 Testing MongoDB Atlas connection with 0.0.0.0/0 whitelist...");
    console.log("📍 Connection URI:", process.env.MONGO_URI.replace(/:([^:@]{4})[^:@]*@/, ':$1****@'));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Successfully connected to MongoDB Atlas!");

    // Get connection details
    const db = mongoose.connection;
    console.log("📊 Connection Details:");
    console.log("   - Host:", db.host);
    console.log("   - Port:", db.port);
    console.log("   - Database:", db.name);
    console.log("   - Ready State:", db.readyState === 1 ? "Connected" : "Disconnected");

    // Test database operations
    console.log("\n🧪 Testing database operations...");

    // Get database stats
    const stats = await db.db.stats();
    console.log("✅ Database stats retrieved:");
    console.log("   - Collections:", stats.collections);
    console.log("   - Documents:", stats.objects);
    console.log("   - Data Size:", (stats.dataSize / 1024 / 1024).toFixed(2), "MB");

    // List collections
    const collections = await db.db.listCollections().toArray();
    console.log("✅ Available collections:", collections.map(c => c.name));

    console.log("\n🎉 All tests passed! Database is fully connected with 0.0.0.0/0 whitelist.");
    console.log("🔒 Note: Consider restricting IP access for production use.");

  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 Connection closed.");
  }
}

testDatabaseConnection();