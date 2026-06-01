'use client';

import React, { useState } from 'react';
import { 
  Hotel, 
  AlertTriangle, 
  X, 
  HelpCircle,
  Link,
  ChevronRight,
  Activity,
  Coffee,
  Utensils,
  CreditCard,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ForecastCellData {
  id: string;
  sheetName: string;
  forecastDate: string;
  roomNumber: string;
  roomType: string;
  cellText: string | null;
  hyperlink: string | null;
  statusText: string | null;
  noteText: string | null;
  fillColor: string | null;
  parsedBookingCode: string | null;
}

interface BookingData {
  id: string;
  bookingCode: string;
  bookingName: string;
  customerName?: string | null;
  companyName?: string | null;
  checkinAt: string;
  checkoutAt: string;
  totalGuests: number;
  totalRooms: number;
  channel: string;
  saleName: string;
  status: string;
  needsReview: boolean;
  rawText: string | null;
  rooms: any[];
  meals: any[];
  services: any[];
  payment: any;
  sourceUrl?: string | null;
}

interface ForecastClientGridProps {
  cells: ForecastCellData[];
  bookings: BookingData[];
  month: number;
  year: number;
}

export default function ForecastClientGrid({ cells, bookings, month, year }: ForecastClientGridProps) {
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [saleFilter, setSaleFilter] = useState('ALL');

  const salesReps = ['ALL', ...Array.from(new Set(bookings.map((b) => b.saleName).filter(Boolean)))];
  const channels = ['ALL', ...Array.from(new Set(bookings.map((b) => b.channel).filter(Boolean)))];

  const formatVNCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Get total days in the month
  const numDays = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

  // List of rooms in inventory
  const rooms = [
    { number: '101', type: 'Deluxe Ocean' },
    { number: '102', type: 'Deluxe Garden' },
    { number: '103', type: 'Executive Suite' },
    { number: 'Villa 1', type: '3BR Pool Villa' },
    { number: 'Villa 2', type: '3BR Pool Villa' },
  ];

  // Helper to map booking code to its database object
  const handleCellClick = (code: string | null) => {
    if (!code) return;
    const cleanCode = code.replace('HỦY -', '').replace('Hủy -', '').trim().split(' ')[0];
    const match = bookings.find(b => b.bookingCode === cleanCode || b.bookingCode.includes(cleanCode));
    if (match) {
      setSelectedBooking(match);
    } else {
      alert(`Booking voucher ${cleanCode} không tìm thấy hoặc bị lỗi đọc link.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid Legend Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-[var(--shadow-premium)]">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-outfit font-bold text-sm text-[var(--foreground)]">Trạng Thái Sơ Đồ Phòng</h2>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px]">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Confirmed (Bình thường)
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Group (Khách đoàn)
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold line-through">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Cancelled (Đã hủy)
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Thiếu Link Booking
          </div>
        </div>
      </div>

      {/* Grid Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border)] shadow-[var(--shadow-premium)]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã booking, tên khách..."
            className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Sales Rep Filter */}
        <div>
          <select
            value={saleFilter}
            onChange={(e) => setSaleFilter(e.target.value)}
            className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            {salesReps.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'Tất cả phụ trách' : `Sale: ${s}`}
              </option>
            ))}
          </select>
        </div>

        {/* Channel Filter */}
        <div>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            {channels.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'Tất cả kênh bán' : `Kênh: ${c}`}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="w-max min-w-full">
            {/* Grid Header Day numbers */}
            <div 
              style={{ gridTemplateColumns: `120px 140px repeat(${numDays}, minmax(110px, 1fr))` }}
              className="grid border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] bg-[var(--muted-bg)]/60 text-center sticky top-0 z-30"
            >
              <div className="py-2.5 sticky left-0 bg-[var(--bg-card)] border-r border-[var(--border)] z-40 flex items-center justify-center font-bold shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Phòng</div>
              <div className="py-2.5 sticky left-[120px] bg-[var(--bg-card)] border-r-2 border-[var(--border)] z-40 flex items-center px-3 font-bold shadow-[4px_0_10px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_10px_rgba(0,0,0,0.15)]">Hạng Phòng</div>
              {daysArray.map((day) => {
                const dateObj = new Date(year, month - 1, day);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][dateObj.getDay()];
                return (
                  <div 
                    key={day} 
                    className={cn(
                      "py-2 border-r border-[var(--border)]/40 flex flex-col items-center justify-center min-w-[110px]",
                      isWeekend && "bg-amber-500/[0.04] dark:bg-amber-400/[0.02] text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <span className="text-[9px] opacity-75 font-semibold tracking-wider">{dayName}</span>
                    <span className="text-sm font-extrabold font-outfit mt-0.5">{day}</span>
                  </div>
                );
              })}
            </div>

            {/* Grid Rows for Rooms */}
            <div className="divide-y divide-[var(--border)]">
              {rooms.map((room) => (
                <div 
                  key={room.number} 
                  style={{ gridTemplateColumns: `120px 140px repeat(${numDays}, minmax(110px, 1fr))` }}
                  className="grid text-xs min-h-[64px]"
                >
                  {/* Room Number Sticker */}
                  <div className="font-bold flex items-center justify-center border-r border-[var(--border)] sticky left-0 bg-[var(--bg-card)] z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <Hotel className="h-3.5 w-3.5 mr-1.5 text-[var(--primary)]" />
                    {room.number}
                  </div>
                  {/* Room Type Sticker */}
                  <div className="text-[var(--muted)] font-semibold flex items-center px-3 border-r-2 border-[var(--border)] sticky left-[120px] bg-[var(--bg-card)] z-20 truncate shadow-[4px_0_10px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_10px_rgba(0,0,0,0.15)]">
                    {room.type}
                  </div>

                  {/* Calendar Days Cells */}
                  {daysArray.map((day) => {
                    const cell = cells.find((c) => {
                      const cDate = new Date(c.forecastDate);
                      return cDate.getDate() === day && c.roomNumber === room.number;
                    });

                    const hasBooking = !!cell && !!cell.cellText;
                    const isCancelled = cell?.statusText === 'CANCELLED';
                    const isMissingLink = hasBooking && !cell?.hyperlink;
                    const isGroup = hasBooking && (cell?.cellText?.toLowerCase().includes('company') || cell?.cellText?.toLowerCase().includes('đoàn'));

                    const dateObj = new Date(year, month - 1, day);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    
                    // Compute continuous booking spans
                    let isStart = true;
                    let isEnd = true;
                    let bookingCode = '';
                    let isDimmed = false;

                    if (hasBooking) {
                      bookingCode = cell.parsedBookingCode || cell.cellText || '';
                      
                      // Check day - 1
                      const prevCell = cells.find((c) => {
                        const cDate = new Date(c.forecastDate);
                        return cDate.getDate() === day - 1 && c.roomNumber === room.number;
                      });
                      const prevCode = prevCell && prevCell.cellText ? (prevCell.parsedBookingCode || prevCell.cellText) : null;
                      
                      // Check day + 1
                      const nextCell = cells.find((c) => {
                        const cDate = new Date(c.forecastDate);
                        return cDate.getDate() === day + 1 && c.roomNumber === room.number;
                      });
                      const nextCode = nextCell && nextCell.cellText ? (nextCell.parsedBookingCode || nextCell.cellText) : null;

                      isStart = prevCode !== bookingCode;
                      isEnd = nextCode !== bookingCode;

                      // Filter validation
                      const cleanCode = bookingCode.replace('HỦY -', '').replace('Hủy -', '').trim().split(' ')[0];
                      const b = bookings.find(x => x.bookingCode === cleanCode || x.bookingCode.includes(cleanCode));
                      
                      if (b) {
                        const matchesSearch = searchTerm === '' ||
                          b.bookingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.bookingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.customerName && b.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (b.companyName && b.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

                        const matchesChannel = channelFilter === 'ALL' || b.channel === channelFilter;
                        const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
                        const matchesSale = saleFilter === 'ALL' || b.saleName === saleFilter;

                        isDimmed = !(matchesSearch && matchesChannel && matchesStatus && matchesSale);
                      } else {
                        // Fallback check directly in bookingCode string
                        const matchesSearch = searchTerm === '' ||
                          bookingCode.toLowerCase().includes(searchTerm.toLowerCase());
                        
                        isDimmed = !(matchesSearch && channelFilter === 'ALL' && statusFilter === 'ALL' && saleFilter === 'ALL');
                      }
                    }

                    return (
                      <div 
                        key={day}
                        className={cn(
                          "border-r border-[var(--border)]/30 min-h-[64px] flex items-center justify-stretch transition-all select-none",
                          isWeekend ? "bg-amber-500/[0.015] dark:bg-amber-400/[0.01]" : "bg-transparent",
                          !hasBooking && "hover:bg-[var(--border)]/25 p-1"
                        )}
                      >
                        {hasBooking ? (
                          <div
                            onClick={() => handleCellClick(bookingCode)}
                            title={cell.cellText || ''}
                            className={cn(
                              "w-full h-[52px] py-1.5 flex flex-col justify-between transition-all shadow-[0_2px_4px_rgba(0,0,0,0.01)] border-y cursor-pointer",
                              isStart ? "rounded-l-xl border-l-2 ml-1.5 pl-3" : "border-l-0 pl-2",
                              isEnd ? "rounded-r-xl border-r-2 mr-1.5 pr-3" : "border-r-0 pr-2",
                              
                              // Emerald theme
                              !isCancelled && !isMissingLink && !isGroup && "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20",
                              // Sky blue theme
                              !isCancelled && !isMissingLink && isGroup && "bg-sky-500/10 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/20 hover:bg-sky-500/20",
                              // Cancelled theme
                              isCancelled && "bg-rose-500/5 dark:bg-rose-500/10 text-rose-700/85 dark:text-rose-400 border-rose-500/10 hover:bg-rose-500/10 line-through opacity-60",
                              // Warning theme
                              isMissingLink && "bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/20",
                              
                              // Dimmed state for filters
                              isDimmed && "opacity-15 grayscale-[60%] blur-[0.2px] hover:opacity-50 transition-all duration-200"
                            )}
                          >
                            {isStart ? (
                              <>
                                <p className="font-bold text-[10px] truncate leading-tight" title={cell.cellText || ''}>
                                  {cell.cellText}
                                </p>
                                <div className="flex justify-between items-center mt-0.5">
                                  <span className="text-[8px] opacity-75 font-semibold">
                                    {cell.hyperlink ? (
                                      <a
                                        href={cell.hyperlink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                                        title="Mở file voucher gốc"
                                      >
                                        {cell.parsedBookingCode || 'Link'}
                                      </a>
                                    ) : (
                                      cell.parsedBookingCode || 'No Link'
                                    )}
                                  </span>
                                  {isMissingLink && (
                                    <span title="Thiếu link booking confirmation" className="shrink-0">
                                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-start h-full text-[8px] opacity-40 font-mono tracking-widest pl-1">
                                •••
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Drawer Panel (Reused from Bookings View) */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="absolute inset-0" onClick={() => setSelectedBooking(null)} />
          
          <div className="w-full max-w-2xl bg-[var(--bg-app)] h-full shadow-2xl relative z-10 flex flex-col justify-between border-l border-[var(--border)] overflow-y-auto animate-fade-in">
            {/* Drawer Header */}
            <div className="h-16 border-b border-[var(--border)] px-6 flex items-center justify-between bg-[var(--bg-card)]">
              <div className="flex items-center gap-2">
                <span className="font-outfit font-bold text-lg text-[var(--foreground)]">
                  Voucher Chi Tiết:{' '}
                  {selectedBooking.sourceUrl ? (
                    <a
                      href={selectedBooking.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      title="Mở file voucher gốc"
                    >
                      {selectedBooking.bookingCode}
                    </a>
                  ) : (
                    selectedBooking.bookingCode
                  )}
                </span>
                {selectedBooking.needsReview && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 animate-pulse">
                    Cảnh Báo
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg hover:bg-[var(--muted-bg)] transition-all cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 p-6 space-y-6">
              {/* Profile Details Metadata */}
              <div className="grid grid-cols-2 gap-4 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)]">
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Tên Khách Hàng</p>
                  <p className="font-semibold text-sm">{selectedBooking.bookingName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Kênh Bán & Sales</p>
                  <p className="text-sm">{selectedBooking.channel || 'Direct'} • {selectedBooking.saleName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Check-in</p>
                  <p className="text-sm font-semibold">{format(new Date(selectedBooking.checkinAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Check-out</p>
                  <p className="text-sm font-semibold">{format(new Date(selectedBooking.checkoutAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Tổng Khách</p>
                  <p className="text-sm">{selectedBooking.totalGuests} Pax</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Số Phòng</p>
                  <p className="text-sm font-semibold">{selectedBooking.totalRooms} phòng</p>
                </div>
              </div>

              {/* Rooms Section */}
              {selectedBooking.rooms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-outfit font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Lưu Trú (Rooms)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--muted)] font-semibold border-b border-[var(--border)] py-1">
                        <th className="py-2">Số Phòng</th>
                        <th className="py-2">Hạng Phòng</th>
                        <th className="py-2 text-center">Nights</th>
                        <th className="py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40">
                      {selectedBooking.rooms.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 font-bold">{r.roomName}</td>
                          <td className="py-2.5">{r.roomType}</td>
                          <td className="py-2.5 text-center">{r.nights}</td>
                          <td className="py-2.5 text-right font-semibold">{r.amount.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Meals Section */}
              {selectedBooking.meals.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-outfit font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-1 flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-amber-500" />
                    Kế Hoạch Bữa Ăn (Meals)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--muted)] font-semibold border-b border-[var(--border)] py-1">
                        <th className="py-2">Ngày</th>
                        <th className="py-2">Bữa</th>
                        <th className="py-2">Diễn Giải</th>
                        <th className="py-2">Nhà Hàng</th>
                        <th className="py-2 text-center">Số Lượng</th>
                        <th className="py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40">
                      {selectedBooking.meals.map((m: any) => (
                        <tr key={m.id}>
                          <td className="py-2.5 font-medium">{format(new Date(m.mealDate), 'dd/MM/yyyy')}</td>
                          <td className="py-2.5 font-bold text-[var(--accent)]">{m.mealType}</td>
                          <td className="py-2.5 truncate max-w-[120px]" title={m.serviceName}>{m.serviceName}</td>
                          <td className="py-2.5 truncate max-w-[100px]">{m.restaurantName || 'Buffet'}</td>
                          <td className="py-2.5 text-center">
                            {m.quantity} {m.unit} ({m.paxCount} pax)
                          </td>
                          <td className="py-2.5 text-right font-semibold">{m.amount.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments Section */}
              {selectedBooking.payment && (
                <div className="space-y-3 bg-[var(--muted-bg)] p-4 rounded-xl border border-[var(--border)]">
                  <h4 className="font-outfit font-bold text-xs uppercase tracking-wider text-[var(--muted)] flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Hạch Toán Tài Chính
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">Tổng Tiền Bill</p>
                      <p className="font-bold text-sm text-[var(--foreground)]">
                        {selectedBooking.payment.totalAmount.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">Tiền Cọc</p>
                      <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {selectedBooking.payment.depositAmount.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">Còn Phải Thu</p>
                      <p className="font-bold text-sm text-red-500">
                        {selectedBooking.payment.remainingAmount.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="h-16 border-t border-[var(--border)] px-6 flex items-center justify-end bg-[var(--bg-card)]">
              <button 
                onClick={() => setSelectedBooking(null)}
                className="bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Đóng Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
