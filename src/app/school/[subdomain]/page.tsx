"use client";
import React, { useState, useEffect, use } from "react";
import { ElectionsManager, HolidayWorkManager } from "../../../components/ParentPortalAdmin";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import type { 
  School, User, Class, Stream, Student, Subject, ExamPaper, Mark, Payment, FeeStructure, StudentPayment, Expense, GradeRange, TeacherSubject, SchoolPayTransaction, SmsLog, SmsCredit
} from "../../../lib/types";
import { 
  checkDatabaseConnection, getSchoolBySubdomain, getUsers, getClasses, getStreams, getStudents, getSubjects,
  getExamPapers, getMarks, getFeeStructures, getStudentPayments, getExpenses, getAttendance, authenticateUser,
  createClass, createStream, createUser, createStudent, createSubject, createExamPaper, updateExamPaper, deleteExamPaper, addMark,
  createFeeStructure, recordStudentPayment, createExpense, recordAttendance, promoteStudents,
  processTeacherSalary, createPayment, getPayments, updateSchoolStatus, updateSchoolMetadata,
  initiateMarzpayCollection, checkMarzpayCollectionStatus,
  updateStudent, deleteStudent, deleteStudentsByClass, updateUser, deleteUser, getGradeRanges, saveGradeRanges,
  getTeacherSubjects, createTeacherSubject, deleteTeacherSubject, resetUserPassword, runDiagnostics,
  deleteStudentPayment, getSchoolPayTransactions,
  updateClass, deleteClass, updateStream, deleteStream, deleteSubject,
  getSmsLogs, saveSmsLog, updateSmsLog, getSmsCredits, saveSmsCredit, updateSmsCredit,
  getTotalAvailableSmsCredits, deductSmsCredits, getMarzSmsBalance, sendRealSms
} from "../../../lib/services";

import { Database, CreditCard, Building2, CheckCircle, MessageSquare, Sliders, User as UserIcon, Calendar, Eye, EyeOff, Vote } from "lucide-react";
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
  X,
  RefreshCw,
  Receipt,
  BarChart2,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Download
} from "lucide-react";

const computeGradeFromRanges = (score: number, systemType: "PRIMARY" | "SECONDARY", ranges: GradeRange[]) => {
  const filtered = ranges.filter(r => r.systemType === systemType);
  // Sort minMark descending to find the correct bracket
  const sorted = [...filtered].sort((a, b) => b.minMark - a.minMark);
  const match = sorted.find(r => score >= r.minMark);
  if (match) {
    return {
      grade: match.grade,
      level: match.achievementLevel,
      descriptor: match.descriptor,
      classTeacherComment: match.classTeacherComment,
      headTeacherComment: match.headTeacherComment
    };
  }
  // Fallback to defaults if no match found or ranges empty
  if (systemType === "SECONDARY") {
    if (score >= 80) return { grade: "A", level: "Exceptional", descriptor: "Highly proficient in subject skills", classTeacherComment: "Excellent academic performance! Keep up the outstanding work.", headTeacherComment: "An exceptional result. I am proud of your achievements." };
    if (score >= 70) return { grade: "B", level: "Outstanding", descriptor: "Consistently demonstrates subject skills", classTeacherComment: "Very good progress. With continued effort, you can achieve even higher grades.", headTeacherComment: "Good work. Maintain this standard." };
    if (score >= 55) return { grade: "C", level: "Satisfactory", descriptor: "Demonstrates basic subject skills", classTeacherComment: "A fair performance. Focus more on your weaker subjects next term.", headTeacherComment: "You have potential. Push yourself harder next term." };
    if (score >= 40) return { grade: "D", level: "Basic", descriptor: "Beginning to develop subject skills", classTeacherComment: "Below average. You need to put in more effort.", headTeacherComment: "Urgent improvement is required. Please double your efforts." };
    return { grade: "E", level: "Elementary", descriptor: "Needs guidance to develop skills", classTeacherComment: "Poor performance. Consult your teachers for support.", headTeacherComment: "Academic probation warning. You must work much harder." };
  } else {
    if (score >= 90) return { grade: "1", level: "Distinction", descriptor: "Outstanding performance", classTeacherComment: "Excellent academic performance!", headTeacherComment: "An exceptional result." };
    if (score >= 80) return { grade: "2", level: "Distinction", descriptor: "Very good performance", classTeacherComment: "Very good progress.", headTeacherComment: "Good work." };
    if (score >= 70) return { grade: "3", level: "Credit", descriptor: "Good performance", classTeacherComment: "Good performance overall.", headTeacherComment: "Satisfactory effort." };
    if (score >= 60) return { grade: "4", level: "Credit", descriptor: "Fairly good performance", classTeacherComment: "A fair performance.", headTeacherComment: "You have potential." };
    if (score >= 55) return { grade: "5", level: "Credit", descriptor: "Average performance", classTeacherComment: "Average performance.", headTeacherComment: "Push yourself harder." };
    if (score >= 50) return { grade: "6", level: "Credit", descriptor: "Satisfactory performance", classTeacherComment: "Below average.", headTeacherComment: "Improvement is needed." };
    if (score >= 45) return { grade: "7", level: "Pass", descriptor: "Pass level performance", classTeacherComment: "Weak pass.", headTeacherComment: "Please double your efforts." };
    if (score >= 40) return { grade: "8", level: "Pass", descriptor: "Weak pass performance", classTeacherComment: "Barely passed.", headTeacherComment: "Seek immediate academic support." };
    return { grade: "9", level: "Fail", descriptor: "Failure level performance", classTeacherComment: "Failed.", headTeacherComment: "Academic probation warning." };
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);

  // Authentication states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authError, setAuthError] = useState("");

  // Forgot Password flow states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetStep, setResetStep] = useState<0 | 1>(0);

  // Force Password change states
  const [forceNewPassword, setForceNewPassword] = useState("");
  const [forceConfirmPassword, setForceConfirmPassword] = useState("");
  const [forcePasswordError, setForcePasswordError] = useState("");
  const [forcePasswordSuccess, setForcePasswordSuccess] = useState("");

  // Logged-in profile edit states
  const [profileEditName, setProfileEditName] = useState("");
  const [profileEditPhoto, setProfileEditPhoto] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profilePasswordError, setProfilePasswordError] = useState("");
  const [profilePasswordSuccess, setProfilePasswordSuccess] = useState("");
  const [profileDetailsSuccess, setProfileDetailsSuccess] = useState("");

  // Administrative reset password states
  const [adminResetPasswordVal, setAdminResetPasswordVal] = useState("");

  // Teacher assignments state
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherSubject[]>([]);
  const [newAssignmentTeacherId, setNewAssignmentTeacherId] = useState("");
  const [newAssignmentClassId, setNewAssignmentClassId] = useState("");
  const [newAssignmentStreamId, setNewAssignmentStreamId] = useState("");
  const [newAssignmentSubjectId, setNewAssignmentSubjectId] = useState("");
  const [staffSubTab, setStaffSubTab] = useState<"directory" | "assignments">("directory");

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
  const [schoolPayTransactions, setSchoolPayTransactions] = useState<SchoolPayTransaction[]>([]);
  const [spSyncing, setSpSyncing] = useState(false);
  const [spSyncMsg, setSpSyncMsg] = useState("");
  const [spSelectedTerm, setSpSelectedTerm] = useState<number | "ALL">("ALL");
  const [spSyncStartDate, setSpSyncStartDate] = useState("");
  const [spSyncEndDate, setSpSyncEndDate] = useState("");
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
  const [newStudentPaymentCode, setNewStudentPaymentCode] = useState("");
  const [newStudentRegNumber, setNewStudentRegNumber] = useState("");
  const [newStudentGender, setNewStudentGender] = useState<"MALE" | "FEMALE">("MALE");
  const [newStudentParentContact, setNewStudentParentContact] = useState("");

  const [newTeacherPhoto, setNewTeacherPhoto] = useState("");
  const [newTeacherStaffNumber, setNewTeacherStaffNumber] = useState("");
  const [newTeacherContact, setNewTeacherContact] = useState("");

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
  const [editStudentPhotoChanged, setEditStudentPhotoChanged] = useState(false);
  const [editStudentLin, setEditStudentLin] = useState("");
  const [editStudentGender, setEditStudentGender] = useState<"MALE" | "FEMALE">("MALE");

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
  const [editStaffContact, setEditStaffContact] = useState("");

  // Edit student extra fields
  const [editStudentParentContact, setEditStudentParentContact] = useState("");
  const [editStudentPaymentCode, setEditStudentPaymentCode] = useState("");

  // Class & Stream edit states
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [selectedEditClass, setSelectedEditClass] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassLevel, setEditClassLevel] = useState<"PRIMARY" | "SECONDARY">("PRIMARY");
  const [editStreamNewName, setEditStreamNewName] = useState("");
  const [editStreamRenames, setEditStreamRenames] = useState<{ [id: string]: string }>({});

  // Bulk upload states
  const [showBulkStudentModal, setShowBulkStudentModal] = useState(false);
  const [showBulkStaffModal, setShowBulkStaffModal] = useState(false);
  const [studentExcelFile, setStudentExcelFile] = useState<File | null>(null);
  const [staffExcelFile, setStaffExcelFile] = useState<File | null>(null);
  const [bulkStudentClassId, setBulkStudentClassId] = useState("");
  const [bulkStudentStreamId, setBulkStudentStreamId] = useState("");

  // Bulk student photo upload states
  const [showBulkPhotoModal, setShowBulkPhotoModal] = useState(false);
  const [bulkPhotoClassId, setBulkPhotoClassId] = useState("");
  const [bulkPhotoStreamId, setBulkPhotoStreamId] = useState("");
  const [bulkPhotoMatches, setBulkPhotoMatches] = useState<any[]>([]);
  const [isApplyingPhotos, setIsApplyingPhotos] = useState(false);

  const [isImportingStudents, setIsImportingStudents] = useState(false);
  const [importStudentProgress, setImportStudentProgress] = useState(0);
  const [importStudentTotal, setImportStudentTotal] = useState(0);

  const [isImportingStaff, setIsImportingStaff] = useState(false);
  const [importStaffProgress, setImportStaffProgress] = useState(0);
  const [importStaffTotal, setImportStaffTotal] = useState(0);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectClassId, setNewSubjectClassId] = useState("");
  const [newSubjectStreamId, setNewSubjectStreamId] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");

  // Subject multiple add / pool assignment states
  const [subjectPoolSelectedClassId, setSubjectPoolSelectedClassId] = useState("");
  const [subjectPoolSelectedSubjects, setSubjectPoolSelectedSubjects] = useState<string[]>([]);
  const [subjectAssignMode, setSubjectAssignMode] = useState<"single" | "multiple" | "pool">("single");

  // DOS exam state
  const [newExamName, setNewExamName] = useState("");
  const [newExamTerm, setNewExamTerm] = useState("1");
  const [newExamYear, setNewExamYear] = useState("2026");
  const [newExamIsNewCurriculum, setNewExamIsNewCurriculum] = useState(false);
  const [newExamClassId, setNewExamClassId] = useState("");
  const [newExamCbU1Active, setNewExamCbU1Active] = useState(true);
  const [newExamCbU2Active, setNewExamCbU2Active] = useState(true);
  const [newExamCbEtActive, setNewExamCbEtActive] = useState(true);
  const [newExamCbHpgActive, setNewExamCbHpgActive] = useState(true);
  const [newExamCbU1Max, setNewExamCbU1Max] = useState(3);
  const [newExamCbU2Max, setNewExamCbU2Max] = useState(3);
  const [newExamCbEtMax, setNewExamCbEtMax] = useState(3);
  const [newExamCbHpgMax, setNewExamCbHpgMax] = useState(3);

  // Edit exam states
  const [selectedEditExam, setSelectedEditExam] = useState<ExamPaper | null>(null);
  const [editExamName, setEditExamName] = useState("");
  const [editExamTerm, setEditExamTerm] = useState("1");
  const [editExamYear, setEditExamYear] = useState("2026");
  const [editExamClassId, setEditExamClassId] = useState("");
  const [editExamIsNewCurriculum, setEditExamIsNewCurriculum] = useState(false);
  const [editExamCbU1Active, setEditExamCbU1Active] = useState(true);
  const [editExamCbU2Active, setEditExamCbU2Active] = useState(true);
  const [editExamCbEtActive, setEditExamCbEtActive] = useState(true);
  const [editExamCbHpgActive, setEditExamCbHpgActive] = useState(true);
  const [editExamCbU1Max, setEditExamCbU1Max] = useState(3);
  const [editExamCbU2Max, setEditExamCbU2Max] = useState(3);
  const [editExamCbEtMax, setEditExamCbEtMax] = useState(3);
  const [editExamCbHpgMax, setEditExamCbHpgMax] = useState(3);
  const [showEditExamModal, setShowEditExamModal] = useState(false);

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
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");
  const [payReceiptNum, setPayReceiptNum] = useState("");
  const [payBBF, setPayBBF] = useState("0");
  const [payTerm, setPayTerm] = useState("1");
  const [payYear, setPayYear] = useState(new Date().getFullYear().toString());

  // Finance filter/report states
  const [finFilterTerm, setFinFilterTerm] = useState("1");
  const [finFilterYear, setFinFilterYear] = useState(new Date().getFullYear().toString());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceStudent, setInvoiceStudent] = useState<any>(null);
  const [finFilterClassId, setFinFilterClassId] = useState("");
  const [spTxFilter, setSpTxFilter] = useState<"ALL" | "MATCHED" | "UNMATCHED">("ALL");

  // SchoolPay Auto-Import State
  const [showAutoImportModal, setShowAutoImportModal] = useState(false);
  const [autoImportTx, setAutoImportTx] = useState<SchoolPayTransaction | null>(null);
  const [autoImportClassId, setAutoImportClassId] = useState("");
  const [autoImportStreamId, setAutoImportStreamId] = useState("");
  const [autoImportType, setAutoImportType] = useState<"DAY" | "BOARDING">("DAY");
  const [autoImportTerm, setAutoImportTerm] = useState("1");
  const [autoImportYear, setAutoImportYear] = useState(new Date().getFullYear().toString());

  const [expCategory, setExpCategory] = useState("Salaries");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");

  // Report Card selection
  const [selectedReportClassId, setSelectedReportClassId] = useState("");
  const [selectedReportTerm, setSelectedReportTerm] = useState("1");
  const [selectedReportStudent, setSelectedReportStudent] = useState<Student | null>(null);
  const [isBulkReportMode, setIsBulkReportMode] = useState(false);
  const [selectedFilterClassId, setSelectedFilterClassId] = useState("");
  const [tempClassTeacherComment, setTempClassTeacherComment] = useState("");
  const [tempHeadTeacherComment, setTempHeadTeacherComment] = useState("");

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
  const [profileSchoolType, setProfileSchoolType] = useState<"PRIMARY" | "SECONDARY" | "COMBINED">("COMBINED");
  const [profileSchoolPayCode, setProfileSchoolPayCode] = useState("");
  const [profileSchoolPayPassword, setProfileSchoolPayPassword] = useState("");
  const [profileCurrentTerm, setProfileCurrentTerm] = useState("1");
  const [profileCurrentYear, setProfileCurrentYear] = useState(new Date().getFullYear().toString());
  const [profileTerm1Start, setProfileTerm1Start] = useState("");
  const [profileTerm1End, setProfileTerm1End] = useState("");
  const [profileTerm2Start, setProfileTerm2Start] = useState("");
  const [profileTerm2End, setProfileTerm2End] = useState("");
  const [profileTerm3Start, setProfileTerm3Start] = useState("");
  const [profileTerm3End, setProfileTerm3End] = useState("");
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Continuous Assessment (CA) configurations
  const [cbU1Max, setCbU1Max] = useState<number>(3);
  const [cbU2Max, setCbU2Max] = useState<number>(3);
  const [cbEtMax, setCbEtMax] = useState<number>(3);
  const [cbHpgMax, setCbHpgMax] = useState<number>(3);
  const [cbU1Active, setCbU1Active] = useState<boolean>(true);
  const [cbU2Active, setCbU2Active] = useState<boolean>(true);
  const [cbEtActive, setCbEtActive] = useState<boolean>(true);
  const [cbHpgActive, setCbHpgActive] = useState<boolean>(true);

  // Grade Range custom settings
  const [editingGradeRanges, setEditingGradeRanges] = useState<GradeRange[]>([]);

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
  const [smsGroup, setSmsGroup] = useState("CLASS_PARENTS");
  const [smsTemplate, setSmsTemplate] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [smsCredits, setSmsCredits] = useState<SmsCredit[]>([]);
  const [smsTotalCredits, setSmsTotalCredits] = useState(0);
  const [smsTargetClassId, setSmsTargetClassId] = useState("");
  const [smsTargetStreamId, setSmsTargetStreamId] = useState("");
  const [smsManualContacts, setSmsManualContacts] = useState("");
  const [smsPayerPhone, setSmsPayerPhone] = useState("");
  const [smsPaymentMode, setSmsPaymentMode] = useState<"mobile_money" | "card">("mobile_money");
  const [smsCardRedirectUrl, setSmsCardRedirectUrl] = useState("");
  const [showSmsCardPayModal, setShowSmsCardPayModal] = useState(false);
  const [smsPayAmount, setSmsPayAmount] = useState(0);
  const [smsSendStatus, setSmsSendStatus] = useState<"idle" | "collecting" | "sending" | "done" | "error">("idle");
  const [smsSendResult, setSmsSendResult] = useState<any>(null);
  const [smsMarzBalance, setSmsMarzBalance] = useState<number | null>(null);
  // Credit purchase states
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [buyCreditsAmount, setBuyCreditsAmount] = useState(10);
  const [buyCreditsPhone, setBuyCreditsPhone] = useState("");
  const [buyCreditsStatus, setBuyCreditsStatus] = useState<"idle" | "collecting" | "done" | "error">("idle");
  const [buyCreditsResult, setBuyCreditsResult] = useState<any>(null);

  // Rank and Totals calculator for Report Cards
  const getStudentRankAndTotals = (studentId: string, classId: string, examPaperId: string) => {
    const classStudents = students.filter(st => st.classId === classId);
    
    const studentTotals = classStudents.map(st => {
      const stMarks = marks.filter(m => m.studentId === st.id && m.examPaperId === examPaperId);
      
      let sumOfTotals = 0;
      let count = 0;
      stMarks.forEach(m => {
        sumOfTotals += m.score;
        count++;
      });

      return {
        studentId: st.id,
        totalScore: sumOfTotals,
        count
      };
    });

    studentTotals.sort((a, b) => b.totalScore - a.totalScore);

    const rankIndex = studentTotals.findIndex(item => item.studentId === studentId);
    const position = rankIndex !== -1 ? rankIndex + 1 : "-";
    const totalStudents = classStudents.length;

    let totalAllMarks = 0;
    let totalMarksCount = 0;
    studentTotals.forEach(item => {
      totalAllMarks += item.totalScore;
      totalMarksCount += item.count;
    });
    const classAverage = totalMarksCount > 0 ? (totalAllMarks / totalMarksCount).toFixed(1) : "0";
    const studentAvg = rankIndex !== -1 && studentTotals[rankIndex].count > 0
      ? (studentTotals[rankIndex].totalScore / studentTotals[rankIndex].count).toFixed(1)
      : "0";

    return {
      position,
      totalStudents,
      classAverage,
      studentTotal: studentTotals[rankIndex]?.totalScore.toFixed(0) || "0",
      studentAverage: studentAvg
    };
  };

  const renderRealPerformanceChart = (student: Student, eotExam: ExamPaper) => {
    const stMarks = marks.filter(m => m.studentId === student.id && m.examPaperId === eotExam.id);
    const classSubjects = subjects.filter(sub => sub.classId === student.classId);
    const chartData = classSubjects.map(sub => {
      const m = stMarks.find(mk => mk.subjectId === sub.id);
      return {
        subjectCode: sub.code || sub.name.substring(0, 3).toUpperCase(),
        score: m ? m.score : 0,
        hasMark: !!m
      };
    }).filter(d => d.hasMark);

    if (chartData.length === 0) return null;

    const targetClass = classes.find(c => c.id === student.classId);
    const classTextColor = targetClass?.themeTextColor || "#000000";
    const isDarkText = classTextColor === "#ffffff" || classTextColor.toLowerCase() === "#fff" || classTextColor.toLowerCase() === "#faf5ff" || classTextColor.toLowerCase() === "#f8fafc" || classTextColor.toLowerCase() === "#e2e8f0";

    const gridColor = isDarkText ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0";
    const axisColor = isDarkText ? "rgba(255, 255, 255, 0.25)" : "#cbd5e1";
    const labelColor = isDarkText ? "rgba(255, 255, 255, 0.6)" : "#64748b";
    const scoreColor = isDarkText ? "#ffffff" : "#0f172a";

    return (
      <div className="chart-container" style={{ border: isDarkText ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1", borderRadius: "3px", padding: "6px", background: isDarkText ? "rgba(255,255,255,0.02)" : "white", marginBottom: "8px", display: "block" }}>
        <div style={{ fontWeight: "bold", fontSize: "7px", marginBottom: "4px", textAlign: "center", color: labelColor, textTransform: "uppercase" }}>Subject Performance Chart</div>
        <svg viewBox="0 0 300 80" style={{ width: "100%", height: "auto" }}>
          {/* Y-axis gridlines */}
          <line x1="20" y1="10" x2="295" y2="10" stroke={gridColor} strokeWidth="0.5" />
          <line x1="20" y1="25" x2="295" y2="25" stroke={gridColor} strokeWidth="0.5" />
          <line x1="20" y1="40" x2="295" y2="40" stroke={gridColor} strokeWidth="0.5" />
          <line x1="20" y1="55" x2="295" y2="55" stroke={gridColor} strokeWidth="0.5" />
          <line x1="20" y1="70" x2="295" y2="70" stroke={axisColor} strokeWidth="0.8" />
          
          {/* Tick labels */}
          <text x="15" y="12" fontSize="5px" textAnchor="end" fill={labelColor}>100%</text>
          <text x="15" y="27" fontSize="5px" textAnchor="end" fill={labelColor}>75%</text>
          <text x="15" y="42" fontSize="5px" textAnchor="end" fill={labelColor}>50%</text>
          <text x="15" y="57" fontSize="5px" textAnchor="end" fill={labelColor}>25%</text>
          <text x="15" y="72" fontSize="5px" textAnchor="end" fill={labelColor}>0%</text>

          {/* Bars */}
          {chartData.map((d, i) => {
            const spacing = 260 / chartData.length;
            const barWidth = Math.min(20, spacing * 0.6);
            const x = 30 + i * spacing + (spacing - barWidth) / 2;
            const height = (d.score / 100) * 60; // Max height is 60px (from y=10 to y=70)
            const y = 70 - height;
            
            let color = school?.reportHeaderColor || "#1e3a8a";
            if (d.score < 20) {
              color = "#ef4444"; // Red
            } else if (d.score < 60) {
              color = "#f59e0b"; // Orange
            }

            return (
              <g key={i}>
                <rect 
                  x={x} 
                  y={y} 
                  width={barWidth} 
                  height={height} 
                  fill={color} 
                  rx="1" 
                  style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }} 
                />
                <text x={x + barWidth / 2} y={y - 3} fontSize="6px" textAnchor="middle" fontWeight="bold" fill={scoreColor}>{d.score}</text>
                <text x={x + barWidth / 2} y="77" fontSize="5px" textAnchor="middle" fill={labelColor} fontWeight="600">{d.subjectCode}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderMarksAssessmentTable = (student: Student, eotExam: ExamPaper) => {
    const isCBC = eotExam.isNewCurriculum;
    const stMarks = marks.filter(m => m.studentId === student.id && m.examPaperId === eotExam.id);
    const classSubjects = subjects.filter(sub => sub.classId === student.classId);

    if (classSubjects.length === 0) {
      return (
        <div style={{ padding: "10px", textAlign: "center", fontStyle: "italic", border: "1px solid #cbd5e1", fontSize: "12px", color: "#64748b" }}>
          No subjects registered for this class.
        </div>
      );
    }

    if (isCBC) {
      const u1Active = eotExam?.cbU1Active !== false;
      const u2Active = eotExam?.cbU2Active !== false;
      const etActive = eotExam?.cbEtActive !== false;
      const hpgActive = eotExam?.cbHpgActive !== false;

      const u1Max = eotExam?.cbU1Max ?? 3;
      const u2Max = eotExam?.cbU2Max ?? 3;
      const etMax = eotExam?.cbEtMax ?? 3;
      const hpgMax = eotExam?.cbHpgMax ?? 3;

      const classStudentsIds = students.filter(st => st.classId === student.classId).map(st => st.id);
      const rankInfo = getStudentRankAndTotals(student.id, student.classId, eotExam.id);
      const targetClass = classes.find(c => c.id === student.classId);
      const classTextColor = targetClass?.themeTextColor || "#000000";

      // Determine colors based on theme contrast
      const isDarkText = classTextColor === "#ffffff" || classTextColor.toLowerCase() === "#fff" || classTextColor.toLowerCase() === "#faf5ff" || classTextColor.toLowerCase() === "#f8fafc" || classTextColor.toLowerCase() === "#e2e8f0";
      const tableBorderColor = isDarkText ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1";
      const headerBackground = isDarkText ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9";
      const summaryBackground = isDarkText ? "rgba(255, 255, 255, 0.05)" : "#f8fafc";
      const outerBorder = isDarkText ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1";

      // Summary calculations
      let totalPtSum = 0;
      let ptCount = 0;
      let summSum = 0;
      let summCount = 0;

      classSubjects.forEach(sub => {
        const m = stMarks.find(mk => mk.subjectId === sub.id);
        if (m) {
          let totalCA = 0;
          let maxTotal = 0;
          if (u1Active) { maxTotal += u1Max; if (m.u1 !== null && m.u1 !== undefined) totalCA += m.u1; }
          if (u2Active) { maxTotal += u2Max; if (m.u2 !== null && m.u2 !== undefined) totalCA += m.u2; }
          if (etActive) { maxTotal += etMax; if (m.u3 !== null && m.u3 !== undefined) totalCA += m.u3; }
          if (hpgActive) { maxTotal += hpgMax; if (m.hpg !== null && m.hpg !== undefined) totalCA += m.hpg; }

          if (maxTotal > 0) {
            totalPtSum += (totalCA / maxTotal) * 3;
            ptCount++;
          }
          if (m.eoy !== null && m.eoy !== undefined) {
            summSum += m.eoy;
            summCount++;
          }
        }
      });

      const avgPt = ptCount > 0 ? (totalPtSum / ptCount).toFixed(1) : "-";
      const avgIdent = ptCount > 0 ? Math.round(totalPtSum / ptCount) : "-";
      let avgDesc = "-";
      if (ptCount > 0) {
        const roundedIdent = Math.round(totalPtSum / ptCount);
        if (roundedIdent >= 3) avgDesc = "Outstanding";
        else if (roundedIdent === 2) avgDesc = "Moderate";
        else if (roundedIdent === 1) avgDesc = "Basic";
        else avgDesc = "Elementary";
      }
      const summAvg = summCount > 0 ? `${Math.round(summSum / summCount)}%` : "-";

      const rankSpan = (u1Active ? 1 : 0) + (u2Active ? 1 : 0) + (etActive ? 1 : 0);
      const rankColSpan = rankSpan > 0 ? rankSpan : 1;
      const totScoreColSpan = rankSpan > 0 ? (4 + (hpgActive ? 1 : 0)) : (3 + (hpgActive ? 1 : 0));

      return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5px", marginBottom: "20px", border: outerBorder }}>
          <thead>
            <tr style={{ background: headerBackground, textAlign: "center", fontWeight: "bold" }}>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "left", width: "14%" }} rowSpan={2}>SUBJECT</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "3px" }} colSpan={(u1Active ? 1 : 0) + (u2Active ? 1 : 0) + (etActive ? 1 : 0) + 7}>FORMATIVE ASSESSMENT SCORES (AOI & PROJECT WORK)</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "3px" }} rowSpan={2}>SUMMATIVE<br />EXAMINATION<br />OUT OF 80</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "3px" }} rowSpan={2}>OVERALL<br />SCORE<br />%</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "3px" }} rowSpan={2}>OVERALL<br />GRADE<br />SCORED</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "3px" }} rowSpan={2}>TEACHERS<br />INITIALS</th>
            </tr>
            <tr style={{ background: headerBackground, textAlign: "center", fontWeight: "bold" }}>
              {u1Active && <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>U1</th>}
              {u2Active && <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>U2</th>}
              {etActive && <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>U3</th>}
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>TOTAL PTS</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>AMR SCORE</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>TOTAL<br />Out of 10</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>SCORE<br />IDENTIFIER</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>DESCRIPTOR</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>PROJECT<br />OUT OF 10</th>
              <th style={{ border: `1px solid ${tableBorderColor}`, padding: "2px" }}>TOTAL<br />OUT OF 20</th>
            </tr>
          </thead>
          <tbody>
            {classSubjects.map(sub => {
              const m = stMarks.find(mk => mk.subjectId === sub.id);
              const subjectMarks = marks.filter(mk => mk.subjectId === sub.id && mk.examPaperId === eotExam.id && classStudentsIds.includes(mk.studentId));
              const hasU1 = u1Active && subjectMarks.some(mk => mk.u1 !== null && mk.u1 !== undefined);
              const hasU2 = u2Active && subjectMarks.some(mk => mk.u2 !== null && mk.u2 !== undefined);
              const hasEt = etActive && subjectMarks.some(mk => mk.u3 !== null && mk.u3 !== undefined);
              const hasHpg = hpgActive && subjectMarks.some(mk => mk.hpg !== null && mk.hpg !== undefined);

              let totalCA = 0;
              let maxTotal = 0;
              if (hasU1) { maxTotal += u1Max; if (m?.u1 !== null && m?.u1 !== undefined) totalCA += m.u1; }
              if (hasU2) { maxTotal += u2Max; if (m?.u2 !== null && m?.u2 !== undefined) totalCA += m.u2; }
              if (hasEt) { maxTotal += etMax; if (m?.u3 !== null && m?.u3 !== undefined) totalCA += m.u3; }
              if (hasHpg) { maxTotal += hpgMax; if (m?.hpg !== null && m?.hpg !== undefined) totalCA += m.hpg; }

              const avgCA = maxTotal > 0 && m ? ((totalCA / maxTotal) * 3).toFixed(1) : "-";
              const outOf10 = maxTotal > 0 && m ? ((totalCA / maxTotal) * 10).toFixed(1) : "-";
              const scoreIdentifier = maxTotal > 0 && m ? Math.round((totalCA / maxTotal) * 3).toFixed(1) : "-";
              
              let descVal = "-";
              if (maxTotal > 0 && m) {
                const idVal = Math.round((totalCA / maxTotal) * 3);
                if (idVal >= 3) descVal = "Outstanding";
                else if (idVal === 2) descVal = "Moderate";
                else if (idVal === 1) descVal = "Basic";
                else descVal = "Elementary";
              }

              const totalOut20 = maxTotal > 0 && m ? ((totalCA / maxTotal) * 20).toFixed(1) : "-";
              const projectOut10 = m?.hpg !== null && m?.hpg !== undefined ? m.hpg.toFixed(1) : "";

              const eoyVal = m?.eoy !== null && m?.eoy !== undefined ? m.eoy.toFixed(1) : "-";
              const totalVal = m ? m.score.toFixed(0) : "-";
              const gradeVal = m ? m.competencyGrade : "-";

              const assignment = teacherAssignments.find(ta => ta.classId === student.classId && ta.streamId === student.streamId && ta.subjectId === sub.id);
              let teacherInitials = "";
              if (assignment) {
                const teacherUser = users.find(u => u.id === assignment.teacherId);
                if (teacherUser) {
                  teacherInitials = teacherUser.name.split(" ").map(w => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "");
                }
              }

              return (
                <tr key={sub.id}>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", fontWeight: "bold" }}>{sub.name}</td>
                  {u1Active && <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{m?.u1 !== null && m?.u1 !== undefined ? m.u1.toFixed(1) : "-"}</td>}
                  {u2Active && <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{m?.u2 !== null && m?.u2 !== undefined ? m.u2.toFixed(1) : "-"}</td>}
                  {etActive && <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{m?.u3 !== null && m?.u3 !== undefined ? m.u3.toFixed(1) : "-"}</td>}
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center", fontWeight: "600" }}>{m ? totalCA.toFixed(1) : "-"}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{avgCA}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{outOf10}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{scoreIdentifier}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{descVal}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{projectOut10}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{totalOut20}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center" }}>{eoyVal}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center", fontWeight: "bold" }}>{m ? `${totalVal}` : "-"}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center", fontWeight: "bold", color: "var(--primary)" }}>{gradeVal}</td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "3px", textAlign: "center", fontWeight: "bold" }}>{teacherInitials || "-"}</td>
                </tr>
              );
            })}
            {school?.reportShowSummaryRow !== false && rankInfo && (
              <>
                <tr style={{ background: summaryBackground, fontWeight: "bold", fontSize: "11px" }}>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "8px", textAlign: "left", verticalAlign: "middle" }} colSpan={(u1Active ? 1 : 0) + (u2Active ? 1 : 0) + (etActive ? 1 : 0) + 6} rowSpan={2}>
                    OVERALL AVERAGE LEVEL OF ACHIEVEMENT
                  </td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>CLASS RANKING</div>
                    <div style={{ fontSize: "14px" }}>{rankInfo.position}</div>
                  </td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>CLASS TOTAL</div>
                    <div style={{ fontSize: "14px" }}>{rankInfo.totalStudents}</div>
                  </td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }} rowSpan={2}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>TOTAL SCORE</div>
                    <div style={{ fontSize: "14px" }}>{rankInfo.studentTotal}</div>
                  </td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }} rowSpan={2}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>Av. Score</div>
                    <div style={{ fontSize: "14px" }}>{avgPt}</div>
                  </td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }} rowSpan={2}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>Ident.</div>
                    <div style={{ fontSize: "14px" }}>{avgIdent}</div>
                  </td>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }} rowSpan={2}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>Descriptor</div>
                    <div style={{ fontSize: "14px" }}>{avgDesc}</div>
                  </td>
                </tr>
                <tr style={{ background: summaryBackground, fontWeight: "bold", fontSize: "11px" }}>
                  <td style={{ border: `1px solid ${tableBorderColor}`, padding: "4px", textAlign: "center" }} colSpan={2}>
                    <div style={{ fontSize: "9px", color: "#475569", textTransform: "uppercase", marginBottom: "2px" }}>AVERAGE SCORE</div>
                    <div style={{ fontSize: "14px" }}>{Math.round(parseFloat(rankInfo.classAverage))}</div>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      );
    } else {
      const rankInfo = getStudentRankAndTotals(student.id, student.classId, eotExam.id);
      return (
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
            {classSubjects.map(sub => {
              const m = stMarks.find(mk => mk.subjectId === sub.id);
              const gradeObj = m ? computeGradeFromRanges(m.score, "PRIMARY", gradeRanges) : null;
              const gradeVal = m ? m.competencyGrade : "-";

              return (
                <tr key={sub.id}>
                  <td style={{ border: "1px solid #94a3b8", padding: "8px", fontWeight: "bold" }}>{sub.name}</td>
                  <td style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center" }}>{m ? `${m.score}%` : "-"}</td>
                  <td style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center", fontWeight: "bold" }}>{m ? `PLE: Grade ${gradeVal}` : "-"}</td>
                  <td style={{ border: "1px solid #94a3b8", padding: "8px" }}>{m ? (m.comments || gradeObj?.descriptor || "Good effort") : "-"}</td>
                </tr>
              );
            })}
            {school?.reportShowSummaryRow !== false && rankInfo && (
              <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                <td style={{ border: "1px solid #94a3b8", padding: "8px" }}>OVERALL AVERAGE</td>
                <td style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center" }}>
                  AVG: {rankInfo.studentAverage}%
                </td>
                <td style={{ border: "1px solid #94a3b8", padding: "8px", textAlign: "center" }}>
                  RANK: {rankInfo.position} / {rankInfo.totalStudents}
                </td>
                <td style={{ border: "1px solid #94a3b8", padding: "8px" }}>
                  TOTAL SCORE: {rankInfo.studentTotal}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      );
    }
  };

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
  const [designerTikTok, setDesignerTikTok] = useState("");
  const [designerWebsite, setDesignerWebsite] = useState("");
  const [designerLocation, setDesignerLocation] = useState("");
  const [designerShowChart, setDesignerShowChart] = useState(true);
  const [designerShowLIN, setDesignerShowLIN] = useState(true);
  const [designerShowPayCode, setDesignerShowPayCode] = useState(true);
  const [designerShowComments, setDesignerShowComments] = useState(true);
  const [designerShowFees, setDesignerShowFees] = useState(true);
  const [designerShowTermDates, setDesignerShowTermDates] = useState(true);
  const [designerShowSummaryRow, setDesignerShowSummaryRow] = useState(true);

  useEffect(() => {
    if (selectedReportStudent) {
      setTempClassTeacherComment(selectedReportStudent.classTeacherComment || "");
      setTempHeadTeacherComment(selectedReportStudent.headTeacherComment || "");
    } else {
      setTempClassTeacherComment("");
      setTempHeadTeacherComment("");
    }
  }, [selectedReportStudent]);

  useEffect(() => {
    async function fetchSchool() {
      try {
        setLoading(true);
        setLoadError(null);
        
        const res = await fetch(`/api/school-data?subdomain=${subdomain}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        const s = data.school;
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
          setProfileSchoolType(s.schoolType as any || "COMBINED");
          setProfileSchoolPayCode(s.schoolPayCode || "");
          setProfileSchoolPayPassword(s.schoolPayPassword || "");
          setProfileCurrentTerm(s.currentTerm?.toString() || "1");
          setProfileCurrentYear(s.currentYear?.toString() || new Date().getFullYear().toString());
      setProfileTerm1Start(s.term1Start ? new Date(s.term1Start).toISOString().split('T')[0] : "");
      setProfileTerm1End(s.term1End ? new Date(s.term1End).toISOString().split('T')[0] : "");
      setProfileTerm2Start(s.term2Start ? new Date(s.term2Start).toISOString().split('T')[0] : "");
      setProfileTerm2End(s.term2End ? new Date(s.term2End).toISOString().split('T')[0] : "");
      setProfileTerm3Start(s.term3Start ? new Date(s.term3Start).toISOString().split('T')[0] : "");
      setProfileTerm3End(s.term3End ? new Date(s.term3End).toISOString().split('T')[0] : "");

          setNewClassLevel(s.schoolType === "SECONDARY" ? "SECONDARY" : "PRIMARY");
          setNewExamIsNewCurriculum(s.schoolType === "SECONDARY");

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
          setDesignerTikTok(s.reportTikTok || "");
          setDesignerWebsite(s.reportWebsite || "");
          setDesignerLocation(s.reportLocation || "");
          setDesignerShowChart(s.reportShowChart !== false);
          setDesignerShowLIN(s.reportShowLIN !== false);
          setDesignerShowPayCode(s.reportShowPayCode !== false);
          setDesignerShowComments(s.reportShowComments !== false);
          setDesignerShowFees(s.reportShowFees !== false);
          setDesignerShowTermDates(s.reportShowTermDates !== false);
          setDesignerShowSummaryRow(s.reportShowSummaryRow !== false);

          setCbU1Max(s.cbU1Max ?? 3);
          setCbU2Max(s.cbU2Max ?? 3);
          setCbEtMax(s.cbEtMax ?? 3);
          setCbHpgMax(s.cbHpgMax ?? 3);
          setCbU1Active(s.cbU1Active !== false);
          setCbU2Active(s.cbU2Active !== false);
          setCbEtActive(s.cbEtActive !== false);
          setCbHpgActive(s.cbHpgActive !== false);

          const ranges = data.gradeRanges || [];
          setGradeRanges(ranges);
          setEditingGradeRanges(ranges);

          // Initialize design next term fees:
          setDesignerNextTermFeesDay(s.reportNextTermFeesDay || 150000);
          setDesignerNextTermFeesBoarding(s.reportNextTermFeesBoarding || 350000);
        }
        
        setDbConnected(!!data.dbConnected);
      } catch (err: any) {
        console.error("Error loading school portal data:", err);
        const msg = err?.message || "";
        if (msg.includes("Server Components") || msg.includes("production builds") || msg.includes("Digest")) {
          setLoadError("Unable to connect to the school database. The server may be starting up â€” please wait a moment and try again.");
        } else {
          setLoadError(msg || "An unexpected error occurred while connecting to the database server.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSchool();
  }, [subdomain]);

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagError(null);
    try {
      const res = await fetch("/api/diagnostics");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.substring(0, 300)}`);
      }
      const data = await res.json();
      setDiagnostics(data);
    } catch (err: any) {
      console.error("Diagnostics error:", err);
      setDiagError(err.message || String(err));
    } finally {
      setRunningDiagnostics(false);
    }
  };

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
      const ranges = await getGradeRanges(schoolId);
      setGradeRanges(ranges);
      setEditingGradeRanges(ranges);

      const assignments = await getTeacherSubjects(schoolId);
      setTeacherAssignments(assignments);

      const staffTeachers = usrs.filter(u => u.role === "TEACHER");
      if (staffTeachers.length > 0) setNewAssignmentTeacherId(staffTeachers[0].id);
      if (cls.length > 0) {
        setNewAssignmentClassId(cls[0].id);
        const clStreams = strms.filter(st => st.classId === cls[0].id);
        if (clStreams.length > 0) setNewAssignmentStreamId(clStreams[0].id);
        const clSubjects = subjs.filter(sb => sb.classId === cls[0].id);
        if (clSubjects.length > 0) setNewAssignmentSubjectId(clSubjects[0].id);
      }

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
        // Load SchoolPay transactions (if configured)
        try {
          const spTx = await getSchoolPayTransactions(schoolId);
          setSchoolPayTransactions(spTx);
        } catch {}
        if (studs.length > 0) {
          setSelectedPayStudentId(studs[0].id);
        }
      }

      // Load SMS logs and credits
      try {
        const logs = await getSmsLogs(schoolId);
        setSmsLogs(logs);
        const credits = await getSmsCredits(schoolId);
        setSmsCredits(credits);
        const totalCredits = credits.filter(c => c.status === "CONFIRMED")
          .reduce((sum, c) => sum + (c.creditsPurchased - c.creditsUsed), 0);
        setSmsTotalCredits(totalCredits);
      } catch {}

      // Pre-set SMS target class to first class
      if (cls.length > 0) setSmsTargetClassId(cls[0].id);
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
        newU1[st.id] = m.u1 !== null && m.u1 !== undefined && (school?.cbU1Max || 3) > 0 ? String(Math.round((m.u1 / (school?.cbU1Max || 3)) * 100)) : "";
        newU2[st.id] = m.u2 !== null && m.u2 !== undefined && (school?.cbU2Max || 3) > 0 ? String(Math.round((m.u2 / (school?.cbU2Max || 3)) * 100)) : "";
        newU3[st.id] = m.u3 !== null && m.u3 !== undefined && (school?.cbEtMax || 3) > 0 ? String(Math.round((m.u3 / (school?.cbEtMax || 3)) * 100)) : "";
        newHPG[st.id] = m.hpg !== null && m.hpg !== undefined && (school?.cbHpgMax || 3) > 0 ? String(Math.round((m.hpg / (school?.cbHpgMax || 3)) * 100)) : "";
        newEOY[st.id] = m.eoy !== null && m.eoy !== undefined ? String(Math.round((m.eoy / 80) * 100)) : "";
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

  // Synchronize selections for TEACHER role when assignments or selections change
  useEffect(() => {
    if (currentUser?.role === "TEACHER" && teacherAssignments.length > 0 && classes.length > 0) {
      const myClasses = classes.filter(c => teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === c.id));
      if (myClasses.length > 0) {
        const firstClass = myClasses[0].id;
        if (!selectedClassId || !myClasses.some(c => c.id === selectedClassId)) {
          setSelectedClassId(firstClass);
        }
        const classIdToUse = !selectedClassId || !myClasses.some(c => c.id === selectedClassId) ? firstClass : selectedClassId;
        
        const myStreams = streams.filter(st => st.classId === classIdToUse && teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === classIdToUse && ta.streamId === st.id));
        if (myStreams.length > 0) {
          const firstStream = myStreams[0].id;
          if (!selectedStreamId || !myStreams.some(s => s.id === selectedStreamId)) {
            setSelectedStreamId(firstStream);
          }
          const streamIdToUse = !selectedStreamId || !myStreams.some(s => s.id === selectedStreamId) ? firstStream : selectedStreamId;
          
          const mySubjects = subjects.filter(sub => sub.classId === classIdToUse && teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === classIdToUse && ta.streamId === streamIdToUse && ta.subjectId === sub.id));
          if (mySubjects.length > 0) {
            if (!selectedSubjectId || !mySubjects.some(s => s.id === selectedSubjectId)) {
              setSelectedSubjectId(mySubjects[0].id);
            }
          }
        }
      }
    }
  }, [currentUser, teacherAssignments, classes, streams, subjects, selectedClassId, selectedStreamId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!school) return;

    if (school.status !== "ACTIVE") {
      setAuthError("This school's account is pending activation. Please pay/contact super admin.");
      return;
    }

    try {
      const user = await authenticateUser(email, password, subdomain);
      if (user) {
        if (user.id === "ERROR") {
          setAuthError(user.name);
          return;
        }
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
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "An error occurred while signing in.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setEmail("");
    setPassword("");
  };

  useEffect(() => {
    if (currentUser) {
      setProfileEditName(currentUser.name);
      setProfileEditPhoto(currentUser.photo || "");
    } else {
      setProfileEditName("");
      setProfileEditPhoto("");
    }
  }, [currentUser]);

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
      setProfileSchoolPayCode(updated.schoolPayCode || "");
      setProfileSchoolPayPassword(updated.schoolPayPassword || "");
      setProfileCurrentTerm(updated.currentTerm?.toString() || "1");
      setProfileCurrentYear(updated.currentYear?.toString() || new Date().getFullYear().toString());
      setProfileTerm1Start(updated.term1Start ? new Date(updated.term1Start).toISOString().split('T')[0] : "");
      setProfileTerm1End(updated.term1End ? new Date(updated.term1End).toISOString().split('T')[0] : "");
      setProfileTerm2Start(updated.term2Start ? new Date(updated.term2Start).toISOString().split('T')[0] : "");
      setProfileTerm2End(updated.term2End ? new Date(updated.term2End).toISOString().split('T')[0] : "");
      setProfileTerm3Start(updated.term3Start ? new Date(updated.term3Start).toISOString().split('T')[0] : "");
      setProfileTerm3End(updated.term3End ? new Date(updated.term3End).toISOString().split('T')[0] : "");


      toast.success("School branding and leaders configured successfully!");
      setShowFirstTimeSetup(false);
      setSetupAdminEmail("");
      setSetupAdminPassword("");
    } catch (err) {
      setSetupError("Failed to update school metadata.");
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    if (!newAssignmentTeacherId || !newAssignmentClassId || !newAssignmentStreamId || !newAssignmentSubjectId) {
      toast.error("Please fill all assignment fields.");
      return;
    }
    const duplicate = teacherAssignments.find(
      ts => ts.teacherId === newAssignmentTeacherId &&
            ts.classId === newAssignmentClassId &&
            ts.streamId === newAssignmentStreamId &&
            ts.subjectId === newAssignmentSubjectId
    );
    if (duplicate) {
      toast.error("This teacher is already assigned to this class, stream, and subject!");
      return;
    }
    try {
      await createTeacherSubject({
        teacherId: newAssignmentTeacherId,
        classId: newAssignmentClassId,
        streamId: newAssignmentStreamId,
        subjectId: newAssignmentSubjectId
      });
      toast.success("Teacher assignment saved successfully!");
      await loadSchoolData(school.id);
    } catch (err: any) {
      toast.error("Failed to create assignment: " + (err.message || err));
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher assignment?")) return;
    if (!school) return;
    try {
      const ok = await deleteTeacherSubject(id);
      if (ok) {
        toast.success("Assignment deleted successfully.");
        await loadSchoolData(school.id);
      }
    } catch (err: any) {
      toast.error("Failed to delete assignment: " + (err.message || err));
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
        schoolType: profileSchoolType,
        headTeacher: profileHeadTeacher,
        deputyHeadTeacher: profileDeputyHeadTeacher,
        director: profileDirector,
        logoUrl: profileLogoUrl,
        themeColor: profileThemeColor,
        currentTerm: parseInt(profileCurrentTerm) || 1,
        currentYear: parseInt(profileCurrentYear) || new Date().getFullYear(),

        term1Start: profileTerm1Start ? new Date(profileTerm1Start) : null,
        term1End: profileTerm1End ? new Date(profileTerm1End) : null,
        term2Start: profileTerm2Start ? new Date(profileTerm2Start) : null,
        term2End: profileTerm2End ? new Date(profileTerm2End) : null,
        term3Start: profileTerm3Start ? new Date(profileTerm3Start) : null,
        term3End: profileTerm3End ? new Date(profileTerm3End) : null,

        schoolPayCode: profileSchoolPayCode,
        schoolPayPassword: profileSchoolPayPassword,
        cbU1Max,
        cbU2Max,
        cbEtMax,
        cbHpgMax,
        cbU1Active,
        cbU2Active,
        cbEtActive,
        cbHpgActive,
      });
      setSchool(updated);
      setNewClassLevel(updated.schoolType === "SECONDARY" ? "SECONDARY" : "PRIMARY");
      setNewExamIsNewCurriculum(updated.schoolType === "SECONDARY");
      setProfileSuccessMsg("School profile and settings updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update school profile");
    }
  };

  const handleGradeRangeChange = (index: number, field: keyof GradeRange, value: any) => {
    const updated = [...editingGradeRanges];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setEditingGradeRanges(updated);
  };

  const handleSaveCustomGradeRanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    try {
      const cleaned = editingGradeRanges.map(r => ({
        systemType: r.systemType,
        grade: r.grade,
        minMark: Number(r.minMark),
        maxMark: Number(r.maxMark),
        achievementLevel: r.achievementLevel,
        descriptor: r.descriptor || ""
      }));
      const updated = await saveGradeRanges(school.id, cleaned);
      setGradeRanges(updated);
      setEditingGradeRanges(updated);
      toast.success("Custom grade ranges and achievement levels updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save grade ranges: " + (err.message || err));
    }
  };

  // Create class handler
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName || !school) return;
    try {
      await createClass(school.id, newClassName, newClassLevel);
      setNewClassName("");
      await loadSchoolData(school.id);
      toast.success("Class created successfully!");
    } catch (err: any) {
      console.error("Error creating class:", err);
      toast.error("Failed to create class: " + (err.message || err));
    }
  };

  // Create stream handler
  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName || !newStreamClassId || !school) return;
    try {
      await createStream(newStreamClassId, newStreamName);
      setNewStreamName("");
      await loadSchoolData(school.id);
      toast.success("Stream created successfully!");
    } catch (err: any) {
      console.error("Error creating stream:", err);
      toast.error("Failed to create stream: " + (err.message || err));
    }
  };

  // Create staff user handler
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName || !newTeacherEmail || !school) return;
    try {
      const res = await createUser({
        schoolId: school.id,
        name: newTeacherName,
        email: newTeacherEmail,
        passwordHash: newTeacherPassword,
        role: newTeacherRole,
        photo: newTeacherPhoto || null,
        staffNumber: newTeacherStaffNumber || null,
        contact: newTeacherContact || null,
      });
      if (!res.success) {
        toast.error("Failed to create staff account: " + res.error);
        return;
      }
      setNewTeacherName("");
      setNewTeacherEmail("");
      setNewTeacherPassword("password");
      setNewTeacherPhoto("");
      setNewTeacherContact("");
      await loadSchoolData(school.id);
      toast.success("Staff member user account created successfully!");
    } catch (err: any) {
      console.error("Error creating staff:", err);
      toast.error("Failed to create staff account: " + (err.message || err));
    }
  };

  // Create student handler
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentNumber || !newStudentClassId || !newStudentStreamId || !school) return;
    try {
      await createStudent({
        schoolId: school.id,
        classId: newStudentClassId,
        streamId: newStudentStreamId,
        name: newStudentName,
        studentNumber: newStudentNumber,
        type: newStudentType,
        photo: newStudentPhoto || null,
        lin: newStudentLin || null,
        studentPaymentCode: newStudentPaymentCode || null,
        registrationNumber: newStudentRegNumber || null,
        gender: newStudentGender,
        parentContact: newStudentParentContact || null,
      });
      setNewStudentName("");
      setNewStudentNumber("");
      setNewStudentPhoto("");
      setNewStudentLin("");
      setNewStudentPaymentCode("");
      setNewStudentRegNumber("");
      setNewStudentGender("MALE");
      setNewStudentParentContact("");
      await loadSchoolData(school.id);
      toast.success("Student registered successfully!");
    } catch (err: any) {
      console.error("Error registering student:", err);
      toast.error("Failed to register student: " + (err.message || err));
    }
  };

  // --- Class & Stream Mutation Handlers ---
  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditClass || !editClassName) return;
    try {
      await updateClass(selectedEditClass.id, editClassName, editClassLevel);
      setShowEditClassModal(false);
      setSelectedEditClass(null);
      await loadSchoolData(school!.id);
      toast.success("Class updated successfully!");
    } catch (err: any) {
      toast.error("Error updating class: " + (err.message || err));
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    if (confirm(`⚠️ WARNING: Deleting class "${cls.name}" will permanently delete ALL students in this class, along with their marks, payments, attendances, and class streams/subjects. Are you sure you want to proceed?`)) {
      try {
        await deleteClass(classId);
        await loadSchoolData(school!.id);
        toast.success("Class and all associated records deleted successfully!");
      } catch (err: any) {
        toast.error("Error deleting class: " + (err.message || err));
      }
    }
  };

  const handleDeleteAllStudentsOfClass = async (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    const studentCount = students.filter(st => st.classId === classId).length;
    if (studentCount === 0) {
      toast.error(`There are no students registered in class "${cls.name}" to delete.`);
      return;
    }
    if (confirm(`⚠️ WARNING: Are you sure you want to permanently delete ALL ${studentCount} students in class "${cls.name}"? This will also delete all their marks, payments, and attendance records. This action CANNOT be undone.`)) {
      try {
        await deleteStudentsByClass(classId);
        await loadSchoolData(school!.id);
        toast.success(`Successfully deleted all students of class "${cls.name}".`);
      } catch (err: any) {
        toast.error("Error deleting class students: " + (err.message || err));
      }
    }
  };

  const handleRenameStream = async (streamId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateStream(streamId, newName.trim());
      // Refresh renames state
      setEditStreamRenames(prev => ({ ...prev, [streamId]: newName }));
      await loadSchoolData(school!.id);
    } catch (err: any) {
      toast.error("Error renaming stream: " + (err.message || err));
    }
  };

  const handleAddStreamToClass = async (classId: string, name: string) => {
    if (!name.trim()) return;
    try {
      await createStream(classId, name.trim());
      setEditStreamNewName("");
      await loadSchoolData(school!.id);
      toast.success("Stream added successfully!");
    } catch (err: any) {
      toast.error("Error adding stream: " + (err.message || err));
    }
  };

  const handleDeleteStreamFromClass = async (streamId: string) => {
    try {
      await deleteStream(streamId);
      await loadSchoolData(school!.id);
      toast.success("Stream deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || err);
    }
  };

  const handleDeleteSubject = async (subjectId: string, subjectName: string, className: string) => {
    if (confirm(`Are you sure you want to delete subject "${subjectName}" from class "${className}"? This will delete all marks recorded for this subject.`)) {
      try {
        await deleteSubject(subjectId);
        await loadSchoolData(school!.id);
        toast.success("Subject deleted successfully!");
      } catch (err: any) {
        toast.error("Error deleting subject: " + (err.message || err));
      }
    }
  };

  // Excel Parsing and Template Downloads
  const downloadStudentTemplate = () => {
    const headers = [["Name", "Student Number (Optional)", "Residency (DAY or BOARDING)", "LIN (Optional)", "Gender (MALE or FEMALE)", "Pay Code (Optional)", "Parent Contact (Optional)"]];
    const sampleData = [
      ["Namusoke Joy", "", "DAY", "", "FEMALE", "194570001", "0771234567"],
      ["Opio Peter", "STU-0002", "BOARDING", "LIN-98765432", "MALE", "194570002", "0700987654"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [...headers, ...sampleData]);
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Upload_Template.xlsx");
  };

  const downloadStaffTemplate = () => {
    const headers = [["Full Name", "Email Address", "Role (TEACHER, DOS, HEADTEACHER, DIRECTOR)", "Staff Number (Optional)"]];
    const sampleData = [
      ["Opio Peter", "peter@school.ug", "TEACHER", ""],
      ["Nakafeero Sylvia", "sylvia@school.ug", "DOS", "STF-0012"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, [...headers, ...sampleData]);
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, "Staff_Upload_Template.xlsx");
  };

  const handleParseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  // Bulk student upload handler
  const handleBulkStudentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !bulkStudentClassId || !bulkStudentStreamId || !studentExcelFile) {
      toast.error("Please choose a class, stream, and select an Excel template file.");
      return;
    }
    try {
      const rows = await handleParseExcel(studentExcelFile);
      if (rows.length <= 1) {
        toast.error("The uploaded Excel file has no student data rows.");
        return;
      }

      setIsImportingStudents(true);
      setImportStudentProgress(0);
      setImportStudentTotal(rows.length - 1);

      let successCount = 0;
      let existingCount = students.length;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) {
          setImportStudentProgress(i);
          continue;
        }

        const name = String(row[0]).trim();
        let studentNumber = row[1] ? String(row[1]).trim() : "";
        let typeStr = row[2] ? String(row[2]).trim() : "DAY";
        let lin = row[3] ? String(row[3]).trim() : "";
        let genderStr = row[4] ? String(row[4]).trim() : "MALE";
        let payCode = row[5] ? String(row[5]).trim() : "";
        let parentContact = row[6] ? String(row[6]).trim() : "";

        if (!studentNumber) {
          existingCount++;
          const initials = school.name.split(/\s+/).map(w => w[0]).join("").toUpperCase().replace(/[^A-Z]/g, "") || subdomain.toUpperCase();
          studentNumber = `${initials}-STU-${String(existingCount).padStart(4, "0")}`;
        }

        let residencyType: "DAY" | "BOARDING" = "DAY";
        if (typeStr.toUpperCase() === "BOARDING" || typeStr.toUpperCase() === "B") {
          residencyType = "BOARDING";
        }

        let genderVal: "MALE" | "FEMALE" = "MALE";
        if (genderStr.toUpperCase() === "FEMALE" || genderStr.toUpperCase() === "F") {
          genderVal = "FEMALE";
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
          gender: genderVal,
          studentPaymentCode: payCode || null,
          parentContact: parentContact || null,
        });
        successCount++;
        setImportStudentProgress(i);
      }

      setStudentExcelFile(null);
      setShowBulkStudentModal(false);
      await loadSchoolData(school.id);
      toast.success(`Successfully imported ${successCount} students!`);
    } catch (err: any) {
      toast.error("Error importing students: " + (err.message || err));
    } finally {
      setIsImportingStudents(false);
      setImportStudentProgress(0);
      setImportStudentTotal(0);
    }
  };

  // Bulk staff upload handler
  const handleBulkStaffUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !staffExcelFile) {
      toast.error("Please select an Excel template file.");
      return;
    }
    try {
      const rows = await handleParseExcel(staffExcelFile);
      if (rows.length <= 1) {
        toast.error("The uploaded Excel file has no staff data rows.");
        return;
      }

      let successCount = 0;
      let existingCount = users.length;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[0]) continue;

        const name = String(row[0]).trim();
        const email = row[1] ? String(row[1]).trim() : "";
        let roleStr = row[2] ? String(row[2]).trim() : "TEACHER";
        let staffNumber = row[3] ? String(row[3]).trim() : "";

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

        const res = await createUser({
          schoolId: school.id,
          name,
          email,
          passwordHash: "password",
          role,
          photo: null,
          staffNumber,
        });
        if (!res.success) {
          console.error("Bulk staff import failed for " + email + ": " + res.error);
          continue;
        }
        successCount++;
      }

      setStaffExcelFile(null);
      setShowBulkStaffModal(false);
      await loadSchoolData(school.id);
      toast.success(`Successfully imported ${successCount} staff accounts!`);
    } catch (err: any) {
      toast.error("Error importing staff: " + (err.message || err));
    }
  };

  // Helper to match filename to student name
  const matchStudentPhotoFilename = (filename: string, classStudents: any[]) => {
    const filenameWithNoExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const normalizedFilename = filenameWithNoExt.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
    const fileWords = normalizedFilename.split(' ').filter((w: string) => w.length > 0);
    
    let matchedStudentId = "";
    let matchType: "Exact" | "Fuzzy" | "Unmatched" = "Unmatched";
    let highestScore = 0;
    
    for (const student of classStudents) {
      const normalizedStudentName = student.name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
      
      // Exact match
      if (normalizedStudentName === normalizedFilename) {
        matchedStudentId = student.id;
        matchType = "Exact";
        break;
      }
      
      // Fuzzy match based on words overlap
      const studentWords = normalizedStudentName.split(' ').filter((w: string) => w.length > 0);
      const commonWords = fileWords.filter((w: string) => studentWords.includes(w));
      
      if (fileWords.length > 0 && studentWords.length > 0) {
        const score = commonWords.length / Math.max(fileWords.length, studentWords.length);
        const allFileWordsInStudent = fileWords.every((w: string) => studentWords.includes(w));
        const allStudentWordsInFile = studentWords.every((w: string) => studentWords.includes(w));
        
        if ((allFileWordsInStudent || allStudentWordsInFile || score > 0.4) && score > highestScore) {
          highestScore = score;
          matchedStudentId = student.id;
          matchType = "Fuzzy";
        }
      }
    }
    
    return { matchedStudentId, matchType };
  };

  // Bulk student photo upload selected handler
  const handleBulkPhotoUploadSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    // Filter students in selected class/stream
    const classStudents = students.filter(st => {
      const matchClass = !bulkPhotoClassId || st.classId === bulkPhotoClassId;
      const matchStream = !bulkPhotoStreamId || st.streamId === bulkPhotoStreamId;
      return matchClass && matchStream;
    });

    const matches: any[] = [];
    
    for (const file of files) {
      try {
        // Convert file to base64 Data URL
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Match filename
        const { matchedStudentId, matchType } = matchStudentPhotoFilename(file.name, classStudents);
        
        matches.push({
          filename: file.name,
          fileSize: file.size,
          base64Data,
          matchedStudentId,
          matchType,
        });
      } catch (err) {
        console.error("Error reading file " + file.name + ":", err);
      }
    }
    
    setBulkPhotoMatches(matches);
  };

  // Apply bulk student photos handler
  const handleApplyBulkPhotos = async () => {
    const validMatches = bulkPhotoMatches.filter(m => m.matchedStudentId);
    if (validMatches.length === 0) {
      toast.error("No student matches to apply.");
      return;
    }
    
    setIsApplyingPhotos(true);
    try {
      let successCount = 0;
      for (const match of validMatches) {
        try {
          await updateStudent(match.matchedStudentId, { photo: match.base64Data });
          successCount++;
        } catch (err) {
          console.error(`Failed to update photo for student ID ${match.matchedStudentId}:`, err);
        }
      }
      
      await loadSchoolData(school!.id);
      setShowBulkPhotoModal(false);
      setBulkPhotoMatches([]);
      toast.success(`Successfully uploaded and aligned photos for ${successCount} students!`);
    } catch (err: any) {
      toast.error("Error applying student photos: " + (err.message || err));
    } finally {
      setIsApplyingPhotos(false);
    }
  };

  // Create subject handler
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName || !newSubjectClassId || !school) return;
    
    const createOp = async () => {
      await createSubject({
        schoolId: school.id,
        classId: newSubjectClassId,
        streamId: newSubjectStreamId || null,
        name: newSubjectName,
        code: newSubjectCode,
      });
      setNewSubjectName("");
      setNewSubjectCode("");
      setNewSubjectStreamId("");
      await loadSchoolData(school.id);
      return "Subject created successfully!";
    };

    toast.promise(createOp(), {
      loading: 'Processing command...',
      success: (msg) => msg,
      error: (err) => "Failed to create subject: " + (err.message || err),
    });
  };

  const handleBulkCreateSubjects = async (e: React.FormEvent, targetClassId: string, targetStreamId: string, subjectString: string) => {
    e.preventDefault();
    if (!targetClassId || !subjectString.trim() || !school) return;
    
    const subjectNames = subjectString.split(",").map(s => s.trim()).filter(s => s.length > 0);
    if (subjectNames.length === 0) {
      toast.error("Please enter at least one subject name.");
      return;
    }

    const bulkOp = async () => {
      for (const name of subjectNames) {
        const code = name.slice(0, 3).toUpperCase();
        await createSubject({
          schoolId: school.id,
          classId: targetClassId,
          streamId: targetStreamId || null,
          name,
          code,
        });
      }
      await loadSchoolData(school.id);
      return `Successfully added ${subjectNames.length} subjects!`;
    };

    toast.promise(bulkOp(), {
      loading: 'Processing command...',
      success: (msg) => msg,
      error: (err) => "Error adding subjects: " + (err.message || err),
    });
  };

  const handleAssignPoolSubjects = async (targetClassId: string) => {
    if (!targetClassId || subjectPoolSelectedSubjects.length === 0 || !school) return;
    
    const assignOp = async () => {
      for (const name of subjectPoolSelectedSubjects) {
        const code = name.slice(0, 3).toUpperCase();
        await createSubject({
          schoolId: school.id,
          classId: targetClassId,
          name,
          code,
        });
      }
      setSubjectPoolSelectedSubjects([]);
      await loadSchoolData(school.id);
      return `Successfully assigned ${subjectPoolSelectedSubjects.length} subjects from pool!`;
    };

    toast.promise(assignOp(), {
      loading: 'Processing command...',
      success: (msg) => msg,
      error: (err) => "Error assigning subjects: " + (err.message || err),
    });
  };

  // Create exam paper
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName || !school) return;
    try {
      await createExamPaper({
        schoolId: school.id,
        name: newExamName,
        term: parseInt(newExamTerm),
        year: parseInt(newExamYear),
        maxMarks: 100,
        isNewCurriculum: newExamIsNewCurriculum,
        classId: newExamClassId || null,
        cbU1Active: newExamCbU1Active,
        cbU2Active: newExamCbU2Active,
        cbEtActive: newExamCbEtActive,
        cbHpgActive: newExamCbHpgActive,
        cbU1Max: newExamCbU1Max,
        cbU2Max: newExamCbU2Max,
        cbEtMax: newExamCbEtMax,
        cbHpgMax: newExamCbHpgMax,
      });
      setNewExamName("");
      setNewExamClassId("");
      setNewExamCbU1Active(true);
      setNewExamCbU2Active(true);
      setNewExamCbEtActive(true);
      setNewExamCbHpgActive(true);
      setNewExamCbU1Max(3);
      setNewExamCbU2Max(3);
      setNewExamCbEtMax(3);
      setNewExamCbHpgMax(3);
      await loadSchoolData(school.id);
      toast.success("Exam Paper scheduled successfully!");
    } catch (err: any) {
      console.error("Error creating exam:", err);
      toast.error("Failed to schedule exam paper: " + (err.message || err));
    }
  };

  // Update exam paper
  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditExam || !editExamName || !school) return;
    try {
      await updateExamPaper(selectedEditExam.id, {
        name: editExamName,
        term: parseInt(editExamTerm),
        year: parseInt(editExamYear),
        classId: editExamClassId || null,
        isNewCurriculum: editExamIsNewCurriculum,
        cbU1Active: editExamCbU1Active,
        cbU2Active: editExamCbU2Active,
        cbEtActive: editExamCbEtActive,
        cbHpgActive: editExamCbHpgActive,
        cbU1Max: editExamCbU1Max,
        cbU2Max: editExamCbU2Max,
        cbEtMax: editExamCbEtMax,
        cbHpgMax: editExamCbHpgMax,
      });
      setShowEditExamModal(false);
      setSelectedEditExam(null);
      await loadSchoolData(school.id);
      toast.success("Exam Paper updated successfully!");
    } catch (err: any) {
      console.error("Error updating exam:", err);
      toast.error("Failed to update exam: " + (err.message || err));
    }
  };

  // Delete exam paper
  const handleDeleteExam = async (examId: string) => {
    const ex = exams.find(e => e.id === examId);
    if (!ex) return;
    if (confirm(`⚠️ WARNING: Deleting exam "${ex.name}" will permanently delete ALL associated student marks for this exam. Are you sure you want to proceed?`)) {
      try {
        await deleteExamPaper(examId);
        await loadSchoolData(school!.id);
        toast.success("Exam Paper deleted successfully!");
      } catch (err: any) {
        toast.error("Error deleting exam: " + (err.message || err));
      }
    }
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
  const handleDownloadMarksTemplate = () => {
    if (!selectedExamId || !selectedSubjectId || !selectedClassId || !selectedStreamId) {
      toast.error("Please select exam, class, stream, and subject first.");
      return;
    }
    const currentExam = exams.find(ex => ex.id === selectedExamId);
    if (!currentExam) return;

    const relevantStudents = students.filter(st => st.classId === selectedClassId && st.streamId === selectedStreamId);
    if (relevantStudents.length === 0) {
      toast.error("No students found in the selected class and stream.");
      return;
    }

    let headers: string[] = [];
    if (currentExam.isNewCurriculum) {
      headers = ["Student Number", "Student Name"];
      if (currentExam.cbU1Active !== false) headers.push("U1 (%)");
      if (currentExam.cbU2Active !== false) headers.push("U2 (%)");
      if (currentExam.cbEtActive !== false) headers.push("E.T (%)");
      if (currentExam.cbHpgActive !== false) headers.push("HPG (%)");
      headers.push("EOY (%)");
      headers.push("Remarks");
    } else {
      headers = ["Student Number", "Student Name", "Score", "Remarks"];
    }

    const templateData = relevantStudents.map(st => {
      const row: any[] = [st.studentNumber, st.name];
      if (currentExam.isNewCurriculum) {
        if (currentExam.cbU1Active !== false) row.push("");
        if (currentExam.cbU2Active !== false) row.push("");
        if (currentExam.cbEtActive !== false) row.push("");
        if (currentExam.cbHpgActive !== false) row.push("");
        row.push("");
        row.push("");
      } else {
        row.push("");
        row.push("");
      }
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...templateData]);
    // Set column widths
    const wscols = [
      { wch: 15 }, // Student Number
      { wch: 25 }, // Student Name
      ...Array(headers.length - 2).fill({ wch: 10 }), // Scores
      { wch: 30 } // Remarks
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Marks Template");
    const streamName = streams.find(s => s.id === selectedStreamId)?.name || "";
    const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name || "";
    XLSX.writeFile(wb, `Marks_Template_${streamName}_${subjectName}.xlsx`);
  };

  const handleBulkMarksUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedExamId || !selectedSubjectId || !selectedClassId || !selectedStreamId) {
      toast.error("Please select exam, class, stream, and subject first.");
      if (e.target) e.target.value = '';
      return;
    }

    const currentExam = exams.find(ex => ex.id === selectedExamId);
    if (!currentExam) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (data.length < 2) {
          toast.error("The Excel file is empty or missing data.");
          return;
        }

        const headers = data[0] as string[];
        const rows = data.slice(1);
        let successCount = 0;

        rows.forEach(row => {
          if (!row[0]) return; // Skip empty rows
          const studentNumber = row[0].toString();
          const st = students.find(s => s.studentNumber === studentNumber && s.classId === selectedClassId && s.streamId === selectedStreamId);
          if (!st) return;

          const studentId = st.id;
          if (currentExam.isNewCurriculum) {
            let colIdx = 2; // Starts after Student Number and Student Name
            if (currentExam.cbU1Active !== false) {
              const val = row[colIdx];
              if (val !== undefined && val !== null && val !== "") setInputU1(prev => ({ ...prev, [studentId]: val.toString() }));
              colIdx++;
            }
            if (currentExam.cbU2Active !== false) {
              const val = row[colIdx];
              if (val !== undefined && val !== null && val !== "") setInputU2(prev => ({ ...prev, [studentId]: val.toString() }));
              colIdx++;
            }
            if (currentExam.cbEtActive !== false) {
              const val = row[colIdx];
              if (val !== undefined && val !== null && val !== "") setInputU3(prev => ({ ...prev, [studentId]: val.toString() }));
              colIdx++;
            }
            if (currentExam.cbHpgActive !== false) {
              const val = row[colIdx];
              if (val !== undefined && val !== null && val !== "") setInputHPG(prev => ({ ...prev, [studentId]: val.toString() }));
              colIdx++;
            }
            const eoyVal = row[colIdx];
            if (eoyVal !== undefined && eoyVal !== null && eoyVal !== "") setInputEOY(prev => ({ ...prev, [studentId]: eoyVal.toString() }));
            colIdx++;

            const remarkVal = row[colIdx];
            if (remarkVal !== undefined && remarkVal !== null && remarkVal !== "") setInputComments(prev => ({ ...prev, [studentId]: remarkVal.toString() }));
          } else {
            const scoreVal = row[2];
            if (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") setInputScores(prev => ({ ...prev, [studentId]: scoreVal.toString() }));
            const remarkVal = row[3];
            if (remarkVal !== undefined && remarkVal !== null && remarkVal !== "") setInputComments(prev => ({ ...prev, [studentId]: remarkVal.toString() }));
          }
          successCount++;
        });

        toast.success(`Successfully imported marks for ${successCount} students. Please review the grid and click "Save Grid Marks" to save.`);
      } catch (err: any) {
        toast.error("Error parsing Excel file: " + (err.message || err));
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = ''; // Reset input
  };

  const handleSaveMarks = async () => {
    if (!selectedExamId || !selectedSubjectId || !currentUser) {
      toast.error("Please select exam and subject first.");
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

          const u1Active = currentExam.cbU1Active !== false;
          const u2Active = currentExam.cbU2Active !== false;
          const etActive = currentExam.cbEtActive !== false;
          const hpgActive = currentExam.cbHpgActive !== false;

          const u1Max = currentExam.cbU1Max ?? 3;
          const u2Max = currentExam.cbU2Max ?? 3;
          const etMax = currentExam.cbEtMax ?? 3;
          const hpgMax = currentExam.cbHpgMax ?? 3;

          let u1Scaled: number | null = null;
          let u2Scaled: number | null = null;
          let u3Scaled: number | null = null;
          let hpgScaled: number | null = null;
          let eoyScaled: number | null = null;

          if (u1Active && u1Str) {
            const raw = parseFloat(u1Str);
            if (isNaN(raw) || raw < 0 || raw > 100) continue;
            u1Scaled = (raw / 100) * u1Max;
          }
          if (u2Active && u2Str) {
            const raw = parseFloat(u2Str);
            if (isNaN(raw) || raw < 0 || raw > 100) continue;
            u2Scaled = (raw / 100) * u2Max;
          }
          if (etActive && u3Str) {
            const raw = parseFloat(u3Str);
            if (isNaN(raw) || raw < 0 || raw > 100) continue;
            u3Scaled = (raw / 100) * etMax;
          }
          if (hpgActive && hpgStr) {
            const raw = parseFloat(hpgStr);
            if (isNaN(raw) || raw < 0 || raw > 100) continue;
            hpgScaled = (raw / 100) * hpgMax;
          }
          if (eoyStr) {
            const raw = parseFloat(eoyStr);
            if (isNaN(raw) || raw < 0 || raw > 100) continue;
            eoyScaled = (raw / 100) * 80;
          }

          const totalCA = (u1Scaled || 0) + (u2Scaled || 0) + (u3Scaled || 0) + (hpgScaled || 0);
          let maxCATotal = 0;
          if (u1Scaled !== null) maxCATotal += u1Max;
          if (u2Scaled !== null) maxCATotal += u2Max;
          if (u3Scaled !== null) maxCATotal += etMax;
          if (hpgScaled !== null) maxCATotal += hpgMax;

          const caScoreOutOf20 = maxCATotal > 0 ? Math.round((totalCA / maxCATotal) * 20) : 0;
          const finalTotal = caScoreOutOf20 + (eoyScaled || 0);

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
            u1: u1Scaled,
            u2: u2Scaled,
            u3: u3Scaled,
            hpg: hpgScaled,
            eoy: eoyScaled
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
      toast.success("Marks saved successfully!");
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
      toast.error("Error saving marks");
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
    toast.success("Fee structure saved!");
  };

  // Record student fee payment (enhanced)
  const handleRecordStudentPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayStudentId || !payAmountPaid || !school) return;

    const stud = students.find(s => s.id === selectedPayStudentId);
    if (!stud) return;

    const fs = feeStructures.find(f => f.classId === stud.classId);
    const totalDue = stud.type === "BOARDING" 
      ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
      : (fs?.tuitionAmount || 0);

    const paidVal = parseFloat(payAmountPaid);
    const bbfVal = parseFloat(payBBF) || 0;

    // Calculate balance: total due - BBF credit - new payment
    const prevPayments = studentPayments.filter(p => p.studentId === selectedPayStudentId && p.term === parseInt(payTerm) && p.year === parseInt(payYear));
    const alreadyPaid = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const newTotalPaid = alreadyPaid + paidVal;
    const balance = Math.max(0, totalDue - bbfVal - newTotalPaid);

    // Auto-generate receipt number if not provided
    const receipt = payReceiptNum || `RCP-${Date.now().toString(36).toUpperCase()}`;

    await recordStudentPayment({
      studentId: selectedPayStudentId,
      term: parseInt(payTerm),
      year: parseInt(payYear),
      amountPaid: paidVal,
      balance,
      balanceBF: bbfVal,
      notes: payNotes || null,
      paymentMethod: payMethod,
      receiptNumber: receipt,
    });

    setPayAmountPaid("");
    setPayNotes("");
    setPayReceiptNum("");
    setPayBBF("0");
    await loadSchoolData(school.id);
    toast.success(`Payment recorded! Receipt: ${receipt}`);
  };

  // Manual SchoolPay Sync
  const handleSchoolPaySync = async () => {
    if (!school) return;
    setSpSyncing(true);
    setSpSyncMsg("");
    try {
      const res = await fetch("/api/finance/sync-schoolpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          schoolId: school.id,
          startDate: spSyncStartDate || undefined,
          endDate: spSyncEndDate || undefined
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSpSyncMsg(`✅ Sync complete: ${data.result?.importedCount ?? 0} new transaction(s) imported.`);
        if (data.transactions) setSchoolPayTransactions(data.transactions);
        // Refresh student payments
        const spay = await getStudentPayments(school.id);
        setStudentPayments(spay);
      } else {
        setSpSyncMsg(`❌ ${data.error || "Sync failed. Check credentials."}`);
      }
    } catch (err) {
      setSpSyncMsg("❌ Network error. Try again.");
    } finally {
      setSpSyncing(false);
    }
  };

  
  const handleBulkAutoImport = async () => {
    if (!school) return;
    const term = school.currentTerm || 1;
    const year = school.currentYear || new Date().getFullYear();
    
    if (!confirm(`Are you sure you want to bulk import all matched transactions into Term ${term}, ${year}?`)) return;
    
    setSpSyncing(true);
    let successCount = 0;
    
    try {
      const unmatched = schoolPayTransactions.filter(tx => !tx.reconciled);
      
      for (const tx of unmatched) {
        if (!tx.studentPaymentCode) continue;
        const matchedStudent = students.find(s => s.studentPaymentCode === tx.studentPaymentCode);
        
        if (matchedStudent) {
          const fs = feeStructures.find(f => f.classId === matchedStudent.classId);
          const totalDue = matchedStudent.type === "BOARDING"
            ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
            : (fs?.tuitionAmount || 0);

          const prevPayments = studentPayments.filter(p => p.studentId === matchedStudent.id && p.term === term && p.year === year);
          const alreadyPaid = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);
          const balance = Math.max(0, totalDue - (alreadyPaid + tx.amount));

          await recordStudentPayment({
            studentId: matchedStudent.id,
            term: term,
            year: year,
            amountPaid: tx.amount,
            balance,
            paymentMethod: "SCHOOL_PAY",
            receiptNumber: tx.receiptNumber,
            notes: `Bulk Auto-imported for Term ${term}, ${year}`,
          });
          successCount++;
        }
      }
      
      if (successCount > 0) {
        setStudentPayments(await getStudentPayments(school.id));
        setSchoolPayTransactions(await getSchoolPayTransactions(school.id));
        toast.success(`Successfully bulk imported ${successCount} transaction(s)!`);
      } else {
        toast.success("No exact payment code matches found for bulk import. New students must be imported manually.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error during bulk import.");
    } finally {
      setSpSyncing(false);
    }
  };

  // Auto-import Student from SchoolPay Transaction
  const handleAutoImportStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !autoImportTx || !autoImportClassId || !autoImportStreamId) return;

    try {
      // 1. Create the student
      const nameParts = autoImportTx.studentName.split(" ");
      const newStudent = await createStudent({
        schoolId: school.id,
        classId: autoImportClassId,
        streamId: autoImportStreamId,
        name: autoImportTx.studentName,
        type: autoImportType,
        studentPaymentCode: autoImportTx.studentPaymentCode || "",
        studentNumber: `STU-${Date.now().toString(36).toUpperCase()}`
      });

      // 2. Refresh students so we have the new ID
      const updatedStudents = await getStudents(school.id);
      setStudents(updatedStudents);
      const matchedStudent = updatedStudents.find(s => s.studentPaymentCode === autoImportTx.studentPaymentCode);

      if (matchedStudent) {
        const fs = feeStructures.find(f => f.classId === matchedStudent.classId);
        const totalDue = matchedStudent.type === "BOARDING"
          ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
          : (fs?.tuitionAmount || 0);

        const termNum = parseInt(autoImportTerm);
        const yearNum = parseInt(autoImportYear);
        const prevPayments = studentPayments.filter(p => p.studentId === matchedStudent.id && p.term === termNum && p.year === yearNum);
        const alreadyPaid = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const balance = Math.max(0, totalDue - (alreadyPaid + autoImportTx.amount));

        // 3. Record the payment and automatically reconcile
        await recordStudentPayment({
          studentId: matchedStudent.id,
          term: termNum,
          year: yearNum,
          amountPaid: autoImportTx.amount,
          balance,
          paymentMethod: "SCHOOL_PAY",
          receiptNumber: autoImportTx.receiptNumber,
          notes: `Auto-imported and matched from SchoolPay transaction`,
        });

        // 4. Refresh data
        setStudentPayments(await getStudentPayments(school.id));
        setSchoolPayTransactions(await getSchoolPayTransactions(school.id));
        toast.success(`Successfully imported ${autoImportTx.studentName} and recorded their payment of ${autoImportTx.amount.toLocaleString()} UGX!`);
      } else {
        toast.error("Student created, but there was an error matching the transaction.");
      }

      setShowAutoImportModal(false);
      setAutoImportTx(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to auto-import student.");
    }
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
    toast.success("Expense recorded!");
  };

  // Save daily student attendance registry
  const handleSaveAttendance = async () => {
    if (!attendanceClassId || !attendanceStreamId || !attendanceDate || !school) {
      toast.error("Please select class, stream, and date.");
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
      toast.success("Attendance log saved successfully!");
      await loadAttendance(attendanceClassId, attendanceStreamId, attendanceDate);
    } catch (err) {
      toast.error("Error saving attendance registry.");
    }
  };

  // Process batch promotion of students
  const handlePromoteStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteFromClassId || !promoteToClassId || !school) return;
    if (promoteFromClassId === promoteToClassId) {
      toast.error("Cannot promote students to the same class.");
      return;
    }

    const confirmText = `Are you sure you want to promote all students from ${classes.find(c => c.id === promoteFromClassId)?.name} to ${classes.find(c => c.id === promoteToClassId)?.name}? This cannot be undone.`;
    if (!window.confirm(confirmText)) return;

    try {
      await promoteStudents(school.id, promoteFromClassId, promoteToClassId);
      toast.success("Students promoted successfully!");
      await loadSchoolData(school.id);
    } catch (err) {
      toast.error("Error processing student promotions.");
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
      toast.success(`Processed wage payment of ${amountVal.toLocaleString()} UGX for ${teacher.name}!`);
    } catch (err) {
      toast.error("Error processing teacher salary payment.");
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
        reportBorderType: designerBorderType,
        reportTikTok: designerTikTok,
        reportWebsite: designerWebsite,
        reportLocation: designerLocation,
        reportShowChart: designerShowChart,
        reportShowLIN: designerShowLIN,
        reportShowPayCode: designerShowPayCode,
        reportShowComments: designerShowComments,
        reportShowFees: designerShowFees,
        reportShowTermDates: designerShowTermDates,
        reportShowSummaryRow: designerShowSummaryRow
      });
      setSchool(updated);
      toast.success("Academic report card template layout saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save report template config: " + (err.message || err));
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

    // Split payment tracking (max 190k per transaction to stay strictly below 200k limit)
    const maxLimit = 190000;
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
      toast.error("Invalid payment amount");
      return;
    }

    if (momoProvider !== "CARD" && !momoPhone) {
      toast.error("Please enter your mobile phone number.");
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
            toast.error("Card redirect URL not provided by gateway.");
            setMomoStep(0);
          }
        } else {
          // For Mobile Money, wait for the customer to approve, and display the polling check screen
          setMomoStep(2); // Waiting for Approval
        }
      } else {
        toast.error(res?.message || "Failed to initiate payment collection from Marzpay.");
        setMomoStep(0);
      }
    } catch (err: any) {
      toast.error("Error contacting Marzpay gateway: " + (err.message || err));
      setMomoStep(0);
    }
  };

  const checkPaymentStatus = async () => {
    if (!school) return;
    if (!momoTxUuid) {
      toast.error("No transaction reference found.");
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
                  toast.error(`Card redirect URL not provided by gateway for Part ${nextIdx + 1}.`);
                  setMomoStep(0);
                }
              } else {
                setMomoStep(2); // Waiting for Approval
                toast.error(`Part ${nextIdx} payment succeeded! We are now sending a push prompt for Part ${nextIdx + 1} (${nextAmount.toLocaleString()} UGX) to your phone. Please approve it.`);
              }
            } else {
              toast.error(nextRes?.message || `Failed to initiate Part ${nextIdx + 1} of payment.`);
              setMomoStep(0);
            }
          } catch (err: any) {
            toast.error(`Error initiating Part ${nextIdx + 1} of payment: ` + (err.message || err));
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
            toast.error("Error updating transaction records: " + (err.message || err));
            setMomoStep(2);
          }
        }
      } else if (res && res.status === "failed") {
        toast.error("Payment failed or was declined by user.");
        setMomoStep(0);
      } else {
        // Still pending
        toast.error("Payment is still pending. Please approve the USSD prompt on your phone and try again.");
        setMomoStep(2);
      }
    } catch (err: any) {
      toast.error("Error checking transaction status: " + (err.message || err));
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

  // Connection/Server Error during loading
  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "white", padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: "600px", background: "#1e293b", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
          <div style={{ textAlign: "center" }}>
            <XCircle size={60} color="#f43f5e" style={{ marginBottom: "20px", marginLeft: "auto", marginRight: "auto" }} />
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px" }}>Connection Error</h2>
            <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: "1.6", marginBottom: "24px" }}>
              {loadError}
            </p>
          </div>

          {diagnostics && (
            <div style={{ background: "#0f172a", padding: "20px", borderRadius: "8px", border: "1px solid #334155", marginBottom: "24px", textAlign: "left", fontSize: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#38bdf8", borderBottom: "1px solid #334155", paddingBottom: "6px" }}>Server Diagnostics Output</h3>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "8px 16px", fontFamily: "monospace", lineBreak: "anywhere" }}>
                <span style={{ color: "#94a3b8" }}>DATABASE_URL Config:</span>
                <span>
                  {diagnostics.databaseUrlPresent ? (
                    <span style={{ color: "#4ade80" }}>Present ({diagnostics.databaseUrlLength} chars, starting with {diagnostics.databaseUrlStart})</span>
                  ) : (
                    <span style={{ color: "#f43f5e" }}>Missing (Not set in Environment)</span>
                  )}
                </span>

                <span style={{ color: "#94a3b8" }}>DB Host Lookup:</span>
                <span>
                  {diagnostics.dnsTest === "resolved" ? (
                    <span style={{ color: "#4ade80" }}>Resolved host {diagnostics.dbHost}</span>
                  ) : (
                    <span style={{ color: "#f43f5e" }}>DNS Lookup Failed ({diagnostics.dnsError || "Unknown DNS resolution issue"})</span>
                  )}
                </span>

                <span style={{ color: "#94a3b8" }}>Prisma Connection:</span>
                <span>
                  {diagnostics.prismaStatus.includes("connected") ? (
                    <span style={{ color: "#4ade80" }}>Successful! {diagnostics.prismaStatus}</span>
                  ) : (
                    <span style={{ color: "#f43f5e" }}>Failed ({diagnostics.prismaError || "Unknown database error"})</span>
                  )}
                </span>

                <span style={{ color: "#94a3b8" }}>Node.js Version:</span>
                <span>{diagnostics.nodeVersion}</span>

                <span style={{ color: "#94a3b8" }}>Loaded Env Keys:</span>
                <span style={{ fontSize: "12px", color: "#cbd5e1" }}>{diagnostics.envKeys?.join(", ") || "None"}</span>
              </div>

              {diagnostics.prismaError && (
                <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #334155" }}>
                  <span style={{ color: "#f43f5e", fontWeight: "600", display: "block", marginBottom: "4px" }}>Error Stack Trace:</span>
                  <pre style={{ margin: 0, padding: "8px", background: "#1e293b", borderRadius: "4px", color: "#cbd5e1", overflowX: "auto", fontSize: "12px", maxHeight: "150px" }}>
                    {diagnostics.prismaStack || diagnostics.prismaError}
                  </pre>
                </div>
              )}
            </div>
          )}

          {diagError && (
            <div style={{ background: "#4c0519", color: "#fda4af", padding: "12px 16px", borderRadius: "6px", border: "1px solid #9f1239", marginBottom: "24px", textAlign: "left", fontSize: "13px" }}>
              <strong>Failed to run server diagnostics:</strong> {diagError}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary"
              style={{ 
                background: "#38bdf8", 
                color: "#0f172a", 
                border: "none", 
                padding: "10px 24px", 
                borderRadius: "6px", 
                fontWeight: "600", 
                cursor: "pointer" 
              }}
            >
              Retry Connection
            </button>

            <button 
              onClick={handleRunDiagnostics} 
              disabled={runningDiagnostics}
              className="btn"
              style={{ 
                background: "transparent", 
                color: "#94a3b8", 
                border: "1px solid #475569", 
                padding: "10px 24px", 
                borderRadius: "6px", 
                fontWeight: "600", 
                cursor: runningDiagnostics ? "not-allowed" : "pointer" 
              }}
            >
              {runningDiagnostics ? "Running Diagnostics..." : "Run System Diagnostics"}
            </button>
          </div>
        </div>
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

          {showForgotPassword ? (
            <div>
              <h3 style={{ color: "white", marginBottom: "10px", fontSize: "18px" }}>Reset Password</h3>
              <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px" }}>
                Provide your registered email address to verify your account and set a new password.
              </p>

              {resetError && (
                <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "13px", marginBottom: "20px" }}>
                  {resetError}
                </div>
              )}

              {resetSuccess && (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--success)", fontSize: "13px", marginBottom: "20px" }}>
                  {resetSuccess}
                </div>
              )}

              {resetStep === 0 ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setResetError("");
                  if (!school) return;
                  try {
                    const allUsers = await getUsers(school.id);
                    const matched = allUsers.find(u => u.email.toLowerCase() === resetEmail.toLowerCase());
                    if (!matched) {
                      setResetError("No staff account found with this email address.");
                      return;
                    }
                    setResetStep(1);
                  } catch (err) {
                    setResetError("Error looking up account details.");
                  }
                }}>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label" style={{ color: "#d1d5db" }}>Staff Email Address</label>
                    <input 
                      type="email" 
                      className="input-field" 
                      placeholder="e.g. teacher@greenhill.ug" 
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setShowForgotPassword(false); setResetStep(0); }} className="btn btn-outline" style={{ flex: 1, color: "#9ca3af", borderColor: "#4b5563", background: "transparent" }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                      Find Account
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setResetError("");
                  if (!school) return;
                  if (resetNewPassword.length < 4) {
                    setResetError("Password must be at least 4 characters long.");
                    return;
                  }
                  try {
                    const done = await resetUserPassword(school.id, resetEmail, resetNewPassword);
                    if (done) {
                      setResetSuccess("Password reset successfully! You can now log in.");
                      setTimeout(() => {
                        setShowForgotPassword(false);
                        setResetStep(0);
                        setResetSuccess("");
                        setPassword(resetNewPassword);
                        setEmail(resetEmail);
                      }, 2000);
                    } else {
                      setResetError("Failed to update password.");
                    }
                  } catch (err) {
                    setResetError("Error executing password reset.");
                  }
                }}>
                  <div className="form-group" style={{ marginBottom: "20px" }}>
                    <label className="form-label" style={{ color: "#d1d5db" }}>New Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="••••••••" 
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                      style={{ background: "#0f172a", borderColor: "#374151", color: "white" }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setResetStep(0)} className="btn btn-outline" style={{ flex: 1, color: "#9ca3af", borderColor: "#4b5563", background: "transparent" }}>
                      Back
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
                      Save Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
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
                <div className="flex justify-between align-center" style={{ marginBottom: "6px" }}>
                  <label className="form-label" style={{ color: "#d1d5db", margin: 0 }}>Password</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setResetError("");
                      setResetSuccess("");
                      setResetEmail(email);
                      setShowForgotPassword(true);
                      setResetStep(0);
                    }}
                    style={{ background: "transparent", border: "none", color: "white", fontSize: "12px", cursor: "pointer", padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input 
                    type={showLoginPassword ? "text" : "password"} 
                    className="input-field" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ background: "#0f172a", borderColor: "#374151", color: "white", paddingRight: "40px" }}
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

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "12px" }}>
                Sign In to Portal
              </button>
              
              <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid #1e293b", paddingTop: "20px" }}>
                <p style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "12px" }}>Are you a parent or guardian?</p>
                <button 
                  type="button" 
                  onClick={() => {
                    if (window.location.host.includes("localhost") || window.location.host.includes("vercel.app")) {
                      window.location.href = `/school/${school?.subdomain || subdomain}/parent`;
                    } else {
                      window.location.href = "/parent";
                    }
                  }}
                  className="btn btn-outline" 
                  style={{ width: "100%", padding: "10px", borderColor: "var(--primary)", color: "white" }}
                >
                  <UserIcon size={16} style={{ marginRight: "8px", display: "inline" }} />
                  Access Parent Portal
                </button>
              </div>
            </form>
          )}


          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                const host = window.location.host;
                if (host.includes("localhost")) {
                  window.location.href = "http://localhost:3000";
                } else {
                  const parts = host.split('.');
                  if (parts.length > 2) {
                    parts.shift(); // remove subdomain
                    window.location.href = window.location.protocol + "//" + parts.join('.');
                  } else {
                    window.location.href = "/";
                  }
                }
              }}
              style={{ fontSize: "13px", color: "#9ca3af", textDecoration: "underline", cursor: "pointer" }}>
              ← Back to SchoolPro Main Website
            </a>
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
                  🔑 Enter your school's Administrator credentials to authorize these updates.
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
                            toast.error("Logo image should be less than 1MB to store directly in the database.");
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

  // Force change password screen
  if (currentUser && currentUser.mustChangePassword) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "20px" }}>
        {school?.themeColor && (
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --primary: ${school.themeColor} !important;
              --primary-hover: ${school.themeColor}dd !important;
              --primary-glow: ${school.themeColor}2e !important;
            }
          `}} />
        )}
        <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "450px", background: "#1e293b", borderColor: "#334155", color: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ background: "rgba(245, 158, 11, 0.15)", padding: "16px", borderRadius: "50%", display: "inline-flex", justifyContent: "center", alignItems: "center", marginBottom: "16px" }}>
              <Lock size={40} color="#f59e0b" />
            </div>
            <h2>Change Your Password</h2>
            <p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "8px" }}>
              For security reasons, you are required to change your password after your first login or when your password is reset by the administrator.
            </p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            setForcePasswordError("");
            setForcePasswordSuccess("");
            if (forceNewPassword.length < 4) {
              setForcePasswordError("Password must be at least 4 characters long.");
              return;
            }
            if (forceNewPassword !== forceConfirmPassword) {
              setForcePasswordError("New passwords do not match.");
              return;
            }
            try {
              const resetDone = await resetUserPassword(school!.id, currentUser.email, forceNewPassword);
              if (resetDone) {
                await updateUser(currentUser.id, { mustChangePassword: false });
                setForcePasswordSuccess("Password updated successfully! Redirecting...");
                setTimeout(() => {
                  const updatedUser = { ...currentUser, mustChangePassword: false };
                  setCurrentUser(updatedUser);
                }, 1500);
              } else {
                setForcePasswordError("Failed to update password. Please try again.");
              }
            } catch (err) {
              setForcePasswordError("An error occurred during password change.");
            }
          }}>
            {forcePasswordError && (
              <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "13px", marginBottom: "20px" }}>
                {forcePasswordError}
              </div>
            )}
            {forcePasswordSuccess && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--success)", fontSize: "13px", marginBottom: "20px" }}>
                {forcePasswordSuccess}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: "16px", textAlign: "left" }}>
              <label className="form-label" style={{ color: "#d1d5db" }}>New Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Enter new password"
                value={forceNewPassword} 
                onChange={(e) => setForceNewPassword(e.target.value)} 
                required 
                style={{ background: "#0f172a", border: "1px solid #334155", color: "white" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "24px", textAlign: "left" }}>
              <label className="form-label" style={{ color: "#d1d5db" }}>Confirm New Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="Confirm new password"
                value={forceConfirmPassword} 
                onChange={(e) => setForceConfirmPassword(e.target.value)} 
                required 
                style={{ background: "#0f172a", border: "1px solid #334155", color: "white" }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Change Password & Continue
            </button>
            
            <button 
              type="button" 
              onClick={handleLogout} 
              className="btn btn-outline" 
              style={{ width: "100%", justifyContent: "center", marginTop: "10px", color: "#9ca3af", borderColor: "#4b5563" }}
            >
              Cancel & Log Out
            </button>
          </form>
        </div>
      </div>
    );
  }


  // Filtered lists for Marks Upload if teacher
  const teacherClasses = currentUser?.role === "TEACHER"
    ? classes.filter(c => teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === c.id))
    : classes;
  
  const teacherStreams = currentUser?.role === "TEACHER"
    ? streams.filter(st => st.classId === selectedClassId && teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === selectedClassId && ta.streamId === st.id))
    : streams.filter(st => st.classId === selectedClassId);
  
  const teacherSubjectsFiltered = currentUser?.role === "TEACHER"
    ? subjects.filter(sub => sub.classId === selectedClassId && teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === selectedClassId && ta.streamId === selectedStreamId && ta.subjectId === sub.id))
    : subjects.filter(sub => sub.classId === selectedClassId);

  const selectedExam = exams.find(e => e.id === selectedExamId);

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
            <div style={{ display: "flex", flexDirection: "column" }}>
              <h3 style={{ color: "white", fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>{school.name}</h3>
              <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.75)", textTransform: "uppercase", letterSpacing: "1px" }}>{currentUser.role} Portal</span>
              <span style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.8)", background: "rgba(0,0,0,0.18)", borderRadius: "4px", padding: "1px 6px", width: "fit-content", marginTop: "2px", fontWeight: "bold" }}>
                {school.schoolType === "PRIMARY" ? "Primary School" : school.schoolType === "SECONDARY" ? "Secondary School" : "Combined School"}
              </span>
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

          {/* Parent Portal Admin */}
          {["ADMIN", "HEADTEACHER", "DOS"].includes(currentUser.role) && (
            <>
              <button 
                onClick={() => setActiveTab("elections")} 
                className={`btn ${activeTab === "elections" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "elections" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "elections" ? 1 : 0.75, transition: "all 0.2s ease" }}
              >
                <Vote size={18} /> Manage Elections
              </button>
              <button 
                onClick={() => setActiveTab("holiday")} 
                className={`btn ${activeTab === "holiday" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "holiday" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "holiday" ? 1 : 0.75, transition: "all 0.2s ease" }}
              >
                <FileText size={18} /> Holiday Assignments
              </button>
            </>
          )}

          {/* Grading Setup */}
          {["ADMIN", "DOS"].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab("grading")} 
              className={`btn ${activeTab === "grading" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "grading" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "grading" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <Award size={18} /> Grading Setup
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

              <button 
                onClick={() => setActiveTab("schoolpay_register")} 
                className={`btn ${activeTab === "schoolpay_register" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "schoolpay_register" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "schoolpay_register" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <RefreshCw size={16} /> SchoolPay Register
              </button>

              <button 
                onClick={() => setActiveTab("fin_reports")} 
                className={`btn ${activeTab === "fin_reports" ? "btn-primary" : "btn-outline"}`}
                style={{ justifyContent: "flex-start", border: "none", background: activeTab === "fin_reports" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "fin_reports" ? 1 : 0.75, transition: "all 0.2s ease", padding: "8px 12px", fontSize: "13px" }}
              >
                <BarChart2 size={16} /> Financial Reports
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
          {/* My Profile Settings (Visible to all logged in users) */}
          {currentUser && (
            <button 
              onClick={() => setActiveTab("profile")} 
              className={`btn ${activeTab === "profile" ? "btn-primary" : "btn-outline"}`}
              style={{ justifyContent: "flex-start", border: "none", background: activeTab === "profile" ? "rgba(255,255,255,0.22)" : "transparent", color: "white", opacity: activeTab === "profile" ? 1 : 0.75, transition: "all 0.2s ease" }}
            >
              <UserIcon size={18} /> My Profile Settings
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
        
        {/* TAB: MY PROFILE SETTINGS */}
        {activeTab === "profile" && currentUser && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "6px" }}>My Profile Settings</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Manage your account security, personal display details, and profile photo.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              
              {/* Profile Card & Info */}
              <div className="card text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Current Profile Card</h4>
                
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", background: "#f8fafc", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "16px", position: "relative" }}>
                  {profileEditPhoto ? (
                    <img src={profileEditPhoto} alt={currentUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <UserIcon size={64} color="#94a3b8" />
                  )}
                </div>

                <h3 style={{ color: "#0f172a", marginBottom: "4px" }}>{currentUser.name}</h3>
                <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase" }}>{currentUser.role}</span>
                
                <div style={{ marginTop: "24px", padding: "16px", background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "8px", width: "100%", textAlign: "left" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                    <div><strong>Email Address:</strong> <code style={{ wordBreak: "break-all" }}>{currentUser.email}</code></div>
                    {currentUser.staffNumber && (
                      <div><strong>Staff Number:</strong> <code>{currentUser.staffNumber}</code></div>
                    )}
                    <div><strong>Joined Date:</strong> {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Edit Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                
                {/* 1. Personal Details Form */}
                <div className="card">
                  <h4 style={{ marginBottom: "16px" }}>Edit Personal Information</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setProfileDetailsSuccess("");
                    try {
                      const updated = await updateUser(currentUser.id, {
                        name: profileEditName,
                        photo: profileEditPhoto || null
                      });
                      setCurrentUser({ ...currentUser, name: updated.name, photo: updated.photo });
                      await loadSchoolData(school!.id);
                      setProfileDetailsSuccess("Personal details updated successfully!");
                      setTimeout(() => setProfileDetailsSuccess(""), 3000);
                    } catch (err) {
                      toast.error("Failed to update profile details.");
                    }
                  }}>
                    {profileDetailsSuccess && (
                      <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--success)", fontSize: "13px", marginBottom: "20px" }}>
                        {profileDetailsSuccess}
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={profileEditName}
                        onChange={(e) => setProfileEditName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: "20px" }}>
                      <label className="form-label">Profile Photo (Portrait)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="input-field" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 1024 * 1024) {
                              toast.error("Logo image should be less than 1MB to store directly.");
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setProfileEditPhoto(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ padding: "8px" }}
                      />
                      {profileEditPhoto && (
                        <button 
                          type="button" 
                          onClick={() => setProfileEditPhoto("")}
                          className="btn btn-outline"
                          style={{ padding: "4px 8px", fontSize: "11px", marginTop: "6px", color: "var(--danger)", borderColor: "var(--danger)" }}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ minWidth: "150px" }}>
                      Save Details
                    </button>
                  </form>
                </div>

                {/* 2. Change Password Form */}
                <div className="card">
                  <h4 style={{ marginBottom: "16px" }}>Change Account Password</h4>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setProfilePasswordError("");
                    setProfilePasswordSuccess("");
                    if (profileNewPassword.length < 4) {
                      setProfilePasswordError("Password must be at least 4 characters long.");
                      return;
                    }
                    if (profileNewPassword !== profileConfirmPassword) {
                      setProfilePasswordError("New passwords do not match.");
                      return;
                    }
                    try {
                      const success = await resetUserPassword(school!.id, currentUser.email, profileNewPassword);
                      if (success) {
                        setProfilePasswordSuccess("Password changed successfully!");
                        setProfileNewPassword("");
                        setProfileConfirmPassword("");
                        setTimeout(() => setProfilePasswordSuccess(""), 3000);
                      } else {
                        setProfilePasswordError("Failed to update password.");
                      }
                    } catch (err) {
                      setProfilePasswordError("An error occurred while changing password.");
                    }
                  }}>
                    {profilePasswordError && (
                      <div style={{ background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--danger)", fontSize: "13px", marginBottom: "20px" }}>
                        {profilePasswordError}
                      </div>
                    )}
                    {profilePasswordSuccess && (
                      <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "12px", color: "var(--success)", fontSize: "13px", marginBottom: "20px" }}>
                        {profilePasswordSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "20px" }}>
                      <div className="form-group">
                        <label className="form-label">New Password</label>
                        <input 
                          type="password" 
                          placeholder="At least 4 characters"
                          className="input-field" 
                          value={profileNewPassword}
                          onChange={(e) => setProfileNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <input 
                          type="password" 
                          placeholder="Confirm new password"
                          className="input-field" 
                          value={profileConfirmPassword}
                          onChange={(e) => setProfileConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ minWidth: "150px" }}>
                      Change Password
                    </button>
                  </form>
                </div>

              </div>

            </div>
          </div>
        )}

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
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "300px", overflowY: "auto", paddingRight: "8px" }}>
                  {classes.map((cl, index) => {
                    const classSubjects = subjects.filter(s => s.classId === cl.id);
                    if (classSubjects.length === 0) return null;
                    return (
                      <div key={cl.id} style={{ borderBottom: index === classes.length - 1 ? "none" : "1px solid var(--border)", paddingBottom: "12px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>
                          {cl.name} <span style={{ color: "#64748b", fontWeight: "normal" }}>({cl.level})</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {classSubjects.map(sub => (
                            <span key={sub.id} className="badge badge-outline" style={{ background: "#f8fafc", fontSize: "11px", padding: "4px 8px", border: "1px solid #e2e8f0" }}>
                              {sub.code ? <span style={{ color: "var(--primary)", fontWeight: "bold", marginRight: "4px" }}>{sub.code}</span> : null}
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {subjects.length === 0 && (
                    <div style={{ color: "#64748b", fontSize: "13px", padding: "12px" }}>No curriculum subjects recorded yet.</div>
                  )}
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
                  <div className="grid grid-cols-3 gap-2">
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
                    <div className="form-group">
                      <label className="form-label">School Type / Level</label>
                      <select 
                        className="input-field" 
                        value={profileSchoolType}
                        onChange={(e) => setProfileSchoolType(e.target.value as any)}
                        required
                      >
                        <option value="PRIMARY">Primary School (P1 - P7)</option>
                        <option value="SECONDARY">Secondary School (S1 - S6)</option>
                        <option value="COMBINED">Combined (Primary & Secondary)</option>
                      </select>
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
                              toast.error("Logo image should be less than 1MB to store directly in the database.");
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

                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "20px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <div style={{ gridColumn: "span 2", marginBottom: "8px" }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a" }}>
                        <DollarSign size={16} color="var(--primary)" />
                        SchoolPay Integration Settings
                      </h4>
                      <p style={{ color: "#64748b", fontSize: "11px" }}>Enter API credentials for daily transaction sync.</p>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>SchoolPay API Code</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. 19457"
                        value={profileSchoolPayCode}
                        onChange={(e) => setProfileSchoolPayCode(e.target.value)}
                        style={{ fontSize: "12px", padding: "6px" }}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>SchoolPay API Password</label>
                      <input 
                        type="password" 
                        className="input-field" 
                        placeholder="Password"
                        value={profileSchoolPayPassword}
                        onChange={(e) => setProfileSchoolPayPassword(e.target.value)}
                        style={{ fontSize: "12px", padding: "6px" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2" style={{ marginTop: "12px", background: "#f8fafc", padding: "16px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <div style={{ gridColumn: "span 2", marginBottom: "8px" }}>
                      <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#0f172a" }}>
                        <Calendar size={16} color="var(--primary)" />
                        Global Term Date Ranges
                      </h4>
                      <p style={{ color: "#64748b", fontSize: "11px" }}>Set exact dates for each term. This powers automatic transaction fetching and invoice generation.</p>
                    </div>
                    
                    
                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "13px", color: "var(--primary)", marginTop: "8px", paddingBottom: "4px", borderBottom: "2px solid #e2e8f0" }}>Currently Active Period</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Current Term (Active)</label>
                      <select className="input-field" value={profileCurrentTerm} onChange={(e) => setProfileCurrentTerm(e.target.value)} style={{ fontSize: "13px", padding: "8px", fontWeight: "bold" }}>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px", fontWeight: "bold" }}>Current Year (Active)</label>
                      <input type="number" className="input-field" value={profileCurrentYear} onChange={(e) => setProfileCurrentYear(e.target.value)} style={{ fontSize: "13px", padding: "8px", fontWeight: "bold" }} />
                    </div>

                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "16px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 1 Dates</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Start Date</label>
                      <input type="date" className="input-field" value={profileTerm1Start} onChange={(e) => setProfileTerm1Start(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>End Date</label>
                      <input type="date" className="input-field" value={profileTerm1End} onChange={(e) => setProfileTerm1End(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>

                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "8px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 2</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Start Date</label>
                      <input type="date" className="input-field" value={profileTerm2Start} onChange={(e) => setProfileTerm2Start(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>End Date</label>
                      <input type="date" className="input-field" value={profileTerm2End} onChange={(e) => setProfileTerm2End(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>

                    <div style={{ gridColumn: "span 2", fontWeight: 600, fontSize: "12px", color: "#1e293b", marginTop: "8px", paddingBottom: "4px", borderBottom: "1px solid #e2e8f0" }}>Term 3</div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>Start Date</label>
                      <input type="date" className="input-field" value={profileTerm3Start} onChange={(e) => setProfileTerm3Start(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "11px" }}>End Date</label>
                      <input type="date" className="input-field" value={profileTerm3End} onChange={(e) => setProfileTerm3End(e.target.value)} style={{ fontSize: "12px", padding: "6px" }} />
                    </div>
                  </div>



                  <button type="submit" className="btn btn-primary" style={{ marginTop: "20px", width: "100%" }}>
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

            {/* CUSTOM GRADING SYSTEMS & RANGE EDITING CARD */}
            <div className="card" style={{ marginTop: "24px" }}>
              <h4 style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "#0f172a" }}>
                <Award size={18} color="var(--primary)" />
                Custom Letter Grades & Assessment Criteria
              </h4>
              <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "20px" }}>
                Edit the mark range boundaries, descriptors, and official classifications used across report cards.
              </p>

              <form onSubmit={handleSaveCustomGradeRanges}>
                {/* Secondary Scale (A-E) */}
                {(profileSchoolType === "SECONDARY" || profileSchoolType === "COMBINED") && (
                  <div style={{ marginBottom: "24px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "#fff" }}>
                    <h5 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      📖 Secondary Curriculum Competency System (Grades A - E)
                    </h5>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ fontSize: "12px", minWidth: "650px", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                            <th style={{ padding: "8px", width: "60px" }}>Grade</th>
                            <th style={{ padding: "8px", width: "90px" }}>Min (%)</th>
                            <th style={{ padding: "8px", width: "90px" }}>Max (%)</th>
                            <th style={{ padding: "8px", width: "120px" }}>Achievement</th>
                            <th style={{ padding: "8px", width: "140px" }}>Descriptor</th>
                            <th style={{ padding: "8px", width: "160px" }}>Class Teacher Comment</th>
                            <th style={{ padding: "8px", width: "160px" }}>Head Teacher Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingGradeRanges.map((r, idx) => {
                            if (r.systemType !== "SECONDARY") return null;
                            return (
                              <tr key={r.id || `sec-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px", fontWeight: "bold", color: "var(--primary)" }}>{r.grade}</td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    className="input-field" 
                                    value={r.minMark} 
                                    onChange={(e) => handleGradeRangeChange(idx, "minMark", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    className="input-field" 
                                    value={r.maxMark} 
                                    onChange={(e) => handleGradeRangeChange(idx, "maxMark", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    value={r.achievementLevel} 
                                    onChange={(e) => handleGradeRangeChange(idx, "achievementLevel", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    value={r.descriptor} 
                                    onChange={(e) => handleGradeRangeChange(idx, "descriptor", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder="Auto-comment..."
                                    value={r.classTeacherComment || ""} 
                                    onChange={(e) => handleGradeRangeChange(idx, "classTeacherComment", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder="Auto-comment..."
                                    value={r.headTeacherComment || ""} 
                                    onChange={(e) => handleGradeRangeChange(idx, "headTeacherComment", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
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

                {/* Primary Scale (Div 1 - Div 9) */}
                {(profileSchoolType === "PRIMARY" || profileSchoolType === "COMBINED") && (
                  <div style={{ marginBottom: "24px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", background: "#fff" }}>
                    <h5 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      📖 Primary PLE Standard System (Aggregates 1 - 9)
                    </h5>
                    <div style={{ overflowX: "auto" }}>
                      <table className="table" style={{ fontSize: "12px", minWidth: "650px", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                            <th style={{ padding: "8px", width: "60px" }}>Division</th>
                            <th style={{ padding: "8px", width: "90px" }}>Min (%)</th>
                            <th style={{ padding: "8px", width: "90px" }}>Max (%)</th>
                            <th style={{ padding: "8px", width: "120px" }}>Classification</th>
                            <th style={{ padding: "8px", width: "140px" }}>Descriptor</th>
                            <th style={{ padding: "8px", width: "160px" }}>Class Teacher Comment</th>
                            <th style={{ padding: "8px", width: "160px" }}>Head Teacher Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingGradeRanges.map((r, idx) => {
                            if (r.systemType !== "PRIMARY") return null;
                            return (
                              <tr key={r.id || `prim-${idx}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "8px", fontWeight: "bold", color: "var(--primary)" }}>{r.grade}</td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    className="input-field" 
                                    value={r.minMark} 
                                    onChange={(e) => handleGradeRangeChange(idx, "minMark", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="number" 
                                    step="0.01" 
                                    className="input-field" 
                                    value={r.maxMark} 
                                    onChange={(e) => handleGradeRangeChange(idx, "maxMark", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    value={r.achievementLevel} 
                                    onChange={(e) => handleGradeRangeChange(idx, "achievementLevel", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    value={r.descriptor} 
                                    onChange={(e) => handleGradeRangeChange(idx, "descriptor", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                    required 
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder="Auto-comment..."
                                    value={r.classTeacherComment || ""} 
                                    onChange={(e) => handleGradeRangeChange(idx, "classTeacherComment", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                                  />
                                </td>
                                <td style={{ padding: "4px" }}>
                                  <input 
                                    type="text" 
                                    className="input-field" 
                                    placeholder="Auto-comment..."
                                    value={r.headTeacherComment || ""} 
                                    onChange={(e) => handleGradeRangeChange(idx, "headTeacherComment", e.target.value)}
                                    style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
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

                <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }}>
                  <Award size={18} /> Save Customized Curriculum Grading Scales
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB: GRADING SETUP */}
        {activeTab === "grading" && (
          <div className="tab-content-anim">
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                <Award size={24} color="var(--primary)" /> Grading Setup
              </h2>
              <p style={{ color: "#64748b" }}>Configure Continuous Assessment column weights and customise grade boundary ranges used on report cards.</p>
            </div>



            {/* SECTION 2: Grade Range Tables */}
            <div className="card">
              <h4 style={{ marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "#0f172a" }}>
                <Award size={18} color="var(--primary)" />
                Grade Boundary Ranges
              </h4>
              <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "20px" }}>
                Set the minimum and maximum mark (%) that maps to each grade letter or aggregate. These are used across all report cards and marks sheets.
              </p>

              <form onSubmit={handleSaveCustomGradeRanges}>
                {/* Secondary Aâ€“E */}
                {(school.schoolType === "SECONDARY" || school.schoolType === "COMBINED") && (
                  <div style={{ marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "10px 14px", background: "linear-gradient(90deg, var(--primary-light) 0%, #f8fafc 100%)", borderRadius: "8px", border: "1px solid var(--primary-glow)" }}>
                      <BookOpen size={16} color="var(--primary)" />
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Secondary â€” Competency Grades (A to E)</span>
                      <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "auto" }}>CBC Lower Secondary Curriculum</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "580px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "70px", borderBottom: "2px solid #e2e8f0" }}>Grade</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "130px", borderBottom: "2px solid #e2e8f0" }}>Min Mark (%)</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "130px", borderBottom: "2px solid #e2e8f0" }}>Max Mark (%)</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "160px", borderBottom: "2px solid #e2e8f0" }}>Achievement Level</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0" }}>Descriptor / Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingGradeRanges.map((r, idx) => {
                            if (r.systemType !== "SECONDARY") return null;
                            const gradeColors: Record<string, string> = { A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#ea580c", E: "#dc2626" };
                            const col = gradeColors[r.grade] || "var(--primary)";
                            return (
                              <tr key={r.id || `sec-${idx}`} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                <td style={{ padding: "8px 12px" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: `${col}18`, color: col, fontWeight: 800, fontSize: "15px" }}>{r.grade}</span>
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="number" step="0.01" min="0" max="100" className="input-field"
                                    value={r.minMark}
                                    onChange={(e) => handleGradeRangeChange(idx, "minMark", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="number" step="0.01" min="0" max="100" className="input-field"
                                    value={r.maxMark}
                                    onChange={(e) => handleGradeRangeChange(idx, "maxMark", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="text" className="input-field"
                                    value={r.achievementLevel}
                                    onChange={(e) => handleGradeRangeChange(idx, "achievementLevel", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="text" className="input-field"
                                    value={r.descriptor}
                                    onChange={(e) => handleGradeRangeChange(idx, "descriptor", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Primary PLE 1â€“9 */}
                {(school.schoolType === "PRIMARY" || school.schoolType === "COMBINED") && (
                  <div style={{ marginBottom: "28px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", padding: "10px 14px", background: "linear-gradient(90deg, #fef9c3 0%, #f8fafc 100%)", borderRadius: "8px", border: "1px solid #fde68a" }}>
                      <Award size={16} color="#d97706" />
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Primary â€” PLE Aggregates (1 to 9)</span>
                      <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "auto" }}>UNEB PLE Standard Grading</span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "580px" }}>
                        <thead>
                          <tr style={{ background: "#fffbeb" }}>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "80px", borderBottom: "2px solid #fde68a" }}>Aggregate</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "130px", borderBottom: "2px solid #fde68a" }}>Min Mark (%)</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "130px", borderBottom: "2px solid #fde68a" }}>Max Mark (%)</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", width: "160px", borderBottom: "2px solid #fde68a" }}>Classification</th>
                            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #fde68a" }}>Descriptor / Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editingGradeRanges.map((r, idx) => {
                            if (r.systemType !== "PRIMARY") return null;
                            const aggNum = parseInt(r.grade);
                            const col = aggNum <= 2 ? "#16a34a" : aggNum <= 4 ? "#2563eb" : aggNum <= 6 ? "#d97706" : aggNum <= 8 ? "#ea580c" : "#dc2626";
                            return (
                              <tr key={r.id || `prim-${idx}`} style={{ borderBottom: "1px solid #fef9c3", transition: "background 0.1s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fffbeb")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                <td style={{ padding: "8px 12px" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: `${col}18`, color: col, fontWeight: 800, fontSize: "15px" }}>{r.grade}</span>
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="number" step="0.01" min="0" max="100" className="input-field"
                                    value={r.minMark}
                                    onChange={(e) => handleGradeRangeChange(idx, "minMark", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="number" step="0.01" min="0" max="100" className="input-field"
                                    value={r.maxMark}
                                    onChange={(e) => handleGradeRangeChange(idx, "maxMark", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="text" className="input-field"
                                    value={r.achievementLevel}
                                    onChange={(e) => handleGradeRangeChange(idx, "achievementLevel", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                                <td style={{ padding: "6px 8px" }}>
                                  <input type="text" className="input-field"
                                    value={r.descriptor}
                                    onChange={(e) => handleGradeRangeChange(idx, "descriptor", e.target.value)}
                                    style={{ padding: "6px 10px", fontSize: "13px", height: "auto" }} required />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", padding: "12px" }}>
                  <Award size={18} /> Save Grade Boundary Ranges
                </button>
              </form>

              {/* Live Grade Preview */}
              <div style={{ marginTop: "28px", padding: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <h5 style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <TrendingUp size={15} color="var(--primary)" /> Live Grade Preview Calculator
                </h5>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>Enter a mark to instantly see what grade it maps to using your current ranges.</p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  {["SECONDARY", "PRIMARY"].filter(sys =>
                    sys === "SECONDARY" ? (school.schoolType === "SECONDARY" || school.schoolType === "COMBINED") :
                    (school.schoolType === "PRIMARY" || school.schoolType === "COMBINED")
                  ).map(sys => {
                    const testScore = 75;
                    const result = computeGradeFromRanges(testScore, sys as "SECONDARY" | "PRIMARY", editingGradeRanges);
                    return (
                      <div key={sys} style={{ flex: 1, minWidth: "200px", padding: "12px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>{sys === "SECONDARY" ? "Secondary (CBC)" : "Primary (PLE)"}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>75%</span>
                          <span style={{ fontSize: "13px", color: "#475569" }}>â†’</span>
                          <span style={{ fontSize: "18px", fontWeight: 800, color: result ? "#16a34a" : "#dc2626" }}>
                            {result ? `${result.grade}` : "No match"}
                          </span>
                          {result && <span style={{ fontSize: "12px", color: "#64748b" }}>({result.level})</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "10px" }}>💡 Preview uses 75% as a sample mark. Save your ranges to see them take effect.</p>
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
                      {(school.schoolType === "PRIMARY" || school.schoolType === "COMBINED") && (
                        <option value="PRIMARY">Primary Level (PLE / Standard Aggregates)</option>
                      )}
                      {(school.schoolType === "SECONDARY" || school.schoolType === "COMBINED") && (
                        <option value="SECONDARY">Secondary Level (New Curriculum CBC)</option>
                      )}
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

            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px" }} className="flex-mobile-col">
              {/* Configure Subjects */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Add Subject</h4>
                
                {/* Tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "16px", gap: "12px" }}>
                  <button 
                    onClick={() => setSubjectAssignMode("single")}
                    style={{ 
                      padding: "8px 12px", 
                      fontSize: "13px", 
                      background: "transparent", 
                      border: "none", 
                      borderBottom: subjectAssignMode === "single" ? "2px solid var(--primary)" : "none",
                      color: subjectAssignMode === "single" ? "var(--primary)" : "#64748b",
                      fontWeight: subjectAssignMode === "single" ? "bold" : "normal",
                      cursor: "pointer"
                    }}
                  >
                    Single
                  </button>
                  <button 
                    onClick={() => setSubjectAssignMode("multiple")}
                    style={{ 
                      padding: "8px 12px", 
                      fontSize: "13px", 
                      background: "transparent", 
                      border: "none", 
                      borderBottom: subjectAssignMode === "multiple" ? "2px solid var(--primary)" : "none",
                      color: subjectAssignMode === "multiple" ? "var(--primary)" : "#64748b",
                      fontWeight: subjectAssignMode === "multiple" ? "bold" : "normal",
                      cursor: "pointer"
                    }}
                  >
                    Add Multiple
                  </button>
                  <button 
                    onClick={() => {
                      setSubjectAssignMode("pool");
                      if (classes.length > 0 && !subjectPoolSelectedClassId) {
                        setSubjectPoolSelectedClassId(classes[0].id);
                      }
                    }}
                    style={{ 
                      padding: "8px 12px", 
                      fontSize: "13px", 
                      background: "transparent", 
                      border: "none", 
                      borderBottom: subjectAssignMode === "pool" ? "2px solid var(--primary)" : "none",
                      color: subjectAssignMode === "pool" ? "var(--primary)" : "#64748b",
                      fontWeight: subjectAssignMode === "pool" ? "bold" : "normal",
                      cursor: "pointer"
                    }}
                  >
                    Assign from Pool
                  </button>
                </div>

                {/* Tab Content: Single */}
                {subjectAssignMode === "single" && (
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
                          onChange={(e) => {
                            setNewSubjectClassId(e.target.value);
                            setNewSubjectStreamId("");
                          }}
                          required
                        >
                          <option value="">-- Choose class --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Select Stream (Optional)</label>
                        <select 
                          className="input-field" 
                          value={newSubjectStreamId}
                          onChange={(e) => setNewSubjectStreamId(e.target.value)}
                        >
                          <option value="">-- All Streams --</option>
                          {newSubjectClassId && streams.filter(s => s.classId === newSubjectClassId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ gridColumn: "1 / -1" }}>
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
                )}

                {/* Tab Content: Add Multiple */}
                {subjectAssignMode === "multiple" && (
                  <form 
                    onSubmit={(e) => {
                      const txtEl = e.currentTarget.elements.namedItem("bulkSubjects") as HTMLTextAreaElement;
                      const selEl = e.currentTarget.elements.namedItem("targetClass") as HTMLSelectElement;
                      const streamEl = e.currentTarget.elements.namedItem("targetStream") as HTMLSelectElement;
                      handleBulkCreateSubjects(e, selEl.value, streamEl.value, txtEl.value);
                      txtEl.value = "";
                    }} 
                    className="flex flex-col gap-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-group">
                        <label className="form-label">Select Class</label>
                        <select 
                          name="targetClass"
                          className="input-field" 
                          required
                        >
                          <option value="">-- Choose class --</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Select Stream (Optional)</label>
                        <select 
                          name="targetStream"
                          className="input-field" 
                        >
                          <option value="">-- All Streams --</option>
                          {streams.map(s => {
                            const c = classes.find(cl => cl.id === s.classId);
                            return <option key={s.id} value={s.id}>{c?.name} - {s.name}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject Titles (Comma-separated)</label>
                      <textarea 
                        name="bulkSubjects"
                        className="input-field" 
                        placeholder="e.g. Physics, Chemistry, Agriculture, Luganda" 
                        style={{ height: "80px", padding: "8px" }}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Add Subjects</button>
                  </form>
                )}

                {/* Tab Content: Assign from Pool */}
                {subjectAssignMode === "pool" && (
                  <div className="flex flex-col gap-2">
                    <div className="form-group">
                      <label className="form-label">Select Target Class</label>
                      <select 
                        className="input-field" 
                        value={subjectPoolSelectedClassId}
                        onChange={(e) => setSubjectPoolSelectedClassId(e.target.value)}
                        required
                      >
                        <option value="">-- Choose class --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                      </select>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <button 
                        type="button"
                        onClick={() => {
                          const DEFAULT_UGANDAN_SUBJECTS = [
                            "Mathematics", "English Language", "Physics", "Chemistry", "Biology", "Geography", "History", 
                            "Entrepreneurship Education", "Kiswahili", "Luganda", "Fine Art", "Literature in English", 
                            "Christian Religious Education (CRE)", "Islamic Religious Education (IRE)", "Computer Studies", 
                            "Agriculture", "Physical Education", "General Paper", "Sub Mathematics", "ICT"
                          ];
                          const fullPool = Array.from(new Set([
                            ...subjects.map(s => s.name),
                            ...DEFAULT_UGANDAN_SUBJECTS
                          ])).sort();
                          setSubjectPoolSelectedSubjects(fullPool);
                        }}
                        style={{ background: "transparent", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}
                      >
                        ☑ Select All
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSubjectPoolSelectedSubjects([])}
                        style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", padding: 0 }}
                      >
                        ☒ Deselect All
                      </button>
                    </div>

                    <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px", padding: "8px", background: "#f8fafc" }}>
                      {(() => {
                        const DEFAULT_UGANDAN_SUBJECTS = [
                          "Mathematics", "English Language", "Physics", "Chemistry", "Biology", "Geography", "History", 
                          "Entrepreneurship Education", "Kiswahili", "Luganda", "Fine Art", "Literature in English", 
                          "Christian Religious Education (CRE)", "Islamic Religious Education (IRE)", "Computer Studies", 
                          "Agriculture", "Physical Education", "General Paper", "Sub Mathematics", "ICT"
                        ];
                        const fullPool = Array.from(new Set([
                          ...subjects.map(s => s.name),
                          ...DEFAULT_UGANDAN_SUBJECTS
                        ])).sort();

                        return (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                            {fullPool.map(subName => {
                              const isChecked = subjectPoolSelectedSubjects.includes(subName);
                              return (
                                <label key={subName} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setSubjectPoolSelectedSubjects(prev => prev.filter(x => x !== subName));
                                      } else {
                                        setSubjectPoolSelectedSubjects(prev => [...prev, subName]);
                                      }
                                    }}
                                  />
                                  <span>{subName}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <button 
                      type="button"
                      onClick={() => handleAssignPoolSubjects(subjectPoolSelectedClassId)}
                      className="btn btn-primary" 
                      style={{ width: "100%", marginTop: "6px" }}
                      disabled={!subjectPoolSelectedClassId || subjectPoolSelectedSubjects.length === 0}
                    >
                      Assign Selected ({subjectPoolSelectedSubjects.length})
                    </button>
                  </div>
                )}
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
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>No classes configured yet.</td></tr>
                      ) : (
                        classes.map(c => {
                          const clsStreams = streams.filter(s => s.classId === c.id).map(s => s.name).join(", ");
                          const clsSubjects = subjects.filter(s => s.classId === c.id);
                          return (
                            <tr key={c.id}>
                              <td><strong>{c.name}</strong></td>
                              <td><span className={`badge ${c.level === "SECONDARY" ? "badge-success" : "badge-primary"}`}>{c.level}</span></td>
                              <td>{clsStreams || <span style={{ color: "#94a3b8", fontSize: "12px" }}>None</span>}</td>
                              <td>
                                <div className="custom-scrollbar" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "120px", overflowY: "auto", paddingRight: "4px" }}>
                                  {clsSubjects.length === 0 ? (
                                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>None</span>
                                  ) : (
                                    clsSubjects.map(sub => (
                                      <span key={sub.id} className="badge badge-outline" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 8px", fontSize: "12px", background: "#f8fafc" }}>
                                        {sub.name} {sub.streamId ? <span style={{ color: "var(--primary)", fontWeight: "bold" }}>({streams.find(s => s.id === sub.streamId)?.name || 'Stream'})</span> : ""}
                                        <button 
                                          onClick={() => handleDeleteSubject(sub.id, sub.name, c.name)}
                                          style={{ background: "transparent", border: "none", color: "var(--danger)", cursor: "pointer", padding: "0 2px", fontWeight: "bold", fontSize: "14px", display: "inline-flex", alignItems: "center" }}
                                          title={`Delete ${sub.name}`}
                                        >
                                          &times;
                                        </button>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                                  <button 
                                    onClick={() => {
                                      setSelectedEditClass(c);
                                      setEditClassName(c.name);
                                      setEditClassLevel(c.level);
                                      setEditStreamNewName("");
                                      const renames: { [id: string]: string } = {};
                                      streams.filter(s => s.classId === c.id).forEach(s => {
                                        renames[s.id] = s.name;
                                      });
                                      setEditStreamRenames(renames);
                                      setShowEditClassModal(true);
                                    }}
                                    className="btn btn-outline"
                                    style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", borderColor: "var(--primary)", background: "white" }}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteClass(c.id)}
                                    className="btn btn-outline"
                                    style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--danger)", borderColor: "var(--danger)", background: "white" }}
                                  >
                                    🗑️ Delete
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteAllStudentsOfClass(c.id)}
                                    className="btn btn-outline"
                                    style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--danger)", borderColor: "var(--danger)", background: "white" }}
                                    title="Delete all students in this class"
                                  >
                                    🚫 Clear Students
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

        {/* TAB 2C: STUDENTS (Admin/DOS/Head/Teacher) */}
        {activeTab === "students" && (
          <div className="tab-content-anim">
            <div className="flex justify-between align-center no-print" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ marginBottom: "6px" }}>Student Registry & Directory</h2>
                <p style={{ color: "#64748b", margin: 0 }}>Register new student parameters and manage the current student directory.</p>
              </div>
              {currentUser.role === "ADMIN" && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    onClick={() => {
                      if (classes.length > 0) {
                        setBulkPhotoClassId(classes[0].id);
                        const subStreams = streams.filter(s => s.classId === classes[0].id);
                        if (subStreams.length > 0) {
                          setBulkPhotoStreamId(subStreams[0].id);
                        } else {
                          setBulkPhotoStreamId("");
                        }
                      }
                      setBulkPhotoMatches([]);
                      setShowBulkPhotoModal(true);
                    }}
                    className="btn btn-outline"
                    style={{ display: "flex", alignItems: "center", gap: "8px", background: "white" }}
                  >
                    <span>📷 Bulk Upload Photos</span>
                  </button>
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
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: currentUser.role === "TEACHER" ? "1fr" : "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              {/* Register Student */}
              {currentUser.role !== "TEACHER" && (
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
                    <div className="grid grid-cols-2 gap-2">
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
                      <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select 
                          className="input-field" 
                          value={newStudentGender}
                          onChange={(e) => setNewStudentGender(e.target.value as "MALE" | "FEMALE")}
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">SchoolPay Payment Code</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. 194570001" 
                        value={newStudentPaymentCode}
                        onChange={(e) => setNewStudentPaymentCode(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">📱 Parent Contact</label>
                        <input 
                          type="tel" 
                          className="input-field" 
                          placeholder="e.g. 0771234567" 
                          value={newStudentParentContact}
                          onChange={(e) => setNewStudentParentContact(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Registration Number</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="e.g. REG-123" 
                          value={newStudentRegNumber}
                          onChange={(e) => setNewStudentRegNumber(e.target.value)}
                        />
                      </div>
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
                              toast.error("Photo size should be less than 1MB to store directly in the database.");
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
                          <span style={{ fontSize: "11px", color: "var(--success)" }}>âœ“ Image ready</span>
                        </div>
                      )}
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Register Student</button>
                  </form>
                </div>
              )}

              {/* Student Directory List */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }} className="no-print">
                  <h4 style={{ margin: 0 }}>Current Enrolled Students</h4>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>Class Filter:</span>
                      <select 
                        className="input-field" 
                        style={{ width: "140px", padding: "6px 10px", fontSize: "12px", height: "32px" }}
                        value={selectedFilterClassId}
                        onChange={(e) => setSelectedFilterClassId(e.target.value)}
                      >
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    {selectedFilterClassId && (
                      <button 
                        onClick={() => window.print()}
                        className="btn btn-primary"
                        style={{ padding: "6px 12px", fontSize: "12px", height: "32px", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <Printer size={14} /> Print Attendance Sheet
                      </button>
                    )}
                  </div>
                </div>
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
                      {(() => {
                        const filtered = selectedFilterClassId 
                          ? students.filter(st => st.classId === selectedFilterClassId)
                          : students;
                        if (filtered.length === 0) {
                          return <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>No students registered in this class.</td></tr>;
                        }
                        return filtered.map(st => {
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
                                  {currentUser.role !== "TEACHER" && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          setSelectedEditStudent(st);
                                          setEditStudentName(st.name);
                                          setEditStudentNumber(st.studentNumber);
                                          setEditStudentClassId(st.classId);
                                          setEditStudentStreamId(st.streamId);
                                          setEditStudentType(st.type);
                                          setEditStudentPhoto(st.photo || "");
                                          setEditStudentPhotoChanged(false);
                                          setEditStudentLin(st.lin || "");
                                          setEditStudentGender((st.gender as any) || "MALE");
                                          setEditStudentParentContact(st.parentContact || "");
                                          setEditStudentPaymentCode(st.studentPaymentCode || "");
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
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Printable Attendance Sheet (Hidden on screen, shown in print) */}
            {selectedFilterClassId && (
              <div id="printable-attendance-sheet" className="print-only">
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h2 style={{ margin: "0 0 5px 0", fontSize: "20px", textTransform: "uppercase", fontWeight: "bold" }}>
                    {school?.name}
                  </h2>
                  <p style={{ margin: "0", fontSize: "12px", color: "#334155" }}>
                    P.O. Box {school?.poBox || "Kampala, Uganda"} | Tel: {school?.contactPhone}
                  </p>
                  <h3 style={{ margin: "15px 0 5px 0", fontSize: "14px", textTransform: "uppercase", textDecoration: "underline", fontWeight: "bold" }}>
                    Student Attendance Register
                  </h3>
                  <div style={{ display: "flex", justifyContent: "center", gap: "20px", fontSize: "12px", marginTop: "5px", fontWeight: "bold" }}>
                    <span>Class: {classes.find(c => c.id === selectedFilterClassId)?.name}</span>
                    <span>Term: Term {school?.currentTerm || "1"}</span>
                    <span>Year: {school?.currentYear || "2026"}</span>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style={{ width: "35px" }}>No.</th>
                      <th style={{ width: "100px" }}>Student ID</th>
                      <th style={{ width: "200px" }}>Student Name</th>
                      <th style={{ width: "50px" }}>Gender</th>
                      {/* 15 empty cells for marking daily attendance */}
                      {[...Array(15)].map((_, i) => (
                        <th key={i} style={{ width: "25px", textAlign: "center" }}>{i + 1}</th>
                      ))}
                      <th style={{ width: "50px" }}>Total</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.filter(st => st.classId === selectedFilterClassId).map((st, idx) => (
                      <tr key={st.id}>
                        <td>{idx + 1}</td>
                        <td><code>{st.studentNumber}</code></td>
                        <td><strong>{st.name}</strong></td>
                        <td>{st.gender === "FEMALE" ? "F" : "M"}</td>
                        {[...Array(15)].map((_, i) => (
                          <td key={i} style={{ height: "24px" }}></td>
                        ))}
                        <td></td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <div>
                    Class Teacher Signature: ___________________________
                  </div>
                  <div>
                    Date: ___________________________
                  </div>
                </div>
              </div>
            )}
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
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => setShowBulkStaffModal(true)} 
                  className="btn btn-outline"
                  style={{ display: "flex", alignItems: "center", gap: "8px", background: "white" }}
                >
                  <PlusCircle size={16} /> Bulk Upload Staff
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "20px" }} className="no-print">
              <button 
                onClick={() => setStaffSubTab("directory")} 
                className={`btn ${staffSubTab === "directory" ? "btn-primary" : "btn-outline"}`}
                style={{ padding: "8px 16px", fontSize: "14px", border: "none" }}
              >
                Staff Directory
              </button>
              <button 
                onClick={() => setStaffSubTab("assignments")} 
                className={`btn ${staffSubTab === "assignments" ? "btn-primary" : "btn-outline"}`}
                style={{ padding: "8px 16px", fontSize: "14px", border: "none" }}
              >
                Teacher Class & Subject Assignments
              </button>
            </div>

            {staffSubTab === "directory" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col tab-content-anim">
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
                    <div className="form-group" style={{ marginTop: "12px" }}>
                      <label className="form-label">📱 Staff Phone Contact</label>
                      <input 
                        type="tel" 
                        className="input-field" 
                        placeholder="e.g. 0701234567" 
                        value={newTeacherContact}
                        onChange={(e) => setNewTeacherContact(e.target.value)}
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
                              toast.error("Photo size should be less than 1MB to store directly in the database.");
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
                          <span style={{ fontSize: "11px", color: "var(--success)" }}>âœ“ Image ready</span>
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
                                        toast.success("Super Administrator accounts cannot be deleted directly.");
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
            )}

            {staffSubTab === "assignments" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col tab-content-anim">
                {/* Create Assignment Form */}
                <div className="card" style={{ height: "fit-content" }}>
                  <h4 style={{ marginBottom: "16px" }}><PlusCircle size={18} /> Assign Teacher to Class/Subject</h4>
                  <form onSubmit={handleCreateAssignment}>
                    <div className="form-group">
                      <label className="form-label">Teacher</label>
                      <select 
                        className="input-field" 
                        value={newAssignmentTeacherId} 
                        onChange={(e) => setNewAssignmentTeacherId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Teacher --</option>
                        {users.filter(u => u.role === "TEACHER").map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.staffNumber})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Class</label>
                      <select 
                        className="input-field" 
                        value={newAssignmentClassId} 
                        onChange={(e) => {
                          setNewAssignmentClassId(e.target.value);
                          const clStreams = streams.filter(st => st.classId === e.target.value);
                          if (clStreams.length > 0) setNewAssignmentStreamId(clStreams[0].id);
                          const clSubjects = subjects.filter(sb => sb.classId === e.target.value);
                          if (clSubjects.length > 0) setNewAssignmentSubjectId(clSubjects[0].id);
                        }}
                        required
                      >
                        <option value="">-- Select Class --</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stream</label>
                      <select 
                        className="input-field" 
                        value={newAssignmentStreamId} 
                        onChange={(e) => setNewAssignmentStreamId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Stream --</option>
                        {streams.filter(st => st.classId === newAssignmentClassId).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subject</label>
                      <select 
                        className="input-field" 
                        value={newAssignmentSubjectId} 
                        onChange={(e) => setNewAssignmentSubjectId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {subjects.filter(sb => sb.classId === newAssignmentClassId).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code || "No Code"})</option>
                        ))}
                      </select>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>
                      Save Assignment
                    </button>
                  </form>
                </div>

                {/* Assignments List Table */}
                <div className="card">
                  <h4 style={{ marginBottom: "16px" }}>Active Assignments Directory</h4>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>Class</th>
                          <th>Stream</th>
                          <th>Subject</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherAssignments.length === 0 ? (
                          <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>No teacher assignments found.</td></tr>
                        ) : (
                          teacherAssignments.map(ta => {
                            const teacher = users.find(u => u.id === ta.teacherId);
                            const cls = classes.find(c => c.id === ta.classId);
                            const stream = streams.find(s => s.id === ta.streamId);
                            const subject = subjects.find(s => s.id === ta.subjectId);
                            return (
                              <tr key={ta.id}>
                                <td>
                                  <strong>{teacher?.name || "Unknown Teacher"}</strong>
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>{teacher?.email}</div>
                                </td>
                                <td><code>{cls?.name || "N/A"}</code></td>
                                <td><code>{stream?.name || "N/A"}</code></td>
                                <td><strong>{subject?.name || "N/A"}</strong> {subject?.code && `(${subject.code})`}</td>
                                <td style={{ textAlign: "right" }}>
                                  <button 
                                    onClick={() => handleDeleteAssignment(ta.id)} 
                                    className="btn btn-outline" 
                                    style={{ padding: "4px 8px", fontSize: "11px", color: "var(--danger)", borderColor: "var(--danger)" }}
                                  >
                                    Remove
                                  </button>
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
            )}
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

                  <div className="form-group">
                    <label className="form-label">Target Class</label>
                    <select className="input-field" value={newExamClassId} onChange={(e) => setNewExamClassId(e.target.value)}>
                      <option value="">All Classes (School-wide)</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {school.schoolType === "COMBINED" ? (
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
                  ) : (
                    <div style={{ background: "var(--primary-light)", border: "1px solid var(--primary-glow)", borderRadius: "6px", padding: "10px", margin: "14px 0", fontSize: "12px", color: "var(--foreground)" }}>
                      <strong>Grading Standard:</strong> {school.schoolType === "PRIMARY" ? "Primary PLE Aggregates (1-9)" : "Secondary Lower Curriculum CBC (A-E)"}
                    </div>
                  )}

                  {newExamIsNewCurriculum && (
                    <div style={{ marginTop: "16px", padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "16px" }}>
                      <h5 style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0f172a" }}>
                        <Sliders size={14} color="var(--primary)" />
                        Continuous Assessment (CA) Columns
                      </h5>
                      <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "12px" }}>
                        Select which CA columns are active and set their maximum marks.
                      </p>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        {/* U1 */}
                        <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold" }}>Unit 1 (U1)</span>
                            <input 
                              type="checkbox" 
                              checked={newExamCbU1Active} 
                              onChange={(e) => setNewExamCbU1Active(e.target.checked)}
                              style={{ width: "14px", height: "14px", cursor: "pointer" }}
                            />
                          </div>
                          {newExamCbU1Active && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                min="1" 
                                max="100"
                                className="input-field" 
                                value={newExamCbU1Max} 
                                onChange={(e) => setNewExamCbU1Max(Number(e.target.value))} 
                                style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                                required
                              />
                            </div>
                          )}
                        </div>

                        {/* U2 */}
                        <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold" }}>Unit 2 (U2)</span>
                            <input 
                              type="checkbox" 
                              checked={newExamCbU2Active} 
                              onChange={(e) => setNewExamCbU2Active(e.target.checked)}
                              style={{ width: "14px", height: "14px", cursor: "pointer" }}
                            />
                          </div>
                          {newExamCbU2Active && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                min="1" 
                                max="100"
                                className="input-field" 
                                value={newExamCbU2Max} 
                                onChange={(e) => setNewExamCbU2Max(Number(e.target.value))} 
                                style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                                required
                              />
                            </div>
                          )}
                        </div>

                        {/* E.T */}
                        <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold" }}>End Term CA (E.T)</span>
                            <input 
                              type="checkbox" 
                              checked={newExamCbEtActive} 
                              onChange={(e) => setNewExamCbEtActive(e.target.checked)}
                              style={{ width: "14px", height: "14px", cursor: "pointer" }}
                            />
                          </div>
                          {newExamCbEtActive && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                min="1" 
                                max="100"
                                className="input-field" 
                                value={newExamCbEtMax} 
                                onChange={(e) => setNewExamCbEtMax(Number(e.target.value))} 
                                style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                                required
                              />
                            </div>
                          )}
                        </div>

                        {/* HPG */}
                        <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "bold" }}>High Perform (HPG)</span>
                            <input 
                              type="checkbox" 
                              checked={newExamCbHpgActive} 
                              onChange={(e) => setNewExamCbHpgActive(e.target.checked)}
                              style={{ width: "14px", height: "14px", cursor: "pointer" }}
                            />
                          </div>
                          {newExamCbHpgActive && (
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                              <input 
                                type="number" 
                                step="0.5" 
                                min="1" 
                                max="100"
                                className="input-field" 
                                value={newExamCbHpgMax} 
                                onChange={(e) => setNewExamCbHpgMax(Number(e.target.value))} 
                                style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

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
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map(ex => (
                        <tr key={ex.id}>
                          <td>
                            <strong>{ex.name}</strong>
                            {ex.classId && (
                              <span style={{ display: "block", fontSize: "11px", color: "var(--primary)", fontWeight: "600", marginTop: "2px" }}>
                                Target Class: {classes.find(c => c.id === ex.classId)?.name || ex.classId}
                              </span>
                            )}
                          </td>
                          <td>Term {ex.term}</td>
                          <td>{ex.year}</td>
                          <td>
                            <span className={`badge ${ex.isNewCurriculum ? "badge-success" : "badge-primary"}`}>
                              {ex.isNewCurriculum ? "New CBC Curriculum (A-E)" : "Primary PLE Aggregates (1-9)"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                              <button 
                                onClick={() => {
                                  setSelectedEditExam(ex);
                                  setEditExamName(ex.name);
                                  setEditExamTerm(String(ex.term));
                                  setEditExamYear(String(ex.year));
                                  setEditExamClassId(ex.classId || "");
                                  setEditExamIsNewCurriculum(ex.isNewCurriculum);
                                  setEditExamCbU1Active(ex.cbU1Active !== false);
                                  setEditExamCbU2Active(ex.cbU2Active !== false);
                                  setEditExamCbEtActive(ex.cbEtActive !== false);
                                  setEditExamCbHpgActive(ex.cbHpgActive !== false);
                                  setEditExamCbU1Max(ex.cbU1Max ?? 3);
                                  setEditExamCbU2Max(ex.cbU2Max ?? 3);
                                  setEditExamCbEtMax(ex.cbEtMax ?? 3);
                                  setEditExamCbHpgMax(ex.cbHpgMax ?? 3);
                                  setShowEditExamModal(true);
                                }}
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", borderColor: "var(--primary)", background: "white" }}
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteExam(ex.id)}
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--danger)", borderColor: "var(--danger)", background: "white" }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
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
                    {exams.filter(ex => !ex.classId || !selectedClassId || ex.classId === selectedClassId).map(ex => <option key={ex.id} value={ex.id}>{ex.name} (Term {ex.term})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">2. Choose Class</label>
                  <select 
                    className="input-field" 
                    value={selectedClassId} 
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      const filteredStreams = currentUser?.role === "TEACHER"
                        ? streams.filter(st => st.classId === e.target.value && teacherAssignments.some(ta => ta.teacherId === currentUser.id && ta.classId === e.target.value && ta.streamId === st.id))
                        : streams.filter(s => s.classId === e.target.value);
                      if (filteredStreams.length > 0) setSelectedStreamId(filteredStreams[0].id);
                    }}
                  >
                    <option value="">-- Choose class --</option>
                    {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">3. Choose Stream</label>
                  <select className="input-field" value={selectedStreamId} onChange={(e) => setSelectedStreamId(e.target.value)}>
                    <option value="">-- Choose stream --</option>
                    {teacherStreams.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">4. Choose Subject</label>
                  <select className="input-field" value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
                    <option value="">-- Choose subject --</option>
                    {teacherSubjectsFiltered.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                      {exams.find(e => e.id === selectedExamId)?.isNewCurriculum 
                        ? "Continuous Assessment & EOY scores (Enter raw percentages 0-100%)" 
                        : `Max marks for this paper is: ${exams.find(e => e.id === selectedExamId)?.maxMarks || 100}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button onClick={handleDownloadMarksTemplate} className="btn btn-outline" style={{ fontSize: "12px", padding: "6px 12px", background: "white" }}>
                      📥 Download Excel Template
                    </button>
                    <label className="btn btn-outline" style={{ fontSize: "12px", padding: "6px 12px", background: "white", cursor: "pointer", margin: 0 }}>
                      📤 Upload Marks via Excel
                      <input type="file" accept=".xlsx, .xls" style={{ display: "none" }} onChange={handleBulkMarksUpload} />
                    </label>
                    <button onClick={handleSaveMarks} className="btn btn-primary" style={{ padding: "6px 16px" }}>
                      💾 Save Grid Marks
                    </button>
                  </div>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student Number</th>
                        <th>Student Name</th>
                        {selectedExam?.isNewCurriculum ? (
                          <>
                            {selectedExam?.cbU1Active !== false && <th style={{ width: "95px" }}>U1 (%)</th>}
                            {selectedExam?.cbU2Active !== false && <th style={{ width: "95px" }}>U2 (%)</th>}
                            {selectedExam?.cbEtActive !== false && <th style={{ width: "95px" }}>E.T (%)</th>}
                            {selectedExam?.cbHpgActive !== false && <th style={{ width: "95px" }}>HPG (%)</th>}
                            <th style={{ width: "95px" }}>EOY (%)</th>
                          </>
                        ) : (
                          <th style={{ width: "150px" }}>Score</th>
                        )}
                        <th>Grade Indicator</th>
                        <th>Remarks / Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.filter(st => st.classId === selectedClassId && st.streamId === selectedStreamId).map(st => {
                        const currentMark = marks.find(m => m.studentId === st.id && m.examPaperId === selectedExamId && m.subjectId === selectedSubjectId);
                        const isCBC = selectedExam?.isNewCurriculum;

                        return (
                          <tr key={st.id}>
                            <td>{st.studentNumber}</td>
                            <td><strong>{st.name}</strong></td>
                            {isCBC ? (
                              <>
                                {selectedExam?.cbU1Active !== false && (
                                  <td>
                                    <input 
                                      type="number" 
                                      min="0"
                                      max="100"
                                      className="input-field" 
                                      placeholder="U1 %"
                                      value={inputU1[st.id] !== undefined ? inputU1[st.id] : ""}
                                      onChange={(e) => setInputU1({ ...inputU1, [st.id]: e.target.value })}
                                      style={{ padding: "6px 10px", fontSize: "13px" }}
                                    />
                                  </td>
                                )}
                                {selectedExam?.cbU2Active !== false && (
                                  <td>
                                    <input 
                                      type="number" 
                                      min="0"
                                      max="100"
                                      className="input-field" 
                                      placeholder="U2 %"
                                      value={inputU2[st.id] !== undefined ? inputU2[st.id] : ""}
                                      onChange={(e) => setInputU2({ ...inputU2, [st.id]: e.target.value })}
                                      style={{ padding: "6px 10px", fontSize: "13px" }}
                                    />
                                  </td>
                                )}
                                {selectedExam?.cbEtActive !== false && (
                                  <td>
                                    <input 
                                      type="number" 
                                      min="0"
                                      max="100"
                                      className="input-field" 
                                      placeholder="E.T %"
                                      value={inputU3[st.id] !== undefined ? inputU3[st.id] : ""}
                                      onChange={(e) => setInputU3({ ...inputU3, [st.id]: e.target.value })}
                                      style={{ padding: "6px 10px", fontSize: "13px" }}
                                    />
                                  </td>
                                )}
                                {selectedExam?.cbHpgActive !== false && (
                                  <td>
                                    <input 
                                      type="number" 
                                      min="0"
                                      max="100"
                                      className="input-field" 
                                      placeholder="HPG %"
                                      value={inputHPG[st.id] !== undefined ? inputHPG[st.id] : ""}
                                      onChange={(e) => setInputHPG({ ...inputHPG, [st.id]: e.target.value })}
                                      style={{ padding: "6px 10px", fontSize: "13px" }}
                                    />
                                  </td>
                                )}
                                <td>
                                  <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    className="input-field" 
                                    placeholder="EOY %"
                                    value={inputEOY[st.id] !== undefined ? inputEOY[st.id] : ""}
                                    onChange={(e) => setInputEOY({ ...inputEOY, [st.id]: e.target.value })}
                                    style={{ padding: "6px 10px", fontSize: "13px" }}
                                  />
                                </td>
                              </>
                            ) : (
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
                            )}
                            <td>
                              {currentMark ? (
                                <span className={`badge ${isCBC ? "badge-success" : "badge-primary"}`}>
                                  {isCBC 
                                    ? `CBC: Grade ${currentMark.competencyGrade} (${currentMark.score}%)` 
                                    : `PLE: Grade ${currentMark.competencyGrade}`}
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

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Class Report Theme Color</span>
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input 
                      type="color" 
                      style={{ width: "40px", height: "36px", padding: "2px", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer" }}
                      value={classes.find(c => c.id === selectedReportClassId)?.themeColor || "#ffffff"}
                      onChange={async (e) => {
                        const classObj = classes.find(c => c.id === selectedReportClassId);
                        if (classObj) {
                          const val = e.target.value;
                          setClasses(prev => prev.map(c => c.id === classObj.id ? { ...c, themeColor: val } : c));
                          await updateClass(classObj.id, classObj.name, classObj.level, val, classObj.themeTextColor || "#000000");
                          await loadSchoolData(school!.id);
                        }
                      }}
                      title="Custom Theme Color"
                    />
                    <select
                      className="input-field"
                      style={{ flex: 1, padding: "6px 12px" }}
                      value={classes.find(c => c.id === selectedReportClassId)?.themeColor || "#ffffff"}
                      onChange={async (e) => {
                        const classObj = classes.find(c => c.id === selectedReportClassId);
                        if (classObj) {
                          const val = e.target.value;
                          setClasses(prev => prev.map(c => c.id === classObj.id ? { ...c, themeColor: val } : c));
                          await updateClass(classObj.id, classObj.name, classObj.level, val, classObj.themeTextColor || "#000000");
                          await loadSchoolData(school!.id);
                        }
                      }}
                    >
                      <option value="#ffffff">Default (White)</option>
                      <option value="#f0f9ff">Pastel Blue (#f0f9ff)</option>
                      <option value="#f0fdf4">Pastel Green (#f0fdf4)</option>
                      <option value="#fffbeb">Pastel Yellow (#fffbeb)</option>
                      <option value="#fdf2f8">Pastel Pink (#fdf2f8)</option>
                      <option value="#faf5ff">Pastel Purple (#faf5ff)</option>
                      <option value="#f0fdfa">Pastel Teal (#f0fdfa)</option>
                      <option value="#f8fafc">Pastel Slate (#f8fafc)</option>
                      <option value="#ffedd5">Pastel Orange (#ffedd5)</option>
                      <option value="#fee2e2">Pastel Red (#fee2e2)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Class Report Text Color</span>
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input 
                      type="color" 
                      style={{ width: "40px", height: "36px", padding: "2px", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer" }}
                      value={classes.find(c => c.id === selectedReportClassId)?.themeTextColor || "#000000"}
                      onChange={async (e) => {
                        const classObj = classes.find(c => c.id === selectedReportClassId);
                        if (classObj) {
                          const val = e.target.value;
                          setClasses(prev => prev.map(c => c.id === classObj.id ? { ...c, themeTextColor: val } : c));
                          await updateClass(classObj.id, classObj.name, classObj.level, classObj.themeColor || "#ffffff", val);
                          await loadSchoolData(school!.id);
                        }
                      }}
                      title="Custom Text Color"
                    />
                    <select
                      className="input-field"
                      style={{ flex: 1, padding: "6px 12px" }}
                      value={classes.find(c => c.id === selectedReportClassId)?.themeTextColor || "#000000"}
                      onChange={async (e) => {
                        const classObj = classes.find(c => c.id === selectedReportClassId);
                        if (classObj) {
                          const val = e.target.value;
                          setClasses(prev => prev.map(c => c.id === classObj.id ? { ...c, themeTextColor: val } : c));
                          await updateClass(classObj.id, classObj.name, classObj.level, classObj.themeColor || "#ffffff", val);
                          await loadSchoolData(school!.id);
                        }
                      }}
                    >
                      <option value="#000000">Default (Black)</option>
                      <option value="#1e293b">Dark Slate (#1e293b)</option>
                      <option value="#0f172a">Deep Dark (#0f172a)</option>
                      <option value="#1e3a8a">Navy Blue (#1e3a8a)</option>
                      <option value="#065f46">Dark Green (#065f46)</option>
                      <option value="#ffffff">White (#ffffff)</option>
                      <option value="#f8fafc">Light Slate (#f8fafc)</option>
                      <option value="#e2e8f0">Slate Gray (#e2e8f0)</option>
                    </select>
                  </div>
                </div>

                <div style={{ margin: "14px 0" }}>
                  <button 
                    onClick={() => {
                      setIsBulkReportMode(true);
                      setSelectedReportStudent(null);
                    }}
                    className={`btn ${isBulkReportMode ? "btn-primary" : "btn-outline"}`}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Printer size={16} /> Bulk Print Class Reports
                  </button>
                </div>

                <h4 style={{ margin: "20px 0 10px" }}>Student List</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
                  {students.filter(st => st.classId === selectedReportClassId).map(st => (
                    <button 
                      key={st.id}
                      onClick={() => {
                        setSelectedReportStudent(st);
                        setIsBulkReportMode(false);
                      }}
                      className="btn btn-outline"
                      style={{ justifyContent: "space-between", padding: "10px", width: "100%", textAlign: "left", borderColor: !isBulkReportMode && selectedReportStudent?.id === st.id ? "var(--primary)" : "var(--border)" }}
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
                {isBulkReportMode ? (
                  <div>
                    {/* Header Controls */}
                    <div className="flex justify-between align-center no-print" style={{ marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                      <div>
                        <h3>Bulk Print Preview</h3>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>
                          Class: {classes.find(c => c.id === selectedReportClassId)?.name} • Total Students: {students.filter(st => st.classId === selectedReportClassId).length}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setIsBulkReportMode(false);
                            const classSts = students.filter(st => st.classId === selectedReportClassId);
                            if (classSts.length > 0) {
                              setSelectedReportStudent(classSts[0]);
                            }
                          }}
                          className="btn btn-outline"
                        >
                          Close Bulk Mode
                        </button>
                        <button onClick={triggerPrint} className="btn btn-primary">
                          <Printer size={16} /> Print All Class Reports
                        </button>
                      </div>
                    </div>

                    {/* Bulk Reports Container */}
                    <div className="bulk-printable-reports">
                      {students.filter(st => st.classId === selectedReportClassId).map((st, index, arr) => {
                        const isLast = index === arr.length - 1;
                        const eotExam = exams.find(e => e.term === parseInt(selectedReportTerm));
                        const rankInfo = eotExam ? getStudentRankAndTotals(st.id, st.classId, eotExam.id) : null;
                        return (
                          <React.Fragment key={st.id}>
                            <div className="bulk-report-card" style={{ background: classes.find(c => c.id === selectedReportClassId)?.themeColor || "#ffffff", color: classes.find(c => c.id === selectedReportClassId)?.themeTextColor || "#000000", borderColor: "#cbd5e1", padding: "40px", fontFamily: "Arial, sans-serif", marginBottom: "40px" }}>
                              
                              {/* School Heading */}
                              <div className="report-header" style={{ textAlign: "center", borderBottom: school.reportBorderType === "solid" ? `1px solid ${classes.find(c => c.id === selectedReportClassId)?.themeTextColor || "black"}` : school.reportBorderType === "none" ? "none" : `3px double ${classes.find(c => c.id === selectedReportClassId)?.themeTextColor || "black"}`, paddingBottom: "14px", marginBottom: "20px" }}>
                                {school.reportShowBadge && (
                                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                                    {school.logoUrl ? (
                                      <img src={school.logoUrl} alt="Logo" style={{ width: `${school.reportLogoSize || 60}px`, height: `${school.reportLogoSize || 60}px`, objectFit: "contain" }} />
                                    ) : (
                                      <GraduationCap size={Math.round((school.reportLogoSize || 60) * 0.8)} color="var(--primary)" />
                                    )}
                                  </div>
                                )}
                                <h2 style={{ fontSize: "24px", margin: 0, textTransform: "uppercase", color: school.reportHeaderColor || "#1e3a8a", fontWeight: 900 }}>{school.name}</h2>
                                <div style={{ fontSize: "12px", color: "inherit", opacity: 0.8, margin: "4px 0", lineHeight: "1.4" }}>
                                  {school.reportWebsite && <span>Website: {school.reportWebsite} | </span>}
                                  {school.reportTikTok && <span>TikTok: {school.reportTikTok} | </span>}
                                  <span>P.O. Box {school.poBox || "Kampala, Uganda"}</span>
                                  <br />
                                  {school.reportLocation && <span>Located: {school.reportLocation} | </span>}
                                  <span>Email: {school.contactEmail} | Tel: {school.contactPhone}</span>
                                </div>
                                {school.reportMotto && (
                                  <p style={{ margin: "2px 0 0", fontSize: "11px", fontStyle: "italic", fontWeight: "bold", color: "inherit", opacity: 0.85 }}>
                                    Motto: "{school.reportMotto}"
                                  </p>
                                )}
                                <h3 style={{ fontSize: "16px", margin: "10px 0 0", textTransform: "uppercase", textDecoration: "underline" }}>
                                  {school.reportTitle || "OFFICIAL ACADEMIC REPORT CARD"}
                                </h3>
                              </div>

                              {/* Student Meta details */}
                              <div className="student-meta-grid" style={{ display: "flex", justifyContent: "space-between", gap: "20px", marginBottom: "20px", borderBottom: "1px solid #94a3b8", paddingBottom: "12px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "13px", flex: 1 }}>
                                  <div><strong>Student Name:</strong> {st.name}</div>
                                  {st.gender && <div><strong>Sex:</strong> {st.gender}</div>}
                                  <div><strong>Class:</strong> {classes.find(c => c.id === st.classId)?.name}</div>
                                  {school.reportShowLIN !== false && st.lin && (
                                    <div><strong>Learner ID (LIN):</strong> {st.lin}</div>
                                  )}
                                  {school.reportShowPayCode !== false && st.studentPaymentCode && (
                                    <div><strong>School Pay Code:</strong> {st.studentPaymentCode}</div>
                                  )}
                                  <div><strong>Student Number:</strong> {st.studentNumber}</div>
                                  <div><strong>Academic Term:</strong> Term {selectedReportTerm} (2026)</div>
                                  {school.reportShowResidency && (
                                    <div><strong>Residency Type:</strong> {st.type}</div>
                                  )}
                                  {rankInfo && (
                                    <>
                                      <div><strong>Position Rank:</strong> {rankInfo.position} Out of {rankInfo.totalStudents}</div>
                                      <div><strong>Average Mark:</strong> {rankInfo.studentAverage}% (Class Avg: {rankInfo.classAverage}%)</div>
                                    </>
                                  )}
                                  <div><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</div>
                                </div>
                                {school.reportShowStudentPhoto !== false && (
                                  <div style={{ width: "75px", height: "80px", border: "1px solid #cbd5e1", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#f8fafc", flexShrink: 0 }}>
                                    {st.photo ? (
                                      <img src={st.photo} alt="Student" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                      <span style={{ fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>No Photo</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Grades Table */}
                              <h4 style={{ textTransform: "uppercase", fontSize: "14px", marginBottom: "8px" }}>Academic Marks Assessment</h4>
                              {eotExam ? (
                                renderMarksAssessmentTable(st, eotExam)
                              ) : (
                                <div style={{ padding: "10px", textAlign: "center", fontStyle: "italic", border: "1px solid #cbd5e1", fontSize: "12px", color: "#64748b" }}>
                                  No exam scheduled for Term {selectedReportTerm}.
                                </div>
                              )}

                              {/* Performance Chart */}
                              {school.reportShowChart !== false && eotExam && (
                                renderRealPerformanceChart(st, eotExam)
                              )}

                              {/* PLE Summary if Primary */}
                              {classes.find(c => c.id === st.classId)?.level === "PRIMARY" && (
                                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "13px", marginBottom: "15px" }}>
                                  {(() => {
                                    const pleDetails = getPLEReportDetails(st.id);
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

                              {/* Grading Legend Card */}
                              {school.reportShowRules && (
                                <div className="legend-container" style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "11px", lineHeight: "1.4" }}>
                                  <strong style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>
                                    {classes.find(c => c.id === st.classId)?.level === "SECONDARY" ? "CBC Grading Scale & Achievement Levels" : "PLE Grading Scale & Classifications"}:
                                  </strong>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                    <thead>
                                      <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                                        <th style={{ padding: "4px" }}>Grade</th>
                                        <th style={{ padding: "4px" }}>Mark Range</th>
                                        <th style={{ padding: "4px" }}>Achievement Level</th>
                                        <th style={{ padding: "4px" }}>Descriptor / Classification</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(() => {
                                        const level = classes.find(c => c.id === st.classId)?.level || "SECONDARY";
                                        const ranges = gradeRanges.filter(r => r.systemType === level).sort((a, b) => b.minMark - a.minMark);
                                        if (ranges.length === 0) {
                                          // Fallback defaults
                                          const defaults = level === "SECONDARY" 
                                            ? [
                                                { grade: "A", range: "80% - 100%", level: "Exceptional", desc: "Highly proficient in subject skills" },
                                                { grade: "B", range: "70% - 79%", level: "Outstanding", desc: "Consistently demonstrates subject skills" },
                                                { grade: "C", range: "55% - 69%", level: "Satisfactory", desc: "Demonstrates basic subject skills" },
                                                { grade: "D", range: "40% - 54%", level: "Basic", desc: "Beginning to develop subject skills" },
                                                { grade: "E", range: "0% - 39%", level: "Elementary", desc: "Needs guidance to develop skills" }
                                              ]
                                            : [
                                                { grade: "1", range: "90% - 100%", level: "Distinction", desc: "Outstanding performance" },
                                                { grade: "2", range: "80% - 89%", level: "Distinction", desc: "Very good performance" },
                                                { grade: "3", range: "70% - 79%", level: "Credit", desc: "Good performance" },
                                                { grade: "4", range: "60% - 69%", level: "Credit", desc: "Satisfactory performance" },
                                                { grade: "5", range: "50% - 59%", level: "Credit", desc: "Fair performance" },
                                                { grade: "6", range: "40% - 49%", level: "Pass", desc: "Pass performance" },
                                                { grade: "7", range: "35% - 39%", level: "Pass", desc: "Barely pass performance" },
                                                { grade: "8", range: "30% - 34%", level: "Pass", desc: "Weak pass performance" },
                                                { grade: "9", range: "0% - 29%", level: "Fail", desc: "Fail/Needs improvement" }
                                              ];
                                          return defaults.map((d, i) => (
                                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                              <td style={{ padding: "4px", fontWeight: "bold" }}>{d.grade}</td>
                                              <td style={{ padding: "4px" }}>{d.range}</td>
                                              <td style={{ padding: "4px" }}>{d.level}</td>
                                              <td style={{ padding: "4px", color: "#64748b" }}>{d.desc}</td>
                                            </tr>
                                          ));
                                        }
                                        return ranges.map(r => (
                                          <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "4px", fontWeight: "bold" }}>{r.grade}</td>
                                            <td style={{ padding: "4px" }}>{r.minMark}% - {r.maxMark}%</td>
                                            <td style={{ padding: "4px" }}>{r.achievementLevel}</td>
                                            <td style={{ padding: "4px", color: "#64748b" }}>{r.descriptor}</td>
                                          </tr>
                                        ));
                                      })()}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Class / Head Teacher Comments */}
                              {school.reportShowComments !== false && rankInfo && (
                                <div className="comments-container" style={{ border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "13px", marginTop: "15px", lineHeight: "1.6" }}>
                                  {(() => {
                                    const avg = parseFloat(rankInfo.studentAverage);
                                    let classTeacherComment = st.classTeacherComment || "A fair performance. Focus more on your weaker subjects next term.";
                                    let headTeacherComment = st.headTeacherComment || "You have potential. Push yourself harder next term.";
                                    
                                    if (!st.classTeacherComment || !st.headTeacherComment) {
                                      let defaultClassTeacherComment = "A fair performance. Focus more on your weaker subjects next term.";
                                      let defaultHeadTeacherComment = "You have potential. Push yourself harder next term.";
                                      if (avg >= 80) {
                                        defaultClassTeacherComment = "Excellent academic performance! Keep up the outstanding work.";
                                        defaultHeadTeacherComment = "An exceptional result. I am proud of your achievements.";
                                      } else if (avg >= 65) {
                                        defaultClassTeacherComment = "Very good progress. With continued effort, you can achieve even higher grades.";
                                        defaultHeadTeacherComment = "Good work. Maintain this standard.";
                                      } else if (avg < 50) {
                                        defaultClassTeacherComment = "Below average. You need to put in more effort and seek academic support.";
                                        defaultHeadTeacherComment = "Urgent improvement is required. Please double your efforts.";
                                      }

                                      if (!st.classTeacherComment) classTeacherComment = defaultClassTeacherComment;
                                      if (!st.headTeacherComment) headTeacherComment = defaultHeadTeacherComment;
                                    }
                                    
                                    return (
                                      <>
                                        <div><strong>Class Teacher's Comment:</strong> <span style={{ fontStyle: "italic", textDecoration: "underline", color: "#1e3a8a" }}>{classTeacherComment}</span></div>
                                        <div style={{ marginTop: "4px" }}><strong>Class Teacher's Name:</strong> {school.deputyHeadTeacher || "Mr. Okongo Wilson"} &nbsp;&nbsp;&nbsp;&nbsp; <strong>Signature:</strong> _________________</div>
                                        <div style={{ marginTop: "8px" }}><strong>Head Teacher's Comment:</strong> <span style={{ fontStyle: "italic", textDecoration: "underline", color: "#059669" }}>{headTeacherComment}</span></div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Fees display */}
                              {school.reportShowFees !== false && (
                                <div className="fees-container" style={{ display: "flex", justifyContent: "space-between", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", marginTop: "10px", fontSize: "12px", fontWeight: "bold" }}>
                                  {(() => {
                                    const baseFee = st.type === "DAY" ? (school.reportNextTermFeesDay || 150000) : (school.reportNextTermFeesBoarding || 350000);
                                    const stPayments = studentPayments.filter(p => p.studentId === st.id && p.term === parseInt(selectedReportTerm));
                                    const latestPayment = stPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                    const outstanding = latestPayment ? latestPayment.balance : 0;
                                    return (
                                      <>
                                        <span>Next Term Fees: {baseFee.toLocaleString()} UGX</span>
                                        <span>Outstanding Balance: {outstanding.toLocaleString()} UGX</span>
                                        <span>Total Amount Needed: {(baseFee + outstanding).toLocaleString()} UGX</span>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Term Dates */}
                              {school.reportShowTermDates !== false && (
                                <div className="dates-container" style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginTop: "8px", border: "1px dashed #cbd5e1", padding: "8px 4px" }}>
                                  {(() => {
                                    const getDates = (term: string) => {
                                      if (term === "1") return { start: school.term1Start, end: school.term1End };
                                      if (term === "2") return { start: school.term2Start, end: school.term2End };
                                      return { start: school.term3Start, end: school.term3End };
                                    };
                                    const dates = getDates(selectedReportTerm);
                                    const endFmt = dates.end ? new Date(dates.end).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Thursday, April 30, 2026";
                                    const nextTermDates = getDates(String((parseInt(selectedReportTerm) % 3) + 1));
                                    const startFmt = nextTermDates.start ? new Date(nextTermDates.start).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Sunday, May 24, 2026";
                                    return (
                                      <>
                                        <span>This term has ended today: <strong>{endFmt}</strong></span>
                                        <span>Next Term Begins on: <strong>{startFmt}</strong></span>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* Signatures */}
                              {school.reportShowSignatures && (
                                <div className="signatures-container" style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "12px" }}>
                                  <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>Class Teacher</div>
                                  <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>Head Teacher</div>
                                  <div style={{ borderTop: "1px solid black", width: "150px", textAlign: "center", paddingTop: "6px" }}>School Stamp</div>
                                </div>
                              )}

                            </div>
                            {!isLast && <div className="page-break" />}
                          </React.Fragment>
                        );
                      })}
                      {students.filter(st => st.classId === selectedReportClassId).length === 0 && (
                        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                          No students in this class to generate report cards.
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedReportStudent ? ( (() => {
                  const eotExam = exams.find(e => e.term === parseInt(selectedReportTerm));
                  const rankInfo = eotExam ? getStudentRankAndTotals(selectedReportStudent.id, selectedReportStudent.classId, eotExam.id) : null;
                  return (
                    <div>
                      {/* Header Controls */}
                      <div className="flex justify-between align-center no-print" style={{ marginBottom: "24px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                        <h3>Preview Report Card</h3>
                        <button onClick={triggerPrint} className="btn btn-primary">
                          <Printer size={16} /> Print/Save PDF
                        </button>
                      </div>

                      {/* Comments Editor Panel (no-print) */}
                      <div className="card no-print" style={{ marginBottom: "24px", background: "#f8fafc", borderColor: "#cbd5e1", padding: "16px", borderRadius: "8px" }}>
                        <h4 style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "bold" }}>
                          ✏️ Customize Teacher Comments for {selectedReportStudent.name}
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px" }}>Class Teacher's Comment</label>
                            <textarea 
                              className="input-field"
                              style={{ height: "60px", padding: "8px", fontSize: "13px", background: "white", color: "black", borderColor: "#cbd5e1" }}
                              placeholder="e.g. Excellent progress..."
                              value={tempClassTeacherComment}
                              onChange={(e) => setTempClassTeacherComment(e.target.value)}
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: "12px", marginBottom: "4px" }}>Head Teacher's Comment</label>
                            <textarea 
                              className="input-field"
                              style={{ height: "60px", padding: "8px", fontSize: "13px", background: "white", color: "black", borderColor: "#cbd5e1" }}
                              placeholder="e.g. You have potential. Push yourself harder next term."
                              value={tempHeadTeacherComment}
                              onChange={(e) => setTempHeadTeacherComment(e.target.value)}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button 
                            onClick={async () => {
                              try {
                                await updateStudent(selectedReportStudent.id, {
                                  classTeacherComment: tempClassTeacherComment,
                                  headTeacherComment: tempHeadTeacherComment
                                });
                                await loadSchoolData(school!.id);
                                setSelectedReportStudent(prev => prev ? { ...prev, classTeacherComment: tempClassTeacherComment, headTeacherComment: tempHeadTeacherComment } : null);
                                toast.success("Comments saved successfully!");
                              } catch (err: any) {
                                toast.error("Failed to save comments: " + (err.message || err));
                              }
                            }}
                            className="btn btn-primary"
                            style={{ padding: "6px 12px", fontSize: "12px", height: "32px" }}
                          >
                            Save Comments
                          </button>
                        </div>
                      </div>

                      {/* Report Card Template (Print Target) */}
                      <div id="printable-report" className="card" style={{ background: classes.find(c => c.id === selectedReportStudent.classId)?.themeColor || "#ffffff", color: classes.find(c => c.id === selectedReportStudent.classId)?.themeTextColor || "#000000", borderColor: "#cbd5e1", padding: "40px", fontFamily: "Arial, sans-serif" }}>
                        
                        {/* School Heading */}
                        <div className="report-header" style={{ display: "flex", justifyContent: "space-between", borderBottom: school.reportBorderType === "solid" ? `1px solid ${classes.find(c => c.id === selectedReportStudent.classId)?.themeTextColor || "black"}` : school.reportBorderType === "none" ? "none" : `3px double ${classes.find(c => c.id === selectedReportStudent.classId)?.themeTextColor || "black"}`, paddingBottom: "14px", marginBottom: "10px" }}>
                          {/* Left: Logo */}
                          <div style={{ width: "100px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {school.reportShowBadge && (
                              school.logoUrl ? (
                                <img src={school.logoUrl} alt="Logo" style={{ width: `${school.reportLogoSize || 80}px`, height: `${school.reportLogoSize || 80}px`, objectFit: "contain" }} />
                              ) : (
                                <GraduationCap size={Math.round((school.reportLogoSize || 80) * 0.8)} color="var(--primary)" />
                              )
                            )}
                          </div>
                          
                          {/* Center: School Info */}
                          <div style={{ flex: 1, textAlign: "center", padding: "0 10px" }}>
                            <h2 style={{ fontSize: "22px", margin: 0, textTransform: "uppercase", color: school.reportHeaderColor || "#1e3a8a", fontWeight: 900, fontFamily: "Times New Roman, serif" }}>{school.name}</h2>
                            <div style={{ fontSize: "11px", color: "inherit", margin: "4px 0", lineHeight: "1.4" }}>
                              {school.reportTikTok && <span>TikTok:{school.reportTikTok} | </span>}
                              <span>Postal: P.O BOX {school.poBox || "1922, JINJA"}</span>
                              {school.reportWebsite && <span> | Website: {school.reportWebsite}</span>}
                              <br />
                              <span>LOCATED {school.reportLocation?.toUpperCase() || "MBIKKO, BUIKWE DISTRICT"}</span>
                              <br />
                              <span>Email: {school.contactEmail} &nbsp;&nbsp;&nbsp;&nbsp; Telephone: {school.contactPhone}</span>
                            </div>
                            <h3 style={{ fontSize: "14px", margin: "4px 0", textTransform: "uppercase", fontWeight: "bold" }}>
                              {school.reportMotto || "WISDOM COMES FROM GOD"}
                            </h3>
                            <div style={{ display: "inline-block", background: "#f1f5f9", color: "#000", padding: "4px 16px", marginTop: "4px", fontSize: "14px", fontWeight: "bold", border: "1px solid #cbd5e1" }}>
                              {school.reportTitle || `END OF TERM ${selectedReportTerm === "1" ? "I" : selectedReportTerm === "2" ? "II" : "III"} REPORT CARD`}
                            </div>
                          </div>

                          {/* Right: Student Photo */}
                          <div style={{ width: "100px", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", flexShrink: 0 }}>
                            {school.reportShowStudentPhoto !== false && (
                              <div style={{ width: "80px", height: "90px", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#f8fafc" }}>
                                {selectedReportStudent.photo ? (
                                  <img src={selectedReportStudent.photo} alt="Student" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <span style={{ fontSize: "9px", color: "#94a3b8", textAlign: "center" }}>No Photo</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Student Meta details */}
                        <div className="student-meta-inline" style={{ marginBottom: "15px", fontSize: "12px", lineHeight: "1.8", fontWeight: "bold" }}>
                          {/* Row 1 */}
                          <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "flex-end" }}>
                            <div style={{ display: "flex", flex: 3, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "15px", fontFamily: "Times New Roman, serif" }}>Name:</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textTransform: "uppercase", textAlign: "center" }}>{selectedReportStudent.name}</span>
                            </div>
                            <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "15px", fontFamily: "Times New Roman, serif" }}>Sex:</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textAlign: "center" }}>{selectedReportStudent.gender === "MALE" ? "M" : selectedReportStudent.gender === "FEMALE" ? "F" : "-"}</span>
                            </div>
                            <div style={{ display: "flex", flex: 1.5, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "15px", fontFamily: "Times New Roman, serif" }}>Class:</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textAlign: "center" }}>{classes.find(c => c.id === selectedReportStudent.classId)?.name}</span>
                            </div>
                          </div>
                          {/* Row 2 */}
                          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                            <div style={{ display: "flex", flex: 2.5, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "11px", fontWeight: "normal", fontStyle: "italic" }}>Learner ID No. (LIN):</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textAlign: "center", color: "#475569" }}>{selectedReportStudent.lin || "____________________"}</span>
                            </div>
                            <div style={{ display: "flex", flex: 1.5, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "15px", fontFamily: "Times New Roman, serif" }}>Pay code:</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textAlign: "center" }}>{selectedReportStudent.studentPaymentCode || "________"}</span>
                            </div>
                            <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "15px", fontFamily: "Times New Roman, serif" }}>Term:</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textAlign: "center" }}>{selectedReportTerm === "1" ? "TERMI" : selectedReportTerm === "2" ? "TERMII" : "TERMIII"}</span>
                            </div>
                            <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
                              <span style={{ whiteSpace: "nowrap", marginRight: "6px", fontSize: "15px", fontFamily: "Times New Roman, serif" }}>Year:</span>
                              <span style={{ flex: 1, borderBottom: "1px dotted #000", paddingBottom: "2px", textAlign: "center" }}>{new Date().getFullYear()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Grades Table */}
                        <h4 style={{ textTransform: "uppercase", fontSize: "14px", marginBottom: "8px" }}>Academic Marks Assessment</h4>
                        {eotExam ? (
                          renderMarksAssessmentTable(selectedReportStudent, eotExam)
                        ) : (
                          <div style={{ padding: "10px", textAlign: "center", fontStyle: "italic", border: "1px solid #cbd5e1", fontSize: "12px", color: "#64748b" }}>
                            No exam scheduled for Term {selectedReportTerm}.
                          </div>
                        )}

                        {/* Performance Chart */}
                        {school.reportShowChart !== false && eotExam && (
                          renderRealPerformanceChart(selectedReportStudent, eotExam)
                        )}

                        {/* PLE Summary if Primary */}
                        {classes.find(c => c.id === selectedReportStudent.classId)?.level === "PRIMARY" && (
                          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", fontSize: "13px", marginBottom: "15px" }}>
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

                        {/* Class / Head Teacher Comments */}
                        {school.reportShowComments !== false && rankInfo && (
                          <div className="comments-container" style={{ marginTop: "20px", fontSize: "14px", lineHeight: "2.2", fontFamily: "Times New Roman, serif" }}>
                            {(() => {
                              const avg = parseFloat(rankInfo.studentAverage);
                              const sysType = classes.find(c => c.id === selectedReportStudent.classId)?.level === "PRIMARY" ? "PRIMARY" : "SECONDARY";
                              const computedRanges = computeGradeFromRanges(avg, sysType, gradeRanges);

                              let classTeacherComment = selectedReportStudent.classTeacherComment;
                              let headTeacherComment = selectedReportStudent.headTeacherComment;
                              
                              if (!classTeacherComment) {
                                classTeacherComment = computedRanges.classTeacherComment || "A fair performance. Focus more on your weaker subjects next term.";
                              }
                              
                              if (!headTeacherComment) {
                                headTeacherComment = computedRanges.headTeacherComment || "You have potential. Push yourself harder next term.";
                              }
                              
                              return (
                                <>
                                  <div style={{ display: "flex", alignItems: "flex-end", marginBottom: "8px" }}>
                                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap", marginRight: "10px", fontSize: "15px" }}>Class teacher's Comment:</span>
                                    <div style={{ flex: 1, borderBottom: "1.5px dotted #000", fontFamily: "cursive, 'Comic Sans MS', sans-serif", fontSize: "15px", color: "#1e3a8a", paddingBottom: "2px", minHeight: "24px" }}>
                                      {classTeacherComment}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "flex-end", marginBottom: "8px" }}>
                                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap", marginRight: "10px", fontSize: "15px" }}>Signature:</span>
                                    <div style={{ flex: 1, borderBottom: "1.5px dotted #000" }}></div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "flex-end", marginBottom: "8px" }}>
                                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap", marginRight: "10px", fontSize: "15px" }}>Head Teacher's Comment:</span>
                                    <div style={{ flex: 1, borderBottom: "1.5px dotted #000", fontFamily: "cursive, 'Comic Sans MS', sans-serif", fontSize: "15px", color: "#059669", paddingBottom: "2px", minHeight: "24px" }}>
                                      {headTeacherComment}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "flex-end", marginBottom: "8px" }}>
                                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap", marginRight: "10px", fontSize: "15px" }}>Signature:</span>
                                    <div style={{ flex: 1, borderBottom: "1.5px dotted #000" }}></div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}

                        {/* Footer (Fees, Dates, Stamp) */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "15px", fontSize: "13px", fontFamily: "Times New Roman, serif" }}>
                          
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
                            {school.reportShowFees !== false && (
                              <div style={{ display: "flex", alignItems: "flex-end" }}>
                                <span style={{ fontWeight: "bold", marginRight: "8px" }}>Next term's fees will be:</span>
                                <div style={{ width: "150px", borderBottom: "1.5px dotted #000", textAlign: "center", fontStyle: "italic", fontWeight: "bold" }}>
                                  {(() => {
                                    const baseFee = selectedReportStudent.type === "DAY" ? (school.reportNextTermFeesDay || 150000) : (school.reportNextTermFeesBoarding || 350000);
                                    return `${baseFee.toLocaleString()} UGX`;
                                  })()}
                                </div>
                              </div>
                            )}

                            {school.reportShowTermDates !== false && (
                              <div style={{ display: "flex", alignItems: "flex-end", marginTop: "4px" }}>
                                <span style={{ fontWeight: "bold", marginRight: "8px" }}>Next term begins on:</span>
                                <div style={{ width: "200px", borderBottom: "1.5px dotted #000", textAlign: "center", fontStyle: "italic", fontWeight: "bold" }}>
                                  {(() => {
                                    const nextTermDates = (() => {
                                      const next = String((parseInt(selectedReportTerm) % 3) + 1);
                                      if (next === "1") return { start: school.term1Start, end: school.term1End };
                                      if (next === "2") return { start: school.term2Start, end: school.term2End };
                                      return { start: school.term3Start, end: school.term3End };
                                    })();
                                    return nextTermDates.start ? new Date(nextTermDates.start).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Monday, May 25, 2026";
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {school.reportShowSignatures && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginRight: "20px" }}>
                              <div style={{ width: "120px", height: "80px", border: "1px dashed #cbd5e1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5, marginBottom: "5px" }}>
                                <span style={{ fontSize: "10px", color: "#64748b" }}>School Stamp</span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })()
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
        {activeTab === "finance_overview" && school.packageType === "PREMIUM" && (() => {
          const totalCollected = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
          const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
          const netBalance = totalCollected - totalExpenses;
          const totalStudents = students.length;
          const paidStudents = students.filter(st => studentPayments.some(p => p.studentId === st.id)).length;
          const spMatched = schoolPayTransactions.filter(t => t.reconciled).length;
          const spUnmatched = schoolPayTransactions.filter(t => !t.reconciled).length;

          return (
          <div className="tab-content-anim">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h2 style={{ marginBottom: "4px" }}>Financial Overview & Accounts Ledger</h2>
                <p style={{ color: "#64748b" }}>Monitor term cash flows, balance sheets, and unified transactions timeline.</p>
              </div>
              {/* SchoolPay Sync Button */}
              {school.schoolPayCode && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>From:</span>
                    <input
                      type="date"
                      className="input-field"
                      style={{ fontSize: "12px", padding: "6px", width: "130px", background: "#f8fafc", color: "black", borderColor: "#cbd5e1" }}
                      value={spSyncStartDate}
                      onChange={(e) => setSpSyncStartDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>To:</span>
                    <input
                      type="date"
                      className="input-field"
                      style={{ fontSize: "12px", padding: "6px", width: "130px", background: "#f8fafc", color: "black", borderColor: "#cbd5e1" }}
                      value={spSyncEndDate}
                      onChange={(e) => setSpSyncEndDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <button
                      onClick={handleSchoolPaySync}
                      disabled={spSyncing}
                      className="btn btn-primary"
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                    >
                      <RefreshCw size={16} style={{ animation: spSyncing ? "spin 1s linear infinite" : "none" }} />
                      {spSyncing ? "Syncing..." : "Fetch Term Transactions"}
                    </button>
                    {spSyncMsg && <span style={{ fontSize: "12px", color: spSyncMsg.startsWith("✅") ? "var(--success)" : "var(--danger)" }}>{spSyncMsg}</span>}
                  </div>
                </div>
              )}
              {!school.schoolPayCode && (
                <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", color: "#92400e" }}>
                  <AlertTriangle size={14} style={{ display: "inline", marginRight: "4px" }} />
                  SchoolPay not configured. Go to <strong>School Profile</strong> to add credentials.
                </div>
              )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-2" style={{ marginBottom: "24px", marginTop: "20px" }}>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ArrowDownCircle size={28} color="var(--success)" />
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Collected</span>
                  <h3 style={{ margin: 0, color: "var(--success)" }}>{totalCollected.toLocaleString()} UGX</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ArrowUpCircle size={28} color="var(--danger)" />
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Expenditure</span>
                  <h3 style={{ margin: 0, color: "var(--danger)" }}>{totalExpenses.toLocaleString()} UGX</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <TrendingUp size={28} color={netBalance >= 0 ? "var(--primary)" : "var(--danger)"} />
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Net Balance in Hand</span>
                  <h3 style={{ margin: 0, color: netBalance >= 0 ? "var(--primary)" : "var(--danger)" }}>{netBalance.toLocaleString()} UGX</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Users size={24} color="var(--primary)" />
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>STUDENTS PAID</span>
                  <h3 style={{ margin: 0 }}>{paidStudents} / {totalStudents}</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <CheckCircle size={24} color="var(--success)" />
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>SCHOOLPAY MATCHED</span>
                  <h3 style={{ margin: 0, color: "var(--success)" }}>{spMatched}</h3>
                </div>
              </div>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <AlertTriangle size={24} color="var(--warning, #f59e0b)" />
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>UNMATCHED TRANSACTIONS</span>
                  <h3 style={{ margin: 0, color: spUnmatched > 0 ? "var(--danger)" : "#64748b" }}>{spUnmatched}</h3>
                </div>
              </div>
            </div>

            {/* Unified ledger */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                <h4 style={{ margin: 0 }}>Unified Ledger Timeline</h4>
                <button className="btn btn-outline" style={{ fontSize: "12px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => window.print()}>
                  <Printer size={14} /> Print Ledger
                </button>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category / Student</th>
                      <th>Description</th>
                      <th>Receipt / Ref</th>
                      <th>Amount (UGX)</th>
                      <th>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const items: any[] = [];
                      studentPayments.forEach(p => {
                        const stud = students.find(s => s.id === p.studentId);
                        items.push({ date: p.date, type: "INCOME", category: "Tuition Fee", desc: stud ? `${stud.name} â€” ${stud.studentNumber}` : "Fee payment", ref: p.receiptNumber || "REC-" + p.id.substring(0,8).toUpperCase(), amount: p.amountPaid, isIncome: true });
                      });
                      expenses.forEach(e => {
                        items.push({ date: e.date, type: "EXPENSE", category: e.category, desc: e.description, ref: "EXP-" + e.id.substring(0,8).toUpperCase(), amount: e.amount, isIncome: false });
                      });
                      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      
                      if (items.length === 0) return <tr><td colSpan={7} style={{ textAlign: "center", color: "#64748b" }}>No ledger transactions yet.</td></tr>;

                      let running = 0;
                      return items.reverse().map((item, idx) => {
                        running += item.isIncome ? item.amount : -item.amount;
                        return (
                          <tr key={idx}>
                            <td>{new Date(item.date).toLocaleDateString()}</td>
                            <td><span className={`badge ${item.isIncome ? "badge-success" : "badge-danger"}`}>{item.type}</span></td>
                            <td><strong>{item.category}</strong></td>
                            <td style={{ fontSize: "12px" }}>{item.desc}</td>
                            <td><code style={{ fontSize: "11px" }}>{item.ref}</code></td>
                            <td style={{ fontWeight: 700, color: item.isIncome ? "var(--success)" : "var(--danger)" }}>
                              {item.isIncome ? "+" : "-"}{item.amount.toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 600, color: running >= 0 ? "var(--primary)" : "var(--danger)" }}>{running.toLocaleString()}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

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
                    <select className="input-field" value={selectedFeeClassId} onChange={(e) => setSelectedFeeClassId(e.target.value)} required>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Day Student Tuition (UGX)</label>
                    <input type="number" className="input-field" placeholder="e.g. 450000" value={tuitionAmount} onChange={(e) => setTuitionAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Boarding Surcharge (UGX)</label>
                    <input type="number" className="input-field" placeholder="e.g. 700000" value={boardingAmount} onChange={(e) => setBoardingAmount(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Fee Rules</button>
                </form>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Current Fee Structures</h4>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Class</th><th>Day Tuition</th><th>Boarding Extra</th><th>Total (Boarding)</th></tr></thead>
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
                      {feeStructures.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No fee structures configured yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6C: STUDENT BILLING & PAYMENTS (Enhanced) */}
        {activeTab === "student_billing" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h2 style={{ marginBottom: "4px" }}>Student Fee Payments</h2>
                <p style={{ color: "#64748b" }}>Record, track, and manage student fee payments with full ledger history.</p>
              </div>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }} onClick={() => window.print()}>
                <Printer size={14} /> Print Collections
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "24px" }} className="flex-mobile-col">
              {/* Form */}
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>
                  <Receipt size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                  Record Fee Payment
                </h4>
                <form onSubmit={handleRecordStudentPay}>
                  <div className="form-group">
                    <label className="form-label">Student</label>
                    <select className="input-field" value={selectedPayStudentId} onChange={(e) => setSelectedPayStudentId(e.target.value)} required>
                      {students.map(s => {
                        const cl = classes.find(c => c.id === s.classId)?.name || "";
                        return <option key={s.id} value={s.id}>{s.name} â€” {cl} ({s.studentNumber})</option>;
                      })}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div className="form-group">
                      <label className="form-label">Term</label>
                      <select className="input-field" value={payTerm} onChange={(e) => setPayTerm(e.target.value)}>
                        <option value="1">Term 1</option>
                        <option value="2">Term 2</option>
                        <option value="3">Term 3</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <input type="number" className="input-field" value={payYear} onChange={(e) => setPayYear(e.target.value)} min="2020" max="2040" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid (UGX)</label>
                    <input type="number" className="input-field" placeholder="e.g. 300000" value={payAmountPaid} onChange={(e) => setPayAmountPaid(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Balance Brought Forward (UGX)</label>
                    <input type="number" className="input-field" placeholder="Arrears from prev term (0 if none)" value={payBBF} onChange={(e) => setPayBBF(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="SCHOOL_PAY">SchoolPay</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Receipt No. (auto if blank)</label>
                    <input type="text" className="input-field" placeholder="e.g. RCP-2026-001" value={payReceiptNum} onChange={(e) => setPayReceiptNum(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (optional)</label>
                    <input type="text" className="input-field" placeholder="e.g. Partial payment, balance next week" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                  </div>

                  {/* Quick balance preview */}
                  {selectedPayStudentId && (() => {
                    const stud = students.find(s => s.id === selectedPayStudentId);
                    if (!stud) return null;
                    const fs = feeStructures.find(f => f.classId === stud.classId);
                    const totalDue = stud.type === "BOARDING" ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0) : (fs?.tuitionAmount || 0);
                    const prevPaid = studentPayments.filter(p => p.studentId === stud.id && p.term === parseInt(payTerm) && p.year === parseInt(payYear)).reduce((s, p) => s + p.amountPaid, 0);
                    const bbf = parseFloat(payBBF) || 0;
                    const thisPay = parseFloat(payAmountPaid) || 0;
                    const remaining = Math.max(0, totalDue + bbf - prevPaid - thisPay);
                    return (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}><span>Fee Due (Term {payTerm}):</span><strong>{totalDue.toLocaleString()} UGX</strong></div>
                        {bbf > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "var(--danger)" }}><span>+ Arrears (BBF):</span><strong>{bbf.toLocaleString()} UGX</strong></div>}
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "var(--success)" }}><span>Previously Paid:</span><strong>{prevPaid.toLocaleString()} UGX</strong></div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #bbf7d0", paddingTop: "6px" }}><span><strong>Remaining After This Payment:</strong></span><strong style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>{remaining.toLocaleString()} UGX</strong></div>
                      </div>
                    );
                  })()}

                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Record Payment & Generate Receipt</button>
                </form>
              </div>

              {/* Collections Log */}
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Payment Collections Log</h4>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Receipt</th>
                        <th>Student</th>
                        <th>Class</th>
                        <th>Term/Yr</th>
                        <th>Method</th>
                        <th>BBF</th>
                        <th>Paid</th>
                        <th>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...studentPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => {
                        const stud = students.find(s => s.id === p.studentId);
                        const cl = classes.find(c => c.id === stud?.classId)?.name || "?";
                        return (
                          <tr key={p.id}>
                            <td>{new Date(p.date).toLocaleDateString()}</td>
                            <td><code style={{ fontSize: "10px" }}>{p.receiptNumber || "â€”"}</code></td>
                            <td><strong>{stud?.name}</strong></td>
                            <td>{cl}</td>
                            <td>T{p.term} {p.year}</td>
                            <td><span className="badge badge-primary" style={{ fontSize: "10px" }}>{p.paymentMethod || "CASH"}</span></td>
                            <td style={{ color: "var(--warning, #f59e0b)", fontSize: "12px" }}>{(p.balanceBF || 0) > 0 ? `+${(p.balanceBF || 0).toLocaleString()}` : "â€”"}</td>
                            <td style={{ color: "var(--success)", fontWeight: "bold" }}>+{p.amountPaid.toLocaleString()}</td>
                            <td><span className={`badge ${p.balance > 0 ? "badge-danger" : "badge-success"}`}>{p.balance > 0 ? `${p.balance.toLocaleString()}` : "Cleared"}</span></td>
                          </tr>
                        );
                      })}
                      {studentPayments.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", color: "#64748b" }}>No payments recorded yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        
              {showInvoiceModal && invoiceStudent && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: "600px" }}>
                    <div id="printable-invoice" style={{ padding: "20px", color: "#1e293b", fontFamily: "sans-serif" }}>
                      {/* Invoice Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: "50px", height: "50px", objectFit: "contain" }} />}
                          <div>
                            <h2 style={{ margin: 0, fontSize: "18px", color: "var(--primary)" }}>{school.name}</h2>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{school.poBox || ""}</p>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{school.contactEmail || ""}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <h1 style={{ margin: 0, fontSize: "24px", color: "#0f172a", textTransform: "uppercase", letterSpacing: "2px" }}>INVOICE</h1>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>Receipt #: {invoiceStudent.payment.receiptNumber || "N/A"}</p>
                          <p style={{ margin: 0, fontSize: "12px" }}>Date: {new Date(invoiceStudent.payment.date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Bill To */}
                      <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Billed To:</p>
                          <h4 style={{ margin: "4px 0" }}>{invoiceStudent.student?.name}</h4>
                          <p style={{ margin: 0, fontSize: "13px" }}>Class: {invoiceStudent.class}</p>
                          <p style={{ margin: 0, fontSize: "13px" }}>Type: {invoiceStudent.student?.type}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Academic Period:</p>
                          <h4 style={{ margin: "4px 0" }}>Term {invoiceStudent.payment.term} - {invoiceStudent.payment.year}</h4>
                        </div>
                      </div>

                      {/* Ledger Details */}
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                            <th style={{ padding: "10px", fontSize: "12px", color: "#475569" }}>Description</th>
                            <th style={{ padding: "10px", fontSize: "12px", color: "#475569", textAlign: "right" }}>Amount (UGX)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* We deduce total due based on balance + amountPaid - BBF */}
                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "12px 10px", fontSize: "13px" }}>
                              <strong>Tuition & Required Fees</strong><br/>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>Standard fees for the selected term</span>
                            </td>
                            <td style={{ padding: "12px 10px", fontSize: "13px", textAlign: "right" }}>
                              {((invoiceStudent.payment.balance + invoiceStudent.payment.amountPaid) - (invoiceStudent.payment.balanceBF || 0)).toLocaleString()}
                            </td>
                          </tr>
                          {(invoiceStudent.payment.balanceBF || 0) > 0 && (
                            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "12px 10px", fontSize: "13px" }}>
                                <strong>Balance Brought Forward (Arrears)</strong><br/>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>Unpaid fees from previous terms</span>
                              </td>
                              <td style={{ padding: "12px 10px", fontSize: "13px", textAlign: "right", color: "var(--danger)" }}>
                                +{(invoiceStudent.payment.balanceBF || 0).toLocaleString()}
                              </td>
                            </tr>
                          )}
                          <tr style={{ background: "#f0fdf4" }}>
                            <td style={{ padding: "12px 10px", fontSize: "13px", fontWeight: "bold", color: "#166534" }}>
                              Payment Received ({invoiceStudent.payment.paymentMethod || "CASH"})
                            </td>
                            <td style={{ padding: "12px 10px", fontSize: "13px", textAlign: "right", fontWeight: "bold", color: "#166534" }}>
                              -{(invoiceStudent.payment.amountPaid || 0).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Summary */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: "50%", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                            <span>Total Due:</span>
                            <strong>{(invoiceStudent.payment.balance + invoiceStudent.payment.amountPaid).toLocaleString()} UGX</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#166534" }}>
                            <span>Total Paid:</span>
                            <strong>{invoiceStudent.payment.amountPaid.toLocaleString()} UGX</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #cbd5e1", paddingTop: "8px", fontSize: "16px" }}>
                            <strong>Balance Remaining:</strong>
                            <strong style={{ color: invoiceStudent.payment.balance > 0 ? "var(--danger)" : "var(--success)" }}>
                              {invoiceStudent.payment.balance.toLocaleString()} UGX
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ marginTop: "40px", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Thank you for your payment.</p>
                        <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#94a3b8" }}>System generated invoice by School System ERP</p>
                      </div>
                    </div>
                    
                    {/* Modal Controls */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                      <button className="btn btn-outline" onClick={() => setShowInvoiceModal(false)}>Close</button>
                      <button className="btn btn-primary" onClick={() => {
                        const printContent = document.getElementById("printable-invoice");
                        if (!printContent) return;
                        const windowPrint = window.open('', '', 'width=900,height=650');
                        if (!windowPrint) return;
                        windowPrint.document.write('<html><head><title>Print Invoice</title>');
                        windowPrint.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; }</style>');
                        windowPrint.document.write('</head><body>');
                        windowPrint.document.write(printContent.innerHTML);
                        windowPrint.document.write('</body></html>');
                        windowPrint.document.close();
                        windowPrint.focus();
                        setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 250);
                      }}>
                        <Printer size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} /> Print PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}


        {/* TAB 6D: FEE DEFAULTERS (Enhanced) */}
        {activeTab === "defaulters_list" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h2 style={{ marginBottom: "4px" }}>Fee Defaulters Directory</h2>
                <p style={{ color: "#64748b" }}>Track students with outstanding balances including arrears (BBF) from prior terms.</p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <select className="input-field" style={{ width: "auto", fontSize: "12px" }} value={finFilterTerm} onChange={e => setFinFilterTerm(e.target.value)}>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
                <input type="number" className="input-field" style={{ width: "80px", fontSize: "12px" }} value={finFilterYear} onChange={e => setFinFilterYear(e.target.value)} />
                <button className="btn btn-outline" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => window.print()}>
                  <Printer size={14} /> Print Defaulters
                </button>
              </div>
            </div>

            <div className="card">
              {(() => {
                const rows = students.map(st => {
                  const fs = feeStructures.find(f => f.classId === st.classId);
                  const totalDue = st.type === "BOARDING" ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0) : (fs?.tuitionAmount || 0);
                  const pays = studentPayments.filter(p => p.studentId === st.id && p.term === parseInt(finFilterTerm) && p.year === parseInt(finFilterYear));
                  const totalPaid = pays.reduce((sum, p) => sum + p.amountPaid, 0);
                  const maxBBF = pays.reduce((max, p) => Math.max(max, p.balanceBF || 0), 0);
                  const balance = Math.max(0, totalDue + maxBBF - totalPaid);
                  const cl = classes.find(c => c.id === st.classId)?.name || "N/A";
                  const strm = streams.find(s => s.id === st.streamId)?.name || "N/A";
                  return { st, totalDue, totalPaid, balance, maxBBF, cl, strm };
                }).sort((a, b) => b.balance - a.balance);

                const totalOutstanding = rows.reduce((sum, r) => sum + r.balance, 0);

                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
                      <h4 style={{ margin: 0 }}>Outstanding Balances â€” Term {finFilterTerm} {finFilterYear}</h4>
                      <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", padding: "6px 14px", fontSize: "13px", fontWeight: 700, color: "var(--danger)" }}>
                        Total Outstanding: {totalOutstanding.toLocaleString()} UGX
                      </div>
                    </div>
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Student No.</th>
                            <th>Name</th>
                            <th>Class</th>
                            <th>Type</th>
                            <th>Fee Due</th>
                            <th>Arrears (BBF)</th>
                            <th>Paid</th>
                            <th>Balance</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(({ st, totalDue, totalPaid, balance, maxBBF, cl, strm }, idx) => (
                            <tr key={st.id} style={{ background: balance > 0 ? (idx % 2 === 0 ? "#fff5f5" : "#fff") : "inherit" }}>
                              <td>{idx + 1}</td>
                              <td><code>{st.studentNumber}</code></td>
                              <td><strong>{st.name}</strong></td>
                              <td>{cl} / {strm}</td>
                              <td><span className={`badge ${st.type === "BOARDING" ? "badge-warning" : "badge-primary"}`}>{st.type}</span></td>
                              <td>{totalDue.toLocaleString()}</td>
                              <td style={{ color: maxBBF > 0 ? "var(--danger)" : "#64748b" }}>{maxBBF > 0 ? `+${maxBBF.toLocaleString()}` : "â€”"}</td>
                              <td style={{ color: "var(--success)" }}>{totalPaid.toLocaleString()}</td>
                              <td><strong style={{ color: balance > 0 ? "var(--danger)" : "var(--success)" }}>{balance > 0 ? balance.toLocaleString() : "Cleared"}</strong></td>
                              <td><span className={`badge ${balance > 0 ? "badge-danger" : "badge-success"}`}>{balance > 0 ? "OWING" : "PAID"}</span></td>
                              <td>
                                {balance > 0 ? (
                                  <button onClick={() => { setSelectedPayStudentId(st.id); setActiveTab("student_billing"); }} className="btn btn-outline" style={{ padding: "4px 10px", fontSize: "11px", borderColor: "var(--primary)", color: "var(--primary)" }}>
                                    Collect
                                  </button>
                                ) : (
                                  <span style={{ color: "var(--success)", fontSize: "12px" }}>âœ“ Full</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {rows.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", color: "#64748b" }}>No students registered.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 6E: EXPENDITURES */}
        {activeTab === "expenditures" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "10px" }}>School Expenditures</h2>
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Log utility bills, purchases, repairs, and general operational expenses.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Record Expense</h4>
                <form onSubmit={handleCreateExpense}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="input-field" value={expCategory} onChange={(e) => setExpCategory(e.target.value)} required>
                      <option value="Salaries">Staff Wages / Salaries</option>
                      <option value="Food & Boarding">Food & Boarding Supplies</option>
                      <option value="Academics">Books, Chalk & Stationery</option>
                      <option value="Utilities">Water, Power & Repairs</option>
                      <option value="Transport">Transport & Fuel</option>
                      <option value="Construction">Buildings & Construction</option>
                      <option value="Other">Miscellaneous</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (UGX)</label>
                    <input type="number" className="input-field" placeholder="e.g. 180000" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input type="text" className="input-field" placeholder="e.g. Purchase of library chalk" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Log Expense</button>
                </form>
              </div>
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>Expenditure Log</h4>
                  <button className="btn btn-outline" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => window.print()}>
                    <Printer size={14} /> Print
                  </button>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount (UGX)</th></tr></thead>
                    <tbody>
                      {[...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleDateString()}</td>
                          <td><strong>{e.category}</strong></td>
                          <td>{e.description}</td>
                          <td style={{ color: "var(--danger)", fontWeight: "bold" }}>-{e.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      {expenses.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No expenses logged yet.</td></tr>}
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
            <p style={{ color: "#64748b", marginBottom: "30px" }}>Disburse and record monthly wages for teachers and administrative staff.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }} className="flex-mobile-col">
              <div className="card" style={{ height: "fit-content" }}>
                <h4 style={{ marginBottom: "16px" }}>Process Salary Payout</h4>
                <form onSubmit={handleProcessSalary}>
                  <div className="form-group">
                    <label className="form-label">Staff Member</label>
                    <select className="input-field" value={payTeacherId} onChange={(e) => setPayTeacherId(e.target.value)} required>
                      <option value="">-- Choose staff --</option>
                      {users.filter(u => u.schoolId === school.id && u.role !== "ADMIN").map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <div className="form-group">
                      <label className="form-label">Month</label>
                      <select className="input-field" value={payMonthName} onChange={(e) => setPayMonthName(e.target.value)}>
                        {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Net Payout (UGX)</label>
                      <input type="number" className="input-field" placeholder="e.g. 600000" value={paySalaryAmount} onChange={(e) => setPaySalaryAmount(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Disburse Wages</button>
                </form>
              </div>
              <div className="card">
                <h4 style={{ marginBottom: "16px" }}>Processed Salary History</h4>
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Month</th><th>Staff Details</th><th>Amount Paid</th></tr></thead>
                    <tbody>
                      {expenses.filter(e => e.category === "Salaries").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                        <tr key={e.id}>
                          <td>{new Date(e.date).toLocaleDateString()}</td>
                          <td><strong>{e.description.includes("(") ? e.description.substring(e.description.indexOf("(")+1, e.description.indexOf(")")) : "N/A"}</strong></td>
                          <td>{e.description}</td>
                          <td style={{ color: "var(--danger)", fontWeight: "bold" }}>-{e.amount.toLocaleString()} UGX</td>
                        </tr>
                      ))}
                      {expenses.filter(e => e.category === "Salaries").length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: "#64748b" }}>No payroll records yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6G: SCHOOLPAY REGISTER */}
        {activeTab === "schoolpay_register" && school.packageType === "PREMIUM" && (
          <div className="tab-content-anim">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ marginBottom: "4px" }}>SchoolPay Transaction Register</h2>
                <p style={{ color: "#64748b" }}>All transactions imported from SchoolPay. Matched transactions automatically update student payment records.</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <select className="input-field" style={{ width: "auto", fontSize: "12px" }} value={spTxFilter} onChange={e => setSpTxFilter(e.target.value as any)}>
                  <option value="ALL">All Transactions</option>
                  <option value="MATCHED">Matched Only</option>
                  <option value="UNMATCHED">Unmatched Only</option>
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>From:</span>
                  <input
                    type="date"
                    className="input-field"
                    style={{ fontSize: "12px", padding: "6px", width: "130px", background: "#f8fafc", color: "black", borderColor: "#cbd5e1" }}
                    value={spSyncStartDate}
                    onChange={(e) => setSpSyncStartDate(e.target.value)}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold" }}>To:</span>
                  <input
                    type="date"
                    className="input-field"
                    style={{ fontSize: "12px", padding: "6px", width: "130px", background: "#f8fafc", color: "black", borderColor: "#cbd5e1" }}
                    value={spSyncEndDate}
                    onChange={(e) => setSpSyncEndDate(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSchoolPaySync}
                  disabled={spSyncing}
                  className="btn btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <RefreshCw size={15} style={{ animation: spSyncing ? "spin 1s linear infinite" : "none" }} />
                  {spSyncing ? "Fetching..." : "Fetch Term Transactions"}
                </button>
              </div>
            </div>

            {spSyncMsg && (
              <div style={{ marginBottom: "16px", padding: "10px 16px", borderRadius: "8px", background: spSyncMsg.startsWith("✅") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${spSyncMsg.startsWith("✅") ? "#bbf7d0" : "#fca5a5"}`, color: spSyncMsg.startsWith("✅") ? "#166534" : "#991b1b", fontSize: "13px" }}>
                {spSyncMsg}
              </div>
            )}

            {!school.schoolPayCode && (
              <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "10px", padding: "20px", marginBottom: "20px", textAlign: "center" }}>
                <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: "8px" }} />
                <h4>SchoolPay Not Configured</h4>
                <p style={{ color: "#92400e" }}>Go to <strong>School Profile & Theme</strong> settings and enter your SchoolPay API Code and Password to enable automatic transaction syncing.</p>
                <button className="btn btn-primary" style={{ marginTop: "8px" }} onClick={() => setActiveTab("school_profile")}>Configure Now</button>
              </div>
            )}

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                  <span style={{ color: "var(--success)", fontWeight: 700 }}>✅ Matched: {schoolPayTransactions.filter(t => t.reconciled).length}</span>
                  <span style={{ color: "var(--danger)", fontWeight: 700 }}>❌ Unmatched: {schoolPayTransactions.filter(t => !t.reconciled).length}</span>
                  <span style={{ color: "#64748b" }}>Total: {schoolPayTransactions.length}</span>
                </div>
                <button className="btn btn-outline" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => window.print()}>
                  <Printer size={14} /> Print Register
                </button>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Receipt No.</th>
                      <th>Student Name</th>
                      <th>Payment Code</th>
                      <th>Class</th>
                      <th>Channel</th>
                      <th>Amount (UGX)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolPayTransactions
                      .filter(t => spTxFilter === "ALL" ? true : spTxFilter === "MATCHED" ? t.reconciled : !t.reconciled)
                      .map(tx => (
                        <tr key={tx.id}>
                          <td>{new Date(tx.paymentDate).toLocaleDateString()}</td>
                          <td><code style={{ fontSize: "10px" }}>{tx.receiptNumber}</code></td>
                          <td><strong>{tx.studentName}</strong></td>
                          <td><code style={{ fontSize: "10px" }}>{tx.studentPaymentCode}</code></td>
                          <td>{tx.studentClass || "—"}</td>
                          <td><span className="badge badge-primary" style={{ fontSize: "10px" }}>{tx.sourcePaymentChannel || "SchoolPay"}</span></td>
                          <td style={{ fontWeight: 700, color: "var(--success)" }}>{tx.amount.toLocaleString()}</td>
                          <td>
                            {tx.reconciled
                              ? <span className="badge badge-success">✅ Matched</span>
                              : (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span className="badge badge-danger">Unmatched</span>
                                  <button
                                    onClick={() => {
                                      setAutoImportTx(tx);
                                      setAutoImportClassId(classes[0]?.id || "");
                                      setAutoImportStreamId(streams[0]?.id || "");
                                      setShowAutoImportModal(true);
                                    }}
                                    className="btn btn-outline"
                                    style={{ fontSize: "10px", padding: "2px 6px", borderColor: "var(--primary)", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}
                                    title="Add this student to the system and record payment"
                                  >
                                    <PlusCircle size={12} /> Import
                                  </button>
                                  <select
                                    className="input-field"
                                    style={{ fontSize: "10px", padding: "2px 4px", width: "120px", height: "auto" }}
                                    defaultValue=""
                                    onChange={async (e) => {
                                      if (!e.target.value || !school) return;
                                      // Manually match by recording a student payment
                                      const stud = students.find(s => s.id === e.target.value);
                                      if (!stud) return;
                                      const term = school.currentTerm || 1;
                                      const year = school.currentYear || new Date().getFullYear();

                                      const fs = feeStructures.find(f => f.classId === stud.classId);
                                      const totalDue = stud.type === "BOARDING"
                                        ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
                                        : (fs?.tuitionAmount || 0);

                                      const prevPayments = studentPayments.filter(p => p.studentId === stud.id && p.term === term && p.year === year);
                                      const alreadyPaid = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);
                                      const balance = Math.max(0, totalDue - (alreadyPaid + tx.amount));

                                      await recordStudentPayment({
                                        studentId: stud.id,
                                        term,
                                        year,
                                        amountPaid: tx.amount,
                                        balance,
                                        paymentMethod: "SCHOOL_PAY",
                                        receiptNumber: tx.receiptNumber,
                                        notes: `Auto-matched from SchoolPay transaction`,
                                      });
                                      // Refresh
                                      const spay = await getStudentPayments(school.id);
                                      setStudentPayments(spay);
                                      toast.success(`Matched to ${stud.name} and recorded!`);
                                    }}
                                  >
                                    <option value="">Match to student...</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentNumber})</option>)}
                                  </select>
                                </div>
                              )
                            }
                          </td>
                        </tr>
                      ))
                    }
                    {schoolPayTransactions.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>
                        No SchoolPay transactions yet. Click "Fetch Today's Transactions" to sync.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6H: FINANCIAL REPORTS */}
        {activeTab === "fin_reports" && school.packageType === "PREMIUM" && (() => {
          const totalIncome = studentPayments.reduce((s, p) => s + p.amountPaid, 0);
          const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
          const netProfit = totalIncome - totalExpense;
          const salaryExp = expenses.filter(e => e.category === "Salaries").reduce((s, e) => s + e.amount, 0);
          const foodExp = expenses.filter(e => e.category === "Food & Boarding").reduce((s, e) => s + e.amount, 0);
          const acadExp = expenses.filter(e => e.category === "Academics").reduce((s, e) => s + e.amount, 0);
          const utilExp = expenses.filter(e => e.category === "Utilities").reduce((s, e) => s + e.amount, 0);
          const otherExp = expenses.filter(e => !["Salaries","Food & Boarding","Academics","Utilities"].includes(e.category)).reduce((s, e) => s + e.amount, 0);

          const printReport = (reportId: string) => {
            const el = document.getElementById(reportId);
            if (!el) return;
            const w = window.open("", "_blank");
            if (!w) return;
            w.document.write(`<html><head><title>Financial Report â€” ${school.name}</title><style>
              body{font-family:Arial,sans-serif;font-size:13px;margin:20px;color:#1e293b}
              h1{font-size:20px;text-align:center} h2{font-size:16px} h3{font-size:14px}
              table{width:100%;border-collapse:collapse;margin-top:10px}
              th,td{border:1px solid #94a3b8;padding:8px;text-align:left}
              th{background:#1e3a8a;color:white} tr:nth-child(even){background:#f8fafc}
              .total{font-weight:bold;background:#e0f2fe}
              .positive{color:#16a34a} .negative{color:#dc2626}
              .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #1e3a8a;padding-bottom:10px}
              @media print{button{display:none}}
            </style></head><body>`);
            w.document.write(el.innerHTML);
            w.document.write(`</body></html>`);
            w.document.close();
            w.print();
          };

          return (
          <div className="tab-content-anim">
            <h2 style={{ marginBottom: "4px" }}>Financial Reports</h2>
            <p style={{ color: "#64748b", marginBottom: "24px" }}>Printable financial reports for audit, management, and compliance purposes.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="flex-mobile-col">

              {/* Income & Expenditure Statement */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>Income & Expenditure Statement</h4>
                  <button className="btn btn-outline" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => printReport("report-income-expenditure")}>
                    <Printer size={13} /> Print
                  </button>
                </div>
                <div id="report-income-expenditure">
                  <div className="header" style={{ textAlign: "center", marginBottom: "12px" }}>
                    <strong>{school.name}</strong><br />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>Income & Expenditure Statement</span>
                  </div>
                  <table className="table">
                    <tbody>
                      <tr style={{ background: "#f0fdf4" }}><td colSpan={2}><strong>INCOME</strong></td></tr>
                      <tr><td>Tuition Fees Collected</td><td style={{ fontWeight: 700, color: "var(--success)" }}>{totalIncome.toLocaleString()} UGX</td></tr>
                      <tr style={{ background: "#f0fdf4", fontWeight: 700 }}><td>Total Income</td><td style={{ color: "var(--success)" }}>{totalIncome.toLocaleString()} UGX</td></tr>
                      <tr style={{ background: "#fef2f2" }}><td colSpan={2}><strong>EXPENDITURE</strong></td></tr>
                      <tr><td>Staff Salaries & Wages</td><td style={{ color: "var(--danger)" }}>{salaryExp.toLocaleString()} UGX</td></tr>
                      <tr><td>Food & Boarding Supplies</td><td style={{ color: "var(--danger)" }}>{foodExp.toLocaleString()} UGX</td></tr>
                      <tr><td>Academic Materials</td><td style={{ color: "var(--danger)" }}>{acadExp.toLocaleString()} UGX</td></tr>
                      <tr><td>Utilities & Repairs</td><td style={{ color: "var(--danger)" }}>{utilExp.toLocaleString()} UGX</td></tr>
                      <tr><td>Other Expenses</td><td style={{ color: "var(--danger)" }}>{otherExp.toLocaleString()} UGX</td></tr>
                      <tr style={{ background: "#fef2f2", fontWeight: 700 }}><td>Total Expenditure</td><td style={{ color: "var(--danger)" }}>{totalExpense.toLocaleString()} UGX</td></tr>
                      <tr style={{ background: netProfit >= 0 ? "#f0fdf4" : "#fef2f2", fontWeight: 700, fontSize: "15px" }}>
                        <td>{netProfit >= 0 ? "SURPLUS (Profit)" : "DEFICIT (Loss)"}</td>
                        <td style={{ color: netProfit >= 0 ? "var(--success)" : "var(--danger)" }}>{netProfit.toLocaleString()} UGX</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fee Collection Summary */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>Fee Collection Summary</h4>
                  <button className="btn btn-outline" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => printReport("report-fee-collection")}>
                    <Printer size={13} /> Print
                  </button>
                </div>
                <div id="report-fee-collection">
                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <strong>{school.name}</strong><br />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>Fee Collection Summary by Class</span>
                  </div>
                  <table className="table">
                    <thead><tr><th>Class</th><th>Students</th><th>Expected</th><th>Collected</th><th>Outstanding</th><th>%</th></tr></thead>
                    <tbody>
                      {classes.map(cl => {
                        const clStudents = students.filter(s => s.classId === cl.id);
                        const fs = feeStructures.find(f => f.classId === cl.id);
                        const expected = clStudents.reduce((sum, s) => sum + (s.type === "BOARDING" ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0) : (fs?.tuitionAmount || 0)), 0);
                        const collected = studentPayments.filter(p => clStudents.some(s => s.id === p.studentId)).reduce((s, p) => s + p.amountPaid, 0);
                        const outstanding = Math.max(0, expected - collected);
                        const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
                        return (
                          <tr key={cl.id}>
                            <td><strong>{cl.name}</strong></td>
                            <td>{clStudents.length}</td>
                            <td>{expected.toLocaleString()}</td>
                            <td style={{ color: "var(--success)", fontWeight: 700 }}>{collected.toLocaleString()}</td>
                            <td style={{ color: outstanding > 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>{outstanding.toLocaleString()}</td>
                            <td><span style={{ background: pct >= 80 ? "#dcfce7" : pct >= 50 ? "#fef3c7" : "#fee2e2", color: pct >= 80 ? "#166534" : pct >= 50 ? "#92400e" : "#991b1b", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "12px" }}>{pct}%</span></td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 700, background: "#e0f2fe" }}>
                        <td>TOTAL</td>
                        <td>{students.length}</td>
                        <td>{feeStructures.reduce((s, fs) => { const cls = students.filter(st => st.classId === fs.classId); return s + cls.reduce((ss, st) => ss + (st.type === "BOARDING" ? fs.tuitionAmount + fs.boardingAmount : fs.tuitionAmount), 0); }, 0).toLocaleString()}</td>
                        <td style={{ color: "var(--success)" }}>{totalIncome.toLocaleString()}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Outstanding Balances / Debtors Report */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>Debtors / Outstanding Balances Report</h4>
                  <button className="btn btn-outline" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => printReport("report-debtors")}>
                    <Printer size={13} /> Print
                  </button>
                </div>
                <div id="report-debtors">
                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <strong>{school.name}</strong><br />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>Outstanding Fees â€” Debtors List</span>
                  </div>
                  <table className="table">
                    <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Type</th><th>Total Due</th><th>Paid</th><th>Balance</th></tr></thead>
                    <tbody>
                      {students.filter(st => {
                        const fs = feeStructures.find(f => f.classId === st.classId);
                        const due = st.type === "BOARDING" ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0) : (fs?.tuitionAmount || 0);
                        const paid = studentPayments.filter(p => p.studentId === st.id).reduce((s, p) => s + p.amountPaid, 0);
                        return paid < due;
                      }).sort((a, b) => {
                        const getbal = (st: Student) => { const fs = feeStructures.find(f => f.classId === st.classId); const due = st.type === "BOARDING" ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0) : (fs?.tuitionAmount || 0); const paid = studentPayments.filter(p => p.studentId === st.id).reduce((s, p) => s + p.amountPaid, 0); return due - paid; };
                        return getbal(b) - getbal(a);
                      }).map((st, idx) => {
                        const fs = feeStructures.find(f => f.classId === st.classId);
                        const due = st.type === "BOARDING" ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0) : (fs?.tuitionAmount || 0);
                        const paid = studentPayments.filter(p => p.studentId === st.id).reduce((s, p) => s + p.amountPaid, 0);
                        const balance = due - paid;
                        const cl = classes.find(c => c.id === st.classId)?.name || "?";
                        return (
                          <tr key={st.id}>
                            <td>{idx + 1}</td>
                            <td><strong>{st.name}</strong><br /><code style={{ fontSize: "10px" }}>{st.studentNumber}</code></td>
                            <td>{cl}</td>
                            <td>{st.type}</td>
                            <td>{due.toLocaleString()}</td>
                            <td style={{ color: "var(--success)" }}>{paid.toLocaleString()}</td>
                            <td style={{ color: "var(--danger)", fontWeight: 700 }}>{balance.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>Expense Breakdown Report</h4>
                  <button className="btn btn-outline" style={{ fontSize: "11px", padding: "4px 10px" }} onClick={() => printReport("report-expenses")}>
                    <Printer size={13} /> Print
                  </button>
                </div>
                <div id="report-expenses">
                  <div style={{ textAlign: "center", marginBottom: "12px" }}>
                    <strong>{school.name}</strong><br />
                    <span style={{ color: "#64748b", fontSize: "12px" }}>Expenditure Breakdown Report</span>
                  </div>
                  <table className="table">
                    <thead><tr><th>Category</th><th>Transactions</th><th>Total (UGX)</th><th>% of Total</th></tr></thead>
                    <tbody>
                      {["Salaries","Food & Boarding","Academics","Utilities","Transport","Construction","Other"].map(cat => {
                        const catExp = expenses.filter(e => cat === "Other" ? !["Salaries","Food & Boarding","Academics","Utilities","Transport","Construction"].includes(e.category) : e.category === cat);
                        const total = catExp.reduce((s, e) => s + e.amount, 0);
                        if (total === 0 && cat === "Other") return null;
                        const pct = totalExpense > 0 ? ((total / totalExpense) * 100).toFixed(1) : "0";
                        return (
                          <tr key={cat}>
                            <td><strong>{cat}</strong></td>
                            <td>{catExp.length}</td>
                            <td style={{ color: "var(--danger)", fontWeight: 700 }}>{total.toLocaleString()}</td>
                            <td>{pct}%</td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 700, background: "#e0f2fe" }}><td>TOTAL</td><td>{expenses.length}</td><td style={{ color: "var(--danger)" }}>{totalExpense.toLocaleString()}</td><td>100%</td></tr>
                    </tbody>
                  </table>
                  <div style={{ marginTop: "16px" }}>
                    <h5 style={{ marginBottom: "8px" }}>All Expense Transactions</h5>
                    <table className="table">
                      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
                      <tbody>
                        {[...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                          <tr key={e.id}><td>{new Date(e.date).toLocaleDateString()}</td><td>{e.category}</td><td>{e.description}</td><td style={{ color: "var(--danger)" }}>{e.amount.toLocaleString()}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
          );
        })()}
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
                      const amount = school.packageType === "PREMIUM" ? 500000 : 200000;
                      handleTriggerMoMoPayment(amount, "PACKAGE");
                    }} 
                    className="btn btn-primary hover-scale" 
                    style={{ width: "100%", padding: "12px" }}
                  >
                    💳 Renew / Extend Subscription (1 Year)
                  </button>
                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", textAlign: "center" }}>
                    Basic Plan: 200,000 UGX/Term | Premium Plan: 500,000 UGX/Term
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
        {activeTab === "sms" && ["ADMIN", "HEADTEACHER", "DOS", "DIRECTOR"].includes(currentUser.role) && (
          <div className="tab-content-anim">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h2 style={{ marginBottom: "4px" }}>📱 SMS Broadcast Center</h2>
                <p style={{ color: "#64748b", margin: 0 }}>Send SMS messages to parents and staff. Cost: <strong>40 UGX/SMS</strong></p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }} className="flex-mobile-col">
              {/* LEFT: Compose Form */}
              <div className="card" style={{ background: "white" }}>
                <h4 style={{ marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}>
                  <MessageSquare size={18} /> Compose & Send SMS
                </h4>

                {/* Audience */}
                <div className="form-group">
                  <label className="form-label">📣 Recipient Audience</label>
                  <select className="input-field" value={smsGroup} onChange={(e) => setSmsGroup(e.target.value)}>
                    <option value="CLASS_PARENTS">Parents of a Specific Class / Stream</option>
                    <option value="ALL_TEACHERS">All Teachers / Staff</option>
                    <option value="ALL">Everyone (All Parents + Staff)</option>
                    <option value="MANUAL">Enter Contacts Manually</option>
                  </select>
                </div>

                {/* Class selector (only when CLASS_PARENTS) */}
                {smsGroup === "CLASS_PARENTS" && (
                  <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "16px" }}>
                    <div className="form-group">
                      <label className="form-label">🏫 Select Class</label>
                      <select 
                        className="input-field" 
                        value={smsTargetClassId} 
                        onChange={(e) => {
                          setSmsTargetClassId(e.target.value);
                          setSmsTargetStreamId(""); // reset stream on class change
                        }}
                      >
                        {classes.map(c => {
                          const classStudents = students.filter(s => s.classId === c.id && s.parentContact);
                          return <option key={c.id} value={c.id}>{c.name} ({classStudents.length} contacts)</option>;
                        })}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">🌊 Select Stream</label>
                      <select 
                        className="input-field" 
                        value={smsTargetStreamId} 
                        onChange={(e) => setSmsTargetStreamId(e.target.value)}
                      >
                        <option value="">All Streams</option>
                        {streams.filter(st => st.classId === smsTargetClassId).map(st => {
                          const streamStudents = students.filter(s => s.classId === smsTargetClassId && s.streamId === st.id && s.parentContact);
                          return <option key={st.id} value={st.id}>{st.name} ({streamStudents.length} contacts)</option>;
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Manual contacts input */}
                {smsGroup === "MANUAL" && (
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">📱 Enter Contacts Manually</label>
                    <textarea
                      className="input-field"
                      style={{ minHeight: "80px", fontFamily: "var(--font-sans)", resize: "none" }}
                      placeholder="e.g. 0771234567, 0701234567, +256782222222 (separate by commas, spaces, or newlines)"
                      value={smsManualContacts}
                      onChange={(e) => setSmsManualContacts(e.target.value)}
                    />
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                      Provide list of recipient phone numbers.
                    </div>
                  </div>
                )}

                {/* Message Template */}
                <div className="form-group">
                  <label className="form-label">📝 Load Template</label>
                  <select className="input-field" value={smsTemplate} onChange={(e) => {
                    const val = e.target.value;
                    setSmsTemplate(val);
                    if (val === "defaulter") setSmsMessage(`Dear Parent, this is a reminder from ${school?.name} that your child's school fees remain outstanding. Please clear urgently. Thank you.`);
                    else if (val === "report") setSmsMessage(`Dear Parent, Academic Report Cards for this term have been finalized. Please collect from the school office. DOS, ${school?.name}.`);
                    else if (val === "welcome") setSmsMessage(`Welcome back to ${school?.name}! We look forward to a productive term. Please ensure your child reports on time.`);
                    else if (val === "meeting") setSmsMessage(`Dear Parent/Guardian, you are invited to a Parent-Teacher meeting at ${school?.name} on [DATE] at [TIME]. Please attend.`);
                    else setSmsMessage("");
                  }}>
                    <option value="">-- Choose a template --</option>
                    <option value="defaulter">🔴 Fee Defaulter Reminder</option>
                    <option value="report">📋 Report Cards Release</option>
                    <option value="welcome">🎉 New Term Welcome</option>
                    <option value="meeting">📅 Parent-Teacher Meeting</option>
                  </select>
                </div>

                {/* Message textarea */}
                <div className="form-group">
                  <label className="form-label">✉️ Message (max 320 characters = 2 SMS units)</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: "100px", fontFamily: "var(--font-sans)", resize: "none" }}
                    maxLength={320}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Write your message here..."
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    <span>{smsMessage.length}/320 characters</span>
                    <span>{smsMessage.length <= 160 ? "1 SMS unit" : "2 SMS units"} per recipient</span>
                  </div>
                </div>

                {/* Live cost calculator */}
                {(() => {
                  let recipients: string[] = [];
                  if (smsGroup === "CLASS_PARENTS") {
                    recipients = students.filter(s => {
                      const matchClass = s.classId === smsTargetClassId;
                      const matchStream = !smsTargetStreamId || s.streamId === smsTargetStreamId;
                      return matchClass && matchStream && s.parentContact;
                    }).map(s => s.parentContact!);
                  } else if (smsGroup === "ALL_TEACHERS") {
                    recipients = users.filter(u => u.contact).map(u => u.contact!);
                  } else if (smsGroup === "MANUAL") {
                    recipients = smsManualContacts.split(/[\s,;\n]+/)
                      .map(p => p.trim())
                      .filter(p => p.length > 0);
                  } else {
                    const parentContacts = students.filter(s => s.parentContact).map(s => s.parentContact!);
                    const staffContacts = users.filter(u => u.contact).map(u => u.contact!);
                    recipients = [...new Set([...parentContacts, ...staffContacts])];
                  }
                  const smsUnits = smsMessage.length <= 160 ? 1 : 2;
                  const totalCost = recipients.length * smsUnits * 40;
                  return (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "8px", color: "#0f172a", fontSize: "13px" }}>📊 Cost Estimate</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        <span style={{ color: "#64748b" }}>Recipients with contacts:</span>
                        <span style={{ fontWeight: 600 }}>{recipients.length}</span>
                        <span style={{ color: "#64748b" }}>SMS units/message:</span>
                        <span style={{ fontWeight: 600 }}>{smsUnits}</span>
                        <span style={{ color: "#64748b" }}>Total SMS to send:</span>
                        <span style={{ fontWeight: 600 }}>{recipients.length * smsUnits}</span>
                        <span style={{ color: "#64748b" }}>Cost per SMS:</span>
                        <span style={{ fontWeight: 600 }}>40 UGX</span>
                        <span style={{ color: "#dc2626", fontWeight: 600 }}>Total Amount Needed:</span>
                        <span style={{ color: "#dc2626", fontWeight: 700 }}>{totalCost.toLocaleString()} UGX</span>
                      </div>
                      {recipients.length === 0 && (
                        <div style={{ marginTop: "8px", color: "#ef4444", fontSize: "12px" }}>
                          ⚠️ No contacts found for this audience. Make sure phone numbers are provided.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Payment mode */}
                <div className="form-group">
                  <label className="form-label">💳 Payment Method</label>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "8px 14px", borderRadius: "8px", border: smsPaymentMode === "mobile_money" ? "2px solid var(--primary)" : "1px solid #e2e8f0", background: smsPaymentMode === "mobile_money" ? "#eff6ff" : "white", flex: 1, justifyContent: "center" }}>
                      <input type="radio" name="smsPayMode" checked={smsPaymentMode === "mobile_money"} onChange={() => setSmsPaymentMode("mobile_money")} />
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>Mobile Money (MoMo)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", padding: "8px 14px", borderRadius: "8px", border: smsPaymentMode === "card" ? "2px solid var(--primary)" : "1px solid #e2e8f0", background: smsPaymentMode === "card" ? "#eff6ff" : "white", flex: 1, justifyContent: "center" }}>
                      <input type="radio" name="smsPayMode" checked={smsPaymentMode === "card"} onChange={() => setSmsPaymentMode("card")} />
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>Card Payment</span>
                    </label>
                  </div>
                </div>

                {/* Payer phone (only for mobile_money) */}
                {smsPaymentMode === "mobile_money" && (
                  <div className="form-group">
                    <label className="form-label">📱 Your MTN/Airtel Number (for MoMo payment)</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="e.g. 0771234567 or 0701234567"
                      value={smsPayerPhone}
                      onChange={(e) => setSmsPayerPhone(e.target.value)}
                    />
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>You will receive a USSD prompt to approve the payment. Minimum charge: 500 UGX.</div>
                  </div>
                )}

                {/* Status display */}
                {smsSendStatus === "collecting" && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "13px" }}>
                    {smsPaymentMode === "mobile_money" ? (
                      <span>⏳ <strong>Waiting for MoMo payment...</strong> Please approve the MoMo prompt on your phone. Checking every 3 seconds...</span>
                    ) : (
                      <span>
                        💳 <strong>Waiting for card payment...</strong> A new tab should have opened for payment. If not, please <a href={smsCardRedirectUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "#1e3a8a", fontWeight: "600" }}>click here to pay</a>. Checking status every 3 seconds...
                      </span>
                    )}
                  </div>
                )}
                {smsSendStatus === "sending" && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "13px" }}>
                    📤 <strong>Sending SMS...</strong> Messages are being dispatched via MarzSMS.
                  </div>
                )}
                {smsSendStatus === "done" && smsSendResult && (
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "13px" }}>
                    ✅ <strong>Sent!</strong> {smsSendResult.totalSent} of {smsSendResult.totalSent + smsSendResult.totalFailed} messages delivered.
                    {smsSendResult.totalFailed > 0 && <span style={{ color: "#dc2626" }}> {smsSendResult.totalFailed} failed.</span>}
                  </div>
                )}
                {smsSendStatus === "error" && smsSendResult && (
                  <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "13px" }}>
                    ❌ <strong>Error:</strong> {smsSendResult.error || "An unexpected error occurred."}
                  </div>
                )}

                <button
                  className="btn btn-primary hover-scale"
                  style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "15px", fontWeight: 700, opacity: smsSendStatus === "collecting" || smsSendStatus === "sending" ? 0.6 : 1 }}
                  disabled={smsSendStatus === "collecting" || smsSendStatus === "sending"}
                  onClick={async () => {
                    if (!school || !smsMessage.trim()) { toast.error("Please compose a message first."); return; }

                    // Compute recipients
                    let recipients: string[] = [];
                    let targetClassName: string | undefined;
                    if (smsGroup === "CLASS_PARENTS") {
                      const cls = classes.find(c => c.id === smsTargetClassId);
                      const strm = streams.find(st => st.id === smsTargetStreamId);
                      targetClassName = cls ? (strm ? `${cls.name} (${strm.name})` : cls.name) : undefined;
                      recipients = students.filter(s => {
                        const matchClass = s.classId === smsTargetClassId;
                        const matchStream = !smsTargetStreamId || s.streamId === smsTargetStreamId;
                        return matchClass && matchStream && s.parentContact;
                      }).map(s => s.parentContact!);
                    } else if (smsGroup === "ALL_TEACHERS") {
                      recipients = users.filter(u => u.contact).map(u => u.contact!);
                    } else if (smsGroup === "MANUAL") {
                      recipients = smsManualContacts.split(/[\s,;\n]+/)
                        .map(p => p.trim())
                        .filter(p => p.length > 0);
                    } else {
                      const parentContacts = students.filter(s => s.parentContact).map(s => s.parentContact!);
                      const staffContacts = users.filter(u => u.contact).map(u => u.contact!);
                      recipients = [...new Set([...parentContacts, ...staffContacts])];
                    }

                    if (recipients.length === 0) { toast.error("No contacts found for the selected audience. Please add phone numbers to students or staff."); return; }

                    const smsUnits = smsMessage.length <= 160 ? 1 : 2;
                    const totalCost = recipients.length * smsUnits * 40;
                    const profitAmount = Math.max(500, recipients.length * smsUnits * 10); // min 500 UGX
                    const smsCostAmount = recipients.length * smsUnits * 30;

                    if (smsPaymentMode === "mobile_money") {
                      if (!smsPayerPhone.trim()) { toast.error("Please enter your mobile money number for payment."); return; }
                    }

                    const confirmMsg = smsPaymentMode === "mobile_money"
                      ? `Confirm sending SMS to ${recipients.length} recipient(s)?\n\nTotal cost: ${totalCost.toLocaleString()} UGX\nA MoMo request of ${totalCost.toLocaleString()} UGX will be sent to ${smsPayerPhone}.`
                      : `Confirm sending SMS to ${recipients.length} recipient(s)?\n\nTotal cost: ${totalCost.toLocaleString()} UGX\nYou will be redirected to the Card payment gateway to complete the payment of ${totalCost.toLocaleString()} UGX.`;
                    if (!confirm(confirmMsg)) return;

                    // Create log entry
                    const logData = {
                      schoolId: school.id,
                      sentById: currentUser.id,
                      sentByName: currentUser.name,
                      audience: smsGroup,
                      targetClassName: targetClassName || null,
                      message: smsMessage,
                      recipientCount: recipients.length,
                      successCount: 0,
                      failedCount: 0,
                      totalCharged: totalCost,
                      profitCollected: profitAmount,
                      smsCost: smsCostAmount,
                      payerPhone: smsPaymentMode === "mobile_money" ? smsPayerPhone : null,
                      marzPayRef: null,
                      status: "PENDING",
                      creditUsed: false,
                    };

                    let savedLog: any = null;
                    try { savedLog = await saveSmsLog(logData); } catch {}

                    // Step 1: MarzPay collection
                    setSmsSendStatus("collecting");
                    const collectRes = await initiateMarzpayCollection(
                      totalCost,
                      smsPaymentMode,
                      smsPaymentMode === "mobile_money" ? smsPayerPhone : undefined,
                      `SMS Service Fee - ${school.name}`
                    );

                    if (!collectRes || collectRes.status !== "success") {
                      setSmsSendStatus("error");
                      setSmsSendResult({ error: collectRes?.message || "Payment collection failed. Please check parameters and try again." });
                      if (savedLog) await updateSmsLog(savedLog.id, { status: "FAILED" }).catch(() => {});
                      return;
                    }

                    const collectionUuid = collectRes.data?.transaction?.uuid;
                    if (savedLog && collectionUuid) await updateSmsLog(savedLog.id, { marzPayRef: collectionUuid, status: "PENDING" }).catch(() => {});

                    // If card, show card details redirect modal
                    if (smsPaymentMode === "card") {
                      const redirectUrl = collectRes.data?.redirect_url;
                      if (redirectUrl) {
                        setSmsPayAmount(totalCost);
                        setSmsCardRedirectUrl(redirectUrl);
                        setShowSmsCardPayModal(true);
                      }
                    }

                    // Poll until completed
                    let confirmed = false;
                    for (let attempt = 0; attempt < 40; attempt++) {
                      await new Promise(r => setTimeout(r, 3000));
                      const statusRes = await checkMarzpayCollectionStatus(collectionUuid);
                      const txStatus = statusRes?.data?.transaction?.status || statusRes?.status || "";
                      if (txStatus === "completed") { confirmed = true; break; }
                      if (txStatus === "failed") break;
                    }

                    if (!confirmed) {
                      setSmsSendStatus("error");
                      setSmsSendResult({ error: "Payment not confirmed. Please try again once payment is completed." });
                      if (savedLog) await updateSmsLog(savedLog.id, { status: "FAILED" }).catch(() => {});
                      setShowSmsCardPayModal(false);
                      return;
                    }
                    if (savedLog) await updateSmsLog(savedLog.id, { status: "PAYMENT_CONFIRMED" }).catch(() => {});
                    setShowSmsCardPayModal(false);

                    // Step 2: Send SMS
                    setSmsSendStatus("sending");
                    const sendRes = await sendRealSms(recipients, smsMessage);
                    const finalStatus = sendRes.success ? "SENT" : "FAILED";
                    if (savedLog) await updateSmsLog(savedLog.id, { status: finalStatus, successCount: sendRes.totalSent, failedCount: sendRes.totalFailed }).catch(() => {});

                    setSmsSendResult(sendRes);
                    setSmsSendStatus(sendRes.success ? "done" : "error");
                    if (sendRes.success) setSmsMessage("");

                    // Refresh logs
                    try {
                      const refreshedLogs = await getSmsLogs(school.id);
                      setSmsLogs(refreshedLogs);
                    } catch {}
                  }}
                >
                  🚀 Send SMS Now
                </button>
              </div>

              {/* RIGHT: Stats + History */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Pricing info card */}
                <div className="card" style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", color: "white", border: "none", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.2)" }}>
                      <CreditCard size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", textTransform: "uppercase", opacity: 0.8 }}>SMS Broadcast Rate</div>
                      <div style={{ fontSize: "24px", fontWeight: 800 }}>40 UGX <span style={{ fontSize: "14px", fontWeight: 400, opacity: 0.8 }}>/ SMS unit</span></div>
                      <div style={{ fontSize: "11px", opacity: 0.7 }}>1 unit = 160 characters. Min charge: 500 UGX.</div>
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="card" style={{ padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>
                      {students.filter(s => s.parentContact).length}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Parents with contacts</div>
                  </div>
                  <div className="card" style={{ padding: "14px", textAlign: "center" }}>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "#059669" }}>
                      {users.filter(u => u.contact).length}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Staff with contacts</div>
                  </div>
                </div>

                {/* SMS History */}
                <div className="card" style={{ flex: 1, padding: "16px" }}>
                  <h4 style={{ marginBottom: "12px", fontSize: "14px" }}>📜 SMS Send History</h4>
                  <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                    <table className="table" style={{ fontSize: "12px" }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Audience</th>
                          <th>Sent</th>
                          <th>Cost</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {smsLogs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ whiteSpace: "nowrap" }}>{new Date(log.createdAt).toLocaleDateString()}</td>
                            <td>
                              <strong>{log.audience === "CLASS_PARENTS" ? `${log.targetClassName || "Class"} Parents` : log.audience === "ALL_TEACHERS" ? "All Staff" : "Everyone"}</strong>
                            </td>
                            <td>{log.successCount}/{log.recipientCount}</td>
                            <td>{log.totalCharged.toLocaleString()} UGX</td>
                            <td>
                              <span className={`badge ${log.status === "SENT" ? "badge-success" : log.status === "PENDING" || log.status === "PAYMENT_CONFIRMED" ? "badge-warning" : "badge-danger"}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {smsLogs.length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b", fontStyle: "italic", padding: "16px" }}>No SMS history yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Buy Credits Modal */}
            {showBuyCreditModal && (
              <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "20px" }}>
                <div className="card" style={{ width: "100%", maxWidth: "420px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
                  <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>💳 Buy SMS Credits</h3>
                  <p style={{ color: "#64748b", marginBottom: "18px", fontSize: "13px" }}>
                    Pre-purchase SMS credits at <strong>40 UGX each</strong>. Credits are deducted when you send (no MoMo prompt needed per-send).
                  </p>
                  <div className="form-group">
                    <label className="form-label">Number of Credits to Buy</label>
                    <input type="number" min={1} className="input-field" value={buyCreditsAmount} onChange={(e) => setBuyCreditsAmount(Number(e.target.value))} />
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      Total: <strong>{(buyCreditsAmount * 40).toLocaleString()} UGX</strong> (min MoMo charge: 500 UGX = {Math.ceil(500/40)} credits min)
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">📱 Your MTN/Airtel Number</label>
                    <input type="tel" className="input-field" placeholder="e.g. 0771234567" value={buyCreditsPhone} onChange={(e) => setBuyCreditsPhone(e.target.value)} />
                  </div>

                  {buyCreditsStatus === "collecting" && (
                    <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "10px", marginBottom: "12px", fontSize: "13px" }}>
                      ⏳ Waiting for MoMo payment approval...
                    </div>
                  )}
                  {buyCreditsStatus === "done" && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px", marginBottom: "12px", fontSize: "13px" }}>
                      ✅ Credits purchased successfully! Your balance is now <strong>{smsTotalCredits}</strong>.
                    </div>
                  )}
                  {buyCreditsStatus === "error" && buyCreditsResult && (
                    <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "10px", marginBottom: "12px", fontSize: "13px" }}>
                      ❌ {buyCreditsResult.error || "Payment failed. Please try again."}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                    <button
                      className="btn btn-primary" style={{ flex: 1 }}
                      disabled={buyCreditsStatus === "collecting"}
                      onClick={async () => {
                        if (!school || !buyCreditsPhone.trim() || buyCreditsAmount < 1) { toast.error("Please fill all fields."); return; }
                        const amount = Math.max(500, buyCreditsAmount * 40);
                        setBuyCreditsStatus("collecting");
                        const collectRes = await initiateMarzpayCollection(amount, "mobile_money", buyCreditsPhone, `SMS Credit Purchase - ${school.name}`);
                        if (!collectRes || collectRes.status !== "success") {
                          setBuyCreditsStatus("error");
                          setBuyCreditsResult({ error: collectRes?.message || "MarzPay failed." });
                          return;
                        }
                        const uuid = collectRes.data?.transaction?.uuid;
                        // Save pending credit
                        const newCredit = await saveSmsCredit({
                          schoolId: school.id,
                          creditsPurchased: buyCreditsAmount,
                          creditsUsed: 0,
                          marzPayRef: uuid,
                          payerPhone: buyCreditsPhone,
                          amountPaid: amount,
                          status: "PENDING",
                        }).catch(() => null);
                        // Poll
                        let confirmed = false;
                        for (let i = 0; i < 20; i++) {
                          await new Promise(r => setTimeout(r, 3000));
                          const s = await checkMarzpayCollectionStatus(uuid);
                          const st = s?.data?.transaction?.status || s?.status || "";
                          if (st === "completed") { confirmed = true; break; }
                          if (st === "failed") break;
                        }
                        if (confirmed && newCredit) {
                          await updateSmsCredit(newCredit.id, { status: "CONFIRMED" }).catch(() => {});
                          const updCredits = await getSmsCredits(school.id);
                          setSmsCredits(updCredits);
                          setSmsTotalCredits(updCredits.filter(c => c.status === "CONFIRMED").reduce((s, c) => s + (c.creditsPurchased - c.creditsUsed), 0));
                          setBuyCreditsStatus("done");
                        } else {
                          if (newCredit) await updateSmsCredit(newCredit.id, { status: "FAILED" as any }).catch(() => {});
                          setBuyCreditsStatus("error");
                          setBuyCreditsResult({ error: "Payment not confirmed. USSD prompt may have expired." });
                        }
                      }}
                    >
                      {buyCreditsStatus === "collecting" ? "⏳ Processing..." : "💳 Pay & Buy Credits"}
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowBuyCreditModal(false); setBuyCreditsStatus("idle"); setBuyCreditsResult(null); }}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: REPORT CARD DESIGNER */}
        {activeTab === "elections" && ["ADMIN", "HEADTEACHER", "DOS"].includes(currentUser.role) && (
          <ElectionsManager school={school} students={students} />
        )}

        {activeTab === "holiday" && ["ADMIN", "HEADTEACHER", "DOS"].includes(currentUser.role) && (
          <HolidayWorkManager school={school} classes={classes} streams={streams} />
        )}

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

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label className="form-label">School Website</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={designerWebsite}
                        onChange={(e) => setDesignerWebsite(e.target.value)}
                        placeholder="e.g. stnoamawaggalisss.ac.ug"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">TikTok Handle</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={designerTikTok}
                        onChange={(e) => setDesignerTikTok(e.target.value)}
                        placeholder="e.g. @snoams.mbikkojinj"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">School Location / Located District</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={designerLocation}
                      onChange={(e) => setDesignerLocation(e.target.value)}
                      placeholder="e.g. MBIKKO, BUIKWE DISTRICT"
                    />
                  </div>
                  
                  <div style={{ height: "1px", background: "#e2e8f0", margin: "20px 0" }}></div>
                  <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "#0f172a" }}>Display Layout Settings</h4>
                  
                  <div className="flex flex-col gap-2" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowBadge}
                        onChange={(e) => setDesignerShowBadge(e.target.checked)}
                      />
                      <span>Show Official School Logo Badge</span>
                    </label>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowResidency}
                        onChange={(e) => setDesignerShowResidency(e.target.checked)}
                      />
                      <span>Show Residency Type (Day / Boarding student indicator)</span>
                    </label>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowSignatures}
                        onChange={(e) => setDesignerShowSignatures(e.target.checked)}
                      />
                      <span>Show Official Teacher/Head Teacher Signature Stamps</span>
                    </label>
                    
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowRules}
                        onChange={(e) => setDesignerShowRules(e.target.checked)}
                      />
                      <span>Show Curriculum Criteria (Uganda CBC Grading Guideline Box)</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowLIN}
                        onChange={(e) => setDesignerShowLIN(e.target.checked)}
                      />
                      <span>Show Learner ID No. (LIN) in Student Info</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowPayCode}
                        onChange={(e) => setDesignerShowPayCode(e.target.checked)}
                      />
                      <span>Show School Pay Code in Student Info</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowChart}
                        onChange={(e) => setDesignerShowChart(e.target.checked)}
                      />
                      <span>Show Subject Marks Performance Bar Chart</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowSummaryRow}
                        onChange={(e) => setDesignerShowSummaryRow(e.target.checked)}
                      />
                      <span>Show Overall Level of Achievement Summary Row</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowComments}
                        onChange={(e) => setDesignerShowComments(e.target.checked)}
                      />
                      <span>Show Class/Head Teacher Comments</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowFees}
                        onChange={(e) => setDesignerShowFees(e.target.checked)}
                      />
                      <span>Show Next Term Fees & Balances</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                      <input 
                        type="checkbox" 
                        checked={designerShowTermDates}
                        onChange={(e) => setDesignerShowTermDates(e.target.checked)}
                      />
                      <span>Show Term Closing & Next Term Re-opening Dates</span>
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
                  <div style={{ width: "100%", maxWidth: "520px", background: "white", padding: "20px", border: `2px solid ${designerHeaderColor}`, borderRadius: "4px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", textAlign: "left", fontSize: "9px", color: "black", fontFamily: "Arial, sans-serif" }}>
                    
                    {/* Header */}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", borderBottom: designerBorderType === "double" ? `3px double ${designerHeaderColor}` : designerBorderType === "solid" ? `1px solid ${designerHeaderColor}` : "none", paddingBottom: "8px", marginBottom: "10px" }}>
                      {designerShowBadge && (
                        <div style={{ flexShrink: 0 }}>
                          {school?.logoUrl ? (
                            <img src={school.logoUrl} alt="Logo" style={{ width: `${designerLogoSize * 0.5}px`, height: `${designerLogoSize * 0.5}px`, objectFit: "contain", border: "1px solid #e2e8f0", padding: "1px" }} />
                          ) : (
                            <GraduationCap size={Math.round(designerLogoSize * 0.45)} color={designerHeaderColor} />
                          )}
                        </div>
                      )}
                      
                      <div style={{ textAlign: "center", flex: 1 }}>
                        <h4 style={{ fontSize: "14px", margin: 0, textTransform: "uppercase", color: designerHeaderColor, fontWeight: 900, letterSpacing: "0.5px" }}>{school?.name || "ST. NOA MAWAGGALI S.S.S"}</h4>
                        <div style={{ fontSize: "6.5px", color: "#334155", margin: "2px 0", lineHeight: "1.3" }}>
                          {designerWebsite && <span>Website: {designerWebsite} | </span>}
                          {designerTikTok && <span>TikTok: {designerTikTok} | </span>}
                          <span>P.O. Box {school?.poBox || "1922, JINJA"}</span>
                          <br />
                          {designerLocation && <span>Located: {designerLocation} | </span>}
                          <span>Email: {school?.contactEmail || "stnoamawaggaliss@gmail.com"} | Tel: {school?.contactPhone || "0772658134"}</span>
                        </div>
                        {designerMotto && (
                          <p style={{ margin: "2px 0 0", fontSize: "7px", fontStyle: "italic", fontWeight: "bold", color: "#475569" }}>
                            Motto: "{designerMotto}"
                          </p>
                        )}
                        <h5 style={{ fontSize: "9px", margin: "6px 0 0", textTransform: "uppercase", textDecoration: "underline", color: "black", fontWeight: "bold" }}>
                          {designerTitle || "END OF TERM I REPORT CARD"}
                        </h5>
                      </div>

                      {designerShowStudentPhoto && (
                        <div style={{ width: "42px", height: "46px", border: "1px solid #cbd5e1", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontSize: "6px", color: "#94a3b8", flexShrink: 0, fontWeight: "bold" }}>
                          Portrait
                        </div>
                      )}
                    </div>
                    
                    {/* Student Info Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", fontSize: "8px", borderBottom: "1px solid #cbd5e1", paddingBottom: "6px", marginBottom: "8px", fontWeight: "500" }}>
                      <div><strong>Student Name:</strong> Acheing Janell Rihanna</div>
                      <div><strong>Sex:</strong> F</div>
                      <div><strong>Class:</strong> S.1 E</div>
                      {designerShowLIN && <div><strong>Learner ID (LIN):</strong> LIN-2026-X83</div>}
                      {designerShowPayCode && <div><strong>School Pay Code:</strong> PAY-8831-29</div>}
                      <div><strong>Academic Term:</strong> Term 1 (2026)</div>
                      {designerShowResidency && <div><strong>Residency Type:</strong> Day Student</div>}
                    </div>
                    
                    {/* Marks Mock Table */}
                    <div style={{ marginBottom: "10px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "7.5px", color: "black" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", textAlign: "center", fontWeight: "bold" }}>
                            <th style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "left" }} rowSpan={2}>SUBJECT</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }} colSpan={8}>FORMATIVE ASSESSMENT SCORES (AOI & PROJECT WORK)</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }} rowSpan={2}>SUMM.<br />(80)</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }} rowSpan={2}>OVERALL<br />(100%)</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }} rowSpan={2}>GRADE</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }} rowSpan={2}>INIT.</th>
                          </tr>
                          <tr style={{ background: "#f1f5f9", textAlign: "center", fontWeight: "bold" }}>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>U1</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>U2</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>U3</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>PTS</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>AVR</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>Out 10</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>IDENT</th>
                            <th style={{ border: "1px solid #cbd5e1", padding: "2px" }}>DESC</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", fontWeight: "bold" }}>ENGLISH LANGUAGE</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.7</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>-</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>-</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.7</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.7</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>9.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>3.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>Outstanding</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>54.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center", fontWeight: "bold" }}>72%</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center", fontWeight: "bold" }}>B</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>M.M</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", fontWeight: "bold" }}>MATHEMATICS</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.4</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>-</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>-</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.4</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.4</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>8.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>2.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>Moderate</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>3.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center", fontWeight: "bold" }}>19%</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center", fontWeight: "bold" }}>E</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>K.S</td>
                          </tr>
                          <tr>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", fontWeight: "bold" }}>CHEMISTRY</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>3.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>3.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>-</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>6.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>3.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>10.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>3.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>Outstanding</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>32.0</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center", fontWeight: "bold" }}>52%</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center", fontWeight: "bold" }}>D</td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>N.H</td>
                          </tr>
                          {designerShowSummaryRow && (
                            <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px" }}>OVERALL AVERAGE</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }} colSpan={3}>CLASS RANK: 67 / 73</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>AVG PT: 2.3</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>IDENT: 2</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }} colSpan={2}>DESC: Moderate</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }}>SUMM AVG: 30%</td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "3px", textAlign: "center" }} colSpan={3}>TOT SCORE: 364</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Performance Chart Mockup */}
                    {designerShowChart && (
                      <div style={{ border: "1px solid #cbd5e1", borderRadius: "3px", padding: "6px", background: "white", marginBottom: "8px" }}>
                        <div style={{ fontWeight: "bold", fontSize: "7px", marginBottom: "4px", textAlign: "center", color: "#475569" }}>Subject Performance Chart</div>
                        <svg viewBox="0 0 300 80" style={{ width: "100%", height: "auto" }}>
                          {/* Y-axis gridlines */}
                          <line x1="20" y1="10" x2="290" y2="10" stroke="#e2e8f0" strokeWidth="0.5" />
                          <line x1="20" y1="30" x2="290" y2="30" stroke="#e2e8f0" strokeWidth="0.5" />
                          <line x1="20" y1="50" x2="290" y2="50" stroke="#e2e8f0" strokeWidth="0.5" />
                          <line x1="20" y1="70" x2="290" y2="70" stroke="#cbd5e1" strokeWidth="0.8" />
                          
                          {/* Bars */}
                          {/* Eng (72%) -> height = 43px. y = 27 */}
                          <rect x="50" y="27" width="20" height="43" fill={designerHeaderColor} rx="1" />
                          <text x="60" y="23" fontSize="6px" textAnchor="middle" fontWeight="bold">72</text>
                          <text x="60" y="77" fontSize="5px" textAnchor="middle" fill="#64748b">ENG</text>

                          {/* Math (19%) -> height = 11px. y = 59 */}
                          <rect x="110" y="59" width="20" height="11" fill="#ef4444" rx="1" />
                          <text x="120" y="55" fontSize="6px" textAnchor="middle" fontWeight="bold">19</text>
                          <text x="120" y="77" fontSize="5px" textAnchor="middle" fill="#64748b">MTH</text>

                          {/* Chem (52%) -> height = 31px. y = 39 */}
                          <rect x="170" y="39" width="20" height="31" fill="#f59e0b" rx="1" />
                          <text x="180" y="35" fontSize="6px" textAnchor="middle" fontWeight="bold">52</text>
                          <text x="180" y="77" fontSize="5px" textAnchor="middle" fill="#64748b">CHM</text>

                          {/* Bio (28%) -> height = 17px. y = 53 */}
                          <rect x="230" y="53" width="20" height="17" fill="#f59e0b" rx="1" />
                          <text x="240" y="49" fontSize="6px" textAnchor="middle" fontWeight="bold">28</text>
                          <text x="240" y="77" fontSize="5px" textAnchor="middle" fill="#64748b">BIO</text>
                        </svg>
                      </div>
                    )}

                    {/* CBC Guidelines Legend */}
                    {designerShowRules && (
                      <div style={{ background: "#f8fafc", padding: "4px", borderRadius: "3px", fontSize: "6.5px", border: "1px solid #cbd5e1", marginBottom: "8px", lineHeight: "1.3" }}>
                        <strong>Uganda Lower Secondary CBC Guidelines:</strong> Scores from Activities of Integration (AOIs) are graded from 1 to 3. Continuous assessment reports represent 20% of final grade, end of term exams represent 80%.
                      </div>
                    )}

                    {/* Comments */}
                    {designerShowComments && (
                      <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px", marginTop: "6px", fontSize: "7px", lineHeight: "1.4" }}>
                        <div><strong>Class Teacher's Comment:</strong> <span style={{ fontStyle: "italic", textDecoration: "underline", color: "#1e3a8a" }}>Acheing, it would be great to see some improvement in your weakest subjects in the future.</span></div>
                        <div><strong>Class Teacher's Name:</strong> Mr. Okongo Wilson &nbsp;&nbsp;&nbsp;&nbsp; <strong>Signature:</strong> _________________</div>
                        <div style={{ marginTop: "3px" }}><strong>Head Teacher's Comment:</strong> <span style={{ fontStyle: "italic", textDecoration: "underline", color: "#059669" }}>Consult more on what is lacking</span></div>
                      </div>
                    )}
                    
                    {/* Fees display */}
                    {designerShowFees && (
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: "4px", marginTop: "4px", fontSize: "7px", fontWeight: "bold" }}>
                        <span>Next Term Fees: 150,000 UGX</span>
                        <span>Outstanding Dues: 0 UGX</span>
                        <span>Total: 150,000 UGX</span>
                      </div>
                    )}

                    {/* Term Dates */}
                    {designerShowTermDates && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6.5px", color: "#475569", marginTop: "4px", borderTop: "1px dashed #cbd5e1", paddingTop: "4px" }}>
                        <span>This term ended: Thursday, April 30, 2026</span>
                        <span>Next term begins: Sunday, May 24, 2026</span>
                      </div>
                    )}
                    
                    {/* Signatures */}
                    {designerShowSignatures && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "14px", fontSize: "7px" }}>
                        <div style={{ borderTop: "1px solid black", width: "70px", textAlign: "center", paddingTop: "2px" }}>Class Teacher</div>
                        <div style={{ borderTop: "1px solid black", width: "70px", textAlign: "center", paddingTop: "2px" }}>Head Teacher</div>
                        <div style={{ borderTop: "1px solid black", width: "70px", textAlign: "center", paddingTop: "2px" }}>Signature & Stamp</div>
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
              <button onClick={() => setShowMoMoModal(false)} style={{ background: "transparent", border: "none", color: "inherit", fontWeight: "bold", cursor: "pointer", fontSize: "16px" }}>âœ•</button>
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
                            âš ï¸ Due to gateway limits, this payment will be split into <strong>{momoSplitAmounts.length} transactions</strong> of max 200,000 UGX each.
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
                            âš ï¸ Due to gateway limits, this payment will be split into <strong>{momoSplitAmounts.length} transactions</strong> of max 200,000 UGX each.
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
            >âœ•</button>
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
              <div><strong>Registration No:</strong> {selectedViewStudent.registrationNumber || "Not Registered"}</div>
              <div><strong>LIN (Learner ID):</strong> {selectedViewStudent.lin || "Not Registered"}</div>
              <div><strong>SchoolPay Code:</strong> {selectedViewStudent.studentPaymentCode || "N/A"}</div>
              <div><strong>Parent Contact:</strong> {selectedViewStudent.parentContact || "N/A"}</div>
              <div>
                <strong>Attendance Type:</strong> &nbsp;
                <span className={`badge ${selectedViewStudent.type === "BOARDING" ? "badge-warning" : "badge-primary"}`}>
                  {selectedViewStudent.type}
                </span>
              </div>
              <div><strong>Gender:</strong> {selectedViewStudent.gender || "MALE"}</div>
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
          <div className="card" style={{ width: "100%", maxWidth: "480px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Edit Student Record</h3>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              await updateStudent(selectedEditStudent.id, {
                name: editStudentName,
                studentNumber: editStudentNumber,
                classId: editStudentClassId,
                streamId: editStudentStreamId,
                type: editStudentType,
                lin: editStudentLin || null,
                gender: editStudentGender,
                parentContact: editStudentParentContact || null,
                studentPaymentCode: editStudentPaymentCode || null,
                ...(editStudentPhotoChanged ? { photo: editStudentPhoto || null } : {})
              });
              setShowEditStudentModal(false);
              await loadSchoolData(school!.id);
              toast.success("Student details updated successfully!");
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

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label">LIN (Learner ID)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. LIN-12345678" 
                    value={editStudentLin}
                    onChange={(e) => setEditStudentLin(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="input-field" 
                    value={editStudentGender}
                    onChange={(e) => setEditStudentGender(e.target.value as "MALE" | "FEMALE")}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label">Pay Code</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. 194570001" 
                    value={editStudentPaymentCode}
                    onChange={(e) => setEditStudentPaymentCode(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">📱 Parent Contact</label>
                  <input 
                    type="tel" 
                    className="input-field" 
                    placeholder="e.g. 0771234567" 
                    value={editStudentParentContact}
                    onChange={(e) => setEditStudentParentContact(e.target.value)}
                  />
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
                        toast.error("Photo size should be less than 1MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditStudentPhoto(reader.result as string);
                        setEditStudentPhotoChanged(true);
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

      {/* 2B. Edit Class Modal */}
      {showEditClassModal && selectedEditClass && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Configure Class & Streams</h3>
            
            <form onSubmit={handleUpdateClass}>
              <div className="form-group">
                <label className="form-label">Class Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Curriculum Level</label>
                <select 
                  className="input-field" 
                  value={editClassLevel}
                  onChange={(e) => setEditClassLevel(e.target.value as "PRIMARY" | "SECONDARY")}
                >
                  <option value="PRIMARY">PRIMARY</option>
                  <option value="SECONDARY">SECONDARY</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px", marginBottom: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Class Changes</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditClassModal(false);
                    setSelectedEditClass(null);
                  }}
                  className="btn btn-outline" 
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>

            <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "20px 0" }} />

            <h4 style={{ marginBottom: "12px" }}>Streams Configuration</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {streams.filter(s => s.classId === selectedEditClass.id).length === 0 ? (
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>No streams configured for this class.</p>
              ) : (
                streams.filter(s => s.classId === selectedEditClass.id).map(st => {
                  const enrolledCount = students.filter(stud => stud.streamId === st.id).length;
                  return (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        style={{ flex: 1, padding: "6px 10px" }}
                        value={editStreamRenames[st.id] ?? st.name}
                        onChange={(e) => setEditStreamRenames(prev => ({ ...prev, [st.id]: e.target.value }))}
                      />
                      <button 
                        type="button"
                        onClick={() => handleRenameStream(st.id, editStreamRenames[st.id] ?? "")}
                        className="btn btn-outline"
                        style={{ padding: "6px 10px", fontSize: "12px" }}
                        disabled={(editStreamRenames[st.id] ?? st.name) === st.name}
                      >
                        Rename
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDeleteStreamFromClass(st.id)}
                        className="btn btn-outline"
                        style={{ padding: "6px 10px", fontSize: "12px", color: enrolledCount > 0 ? "#cbd5e1" : "var(--danger)", borderColor: enrolledCount > 0 ? "#e2e8f0" : "var(--danger)", cursor: enrolledCount > 0 ? "not-allowed" : "pointer" }}
                        disabled={enrolledCount > 0}
                        title={enrolledCount > 0 ? `Cannot delete stream: ${enrolledCount} active students are enrolled in it.` : "Delete stream"}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <label className="form-label" style={{ fontSize: "12px", margin: 0 }}>Add New Stream</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ flex: 1, padding: "6px 10px" }}
                  placeholder="e.g. C, Gold, West"
                  value={editStreamNewName}
                  onChange={(e) => setEditStreamNewName(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => handleAddStreamToClass(selectedEditClass.id, editStreamNewName)}
                  className="btn btn-primary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                >
                  Add Stream
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Edit Exam / Continuous Assessment Modal */}
      {showEditExamModal && selectedEditExam && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "550px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>Configure Exam / Assessment</h3>
            
            <form onSubmit={handleUpdateExam}>
              <div className="form-group">
                <label className="form-label">Exam Title Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editExamName}
                  onChange={(e) => setEditExamName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Term ID</label>
                  <select className="input-field" value={editExamTerm} onChange={(e) => setEditExamTerm(e.target.value)}>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Academic Year</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={editExamYear}
                    onChange={(e) => setEditExamYear(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Class</label>
                <select className="input-field" value={editExamClassId} onChange={(e) => setEditExamClassId(e.target.value)}>
                  <option value="">All Classes (School-wide)</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {school.schoolType === "COMBINED" ? (
                <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px", margin: "14px 0" }}>
                  <input 
                    type="checkbox" 
                    id="edit-cbc-check" 
                    checked={editExamIsNewCurriculum}
                    onChange={(e) => setEditExamIsNewCurriculum(e.target.checked)}
                  />
                  <label htmlFor="edit-cbc-check" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                    New Curriculum CBC Exam (Grade Letters A-E)
                  </label>
                </div>
              ) : (
                <div style={{ background: "var(--primary-light)", border: "1px solid var(--primary-glow)", borderRadius: "6px", padding: "10px", margin: "14px 0", fontSize: "12px", color: "var(--foreground)" }}>
                  <strong>Grading Standard:</strong> {school.schoolType === "PRIMARY" ? "Primary PLE Aggregates (1-9)" : "Secondary Lower Curriculum CBC (A-E)"}
                </div>
              )}

              {editExamIsNewCurriculum && (
                <div style={{ marginTop: "16px", padding: "16px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "20px" }}>
                  <h5 style={{ marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#0f172a" }}>
                    <Sliders size={14} color="var(--primary)" />
                    Continuous Assessment (CA) Columns
                  </h5>
                  <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "12px" }}>
                    Select which CA columns are active and set their maximum marks.
                  </p>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {/* U1 */}
                    <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold" }}>Unit 1 (U1)</span>
                        <input 
                          type="checkbox" 
                          checked={editExamCbU1Active} 
                          onChange={(e) => setEditExamCbU1Active(e.target.checked)}
                          style={{ width: "14px", height: "14px", cursor: "pointer" }}
                        />
                      </div>
                      {editExamCbU1Active && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="1" 
                            max="100"
                            className="input-field" 
                            value={editExamCbU1Max} 
                            onChange={(e) => setEditExamCbU1Max(Number(e.target.value))} 
                            style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* U2 */}
                    <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold" }}>Unit 2 (U2)</span>
                        <input 
                          type="checkbox" 
                          checked={editExamCbU2Active} 
                          onChange={(e) => setEditExamCbU2Active(e.target.checked)}
                          style={{ width: "14px", height: "14px", cursor: "pointer" }}
                        />
                      </div>
                      {editExamCbU2Active && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="1" 
                            max="100"
                            className="input-field" 
                            value={editExamCbU2Max} 
                            onChange={(e) => setEditExamCbU2Max(Number(e.target.value))} 
                            style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* E.T */}
                    <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold" }}>End Term CA (E.T)</span>
                        <input 
                          type="checkbox" 
                          checked={editExamCbEtActive} 
                          onChange={(e) => setEditExamCbEtActive(e.target.checked)}
                          style={{ width: "14px", height: "14px", cursor: "pointer" }}
                        />
                      </div>
                      {editExamCbEtActive && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="1" 
                            max="100"
                            className="input-field" 
                            value={editExamCbEtMax} 
                            onChange={(e) => setEditExamCbEtMax(Number(e.target.value))} 
                            style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* HPG */}
                    <div style={{ padding: "10px", background: "white", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold" }}>High Perform (HPG)</span>
                        <input 
                          type="checkbox" 
                          checked={editExamCbHpgActive} 
                          onChange={(e) => setEditExamCbHpgActive(e.target.checked)}
                          style={{ width: "14px", height: "14px", cursor: "pointer" }}
                        />
                      </div>
                      {editExamCbHpgActive && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: "9px" }}>Max Score</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            min="1" 
                            max="100"
                            className="input-field" 
                            value={editExamCbHpgMax} 
                            onChange={(e) => setEditExamCbHpgMax(Number(e.target.value))} 
                            style={{ padding: "4px 8px", height: "auto", fontSize: "12px" }}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditExamModal(false);
                    setSelectedEditExam(null);
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

      {/* 3. View Staff Modal */}
      {showViewStaffModal && selectedViewStaff && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "450px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", position: "relative" }}>
            <button 
              onClick={() => setShowViewStaffModal(false)} 
              style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px" }}
            >âœ•</button>
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
              toast.success("Staff account details updated successfully!");
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
                        toast.error("Photo size should be less than 1MB.");
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

              <div style={{ height: "1px", background: "#e2e8f0", margin: "20px 0" }}></div>
              <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "#0f172a" }}>Administrative Password Controls</h4>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Set New Password / Reset Password</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input 
                    type="password" 
                    placeholder="Enter new password" 
                    className="input-field" 
                    value={adminResetPasswordVal}
                    onChange={(e) => setAdminResetPasswordVal(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (!adminResetPasswordVal || adminResetPasswordVal.length < 4) {
                        toast.error("Please enter a password with at least 4 characters.");
                        return;
                      }
                      const success = await resetUserPassword(school!.id, selectedEditStaff.email, adminResetPasswordVal);
                      if (success) {
                        await updateUser(selectedEditStaff.id, { mustChangePassword: true });
                        toast.success(`Password for ${selectedEditStaff.name} reset successfully! User will be forced to change it on their next login.`);
                        setAdminResetPasswordVal("");
                      } else {
                        toast.error("Failed to reset password.");
                      }
                    }}
                    className="btn btn-outline"
                    style={{ color: "var(--danger)", borderColor: "var(--danger)", padding: "8px 16px" }}
                  >
                    Reset
                  </button>
                </div>
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

      {/* SMS Card Payment Checkout Modal */}
      {showSmsCardPayModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "460px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
              <div style={{ padding: "16px", borderRadius: "50%", background: "#eff6ff", color: "var(--primary)" }}>
                <CreditCard size={36} />
              </div>
            </div>
            <h3 style={{ marginBottom: "10px", color: "#0f172a", fontWeight: 700 }}>💳 Complete Card Payment</h3>
            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
              To finalize sending your SMS broadcast, you will be redirected to the secure card checkout page where you can safely enter your card details (Card Number, Expiry Date, and CVV).
            </p>
            
            <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "24px", textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                <span style={{ color: "#64748b" }}>Payment Service:</span>
                <strong style={{ color: "#0f172a" }}>SMS Broadcast Fee</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Amount Due:</span>
                <strong style={{ color: "#0f172a", fontSize: "16px", fontWeight: 800 }}>
                  {smsPayAmount.toLocaleString()} UGX
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <a 
                href={smsCardRedirectUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary" 
                style={{ display: "block", textDecoration: "none", color: "white", padding: "12px", borderRadius: "8px", fontWeight: "bold" }}
              >
                💳 Enter Card Details & Pay
              </a>
              <div style={{ fontSize: "12px", color: "#64748b", margin: "10px 0" }}>
                ⏳ <strong>Waiting for card payment...</strong> Once you complete the payment on the checkout page, the broadcast will automatically dispatch.
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowSmsCardPayModal(false);
                  setSmsSendStatus("idle");
                }} 
                className="btn btn-outline" 
                style={{ width: "100%" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Student Photo Upload Modal */}
      {showBulkPhotoModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "700px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", color: "#0f172a" }}>Bulk Upload Student Photos</h3>
            
            {isApplyingPhotos ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 10px", textAlign: "center" }}>
                <div style={{
                  border: "5px solid rgba(15, 23, 42, 0.1)",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  borderLeftColor: "#1e3a8a",
                  animation: "spin 1s linear infinite",
                  marginBottom: "24px"
                }}></div>
                <h4 style={{ color: "#0f172a", marginBottom: "8px", fontWeight: "600" }}>Applying Student Photos...</h4>
                <p style={{ color: "#64748b", fontSize: "14px" }}>Please wait while we save the images to the database...</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "16px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#0f172a" }}>Filter Class</label>
                    <select 
                      className="input-field" 
                      value={bulkPhotoClassId} 
                      onChange={(e) => {
                        const newClassId = e.target.value;
                        setBulkPhotoClassId(newClassId);
                        const sub = streams.filter(s => s.classId === newClassId);
                        const newStreamId = sub.length > 0 ? sub[0].id : "";
                        setBulkPhotoStreamId(newStreamId);
                        
                        // Re-match existing matches
                        const classStudents = students.filter(st => {
                          const matchClass = !newClassId || st.classId === newClassId;
                          const matchStream = !newStreamId || st.streamId === newStreamId;
                          return matchClass && matchStream;
                        });
                        setBulkPhotoMatches(prev => prev.map(match => {
                          const { matchedStudentId, matchType } = matchStudentPhotoFilename(match.filename, classStudents);
                          return { ...match, matchedStudentId, matchType };
                        }));
                      }}
                      required
                      style={{ color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1", display: "block", width: "100%", height: "42px", padding: "8px 12px", borderRadius: "6px" }}
                    >
                      <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>-- Choose class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#0f172a" }}>Filter Stream</label>
                    <select 
                      className="input-field" 
                      value={bulkPhotoStreamId} 
                      onChange={(e) => {
                        const newStreamId = e.target.value;
                        setBulkPhotoStreamId(newStreamId);
                        
                        // Re-match existing matches
                        const classStudents = students.filter(st => {
                          const matchClass = !bulkPhotoClassId || st.classId === bulkPhotoClassId;
                          const matchStream = !newStreamId || st.streamId === newStreamId;
                          return matchClass && matchStream;
                        });
                        setBulkPhotoMatches(prev => prev.map(match => {
                          const { matchedStudentId, matchType } = matchStudentPhotoFilename(match.filename, classStudents);
                          return { ...match, matchedStudentId, matchType };
                        }));
                      }}
                      style={{ color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1", display: "block", width: "100%", height: "42px", padding: "8px 12px", borderRadius: "6px" }}
                    >
                      <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>All Streams</option>
                      {streams.filter(st => st.classId === bulkPhotoClassId).map(st => (
                        <option key={st.id} value={st.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ color: "#0f172a" }}>Select Photos (Multiple allowed)</label>
                  <input 
                    type="file" 
                    multiple
                    accept="image/*"
                    className="input-field" 
                    onChange={handleBulkPhotoUploadSelected}
                    style={{ padding: "8px", color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", lineHeight: "1.4" }}>
                    Select image files. The system will automatically align photos to student records using filename matches. You can review and manually adjust the alignments below.
                  </div>
                </div>

                {bulkPhotoMatches.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "14px", fontWeight: "600" }}>Upload Match Verification</h4>
                    <div className="table-container" style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
                      <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ padding: "10px", fontSize: "12px", textAlign: "left" }}>Photo</th>
                            <th style={{ padding: "10px", fontSize: "12px", textAlign: "left" }}>File Name</th>
                            <th style={{ padding: "10px", fontSize: "12px", textAlign: "left" }}>Match Status</th>
                            <th style={{ padding: "10px", fontSize: "12px", textAlign: "left" }}>Aligned Student</th>
                            <th style={{ padding: "10px", fontSize: "12px", textAlign: "center" }}>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPhotoMatches.map((match, idx) => {
                            const currentFilteredStudents = students.filter(st => {
                              const matchClass = !bulkPhotoClassId || st.classId === bulkPhotoClassId;
                              const matchStream = !bulkPhotoStreamId || st.streamId === bulkPhotoStreamId;
                              return matchClass && matchStream;
                            });
                            
                            return (
                              <tr key={idx} style={{ borderTop: "1px solid var(--border)" }}>
                                <td style={{ padding: "10px" }}>
                                  <img 
                                    src={match.base64Data} 
                                    alt="Preview" 
                                    style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
                                  />
                                </td>
                                <td style={{ padding: "10px", fontSize: "13px", color: "#334155" }}>
                                  {match.filename}
                                </td>
                                <td style={{ padding: "10px" }}>
                                  {match.matchType === "Exact" && (
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#def7ec", color: "#03543f" }}>
                                      Exact Match
                                    </span>
                                  )}
                                  {match.matchType === "Fuzzy" && (
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#fef3c7", color: "#92400e" }}>
                                      Fuzzy Match
                                    </span>
                                  )}
                                  {match.matchType === "Unmatched" && (
                                    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "#f3f4f6", color: "#374151" }}>
                                      Unmatched
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "10px" }}>
                                  <select
                                    value={match.matchedStudentId || ""}
                                    onChange={(e) => {
                                      const selectedId = e.target.value;
                                      setBulkPhotoMatches(prev => prev.map((m, i) => {
                                        if (i === idx) {
                                          return {
                                            ...m,
                                            matchedStudentId: selectedId,
                                            matchType: selectedId ? "Exact" : "Unmatched"
                                          };
                                        }
                                        return m;
                                      }));
                                    }}
                                    className="input-field"
                                    style={{ padding: "4px 8px", fontSize: "12px", width: "100%", minWidth: "150px", height: "32px" }}
                                  >
                                    <option value="">-- Choose Student --</option>
                                    {currentFilteredStudents.map(st => (
                                      <option key={st.id} value={st.id}>
                                        {st.name} ({st.studentNumber})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: "10px", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBulkPhotoMatches(prev => prev.filter((_, i) => i !== idx));
                                    }}
                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "16px", padding: "4px" }}
                                    title="Remove image from upload"
                                  >
                                    &times;
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                  <button 
                    type="button" 
                    onClick={handleApplyBulkPhotos} 
                    className="btn btn-primary" 
                    style={{ flex: 1 }}
                    disabled={bulkPhotoMatches.filter(m => m.matchedStudentId).length === 0}
                  >
                    Apply & Save Photos ({bulkPhotoMatches.filter(m => m.matchedStudentId).length})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowBulkPhotoModal(false);
                      setBulkPhotoMatches([]);
                    }}
                    className="btn btn-outline" 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Bulk Upload Students Modal */}
      {showBulkStudentModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "550px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", color: "#0f172a" }}>Bulk Upload Students</h3>
            
            {isImportingStudents ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 10px", textAlign: "center" }}>
                {/* Spinning loader */}
                <div style={{
                  border: "5px solid rgba(15, 23, 42, 0.1)",
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  borderLeftColor: "#1e3a8a",
                  animation: "spin 1s linear infinite",
                  marginBottom: "24px"
                }}></div>
                <h4 style={{ color: "#0f172a", marginBottom: "8px", fontWeight: "600", fontSize: "16px" }}>Importing Student Records...</h4>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
                  Please wait, saving record <strong>{importStudentProgress}</strong> of <strong>{importStudentTotal}</strong>...
                </p>
                {/* Progress bar */}
                <div style={{ width: "100%", height: "8px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "12px" }}>
                  <div style={{
                    width: `${importStudentTotal > 0 ? (importStudentProgress / importStudentTotal) * 100 : 0}%`,
                    height: "100%",
                    backgroundColor: "#1e3a8a",
                    transition: "width 0.2s ease"
                  }}></div>
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "500" }}>
                  Please do not close this modal or refresh the browser.
                </div>
              </div>
            ) : (
              <form onSubmit={handleBulkStudentUpload}>
                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: "16px" }}>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#0f172a" }}>Target Class</label>
                    <select 
                      className="input-field" 
                      value={bulkStudentClassId} 
                      onChange={(e) => {
                        setBulkStudentClassId(e.target.value);
                        const sub = streams.filter(s => s.classId === e.target.value);
                        if (sub.length > 0) setBulkStudentStreamId(sub[0].id);
                        else setBulkStudentStreamId("");
                      }}
                      required
                      style={{ color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1", display: "block", width: "100%", height: "42px", padding: "8px 12px", borderRadius: "6px" }}
                    >
                      <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>-- Choose class --</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ color: "#0f172a" }}>Target Stream</label>
                    <select 
                      className="input-field" 
                      value={bulkStudentStreamId} 
                      onChange={(e) => setBulkStudentStreamId(e.target.value)}
                      required
                      style={{ color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1", display: "block", width: "100%", height: "42px", padding: "8px 12px", borderRadius: "6px" }}
                    >
                      <option value="" style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>-- Choose stream --</option>
                      {streams.filter(st => st.classId === bulkStudentClassId).map(st => (
                        <option key={st.id} value={st.id} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label className="form-label" style={{ margin: 0, color: "#0f172a" }}>Select Excel Data File (.xlsx, .xls)</label>
                    <button 
                      type="button" 
                      onClick={downloadStudentTemplate}
                      className="btn btn-outline"
                      style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#f8fafc" }}
                    >
                      📥 Download Excel Template
                    </button>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls"
                    className="input-field" 
                    onChange={(e) => setStudentExcelFile(e.target.files?.[0] || null)}
                    required
                    style={{ padding: "8px", color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}
                  />
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", lineHeight: "1.4" }}>
                    Please download the official template, input the details, and upload the completed workbook.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Import List</button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowBulkStudentModal(false);
                      setStudentExcelFile(null);
                    }}
                    className="btn btn-outline" 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. Bulk Upload Staff Modal */}
      {showBulkStaffModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "550px", background: "white", padding: "30px", boxShadow: "var(--shadow-lg)" }}>
            <h3 style={{ marginBottom: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "10px", color: "#0f172a" }}>Bulk Upload Staff</h3>
            
            <form onSubmit={handleBulkStaffUpload}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ margin: 0, color: "#0f172a" }}>Select Excel Data File (.xlsx, .xls)</label>
                  <button 
                    type="button" 
                    onClick={downloadStaffTemplate}
                    className="btn btn-outline"
                    style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#f8fafc" }}
                  >
                    📥 Download Excel Template
                  </button>
                </div>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  className="input-field" 
                  onChange={(e) => setStaffExcelFile(e.target.files?.[0] || null)}
                  required
                  style={{ padding: "8px", color: "#0f172a", backgroundColor: "#ffffff", borderColor: "#cbd5e1" }}
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px", lineHeight: "1.4" }}>
                  Please download the official template, input the details, and upload the completed workbook.
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Import List</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkStaffModal(false);
                    setStaffExcelFile(null);
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

      {/* Auto-Import Student Modal */}
      {showAutoImportModal && autoImportTx && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <h3 style={{ marginBottom: "8px" }}>Import New Student</h3>
            <p style={{ color: "#64748b", marginBottom: "20px", fontSize: "13px" }}>
              Creating a profile for <strong>{autoImportTx.studentName}</strong> based on their SchoolPay transaction. This will automatically record their payment of <strong>{autoImportTx.amount.toLocaleString()} UGX</strong>.
            </p>
            <form onSubmit={handleAutoImportStudent}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Reported Class</label>
                  <input type="text" className="input-field" value={autoImportTx.studentClass || "Unknown"} disabled style={{ background: "#f8fafc" }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Code</label>
                  <input type="text" className="input-field" value={autoImportTx.studentPaymentCode || ""} disabled style={{ background: "#f8fafc" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">Assign Class</label>
                  <select className="input-field" value={autoImportClassId} onChange={e => { setAutoImportClassId(e.target.value); const strms = streams.filter(s => s.classId === e.target.value); if(strms.length) setAutoImportStreamId(strms[0].id); }} required>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Stream</label>
                  <select className="input-field" value={autoImportStreamId} onChange={e => setAutoImportStreamId(e.target.value)} required>
                    {streams.filter(s => s.classId === autoImportClassId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Student Type</label>
                <select className="input-field" value={autoImportType} onChange={e => setAutoImportType(e.target.value as any)}>
                  <option value="DAY">Day Scholar</option>
                  <option value="BOARDING">Boarding Student</option>
                </select>
              </div>

              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "16px" }}>
                <h5 style={{ marginBottom: "12px" }}>Apply Transaction To:</h5>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Term</label>
                    <select className="input-field" value={autoImportTerm} onChange={e => setAutoImportTerm(e.target.value)}>
                      <option value="1">Term 1</option>
                      <option value="2">Term 2</option>
                      <option value="3">Term 3</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input type="number" className="input-field" value={autoImportYear} onChange={e => setAutoImportYear(e.target.value)} required />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Student & Match</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAutoImportModal(false);
                    setAutoImportTx(null);
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
