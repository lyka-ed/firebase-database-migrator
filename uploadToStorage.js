const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

const NEW_SERVICE_ACCOUNT_KEY_FILE = "";
const NEW_BUCKET_NAME = "";
const SOURCE_DIR = "downloaded-storage-files";

//initialize Storage
let storage;
try {
  storage = new Storage({
    keyFilename: path.join(__dirname, NEW_SERVICE_ACCOUNT_KEY_FILE),
  });
} catch (error) {
  console.error(`\n ERROR: Could not initialize Storage.`);
  console.error(`   1. Did you change 'NEW_SERVICE_ACCOUNT_KEY_FILE'?`);
  console.error(
    `   2. Is the file '${NEW_SERVICE_ACCOUNT_KEY_FILE}' in this directory?`
  );
  process.exit(1);
}

const bucket = storage.bucket(NEW_BUCKET_NAME);

function walkDir(dir, rootDir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const localPath = path.join(dir, file);
    const stat = fs.statSync(localPath);

    if (stat.isDirectory()) {
      walkDir(localPath, rootDir, fileList); // Recurse into subdirectories
    } else {
      const relativePath = path.relative(rootDir, localPath);
      const remotePath = relativePath.replace(/\\/g, "/");
      fileList.push({ localPath, remotePath });
    }
  }
  return fileList;
}

async function uploadAllFiles() {
  console.log(`🚀 Starting upload to new bucket: ${NEW_BUCKET_NAME}`);
  const fullSourcePath = path.join(__dirname, SOURCE_DIR);

  if (!fs.existsSync(fullSourcePath)) {
    console.error(`\n ERROR: Source directory not found: ${fullSourcePath}`);
    console.error(
      `   Please ensure your download script completed successfully.`
    );
    process.exit(1);
  }

  const allFiles = walkDir(fullSourcePath, fullSourcePath);
  if (allFiles.length === 0) {
    console.log("No files found to upload.");
    return;
  }

  console.log(`Found ${allFiles.length} file(s) to upload.`);
  const startTime = Date.now();
  let filesUploaded = 0;

  for (const file of allFiles) {
    await bucket.upload(file.localPath, {
      destination: file.remotePath,
    });

    filesUploaded++;

    process.stdout.write(
      `\r✅ Uploaded ${filesUploaded} of ${allFiles.length}: ${file.remotePath}`
    );
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n\n🎉 UPLOAD COMPLETE!`);
  console.log(`   Total Files Uploaded: ${filesUploaded}`);
  console.log(`   Total Duration: ${duration} seconds.`);
}

uploadAllFiles();
