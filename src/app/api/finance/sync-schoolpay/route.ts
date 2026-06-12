import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db';
import { syncSchoolPayTransactions } from '@/lib/schoolpay-service';

export async function POST(request: Request) {
  try {
    const { schoolId } = await request.json();
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

    // Fetch today's transactions
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const result = await syncSchoolPayTransactions(
      school.id,
      school.schoolPayCode,
      school.schoolPayPassword,
      dateStr
    );

    // Also get the full transaction log for this school
    const transactions = await db.schoolPayTransaction.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' },
      take: 100
    });

    return NextResponse.json({ success: true, result, transactions });
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
