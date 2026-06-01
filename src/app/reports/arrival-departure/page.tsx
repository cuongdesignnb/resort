import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import Link from 'next/link';
import ArrivalDepartureChart from '@/components/reports/arrival-departure-chart';

export const revalidate = 0;

export default async function ArrivalDepartureReportPage() {
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    include: {
      dailyStats: {
        orderBy: { statDate: 'asc' },
      },
      bookings: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { checkinAt: 'asc' },
      },
    },
  });

  if (!latestJob) {
    return (
      <div className="glass-card p-12 text-center text-[var(--muted)]">
        Chưa có dữ liệu nào được import. Vui lòng import forecast trước.
      </div>
    );
  }

  const stats = latestJob.dailyStats;
  const bookings = latestJob.bookings;

  // Format chart data
  const chartData = stats.map((s) => ({
    date: format(s.statDate, 'dd/MM'),
    checkin: s.checkinGuests,
    checkout: s.checkoutGuests,
    stayover: s.stayoverGuests,
  }));

  // Aggregated totals
  const totalCheckin = stats.reduce((sum, s) => sum + s.checkinGuests, 0);
  const totalCheckout = stats.reduce((sum, s) => sum + s.checkoutGuests, 0);
  const avgStayover = stats.length > 0 ? stats.reduce((sum, s) => sum + s.stayoverGuests, 0) / stats.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Báo Cáo Khách Đến / Đi (Arrival & Departure)
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Theo dõi lưu lượng check-in/check-out của resort trong tháng {latestJob.month}/{latestJob.year}.
          </p>
        </div>
        <Link
          href={`/api/reports/excel?jobId=${latestJob.id}`}
          className="glass-card hover:bg-[var(--border)] text-xs font-semibold px-4 py-2 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Xuất Báo Cáo Excel
        </Link>
      </div>

      {/* Chart */}
      <ArrivalDepartureChart data={chartData} />

      {/* Stats Summary row */}
      <div className="grid grid-cols-3 gap-6 bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)]">
        <div className="text-center py-2">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Lượt Check-in</p>
          <p className="font-outfit font-bold text-2xl text-emerald-600 dark:text-emerald-400 mt-1">{totalCheckin} khách</p>
        </div>
        <div className="text-center py-2 border-x border-[var(--border)]">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Lượt Check-out</p>
          <p className="font-outfit font-bold text-2xl text-red-500 mt-1">{totalCheckout} khách</p>
        </div>
        <div className="text-center py-2">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Lưu Trú Trung Bình Ngày</p>
          <p className="font-outfit font-bold text-2xl text-blue-500 mt-1">{avgStayover.toFixed(1)} khách</p>
        </div>
      </div>

      {/* Daily Stats Grid Details */}
      <div className="glass-card p-6">
        <h3 className="font-outfit font-bold text-lg mb-4">Chi Tiết Lượt Khách Theo Ngày</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--muted-bg)]/50">
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4 text-center">Khách Check-in</th>
                <th className="py-3 px-4 text-center">Khách Check-out</th>
                <th className="py-3 px-4 text-center">Khách Lưu Trú</th>
                <th className="py-3 px-4">Đoàn Check-in Hôm Nay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {stats.map((s, idx) => {
                const sDateStr = format(s.statDate, 'yyyy-MM-dd');
                const checkinBookings = bookings.filter(b => format(b.checkinAt, 'yyyy-MM-dd') === sDateStr);

                return (
                  <tr key={s.id} className="hover:bg-[var(--muted-bg)] transition-colors">
                    <td className="py-3 px-4 font-semibold">{format(s.statDate, 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.checkinGuests}</td>
                    <td className="py-3 px-4 text-center text-red-500 font-bold">{s.checkoutGuests}</td>
                    <td className="py-3 px-4 text-center text-blue-500 font-bold">{s.stayoverGuests}</td>
                    <td className="py-3 px-4 text-xs">
                      {checkinBookings.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {checkinBookings.map(b => (
                            <span key={b.id} className="bg-[var(--muted-bg)] px-2 py-0.5 rounded border border-[var(--border)] font-medium">
                              {b.sourceUrl ? (
                                <a 
                                  href={b.sourceUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                                  title="Mở file voucher gốc"
                                >
                                  {b.bookingCode}
                                </a>
                              ) : (
                                b.bookingCode
                              )} ({b.totalGuests}pax)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
