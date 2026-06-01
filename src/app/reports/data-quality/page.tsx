import React from 'react';
import prisma from '@/lib/db';
import { format } from 'date-fns';
import { Download, AlertTriangle, AlertOctagon, HelpCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function DataQualityReportPage() {
  const latestJob = await prisma.importJob.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    include: {
      cells: true,
      bookings: {
        include: {
          rooms: true,
          meals: true,
          services: true,
          payment: true,
        }
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

  const cells = latestJob.cells;
  const bookings = latestJob.bookings;

  // Aggregate issues
  const warnings: Array<{
    type: string;
    identifier: string;
    level: 'ERROR' | 'WARNING' | 'REVIEW';
    message: string;
    rawText: string;
    sourceUrl?: string | null;
  }> = [];

  // 1. Cells with text but NO hyperlink (Warning)
  cells.forEach((c) => {
    if (c.cellText && !c.hyperlink) {
      warnings.push({
        type: 'Forecast Cell',
        identifier: `Ô ${c.sheetName}!R${c.rowIndex}C${c.columnIndex}`,
        level: 'WARNING',
        message: `Có text đặt phòng nhưng không gắn link booking: "${c.cellText}"`,
        rawText: c.cellText,
      });
    }
  });

  // 2. Booking downloader failed read (Error)
  bookings.forEach((b) => {
    if (b.status === 'FAILED_READ') {
      warnings.push({
        type: 'Booking Link Downloader',
        identifier: b.bookingCode,
        level: 'ERROR',
        message: `Không mở hoặc đọc được file booking sheet từ link: "${b.sourceUrl}"`,
        rawText: b.rawText || 'Empty description',
        sourceUrl: b.sourceUrl,
      });
    }
  });

  // 3. Stated payment total vs calculated detailed total mismatch (Review)
  bookings.forEach((b) => {
    if (b.status === 'FAILED_READ') return;

    const roomAmt = b.rooms.reduce((sum, r) => sum + r.amount, 0);
    const mealAmt = b.meals.reduce((sum, m) => sum + m.amount, 0);
    const serviceAmt = b.services.reduce((sum, s) => sum + s.amount, 0);
    const discount = b.payment?.discountAmount || 0;
    const calcTotal = roomAmt + mealAmt + serviceAmt - discount;
    const statedTotal = b.payment?.totalAmount || 0;

    if (Math.abs(statedTotal - calcTotal) > 1000) {
      warnings.push({
        type: 'Booking Payment',
        identifier: b.bookingCode,
        level: 'REVIEW',
        message: `Tổng số tiền hạch toán chi tiết (${calcTotal.toLocaleString('vi-VN')} đ) lệch so với số tổng thanh toán trên voucher (${statedTotal.toLocaleString('vi-VN')} đ).`,
        rawText: `Phòng: ${roomAmt.toLocaleString()} đ | Ăn uống: ${mealAmt.toLocaleString()} đ | Dịch vụ: ${serviceAmt.toLocaleString()} đ | Giảm giá: ${discount.toLocaleString()} đ`,
        sourceUrl: b.sourceUrl,
      });
    }
  });

  // 4. Dining Pax mismatch (Warning)
  bookings.forEach((b) => {
    if (b.status === 'FAILED_READ') return;

    b.meals.forEach((m) => {
      if (m.paxCount > 0 && b.totalGuests > 0 && Math.abs(m.paxCount - b.totalGuests) > 0.1 && m.mealType !== 'BREAKFAST') {
        warnings.push({
          type: 'Dining Plan',
          identifier: b.bookingCode,
          level: 'WARNING',
          message: `Suất ăn ${m.mealType} ngày ${format(m.mealDate, 'dd/MM')} có số lượng (${m.paxCount} suất) lệch so với số khách lưu trú của booking (${b.totalGuests} khách).`,
          rawText: m.rawLine || '',
          sourceUrl: b.sourceUrl,
        });
      }
    });
  });

  // 5. Booking checkin vs checkout timeline conflicts (Error)
  bookings.forEach((b) => {
    if (b.status === 'FAILED_READ') return;
    if (b.checkoutAt < b.checkinAt) {
      warnings.push({
        type: 'Booking Dates',
        identifier: b.bookingCode,
        level: 'ERROR',
        message: `Lịch check-out (${format(b.checkoutAt, 'dd/MM/yyyy')}) bị xếp trước ngày check-in (${format(b.checkinAt, 'dd/MM/yyyy')}).`,
        rawText: `Check-in: ${b.checkinAt.toISOString()} | Check-out: ${b.checkoutAt.toISOString()}`,
        sourceUrl: b.sourceUrl,
      });
    }
  });

  const errorsCount = warnings.filter(w => w.level === 'ERROR').length;
  const warningsCount = warnings.filter(w => w.level === 'WARNING').length;
  const reviewCount = warnings.filter(w => w.level === 'REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-outfit font-bold text-3xl tracking-tight text-[var(--foreground)]">
            Báo Cáo Lỗi & Chất Lượng Dữ Liệu (Data Quality)
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Hàng đợi kiểm tra lỗi đọc link, thiếu voucher, lệch tiền, lệch suất ăn hoặc trùng buồng phòng.
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

      {/* KPI stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-card)] p-5 rounded-xl border border-[var(--border)]">
        <div className="text-center py-2 border-l-4 border-l-red-500 rounded">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Tổng Lỗi Nghiêm Trọng (Errors)</p>
          <p className="font-outfit font-bold text-2xl text-red-500 mt-1">{errorsCount} lỗi</p>
        </div>
        <div className="text-center py-2 border-x border-[var(--border)] border-l-4 border-l-amber-500 rounded">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Cảnh Báo Dữ Liệu (Warnings)</p>
          <p className="font-outfit font-bold text-2xl text-amber-600 dark:text-amber-400 mt-1">{warningsCount} cảnh báo</p>
        </div>
        <div className="text-center py-2 border-l-4 border-l-blue-500 rounded">
          <p className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">Cần Kiểm Tra Lại (Review)</p>
          <p className="font-outfit font-bold text-2xl text-blue-500 mt-1">{reviewCount} hàng đợi</p>
        </div>
      </div>

      {/* Issue Log List */}
      <div className="glass-card p-6">
        <h3 className="font-outfit font-bold text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Hàng Đợi Cảnh Báo Chất Lượng Dữ Liệu (Warnings Log)
        </h3>

        {warnings.length > 0 ? (
          <div className="space-y-4">
            {warnings.map((w, idx) => (
              <div 
                key={idx} 
                className={`p-4 border rounded-xl text-xs space-y-2 relative transition-all hover:scale-[1.002] ${
                  w.level === 'ERROR' ? 'bg-red-500/5 border-red-500/20' :
                  w.level === 'WARNING' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                {/* Level badge */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      w.level === 'ERROR' ? 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400' :
                      w.level === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400'
                    }`}>
                      {w.level}
                    </span>
                    <span className="font-bold text-[var(--muted)]">
                      {w.type} •{' '}
                      {w.sourceUrl ? (
                        <a
                          href={w.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          title="Mở file voucher gốc"
                        >
                          {w.identifier}
                        </a>
                      ) : (
                        w.identifier
                      )}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <p className="font-semibold text-sm text-[var(--foreground)] leading-relaxed">
                  {w.message}
                </p>

                {/* Metadata source debug */}
                <div className="bg-[var(--muted-bg)] p-2.5 rounded-lg border border-[var(--border)] text-[var(--muted)] font-mono text-[10px] truncate max-w-full" title={w.rawText}>
                  Nguồn: {w.rawText}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <div>
              <h4 className="font-bold text-lg text-[var(--foreground)]">Dữ liệu hoàn toàn sạch!</h4>
              <p className="text-xs text-[var(--muted)] mt-1">Không phát hiện cảnh báo hoặc lỗi tính toán nào trong đợt hạch toán này.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
