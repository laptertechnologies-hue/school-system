"use client";
import React, { useState, useEffect } from "react";
import { dataService, School, Payment } from "../../lib/services";
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  Search, 
  RefreshCw, 
  PlusCircle,
  FileText
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Payment recording form state
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("MOBILE_MONEY");
  const [txRef, setTxRef] = useState("");
  const [paymentMsg, setPaymentMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const allSchools = await dataService.getSchools();
      const allPayments = await dataService.getPayments("school-1"); // Mock load
      
      setSchools(allSchools);
      
      // Let's load payments for all schools by fetching sequentially in mock mode
      const allPaymentsCombined: Payment[] = [];
      for (const s of allSchools) {
        const sp = await dataService.getPayments(s.id);
        allPaymentsCombined.push(...sp);
      }
      setPayments(allPaymentsCombined);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (schoolId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await dataService.updateSchoolStatus(schoolId, nextStatus);
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
      await dataService.createPayment({
        schoolId: selectedSchoolId,
        amount: parseFloat(amount),
        method,
        status: "COMPLETED",
        txRef: txRef || `TX-MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });

      // Automatically activate/renew school if inactive
      const school = schools.find((s) => s.id === selectedSchoolId);
      if (school && school.status !== "ACTIVE") {
        await dataService.updateSchoolStatus(selectedSchoolId, "ACTIVE");
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

  return (
    <div data-theme="light" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#1e293b", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      {/* Header bar */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", color: "white", padding: "20px 0" }}>
        <div className="container flex justify-between align-center">
          <div className="flex align-center gap-2">
            <div style={{ background: "var(--primary)", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 800 }}>SaaS Super Admin Dashboard</h1>
              <span style={{ fontSize: "11px", opacity: 0.7 }}>Manage School Tenants, Billing & Access</span>
            </div>
          </div>
          <div className="flex align-center gap-2">
            <a href="/" className="btn btn-outline" style={{ color: "white", borderColor: "rgba(255,255,255,0.2)" }}>Exit to Site</a>
            <button onClick={loadData} className="btn btn-primary" style={{ padding: "8px" }}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{ padding: "30px 0" }}>
        <div className="container">
          <div className="grid grid-cols-4 gap-2" style={{ marginBottom: "30px" }}>
            
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "14px", borderRadius: "12px" }}>
                <Building2 size={28} color="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>TOTAL TENANTS</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{totalSchools}</h2>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "14px", borderRadius: "12px" }}>
                <CheckCircle size={28} color="var(--success)" />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>ACTIVE SCHOOLS</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{activeSchools}</h2>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "14px", borderRadius: "12px" }}>
                <Clock size={28} color="var(--warning)" />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>PENDING TRIAL APPROVALS</span>
                <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{pendingSchools}</h2>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "14px", borderRadius: "12px" }}>
                <DollarSign size={28} color="var(--success)" />
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>TOTAL REVENUE COLLECTED</span>
                <h2 style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>{totalRevenue.toLocaleString()} UGX</h2>
              </div>
            </div>

          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }} className="flex-mobile-col">
            
            {/* School tenants list */}
            <div>
              <div className="card" style={{ padding: "20px" }}>
                <div className="flex justify-between align-center flex-wrap gap-2" style={{ marginBottom: "20px" }}>
                  <h3>Registered School Accounts</h3>
                  <div className="flex align-center" style={{ border: "1px solid #cbd5e1", borderRadius: "8px", background: "white", padding: "4px 10px", width: "260px" }}>
                    <Search size={18} color="#94a3b8" />
                    <input 
                      type="text" 
                      placeholder="Search schools..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ border: "none", outline: "none", fontSize: "13px", padding: "6px", width: "100%" }}
                    />
                  </div>
                </div>

                {loading ? (
                  <p style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading database...</p>
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
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {s.contactEmail} • {s.contactPhone}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontFamily: "monospace", color: "var(--primary)" }}>{s.subdomain}.schoolpro.ug</span>
                            </td>
                            <td>
                              <span className={`badge ${s.packageType === "PREMIUM" ? "badge-success" : "badge-primary"}`}>
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
                                {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : "N/A"}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => handleToggleStatus(s.id, s.status)}
                                className={`btn ${s.status === "ACTIVE" ? "btn-danger" : "btn-primary"}`} 
                                style={{ padding: "6px 12px", fontSize: "11px" }}
                              >
                                {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Quick manual billing recording */}
            <div>
              <div className="card" style={{ padding: "20px" }}>
                <h3 style={{ display: "flex", alignContent: "center", gap: "8px", marginBottom: "16px" }}>
                  <PlusCircle size={20} color="var(--primary)" /> Record School Payment
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

                  <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "10px", marginTop: "8px" }}>
                    Submit Payment & Activate
                  </button>
                </form>
              </div>

              {/* Info panel */}
              <div className="card" style={{ marginTop: "20px", background: "white", padding: "20px" }}>
                <h4 style={{ marginBottom: "10px", color: "var(--primary)" }}>Manual Activating Guideline</h4>
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
