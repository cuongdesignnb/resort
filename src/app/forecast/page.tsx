import React from 'react';
import prisma from '@/lib/db';
import ForecastClientGrid from '@/components/forecast/forecast-client-grid';

export const revalidate = 0; // Force dynamic page reloading

export default async function ForecastPage() {
  // Get the latest successful import job
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
  });

  let cells: any[] = [];
  let bookings: any[] = [];

  if (latestJob) {
    cells = await prisma.forecastCell.findMany({
      where: { importJobId: latestJob.id },
      orderBy: [
        { roomNumber: 'asc' },
        { forecastDate: 'asc' },
      ],
    });

    bookings = await prisma.booking.findMany({
      where: { importJobId: latestJob.id },
      include: {
        rooms: true,
        meals: true,
        services: true,
        payment: true,
      },
    });
  }

  // Serialize datetimes to ISO strings for client side serialization
  const serializedCells = cells.map((c) => ({
    ...c,
    forecastDate: c.forecastDate.toISOString(),
  }));

  const serializedBookings = bookings.map((b) => ({
    ...b,
    checkinAt: b.checkinAt.toISOString(),
    checkoutAt: b.checkoutAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    rooms: b.rooms,
    meals: b.meals.map((m: any) => ({
      ...m,
      mealDate: m.mealDate.toISOString(),
    })),
    services: b.services.map((s: any) => ({
      ...s,
      serviceDate: s.serviceDate.toISOString(),
    })),
    payment: b.payment ? {
      ...b.payment,
    } : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
          Bảng Dự Báo Room Grid (Forecast View)
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {latestJob 
            ? `Xem chi tiết sơ đồ phòng bán tháng ${latestJob.month}/${latestJob.year} từ file: ${latestJob.fileName}` 
            : 'Chưa có file forecast nào được import.'
          }
        </p>
      </div>

      {latestJob ? (
        <ForecastClientGrid 
          cells={serializedCells} 
          bookings={serializedBookings}
          month={latestJob.month}
          year={latestJob.year}
        />
      ) : (
        <div className="glass-card p-12 text-center text-[var(--muted)]">
          Vui lòng import dữ liệu tại tab <strong className="text-[var(--foreground)]">Import Forecast</strong> để xem sơ đồ dự báo.
        </div>
      )}
    </div>
  );
}
