import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { eachDayOfInterval, format, parseISO } from 'date-fns';

export const revalidate = 0; // Force dynamic reloading

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkinStr = searchParams.get('checkin');
    const checkoutStr = searchParams.get('checkout');

    if (!checkinStr || !checkoutStr) {
      return NextResponse.json({ error: 'Thiếu ngày check-in hoặc check-out.' }, { status: 400 });
    }

    const checkinDate = parseISO(checkinStr);
    const checkoutDate = parseISO(checkoutStr);

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
      return NextResponse.json({ error: 'Định dạng ngày không hợp lệ.' }, { status: 400 });
    }

    if (checkinDate >= checkoutDate) {
      return NextResponse.json({ error: 'Ngày check-in phải đứng trước ngày check-out.' }, { status: 400 });
    }

    // Get all days in the booking range (excluding the checkout day itself for occupancy check)
    // For example: checkin 2026-06-05, checkout 2026-06-07 => checks 2026-06-05 and 2026-06-06
    const checkoutPrevDay = new Date(checkoutDate.getTime() - 24 * 60 * 60 * 1000);
    const daysToCheck = eachDayOfInterval({
      start: checkinDate,
      end: checkoutPrevDay
    });

    // Query active forecast cells for these dates
    const cells = await prisma.forecastCell.findMany({
      where: {
        forecastDate: {
          gte: checkinDate,
          lte: checkoutPrevDay
        }
      }
    });

    // Get all unique rooms in the system from the latest successful job
    const latestJob = await prisma.importJob.findFirst({
      where: { status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' },
    });

    if (!latestJob) {
      return NextResponse.json({ error: 'Chưa có dữ liệu forecast nào được import thành công.' }, { status: 400 });
    }

    const allRoomsRaw = await prisma.forecastCell.findMany({
      where: { importJobId: latestJob.id },
      select: {
        roomNumber: true,
        roomType: true,
      },
      distinct: ['roomNumber'],
    });

    // Filter out header or invalid rooms
    const allRooms = allRoomsRaw.filter(r => {
      const num = r.roomNumber.trim().toUpperCase();
      return num !== 'SỐ PHÒNG' && num !== 'ROOM' && num !== '';
    });

    // Zone mapper helper
    const getZone = (roomNumber: string, roomType: string) => {
      const typeLower = roomType.toLowerCase().trim();
      const numLower = roomNumber.toLowerCase().trim();
      
      if (typeLower.startsWith('tr') || typeLower.includes('tropical')) return 'Q';
      if (typeLower.startsWith('gb') || typeLower.includes('greenbay') || typeLower.includes('green bay')) return 'O';
      if (typeLower.includes('secret garden') || typeLower.includes('garden')) return 'R';
      if (
        typeLower.includes('nhà sàn') || 
        typeLower.includes('nha san') || 
        typeLower.includes('nhà  sàn') || 
        ['7', '8', '9', '10', '11', '12'].includes(roomNumber) || 
        numLower.includes('đệm đôi')
      ) {
        return 'K';
      }
      
      // Filter out conference rooms, yards, etc. into OTHER
      if (
        numLower.includes('hội thảo') || 
        numLower.includes('sân') || 
        numLower.includes('sự kiện') || 
        numLower.includes('nhà tròn') || 
        typeLower.includes('hội thảo') ||
        typeLower.includes('sân')
      ) {
        return 'OTHER';
      }
      return 'OTHER';
    };

    // Construct the availability structure
    const roomsAvailability = allRooms.map((room) => {
      const zone = getZone(room.roomNumber, room.roomType);
      
      // Check each day in the interval
      const dailyStatus = daysToCheck.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // Find if there is a booking cell for this room on this date
        const cell = cells.find(c => 
          c.roomNumber === room.roomNumber && 
          format(c.forecastDate, 'yyyy-MM-dd') === dateStr
        );

        const isOccupied = cell && cell.cellText && cell.cellText.trim() !== '' && cell.statusText !== 'CANCELLED';
        
        return {
          date: dateStr,
          occupied: !!isOccupied,
          bookingCode: isOccupied ? (cell.parsedBookingCode || 'N/A') : null,
          bookingName: isOccupied ? cell.cellText : null,
          hyperlink: isOccupied ? cell.hyperlink : null
        };
      });

      const isFullyAvailable = dailyStatus.every(d => !d.occupied);
      const isPartiallyAvailable = dailyStatus.some(d => !d.occupied);

      return {
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        zone,
        dailyStatus,
        isFullyAvailable,
        isPartiallyAvailable
      };
    });

    return NextResponse.json({
      checkin: checkinStr,
      checkout: checkoutStr,
      rooms: roomsAvailability
    });

  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống khi kiểm tra phòng trống.' }, { status: 500 });
  }
}
