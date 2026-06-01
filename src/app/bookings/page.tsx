import React from 'react';
import prisma from '@/lib/db';
import BookingsClientTable from '@/components/bookings/bookings-client-table';

export const revalidate = 0; // Force dynamic page reloading

export default async function BookingsPage() {
  // Get latest successful import job
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
  });

  let bookings: any[] = [];
  if (latestJob) {
    bookings = await prisma.booking.findMany({
      where: { importJobId: latestJob.id },
      orderBy: { checkinAt: 'asc' },
      include: {
        rooms: true,
        meals: {
          orderBy: { mealDate: 'asc' }
        },
        services: {
          orderBy: { serviceDate: 'asc' }
        },
        payment: true,
      },
    });
  }

  // Format datetimes to ISO strings for React client component serialization
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
          Danh Sách Bookings Phân Tích
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {latestJob 
            ? `Tổng số ${bookings.length} booking confirmation được parse thành công từ file: ${latestJob.fileName}` 
            : 'Chưa có file forecast nào được import.'
          }
        </p>
      </div>

      {latestJob ? (
        <BookingsClientTable bookings={serializedBookings} />
      ) : (
        <div className="glass-card p-12 text-center text-[var(--muted)]">
          Vui lòng import dữ liệu tại tab <strong className="text-[var(--foreground)]">Import Forecast</strong> để xem danh sách.
        </div>
      )}
    </div>
  );
}
