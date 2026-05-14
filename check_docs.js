const db = require('./src/lib/db');

async function run() {
  try {
    const docs = await db.getDocumentsByStudent(2, 1);
    console.log('DOCUMENTS:', JSON.stringify(docs, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
