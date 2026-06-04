import { NextResponse } from "next/server";
import { getSchoolBySubdomain, getGradeRanges, saveGradeRanges, checkDatabaseConnection } from "../../../lib/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subdomain = searchParams.get("subdomain");

  if (!subdomain) {
    return NextResponse.json({ error: "Missing subdomain parameter" }, { status: 400 });
  }

  try {
    const s = await getSchoolBySubdomain(subdomain);
    if (!s) {
      return NextResponse.json({ school: null });
    }

    if (s.name === "DB_ERROR_INDICATOR") {
      return NextResponse.json({ error: `Database Connection Error: ${s.id}` }, { status: 500 });
    }

    // Load grade ranges
    let ranges = await getGradeRanges(s.id);
    if (ranges.length > 0 && ranges[0].id === "DB_ERROR_INDICATOR") {
      return NextResponse.json({ error: `Database Connection Error: ${ranges[0].achievementLevel}` }, { status: 500 });
    }

    if (ranges.length === 0) {
      const defaultRanges = [
        // SECONDARY (CBC Scale)
        { systemType: "SECONDARY" as const, grade: "A", minMark: 80, maxMark: 100, achievementLevel: "Exceptional", descriptor: "Highly proficient in subject skills" },
        { systemType: "SECONDARY" as const, grade: "B", minMark: 70, maxMark: 79.99, achievementLevel: "Outstanding", descriptor: "Consistently demonstrates subject skills" },
        { systemType: "SECONDARY" as const, grade: "C", minMark: 55, maxMark: 69.99, achievementLevel: "Satisfactory", descriptor: "Demonstrates basic subject skills" },
        { systemType: "SECONDARY" as const, grade: "D", minMark: 40, maxMark: 54.99, achievementLevel: "Basic", descriptor: "Beginning to develop subject skills" },
        { systemType: "SECONDARY" as const, grade: "E", minMark: 0, maxMark: 39.99, achievementLevel: "Elementary", descriptor: "Needs guidance to develop skills" },
        // PRIMARY (PLE Scale)
        { systemType: "PRIMARY" as const, grade: "1", minMark: 90, maxMark: 100, achievementLevel: "Distinction", descriptor: "Outstanding performance" },
        { systemType: "PRIMARY" as const, grade: "2", minMark: 80, maxMark: 89.99, achievementLevel: "Distinction", descriptor: "Very good performance" },
        { systemType: "PRIMARY" as const, grade: "3", minMark: 70, maxMark: 79.99, achievementLevel: "Credit", descriptor: "Good performance" },
        { systemType: "PRIMARY" as const, grade: "4", minMark: 60, maxMark: 69.99, achievementLevel: "Credit", descriptor: "Fairly good performance" },
        { systemType: "PRIMARY" as const, grade: "5", minMark: 55, maxMark: 59.99, achievementLevel: "Credit", descriptor: "Average performance" },
        { systemType: "PRIMARY" as const, grade: "6", minMark: 50, maxMark: 54.99, achievementLevel: "Credit", descriptor: "Satisfactory performance" },
        { systemType: "PRIMARY" as const, grade: "7", minMark: 45, maxMark: 49.99, achievementLevel: "Pass", descriptor: "Pass level performance" },
        { systemType: "PRIMARY" as const, grade: "8", minMark: 40, maxMark: 44.99, achievementLevel: "Pass", descriptor: "Weak pass performance" },
        { systemType: "PRIMARY" as const, grade: "9", minMark: 0, maxMark: 39.99, achievementLevel: "Fail", descriptor: "Failure level performance" }
      ];
      ranges = await saveGradeRanges(s.id, defaultRanges);
    }

    const isConnected = await checkDatabaseConnection();

    return NextResponse.json({
      school: s,
      gradeRanges: ranges,
      dbConnected: isConnected
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
