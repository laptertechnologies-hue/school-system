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
  mustChangePassword?: boolean;
}

export interface Class {
  id: string;
  schoolId: string;
  name: string;
  level: "PRIMARY" | "SECONDARY";
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
  studentPaymentCode?: string | null;
  registrationNumber?: string | null;
}

export interface Subject {
  id: string;
  schoolId: string;
  classId: string;
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
  date: Date;
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
