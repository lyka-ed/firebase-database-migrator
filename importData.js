const admin = require("firebase-admin");
const fs = require("fs");
const { Firestore } = require('@google-cloud/firestore');

// Load your service account here
const serviceAccount = require("./firebase-service-account.json");

// initialize firebase admin sdk
admin.initializeApp({ 
    credentials: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
});

// initialize firestore client  manaually 
const db = new Firestore({
    projectId: serviceAccount.project_id,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key
    }
});

// upload load
async function uploadCollection(collectionName, jsonFilePath) {
    const collectionData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));

    for (const [docId, docData] of Object.entries(collectionData)) {
        await db.collection(collectionName).doc(docId).set(docData);
        console.log(`Uploaded document: ${docId} into collection: ${collectionName}`);
    }
}

// upload all your JSON files here
async function main() {
    await uploadCollection('users', './users.json'); // user.json is an exampl
   
}

main().then(() => {
    console.log('All data uploaded successfully.');
    process.exit();
}).catch(console.error);