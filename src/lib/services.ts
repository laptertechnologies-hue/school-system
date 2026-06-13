"use server";

// Data Services Layer - Supports PostgreSQL via Prisma & Server Mock File Persistence
import { prisma } from "./db";
import fs from "fs";
import path from "path";
import dns from "dns";

// Import all shared types from types.ts (neutral file, no "use server")
import type {
  School,
  User,
  Class,
  Stream,
  Student,
  Subject,
  TeacherSubject,
  ExamPaper,
  Mark,
  GradeRange,
  Payment,
  FeeStructure,
  StudentPayment,
  Expense,
  Attendance
} from "./types";




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

// Cache the DB connection check for 30 seconds to avoid redundant pings
let _dbCache: { value: boolean; ts: number } | null = null;
async function hasDB(): Promise<boolean> {
  const now = Date.now();
  if (_dbCache && (now - _dbCache.ts) < 30000) return _dbCache.value;
  const result = await checkDatabaseConnection();
  _dbCache = { value: result, ts: now };
  return result;
}

// Safe wrapper for Prisma queries — catches and logs errors, returns fallback
async function safePrisma<T>(fn: () => Promise<T>, fallback: T): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err: any) {
    console.error("Prisma query error:", err?.message || err);
    _dbCache = null; // Invalidate cache so next call re-checks connection
    return { ok: false };
  }
}

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

const serialize = <T>(data: T): T => {
  if (data === undefined || data === null) return data;
  return JSON.parse(JSON.stringify(data));
};

// --- Schools ---
export async function getSchools(): Promise<School[]> {
  try {
    if (await hasDB()) {
      return serialize((await prisma.school.findMany()) as School[]);
    }
  } catch (err: any) {
    console.error("Prisma error in getSchools:", err);
    // Fall through to local DB
  }
  return serialize(getLocalDB().schools);
}

export async function getSchoolBySubdomain(subdomain: string): Promise<School | null> {
  try {
    if (await hasDB()) {
      return serialize((await prisma.school.findUnique({ where: { subdomain } })) as School | null);
    }
  } catch (err: any) {
    console.error("Prisma error in getSchoolBySubdomain:", err);
    return serialize({
      id: err.message || String(err),
      name: "DB_ERROR_INDICATOR",
      subdomain,
      status: "ERROR",
      packageType: "BASIC",
      schoolType: "COMBINED",
      studentRange: "N/A",
      contactEmail: "",
      contactPhone: "",
      createdAt: new Date(),
    }) as any;
  }
  const school = getLocalDB().schools.find((s: School) => s.subdomain === subdomain);
  return serialize(school || null);
}

export async function createSchool(data: Omit<School, "id" | "createdAt" | "status">): Promise<School> {
  let createdSchool: School;

  if (await hasDB()) {
    createdSchool = (await prisma.school.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        packageType: data.packageType,
        schoolType: data.schoolType,
        studentRange: data.studentRange,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
    })) as School;

    // Seeding default classes & streams based on schoolType
    const schoolId = createdSchool.id;
    const classesToSeed: { name: string; level: "PRIMARY" | "SECONDARY" }[] = [];

    if (data.schoolType === "PRIMARY" || data.schoolType === "COMBINED") {
      ["P1", "P2", "P3", "P4", "P5", "P6", "P7"].forEach(name => {
        classesToSeed.push({ name, level: "PRIMARY" });
      });
    }
    if (data.schoolType === "SECONDARY" || data.schoolType === "COMBINED") {
      ["S1", "S2", "S3", "S4", "S5", "S6"].forEach(name => {
        classesToSeed.push({ name, level: "SECONDARY" });
      });
    }

    for (const c of classesToSeed) {
      const cls = await prisma.class.create({
        data: {
          schoolId,
          name: c.name,
          level: c.level,
        }
      });
      // Add default streams for each class
      const streamsToCreate = c.level === "PRIMARY" ? ["Blue", "Gold"] : ["A", "B"];
      for (const streamName of streamsToCreate) {
        await prisma.stream.create({
          data: {
            classId: cls.id,
            name: streamName,
          }
        });
      }
    }

    return serialize(createdSchool);
  }

  const schoolId = "school-" + uuid();
  createdSchool = {
    ...data,
    id: schoolId,
    status: "PENDING",
    createdAt: new Date(),
  };

  const db = getLocalDB();
  db.schools.push(createdSchool);

  // Seeding default classes & streams in Mock JSON DB
  const classesToSeed: { name: string; level: "PRIMARY" | "SECONDARY" }[] = [];
  if (data.schoolType === "PRIMARY" || data.schoolType === "COMBINED") {
    ["P1", "P2", "P3", "P4", "P5", "P6", "P7"].forEach(name => {
      classesToSeed.push({ name, level: "PRIMARY" });
    });
  }
  if (data.schoolType === "SECONDARY" || data.schoolType === "COMBINED") {
    ["S1", "S2", "S3", "S4", "S5", "S6"].forEach(name => {
      classesToSeed.push({ name, level: "SECONDARY" });
    });
  }

  classesToSeed.forEach(c => {
    const classId = "class-" + uuid();
    db.classes.push({
      id: classId,
      schoolId,
      name: c.name,
      level: c.level,
    });

    const streamsToCreate = c.level === "PRIMARY" ? ["Blue", "Gold"] : ["A", "B"];
    streamsToCreate.forEach(streamName => {
      db.streams.push({
        id: "stream-" + uuid(),
        schoolId,
        classId,
        name: streamName,
      });
    });
  });

  saveLocalDB(db);
  return serialize(createdSchool);
}

export async function updateSchoolStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<School> {
  const expiresAt = status === "ACTIVE" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;
  
  if (await hasDB()) {
    return serialize((await prisma.school.update({
      where: { id },
      data: { status, expiresAt },
    })) as School);
  }

  const db = getLocalDB();
  const school = db.schools.find((s: School) => s.id === id);
  if (!school) throw new Error("School not found");
  school.status = status;
  school.expiresAt = expiresAt;
  saveLocalDB(db);
  return serialize(school);
}

export async function updateSchoolSubscription(
  id: string, 
  data: { 
    packageType?: "BASIC" | "PREMIUM"; 
    status?: "PENDING" | "ACTIVE" | "INACTIVE"; 
    expiresAt?: Date | null;
  }
): Promise<School> {
  const updateData: any = {};
  if (data.packageType !== undefined) updateData.packageType = data.packageType;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

  if (await hasDB()) {
    return serialize((await prisma.school.update({
      where: { id },
      data: updateData,
    })) as School);
  }

  const db = getLocalDB();
  const school = db.schools.find((s: School) => s.id === id);
  if (!school) throw new Error("School not found");
  
  if (data.packageType !== undefined) school.packageType = data.packageType;
  if (data.status !== undefined) school.status = data.status;
  if (data.expiresAt !== undefined) {
    school.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }
  
  saveLocalDB(db);
  return serialize(school);
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
    schoolType?: "PRIMARY" | "SECONDARY" | "COMBINED";
    schoolPayCode?: string | null;
    schoolPayPassword?: string | null;
    currentTerm?: number;
    currentYear?: number;
    term1Start?: Date | null;
    term1End?: Date | null;
    term2Start?: Date | null;
    term2End?: Date | null;
    term3Start?: Date | null;
    term3End?: Date | null;
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
): Promise<School> {
  if (await hasDB()) {
    return serialize((await prisma.school.update({
      where: { id },
      data: metadata,
    })) as School);
  }

  const db = getLocalDB();
  const school = db.schools.find((s: School) => s.id === id);
  if (!school) throw new Error("School not found");
  
  // Merge metadata
  Object.assign(school, metadata);
  saveLocalDB(db);
  return serialize(school);
}

// --- Users & Authentication ---
export async function authenticateUser(email: string, passwordHash: string, subdomain: string): Promise<User | null> {
  try {
    if (await hasDB()) {
      if (subdomain === "admin") {
        const superAdmin = await prisma.user.findFirst({
          where: { schoolId: "super", email, passwordHash },
        });
        return serialize(superAdmin as User | null);
      }
      const school = await prisma.school.findUnique({ where: { subdomain } });
      if (!school) return null;
      const user = await prisma.user.findFirst({
        where: { schoolId: school.id, email, passwordHash },
      });
      return serialize(user as User | null);
    }
  } catch (err: any) {
    console.error("Prisma error in authenticateUser:", err);
    // Fall through to local DB
  }

  const db = getLocalDB();
  if (subdomain === "admin") {
    const user = db.users.find((u: User) => u.schoolId === "super" && u.email === email && u.passwordHash === passwordHash);
    return serialize(user || null);
  }
  const school = db.schools.find((s: School) => s.subdomain === subdomain);
  if (!school) return null;
  const user = db.users.find((u: User) => u.schoolId === school.id && u.email === email && u.passwordHash === passwordHash);
  return serialize(user || null);
}

export async function getUsers(schoolId: string): Promise<User[]> {
  if (await hasDB()) {
    return serialize((await prisma.user.findMany({ where: { schoolId } })) as User[]);
  }
  return serialize(getLocalDB().users.filter((u: User) => u.schoolId === schoolId));
}

export async function createUser(data: Omit<User, "id" | "createdAt">): Promise<{ success: boolean; error?: string; data?: User }> {
  try {
    if (await hasDB()) {
      // Direct duplicate check to return human-readable error
      const existing = await prisma.user.findFirst({
        where: { schoolId: data.schoolId, email: data.email }
      });
      if (existing) {
        return { success: false, error: "A staff account with this email address is already registered at this school." };
      }

      const created = (await prisma.user.create({
        data: {
          schoolId: data.schoolId,
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
          photo: data.photo || null,
          staffNumber: data.staffNumber || null,
          mustChangePassword: data.mustChangePassword ?? true,
        },
      })) as User;
      return { success: true, data: serialize(created) };
    }

    const db = getLocalDB();
    const existing = db.users.find((u: User) => u.schoolId === data.schoolId && u.email === data.email);
    if (existing) {
      return { success: false, error: "A staff account with this email address is already registered at this school." };
    }

    const newUser: User = {
      ...data,
      id: "user-" + uuid(),
      createdAt: new Date(),
      mustChangePassword: data.mustChangePassword ?? true,
    };

    db.users.push(newUser);
    saveLocalDB(db);
    return { success: true, data: serialize(newUser) };
  } catch (err: any) {
    console.error("Error in createUser service:", err);
    return { success: false, error: err.message || String(err) };
  }
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

export async function resetUserPassword(schoolId: string, email: string, newPasswordHash: string): Promise<boolean> {
  if (await hasDB()) {
    const user = await prisma.user.findFirst({
      where: { schoolId, email }
    });
    if (!user) return false;
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash }
    });
    return true;
  }
  const db = getLocalDB();
  const user = db.users.find((u: User) => u.schoolId === schoolId && u.email === email);
  if (!user) return false;
  user.passwordHash = newPasswordHash;
  saveLocalDB(db);
  return true;
}

export async function getTeacherSubjects(schoolId: string): Promise<TeacherSubject[]> {
  if (await hasDB()) {
    return (await prisma.teacherSubject.findMany({
      where: { class: { schoolId } }
    })) as TeacherSubject[];
  }
  const db = getLocalDB();
  if (!db.teacherSubjects) {
    db.teacherSubjects = [];
    saveLocalDB(db);
  }
  const classIds = db.classes.filter((c: Class) => c.schoolId === schoolId).map((c: Class) => c.id);
  return db.teacherSubjects.filter((ts: TeacherSubject) => classIds.includes(ts.classId));
}

export async function createTeacherSubject(data: Omit<TeacherSubject, "id">): Promise<TeacherSubject> {
  if (await hasDB()) {
    return (await prisma.teacherSubject.create({
      data: {
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        classId: data.classId,
        streamId: data.streamId
      }
    })) as TeacherSubject;
  }
  const db = getLocalDB();
  if (!db.teacherSubjects) db.teacherSubjects = [];
  const newTS: TeacherSubject = {
    ...data,
    id: "ts-" + uuid()
  };
  db.teacherSubjects.push(newTS);
  saveLocalDB(db);
  return newTS;
}

export async function deleteTeacherSubject(id: string): Promise<boolean> {
  if (await hasDB()) {
    await prisma.teacherSubject.delete({ where: { id } });
    return true;
  }
  const db = getLocalDB();
  if (!db.teacherSubjects) db.teacherSubjects = [];
  const filtered = db.teacherSubjects.filter((ts: TeacherSubject) => ts.id !== id);
  if (filtered.length !== db.teacherSubjects.length) {
    db.teacherSubjects = filtered;
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
    return serialize((await prisma.mark.findMany({
      where: { student: { schoolId } },
    })) as Mark[]);
  }
  const db = getLocalDB();
  const students = db.students.filter((s: Student) => s.schoolId === schoolId).map((s: Student) => s.id);
  return serialize(db.marks.filter((m: Mark) => students.includes(m.studentId)));
}

export async function addMark(data: Omit<Mark, "id" | "createdAt">): Promise<Mark> {
  if (await hasDB()) {
    const oldMark = await prisma.mark.findFirst({
      where: { studentId: data.studentId, examPaperId: data.examPaperId, subjectId: data.subjectId }
    });
    if (oldMark) {
      return (await prisma.mark.update({
        where: { id: oldMark.id },
        data: { 
          score: data.score, 
          competencyGrade: data.competencyGrade, 
          comments: data.comments, 
          createdById: data.createdById,
          u1: data.u1 || null,
          u2: data.u2 || null,
          u3: data.u3 || null,
          hpg: data.hpg || null,
          eoy: data.eoy || null
        }
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
        u1: data.u1 || null,
        u2: data.u2 || null,
        u3: data.u3 || null,
        hpg: data.hpg || null,
        eoy: data.eoy || null
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
    return serialize((await prisma.payment.findMany({ where: { schoolId } })) as Payment[]);
  }
  return serialize(getLocalDB().payments.filter((p: Payment) => p.schoolId === schoolId));
}

export async function createPayment(data: Omit<Payment, "id" | "date">): Promise<Payment> {
  if (await hasDB()) {
    return serialize((await prisma.payment.create({
      data: {
        schoolId: data.schoolId,
        amount: data.amount,
        method: data.method,
        status: data.status,
        txRef: data.txRef,
      },
    })) as Payment);
  }

  const newPayment: Payment = {
    ...data,
    id: "pay-" + uuid(),
    date: new Date(),
  };

  const db = getLocalDB();
  db.payments.push(newPayment);
  saveLocalDB(db);
  return serialize(newPayment);
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
    return serialize((await prisma.studentPayment.findMany({
      where: { student: { schoolId } },
    })) as StudentPayment[]);
  }
  const db = getLocalDB();
  const students = db.students.filter((s: Student) => s.schoolId === schoolId).map((s: Student) => s.id);
  return serialize(db.studentPayments.filter((sp: StudentPayment) => students.includes(sp.studentId)));
}

export async function recordStudentPayment(data: Omit<StudentPayment, "id" | "date">): Promise<StudentPayment> {
  if (await hasDB()) {
    return serialize((await prisma.studentPayment.create({
      data: {
        studentId: data.studentId,
        term: data.term,
        year: data.year,
        amountPaid: data.amountPaid,
        balance: data.balance,
        balanceBF: data.balanceBF ?? 0,
        notes: data.notes ?? null,
        paymentMethod: data.paymentMethod ?? "CASH",
        receiptNumber: data.receiptNumber ?? null,
      },
    })) as StudentPayment);
  }

  const newSP: StudentPayment = {
    ...data,
    id: "sp-" + uuid(),
    date: new Date(),
  };

  const db = getLocalDB();
  db.studentPayments.push(newSP);
  saveLocalDB(db);
  return serialize(newSP);
}

export async function deleteStudentPayment(paymentId: string): Promise<void> {
  if (await hasDB()) {
    await prisma.studentPayment.delete({ where: { id: paymentId } });
    return;
  }
  const db = getLocalDB();
  db.studentPayments = db.studentPayments.filter((sp: StudentPayment) => sp.id !== paymentId);
  saveLocalDB(db);
}

export async function getSchoolPayTransactions(schoolId: string): Promise<any[]> {
  if (await hasDB()) {
    return serialize(await prisma.schoolPayTransaction.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' }
    }));
  }
  return [];
}

// --- Expenses ---
export async function getExpenses(schoolId: string): Promise<Expense[]> {
  if (await hasDB()) {
    return serialize((await prisma.expense.findMany({ where: { schoolId } })) as Expense[]);
  }
  return serialize(getLocalDB().expenses.filter((e: Expense) => e.schoolId === schoolId));
}

export async function createExpense(data: Omit<Expense, "id" | "date">): Promise<Expense> {
  if (await hasDB()) {
    return serialize((await prisma.expense.create({
      data: {
        schoolId: data.schoolId,
        category: data.category,
        amount: data.amount,
        description: data.description,
      },
    })) as Expense);
  }

  const newExp: Expense = {
    ...data,
    id: "exp-" + uuid(),
    date: new Date(),
  };

  const db = getLocalDB();
  db.expenses.push(newExp);
  saveLocalDB(db);
  return serialize(newExp);
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
    
    return serialize((await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: startOfDay, lte: endOfDay }
      }
    })) as any[]);
  }

  const db = getLocalDB();
  const classStudents = db.students.filter((s: Student) => s.schoolId === schoolId && s.classId === classId).map((s: Student) => s.id);
  return serialize(db.attendances.filter((at: Attendance) => 
    classStudents.includes(at.studentId) && 
    at.date.toDateString() === targetDate.toDateString()
  ));
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
      return serialize((await prisma.attendance.update({
        where: { id: oldAt.id },
        data: { status, term, year }
      })) as any);
    } else {
      return serialize((await prisma.attendance.create({
        data: { studentId, date, status, term, year }
      })) as any);
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
  return serialize(newAt);
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

// --- Grade Ranges Custom Settings ---
export async function getGradeRanges(schoolId: string): Promise<GradeRange[]> {
  try {
    if (await hasDB()) {
      const dbRanges = await prisma.gradeRange.findMany({
        where: { schoolId },
        orderBy: [{ systemType: "asc" }, { minMark: "desc" }]
      });
      return dbRanges as GradeRange[];
    }
  } catch (err: any) {
    console.error("Prisma error in getGradeRanges:", err);
    return [{
      id: "DB_ERROR_INDICATOR",
      schoolId: schoolId,
      systemType: "PRIMARY",
      grade: "ERROR",
      minMark: 0,
      maxMark: 0,
      achievementLevel: err.message || String(err),
      descriptor: ""
    }];
  }
  const db = getLocalDB();
  if (!db.gradeRanges) {
    db.gradeRanges = [];
    saveLocalDB(db);
  }
  return db.gradeRanges.filter((r: GradeRange) => r.schoolId === schoolId);
}

export async function saveGradeRanges(schoolId: string, ranges: Omit<GradeRange, "id" | "schoolId">[]): Promise<GradeRange[]> {
  try {
    if (await hasDB()) {
      await prisma.gradeRange.deleteMany({ where: { schoolId } });
      await prisma.gradeRange.createMany({
        data: ranges.map(r => ({ ...r, schoolId }))
      });
      return (await prisma.gradeRange.findMany({
        where: { schoolId },
        orderBy: [{ systemType: "asc" }, { minMark: "desc" }]
      })) as GradeRange[];
    }
  } catch (err: any) {
    console.error("Prisma error in saveGradeRanges:", err);
    // Fall back to memory DB operations or return the default ranges
  }
  const db = getLocalDB();
  if (!db.gradeRanges) db.gradeRanges = [];
  db.gradeRanges = db.gradeRanges.filter((r: GradeRange) => r.schoolId !== schoolId);
  const newRanges = ranges.map(r => ({ ...r, schoolId, id: "grade-" + uuid() }));
  db.gradeRanges.push(...newRanges);
  saveLocalDB(db);
  return newRanges;
}

export async function runDiagnostics() {
  try {
    const result: any = {
      databaseUrlPresent: !!process.env.DATABASE_URL,
      databaseUrlLength: process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0,
      databaseUrlStart: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + "..." : "",
      nodeVersion: process.version,
      envKeys: Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("PASSWORD") && !k.includes("SECRET") && !k.includes("AUTH")),
      prismaStatus: "unknown",
      prismaError: null as string | null,
      prismaStack: null as string | null,
      dnsTest: "unknown",
      dnsError: null as string | null,
    };

    // Test DNS resolution of neon database
    if (process.env.DATABASE_URL) {
      try {
        const dbUrl = process.env.DATABASE_URL;
        // Extract hostname
        let host = "";
        const match = dbUrl.match(/@([^/:]+)/);
        if (match) {
          host = match[1];
        }
        if (host) {
          result.dbHost = host;
          await new Promise((resolve, reject) => {
            dns.lookup(host, (err: any, address: string) => {
              if (err) reject(err);
              else resolve(address);
            });
          });
          result.dnsTest = "resolved";
        } else {
          result.dnsTest = "invalid host pattern";
        }
      } catch (err: any) {
        result.dnsTest = "failed";
        result.dnsError = err.message || String(err);
      }
    }

    // Test Prisma Client connection query
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      result.prismaStatus = `connected (${Date.now() - start}ms)`;
    } catch (err: any) {
      result.prismaStatus = "failed";
      result.prismaError = err.message || String(err);
      result.prismaStack = err.stack || null;
    }

    return serialize(result);
  } catch (globalErr: any) {
    console.error("Global diagnostics error on server:", globalErr);
    return serialize({
      error: true,
      errorMessage: globalErr.message || String(globalErr),
      prismaStatus: "diagnostics failed to execute",
      dnsTest: "diagnostics failed to execute",
    });
  }
}
