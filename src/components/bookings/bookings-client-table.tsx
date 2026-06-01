'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  AlertTriangle, 
  Calendar, 
  Users, 
  CreditCard, 
  Activity,
  ChevronRight,
  ChevronDown,
  Utensils,
  DollarSign,
  Coffee,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingRoomData {
  id: string;
  roomName: string;
  roomType: string;
  quantity: number;
  nights: number;
  unitPrice: number;
  amount: number;
}

interface BookingMealData {
  id: string;
  mealType: string;
  mealDate: string;
  serviceName: string;
  restaurantName: string | null;
  unit: string;
  quantity: number;
  paxCount: number;
  tableCount: number;
  unitPrice: number;
  amount: number;
  confidence: number;
  needsReview: boolean;
}

interface BookingServiceData {
  id: string;
  serviceType: string;
  serviceName: string;
  serviceDate: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface BookingPaymentData {
  depositAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalAmount: number;
  paymentStatus: string;
  vatRequired: boolean;
  commissionAmount: number;
  discountAmount: number;
}

interface BookingData {
  id: string;
  bookingCode: string;
  bookingName: string;
  customerName: string | null;
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  channel: string | null;
  saleName: string | null;
  checkinAt: string;
  checkoutAt: string;
  adults: number;
  children6To11: number;
  childrenUnder6: number;
  totalGuests: number;
  totalRooms: number;
  status: string;
  needsReview: boolean;
  rawText: string | null;
  createdAt: string;
  rooms: BookingRoomData[];
  meals: BookingMealData[];
  services: BookingServiceData[];
  payment: BookingPaymentData | null;
  sourceUrl?: string | null;
}

interface BookingsClientTableProps {
  bookings: BookingData[];
}

export default function BookingsClientTable({ bookings }: BookingsClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reviewFilter, setReviewFilter] = useState('ALL');
  const [saleFilter, setSaleFilter] = useState('ALL');
  const [roomTypeFilter, setRoomTypeFilter] = useState('ALL');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [checkinStart, setCheckinStart] = useState('');
  const [checkinEnd, setCheckinEnd] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);

  const formatVNCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  // Run filters
  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      b.bookingCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.customerName && b.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.companyName && b.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.phone && b.phone.includes(searchTerm));

    const matchesChannel = channelFilter === 'ALL' || b.channel === channelFilter;
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesReview = 
      reviewFilter === 'ALL' || 
      (reviewFilter === 'REVIEW' && b.needsReview) || 
      (reviewFilter === 'OK' && !b.needsReview);

    const matchesSale = saleFilter === 'ALL' || b.saleName === saleFilter;
    const matchesRoomType = roomTypeFilter === 'ALL' || b.rooms.some(r => r.roomType === roomTypeFilter);

    const totalAmount = b.payment?.totalAmount || 0;
    const matchesMinPrice = minPrice === '' || totalAmount >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === '' || totalAmount <= parseFloat(maxPrice);

    const checkinDate = new Date(b.checkinAt);
    const matchesCheckinStart = checkinStart === '' || checkinDate >= new Date(checkinStart);
    const matchesCheckinEnd = checkinEnd === '' || checkinDate <= new Date(checkinEnd + 'T23:59:59');

    return matchesSearch && 
           matchesChannel && 
           matchesStatus && 
           matchesReview && 
           matchesSale && 
           matchesRoomType && 
           matchesMinPrice && 
           matchesMaxPrice && 
           matchesCheckinStart && 
           matchesCheckinEnd;
  });

  const channels = ['ALL', ...Array.from(new Set(bookings.map((b) => b.channel).filter(Boolean)))];
  const salesReps = ['ALL', ...Array.from(new Set(bookings.map((b) => b.saleName).filter(Boolean)))];
  const roomTypes = ['ALL', ...Array.from(new Set(bookings.flatMap((b) => b.rooms.map(r => r.roomType)).filter(Boolean)))];

  return (
    <div className="space-y-4 relative animate-fade-in">
      {/* Filters Toolbar Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã booking, tên khách, sđt..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Channel Filter */}
        <div>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            {channels.map((c) => (
              <option key={c} value={c || 'ALL'}>
                Kênh: {c === 'ALL' ? 'Tất cả' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
          >
            <option value="ALL">Status: Tất cả</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="FAILED_READ">FAILED_READ</option>
          </select>
        </div>

        {/* Toggle Advanced Filters */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer h-full",
              showAdvanced 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" 
                : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Bộ lọc nâng cao</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showAdvanced ? "rotate-180" : "")} />
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] p-5 rounded-2xl shadow-[var(--shadow-premium)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in text-xs">
          {/* Sale name filter */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--muted)] block">Người Phụ Trách (Sales)</label>
            <select
              value={saleFilter}
              onChange={(e) => setSaleFilter(e.target.value)}
              className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              {salesReps.map((s) => (
                <option key={s} value={s || 'ALL'}>
                  {s === 'ALL' ? 'Tất cả Sales' : s}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type filter */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--muted)] block">Hạng Phòng</label>
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              {roomTypes.map((rt) => (
                <option key={rt} value={rt || 'ALL'}>
                  {rt === 'ALL' ? 'Tất cả hạng phòng' : rt}
                </option>
              ))}
            </select>
          </div>

          {/* QA Quality filter */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--muted)] block">Chất Lượng Dữ Liệu</label>
            <select
              value={reviewFilter}
              onChange={(e) => setReviewFilter(e.target.value)}
              className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="REVIEW">Cần Review / Cảnh báo</option>
              <option value="OK">Auto-OK (Sạch sẽ)</option>
            </select>
          </div>

          {/* Price Min/Max */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--muted)] block">Tổng Thanh Toán (Từ - Đến)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Tối thiểu"
                className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs focus:outline-none placeholder-slate-400"
              />
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Tối đa"
                className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs focus:outline-none placeholder-slate-400"
              />
            </div>
          </div>

          {/* Date Range Start */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--muted)] block">Ngày Check-in Từ</label>
            <input
              type="date"
              value={checkinStart}
              onChange={(e) => setCheckinStart(e.target.value)}
              className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          {/* Date Range End */}
          <div className="space-y-1.5">
            <label className="font-bold text-[var(--muted)] block">Ngày Check-in Đến</label>
            <input
              type="date"
              value={checkinEnd}
              onChange={(e) => setCheckinEnd(e.target.value)}
              className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none"
            />
          </div>

          {/* Reset button & spacer */}
          <div className="hidden lg:block"></div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setChannelFilter('ALL');
                setStatusFilter('ALL');
                setReviewFilter('ALL');
                setSaleFilter('ALL');
                setRoomTypeFilter('ALL');
                setMinPrice('');
                setMaxPrice('');
                setCheckinStart('');
                setCheckinEnd('');
              }}
              className="w-full bg-[var(--muted-bg)] hover:bg-[var(--border)] text-[var(--foreground)] border border-[var(--border)] font-semibold py-2 rounded-lg transition-all cursor-pointer text-center"
            >
              Xóa Bộ Lọc
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table Card */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--muted-bg)]/50">
                <th className="py-3.5 px-5">Mã Đặt Phòng</th>
                <th className="py-3.5 px-5">Tên Khách / Đoàn</th>
                <th className="py-3.5 px-5">Check-in</th>
                <th className="py-3.5 px-5">Check-out</th>
                <th className="py-3.5 px-5 text-center">Phòng</th>
                <th className="py-3.5 px-5 text-center">Khách</th>
                <th className="py-3.5 px-5">Tổng Tiền</th>
                <th className="py-3.5 px-5 text-center">Trạng Thái</th>
                <th className="py-3.5 px-5 text-center">QA</th>
                <th className="py-3.5 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((b) => (
                  <tr 
                    key={b.id} 
                    onClick={() => setSelectedBooking(b)}
                    className="hover:bg-[var(--muted-bg)] transition-all cursor-pointer"
                  >
                    <td className="py-3.5 px-5 font-bold text-slate-800 dark:text-slate-200">
                      {b.sourceUrl ? (
                        <a 
                          href={b.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          title="Mở file voucher gốc"
                        >
                          {b.bookingCode}
                        </a>
                      ) : (
                        b.bookingCode
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div>
                        <p className="font-semibold">{b.bookingName}</p>
                        <p className="text-[10px] text-[var(--muted)]">{b.channel || 'Direct'} • {b.saleName || 'Admin'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs">
                      {format(new Date(b.checkinAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3.5 px-5 text-xs">
                      {format(new Date(b.checkoutAt), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3.5 px-5 text-center font-semibold">{b.totalRooms} PN</td>
                    <td className="py-3.5 px-5 text-center">{b.totalGuests} Pax</td>
                    <td className="py-3.5 px-5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {b.payment ? formatVNCurrency(b.payment.totalAmount) : '0 đ'}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      {b.needsReview ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                          REVIEW
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <ChevronRight className="h-4 w-4 text-[var(--muted)] inline" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--muted)]">
                    Không tìm thấy booking nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detail Drawer Panel */}
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
                    Đang Cảnh Báo
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
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Số Điện Thoại</p>
                  <p className="text-sm">{selectedBooking.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Email</p>
                  <p className="text-sm truncate">{selectedBooking.email || '-'}</p>
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
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Tổng Cơ Cấu Khách</p>
                  <p className="text-sm">
                    {selectedBooking.totalGuests} Pax (Lớn: {selectedBooking.adults}, Trẻ 6-11: {selectedBooking.children6To11}, Trẻ &lt;6: {selectedBooking.childrenUnder6})
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--muted)]">Tổng Phòng Gán</p>
                  <p className="text-sm font-semibold">{selectedBooking.totalRooms} phòng</p>
                </div>
              </div>

              {/* Rooms Section */}
              {selectedBooking.rooms.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-outfit font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    Chi Tiết Lưu Trú (Rooms)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--muted)] font-semibold border-b border-[var(--border)] py-1">
                        <th className="py-2">Số Phòng</th>
                        <th className="py-2">Hạng Phòng</th>
                        <th className="py-2 text-center">Nights</th>
                        <th className="py-2 text-right">Đơn Giá</th>
                        <th className="py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40">
                      {selectedBooking.rooms.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 font-bold">{r.roomName}</td>
                          <td className="py-2.5">{r.roomType}</td>
                          <td className="py-2.5 text-center">{r.nights}</td>
                          <td className="py-2.5 text-right">{r.unitPrice.toLocaleString('vi-VN')} đ</td>
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
                    Kế Hoạch Bữa Ăn (Dining Schedule)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--muted)] font-semibold border-b border-[var(--border)] py-1">
                        <th className="py-2">Ngày Ăn</th>
                        <th className="py-2">Bữa</th>
                        <th className="py-2">Diễn Giải</th>
                        <th className="py-2">Nhà Hàng</th>
                        <th className="py-2 text-center">Số Lượng</th>
                        <th className="py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40">
                      {selectedBooking.meals.map((m) => (
                        <tr key={m.id} className={m.needsReview ? 'bg-red-500/5' : ''}>
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

              {/* Services Section */}
              {selectedBooking.services.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-outfit font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-1 flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-blue-500" />
                    Dịch Vụ Khác (Services)
                  </h4>
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="text-[var(--muted)] font-semibold border-b border-[var(--border)] py-1">
                        <th className="py-2">Ngày</th>
                        <th className="py-2">Tên Dịch Vụ</th>
                        <th className="py-2 text-center">Qty</th>
                        <th className="py-2 text-right">Đơn Giá</th>
                        <th className="py-2 text-right">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/40">
                      {selectedBooking.services.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5">{format(new Date(s.serviceDate), 'dd/MM')}</td>
                          <td className="py-2.5">{s.serviceName}</td>
                          <td className="py-2.5 text-center">{s.quantity}</td>
                          <td className="py-2.5 text-right">{s.unitPrice.toLocaleString('vi-VN')} đ</td>
                          <td className="py-2.5 text-right font-semibold">{s.amount.toLocaleString('vi-VN')} đ</td>
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
                    Thanh Toán & Hạch Toán Doanh Thu
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">Tổng Tiền Bill</p>
                      <p className="font-bold text-sm text-[var(--foreground)]">
                        {selectedBooking.payment.totalAmount.toLocaleString('vi-VN')} đ
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">Tiền Cọc (Deposit)</p>
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
                    <div>
                      <p className="text-[10px] text-[var(--muted)]">Trạng Thái</p>
                      <p className="font-bold text-sm uppercase text-[var(--foreground)]">
                        {selectedBooking.payment.paymentStatus}
                      </p>
                    </div>
                  </div>
                  {selectedBooking.payment.vatRequired && (
                    <p className="text-[10px] text-[var(--muted)] italic mt-1">
                      * Đã đăng ký xuất hóa đơn tài chính VAT.
                    </p>
                  )}
                </div>
              )}

              {/* Warnings and Issues Log */}
              {selectedBooking.needsReview && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl space-y-2 text-xs text-red-800 dark:text-red-400">
                  <h4 className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Cảnh Báo Lỗi Logic Dữ Liệu:
                  </h4>
                  <ul className="list-disc pl-4 space-y-1">
                    {selectedBooking.rawText?.includes('differ') && (
                      <li>Tổng tiền hạch toán chi tiết lệch so với tổng thanh toán của Voucher.</li>
                    )}
                    {selectedBooking.meals.some(m => m.needsReview) && (
                      <li>Phát hiện dòng suất ăn có ngày/thời gian ghi chú mơ hồ hoặc số suất lệch số pax lưu trú.</li>
                    )}
                    {(!selectedBooking.customerName && !selectedBooking.companyName) && (
                      <li>Thiếu tên khách hàng / tên đoàn.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="h-16 border-t border-[var(--border)] px-6 flex items-center justify-end bg-[var(--bg-card)] gap-3">
              <button 
                onClick={() => {
                  console.log(selectedBooking.rawText);
                  alert('Voucher Raw Text logged in server console.');
                }}
                className="glass-card text-xs font-semibold px-4 py-2 hover:bg-[var(--border)] transition-all cursor-pointer flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Raw Data Debug
              </button>
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
