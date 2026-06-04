const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findUnique({ where: { subdomain: "gfss" } });
  console.log("School:", school);
  if (school) {
    const classes = await prisma.class.findMany({ where: { schoolId: school.id } });
    console.log("Classes count:", classes.length);
    const users = await prisma.user.findMany({ where: { schoolId: school.id } });
    console.log("Users count:", users.length);
    console.log("Users:", users);
    const streams = await prisma.stream.findMany({ where: { class: { schoolId: school.id } } });
    console.log("Streams count:", streams.length);
    const teacherSubjects = await prisma.teacherSubject.findMany({ where: { class: { schoolId: school.id } } });
    console.log("TeacherSubjects count:", teacherSubjects.length);
    const gradeRanges = await prisma.gradeRange.findMany({ where: { schoolId: school.id } });
    console.log("GradeRanges count:", gradeRanges.length);
    const feeStructures = await prisma.feeStructure.findMany({ where: { schoolId: school.id } });
    console.log("FeeStructures count:", feeStructures.length);
    const studentPayments = await prisma.studentPayment.findMany({ where: { student: { schoolId: school.id } } });
    console.log("StudentPayments count:", studentPayments.length);
    const expenses = await prisma.expense.findMany({ where: { schoolId: school.id } });
    console.log("Expenses count:", expenses.length);
    const payments = await prisma.payment.findMany({ where: { schoolId: school.id } });
    console.log("Payments count:", payments.length);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());



