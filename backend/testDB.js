const { getAll, createDoc } = require("./firebase");

async function testDatabase() {
  try {
    console.log("🔗 Testing Firebase Realtime Database...");

    // Create a test worker
    console.log("📝 Creating test worker...");
    const testWorker = {
      name: "John Doe",
      workerId: "WORKER-001",
      fingerprint: "test-fingerprint",
      status: "checked-in",
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      assignedTools: [],
      location: "Underground Level 1",
    };

    const savedWorker = await createDoc("workers", testWorker);
    console.log("✅ Worker created successfully!");
    console.log("📊 Worker Data:", JSON.stringify(savedWorker, null, 2));

    // Retrieve and display all workers
    console.log("\n📋 Retrieving all workers from database...");
    const allWorkers = await getAll("workers");
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
  }
}

testDatabase();
