const fs = require('fs');
let content = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

// 1. Add state for SchoolPay Register Term Filter
content = content.replace(
  'const [spSyncMsg, setSpSyncMsg] = useState("");',
  'const [spSyncMsg, setSpSyncMsg] = useState("");\n  const [spSelectedTerm, setSpSelectedTerm] = useState<number | "ALL">("ALL");'
);

// 2. Modify handleSchoolPaySync to use spSelectedTerm instead of school.currentTerm
content = content.replace(
  'if (school.currentTerm === 1 && school.term1Start && school.term1End) {',
  'const targetTerm = spSelectedTerm === "ALL" ? school.currentTerm : spSelectedTerm;\n    if (targetTerm === 1 && school.term1Start && school.term1End) {'
);
content = content.replace(
  '} else if (school.currentTerm === 2 && school.term2Start && school.term2End) {',
  '} else if (targetTerm === 2 && school.term2Start && school.term2End) {'
);
content = content.replace(
  '} else if (school.currentTerm === 3 && school.term3Start && school.term3End) {',
  '} else if (targetTerm === 3 && school.term3Start && school.term3End) {'
);

// 3. Add the UI dropdown next to the Fetch button
const syncUI = `
                  <select 
                    className="input-field" 
                    value={spSelectedTerm} 
                    onChange={(e) => setSpSelectedTerm(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value))}
                    style={{ padding: "8px", width: "120px", fontSize: "13px" }}
                  >
                    <option value="ALL">All Terms</option>
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                  <button 
                    onClick={handleSchoolPaySync}
`;
content = content.replace(
  '<button \n                    onClick={handleSchoolPaySync}',
  syncUI
);
// Handle the second instance of handleSchoolPaySync (if any)
content = content.replace(
  '<button \n                  onClick={handleSchoolPaySync}',
  syncUI
);

// 4. Filter the displayed transactions based on the selected term
// First, find where transactions are filtered for display
content = content.replace(
  'const filteredSpTransactions = schoolPayTransactions.filter(tx => {',
  `const filteredSpTransactions = schoolPayTransactions.filter(tx => {
    if (spSelectedTerm !== "ALL") {
      const txDate = new Date(tx.paymentDate);
      let inTerm = false;
      if (spSelectedTerm === 1 && school?.term1Start && school?.term1End) {
        inTerm = txDate >= new Date(school.term1Start) && txDate <= new Date(school.term1End);
      } else if (spSelectedTerm === 2 && school?.term2Start && school?.term2End) {
        inTerm = txDate >= new Date(school.term2Start) && txDate <= new Date(school.term2End);
      } else if (spSelectedTerm === 3 && school?.term3Start && school?.term3End) {
        inTerm = txDate >= new Date(school.term3Start) && txDate <= new Date(school.term3End);
      }
      if (!inTerm && (school?.term1Start || school?.term2Start || school?.term3Start)) return false; // If terms are defined but date falls outside, hide it. If no terms defined, just show all.
    }`
);

// 5. Add Term Filter state for Financial Reports
content = content.replace(
  'const [finReportType, setFinReportType] = useState<"INCOME_EXPENSE" | "COLLECTIONS">("INCOME_EXPENSE");',
  'const [finReportType, setFinReportType] = useState<"INCOME_EXPENSE" | "COLLECTIONS">("INCOME_EXPENSE");\n  const [finSelectedTerm, setFinSelectedTerm] = useState<number | "ALL">("ALL");'
);

// 6. Update the Financial Reports UI to include the Term dropdown
const finReportUI = `
                <select 
                  className="input-field" 
                  value={finSelectedTerm} 
                  onChange={(e) => setFinSelectedTerm(e.target.value === "ALL" ? "ALL" : parseInt(e.target.value))}
                  style={{ width: "150px" }}
                >
                  <option value="ALL">All Terms</option>
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
                <button 
                  className="btn btn-outline"
`;
content = content.replace(
  '<button \n                  className="btn btn-outline"',
  finReportUI
);

fs.writeFileSync('src/app/school/[subdomain]/page.tsx', content, 'utf8');
console.log("Term Filters injected");
