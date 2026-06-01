"use client";
import React, { useState, useEffect, use } from "react";
import { 
  School, User, Class, Stream, Student, Subject, ExamPaper, Mark, Payment, FeeStructure, StudentPayment, Expense,
  checkDatabaseConnection, getSchoolBySubdomain, getUsers, getClasses, getStreams, getStudents, getSubjects,
  getExamPapers, getMarks, getFeeStructures, getStudentPayments, getExpenses, getAttendance, authenticateUser,
  createClass, createStream, createUser, createStudent, createSubject, createExamPaper, addMark,
  createFeeStructure, recordStudentPayment, createExpense, recordAttendance, promoteStudents,
  processTeacherSalary, createPayment, getPayments, updateSchoolStatus
} from "../../../lib/services";
import { Database, CreditCard, Building2, CheckCircle } from "lucide-react";
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
  const [users, setUsers] = useState<User[]>([]);
  
  // Finance state (Premium only)
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentPayments, setStudentPayments] = useState<StudentPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

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

  // Student Promotion States
  const [promoteFromClassId, setPromoteFromClassId] = useState("");
  const [promoteToClassId, setPromoteToClassId] = useState("");

  // Attendance Registry States
  const [attendanceClassId, setAttendanceClassId] = useState("");
  const [attendanceStreamId, setAttendanceStreamId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<{ [studentId: string]: "PRESENT" | "ABSENT" | "SICK" }>({});

  // Payroll States
  const [payTeacherId, setPayTeacherId] = useState("");
  const [payMonthName, setPayMonthName] = useState("May");
  const [paySalaryAmount, setPaySalaryAmount] = useState("");

  // Mobile Money & Card Overlay Simulation States
  const [showMoMoModal, setShowMoMoModal] = useState(false);
  const [momoPhone, setMomoPhone] = useState("");
  const [momoAmount, setMomoAmount] = useState("");
  const [momoPurpose, setMomoPurpose] = useState<"TUITION" | "PACKAGE">("TUITION");
  const [momoStudentId, setMomoStudentId] = useState("");
  const [momoStep, setMomoStep] = useState(0); // 0 = Form, 1 = Prompt, 2 = PIN/OTP, 3 = Verifying, 4 = Success
  const [momoProvider, setMomoProvider] = useState<"MTN" | "AIRTEL" | "CARD">("MTN");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardOtp, setCardOtp] = useState("");

  // Load School on mount
  useEffect(() => {
    async function fetchSchool() {
      setLoading(true);
      const s = await getSchoolBySubdomain(subdomain);
      setSchool(s);
      
      const isConnected = await checkDatabaseConnection();
      setDbConnected(isConnected);
      
      setLoading(false);
    }
    fetchSchool();
  }, [subdomain]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get("email");
      if (emailParam) {
        setEmail(emailParam);
      }
    }
  }, []);

  // Load core school data when logged in
  const loadSchoolData = async (schoolId: string) => {
    try {
      const cls = await getClasses(schoolId);
      const strms = await getStreams(schoolId);
      const studs = await getStudents(schoolId);
      const subjs = await getSubjects(schoolId);
      const exms = await getExamPapers(schoolId);
      const mrks = await getMarks(schoolId);
      const usrs = await getUsers(schoolId);

      setClasses(cls);
      setStreams(strms);
      setStudents(studs);
      setSubjects(subjs);
      setExams(exms);
      setMarks(mrks);
      setUsers(usrs);

      // Pre-fill lists
      if (cls.length > 0) {
        setNewStreamClassId(cls[0].id);
        setNewStudentClassId(cls[0].id);
        setNewSubjectClassId(cls[0].id);
        setSelectedClassId(cls[0].id);
        setSelectedFeeClassId(cls[0].id);
        setSelectedReportClassId(cls[0].id);
        
        setPromoteFromClassId(cls[0].id);
        setPromoteToClassId(cls[1]?.id || "");
        setAttendanceClassId(cls[0].id);
      }

      // Pre-fill stream mapping
      const classStreams = strms.filter(st => st.classId === (cls[0]?.id || ""));
      if (classStreams.length > 0) {
        setNewStudentStreamId(classStreams[0].id);
        setSelectedStreamId(classStreams[0].id);
        setAttendanceStreamId(classStreams[0].id);
      }

      if (exms.length > 0) {
        setSelectedExamId(exms[0].id);
      }

      if (subjs.length > 0) {
        setSelectedSubjectId(subjs[0].id);
      }

      const pmts = await getPayments(schoolId);
      pmts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(pmts);

      if (school?.packageType === "PREMIUM") {
        setFeeStructures(await getFeeStructures(schoolId));
        setStudentPayments(await getStudentPayments(schoolId));
        setExpenses(await getExpenses(schoolId));
        if (studs.length > 0) {
          setSelectedPayStudentId(studs[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const loadAttendance = async (classId: string, streamId: string, dateStr: string) => {
    if (!school || !classId || !streamId) return;
    try {
      const records = await getAttendance(school.id, classId, dateStr);
      const mapped: { [studentId: string]: "PRESENT" | "ABSENT" | "SICK" } = {};
      records.forEach(r => {
        mapped[r.studentId] = r.status as any;
      });
      setAttendanceStatuses(mapped);
    } catch (err) {
      console.error("Error loading attendance:", err);
    }
  };

  useEffect(() => {
    if (attendanceClassId && attendanceStreamId && attendanceDate) {
      loadAttendance(attendanceClassId, attendanceStreamId, attendanceDate);
    }
  }, [attendanceClassId, attendanceStreamId, attendanceDate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!school) return;

    if (school.status !== "ACTIVE") {
      setAuthError("This school's account is pending activation. Please pay/contact super admin.");
      return;
    }

    const user = await authenticateUser(email, password, subdomain);
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
    await createClass(school.id, newClassName, newClassLevel);
    setNewClassName("");
    await loadSchoolData(school.id);
  };

  // Create stream handler
  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName || !newStreamClassId || !school) return;
    await createStream(newStreamClassId, newStreamName);
    setNewStreamName("");
    await loadSchoolData(school.id);
  };

  // Create staff user handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherEmail || !school) return;
    await createUser({
      schoolId: school.id,
      name: newTeacherName,
      email: newTeacherEmail,
      passwordHash: newTeacherPassword,
      role: newTeacherRole,
    });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("password");
    await loadSchoolData(school.id);
    alert("Staff member user account created!");
  };

  // Create student handler
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentNumber || !newStudentClassId || !newStudentStreamId || !school) return;
    await createStudent({
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
    await createSubject({
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
    await createExamPaper({
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

        await addMark({
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
    await createFeeStructure({
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

    await recordStudentPayment({
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
    await createExpense({
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

  // Save daily student attendance registry
  const handleSaveAttendance = async () => {
    if (!attendanceClassId || !attendanceStreamId || !attendanceDate || !school) {
      alert("Please select class, stream, and date.");
      return;
    }

    try {
      const classStudents = students.filter(s => s.classId === attendanceClassId && s.streamId === attendanceStreamId);
      for (const st of classStudents) {
        const status = attendanceStatuses[st.id] || "PRESENT"; // default to present if unchecked
        await recordAttendance(
          st.id,
          new Date(attendanceDate),
          status,
          1, // Term 1
          2026
        );
      }
      alert("Attendance log saved successfully!");
      await loadAttendance(attendanceClassId, attendanceStreamId, attendanceDate);
    } catch (err) {
      alert("Error saving attendance registry.");
    }
  };

  // Process batch promotion of students
  const handlePromoteStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteFromClassId || !promoteToClassId || !school) return;
    if (promoteFromClassId === promoteToClassId) {
      alert("Cannot promote students to the same class.");
      return;
    }

    const confirmText = `Are you sure you want to promote all students from ${classes.find(c => c.id === promoteFromClassId)?.name} to ${classes.find(c => c.id === promoteToClassId)?.name}? This cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    try {
      await promoteStudents(school.id, promoteFromClassId, promoteToClassId);
      alert("Students promoted successfully!");
      await loadSchoolData(school.id);
    } catch (err) {
      alert("Error processing student promotions.");
    }
  };

  // Process Teacher Salary Payout
  const handleProcessSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTeacherId || !paySalaryAmount || !school) return;
    
    // In mock/Prisma users is available, but wait! We can load users from the schoolId
    const schoolUsers = await getUsers(school.id);
    const teacher = schoolUsers.find(u => u.id === payTeacherId);
    const amountVal = parseFloat(paySalaryAmount);
    if (!teacher || isNaN(amountVal)) return;

    try {
      await processTeacherSalary(
        school.id,
        payTeacherId,
        teacher.name,
        amountVal,
        payMonthName
      );
      setPaySalaryAmount("");
      await loadSchoolData(school.id);
      alert(`Processed wage payment of ${amountVal.toLocaleString()} UGX for ${teacher.name}!`);
    } catch (err) {
      alert("Error processing teacher salary payment.");
    }
  };

  // Trigger simulated payment transaction steps
  const handleTriggerMoMoPayment = (amount: number, purpose: "TUITION" | "PACKAGE", studentId: string = "") => {
    setMomoAmount(String(amount));
    setMomoPurpose(purpose);
    setMomoStudentId(studentId);
    setMomoStep(0); // Input form
    setMomoPhone("");
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setCardOtp("");
    setMomoProvider("MTN");
    setShowMoMoModal(true);
  };

  const executeSimulatedMoMo = async () => {
    if (momoProvider === "CARD") {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert("Please fill in all credit card details.");
        return;
      }
    } else {
      if (!momoPhone) {
        alert("Please enter your mobile phone number.");
        return;
      }
    }
    if (!school) return;
    setMomoStep(1); // Processing gateway pull
    setTimeout(() => {
      setMomoStep(2); // Prompt OTP/PIN USSD screen
    }, 2000);
  };

  const finishSimulatedMoMo = async () => {
    setMomoStep(3); // Validating txn settlement reference
    
    setTimeout(async () => {
      try {
        if (!school) {
          alert("School state is null.");
          return;
        }
        if (momoPurpose === "TUITION" && momoStudentId) {
          const stud = students.find(s => s.id === momoStudentId);
          if (stud) {
            const fs = feeStructures.find(f => f.classId === stud.classId);
            const totalDue = stud.type === "BOARDING" 
              ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
              : (fs?.tuitionAmount || 0);

            const prevPayment = studentPayments.find(p => p.studentId === momoStudentId);
            const alreadyPaid = prevPayment ? prevPayment.amountPaid : 0;
            const newTotalPaid = alreadyPaid + parseFloat(momoAmount);
            const balance = Math.max(0, totalDue - newTotalPaid);

            await recordStudentPayment({
              studentId: momoStudentId,
              term: 1,
              year: 2026,
              amountPaid: newTotalPaid,
              balance,
            });
          }
        } else if (momoPurpose === "PACKAGE") {
          // Extend subscription by 1 Year and activate school status
          await updateSchoolStatus(school.id, "ACTIVE");
          
          await createPayment({
            schoolId: school.id,
            amount: parseFloat(momoAmount),
            method: momoProvider === "CARD" ? "CREDIT_CARD" : `${momoProvider}_MONEY`,
            status: "COMPLETED",
            txRef: `TX-SaaS-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
          });

          // Reload local school parameters
          const updatedSch = await getSchoolBySubdomain(subdomain);
          if (updatedSch) setSchool(updatedSch);
        }
        
        setMomoStep(4); // Successful transaction
        await loadSchoolData(school.id);
      } catch (err) {
        alert("Transaction failed validation.");
        setShowMoMoModal(false);
      }
    }, 2000);
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
    <div data-theme="light" style={{ minHeight: "100vh", display: "flex", backgroundColor: "#f1f5f9", color: "#1e293b" }}>
      
      {/* Sidebar navigation */}
      <aside style={{ width: "260px", background: "#0f172a", color: "#cbd5e1", display: "flex", flexDirection: "column" }} className="flex-mobile-col">
        <div style={{ padding: "24px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GraduationCap size={28} color="var(--primary)" />
            <div>
              <h3 style={{ color: "white", fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{school.name}</h3>
              <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>{currentUser.role} Portal</span>
            </div>
          </div>
          {dbConnected !== null && (
            <div style={{ marginTop: "12px" }}>
              <span className={`badge ${dbConnected ? "badge-success animate-float-pulse" : "badge-primary"}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", fontSize: "10px", border: "none" }}>
                <Database size={11} />
                {dbConnected ? "PostgreSQL Active" : "Mock Sandbox"}
              </span>
            </div>
          )}
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

          {/* Subscription & Billing (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("billing")} 
              className={`btn ${activeTab === "billing" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "billing" ? "white" : "#94a3b8" }}
            >
              <CreditCard size={18} /> Subscription & Billing
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

          {/* Attendance (Teacher, Admin, Head Teacher, DOS) */}
          {["ADMIN", "TEACHER", "HEADTEACHER", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("attendance")} 
              className={`btn ${activeTab === "attendance" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", color: activeTab === "attendance" ? "white" : "#94a3b8" }}
            >
              <UserCheck size={18} /> Student Attendance
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

            {/* Student Promotion Tool */}
            <div className="card" style={{ maxWidth: "600px", marginTop: "24px" }}>
              <h4 style={{ marginBottom: "16px" }}><Layers size={18} /> Batch Student Promotion Tool</h4>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                Use this to promote all students from one class level to another (e.g. promoting P6 class to P7 class) at the start of a new academic year.
              </p>
              <form onSubmit={handlePromoteStudents} className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="form-group">
                    <label className="form-label">Promote From Class</label>
                    <select 
                      className="input-field" 
                      value={promoteFromClassId}
                      onChange={(e) => setPromoteFromClassId(e.target.value)}
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Promote To Class</label>
                    <select 
                      className="input-field" 
                      value={promoteToClassId}
                      onChange={(e) => setPromoteToClassId(e.target.value)}
                    >
                      <option value="">-- Choose target class --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Run Academic Promotion</button>
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
                  <button 
                    type="button" 
                    onClick={async () => {
                      const stud = students.find(s => s.id === selectedPayStudentId);
                      if (stud) {
                        const fs = feeStructures.find(f => f.classId === stud.classId);
                        const totalDue = stud.type === "BOARDING" 
                          ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
                          : (fs?.tuitionAmount || 0);
                        const sp = studentPayments.find(p => p.studentId === stud.id);
                        const balance = sp ? sp.balance : totalDue;
                        handleTriggerMoMoPayment(balance, "TUITION", stud.id);
                      }
                    }} 
                    className="btn btn-secondary" 
                    style={{ width: "100%", marginTop: "10px", borderColor: "var(--success)", color: "var(--success)" }}
                  >
                    💸 Pay via Mobile Money (Simulated Prompt)
                  </button>
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

            {/* Process Teacher Salary Payroll Card */}
            <div className="grid grid-cols-2 gap-3" style={{ marginTop: "24px" }}>
              <div className="card">
                <h4>Process Staff Payroll (Salary Payout)</h4>
                <form onSubmit={handleProcessSalary} style={{ marginTop: "14px" }}>
                  <div className="form-group">
                    <label className="form-label">Select Staff Member</label>
                    <select 
                      className="input-field" 
                      value={payTeacherId}
                      onChange={(e) => setPayTeacherId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose staff --</option>
                      {/* Filter teachers/users from the school */}
                      {users.filter(u => u.schoolId === school.id && u.role !== "ADMIN").map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">Month</label>
                      <select 
                        className="input-field"
                        value={payMonthName}
                        onChange={(e) => setPayMonthName(e.target.value)}
                      >
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Net Salary Payout (UGX)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="e.g. 500000"
                        value={paySalaryAmount}
                        onChange={(e) => setPaySalaryAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Pay Salary & Log Expense</button>
                </form>
              </div>
              
              <div className="card" style={{ background: "white" }}>
                <h4>Uganda School Accounts Ledger Info</h4>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5, marginTop: "14px" }}>
                  Staff payroll logs automatically reduce the school's net balance and are recorded inside the global expenditures ledger under the "Salaries" category. 
                  <br /><br />
                  Make sure to set student fee structures at the start of the term so that balances and defaulters lists compute correctly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: STUDENT ATTENDANCE */}
        {activeTab === "attendance" && (
          <div>
            <h2 style={{ marginBottom: "20px" }}>Student Attendance Registry</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Log and audit daily pupil presence. Attendance lists are generated per class stream.</p>

            <div className="card" style={{ padding: "20px", marginBottom: "30px" }}>
              <div className="grid grid-cols-3 gap-2">
                <div className="form-group">
                  <label className="form-label">1. Select Class</label>
                  <select 
                    className="input-field" 
                    value={attendanceClassId}
                    onChange={(e) => {
                      setAttendanceClassId(e.target.value);
                      const filteredStreams = streams.filter(s => s.classId === e.target.value);
                      if (filteredStreams.length > 0) setAttendanceStreamId(filteredStreams[0].id);
                    }}
                  >
                    <option value="">-- Choose class --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">2. Select Stream</label>
                  <select 
                    className="input-field" 
                    value={attendanceStreamId} 
                    onChange={(e) => setAttendanceStreamId(e.target.value)}
                  >
                    <option value="">-- Choose stream --</option>
                    {streams.filter(st => st.classId === attendanceClassId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">3. Date</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {attendanceClassId && attendanceStreamId && (
              <div className="card animate-fade-in">
                <div className="flex justify-between align-center" style={{ marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <UserCheck size={22} color="var(--primary)" /> 
                      Attendance Log: {classes.find(c => c.id === attendanceClassId)?.name} ({streams.find(s => s.id === attendanceStreamId)?.name})
                    </h3>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Log status for {new Date(attendanceDate).toLocaleDateString()}
                    </span>
                  </div>
                  <button onClick={handleSaveAttendance} className="btn btn-primary">Save Attendance Log</button>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student Name</th>
                        <th>Attendance Status</th>
                        <th>Auditing Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(s => s.classId === attendanceClassId && s.streamId === attendanceStreamId).map(st => {
                        const currentStatus = attendanceStatuses[st.id] || "PRESENT";
                        return (
                          <tr key={st.id}>
                            <td>{st.studentNumber}</td>
                            <td><strong>{st.name}</strong></td>
                            <td>
                              <div className="flex gap-2" style={{ gap: "16px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                                  <input 
                                    type="radio" 
                                    name={`att-${st.id}`} 
                                    checked={currentStatus === "PRESENT"}
                                    onChange={() => setAttendanceStatuses({ ...attendanceStatuses, [st.id]: "PRESENT" })}
                                  />
                                  <span style={{ color: "var(--success)", fontWeight: currentStatus === "PRESENT" ? "bold" : "normal" }}>Present</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                                  <input 
                                    type="radio" 
                                    name={`att-${st.id}`} 
                                    checked={currentStatus === "ABSENT"}
                                    onChange={() => setAttendanceStatuses({ ...attendanceStatuses, [st.id]: "ABSENT" })}
                                  />
                                  <span style={{ color: "var(--danger)", fontWeight: currentStatus === "ABSENT" ? "bold" : "normal" }}>Absent</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                                  <input 
                                    type="radio" 
                                    name={`att-${st.id}`} 
                                    checked={currentStatus === "SICK"}
                                    onChange={() => setAttendanceStatuses({ ...attendanceStatuses, [st.id]: "SICK" })}
                                  />
                                  <span style={{ color: "var(--warning)", fontWeight: currentStatus === "SICK" ? "bold" : "normal" }}>Sick Leave</span>
                                </label>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${currentStatus === "PRESENT" ? "badge-success" : currentStatus === "SICK" ? "badge-warning" : "badge-danger"}`}>
                                {currentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {students.filter(s => s.classId === attendanceClassId && s.streamId === attendanceStreamId).length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", fontStyle: "italic", padding: "20px", color: "#64748b" }}>
                            No students registered in this stream.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SUBSCRIPTION BILLING (Admin only) */}
        {activeTab === "billing" && currentUser.role === "ADMIN" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "20px", color: "#0f172a" }}>Subscription & Billing Details</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Manage your school plan subscription, review billing ledger, and process online renewals.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="flex-mobile-col">
              {/* Subscription Status Card */}
              <div className="card" style={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}>
                <h4 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                  <Building2 size={20} color="var(--primary)" /> Subscription Status
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                    <span style={{ color: "#64748b" }}>School Domain:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--primary)" }}>{school.subdomain}.schoolpro.ug</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                    <span style={{ color: "#64748b" }}>Package Tier:</span>
                    <span className={`badge ${school.packageType === "PREMIUM" ? "badge-success" : "badge-primary"}`} style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                      {school.packageType}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                    <span style={{ color: "#64748b" }}>Account Status:</span>
                    <span className="badge badge-success">{school.status}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                    <span style={{ color: "#64748b" }}>Expiration Date:</span>
                    <strong>{school.expiresAt ? new Date(school.expiresAt).toLocaleDateString() : "Trial Run"}</strong>
                  </div>
                </div>

                <div style={{ marginTop: "24px" }}>
                  <button 
                    onClick={() => {
                      const amount = school.packageType === "PREMIUM" ? 350000 : 150000;
                      handleTriggerMoMoPayment(amount, "PACKAGE");
                    }} 
                    className="btn btn-primary hover-scale" 
                    style={{ width: "100%", padding: "12px" }}
                  >
                    💳 Renew / Extend Subscription (1 Year)
                  </button>
                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", textAlign: "center" }}>
                    Basic Plan: 150,000 UGX/Term | Premium Plan: 350,000 UGX/Term
                  </p>
                </div>
              </div>

              {/* Billing History Card */}
              <div className="card" style={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}>
                <h4 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "#0f172a" }}>
                  <FileText size={20} color="var(--primary)" /> Subscription Payments History
                </h4>
                
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td>{new Date(p.date).toLocaleDateString()}</td>
                          <td>{p.method}</td>
                          <td>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>{p.txRef || "N/A"}</span>
                          </td>
                          <td style={{ color: "var(--success)", fontWeight: "bold" }}>
                            +{p.amount.toLocaleString()} UGX
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "16px" }}>
                            No transaction history available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Mobile Money & Card Simulation Modal Overlay */}
      {showMoMoModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "420px", background: momoProvider === "MTN" ? "#ffcc00" : momoProvider === "AIRTEL" ? "#ef4444" : "#1e3a8a", color: momoProvider === "MTN" ? "#1e293b" : "white", border: "none", padding: "30px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
            
            {/* Modal Header */}
            <div className="flex justify-between align-center" style={{ borderBottom: momoProvider === "MTN" ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.2)", paddingBottom: "12px", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "Outfit", fontWeight: 800 }}>
                {momoProvider === "MTN" ? "MTN MoMo Gateway" : momoProvider === "AIRTEL" ? "Airtel Money Gateway" : "Secure Card Gateway"}
              </h3>
              <button onClick={() => setShowMoMoModal(false)} style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>

            {/* STEP 0: INPUT FORM */}
            {momoStep === 0 && (
              <div>
                <div style={{ display: "flex", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", background: "rgba(255,255,255,0.2)", marginBottom: "16px", padding: "4px" }}>
                  <button 
                    onClick={() => setMomoProvider("MTN")} 
                    className="btn" 
                    style={{ flex: 1, padding: "6px 12px", border: "none", background: momoProvider !== "CARD" ? "white" : "transparent", color: momoProvider !== "CARD" ? "#1e293b" : "inherit", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Mobile Money
                  </button>
                  <button 
                    onClick={() => setMomoProvider("CARD")} 
                    className="btn" 
                    style={{ flex: 1, padding: "6px 12px", border: "none", background: momoProvider === "CARD" ? "white" : "transparent", color: momoProvider === "CARD" ? "#1e293b" : "inherit", fontSize: "12px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Credit/Debit Card
                  </button>
                </div>

                {momoProvider !== "CARD" ? (
                  <div>
                    <p style={{ fontSize: "14px", marginBottom: "16px", opacity: 0.9 }}>
                      Enter your Mobile Money registered phone number to initiate the secure payment prompt of <strong>{parseFloat(momoAmount).toLocaleString()} UGX</strong>.
                    </p>
                    <div className="form-group">
                      <label className="form-label" style={{ color: "inherit" }}>Select Service Provider</label>
                      <select 
                        className="input-field" 
                        value={momoProvider} 
                        onChange={(e) => setMomoProvider(e.target.value as any)}
                        style={{ background: "white", color: "#1e293b", borderColor: "rgba(0,0,0,0.15)" }}
                      >
                        <option value="MTN">MTN Uganda Mobile Money (Yellow)</option>
                        <option value="AIRTEL">Airtel Uganda Airtel Money (Red)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                      <label className="form-label" style={{ color: "inherit" }}>Phone Number</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. 0772123456" 
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        style={{ background: "white", color: "#1e293b", borderColor: "rgba(0,0,0,0.15)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: "14px", marginBottom: "16px", opacity: 0.9 }}>
                      Enter card details to process the transaction of <strong>{parseFloat(momoAmount).toLocaleString()} UGX</strong>.
                    </p>
                    <div className="form-group">
                      <label className="form-label" style={{ color: "inherit" }}>Cardholder Full Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Kakooza Ronald" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        style={{ background: "white", color: "#1e293b", borderColor: "rgba(0,0,0,0.15)" }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ color: "inherit" }}>Card Number</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="4000 1234 5678 9010" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        style={{ background: "white", color: "#1e293b", borderColor: "rgba(0,0,0,0.15)" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "20px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "inherit" }}>Expiry Date</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="MM/YY" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          style={{ background: "white", color: "#1e293b", borderColor: "rgba(0,0,0,0.15)" }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ color: "inherit" }}>CVV</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="123" 
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          style={{ background: "white", color: "#1e293b", borderColor: "rgba(0,0,0,0.15)" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={executeSimulatedMoMo} 
                  className="btn" 
                  style={{ width: "100%", background: "#111827", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {momoProvider === "CARD" ? "Pay via Secure Card Gateway" : "Initiate Secure Pull"}
                </button>
              </div>
            )}

            {/* STEP 1: LOADING DIALING PUSH */}
            {momoStep === 1 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <h4 style={{ marginBottom: "8px" }}>
                  {momoProvider === "CARD" ? "Authorizing Card Details..." : "Connecting Gateway..."}
                </h4>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>
                  {momoProvider === "CARD" ? "Contacting card issuer host server. Please wait." : `Initiating API pull transaction to ${momoPhone}. Please wait.`}
                </p>
              </div>
            )}

            {/* STEP 2: SIMULATED USSD PIN / 3D SECURE SCREEN */}
            {momoStep === 2 && (
              <div>
                {momoProvider !== "CARD" ? (
                  <div style={{ background: "#27272a", color: "#22c55e", fontFamily: "monospace", padding: "16px", borderRadius: "8px", border: "2px solid #3f3f46", fontSize: "14px", marginBottom: "20px" }}>
                    <p style={{ marginBottom: "8px" }}>[USSD Push Prompt Received]</p>
                    <p style={{ marginBottom: "16px" }}>
                      Do you want to pay {school.name} fees of {parseFloat(momoAmount).toLocaleString()} UGX?
                    </p>
                    <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                      <button 
                        onClick={finishSimulatedMoMo}
                        className="btn" 
                        style={{ flex: 1, background: "#22c55e", color: "black", border: "none", fontSize: "12px", fontWeight: "bold", padding: "8px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        1. Accept (Enter PIN)
                      </button>
                      <button 
                        onClick={() => setShowMoMoModal(false)}
                        className="btn" 
                        style={{ flex: 1, background: "#ef4444", color: "white", border: "none", fontSize: "12px", padding: "8px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        2. Decline
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "#f8fafc", color: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "12px" }}>
                      <CreditCard size={18} color="var(--primary)" />
                      <strong style={{ fontSize: "14px" }}>3D Secure OTP Authentication</strong>
                    </div>
                    <p style={{ marginBottom: "14px", lineHeight: "1.4" }}>
                      A security verification code has been sent to your registered phone. Please enter it below to complete this transaction.
                    </p>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" style={{ color: "#475569" }}>One-Time Password (OTP)</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. 123456" 
                        value={cardOtp}
                        onChange={(e) => setCardOtp(e.target.value)}
                        style={{ background: "white", color: "#1e293b", borderColor: "#cbd5e1" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={finishSimulatedMoMo}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: "8px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Verify OTP
                      </button>
                      <button 
                        onClick={() => setShowMoMoModal(false)}
                        className="btn btn-outline" 
                        style={{ flex: 1, padding: "8px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: TRANSACTION VALIDATION CHECK */}
            {momoStep === 3 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <h4 style={{ marginBottom: "8px" }}>Verifying Settlement...</h4>
                <p style={{ fontSize: "12px", opacity: 0.8 }}>Contacting provider billing hooks to verify transaction success.</p>
              </div>
            )}

            {/* STEP 4: SUCCESS */}
            {momoStep === 4 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", padding: "16px", borderRadius: "50%", display: "inline-flex", marginBottom: "16px" }}>
                  <CheckCircle size={36} />
                </div>
                <h3 style={{ marginBottom: "8px" }}>Payment Received!</h3>
                <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "20px" }}>
                  Receipt reference registered. Tuition ledger updated successfully.
                </p>
                <button 
                  onClick={() => setShowMoMoModal(false)} 
                  className="btn" 
                  style={{ width: "100%", background: "#111827", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  Close Gateway
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
