"use client";
import React, { useState, useEffect } from "react";
import { 
  getSchools, 
  getPayments, 
  createPayment, 
  updateSchoolStatus, 
  checkDatabaseConnection,
  authenticateUser,
  School, 
  Payment 
} from "../../lib/services";
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
  Lock
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    } catch (err) {
      setAuthError("Authentication system error.");
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
  const activeSchools = schools.filter((s) => s.status === "ACTIVE").length;
  const pendingSchools = schools.filter((s) => s.status === "PENDING").length;
  const totalRevenue = payments.reduce((sum, p) => sum + (p.status === "COMPLETED" ? p.amount : 0), 0);

  const filteredSchools = schools.filter((s) => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    s.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

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
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ background: "#ffffff", color: "#1e293b" }}
              />
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
          <div className="grid grid-cols-4 gap-2">
            
            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff" }}>
              <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px" }}>
                <Building2 size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Tenants</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{totalSchools}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff" }}>
              <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px" }}>
                <CheckCircle size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Active Schools</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{activeSchools}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff" }}>
              <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px" }}>
                <Clock size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Pending Trials</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{pendingSchools}</h2>
              </div>
            </div>

            <div className="card hover-scale" style={{ display: "flex", alignItems: "center", gap: "16px", backgroundColor: "#ffffff" }}>
              <div style={{ background: "var(--primary-light)", padding: "14px", borderRadius: "12px" }}>
                <DollarSign size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>SaaS Income</span>
                <h2 style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px", color: "#0f172a" }}>{totalRevenue.toLocaleString()} UGX</h2>
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
                <div className="flex justify-between align-center flex-wrap gap-2" style={{ marginBottom: "20px" }}>
                  <h3 style={{ fontSize: "18px", color: "#0f172a" }}>Registered School Accounts</h3>
                  <div className="flex align-center" style={{ border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", padding: "4px 10px", width: "260px" }}>
                    <Search size={18} color="#94a3b8" />
                    <input 
                      type="text" 
                      placeholder="Search schools..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ border: "none", outline: "none", fontSize: "13px", padding: "6px", width: "100%", color: "#1e293b" }}
                    />
                  </div>
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
                                {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "Trial Pending"}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => handleToggleStatus(s.id, s.status)}
                                className={`btn ${s.status === "ACTIVE" ? "btn-danger" : "btn-primary"} hover-scale`} 
                                style={{ padding: "6px 12px", fontSize: "11px" }}
                              >
                                {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </button>
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
                      placeholder="e.g. 350000"
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
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
