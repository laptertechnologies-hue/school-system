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
  Attendance,
  SmsLog,
  SmsCredit
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

export async function updateSchoolDetails(
  id: string,
  data: {
    name?: string;
    contactEmail?: string;
    contactPhone?: string;
    studentRange?: string;
  }
): Promise<School> {
  if (await hasDB()) {
    const updated = await prisma.school.update({
      where: { id },
      data,
    });
    return serialize(updated as unknown as School);
  }

  const db = getLocalDB();
  const schoolIndex = db.schools.findIndex((s: School) => s.id === id);
  if (schoolIndex === -1) throw new Error("School not found");
  
  const school = db.schools[schoolIndex];
  if (data.name !== undefined) school.name = data.name;
  if (data.contactEmail !== undefined) school.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) school.contactPhone = data.contactPhone;
  if (data.studentRange !== undefined) school.studentRange = data.studentRange;
  
  saveLocalDB(db);
  return serialize(school);
}

export async function resetSchoolAdminPassword(schoolId: string): Promise<void> {
  // Finds the first admin of the school and resets their password to 'password'
  if (await hasDB()) {
    const admin = await prisma.user.findFirst({
      where: { schoolId, role: "ADMIN" },
      orderBy: { createdAt: "asc" }
    });
    if (!admin) throw new Error("No admin found for this school");
    
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: "password" }
    });
    return;
  }

  const db = getLocalDB();
  const admin = db.users.find((u: any) => u.schoolId === schoolId && u.role === "ADMIN");
  if (!admin) throw new Error("No admin found for this school");
  admin.passwordHash = "password";
  saveLocalDB(db);
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
  const sanitizedEmail = email.trim().toLowerCase();
  const sanitizedPassword = passwordHash.trim();
  
  try {
    if (await hasDB()) {
      if (subdomain === "admin") {
        const superAdmin = await prisma.user.findFirst({
          where: { schoolId: "super", email: sanitizedEmail, passwordHash: sanitizedPassword },
        });
        return serialize(superAdmin as User | null);
      }
      const school = await prisma.school.findUnique({ where: { subdomain } });
      if (!school) {
        return serialize({
          id: "ERROR",
          name: `School with subdomain '${subdomain}' not found.`,
          email: "error@error.com",
          role: "ERROR",
          schoolId: "error"
        } as unknown as User);
      }
      const user = await prisma.user.findFirst({
        where: { schoolId: school.id, email: sanitizedEmail, passwordHash: sanitizedPassword },
      });
      return serialize(user as User | null);
    }
  } catch (err: any) {
    console.error("Prisma error in authenticateUser:", err);
    if (process.env.DATABASE_URL) {
      return serialize({
        id: "ERROR",
        name: `DB Error: ${err.message}`,
        email: "error@error.com",
        role: "ERROR",
        schoolId: "error"
      } as unknown as User);
    }
    // Fall through to local DB if no remote DB configured
  }

  const db = getLocalDB();
  if (subdomain === "admin") {
    const user = db.users.find((u: User) => u.schoolId === "super" && u.email.toLowerCase() === sanitizedEmail && u.passwordHash === passwordHash);
    return serialize(user || null);
  }
  const school = db.schools.find((s: School) => s.subdomain === subdomain);
  if (!school) return null;
  const user = db.users.find((u: User) => u.schoolId === school.id && u.email.toLowerCase() === sanitizedEmail && u.passwordHash === passwordHash);
  return serialize(user || null);
}

export async function authenticateParent(subdomain: string, paymentCode: string, passwordHash: string): Promise<Student | null> {
  const sanitizedCode = paymentCode.trim();
  if (await hasDB()) {
    const school = await prisma.school.findUnique({ where: { subdomain } });
    if (!school) return null;

    const student = await prisma.student.findFirst({
      where: { schoolId: school.id, studentPaymentCode: sanitizedCode }
    });

    if (!student) return null;

    // The default temporary password is "password" (SHA-256: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8)
    const currentHash = student.parentPasswordHash || "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
    
    if (currentHash === passwordHash) {
      return serialize(student) as Student;
    }
    return null;
  }
  
  // Local DB fallback
  const db = getLocalDB();
  const school = db.schools.find((s: School) => s.subdomain === subdomain);
  if (!school) return null;
  
  const student = db.students.find((s: Student) => s.schoolId === school.id && s.studentPaymentCode === sanitizedCode);
  if (!student) return null;

  const currentHash = student.parentPasswordHash || "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";
  if (currentHash === passwordHash) {
    return serialize(student) as Student;
  }
  return null;
}

export async function getParentContactByPaycode(subdomain: string, paymentCode: string): Promise<{ contact: string | null; studentId: string | null }> {
  const sanitizedCode = paymentCode.trim();
  if (await hasDB()) {
    const school = await prisma.school.findUnique({ where: { subdomain } });
    if (!school) return { contact: null, studentId: null };
    const student = await prisma.student.findFirst({
      where: { schoolId: school.id, studentPaymentCode: sanitizedCode }
    });
    if (student) {
      return { contact: student.parentContact || null, studentId: student.id };
    }
  }
  return { contact: null, studentId: null };
}

export async function updateParentPassword(studentId: string, newPasswordHash: string): Promise<boolean> {
  if (await hasDB()) {
    await prisma.student.update({
      where: { id: studentId },
      data: { parentPasswordHash: newPasswordHash, parentMustChangePassword: false }
    });
    return true;
  }
  
  const db = getLocalDB();
  const student = db.students.find((s: Student) => s.id === studentId);
  if (student) {
    student.parentPasswordHash = newPasswordHash;
    student.parentMustChangePassword = false;
    saveLocalDB(db);
    return true;
  }
  return false;
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
          contact: data.contact || null,
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

export async function updateClass(id: string, name: string, level: "PRIMARY" | "SECONDARY", themeColor?: string | null, themeTextColor?: string | null): Promise<Class> {
  if (await hasDB()) {
    return (await prisma.class.update({
      where: { id },
      data: { name, level, themeColor, themeTextColor },
    })) as Class;
  }
  const db = getLocalDB();
  const idx = db.classes.findIndex((c: Class) => c.id === id);
  if (idx !== -1) {
    db.classes[idx] = { ...db.classes[idx], name, level, themeColor, themeTextColor };
    saveLocalDB(db);
    return db.classes[idx];
  }
  throw new Error("Class not found");
}

export async function deleteStudentsByClass(classId: string): Promise<boolean> {
  if (await hasDB()) {
    await prisma.student.deleteMany({ where: { classId } });
    return true;
  }
  const db = getLocalDB();
  const initialLength = db.students.length;
  db.students = db.students.filter((s: Student) => s.classId !== classId);
  if (db.students.length !== initialLength) {
    saveLocalDB(db);
    return true;
  }
  return false;
}


export async function deleteClass(classId: string): Promise<boolean> {
  if (await hasDB()) {
    // 1. Find all student IDs in the class
    const studentRecords = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });
    const studentIds = studentRecords.map(s => s.id);

    // 2. Delete marks, attendances, payments for these students
    if (studentIds.length > 0) {
      await prisma.mark.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.attendance.deleteMany({ where: { studentId: { in: studentIds } } });
      await prisma.studentPayment.deleteMany({ where: { studentId: { in: studentIds } } });
    }

    // 3. Delete students
    await prisma.student.deleteMany({ where: { classId } });

    // 4. Find all subject IDs in the class and delete their marks
    const subjectRecords = await prisma.subject.findMany({
      where: { classId },
      select: { id: true },
    });
    const subjectIds = subjectRecords.map(sub => sub.id);
    if (subjectIds.length > 0) {
      await prisma.mark.deleteMany({ where: { subjectId: { in: subjectIds } } });
      await prisma.teacherSubject.deleteMany({ where: { subjectId: { in: subjectIds } } });
    }

    // 5. Delete subjects
    await prisma.subject.deleteMany({ where: { classId } });

    // 6. Delete streams, fee structures, teacher subjects for class
    await prisma.stream.deleteMany({ where: { classId } });
    await prisma.feeStructure.deleteMany({ where: { classId } });
    await prisma.teacherSubject.deleteMany({ where: { classId } });

    // 7. Delete the class itself
    await prisma.class.delete({ where: { id: classId } });
    return true;
  }

  const db = getLocalDB();
  const classIdx = db.classes.findIndex((c: Class) => c.id === classId);
  if (classIdx !== -1) {
    const studentIds = db.students
      .filter((s: Student) => s.classId === classId)
      .map((s: Student) => s.id);

    db.marks = db.marks.filter((m: any) => !studentIds.includes(m.studentId));
    db.attendances = db.attendances.filter((a: any) => !studentIds.includes(a.studentId));
    db.studentPayments = db.studentPayments.filter((sp: any) => !studentIds.includes(sp.studentId));
    db.students = db.students.filter((s: Student) => s.classId !== classId);

    const subjectIds = db.subjects
      .filter((sub: Subject) => sub.classId === classId)
      .map((sub: Subject) => sub.id);

    db.marks = db.marks.filter((m: any) => !subjectIds.includes(m.subjectId));
    db.teacherSubjects = db.teacherSubjects.filter((ts: any) => !subjectIds.includes(ts.subjectId) && ts.classId !== classId);
    db.subjects = db.subjects.filter((sub: Subject) => sub.classId !== classId);

    db.streams = db.streams.filter((s: Stream) => s.classId !== classId);
    db.feeStructures = db.feeStructures.filter((fs: any) => fs.classId !== classId);
    db.classes.splice(classIdx, 1);
    saveLocalDB(db);
    return true;
  }
  return false;
}

export async function updateStream(id: string, name: string): Promise<Stream> {
  if (await hasDB()) {
    return (await prisma.stream.update({
      where: { id },
      data: { name },
    })) as Stream;
  }
  const db = getLocalDB();
  const idx = db.streams.findIndex((s: Stream) => s.id === id);
  if (idx !== -1) {
    db.streams[idx] = { ...db.streams[idx], name };
    saveLocalDB(db);
    return db.streams[idx];
  }
  throw new Error("Stream not found");
}

export async function deleteStream(streamId: string): Promise<boolean> {
  if (await hasDB()) {
    const studentCount = await prisma.student.count({ where: { streamId } });
    if (studentCount > 0) {
      throw new Error("Cannot delete stream because there are active students enrolled in it. Please reassign or delete the students first.");
    }
    await prisma.teacherSubject.deleteMany({ where: { streamId } });
    await prisma.stream.delete({ where: { id: streamId } });
    return true;
  }
  const db = getLocalDB();
  const idx = db.streams.findIndex((s: Stream) => s.id === streamId);
  if (idx !== -1) {
    const studentCount = db.students.filter((s: Student) => s.streamId === streamId).length;
    if (studentCount > 0) {
      throw new Error("Cannot delete stream because there are active students enrolled in it. Please reassign or delete the students first.");
    }
    db.teacherSubjects = db.teacherSubjects.filter((ts: any) => ts.streamId !== streamId);
    db.streams.splice(idx, 1);
    saveLocalDB(db);
    return true;
  }
  return false;
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

export async function deleteSubject(subjectId: string): Promise<boolean> {
  if (await hasDB()) {
    await prisma.mark.deleteMany({ where: { subjectId } });
    await prisma.teacherSubject.deleteMany({ where: { subjectId } });
    await prisma.subject.delete({ where: { id: subjectId } });
    return true;
  }
  const db = getLocalDB();
  const idx = db.subjects.findIndex((s: Subject) => s.id === subjectId);
  if (idx !== -1) {
    db.marks = db.marks.filter((m: any) => m.subjectId !== subjectId);
    db.teacherSubjects = db.teacherSubjects.filter((ts: any) => ts.subjectId !== subjectId);
    db.subjects.splice(idx, 1);
    saveLocalDB(db);
    return true;
  }
  return false;
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

export async function updateExamPaper(id: string, data: Partial<Omit<ExamPaper, "id">>): Promise<ExamPaper> {
  if (await hasDB()) {
    return (await prisma.examPaper.update({ where: { id }, data })) as ExamPaper;
  }
  const db = getLocalDB();
  const idx = db.examPapers.findIndex((e: any) => e.id === id);
  if (idx !== -1) {
    db.examPapers[idx] = { ...db.examPapers[idx], ...data };
    saveLocalDB(db);
    return db.examPapers[idx];
  }
  throw new Error("Exam paper not found");
}

export async function deleteExamPaper(id: string): Promise<void> {
  if (await hasDB()) {
    await prisma.examPaper.delete({ where: { id } });
    return;
  }
  const db = getLocalDB();
  db.examPapers = db.examPapers.filter((e: any) => e.id !== id);
  db.marks = db.marks.filter((m: any) => m.examPaperId !== id);
  saveLocalDB(db);
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
    const oldStreams = await prisma.stream.findMany({ where: { classId: fromClassId } });
    const newStreams = await prisma.stream.findMany({ where: { classId: toClassId } });
    const studentsToPromote = await prisma.student.findMany({ where: { schoolId, classId: fromClassId } });

    for (const student of studentsToPromote) {
      const currentStream = oldStreams.find(st => st.id === student.streamId);
      const matchedNewStream = currentStream 
        ? newStreams.find(st => st.name.toLowerCase() === currentStream.name.toLowerCase())
        : null;

      const destinationStreamId = matchedNewStream?.id || newStreams[0]?.id || student.streamId;

      await prisma.student.update({
        where: { id: student.id },
        data: {
          classId: toClassId,
          streamId: destinationStreamId
        }
      });
    }

    return (await prisma.student.findMany({ where: { schoolId, classId: toClassId } })) as Student[];
  }

  const db = getLocalDB();
  const oldStreams = db.streams.filter((s: Stream) => s.classId === fromClassId);
  const newStreams = db.streams.filter((s: Stream) => s.classId === toClassId);

  db.students.forEach((s: Student) => {
    if (s.schoolId === schoolId && s.classId === fromClassId) {
      const currentStream = oldStreams.find((st: Stream) => st.id === s.streamId);
      const matchedNewStream = currentStream
        ? newStreams.find((st: Stream) => st.name.toLowerCase() === currentStream.name.toLowerCase())
        : null;

      const destinationStreamId = matchedNewStream?.id || newStreams[0]?.id || s.streamId;
      s.classId = toClassId;
      s.streamId = destinationStreamId;
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

// --- SMS Log Management ---
export async function getSmsLogs(schoolId: string): Promise<SmsLog[]> {
  try {
    if (await hasDB()) {
      const logs = await prisma.smsLog.findMany({
        where: { schoolId },
        orderBy: { createdAt: "desc" }
      });
      return logs as SmsLog[];
    }
  } catch (err: any) {
    console.error("Prisma error in getSmsLogs:", err);
  }
  const db = getLocalDB();
  if (!db.smsLogs) db.smsLogs = [];
  return db.smsLogs.filter((l: SmsLog) => l.schoolId === schoolId)
    .sort((a: SmsLog, b: SmsLog) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveSmsLog(data: Omit<SmsLog, "id" | "createdAt">): Promise<SmsLog> {
  try {
    if (await hasDB()) {
      return (await prisma.smsLog.create({ data })) as SmsLog;
    }
  } catch (err: any) {
    console.error("Prisma error in saveSmsLog:", err);
  }
  const db = getLocalDB();
  if (!db.smsLogs) db.smsLogs = [];
  const newLog: SmsLog = { ...data, id: "slog-" + uuid(), createdAt: new Date() };
  db.smsLogs.push(newLog);
  saveLocalDB(db);
  return newLog;
}

export async function updateSmsLog(id: string, data: Partial<Omit<SmsLog, "id" | "schoolId" | "createdAt">>): Promise<SmsLog> {
  try {
    if (await hasDB()) {
      return (await prisma.smsLog.update({ where: { id }, data })) as SmsLog;
    }
  } catch (err: any) {
    console.error("Prisma error in updateSmsLog:", err);
  }
  const db = getLocalDB();
  if (!db.smsLogs) db.smsLogs = [];
  const idx = db.smsLogs.findIndex((l: SmsLog) => l.id === id);
  if (idx !== -1) {
    db.smsLogs[idx] = { ...db.smsLogs[idx], ...data };
    saveLocalDB(db);
    return db.smsLogs[idx];
  }
  throw new Error("SmsLog not found");
}

// --- SMS Credits Management ---
export async function getSmsCredits(schoolId: string): Promise<SmsCredit[]> {
  try {
    if (await hasDB()) {
      return (await prisma.smsCredit.findMany({ where: { schoolId }, orderBy: { purchasedAt: "desc" } })) as SmsCredit[];
    }
  } catch (err: any) {
    console.error("Prisma error in getSmsCredits:", err);
  }
  const db = getLocalDB();
  if (!db.smsCredits) db.smsCredits = [];
  return db.smsCredits.filter((c: SmsCredit) => c.schoolId === schoolId);
}

export async function getTotalAvailableSmsCredits(schoolId: string): Promise<number> {
  const credits = await getSmsCredits(schoolId);
  const confirmed = credits.filter(c => c.status === "CONFIRMED");
  return confirmed.reduce((sum, c) => sum + (c.creditsPurchased - c.creditsUsed), 0);
}

export async function deductSmsCredits(schoolId: string, amount: number): Promise<void> {
  let remaining = amount;
  try {
    if (await hasDB()) {
      const credits = await prisma.smsCredit.findMany({
        where: { schoolId, status: "CONFIRMED" },
        orderBy: { purchasedAt: "asc" }
      });
      for (const credit of credits) {
        if (remaining <= 0) break;
        const available = credit.creditsPurchased - credit.creditsUsed;
        const deduct = Math.min(available, remaining);
        await prisma.smsCredit.update({ where: { id: credit.id }, data: { creditsUsed: credit.creditsUsed + deduct } });
        remaining -= deduct;
      }
      return;
    }
  } catch (err: any) {
    console.error("Prisma error in deductSmsCredits:", err);
  }
  const db = getLocalDB();
  if (!db.smsCredits) return;
  for (const credit of db.smsCredits.filter((c: SmsCredit) => c.schoolId === schoolId && c.status === "CONFIRMED")) {
    if (remaining <= 0) break;
    const available = credit.creditsPurchased - credit.creditsUsed;
    const deduct = Math.min(available, remaining);
    credit.creditsUsed += deduct;
    remaining -= deduct;
  }
  saveLocalDB(db);
}

export async function saveSmsCredit(data: Omit<SmsCredit, "id" | "purchasedAt">): Promise<SmsCredit> {
  try {
    if (await hasDB()) {
      return (await prisma.smsCredit.create({ data })) as SmsCredit;
    }
  } catch (err: any) {
    console.error("Prisma error in saveSmsCredit:", err);
  }
  const db = getLocalDB();
  if (!db.smsCredits) db.smsCredits = [];
  const newCredit: SmsCredit = { ...data, id: "scred-" + uuid(), purchasedAt: new Date() };
  db.smsCredits.push(newCredit);
  saveLocalDB(db);
  return newCredit;
}

export async function updateSmsCredit(id: string, data: Partial<Omit<SmsCredit, "id" | "schoolId">>): Promise<SmsCredit> {
  try {
    if (await hasDB()) {
      return (await prisma.smsCredit.update({ where: { id }, data })) as SmsCredit;
    }
  } catch (err: any) {
    console.error("Prisma error in updateSmsCredit:", err);
  }
  const db = getLocalDB();
  if (!db.smsCredits) db.smsCredits = [];
  const idx = db.smsCredits.findIndex((c: SmsCredit) => c.id === id);
  if (idx !== -1) {
    db.smsCredits[idx] = { ...db.smsCredits[idx], ...data };
    saveLocalDB(db);
    return db.smsCredits[idx];
  }
  throw new Error("SmsCredit not found");
}

// --- Real MarzSMS Send ---
const MARZ_SMS_API_KEY = process.env.MARZ_SMS_API_KEY || "";
const MARZ_SMS_API_SECRET = process.env.MARZ_SMS_API_SECRET || "";
const MARZ_SMS_BASE64 = process.env.MARZ_SMS_BASE64 || "";

function getMarzSmsAuthHeader(): string {
  if (MARZ_SMS_BASE64) return `Basic ${MARZ_SMS_BASE64}`;
  if (MARZ_SMS_API_KEY && MARZ_SMS_API_SECRET) {
    const encoded = Buffer.from(`${MARZ_SMS_API_KEY}:${MARZ_SMS_API_SECRET}`).toString("base64");
    return `Basic ${encoded}`;
  }
  return "";
}

export async function getMarzSmsBalance(): Promise<{ success: boolean; balance?: number; costPerSms?: number; currency?: string; error?: string }> {
  try {
    const auth = getMarzSmsAuthHeader();
    if (!auth) return { success: false, error: "MarzSMS API credentials not configured" };
    const response = await fetch("https://sms.wearemarz.com/api/v1/account/balance", {
      method: "GET",
      headers: { "Authorization": auth }
    });
    const result = await response.json();
    if (result.success && result.data) {
      return { success: true, balance: result.data.balance, costPerSms: result.data.cost_per_sms, currency: result.data.currency };
    }
    return { success: false, error: result.message || "Failed to get balance" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export async function sendRealSms(recipients: string[], message: string): Promise<{
  success: boolean;
  totalSent: number;
  totalFailed: number;
  results?: any[];
  error?: string;
}> {
  try {
    const auth = getMarzSmsAuthHeader();
    if (!auth) return { success: false, totalSent: 0, totalFailed: recipients.length, error: "MarzSMS API credentials not configured" };

    // Format recipients: normalize Uganda phone numbers
    const formattedRecipients = recipients.map(phone => {
      let p = phone.trim().replace(/\s+/g, "");
      if (p.startsWith("0")) p = "+256" + p.substring(1);
      else if (p.startsWith("256") && !p.startsWith("+")) p = "+" + p;
      else if (!p.startsWith("+")) p = "+256" + p;
      return p;
    });

    const recipientStr = formattedRecipients.join(", ");
    const response = await fetch("https://sms.wearemarz.com/api/v1/sms/send", {
      method: "POST",
      headers: { "Authorization": auth, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: recipientStr, message })
    });
    const result = await response.json();
    if (result.success && result.data) {
      return {
        success: true,
        totalSent: result.data.successful || 0,
        totalFailed: result.data.failed || 0,
        results: result.data.results
      };
    }
    return { success: false, totalSent: 0, totalFailed: recipients.length, error: result.message || "SMS send failed" };
  } catch (err: any) {
    return { success: false, totalSent: 0, totalFailed: recipients.length, error: err.message || "Network error" };
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

// ==== PARENT PORTAL ADMIN APIs ====
export async function getElections(schoolId: string) {
  if (await hasDB()) {
    return serialize(await prisma.election.findMany({ 
      where: { schoolId }, 
      include: { candidates: { include: { student: true } } } 
    }));
  }
  return [];
}

export async function createElection(schoolId: string, title: string, term: number, year: number) {
  if (await hasDB()) {
    return serialize(await prisma.election.create({ data: { schoolId, title, term, year } }));
  }
}

export async function addCandidate(electionId: string, studentId: string, position: string, manifesto: string) {
  if (await hasDB()) {
    return serialize(await prisma.prefectCandidate.create({ data: { electionId, studentId, position, manifesto } }));
  }
}

export async function getHolidayWorks(schoolId: string) {
  if (await hasDB()) {
    return serialize(await prisma.holidayWork.findMany({ 
      where: { schoolId }, 
      include: { class: true, stream: true, submissions: true } 
    }));
  }
  return [];
}

export async function createHolidayWork(schoolId: string, classId: string, streamId: string | null, title: string, description: string, term: number, year: number) {
  if (await hasDB()) {
    return serialize(await prisma.holidayWork.create({ data: { schoolId, classId, streamId, title, description, term, year } }));
  }
}
