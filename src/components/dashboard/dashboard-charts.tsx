'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DailyStatData {
  date: string;
  roomSold: number;
  occupancy: number;
  roomRevenue: number;
  foodRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
  checkin: number;
  checkout: number;
  breakfast: number;
  lunch: number;
  dinner: number;
}

interface DashboardChartsProps {
  stats: DailyStatData[];
}

export default function DashboardCharts({ stats }: DashboardChartsProps) {
  // Format numbers to short text (e.g. 1M, 500k)
  const formatCurrencyShort = (val: number) => {
    const rounded = Math.round(val);
    if (rounded >= 1e12) return `${(rounded / 1e12).toFixed(1)} Nghìn Tỷ`;
    if (rounded >= 1e9) return `${(rounded / 1e9).toFixed(1)} Tỷ`;
    if (rounded >= 1e6) return `${(rounded / 1e6).toFixed(1)} Tr`;
    if (rounded >= 1e3) return `${(rounded / 1e3).toFixed(0)} k`;
    return rounded.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
  };

  const formatVNCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0 
    }).format(Math.round(val));
  };

  // Pie chart data for revenue distribution
  const totalRoomRev = stats.reduce((sum, s) => sum + s.roomRevenue, 0);
  const totalFoodRev = stats.reduce((sum, s) => sum + s.foodRevenue, 0);
  const totalServiceRev = stats.reduce((sum, s) => sum + s.serviceRevenue, 0);

  const revenuePieData = [
    { name: 'Phòng', value: totalRoomRev, color: '#10b981' }, // Emerald
    { name: 'Ẩn thực (F&B)', value: totalFoodRev, color: '#b45309' }, // Amber
    { name: 'Dịch vụ khác', value: totalServiceRev, color: '#3b82f6' }, // Blue
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Occupancy & Room Sold Area Chart */}
      <div className="lg:col-span-2 glass-card p-6 min-h-[350px]">
        <h3 className="font-outfit font-bold text-lg mb-4 text-[var(--foreground)]">
          Công Suất Phòng & Lượt Phòng Bán
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRoom" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} />
              <YAxis stroke="var(--muted)" fontSize={11} domain={[0, 5]} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-sidebar)', border: 'none', borderRadius: '8px', color: '#fff' }}
                labelFormatter={(label) => `Ngày ${label}`}
              />
              <Area type="monotone" dataKey="roomSold" name="Số phòng bán" stroke="#10b981" fillOpacity={1} fill="url(#colorRoom)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Revenue Distribution Pie Chart */}
      <div className="glass-card p-6 flex flex-col justify-between">
        <div>
          <h3 className="font-outfit font-bold text-lg mb-2 text-[var(--foreground)]">
            Cơ Cấu Doanh Thu
          </h3>
          <p className="text-xs text-[var(--muted)] mb-4">Phân bổ tỷ trọng các nguồn thu</p>
        </div>
        <div className="h-44 w-full relative flex items-center justify-center">
          {revenuePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenuePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {revenuePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatVNCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-sm text-[var(--muted)]">Không có dữ liệu doanh thu</div>
          )}
        </div>
        <div className="space-y-1.5 mt-2">
          {revenuePieData.map((item) => (
            <div key={item.name} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[var(--muted)]">{item.name}</span>
              </div>
              <span className="font-bold cursor-help" title={formatVNCurrency(item.value)}>
                {formatCurrencyShort(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Daily Revenues Bar Chart */}
      <div className="lg:col-span-2 glass-card p-6 min-h-[350px]">
        <h3 className="font-outfit font-bold text-lg mb-4 text-[var(--foreground)]">
          Biến Động Doanh Thu Hàng Ngày
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} />
              <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={formatCurrencyShort} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-sidebar)', border: 'none', borderRadius: '8px', color: '#fff' }}
                formatter={(value: any) => formatVNCurrency(Number(value))}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="roomRevenue" name="Phòng" fill="#10b981" stackId="a" />
              <Bar dataKey="foodRevenue" name="F&B" fill="#b45309" stackId="a" />
              <Bar dataKey="serviceRevenue" name="Dịch vụ khác" fill="#3b82f6" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Dining Schedule Pax Chart */}
      <div className="glass-card p-6 min-h-[350px]">
        <h3 className="font-outfit font-bold text-lg mb-4 text-[var(--foreground)]">
          Biểu Đồ Suất Ăn F&B
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} />
              <YAxis stroke="var(--muted)" fontSize={11} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-sidebar)', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="breakfast" name="Sáng" fill="#10b981" />
              <Bar dataKey="lunch" name="Trưa" fill="#3b82f6" />
              <Bar dataKey="dinner" name="Tối/BBQ" fill="#b45309" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
