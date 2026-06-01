import prisma from '../src/lib/db';

async function checkDb() {
  console.log('--- DB DIAGNOSTICS ---');
  try {
    const jobs = await prisma.importJob.findMany({
      orderBy: { startedAt: 'desc' }
    });

    console.log(`Found ${jobs.length} total import jobs:`);
    for (const j of jobs) {
      const cellsCount = await prisma.forecastCell.count({ where: { importJobId: j.id } });
      const bookingsCount = await prisma.booking.count({ where: { importJobId: j.id } });
      const statsCount = await prisma.dailyStat.count({ where: { importJobId: j.id } });

      console.log(`- Job ${j.id}:`);
      console.log(`  File: "${j.fileName}"`);
      console.log(`  Status: ${j.status}`);
      console.log(`  Target Month/Year: ${j.month}/${j.year}`);
      console.log(`  Started: ${j.startedAt}`);
      console.log(`  Error: ${j.errorMessage || 'None'}`);
      console.log(`  Forecast Cells: ${cellsCount}`);
      console.log(`  Bookings Extracted: ${bookingsCount}`);
      console.log(`  Daily Stats Aggregated: ${statsCount}`);
    }

    const latestSuccess = await prisma.importJob.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' }
    });
    console.log('\nLatest successful job:', latestSuccess?.id || 'None');

  } catch (err: any) {
    console.error('Error querying DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
