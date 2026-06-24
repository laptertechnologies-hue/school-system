"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { 
  authenticateParent, updateParentPassword, initiateMarzpayCollection, checkMarzpayCollectionStatus,
  getSchoolBySubdomain, getParentContactByPaycode,
  getClasses, getStreams, getSubjects, getExamPapers, getMarks, getFeeStructures, getStudentPayments, getGradeRanges, sendRealSms
} from "@/lib/services";
import { School, Student, Election, HolidayWork, Class, Stream, Subject, ExamPaper, Mark, FeeStructure, StudentPayment, GradeRange } from "@/lib/types";
import { Lock, User as UserIcon, LogOut, CheckCircle, RefreshCcw, Home, FileText, Vote, GraduationCap, X, ChevronRight } from "lucide-react";

// For securely generating hashes
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ParentPortal({ params }: { params: Promise<{ subdomain: string }> }) {
  const resolvedParams = React.use(params);
  const subdomain = resolvedParams.subdomain;
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
  const [resetStudentId, setResetStudentId] = useState("");
  const [resetOTP, setResetOTP] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: Lookup, 2: Confirm Payment, 3: OTP, 4: New Password
  const [newPassword, setNewPassword] = useState("");

  // Change Password Modal (First Login)
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [newPass1, setNewPass1] = useState("");
  const [newPass2, setNewPass2] = useState("");

  // Dashboard State
  const [activeTab, setActiveTab] = useState("overview");

  // Data State
  const [classes, setClasses] = useState<Class[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examPapers, setExamPapers] = useState<ExamPaper[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>([]);
  
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const init = async () => {
      const s = await getSchoolBySubdomain(subdomain);
      setSchool(s || null);
      
      if (s) {
        setClasses(await getClasses(s.id));
        setStreams(await getStreams(s.id));
        setSubjects(await getSubjects(s.id));
        setExamPapers(await getExamPapers(s.id));
        setMarks(await getMarks(s.id));
        setFeeStructures(await getFeeStructures(s.id));
        setStudentPayments(await getStudentPayments(s.id));
        setGradeRanges(await getGradeRanges(s.id));
      }

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
  }, [subdomain]);

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
  const handleLookupAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPaycode) return toast.error("Please enter the student payment code.");
    const toastId = toast.loading("Looking up account...");
    try {
      const res = await getParentContactByPaycode(subdomain, resetPaycode);
      if (res.contact && res.studentId) {
        setResetPhone(res.contact);
        setResetStudentId(res.studentId);
        toast.success("Account found!", { id: toastId });
        setResetStep(2);
      } else {
        toast.error("Account not found or no phone number attached.", { id: toastId });
      }
    } catch (err) {
      toast.error("Lookup failed.", { id: toastId });
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Initiating mobile money charge (500 UGX)...");
    try {
      const res = await initiateMarzpayCollection(500, "mobile_money", resetPhone, "Parent Password Reset SMS");
      if (!res?.success || !res.transaction_uuid) {
        toast.error(res?.message || "Failed to initiate payment.", { id: toastId });
        return;
      }

      toast.loading("A push prompt has been sent to your phone. Please approve the 500 UGX charge...", { id: toastId });

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

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(otp); 
      
      const smsRes = await sendRealSms([resetPhone], `Your Parent Portal reset OTP is ${otp}. Please enter this to reset your password.`);
      if (!smsRes.success) {
        toast.error("Payment received, but SMS failed to send. Please contact admin.", { id: toastId });
      } else {
        toast.success("Payment successful! OTP has been sent via SMS.", { id: toastId });
        setResetStep(3);
      }

    } catch (err: any) {
      toast.error("Error during reset request: " + (err.message || err), { id: toastId });
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetOTP === generatedOTP) {
      toast.success("OTP Verified.");
      setResetStep(4);
    } else {
      toast.error("Invalid OTP.");
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) return toast.error("Password must be at least 4 characters.");
    
    const toastId = toast.loading("Saving new password...");
    try {
      const hash = await sha256(newPassword);
      const success = await updateParentPassword(resetStudentId, hash);
      if (success) {
        toast.success("Password reset successfully! You can now log in.", { id: toastId });
        setShowForgotModal(false);
        setResetStep(1);
        setResetPaycode("");
        setResetPhone("");
        setResetOTP("");
        setNewPassword("");
      } else {
        toast.error("Failed to update password in database.", { id: toastId });
      }
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
            {school.logoUrl && (
              <img src={school.logoUrl} alt={`${school.name} Logo`} style={{ maxWidth: "80px", maxHeight: "80px", borderRadius: "10px", objectFit: "contain", background: "white", padding: "4px", marginBottom: "16px", display: "inline-block" }} />
            )}
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
                  <form onSubmit={handleLookupAccount}>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      Enter your Student Payment Code to securely locate your account.
                    </p>
                    <div className="form-group">
                      <label className="form-label">Student Payment Code</label>
                      <input type="text" className="input-field" value={resetPaycode} onChange={e => setResetPaycode(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school?.themeColor || "var(--primary)" }}>
                      Find Account
                    </button>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleConfirmPayment}>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      Account found! We will send an SMS OTP to your registered phone number (ending in {resetPhone.slice(-4)}).
                    </p>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      A processing fee of <strong>500 UGX</strong> is required to dispatch the SMS.
                    </p>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school?.themeColor || "var(--primary)" }}>
                      Pay 500 UGX & Send SMS
                    </button>
                  </form>
                )}

                {resetStep === 3 && (
                  <form onSubmit={handleVerifyOTP}>
                    <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                      Please enter the 6-digit OTP sent to your phone.
                    </p>
                    <div className="form-group">
                      <label className="form-label">OTP Code</label>
                      <input type="text" className="input-field" value={resetOTP} onChange={e => setResetOTP(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school?.themeColor || "var(--primary)" }}>
                      Verify OTP
                    </button>
                  </form>
                )}

                {resetStep === 4 && (
                  <form onSubmit={handleSetNewPassword}>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", background: school?.themeColor || "var(--primary)" }}>
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
            <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="card" style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: "80px", height: "80px", objectFit: "contain", borderRadius: "10px", padding: "4px", background: "white", border: "1px solid var(--border)" }} />}
                <div>
                  <h3 style={{ fontSize: "20px", color: school.themeColor || "var(--primary)" }}>{currentStudent.name}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px", fontSize: "14px", color: "#475569" }}>
                    <div><strong>Admission No:</strong> {currentStudent.studentNumber}</div>
                    <div><strong>Gender:</strong> {currentStudent.gender}</div>
                    <div><strong>Class:</strong> {classes.find(c => c.id === currentStudent.classId)?.name || "Unknown"} {streams.find(st => st.id === currentStudent.streamId)?.name || ""}</div>
                    <div><strong>Boarding:</strong> {currentStudent.type === "BOARDING" ? "Boarding Student" : "Day Scholar"}</div>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3>Financial Overview</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginTop: "15px" }}>
                  <div style={{ padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase" }}>Expected Fees</div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a" }}>
                      {(() => {
                        const fs = feeStructures.find(f => f.classId === currentStudent.classId);
                        const expected = fs ? (currentStudent.type === "BOARDING" ? fs.tuitionAmount + fs.boardingAmount : fs.tuitionAmount) : 0;
                        return `${expected.toLocaleString()} UGX`;
                      })()}
                    </div>
                  </div>
                  <div style={{ padding: "15px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <div style={{ fontSize: "12px", color: "#166534", textTransform: "uppercase" }}>Total Paid</div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#15803d" }}>
                      {(() => {
                        const totalPaid = studentPayments.filter(p => p.studentId === currentStudent.id).reduce((sum, p) => sum + p.amountPaid, 0);
                        return `${totalPaid.toLocaleString()} UGX`;
                      })()}
                    </div>
                  </div>
                  <div style={{ padding: "15px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: "12px", color: "#991b1b", textTransform: "uppercase" }}>Outstanding Balance</div>
                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#b91c1c" }}>
                      {(() => {
                        const fs = feeStructures.find(f => f.classId === currentStudent.classId);
                        const expected = fs ? (currentStudent.type === "BOARDING" ? fs.tuitionAmount + fs.boardingAmount : fs.tuitionAmount) : 0;
                        const totalPaid = studentPayments.filter(p => p.studentId === currentStudent.id).reduce((sum, p) => sum + p.amountPaid, 0);
                        const bal = expected - totalPaid;
                        return bal > 0 ? `${bal.toLocaleString()} UGX` : "Cleared";
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "academics" && (
            <div className="card animate-fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3>Academic Reports</h3>
                <div style={{ display: "flex", gap: "10px" }}>
                  <select className="input-field" value={selectedTerm} onChange={e => setSelectedTerm(parseInt(e.target.value))} style={{ padding: "6px 12px", height: "auto" }}>
                    <option value={1}>Term 1</option>
                    <option value={2}>Term 2</option>
                    <option value={3}>Term 3</option>
                  </select>
                  <select className="input-field" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} style={{ padding: "6px 12px", height: "auto" }}>
                    {[new Date().getFullYear(), new Date().getFullYear()-1].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      {examPapers.filter(p => p.term === selectedTerm && p.year === selectedYear).map(p => (
                        <th key={p.id}>{p.name} ({p.maxMarks})</th>
                      ))}
                      <th>Total</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(sub => {
                      const papers = examPapers.filter(p => p.term === selectedTerm && p.year === selectedYear);
                      if (papers.length === 0) return null;
                      
                      let total = 0;
                      let hasMarks = false;
                      const rowMarks = papers.map(p => {
                        const m = marks.find(x => x.studentId === currentStudent.id && x.examPaperId === p.id && x.subjectId === sub.id);
                        if (m) { total += m.score; hasMarks = true; }
                        return m ? m.score : "-";
                      });
                      
                      if (!hasMarks) return null;

                      let grade = "";
                      const percentage = total; 
                      const range = gradeRanges.find(r => percentage >= r.minMark && percentage <= r.maxMark);
                      if (range) { grade = range.grade; }

                      return (
                        <tr key={sub.id}>
                          <td><strong>{sub.name}</strong></td>
                          {rowMarks.map((m, i) => <td key={i}>{m}</td>)}
                          <td><strong>{total}</strong></td>
                          <td><span className="badge" style={{ background: "#e2e8f0", color: "#0f172a" }}>{grade || "N/A"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
