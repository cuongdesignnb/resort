'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Users, 
  Coins, 
  Plus, 
  Trash2, 
  Loader2, 
  Check, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Percent,
  CheckCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import AvailableMap from '@/components/bookings/available-map';

export default function NewBookingPage() {
  const router = useRouter();

  // Dates (Default check-in: today, check-out: tomorrow)
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');

  // States
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [errorAvailability, setErrorAvailability] = useState<string | null>(null);

  // Drawer Booking Form States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState('Retail');
  const [saleName, setSaleName] = useState('');
  const [adults, setAdults] = useState(2);
  const [children6To11, setChildren6To11] = useState(0);
  const [childrenUnder6, setChildrenUnder6] = useState(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [vatRequired, setVatRequired] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('UNPAID');

  // Meals & Services lists in form
  const [meals, setMeals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize dates on mount
  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const pad = (num: number) => String(num).padStart(2, '0');
    
    // Formatting to YYYY-MM-DD
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    setCheckin(todayStr);
    setCheckout(tomorrowStr);
  }, []);

  // Fetch room availability when dates change
  useEffect(() => {
    if (!checkin || !checkout) return;

    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      setErrorAvailability(null);
      try {
        const res = await fetch(`/api/bookings/available?checkin=${checkin}&checkout=${checkout}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Có lỗi xảy ra khi lấy danh sách phòng trống.');
        }
        setRooms(data.rooms || []);
      } catch (err: any) {
        console.error(err);
        setErrorAvailability(err.message);
      } finally {
        setLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [checkin, checkout]);

  // Open booking drawer for a specific room
  const handleBookNow = (room: any) => {
    setSelectedRoom(room);
    
    // Auto estimate price per night based on room type
    let estimatedPrice = 1200000; // default
    const typeLower = room.roomType.toLowerCase();
    if (typeLower.includes('deluxe')) estimatedPrice = 1800000;
    else if (typeLower.includes('family')) estimatedPrice = 2800000;
    else if (typeLower.includes('nhà sàn') || typeLower.includes('nha san')) estimatedPrice = 800000;
    else if (typeLower.startsWith('tr')) estimatedPrice = 2200000;
    
    setUnitPrice(estimatedPrice);
    
    // Reset other form values
    setCustomerName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setChannel('Retail');
    setSaleName('');
    setAdults(2);
    setChildren6To11(0);
    setChildrenUnder6(0);
    setDepositAmount(0);
    setDiscountAmount(0);
    setVatRequired(false);
    setPaymentStatus('UNPAID');
    setMeals([]);
    setServices([]);
    setSubmitError(null);
    setSuccessData(null);
    
    setIsDrawerOpen(true);
  };

  // Add meal dynamically
  const addMeal = () => {
    setMeals([...meals, { date: checkin, mealType: 'LUNCH', serviceName: 'Ăn trưa buffet', restaurant: 'Restaurant A', qty: adults + children6To11, unit: 'Suất', price: 250000 }]);
  };

  // Remove meal
  const removeMeal = (idx: number) => {
    setMeals(meals.filter((_, i) => i !== idx));
  };

  // Update meal field
  const updateMeal = (idx: number, field: string, val: any) => {
    const updated = [...meals];
    updated[idx] = { ...updated[idx], [field]: val };
    setMeals(updated);
  };

  // Add service dynamically
  const addService = () => {
    setServices([...services, { date: checkin, serviceName: 'Zen Spa Massage 60m', qty: 2, price: 500000 }]);
  };

  // Remove service
  const removeService = (idx: number) => {
    setServices(services.filter((_, i) => i !== idx));
  };

  // Update service field
  const updateService = (idx: number, field: string, val: any) => {
    const updated = [...services];
    updated[idx] = { ...updated[idx], [field]: val };
    setServices(updated);
  };

  // Handle Form Submit
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || submitting) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      checkinAt: checkin,
      checkoutAt: checkout,
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.roomType,
      customerName,
      companyName,
      phone,
      email,
      channel,
      saleName,
      adults,
      children6To11,
      childrenUnder6,
      unitPrice,
      depositAmount,
      discountAmount,
      vatRequired,
      paymentStatus,
      meals,
      services
    };

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tạo đặt phòng.');
      }

      setSuccessData(data);
      
      // Refresh availability list in background
      const refreshRes = await fetch(`/api/bookings/available?checkin=${checkin}&checkout=${checkout}`);
      const refreshData = await refreshRes.json();
      if (refreshRes.ok) {
        setRooms(refreshData.rooms || []);
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering rooms based on Selected Zone Map
  const filteredRooms = rooms.filter((r) => {
    if (selectedZone && r.zone !== selectedZone) return false;
    return r.zone !== 'OTHER'; // Filter out Conference and Yards
  });

  // Count availability
  const vacantCount = filteredRooms.filter(r => r.isFullyAvailable).length;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-slate-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-amber-500 fill-amber-500/20" />
            <span>Đặt Phòng Nhanh & Tra Cứu Trống</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Đặt phòng trực tiếp trên sơ đồ vị trí, tự động tạo file booking chi tiết và đồng bộ Google Sheets.
          </p>
        </div>
      </div>

      {/* Date Picker Section */}
      <div className="glass-card p-5 border border-slate-800/80 bg-slate-900/30 backdrop-blur-md flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian lưu trú</p>
            <p className="text-sm text-slate-200 mt-0.5 font-medium">Chọn ngày đi và về</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-[280px] sm:max-w-md">
          <div className="relative flex-1">
            <label className="absolute -top-2 left-3 px-1 bg-[#131b2e] text-[10px] font-bold text-slate-400 tracking-wide">
              CHECK-IN
            </label>
            <input
              type="date"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <ArrowRight className="h-5 w-5 text-slate-500 shrink-0" />
          <div className="relative flex-1">
            <label className="absolute -top-2 left-3 px-1 bg-[#131b2e] text-[10px] font-bold text-slate-400 tracking-wide">
              CHECK-OUT
            </label>
            <input
              type="date"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {loadingAvailability && (
          <div className="flex items-center gap-2 text-sm text-emerald-400 font-medium ml-auto">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tra cứu phòng...</span>
          </div>
        )}
      </div>

      {/* Main Grid: Map & Room List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Map */}
        <div className="lg:col-span-7 h-full">
          <AvailableMap
            rooms={rooms}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
          />
        </div>

        {/* Right: Detailed Room Listing */}
        <div className="lg:col-span-5">
          <div className="glass-card border border-slate-800/80 bg-slate-900/30 backdrop-blur-md overflow-hidden flex flex-col min-h-[450px]">
            {/* Header info */}
            <div className="p-4 border-b border-slate-800/85 bg-slate-900/40 flex items-center justify-between">
              <div>
                <h3 className="font-outfit font-bold text-slate-100 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>Trạng Thái Phòng Chi Tiết</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hiển thị {filteredRooms.length} phòng trong khu vực lọc.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
                {vacantCount} TRỐNG
              </span>
            </div>

            {/* List */}
            {loadingAvailability ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
                <span className="text-sm">Đang tải trạng thái phòng trống...</span>
              </div>
            ) : errorAvailability ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-rose-400 text-center">
                <AlertTriangle className="h-8 w-8 text-rose-500 mb-3" />
                <p className="text-sm font-semibold">{errorAvailability}</p>
                <button 
                  onClick={() => router.refresh()} 
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                <HelpCircle className="h-8 w-8 text-slate-600 mb-3" />
                <p className="text-sm">Không tìm thấy phòng nào phù hợp.</p>
                <p className="text-xs text-slate-500 mt-1">Chọn lại khoảng ngày hoặc phân khu khác trên bản đồ.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-slate-800/60">
                {filteredRooms.map((room) => {
                  const occupiedDays = room.dailyStatus.filter((d: any) => d.occupied);
                  const isFullyOccupied = occupiedDays.length === room.dailyStatus.length;
                  const isPartiallyOccupied = occupiedDays.length > 0 && !isFullyOccupied;

                  return (
                    <div 
                      key={room.roomNumber} 
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-900/30 ${
                        room.isFullyAvailable ? 'bg-transparent' : isFullyOccupied ? 'bg-rose-500/5' : 'bg-amber-500/5'
                      }`}
                    >
                      {/* Left: Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-outfit font-bold text-slate-200 text-base">
                            Phòng {room.roomNumber}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold border border-slate-700/60">
                            {room.roomType}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400 items-center">
                          <span className="font-bold text-slate-500">Khu {room.zone}</span>
                          <span className="text-slate-600">•</span>
                          {room.isFullyAvailable ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                              Trống toàn bộ lịch
                            </span>
                          ) : isFullyOccupied ? (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                              Kín toàn bộ lịch ({occupiedDays.length} đêm)
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              Kín {occupiedDays.length} đêm / Trống {room.dailyStatus.length - occupiedDays.length} đêm
                            </span>
                          )}
                        </div>

                        {/* Occupied details if any */}
                        {occupiedDays.length > 0 && (
                          <div className="mt-2.5 p-2 bg-slate-950/40 rounded-lg border border-slate-800/80 space-y-1.5 max-w-sm">
                            {occupiedDays.map((d: any) => (
                              <div key={d.date} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="text-slate-500 font-mono">{d.date.split('-').slice(1).reverse().join('/')}:</span>
                                <span className="text-slate-300 font-semibold truncate flex-1 max-w-[140px]">{d.bookingName}</span>
                                {d.hyperlink ? (
                                  <a 
                                    href={d.hyperlink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 shrink-0"
                                  >
                                    <span>Chi tiết</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-500 italic shrink-0">Không có link</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="shrink-0 flex items-center sm:justify-end">
                        {room.isFullyAvailable ? (
                          <button
                            onClick={() => handleBookNow(room)}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md shadow-emerald-900/10 flex items-center justify-center gap-1.5 group/btn transition-colors cursor-pointer"
                          >
                            <span>Đặt ngay</span>
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 text-slate-500 font-bold text-xs border border-slate-700/50 cursor-not-allowed text-center"
                          >
                            Hết phòng trống
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => {
            if (!submitting) setIsDrawerOpen(false);
          }}
        />
      )}

      {/* Slide-over Drawer Booking Form */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-2xl w-full bg-[#0b0f19] border-l border-slate-800 shadow-2xl z-50 transform transition-transform duration-500 ease-out flex flex-col h-full ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
          <div>
            <h3 className="font-outfit font-bold text-xl text-slate-100 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                <Clock className="h-4 w-4" />
              </span>
              <span>Lập Đặt Phòng Nhanh</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Phòng: <strong className="text-slate-200">{selectedRoom?.roomNumber}</strong> ({selectedRoom?.roomType}) | Thời gian: {checkin} đến {checkout}
            </p>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-200 text-sm p-2 rounded bg-slate-800/50 border border-slate-700/60"
          >
            Đóng
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <form onSubmit={handleSubmitBooking} className="flex-1 overflow-y-auto p-6 space-y-6">
          {successData ? (
            /* Success State */
            <div className="p-8 text-center space-y-5 flex flex-col items-center justify-center h-full">
              <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/10 animate-bounce">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <div className="space-y-2">
                <h4 className="font-outfit font-bold text-2xl text-slate-100">ĐẶT PHÒNG THÀNH CÔNG!</h4>
                <p className="text-sm text-slate-400 max-w-md">
                  Hệ thống đã tự động tạo booking <strong className="text-slate-200">{successData.bookingCode}</strong>, sinh file Excel booking chi tiết và ghi đè link lên Google Sheets Forecast.
                </p>
              </div>
              
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl max-w-md w-full space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span>Mã Booking:</span>
                  <span className="font-bold text-slate-200">{successData.bookingCode}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span>Khách hàng:</span>
                  <span className="font-bold text-slate-200">{customerName}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span>Đường dẫn Excel booking chi tiết:</span>
                </div>
                <a
                  href={successData.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white transition-colors"
                >
                  <span>Mở file Booking Excel</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setSuccessData(null);
                }}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg border border-slate-700"
              >
                Hoàn tất & Quay lại sơ đồ
              </button>
            </div>
          ) : (
            /* Main Form Fields */
            <div className="space-y-6">
              {submitError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-lg flex items-start gap-3 text-rose-400 text-sm">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                  <p className="font-medium">{submitError}</p>
                </div>
              )}

              {/* Guest Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  <span>1. Thông tin khách hàng</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Tên khách hàng *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Mr. An"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Tên công ty / Đoàn khách</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Công ty An Group"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="tel"
                        placeholder="Số điện thoại"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        placeholder="Địa chỉ Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Kênh bán (Channel)</label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Retail">Bán lẻ (Retail)</option>
                      <option value="OTA">Đại lý Online (OTA)</option>
                      <option value="TA">Đại lý Du lịch (TA)</option>
                      <option value="CTV">Cộng tác viên (CTV)</option>
                      <option value="Company">Doanh nghiệp (Company)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Nhân viên phụ trách (Sales)</label>
                    <input
                      type="text"
                      placeholder="Tên Sales"
                      value={saleName}
                      onChange={(e) => setSaleName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Occupancy Counts */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  <span>2. Số lượng khách lưu trú</span>
                </h4>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Người lớn</label>
                    <input
                      type="number"
                      min="1"
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Trẻ em (6-11 tuổi)</label>
                    <input
                      type="number"
                      min="0"
                      value={children6To11}
                      onChange={(e) => setChildren6To11(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Trẻ em (&lt;6 tuổi)</label>
                    <input
                      type="number"
                      min="0"
                      value={childrenUnder6}
                      onChange={(e) => setChildrenUnder6(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial calculations */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800/80 pb-2 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-emerald-400" />
                  <span>3. Hạch toán tài chính phòng</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Giá phòng / Đêm (VND)</label>
                    <input
                      type="number"
                      step="50000"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Đặt cọc trước (VND)</label>
                    <input
                      type="number"
                      step="50000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Giảm giá / Discount (VND)</label>
                    <input
                      type="number"
                      step="50000"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400">Trạng thái thanh toán</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="UNPAID">Chưa thanh toán (UNPAID)</option>
                      <option value="PARTIAL">Đặt cọc / Thanh toán một phần (PARTIAL)</option>
                      <option value="PAID">Đã thanh toán toàn bộ (PAID)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-2 md:col-span-2">
                    <input
                      type="checkbox"
                      id="vatRequired"
                      checked={vatRequired}
                      onChange={(e) => setVatRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <label htmlFor="vatRequired" className="text-xs font-bold text-slate-300 cursor-pointer">
                      Yêu cầu xuất hoá đơn VAT (10%)
                    </label>
                  </div>
                </div>
              </div>

              {/* Meal details list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span>4. Chi tiết thực đơn F&B (Mâm/Suất)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addMeal}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Thêm suất ăn</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {meals.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Chưa có thực đơn F&B phụ thu (Mặc định hệ thống tự sinh các bữa ăn sáng miễn phí theo tiêu chuẩn số khách của đoàn).
                    </p>
                  ) : (
                    meals.map((meal, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                          <span>Suất ăn #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeMeal(idx)}
                            className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xoá</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Ngày đặt ăn</label>
                            <input
                              type="date"
                              value={meal.date}
                              onChange={(e) => updateMeal(idx, 'date', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Bữa ăn (Meal Type)</label>
                            <select
                              value={meal.mealType}
                              onChange={(e) => updateMeal(idx, 'mealType', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="BREAKFAST">Bữa Sáng</option>
                              <option value="LUNCH">Bữa Trưa</option>
                              <option value="DINNER">Bữa Tối</option>
                              <option value="BBQ">BBQ Ngoài Trời</option>
                              <option value="GALA">Tiệc Gala Dinner</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Tên món/dịch vụ</label>
                            <input
                              type="text"
                              value={meal.serviceName}
                              onChange={(e) => updateMeal(idx, 'serviceName', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Số lượng</label>
                            <input
                              type="number"
                              value={meal.qty}
                              onChange={(e) => updateMeal(idx, 'qty', parseInt(e.target.value, 10) || 0)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Đơn vị</label>
                            <select
                              value={meal.unit}
                              onChange={(e) => updateMeal(idx, 'unit', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="Suất">Suất (Pax)</option>
                              <option value="Mâm">Mâm (Table)</option>
                              <option value="Đĩa">Đĩa</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Đơn giá (VND)</label>
                            <input
                              type="number"
                              step="10000"
                              value={meal.price}
                              onChange={(e) => updateMeal(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Service details list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>5. Dịch vụ gia tăng phụ trợ (Spa, Tour, Karaoke...)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addService}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Thêm dịch vụ</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {services.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Chưa thêm dịch vụ phụ trợ.
                    </p>
                  ) : (
                    services.map((svc, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                          <span>Dịch vụ #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeService(idx)}
                            className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Xoá</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Ngày sử dụng</label>
                            <input
                              type="date"
                              value={svc.date}
                              onChange={(e) => updateService(idx, 'date', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400">Tên dịch vụ</label>
                            <input
                              type="text"
                              value={svc.serviceName}
                              onChange={(e) => updateService(idx, 'serviceName', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Số lượng</label>
                            <input
                              type="number"
                              value={svc.qty}
                              onChange={(e) => updateService(idx, 'qty', parseInt(e.target.value, 10) || 0)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400">Đơn giá (VND)</label>
                            <input
                              type="number"
                              step="50000"
                              value={svc.price}
                              onChange={(e) => updateService(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Drawer Footer Actions */}
        {!successData && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-4">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Tổng chi phí dự kiến:</span>
              <span className="font-outfit font-bold text-xl text-emerald-400">
                {(
                  (Number(unitPrice) || 0) * (selectedRoom?.dailyStatus?.length || 1) +
                  meals.reduce((sum, m) => sum + m.qty * m.price, 0) +
                  services.reduce((sum, s) => sum + s.qty * s.price, 0)
                ).toLocaleString('vi-VN')} VND
              </span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                onClick={handleSubmitBooking}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-lg shadow-emerald-950/20 flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang đồng bộ Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Tạo Đặt Phòng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
