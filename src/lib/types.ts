// Shared types for School Management System
// This file has NO "use server" directive so it can be imported by both server and client components

export interface School {
  id: string;
  name: string;
  subdomain: string;
  packageType: "BASIC" | "PREMIUM";
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  schoolType: "PRIMARY" | "SECONDARY" | "COMBINED";
  studentRange: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: Date;
  expiresAt?: Date | null;
  logoUrl?: string | null;
  poBox?: string | null;
  headTeacher?: string | null;
  deputyHeadTeacher?: string | null;
  director?: string | null;
  themeColor?: string | null;
  reportTitle?: string | null;
  reportMotto?: string | null;
  reportShowBadge?: boolean;
  schoolPayCode?: string | null;
  schoolPayPassword?: string | null;
  currentTerm: number;
  currentYear: number;
  term1Start?: Date | null;
  term1End?: Date | null;
  term2Start?: Date | null;
  term2End?: Date | null;
  term3Start?: Date | null;
  term3End?: Date | null;
  reportShowResidency?: boolean;
  reportShowSignatures?: boolean;
  reportShowRules?: boolean;
  reportLogoSize?: number | null;
  reportShowStudentPhoto?: boolean | null;
  reportHeaderColor?: string | null;
  reportBorderType?: string | null;
  reportNextTermFeesDay?: number | null;
  reportNextTermFeesBoarding?: number | null;
  cbU1Max?: number | null;
  cbU2Max?: number | null;
  cbEtMax?: number | null;
  cbHpgMax?: number | null;
  cbU1Active?: boolean | null;
  cbU2Active?: boolean | null;
  cbEtActive?: boolean | null;
  cbHpgActive?: boolean | null;
  reportTikTok?: string | null;
  reportWebsite?: string | null;
  reportLocation?: string | null;
  reportShowChart?: boolean | null;
  reportShowLIN?: boolean | null;
  reportShowPayCode?: boolean | null;
  reportShowComments?: boolean | null;
  reportShowFees?: boolean | null;
  reportShowTermDates?: boolean | null;
  reportShowSummaryRow?: boolean | null;
}

export interface User {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "ADMIN" | "HEADTEACHER" | "DIRECTOR" | "DOS" | "TEACHER";
  createdAt: Date;
  photo?: string | null;
  staffNumber?: string | null;
  contact?: string | null; // Staff/Teacher phone number for SMS
  mustChangePassword?: boolean;
}

export interface Class {
  id: string;
  schoolId: string;
  name: string;
  level: "PRIMARY" | "SECONDARY";
  themeColor?: string | null;
  themeTextColor?: string | null;
}

export interface Stream {
  id: string;
  classId: string;
  name: string;
}

export interface Student {
  id: string;
  schoolId: string;
  classId: string;
  streamId: string;
  name: string;
  studentNumber: string;
  type: "DAY" | "BOARDING";
  photo?: string | null;
  lin?: string | null;
  studentPaymentCode?: string | null; // Admin-assigned identifier for payments
  registrationNumber?: string | null;
  gender?: string | null;
  parentContact?: string | null; // Parent/Guardian phone number for SMS
  parentPasswordHash?: string | null;
  parentMustChangePassword?: boolean;
  classTeacherComment?: string | null;
  headTeacherComment?: string | null;
}

export interface Subject {
  id: string;
  schoolId: string;
  classId: string;
  streamId?: string | null;
  name: string;
  code?: string;
}

export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  streamId: string;
}

export interface ExamPaper {
  id: string;
  schoolId: string;
  term: number;
  year: number;
  name: string;
  maxMarks: number;
  isNewCurriculum: boolean;
  classId?: string | null;
  cbU1Active?: boolean;
  cbU2Active?: boolean;
  cbEtActive?: boolean;
  cbHpgActive?: boolean;
  cbU1Max?: number;
  cbU2Max?: number;
  cbEtMax?: number;
  cbHpgMax?: number;
}

export interface Mark {
  id: string;
  studentId: string;
  examPaperId: string;
  subjectId: string;
  score: number;
  competencyGrade?: string;
  comments?: string;
  createdAt: Date;
  createdById: string;
  u1?: number | null;
  u2?: number | null;
  u3?: number | null;
  hpg?: number | null;
  eoy?: number | null;
}

export interface GradeRange {
  id: string;
  schoolId: string;
  systemType: "PRIMARY" | "SECONDARY";
  grade: string;
  minMark: number;
  maxMark: number;
  achievementLevel: string;
  descriptor: string;
  classTeacherComment?: string | null;
  headTeacherComment?: string | null;
}

export interface Payment {
  id: string;
  schoolId: string;
  amount: number;
  method: string;
  status: string;
  date: Date;
  txRef?: string;
}

export interface FeeStructure {
  id: string;
  schoolId: string;
  classId: string;
  term: number;
  year: number;
  tuitionAmount: number;
  boardingAmount: number;
}

export interface StudentPayment {
  id: string;
  studentId: string;
  term: number;
  year: number;
  amountPaid: number;
  balance: number;
  balanceBF?: number;
  notes?: string | null;
  paymentMethod?: string | null;
  receiptNumber?: string | null;
  date: Date;
}

export interface SchoolPayTransaction {
  id: string;
  schoolId: string;
  receiptNumber: string;
  amount: number;
  paymentDate: Date;
  studentName: string;
  studentPaymentCode: string;
  settlementBankCode?: string | null;
  sourceChannelTransId?: string | null;
  sourcePaymentChannel?: string | null;
  studentClass?: string | null;
  studentRegistrationNum?: string | null;
  reconciled: boolean;
  createdAt: Date;
}

export interface Expense {
  id: string;
  schoolId: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "SICK";
  term: number;
  year: number;
}

export interface SmsLog {
  id: string;
  schoolId: string;
  sentById: string;
  sentByName: string;
  audience: string;
  targetClassName?: string | null;
  message: string;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  totalCharged: number;
  profitCollected: number;
  smsCost: number;
  payerPhone?: string | null;
  marzPayRef?: string | null;
  status: string;
  creditUsed: boolean;
  createdAt: Date;
}

export interface SmsCredit {
  id: string;
  schoolId: string;
  creditsPurchased: number;
  creditsUsed: number;
  marzPayRef?: string | null;
  payerPhone?: string | null;
  amountPaid: number;
  status: string;
  purchasedAt: Date;
}

export interface Election {
  id: string;
  schoolId: string;
  title: string;
  status: string;
  term: number;
  year: number;
  createdAt: Date;
}

export interface PrefectCandidate {
  id: string;
  electionId: string;
  studentId: string;
  position: string;
  manifesto?: string | null;
}

export interface ElectionVote {
  id: string;
  electionId: string;
  candidateId: string;
  studentId: string;
  position: string;
  createdAt: Date;
}

export interface HolidayWork {
  id: string;
  schoolId: string;
  classId: string;
  streamId?: string | null;
  title: string;
  description: string;
  fileUrl?: string | null;
  deadline?: Date | null;
  term: number;
  year: number;
  createdAt: Date;
}

export interface HolidayWorkSubmission {
  id: string;
  holidayWorkId: string;
  studentId: string;
  fileUrl?: string | null;
  textSubmission?: string | null;
  grade?: string | null;
  teacherFeedback?: string | null;
  submittedAt: Date;
}
