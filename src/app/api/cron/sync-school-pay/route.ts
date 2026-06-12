import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db';
import { syncSchoolPayTransactions } from '@/lib/schoolpay-service';

// To prevent unauthorized access, you can check an authorization header
// For Vercel Cron, you can check request.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`
// Here we'll do a basic check if CRON_SECRET is set
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Find all PREMIUM schools that have SchoolPay configured
    const schools = await db.school.findMany({
      where: {
        packageType: 'PREMIUM',
        schoolPayCode: { not: null },
        schoolPayPassword: { not: null },
        status: 'ACTIVE' // or omit if we sync pending too
      }
    });

    const results = [];
    const today = new Date();
    // Format yyyy-MM-dd
    const dateStr = today.toISOString().split('T')[0];

    for (const school of schools) {
      if (school.schoolPayCode && school.schoolPayPassword) {
        const result = await syncSchoolPayTransactions(
          school.id,
          school.schoolPayCode,
          school.schoolPayPassword,
          dateStr
        );
        results.push({ schoolId: school.id, name: school.name, result });
      }
    }

    return NextResponse.json({ success: true, executedAt: new Date(), results });
  } catch (error) {
    console.error('Error running sync-school-pay cron:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
