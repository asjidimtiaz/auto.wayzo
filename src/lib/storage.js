const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

async function uploadToStorage(buffer, subfolder, filename, mimeType) {
  const publicPath = `/uploads/${subfolder}/${filename}`;

  // Vercel/serverless filesystems are not persistent and may be read-only.
  // Generated documents are also stored in the documents.file_content column,
  // so returning the virtual path is enough for /api/files/view to find them.
  if (process.env.VERCEL) {
    return publicPath;
  }

  const dir = path.join(UPLOAD_DIR, subfolder);
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), buffer);
  } catch (err) {
    if (!['EROFS', 'EACCES', 'EPERM'].includes(err?.code)) throw err;
    console.warn('Storage write skipped; falling back to database content:', err.message);
  }
  return publicPath;
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
