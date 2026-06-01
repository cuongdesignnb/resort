import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { 
  DollarSign, 
  Hotel, 
  Users, 
  AlertTriangle, 
  ArrowUpRight, 
  CalendarDays, 
  Coffee,
  Download,
  Database,
  ArrowRight,
  UploadCloud
} from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '@/components/dashboard/dashboard-charts';
import AIAssistant from '@/components/dashboard/ai-assistant';

export const revalidate = 0; // Force dynamic rendering on every request

export default async function DashboardPage() {
  // Find the latest successful import job to display
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
    // Return welcoming demo/empty state screen guiding them to imports
    return (
      <div className="space-y-8 py-6">
        <div className="glass-card p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 mt-12">
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Database className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="font-outfit font-bold text-2xl md:text-3xl text-[var(--foreground)]">
              Chào mừng bạn đến với Cuong Design
            </h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              Hệ thống chưa có dữ liệu báo cáo nào. Hãy thực hiện upload file forecast của bạn (định dạng Excel `.xlsx` chứa hyperlink booking) để bắt đầu phân tích dữ liệu resort.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/imports" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/15"
            >
              Upload File Forecast
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate values from PostgreSQL models
  const stats = latestJob.dailyStats;
  const bookings = latestJob.bookings;

  const totalRev = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const roomRev = stats.reduce((sum, s) => sum + s.roomRevenue, 0);
  const foodRev = stats.reduce((sum, s) => sum + s.foodRevenue, 0);
  const serviceRev = stats.reduce((sum, s) => sum + s.serviceRevenue, 0);

  const roomSoldTotal = stats.reduce((sum, s) => sum + s.roomSold, 0);
  // Capacity: 5 rooms total in our resort inventory * total days in month
  const totalOccupancy = (roomSoldTotal / (5 * stats.length)) * 100;
  const adr = roomSoldTotal > 0 ? roomRev / roomSoldTotal : 0;
  const revpar = stats.length > 0 ? roomRev / (5 * stats.length) : 0;

  const totalCheckinGuests = bookings.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.totalGuests, 0);
  const totalCancellations = bookings.filter(b => b.status === 'CANCELLED').length;
  
  // Data QA items
  const bookingsNeedReview = bookings.filter(b => b.needsReview);
  const reviewCount = bookingsNeedReview.length;

  // Format Recharts data
  const chartsData = stats.map((s) => ({
    date: format(s.statDate, 'dd/MM'),
    roomSold: s.roomSold,
    occupancy: (s.roomSold / 5) * 100,
    roomRevenue: s.roomRevenue,
    foodRevenue: s.foodRevenue,
    serviceRevenue: s.serviceRevenue,
    totalRevenue: s.totalRevenue,
    checkin: s.checkinGuests,
    checkout: s.checkoutGuests,
    breakfast: s.breakfastPax,
    lunch: s.lunchPax,
    dinner: s.dinnerPax + s.galaPax + s.bbqPax,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Dashboard Vận Hành Resort
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Tháng báo cáo: <strong className="text-[var(--foreground)]">{latestJob.month}/{latestJob.year}</strong> | File đang xem: <strong className="text-[var(--foreground)]">{latestJob.fileName}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href={`/api/reports/excel?jobId=${latestJob.id}`}
            className="glass-card hover:bg-[var(--border)] text-xs font-semibold px-4.5 py-2.5 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Xuất Báo Cáo Excel
          </Link>
          <Link
            href="/imports"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4.5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-md shadow-emerald-950/15 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            Import Mới
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Revenue */}
        <div className="glass-card p-6 flex items-center justify-between group hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Tổng Doanh Thu</span>
            <h3 className="font-outfit font-bold text-2xl text-emerald-600 dark:text-emerald-400">
              {totalRev.toLocaleString('vi-VN')} đ
            </h3>
            <p className="text-[10px] text-[var(--muted)]">
              Phòng: {roomRev.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 2: Occupancy */}
        <div className="glass-card p-6 flex items-center justify-between group hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Công Suất Phòng</span>
            <h3 className="font-outfit font-bold text-2xl text-amber-600 dark:text-amber-400">
              {totalOccupancy.toFixed(1)}%
            </h3>
            <p className="text-[10px] text-[var(--muted)]">
              Lượt phòng bán: {roomSoldTotal} PN
            </p>
          </div>
          <div className="h-12 w-12 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
            <Hotel className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 3: Total Guests */}
        <div className="glass-card p-6 flex items-center justify-between group hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Lượt Khách Đến</span>
            <h3 className="font-outfit font-bold text-2xl text-blue-600 dark:text-blue-400">
              {totalCheckinGuests} khách
            </h3>
            <p className="text-[10px] text-[var(--muted)]">
              Đoàn hủy: {totalCancellations} booking
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* KPI 4: QA Alerts */}
        <div className="glass-card p-6 flex items-center justify-between group hover:scale-[1.01] transition-all">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Cảnh Báo Dữ Liệu</span>
            <h3 className={`font-outfit font-bold text-2xl ${reviewCount > 0 ? 'text-red-500' : 'text-slate-500'}`}>
              {reviewCount} booking
            </h3>
            <p className="text-[10px] text-[var(--muted)]">
              Cần kiểm tra/đọc lỗi link
            </p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${reviewCount > 0 ? 'bg-red-50 dark:bg-red-950/30 text-red-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Assistant Split */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          {/* Charts Row */}
          <DashboardCharts stats={chartsData} />
        </div>

        {/* AI Assistant Chat Console & Quick Alerts */}
        <div className="space-y-6">
          <AIAssistant jobId={latestJob.id} />

          {/* Quick Data Quality Warnings Summary */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                QA Review Queue
              </h3>
              <Link href="/reports/data-quality" className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center">
                Xem tất cả
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            
            <div className="space-y-2 text-xs overflow-y-auto max-h-[160px] scrollbar-thin">
              {bookingsNeedReview.length > 0 ? (
                bookingsNeedReview.slice(0, 3).map((b) => (
                  <div key={b.id} className="p-2.5 bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-950/20 rounded-lg space-y-1">
                    <div className="flex justify-between font-bold">
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
                        <span className="text-[var(--foreground)]">{b.bookingCode}</span>
                      )}
                      <span className="text-red-500 text-[10px]">Review</span>
                    </div>
                    <p className="text-[var(--muted)] text-[10px] truncate">{b.bookingName}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-[var(--muted)] py-6">
                  Không có cảnh báo chất lượng dữ liệu nào.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
