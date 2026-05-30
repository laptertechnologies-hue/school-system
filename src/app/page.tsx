"use client";
import React, { useState, useEffect } from "react";
import { dataService, School } from "../lib/services";
import { 
  BookOpen, 
  CheckCircle, 
  Sparkles, 
  DollarSign, 
  Layers, 
  Users, 
  Award, 
  ArrowRight, 
  TrendingUp, 
  Lock
} from "lucide-react";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<"features" | "pricing" | "register">("features");
  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [packageType, setPackageType] = useState<"BASIC" | "PREMIUM">("PREMIUM");
  const [studentRange, setStudentRange] = useState("200-500");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registeredSchool, setRegisteredSchool] = useState<School | null>(null);
  const [tempCredentials, setTempCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [demoHost, setDemoHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDemoHost(window.location.origin);
    }
  }, []);

  const handleSubdomainChange = (val: string) => {
    // lowercase alphanumeric only, no spaces
    setSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, ""));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!schoolName || !subdomain || !email || !phone) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      // Check if subdomain exists
      const existing = await dataService.getSchoolBySubdomain(subdomain);
      if (existing) {
        setError(`Subdomain "${subdomain}" is already taken.`);
        return;
      }

      // Create school
      const school = await dataService.createSchool({
        name: schoolName,
        subdomain,
        packageType,
        studentRange,
        contactEmail: email,
        contactPhone: phone,
      });

      // Automatically create an admin user for this school
      const adminEmail = `admin@${subdomain}.ug`;
      const adminPass = "password";
      await dataService.createUser({
        schoolId: school.id,
        name: "School Administrator",
        email: adminEmail,
        passwordHash: adminPass,
        role: "ADMIN",
      });

      // Activate school immediately in mock mode for instant trial access
      await dataService.updateSchoolStatus(school.id, "ACTIVE");

      setRegisteredSchool(school);
      setTempCredentials({ email: adminEmail, password: adminPass });
      
      // Clear form
      setSchoolName("");
      setSubdomain("");
      setEmail("");
      setPhone("");
    } catch (err: any) {
      setError(err.message || "Failed to register school.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0b0f19 0%, #111827 100%)", color: "#f3f4f6" }}>
      {/* Premium Gradient Top Border */}
      <div style={{ height: "6px", background: "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)" }}></div>

      {/* Navigation Header */}
      <header style={{ padding: "20px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
        <div className="container flex justify-between align-center flex-mobile-col gap-2">
          <div className="flex align-center gap-2">
            <div style={{ background: "var(--primary)", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={24} color="white" />
            </div>
            <div>
              <h2 style={{ fontFamily: "Outfit", color: "white", fontSize: "22px", fontWeight: 800 }}>School<span style={{ color: "var(--primary)" }}>Pro</span></h2>
              <span style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--secondary)" }}>Uganda Edition</span>
            </div>
          </div>
          <nav className="flex gap-2">
            <button onClick={() => { setActiveTab("features"); setRegisteredSchool(null); }} className={`btn ${activeTab === "features" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Features</button>
            <button onClick={() => { setActiveTab("pricing"); setRegisteredSchool(null); }} className={`btn ${activeTab === "pricing" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Pricing</button>
            <button onClick={() => { setActiveTab("register"); setRegisteredSchool(null); }} className={`btn ${activeTab === "register" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Register School</button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "60px 0" }}>
        <div className="container">
          
          {activeTab === "features" && (
            <div className="animate-fade-in">
              {/* Hero Banner */}
              <div style={{ textAlign: "center", marginBottom: "60px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "9999px", padding: "6px 16px", marginBottom: "20px" }}>
                  <Sparkles size={16} color="var(--primary)" />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#93c5fd" }}>Empowering Schools Nationwide</span>
                </div>
                <h1 style={{ fontSize: "48px", color: "white", marginBottom: "20px", lineHeight: 1.1, maxWidth: "800px", margin: "0 auto 20px" }}>
                  The Future of Ugandan School Management & Grading
                </h1>
                <p style={{ fontSize: "18px", color: "#9ca3af", maxWidth: "600px", margin: "0 auto 30px" }}>
                  A secure, multi-tenant SaaS built specifically for Ugandan schools. Seamlessly generate report cards, track student fees, and monitor operations.
                </p>
                <div className="flex justify-center gap-2">
                  <button onClick={() => setActiveTab("register")} className="btn btn-primary" style={{ padding: "12px 28px" }}>
                    Get Started Free <ArrowRight size={16} />
                  </button>
                  <a href="?admin=true" className="btn btn-secondary" style={{ padding: "12px 28px", color: "white", borderColor: "rgba(255,255,255,0.15)" }}>
                    <Lock size={16} style={{ marginRight: "4px" }} /> Super Admin Demo
                  </a>
                </div>
              </div>

              {/* Core Features Grid */}
              <div className="grid grid-cols-3 gap-3" style={{ marginBottom: "60px" }}>
                
                <div className="card" style={{ background: "#1f2937", borderColor: "#374151" }}>
                  <div style={{ background: "rgba(59, 130, 246, 0.15)", padding: "12px", borderRadius: "10px", display: "inline-block", marginBottom: "16px" }}>
                    <Award size={24} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "white", marginBottom: "12px" }}>PLE Aggregate System</h3>
                  <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                    Designed for primary schools. Input raw grades, automatically compute aggregates across 4 core subjects, and determine Divisions (I to IV).
                  </p>
                </div>

                <div className="card" style={{ background: "#1f2937", borderColor: "#374151" }}>
                  <div style={{ background: "rgba(168, 85, 247, 0.15)", padding: "12px", borderRadius: "10px", display: "inline-block", marginBottom: "16px" }}>
                    <BookOpen size={24} color="var(--secondary)" />
                  </div>
                  <h3 style={{ color: "white", marginBottom: "12px" }}>New Secondary CBC</h3>
                  <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                    Fully compatible with the New Lower Secondary Curriculum. Tracks school-based Continuous Assessments (20%) and UNEB criteria with competency descriptions.
                  </p>
                </div>

                <div className="card" style={{ background: "#10b981, 0.15", border: "1px solid #374151" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.15)", padding: "12px", borderRadius: "10px", display: "inline-block", marginBottom: "16px" }}>
                    <DollarSign size={24} color="var(--success)" />
                  </div>
                  <h3 style={{ color: "white", marginBottom: "12px" }}>Financial Auditing</h3>
                  <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                    Set class fee structures, record payments, track balances, and generate instant accounts of school expenditures & teacher salaries.
                  </p>
                </div>

              </div>

              {/* Instant Interactive Demos Section */}
              <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "16px", padding: "40px", textAlign: "center" }}>
                <h2 style={{ color: "white", marginBottom: "16px" }}>Experience the Live Interactive Demo</h2>
                <p style={{ color: "#9ca3af", maxWidth: "600px", margin: "0 auto 30px", fontSize: "14px" }}>
                  We have pre-configured trial accounts. Click any of the entry points below to test roles ranging from Director, DOS, Teacher, to Super Admin!
                </p>

                <div className="flex justify-center flex-wrap gap-2">
                  <a href="?school=greenhill" className="card" style={{ background: "#111827", padding: "16px 24px", minWidth: "220px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <span className="badge badge-success">Premium Active</span>
                    <strong style={{ color: "white" }}>Greenhill Academy</strong>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Login as: Admin, Teacher, DOS, Director</span>
                  </a>
                  <a href="?school=kpps" className="card" style={{ background: "#111827", padding: "16px 24px", minWidth: "220px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <span className="badge badge-primary">Basic Active</span>
                    <strong style={{ color: "white" }}>Kampala Parents Primary</strong>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>Login as: Admin, Teacher, DOS</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <h2 style={{ color: "white", fontSize: "32px", marginBottom: "10px" }}>Choose the Best Package for Your School</h2>
                <p style={{ color: "#9ca3af" }}>Affordable prices built for schools in East Africa.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Basic Package */}
                <div className="card" style={{ background: "#1f2937", borderColor: "#374151", position: "relative" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ color: "white" }}>Basic Plan</h3>
                    <p style={{ color: "#9ca3af", fontSize: "13px" }}>For schools that only need grading & results</p>
                  </div>
                  <div style={{ margin: "20px 0" }}>
                    <h2 style={{ fontSize: "36px", color: "white" }}>150,000 UGX <span style={{ fontSize: "14px", color: "#9ca3af" }}>/ Term</span></h2>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", margin: "20px 0", color: "#d1d5db", fontSize: "14px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Complete PLE Grading</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Lower Secondary CBC Tracking</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Automated Report Card PDFs</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Max 5 Admin / Teacher accounts</li>
                    <li style={{ color: "#6b7280", textDecoration: "line-through", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="#4b5563" /> School Financial Management</li>
                    <li style={{ color: "#6b7280", textDecoration: "line-through", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="#4b5563" /> Parent Billing & Ledger</li>
                  </ul>
                  <button onClick={() => { setPackageType("BASIC"); setActiveTab("register"); }} className="btn btn-outline" style={{ width: "100%", marginTop: "20px", color: "white" }}>Choose Basic Plan</button>
                </div>

                {/* Premium Package */}
                <div className="card" style={{ background: "#1f2937", border: "2px solid var(--primary)", position: "relative" }}>
                  <div style={{ position: "absolute", top: "-14px", right: "20px", background: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>POPULAR</div>
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ color: "white" }}>Premium Plan</h3>
                    <p style={{ color: "#9ca3af", fontSize: "13px" }}>For full school administrative operations</p>
                  </div>
                  <div style={{ margin: "20px 0" }}>
                    <h2 style={{ fontSize: "36px", color: "white" }}>350,000 UGX <span style={{ fontSize: "14px", color: "#9ca3af" }}>/ Term</span></h2>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", margin: "20px 0", color: "#d1d5db", fontSize: "14px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--success)" /> All features in Basic Plan</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--success)" /> Student Fee structures & recording</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--success)" /> Automated Defaulters tracking</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--success)" /> Salaries & Expenditure Ledger</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--success)" /> Unlimited Teacher/Staff accounts</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--success)" /> MTN / Airtel MM billing simulation</li>
                  </ul>
                  <button onClick={() => { setPackageType("PREMIUM"); setActiveTab("register"); }} className="btn btn-primary" style={{ width: "100%", marginTop: "20px" }}>Choose Premium Plan</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "register" && (
            <div className="animate-fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
              {!registeredSchool ? (
                <div className="card" style={{ background: "#1f2937", borderColor: "#374151" }}>
                  <h2 style={{ color: "white", marginBottom: "10px" }}>Register Your School</h2>
                  <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "24px" }}>
                    Create an account to instantly activate a customized trial subdomain for your institution.
                  </p>

                  {error && (
                    <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "14px", marginBottom: "20px" }}>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleRegister}>
                    <div className="form-group">
                      <label className="form-label">School Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Greenhill Academy" 
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Requested Subdomain</label>
                      <div className="flex align-center" style={{ gap: "4px" }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. greenhill" 
                          value={subdomain}
                          onChange={(e) => handleSubdomainChange(e.target.value)}
                          required
                          style={{ flex: 1 }}
                        />
                        <span style={{ background: "#374151", padding: "12px 14px", borderRadius: "8px", fontSize: "14px", color: "#9ca3af", border: "1px solid #4b5563" }}>
                          .schoolpro.ug
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#9ca3af" }}>Lowercase letters & numbers only, no spaces.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Package Plan</label>
                      <select 
                        className="input-field" 
                        value={packageType} 
                        onChange={(e) => setPackageType(e.target.value as "BASIC" | "PREMIUM")}
                      >
                        <option value="BASIC">Basic Plan (150,000 UGX / Term)</option>
                        <option value="PREMIUM">Premium Plan (350,000 UGX / Term)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "20px" }}>
                      <div className="form-group">
                        <label className="form-label">Estimated Students</label>
                        <select 
                          className="input-field" 
                          value={studentRange}
                          onChange={(e) => setStudentRange(e.target.value)}
                        >
                          <option value="Under 200">Under 200</option>
                          <option value="200-500">200-500</option>
                          <option value="500-1000">500-1000</option>
                          <option value="1000+">1000+</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Contact Phone</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. +256 700 123456" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Primary Administrator Email</label>
                      <input 
                        type="email" 
                        className="input-field" 
                        placeholder="e.g. head@yourschool.ug" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", marginTop: "10px" }}>
                      Register & Create Trial Subdomain
                    </button>
                  </form>
                </div>
              ) : (
                <div className="card" style={{ background: "#1f2937", borderColor: "#10b981", textAlign: "center" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.15)", padding: "16px", borderRadius: "50%", display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "20px" }}>
                    <CheckCircle size={40} color="var(--success)" />
                  </div>
                  <h2 style={{ color: "white", marginBottom: "10px" }}>School Registered Successfully!</h2>
                  <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "24px" }}>
                    Your customized subdomain has been generated and activated for a 1-year trial.
                  </p>

                  <div style={{ background: "#111827", borderRadius: "8px", padding: "20px", margin: "20px 0", textAlign: "left", border: "1px solid #374151" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <strong style={{ display: "block", fontSize: "12px", color: "#9ca3af", textTransform: "uppercase" }}>School Subdomain</strong>
                      <span style={{ fontSize: "16px", color: "var(--primary)", fontWeight: 700 }}>
                        {registeredSchool.subdomain}.schoolpro.ug
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: "12px" }}>
                      <strong style={{ display: "block", fontSize: "12px", color: "#9ca3af", textTransform: "uppercase" }}>Administrator Username</strong>
                      <span style={{ fontSize: "14px", color: "white", fontFamily: "monospace" }}>{tempCredentials.email}</span>
                    </div>

                    <div>
                      <strong style={{ display: "block", fontSize: "12px", color: "#9ca3af", textTransform: "uppercase" }}>Trial Password</strong>
                      <span style={{ fontSize: "14px", color: "white", fontFamily: "monospace" }}>{tempCredentials.password}</span>
                    </div>
                  </div>

                  <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px" }}>
                    Click the button below to instantly login to your new dashboard.
                  </p>

                  <a 
                    href={`${demoHost}?school=${registeredSchool.subdomain}`} 
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "12px" }}
                  >
                    Go to Portal Login <ArrowRight size={16} />
                  </a>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <footer style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", padding: "40px 0", textAlign: "center", color: "#6b7280", fontSize: "14px" }}>
        <div className="container">
          <p>© 2026 SchoolPro Uganda. All rights reserved.</p>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Providing modern grading software for UNEB PLE and the new CBC curriculum.</p>
        </div>
      </footer>
    </div>
  );
}
