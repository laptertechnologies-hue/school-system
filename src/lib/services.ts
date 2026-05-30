// Data Services Layer - Supports PostgreSQL via Prisma & client/server Mock Fallback
import { prisma } from "./db";

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
}

export interface User {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  passwordHash: string; // for mock it's just raw password for simplicity
  role: "ADMIN" | "HEADTEACHER" | "DIRECTOR" | "DOS" | "TEACHER";
  createdAt: Date;
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
  competencyGrade?: string; // A, B, C, D, E or 1-8 for primary PLE
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

// Initial Mock Database State
const INITIAL_MOCK_DB = {
  schools: [
    {
      id: "school-1",
      name: "Greenhill Academy",
      subdomain: "greenhill",
      packageType: "PREMIUM",
      status: "ACTIVE",
      studentRange: "500-1000",
      contactEmail: "info@greenhill.ac.ug",
      contactPhone: "+256 414 342678",
      createdAt: new Date("2026-01-15"),
      expiresAt: new Date("2027-01-15"),
    },
    {
      id: "school-2",
      name: "Kampala Parents Primary School",
      subdomain: "kpps",
      packageType: "BASIC",
      status: "ACTIVE",
      studentRange: "200-500",
      contactEmail: "admin@kpps.ac.ug",
      contactPhone: "+256 414 250100",
      createdAt: new Date("2026-02-10"),
      expiresAt: new Date("2027-02-10"),
    },
    {
      id: "school-3",
      name: "St. Mary's College Kisubi",
      subdomain: "smack",
      packageType: "PREMIUM",
      status: "PENDING",
      studentRange: "1000+",
      contactEmail: "smack@gmail.com",
      contactPhone: "+256 701 568392",
      createdAt: new Date("2026-05-28"),
      expiresAt: null,
    }
  ] as School[],

  users: [
    // Super admin
    {
      id: "user-super",
      schoolId: "super",
      name: "Lapter Admin",
      email: "admin@schoolpro.ug",
      passwordHash: "admin",
      role: "ADMIN",
      createdAt: new Date("2026-01-01"),
    },
    // Greenhill Academy users
    {
      id: "user-gh-admin",
      schoolId: "school-1",
      name: "Kakooza Ronald",
      email: "admin@greenhill.ug",
      passwordHash: "password",
      role: "ADMIN",
      createdAt: new Date("2026-01-15"),
    },
    {
      id: "user-gh-dos",
      schoolId: "school-1",
      name: "Nassolo Sylvia",
      email: "dos@greenhill.ug",
      passwordHash: "password",
      role: "DOS",
      createdAt: new Date("2026-01-16"),
    },
    {
      id: "user-gh-teacher",
      schoolId: "school-1",
      name: "Okwera Joseph",
      email: "teacher@greenhill.ug",
      passwordHash: "password",
      role: "TEACHER",
      createdAt: new Date("2026-01-16"),
    },
    {
      id: "user-gh-head",
      schoolId: "school-1",
      name: "Dr. Lwanga Moses",
      email: "head@greenhill.ug",
      passwordHash: "password",
      role: "HEADTEACHER",
      createdAt: new Date("2026-01-15"),
    },
    {
      id: "user-gh-director",
      schoolId: "school-1",
      name: "Hajji Bulwadda",
      email: "director@greenhill.ug",
      passwordHash: "password",
      role: "DIRECTOR",
      createdAt: new Date("2026-01-15"),
    }
  ] as User[],

  classes: [
    { id: "class-p7", schoolId: "school-1", name: "P7", level: "PRIMARY" },
    { id: "class-p6", schoolId: "school-1", name: "P6", level: "PRIMARY" },
    { id: "class-s4", schoolId: "school-1", name: "S4", level: "SECONDARY" },
    { id: "class-s1", schoolId: "school-1", name: "S1", level: "SECONDARY" },
  ] as Class[],

  streams: [
    { id: "stream-blue", classId: "class-p7", name: "Blue" },
    { id: "stream-red", classId: "class-p7", name: "Red" },
    { id: "stream-east", classId: "class-s4", name: "East" },
    { id: "stream-west", classId: "class-s4", name: "West" },
  ] as Stream[],

  students: [
    { id: "stud-1", schoolId: "school-1", classId: "class-p7", streamId: "stream-blue", name: "Mukasa John", studentNumber: "GH-2026-001", type: "BOARDING" },
    { id: "stud-2", schoolId: "school-1", classId: "class-p7", streamId: "stream-blue", name: "Nakato Brenda", studentNumber: "GH-2026-002", type: "DAY" },
    { id: "stud-3", schoolId: "school-1", classId: "class-s4", streamId: "stream-east", name: "Nsubuga Sarah", studentNumber: "GH-2026-003", type: "BOARDING" },
    { id: "stud-4", schoolId: "school-1", classId: "class-s4", streamId: "stream-west", name: "Ochen David", studentNumber: "GH-2026-004", type: "DAY" },
  ] as Student[],

  subjects: [
    // Primary P7
    { id: "subj-mtc", schoolId: "school-1", classId: "class-p7", name: "Mathematics", code: "MTC" },
    { id: "subj-eng", schoolId: "school-1", classId: "class-p7", name: "English", code: "ENG" },
    { id: "subj-sci", schoolId: "school-1", classId: "class-p7", name: "Integrated Science", code: "SCI" },
    { id: "subj-sst", schoolId: "school-1", classId: "class-p7", name: "Social Studies", code: "SST" },
    // Secondary S4
    { id: "subj-s-mtc", schoolId: "school-1", classId: "class-s4", name: "Mathematics", code: "MTH" },
    { id: "subj-s-phy", schoolId: "school-1", classId: "class-s4", name: "Physics", code: "PHY" },
    { id: "subj-s-che", schoolId: "school-1", classId: "class-s4", name: "Chemistry", code: "CHE" },
    { id: "subj-s-bio", schoolId: "school-1", classId: "class-s4", name: "Biology", code: "BIO" },
    { id: "subj-s-eng", schoolId: "school-1", classId: "class-s4", name: "English Language", code: "ENG" },
  ] as Subject[],

  teacherSubjects: [
    { id: "ts-1", teacherId: "user-gh-teacher", subjectId: "subj-mtc", classId: "class-p7", streamId: "stream-blue" },
    { id: "ts-2", teacherId: "user-gh-teacher", subjectId: "subj-s-mtc", classId: "class-s4", streamId: "stream-east" },
  ] as TeacherSubject[],

  examPapers: [
    { id: "exam-bot-1", schoolId: "school-1", term: 1, year: 2026, name: "Beginning of Term (BOT)", maxMarks: 100, isNewCurriculum: false },
    { id: "exam-mot-1", schoolId: "school-1", term: 1, year: 2026, name: "Mid-Term Examination (MOT)", maxMarks: 100, isNewCurriculum: false },
    { id: "exam-eot-1", schoolId: "school-1", term: 1, year: 2026, name: "End of Term (EOT)", maxMarks: 100, isNewCurriculum: false },
    { id: "exam-s4-cbc", schoolId: "school-1", term: 1, year: 2026, name: "S4 Continuous Assessment & Projects", maxMarks: 20, isNewCurriculum: true },
  ] as ExamPaper[],

  marks: [
    // P7 Mukasa John Term 1 Marks
    { id: "mark-1", studentId: "stud-1", examPaperId: "exam-eot-1", subjectId: "subj-mtc", score: 85, competencyGrade: "1", comments: "Excellent performance, keep it up", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-2", studentId: "stud-1", examPaperId: "exam-eot-1", subjectId: "subj-eng", score: 76, competencyGrade: "2", comments: "Very good grammar", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-3", studentId: "stud-1", examPaperId: "exam-eot-1", subjectId: "subj-sci", score: 92, competencyGrade: "1", comments: "Superb scientific knowledge", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-4", studentId: "stud-1", examPaperId: "exam-eot-1", subjectId: "subj-sst", score: 80, competencyGrade: "1", comments: "Outstanding understanding of history", createdAt: new Date(), createdById: "user-gh-teacher" },

    // P7 Nakato Brenda Term 1 Marks
    { id: "mark-5", studentId: "stud-2", examPaperId: "exam-eot-1", subjectId: "subj-mtc", score: 48, competencyGrade: "7", comments: "Requires extra guidance in equations", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-6", studentId: "stud-2", examPaperId: "exam-eot-1", subjectId: "subj-eng", score: 62, competencyGrade: "4", comments: "Good, but work on handwriting", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-7", studentId: "stud-2", examPaperId: "exam-eot-1", subjectId: "subj-sci", score: 55, competencyGrade: "6", comments: "Fair trial", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-8", studentId: "stud-2", examPaperId: "exam-eot-1", subjectId: "subj-sst", score: 68, competencyGrade: "3", comments: "Promising performance", createdAt: new Date(), createdById: "user-gh-teacher" },

    // S4 Nsubuga Sarah (New Curriculum CBC - letter grades A-E)
    { id: "mark-9", studentId: "stud-3", examPaperId: "exam-s4-cbc", subjectId: "subj-s-mtc", score: 18, competencyGrade: "A", comments: "Exceeds expectations in mathematics concepts", createdAt: new Date(), createdById: "user-gh-teacher" },
    { id: "mark-10", studentId: "stud-3", examPaperId: "exam-s4-cbc", subjectId: "subj-s-phy", score: 14, competencyGrade: "C", comments: "Satisfactory electrical circuit calculations", createdAt: new Date(), createdById: "user-gh-teacher" },
  ] as Mark[],

  payments: [
    { id: "pay-1", schoolId: "school-1", amount: 350000, method: "MOBILE_MONEY", status: "COMPLETED", date: new Date("2026-02-15"), txRef: "TX-MM-12894" },
    { id: "pay-2", schoolId: "school-1", amount: 350000, method: "BANK", status: "COMPLETED", date: new Date("2026-05-15"), txRef: "TX-BK-89021" },
    { id: "pay-3", schoolId: "school-2", amount: 150000, method: "MOBILE_MONEY", status: "COMPLETED", date: new Date("2026-03-01"), txRef: "TX-MM-77291" },
  ] as Payment[],

  feeStructures: [
    { id: "fs-1", schoolId: "school-1", classId: "class-p7", term: 1, year: 2026, tuitionAmount: 400000, boardingAmount: 750000 },
    { id: "fs-2", schoolId: "school-1", classId: "class-s4", term: 1, year: 2026, tuitionAmount: 600000, boardingAmount: 950000 },
  ] as FeeStructure[],

  studentPayments: [
    { id: "sp-1", studentId: "stud-1", term: 1, year: 2026, amountPaid: 1150000, balance: 0, date: new Date("2026-02-02") },
    { id: "sp-2", studentId: "stud-2", term: 1, year: 2026, amountPaid: 250000, balance: 150000, date: new Date("2026-02-05") },
    { id: "sp-3", studentId: "stud-3", term: 1, year: 2026, amountPaid: 950000, balance: 0, date: new Date("2026-02-03") },
  ] as StudentPayment[],

  expenses: [
    { id: "exp-1", schoolId: "school-1", category: "Salaries", amount: 1200000, description: "Teacher wages for Feb", date: new Date("2026-02-28") },
    { id: "exp-2", schoolId: "school-1", category: "Food & Boarding", amount: 850000, description: "Beans & Posho supply", date: new Date("2026-03-05") },
  ] as Expense[],
};

// Retrieve Database state
function getLocalDB(): typeof INITIAL_MOCK_DB {
  if (typeof window === "undefined") {
    return INITIAL_MOCK_DB;
  }
  const local = localStorage.getItem("school_pro_db");
  if (!local) {
    localStorage.setItem("school_pro_db", JSON.stringify(INITIAL_MOCK_DB));
    return INITIAL_MOCK_DB;
  }
  try {
    const parsed = JSON.parse(local) as typeof INITIAL_MOCK_DB;
    // Convert date strings back to Dates
    parsed.schools.forEach((s: any) => { if (s.createdAt) s.createdAt = new Date(s.createdAt); if (s.expiresAt) s.expiresAt = new Date(s.expiresAt); });
    parsed.users.forEach((u: any) => { if (u.createdAt) u.createdAt = new Date(u.createdAt); });
    parsed.marks.forEach((m: any) => { if (m.createdAt) m.createdAt = new Date(m.createdAt); });
    parsed.payments.forEach((p: any) => { if (p.date) p.date = new Date(p.date); });
    parsed.expenses.forEach((e: any) => { if (e.date) e.date = new Date(e.date); });
    parsed.studentPayments.forEach((sp: any) => { if (sp.date) sp.date = new Date(sp.date); });
    return parsed;
  } catch {
    return INITIAL_MOCK_DB;
  }
}

function saveLocalDB(db: typeof INITIAL_MOCK_DB) {
  if (typeof window !== "undefined") {
    localStorage.setItem("school_pro_db", JSON.stringify(db));
  }
}

// Database helper checker
const hasDB = () => {
  return !!process.env.DATABASE_URL;
};

// Helper to generate IDs
const uuid = () => Math.random().toString(36).substring(2, 11);

export const dataService = {
  // --- Schools ---
  async getSchools(): Promise<School[]> {
    if (hasDB()) {
      return (await prisma.school.findMany()) as School[];
    }
    return getLocalDB().schools;
  },

  async getSchoolBySubdomain(subdomain: string): Promise<School | null> {
    if (hasDB()) {
      return (await prisma.school.findUnique({ where: { subdomain } })) as School | null;
    }
    const school = getLocalDB().schools.find((s) => s.subdomain === subdomain);
    return school || null;
  },

  async createSchool(data: Omit<School, "id" | "createdAt" | "status">): Promise<School> {
    const newSchool: School = {
      ...data,
      id: "school-" + uuid(),
      status: "PENDING",
      createdAt: new Date(),
    };

    if (hasDB()) {
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

    const db = getLocalDB();
    db.schools.push(newSchool);
    saveLocalDB(db);
    return newSchool;
  },

  async updateSchoolStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<School> {
    if (hasDB()) {
      return (await prisma.school.update({
        where: { id },
        data: { status, expiresAt: status === "ACTIVE" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null },
      })) as School;
    }

    const db = getLocalDB();
    const school = db.schools.find((s) => s.id === id);
    if (!school) throw new Error("School not found");
    school.status = status;
    school.expiresAt = status === "ACTIVE" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;
    saveLocalDB(db);
    return school;
  },

  // --- Users & Authentication ---
  async authenticateUser(email: string, passwordHash: string, subdomain: string): Promise<User | null> {
    if (hasDB()) {
      // Find school
      const school = await prisma.school.findUnique({ where: { subdomain } });
      if (!school) return null;
      const user = await prisma.user.findFirst({
        where: { schoolId: school.id, email, passwordHash },
      });
      return user as User | null;
    }

    const db = getLocalDB();
    if (subdomain === "admin") {
      const user = db.users.find((u) => u.schoolId === "super" && u.email === email && u.passwordHash === passwordHash);
      return user || null;
    }
    const school = db.schools.find((s) => s.subdomain === subdomain);
    if (!school) return null;
    const user = db.users.find((u) => u.schoolId === school.id && u.email === email && u.passwordHash === passwordHash);
    return user || null;
  },

  async getUsers(schoolId: string): Promise<User[]> {
    if (hasDB()) {
      return (await prisma.user.findMany({ where: { schoolId } })) as User[];
    }
    return getLocalDB().users.filter((u) => u.schoolId === schoolId);
  },

  async createUser(data: Omit<User, "id" | "createdAt">): Promise<User> {
    const newUser: User = {
      ...data,
      id: "user-" + uuid(),
      createdAt: new Date(),
    };

    if (hasDB()) {
      return (await prisma.user.create({
        data: {
          schoolId: data.schoolId,
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role,
        },
      })) as User;
    }

    const db = getLocalDB();
    db.users.push(newUser);
    saveLocalDB(db);
    return newUser;
  },

  // --- Classes & Streams ---
  async getClasses(schoolId: string): Promise<Class[]> {
    if (hasDB()) {
      return (await prisma.class.findMany({ where: { schoolId } })) as Class[];
    }
    return getLocalDB().classes.filter((c) => c.schoolId === schoolId);
  },

  async createClass(schoolId: string, name: string, level: "PRIMARY" | "SECONDARY"): Promise<Class> {
    if (hasDB()) {
      return (await prisma.class.create({ data: { schoolId, name, level } })) as Class;
    }
    const db = getLocalDB();
    const newClass: Class = { id: "class-" + uuid(), schoolId, name, level };
    db.classes.push(newClass);
    saveLocalDB(db);
    return newClass;
  },

  async getStreams(schoolId: string): Promise<Stream[]> {
    if (hasDB()) {
      return (await prisma.stream.findMany({
        where: { class: { schoolId } },
      })) as Stream[];
    }
    const db = getLocalDB();
    const classes = db.classes.filter((c) => c.schoolId === schoolId).map((c) => c.id);
    return db.streams.filter((s) => classes.includes(s.classId));
  },

  async createStream(classId: string, name: string): Promise<Stream> {
    if (hasDB()) {
      return (await prisma.stream.create({ data: { classId, name } })) as Stream;
    }
    const db = getLocalDB();
    const newStream: Stream = { id: "stream-" + uuid(), classId, name };
    db.streams.push(newStream);
    saveLocalDB(db);
    return newStream;
  },

  // --- Students ---
  async getStudents(schoolId: string): Promise<Student[]> {
    if (hasDB()) {
      return (await prisma.student.findMany({ where: { schoolId } })) as Student[];
    }
    return getLocalDB().students.filter((s) => s.schoolId === schoolId);
  },

  async createStudent(data: Omit<Student, "id">): Promise<Student> {
    if (hasDB()) {
      return (await prisma.student.create({ data })) as Student;
    }
    const db = getLocalDB();
    const newStudent = { ...data, id: "stud-" + uuid() };
    db.students.push(newStudent);
    saveLocalDB(db);
    return newStudent;
  },

  // --- Subjects ---
  async getSubjects(schoolId: string): Promise<Subject[]> {
    if (hasDB()) {
      return (await prisma.subject.findMany({ where: { schoolId } })) as Subject[];
    }
    return getLocalDB().subjects.filter((s) => s.schoolId === schoolId);
  },

  async createSubject(data: Omit<Subject, "id">): Promise<Subject> {
    if (hasDB()) {
      return (await prisma.subject.create({ data })) as Subject;
    }
    const db = getLocalDB();
    const newSubj = { ...data, id: "subj-" + uuid() };
    db.subjects.push(newSubj);
    saveLocalDB(db);
    return newSubj;
  },

  // --- Exams ---
  async getExamPapers(schoolId: string): Promise<ExamPaper[]> {
    if (hasDB()) {
      return (await prisma.examPaper.findMany({ where: { schoolId } })) as ExamPaper[];
    }
    return getLocalDB().examPapers.filter((e) => e.schoolId === schoolId);
  },

  async createExamPaper(data: Omit<ExamPaper, "id">): Promise<ExamPaper> {
    if (hasDB()) {
      return (await prisma.examPaper.create({ data })) as ExamPaper;
    }
    const db = getLocalDB();
    const newExam = { ...data, id: "exam-" + uuid() };
    db.examPapers.push(newExam);
    saveLocalDB(db);
    return newExam;
  },

  // --- Marks ---
  async getMarks(schoolId: string): Promise<Mark[]> {
    if (hasDB()) {
      return (await prisma.mark.findMany({
        where: { student: { schoolId } },
      })) as Mark[];
    }
    const db = getLocalDB();
    const students = db.students.filter((s) => s.schoolId === schoolId).map((s) => s.id);
    return db.marks.filter((m) => students.includes(m.studentId));
  },

  async addMark(data: Omit<Mark, "id" | "createdAt">): Promise<Mark> {
    const newMark: Mark = {
      ...data,
      id: "mark-" + uuid(),
      createdAt: new Date(),
    };

    if (hasDB()) {
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

    const db = getLocalDB();
    // Overwrite old mark if same student, exam, and subject
    const index = db.marks.findIndex(
      (m) => m.studentId === data.studentId && m.examPaperId === data.examPaperId && m.subjectId === data.subjectId
    );
    if (index >= 0) {
      db.marks[index] = newMark;
    } else {
      db.marks.push(newMark);
    }
    saveLocalDB(db);
    return newMark;
  },

  // --- Payments & Fees ---
  async getPayments(schoolId: string): Promise<Payment[]> {
    if (hasDB()) {
      return (await prisma.payment.findMany({ where: { schoolId } })) as Payment[];
    }
    return getLocalDB().payments.filter((p) => p.schoolId === schoolId);
  },

  async createPayment(data: Omit<Payment, "id" | "date">): Promise<Payment> {
    const newPayment: Payment = {
      ...data,
      id: "pay-" + uuid(),
      date: new Date(),
    };

    if (hasDB()) {
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

    const db = getLocalDB();
    db.payments.push(newPayment);
    saveLocalDB(db);
    return newPayment;
  },

  async getFeeStructures(schoolId: string): Promise<FeeStructure[]> {
    if (hasDB()) {
      return (await prisma.feeStructure.findMany({ where: { schoolId } })) as FeeStructure[];
    }
    return getLocalDB().feeStructures.filter((fs) => fs.schoolId === schoolId);
  },

  async createFeeStructure(data: Omit<FeeStructure, "id">): Promise<FeeStructure> {
    if (hasDB()) {
      return (await prisma.feeStructure.create({ data })) as FeeStructure;
    }
    const db = getLocalDB();
    const newFS = { ...data, id: "fs-" + uuid() };
    db.feeStructures.push(newFS);
    saveLocalDB(db);
    return newFS;
  },

  async getStudentPayments(schoolId: string): Promise<StudentPayment[]> {
    if (hasDB()) {
      return (await prisma.studentPayment.findMany({
        where: { student: { schoolId } },
      })) as StudentPayment[];
    }
    const db = getLocalDB();
    const students = db.students.filter((s) => s.schoolId === schoolId).map((s) => s.id);
    return db.studentPayments.filter((sp) => students.includes(sp.studentId));
  },

  async recordStudentPayment(data: Omit<StudentPayment, "id" | "date">): Promise<StudentPayment> {
    const newSP: StudentPayment = {
      ...data,
      id: "sp-" + uuid(),
      date: new Date(),
    };

    if (hasDB()) {
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

    const db = getLocalDB();
    db.studentPayments.push(newSP);
    saveLocalDB(db);
    return newSP;
  },

  // --- Expenses ---
  async getExpenses(schoolId: string): Promise<Expense[]> {
    if (hasDB()) {
      return (await prisma.expense.findMany({ where: { schoolId } })) as Expense[];
    }
    return getLocalDB().expenses.filter((e) => e.schoolId === schoolId);
  },

  async createExpense(data: Omit<Expense, "id" | "date">): Promise<Expense> {
    const newExp: Expense = {
      ...data,
      id: "exp-" + uuid(),
      date: new Date(),
    };

    if (hasDB()) {
      return (await prisma.expense.create({
        data: {
          schoolId: data.schoolId,
          category: data.category,
          amount: data.amount,
          description: data.description,
        },
      })) as Expense;
    }

    const db = getLocalDB();
    db.expenses.push(newExp);
    saveLocalDB(db);
    return newExp;
  },
};
