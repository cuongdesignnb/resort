import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { Download, CalendarX, AlertOctagon, HeartCrack } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function CancellationsReportPage() {
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    include: {
      bookings: {
        where: { status: 'CANCELLED' },
        include: {
          payment: true,
        },
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

  const cancelledBookings = latestJob.bookings;

  // Aggregate totals
  const totalCancelledCount = cancelledBookings.length;
  const totalLostRevenue = cancelledBookings.reduce((sum, b) => sum + (b.payment?.totalAmount || 0), 0);
  const totalDepositsKept = cancelledBookings.reduce((sum, b) => sum + (b.payment?.depositAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)] animate-fade-in">
            Báo Cáo Khách Hủy Phòng (Cancellations Report)
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Tổng hợp các booking bị hủy, ước tính doanh thu mất đi và tiền cọc giữ lại theo điều khoản hủy phòng.
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

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 space-y-1.5 border-l-4 border-l-red-500">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Số Booking Hủy</span>
          <h3 className="font-outfit font-bold text-xl text-red-500">
            {totalCancelledCount} đoàn
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Không tính vào phòng bán thực tế</p>
        </div>
        <div className="glass-card p-5 space-y-1.5 border-l-4 border-l-red-400">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Doanh Thu Mất Đi</span>
          <h3 className="font-outfit font-bold text-xl text-red-600 dark:text-red-400">
            {totalLostRevenue.toLocaleString('vi-VN')} đ
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Tổng giá trị bill dự tính ban đầu</p>
        </div>
        <div className="glass-card p-5 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Tiền Cọc Thu Được</span>
          <h3 className="font-outfit font-bold text-xl text-emerald-600 dark:text-emerald-400">
            {totalDepositsKept.toLocaleString('vi-VN')} đ
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Giữ lại theo quy chế cọc hủy phòng</p>
        </div>
      </div>

      {/* Cancellation list table */}
      <div className="glass-card p-6">
        <h3 className="font-outfit font-bold text-lg mb-4 flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-red-500" />
          Danh Sách Các Booking Đã Hủy
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--muted-bg)]/50">
                <th className="py-3 px-4">Mã Booking</th>
                <th className="py-3 px-4">Tên Khách / Đoàn</th>
                <th className="py-3 px-4">Check-in Dự Kiến</th>
                <th className="py-3 px-4 text-center">Phòng Hủy</th>
                <th className="py-3 px-4 text-right">Doanh Thu Mất</th>
                <th className="py-3 px-4 text-right">Tiền Cọc Giữ</th>
                <th className="py-3 px-4">Nhân Viên Sale</th>
                <th className="py-3 px-4">Ghi Chú Hủy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {cancelledBookings.length > 0 ? (
                cancelledBookings.map((b) => (
                  <tr key={b.bookingCode} className="hover:bg-[var(--muted-bg)] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {b.sourceUrl ? (
                        <a 
                          href={b.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          title="Mở file voucher gốc"
                        >
                          {b.bookingCode}
                        </a>
                      ) : (
                        b.bookingCode
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium">{b.bookingName}</td>
                    <td className="py-3.5 px-4 text-xs">{format(b.checkinAt, 'dd/MM/yyyy')}</td>
                    <td className="py-3.5 px-4 text-center font-semibold">{b.totalRooms} phòng</td>
                    <td className="py-3.5 px-4 text-right text-red-500 font-bold">{b.payment ? b.payment.totalAmount.toLocaleString('vi-VN') : '0'} đ</td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">{b.payment ? b.payment.depositAmount.toLocaleString('vi-VN') : '0'} đ</td>
                    <td className="py-3.5 px-4 font-medium">{b.saleName || '-'}</td>
                    <td className="py-3.5 px-4 text-xs text-[var(--muted)] max-w-[200px] truncate" title={b.rawText || undefined}>
                      {b.rawText?.match(/Reason:\s*(.*)/)?.[1] || b.rawText?.substring(0, 50) || 'Hủy theo quy ước màu đỏ'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--muted)]">
                    Tuyệt vời! Không có booking nào bị hủy phòng trong tháng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
