import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  const dataPath = path.join(__dirname, "mock_db.json");
  if (!fs.existsSync(dataPath)) {
    console.error("mock_db.json not found inside prisma directory!");
    return;
  }
  const raw = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(raw);

  console.log("Clearing existing data...");
  // Delete in reverse order of foreign key dependencies
  await prisma.attendance.deleteMany({});
  await prisma.studentPayment.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.mark.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.feeStructure.deleteMany({});
  await prisma.examPaper.deleteMany({});
  await prisma.teacherSubject.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.stream.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.school.deleteMany({});

  console.log("Seeding schools...");
  // Create a dummy system school for the superadmin user to satisfy Prisma FK constraints
  await prisma.school.create({
    data: {
      id: "super",
      name: "Lapter System Admin School",
      subdomain: "super-admin-system",
      packageType: "PREMIUM",
      status: "ACTIVE",
      studentRange: "N/A",
      contactEmail: "admin@schoolpro.ug",
      contactPhone: "+256 000 000000",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: null,
    }
  });

  for (const s of data.schools) {
    await prisma.school.create({
      data: {
        id: s.id,
        name: s.name,
        subdomain: s.subdomain,
        packageType: s.packageType,
        status: s.status,
        studentRange: s.studentRange,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        createdAt: new Date(s.createdAt),
        expiresAt: s.expiresAt ? new Date(s.expiresAt) : null,
      }
    });
  }

  console.log("Seeding users...");
  for (const u of data.users) {
    await prisma.user.create({
      data: {
        id: u.id,
        schoolId: u.schoolId,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        createdAt: new Date(u.createdAt),
      }
    });
  }

  console.log("Seeding classes...");
  for (const c of data.classes) {
    await prisma.class.create({
      data: {
        id: c.id,
        schoolId: c.schoolId,
        name: c.name,
        level: c.level,
      }
    });
  }

  console.log("Seeding streams...");
  for (const st of data.streams) {
    await prisma.stream.create({
      data: {
        id: st.id,
        classId: st.classId,
        name: st.name,
      }
    });
  }

  console.log("Seeding students...");
  for (const stud of data.students) {
    await prisma.student.create({
      data: {
        id: stud.id,
        schoolId: stud.schoolId,
        classId: stud.classId,
        streamId: stud.streamId,
        name: stud.name,
        studentNumber: stud.studentNumber,
        type: stud.type,
      }
    });
  }

  console.log("Seeding subjects...");
  for (const sub of data.subjects) {
    await prisma.subject.create({
      data: {
        id: sub.id,
        schoolId: sub.schoolId,
        classId: sub.classId,
        name: sub.name,
        code: sub.code,
      }
    });
  }

  console.log("Seeding teacherSubjects...");
  for (const ts of data.teacherSubjects) {
    await prisma.teacherSubject.create({
      data: {
        id: ts.id,
        teacherId: ts.teacherId,
        subjectId: ts.subjectId,
        classId: ts.classId,
        streamId: ts.streamId,
      }
    });
  }

  console.log("Seeding examPapers...");
  for (const ex of data.examPapers) {
    await prisma.examPaper.create({
      data: {
        id: ex.id,
        schoolId: ex.schoolId,
        term: ex.term,
        year: ex.year,
        name: ex.name,
        maxMarks: ex.maxMarks,
        isNewCurriculum: ex.isNewCurriculum,
      }
    });
  }

  console.log("Seeding marks...");
  for (const m of data.marks) {
    await prisma.mark.create({
      data: {
        id: m.id,
        studentId: m.studentId,
        examPaperId: m.examPaperId,
        subjectId: m.subjectId,
        score: m.score,
        competencyGrade: m.competencyGrade,
        comments: m.comments,
        createdAt: new Date(m.createdAt),
        createdById: m.createdById,
      }
    });
  }

  console.log("Seeding payments...");
  for (const p of data.payments) {
    await prisma.payment.create({
      data: {
        id: p.id,
        schoolId: p.schoolId,
        amount: p.amount,
        method: p.method,
        status: p.status,
        date: new Date(p.date),
        txRef: p.txRef,
      }
    });
  }

  console.log("Seeding feeStructures...");
  for (const fs of data.feeStructures) {
    await prisma.feeStructure.create({
      data: {
        id: fs.id,
        schoolId: fs.schoolId,
        classId: fs.classId,
        term: fs.term,
        year: fs.year,
        tuitionAmount: fs.tuitionAmount,
        boardingAmount: fs.boardingAmount,
      }
    });
  }

  console.log("Seeding studentPayments...");
  for (const sp of data.studentPayments) {
    await prisma.studentPayment.create({
      data: {
        id: sp.id,
        studentId: sp.studentId,
        term: sp.term,
        year: sp.year,
        amountPaid: sp.amountPaid,
        balance: sp.balance,
        date: new Date(sp.date),
      }
    });
  }

  console.log("Seeding expenses...");
  for (const exp of data.expenses) {
    await prisma.expense.create({
      data: {
        id: exp.id,
        schoolId: exp.schoolId,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        date: new Date(exp.date),
      }
    });
  }

  console.log("Seeding attendances...");
  for (const at of data.attendances) {
    await prisma.attendance.create({
      data: {
        id: at.id,
        studentId: at.studentId,
        date: new Date(at.date),
        status: at.status,
        term: at.term,
        year: at.year,
      }
    });
  }

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
