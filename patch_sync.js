const fs = require('fs');
let content = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

// The existing handleSchoolPaySync is:
/*
  const handleSchoolPaySync = async () => {
    if (!school) return;
    setSpSyncing(true);
    setSpSyncMsg("");
    try {
      const res = await fetch("/api/finance/sync-schoolpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.id }),
      });
*/

const newSyncLogic = `
  const handleSchoolPaySync = async () => {
    if (!school) return;
    
    // Determine current active term dates
    let startDate = null;
    let endDate = null;
    if (school.currentTerm === 1 && school.term1Start && school.term1End) {
      startDate = school.term1Start;
      endDate = school.term1End;
    } else if (school.currentTerm === 2 && school.term2Start && school.term2End) {
      startDate = school.term2Start;
      endDate = school.term2End;
    } else if (school.currentTerm === 3 && school.term3Start && school.term3End) {
      startDate = school.term3Start;
      endDate = school.term3End;
    }
    
    // Fallback to today if no term range is globally configured
    if (!startDate || !endDate) {
       const today = new Date().toISOString().split('T')[0];
       startDate = today;
       endDate = today;
    }

    if (!confirm(\`Fetch SchoolPay transactions between \${new Date(startDate).toLocaleDateString()} and \${new Date(endDate).toLocaleDateString()}?\\n\\n(Based on your Global Active Term Dates)\`)) return;

    setSpSyncing(true);
    setSpSyncMsg("Fetching transactions, please wait...");
    try {
      const res = await fetch("/api/finance/sync-schoolpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          schoolId: school.id,
          startDate,
          endDate
        }),
      });
`;

content = content.replace(
  '  const handleSchoolPaySync = async () => {\n    if (!school) return;\n    setSpSyncing(true);\n    setSpSyncMsg("");\n    try {\n      const res = await fetch("/api/finance/sync-schoolpay", {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ schoolId: school.id }),\n      });',
  newSyncLogic
);

// We need to change the button text from "Fetch Today's Transactions" to "Fetch Term Transactions"
content = content.replace(
  '{spSyncing ? "Fetching..." : "Fetch Today\'s Transactions"}',
  '{spSyncing ? "Fetching..." : "Fetch Term Transactions"}'
);

content = content.replace(
  '{spSyncing ? "Syncing..." : "Fetch SchoolPay Transactions"}',
  '{spSyncing ? "Syncing..." : "Fetch Term Transactions"}'
);

fs.writeFileSync('src/app/school/[subdomain]/page.tsx', content, 'utf8');
console.log("Updated handleSchoolPaySync in page.tsx");
