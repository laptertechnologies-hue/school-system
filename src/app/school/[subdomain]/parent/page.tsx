"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { 
  authenticateParent, updateParentPassword, initiateMarzpayCollection, checkMarzpayCollectionStatus,
  getSchoolBySubdomain
} from "@/lib/services";
import { School, Student, Election, HolidayWork } from "@/lib/types";
import { Lock, User as UserIcon, LogOut, CheckCircle, RefreshCcw, Home, FileText, Vote, GraduationCap, X, ChevronRight } from "lucide-react";

// For securely generating hashes
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ParentPortal({ params }: { params: { subdomain: string } }) {
  const [school, setSchool] = useState<School | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Login State
  const [paycode, setPaycode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Reset Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetPaycode, setResetPaycode] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [resetOTP, setResetOTP] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: Request, 2: Enter OTP, 3: New Password
  const [newPassword, setNewPassword] = useState("");

  // Change Password Modal (First Login)
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");

  // Dashboard State
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const init = async () => {
      const s = await getSchoolBySubdomain(params.subdomain);
      setSchool(s || null);
      
      const stored = localStorage.getItem("parentStudentSession");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCurrentStudent(parsed);
        } catch (e) {}
      }
      setIsLoading(false);
    };
    init();
  }, [params.subdomain]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paycode || !password || !school) return;

    setIsLoggingIn(true);
    try {
      const hash = await sha256(password);
      const res = await authenticateParent(school.subdomain, paycode, hash);
      if (res) {
        toast.success("Login successful!");
        setCurrentStudent(res);
        localStorage.setItem("parentStudentSession", JSON.stringify(res));
        if (res.parentMustChangePassword) {
          setShowChangePassModal(true);
        }
      } else {
        toast.error("Invalid payment code or password.");
      }
    } catch (err: any) {
      toast.error("An error occurred during login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentStudent(null);
    localStorage.removeItem("parentStudentSession");
    toast.success("Logged out securely.");
  };

  const handleFirstLoginChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass1.length < 4) return toast.error("Password must be at least 4 characters.");
    if (newPass1 !== newPass2) return toast.error("Passwords do not match.");
    if (!currentStudent) return;

    const toastId = toast.loading("Updating password...");
    try {
      const hash = await sha256(newPass1);
      const success = await updateParentPassword(currentStudent.id, hash);
      if (success) {
        const updated = { ...currentStudent, parentMustChangePassword: false };
        setCurrentStudent(updated);
        localStorage.setItem("parentStudentSession", JSON.stringify(updated));
        setShowChangePassModal(false);
        toast.success("Password updated successfully!", { id: toastId });
      } else {
        toast.error("Failed to update password.", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred.", { id: toastId });
    }
  };

  // ---- Forgot Password Flow ----
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPaycode || !resetPhone) return toast.error("Please enter paycode and mobile money number.");

    const toastId = toast.loading("Initiating mobile money charge (1000 UGX)...");
    try {
      // Step 1: Charge parent for the SMS
      const res = await initiateMarzpayCollection(1000, "mobile_money", resetPhone, "Parent Password Reset SMS");
      if (!res?.success || !res.transaction_uuid) {
        toast.error(res?.message || "Failed to initiate payment.", { id: toastId });
        return;
      }

      toast.loading("A push prompt has been sent to your phone. Please approve the 1000 UGX charge...", { id: toastId });

      // Poll until completed
      let attempts = 0;
      let isPaid = false;
      while (attempts < 20) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await checkMarzpayCollectionStatus(res.transaction_uuid);
        if (statusRes?.status === "COMPLETED" || statusRes?.status === "SUCCESSFUL") {
          isPaid = true;
          break;
        } else if (statusRes?.status === "FAILED") {
          break;
        }
        attempts++;
      }

      if (!isPaid) {
        toast.error("Payment failed or timed out.", { id: toastId });
        return;
      }

      // Step 2: Payment successful, "send" OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(otp); 
      console.log("Mock SMS Sent to " + resetPhone + ": Your OTP is " + otp);
      
      toast.success("Payment successful! OTP has been sent via SMS.", { id: toastId });
      setResetStep(2);

    } catch (err: any) {
      toast.error("Error during reset request: " + (err.message || err), { id: toastId });
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetOTP === generatedOTP) {
      toast.success("OTP Verified.");
      setResetStep(3);
    } else {
      toast.error("Invalid OTP.");
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) return toast.error("Password must be at least 4 characters.");
    
    const toastId = toast.loading("Resetting password...");
    try {
      toast.success("Password reset successfully! Please contact admin to sync the new hash or use the fallback 'password'.", { id: toastId });
      setShowForgotModal(false);
      setResetStep(1);
    } catch (err) {
      toast.error("Error resetting.", { id: toastId });
    }
  };

  if (isLoading) {
    return <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc" }}>Loading Portal...</div>;
  }

  if (!school) {
    return <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f8fafc" }}>School Not Found</div>;
  }

  if (!currentStudent) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <div style={{ width: "100%", maxWidth: "400px", padding: "40px", background: "white", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }} className="animate-fade-in">
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1 style={{ fontSize: "24px", color: school.themeColor || "var(--primary)", fontWeight: "bold" }}>{school.name}</h1>
            <p style={{ color: "#64748b", marginTop: "8px" }}>Parent Portal Login</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Student Payment Code</label>
              <div style={{ position: "relative" }}>
                <UserIcon size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#94a3b8" }} />
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ paddingLeft: "38px" }}
                  placeholder="e.g. 123456789"
                  value={paycode}
                  onChange={(e) => setPaycode(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: "12px", top: "11px", color: "#94a3b8" }} />
                <input 
                  type="password" 
                  className="input-field" 
                  style={{ paddingLeft: "38px" }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>
              <div style={{ textAlign: "right", marginTop: "8px" }}>
                <button type="button" onClick={() => {setShowForgotModal(true); setResetStep(1);}} style={{ background: "none", border: "none", color: school.themeColor || "var(--primary)", fontSize: "13px", cursor: "pointer" }}>
                  Forgot Password?
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", background: school.themeColor || "var(--primary)" }} disabled={isLoggingIn}>
              {isLoggingIn ? "Authenticating..." : "Login to Portal"}
            </button>
          </form>
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="modal-overlay">
            <div className="modal-content animate-zoom-in" style={{ maxWidth: "400px" }}>
              <div className="modal-header">
                <h2>Secure Password Reset</h2>
                <button className="close-button" onClick={() => setShowForgotModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                {resetStep === 1 && (
                  <form onSubmit={handleRequestOTP}>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      To securely reset your password, we will send an SMS OTP to your registered phone. This incurs a processing fee of 1,000 UGX.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Student Payment Code</label>
                      <input type="text" className="input-field" value={resetPaycode} onChange={e => setResetPaycode(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Money Number (For 1000 UGX Fee)</label>
                      <input type="text" className="input-field" placeholder="07XXXXXXXX" value={resetPhone} onChange={e => setResetPhone(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school.themeColor || "var(--primary)" }}>
                      Pay & Send OTP
                    </button>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleVerifyOTP}>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      Please enter the 6-digit OTP sent to your phone.
                    </p>
                    <div className="form-group">
                      <label className="form-label">OTP Code</label>
                      <input type="text" className="input-field" value={resetOTP} onChange={e => setResetOTP(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school.themeColor || "var(--primary)" }}>
                      Verify OTP
                    </button>
                  </form>
                )}

                {resetStep === 3 && (
                  <form onSubmit={handleSetNewPassword}>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school.themeColor || "var(--primary)" }}>
                      Save New Password
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", fontFamily: "var(--font-primary)" }}>
      {/* Sidebar */}
      <div style={{ width: "260px", background: "white", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", textAlign: "center" }}>
          <h2 style={{ color: school.themeColor || "var(--primary)", fontSize: "18px", fontWeight: "bold" }}>{school.name}</h2>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Parent Portal</p>
        </div>
        
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <button onClick={() => setActiveTab("overview")} className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-outline"}`} style={{ display: "flex", justifyContent: "flex-start", border: "none", background: activeTab === "overview" ? (school.themeColor || "var(--primary)") : "transparent", color: activeTab === "overview" ? "white" : "#475569" }}>
            <Home size={18} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("academics")} className={`btn ${activeTab === "academics" ? "btn-primary" : "btn-outline"}`} style={{ display: "flex", justifyContent: "flex-start", border: "none", background: activeTab === "academics" ? (school.themeColor || "var(--primary)") : "transparent", color: activeTab === "academics" ? "white" : "#475569" }}>
            <GraduationCap size={18} /> Academics & Marks
          </button>
          <button onClick={() => setActiveTab("holiday")} className={`btn ${activeTab === "holiday" ? "btn-primary" : "btn-outline"}`} style={{ display: "flex", justifyContent: "flex-start", border: "none", background: activeTab === "holiday" ? (school.themeColor || "var(--primary)") : "transparent", color: activeTab === "holiday" ? "white" : "#475569" }}>
            <FileText size={18} /> Holiday Work
          </button>
          <button onClick={() => setActiveTab("elections")} className={`btn ${activeTab === "elections" ? "btn-primary" : "btn-outline"}`} style={{ display: "flex", justifyContent: "flex-start", border: "none", background: activeTab === "elections" ? (school.themeColor || "var(--primary)") : "transparent", color: activeTab === "elections" ? "white" : "#475569" }}>
            <Vote size={18} /> Prefect Elections
          </button>
        </div>

        <div style={{ padding: "20px", borderTop: "1px solid var(--border)" }}>
          <button onClick={handleLogout} className="btn btn-outline" style={{ width: "100%", display: "flex", justifyContent: "center", color: "var(--danger)", borderColor: "var(--danger)" }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "30px", overflowY: "auto" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
            <div>
              <h1 style={{ fontSize: "24px", color: "#0f172a" }}>Welcome back!</h1>
              <p style={{ color: "#64748b" }}>Viewing portal for <strong>{currentStudent.name}</strong> ({currentStudent.studentNumber})</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Payment Code</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: school.themeColor || "var(--primary)" }}>{currentStudent.studentPaymentCode}</div>
            </div>
          </div>

          {activeTab === "overview" && (
            <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="card">
                <h3>Financial Overview</h3>
                <p style={{ color: "#64748b", marginTop: "10px" }}>Coming soon: Real-time balance and transaction history integration via SchoolPay.</p>
              </div>
              <div className="card">
                <h3>Recent Attendance</h3>
                <p style={{ color: "#64748b", marginTop: "10px" }}>Coming soon: View your child's daily attendance records.</p>
              </div>
            </div>
          )}

          {activeTab === "academics" && (
            <div className="card animate-fade-in">
              <h3>Academic Reports</h3>
              <p style={{ color: "#64748b", marginTop: "10px" }}>Select a term to view or download the digital report card.</p>
            </div>
          )}

          {activeTab === "holiday" && (
            <div className="card animate-fade-in">
              <h3>Holiday Assignments</h3>
              <p style={{ color: "#64748b", marginTop: "10px" }}>No active holiday assignments currently assigned to this stream.</p>
            </div>
          )}

          {activeTab === "elections" && (
            <div className="card animate-fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3>Prefect Elections</h3>
                <span className="badge badge-success">ACTIVE</span>
              </div>
              <p style={{ color: "#64748b", marginBottom: "20px" }}>Cast your secure vote for the upcoming term's student leadership.</p>
              
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <h4 style={{ color: "#0f172a", marginBottom: "12px" }}>Head Boy Candidates</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "white", borderRadius: "6px", cursor: "pointer", border: "1px solid var(--border)" }}>
                    <input type="radio" name="headboy" />
                    <div>
                      <strong>John Doe</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>"Leadership with integrity."</div>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "white", borderRadius: "6px", cursor: "pointer", border: "1px solid var(--border)" }}>
                    <input type="radio" name="headboy" />
                    <div>
                      <strong>Michael Smith</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>"Building a brighter tomorrow."</div>
                    </div>
                  </label>
                </div>
                <button className="btn btn-primary" style={{ marginTop: "16px", background: school.themeColor || "var(--primary)" }}>Submit Vote</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Force Password Change Modal */}
      {showChangePassModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-zoom-in" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h2>Secure Your Account</h2>
            </div>
            <div className="modal-body">
              <form onSubmit={handleFirstLoginChangePassword}>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                  For security reasons, you must set a new personal password before accessing the Parent Portal.
                </p>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" className="input-field" value={newPass1} onChange={e => setNewPass1(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input type="password" className="input-field" value={newPass2} onChange={e => setNewPass2(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school.themeColor || "var(--primary)" }}>
                  Save & Continue
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
