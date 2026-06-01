'use client';

import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Sparkles,
  Link2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ImportJob {
  id: string;
  fileName: string;
  status: string;
  month: number;
  year: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export default function ImportsPage() {
  const [activeTab, setActiveTab] = useState<'file' | 'sheet'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [month, setMonth] = useState('5');
  const [year, setYear] = useState('2026');
  const [uploading, setUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/imports');
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // Poll for active jobs every 5 seconds
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('month', month);
    formData.append('year', year);

    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setFile(null);
        fetchJobs();
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setUploading(true);
    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: sheetUrl,
          month: parseInt(month, 10),
          year: parseInt(year, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSheetUrl('');
        fetchJobs();
      } else {
        alert(`Lỗi import từ URL: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loadSample: true }),
      });
      const data = await res.json();
      if (data.success) {
        fetchJobs();
      } else {
        alert(`Sample load failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleLiveSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/imports/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert('Đồng bộ thành công! Hệ thống đang tải và cập nhật dữ liệu mới nhất từ Google Sheets ở chế độ nền.');
        fetchJobs();
      } else {
        alert(`Đồng bộ thất bại: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Lỗi kết nối: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)] animate-fade-in">
          Import Forecast & Bookings
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1 animate-fade-in">
          Upload file Excel hoặc kết nối Google Sheets trực tuyến để phân tích dữ liệu resort.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Upload Form Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] mb-6 gap-6 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('file')}
                className={cn(
                  "pb-3 cursor-pointer transition-all border-b-2",
                  activeTab === 'file' ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400" : "border-transparent text-[var(--muted)]"
                )}
              >
                Upload File Excel
              </button>
              <button
                onClick={() => setActiveTab('sheet')}
                className={cn(
                  "pb-3 cursor-pointer transition-all border-b-2",
                  activeTab === 'sheet' ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400" : "border-transparent text-[var(--muted)]"
                )}
              >
                Nhập Link Google Sheets
              </button>
            </div>

            <form onSubmit={activeTab === 'file' ? handleUpload : handleUrlImport} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Tháng Báo Cáo</label>
                  <select 
                    value={month} 
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">Năm</label>
                  <select 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              {activeTab === 'file' ? (
                /* File Dropzone */
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-emerald-500 transition-all relative">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading || loadingSample}
                  />
                  <div className="space-y-3">
                    <UploadCloud className="h-10 w-10 text-[var(--muted)] mx-auto" />
                    <div className="text-sm">
                      {file ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{file.name}</span>
                      ) : (
                        <>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Click to upload</span>
                          <span className="text-[var(--muted)]"> or drag and drop</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted)]">Định dạng hỗ trợ: Excel (.xlsx, .xls) tối đa 10MB</p>
                  </div>
                </div>
              ) : (
                /* URL Input */
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">URL Google Sheet Forecast</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-2.5 h-4.5 w-4.5 text-[var(--muted)]" />
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="Dán link tại đây (Ví dụ: https://docs.google.com/spreadsheets/d/.../edit)"
                      className="w-full bg-[var(--muted-bg)] border border-[var(--border)] rounded-lg pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={uploading || loadingSample}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                    * Lưu ý: Hãy chắc chắn Google Sheets của bạn ở chế độ công khai (mọi người có liên kết đều có thể xem) để hệ thống có thể tải và parse dữ liệu.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={(activeTab === 'file' ? !file : !sheetUrl.trim()) || uploading || loadingSample}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/15"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {activeTab === 'file' ? 'Khởi Chạy Phân Tích File' : 'Import Từ Google Sheets'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Actions Stack Column */}
        <div className="space-y-6">
          {/* Demo Mode / Mock Card */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5 fill-amber-500/10" />
              <h3 className="font-outfit font-bold text-lg text-[var(--foreground)]">Demo / Offline Mode</h3>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Bạn có thể chạy thử hệ thống ngay lập tức bằng cách sử dụng file forecast mẫu **CPR_DAILY_FORECAST_2026.xlsx** có sẵn trên ổ đĩa. 
            </p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Hệ thống sẽ tự động quét các hyperlink booking và đọc dữ liệu từ folder confirmed bookings offline.
            </p>
            <button
              onClick={handleLoadSample}
              disabled={uploading || loadingSample}
              className="w-full border border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loadingSample ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Load File Mẫu Demo 2026
            </button>
          </div>

          {/* Live Sync Card */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <RefreshCw className="h-5 w-5 fill-emerald-500/10" />
              <h3 className="font-outfit font-bold text-lg text-[var(--foreground)]">Tự Động Đồng Bộ (Live Sync)</h3>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              Tải lại dữ liệu mới nhất từ liên kết Google Sheets đã cấu hình trước đó để cập nhật Sơ đồ phòng và các báo cáo tức thì.
            </p>
            <button
              onClick={handleLiveSync}
              disabled={uploading || syncing || loadingSample}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/15"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Đồng Bộ Ngay
            </button>
            <div className="border-t border-[var(--border)] pt-3.5 space-y-2">
              <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Cấu hình Cron Tự Động</span>
              <p className="text-[10px] text-[var(--muted)] leading-relaxed">
                Thiết lập cron job (như trên **aaPanel**) gọi URL sau để đồng bộ tự động mỗi 10 phút:
              </p>
              <div className="bg-[var(--muted-bg)] p-2 rounded-lg text-[9px] text-[var(--muted)] font-mono select-all break-all leading-normal">
                curl -X GET "https://[YOUR_DOMAIN]/api/imports/sync?apiKey=cuong_resort_sync_default_token_123"
              </div>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="lg:col-span-3 glass-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-outfit font-bold text-lg">Lịch Sử Phân Tích (Import History)</h3>
            <button 
              onClick={fetchJobs} 
              disabled={refreshing}
              className="p-2 hover:bg-[var(--muted-bg)] rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] transition-all cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase tracking-wider bg-[var(--muted-bg)]/35">
                  <th className="py-3 px-4">Tên File / Link ID</th>
                  <th className="py-3 px-4">Tháng/Năm</th>
                  <th className="py-3 px-4">Ngày Bắt Đầu</th>
                  <th className="py-3 px-4">Thời Gian Hoàn Thành</th>
                  <th className="py-3 px-4 text-center">Trạng Thế</th>
                  <th className="py-3 px-4">Ghi Chú Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {jobs.length > 0 ? (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[var(--muted-bg)] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[var(--foreground)] flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="truncate max-w-[200px]" title={job.fileName}>{job.fileName}</span>
                      </td>
                      <td className="py-3.5 px-4">{job.month}/{job.year}</td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted)]">
                        {format(new Date(job.startedAt), 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[var(--muted)]">
                        {job.finishedAt ? format(new Date(job.finishedAt), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          job.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                          job.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {job.status === 'SUCCESS' && <CheckCircle className="h-3.5 w-3.5" />}
                          {job.status === 'FAILED' && <XCircle className="h-3.5 w-3.5" />}
                          {job.status === 'PROCESSING' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-red-500 font-medium truncate max-w-[250px]" title={job.errorMessage || undefined}>
                        {job.errorMessage || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                      Chưa thực hiện import dữ liệu nào. Hãy upload file hoặc load file mẫu demo để bắt đầu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
