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
  const student = await db.student.findFirst({
    where: {
      schoolId,
      studentPaymentCode: tx.studentPaymentCode
    }
  });

  if (student) {
    // Determine the active term and year based on current date (simplification)
    // In a real app, this might come from school settings
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    let term = 1;
    if (currentMonth >= 5 && currentMonth <= 8) term = 2;
    if (currentMonth >= 9) term = 3;
    const year = currentDate.getFullYear();

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
        balance: 0, // In reality, we'd calculate based on fee structure
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
