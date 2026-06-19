"use client";
import React, { useState, useEffect } from "react";
import { 
  getSchools, 
  getPayments, 
  createPayment, 
  createUser,
  createSchool,
  updateSchoolStatus, 
  updateSchoolSubscription,
  checkDatabaseConnection,
  authenticateUser
} from "../../lib/services";
import type { School, Payment } from "../../lib/types";
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  Search, 
  RefreshCw, 
  PlusCircle,
  FileText,
  Database,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  
  // Payment recording form state
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [txRef, setTxRef] = useState("");
  const [paymentMsg, setPaymentMsg] = useState("");

  // Subscription Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditSchool, setSelectedEditSchool] = useState<School | null>(null);
  const [editPackageType, setEditPackageType] = useState<"BASIC" | "PREMIUM">("BASIC");
  const [editStatus, setEditStatus] = useState<"PENDING" | "ACTIVE" | "INACTIVE">("PENDING");
  const [editExpiresAt, setEditExpiresAt] = useState("");

  // Filters State
  const [activeFilterTab, setActiveFilterTab] = useState<"ALL" | "ACTIVE_PAX" | "TRIALS" | "EXPIRED">("ALL");
  const [packageFilter, setPackageFilter] = useState<"ALL" | "BASIC" | "PREMIUM">("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      // Check database connection
      const isConnected = await checkDatabaseConnection();
      setDbConnected(isConnected);

      const allSchools = await getSchools();
      setSchools(allSchools);
      
      // Load payments for all schools
      const allPaymentsCombined: Payment[] = [];
      for (const s of allSchools) {
        const sp = await getPayments(s.id);
        allPaymentsCombined.push(...sp);
      }
      // Sort payments by date descending
      allPaymentsCombined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(allPaymentsCombined);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const user = await authenticateUser(email, password, "admin");
      if (user) {
        setCurrentUser(user);
      } else {
        setAuthError("Invalid super-admin credentials.");
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      const msg = err?.message || "";
      if (msg.includes("Server Components") || msg.includes("production builds")) {
        setAuthError("Unable to connect to the authentication server. Please ensure the database is configured and try again.");
      } else {
        setAuthError("Authentication system error: " + (msg || "Unable to reach the server."));
      }
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const handleToggleStatus = async (schoolId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateSchoolStatus(schoolId, nextStatus);
      await loadData(); // Reload
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleOpenEditModal = (school: School) => {
    setSelectedEditSchool(school);
    setEditPackageType(school.packageType);
    setEditStatus(school.status);
    setEditExpiresAt(
      school.expiresAt ? new Date(school.expiresAt).toISOString().split("T")[0] : ""
    );
    setShowEditModal(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditSchool) return;

    try {
      const expDate = editExpiresAt ? new Date(editExpiresAt) : null;
      await updateSchoolSubscription(selectedEditSchool.id, {
        packageType: editPackageType,
        status: editStatus,
        expiresAt: expDate,
      });

      setShowEditModal(false);
      await loadData();
    } catch (err: any) {
      alert("Failed to save subscription: " + (err.message || err));
    }
  };

  const handleSimulateTrial = async () => {
    try {
      const randomSub = "trial" + Math.floor(Math.random() * 9000 + 1000);
      const randomName = "Sandbox Academy " + Math.floor(Math.random() * 100 + 1);
      
      const sch = await createSchool({
        name: randomName,
        subdomain: randomSub,
        packageType: Math.random() > 0.5 ? "PREMIUM" : "BASIC",
        schoolType: "COMBINED",
        studentRange: "200-500",
        contactEmail: `head@${randomSub}.ug`,
        contactPhone: "+256 772 " + Math.floor(Math.random() * 900000 + 100000),
        currentTerm: 1,
        currentYear: new Date().getFullYear(),
      });

      await createUser({
        schoolId: sch.id,
        name: "Trial Administrator",
        email: `admin@${randomSub}.ug`,
        passwordHash: "password",
        role: "ADMIN"
      });

      await loadData();
      alert(`Provisioned sandbox school "${randomName}" with subdomain "${randomSub}" under pending trial status.`);
    } catch (err: any) {
      alert("Failed to simulate trial: " + (err.message || err));
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentMsg("");
    if (!selectedSchoolId || !amount) {
      setPaymentMsg("Please select a school and enter amount");
      return;
    }

    try {
      await createPayment({
        schoolId: selectedSchoolId,
        amount: parseFloat(amount),
        method,
        status: "COMPLETED",
        txRef: txRef || `TX-MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });

      // Automatically activate/renew school if inactive
      const school = schools.find((s) => s.id === selectedSchoolId);
      if (school && school.status !== "ACTIVE") {
        await updateSchoolStatus(selectedSchoolId, "ACTIVE");
      }

      setAmount("");
      setTxRef("");
      setPaymentMsg("Payment recorded and school subscription updated!");
      await loadData();
    } catch (err) {
      setPaymentMsg("Failed to record payment");
    }
  };

  // Metrics
  const totalSchools = schools.length;
  
  // Active Paid Subscriptions: status is ACTIVE and subscription has not expired
  const activePaidSchoolsCount = schools.filter(
    (s) => s.status === "ACTIVE" && s.expiresAt && new Date(s.expiresAt).getTime() > Date.now()
  ).length;

  // Active Trial Subscriptions: status is PENDING or status is ACTIVE but expiresAt is null or no payments recorded
  const trialSchoolsCount = schools.filter(
    (s) => s.status === "PENDING" || (s.status === "ACTIVE" && !s.expiresAt)
  ).length;

  // Expired / Inactive: status is INACTIVE or expiresAt is past
  const expiredSchoolsCount = schools.filter(
    (s) => s.status === "INACTIVE" || (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now())
  ).length;

  const totalRevenue = payments.reduce((sum, p) => sum + (p.status === "COMPLETED" ? p.amount : 0), 0);

  // Filter school list
  const filteredSchools = schools.filter((s) => {
    // 1. Search filter
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.subdomain.toLowerCase().includes(search.toLowerCase()) ||
      s.contactEmail.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Tab filter
    if (activeFilterTab === "ACTIVE_PAX") {
      const isActive = s.status === "ACTIVE" && s.expiresAt && new Date(s.expiresAt).getTime() > Date.now();
      if (!isActive) return false;
    } else if (activeFilterTab === "TRIALS") {
      const isTrial = s.status === "PENDING" || (s.status === "ACTIVE" && !s.expiresAt);
      if (!isTrial) return false;
    } else if (activeFilterTab === "EXPIRED") {
      const isExpired = s.status === "INACTIVE" || (s.expiresAt && new Date(s.expiresAt).getTime() <= Date.now());
      if (!isExpired) return false;
    }

    // 3. Package filter
    if (packageFilter !== "ALL") {
      if (s.packageType !== packageFilter) return false;
    }

    return true;
  });

  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", fontFamily: "var(--font-sans)" }} className="animate-fade-in">
        <div className="card shadow-lg" style={{ width: "100%", maxWidth: "420px", padding: "40px", backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={{ display: "inline-flex", background: "var(--primary-light)", padding: "14px", borderRadius: "50%", marginBottom: "16px" }}>
              <Lock size={30} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a" }}>Super Admin Access</h2>
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>Enter secure administrator credentials to enter dashboard console.</p>
          </div>

          {authError && (
            <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", color: "var(--danger)", padding: "12px", borderRadius: "8px", fontSize: "13px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <XCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label className="form-label" style={{ color: "#1e293b" }}>Admin Email</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="admin@schoolpro.ug" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ background: "#ffffff", color: "#1e293b" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label" style={{ color: "#1e293b" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input 
                  type={showLoginPassword ? "text" : "password"} 
                  className="input-field" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: "40px", background: "#ffffff", color: "#1e293b" }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "#9ca3af",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary hover-scale" style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              Authenticate System
            </button>
          </form>
          
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <a href="/" style={{ fontSize: "13px", color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}>Back to Landing Page</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", color: "#1e293b", fontFamily: "var(--font-sans)" }} className="animate-fade-in">
      {/* Top accent strip */}
      <div style={{ height: "6px", background: "linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)" }}></div>

      {/* Header bar */}
      <div style={{ background: "#ffffff", color: "#1e293b", padding: "20px 0", borderBottom: "1px solid #e2e8f0" }}>
        <div className="container flex justify-between align-center flex-mobile-col gap-2">
          <div className="flex align-center gap-2">
            <div style={{ background: "var(--primary)", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>SaaS Super Admin Console</h1>
              <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>Tenant & Billing Logs</span>
            </div>
          </div>
          <div className="flex align-center gap-2 flex-mobile-col">
            <a href="/" className="btn btn-outline hover-scale" style={{ color: "#1e293b", borderColor: "#cbd5e1", background: "#f8fafc" }}>Exit to Site</a>
            <button onClick={loadData} className="btn btn-primary hover-scale" style={{ padding: "10px" }}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{ padding: "30px 0", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div className="container animate-slide-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            
            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff", padding: "20px" }}>
              <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px" }}>
                <Building2 size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Tenants</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{totalSchools}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff", padding: "20px" }}>
              <div style={{ background: "rgba(34, 197, 94, 0.15)", padding: "14px", borderRadius: "12px" }}>
                <CheckCircle size={28} color="#22c55e" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Paid Active</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{activePaidSchoolsCount}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff", padding: "20px" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.15)", padding: "14px", borderRadius: "12px" }}>
                <Clock size={28} color="#f59e0b" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Active Trials</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{trialSchoolsCount}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff", padding: "20px" }}>
              <div style={{ background: "rgba(239, 68, 68, 0.15)", padding: "14px", borderRadius: "12px" }}>
                <XCircle size={28} color="#ef4444" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Expired / Inactive</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{expiredSchoolsCount}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff", padding: "20px" }}>
              <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px" }}>
                <DollarSign size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>SaaS Revenue</span>
                <h2 style={{ fontSize: "20px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{totalRevenue.toLocaleString()} UGX</h2>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Body Grid */}
      <div style={{ padding: "40px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }} className="flex-mobile-col">
            
            {/* School tenants list */}
            <div className="animate-slide-up">
              <div className="card" style={{ padding: "24px", backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}>
                <div className="flex justify-between align-center flex-wrap gap-2" style={{ marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "18px", color: "#0f172a", marginBottom: "4px" }}>Registered School Accounts</h3>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>Manage school directories, modify terms/subscriptions, and review trial count status.</p>
                  </div>
                  <div className="flex align-center gap-2 flex-wrap">
                    {/* Package Filter Dropdown */}
                    <select
                      value={packageFilter}
                      onChange={(e) => setPackageFilter(e.target.value as any)}
                      className="input-field"
                      style={{ width: "140px", padding: "6px 10px", fontSize: "13px", background: "white", color: "#1e293b", borderColor: "#cbd5e1", marginBottom: 0 }}
                    >
                      <option value="ALL">All Packages</option>
                      <option value="BASIC">Basic Package</option>
                      <option value="PREMIUM">Premium Package</option>
                    </select>

                    <div className="flex align-center" style={{ border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", padding: "4px 10px", width: "220px" }}>
                      <Search size={16} color="#94a3b8" />
                      <input 
                        type="text" 
                        placeholder="Search name, domain, mail..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ border: "none", outline: "none", fontSize: "13px", padding: "4px 6px", width: "100%", color: "#1e293b" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub-tab navigation */}
                <div className="flex gap-1 flex-wrap" style={{ marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                  <button 
                    onClick={() => setActiveFilterTab("ALL")}
                    className={`btn ${activeFilterTab === "ALL" ? "btn-primary" : "btn-outline"}`}
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                  >
                    All Accounts ({totalSchools})
                  </button>
                  <button 
                    onClick={() => setActiveFilterTab("ACTIVE_PAX")}
                    className={`btn ${activeFilterTab === "ACTIVE_PAX" ? "btn-primary" : "btn-outline"}`}
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                  >
                    Paid Active ({activePaidSchoolsCount})
                  </button>
                  <button 
                    onClick={() => setActiveFilterTab("TRIALS")}
                    className={`btn ${activeFilterTab === "TRIALS" ? "btn-primary" : "btn-outline"}`}
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                  >
                    Trials ({trialSchoolsCount})
                  </button>
                  <button 
                    onClick={() => setActiveFilterTab("EXPIRED")}
                    className={`btn ${activeFilterTab === "EXPIRED" ? "btn-primary" : "btn-outline"}`}
                    style={{ padding: "6px 14px", fontSize: "12px" }}
                  >
                    Expired / Inactive ({expiredSchoolsCount})
                  </button>
                </div>

                {loading ? (
                  <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading database state...</p>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>School Info</th>
                          <th>Subdomain</th>
                          <th>Package</th>
                          <th>Status</th>
                          <th>Expires</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchools.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <strong>{s.name}</strong>
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                {s.contactEmail} • {s.contactPhone}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: "monospace", color: "var(--primary)", fontWeight: 700 }}>{s.subdomain}.portal.laptertech.store</span>
                            </td>
                            <td>
                              <span className={`badge ${s.packageType === "PREMIUM" ? "badge-success" : "badge-primary"}`} style={{ color: "var(--primary)", background: "var(--primary-light)" }}>
                                {s.packageType}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${s.status === "ACTIVE" ? "badge-success" : s.status === "PENDING" ? "badge-warning" : "badge-danger"}`}>
                                {s.status}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "12px", color: "#64748b" }}>
                                {s.expiresAt ? (
                                  <>
                                    {new Date(s.expiresAt).toLocaleDateString()}<br/>
                                    {new Date(s.expiresAt).getTime() > Date.now() ? (
                                      <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: "bold" }}>
                                        ({Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: "10px", color: "#dc2626", fontWeight: "bold" }}>
                                        (Expired {Math.abs(Math.floor((new Date(s.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days ago)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ fontSize: "11px", color: "#d97706", fontWeight: "bold" }}>
                                    Active Trial
                                  </span>
                                )}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-1" style={{ display: "flex", gap: "6px" }}>
                                <button 
                                  onClick={() => handleOpenEditModal(s)}
                                  className="btn btn-outline hover-scale" 
                                  style={{ padding: "6px 10px", fontSize: "11px", color: "var(--primary)", borderColor: "var(--primary)", height: "auto" }}
                                >
                                  Manage
                                </button>
                                <button 
                                  onClick={() => handleToggleStatus(s.id, s.status)}
                                  className={`btn ${s.status === "ACTIVE" ? "btn-danger" : "btn-primary"} hover-scale`} 
                                  style={{ padding: "6px 10px", fontSize: "11px", height: "auto" }}
                                >
                                  {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredSchools.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "20px" }}>No schools found matching search criteria.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Billing Logs */}
              <div className="card" style={{ marginTop: "24px", padding: "24px", backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}>
                <h3 style={{ fontSize: "18px", color: "#0f172a", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={20} color="var(--primary)" /> Subscription Billing Logs
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>School Name</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const sch = schools.find((s) => s.id === p.schoolId);
                        return (
                          <tr key={p.id}>
                            <td>{new Date(p.date).toLocaleDateString()}</td>
                            <td><strong>{sch?.name || "Unknown School"}</strong></td>
                            <td>
                              <span style={{ fontSize: "12px" }}>{p.method}</span>
                            </td>
                            <td>
                              <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{p.txRef || "N/A"}</span>
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--success)" }}>
                              +{p.amount.toLocaleString()} UGX
                            </td>
                          </tr>
                        );
                      })}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "20px" }}>No billing logs captured yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Quick manual billing recording */}
            <div className="animate-slide-up">
              <div className="card" style={{ padding: "24px", backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}>
                <h3 style={{ display: "flex", alignContent: "center", gap: "8px", marginBottom: "16px", fontSize: "18px", color: "#0f172a" }}>
                  <PlusCircle size={22} color="var(--primary)" /> Record School Payment
                </h3>
                
                {paymentMsg && (
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "var(--success)", padding: "10px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>
                    {paymentMsg}
                  </div>
                )}

                <form onSubmit={handleAddPayment}>
                  <div className="form-group">
                    <label className="form-label">Select School</label>
                    <select 
                      className="input-field"
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose school --</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.packageType})</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Amount (UGX)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 500000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select 
                      className="input-field"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      <option value="MOBILE_MONEY">Mobile Money (MTN/Airtel)</option>
                      <option value="BANK">Bank Transfer / Cash Deposit</option>
                      <option value="CASH">Direct Cash</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Transaction Reference (Optional)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. MTN-2026-981273"
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary hover-scale" style={{ width: "100%", padding: "12px", marginTop: "8px" }}>
                    Submit Payment & Activate
                  </button>
                </form>
              </div>

              {/* Info panel */}
              <div className="card" style={{ marginTop: "20px", background: "#f8fafc", padding: "20px", borderColor: "#cbd5e1" }}>
                <h4 style={{ marginBottom: "10px", color: "var(--primary)", fontSize: "14px" }}>Manual Activating Guideline</h4>
                <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.4 }}>
                  When schools pay via Mobile Money (or bank transfer), their transactions are recorded here. 
                  Activating a school extends its subscription for 1 Year and triggers welcome setup guides.
                </p>
              </div>

              {/* Sandbox Simulator */}
              <div className="card" style={{ marginTop: "20px", background: "#fffbeb", padding: "20px", border: "1px solid #fef3c7" }}>
                <h4 style={{ marginBottom: "10px", color: "#b45309", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  ⚡ Sandbox Demo Simulator
                </h4>
                <p style={{ fontSize: "12px", color: "#78350f", lineHeight: 1.4, marginBottom: "16px" }}>
                  Instantly provision mock active trial schools to test SaaS stats counters, trial limits, sub-tabs, and filters without manual DB entries.
                </p>
                <button 
                  onClick={handleSimulateTrial}
                  className="btn hover-scale" 
                  style={{ width: "100%", background: "#d97706", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
                >
                  + Simulate Random Trial School
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Subscription Edit Modal Overlay */}
      {showEditModal && selectedEditSchool && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card shadow-lg" style={{ width: "100%", maxWidth: "450px", background: "white", padding: "30px", border: "1px solid #cbd5e1" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>Edit Subscription</h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "16px" }}
              >✕</button>
            </div>

            <form onSubmit={handleSaveSubscription}>
              <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>{selectedEditSchool.name}</strong>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Subdomain: {selectedEditSchool.subdomain}.portal.laptertech.store
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Package Plan</label>
                <select 
                  className="input-field"
                  value={editPackageType}
                  onChange={(e) => setEditPackageType(e.target.value as any)}
                  required
                >
                  <option value="BASIC">Basic Plan (200,000 UGX / Term)</option>
                  <option value="PREMIUM">Premium Plan (500,000 UGX / Term)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select 
                  className="input-field"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  required
                >
                  <option value="PENDING">Pending Trial</option>
                  <option value="ACTIVE">Active Subscription</option>
                  <option value="INACTIVE">Deactivated / Suspended</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Subscription Expiry Date</label>
                <input 
                  type="date"
                  className="input-field"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
                <span style={{ fontSize: "11px", color: "#64748b" }}>Leave blank for no expiration date (active trial mode).</span>
              </div>

              <div className="flex gap-2" style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, padding: "10px" }}
                >
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="btn btn-outline" 
                  style={{ flex: 1, padding: "10px", color: "#1e293b", borderColor: "#cbd5e1" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
