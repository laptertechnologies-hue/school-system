"use client";
import React, { useState, useEffect, use } from "react";
import { 
  School, User, Class, Stream, Student, Subject, ExamPaper, Mark, Payment, FeeStructure, StudentPayment, Expense, GradeRange,
  checkDatabaseConnection, getSchoolBySubdomain, getUsers, getClasses, getStreams, getStudents, getSubjects,
  getExamPapers, getMarks, getFeeStructures, getStudentPayments, getExpenses, getAttendance, authenticateUser,
  createClass, createStream, createUser, createStudent, createSubject, createExamPaper, addMark,
  createFeeStructure, recordStudentPayment, createExpense, recordAttendance, promoteStudents,
  processTeacherSalary, createPayment, getPayments, updateSchoolStatus, updateSchoolMetadata,
  initiateMarzpayCollection, checkMarzpayCollectionStatus, sendSmsBroadcast,
  updateStudent, deleteStudent, updateUser, deleteUser, getGradeRanges, saveGradeRanges
} from "../../../lib/services";
import { Database, CreditCard, Building2, CheckCircle, MessageSquare, Sliders } from "lucide-react";
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
  FileText,
  Menu,
  X
} from "lucide-react";

const computeGradeFromRanges = (score: number, systemType: "PRIMARY" | "SECONDARY", ranges: GradeRange[]) => {
  const filtered = ranges.filter(r => r.systemType === systemType);
  // Sort minMark descending to find the correct bracket
  const sorted = [...filtered].sort((a, b) => b.minMark - a.minMark);
  const match = sorted.find(r => score >= r.minMark && score <= r.maxMark);
  if (match) {
    return {
      grade: match.grade,
      level: match.achievementLevel,
      descriptor: match.descriptor
    };
  }
  // Fallback to defaults if no match found or ranges empty
  if (systemType === "SECONDARY") {
    if (score >= 80) return { grade: "A", level: "Exceptional", descriptor: "Highly proficient in subject skills" };
    if (score >= 70) return { grade: "B", level: "Outstanding", descriptor: "Consistently demonstrates subject skills" };
    if (score >= 55) return { grade: "C", level: "Satisfactory", descriptor: "Demonstrates basic subject skills" };
    if (score >= 40) return { grade: "D", level: "Basic", descriptor: "Beginning to develop subject skills" };
    return { grade: "E", level: "Elementary", descriptor: "Needs guidance to develop skills" };
  } else {
    if (score >= 90) return { grade: "1", level: "Distinction", descriptor: "Outstanding performance" };
    if (score >= 80) return { grade: "2", level: "Distinction", descriptor: "Very good performance" };
    if (score >= 70) return { grade: "3", level: "Credit", descriptor: "Good performance" };
    if (score >= 60) return { grade: "4", level: "Credit", descriptor: "Fairly good performance" };
    if (score >= 55) return { grade: "5", level: "Credit", descriptor: "Average performance" };
    if (score >= 50) return { grade: "6", level: "Credit", descriptor: "Satisfactory performance" };
    if (score >= 45) return { grade: "7", level: "Pass", descriptor: "Pass level performance" };
    if (score >= 40) return { grade: "8", level: "Pass", descriptor: "Weak pass performance" };
    return { grade: "9", level: "Fail", descriptor: "Failure level performance" };
  }
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  const [newStudentPhoto, setNewStudentPhoto] = useState("");
  const [newStudentLin, setNewStudentLin] = useState("");

  const [newTeacherPhoto, setNewTeacherPhoto] = useState("");
  const [newTeacherStaffNumber, setNewTeacherStaffNumber] = useState("");

  // Modals view/edit states for Students
  const [selectedViewStudent, setSelectedViewStudent] = useState<Student | null>(null);
  const [showViewStudentModal, setShowViewStudentModal] = useState(false);
  const [selectedEditStudent, setSelectedEditStudent] = useState<Student | null>(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);

  // Edit student inputs
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentNumber, setEditStudentNumber] = useState("");
  const [editStudentClassId, setEditStudentClassId] = useState("");
  const [editStudentStreamId, setEditStudentStreamId] = useState("");
  const [editStudentType, setEditStudentType] = useState<"DAY" | "BOARDING">("DAY");
  const [editStudentPhoto, setEditStudentPhoto] = useState("");
  const [editStudentLin, setEditStudentLin] = useState("");

  // Modals view/edit states for Staff
  const [selectedViewStaff, setSelectedViewStaff] = useState<User | null>(null);
  const [showViewStaffModal, setShowViewStaffModal] = useState(false);
  const [selectedEditStaff, setSelectedEditStaff] = useState<User | null>(null);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);

  // Edit staff inputs
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffRole, setEditStaffRole] = useState<"ADMIN" | "TEACHER" | "DOS" | "HEADTEACHER" | "DIRECTOR">("TEACHER");
  const [editStaffNumber, setEditStaffNumber] = useState("");
  const [editStaffPhoto, setEditStaffPhoto] = useState("");

  // Bulk upload states
  const [showBulkStudentModal, setShowBulkStudentModal] = useState(false);
  const [showBulkStaffModal, setShowBulkStaffModal] = useState(false);
  const [bulkStudentText, setBulkStudentText] = useState("");
  const [bulkStaffText, setBulkStaffText] = useState("");
  const [bulkStudentClassId, setBulkStudentClassId] = useState("");
  const [bulkStudentStreamId, setBulkStudentStreamId] = useState("");

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
  const [inputU1, setInputU1] = useState<{ [studentId: string]: string }>({});
  const [inputU2, setInputU2] = useState<{ [studentId: string]: string }>({});
  const [inputU3, setInputU3] = useState<{ [studentId: string]: string }>({});
  const [inputHPG, setInputHPG] = useState<{ [studentId: string]: string }>({});
  const [inputEOY, setInputEOY] = useState<{ [studentId: string]: string }>({});
  const [inputComments, setInputComments] = useState<{ [studentId: string]: string }>({});

  // Grade Range Customizer States
  const [gradeRanges, setGradeRanges] = useState<GradeRange[]>([]);
  const [selectedScaleType, setSelectedScaleType] = useState<"PRIMARY" | "SECONDARY">("SECONDARY");
  const [scaleRanges, setScaleRanges] = useState<GradeRange[]>([]);

  // Next term fees customization states
  const [designerNextTermFeesDay, setDesignerNextTermFeesDay] = useState<number>(150000);
  const [designerNextTermFeesBoarding, setDesignerNextTermFeesBoarding] = useState<number>(350000);

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

  // School profile metadata form states
  const [profileName, setProfileName] = useState("");
  const [profilePoBox, setProfilePoBox] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileHeadTeacher, setProfileHeadTeacher] = useState("");
  const [profileDeputyHeadTeacher, setProfileDeputyHeadTeacher] = useState("");
  const [profileDirector, setProfileDirector] = useState("");
  const [profileLogoUrl, setProfileLogoUrl] = useState("");
  const [profileThemeColor, setProfileThemeColor] = useState("#38bdf8");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // First-time branding setup states
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [setupAdminEmail, setSetupAdminEmail] = useState("");
  const [setupAdminPassword, setSetupAdminPassword] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupPoBox, setSetupPoBox] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupHeadTeacher, setSetupHeadTeacher] = useState("");
  const [setupDeputyHeadTeacher, setSetupDeputyHeadTeacher] = useState("");
  const [setupDirector, setSetupDirector] = useState("");
  const [setupLogoUrl, setSetupLogoUrl] = useState("");
  const [setupThemeColor, setSetupThemeColor] = useState("#38bdf8");
  const [setupError, setSetupError] = useState("");

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
  const [momoTxUuid, setMomoTxUuid] = useState("");
  const [momoSplitAmounts, setMomoSplitAmounts] = useState<number[]>([]);
  const [momoSplitIndex, setMomoSplitIndex] = useState<number>(0);
  const [momoCompletedSplits, setMomoCompletedSplits] = useState<{ amount: number; uuid: string }[]>([]);

  // SMS Broadcaster States
  const [smsCredits, setSmsCredits] = useState(500);
  const [smsGroup, setSmsGroup] = useState("All Parents");
  const [smsTemplate, setSmsTemplate] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  // Report Card Designer States
  const [designerTitle, setDesignerTitle] = useState("OFFICIAL ACADEMIC REPORT CARD");
  const [designerMotto, setDesignerMotto] = useState("");
  const [designerShowBadge, setDesignerShowBadge] = useState(true);
  const [designerShowResidency, setDesignerShowResidency] = useState(true);
  const [designerShowSignatures, setDesignerShowSignatures] = useState(true);
  const [designerShowRules, setDesignerShowRules] = useState(true);
  const [designerLogoSize, setDesignerLogoSize] = useState<number>(60);
  const [designerShowStudentPhoto, setDesignerShowStudentPhoto] = useState<boolean>(true);
  const [designerHeaderColor, setDesignerHeaderColor] = useState<string>("#1e3a8a");
  const [designerBorderType, setDesignerBorderType] = useState<string>("double");

  useEffect(() => {
    async function fetchSchool() {
      setLoading(true);
      const s = await getSchoolBySubdomain(subdomain);
      setSchool(s);
      if (s) {
        setProfileName(s.name || "");
        setProfilePoBox(s.poBox || "");
        setProfilePhone(s.contactPhone || "");
        setProfileHeadTeacher(s.headTeacher || "");
        setProfileDeputyHeadTeacher(s.deputyHeadTeacher || "");
        setProfileDirector(s.director || "");
        setProfileLogoUrl(s.logoUrl || "");
        setProfileThemeColor(s.themeColor || "#38bdf8");

        setSetupName(s.name || "");
        setSetupPhone(s.contactPhone || "");
        setSetupPoBox(s.poBox || "");
        setSetupHeadTeacher(s.headTeacher || "");
        setSetupDeputyHeadTeacher(s.deputyHeadTeacher || "");
        setSetupDirector(s.director || "");
        setSetupLogoUrl(s.logoUrl || "");
        setSetupThemeColor(s.themeColor || "#38bdf8");

        setDesignerTitle(s.reportTitle || "OFFICIAL ACADEMIC REPORT CARD");
        setDesignerMotto(s.reportMotto || "");
        setDesignerShowBadge(s.reportShowBadge !== false);
        setDesignerShowResidency(s.reportShowResidency !== false);
        setDesignerShowSignatures(s.reportShowSignatures !== false);
        setDesignerShowRules(s.reportShowRules !== false);
        setDesignerLogoSize(s.reportLogoSize || 60);
        setDesignerShowStudentPhoto(s.reportShowStudentPhoto !== false);
        setDesignerHeaderColor(s.reportHeaderColor || "#1e3a8a");
        setDesignerBorderType(s.reportBorderType || "double");

        // Load custom grade ranges or pre-populate defaults
        const ranges = await getGradeRanges(s.id);
        if (ranges.length === 0) {
          const defaultRanges = [
            // SECONDARY (CBC Scale)
            { systemType: "SECONDARY" as const, grade: "A", minMark: 80, maxMark: 100, achievementLevel: "Exceptional", descriptor: "Highly proficient in subject skills" },
            { systemType: "SECONDARY" as const, grade: "B", minMark: 70, maxMark: 79.99, achievementLevel: "Outstanding", descriptor: "Consistently demonstrates subject skills" },
            { systemType: "SECONDARY" as const, grade: "C", minMark: 55, maxMark: 69.99, achievementLevel: "Satisfactory", descriptor: "Demonstrates basic subject skills" },
            { systemType: "SECONDARY" as const, grade: "D", minMark: 40, maxMark: 54.99, achievementLevel: "Basic", descriptor: "Beginning to develop subject skills" },
            { systemType: "SECONDARY" as const, grade: "E", minMark: 0, maxMark: 39.99, achievementLevel: "Elementary", descriptor: "Needs guidance to develop skills" },
            // PRIMARY (PLE Scale)
            { systemType: "PRIMARY" as const, grade: "1", minMark: 90, maxMark: 100, achievementLevel: "Distinction", descriptor: "Outstanding performance" },
            { systemType: "PRIMARY" as const, grade: "2", minMark: 80, maxMark: 89.99, achievementLevel: "Distinction", descriptor: "Very good performance" },
            { systemType: "PRIMARY" as const, grade: "3", minMark: 70, maxMark: 79.99, achievementLevel: "Credit", descriptor: "Good performance" },
            { systemType: "PRIMARY" as const, grade: "4", minMark: 60, maxMark: 69.99, achievementLevel: "Credit", descriptor: "Fairly good performance" },
            { systemType: "PRIMARY" as const, grade: "5", minMark: 55, maxMark: 59.99, achievementLevel: "Credit", descriptor: "Average performance" },
            { systemType: "PRIMARY" as const, grade: "6", minMark: 50, maxMark: 54.99, achievementLevel: "Credit", descriptor: "Satisfactory performance" },
            { systemType: "PRIMARY" as const, grade: "7", minMark: 45, maxMark: 49.99, achievementLevel: "Pass", descriptor: "Pass level performance" },
            { systemType: "PRIMARY" as const, grade: "8", minMark: 40, maxMark: 44.99, achievementLevel: "Pass", descriptor: "Weak pass performance" },
            { systemType: "PRIMARY" as const, grade: "9", minMark: 0, maxMark: 39.99, achievementLevel: "Fail", descriptor: "Failure level performance" }
          ];
          const saved = await saveGradeRanges(s.id, defaultRanges);
          setGradeRanges(saved);
        } else {
          setGradeRanges(ranges);
        }

        // Initialize design next term fees:
        setDesignerNextTermFeesDay(s.reportNextTermFeesDay || 150000);
        setDesignerNextTermFeesBoarding(s.reportNextTermFeesBoarding || 350000);
      }
      
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
      setGradeRanges(await getGradeRanges(schoolId));

      // Pre-populate dynamic Student/Staff ID Numbers
      const activeSchool = school || (await getSchoolBySubdomain(subdomain));
      if (activeSchool) {
        const initials = activeSchool.name.split(" ").map(w => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "") || subdomain.toUpperCase();
        
        const nextStudentNum = `${initials}-STU-${(studs.length + 1).toString().padStart(4, "0")}`;
        setNewStudentNumber(nextStudentNum);

        const staffCount = usrs.filter(u => u.role !== "ADMIN").length;
        const nextStaffNum = `${initials}-STF-${(staffCount + 1).toString().padStart(4, "0")}`;
        setNewTeacherStaffNumber(nextStaffNum);
      }

      // Pre-fill lists
      if (cls.length > 0) {
        setNewStreamClassId(cls[0].id);
        setNewStudentClassId(cls[0].id);
        setNewSubjectClassId(cls[0].id);
        setBulkStudentClassId(cls[0].id);
        const subStreams = strms.filter(st => st.classId === cls[0].id);
        if (subStreams.length > 0) {
          setBulkStudentStreamId(subStreams[0].id);
        }
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

  useEffect(() => {
    if (!selectedExamId || !selectedSubjectId || !selectedClassId || !selectedStreamId) {
      setInputScores({});
      setInputU1({});
      setInputU2({});
      setInputU3({});
      setInputHPG({});
      setInputEOY({});
      setInputComments({});
      return;
    }
    
    const relevantStudents = students.filter(st => st.classId === selectedClassId && st.streamId === selectedStreamId);
    const newScores: { [key: string]: string } = {};
    const newU1: { [key: string]: string } = {};
    const newU2: { [key: string]: string } = {};
    const newU3: { [key: string]: string } = {};
    const newHPG: { [key: string]: string } = {};
    const newEOY: { [key: string]: string } = {};
    const newComments: { [key: string]: string } = {};

    relevantStudents.forEach(st => {
      const m = marks.find(mk => mk.studentId === st.id && mk.examPaperId === selectedExamId && mk.subjectId === selectedSubjectId);
      if (m) {
        newScores[st.id] = String(m.score);
        newU1[st.id] = m.u1 !== null && m.u1 !== undefined ? String(m.u1) : "";
        newU2[st.id] = m.u2 !== null && m.u2 !== undefined ? String(m.u2) : "";
        newU3[st.id] = m.u3 !== null && m.u3 !== undefined ? String(m.u3) : "";
        newHPG[st.id] = m.hpg !== null && m.hpg !== undefined ? String(m.hpg) : "";
        newEOY[st.id] = m.eoy !== null && m.eoy !== undefined ? String(m.eoy) : "";
        newComments[st.id] = m.comments || "";
      }
    });

    setInputScores(newScores);
    setInputU1(newU1);
    setInputU2(newU2);
    setInputU3(newU3);
    setInputHPG(newHPG);
    setInputEOY(newEOY);
    setInputComments(newComments);
  }, [selectedExamId, selectedSubjectId, selectedClassId, selectedStreamId, marks, students]);

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

  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");
    if (!school) return;

    // Authenticate setup user
    const user = await authenticateUser(setupAdminEmail, setupAdminPassword, subdomain);
    if (!user || user.role !== "ADMIN") {
      setSetupError("Invalid administrator credentials for this school subdomain.");
      return;
    }

    try {
      const updated = await updateSchoolMetadata(school.id, {
        name: setupName,
        poBox: setupPoBox,
        contactPhone: setupPhone,
        headTeacher: setupHeadTeacher,
        deputyHeadTeacher: setupDeputyHeadTeacher,
        director: setupDirector,
        logoUrl: setupLogoUrl,
        themeColor: setupThemeColor
      });
      setSchool(updated);
      
      // Sync profile form states
      setProfileName(updated.name || "");
      setProfilePhone(updated.contactPhone || "");
      setProfilePoBox(updated.poBox || "");
      setProfileHeadTeacher(updated.headTeacher || "");
      setProfileDeputyHeadTeacher(updated.deputyHeadTeacher || "");
      setProfileDirector(updated.director || "");
      setProfileLogoUrl(updated.logoUrl || "");
      setProfileThemeColor(updated.themeColor || "#38bdf8");

      alert("School branding and leaders configured successfully!");
      setShowFirstTimeSetup(false);
      setSetupAdminEmail("");
      setSetupAdminPassword("");
    } catch (err) {
      setSetupError("Failed to update school metadata.");
    }
  };

  // Update school settings and metadata handler
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    try {
      setProfileSuccessMsg("");
      const updated = await updateSchoolMetadata(school.id, {
        name: profileName,
        poBox: profilePoBox,
        contactPhone: profilePhone,
        headTeacher: profileHeadTeacher,
        deputyHeadTeacher: profileDeputyHeadTeacher,
        director: profileDirector,
        logoUrl: profileLogoUrl,
        themeColor: profileThemeColor
      });
      setSchool(updated);
      setProfileSuccessMsg("School profile and settings updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update school profile");
    }
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
      photo: newTeacherPhoto || null,
      staffNumber: newTeacherStaffNumber || null,
    });
    setNewTeacherName("");
    setNewTeacherEmail("");
    setNewTeacherPassword("password");
    setNewTeacherPhoto("");
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
      photo: newStudentPhoto || null,
      lin: newStudentLin || null,
    });
    setNewStudentName("");
    setNewStudentNumber("");
    setNewStudentPhoto("");
    setNewStudentLin("");
    await loadSchoolData(school.id);
    alert("Student registered successfully!");
  };

  // Bulk student upload handler
  const handleBulkStudentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !bulkStudentClassId || !bulkStudentStreamId || !bulkStudentText) {
      alert("Please fill in all details and paste student list.");
      return;
    }
    try {
      const lines = bulkStudentText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        alert("Pasted list is empty.");
        return;
      }
      let successCount = 0;
      let existingCount = students.length;
      for (const line of lines) {
        const parts = line.split(/[,\t]/).map(p => p.trim());
        if (parts.length === 0 || !parts[0]) continue;
        const name = parts[0];
        let studentNumber = parts[1] || "";
        let typeStr = parts[2] || "DAY";
        let lin = parts[3] || "";
        if (!studentNumber) {
          existingCount++;
          const initials = school.name.split(/\s+/).map(w => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "") || subdomain.toUpperCase();
          studentNumber = `${initials}-STU-${String(existingCount).padStart(4, "0")}`;
        }
        let residencyType: "DAY" | "BOARDING" = "DAY";
        if (typeStr.toUpperCase() === "BOARDING" || typeStr.toUpperCase() === "B") {
          residencyType = "BOARDING";
        }
        await createStudent({
          schoolId: school.id,
          classId: bulkStudentClassId,
          streamId: bulkStudentStreamId,
          name,
          studentNumber,
          type: residencyType,
          photo: null,
          lin: lin || null,
        });
        successCount++;
      }
      setBulkStudentText("");
      setShowBulkStudentModal(false);
      await loadSchoolData(school.id);
      alert(`Successfully imported ${successCount} students!`);
    } catch (err: any) {
      alert("Error importing students: " + (err.message || err));
    }
  };

  // Bulk staff upload handler
  const handleBulkStaffUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !bulkStaffText) {
      alert("Please paste staff list.");
      return;
    }
    try {
      const lines = bulkStaffText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) {
        alert("Pasted list is empty.");
        return;
      }
      let successCount = 0;
      let existingCount = users.length;
      for (const line of lines) {
        const parts = line.split(/[,\t]/).map(p => p.trim());
        if (parts.length === 0 || !parts[0]) continue;
        const name = parts[0];
        const email = parts[1] || "";
        let roleStr = parts[2] || "TEACHER";
        let staffNumber = parts[3] || "";
        if (!email) continue;
        let role: "ADMIN" | "TEACHER" | "DOS" | "HEADTEACHER" | "DIRECTOR" = "TEACHER";
        const upperRole = roleStr.toUpperCase();
        if (upperRole === "ADMIN") role = "ADMIN";
        else if (upperRole === "DOS") role = "DOS";
        else if (upperRole === "HEADTEACHER" || upperRole === "HEAD") role = "HEADTEACHER";
        else if (upperRole === "DIRECTOR") role = "DIRECTOR";
        if (!staffNumber) {
          existingCount++;
          const initials = school.name.split(/\s+/).map(w => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "") || subdomain.toUpperCase();
          staffNumber = `${initials}-STF-${String(existingCount).padStart(4, "0")}`;
        }
        await createUser({
          schoolId: school.id,
          name,
          email,
          passwordHash: "password",
          role,
          photo: null,
          staffNumber,
        });
        successCount++;
      }
      setBulkStaffText("");
      setShowBulkStaffModal(false);
      await loadSchoolData(school.id);
      alert(`Successfully imported ${successCount} staff accounts!`);
    } catch (err: any) {
      alert("Error importing staff: " + (err.message || err));
    }
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

  // Get student's rank/position in their class for a specific exam
  const getStudentRankInClass = (studentId: string, classId: string, examPaperId: string) => {
    const classStudents = students.filter(s => s.classId === classId);
    const studentScores = classStudents.map(st => {
      const stMarks = marks.filter(m => m.studentId === st.id && m.examPaperId === examPaperId);
      if (stMarks.length === 0) return { studentId: st.id, total: -1, count: 0 };
      const sum = stMarks.reduce((acc, m) => acc + m.score, 0);
      return { studentId: st.id, total: sum, count: stMarks.length };
    });
    
    const gradedStudents = studentScores.filter(s => s.count > 0);
    gradedStudents.sort((a, b) => b.total - a.total);
    
    const rankIndex = gradedStudents.findIndex(s => s.studentId === studentId);
    if (rankIndex === -1) return "N/A";
    return {
      position: rankIndex + 1,
      totalCount: gradedStudents.length
    };
  };

  // Save marks for a class
  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedSubjectId || !currentUser) {
      alert("Please select exam and subject first.");
      return;
    }

    const currentExam = exams.find(ex => ex.id === selectedExamId);
    if (!currentExam) return;

    const relevantStudents = students.filter(st => st.classId === selectedClassId && st.streamId === selectedStreamId);

    try {
      for (const st of relevantStudents) {
        const studentId = st.id;
        const comment = inputComments[studentId] || "";

        if (currentExam.isNewCurriculum) {
          const u1Str = inputU1[studentId];
          const u2Str = inputU2[studentId];
          const u3Str = inputU3[studentId];
          const hpgStr = inputHPG[studentId];
          const eoyStr = inputEOY[studentId];

          // If all fields are empty, don't save anything
          if (!u1Str && !u2Str && !u3Str && !hpgStr && !eoyStr) continue;

          const u1Val = u1Str ? parseFloat(u1Str) : null;
          const u2Val = u2Str ? parseFloat(u2Str) : null;
          const u3Val = u3Str ? parseFloat(u3Str) : null;
          const hpgVal = hpgStr ? parseFloat(hpgStr) : null;
          const eoyVal = eoyStr ? parseFloat(eoyStr) : null;

          // Validation
          if (u1Val !== null && (isNaN(u1Val) || u1Val < 0 || u1Val > 3)) continue;
          if (u2Val !== null && (isNaN(u2Val) || u2Val < 0 || u2Val > 3)) continue;
          if (u3Val !== null && (isNaN(u3Val) || u3Val < 0 || u3Val > 3)) continue;
          if (hpgVal !== null && (isNaN(hpgVal) || hpgVal < 0 || hpgVal > 3)) continue;
          if (eoyVal !== null && (isNaN(eoyVal) || eoyVal < 0 || eoyVal > 80)) continue;

          const formativeSum = (u1Val || 0) + (u2Val || 0) + (u3Val || 0) + (hpgVal || 0);
          const avgFormative = formativeSum / 4;
          const caScore = (avgFormative / 3) * 20;
          const finalTotal = caScore + (eoyVal || 0);

          const gradeObj = computeGradeFromRanges(finalTotal, "SECONDARY", gradeRanges);
          const compGrade = gradeObj.grade;
          const finalComment = comment || gradeObj.descriptor || "Satisfactory progress";

          await addMark({
            studentId,
            examPaperId: selectedExamId,
            subjectId: selectedSubjectId,
            score: finalTotal,
            competencyGrade: compGrade,
            comments: finalComment,
            createdById: currentUser.id,
            u1: u1Val,
            u2: u2Val,
            u3: u3Val,
            hpg: hpgVal,
            eoy: eoyVal
          });
        } else {
          const scoreStr = inputScores[studentId];
          if (!scoreStr) continue;

          const rawScore = parseFloat(scoreStr);
          if (isNaN(rawScore) || rawScore < 0 || rawScore > currentExam.maxMarks) continue;

          const gradeObj = computeGradeFromRanges(rawScore, "PRIMARY", gradeRanges);
          const compGrade = gradeObj.grade;
          const finalComment = comment || gradeObj.descriptor || "Good effort";

          await addMark({
            studentId,
            examPaperId: selectedExamId,
            subjectId: selectedSubjectId,
            score: rawScore,
            competencyGrade: compGrade,
            comments: finalComment,
            createdById: currentUser.id,
          });
        }
      }
      alert("Marks saved successfully!");
      await loadSchoolData(school!.id);
      setInputScores({});
      setInputU1({});
      setInputU2({});
      setInputU3({});
      setInputHPG({});
      setInputEOY({});
      setInputComments({});
    } catch (err) {
      console.error(err);
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

  // Save Report Template Config
  const handleSaveReportTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    try {
      const updated = await updateSchoolMetadata(school.id, {
        reportTitle: designerTitle,
        reportMotto: designerMotto,
        reportShowBadge: designerShowBadge,
        reportShowResidency: designerShowResidency,
        reportShowSignatures: designerShowSignatures,
        reportShowRules: designerShowRules,
        reportLogoSize: designerLogoSize,
        reportShowStudentPhoto: designerShowStudentPhoto,
        reportHeaderColor: designerHeaderColor,
        reportBorderType: designerBorderType
      });
      setSchool(updated);
      alert("Academic report card template layout saved successfully!");
    } catch (err: any) {
      alert("Failed to save report template config: " + (err.message || err));
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

    // Split payment tracking (max 200k per transaction)
    const maxLimit = 200000;
    const splits: number[] = [];
    let tempAmount = amount;
    while (tempAmount > maxLimit) {
      splits.push(maxLimit);
      tempAmount -= maxLimit;
    }
    if (tempAmount > 0) {
      splits.push(tempAmount);
    }
    setMomoSplitAmounts(splits);
    setMomoSplitIndex(0);
    setMomoCompletedSplits([]);
    setMomoTxUuid("");
  };

  const executeSimulatedMoMo = async () => {
    if (!school) return;
    
    const amountVal = parseFloat(momoAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Invalid payment amount");
      return;
    }

    if (momoProvider !== "CARD" && !momoPhone) {
      alert("Please enter your mobile phone number.");
      return;
    }

    // Determine the current split amount to pay in this transaction
    const currentSplitAmount = momoSplitAmounts[momoSplitIndex] || amountVal;

    setMomoStep(1); // Connecting gateway
    try {
      const res = await initiateMarzpayCollection(
        currentSplitAmount,
        momoProvider === "CARD" ? "card" : "mobile_money",
        momoProvider === "CARD" ? undefined : momoPhone,
        (momoPurpose === "PACKAGE" ? `Plan Renewal for ${school.name}` : `Tuition Payment for Student ID ${momoStudentId}`) +
        (momoSplitAmounts.length > 1 ? ` (Part ${momoSplitIndex + 1}/${momoSplitAmounts.length})` : "")
      );

      if (res && res.status === "success") {
        setMomoTxUuid(res.uuid);
        if (momoProvider === "CARD") {
          // Direct redirect for card payments
          if (res.redirect_url) {
            window.location.href = res.redirect_url;
          } else {
            alert("Card redirect URL not provided by gateway.");
            setMomoStep(0);
          }
        } else {
          // For Mobile Money, wait for the customer to approve, and display the polling check screen
          setMomoStep(2); // Waiting for Approval
        }
      } else {
        alert(res?.message || "Failed to initiate payment collection from Marzpay.");
        setMomoStep(0);
      }
    } catch (err: any) {
      alert("Error contacting Marzpay gateway: " + (err.message || err));
      setMomoStep(0);
    }
  };

  const checkPaymentStatus = async () => {
    if (!school) return;
    if (!momoTxUuid) {
      alert("No transaction reference found.");
      return;
    }
    setMomoStep(3); // Verifying
    try {
      const res = await checkMarzpayCollectionStatus(momoTxUuid);
      if (res && res.status === "success") {
        // Complete the current split payment locally or trigger next split!
        const completedAmount = momoSplitAmounts[momoSplitIndex] || parseFloat(momoAmount);
        
        if (momoSplitIndex < momoSplitAmounts.length - 1) {
          // Record this split
          const newCompleted = [...momoCompletedSplits, { amount: completedAmount, uuid: momoTxUuid }];
          setMomoCompletedSplits(newCompleted);
          
          // Move to next split index
          const nextIdx = momoSplitIndex + 1;
          setMomoSplitIndex(nextIdx);
          
          // Initiate the next split payment
          setMomoStep(1); // Connecting gateway
          try {
            const nextAmount = momoSplitAmounts[nextIdx];
            const nextRes = await initiateMarzpayCollection(
              nextAmount,
              momoProvider === "CARD" ? "card" : "mobile_money",
              momoProvider === "CARD" ? undefined : momoPhone,
              (momoPurpose === "PACKAGE" ? `Plan Renewal for ${school.name}` : `Tuition Payment for Student ID ${momoStudentId}`) +
              ` (Part ${nextIdx + 1}/${momoSplitAmounts.length})`
            );
            
            if (nextRes && nextRes.status === "success") {
              setMomoTxUuid(nextRes.uuid);
              if (momoProvider === "CARD") {
                if (nextRes.redirect_url) {
                  window.location.href = nextRes.redirect_url;
                } else {
                  alert(`Card redirect URL not provided by gateway for Part ${nextIdx + 1}.`);
                  setMomoStep(0);
                }
              } else {
                setMomoStep(2); // Waiting for Approval
                alert(`Part ${nextIdx} payment succeeded! We are now sending a push prompt for Part ${nextIdx + 1} (${nextAmount.toLocaleString()} UGX) to your phone. Please approve it.`);
              }
            } else {
              alert(nextRes?.message || `Failed to initiate Part ${nextIdx + 1} of payment.`);
              setMomoStep(0);
            }
          } catch (err: any) {
            alert(`Error initiating Part ${nextIdx + 1} of payment: ` + (err.message || err));
            setMomoStep(0);
          }
        } else {
          // All splits completed! Complete the payment locally!
          try {
            if (!school) return;
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
              await updateSchoolStatus(school.id, "ACTIVE");
              await createPayment({
                schoolId: school.id,
                amount: parseFloat(momoAmount),
                method: momoProvider === "CARD" ? "CARD" : "MOBILE_MONEY",
                status: "COMPLETED",
                txRef: `TX-MARZ-${momoTxUuid.substring(0, 8).toUpperCase()}`
              });
              const updatedSch = await getSchoolBySubdomain(subdomain);
              if (updatedSch) setSchool(updatedSch);
            }
            setMomoStep(4); // Success!
            await loadSchoolData(school.id);
          } catch (err: any) {
            alert("Error updating transaction records: " + (err.message || err));
            setMomoStep(2);
          }
        }
      } else if (res && res.status === "failed") {
        alert("Payment failed or was declined by user.");
        setMomoStep(0);
      } else {
        // Still pending
        alert("Payment is still pending. Please approve the USSD prompt on your phone and try again.");
        setMomoStep(2);
      }
    } catch (err: any) {
      alert("Error checking transaction status: " + (err.message || err));
      setMomoStep(2);
    }
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
        {school.themeColor && (
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --primary: ${school.themeColor} !important;
              --primary-hover: ${school.themeColor}dd !important;
              --primary-glow: ${school.themeColor}2e !important;
            }
          `}} />
        )}
        <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "450px", background: "#1e293b", borderColor: "#334155" }}>
          
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            {school.logoUrl ? (
              <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center" }}>
                <img src={school.logoUrl} alt={`${school.name} Logo`} style={{ maxWidth: "80px", maxHeight: "80px", borderRadius: "10px", objectFit: "contain", background: "white", padding: "4px" }} />
              </div>
            ) : (
              <div style={{ background: "rgba(59, 130, 246, 0.15)", padding: "16px", borderRadius: "50%", display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "16px" }}>
                <GraduationCap size={40} color="var(--primary)" />
              </div>
            )}
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

          {/* First-time setup banner/button */}
          <div style={{ marginTop: "20px", padding: "16px", background: "rgba(56, 189, 248, 0.08)", border: "1px dashed rgba(56, 189, 248, 0.3)", borderRadius: "8px", fontSize: "13px", color: "#e0f2fe", textAlign: "left" }}>
            <p style={{ margin: 0, marginBottom: "8px", lineHeight: "1.4" }}>
              <strong>🏫 First-Time Administrator?</strong> Set up your school badge/logo, physical address, phone contacts, leader names, and custom accent colors right here.
            </p>
            <button 
              type="button"
              onClick={() => {
                setSetupError("");
                setShowFirstTimeSetup(true);
              }}
              className="btn btn-outline" 
              style={{ width: "100%", padding: "8px 12px", fontSize: "12px", background: "transparent", color: "var(--primary)", borderColor: "var(--primary)", marginTop: "4px" }}
            >
              ⚙️ Configure School Branding & Details
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a href="/" style={{ fontSize: "13px", color: "#9ca3af" }}>← Back to SchoolPro Main Website</a>
          </div>

        </div>

        {/* First-Time Setup Modal Overlay */}
        {showFirstTimeSetup && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }} className="animate-fade-in">
            <div className="card" style={{ width: "100%", maxWidth: "600px", background: "#1e293b", borderColor: "#334155", color: "white", padding: "30px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
              
              <div className="flex justify-between align-center" style={{ borderBottom: "1px solid #334155", paddingBottom: "14px", marginBottom: "20px" }}>
                <h3 style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  🏫 School Portal Initial Setup
                </h3>
                <button onClick={() => setShowFirstTimeSetup(false)} style={{ background: "transparent", border: "none", color: "#cbd5e1", fontWeight: "bold", cursor: "pointer", fontSize: "18px" }}>✕</button>
              </div>

              {setupError && (
                <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "13px", marginBottom: "20px" }}>
                  {setupError}
                </div>
              )}

              <form onSubmit={handleFirstTimeSetup}>
                
                <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.1)", borderRadius: "6px", fontSize: "12px", color: "#93c5fd" }}>
                  🔒 Enter your school's Administrator credentials to authorize these updates.
                </div>

                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Admin Email</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      placeholder="e.g. admin@school.ug" 
                      value={setupAdminEmail} 
                      onChange={(e) => setSetupAdminEmail(e.target.value)} 
                      required 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Admin Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="••••••••" 
                      value={setupAdminPassword} 
                      onChange={(e) => setSetupAdminPassword(e.target.value)} 
                      required 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                    />
                  </div>
                </div>

                <h4 style={{ color: "var(--primary)", fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid #334155", paddingBottom: "4px", fontWeight: 700 }}>🏫 School Information</h4>
                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "12px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>School Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={setupName} 
                      onChange={(e) => setSetupName(e.target.value)} 
                      required 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Contact Phone</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={setupPhone} 
                      onChange={(e) => setSetupPhone(e.target.value)} 
                      required 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label className="form-label" style={{ color: "#d1d5db" }}>P.O. Box & Physical Location</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. P.O. Box 7523, Kampala, Uganda"
                    value={setupPoBox} 
                    onChange={(e) => setSetupPoBox(e.target.value)} 
                    style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "16px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>School Logo/Badge</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="input-field" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            alert("Logo image should be less than 1MB to store directly in the database.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSetupLogoUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white", padding: "8px" }}
                    />
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
                      <span style={{ color: "#9ca3af", fontSize: "11px", whiteSpace: "nowrap" }}>Or URL:</span>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. https://example.com/logo.png"
                        value={setupLogoUrl && setupLogoUrl.startsWith("data:") ? "" : setupLogoUrl} 
                        onChange={(e) => setSetupLogoUrl(e.target.value)} 
                        style={{ background: "#0f172a", borderColor: "#374151", color: "white", fontSize: "11px", padding: "4px 8px", height: "auto" }}
                      />
                    </div>
                    {setupLogoUrl && (
                      <button 
                        type="button" 
                        onClick={() => setSetupLogoUrl("")}
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: "11px", marginTop: "4px", background: "#ef4444", color: "white", border: "none", alignSelf: "flex-start", cursor: "pointer", borderRadius: "4px" }}
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Portal Accent Theme Color</label>
                    <div className="flex align-center gap-1">
                      <input 
                        type="color" 
                        value={setupThemeColor} 
                        onChange={(e) => setSetupThemeColor(e.target.value)} 
                        style={{ width: "40px", height: "40px", border: "none", cursor: "pointer", padding: 0, borderRadius: "6px" }}
                      />
                      <input 
                        type="text" 
                        className="input-field" 
                        value={setupThemeColor} 
                        onChange={(e) => setSetupThemeColor(e.target.value)} 
                        style={{ flex: 1, background: "#0f172a", borderColor: "#374151", color: "white" }}
                      />
                    </div>
                  </div>
                </div>

                <h4 style={{ color: "var(--primary)", fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid #334155", paddingBottom: "4px", fontWeight: 700 }}>👥 Administrative Leaders</h4>
                <div className="grid grid-cols-3 gap-2" style={{ marginBottom: "24px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Head Teacher</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Head Teacher Name" 
                      value={setupHeadTeacher} 
                      onChange={(e) => setSetupHeadTeacher(e.target.value)} 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white", fontSize: "12px" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Deputy Head</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Deputy Head Name" 
                      value={setupDeputyHeadTeacher} 
                      onChange={(e) => setSetupDeputyHeadTeacher(e.target.value)} 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white", fontSize: "12px" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#d1d5db" }}>Director / Owner</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Director Name" 
                      value={setupDirector} 
                      onChange={(e) => setSetupDirector(e.target.value)} 
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white", fontSize: "12px" }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px", fontWeight: "bold" }}>
                  Save Profile Customization & Colors
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dashboard layout
  return (
    <div data-theme="light" className="dashboard-layout" style={{ minHeight: "100vh", display: "flex", backgroundColor: "#f1f5f9", color: "#1e293b" }}>
      {school.themeColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --primary: ${school.themeColor} !important;
            --primary-hover: ${school.themeColor}dd !important;
            --primary-glow: ${school.themeColor}2e !important;
          }
        `}} />
      )}

      {/* Sidebar Backdrop Overlay for Mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`} 
        onClick={() => setSidebarOpen(false)}
        style={{ display: "none" }}
      />
      
      {/* Sidebar navigation */}
      <aside 
        style={{ width: "260px", background: "linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)", color: "white", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }} 
        className={`sidebar-nav flex-mobile-col no-print ${sidebarOpen ? "open" : ""}`}
      >
        <div style={{ padding: "24px", borderBottom: "1px solid rgba(255, 255, 255, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "contain", background: "white", padding: "2px" }} />
            ) : (
              <GraduationCap size={28} color="white" />
            )}
            <div>
              <h3 style={{ color: "white", fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>{school.name}</h3>
              <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.75)", textTransform: "uppercase", letterSpacing: "1px" }}>{currentUser.role} Portal</span>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setSidebarOpen(false)}
            className="mobile-close-btn"
            style={{ display: "none", background: "transparent", border: "none", color: "white", cursor: "pointer", padding: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        <nav 
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("button")) {
              setSidebarOpen(false);
            }
          }}
          style={{ padding: "20px 10px", flex: 1, display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto" }}
        >
          {/* Universal view */}
          {["ADMIN", "HEADTEACHER", "DIRECTOR", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("overview")} 
              className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "overview" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "overview" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <ClipboardList size={18} /> Overview
            </button>
          )}

          {/* SMS Broadcast Module */}
          {["ADMIN", "HEADTEACHER", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("sms")} 
              className={`btn ${activeTab === "sms" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "sms" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "sms" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <MessageSquare size={18} /> SMS Broadcast
            </button>
          )}

          {/* School Settings (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("settings")} 
              className={`btn ${activeTab === "settings" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "settings" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "settings" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Settings size={18} /> School Profile & Theme
            </button>
          )}

          {/* Report Card Designer */}
          {["ADMIN", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("report_designer")} 
              className={`btn ${activeTab === "report_designer" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "report_designer" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "report_designer" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Sliders size={18} /> Report Designer
            </button>
          )}

          {/* Class Setup (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("classes")} 
              className={`btn ${activeTab === "classes" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "classes" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "classes" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Building2 size={18} /> Classes & Subjects
            </button>
          )}

          {/* Students Directory */}
          {["ADMIN", "DOS", "HEADTEACHER", "TEACHER"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("students")} 
              className={`btn ${activeTab === "students" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "students" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "students" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Users size={18} /> Student Registry
            </button>
          )}

          {/* Staff Directory (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("staff")} 
              className={`btn ${activeTab === "staff" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "staff" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "staff" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Users size={18} /> Staff Accounts
            </button>
          )}

          {/* Academic Promotion (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("promotion")} 
              className={`btn ${activeTab === "promotion" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "promotion" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "promotion" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Layers size={18} /> Academic Promotion
            </button>
          )}

          {/* DOS view */}
          {["ADMIN", "DOS", "HEADTEACHER"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("exams")} 
              className={`btn ${activeTab === "exams" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "exams" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "exams" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Layers size={18} /> Examination Papers
            </button>
          )}

          {/* Teachers view */}
          {["ADMIN", "TEACHER", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("marks")} 
              className={`btn ${activeTab === "marks" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "marks" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "marks" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Award size={18} /> Upload Student Marks
            </button>
          )}

          {/* Attendance */}
          {["ADMIN", "TEACHER", "HEADTEACHER", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("attendance")} 
              className={`btn ${activeTab === "attendance" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "attendance" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "attendance" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <UserCheck size={18} /> Student Attendance
            </button>
          )}

          {/* Reports */}
          {["ADMIN", "HEADTEACHER", "DIRECTOR", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("reports")} 
              className={`btn ${activeTab === "reports" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "reports" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "reports" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <FileText size={18} /> Report Cards
            </button>
          )}

          {/* Finance dashboard (Director & Admin only & Premium only) */}
          {["ADMIN", "DIRECTOR"].includes(currentUser.role) && school.packageType === "PREMIUM" && (
            <>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.7)", textTransform: "uppercase", letterSpacing: "1px", margin: "14px 10px 4px", fontWeight: 700 }}>School Accounts</div>
              
              <button 
                onClick={() => setActiveTab("finance_overview")} 
                className={`btn ${activeTab === "finance_overview" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "finance_overview" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "finance_overview" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <ClipboardList size={16} /> Financial Overview
              </button>
              
              <button 
                onClick={() => setActiveTab("tuition_fees")} 
                className={`btn ${activeTab === "tuition_fees" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "tuition_fees" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "tuition_fees" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <Building2 size={16} /> Class Fee Structures
              </button>
              
              <button 
                onClick={() => setActiveTab("student_billing")} 
                className={`btn ${activeTab === "student_billing" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "student_billing" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "student_billing" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <DollarSign size={16} /> Tuition Payments
              </button>

              <button 
                onClick={() => setActiveTab("defaulters_list")} 
                className={`btn ${activeTab === "defaulters_list" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "defaulters_list" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "defaulters_list" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <Users size={16} /> Defaulters Directory
              </button>

              <button 
                onClick={() => setActiveTab("expenditures")} 
                className={`btn ${activeTab === "expenditures" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "expenditures" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "expenditures" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <TrendingUp size={16} /> School Expenditures
              </button>

              <button 
                onClick={() => setActiveTab("payroll")} 
                className={`btn ${activeTab === "payroll" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "payroll" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "payroll" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <Users size={16} /> Staff Payroll Ledger
              </button>
            </>
          )}

          {/* Subscription & Billing (Admin only) */}
          {currentUser.role === "ADMIN" && (
            <button 
              onClick={() => setActiveTab("billing")} 
              className={`btn ${activeTab === "billing" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "billing" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "billing" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <CreditCard size={18} /> Subscription & Billing
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

      {/* Right Content Area */}
      <div className="workspace-container" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        
        {/* Mobile Header Bar */}
        <div className="mobile-header no-print" style={{ display: "none" }}>
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="btn btn-outline" 
            style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "white", borderRadius: "6px" }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {school.logoUrl ? (
              <img src={school.logoUrl} alt="Logo" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "contain", background: "white" }} />
            ) : (
              <GraduationCap size={20} color="var(--primary)" />
            )}
            <strong style={{ fontSize: "14px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>{school.name}</strong>
          </div>
          <button 
            onClick={handleLogout} 
            className="btn btn-outline" 
            style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "white", borderRadius: "6px", color: "#ef4444" }}
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Main Workspace */}
        <main style={{ flex: 1, padding: "40px" }} className="main-workspace animate-fade-in">
        
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

            {/* Dashboard Analytics Graphs */}
            {(() => {
              const enrollmentData = classes.map(c => {
                const count = students.filter(s => s.classId === c.id).length;
                return { className: c.name, count };
              });
              const maxCount = Math.max(...enrollmentData.map(d => d.count), 1);
              const dayStudents = students.filter(s => s.type === "DAY").length;
              const boardingStudents = students.filter(s => s.type === "BOARDING").length;
              const maxResidency = Math.max(dayStudents, boardingStudents, 1);
              const totalPaid = studentPayments.reduce((acc, p) => acc + p.amountPaid, 0);
              const totalBalance = studentPayments.reduce((acc, p) => acc + p.balance, 0);
              const maxFinance = Math.max(totalPaid, totalBalance, 1);

              return (
                <div className="grid grid-cols-2 gap-3 flex-mobile-col no-print" style={{ marginBottom: "30px" }}>
                  
                  {/* Graph A: Student Enrollment per Class */}
                  <div className="card">
                    <h3 style={{ marginBottom: "20px", fontSize: "16px", fontWeight: "bold" }}>Class Enrollment Distribution</h3>
                    <div style={{ width: "100%", height: "220px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "10px 20px 25px 20px", position: "relative", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ position: "absolute", top: "10px", bottom: "40px", left: "0", right: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                        <div style={{ borderBottom: "1px dashed #e2e8f0", width: "100%" }}></div>
                        <div style={{ borderBottom: "1px dashed #e2e8f0", width: "100%" }}></div>
                        <div style={{ borderBottom: "1px dashed #e2e8f0", width: "100%" }}></div>
                        <div style={{ borderBottom: "1px dashed #e2e8f0", width: "100%" }}></div>
                      </div>

                      {enrollmentData.map((d, index) => {
                        const heightPercent = (d.count / maxCount) * 100;
                        return (
                          <div key={index} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, position: "relative" }}>
                            <span style={{ fontSize: "10px", fontWeight: "bold", color: "var(--primary)", marginBottom: "4px" }}>{d.count}</span>
                            <div style={{ width: "100%", maxWidth: "32px", height: `${Math.max(heightPercent * 1.3, 4)}px`, background: "linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)", borderRadius: "4px 4px 0 0" }}></div>
                            <span style={{ position: "absolute", bottom: "-22px", fontSize: "10px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "55px", textAlign: "center" }} title={d.className}>{d.className}</span>
                          </div>
                        );
                      })}
                      {enrollmentData.length === 0 && (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontStyle: "italic", fontSize: "13px" }}>No enrollment records available.</div>
                      )}
                    </div>
                  </div>

                  {/* Graph B: Residency Type or Finance Status */}
                  <div className="card">
                    {school.packageType === "PREMIUM" ? (
                      <div>
                        <h3 style={{ marginBottom: "20px", fontSize: "16px", fontWeight: "bold" }}>Term Fees Ledger Summary</h3>
                        <div style={{ width: "100%", height: "220px", display: "flex", alignItems: "flex-end", gap: "24px", padding: "10px 40px 25px 40px", position: "relative", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          
                          {/* Paid Bar */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#10b981", marginBottom: "6px" }}>{totalPaid.toLocaleString()} UGX</span>
                            <div style={{ width: "100%", maxWidth: "60px", height: `${(totalPaid / maxFinance) * 130 + 4}px`, background: "linear-gradient(180deg, #10b981 0%, #059669 100%)", borderRadius: "6px 6px 0 0" }}></div>
                            <span style={{ marginTop: "6px", fontSize: "11px", fontWeight: "bold", color: "#374151" }}>Total Collected</span>
                          </div>

                          {/* Balance Bar */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#f59e0b", marginBottom: "6px" }}>{totalBalance.toLocaleString()} UGX</span>
                            <div style={{ width: "100%", maxWidth: "60px", height: `${(totalBalance / maxFinance) * 130 + 4}px`, background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)", borderRadius: "6px 6px 0 0" }}></div>
                            <span style={{ marginTop: "6px", fontSize: "11px", fontWeight: "bold", color: "#374151" }}>Outstanding Balances</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ marginBottom: "20px", fontSize: "16px", fontWeight: "bold" }}>Residency Structure Breakdown</h3>
                        <div style={{ width: "100%", height: "220px", display: "flex", alignItems: "flex-end", gap: "24px", padding: "10px 40px 25px 40px", position: "relative", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          
                          {/* Day Students Bar */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--primary)", marginBottom: "6px" }}>{dayStudents} Pupils</span>
                            <div style={{ width: "100%", maxWidth: "60px", height: `${(dayStudents / maxResidency) * 130 + 4}px`, background: "linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)", borderRadius: "6px 6px 0 0" }}></div>
                            <span style={{ marginTop: "6px", fontSize: "11px", fontWeight: "bold", color: "#374151" }}>Day Students</span>
                          </div>

                          {/* Boarding Students Bar */}
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1 }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#8b5cf6", marginBottom: "6px" }}>{boardingStudents} Pupils</span>
                            <div style={{ width: "100%", maxWidth: "60px", height: `${(boardingStudents / maxResidency) * 130 + 4}px`, background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)", borderRadius: "6px 6px 0 0" }}></div>
                            <span style={{ marginTop: "6px", fontSize: "11px", fontWeight: "bold", color: "#374151" }}>Boarding Students</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}

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

        {/* TAB 2: SETTINGS (Admin only) */}
        {activeTab === "settings" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>School Settings & Customization</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Configure your school profile metadata, official contacts, logo badge, and dashboard theme color.</p>

            {profileSuccessMsg && (
              <div style={{ background: "var(--success-light)", border: "1px solid var(--success)", borderRadius: "8px", padding: "12px", color: "var(--success)", fontSize: "14px", marginBottom: "20px" }}>
                {profileSuccessMsg}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card">
                <h4 style={{ marginBottom: "20px" }}><Settings size={18} /> Official Profile Metadata</h4>
                <form onSubmit={handleUpdateProfile}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">School Official Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Telephone</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">P.O. Box Location & Physical Address</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. P.O. Box 1234, Kampala, Uganda" 
                      value={profilePoBox}
                      onChange={(e) => setProfilePoBox(e.target.value)}
                    />
                  </div>

                  <div style={{ height: "1px", background: "#e2e8f0", margin: "20px 0" }}></div>

                  <h4 style={{ marginBottom: "16px", fontSize: "14px", color: "#0f172a" }}>Administrative Leader Names</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="form-group">
                      <label className="form-label">Head Teacher</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={profileHeadTeacher}
                        onChange={(e) => setProfileHeadTeacher(e.target.value)}
                        placeholder="Name of Head Teacher"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Deputy Head Teacher</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={profileDeputyHeadTeacher}
                        onChange={(e) => setProfileDeputyHeadTeacher(e.target.value)}
                        placeholder="Name of Deputy"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Director / Owner</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={profileDirector}
                        onChange={(e) => setProfileDirector(e.target.value)}
                        placeholder="Name of Director"
                      />
                    </div>
                  </div>

                  <div style={{ height: "1px", background: "#e2e8f0", margin: "20px 0" }}></div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-group">
                      <label className="form-label">School Logo/Badge</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="input-field" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              alert("Logo image should be less than 1MB to store directly in the database.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfileLogoUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ padding: "8px" }}
                      />
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
                        <span style={{ color: "#64748b", fontSize: "11px", whiteSpace: "nowrap" }}>Or URL:</span>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. https://example.com/logo.png" 
                          value={profileLogoUrl && profileLogoUrl.startsWith("data:") ? "" : profileLogoUrl}
                          onChange={(e) => setProfileLogoUrl(e.target.value)}
                          style={{ fontSize: "11px", padding: "4px 8px", height: "auto" }}
                        />
                      </div>
                      {profileLogoUrl && (
                        <button 
                          type="button" 
                          onClick={() => setProfileLogoUrl("")}
                          className="btn btn-outline"
                          style={{ padding: "4px 8px", fontSize: "11px", marginTop: "4px", color: "var(--danger)", borderColor: "var(--danger)", alignSelf: "flex-start" }}
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dashboard Accent Theme Color</label>
                      <div className="flex align-center gap-1">
                        <input 
                          type="color" 
                          value={profileThemeColor}
                          onChange={(e) => setProfileThemeColor(e.target.value)}
                          style={{ width: "40px", height: "40px", border: "none", cursor: "pointer", padding: 0, borderRadius: "6px" }}
                        />
                        <input 
                          type="text" 
                          className="input-field" 
                          value={profileThemeColor}
                          onChange={(e) => setProfileThemeColor(e.target.value)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: "16px", width: "100%" }}>
                    Save Profile & Customize Dashboard Accent
                  </button>
                </form>
              </div>

              {/* Preview */}
              <div className="card text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <h4 style={{ marginBottom: "16px" }}>Branding Preview</h4>
                <div style={{ width: "120px", height: "120px", borderRadius: "16px", background: "#f8fafc", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "16px" }}>
                  {profileLogoUrl ? (
                    <img src={profileLogoUrl} alt="Logo preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <GraduationCap size={48} color={profileThemeColor} />
                  )}
                </div>
                <h3 style={{ color: "#0f172a", marginBottom: "4px" }}>{profileName || school.name}</h3>
                <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700 }}>{profilePoBox || "No P.O. Box Address set"}</span>
                
                <div style={{ marginTop: "24px", padding: "12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%", textAlign: "left" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Admin Team:</div>
                  <div style={{ fontSize: "12px", color: "#0f172a", marginTop: "4px" }}>👤 **Head:** {profileHeadTeacher || "Not set"}</div>
                  <div style={{ fontSize: "12px", color: "#0f172a", marginTop: "2px" }}>👤 **Deputy:** {profileDeputyHeadTeacher || "Not set"}</div>
                  <div style={{ fontSize: "12px", color: "#0f172a", marginTop: "2px" }}>👤 **Director:** {profileDirector || "Not set"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2B: CLASSES (Admin only) */}
        {activeTab === "classes" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Classes, Streams & Subjects</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Configure classes, streams, and academic subjects offered by your institution.</p>

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
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create Class</button>
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
                      <option value="">-- Choose class --</option>
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
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create Stream</button>
                </form>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="flex-mobile-col">
              {/* Configure Subjects */}
              <div className="card">
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
                        <option value="">-- Choose class --</option>
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
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Add Subject</button>
                </form>
              </div>

              {/* Academic Overview List */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Existing Curriculums & Classes</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Level</th>
                        <th>Streams</th>
                        <th>Subjects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No classes configured yet.</td></tr>
                      ) : (
                        classes.map(c => {
                          const clsStreams = streams.filter(s => s.classId === c.id).map(s => s.name).join(", ");
                          const clsSubjects = subjects.filter(s => s.classId === c.id).map(s => s.name).join(", ");
                          return (
                            <tr key={c.id}>
                              <td><strong>{c.name}</strong></td>
                              <td><span className={`badge ${c.level === "SECONDARY" ? "badge-success" : "badge-primary"}`}>{c.level}</span></td>
                              <td>{clsStreams || <span style={{ color: "#94a3b8", fontSize: "12px" }}>None</span>}</td>
                              <td>{clsSubjects || <span style={{ color: "#94a3b8", fontSize: "12px" }}>None</span>}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2C: STUDENTS (Admin/DOS/Head/Teacher) */}
        {activeTab === "students" && (
          <div className="tab-content-anim">
            <div className="flex justify-between align-center no-print" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ marginBottom: "6px" }}>Student Registry & Directory</h2>
                <p style={{ color: "#64748b", margin: 0 }}>Register new student parameters and manage the current student directory.</p>
              </div>
              {currentUser.role === "ADMIN" && (
                <button 
                  onClick={() => {
                    if (classes.length > 0) {
                      setBulkStudentClassId(classes[0].id);
                      const subStreams = streams.filter(s => s.classId === classes[0].id);
                      if (subStreams.length > 0) {
                        setBulkStudentStreamId(subStreams[0].id);
                      }
                    }
                    setShowBulkStudentModal(true);
                  }}
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: "white" }}
                >
                  <PlusCircle size={16} /> Bulk Upload Students
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              {/* Register Student */}
              <div className="card" style={{ height: "fit-content" }}>
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
                        <option value="">-- Choose class --</option>
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
                        <option value="">-- Choose stream --</option>
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
                        placeholder="e.g. STU-2026-0001" 
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
                  <div className="form-group">
                    <label className="form-label">Learner Identification Number (LIN)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. LIN-12345678" 
                      value={newStudentLin}
                      onChange={(e) => setNewStudentLin(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Student Portrait Photo (Required)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="input-field" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            alert("Photo size should be less than 1MB to store directly in the database.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewStudentPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      required
                      style={{ padding: "8px" }}
                    />
                    {newStudentPhoto && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
                          <img src={newStudentPhoto} alt="Student Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--success)" }}>✓ Image ready</span>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Register Student</button>
                </form>
              </div>

              {/* Student Directory List */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Current Enrolled Students</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>ID Number</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Stream</th>
                        <th>Type</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>No students registered yet.</td></tr>
                      ) : (
                        students.map(st => {
                          const cls = classes.find(c => c.id === st.classId)?.name || "N/A";
                          const strm = streams.find(s => s.id === st.streamId)?.name || "N/A";
                          return (
                            <tr key={st.id}>
                              <td>
                                <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                                  {st.photo ? (
                                    <img src={st.photo} alt={st.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <Users size={16} color="#94a3b8" />
                                  )}
                                </div>
                              </td>
                              <td><code>{st.studentNumber}</code></td>
                              <td><strong>{st.name}</strong></td>
                              <td>{cls}</td>
                              <td>{strm}</td>
                              <td>
                                <span className={`badge ${st.type === "BOARDING" ? "badge-warning" : "badge-primary"}`}>
                                  {st.type}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button 
                                    onClick={() => {
                                      setSelectedViewStudent(st);
                                      setShowViewStudentModal(true);
                                    }}
                                    className="btn btn-outline" 
                                    style={{ padding: "4px 8px", fontSize: "11px" }}
                                  >
                                    View
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSelectedEditStudent(st);
                                      setEditStudentName(st.name);
                                      setEditStudentNumber(st.studentNumber);
                                      setEditStudentClassId(st.classId);
                                      setEditStudentStreamId(st.streamId);
                                      setEditStudentType(st.type);
                                      setEditStudentPhoto(st.photo || "");
                                      setEditStudentLin(st.lin || "");
                                      setShowEditStudentModal(true);
                                    }}
                                    className="btn btn-outline" 
                                    style={{ padding: "4px 8px", fontSize: "11px", color: "var(--primary)", borderColor: "var(--primary)" }}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete student "${st.name}"?`)) {
                                        await deleteStudent(st.id);
                                        await loadSchoolData(school!.id);
                                      }
                                    }}
                                    className="btn btn-outline" 
                                    style={{ padding: "4px 8px", fontSize: "11px", color: "var(--danger)", borderColor: "var(--danger)" }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2D: STAFF DIRECTORY (Admin only) */}
        {activeTab === "staff" && (
          <div className="tab-content-anim">
            <div className="flex justify-between align-center no-print" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ marginBottom: "6px" }}>Staff & User Accounts</h2>
                <p style={{ color: "#64748b", margin: 0 }}>Manage accounts and system access roles for teachers, DOS, and administrators.</p>
              </div>
              <button 
                onClick={() => setShowBulkStaffModal(true)} 
                className="btn btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "white" }}
              >
                <PlusCircle size={16} /> Bulk Upload Staff
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              {/* Create Staff */}
              <div className="card" style={{ height: "fit-content" }}>
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
                  <div className="form-group" style={{ marginTop: "12px" }}>
                    <label className="form-label">Staff ID Number</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. STF-2026-0001" 
                      value={newTeacherStaffNumber}
                      onChange={(e) => setNewTeacherStaffNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Staff Portrait Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="input-field" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            alert("Photo size should be less than 1MB to store directly in the database.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewTeacherPhoto(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ padding: "8px" }}
                    />
                    {newTeacherPhoto && (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                        <div style={{ width: "50px", height: "50px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
                          <img src={newTeacherPhoto} alt="Staff Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--success)" }}>✓ Image ready</span>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create User Credentials</button>
                </form>
              </div>

              {/* Staff Accounts Table */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Registered Staff Accounts</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Staff ID</th>
                        <th>Name</th>
                        <th>Email Address</th>
                        <th>Role Access</th>
                        <th>Joined Date</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>No staff accounts registered.</td></tr>
                      ) : (
                        users.map(u => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ width: "36px", height: "36px", borderRadius: "50%", overflow: "hidden", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                                {u.photo ? (
                                  <img src={u.photo} alt={u.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <Users size={16} color="#94a3b8" />
                                )}
                              </div>
                            </td>
                            <td><code>{u.staffNumber || "N/A"}</code></td>
                            <td><strong>{u.name}</strong></td>
                            <td><code>{u.email}</code></td>
                            <td>
                              <span className={`badge ${u.role === "ADMIN" ? "badge-danger" : u.role === "DOS" ? "badge-success" : u.role === "DIRECTOR" ? "badge-warning" : "badge-primary"}`}>
                                {u.role}
                              </span>
                            </td>
                            <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}</td>
                            <td>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                <button 
                                  onClick={() => {
                                    setSelectedViewStaff(u);
                                    setShowViewStaffModal(true);
                                  }}
                                  className="btn btn-outline" 
                                  style={{ padding: "4px 8px", fontSize: "11px" }}
                                >
                                  View
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedEditStaff(u);
                                    setEditStaffName(u.name);
                                    setEditStaffEmail(u.email);
                                    setEditStaffRole(u.role);
                                    setEditStaffNumber(u.staffNumber || "");
                                    setEditStaffPhoto(u.photo || "");
                                    setShowEditStaffModal(true);
                                  }}
                                  className="btn btn-outline" 
                                  style={{ padding: "4px 8px", fontSize: "11px", color: "var(--primary)", borderColor: "var(--primary)" }}
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (u.role === "ADMIN") {
                                      alert("Super Administrator accounts cannot be deleted directly.");
                                      return;
                                    }
                                    if (confirm(`Are you sure you want to delete staff account "${u.name}"?`)) {
                                      await deleteUser(u.id);
                                      await loadSchoolData(school!.id);
                                    }
                                  }}
                                  className="btn btn-outline" 
                                  style={{ padding: "4px 8px", fontSize: "11px", color: "var(--danger)", borderColor: "var(--danger)" }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2E: ACADEMIC PROMOTION TOOL (Admin only) */}
        {activeTab === "promotion" && (
          <div className="tab-content-anim" style={{ maxWidth: "600px" }}>
            <h2 style={{ marginBottom: "10px" }}>Academic Promotion Tool</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Promote entire classes of students to the next level at the start of a new academic year.</p>

            <div className="card">
              <h4 style={{ marginBottom: "16px" }}><Layers size={18} /> Batch Student Promotion Tool</h4>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "20px", lineHeight: 1.5 }}>
                Use this to promote all students from one class level to another (e.g. promoting P6 class to P7 class) at the start of a new academic year. This updates all student class IDs in the database in a single batch.
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
                      <option value="">-- Choose source class --</option>
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
                <button type="submit" className="btn btn-primary" style={{ marginTop: "10px", width: "100%" }}>
                  Run Academic Promotion
                </button>
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
            <h2 className="no-print" style={{ marginBottom: "20px" }}>Student Report Cards</h2>
            <p className="no-print" style={{ color: "#64748b", marginBottom: "30px" }}>Select a class to generate report cards. Click on a student to preview and print their official report.</p>

            <div className="grid grid-cols-3 gap-3">
              
              {/* Select Panel */}
              <div className="card no-print">
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
                    <div className="flex justify-between align-center no-print" style={{ marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                      <h3>Preview Report Card</h3>
                      <button onClick={triggerPrint} className="btn btn-primary">
                        <Printer size={16} /> Print/Save PDF
                      </button>
                    </div>

                    {/* Report Card Template (Print Target) */}
                    <div id="printable-report" className="card" style={{ background: "white", color: "black", borderColor: "#cbd5e1", padding: "40px", fontFamily: "Arial, sans-serif" }}>
                      
                      {/* School Heading */}
                      <div style={{ textAlign: "center", borderBottom: school.reportBorderType === "solid" ? "1px solid black" : school.reportBorderType === "none" ? "none" : "3px double black", paddingBottom: "14px", marginBottom: "20px" }}>
                        {school.reportShowBadge && (
                          <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                            {school.logoUrl ? (
                              <img src={school.logoUrl} alt="Logo" style={{ width: `${school.reportLogoSize || 60}px`, height: `${school.reportLogoSize || 60}px`, objectFit: "contain" }} />
                            ) : (
                              <GraduationCap size={Math.round((school.reportLogoSize || 60) * 0.8)} color="var(--primary)" />
                            )}
                          </div>
                        )}
                        <h2 style={{ fontSize: "24px", margin: 0, textTransform: "uppercase", color: school.reportHeaderColor || "#1e3a8a" }}>{school.name}</h2>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", fontStyle: "italic" }}>
                          P.O. Box {school.poBox || "Kampala, Uganda"} • Tel: {school.contactPhone} • Email: {school.contactEmail}
                        </p>
                        {school.reportMotto && (
                          <p style={{ margin: "2px 0 0", fontSize: "11px", fontStyle: "italic", fontWeight: "bold", color: "#475569" }}>
                            Motto: "{school.reportMotto}"
                          </p>
                        )}
                        <h3 style={{ fontSize: "16px", margin: "10px 0 0", textTransform: "uppercase", textDecoration: "underline" }}>
                          {school.reportTitle || "OFFICIAL ACADEMIC REPORT CARD"}
                        </h3>
                      </div>

                      {/* Student Meta details with Optional Student Photo */}
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "20px", borderBottom: "1px solid #94a3b8", paddingBottom: "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px", flex: 1 }}>
                          <div><strong>Student Name:</strong> {selectedReportStudent.name}</div>
                          <div><strong>Class:</strong> {classes.find(c => c.id === selectedReportStudent.classId)?.name}</div>
                          <div><strong>Student Number:</strong> {selectedReportStudent.studentNumber}</div>
                          <div><strong>Academic Term:</strong> Term {selectedReportTerm} (2026)</div>
                          {school.reportShowResidency && (
                            <div><strong>Residency Type:</strong> {selectedReportStudent.type}</div>
                          )}
                          <div><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</div>
                        </div>
                        {school.reportShowStudentPhoto !== false && (
                          <div style={{ width: "75px", height: "80px", border: "1px solid #cbd5e1", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#f8fafc", flexShrink: 0 }}>
                            {selectedReportStudent.photo ? (
                              <img src={selectedReportStudent.photo} alt="Student" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>No Photo</span>
                            )}
                          </div>
                        )}
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
                      {classes.find(c => c.id === selectedReportStudent.classId)?.level === "SECONDARY" && school.reportShowRules && (
                        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "12px", lineHeight: "1.4" }}>
                          <strong>CBC Grading Guideline:</strong> Grade A = Exceptional Competency, Grade B = Outstanding, Grade C = Satisfactory, Grade D = Basic, Grade E = Elementary.
                        </div>
                      )}

                      {/* Signatures */}
                      {school.reportShowSignatures && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px" }}>
                          <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>Class Teacher</div>
                          <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>Head Teacher</div>
                          <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>School Stamp</div>
                        </div>
                      )}

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

        {/* TAB 6A: FINANCIAL OVERVIEW */}
        {activeTab === "finance_overview" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Financial Overview & Accounts Ledger</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Monitor overall term cash flows, balance sheets, and review unified transactions timeline.</p>

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

            {/* Unified ledger list */}
            <div className="card">
              <h4 style={{ marginBottom: "16px" }}>Unified Ledger Timeline</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category/Details</th>
                      <th>Description</th>
                      <th>Transaction Reference</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Combine payments and expenses, sort by date descending */}
                    {(() => {
                      const ledgerItems: any[] = [];
                      studentPayments.forEach(p => {
                        const stud = students.find(s => s.id === p.studentId);
                        ledgerItems.push({
                          date: p.date,
                          type: "RECEIPT",
                          category: "Tuition Fee",
                          description: stud ? `Fee payment by ${stud.name} (${stud.studentNumber})` : "Fee payment",
                          ref: "REC-T1-2026",
                          amount: p.amountPaid,
                          isIncome: true
                        });
                      });
                      expenses.forEach(e => {
                        ledgerItems.push({
                          date: e.date,
                          type: "EXPENSE",
                          category: e.category,
                          description: e.description,
                          ref: "EXP-" + e.id.substring(4, 10).toUpperCase(),
                          amount: e.amount,
                          isIncome: false
                        });
                      });
                      ledgerItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                      
                      if (ledgerItems.length === 0) {
                        return <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>No ledger transactions captured yet.</td></tr>;
                      }

                      return ledgerItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge ${item.isIncome ? "badge-success" : "badge-danger"}`}>
                              {item.type}
                            </span>
                          </td>
                          <td><strong>{item.category}</strong></td>
                          <td>{item.description}</td>
                          <td><code style={{ fontSize: "11px" }}>{item.ref}</code></td>
                          <td style={{ fontWeight: 700, color: item.isIncome ? "var(--success)" : "var(--danger)" }}>
                            {item.isIncome ? "+" : "-"}{item.amount.toLocaleString()} UGX
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6B: TUITION & FEES STRUCTURE */}
        {activeTab === "tuition_fees" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Tuition & Class Fees Configuration</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Set standard term tuition rates for day and boarding students by class level.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Configure Fee Structure</h4>
                <form onSubmit={handleSaveFee}>
                  <div className="form-group">
                    <label className="form-label">Select Class</label>
                    <select 
                      className="input-field" 
                      value={selectedFeeClassId}
                      onChange={(e) => setSelectedFeeClassId(e.target.value)}
                      required
                    >
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tuition / Day Student Fee (UGX)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 450000"
                      value={tuitionAmount}
                      onChange={(e) => setTuitionAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Extra Boarding Student Fee (UGX)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 700000"
                      value={boardingAmount}
                      onChange={(e) => setBoardingAmount(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Fee Rules</button>
                </form>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Current Term Fee Structures</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Class Level</th>
                        <th>Day Student Tuition</th>
                        <th>Boarding Surcharge</th>
                        <th>Total Boarding Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeStructures.map(fs => {
                        const clName = classes.find(c => c.id === fs.classId)?.name || "Unknown";
                        return (
                          <tr key={fs.id}>
                            <td><strong>{clName}</strong></td>
                            <td>{fs.tuitionAmount.toLocaleString()} UGX</td>
                            <td>+{fs.boardingAmount.toLocaleString()} UGX</td>
                            <td><strong style={{ color: "var(--primary)" }}>{(fs.tuitionAmount + fs.boardingAmount).toLocaleString()} UGX</strong></td>
                          </tr>
                        );
                      })}
                      {feeStructures.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No structures recorded yet. Set term fees for classes first.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6C: STUDENT BILLING & PAYMENTS */}
        {activeTab === "student_billing" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Record Tuition Payments</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Log tuition receipts or trigger simulated payment prompts for Mobile Money and Credit Cards.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Record Receipt Payment</h4>
                <form onSubmit={handleRecordStudentPay}>
                  <div className="form-group">
                    <label className="form-label">Select Student</label>
                    <select 
                      className="input-field" 
                      value={selectedPayStudentId}
                      onChange={(e) => setSelectedPayStudentId(e.target.value)}
                      required
                    >
                      {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentNumber})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid (UGX)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 300000"
                      value={payAmountPaid}
                      onChange={(e) => setPayAmountPaid(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginBottom: "10px" }}>Log Cash Payment Receipt</button>
                  
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
                    style={{ width: "100%", borderColor: "var(--success)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                  >
                    💸 Pay via Mobile Money (Simulated API)
                  </button>
                </form>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Term Collections Logs</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Student Number</th>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Amount Settled</th>
                        <th>Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPayments.map(p => {
                        const stud = students.find(s => s.id === p.studentId);
                        const cl = classes.find(c => c.id === stud?.classId)?.name || "Unknown";
                        return (
                          <tr key={p.id}>
                            <td>{new Date(p.date).toLocaleDateString()}</td>
                            <td><code>{stud?.studentNumber}</code></td>
                            <td><strong>{stud?.name}</strong></td>
                            <td>{cl}</td>
                            <td style={{ color: "var(--success)", fontWeight: "bold" }}>+{p.amountPaid.toLocaleString()} UGX</td>
                            <td>{p.balance > 0 ? `${p.balance.toLocaleString()} UGX` : <span className="badge badge-success">Cleared</span>}</td>
                          </tr>
                        );
                      })}
                      {studentPayments.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>No tuition payments recorded this term.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6D: FEE DEFAULTERS DIRECTORY */}
        {activeTab === "defaulters_list" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Fees Defaulters Directory</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Monitor and audit students with outstanding tuition balances for this term.</p>

            <div className="card">
              <h4 style={{ marginBottom: "16px" }}>Outstanding Balances Ledger</h4>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student Number</th>
                      <th>Student Name</th>
                      <th>Class Stream</th>
                      <th>Residency Type</th>
                      <th>Total Fee Due</th>
                      <th>Amount Paid</th>
                      <th>Deficit Balance</th>
                      <th>Status Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const defaulters = students.map(st => {
                        const fs = feeStructures.find(f => f.classId === st.classId);
                        const totalDue = st.type === "BOARDING" 
                          ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
                          : (fs?.tuitionAmount || 0);

                        const sp = studentPayments.find(p => p.studentId === st.id);
                        const totalPaid = sp ? sp.amountPaid : 0;
                        const balance = sp ? sp.balance : totalDue;

                        const cl = classes.find(c => c.id === st.classId)?.name || "N/A";
                        const strm = streams.find(s => s.id === st.streamId)?.name || "N/A";

                        return { st, totalDue, totalPaid, balance, cl, strm };
                      });

                      if (defaulters.length === 0) {
                        return <tr><td colSpan={8} style={{ textAlign: "center", color: "#64748b" }}>No registered students available.</td></tr>;
                      }

                      return defaulters.map(({ st, totalDue, totalPaid, balance, cl, strm }) => (
                        <tr key={st.id}>
                          <td><code>{st.studentNumber}</code></td>
                          <td><strong>{st.name}</strong></td>
                          <td>{cl} ({strm})</td>
                          <td>
                            <span className={`badge ${st.type === "BOARDING" ? "badge-warning" : "badge-primary"}`}>
                              {st.type}
                            </span>
                          </td>
                          <td>{totalDue.toLocaleString()} UGX</td>
                          <td>{totalPaid.toLocaleString()} UGX</td>
                          <td>
                            <span className={`badge ${balance > 0 ? "badge-danger" : "badge-success"}`}>
                              {balance > 0 ? `${balance.toLocaleString()} UGX` : "Cleared"}
                            </span>
                          </td>
                          <td>
                            {balance > 0 ? (
                              <button 
                                onClick={() => {
                                  setSelectedPayStudentId(st.id);
                                  setActiveTab("student_billing");
                                }}
                                className="btn btn-outline"
                                style={{ padding: "6px 12px", fontSize: "11px", borderColor: "var(--danger)", color: "var(--danger)" }}
                              >
                                Collect Fees
                              </button>
                            ) : (
                              <span style={{ color: "var(--success)", fontSize: "12px", fontWeight: "bold" }}>Paid In Full</span>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6E: EXPENDITURES & EXPENSES */}
        {activeTab === "expenditures" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>School Expenditures Outflows</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Log utility bills, academic supplies purchases, repairs, and general operational expenses.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Record Expenditure Outflow</h4>
                <form onSubmit={handleCreateExpense}>
                  <div className="form-group">
                    <label className="form-label">Expense Category</label>
                    <select className="input-field" value={expCategory} onChange={(e) => setExpCategory(e.target.value)} required>
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
                      placeholder="e.g. 180000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description Notes</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Purchase of library chalk"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Log Expense Outflow</button>
                </form>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Expenditures History Log</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description Details</th>
                        <th>Outflow Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(e => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleDateString()}</td>
                          <td><strong>{e.category}</strong></td>
                          <td>{e.description}</td>
                          <td style={{ color: "var(--danger)", fontWeight: "bold" }}>-{e.amount.toLocaleString()} UGX</td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No expenditure logs recorded.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6F: STAFF PAYROLL */}
        {activeTab === "payroll" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Staff Payroll & Salaries</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Disburse and record monthly wages for teachers, DOS, and administrative staff members.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Process Salary Payout</h4>
                <form onSubmit={handleProcessSalary}>
                  <div className="form-group">
                    <label className="form-label">Select Staff Member</label>
                    <select 
                      className="input-field" 
                      value={payTeacherId}
                      onChange={(e) => setPayTeacherId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose staff --</option>
                      {users.filter(u => u.schoolId === school.id && u.role !== "ADMIN").map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "12px" }}>
                    <div className="form-group">
                      <label className="form-label">Salary Month</label>
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
                      <label className="form-label">Net Payout (UGX)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        placeholder="e.g. 600000"
                        value={paySalaryAmount}
                        onChange={(e) => setPaySalaryAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Disburse Wages & Log Expense</button>
                </form>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Processed Salary History</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date Processed</th>
                        <th>Month</th>
                        <th>Details Notes</th>
                        <th>Salary Paid Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.filter(e => e.category === "Salaries").map(e => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleDateString()}</td>
                          <td><strong>{e.description.includes("(") ? e.description.substring(e.description.indexOf("(")+1, e.description.indexOf(")")) : "N/A"}</strong></td>
                          <td>{e.description}</td>
                          <td style={{ color: "var(--danger)", fontWeight: "bold" }}>-{e.amount.toLocaleString()} UGX</td>
                        </tr>
                      ))}
                      {expenses.filter(e => e.category === "Salaries").length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No payroll wage records processed this term.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
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

        {/* TAB: SMS BROADCASTER */}
        {activeTab === "sms" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>SMS Broadcast Center</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Draft, template, and dispatch term announcements or fee reminders directly to student contacts.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card">
                <h4 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}><MessageSquare size={18} /> Dispatch Broadcast Message</h4>
                
                {/* Form */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!school) return;
                  if (!smsMessage) {
                    alert("Please write a message first.");
                    return;
                  }
                  if (smsCredits < 1) {
                    alert("Insufficient SMS credits.");
                    return;
                  }
                  try {
                    const res = await sendSmsBroadcast(school.id, smsGroup, smsMessage);
                    if (res && res.status === "success") {
                      // Deduct simulated credits
                      const cost = res.count;
                      setSmsCredits(prev => Math.max(0, prev - cost));
                      
                      // Add log
                      const newLog = {
                        id: Math.random().toString(36).substring(7),
                        date: new Date().toLocaleString(),
                        group: smsGroup,
                        message: smsMessage,
                        count: res.count,
                        status: "Delivered"
                      };
                      setSmsLogs(prev => [newLog, ...prev]);
                      setSmsMessage("");
                      alert(`SMS broadcast successfully dispatched to ${res.count} contacts!`);
                    } else {
                      alert("Failed to send broadcast: " + res?.message);
                    }
                  } catch (err: any) {
                    alert("Error queuing broadcast: " + (err.message || err));
                  }
                }}>
                  <div className="form-group">
                    <label className="form-label">Recipient Group</label>
                    <select className="input-field" value={smsGroup} onChange={(e) => setSmsGroup(e.target.value)}>
                      <option value="All Parents">All Student Parents ({students.length} contacts)</option>
                      <option value="All Staff">All School Staff ({users.length} contacts)</option>
                      <option value="Class Parents">Class Parents - P1/S1 (45 contacts)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Load Template</label>
                    <select 
                      className="input-field" 
                      value={smsTemplate} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setSmsTemplate(val);
                        if (val === "defaulter") {
                          setSmsMessage(`Dear Parent, this is a reminder from ${school?.name} that your child's term tuition balance remains unpaid. Please clear it urgently. Thank you.`);
                        } else if (val === "report") {
                          setSmsMessage(`Dear Parent, Academic Report Cards for Term 1 have been finalized. You are invited for parent-teacher discussions on Friday at the school. DOS.`);
                        } else if (val === "welcome") {
                          setSmsMessage(`Welcome back to the new term at ${school?.name}! We look forward to a successful and productive term with your child.`);
                        } else {
                          setSmsMessage("");
                        }
                      }}
                    >
                      <option value="">-- Choose message template --</option>
                      <option value="defaulter">Tuition Fee Defaulter Reminder</option>
                      <option value="report">Report Cards Release Announcement</option>
                      <option value="welcome">New Term Resumption Welcome</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Message (Max 160 chars per SMS)</label>
                    <textarea 
                      className="input-field" 
                      style={{ minHeight: "120px", fontFamily: "var(--font-sans)", resize: "none" }}
                      maxLength={480}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Write your text message here..."
                      required
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      <span>{smsMessage.length} characters</span>
                      <span>{Math.ceil(smsMessage.length / 160)} SMS Parts</span>
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary hover-scale" style={{ width: "100%", padding: "12px" }}>
                    🚀 Dispatch SMS Queue
                  </button>
                </form>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Credit Balance Card */}
                <div className="card" style={{ display: "flex", alignItems: "center", gap: "16px", background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", color: "white", border: "none" }}>
                  <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.2)" }}>
                    <MessageSquare size={32} />
                  </div>
                  <div>
                    <span style={{ fontSize: "12px", textTransform: "uppercase", opacity: 0.8 }}>Simulated SMS Balance</span>
                    <h2 style={{ fontSize: "32px", fontWeight: 800 }}>{smsCredits.toLocaleString()} Credits</h2>
                    <span style={{ fontSize: "11px", opacity: 0.7 }}>Recharge requests can be simulated via settings.</span>
                  </div>
                </div>
                
                {/* Sent Logs Card */}
                <div className="card" style={{ flex: 1 }}>
                  <h4 style={{ marginBottom: "16px" }}>Recent Dispatches History</h4>
                  <div className="table-container" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Group</th>
                          <th>Sent</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {smsLogs.map((log: any) => (
                          <tr key={log.id}>
                            <td>{log.date.split(",")[0]}</td>
                            <td><strong>{log.group}</strong></td>
                            <td>{log.count} SMS</td>
                            <td><span className="badge badge-success">{log.status}</span></td>
                          </tr>
                        ))}
                        {smsLogs.length === 0 && (
                          <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "16px" }}>No SMS dispatches triggered yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: REPORT CARD DESIGNER */}
        {activeTab === "report_designer" && ["ADMIN", "DOS"].includes(currentUser.role) && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>Academic Report Template Designer</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Customize the title headers, motto displays, logo badges, residency info, stamp templates, and secondary CBC regulations rules boxes.</p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }} className="flex-mobile-col">
              {/* Controls Column */}
              <div className="card">
                <h4 style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><Sliders size={18} /> Report Configuration</h4>
                <form onSubmit={handleSaveReportTemplate}>
                  <div className="form-group">
                    <label className="form-label">Report Card Header Title</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={designerTitle}
                      onChange={(e) => setDesignerTitle(e.target.value)}
                      placeholder="e.g. OFFICIAL ACADEMIC REPORT CARD"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">School Official Motto</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={designerMotto}
                      onChange={(e) => setDesignerMotto(e.target.value)}
                      placeholder="e.g. Education for progress"
                    />
                  </div>
                  
                  <div style={{ height: "1px", background: "#e2e8f0", margin: "20px 0" }}></div>
                  <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "#0f172a" }}>Display Layout Settings</h4>
                  
                  <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowBadge}
                        onChange={(e) => setDesignerShowBadge(e.target.checked)}
                      />
                      <span>Show Official School Logo Badge</span>
                    </label>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowResidency}
                        onChange={(e) => setDesignerShowResidency(e.target.checked)}
                      />
                      <span>Show Residency Type (Day / Boarding student indicator)</span>
                    </label>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowSignatures}
                        onChange={(e) => setDesignerShowSignatures(e.target.checked)}
                      />
                      <span>Show Official Teacher/Head Teacher Signature Stamps</span>
                    </label>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowRules}
                        onChange={(e) => setDesignerShowRules(e.target.checked)}
                      />
                      <span>Show Curriculum Criteria (Uganda CBC Grading Guideline Box)</span>
                    </label>
                  </div>

                  <div style={{ height: "1px", background: "#e2e8f0", margin: "20px 0" }}></div>
                  <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "#0f172a" }}>Report Card Styling Settings</h4>

                  <div className="form-group">
                    <label className="form-label">School Logo Size (Width/Height)</label>
                    <select 
                      className="input-field" 
                      value={designerLogoSize} 
                      onChange={(e) => setDesignerLogoSize(parseInt(e.target.value))}
                    >
                      <option value="40">Small (40px)</option>
                      <option value="60">Medium (60px)</option>
                      <option value="80">Large (80px)</option>
                      <option value="100">Extra Large (100px)</option>
                      <option value="120">Super Large (120px)</option>
                    </select>
                  </div>

                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", marginTop: "12px", marginBottom: "16px" }}>
                    <input 
                      type="checkbox" 
                      checked={designerShowStudentPhoto}
                      onChange={(e) => setDesignerShowStudentPhoto(e.target.checked)}
                    />
                    <span>Show Student Portrait Photo on Report Card</span>
                  </label>

                  <div className="form-group">
                    <label className="form-label">Report Header Accent Color</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input 
                        type="color" 
                        value={designerHeaderColor}
                        onChange={(e) => setDesignerHeaderColor(e.target.value)}
                        style={{ width: "40px", height: "35px", border: "1px solid var(--border)", borderRadius: "4px", padding: "2px", cursor: "pointer" }}
                      />
                      <input 
                        type="text" 
                        className="input-field" 
                        value={designerHeaderColor}
                        onChange={(e) => setDesignerHeaderColor(e.target.value)}
                        placeholder="#1e3a8a"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">School Header Bottom Border Style</label>
                    <select 
                      className="input-field" 
                      value={designerBorderType} 
                      onChange={(e) => setDesignerBorderType(e.target.value)}
                    >
                      <option value="double">Double Underline (Traditional)</option>
                      <option value="solid">Solid Underline (Modern)</option>
                      <option value="none">No Underline (Minimalist)</option>
                    </select>
                  </div>
                  
                  <button type="submit" className="btn btn-primary hover-scale" style={{ width: "100%", marginTop: "24px" }}>
                    💾 Save Design Template Configuration
                  </button>
                </form>
              </div>
              
              {/* Preview Column */}
              <div className="card text-center" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", background: "#f8fafc" }}>
                <h4 style={{ marginBottom: "16px" }}>Live Report Card Mockup Preview</h4>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px" }}>
                  
                  {/* Miniature Report Card Design */}
                  <div style={{ width: "100%", maxWidth: "340px", background: "white", padding: "20px", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", textAlign: "left", fontSize: "10px", color: "black", fontFamily: "Arial, sans-serif" }}>
                    
                    {/* Header */}
                    <div style={{ textAlign: "center", borderBottom: designerBorderType === "double" ? "3px double black" : designerBorderType === "solid" ? "1px solid black" : "none", paddingBottom: "8px", marginBottom: "10px" }}>
                      {designerShowBadge && (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
                          {school?.logoUrl ? (
                            <img src={school.logoUrl} alt="Logo" style={{ width: `${designerLogoSize * 0.4}px`, height: `${designerLogoSize * 0.4}px`, objectFit: "contain", border: "1px solid #e2e8f0", padding: "1px" }} />
                          ) : (
                            <GraduationCap size={Math.round(designerLogoSize * 0.35)} color="var(--primary)" />
                          )}
                        </div>
                      )}
                      <h5 style={{ fontSize: "11px", margin: 0, textTransform: "uppercase", color: designerHeaderColor, fontWeight: "bold" }}>{school?.name}</h5>
                      <span style={{ fontSize: "7px", color: "#475569" }}>P.O. Box {school?.poBox || "Kampala, Uganda"}</span>
                      {designerMotto && (
                        <p style={{ margin: "2px 0 0", fontSize: "7px", fontStyle: "italic", fontWeight: "bold", color: "#475569" }}>
                          Motto: "{designerMotto}"
                        </p>
                      )}
                      <h6 style={{ fontSize: "8px", margin: "6px 0 0", textTransform: "uppercase", textDecoration: "underline", color: "black", fontWeight: "bold" }}>
                        {designerTitle || "OFFICIAL ACADEMIC REPORT CARD"}
                      </h6>
                    </div>
                    
                    {/* Student Info */}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginBottom: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2px", fontSize: "8px", flex: 1 }}>
                        <div><strong>Student:</strong> Kakooza Ronald</div>
                        <div><strong>Class:</strong> Primary One</div>
                        <div><strong>Roll No:</strong> STD-2026-004</div>
                        {designerShowResidency && (
                          <div><strong>Residency:</strong> Day Student</div>
                        )}
                      </div>
                      {designerShowStudentPhoto && (
                        <div style={{ width: "32px", height: "34px", border: "1px solid #cbd5e1", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontSize: "6px", color: "#94a3b8", flexShrink: 0 }}>
                          Photo
                        </div>
                      )}
                    </div>
                    
                    {/* Marks Mock Table */}
                    <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", padding: "4px", marginBottom: "10px", background: "#f8fafc" }}>
                      <div style={{ fontWeight: "bold", fontSize: "8px", marginBottom: "4px" }}>Academic Marks Assessment</div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: "2px", marginBottom: "2px" }}>
                        <span>Mathematics</span>
                        <strong>92% (PLE: 1)</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>English Language</span>
                        <strong>85% (PLE: 1)</strong>
                      </div>
                    </div>
                    
                    {/* Secondary CBC box */}
                    {designerShowRules && (
                      <div style={{ background: "#f1f5f9", padding: "6px", borderRadius: "4px", fontSize: "7px", border: "1px solid #cbd5e1", marginBottom: "10px", lineHeight: "1.3" }}>
                        <strong>CBC Guidelines:</strong> Competence letter grades map Continuous projects assessments continuously.
                      </div>
                    )}
                    
                    {/* Signatures */}
                    {designerShowSignatures && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "7px" }}>
                        <div style={{ borderTop: "1px solid black", width: "60px", textAlign: "center", paddingTop: "2px" }}>Teacher</div>
                        <div style={{ borderTop: "1px solid black", width: "60px", textAlign: "center", paddingTop: "2px" }}>Head Teacher</div>
                        <div style={{ borderTop: "1px solid black", width: "60px", textAlign: "center", paddingTop: "2px" }}>Stamp</div>
                      </div>
                    )}
                    
                  </div>
                  
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
                      {momoSplitAmounts.length > 1 ? (
                        <>
                          Enter your Mobile Money registered phone number to initiate the secure payment of <strong>{parseFloat(momoAmount).toLocaleString()} UGX</strong>.<br/>
                          <span style={{ fontSize: "12px", opacity: 0.85, fontWeight: "normal", display: "inline-block", marginTop: "4px" }}>
                            ⚠️ Due to gateway limits, this payment will be split into <strong>{momoSplitAmounts.length} transactions</strong> of max 200,000 UGX each.
                          </span>
                        </>
                      ) : (
                        `Enter your Mobile Money registered phone number to initiate the secure payment prompt of ${parseFloat(momoAmount).toLocaleString()} UGX.`
                      )}
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
                      {momoSplitAmounts.length > 1 ? (
                        <>
                          Enter card details to process the transaction of <strong>{parseFloat(momoAmount).toLocaleString()} UGX</strong>.<br/>
                          <span style={{ fontSize: "12px", opacity: 0.85, fontWeight: "normal", display: "inline-block", marginTop: "4px" }}>
                            ⚠️ Due to gateway limits, this payment will be split into <strong>{momoSplitAmounts.length} transactions</strong> of max 200,000 UGX each.
                          </span>
                        </>
                      ) : (
                        `Enter card details to process the transaction of ${parseFloat(momoAmount).toLocaleString()} UGX.`
                      )}
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
                    <p style={{ marginBottom: "12px" }}>[USSD Push Prompt Sent]</p>
                    <p style={{ marginBottom: "16px", lineHeight: "1.4" }}>
                      {momoSplitAmounts.length > 1 ? (
                        <>
                          A mobile money push collection request for <strong>Part {momoSplitIndex + 1} of {momoSplitAmounts.length} ({momoSplitAmounts[momoSplitIndex]?.toLocaleString()} UGX)</strong> has been sent to your phone (total payment: {parseFloat(momoAmount).toLocaleString()} UGX).<br/><br/>
                          Please approve it by entering your PIN and click "Check Status" below.
                        </>
                      ) : (
                        `A mobile money push collection request of ${parseFloat(momoAmount).toLocaleString()} UGX has been sent to your phone. Please approve the transaction by entering your PIN and click "Check Status" below.`
                      )}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                      <button 
                        onClick={checkPaymentStatus}
                        className="btn" 
                        style={{ width: "100%", background: "#22c55e", color: "black", border: "none", fontSize: "13px", fontWeight: "bold", padding: "10px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        🔄 Check Payment Status
                      </button>
                      <button 
                        onClick={() => setShowMoMoModal(false)}
                        className="btn" 
                        style={{ width: "100%", background: "#ef4444", color: "white", border: "none", fontSize: "12px", padding: "8px", borderRadius: "6px", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "#f8fafc", color: "#1e293b", padding: "20px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "12px" }}>
                      <CreditCard size={18} color="var(--primary)" />
                      <strong style={{ fontSize: "14px" }}>Card Transaction Status</strong>
                    </div>
                    <p style={{ marginBottom: "14px", lineHeight: "1.4" }}>
                      {momoSplitAmounts.length > 1 ? (
                        <>
                          If you have completed the payment of <strong>Part {momoSplitIndex + 1} of {momoSplitAmounts.length} ({momoSplitAmounts[momoSplitIndex]?.toLocaleString()} UGX)</strong> on the secure card gateway, you can click verify below.
                        </>
                      ) : (
                        "If you have completed the payment on the secure card gateway, you can click verify below."
                      )}
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={checkPaymentStatus}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: "8px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Verify Transaction
                      </button>
                      <button 
                        onClick={() => setShowMoMoModal(false)}
                        className="btn btn-outline" 
                        style={{ flex: 1, padding: "8px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Close
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

      {/* 1. View Student Modal */}
      {showViewStudentModal && selectedViewStudent && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", position: "relative" }}>
            <button 
              onClick={() => setShowViewStudentModal(false)} 
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px" }}
            >✕</button>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Student Profile</h3>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: "3px solid var(--primary-light)", boxShadow: "var(--shadow)" }}>
                {selectedViewStudent.photo ? (
                  <img src={selectedViewStudent.photo} alt={selectedViewStudent.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={48} color="#94a3b8" />
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <h4 style={{ fontSize: "20px", color: "#0f172a", marginBottom: "4px" }}>{selectedViewStudent.name}</h4>
                <code style={{ fontSize: "14px", color: "var(--primary)", fontWeight: 700 }}>{selectedViewStudent.studentNumber}</code>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px" }}>
              <div><strong>Class:</strong> {classes.find(c => c.id === selectedViewStudent.classId)?.name || "N/A"}</div>
              <div><strong>Stream:</strong> {streams.find(s => s.id === selectedViewStudent.streamId)?.name || "N/A"}</div>
              <div><strong>LIN (Learner ID):</strong> {selectedViewStudent.lin || "Not Registered"}</div>
              <div>
                <strong>Attendance Type:</strong> &nbsp;
                <span className={`badge ${selectedViewStudent.type === "BOARDING" ? "badge-warning" : "badge-primary"}`}>
                  {selectedViewStudent.type}
                </span>
              </div>
            </div>

            <button 
              onClick={() => setShowViewStudentModal(false)}
              className="btn btn-outline" 
              style={{ width: "100%", marginTop: "24px" }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* 2. Edit Student Modal */}
      {showEditStudentModal && selectedEditStudent && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Edit Student Record</h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              await updateStudent(selectedEditStudent.id, {
                name: editStudentName,
                studentNumber: editStudentNumber,
                classId: editStudentClassId,
                streamId: editStudentStreamId,
                type: editStudentType,
                photo: editStudentPhoto || null,
                lin: editStudentLin || null
              });
              setShowEditStudentModal(false);
              await loadSchoolData(school!.id);
              alert("Student details updated successfully!");
            }}>
              <div className="form-group">
                <label className="form-label">Student Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Select Class</label>
                  <select 
                    className="input-field" 
                    value={editStudentClassId}
                    onChange={(e) => {
                      setEditStudentClassId(e.target.value);
                      const strms = streams.filter(s => s.classId === e.target.value);
                      if (strms.length > 0) setEditStudentStreamId(strms[0].id);
                    }}
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Select Stream</label>
                  <select 
                    className="input-field" 
                    value={editStudentStreamId}
                    onChange={(e) => setEditStudentStreamId(e.target.value)}
                  >
                    {streams.filter(st => st.classId === editStudentClassId).map(s => (
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
                    value={editStudentNumber}
                    onChange={(e) => setEditStudentNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Attendance Type</label>
                  <select 
                    className="input-field" 
                    value={editStudentType}
                    onChange={(e) => setEditStudentType(e.target.value as any)}
                  >
                    <option value="DAY">Day Student</option>
                    <option value="BOARDING">Boarding Student</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Learner Identification Number (LIN)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. LIN-12345678" 
                  value={editStudentLin}
                  onChange={(e) => setEditStudentLin(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Update Portrait Photo</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="input-field" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 1024 * 1024) {
                        alert("Photo size should be less than 1MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditStudentPhoto(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ padding: "8px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button 
                  type="button" 
                  onClick={() => setShowEditStudentModal(false)}
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. View Staff Modal */}
      {showViewStaffModal && selectedViewStaff && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", position: "relative" }}>
            <button 
              onClick={() => setShowViewStaffModal(false)} 
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px" }}
            >✕</button>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Staff Profile</h3>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
              <div style={{ width: "120px", height: "120px", borderRadius: "50%", overflow: "hidden", border: "3px solid var(--primary-light)", boxShadow: "var(--shadow)" }}>
                {selectedViewStaff.photo ? (
                  <img src={selectedViewStaff.photo} alt={selectedViewStaff.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Users size={48} color="#94a3b8" />
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <h4 style={{ fontSize: "20px", color: "#0f172a", marginBottom: "4px" }}>{selectedViewStaff.name}</h4>
                <code style={{ fontSize: "14px", color: "var(--primary)", fontWeight: 700 }}>{selectedViewStaff.staffNumber || "No ID set"}</code>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "14px" }}>
              <div><strong>Email Address:</strong> <code>{selectedViewStaff.email}</code></div>
              <div>
                <strong>Administrative Role:</strong> &nbsp;
                <span className={`badge ${selectedViewStaff.role === "ADMIN" ? "badge-danger" : selectedViewStaff.role === "DOS" ? "badge-success" : selectedViewStaff.role === "DIRECTOR" ? "badge-warning" : "badge-primary"}`}>
                  {selectedViewStaff.role}
                </span>
              </div>
              <div><strong>Joined Date:</strong> {selectedViewStaff.createdAt ? new Date(selectedViewStaff.createdAt).toLocaleDateString() : "N/A"}</div>
            </div>

            <button 
              onClick={() => setShowViewStaffModal(false)}
              className="btn btn-outline" 
              style={{ width: "100%", marginTop: "24px" }}
            >
              Close Profile
            </button>
          </div>
        </div>
      )}

      {/* 4. Edit Staff Modal */}
      {showEditStaffModal && selectedEditStaff && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Edit Staff Account</h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              await updateUser(selectedEditStaff.id, {
                name: editStaffName,
                email: editStaffEmail,
                role: editStaffRole,
                staffNumber: editStaffNumber,
                photo: editStaffPhoto || null
              });
              setShowEditStaffModal(false);
              await loadSchoolData(school!.id);
              alert("Staff account details updated successfully!");
            }}>
              <div className="form-group">
                <label className="form-label">Staff Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={editStaffEmail}
                  onChange={(e) => setEditStaffEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Staff ID Number</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editStaffNumber}
                    onChange={(e) => setEditStaffNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Administrative Role</label>
                  <select 
                    className="input-field" 
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value as any)}
                    disabled={selectedEditStaff.role === "ADMIN"}
                  >
                    <option value="TEACHER">Subject Teacher</option>
                    <option value="DOS">Director of Studies (DOS)</option>
                    <option value="HEADTEACHER">Head Teacher</option>
                    <option value="DIRECTOR">Director (Financial View)</option>
                    {selectedEditStaff.role === "ADMIN" && <option value="ADMIN">Super Admin</option>}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Update Portrait Photo</label>
                <input 
                  type="file" 
                  accept="image/*"
                  className="input-field" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 1024 * 1024) {
                        alert("Photo size should be less than 1MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditStaffPhoto(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ padding: "8px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button 
                  type="button" 
                  onClick={() => setShowEditStaffModal(false)}
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Bulk Upload Students Modal */}
      {showBulkStudentModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "550px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Bulk Upload Students</h3>
            
            <form onSubmit={handleBulkStudentUpload}>
              <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Target Class</label>
                  <select 
                    className="input-field" 
                    value={bulkStudentClassId} 
                    onChange={(e) => {
                      setBulkStudentClassId(e.target.value);
                      const sub = streams.filter(s => s.classId === e.target.value);
                      if (sub.length > 0) setBulkStudentStreamId(sub[0].id);
                    }}
                    required
                  >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Stream</label>
                  <select 
                    className="input-field" 
                    value={bulkStudentStreamId} 
                    onChange={(e) => setBulkStudentStreamId(e.target.value)}
                    required
                  >
                    {streams.filter(st => st.classId === bulkStudentClassId).map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Paste Students List (CSV/TSV Format)</label>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
                  Format: <code>Student Name, Student Number (Optional), Residency (DAY/BOARDING)</code><br/>
                  Example:<br/>
                  <code>Dimbuka Alvin,, DAY</code><br/>
                  <code>Namusoke Joy, GSS-STU-0010, BOARDING</code>
                </div>
                <textarea 
                  className="input-field" 
                  rows={8} 
                  placeholder="Paste student lines here..." 
                  value={bulkStudentText}
                  onChange={(e) => setBulkStudentText(e.target.value)}
                  required
                  style={{ fontFamily: "monospace", fontSize: "12px", padding: "10px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Import List</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkStudentModal(false);
                    setBulkStudentText("");
                  }}
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Bulk Upload Staff Modal */}
      {showBulkStaffModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "550px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Bulk Upload Staff</h3>
            
            <form onSubmit={handleBulkStaffUpload}>
              <div className="form-group">
                <label className="form-label">Paste Staff List (CSV/TSV Format)</label>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>
                  Format: <code>Full Name, Email, Role (TEACHER/DOS/HEADTEACHER/DIRECTOR), Staff ID (Optional)</code><br/>
                  Example:<br/>
                  <code>Opio Peter, peter@school.ug, TEACHER</code><br/>
                  <code>Nakafeero Sylvia, sylvia@school.ug, DOS, GSS-STF-0012</code>
                </div>
                <textarea 
                  className="input-field" 
                  rows={8} 
                  placeholder="Paste staff lines here..." 
                  value={bulkStaffText}
                  onChange={(e) => setBulkStaffText(e.target.value)}
                  required
                  style={{ fontFamily: "monospace", fontSize: "12px", padding: "10px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Import List</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkStaffModal(false);
                    setBulkStaffText("");
                  }}
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
