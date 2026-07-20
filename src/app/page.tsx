"use client";
import React, { useState, useEffect } from "react";
import { 
  getSchoolBySubdomain, 
  createSchool, 
  createUser, 
  updateSchoolStatus, 
  checkDatabaseConnection, 
  getSchools
} from "../lib/services";
import type { School } from "../lib/types";
import { 
  BookOpen, 
  CheckCircle, 
  Sparkles, 
  DollarSign, 
  Layers, 
  Users, 
  Award, 
  ArrowRight, 
  MessageSquare,
  RotateCcw
} from "lucide-react";

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<"features" | "pricing" | "register" | "login">("features");
  const [loginSubdomain, setLoginSubdomain] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [lastSubdomain, setLastSubdomain] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [packageType, setPackageType] = useState<"BASIC" | "PREMIUM">("PREMIUM");
  const [schoolType, setSchoolType] = useState<"PRIMARY" | "SECONDARY" | "COMBINED">("COMBINED");
  const [studentRange, setStudentRange] = useState("200-500");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registeredSchool, setRegisteredSchool] = useState<School | null>(null);
  const [tempCredentials, setTempCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [demoHost, setDemoHost] = useState("");
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [partnerSchools, setPartnerSchools] = useState<School[]>([]);

  // Dynamic Base Domain Detection
  const [baseDomain, setBaseDomain] = useState("portal.laptertech.store");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname.endsWith("schoolpro.study")) {
        setBaseDomain("schoolpro.study");
      } else if (hostname.endsWith("schoolpro.laptertech.store")) {
        setBaseDomain("schoolpro.laptertech.store");
      } else if (hostname.endsWith("portal.laptertech.store")) {
        setBaseDomain("portal.laptertech.store");
      } else {
        const parts = hostname.split(".");
        if (parts.length >= 2) {
          const suffix = parts.slice(-2).join(".");
          if (!hostname.endsWith("vercel.app")) {
            setBaseDomain(suffix);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDemoHost(window.location.origin);
      const saved = localStorage.getItem("lastSubdomain");
      if (saved) {
        setLastSubdomain(saved);
        setLoginSubdomain(saved);
      }
    }
    // Check database connection
    async function checkDb() {
      const isConnected = await checkDatabaseConnection();
      setDbConnected(isConnected);
    }
    // Fetch partner schools
    async function fetchSchools() {
      try {
        const schools = await getSchools();
        const activePartners = schools.filter(s => s.status === "ACTIVE" && s.subdomain !== "super-admin-system");
        setPartnerSchools(activePartners);
      } catch (err) {
        console.error("Failed to fetch partner schools:", err);
      }
    }
    checkDb();
    fetchSchools();
  }, []);

  const handleSubdomainChange = (val: string) => {
    // lowercase alphanumeric only, no spaces
    setSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, ""));
  };

  const handlePortalRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginSubdomain) {
      setLoginError("Please enter your school subdomain.");
      return;
    }

    const sub = loginSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Check if it's the super admin subdomain
    if (sub === "admin" || sub === "super-admin" || sub === "super" || sub === "superadmin") {
      window.location.href = "/super-admin";
      return;
    }

    try {
      const school = await getSchoolBySubdomain(sub);
      if (school && school.name === "DB_ERROR_INDICATOR") {
        setLoginError(`Database Connection Error: ${school.id}`);
        return;
      }
      if (!school) {
        setLoginError(`School subdomain "${sub}" does not exist in our systems.`);
        return;
      }

      // Save to localStorage so they don't have to enter it again next time
      if (typeof window !== "undefined") {
        localStorage.setItem("lastSubdomain", sub);
      }

      // Build target URL
      const host = window.location.origin;
      let targetUrl = "";
      if (host.includes("localhost") || host.includes("127.0.0.1")) {
        const parts = host.split("//");
        targetUrl = `${parts[0]}//${sub}.${parts[1]}`;
      } else {
        targetUrl = `https://${sub}.${baseDomain}`;
      }

      if (loginEmail) {
        targetUrl += `?email=${encodeURIComponent(loginEmail)}`;
      }

      window.location.href = targetUrl;
    } catch (err: any) {
      console.error("Verification error:", err);
      const msg = err?.message || "";
      if (msg.includes("Server Components") || msg.includes("production builds")) {
        setLoginError("Unable to verify school subdomain. The database server may be starting up — please try again in a moment.");
      } else {
        setLoginError(`Failed to verify school subdomain: ${msg || "Server connection failed."}`);
      }
    }
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
      const existing = await getSchoolBySubdomain(subdomain);
      if (existing && existing.name === "DB_ERROR_INDICATOR") {
        setError(`Database Connection Error: ${existing.id}`);
        return;
      }
      if (existing) {
        setError(`Subdomain "${subdomain}" is already taken.`);
        return;
      }

      // Create school
      const school = await createSchool({
        name: schoolName,
        subdomain,
        packageType,
        schoolType,
        studentRange,
        contactEmail: email,
        contactPhone: phone,
        currentTerm: 1,
        currentYear: new Date().getFullYear(),
      });

      // Automatically create an admin user for this school
      const adminEmail = `admin@${subdomain}.ug`;
      const adminPass = "password";
      await createUser({
        schoolId: school.id,
        name: "School Administrator",
        email: adminEmail,
        passwordHash: adminPass,
        role: "ADMIN",
      });

      // Activate school immediately in mock mode for instant trial access
      await updateSchoolStatus(school.id, "ACTIVE");

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
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", color: "#1e293b", fontFamily: "var(--font-sans)" }} className="animate-fade-in">
      {/* Top Accent Strip */}
      <div style={{ height: "6px", background: "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)" }}></div>

      {/* Navigation Header */}
      <header style={{ padding: "20px 0", borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
        <div className="container flex justify-between align-center flex-mobile-col gap-2">
          <div className="flex align-center gap-2" style={{ cursor: "pointer" }} onClick={() => { setActiveTab("features"); setRegisteredSchool(null); }}>
            <img 
              src="/logo-full.png" 
              alt="SchoolPro Uganda" 
              style={{ height: "72px", width: "auto", objectFit: "contain" }} 
            />
          </div>
          <div className="flex align-center gap-2 flex-mobile-col">
            <nav className="flex gap-2 flex-wrap justify-center">
              <button onClick={() => { setActiveTab("features"); setRegisteredSchool(null); }} className={`btn ${activeTab === "features" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Features</button>
              <button onClick={() => { setActiveTab("pricing"); setRegisteredSchool(null); }} className={`btn ${activeTab === "pricing" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Pricing</button>
              <button onClick={() => { setActiveTab("register"); setRegisteredSchool(null); }} className={`btn ${activeTab === "register" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Register School</button>
              <button onClick={() => { setActiveTab("login"); setRegisteredSchool(null); }} className={`btn ${activeTab === "login" ? "btn-primary" : "btn-outline"}`} style={{ padding: "8px 16px" }}>Login</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ padding: "60px 0" }}>
        <div className="container">
          
          {activeTab === "features" && (
            <div className="animate-slide-up">
              {/* Hero Banner */}
              <div style={{ textAlign: "center", marginBottom: "60px" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--primary-light)", border: "1px solid var(--primary-glow)", borderRadius: "9999px", padding: "8px 18px", marginBottom: "20px" }} className="animate-breathe">
                  <Sparkles size={16} color="var(--primary)" />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>Empowering Ugandan Schools Nationwide</span>
                </div>
                <h1 style={{ fontSize: "48px", color: "#0f172a", marginBottom: "20px", lineHeight: 1.15, maxWidth: "850px", margin: "0 auto 20px", fontWeight: 800 }}>
                  The Future of Ugandan School Management & Grading
                </h1>
                <p style={{ fontSize: "18px", color: "#475569", maxWidth: "650px", margin: "0 auto 30px", lineHeight: 1.6 }}>
                  Purpose-built for Ugandan primary and secondary schools. Generate PLE &amp; CBC report cards, manage school finances, and track tuition payments — all in one place.
                </p>
                <div className="flex justify-center gap-2 flex-mobile-col align-center flex-wrap" style={{ marginTop: "24px" }}>
                  <button onClick={() => setActiveTab("register")} className="btn btn-primary hover-scale" style={{ padding: "14px 32px", fontSize: "15px", width: "100%", maxWidth: "250px", justifyContent: "center" }}>
                    Register School Free <ArrowRight size={18} />
                  </button>
                  <button onClick={() => setActiveTab("login")} className="btn btn-outline hover-scale" style={{ padding: "14px 32px", color: "#1e293b", borderColor: "#cbd5e1", background: "#f8fafc", fontSize: "15px", width: "100%", maxWidth: "250px", justifyContent: "center" }}>
                    Login to Portal <ArrowRight size={16} style={{ marginLeft: "6px" }} />
                  </button>
                </div>

                {/* Hero Showcase Image */}
                <div style={{ marginTop: "40px", maxWidth: "900px", margin: "40px auto 0", border: "1px solid #e2e8f0", borderRadius: "16px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }} className="hover-scale">
                  <img src="/images/school_dashboard_preview.png" alt="SchoolPro Dashboard Preview" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              </div>

              {/* Core Features Grid */}
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginBottom: "60px" }}>
                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
                  <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px", display: "inline-block", marginBottom: "16px" }}>
                    <Award size={26} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "18px" }}>PLE Aggregate System</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Tailored for primary levels. Instantly compute subject grading (1-8) across the 4 core subjects and determine Division levels (I to IV).
                  </p>
                </div>
 
                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
                  <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px", display: "inline-block", marginBottom: "16px" }}>
                    <BookOpen size={26} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "18px" }}>New Secondary CBC</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Fully aligned with the Lower Secondary Curriculum. Tracks continuous project-based evaluations (20%) and maps to letter grades A-E.
                  </p>
                </div>
 
                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
                  <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px", display: "inline-block", marginBottom: "16px" }}>
                    <DollarSign size={26} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "18px" }}>Financial Auditing</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Manage tuition parameters, log student fee payments, track defaulters, and record school expenses alongside teacher payroll databases.
                  </p>
                </div>

                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
                  <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px", display: "inline-block", marginBottom: "16px" }}>
                    <Users size={26} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "18px" }}>Unlimited Teacher Accounts</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Create accounts for all teachers with no limits. Teaching staff can enter marks, view subject registries, and upload marks from their own devices.
                  </p>
                </div>

                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
                  <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px", display: "inline-block", marginBottom: "16px" }}>
                    <MessageSquare size={26} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "18px" }}>Parent SMS Broadcaster</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Send bulk SMS notifications to parents of students. Instantly alert them of grades, report cards, outstanding tuition balances, and events.
                  </p>
                </div>

                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
                  <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px", display: "inline-block", marginBottom: "16px" }}>
                    <RotateCcw size={26} color="var(--primary)" />
                  </div>
                  <h3 style={{ color: "#0f172a", marginBottom: "12px", fontSize: "18px" }}>Automated SchoolPay Sync</h3>
                  <p style={{ color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    Seamlessly fetch and reconcile student fee payments from SchoolPay automatically every day. Save hours of manual entry and eliminate discrepancies.
                  </p>
                </div>
              </div>

              {/* Partner Schools Showcase Section */}
              {partnerSchools.length > 0 && (
                <div style={{ margin: "60px 0 80px", padding: "45px 0", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ textAlign: "center", marginBottom: "40px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Partner Schools</span>
                    <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginTop: "8px" }}>Trusted by Active Ugandan Institutions</h2>
                    <p style={{ color: "#64748b", marginTop: "8px" }}>Empowering schools of all sizes to run digital classrooms and finance systems.</p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3">
                    {partnerSchools.map((s) => (
                      <div 
                        key={s.id}
                        className="card text-center hover-scale" 
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", background: "white", borderColor: "#e2e8f0" }}
                      >
                        <div style={{ width: "70px", height: "70px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "16px" }}>
                          {s.logoUrl ? (
                            <img src={s.logoUrl} alt={`${s.name} Logo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "20px" }}>
                              {s.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <h4 style={{ color: "#0f172a", fontSize: "15px", fontWeight: 700, marginBottom: "0px" }}>{s.name}</h4>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Showcase Section 1: Report Cards */}
              <div className="grid grid-cols-2 gap-3 align-center" style={{ marginBottom: "60px", padding: "40px 0", borderTop: "1px solid #e2e8f0" }}>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Academic Analytics</span>
                  <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "8px", marginBottom: "16px" }}>Ugandan Standard PLE & Lower Secondary CBC Grading</h2>
                  <p style={{ color: "#475569", lineHeight: 1.6, marginBottom: "20px", fontSize: "15px" }}>
                    Our grading system is built specifically to address the academic guidelines of the Uganda National Examinations Board (UNEB) and the National Curriculum Development Centre (NCDC).
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", color: "#475569" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Complete PLE Division calculation (aggregates for 4 subjects)</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Continuous Assessment projects tracking (20% score weight)</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> CBC Competence grades mapping (A to E descriptor scale)</li>
                  </ul>
                </div>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 20px rgba(0,0,0,0.03)" }} className="hover-scale">
                  <img src="/images/report_card_preview.png" alt="Academic Report Card Preview" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
              </div>

              {/* Showcase Section 2: Payments */}
              <div className="grid grid-cols-2 gap-3 align-center" style={{ marginBottom: "60px", padding: "40px 0", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 20px rgba(0,0,0,0.03)" }} className="hover-scale">
                  <img src="/images/checkout_preview.png" alt="Billing and Payment Options Preview" style={{ width: "100%", height: "auto", display: "block" }} />
                </div>
                <div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Secure Billing Gateway</span>
                  <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "8px", marginBottom: "16px" }}>Simulated Mobile Money & Visa Checkout Portal</h2>
                  <p style={{ color: "#475569", lineHeight: 1.6, marginBottom: "20px", fontSize: "15px" }}>
                    Enable parents and school administrators to renew licenses or pay tuition balances in seconds. Supports simulations of East Africa's leading payment platforms.
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", color: "#475569" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> MTN Mobile Money & Airtel Money instant prompt integration</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Visa & Mastercard Credit/Debit card form processing</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> 3D Secure OTP verification simulation for active safety</li>
                  </ul>
                </div>
              </div>

              {/* Instant Interactive Demos Section */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "40px", textAlign: "center" }}>
                <h2 style={{ color: "#0f172a", marginBottom: "16px", fontSize: "24px" }}>Start Your Free 1-Term School Trial Today</h2>
                <p style={{ color: "#475569", maxWidth: "600px", margin: "0 auto 30px", fontSize: "15px", lineHeight: 1.5 }}>
                  Register your school in seconds to get a free first-term trial. Explore all features under the Basic or Premium plan with no upfront payment required!
                </p>

                <div className="flex justify-center flex-wrap gap-2">
                  <button onClick={() => setActiveTab("register")} className="btn btn-primary hover-scale" style={{ padding: "14px 32px" }}>
                    Register Trial School Now
                  </button>
                  <button onClick={() => setActiveTab("login")} className="btn btn-outline hover-scale" style={{ padding: "14px 32px", color: "#1e293b", borderColor: "#cbd5e1", background: "#f8fafc" }}>
                    Login to School Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="animate-slide-up" style={{ maxWidth: "900px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <h2 style={{ color: "#0f172a", fontSize: "32px", marginBottom: "10px" }}>Choose the Best Package for Your School</h2>
                <p style={{ color: "#475569" }}>Affordable, simple termly subscription licensing built for East African schools.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Basic Package */}
                <div className="card hover-scale" style={{ background: "#ffffff", borderColor: "#cbd5e1", position: "relative" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ color: "#0f172a", fontSize: "20px" }}>Basic Plan</h3>
                    <p style={{ color: "#64748b", fontSize: "13px" }}>For schools that only need grading & academic cards</p>
                  </div>
                  <div style={{ margin: "20px 0" }}>
                    <h2 style={{ fontSize: "36px", color: "#0f172a", fontWeight: 800 }}>200,000 UGX <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "normal" }}>/ Term</span></h2>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", margin: "20px 0", color: "#475569", fontSize: "14px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Complete PLE Grading System</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Lower Secondary CBC Tracking</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Automated Report Card PDFs</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Create accounts for all teachers (No Limit)</li>
                    <li style={{ color: "#94a3b8", textDecoration: "line-through", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="#cbd5e1" /> School Financial Management</li>
                    <li style={{ color: "#94a3b8", textDecoration: "line-through", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="#cbd5e1" /> Parent Billing & Ledger</li>
                  </ul>
                  <button onClick={() => { setPackageType("BASIC"); setActiveTab("register"); }} className="btn btn-outline hover-scale" style={{ width: "100%", marginTop: "20px", color: "var(--primary)", borderColor: "var(--primary)" }}>Choose Basic Plan</button>
                </div>

                {/* Premium Package */}
                <div className="card hover-scale" style={{ background: "#ffffff", border: "2px solid var(--primary)", position: "relative" }}>
                  <div style={{ position: "absolute", top: "-14px", right: "20px", background: "var(--primary)", color: "white", padding: "4px 14px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>POPULAR CHOICE</div>
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ color: "#0f172a", fontSize: "20px" }}>Premium Plan</h3>
                    <p style={{ color: "#64748b", fontSize: "13px" }}>For full school administrative operations</p>
                  </div>
                  <div style={{ margin: "20px 0" }}>
                    <h2 style={{ fontSize: "36px", color: "#0f172a", fontWeight: 800 }}>500,000 UGX <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "normal" }}>/ Term</span></h2>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px", margin: "20px 0", color: "#475569", fontSize: "14px" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> All features in Basic Plan</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Student Fee structures & logs</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Automated Defaulters tracking</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Salaries & Expenditure Ledger</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Mobile Money & Card billing simulation</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Parent SMS Broadcaster (Bulk SMS)</li>
                    <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} color="var(--primary)" /> Automated SchoolPay Sync</li>
                  </ul>
                  <button onClick={() => { setPackageType("PREMIUM"); setActiveTab("register"); }} className="btn btn-primary hover-scale" style={{ width: "100%", marginTop: "20px" }}>Choose Premium Plan</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "register" && (
            <div className="animate-slide-up" style={{ maxWidth: "600px", margin: "0 auto" }}>
              {!registeredSchool ? (
                <div className="card" style={{ background: "#ffffff", borderColor: "#cbd5e1" }}>
                  <h2 style={{ color: "#0f172a", marginBottom: "10px" }}>Register Your School</h2>
                  <p style={{ color: "#475569", fontSize: "14px", marginBottom: "24px" }}>
                    Create an account to instantly activate a customized trial subdomain for your institution.
                  </p>

                  {error && (
                    <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "14px", marginBottom: "20px" }}>
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
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. greenhill" 
                          value={subdomain}
                          onChange={(e) => handleSubdomainChange(e.target.value)}
                          required
                          style={{ width: "100%", paddingRight: `${baseDomain.length * 7 + 25}px`, marginBottom: 0 }}
                        />
                        <span style={{ position: "absolute", right: "12px", color: "#64748b", fontSize: "13px", fontWeight: "600", pointerEvents: "none" }}>
                          .{baseDomain}
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>Lowercase letters & numbers only, no spaces.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Package Plan</label>
                      <select 
                        className="input-field" 
                        value={packageType} 
                        onChange={(e) => setPackageType(e.target.value as "BASIC" | "PREMIUM")}
                      >
                        <option value="BASIC">Basic Plan (200,000 UGX / Term)</option>
                        <option value="PREMIUM">Premium Plan (500,000 UGX / Term)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">School Level / Type</label>
                      <select 
                        className="input-field" 
                        value={schoolType} 
                        onChange={(e) => setSchoolType(e.target.value as "PRIMARY" | "SECONDARY" | "COMBINED")}
                      >
                        <option value="PRIMARY">Primary School (P1 - P7)</option>
                        <option value="SECONDARY">Secondary School (S1 - S6)</option>
                        <option value="COMBINED">Combined (Primary & Secondary)</option>
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

                    <button type="submit" className="btn btn-primary hover-scale" style={{ width: "100%", padding: "12px", marginTop: "10px" }}>
                      Register & Create Trial Subdomain
                    </button>
                  </form>
                </div>
              ) : (
                <div className="card text-center" style={{ background: "#ffffff", borderColor: "#10b981", textAlign: "center" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.15)", padding: "16px", borderRadius: "50%", display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "20px" }}>
                    <CheckCircle size={40} color="var(--success)" />
                  </div>
                  <h2 style={{ color: "#0f172a", marginBottom: "10px" }}>School Registered Successfully!</h2>
                  <p style={{ color: "#475569", fontSize: "14px", marginBottom: "24px" }}>
                    Your customized subdomain has been generated and activated for a free 1-term trial.
                  </p>

                  <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "20px", margin: "20px 0", textAlign: "left", border: "1px solid #cbd5e1" }}>
                    <div style={{ marginBottom: "12px" }}>
                      <strong style={{ display: "block", fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>School Subdomain</strong>
                      <span style={{ fontSize: "16px", color: "var(--primary)", fontWeight: 700 }}>
                        {registeredSchool.subdomain}.{baseDomain}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: "12px" }}>
                      <strong style={{ display: "block", fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>Administrator Username</strong>
                      <span style={{ fontSize: "14px", color: "#0f172a", fontFamily: "monospace" }}>{tempCredentials.email}</span>
                    </div>

                    <div>
                      <strong style={{ display: "block", fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>Trial Password</strong>
                      <span style={{ fontSize: "14px", color: "#0f172a", fontFamily: "monospace" }}>{tempCredentials.password}</span>
                    </div>
                  </div>

                  <p style={{ color: "#475569", fontSize: "13px", marginBottom: "20px" }}>
                    Click the button below to instantly login to your new dashboard.
                  </p>

                  <a 
                    href={demoHost.includes("localhost") 
                      ? `${demoHost.split("//")[0]}//${registeredSchool.subdomain}.${demoHost.split("//")[1]}` 
                      : `https://${registeredSchool.subdomain}.${baseDomain}`}
                    className="btn btn-primary hover-scale"
                    style={{ width: "100%", padding: "12px", display: "inline-flex", justifyContent: "center" }}
                  >
                    Go to Portal Login <ArrowRight size={16} style={{ marginLeft: "6px" }} />
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === "login" && (
            <div className="animate-slide-up" style={{ maxWidth: "500px", margin: "0 auto" }}>
              <div className="card shadow-lg" style={{ background: "#ffffff", borderColor: "#cbd5e1", padding: "40px" }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <h2 style={{ color: "#0f172a", marginBottom: "10px", fontWeight: 800 }}>Access Your School Portal</h2>
                  <p style={{ color: "#475569", fontSize: "14px" }}>
                    Enter your school's unique subdomain to redirect to your institution's secure login panel.
                  </p>
                </div>

                {loginError && (
                  <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "14px", marginBottom: "20px" }}>
                    {loginError}
                  </div>
                )}
                {lastSubdomain && (
                  <div className="flex-mobile-col" style={{ background: "var(--primary-light)", border: "1px solid var(--primary-glow)", borderRadius: "8px", padding: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "left" }}>
                      <span style={{ fontSize: "10px", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Returning User</span>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                        {lastSubdomain}.{baseDomain}
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        const host = window.location.origin;
                        let targetUrl = "";
                        if (host.includes("localhost") || host.includes("127.0.0.1")) {
                          const parts = host.split("//");
                          targetUrl = `${parts[0]}//${lastSubdomain}.${parts[1]}`;
                        } else {
                          targetUrl = `https://${lastSubdomain}.${baseDomain}`;
                        }
                        if (loginEmail) {
                          targetUrl += `?email=${encodeURIComponent(loginEmail)}`;
                        }
                        window.location.href = targetUrl;
                      }}
                      className="btn btn-primary hover-scale" 
                      style={{ padding: "8px 16px", fontSize: "13px" }}
                    >
                      Go to Portal <ArrowRight size={14} style={{ marginLeft: "4px" }} />
                    </button>
                  </div>
                )}

                <form onSubmit={handlePortalRedirect}>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label" style={{ color: "#1e293b" }}>School Subdomain</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. greenhill" 
                        value={loginSubdomain}
                        onChange={(e) => setLoginSubdomain(e.target.value)}
                        required
                        style={{ width: "100%", paddingRight: `${baseDomain.length * 7 + 25}px`, marginBottom: 0, backgroundColor: "#ffffff", color: "#1e293b" }}
                      />
                      <span style={{ position: "absolute", right: "12px", color: "#64748b", fontSize: "13px", fontWeight: "600", pointerEvents: "none" }}>
                        .{baseDomain}
                      </span>
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>Tip: Enter "admin" to log in to the Super Admin Panel.</span>
                  </div>

                  <div className="form-group" style={{ marginBottom: "24px" }}>
                    <label className="form-label" style={{ color: "#1e293b" }}>Administrator/Staff Email (Optional)</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      placeholder="e.g. head@yourschool.ug" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      style={{ background: "#ffffff", color: "#1e293b" }}
                    />
                    <span style={{ fontSize: "11px", color: "#64748b" }}>If provided, this will pre-fill the login form for you.</span>
                  </div>

                  <button type="submit" className="btn btn-primary hover-scale" style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    Find Portal & Go to Login <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Team Section */}
          <div style={{ marginTop: "60px", padding: "40px 0", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Our Team</span>
              <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#0f172a", marginTop: "8px" }}>Built by Education & Tech Leaders</h2>
              <p style={{ color: "#64748b", marginTop: "8px" }}>Dedicated to modernizing school administration systems in Uganda.</p>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center hover-scale" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", background: "white", borderColor: "#cbd5e1" }}>
                <div style={{ width: "90px", height: "90px", borderRadius: "50%", overflow: "hidden", border: "3px solid var(--primary-light)", marginBottom: "16px", boxShadow: "var(--shadow)" }}>
                  <img src="/images/mujuni_vincent_ceo.png" alt="Vincent Mujuni" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <h4 style={{ color: "#0f172a", marginBottom: "4px" }}>Vincent Mujuni</h4>
                <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700 }}>CEO & Founder</span>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "12px", lineHeight: 1.4 }}>Former school administrator with 10+ years experience in East African educational systems.</p>
              </div>

              <div className="card text-center hover-scale" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", background: "white", borderColor: "#cbd5e1" }}>
                <div style={{ width: "90px", height: "90px", borderRadius: "50%", overflow: "hidden", border: "3px solid var(--primary-light)", marginBottom: "16px", boxShadow: "var(--shadow)" }}>
                  <img src="/images/bngole_alvin.png" alt="Bngole Alvin" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <h4 style={{ color: "#0f172a", marginBottom: "4px" }}>Bngole Alvin</h4>
                <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700 }}>Chief Product Officer</span>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "12px", lineHeight: 1.4 }}>Lead developer specializing in CBC curriculum integrations and automated grading algorithms.</p>
              </div>

              <div className="card text-center hover-scale" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", background: "white", borderColor: "#cbd5e1" }}>
                <div style={{ width: "90px", height: "90px", borderRadius: "50%", overflow: "hidden", border: "3px solid var(--primary-light)", marginBottom: "16px", boxShadow: "var(--shadow)" }}>
                  <img src="/images/zimula_farid.png" alt="Zimula Farid" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <h4 style={{ color: "#0f172a", marginBottom: "4px" }}>Zimula Farid</h4>
                <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700 }}>Head of Customer Success</span>
                <p style={{ fontSize: "13px", color: "#64748b", marginTop: "12px", lineHeight: 1.4 }}>Managing client support, onboarding, and training for partner schools across Uganda.</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer style={{ borderTop: "1px solid #e2e8f0", padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: "14px", backgroundColor: "#f8fafc" }}>
        <div className="container">
          <p>© 2026 SchoolPro Uganda. All rights reserved.</p>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Providing modern grading software for UNEB PLE and the new CBC curriculum.</p>
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "center", gap: "24px", fontSize: "13px", color: "var(--primary)", fontWeight: 600 }}>
            <span>📞 Phone: <a href="tel:0763821042" style={{ color: "inherit", textDecoration: "none" }}>0763821042</a></span>
            <span>✉️ Email: <a href="mailto:laptertechnoloies@gmail.com" style={{ color: "inherit", textDecoration: "none" }}>laptertechnoloies@gmail.com</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
