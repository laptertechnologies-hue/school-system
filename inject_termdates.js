const fs = require('fs');
let content = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

// 1. Add state for term dates
content = content.replace(
  'const [profileCurrentYear, setProfileCurrentYear] = useState(new Date().getFullYear().toString());',
  'const [profileCurrentYear, setProfileCurrentYear] = useState(new Date().getFullYear().toString());\n  const [profileTerm1Start, setProfileTerm1Start] = useState("");\n  const [profileTerm1End, setProfileTerm1End] = useState("");\n  const [profileTerm2Start, setProfileTerm2Start] = useState("");\n  const [profileTerm2End, setProfileTerm2End] = useState("");\n  const [profileTerm3Start, setProfileTerm3Start] = useState("");\n  const [profileTerm3End, setProfileTerm3End] = useState("");'
);

// 2. Map school to state
const stateMapping = `
      setProfileTerm1Start(s.term1Start ? new Date(s.term1Start).toISOString().split('T')[0] : "");
      setProfileTerm1End(s.term1End ? new Date(s.term1End).toISOString().split('T')[0] : "");
      setProfileTerm2Start(s.term2Start ? new Date(s.term2Start).toISOString().split('T')[0] : "");
      setProfileTerm2End(s.term2End ? new Date(s.term2End).toISOString().split('T')[0] : "");
      setProfileTerm3Start(s.term3Start ? new Date(s.term3Start).toISOString().split('T')[0] : "");
      setProfileTerm3End(s.term3End ? new Date(s.term3End).toISOString().split('T')[0] : "");
`;
content = content.replace(
  'setProfileCurrentYear(s.currentYear?.toString() || new Date().getFullYear().toString());',
  'setProfileCurrentYear(s.currentYear?.toString() || new Date().getFullYear().toString());' + stateMapping
);

content = content.replace(
  'setProfileCurrentYear(updated.currentYear?.toString() || new Date().getFullYear().toString());',
  'setProfileCurrentYear(updated.currentYear?.toString() || new Date().getFullYear().toString());' + stateMapping.replace(/s\./g, 'updated.')
);

// 3. Update handleSaveProfile payload
const payloadUpdate = `
        term1Start: profileTerm1Start ? new Date(profileTerm1Start) : null,
        term1End: profileTerm1End ? new Date(profileTerm1End) : null,
        term2Start: profileTerm2Start ? new Date(profileTerm2Start) : null,
        term2End: profileTerm2End ? new Date(profileTerm2End) : null,
        term3Start: profileTerm3Start ? new Date(profileTerm3Start) : null,
        term3End: profileTerm3End ? new Date(profileTerm3End) : null,
`;
content = content.replace(
  'currentYear: parseInt(profileCurrentYear) || new Date().getFullYear(),',
  'currentYear: parseInt(profileCurrentYear) || new Date().getFullYear(),\n' + payloadUpdate
);

// 4. Add UI for Term Dates
const termUI = `
                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "12px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <div style={{ gridColumn: "span 2", marginBottom: "8px" }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a" }}>
                        <Calendar size={16} color="var(--primary)" />
                        Global Term Date Ranges
                      </h4>
                      <p style={{ color: "#64748b", fontSize: "11px" }}>Set exact dates for each term. This powers automatic transaction fetching and invoice generation.</p>
                    </div>
                    
                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "8px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 1</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Start Date</label>
                      <input type="date" className="input-field" value={profileTerm1Start} onChange={(e) => setProfileTerm1Start(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>End Date</label>
                      <input type="date" className="input-field" value={profileTerm1End} onChange={(e) => setProfileTerm1End(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>

                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "8px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 2</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Start Date</label>
                      <input type="date" className="input-field" value={profileTerm2Start} onChange={(e) => setProfileTerm2Start(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>End Date</label>
                      <input type="date" className="input-field" value={profileTerm2End} onChange={(e) => setProfileTerm2End(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>

                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "8px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 3</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Start Date</label>
                      <input type="date" className="input-field" value={profileTerm3Start} onChange={(e) => setProfileTerm3Start(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>End Date</label>
                      <input type="date" className="input-field" value={profileTerm3End} onChange={(e) => setProfileTerm3End(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                  </div>
`;
content = content.replace(
  '                  </div>\n                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "20px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>',
  '                  </div>\n' + termUI + '\n                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "20px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>'
);

fs.writeFileSync('src/app/school/[subdomain]/page.tsx', content, 'utf8');
console.log("Term Dates injected into page.tsx");
