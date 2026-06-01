import { NextRequest, NextResponse } from 'next/server';
import { exportReportToExcel } from '../../../../lib/services/exporter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
    }

    const excelBuffer = await exportReportToExcel(jobId);

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Resort_Operational_Report_${jobId}.xlsx"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('Export Excel API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to export report' }, { status: 500 });
  }
}
