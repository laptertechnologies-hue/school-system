"use client";
import React, { useState, useEffect, use } from "react";
import { dataService, School, User, Class, Stream, Student, Subject, ExamPaper, Mark, Payment, FeeStructure, StudentPayment, Expense } from "../../../lib/services";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Award, 
  DollarSign, 
  TrendingUp, 
  PlusCircle, 
  LogOut, 
  Lock, 
  UserCheck, 
  ChevronRight,
  ClipboardList,
  Layers,
  Settings,
  Printer,
  ChevronDown,
  Info,
  XCircle,
  FileText
} from "lucide-react";

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

export default function SchoolPortal({ params }: PageProps) {
  const resolvedParams = use(params);
  const subdomain = resolvedParams.subdomain;

  // Active view session states
  const [school, setSchool] = useState<School | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Data collections
  const [classes, setClasses] = useState<Class[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  
  // Finance state (Premium only)
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Navigation state inside dashboard
  const [activeTab, setActiveTab] = useState("overview");

  // Setup form states
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState<"PRIMARY" | "SECONDARY">("PRIMARY");
  const [newStreamClassId, setNewStreamClassId] = useState("");
  const [newStreamName, setNewStreamName] = useState("");
  
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("password");
  const [newTeacherRole, setNewTeacherRole] = useState<"TEACHER" | "DOS" | "HEADTEACHER" | "DIRECTOR">("TEACHER");

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNumber, setNewStudentNumber] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState("");
  const [newStudentStreamId, setNewStudentStreamId] = useState("");
  const [newStudentType, setNewStudentType] = useState<"DAY" | "BOARDING">("DAY");

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectClassId, setNewSubjectClassId] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");

  // DOS exam state
  const [newExamName, setNewExamName] = useState("");
  const [newExamTerm, setNewExamTerm] = useState("1");
  const [newExamYear, setNewExamYear] = useState("2026");
  const [newExamIsNewCurriculum, setNewExamIsNewCurriculum] = useState(false);

  // Teacher marks entry states
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [inputScores, setInputScores] = useState<{ [studentId: string]: string }>({});
  const [inputComments, setInputComments] = useState<{ [studentId: string]: string }>({});

  // Finance form states
  const [selectedFeeClassId, setSelectedFeeClassId] = useState("");
  const [tuitionAmount, setTuitionAmount] = useState("");
  const [boardingAmount, setBoardingAmount] = useState("");
  
  const [selectedPayStudentId, setSelectedPayStudentId] = useState("");
  const [payAmountPaid, setPayAmountPaid] = useState("");

  const [expCategory, setExpCategory] = useState("Salaries");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");

  // Report Card selection
  const [selectedReportClassId, setSelectedReportClassId] = useState("");
  const [selectedReportTerm, setSelectedReportTerm] = useState("1");
  const [selectedReportStudent, setSelectedReportStudent] = useState<Student | null>(null);

  // Load School on mount
  useEffect(() => {
    async function fetchSchool() {
      setLoading(true);
      const s = await dataService.getSchoolBySubdomain(subdomain);
      setSchool(s);
      
      // Auto login in demo mode for ease of use
      if (s) {
        if (s.subdomain === "greenhill") {
          setEmail("admin@greenhill.ug");
          setPassword("password");
        } else if (s.subdomain === "kpps") {
          setEmail("admin@kpps.ac.ug");
          setPassword("password");
        }
      }
      setLoading(false);
    }
    fetchSchool();
  }, [subdomain]);

  // Load core school data when logged in
  const loadSchoolData = async (schoolId: string) => {
    try {
      const cls = await dataService.getClasses(schoolId);
      const strms = await dataService.getStreams(schoolId);
      const studs = await dataService.getStudents(schoolId);
      const subjs = await dataService.getSubjects(schoolId);
      const exms = await dataService.getExamPapers(schoolId);
      const mrks = await dataService.getMarks(schoolId);

      setClasses(cls);
      setStreams(strms);
      setStudents(studs);
      setSubjects(subjs);
      setExams(exms);
      setMarks(mrks);

      // Pre-fill lists
      if (cls.length > 0) {
        setNewStreamClassId(cls[0].id);
        setNewStudentClassId(cls[0].id);
        setNewSubjectClassId(cls[0].id);
        setSelectedClassId(cls[0].id);
        setSelectedFeeClassId(cls[0].id);
        setSelectedReportClassId(cls[0].id);
      }

      // Pre-fill stream mapping
      const classStreams = strms.filter(st => st.classId === (cls[0]?.id || ""));
      if (classStreams.length > 0) {
        setNewStudentStreamId(classStreams[0].id);
        setSelectedStreamId(classStreams[0].id);
      }

      if (exms.length > 0) {
        setSelectedExamId(exms[0].id);
      }

      if (subjs.length > 0) {
        setSelectedSubjectId(subjs[0].id);
      }

      if (school?.packageType === "PREMIUM") {
        setFeeStructures(await dataService.getFeeStructures(schoolId));
        setStudentPayments(await dataService.getStudentPayments(schoolId));
        setExpenses(await dataService.getExpenses(schoolId));
        if (studs.length > 0) {
          setSelectedPayStudentId(studs[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!school) return;

    if (school.status !== "ACTIVE") {
      setAuthError("This school's account is pending activation. Please pay/contact super admin.");
      return;
    }

    const user = await dataService.authenticateUser(email, password, subdomain);
    if (user) {
      setCurrentUser(user);
      await loadSchoolData(school.id);
      // Auto tab based on role
      if (user.role === "TEACHER") setActiveTab("marks");
      else if (user.role === "DOS") setActiveTab("exams");
      else if (user.role === "DIRECTOR" && school.packageType === "PREMIUM") setActiveTab("finance");
      else setActiveTab("overview");
    } else {
      setAuthError("Invalid username or password.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmail("");
    setPassword("");
  };

  // Create class handler
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !school) return;
    await dataService.createClass(school.id, newClassName, newClassLevel);
    setNewClassName("");
    await loadSchoolData(school.id);
  };

  // Create stream handler
  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName || !newStreamClassId || !school) return;
    await dataService.createStream(newStreamClassId, newStreamName);
    setNewStreamName("");
    await loadSchoolData(school.id);
  };

  // Create staff user handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherEmail || !school) return;
    await dataService.createUser({
      schoolId: school.id,
      name: newTeacherName,
      email: newTeacherEmail,
      passwordHash: newTeacherPassword,
      role: newTeacherRole,
    });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("password");
    alert("Staff member user account created!");
  };

  // Create student handler
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentNumber || !newStudentClassId || !newStudentStreamId || !school) return;
    await dataService.createStudent({
      schoolId: school.id,
      classId: newStudentClassId,
      streamId: newStudentStreamId,
      name: newStudentName,
      studentNumber: newStudentNumber,
      type: newStudentType,
    });
    setNewStudentName("");
    setNewStudentNumber("");
    await loadSchoolData(school.id);
    alert("Student registered successfully!");
  };

  // Create subject handler
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName || !newSubjectClassId || !school) return;
    await dataService.createSubject({
      schoolId: school.id,
      classId: newSubjectClassId,
      name: newSubjectName,
      code: newSubjectCode,
    });
    setNewSubjectName("");
    setNewSubjectCode("");
    await loadSchoolData(school.id);
  };

  // Create exam paper
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName || !school) return;
    await dataService.createExamPaper({
      schoolId: school.id,
      name: newExamName,
      term: parseInt(newExamTerm),
      year: parseInt(newExamYear),
      maxMarks: 100,
      isNewCurriculum: newExamIsNewCurriculum,
    });
    setNewExamName("");
    await loadSchoolData(school.id);
    alert("Exam Paper scheduled!");
  };

  // Compute PLE Grade (1 to 9) from raw numeric score
  const computePLEGrade = (score: number): string => {
    if (score >= 90) return "1"; // D1
    if (score >= 80) return "2"; // D2
    if (score >= 70) return "3"; // C3
    if (score >= 60) return "4"; // C4
    if (score >= 55) return "5"; // C5
    if (score >= 50) return "6"; // C6
    if (score >= 45) return "7"; // P7
    if (score >= 40) return "8"; // P8
    return "9"; // F9
  };

  // Compute CBC competence letter (A, B, C, D, E)
  const computeCBCGrade = (score: number): string => {
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 55) return "C";
    if (score >= 40) return "D";
    return "E";
  };

  // Save marks for a class
  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedSubjectId || !currentUser) {
      alert("Please select exam and subject first.");
      return;
    }

    const currentExam = exams.find(ex => ex.id === selectedExamId);
    if (!currentExam) return;

    try {
      for (const studentId of Object.keys(inputScores)) {
        const rawScore = parseFloat(inputScores[studentId]);
        if (isNaN(rawScore) || rawScore < 0 || rawScore > currentExam.maxMarks) continue;

        let compGrade = "";
        if (currentExam.isNewCurriculum) {
          compGrade = computeCBCGrade(rawScore);
        } else {
          compGrade = computePLEGrade(rawScore);
        }

        await dataService.addMark({
          studentId,
          examPaperId: selectedExamId,
          subjectId: selectedSubjectId,
          score: rawScore,
          competencyGrade: compGrade,
          comments: inputComments[studentId] || "Good attempt",
          createdById: currentUser.id,
        });
      }
      alert("Marks saved successfully!");
      await loadSchoolData(school!.id);
      setInputScores({});
      setInputComments({});
    } catch (err) {
      alert("Error saving marks");
    }
  };

  // Record school fee structure
  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeeClassId || !tuitionAmount || !boardingAmount || !school) return;
    await dataService.createFeeStructure({
      schoolId: school.id,
      classId: selectedFeeClassId,
      term: 1, // Mock term 1
      year: 2026,
      tuitionAmount: parseFloat(tuitionAmount),
      boardingAmount: parseFloat(boardingAmount),
    });
    setTuitionAmount("");
    setBoardingAmount("");
    await loadSchoolData(school.id);
    alert("Fee structure saved!");
  };

  // Record student fee payment
  const handleRecordStudentPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayStudentId || !payAmountPaid || !school) return;

    // Find class of student to calculate balance
    const stud = students.find(s => s.id === selectedPayStudentId);
    if (!stud) return;

    const fs = feeStructures.find(f => f.classId === stud.classId);
    const totalDue = stud.type === "BOARDING" 
      ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
      : (fs?.tuitionAmount || 0);

    const paidVal = parseFloat(payAmountPaid);
    
    // Find prior payment
    const prevPayment = studentPayments.find(p => p.studentId === selectedPayStudentId);
    const alreadyPaid = prevPayment ? prevPayment.amountPaid : 0;
    const newTotalPaid = alreadyPaid + paidVal;
    const balance = Math.max(0, totalDue - newTotalPaid);

    await dataService.recordStudentPayment({
      studentId: selectedPayStudentId,
      term: 1,
      year: 2026,
      amountPaid: newTotalPaid,
      balance,
    });

    setPayAmountPaid("");
    await loadSchoolData(school.id);
    alert("Student payment recorded!");
  };

  // Record expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !school) return;
    await dataService.createExpense({
      schoolId: school.id,
      category: expCategory,
      amount: parseFloat(expAmount),
      description: expDesc,
    });
    setExpAmount("");
    setExpDesc("");
    await loadSchoolData(school.id);
    alert("Expense recorded!");
  };

  // Generate PLE Report Card Data
  const getPLEReportDetails = (studentId: string) => {
    const studentMarks = marks.filter(m => m.studentId === studentId);
    
    // Find EOT marks
    const eotExam = exams.find(e => e.term === parseInt(selectedReportTerm) && e.name.includes("End of Term"));
    if (!eotExam) return null;

    const termMarks = studentMarks.filter(m => m.examPaperId === eotExam.id);
    
    // Sum aggregates
    let aggregateSum = 0;
    let missingSubject = false;
    
    const subjectGrades = termMarks.map(m => {
      const subj = subjects.find(s => s.id === m.subjectId);
      const grade = parseInt(m.competencyGrade || "9");
      aggregateSum += grade;
      return {
        subjectName: subj?.name || "Unknown",
        score: m.score,
        grade,
        comment: m.comments,
      };
    });

    // We expect 4 subjects for Primary PLE
    if (subjectGrades.length < 4) {
      missingSubject = true;
    }

    let division = "U";
    if (!missingSubject) {
      if (aggregateSum <= 12) division = "I";
      else if (aggregateSum <= 23) division = "II";
      else if (aggregateSum <= 29) division = "III";
      else if (aggregateSum <= 34) division = "IV";
      else division = "U";
    }

    return {
      subjects: subjectGrades,
      aggregate: missingSubject ? "N/A" : aggregateSum,
      division: missingSubject ? "Ungraded (Incomplete)" : division,
    };
  };

  // Print Report Card Utility
  const triggerPrint = () => {
    window.print();
  };

  // Loading indicator
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white" }}>
        <h2>Loading School Portal...</h2>
      </div>
    );
  }

  // School domain missing or invalid
  if (!school) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white", padding: "20px", textAlign: "center" }}>
        <div>
          <XCircle size={48} color="var(--danger)" style={{ marginBottom: "16px" }} />
          <h2>School Portal Not Found</h2>
          <p style={{ color: "#9ca3af", marginTop: "8px" }}>The requested subdomain "{subdomain}" does not exist in our systems.</p>
          <a href="/" className="btn btn-primary" style={{ marginTop: "24px" }}>Go to Main Website</a>
        </div>
      </div>
    );
  }

  // Render Login Gate
  if (!currentUser) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "20px" }}>
        <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "450px", background: "#1e293b", borderColor: "#334155" }}>
          
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={{ background: "rgba(59, 130, 246, 0.15)", padding: "16px", borderRadius: "50%", display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "16px" }}>
              <GraduationCap size={40} color="var(--primary)" />
            </div>
            <h2 style={{ color: "white" }}>{school.name}</h2>
            <span style={{ fontSize: "11px", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "1px" }}>School Management System</span>
          </div>

          {authError && (
            <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "13px", marginBottom: "20px" }}>
              {authError}
            </div>
          )}

          {/* Trial / Demo Guidance */}
          {(subdomain === "greenhill" || subdomain === "kpps") && (
            <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.15)", borderRadius: "8px", padding: "12px", marginBottom: "20px", fontSize: "12px", color: "#93c5fd" }}>
              <strong style={{ display: "block", marginBottom: "4px" }}>🔑 Trial Demo Quick Credentials:</strong>
              <div><strong>Admin:</strong> admin@greenhill.ug (password: password)</div>
              <div><strong>Teacher:</strong> teacher@greenhill.ug (password: password)</div>
              <div><strong>DOS:</strong> dos@greenhill.ug (password: password)</div>
              <div><strong>Director:</strong> director@greenhill.ug (password: password)</div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" style={{ color: "#d1d5db" }}>Staff Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="e.g. teacher@greenhill.ug" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px" }}>
              <label className="form-label" style={{ color: "#d1d5db" }}>Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }}>
              Sign In to Portal
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a href="/" style={{ fontSize: "13px", color: "#9ca3af" }}>← Back to SchoolPro Main Website</a>
          </div>

        </div>
      </div>
    );
  }

  // Dashboard layout
  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#f1f5f9", color: "#1e293b" }}>
      
      {/* Sidebar navigation */}
      <aside style={{ width: "260px", background: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column" }} className="flex-mobile-col">
        <div style={{ padding: "24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: "10px" }}>
          <GraduationCap size={28} color="var(--primary)" />
          <div>
            <h3 style={{ color: "white", fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{school.name}</h3>
            <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{currentUser.role} Portal</span>
          </div>
        </div>

        <nav style={{ padding: "20px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
          {/* Universal view */}
          {["ADMIN", "HEADTEACHER", "DIRECTOR", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("overview")} 
              className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "overview" ? "white" : "#94a3b8" }}
            >
              <ClipboardList size={18} /> Overview
            </button>
          )}

          {/* School Setup (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("setup")} 
              className={`btn ${activeTab === "setup" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "setup" ? "white" : "#94a3b8" }}
            >
              <Settings size={18} /> School Setup Wizard
            </button>
          )}

          {/* DOS view */}
          {["ADMIN", "DOS", "HEADTEACHER"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("exams")} 
              className={`btn ${activeTab === "exams" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "exams" ? "white" : "#94a3b8" }}
            >
              <Layers size={18} /> Examination Papers
            </button>
          )}

          {/* Teachers view */}
          {["ADMIN", "TEACHER", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("marks")} 
              className={`btn ${activeTab === "marks" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "marks" ? "white" : "#94a3b8" }}
            >
              <Award size={18} /> Upload Student Marks
            </button>
          )}

          {/* Reports */}
          {["ADMIN", "HEADTEACHER", "DIRECTOR", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("reports")} 
              className={`btn ${activeTab === "reports" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "reports" ? "white" : "#94a3b8" }}
            >
              <FileText size={18} /> Report Cards
            </button>
          )}

          {/* Finance dashboard (Director only & Premium only) */}
          {["ADMIN", "DIRECTOR"].includes(currentUser.role) && school.packageType === "PREMIUM" && (
            <button 
              onClick={() => setActiveTab("finance")} 
              className={`btn ${activeTab === "finance" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "finance" ? "white" : "#94a3b8" }}
            >
              <DollarSign size={18} /> School Accounts
            </button>
          )}
        </nav>

        {/* User logout section */}
        <div style={{ padding: "20px", borderTop: "1px solid #1e293b" }} className="flex justify-between align-center">
          <div>
            <div style={{ fontWeight: 600, color: "white", fontSize: "13px" }}>{currentUser.name}</div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>{currentUser.email}</div>
          </div>
          <button onClick={handleLogout} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}>
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main style={{ flex: 1, padding: "40px" }} className="animate-fade-in">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div>
            <h2 style={{ marginBottom: "20px" }}>School Overview Summary</h2>
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-2" style={{ marginBottom: "40px" }}>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Users size={24} color="var(--primary)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>STUDENTS ENROLLED</span>
                  <h3>{students.length} Pupils</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <BookOpen size={24} color="var(--secondary)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>CLASSES</span>
                  <h3>{classes.length} Streams</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Award size={24} color="var(--success)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>EXAMS RECORDED</span>
                  <h3>{exams.length} Scheduled</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <TrendingUp size={24} color="var(--warning)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>CURRICULUMS</span>
                  <h3>PLE & Secondary</h3>
                </div>
              </div>
            </div>

            {/* School Roster lists */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card">
                <h3 style={{ marginBottom: "16px" }}>Recent Student Registrations</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student No</th>
                        <th>Name</th>
                        <th>Class</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 5).map(s => {
                        const cl = classes.find(c => c.id === s.classId);
                        const st = streams.find(st => st.id === s.streamId);
                        return (
                          <tr key={s.id}>
                            <td>{s.studentNumber}</td>
                            <td><strong>{s.name}</strong></td>
                            <td>{cl?.name} ({st?.name})</td>
                            <td>
                              <span className={`badge ${s.type === "BOARDING" ? "badge-success" : "badge-primary"}`}>
                                {s.type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: "16px" }}>Curriculum Subjects List</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Class</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(sub => {
                        const cl = classes.find(c => c.id === sub.classId);
                        return (
                          <tr key={sub.id}>
                            <td><strong>{sub.code || "N/A"}</strong></td>
                            <td>{sub.name}</td>
                            <td>{cl?.name} ({cl?.level})</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SETUP WIZARD (Admin only) */}
        {activeTab === "setup" && (
          <div>
            <h2 style={{ marginBottom: "20px" }}>Admin Setup Wizard</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Initialize streams, subjects, staff members and import student details.</p>

            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: "30px" }}>
              
              {/* Add Class */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Configure New Class</h4>
                <form onSubmit={handleCreateClass}>
                  <div className="form-group">
                    <label className="form-label">Class Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. P1 or S1" 
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Curriculum Level</label>
                    <select 
                      className="input-field" 
                      value={newClassLevel}
                      onChange={(e) => setNewClassLevel(e.target.value as "PRIMARY" | "SECONDARY")}
                    >
                      <option value="PRIMARY">Primary Level (PLE / Standard Aggregates)</option>
                      <option value="SECONDARY">Secondary Level (New Curriculum CBC)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">Create Class</button>
                </form>
              </div>

              {/* Add Stream */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Configure Stream / Section</h4>
                <form onSubmit={handleCreateStream}>
                  <div className="form-group">
                    <label className="form-label">Select Class</label>
                    <select 
                      className="input-field" 
                      value={newStreamClassId}
                      onChange={(e) => setNewStreamClassId(e.target.value)}
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stream Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Red, Blue, North" 
                      value={newStreamName}
                      onChange={(e) => setNewStreamName(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Create Stream</button>
                </form>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: "30px" }}>
              
              {/* Register Student */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Register Student Details</h4>
                <form onSubmit={handleCreateStudent}>
                  <div className="form-group">
                    <label className="form-label">Student Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Namusoke Joy" 
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Select Class</label>
                      <select 
                        className="input-field" 
                        value={newStudentClassId}
                        onChange={(e) => {
                          setNewStudentClassId(e.target.value);
                          const strms = streams.filter(s => s.classId === e.target.value);
                          if (strms.length > 0) setNewStudentStreamId(strms[0].id);
                        }}
                      >
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Select Stream</label>
                      <select 
                        className="input-field" 
                        value={newStudentStreamId}
                        onChange={(e) => setNewStudentStreamId(e.target.value)}
                      >
                        {streams.filter(st => st.classId === newStudentClassId).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Student ID Number</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="GH-2026-X" 
                        value={newStudentNumber}
                        onChange={(e) => setNewStudentNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Attendance Type</label>
                      <select 
                        className="input-field" 
                        value={newStudentType}
                        onChange={(e) => setNewStudentType(e.target.value as "DAY" | "BOARDING")}
                      >
                        <option value="DAY">Day Student</option>
                        <option value="BOARDING">Boarding Student</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Register Student</button>
                </form>
              </div>

              {/* Create Staff */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Add Teacher & Staff Accounts</h4>
                <form onSubmit={handleCreateStaff}>
                  <div className="form-group">
                    <label className="form-label">Staff Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Opio Peter" 
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Login Email</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      placeholder="opio@greenhill.ug" 
                      value={newTeacherEmail}
                      onChange={(e) => setNewTeacherEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Temporary Password</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newTeacherPassword}
                        onChange={(e) => setNewTeacherPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Administrative Role</label>
                      <select 
                        className="input-field" 
                        value={newTeacherRole}
                        onChange={(e) => setNewTeacherRole(e.target.value as any)}
                      >
                        <option value="TEACHER">Subject Teacher</option>
                        <option value="DOS">Director of Studies (DOS)</option>
                        <option value="HEADTEACHER">Head Teacher</option>
                        <option value="DIRECTOR">Director (Financial View)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create User Credentials</button>
                </form>
              </div>

            </div>

            {/* Configure Subjects */}
            <div className="card" style={{ maxWidth: "600px" }}>
              <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Add Subject</h4>
              <form onSubmit={handleCreateSubject} className="flex flex-col gap-2">
                <div className="form-group">
                  <label className="form-label">Subject Title</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Mathematics" 
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Select Class</label>
                    <select 
                      className="input-field" 
                      value={newSubjectClassId}
                      onChange={(e) => setNewSubjectClassId(e.target.value)}
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject Code (e.g. ENG, MTC)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. MTC" 
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Add Subject</button>
              </form>
            </div>

          </div>
        )}

        {/* TAB 3: EXAMS CONFIG (DOS) */}
        {activeTab === "exams" && (
          <div>
            <h2 style={{ marginBottom: "20px" }}>DOS Examination Scheduler</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Create exam instances (e.g., Mid-Term, End-Term) to activate grading columns for teachers.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              {/* Form */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Schedule Examination</h4>
                <form onSubmit={handleCreateExam}>
                  <div className="form-group">
                    <label className="form-label">Exam Title Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. End of Term One" 
                      value={newExamName}
                      onChange={(e) => setNewExamName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Term ID</label>
                      <select className="input-field" value={newExamTerm} onChange={(e) => setNewExamTerm(e.target.value)}>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Academic Year</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={newExamYear}
                        onChange={(e) => setNewExamYear(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", margin: "14px 0" }}>
                    <input 
                      type="checkbox" 
                      id="cbc-check" 
                      checked={newExamIsNewCurriculum}
                      onChange={(e) => setNewExamIsNewCurriculum(e.target.checked)}
                    />
                    <label htmlFor="cbc-check" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                      New Curriculum CBC Exam (Grade Letters A-E)
                    </label>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create Exam</button>
                </form>
              </div>

              {/* List */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Academic Exams Scheduled</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Exam Paper</th>
                        <th>Term</th>
                        <th>Year</th>
                        <th>Grading System</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map(ex => (
                        <tr key={ex.id}>
                          <td><strong>{ex.name}</strong></td>
                          <td>Term {ex.term}</td>
                          <td>{ex.year}</td>
                          <td>
                            <span className={`badge ${ex.isNewCurriculum ? "badge-success" : "badge-primary"}`}>
                              {ex.isNewCurriculum ? "New CBC Curriculum (A-E)" : "Primary PLE Aggregates (1-9)"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEACHER MARKS UPLOAD */}
        {activeTab === "marks" && (
          <div>
            <h2 style={{ marginBottom: "10px" }}>Marks Upload Portal</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Select exam paper, class, stream, and subject, then save scores.</p>

            <div className="card" style={{ padding: "20px", marginBottom: "30px" }}>
              <div className="grid grid-cols-4 gap-2">
                <div className="form-group">
                  <label className="form-label">1. Choose Exam Paper</label>
                  <select className="input-field" value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
                    <option value="">-- Choose exam --</option>
                    {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name} (Term {ex.term})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">2. Choose Class</label>
                  <select 
                    className="input-field" 
                    value={selectedClassId} 
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      const filteredStreams = streams.filter(s => s.classId === e.target.value);
                      if (filteredStreams.length > 0) setSelectedStreamId(filteredStreams[0].id);
                    }}
                  >
                    <option value="">-- Choose class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">3. Choose Stream</label>
                  <select className="input-field" value={selectedStreamId} onChange={(e) => setSelectedStreamId(e.target.value)}>
                    <option value="">-- Choose stream --</option>
                    {streams.filter(st => st.classId === selectedClassId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">4. Choose Subject</label>
                  <select className="input-field" value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
                    <option value="">-- Choose subject --</option>
                    {subjects.filter(sub => sub.classId === selectedClassId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {selectedExamId && selectedClassId && selectedStreamId && selectedSubjectId && (
              <div className="card animate-fade-in">
                <div className="flex justify-between align-center" style={{ marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <ClipboardList size={22} color="var(--primary)" /> 
                      Record Scores: {subjects.find(s => s.id === selectedSubjectId)?.name} 
                    </h3>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Max marks for this paper is: {exams.find(e => e.id === selectedExamId)?.maxMarks || 100}
                    </span>
                  </div>
                  <button onClick={handleSaveMarks} className="btn btn-primary">Save Grid Marks</button>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student Name</th>
                        <th style={{ width: "180px" }}>Score</th>
                        <th>Competency Grade Indicator</th>
                        <th>Remarks / Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(st => st.classId === selectedClassId && st.streamId === selectedStreamId).map(st => {
                        // Find current recorded mark if any
                        const currentMark = marks.find(m => m.studentId === st.id && m.examPaperId === selectedExamId && m.subjectId === selectedSubjectId);
                        const isCBC = exams.find(e => e.id === selectedExamId)?.isNewCurriculum;

                        return (
                          <tr key={st.id}>
                            <td>{st.studentNumber}</td>
                            <td><strong>{st.name}</strong></td>
                            <td>
                              <input 
                                type="number" 
                                className="input-field" 
                                placeholder={currentMark ? String(currentMark.score) : "Enter Score"}
                                value={inputScores[st.id] !== undefined ? inputScores[st.id] : ""}
                                onChange={(e) => setInputScores({ ...inputScores, [st.id]: e.target.value })}
                                style={{ padding: "8px 12px" }}
                              />
                            </td>
                            <td>
                              {currentMark ? (
                                <span className={`badge ${isCBC ? "badge-success" : "badge-primary"}`}>
                                  {isCBC ? `CBC: ${currentMark.competencyGrade}` : `PLE: Grade ${currentMark.competencyGrade}`}
                                </span>
                              ) : (
                                <span style={{ fontStyle: "italic", fontSize: "12px", color: "#94a3b8" }}>No marks saved</span>
                              )}
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder={currentMark ? currentMark.comments || "Comment" : "e.g. Excellent progress"}
                                value={inputComments[st.id] !== undefined ? inputComments[st.id] : ""}
                                onChange={(e) => setInputComments({ ...inputComments, [st.id]: e.target.value })}
                                style={{ padding: "8px 12px" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: REPORT CARDS */}
        {activeTab === "reports" && (
          <div>
            <h2 style={{ marginBottom: "20px" }}>Student Report Cards</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Select a class to generate report cards. Click on a student to preview and print their official report.</p>

            <div className="grid grid-cols-3 gap-3">
              
              {/* Select Panel */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Filter Students</h4>
                <div className="form-group">
                  <label className="form-label">Select Class</label>
                  <select 
                    className="input-field" 
                    value={selectedReportClassId}
                    onChange={(e) => setSelectedReportClassId(e.target.value)}
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Term</label>
                  <select className="input-field" value={selectedReportTerm} onChange={(e) => setSelectedReportTerm(e.target.value)}>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>

                <h4 style={{ margin: "20px 0 10px" }}>Student List</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
                  {students.filter(st => st.classId === selectedReportClassId).map(st => (
                    <button 
                      key={st.id}
                      onClick={() => setSelectedReportStudent(st)}
                      className="btn btn-outline"
                      style={{ justifyContent: "space-between", padding: "10px", width: "100%", textAlign: "left", borderColor: selectedReportStudent?.id === st.id ? "var(--primary)" : "var(--border)" }}
                    >
                      <span>{st.name}</span>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                  {students.filter(st => st.classId === selectedReportClassId).length === 0 && (
                    <p style={{ fontStyle: "italic", color: "#64748b", fontSize: "13px" }}>No students registered in this class.</p>
                  )}
                </div>
              </div>

              {/* Preview Panel */}
              <div className="card" style={{ gridColumn: "span 2" }}>
                {selectedReportStudent ? (
                  <div>
                    {/* Header Controls */}
                    <div className="flex justify-between align-center" style={{ marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                      <h3>Preview Report Card</h3>
                      <button onClick={triggerPrint} className="btn btn-primary">
                        <Printer size={16} /> Print/Save PDF
                      </button>
                    </div>

                    {/* Report Card Template (Print Target) */}
                    <div id="printable-report" className="card" style={{ background: "white", color: "black", borderColor: "#cbd5e1", padding: "40px", fontFamily: "Arial, sans-serif" }}>
                      
                      {/* School Heading */}
                      <div style={{ textAlign: "center", borderBottom: "3px double black", paddingBottom: "14px", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "24px", margin: 0, textTransform: "uppercase", color: "#1e3a8a" }}>{school.name}</h2>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", fontStyle: "italic" }}>
                          P.O. Box Kampala, Uganda • Tel: {school.contactPhone} • Email: {school.contactEmail}
                        </p>
                        <h3 style={{ fontSize: "16px", margin: "10px 0 0", textTransform: "uppercase", textDecoration: "underline" }}>
                          OFFICIAL ACADEMIC REPORT CARD
                        </h3>
                      </div>

                      {/* Student Meta details */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", marginBottom: "20px", borderBottom: "1px solid #94a3b8", paddingBottom: "12px" }}>
                        <div><strong>Student Name:</strong> {selectedReportStudent.name}</div>
                        <div><strong>Class:</strong> {classes.find(c => c.id === selectedReportStudent.classId)?.name}</div>
                        <div><strong>Student Number:</strong> {selectedReportStudent.studentNumber}</div>
                        <div><strong>Academic Term:</strong> Term {selectedReportTerm} (2026)</div>
                        <div><strong>Residency Type:</strong> {selectedReportStudent.type}</div>
                        <div><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</div>
                      </div>

                      {/* Grades Table */}
                      <h4 style={{ textTransform: "uppercase", fontSize: "14px", marginBottom: "8px" }}>Academic Marks Assessment</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "20px" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9" }}>
                            <th style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "left" }}>Subject Title</th>
                            <th style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center" }}>Raw Mark (100)</th>
                            <th style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center" }}>Grade Column</th>
                            <th style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "left" }}>Teacher Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Filter Marks */}
                          {(() => {
                            const eotExam = exams.find(e => e.term === parseInt(selectedReportTerm));
                            if (!eotExam) return <tr><td colSpan={4} style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center", fontStyle: "italic" }}>No exams scheduled.</td></tr>;

                            const stMarks = marks.filter(m => m.studentId === selectedReportStudent.id && m.examPaperId === eotExam.id);
                            if (stMarks.length === 0) return <tr><td colSpan={4} style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center", fontStyle: "italic" }}>No scores uploaded for this student yet.</td></tr>;

                            return stMarks.map(m => {
                              const sub = subjects.find(s => s.id === m.subjectId);
                              const isCBC = eotExam.isNewCurriculum;
                              
                              return (
                                <tr key={m.id}>
                                  <td style={{ border: "1px solid #94a3b8", padding: "8px" }}>{sub?.name}</td>
                                  <td style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center" }}>{m.score}%</td>
                                  <td style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center", fontWeight: "bold" }}>
                                    {isCBC ? `CBC: ${m.competencyGrade}` : `PLE: ${m.competencyGrade}`}
                                  </td>
                                  <td style={{ border: "1px solid #94a3b8", padding: "8px" }}>{m.comments}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>

                      {/* PLE Summary if Primary */}
                      {classes.find(c => c.id === selectedReportStudent.classId)?.level === "PRIMARY" && (
                        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "13px" }}>
                          {(() => {
                            const pleDetails = getPLEReportDetails(selectedReportStudent.id);
                            if (!pleDetails) return <p style={{ fontStyle: "italic" }}>Report details unavailable.</p>;

                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div><strong>UNEB PLE Aggregate (4 subjects):</strong> {pleDetails.aggregate}</div>
                                <div><strong>Final Division Level:</strong> Division {pleDetails.division}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* CBC Info if Secondary */}
                      {classes.find(c => c.id === selectedReportStudent.classId)?.level === "SECONDARY" && (
                        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "12px", lineHeight: "1.4" }}>
                          <strong>CBC Grading Guideline:</strong> Grade A = Exceptional Competency, Grade B = Outstanding, Grade C = Satisfactory, Grade D = Basic, Grade E = Elementary.
                        </div>
                      )}

                      {/* Signatures */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px" }}>
                        <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>Class Teacher</div>
                        <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>Head Teacher</div>
                        <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>School Stamp</div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
                    <Info size={32} style={{ marginBottom: "12px" }} />
                    <p>Select a student from the sidebar filter list to generate and preview their official Uganda Academic Report Card.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB 6: PREMIUM FINANCE (Director/Admin only) */}
        {activeTab === "finance" && school.packageType === "PREMIUM" && (
          <div>
            <h2 style={{ marginBottom: "20px" }}>School Accounts Ledger</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Premium module: manage class tuition structures, log incoming payments, track defaulters, and log school expenses.</p>

            {/* Account Metrics */}
            <div className="grid grid-cols-3 gap-2" style={{ marginBottom: "35px" }}>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <DollarSign size={24} color="var(--success)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>TOTAL TUITION COLLECTED</span>
                  <h3>{studentPayments.reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} UGX</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <DollarSign size={24} color="var(--danger)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>TOTAL EXPENDITURE OUT</span>
                  <h3>{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} UGX</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <TrendingUp size={24} color="var(--primary)" />
                <div>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>NET BALANCE IN HAND</span>
                  <h3>
                    {(
                      studentPayments.reduce((sum, p) => sum + p.amountPaid, 0) -
                      expenses.reduce((sum, e) => sum + e.amount, 0)
                    ).toLocaleString()} UGX
                  </h3>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: "30px" }}>
              
              {/* Fee Structure configuration */}
              <div className="card">
                <h4>Set Term Class Fees Structure</h4>
                <form onSubmit={handleSaveFee} style={{ marginTop: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">Select Class</label>
                    <select 
                      className="input-field" 
                      value={selectedFeeClassId}
                      onChange={(e) => setSelectedFeeClassId(e.target.value)}
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Tuition / Day fee (UGX)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="e.g. 400000"
                        value={tuitionAmount}
                        onChange={(e) => setTuitionAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Extra Boarding fee (UGX)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="e.g. 750000"
                        value={boardingAmount}
                        onChange={(e) => setBoardingAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Save Fee Structure</button>
                </form>
              </div>

              {/* Record Student Payment */}
              <div className="card">
                <h4>Record Student Payment Receipt</h4>
                <form onSubmit={handleRecordStudentPay} style={{ marginTop: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">Select Student</label>
                    <select 
                      className="input-field" 
                      value={selectedPayStudentId}
                      onChange={(e) => setSelectedPayStudentId(e.target.value)}
                    >
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentNumber})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Received (UGX)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 250000"
                      value={payAmountPaid}
                      onChange={(e) => setPayAmountPaid(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Record Payment Receipt</button>
                </form>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3">
              
              {/* Defaulters list */}
              <div className="card">
                <h4>Fee Balances / Defaulters List</h4>
                <div className="table-container" style={{ marginTop: "14px" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Total Fee Due</th>
                        <th>Amount Paid</th>
                        <th>Outstanding Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(st => {
                        const fs = feeStructures.find(f => f.classId === st.classId);
                        const totalDue = st.type === "BOARDING" 
                          ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
                          : (fs?.tuitionAmount || 0);

                        const sp = studentPayments.find(p => p.studentId === st.id);
                        const totalPaid = sp ? sp.amountPaid : 0;
                        const balance = sp ? sp.balance : totalDue;

                        return (
                          <tr key={st.id}>
                            <td>
                              <strong>{st.name}</strong>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>No: {st.studentNumber}</div>
                            </td>
                            <td>{totalDue.toLocaleString()} UGX</td>
                            <td>{totalPaid.toLocaleString()} UGX</td>
                            <td>
                              <span className={`badge ${balance > 0 ? "badge-danger" : "badge-success"}`}>
                                {balance > 0 ? `${balance.toLocaleString()} UGX` : "Cleared"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Log Expenses */}
              <div className="card">
                <h4>Record School Expenditure Outflow</h4>
                <form onSubmit={handleCreateExpense} style={{ marginTop: "14px", marginBottom: "20px" }}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="input-field" value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                        <option value="Salaries">Staff Wages / Salaries</option>
                        <option value="Food & Boarding">Food & Boarding Supplies</option>
                        <option value="Academics">Books, Chalk & Stationery</option>
                        <option value="Utilities">Water, Power & Repairs</option>
                        <option value="Other">Miscellaneous</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expense Amount (UGX)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="e.g. 150000"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description Notes</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Purchase of 4 bags of beans"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Log Expenditure Outflow</button>
                </form>

                {/* Expense table list */}
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Notes</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(e => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleDateString()}</td>
                          <td><strong>{e.category}</strong></td>
                          <td>{e.description}</td>
                          <td style={{ color: "var(--danger)" }}>-{e.amount.toLocaleString()} UGX</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
