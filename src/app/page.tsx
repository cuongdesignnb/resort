import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { 
  DollarSign, 
  Hotel, 
  Users, 
  AlertTriangle, 
  ArrowUpRight, 
  Download,
  Database,
  ArrowRight,
  UploadCloud
} from 'lucide-react';
import Link from 'next/link';
import DashboardCharts from '@/components/dashboard/dashboard-charts';
import AIAssistant from '@/components/dashboard/ai-assistant';
import JobSelector from '@/components/dashboard/job-selector';

export const revalidate = 0; // Force dynamic rendering on every request

interface SearchParams {
  jobId?: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { jobId } = await searchParams;

  // 1. Fetch all successful import jobs for the dropdown list
  const successfulJobs = await prisma.importJob.findMany({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      month: true,
      year: true,
      fileName: true,
    }
  });

  if (successfulJobs.length === 0) {
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

  // Determine selected job ID or default to latest
  const activeJobId = jobId || successfulJobs[0].id;
  const isAllTime = activeJobId === 'all';

  let stats: any[] = [];
  let bookings: any[] = [];
  let displayTitle = '';
  let displaySub = '';

  if (isAllTime) {
    // Fetch stats & bookings across ALL successful jobs
    stats = await prisma.dailyStat.findMany({
      where: { importJob: { status: 'SUCCESS' } },
      orderBy: { statDate: 'asc' },
    });
    bookings = await prisma.booking.findMany({
      where: { importJob: { status: 'SUCCESS' } },
      include: { payment: true },
    });
    displayTitle = 'Báo Cáo Toàn Thời Gian';
    displaySub = `Tích hợp dữ liệu tổng hợp từ tất cả ${successfulJobs.length} đợt báo cáo đã tải lên.`;
  } else {
    // Fetch statistics for a specific job
    const selectedJob = await prisma.importJob.findUnique({
      where: { id: activeJobId },
      include: {
        dailyStats: { orderBy: { statDate: 'asc' } },
        bookings: { include: { payment: true } },
      },
    });

    if (!selectedJob) {
      // Fallback if the requested jobId is invalid
      return (
        <div className="p-8 text-center text-red-500 font-semibold glass-card">
          Đợt báo cáo không tồn tại hoặc đã bị xóa. <Link href="/" className="underline text-emerald-600">Trở lại Dashboard</Link>
        </div>
      );
    }

    stats = selectedJob.dailyStats;
    bookings = selectedJob.bookings;
    displayTitle = `Tháng báo cáo: ${selectedJob.month}/${selectedJob.year}`;
    displaySub = `File đang xem: ${selectedJob.fileName}`;
  }

  // Aggregate metrics
  const totalRev = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const roomRev = stats.reduce((sum, s) => sum + s.roomRevenue, 0);
  const foodRev = stats.reduce((sum, s) => sum + s.foodRevenue, 0);
  const serviceRev = stats.reduce((sum, s) => sum + s.serviceRevenue, 0);

  const roomSoldTotal = stats.reduce((sum, s) => sum + s.roomSold, 0);
  
  // Occupancy rate calculation (Capacity: 5 rooms total * number of days monitored)
  const totalOccupancy = stats.length > 0 ? (roomSoldTotal / (5 * stats.length)) * 100 : 0;
  
  const totalCheckinGuests = bookings.filter(b => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.totalGuests, 0);
  const totalCancellations = bookings.filter(b => b.status === 'CANCELLED').length;
  
  // Data QA items
  const bookingsNeedReview = bookings.filter(b => b.needsReview);
  const reviewCount = bookingsNeedReview.length;

  // Format Recharts data based on mode (group by month for All Time, daily for single month)
  let chartsData: any[] = [];
  if (isAllTime) {
    // Group daily stats by month for a clean chart layout without 365 bars
    const groupedByMonth: Record<string, any> = {};
    stats.forEach((s) => {
      const monthStr = format(s.statDate, 'MM/yyyy');
      if (!groupedByMonth[monthStr]) {
        groupedByMonth[monthStr] = {
          date: `Tháng ${monthStr}`,
          roomSold: s.roomSold,
          daysCount: 1,
          roomRevenue: s.roomRevenue,
          foodRevenue: s.foodRevenue,
          serviceRevenue: s.serviceRevenue,
          totalRevenue: s.totalRevenue,
          checkin: s.checkinGuests,
          checkout: s.checkoutGuests,
          breakfast: s.breakfastPax,
          lunch: s.lunchPax,
          dinner: s.dinnerPax + s.galaPax + s.bbqPax,
        };
      } else {
        const prev = groupedByMonth[monthStr];
        prev.roomSold += s.roomSold;
        prev.daysCount += 1;
        prev.roomRevenue += s.roomRevenue;
        prev.foodRevenue += s.foodRevenue;
        prev.serviceRevenue += s.serviceRevenue;
        prev.totalRevenue += s.totalRevenue;
        prev.checkin += s.checkinGuests;
        prev.checkout += s.checkoutGuests;
        prev.breakfast += s.breakfastPax;
        prev.lunch += s.lunchPax;
        prev.dinner += s.dinnerPax + s.galaPax + s.bbqPax;
      }
    });

    chartsData = Object.keys(groupedByMonth).sort().map((monthStr) => {
      const m = groupedByMonth[monthStr];
      return {
        date: m.date,
        roomSold: m.roomSold,
        occupancy: (m.roomSold / (5 * m.daysCount)) * 100,
        roomRevenue: m.roomRevenue,
        foodRevenue: m.foodRevenue,
        serviceRevenue: m.serviceRevenue,
        totalRevenue: m.totalRevenue,
        checkin: m.checkin,
        checkout: m.checkout,
        breakfast: m.breakfast,
        lunch: m.lunch,
        dinner: m.dinner,
      };
    });
  } else {
    // Single month: view by day
    chartsData = stats.map((s) => ({
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
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Dashboard Vận Hành Resort
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {displayTitle} | {displaySub}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown for choosing month/all time */}
          <JobSelector jobs={successfulJobs} selectedJobId={activeJobId} />
          
          {/* Export Excel only for single month reports to avoid formatting/DB mismatches */}
          {!isAllTime && (
            <Link
              href={`/api/reports/excel?jobId=${activeJobId}`}
              className="glass-card hover:bg-[var(--border)] text-xs font-semibold px-4.5 py-2.5 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Xuất Báo Cáo Excel
            </Link>
          )}

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
          {/* Pass activeJobId to the assistant so it can answer questions based on the selected report */}
          <AIAssistant jobId={activeJobId} />

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
