# Firebase Database Migration Guide

This guide explains how to migrate data from one Firebase Database to another Firebase Database using exported JSON files and a Node.js script.

---

## What this project does
- Connects securely to a target Firebase project using Service Account credentials.
- Automatically reads JSON export files (example: `users.json`) and uploads them into the correct Firestore collections.
- Migrates documents while preserving their original document IDs.

---

## Prerequisites

- Node.js installed 
- A `firebase-service-account.json` file (download it from your Firebase Console → Project Settings → Service Accounts)
- JSON export files (like `users.json`, `administrators.json`, etc.)

---

## Project Structure
firebase-data-import/
  ├── firebase-service-account.json
├── importData.js
├── package.json
└── node_modules/


---

## 🚀 How to Run

1. Clone or prepare your project folder.

2. Install required dependencies:

npm install firebase-admin @google-cloud/firestore

3. Edit your importData.js if you want to add or remove collections to upload.

4. Run the migration script:
node importData.js
