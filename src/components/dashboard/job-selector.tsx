'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';

interface JobSelectorProps {
  jobs: Array<{
    id: string;
    month: number;
    year: number;
    fileName: string;
  }>;
  selectedJobId: string;
}

export default function JobSelector({ jobs, selectedJobId }: JobSelectorProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'all') {
      router.push('/?jobId=all');
    } else {
      router.push(`/?jobId=${val}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="h-8.5 w-8.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
        <CalendarDays className="h-4.5 w-4.5" />
      </div>
      <select
        value={selectedJobId}
        onChange={handleChange}
        className="glass-card bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer focus:outline-hidden focus:border-emerald-500 transition-all shadow-md"
      >
        <option value="all">📊 Toàn thời gian (Tất cả các tháng)</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            📅 Tháng {job.month}/{job.year} ({job.fileName.substring(0, 15)}...)
          </option>
        ))}
      </select>
    </div>
  );
}
