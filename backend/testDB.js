const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import Worker model
const Worker = require("./models/Worker");

async function testDatabase() {
  try {
    // Connect to MongoDB
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected!\n");

    // Create a test worker
    console.log("📝 Creating test worker...");
    const testWorker = new Worker({
      name: "John Doe",
      workerId: "WORKER-001",
      status: "checked-in",
      checkInTime: new Date(),
      location: "Underground Level 1",
    });

    const savedWorker = await testWorker.save();
    console.log("✅ Worker created successfully!");
    console.log("📊 Worker Data:", JSON.stringify(savedWorker, null, 2));

    // Retrieve and display all workers
    console.log("\n📋 Retrieving all workers from database...");
    const allWorkers = await Worker.find();
    console.log(`✅ Found ${allWorkers.length} worker(s):`);
    allWorkers.forEach((worker, index) => {
      console.log(`\n  Worker ${index + 1}:`);
      console.log(`    Name: ${worker.name}`);
      console.log(`    Worker ID: ${worker.workerId}`);
      console.log(`    Status: ${worker.status}`);
      console.log(`    Location: ${worker.location}`);
    });

    console.log("\n✅ Database test completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("\n🔌 MongoDB connection closed.");
  }
}

testDatabase();
