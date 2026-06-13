import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db';
import { syncSchoolPayTransactions } from '@/lib/schoolpay-service';

export async function POST(request: Request) {
  try {
    const { schoolId, startDate, endDate } = await request.json();
    if (!schoolId) {
      return NextResponse.json({ success: false, error: 'schoolId required' }, { status: 400 });
    }

    const school = await db.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ success: false, error: 'School not found' }, { status: 404 });
    }
    if (!school.schoolPayCode || !school.schoolPayPassword) {
      return NextResponse.json({ success: false, error: 'SchoolPay credentials not configured. Go to School Profile & Theme settings to add them.' }, { status: 400 });
    }

    // Determine dates to fetch
    const datesToFetch: string[] = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Cap at 31 days to avoid blowing up the API
      const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 31) {
        return NextResponse.json({ success: false, error: 'Maximum date range is 31 days per sync request to avoid rate limits.' }, { status: 400 });
      }
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesToFetch.push(d.toISOString().split('T')[0]);
      }
    } else {
      datesToFetch.push(new Date().toISOString().split('T')[0]);
    }

    let totalImported = 0;
    for (const dateStr of datesToFetch) {
      const result = await syncSchoolPayTransactions(
        school.id,
        school.schoolPayCode,
        school.schoolPayPassword,
        dateStr
      );
      if (result.success && result.importedCount) {
        totalImported += result.importedCount;
      }
    }

    // Also get the full transaction log for this school
    const transactions = await db.schoolPayTransaction.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, result: { importedCount: totalImported }, transactions });
  } catch (error) {
    console.error('Manual SchoolPay sync error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    if (!schoolId) {
      return NextResponse.json({ success: false, error: 'schoolId required' }, { status: 400 });
    }

    const transactions = await db.schoolPayTransaction.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      take: 200
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('SchoolPay GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
