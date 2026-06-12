const fs = require('fs');
let content = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

// 1. Add state initialization
content = content.replace(
  'const [profileSchoolPayPassword, setProfileSchoolPayPassword] = useState("");',
  'const [profileSchoolPayPassword, setProfileSchoolPayPassword] = useState("");\n  const [profileCurrentTerm, setProfileCurrentTerm] = useState("1");\n  const [profileCurrentYear, setProfileCurrentYear] = useState(new Date().getFullYear().toString());'
);

// 2. Map school -> profile state
content = content.replace(
  'setProfileSchoolPayPassword(s.schoolPayPassword || "");',
  'setProfileSchoolPayPassword(s.schoolPayPassword || "");\n          setProfileCurrentTerm(s.currentTerm?.toString() || "1");\n          setProfileCurrentYear(s.currentYear?.toString() || new Date().getFullYear().toString());'
);

content = content.replace(
  'setProfileSchoolPayPassword(updated.schoolPayPassword || "");',
  'setProfileSchoolPayPassword(updated.schoolPayPassword || "");\n      setProfileCurrentTerm(updated.currentTerm?.toString() || "1");\n      setProfileCurrentYear(updated.currentYear?.toString() || new Date().getFullYear().toString());'
);

// 3. Update handleSaveProfile payload
content = content.replace(
  'themeColor: profileThemeColor,',
  'themeColor: profileThemeColor,\n        currentTerm: parseInt(profileCurrentTerm) || 1,\n        currentYear: parseInt(profileCurrentYear) || new Date().getFullYear(),'
);

// 4. Add UI to Profile Settings
const profileUISnippet = `
                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "20px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <div style={{ gridColumn: "span 2", marginBottom: "8px" }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a" }}>
                        <Calendar size={16} color="var(--primary)" />
                        Active Academic Term Configuration
                      </h4>
                      <p style={{ color: "#64748b", fontSize: "11px" }}>Set the current global term and year for all operations and automatic imports.</p>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Current Academic Term</label>
                      <select 
                        className="input-field" 
                        value={profileCurrentTerm}
                        onChange={(e) => setProfileCurrentTerm(e.target.value)}
                        style={{ fontSize: "12px", padding: "6px" }}
                      >
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Current Academic Year</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="e.g. 2026"
                        value={profileCurrentYear}
                        onChange={(e) => setProfileCurrentYear(e.target.value)}
                        style={{ fontSize: "12px", padding: "6px" }}
                      />
                    </div>
                  </div>
`;
content = content.replace(
  '<div className="grid grid-cols-2 gap-2" style={{ marginTop: "20px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>\n                    <div style={{ gridColumn: "span 2", marginBottom: "8px" }}>\n                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a" }}>\n                        <DollarSign size={16} color="var(--primary)" />\n                        SchoolPay Integration Settings',
  profileUISnippet + '\n                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "20px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>\n                    <div style={{ gridColumn: "span 2", marginBottom: "8px" }}>\n                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a" }}>\n                        <DollarSign size={16} color="var(--primary)" />\n                        SchoolPay Integration Settings'
);

// 5. Add Bulk Import Logic to the SchoolPay Register
const bulkImportLogic = `
  const handleBulkAutoImport = async () => {
    if (!school) return;
    const term = school.currentTerm || 1;
    const year = school.currentYear || new Date().getFullYear();
    
    if (!confirm(\`Are you sure you want to bulk import all matched transactions into Term \${term}, \${year}?\`)) return;
    
    setSpSyncing(true);
    let successCount = 0;
    
    try {
      const unmatched = schoolPayTransactions.filter(tx => !tx.reconciled);
      
      for (const tx of unmatched) {
        if (!tx.studentPaymentCode) continue;
        const matchedStudent = students.find(s => s.studentPaymentCode === tx.studentPaymentCode);
        
        if (matchedStudent) {
          await recordStudentPayment({
            studentId: matchedStudent.id,
            term: term,
            year: year,
            amountPaid: tx.amount,
            balance: 0,
            paymentMethod: "SCHOOL_PAY",
            receiptNumber: tx.receiptNumber,
            notes: \`Bulk Auto-imported for Term \${term}, \${year}\`,
          });
          successCount++;
        }
      }
      
      if (successCount > 0) {
        setStudentPayments(await getStudentPayments(school.id));
        setSchoolPayTransactions(await getSchoolPayTransactions(school.id));
        alert(\`Successfully bulk imported \${successCount} transaction(s)!\`);
      } else {
        alert("No exact payment code matches found for bulk import. New students must be imported manually.");
      }
    } catch (err) {
      console.error(err);
      alert("Error during bulk import.");
    } finally {
      setSpSyncing(false);
    }
  };
`;
content = content.replace(
  '// Auto-import Student from SchoolPay Transaction',
  bulkImportLogic + '\n  // Auto-import Student from SchoolPay Transaction'
);

// Add Bulk Import Button to UI
content = content.replace(
  '<button className="btn btn-outline" onClick={handleSchoolPaySync} disabled={spSyncing} style={{ padding: "8px 16px" }}>',
  '<button className="btn btn-primary" onClick={handleBulkAutoImport} disabled={spSyncing} style={{ padding: "8px 16px", marginRight: "10px" }}>\n                    <Upload size={16} /> Bulk Import & Match All\n                  </button>\n                  <button className="btn btn-outline" onClick={handleSchoolPaySync} disabled={spSyncing} style={{ padding: "8px 16px" }}>'
);

fs.writeFileSync('src/app/school/[subdomain]/page.tsx', content, 'utf8');
console.log("Successfully patched page.tsx for bulk import");
