import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { Download, Utensils, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import MealsChart from '@/components/reports/meals-chart';

export const revalidate = 0;

export default async function MealsReportPage() {
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    include: {
      dailyStats: {
        orderBy: { statDate: 'asc' },
      },
      bookings: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          meals: true,
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
  const bookings = latestJob.bookings;

  // Format chart data
  const chartData = stats.map((s) => ({
    date: format(s.statDate, 'dd/MM'),
    breakfast: s.breakfastPax,
    lunch: s.lunchPax,
    dinner: s.dinnerPax,
    bbq: s.bbqPax,
    gala: s.galaPax,
  }));

  // Aggregated totals
  const totalBreakfast = stats.reduce((sum, s) => sum + s.breakfastPax, 0);
  const totalLunch = stats.reduce((sum, s) => sum + s.lunchPax, 0);
  const totalDinner = stats.reduce((sum, s) => sum + s.dinnerPax + s.bbqPax + s.galaPax, 0);

  // Extract all meal lines for detailed day logs
  const allMealLines: Array<{
    mealDateStr: string;
    bookingCode: string;
    bookingName: string;
    mealType: string;
    serviceName: string;
    restaurantName: string | null;
    quantity: number;
    paxCount: number;
    tableCount: number;
    unit: string;
    confidence: number;
    needsReview: boolean;
    sourceUrl: string | null;
  }> = [];

  bookings.forEach((b) => {
    b.meals.forEach((m) => {
      allMealLines.push({
        mealDateStr: format(m.mealDate, 'yyyy-MM-dd'),
        bookingCode: b.bookingCode,
        bookingName: b.bookingName,
        mealType: m.mealType,
        serviceName: m.serviceName,
        restaurantName: m.restaurantName,
        quantity: m.quantity,
        paxCount: m.paxCount,
        tableCount: m.tableCount,
        unit: m.unit,
        confidence: m.confidence,
        needsReview: m.needsReview,
        sourceUrl: b.sourceUrl,
      });
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Báo Cáo Suất Ăn F&B (Dining Reports)
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Theo dõi, tổng hợp và lập kế hoạch phục vụ ẩm thực cho nhà hàng resort.
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
      <MealsChart data={chartData} />

      {/* Stats Summary cards */}
      <div className="grid grid-cols-3 gap-6 bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)]">
        <div className="text-center py-2">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Suất Sáng (BF)</p>
          <p className="font-outfit font-bold text-2xl text-emerald-600 dark:text-emerald-400 mt-1">{totalBreakfast} suất</p>
        </div>
        <div className="text-center py-2 border-x border-[var(--border)]">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Suất Trưa (LN)</p>
          <p className="font-outfit font-bold text-2xl text-blue-500 mt-1">{totalLunch} suất</p>
        </div>
        <div className="text-center py-2">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Suất Tối/BBQ/Gala</p>
          <p className="font-outfit font-bold text-2xl text-amber-600 dark:text-amber-400 mt-1">{totalDinner} suất</p>
        </div>
      </div>

      {/* Daily Meals Breakdown */}
      <div className="glass-card p-6">
        <h3 className="font-outfit font-bold text-lg mb-4 flex items-center gap-2">
          <Utensils className="h-5 w-5 text-emerald-600" />
          Kế Hoạch Báo Suất Phục Vụ Hàng Ngày
        </h3>
        
        <div className="space-y-6">
          {stats.map((s) => {
            const sDateStr = format(s.statDate, 'yyyy-MM-dd');
            const dayMeals = allMealLines.filter(m => m.mealDateStr === sDateStr);

            if (dayMeals.length === 0) return null; // skip days with no meals

            return (
              <div key={s.id} className="border border-[var(--border)] rounded-xl overflow-hidden">
                {/* Day Header */}
                <div className="bg-[var(--muted-bg)] px-4 py-3 border-b border-[var(--border)] flex justify-between items-center">
                  <h4 className="font-bold text-sm text-[var(--foreground)]">
                    Ngày {format(s.statDate, 'dd/MM/yyyy')}
                  </h4>
                  <div className="flex gap-4 text-xs font-semibold text-[var(--muted)]">
                    <span>Sáng: <strong className="text-emerald-600">{s.breakfastPax}</strong></span>
                    <span>Trưa: <strong className="text-blue-500">{s.lunchPax}</strong></span>
                    <span>Tối/BBQ/Gala: <strong className="text-amber-600">{s.dinnerPax + s.bbqPax + s.galaPax}</strong></span>
                  </div>
                </div>

                {/* Day Meals Detail Table */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-[var(--muted)] font-semibold border-b border-[var(--border)] bg-[var(--bg-card)]/50">
                      <th className="py-2.5 px-4">Booking</th>
                      <th className="py-2.5 px-4">Tên Khách / Đoàn</th>
                      <th className="py-2.5 px-4 text-center">Loại Bữa</th>
                      <th className="py-2.5 px-4">Diễn Giải Thực Đơn</th>
                      <th className="py-2.5 px-4">Nhà Hàng</th>
                      <th className="py-2.5 px-4 text-center">Số Lượng Suất</th>
                      <th className="py-2.5 px-4 text-center">QA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]/40 bg-[var(--bg-card)]">
                    {dayMeals.map((m, mIdx) => (
                      <tr key={mIdx} className={m.needsReview ? 'bg-red-500/5' : ''}>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {m.sourceUrl ? (
                            <a 
                              href={m.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                              title="Mở file voucher gốc"
                            >
                              {m.bookingCode}
                            </a>
                          ) : (
                            m.bookingCode
                          )}
                         </td>
                        <td className="py-2.5 px-4 font-medium">{m.bookingName}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            m.mealType === 'BREAKFAST' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20' :
                            m.mealType === 'LUNCH' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/20' :
                            m.mealType === 'BBQ' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/20' :
                            m.mealType === 'GALA' ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/20' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-950/20'
                          }`}>
                            {m.mealType}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 truncate max-w-[150px]" title={m.serviceName}>{m.serviceName}</td>
                        <td className="py-2.5 px-4 font-medium">{m.restaurantName || 'Main Buffet'}</td>
                        <td className="py-2.5 px-4 text-center font-semibold">
                          {m.quantity} {m.unit} ({m.paxCount} pax)
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {m.needsReview ? (
                            <span className="inline-flex items-center text-red-500" title="Suất ăn lệch số pax hoặc ngày không rõ">
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
