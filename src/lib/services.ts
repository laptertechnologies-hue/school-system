"use server";

// Data Services Layer - Supports PostgreSQL via Prisma & Server Mock File Persistence
import { prisma } from "./db";
import fs from "fs";
import path from "path";

export interface School {
  id: string;
  name: string;
  subdomain: string;
  packageType: "BASIC" | "PREMIUM";
  status: "PENDING" | "ACTIVE" | "INACTIVE";
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

const MOCK_DB_PATH = path.join(process.cwd(), "prisma", "mock_db.json");

// In-Memory global backup for Vercel/read-only hosting platforms
let memoryDB: any = null;

function getLocalDB(): any {
  if (memoryDB) return memoryDB;

  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      const data = fs.readFileSync(MOCK_DB_PATH, "utf8");
      const parsed = JSON.parse(data);
      
      // Re-hydrate Date instances
      parsed.schools.forEach((s: any) => { 
        if (s.createdAt) s.createdAt = new Date(s.createdAt); 
        if (s.expiresAt) s.expiresAt = s.expiresAt ? new Date(s.expiresAt) : null; 
      });
      parsed.users.forEach((u: any) => { if (u.createdAt) u.createdAt = new Date(u.createdAt); });
      parsed.marks.forEach((m: any) => { if (m.createdAt) m.createdAt = new Date(m.createdAt); });
      parsed.payments.forEach((p: any) => { if (p.date) p.date = new Date(p.date); });
      parsed.expenses.forEach((e: any) => { if (e.date) e.date = new Date(e.date); });
      parsed.studentPayments.forEach((sp: any) => { if (sp.date) sp.date = new Date(sp.date); });
      parsed.attendances.forEach((at: any) => { if (at.date) at.date = new Date(at.date); });

      memoryDB = parsed;
      return memoryDB;
    }
  } catch (err) {
    console.error("Error loading mock JSON database file:", err);
  }

  // Fallback if file doesn't exist
  memoryDB = {
    schools: [],
    users: [],
    classes: [],
    streams: [],
    students: [],
    subjects: [],
    teacherSubjects: [],
    examPapers: [],
    marks: [],
    payments: [],
    feeStructures: [],
    studentPayments: [],
    expenses: [],
    attendances: []
  };
  return memoryDB;
}

function saveLocalDB(db: any) {
  memoryDB = db;
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (err: any) {
    console.warn("Could not save to disk (normal for read-only Vercel instances). Saved to memory:", err.message);
  }
}

// Database connectivity checker
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    // Perform a quick ping query
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    console.error("Prisma PostgreSQL connection failed:", err);
    return false;
  }
}

async function hasDB(): Promise<boolean> {
  return await checkDatabaseConnection();
}

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

// --- Schools ---
export async function getSchools(): Promise<School[]> {
  if (await hasDB()) {
    return (await prisma.school.findMany()) as School[];
  }
  return getLocalDB().schools;
}

export async function getSchoolBySubdomain(subdomain: string): Promise<School | null> {
  if (await hasDB()) {
    return (await prisma.school.findUnique({ where: { subdomain } })) as School | null;
  }
  const school = getLocalDB().schools.find((s: School) => s.subdomain === subdomain);
  return school || null;
}

export async function createSchool(data: Omit<School, "id" | "createdAt" | "status">): Promise<School> {
  if (await hasDB()) {
    return (await prisma.school.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        packageType: data.packageType,
        studentRange: data.studentRange,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    })) as School;
  }

  const newSchool: School = {
    ...data,
    id: "school-" + uuid(),
    status: "PENDING",
    createdAt: new Date(),
  };

  const db = getLocalDB();
  db.schools.push(newSchool);
  saveLocalDB(db);
  return newSchool;
}

export async function updateSchoolStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<School> {
  const expiresAt = status === "ACTIVE" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;
  
  if (await hasDB()) {
    return (await prisma.school.update({
      where: { id },
      data: { status, expiresAt },
    })) as School;
  }

  const db = getLocalDB();
  const school = db.schools.find((s: School) => s.id === id);
  if (!school) throw new Error("School not found");
  school.status = status;
  school.expiresAt = expiresAt;
  saveLocalDB(db);
  return school;
}

export async function updateSchoolMetadata(
  id: string,
  metadata: {
    poBox?: string | null;
    headTeacher?: string | null;
    deputyHeadTeacher?: string | null;
    director?: string | null;
    themeColor?: string | null;
    logoUrl?: string | null;
    name?: string;
    contactPhone?: string;
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
  }
): Promise<School> {
  if (await hasDB()) {
    return (await prisma.school.update({
      where: { id },
      data: metadata,
    })) as School;
  }

  const db = getLocalDB();
  const school = db.schools.find((s: School) => s.id === id);
  if (!school) throw new Error("School not found");
  
  // Merge metadata
  Object.assign(school, metadata);
  saveLocalDB(db);
  return school;
}

// --- Users & Authentication ---
export async function authenticateUser(email: string, passwordHash: string, subdomain: string): Promise<User | null> {
  if (await hasDB()) {
    if (subdomain === "admin") {
      const superAdmin = await prisma.user.findFirst({
        where: { schoolId: "super", email, passwordHash },
      });
      return superAdmin as User | null;
    }
    const school = await prisma.school.findUnique({ where: { subdomain } });
    if (!school) return null;
    const user = await prisma.user.findFirst({
      where: { schoolId: school.id, email, passwordHash },
    });
    return user as User | null;
  }

  const db = getLocalDB();
  if (subdomain === "admin") {
    const user = db.users.find((u: User) => u.schoolId === "super" && u.email === email && u.passwordHash === passwordHash);
    return user || null;
  }
  const school = db.schools.find((s: School) => s.subdomain === subdomain);
  if (!school) return null;
  const user = db.users.find((u: User) => u.schoolId === school.id && u.email === email && u.passwordHash === passwordHash);
  return user || null;
}

export async function getUsers(schoolId: string): Promise<User[]> {
  if (await hasDB()) {
    return (await prisma.user.findMany({ where: { schoolId } })) as User[];
  }
  return getLocalDB().users.filter((u: User) => u.schoolId === schoolId);
}

export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
  if (await hasDB()) {
    return (await prisma.user.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        photo: data.photo || null,
        staffNumber: data.staffNumber || null,
      },
    })) as User;
  }

  const newUser: User = {
    ...data,
    id: "user-" + uuid(),
    createdAt: new Date(),
  };

  const db = getLocalDB();
  db.users.push(newUser);
  saveLocalDB(db);
  return newUser;
}

export async function updateUser(id: string, data: Partial<Omit<User, "id" | "createdAt" | "schoolId">>): Promise<User> {
  if (await hasDB()) {
    return (await prisma.user.update({
      where: { id },
      data
    })) as User;
  }
  const db = getLocalDB();
  const idx = db.users.findIndex((u: User) => u.id === id);
  if (idx !== -1) {
    db.users[idx] = { ...db.users[idx], ...data };
    saveLocalDB(db);
    return db.users[idx];
  }
  throw new Error("User not found");
}

export async function deleteUser(id: string): Promise<boolean> {
  if (await hasDB()) {
    await prisma.user.delete({ where: { id } });
    return true;
  }
  const db = getLocalDB();
  const filtered = db.users.filter((u: User) => u.id !== id);
  if (filtered.length !== db.users.length) {
    db.users = filtered;
    saveLocalDB(db);
    return true;
  }
  return false;
}

// --- Classes & Streams ---
export async function getClasses(schoolId: string): Promise<Class[]> {
  if (await hasDB()) {
    return (await prisma.class.findMany({ where: { schoolId } })) as Class[];
  }
  return getLocalDB().classes.filter((c: Class) => c.schoolId === schoolId);
}

export async function createClass(schoolId: string, name: string, level: "PRIMARY" | "SECONDARY"): Promise<Class> {
  if (await hasDB()) {
    return (await prisma.class.create({ data: { schoolId, name, level } })) as Class;
  }
  const db = getLocalDB();
  const newClass: Class = { id: "class-" + uuid(), schoolId, name, level };
  db.classes.push(newClass);
  saveLocalDB(db);
  return newClass;
}

export async function getStreams(schoolId: string): Promise<Stream[]> {
  if (await hasDB()) {
    return (await prisma.stream.findMany({
      where: { class: { schoolId } },
    })) as Stream[];
  }
  const db = getLocalDB();
  const classes = db.classes.filter((c: Class) => c.schoolId === schoolId).map((c: Class) => c.id);
  return db.streams.filter((s: Stream) => classes.includes(s.classId));
}

export async function createStream(classId: string, name: string): Promise<Stream> {
  if (await hasDB()) {
    return (await prisma.stream.create({ data: { classId, name } })) as Stream;
  }
  const db = getLocalDB();
  const newStream: Stream = { id: "stream-" + uuid(), classId, name };
  db.streams.push(newStream);
  saveLocalDB(db);
  return newStream;
}

// --- Students ---
export async function getStudents(schoolId: string): Promise<Student[]> {
  if (await hasDB()) {
    return (await prisma.student.findMany({ where: { schoolId } })) as Student[];
  }
  return getLocalDB().students.filter((s: Student) => s.schoolId === schoolId);
}

export async function createStudent(data: Omit<Student, "id">): Promise<Student> {
  if (await hasDB()) {
    return (await prisma.student.create({ data })) as Student;
  }
  const db = getLocalDB();
  const newStudent = { ...data, id: "stud-" + uuid() };
  db.students.push(newStudent);
  saveLocalDB(db);
  return newStudent;
}

export async function updateStudent(id: string, data: Partial<Omit<Student, "id" | "schoolId">>): Promise<Student> {
  if (await hasDB()) {
    return (await prisma.student.update({
      where: { id },
      data
    })) as Student;
  }
  const db = getLocalDB();
  const idx = db.students.findIndex((s: Student) => s.id === id);
  if (idx !== -1) {
    db.students[idx] = { ...db.students[idx], ...data };
    saveLocalDB(db);
    return db.students[idx];
  }
  throw new Error("Student not found");
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (await hasDB()) {
    await prisma.student.delete({ where: { id } });
    return true;
  }
  const db = getLocalDB();
  const filtered = db.students.filter((s: Student) => s.id !== id);
  if (filtered.length !== db.students.length) {
    db.students = filtered;
    saveLocalDB(db);
    return true;
  }
  return false;
}

// --- Subjects ---
export async function getSubjects(schoolId: string): Promise<Subject[]> {
  if (await hasDB()) {
    return (await prisma.subject.findMany({ where: { schoolId } })) as Subject[];
  }
  return getLocalDB().subjects.filter((s: Subject) => s.schoolId === schoolId);
}

export async function createSubject(data: Omit<Subject, "id">): Promise<Subject> {
  if (await hasDB()) {
    return (await prisma.subject.create({ data })) as Subject;
  }
  const db = getLocalDB();
  const newSubj = { ...data, id: "subj-" + uuid() };
  db.subjects.push(newSubj);
  saveLocalDB(db);
  return newSubj;
}

// --- Exams ---
export async function getExamPapers(schoolId: string): Promise<ExamPaper[]> {
  if (await hasDB()) {
    return (await prisma.examPaper.findMany({ where: { schoolId } })) as ExamPaper[];
  }
  return getLocalDB().examPapers.filter((e: ExamPaper) => e.schoolId === schoolId);
}

export async function createExamPaper(data: Omit<ExamPaper, "id">): Promise<ExamPaper> {
  if (await hasDB()) {
    return (await prisma.examPaper.create({ data })) as ExamPaper;
  }
  const db = getLocalDB();
  const newExam = { ...data, id: "exam-" + uuid() };
  db.examPapers.push(newExam);
  saveLocalDB(db);
  return newExam;
}

// --- Marks ---
export async function getMarks(schoolId: string): Promise<Mark[]> {
  if (await hasDB()) {
    return (await prisma.mark.findMany({
      where: { student: { schoolId } },
    })) as Mark[];
  }
  const db = getLocalDB();
  const students = db.students.filter((s: Student) => s.schoolId === schoolId).map((s: Student) => s.id);
  return db.marks.filter((m: Mark) => students.includes(m.studentId));
}

export async function addMark(data: Omit<Mark, "id" | "createdAt">): Promise<Mark> {
  if (await hasDB()) {
    const oldMark = await prisma.mark.findFirst({
      where: { studentId: data.studentId, examPaperId: data.examPaperId, subjectId: data.subjectId }
    });
    if (oldMark) {
      return (await prisma.mark.update({
        where: { id: oldMark.id },
        data: { score: data.score, competencyGrade: data.competencyGrade, comments: data.comments, createdById: data.createdById }
      })) as Mark;
    }
    return (await prisma.mark.create({
      data: {
        studentId: data.studentId,
        examPaperId: data.examPaperId,
        subjectId: data.subjectId,
        score: data.score,
        competencyGrade: data.competencyGrade,
        comments: data.comments,
        createdById: data.createdById,
      },
    })) as Mark;
  }

  const newMark: Mark = {
    ...data,
    id: "mark-" + uuid(),
    createdAt: new Date(),
  };

  const db = getLocalDB();
  const index = db.marks.findIndex(
    (m: Mark) => m.studentId === data.studentId && m.examPaperId === data.examPaperId && m.subjectId === data.subjectId
  );
  if (index >= 0) {
    db.marks[index] = newMark;
  } else {
    db.marks.push(newMark);
  }
  saveLocalDB(db);
  return newMark;
}

// --- Payments & Fees ---
export async function getPayments(schoolId: string): Promise<Payment[]> {
  if (await hasDB()) {
    return (await prisma.payment.findMany({ where: { schoolId } })) as Payment[];
  }
  return getLocalDB().payments.filter((p: Payment) => p.schoolId === schoolId);
}

export async function createPayment(data: Omit<Payment, "id" | "date">): Promise<Payment> {
  if (await hasDB()) {
    return (await prisma.payment.create({
      data: {
        schoolId: data.schoolId,
        amount: data.amount,
        method: data.method,
        status: data.status,
        txRef: data.txRef,
      },
    })) as Payment;
  }

  const newPayment: Payment = {
    ...data,
    id: "pay-" + uuid(),
    date: new Date(),
  };

  const db = getLocalDB();
  db.payments.push(newPayment);
  saveLocalDB(db);
  return newPayment;
}

export async function getFeeStructures(schoolId: string): Promise<FeeStructure[]> {
  if (await hasDB()) {
    return (await prisma.feeStructure.findMany({ where: { schoolId } })) as FeeStructure[];
  }
  return getLocalDB().feeStructures.filter((fs: FeeStructure) => fs.schoolId === schoolId);
}

export async function createFeeStructure(data: Omit<FeeStructure, "id">): Promise<FeeStructure> {
  if (await hasDB()) {
    return (await prisma.feeStructure.create({ data })) as FeeStructure;
  }
  const db = getLocalDB();
  const newFS = { ...data, id: "fs-" + uuid() };
  db.feeStructures.push(newFS);
  saveLocalDB(db);
  return newFS;
}

export async function getStudentPayments(schoolId: string): Promise<StudentPayment[]> {
  if (await hasDB()) {
    return (await prisma.studentPayment.findMany({
      where: { student: { schoolId } },
    })) as StudentPayment[];
  }
  const db = getLocalDB();
  const students = db.students.filter((s: Student) => s.schoolId === schoolId).map((s: Student) => s.id);
  return db.studentPayments.filter((sp: StudentPayment) => students.includes(sp.studentId));
}

export async function recordStudentPayment(data: Omit<StudentPayment, "id" | "date">): Promise<StudentPayment> {
  if (await hasDB()) {
    return (await prisma.studentPayment.create({
      data: {
        studentId: data.studentId,
        term: data.term,
        year: data.year,
        amountPaid: data.amountPaid,
        balance: data.balance,
      },
    })) as StudentPayment;
  }

  const newSP: StudentPayment = {
    ...data,
    id: "sp-" + uuid(),
    date: new Date(),
  };

  const db = getLocalDB();
  db.studentPayments.push(newSP);
  saveLocalDB(db);
  return newSP;
}

// --- Expenses ---
export async function getExpenses(schoolId: string): Promise<Expense[]> {
  if (await hasDB()) {
    return (await prisma.expense.findMany({ where: { schoolId } })) as Expense[];
  }
  return getLocalDB().expenses.filter((e: Expense) => e.schoolId === schoolId);
}

export async function createExpense(data: Omit<Expense, "id" | "date">): Promise<Expense> {
  if (await hasDB()) {
    return (await prisma.expense.create({
      data: {
        schoolId: data.schoolId,
        category: data.category,
        amount: data.amount,
        description: data.description,
      },
    })) as Expense;
  }

  const newExp: Expense = {
    ...data,
    id: "exp-" + uuid(),
    date: new Date(),
  };

  const db = getLocalDB();
  db.expenses.push(newExp);
  saveLocalDB(db);
  return newExp;
}

// --- Attendance ---
export async function getAttendance(schoolId: string, classId: string, dateStr: string): Promise<Attendance[]> {
  const targetDate = new Date(dateStr);
  
  if (await hasDB()) {
    const classStudents = await prisma.student.findMany({
      where: { schoolId, classId },
      select: { id: true },
    });
    const studentIds = classStudents.map(s => s.id);
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    return (await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: startOfDay, lte: endOfDay }
      }
    })) as any[];
  }

  const db = getLocalDB();
  const classStudents = db.students.filter((s: Student) => s.schoolId === schoolId && s.classId === classId).map((s: Student) => s.id);
  return db.attendances.filter((at: Attendance) => 
    classStudents.includes(at.studentId) && 
    at.date.toDateString() === targetDate.toDateString()
  );
}

export async function recordAttendance(studentId: string, date: Date, status: "PRESENT" | "ABSENT" | "SICK", term: number, year: number): Promise<Attendance> {
  if (await hasDB()) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const oldAt = await prisma.attendance.findFirst({
      where: {
        studentId,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (oldAt) {
      return (await prisma.attendance.update({
        where: { id: oldAt.id },
        data: { status, term, year }
      })) as any;
    } else {
      return (await prisma.attendance.create({
        data: { studentId, date, status, term, year }
      })) as any;
    }
  }

  const newAt: Attendance = {
    id: "at-" + uuid(),
    studentId,
    date,
    status,
    term,
    year,
  };

  const db = getLocalDB();
  db.attendances = db.attendances.filter((at: Attendance) => 
    !(at.studentId === studentId && at.date.toDateString() === date.toDateString())
  );
  db.attendances.push(newAt);
  saveLocalDB(db);
  return newAt;
}

// --- Payroll / Teacher Salary ---
export async function processTeacherSalary(schoolId: string, teacherId: string, teacherName: string, amount: number, monthName: string): Promise<Expense> {
  return await createExpense({
    schoolId,
    category: "Salaries",
    amount,
    description: `Salary payment for ${teacherName} (${monthName})`,
  });
}

// --- Student Promotion ---
export async function promoteStudents(schoolId: string, fromClassId: string, toClassId: string): Promise<Student[]> {
  if (await hasDB()) {
    await prisma.student.updateMany({
      where: { schoolId, classId: fromClassId },
      data: { classId: toClassId }
    });
    return (await prisma.student.findMany({ where: { schoolId, classId: toClassId } })) as Student[];
  }

  const db = getLocalDB();
  db.students.forEach((s: Student) => {
    if (s.schoolId === schoolId && s.classId === fromClassId) {
      s.classId = toClassId;
    }
  });
  saveLocalDB(db);
  return db.students.filter((s: Student) => s.schoolId === schoolId && s.classId === toClassId);
}

// --- Marzpay API Integration ---
export async function initiateMarzpayCollection(
  amount: number,
  method: "mobile_money" | "card",
  phoneNumber?: string,
  description?: string
): Promise<any> {
  const reference = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  const payload: any = {
    amount,
    method,
    reference,
    country: "UG",
    description: description || "SchoolPro Payment"
  };

  if (method === "mobile_money" && phoneNumber) {
    // Format phone: e.g. 078... -> +25678...
    let cleanPhone = phoneNumber.trim().replace(/\s+/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "+256" + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith("+")) {
      cleanPhone = "+" + cleanPhone;
    }
    payload.phone_number = cleanPhone;
  }

  try {
    const response = await fetch("https://wallet.wearemarz.com/api/v1/collect-money", {
      method: "POST",
      headers: {
        "Authorization": "Basic bWFyel8zN0hIbWpPaExzZzFHRGYzOjFlOTV6UkRRUlRsdXJxbk4wcGxBc2dxVlQ5ZzFQNFhH",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log("Marzpay collection response:", result);
    return result;
  } catch (err: any) {
    console.error("Marzpay collection request error:", err);
    return {
      status: "failed",
      message: err.message || "Failed to contact Marzpay server"
    };
  }
}

export async function checkMarzpayCollectionStatus(uuid: string): Promise<any> {
  try {
    const response = await fetch(`https://wallet.wearemarz.com/api/v1/collect-money/${uuid}`, {
      method: "GET",
      headers: {
        "Authorization": "Basic bWFyel8zN0hIbWpPaExzZzFHRGYzOjFlOTV6UkRRUlRsdXJxbk4wcGxBc2dxVlQ5ZzFQNFhH"
      }
    });
    const result = await response.json();
    return result;
  } catch (err: any) {
    console.error("Marzpay status check error:", err);
    return {
      status: "failed",
      message: err.message || "Failed to fetch transaction status"
    };
  }
}

// --- SMS Broadcasting Simulation ---
export async function sendSmsBroadcast(schoolId: string, group: string, message: string): Promise<any> {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, "sms_broadcasts.log");
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] School: ${schoolId} | Group: ${group} | Message: "${message}"\n`;
  
  try {
    fs.appendFileSync(logPath, logEntry, "utf8");
    return {
      status: "success",
      timestamp,
      count: group === "Class Parents" ? 45 : group === "All Staff" ? 18 : 280
    };
  } catch (err: any) {
    console.error("SMS Broadcast Logging Failed:", err);
    return {
      status: "failed",
      message: err.message
    };
  }
}
