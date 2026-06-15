import crypto from 'crypto';
import { prisma as db } from './db';

export async function syncSchoolPayTransactions(schoolId: string, schoolCode: string, password: string, dateStr: string) {
  // dateStr format: yyyy-MM-dd
  const rawString = `${schoolCode}${dateStr}${password}`;
  const hash = crypto.createHash('md5').update(rawString).digest('hex');

  const apiUrl = `https://schoolpay.co.ug/paymentapi/AndroidRS/SyncSchoolTransactions/${schoolCode}/${dateStr}/${hash}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.returnCode === 0 && data.transactions) {
      let importedCount = 0;
      for (const tx of data.transactions) {
        // Find existing to avoid duplicates
        const existing = await db.schoolPayTransaction.findUnique({
          where: { receiptNumber: tx.schoolpayReceiptNumber }
        });

        if (!existing) {
          const newTx = await db.schoolPayTransaction.create({
            data: {
              schoolId,
              receiptNumber: tx.schoolpayReceiptNumber,
              amount: parseFloat(tx.amount.replace(/,/g, '')), // In case there are commas
              paymentDate: new Date(tx.paymentDateAndTime),
              studentName: tx.studentName,
              studentPaymentCode: tx.studentPaymentCode,
              settlementBankCode: tx.settlementBankCode,
              sourceChannelTransId: tx.sourceChannelTransactionId,
              sourcePaymentChannel: tx.sourcePaymentChannel,
              studentClass: tx.studentClass,
              studentRegistrationNum: tx.studentRegistrationNumber,
              reconciled: false
            }
          });
          importedCount++;

          // Attempt reconciliation
          await reconcileTransaction(newTx.id, schoolId);
        }
      }
      return { success: true, message: `Imported ${importedCount} transactions.`, importedCount };
    } else {
      return { success: false, message: data.returnMessage || "Failed to fetch transactions." };
    }
  } catch (error) {
    console.error("SchoolPay Sync Error:", error);
    return { success: false, message: "Network or Server Error" };
  }
}

export async function reconcileTransaction(transactionId: string, schoolId: string) {
  const tx = await db.schoolPayTransaction.findUnique({ where: { id: transactionId } });
  if (!tx || tx.reconciled) return;

  // Find student by studentPaymentCode
  let student = await db.student.findFirst({
    where: {
      schoolId,
      studentPaymentCode: tx.studentPaymentCode
    }
  });

  // Determine the active term and year based on school settings
  const school = await db.school.findUnique({
    where: { id: schoolId }
  });
  const term = school?.currentTerm || 1;
  const year = school?.currentYear || new Date().getFullYear();

  if (!student) {
    // Auto-create student from transaction details if student is not in the system
    const schoolClasses = await db.class.findMany({ where: { schoolId } });
    if (schoolClasses.length > 0) {
      // Find matching class
      let matchedClass = schoolClasses[0];
      if (tx.studentClass) {
        const normalized = tx.studentClass.toLowerCase();
        const numMap: { [key: string]: string } = {
          "one": "1", "first": "1", "1": "1",
          "two": "2", "second": "2", "2": "2",
          "three": "3", "third": "3", "3": "3",
          "four": "4", "fourth": "4", "4": "4",
          "five": "5", "fifth": "5", "5": "5",
          "six": "6", "sixth": "6", "6": "6",
          "seven": "7", "seventh": "7", "7": "7"
        };
        
        let foundClass = null;
        for (const [word, num] of Object.entries(numMap)) {
          if (normalized.includes(word)) {
            foundClass = schoolClasses.find(c => c.name.toLowerCase().includes(num));
            if (foundClass) break;
          }
        }
        if (!foundClass) {
          foundClass = schoolClasses.find(c => normalized.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(normalized));
        }
        if (foundClass) {
          matchedClass = foundClass;
        }
      }

      // Fetch streams for the matched class
      const streams = await db.stream.findMany({ where: { classId: matchedClass.id } });
      const streamId = streams[0]?.id || "";

      // Generate student number
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const studentNumber = tx.studentRegistrationNum || `STU-${randomPart}`;

      student = await db.student.create({
        data: {
          schoolId,
          classId: matchedClass.id,
          streamId,
          name: tx.studentName,
          studentNumber,
          type: "DAY",
          studentPaymentCode: tx.studentPaymentCode,
          registrationNumber: tx.studentRegistrationNum || null
        }
      });
    }
  }

  if (student) {
    // Calculate correct outstanding balance
    const fs = await db.feeStructure.findFirst({
      where: { classId: student.classId, term, year }
    });
    const totalDue = student.type === "BOARDING"
      ? (fs?.tuitionAmount || 0) + (fs?.boardingAmount || 0)
      : (fs?.tuitionAmount || 0);

    const prevPayments = await db.studentPayment.findMany({
      where: { studentId: student.id, term, year }
    });
    const alreadyPaid = prevPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const balance = Math.max(0, totalDue - (alreadyPaid + tx.amount));

    // Reconcile by creating/updating a StudentPayment record
    // Alternatively, just create a Payment record if we are dealing with payments in general
    // The db schema has both Payment and StudentPayment.
    await db.payment.create({
      data: {
        schoolId,
        amount: tx.amount,
        method: "SCHOOL_PAY", // or derived from sourcePaymentChannel
        status: "COMPLETED",
        date: tx.paymentDate,
        txRef: tx.receiptNumber
      }
    });

    await db.studentPayment.create({
      data: {
        studentId: student.id,
        term,
        year,
        amountPaid: tx.amount,
        balance,
        date: tx.paymentDate
      }
    });

    // Mark as reconciled
    await db.schoolPayTransaction.update({
      where: { id: tx.id },
      data: { reconciled: true }
    });
  }
}
