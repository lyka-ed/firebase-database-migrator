const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const NEW_SERVICE_ACCOUNT_KEY_FILE = "serviceAccount.json";
const INPUT_FILE = "firestore_backup.json"; // The file you created with the export script

let documentsImported = 0;

try {
  const serviceAccountPath = path.join(__dirname, NEW_SERVICE_ACCOUNT_KEY_FILE);
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
  console.error(
    `\n ERROR: Could not initialize Firebase Admin SDK for import.`
  );
  console.error(
    `   1. Did you change 'NEW_SERVICE_ACCOUNT_KEY_FILE' in the script?`
  );
  console.error(
    `   2. Is the file '${NEW_SERVICE_ACCOUNT_KEY_FILE}' in this directory?`
  );
  console.error(`   3. Is the JSON file structure valid?`);
  process.exit(1);
}

const db = admin.firestore();
const BATCH_SIZE = 499;

/**
 * Recursively imports a document and its subcollections (if any).
 * @param {admin.firestore.DocumentReference} docRef The reference where the document should be written.
 * @param {Object} docData The data of the document, potentially containing the subcollections key.
 * @param {admin.firestore.WriteBatch} batch The current Firestore batch.
 */
async function recursivelyImportDocument(docRef, docData, batch) {
  const { __subcollections, ...dataToImport } = docData;

  batch.set(docRef, dataToImport);
  documentsImported++;

  if (__subcollections) {
    for (const [subColId, subColData] of Object.entries(__subcollections)) {
      const subColRef = docRef.collection(subColId);
      await importCollection(subColRef, subColData);
    }
  }
}

/**
 * Imports a collection from the backup data, processing documents in batches.
 * @param {admin.firestore.CollectionReference} collectionRef The reference to the collection (root or subcollection).
 * @param {Object} collectionData
 */
async function importCollection(collectionRef, collectionData) {
  console.log(`\nImporting collection: ${collectionRef.path}`);
  const docIds = Object.keys(collectionData);
  if (docIds.length === 0) return;

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    let batch = db.batch();
    const chunk = docIds.slice(i, i + BATCH_SIZE);

    for (const docId of chunk) {
      const docData = collectionData[docId];
      const docRef = collectionRef.doc(docId);

      await recursivelyImportDocument(docRef, docData, batch);
    }

    await batch.commit();
    console.log(
      `   ...Committed batch, total documents written so far: ${documentsImported}`
    );
  }
}

async function main() {
  console.log(`🚀 Starting Recursive Cloud Firestore Import...`);
  const startTime = Date.now();
  let allData;

  try {
    const jsonContent = fs.readFileSync(INPUT_FILE, "utf8");
    allData = JSON.parse(jsonContent);
  } catch (error) {
    console.error(
      `\n FATAL ERROR: Could not read or parse '${INPUT_FILE}'.`,
      error.message
    );
    process.exit(1);
  }

  try {
    const rootCollections = Object.entries(allData);

    if (rootCollections.length === 0) {
      console.log("Input file contains no data to import.");
      return;
    }

    console.log(
      `\nFound ${rootCollections.length} root collection(s) to process.`
    );

    for (const [colId, colData] of rootCollections) {
      const colRef = db.collection(colId);
      await importCollection(colRef, colData);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(` IMPORT COMPLETE!`);
    console.log(`   Total Documents Imported: ${documentsImported}`);
    console.log(`   Total Duration: ${duration} seconds.`);
  } catch (error) {
    console.error(`\n FATAL ERROR during import:`, error.message);
  }
}

main();
