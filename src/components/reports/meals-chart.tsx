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
  breakfast: number;
  lunch: number;
  dinner: number;
  bbq: number;
  gala: number;
}

interface MealsChartProps {
  data: ChartData[];
}

export default function MealsChart({ data }: MealsChartProps) {
  return (
    <div className="glass-card p-6 min-h-[350px]">
      <h3 className="font-outfit font-bold text-lg mb-4 text-[var(--foreground)]">
        Biểu Đồ Suất Ăn F&B Dự Kiến Trong Tháng
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
            <Bar dataKey="breakfast" name="Ăn sáng (Breakfast)" fill="#10b981" stackId="a" />
            <Bar dataKey="lunch" name="Ăn trưa (Lunch)" fill="#3b82f6" stackId="a" />
            <Bar dataKey="dinner" name="Ăn tối (Dinner)" fill="#b45309" stackId="a" />
            <Bar dataKey="bbq" name="BBQ Lawn/Club" fill="#8b5cf6" stackId="a" />
            <Bar dataKey="gala" name="Gala Dinner" fill="#ec4899" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
