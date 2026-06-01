'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface ChartData {
  date: string;
  checkin: number;
  checkout: number;
  stayover: number;
}

interface ArrivalDepartureChartProps {
  data: ChartData[];
}

export default function ArrivalDepartureChart({ data }: ArrivalDepartureChartProps) {
  return (
    <div className="glass-card p-6 min-h-[350px]">
      <h3 className="font-outfit font-bold text-lg mb-4 text-[var(--foreground)]">
        Biểu Đồ Lưu Trực Khách Vào / Ra Hàng Ngày
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
            <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} />
            <YAxis stroke="var(--muted)" fontSize={11} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-sidebar)', border: 'none', borderRadius: '8px', color: '#fff' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Bar dataKey="checkin" name="Check-in Guests" fill="#10b981" />
            <Bar dataKey="checkout" name="Check-out Guests" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
