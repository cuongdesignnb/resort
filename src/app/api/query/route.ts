import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const { query, jobId } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is empty' }, { status: 400 });
    }

    const norm = query.toLowerCase().trim();
    let responseText = '';
    let data: any = null;

    // Helper to get active job ID
    const getJobId = async () => {
      if (jobId) return jobId;
      const lastJob = await prisma.importJob.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { startedAt: 'desc' },
      });
      return lastJob ? lastJob.id : null;
    };

    const activeJobId = await getJobId();
    if (!activeJobId) {
      return NextResponse.json({
        answer: 'Chưa có dữ liệu nào được import thành công trong hệ thống. Vui lòng import file forecast trước.',
      });
    }

    const job = await prisma.importJob.findUnique({
      where: { id: activeJobId },
    });

    // 1. QUERY: Meal count queries e.g. "Ngày 31/05 có bao nhiêu khách ăn trưa?"
    const mealMatch = norm.match(/(ăn sáng|ăn trưa|ăn tối|bbq|gala|breakfast|lunch|dinner).*ngày\s*(\d{1,2})[\/\-\.](\d{1,2})/i) ||
                      norm.match(/ngày\s*(\d{1,2})[\/\-\.](\d{1,2}).*(ăn sáng|ăn trưa|ăn tối|bbq|gala|breakfast|lunch|dinner)/i);
    
    if (mealMatch) {
      const isDateFirst = !isNaN(Number(mealMatch[1]));
      const rawMealType = isDateFirst ? mealMatch[3] : mealMatch[1];
      const day = parseInt(isDateFirst ? mealMatch[1] : mealMatch[2], 10);
      const month = parseInt(isDateFirst ? mealMatch[2] : mealMatch[3], 10);
      
      let mealType = 'DINNER';
      const mText = rawMealType.toLowerCase();
      if (mText.includes('sáng') || mText.includes('breakfast')) mealType = 'BREAKFAST';
      else if (mText.includes('trưa') || mText.includes('lunch')) mealType = 'LUNCH';
      else if (mText.includes('bbq')) mealType = 'BBQ';
      else if (mText.includes('gala')) mealType = 'GALA';
      else if (mText.includes('tối') || mText.includes('dinner')) mealType = 'DINNER';

      const targetDate = new Date(job?.year || 2026, month - 1, day);
      
      const meals = await prisma.bookingMeal.findMany({
        where: {
          mealType,
          mealDate: {
            gte: new Date(job?.year || 2026, month - 1, day, 0, 0, 0),
            lte: new Date(job?.year || 2026, month - 1, day, 23, 59, 59),
          },
          booking: {
            importJobId: activeJobId,
            status: { not: 'CANCELLED' }
          }
        },
        include: {
          booking: true
        }
      });

      const totalPax = meals.reduce((sum, m) => sum + m.paxCount, 0);
      const totalTables = meals.reduce((sum, m) => sum + m.tableCount, 0);
      
      responseText = `Vào ngày **${day}/${month}/${job?.year}**, có tổng cộng **${totalPax}** suất ăn **${mealType}** được đặt (và ${totalTables} mâm).`;
      if (meals.length > 0) {
        responseText += `\n\n**Chi tiết các booking:**\n` + 
          meals.map(m => `- Booking **${m.booking.bookingCode}** (${m.booking.bookingName}): ${m.paxCount} pax (${m.unit === 'Mâm' ? `${m.quantity} mâm` : `${m.paxCount} suất`}) tại ${m.restaurantName || 'Nhà hàng chính'}`).join('\n');
      }
      return NextResponse.json({ answer: responseText });
    }

    // 2. QUERY: Check-in counts e.g. "Tháng 5 có bao nhiêu khách check-in?"
    if (norm.includes('check-in') || norm.includes('checkin') || norm.includes('khách đến') || norm.includes('nhận phòng')) {
      const monthMatch = norm.match(/tháng\s*(\d+)/i) || norm.match(/t\s*(\d+)/i);
      const targetMonth = monthMatch ? parseInt(monthMatch[1], 10) : job?.month || 5;

      const bookings = await prisma.booking.findMany({
        where: {
          importJobId: activeJobId,
          status: { not: 'CANCELLED' },
          checkinAt: {
            gte: new Date(job?.year || 2026, targetMonth - 1, 1),
            lte: new Date(job?.year || 2026, targetMonth, 0, 23, 59, 59),
          }
        }
      });

      const totalGuests = bookings.reduce((sum, b) => sum + b.totalGuests, 0);
      responseText = `Trong **Tháng ${targetMonth}**, có tổng cộng **${bookings.length}** booking check-in với tổng số **${totalGuests}** khách lưu trú (không tính các booking đã hủy).`;
      return NextResponse.json({ answer: responseText });
    }

    // 3. QUERY: Missing links e.g. "Booking nào thiếu link?"
    if (norm.includes('thiếu link') || norm.includes('thieu link') || norm.includes('không có link') || norm.includes('khong co link') || norm.includes('chưa có link')) {
      const cells = await prisma.forecastCell.findMany({
        where: {
          importJobId: activeJobId,
          cellText: { not: null },
          hyperlink: null
        }
      });

      if (cells.length === 0) {
        responseText = `Tuyệt vời! Không có booking nào bị thiếu hyperlink trong sheet forecast tháng này.`;
      } else {
        responseText = `Phát hiện **${cells.length}** ô booking trong forecast bị thiếu link booking confirmation:\n\n` +
          cells.map(c => `- Phòng **${c.roomNumber}** ngày **${format(c.forecastDate, 'dd/MM')}**: "${c.cellText}"`).join('\n');
      }
      return NextResponse.json({ answer: responseText });
    }

    // 4. QUERY: Revenue queries e.g. "Doanh thu tháng 5 là bao nhiêu?"
    if (norm.includes('doanh thu') || norm.includes('tiền') || norm.includes('doanh thu phòng') || norm.includes('f&b')) {
      const monthMatch = norm.match(/tháng\s*(\d+)/i) || norm.match(/t\s*(\d+)/i);
      const targetMonth = monthMatch ? parseInt(monthMatch[1], 10) : job?.month || 5;

      const stats = await prisma.dailyStat.findMany({
        where: { importJobId: activeJobId }
      });

      const roomRev = stats.reduce((sum, s) => sum + s.roomRevenue, 0);
      const foodRev = stats.reduce((sum, s) => sum + s.foodRevenue, 0);
      const serviceRev = stats.reduce((sum, s) => sum + s.serviceRevenue, 0);
      const totalRev = roomRev + foodRev + serviceRev;

      responseText = `**Doanh thu dự kiến cho Tháng ${targetMonth}/${job?.year}:**\n\n` +
        `- 🏨 Doanh thu phòng: **${roomRev.toLocaleString('vi-VN')} đ**\n` +
        `- 🍽️ Doanh thu ẩm thực (F&B): **${foodRev.toLocaleString('vi-VN')} đ**\n` +
        `- 💆 Doanh thu dịch vụ khác (Spa, Tour...): **${serviceRev.toLocaleString('vi-VN')} đ**\n` +
        `➡️ **TỔNG DOANH THU: ${totalRev.toLocaleString('vi-VN')} đ**`;
      return NextResponse.json({ answer: responseText });
    }

    // 5. QUERY: Top sale agent e.g. "Sale nào có doanh thu cao nhất?"
    if (norm.includes('sale') || norm.includes('nhân viên') || norm.includes('nv sale')) {
      const bookings = await prisma.booking.findMany({
        where: {
          importJobId: activeJobId,
          status: { not: 'CANCELLED' }
        },
        include: {
          payment: true
        }
      });

      const saleMap = new Map<string, number>();
      bookings.forEach(b => {
        const agent = b.saleName || 'Không rõ';
        const amt = b.payment?.totalAmount || 0;
        saleMap.set(agent, (saleMap.get(agent) || 0) + amt);
      });

      const sortedSales = [...saleMap.entries()].sort((a, b) => b[1] - a[1]);

      if (sortedSales.length === 0) {
        responseText = `Chưa ghi nhận doanh thu cho nhân viên sale nào.`;
      } else {
        responseText = `**Xếp hạng doanh thu theo nhân viên Sale:**\n\n` +
          sortedSales.map((s, idx) => `${idx + 1}. **${s[0]}**: ${s[1].toLocaleString('vi-VN')} đ`).join('\n');
      }
      return NextResponse.json({ answer: responseText });
    }

    // 6. QUERY: Double-booking room conflict e.g. "Có booking nào bị trùng phòng không?"
    if (norm.includes('trùng') || norm.includes('trung phòng') || norm.includes('conflict')) {
      // Find cells booking the same room on the same day
      const cells = await prisma.forecastCell.findMany({
        where: { importJobId: activeJobId }
      });

      const dateRoomMap = new Map<string, string[]>();
      cells.forEach(c => {
        if (!c.cellText) return;
        const key = `${format(c.forecastDate, 'yyyy-MM-dd')}_${c.roomNumber}`;
        const codes = dateRoomMap.get(key) || [];
        // Extract code
        const code = c.cellText.split('-')[0].trim();
        if (!codes.includes(code)) {
          codes.push(code);
        }
        dateRoomMap.set(key, codes);
      });

      const conflicts = [...dateRoomMap.entries()].filter(([_, codes]) => codes.length > 1);

      if (conflicts.length === 0) {
        responseText = `Không phát hiện booking nào bị trùng phòng (hai booking cùng ở một phòng trong một ngày) trong tháng này.`;
      } else {
        responseText = `⚠️ Phát hiện **${conflicts.length}** ngày bị trùng phòng:\n\n` +
          conflicts.map(([key, codes]) => {
            const [date, room] = key.split('_');
            return `- Phòng **${room}** ngày **${date}** đang được gán cho các booking: **${codes.join(', ')}**`;
          }).join('\n');
      }
      return NextResponse.json({ answer: responseText });
    }

    // Default Fallback search
    responseText = `Xin lỗi, tôi không hiểu câu hỏi "${query}". Bạn có thể hỏi các câu hỏi như:\n` +
      `- "Ngày 30/05 có bao nhiêu khách ăn trưa?"\n` +
      `- "Tháng 5 có bao nhiêu khách check-in?"\n` +
      `- "Booking nào thiếu link?"\n` +
      `- "Doanh thu tháng 5 là bao nhiêu?"\n` +
      `- "Sale nào có doanh thu cao nhất?"\n` +
      `- "Có booking nào bị trùng phòng không?"`;

    return NextResponse.json({ answer: responseText });
  } catch (error: any) {
    console.error('Query assistant API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
