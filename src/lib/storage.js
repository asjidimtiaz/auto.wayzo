const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToStorage(buffer, subfolder, filename, mimeType) {
  const dir = path.join(UPLOAD_DIR, subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${subfolder}/${filename}`;
}

async function deleteFromStorage(filePath) {
  try {
    let target = filePath;
    if (filePath.startsWith('/uploads/')) target = path.join(UPLOAD_DIR, filePath.slice(9));
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (err) {
    console.error('Local storage delete error:', err.message);
  }
}

function isStorageUrl(filePath) {
  return false;
}

module.exports = { uploadToStorage, deleteFromStorage, isStorageUrl, UPLOAD_DIR };
