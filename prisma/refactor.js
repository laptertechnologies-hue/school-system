const fs = require("fs");
const path = require("path");

const targetFile = path.join(__dirname, "..", "src", "app", "school", "[subdomain]", "page.tsx");

if (!fs.existsSync(targetFile)) {
  console.error("Target file not found at " + targetFile);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, "utf8");

// Remove all dataService. prefixes
content = content.replace(/dataService\./g, "");

// Update imports
const oldImport = `import { dataService, School, User, Class, Stream, Student, Subject, ExamPaper, Mark, Payment, FeeStructure, StudentPayment, Expense } from "../../../lib/services";`;
const newImport = `import { 
  School, User, Class, Stream, Student, Subject, ExamPaper, Mark, Payment, FeeStructure, StudentPayment, Expense,
  checkDatabaseConnection, getSchoolBySubdomain, getUsers, getClasses, getStreams, getStudents, getSubjects,
  getExamPapers, getMarks, getFeeStructures, getStudentPayments, getExpenses, getAttendance, authenticateUser,
  createClass, createStream, createUser, createStudent, createSubject, createExamPaper, addMark,
  createFeeStructure, recordStudentPayment, createExpense, recordAttendance, promoteStudents,
  processTeacherSalary, createPayment
} from "../../../lib/services";
import { Database, CreditCard } from "lucide-react";`;

content = content.replace(oldImport, newImport);

fs.writeFileSync(targetFile, content, "utf8");
console.log("Successfully refactored dataService calls and updated imports in " + targetFile);
