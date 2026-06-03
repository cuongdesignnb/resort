import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { Download, CreditCard, Award, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function RevenueReportPage() {
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    include: {
      dailyStats: {
        orderBy: { statDate: 'asc' },
      },
      bookings: {
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

  const stats = latestJob.dailyStats;
  const bookings = latestJob.bookings.filter(b => b.status !== 'CANCELLED');

  const totalRev = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const roomRev = stats.reduce((sum, s) => sum + s.roomRevenue, 0);
  const foodRev = stats.reduce((sum, s) => sum + s.foodRevenue, 0);
  const serviceRev = stats.reduce((sum, s) => sum + s.serviceRevenue, 0);

  // Channel breakdown
  const channelMap = new Map<string, number>();
  // Sales breakdown
  const saleMap = new Map<string, number>();
  // Debt list
  const debtBookings = [];

  for (const b of bookings) {
    const pay = b.payment;
    if (!pay) continue;

    const chan = b.channel || 'Direct';
    channelMap.set(chan, (channelMap.get(chan) || 0) + pay.totalAmount);

    const sale = b.saleName || 'N/A';
    saleMap.set(sale, (saleMap.get(sale) || 0) + pay.totalAmount);

    if (pay.remainingAmount > 0) {
      debtBookings.push({
        bookingCode: b.bookingCode,
        bookingName: b.bookingName,
        total: pay.totalAmount,
        deposit: pay.depositAmount,
        remaining: pay.remainingAmount,
        status: pay.paymentStatus,
        phone: b.phone,
        sourceUrl: b.sourceUrl,
      });
    }
  }

  const sortedChannels = [...channelMap.entries()].sort((a, b) => b[1] - a[1]);
  const sortedSales = [...saleMap.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Báo Cáo Doanh Thu (Revenue & Payments)
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Phân tích chi tiết hạch toán doanh thu lưu trú, dịch vụ, hiệu suất sales và công nợ.
          </p>
        </div>
        <a
          href={`/api/reports/excel?jobId=${latestJob.id}`}
          className="glass-card hover:bg-[var(--border)] text-xs font-semibold px-4 py-2 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Xuất Báo Cáo Excel
        </a>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-5 space-y-1.5">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Tổng Doanh Thu</span>
          <h3 className="font-outfit font-bold text-xl text-emerald-600 dark:text-emerald-400">
            {Math.round(totalRev).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Hạch toán thực tế phát sinh</p>
        </div>
        <div className="glass-card p-5 space-y-1.5">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Doanh Thu Phòng</span>
          <h3 className="font-outfit font-bold text-xl text-blue-600 dark:text-blue-400">
            {Math.round(roomRev).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Tỷ lệ: {((roomRev / totalRev) * 100 || 0).toFixed(0)}%</p>
        </div>
        <div className="glass-card p-5 space-y-1.5">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Doanh Thu F&B</span>
          <h3 className="font-outfit font-bold text-xl text-amber-600 dark:text-amber-400">
            {Math.round(foodRev).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Tỷ lệ: {((foodRev / totalRev) * 100 || 0).toFixed(0)}%</p>
        </div>
        <div className="glass-card p-5 space-y-1.5">
          <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Doanh Thu Dịch Vụ Khác</span>
          <h3 className="font-outfit font-bold text-xl text-purple-600 dark:text-purple-400">
            {Math.round(serviceRev).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
          </h3>
          <p className="text-[10px] text-[var(--muted)]">Tỷ lệ: {((serviceRev / totalRev) * 100 || 0).toFixed(0)}%</p>
        </div>
      </div>

      {/* Distribution Grid (Channel / Sales Agent) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Performance */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-outfit font-bold text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Doanh Thu Theo Nhân Viên Sales
          </h3>
          <div className="space-y-3.5">
            {sortedSales.map(([name, val], index) => {
              const pct = (val / totalRev) * 100;
              return (
                <div key={name} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>{index + 1}. {name}</span>
                    <span>{Math.round(val).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-[var(--muted-bg)] h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channels */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-outfit font-bold text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Doanh Thu Theo Kênh Phân Phối (Channels)
          </h3>
          <div className="space-y-3.5">
            {sortedChannels.map(([name, val], index) => {
              const pct = (val / totalRev) * 100;
              return (
                <div key={name} className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>{index + 1}. {name}</span>
                    <span>{Math.round(val).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-[var(--muted-bg)] h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Debt List Table */}
      <div className="glass-card p-6">
        <h3 className="font-outfit font-bold text-lg mb-4 flex items-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          Danh Sách Booking Còn Công Nợ (Remaining Balances)
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--muted-bg)]/50">
                <th className="py-3 px-4">Mã Booking</th>
                <th className="py-3 px-4">Tên Khách / Đoàn</th>
                <th className="py-3 px-4">Số Điện Thoại</th>
                <th className="py-3 px-4 text-right">Tổng Tiền Bill</th>
                <th className="py-3 px-4 text-right">Đã Cọc</th>
                <th className="py-3 px-4 text-right text-red-500">Còn Phải Thu</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {debtBookings.length > 0 ? (
                debtBookings.map((b) => (
                  <tr key={b.bookingCode} className="hover:bg-[var(--muted-bg)] transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
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
                    <td className="py-3 px-4 font-medium">{b.bookingName}</td>
                    <td className="py-3 px-4">{b.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">{Math.round(b.total).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">{Math.round(b.deposit).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ</td>
                    <td className="py-3 px-4 text-right text-red-500 font-bold">{Math.round(b.remaining).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--muted)]">
                    Không ghi nhận công nợ nào chưa thanh toán. Tất cả booking đã thanh toán đủ!
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
