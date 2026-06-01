import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { Download, Hotel, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function RoomsReportPage() {
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    include: {
      dailyStats: {
        orderBy: { statDate: 'asc' },
      },
      cells: {
        orderBy: [
          { roomNumber: 'asc' },
          { forecastDate: 'asc' },
        ]
      }
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
  const cells = latestJob.cells;

  // 1. Calculate overall occupancy metrics
  const totalRoomNightsSold = stats.reduce((sum, s) => sum + s.roomSold, 0);
  const totalCapacity = 5 * stats.length; // 5 rooms total in resort inventory
  const avgOccupancy = (totalRoomNightsSold / totalCapacity) * 100;

  // 2. Identify Double Booking Conflicts
  // Group cells by date + room number to see if more than one distinct booking is assigned
  const dateRoomMap = new Map<string, Array<{ cellText: string; code: string }>>();
  cells.forEach((c) => {
    if (!c.cellText) return;
    const dateStr = format(c.forecastDate, 'yyyy-MM-dd');
    const key = `${dateStr}_${c.roomNumber}`;
    
    // Extract clean booking code
    const cleanCode = c.cellText.split('-')[0].trim().split(' ')[0];
    const items = dateRoomMap.get(key) || [];
    
    if (!items.some(item => item.code === cleanCode)) {
      items.push({ cellText: c.cellText, code: cleanCode });
    }
    dateRoomMap.set(key, items);
  });

  const conflicts: Array<{
    date: string;
    roomNumber: string;
    bookings: string[];
  }> = [];

  dateRoomMap.forEach((items, key) => {
    if (items.length > 1) {
      const [date, room] = key.split('_');
      conflicts.push({
        date,
        roomNumber: room,
        bookings: items.map(it => it.cellText),
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Báo Cáo Công Suất & Trùng Phòng (Rooms & Conflicts)
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Theo dõi tỷ lệ lấp đầy, lượt buồng bán và rà soát lỗi trùng lịch phân buồng.
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

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-card)] p-6 rounded-xl border border-[var(--border)]">
        <div className="text-center py-2">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Lượt Đêm Phòng Bán</p>
          <p className="font-outfit font-bold text-2xl text-emerald-600 dark:text-emerald-400 mt-1">{totalRoomNightsSold} PN</p>
        </div>
        <div className="text-center py-2 border-x border-[var(--border)]">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Công Suất Sử Dụng Bình Quân</p>
          <p className="font-outfit font-bold text-2xl text-blue-500 mt-1">{avgOccupancy.toFixed(1)} %</p>
        </div>
        <div className="text-center py-2">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Số Phòng Trong Inventory</p>
          <p className="font-outfit font-bold text-2xl text-slate-700 dark:text-slate-200 mt-1">5 phòng</p>
        </div>
      </div>

      {/* Critical Room Conflicts warning banner or list */}
      <div className="glass-card p-6 border-l-4 border-l-amber-500">
        <h3 className="font-outfit font-bold text-lg mb-2 flex items-center gap-2">
          <AlertTriangle className="text-amber-500 h-5 w-5" />
          Danh Sách Trùng Lịch Phân Phòng (Conflicts Queue)
        </h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          Phát hiện các ô forecast bị xếp trùng hai đoàn khác nhau vào cùng một phòng trong cùng một ngày.
        </p>

        {conflicts.length > 0 ? (
          <div className="space-y-2">
            {conflicts.map((c, idx) => (
              <div 
                key={idx} 
                className="p-3 bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-xs flex flex-col md:flex-row justify-between md:items-center gap-2"
              >
                <div>
                  <span className="font-bold text-amber-800 dark:text-amber-400">Phòng {c.roomNumber}</span>
                  <span className="text-[var(--muted)]"> ngày </span>
                  <span className="font-semibold text-[var(--foreground)]">{format(new Date(c.date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex gap-2">
                  {c.bookings.map((b, bIdx) => (
                    <span key={bIdx} className="bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded border border-amber-300/40">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 rounded-lg text-xs font-semibold">
            <CheckCircle className="h-4 w-4" />
            Tất cả phòng được gán hợp lệ! Không có xung đột trùng phòng nào được phát hiện trong forecast.
          </div>
        )}
      </div>

      {/* Daily Room Occupancy stats */}
      <div className="glass-card p-6">
        <h3 className="font-outfit font-bold text-lg mb-4 flex items-center gap-2">
          <Hotel className="h-5 w-5 text-emerald-600" />
          Chi Tiết Trạng Thái Phòng Theo Ngày
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--muted-bg)]/50">
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4 text-center">Phòng Đã Bán</th>
                <th className="py-3 px-4 text-center">Phòng Trống</th>
                <th className="py-3 px-4 text-center">Công Suất Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {stats.map((s) => {
                const sold = s.roomSold;
                const available = 5 - sold;
                const occ = (sold / 5) * 100;
                return (
                  <tr key={s.id} className="hover:bg-[var(--muted-bg)] transition-colors">
                    <td className="py-3 px-4 font-semibold">{format(s.statDate, 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{sold}</td>
                    <td className="py-3 px-4 text-center text-slate-500 font-semibold">{available}</td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        occ >= 80 ? 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                        occ >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                      }`}>
                        {occ.toFixed(0)} %
                      </span>
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
