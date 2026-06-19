const fs = require('fs');
// 1. Fix page.tsx
let page = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

page = page.replace(
  '  const handleSchoolPaySync = async () => {\n    if (!school) return;\n    setSpSyncing(true);\n    setSpSyncMsg("");\n    try {\n      const res = await fetch("/api/finance/sync-schoolpay", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ schoolId: school.id }),\n      });',
  `  const handleSchoolPaySync = async () => {
    if (!school) return;
    setSpSyncing(true);
    setSpSyncMsg("");
    try {
      let startDate = undefined;
      let endDate = undefined;
      const targetTerm = spSelectedTerm === "ALL" ? school.currentTerm : spSelectedTerm;
      if (targetTerm === 1 && school.term1Start && school.term1End) {
        startDate = new Date(school.term1Start).toISOString();
        endDate = new Date(school.term1End).toISOString();
      } else if (targetTerm === 2 && school.term2Start && school.term2End) {
        startDate = new Date(school.term2Start).toISOString();
        endDate = new Date(school.term2End).toISOString();
      } else if (targetTerm === 3 && school.term3Start && school.term3End) {
        startDate = new Date(school.term3Start).toISOString();
        endDate = new Date(school.term3End).toISOString();
      }

      const res = await fetch("/api/finance/sync-schoolpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.id, startDate, endDate }),
      });`
);
fs.writeFileSync('src/app/school/[subdomain]/page.tsx', page, 'utf8');

// 2. Fix route.ts (increase 31 day limit to 120 days)
let route = fs.readFileSync('src/app/api/finance/sync-schoolpay/route.ts', 'utf8');
route = route.replace(
  'if (diffDays > 31) {\n        return NextResponse.json({ success: false, error: \'Maximum date range is 31 days per sync request to avoid rate limits.\' }, { status: 400 });\n      }',
  'if (diffDays > 120) {\n        return NextResponse.json({ success: false, error: \'Maximum date range is 120 days per sync request to avoid rate limits.\' }, { status: 400 });\n      }'
);
fs.writeFileSync('src/app/api/finance/sync-schoolpay/route.ts', route, 'utf8');

console.log("SchoolPay Sync API fixed!");
