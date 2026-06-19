const fs = require('fs');
let content = fs.readFileSync('src/app/school/[subdomain]/page.tsx', 'utf8');

// 1. Add Invoice Modal State
content = content.replace(
  'const [finFilterYear, setFinFilterYear] = useState(new Date().getFullYear().toString());',
  'const [finFilterYear, setFinFilterYear] = useState(new Date().getFullYear().toString());\n  const [showInvoiceModal, setShowInvoiceModal] = useState(false);\n  const [invoiceStudent, setInvoiceStudent] = useState<any>(null);'
);

// 2. Add "Action" column header
content = content.replace(
  '<th>Balance</th>\n                      </tr>',
  '<th>Balance</th>\n                        <th>Action</th>\n                      </tr>'
);

// 3. Add Invoice button to the row
content = content.replace(
  '<td><span className={`badge ${p.balance > 0 ? "badge-danger" : "badge-success"}`}>{p.balance > 0 ? `${p.balance.toLocaleString()}` : "Cleared"}</span></td>\n                          </tr>',
  '<td><span className={`badge ${p.balance > 0 ? "badge-danger" : "badge-success"}`}>{p.balance > 0 ? `${p.balance.toLocaleString()}` : "Cleared"}</span></td>\n                            <td>\n                              <button \n                                className="btn btn-outline" \n                                style={{ padding: "4px 8px", fontSize: "10px" }}\n                                onClick={(e) => { e.preventDefault(); setInvoiceStudent({ payment: p, student: stud, class: cl }); setShowInvoiceModal(true); }}\n                              >\n                                <Receipt size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />\n                                Invoice\n                              </button>\n                            </td>\n                          </tr>'
);

// 4. Add the Invoice Modal UI inside activeTab === "student_billing"
const invoiceModalUI = `
              {showInvoiceModal && invoiceStudent && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: "600px" }}>
                    <div id="printable-invoice" style={{ padding: "20px", color: "#1e293b", fontFamily: "sans-serif" }}>
                      {/* Invoice Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
                        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                          {school.logoUrl && <img src={school.logoUrl} alt="Logo" style={{ width: "50px", height: "50px", objectFit: "contain" }} />}
                          <div>
                            <h2 style={{ margin: 0, fontSize: "18px", color: "var(--primary)" }}>{school.name}</h2>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{school.poBox || ""}</p>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{school.contactEmail || ""}</p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <h1 style={{ margin: 0, fontSize: "24px", color: "#0f172a", textTransform: "uppercase", letterSpacing: "2px" }}>INVOICE</h1>
                          <p style={{ margin: 0, fontSize: "12px", fontWeight: "bold" }}>Receipt #: {invoiceStudent.payment.receiptNumber || "N/A"}</p>
                          <p style={{ margin: 0, fontSize: "12px" }}>Date: {new Date(invoiceStudent.payment.date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Bill To */}
                      <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Billed To:</p>
                          <h4 style={{ margin: "4px 0" }}>{invoiceStudent.student?.name}</h4>
                          <p style={{ margin: 0, fontSize: "13px" }}>Class: {invoiceStudent.class}</p>
                          <p style={{ margin: 0, fontSize: "13px" }}>Type: {invoiceStudent.student?.type}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ margin: 0, fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>Academic Period:</p>
                          <h4 style={{ margin: "4px 0" }}>Term {invoiceStudent.payment.term} - {invoiceStudent.payment.year}</h4>
                        </div>
                      </div>

                      {/* Ledger Details */}
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
                            <th style={{ padding: "10px", fontSize: "12px", color: "#475569" }}>Description</th>
                            <th style={{ padding: "10px", fontSize: "12px", color: "#475569", textAlign: "right" }}>Amount (UGX)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* We deduce total due based on balance + amountPaid - BBF */}
                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "12px 10px", fontSize: "13px" }}>
                              <strong>Tuition & Required Fees</strong><br/>
                              <span style={{ fontSize: "11px", color: "#64748b" }}>Standard fees for the selected term</span>
                            </td>
                            <td style={{ padding: "12px 10px", fontSize: "13px", textAlign: "right" }}>
                              {((invoiceStudent.payment.balance + invoiceStudent.payment.amountPaid) - (invoiceStudent.payment.balanceBF || 0)).toLocaleString()}
                            </td>
                          </tr>
                          {(invoiceStudent.payment.balanceBF || 0) > 0 && (
                            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "12px 10px", fontSize: "13px" }}>
                                <strong>Balance Brought Forward (Arrears)</strong><br/>
                                <span style={{ fontSize: "11px", color: "#64748b" }}>Unpaid fees from previous terms</span>
                              </td>
                              <td style={{ padding: "12px 10px", fontSize: "13px", textAlign: "right", color: "var(--danger)" }}>
                                +{(invoiceStudent.payment.balanceBF || 0).toLocaleString()}
                              </td>
                            </tr>
                          )}
                          <tr style={{ background: "#f0fdf4" }}>
                            <td style={{ padding: "12px 10px", fontSize: "13px", fontWeight: "bold", color: "#166534" }}>
                              Payment Received ({invoiceStudent.payment.paymentMethod || "CASH"})
                            </td>
                            <td style={{ padding: "12px 10px", fontSize: "13px", textAlign: "right", fontWeight: "bold", color: "#166534" }}>
                              -{(invoiceStudent.payment.amountPaid || 0).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Summary */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{ width: "50%", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                            <span>Total Due:</span>
                            <strong>{(invoiceStudent.payment.balance + invoiceStudent.payment.amountPaid).toLocaleString()} UGX</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#166534" }}>
                            <span>Total Paid:</span>
                            <strong>{invoiceStudent.payment.amountPaid.toLocaleString()} UGX</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #cbd5e1", paddingTop: "8px", fontSize: "16px" }}>
                            <strong>Balance Remaining:</strong>
                            <strong style={{ color: invoiceStudent.payment.balance > 0 ? "var(--danger)" : "var(--success)" }}>
                              {invoiceStudent.payment.balance.toLocaleString()} UGX
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ marginTop: "40px", textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>Thank you for your payment.</p>
                        <p style={{ margin: "4px 0 0", fontSize: "10px", color: "#94a3b8" }}>System generated invoice by School System ERP</p>
                      </div>
                    </div>
                    
                    {/* Modal Controls */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                      <button className="btn btn-outline" onClick={() => setShowInvoiceModal(false)}>Close</button>
                      <button className="btn btn-primary" onClick={() => {
                        const printContent = document.getElementById("printable-invoice");
                        const windowPrint = window.open('', '', 'width=900,height=650');
                        windowPrint.document.write('<html><head><title>Print Invoice</title>');
                        windowPrint.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; }</style>');
                        windowPrint.document.write('</head><body>');
                        windowPrint.document.write(printContent.innerHTML);
                        windowPrint.document.write('</body></html>');
                        windowPrint.document.close();
                        windowPrint.focus();
                        setTimeout(() => { windowPrint.print(); windowPrint.close(); }, 250);
                      }}>
                        <Printer size={16} style={{ marginRight: "6px", verticalAlign: "middle" }} /> Print PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
`;

content = content.replace(
  '{/* TAB 6D: FEE DEFAULTERS (Enhanced) */}',
  invoiceModalUI + '\n\n        {/* TAB 6D: FEE DEFAULTERS (Enhanced) */}'
);

fs.writeFileSync('src/app/school/[subdomain]/page.tsx', content, 'utf8');
console.log("Invoice modal injected");
