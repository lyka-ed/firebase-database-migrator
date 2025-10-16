// Install these packages first if you haven't:
// npm install firebase-admin

const admin = require("firebase-admin");
const fs = require("fs");

// 🚨 UPDATE: Changed the filename to your provided Service Account JSON file
const SERVICE_ACCOUNT_FILE =
  "click-d-84eea-firebase-adminsdk-fbsvc-db3930e428.json";

// Load your service account key. Ensure this file is in the same directory and kept secure.
const serviceAccount = require(`./${SERVICE_ACCOUNT_FILE}`);

// --- Initialization ---

// Initialize the Firebase Admin SDK for administrative access
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Get the Firestore client from the initialized Admin SDK
const db = admin.firestore();

// --- Core Migration Function ---

/**
 * Uploads data from a local JSON file into a specified Firestore collection
 * using highly efficient batch writes (up to 500 writes per commit).
 * * Assumes JSON structure: {"documentId1": {data}, "documentId2": {data}}
 * * @param {string} collectionName - The name of the Firestore collection.
 * @param {string} jsonFilePath - The path to the local JSON file containing data to import.
 */
async function uploadCollection(collectionName, jsonFilePath) {
  console.log(`\nStarting upload for collection: ${collectionName}`);

  // 1. Read and parse the JSON file
  let collectionData;
  try {
    collectionData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
  } catch (error) {
    console.error(
      `❌ Error reading or parsing file ${jsonFilePath}:`,
      error.message
    );
    return;
  }

  const BATCH_SIZE = 499; // Maximum batch size is 500. We use 499 for safety.
  let batch = db.batch();
  let count = 0;

  // 2. Iterate over the data (key = docId, value = docData)
  for (const [docId, docData] of Object.entries(collectionData)) {
    // Create a reference to the document with the specified ID
    const docRef = db.collection(collectionName).doc(docId);

    // Add the write operation to the current batch
    batch.set(docRef, docData);
    count++;

    // Commit the batch if the limit is reached
    if (count >= BATCH_SIZE) {
      await batch.commit();
      console.log(`...Committed batch of ${count} documents.`);

      // Start a new batch
      batch = db.batch();
      count = 0;
    }
  }

  // 3. Commit the final batch
  if (count > 0) {
    await batch.commit();
    console.log(`...Committed final batch of ${count} documents.`);
  }

  console.log(
    `\n✅ Successfully uploaded ${
      Object.keys(collectionData).length
    } documents to collection: ${collectionName}`
  );
}

// --- Main Execution Block ---

async function main() {
  // ⬇️ Replace these examples with your actual collection names and JSON data files ⬇️
  await uploadCollection("users", "./users.json");
  await uploadCollection("products", "./products.json");
  await uploadCollection("orders", "./orders.json");
}

main()
  .then(() => {
    console.log("\n--- MIGRATION COMPLETE ---");
    console.log("All data uploaded successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n--- MIGRATION FAILED ---");
    console.error("An unhandled error occurred during the migration:", error);
    process.exit(1);
  });
