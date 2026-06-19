const fs = require('fs');
let content = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

const termSelectorUI = `
                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "13px", color: "var(--primary)", marginTop: "8px", paddingBottom: "4px", borderBottom: "2px solid #e2e8f0" }}>Currently Active Period</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Current Term (Active)</label>
                      <select className="input-field" value={profileCurrentTerm} onChange={(e) => setProfileCurrentTerm(e.target.value)} style={{ fontSize: "13px", padding: "8px", fontWeight: "bold" }}>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Current Year (Active)</label>
                      <input type="number" className="input-field" value={profileCurrentYear} onChange={(e) => setProfileCurrentYear(e.target.value)} style={{ fontSize: "13px", padding: "8px", fontWeight: "bold" }} />
                    </div>

                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "16px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 1 Dates</div>`;

content = content.replace(
  '<div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "8px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 1</div>',
  termSelectorUI
);

fs.writeFileSync('src/app/school/[subdomain]/page.tsx', content, 'utf8');
console.log("Current Term selectors added to UI");
