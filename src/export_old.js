const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { dialog } = require("electron").remote || require("@electron/remote");

// Export to Excel
async function exportToExcel() {
  try {
    if (guests.length === 0) {
      showNotification("មិនមានទិន្នន័យដែលយកចេញទេ", "warning");
      return;
    }

    showLoading(true);

    // Prepare data for Excel
    const excelData = guests.map((guest, index) => ({
      "#": index + 1,
      "ឈ្មោះមេហ្មាន (Guest Name)": guest.name,
      "លេខទូរស័ព្ទ (Phone)": guest.phone || "",
      "កំណត់ចំណាំ (Note)": guest.note || "",
      "ចំនួន (Amount)": guest.amount,
      "រូបិយភ័ណ្ឌ (Currency)": guest.currency,
      "ប្រភេទការបង់ (Payment Type)": guest.payment_type,
      "កាលបរិច្ឆេទបន្ថែម (Created Date)": new Date(
        guest.created_at
      ).toLocaleDateString("km-KH"),
    }));

    // Add summary row
    const summaryRow = {
      "#": "",
      "ឈ្មោះមេហ្មាន (Guest Name)": "សរុប (TOTAL)",
      "លេខទូរស័ព្ទ (Phone)": "",
      "កំណត់ចំណាំ (Note)": `ជំនួនចំនះ: ${totals.total_guests}`,
      "ចំនួន (Amount)": "",
      "រូបិយភ័ណ្ឌ (Currency)": "KHR: " + totals.total_khr.toLocaleString(),
      "ប្រភេទការបង់ (Payment Type)":
        "USD: $" + totals.total_usd.toLocaleString(),
      "កាលបរិច្ឆេទបន្ថែម (Created Date)": new Date().toLocaleDateString(
        "km-KH"
      ),
    };

    excelData.push(summaryRow);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 5 }, // #
      { wch: 25 }, // Name
      { wch: 15 }, // Phone
      { wch: 30 }, // Note
      { wch: 15 }, // Amount
      { wch: 12 }, // Currency
      { wch: 15 }, // Payment Type
      { wch: 18 }, // Date
    ];
    worksheet["!cols"] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Wedding Guest List");

    // Show save dialog
    const defaultPath = `Wedding_Guest_List_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    const result = await dialog.showSaveDialog({
      title: "Save Excel File",
      defaultPath: defaultPath,
      filters: [
        { name: "Excel Files", extensions: ["xlsx"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!result.canceled && result.filePath) {
      // Write the file
      XLSX.writeFile(workbook, result.filePath);
      showNotification(
        `រក្សាទុក Excel បានជោគជ័យ: ${path.basename(result.filePath)}`
      );
    }
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    showNotification("Error exporting to Excel: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// Export to PDF
async function exportToPDF() {
  try {
    if (guests.length === 0) {
      showNotification("មិនមានទិន្នន័យដែលយកចេញទេ", "warning");
      return;
    }

    showLoading(true);

    // Generate HTML for PDF
    const htmlContent = generatePDFHTML();

    // Use Electron's printToPDF
    const { BrowserWindow } =
      require("electron").remote || require("@electron/remote");

    // Create a hidden window for PDF generation
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    // Load the HTML content
    await pdfWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
    );

    // Show save dialog
    const defaultPath = `Wedding_Guest_List_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    const result = await dialog.showSaveDialog({
      title: "Save PDF File",
      defaultPath: defaultPath,
      filters: [
        { name: "PDF Files", extensions: ["pdf"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!result.canceled && result.filePath) {
      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        marginsType: 1, // Minimum margins
        pageSize: "A4",
        landscape: true,
      });

      // Write PDF file
      fs.writeFileSync(result.filePath, pdfData);
      showNotification(
        `រក្សាទុក PDF បានជោគជ័យ: ${path.basename(result.filePath)}`
      );
    }

    // Clean up
    pdfWindow.close();
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    showNotification("Error exporting to PDF: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// Generate HTML for PDF export
function generatePDFHTML() {
  const currentDate = new Date().toLocaleDateString("km-KH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let guestRows = "";
  guests.forEach((guest, index) => {
    guestRows += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(guest.name)}</td>
                <td>${escapeHtml(guest.phone || "-")}</td>
                <td>${escapeHtml(guest.note || "-")}</td>
                <td class="${
                  guest.currency === "KHR" ? "khr-amount" : "usd-amount"
                }">
                    ${formatCurrency(guest.amount, guest.currency)}
                </td>
                <td>
                    <span class="payment-badge ${guest.payment_type.toLowerCase()}">
                        ${
                          guest.payment_type === "CASH"
                            ? "សាច់ប្រាក់"
                            : guest.payment_type
                        }
                    </span>
                </td>
            </tr>
        `;
  });

  return `
        <!DOCTYPE html>
        <html lang="km">
        <head>
            <meta charset="UTF-8">
            <title>Wedding Guest List - PDF Export</title>
            <link href="https://fonts.googleapis.com/css2?family=Nokora:wght@300;400;700;900&display=swap" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Nokora', sans-serif;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #333;
                    padding: 20px;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #e91e63;
                    padding-bottom: 20px;
                }
                
                .header h1 {
                    font-size: 24px;
                    font-weight: 700;
                    color: #e91e63;
                    margin-bottom: 10px;
                }
                
                .header p {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 5px;
                }
                
                .summary {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .summary-card {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    text-align: center;
                }
                
                .summary-card h3 {
                    font-size: 14px;
                    margin-bottom: 5px;
                    color: #666;
                }
                
                .summary-card .value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #333;
                }
                
                .khr-amount { color: #e53e3e; }
                .usd-amount { color: #38a169; }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    background: white;
                    border: 1px solid #e2e8f0;
                }
                
                th, td {
                    padding: 12px 8px;
                    text-align: left;
                    border-bottom: 1px solid #e2e8f0;
                    vertical-align: top;
                }
                
                th {
                    background: #f8f9fa;
                    font-weight: 600;
                    color: #333;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                th small {
                    display: block;
                    font-weight: 400;
                    color: #666;
                    font-size: 10px;
                    margin-top: 2px;
                }
                
                tbody tr:nth-child(even) {
                    background: #f8f9fa;
                }
                
                .payment-badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    color: white;
                }
                
                .payment-badge.cash { background: #805ad5; }
                .payment-badge.aba { background: #0066cc; }
                .payment-badge.ac { background: #ff6b35; }
                
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                }
                
                @media print {
                    body { margin: 0; padding: 15px; }
                    .summary { grid-template-columns: repeat(4, 1fr); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ប្រព័ន្ធកត់ចំណងដៃ</h1>
                <p>Wedding List Management System</p>
                <p>កាលបរិច្ឆេទ: ${currentDate}</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>ជំនួនមៀហ្មាន</h3>
                    <div class="value">${totals.total_guests.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h3>ចំនួនរិប្រ</h3>
                    <div class="value khr-amount">${totals.total_khr.toLocaleString()} ៛</div>
                </div>
                <div class="summary-card">
                    <h3>ចំនួនដុល្លារ</h3>
                    <div class="value usd-amount">$${totals.total_usd.toLocaleString()}</div>
                </div>
                <div class="summary-card">
                    <h3>ក្រដាសប្រាក់</h3>
                    <div class="value">${(
                      totals.total_khr +
                      totals.total_usd * 4100
                    ).toLocaleString()} ៛</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th style="width: 150px;">ឈ្មោះមេហ្មាន<br><small>Guest Name</small></th>
                        <th style="width: 100px;">លេខទូរស័ព្ទ<br><small>Phone</small></th>
                        <th style="width: 150px;">កំណត់ចំណាំ<br><small>Note</small></th>
                        <th style="width: 100px;">ចំនួន<br><small>Amount</small></th>
                        <th style="width: 80px;">ប្រភេទ<br><small>Payment</small></th>
                    </tr>
                </thead>
                <tbody>
                    ${guestRows}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Generated on ${new Date().toLocaleString(
                  "km-KH"
                )} | ប្រព័ន្ធកត់ចំណងដៃ Wedding List Management System</p>
            </div>
        </body>
        </html>
    `;
}

// Make functions available globally
window.exportToExcel = exportToExcel;
window.exportToPDF = exportToPDF;
