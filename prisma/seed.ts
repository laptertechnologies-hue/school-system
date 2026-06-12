import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database - Production Clean Mode...");

  console.log("Clearing existing data...");
  // Delete in reverse order of foreign key dependencies
  await prisma.attendance.deleteMany({});
  await prisma.schoolPayTransaction.deleteMany({});
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

  console.log("Seeding system admin school...");
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

  console.log("Seeding super admin user...");
  await prisma.user.create({
    data: {
      id: "user-super",
      schoolId: "super",
      name: "Lapter Admin",
      email: "admin@schoolpro.ug",
      passwordHash: "admin",
      role: "ADMIN",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    }
  });

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
