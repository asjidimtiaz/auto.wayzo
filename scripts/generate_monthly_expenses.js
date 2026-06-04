require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const db = require('../src/lib/db');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to generate monthly expenses.');
  }

  await db.initDb();

  const schools = await db.getAllAutoEcoles();
  const activeSchools = schools.filter((school) => school.active !== false);
  let totalGenerated = 0;

  console.log(`[monthly-expenses] started ${new Date().toISOString()}`);

  for (const school of activeSchools) {
    const result = await db.checkAndGenerateMonthlyExpenses(school.id);
    const generated = Number(result?.generated || 0);
    totalGenerated += generated;
    console.log(`[monthly-expenses] ${school.slug} generated=${generated}`);
  }

  console.log(`[monthly-expenses] finished schools=${activeSchools.length} generated=${totalGenerated}`);
}

main()
  .catch((err) => {
    console.error('[monthly-expenses] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.closeDb();
  });
