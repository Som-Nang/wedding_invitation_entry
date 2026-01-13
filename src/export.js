/**
 * Export Module for Wedding Book Application
 * Provides Excel and PDF export functionality
 */
(function () {
  "use strict";

  let XLSX, fs, path, ipcRenderer, os;

  try {
    XLSX = require("xlsx");
    fs = require("fs");
    path = require("path");
    os = require("os");
    ipcRenderer = require("electron").ipcRenderer;
    console.log("export.js: All modules loaded successfully");
  } catch (err) {
    console.error("export.js: Error loading modules:", err);
    // Still define stub functions so app doesn't break
    window.exportToExcel = function () {
      alert("Export module failed to load. Please restart the application.");
    };
    window.exportToPDF = function () {
      alert("Export module failed to load. Please restart the application.");
    };
    return;
  }

  console.log("export.js: Initializing...");

  // Constants
  const EXCHANGE_RATE = 4000; // 1 USD = 4000 KHR

  // Helper to get global state
  function getGuests() {
    return window.guests || [];
  }

  function getTotals() {
    return (
      window.totals || {
        total_guests: 0,
        total_khr: 0,
        total_usd: 0,
        cash_total: 0,
      }
    );
  }

  function getShowLoading() {
    return window.showLoading || function () {};
  }

  function getShowNotification() {
    return (
      window.showNotification ||
      function (msg, type) {
        console.log("[Notification]", type || "info", msg);
      }
    );
  }

  // ============================================================================
  // EXCEL EXPORT FUNCTIONALITY
  // ============================================================================

  /**
   * Export to Excel with multiple sheets:
   * 1. Cover Sheet - Wedding Information
   * 2. Guest List - Detailed guest data
   * 3. Summary - Statistics and totals
   */
  async function exportToExcel() {
    console.log("exportToExcel called");

    const guests = getGuests();
    const totals = getTotals();
    const showLoading = getShowLoading();
    const showNotification = getShowNotification();

    console.log("guests count:", guests.length);
    console.log("totals:", totals);

    try {
      if (guests.length === 0) {
        showNotification("មិនមានទិន្នន័យដែលយកចេញទេ", "warning");
        return;
      }

      showLoading(true, "កំពុងបង្កើតឯកសារ Excel...", "Creating Excel file...");

      // Fetch wedding info
      let weddingInfoData = {};
      try {
        weddingInfoData = await ipcRenderer.invoke("get-all-wedding-info");
      } catch (err) {
        console.warn("Could not fetch wedding info:", err);
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // ==================== SHEET 1: Cover/Wedding Info ====================
      const coverData = createCoverSheetData(weddingInfoData);
      const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
      coverSheet["!cols"] = [{ wch: 25 }, { wch: 40 }];
      coverSheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
      XLSX.utils.book_append_sheet(workbook, coverSheet, "ព័ត៌មានពីពហូពាះ");

      // ==================== SHEET 2: Guest List ====================
      const guestSheetData = createGuestSheetData(guests);
      const guestSheet = XLSX.utils.aoa_to_sheet(guestSheetData);
      guestSheet["!cols"] = [
        { wch: 5 }, // #
        { wch: 25 }, // Name
        { wch: 25 }, // Khmer Name
        { wch: 15 }, // Phone
        { wch: 30 }, // Note
        { wch: 15 }, // Amount
        { wch: 10 }, // Currency
        { wch: 18 }, // Amount KHR
        { wch: 15 }, // Amount USD
        { wch: 12 }, // Payment Type
        { wch: 18 }, // Created Date
      ];
      XLSX.utils.book_append_sheet(workbook, guestSheet, "បញ្ជីភ្ញៀវ");

      // ==================== SHEET 3: Summary ====================
      const summaryData = createSummarySheetData(
        weddingInfoData,
        guests,
        totals
      );
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [{ wch: 30 }, { wch: 25 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "សង្ខេប");

      // Generate filename
      const groomName = weddingInfoData.groomName || "Groom";
      const brideName = weddingInfoData.brideName || "Bride";
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `Wedding_${groomName}_${brideName}_${dateStr}.xlsx`;

      // Save file using dialog
      try {
        const result = await ipcRenderer.invoke("show-save-dialog", {
          title: "រក្សាទុកឯកសារ Excel",
          defaultPath: fileName,
          filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
        });

        if (result.canceled || !result.filePath) {
          showNotification("ការនាំចេញត្រូវបានលុបចោល", "info");
          return;
        }

        XLSX.writeFile(workbook, result.filePath);
        showNotification(
          `រក្សាទុក Excel បានជោគជ័យ: ${path.basename(result.filePath)}`
        );
      } catch (dialogError) {
        console.error("Dialog error:", dialogError);
        // Fallback: save to Downloads folder
        const downloadsPath = os.homedir() + "/Downloads";
        const filePath = path.join(downloadsPath, fileName);
        XLSX.writeFile(workbook, filePath);
        showNotification(`រក្សាទុក Excel បានជោគជ័យ: ${fileName}`);
      }
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      getShowNotification()(
        "Error exporting to Excel: " + error.message,
        "error"
      );
    } finally {
      getShowLoading()(false);
    }
  }

  /**
   * Create cover sheet data with wedding information
   */
  function createCoverSheetData(weddingInfo) {
    const exportDate = new Date().toLocaleDateString("km-KH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return [
      ["ប្រព័ន្ធកត់ចំណងដៃ - Wedding Guest Registry"],
      [],
      ["ព័ត៌មានពីពហូពាះ (Wedding Information)", ""],
      [],
      ["កូនកំលោះ (Groom)", weddingInfo.groomName || "-"],
      ["កូនក្រមុំ (Bride)", weddingInfo.brideName || "-"],
      [],
      ["ឳពុកកូនកំលោះ (Groom's Father)", weddingInfo.groomFather || "-"],
      ["ម្ដាយកូនកំលោះ (Groom's Mother)", weddingInfo.groomMother || "-"],
      ["ឳពុកកូនក្រមុំ (Bride's Father)", weddingInfo.brideFather || "-"],
      ["ម្ដាយកូនក្រមុំ (Bride's Mother)", weddingInfo.brideMother || "-"],
      [],
      ["កាលបរិច្ឆេទពិធី (Wedding Date)", weddingInfo.weddingDate || "-"],
      ["ម៉ោង (Time)", weddingInfo.weddingTime || "-"],
      ["ទីតាំង (Location)", weddingInfo.weddingLocation || "-"],
      [],
      ["កាលបរិច្ឆេទនាំចេញ (Export Date)", exportDate],
    ];
  }

  /**
   * Create guest list sheet data
   */
  function createGuestSheetData(guests) {
    const headers = [
      [
        "#",
        "ឈ្មោះ (Name)",
        "ឈ្មោះខ្មែរ (Khmer Name)",
        "លេខទូរស័ព្ទ (Phone)",
        "កំណត់ចំណាំ (Note)",
        "ចំនួន (Amount)",
        "រូបិយភ័ណ្ឌ (Currency)",
        "ចំនួនរៀល (KHR)",
        "ចំនួនដុល្លារ (USD)",
        "ប្រភេទការបង់ (Payment)",
        "កាលបរិច្ឆេទ (Date)",
      ],
    ];

    const rows = guests.map((guest, index) => [
      index + 1,
      guest.name || "",
      guest.name_km || "",
      guest.phone || "",
      guest.note || "",
      guest.amount || 0,
      guest.currency || "KHR",
      guest.amount_khr || 0,
      guest.amount_usd || 0,
      getPaymentTypeLabel(guest.payment_type),
      formatDateKhmer(guest.created_at),
    ]);

    return [...headers, ...rows];
  }

  /**
   * Create summary sheet data with statistics
   */
  function createSummarySheetData(weddingInfo, guests, totals) {
    // Calculate payment type breakdowns
    const paymentBreakdown = calculatePaymentBreakdown(guests);
    const currencyBreakdown = calculateCurrencyBreakdown(guests);

    const groomName = weddingInfo.groomName || "កូនកំលោះ";
    const brideName = weddingInfo.brideName || "កូនក្រមុំ";
    const weddingDate = weddingInfo.weddingDate || "-";

    return [
      [`សង្ខេបពិធីមង្គលការ ${groomName} & ${brideName}`, "", ""],
      [`កាលបរិច្ឆេទ: ${weddingDate}`, "", ""],
      [],
      ["📊 ស្ថិតិទូទៅ (General Statistics)", "", ""],
      [],
      ["ចំណងជើង (Title)", "តម្លៃ (Value)", "ផ្សេងៗ (Details)"],
      ["ចំនួនភ្ញៀវសរុប (Total Guests)", totals.total_guests, "នាក់ (people)"],
      [
        "សរុបរូបិយភ័ណ្ឌរៀល (Total KHR)",
        formatNumber(totals.total_khr),
        "៛ (Riel)",
      ],
      [
        "សរុបរូបិយភ័ណ្ឌដុល្លារ (Total USD)",
        formatNumber(totals.total_usd),
        "$ (Dollar)",
      ],
      [
        "សរុបទាំងអស់ (Grand Total in KHR)",
        formatNumber(totals.total_khr + totals.total_usd * EXCHANGE_RATE),
        "៛",
      ],
      [],
      ["💳 ការបែងចែកតាមប្រភេទការបង់ (Payment Type Breakdown)", "", ""],
      [],
      ["ប្រភេទ (Type)", "ចំនួនភ្ញៀវ (Count)", "សរុប (Total)"],
      [
        "សាច់ប្រាក់ (CASH)",
        paymentBreakdown.CASH.count,
        `${formatNumber(paymentBreakdown.CASH.totalKHR)} ៛ / $${formatNumber(
          paymentBreakdown.CASH.totalUSD
        )}`,
      ],
      [
        "ABA Bank",
        paymentBreakdown.ABA.count,
        `${formatNumber(paymentBreakdown.ABA.totalKHR)} ៛ / $${formatNumber(
          paymentBreakdown.ABA.totalUSD
        )}`,
      ],
      [
        "AC Bank",
        paymentBreakdown.AC.count,
        `${formatNumber(paymentBreakdown.AC.totalKHR)} ៛ / $${formatNumber(
          paymentBreakdown.AC.totalUSD
        )}`,
      ],
      [],
      ["💰 ការបែងចែកតាមរូបិយភ័ណ្ឌ (Currency Breakdown)", "", ""],
      [],
      ["រូបិយភ័ណ្ឌ (Currency)", "ចំនួនភ្ញៀវ (Count)", "សរុប (Total)"],
      [
        "រៀល (KHR)",
        currencyBreakdown.KHR.count,
        `${formatNumber(currencyBreakdown.KHR.total)} ៛`,
      ],
      [
        "ដុល្លារ (USD)",
        currencyBreakdown.USD.count,
        `$${formatNumber(currencyBreakdown.USD.total)}`,
      ],
      [],
      ["📅 ព័ត៌មានបន្ថែម (Additional Info)", "", ""],
      [],
      [
        "កាលបរិច្ឆេទនាំចេញ (Export Date)",
        new Date().toLocaleDateString("km-KH"),
        new Date().toLocaleTimeString("km-KH"),
      ],
      ["អត្រាប្តូរប្រាក់ (Exchange Rate)", `1 USD = ${EXCHANGE_RATE} KHR`, ""],
    ];
  }

  // ============================================================================
  // PDF EXPORT FUNCTIONALITY - BOOK STYLE
  // ============================================================================

  /**
   * Export to PDF with book-style layout
   * Features: Cover page, headers, footers, page numbers, beautiful design
   */
  async function exportToPDF() {
    console.log("exportToPDF called");

    const guests = getGuests();
    const totals = getTotals();
    const showLoading = getShowLoading();
    const showNotification = getShowNotification();

    console.log("guests count:", guests.length);

    try {
      if (guests.length === 0) {
        showNotification("មិនមានទិន្នន័យដែលយកចេញទេ", "warning");
        return;
      }

      showLoading(true, "កំពុងបង្កើតឯកសារ PDF...", "Creating PDF file...");

      // Fetch wedding info
      let weddingInfoData = {};
      try {
        weddingInfoData = await ipcRenderer.invoke("get-all-wedding-info");
      } catch (err) {
        console.warn("Could not fetch wedding info:", err);
      }

      // Generate book-style HTML
      const htmlContent = generateBookStyleHTML(
        weddingInfoData,
        guests,
        totals
      );

      // Write HTML to a temporary file
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `wedding_export_${Date.now()}.html`);

      try {
        fs.writeFileSync(tempFile, htmlContent, "utf-8");
        console.log("Temp file written:", tempFile);

        // Use file:// protocol which works better with window.open
        const fileUrl = `file://${tempFile}`;

        // Open the file in a new window
        const printWindow = window.open(
          fileUrl,
          "_blank",
          "width=1200,height=900,scrollbars=yes,menubar=yes,toolbar=yes"
        );

        if (printWindow) {
          // Wait for content to load then trigger print
          printWindow.onload = function () {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
              showNotification(
                'សូមប្រើ "Save as PDF" ឬ "Print to PDF" ពីបន្ទះ Print dialog'
              );
            }, 500);
          };

          // Fallback if onload doesn't fire
          setTimeout(() => {
            if (printWindow && !printWindow.closed) {
              printWindow.focus();
            }
          }, 2000);
        } else {
          // Popup blocked - use alternative approach
          showNotification(
            "Popup ត្រូវបានរារាំង។ សូមប្រើ Print ធម្មតា។",
            "warning"
          );
          // Open in current window as fallback
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = fileUrl;
          document.body.appendChild(iframe);
          setTimeout(() => {
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
          }, 1000);
        }
      } catch (writeErr) {
        console.error("Error writing temp file:", writeErr);
        // Fallback to data URL approach
        const dataURL =
          "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
        const printWindow = window.open(
          dataURL,
          "_blank",
          "width=1200,height=900"
        );
        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => printWindow.print(), 500);
          };
        }
      }
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      getShowNotification()(
        "Error exporting to PDF: " + error.message,
        "error"
      );
    } finally {
      getShowLoading()(false);
    }
  }

  /**
   * Generate book-style HTML for PDF export
   */
  function generateBookStyleHTML(weddingInfo, guests, totals) {
    const groomName = weddingInfo.groomName || "កូនកំលោះ";
    const brideName = weddingInfo.brideName || "កូនក្រមុំ";
    const weddingDate = weddingInfo.weddingDate || "";
    const weddingTime = weddingInfo.weddingTime || "";
    const weddingLocation = weddingInfo.weddingLocation || "";

    const groomFather = weddingInfo.groomFather || "";
    const groomMother = weddingInfo.groomMother || "";
    const brideFather = weddingInfo.brideFather || "";
    const brideMother = weddingInfo.brideMother || "";

    const exportDate = new Date().toLocaleDateString("km-KH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const exportTime = new Date().toLocaleTimeString("km-KH");

    // Calculate statistics
    const paymentBreakdown = calculatePaymentBreakdown(guests);
    const currencyBreakdown = calculateCurrencyBreakdown(guests);
    const grandTotalKHR = totals.total_khr + totals.total_usd * EXCHANGE_RATE;

    // Generate guest table rows
    let guestRows = "";
    guests.forEach((guest, index) => {
      const rowClass = index % 2 === 0 ? "even-row" : "odd-row";
      guestRows += `
      <tr class="${rowClass}">
        <td class="col-num">${index + 1}</td>
        <td class="col-name">${escapeHtml(guest.name || "")}${
        guest.name_km
          ? `<br><small class="khmer-name">${escapeHtml(guest.name_km)}</small>`
          : ""
      }</td>
        <td class="col-phone">${escapeHtml(guest.phone || "-")}</td>
        <td class="col-note">${escapeHtml(guest.note || "-")}</td>
        <td class="col-amount ${
          guest.currency === "KHR" ? "khr" : "usd"
        }">${formatCurrency(guest.amount, guest.currency)}</td>
        <td class="col-payment"><span class="payment-badge ${(
          guest.payment_type || "CASH"
        ).toLowerCase()}">${getPaymentTypeLabel(guest.payment_type)}</span></td>
      </tr>
    `;
    });

    return `
<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>សៀវភៅកត់ចំណងដៃ - ${groomName} & ${brideName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Nokora:wght@300;400;700;900&display=swap" rel="stylesheet">
  <style>
    /* ==================== RESET & BASE ==================== */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 15mm 12mm 20mm 12mm;
    }

    body {
      font-family: 'Nokora', 'Khmer OS Battambang', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #333;
      background: #fff;
    }

    /* ==================== COVER PAGE ==================== */
    .cover-page {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px 20px;
      background: linear-gradient(135deg, #fff5f5 0%, #fff 50%, #f5f0ff 100%);
      border: 3px double #e91e63;
      position: relative;
    }

    .cover-page::before,
    .cover-page::after {
      content: "❦";
      position: absolute;
      font-size: 40px;
      color: #e91e63;
      opacity: 0.3;
    }

    .cover-page::before {
      top: 30px;
      left: 30px;
    }

    .cover-page::after {
      bottom: 30px;
      right: 30px;
    }

    .cover-ornament {
      font-size: 36px;
      color: #e91e63;
      margin-bottom: 20px;
    }

    .cover-title {
      font-size: 28px;
      font-weight: 900;
      color: #c2185b;
      margin-bottom: 15px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
    }

    .cover-subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 40px;
      letter-spacing: 2px;
    }

    .couple-names {
      font-size: 36px;
      font-weight: 700;
      color: #333;
      margin: 30px 0;
      padding: 20px 40px;
      border-top: 2px solid #e91e63;
      border-bottom: 2px solid #e91e63;
    }

    .couple-names .and {
      font-size: 24px;
      color: #e91e63;
      margin: 0 15px;
    }

    .parents-info {
      margin: 30px 0;
      font-size: 12px;
      color: #555;
    }

    .parents-info .parent-row {
      display: flex;
      justify-content: center;
      gap: 60px;
      margin: 10px 0;
    }

    .parents-info .parent-side {
      text-align: center;
    }

    .parents-info .parent-label {
      font-size: 10px;
      color: #888;
      margin-bottom: 3px;
    }

    .parents-info .parent-name {
      font-weight: 600;
      color: #333;
    }

    .wedding-details {
      margin-top: 40px;
      font-size: 14px;
      color: #555;
    }

    .wedding-details p {
      margin: 8px 0;
    }

    .wedding-details .icon {
      color: #e91e63;
      margin-right: 8px;
    }

    .cover-footer {
      position: absolute;
      bottom: 40px;
      font-size: 11px;
      color: #999;
    }

    /* ==================== CONTENT PAGES ==================== */
    .content-page {
      page-break-after: always;
      padding: 10px 0;
      position: relative;
    }

    .content-page:last-child {
      page-break-after: avoid;
    }

    /* ==================== PAGE HEADER ==================== */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #fce4ec 0%, #fff 50%, #f3e5f5 100%);
      border-bottom: 2px solid #e91e63;
      border-radius: 5px 5px 0 0;
    }

    .page-header-left {
      font-size: 12px;
      font-weight: 700;
      color: #c2185b;
    }

    .page-header-center {
      font-size: 11px;
      color: #666;
    }

    .page-header-right {
      font-size: 11px;
      color: #888;
    }

    /* ==================== SUMMARY SECTION ==================== */
    .summary-section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #c2185b;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e91e63;
      display: flex;
      align-items: center;
    }

    .section-title .icon {
      margin-right: 10px;
      font-size: 20px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }

    .summary-card {
      background: linear-gradient(135deg, #fff 0%, #fafafa 100%);
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 15px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .summary-card.highlight {
      border-color: #e91e63;
      background: linear-gradient(135deg, #fce4ec 0%, #fff 100%);
    }

    .summary-card h3 {
      font-size: 10px;
      font-weight: 400;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .summary-card .value {
      font-size: 20px;
      font-weight: 700;
      color: #333;
    }

    .summary-card .value.khr { color: #c62828; }
    .summary-card .value.usd { color: #2e7d32; }
    .summary-card .value.total { color: #c2185b; }

    .summary-card .sub-value {
      font-size: 9px;
      color: #888;
      margin-top: 5px;
    }

    /* ==================== BREAKDOWN TABLES ==================== */
    .breakdown-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .breakdown-card {
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
    }

    .breakdown-card h4 {
      font-size: 12px;
      font-weight: 600;
      color: #555;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
    }

    .breakdown-card h4 .icon {
      margin-right: 8px;
      color: #e91e63;
    }

    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
    }

    .breakdown-table th,
    .breakdown-table td {
      padding: 8px 10px;
      text-align: left;
      font-size: 10px;
      border-bottom: 1px solid #eee;
    }

    .breakdown-table th {
      font-weight: 600;
      color: #666;
      background: #f5f5f5;
    }

    .breakdown-table td:last-child {
      text-align: right;
    }

    /* ==================== GUEST TABLE ==================== */
    .guest-section {
      margin-top: 20px;
    }

    .guest-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #ddd;
    }

    .guest-table thead {
      background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .guest-table th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e91e63;
      white-space: nowrap;
    }

    .guest-table th small {
      display: block;
      font-weight: 400;
      color: #888;
      font-size: 8px;
      margin-top: 2px;
    }

    .guest-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }

    .guest-table .even-row {
      background: #fff;
    }

    .guest-table .odd-row {
      background: #fafafa;
    }

    .guest-table .col-num {
      width: 35px;
      text-align: center;
      color: #888;
      font-weight: 600;
    }

    .guest-table .col-name {
      min-width: 120px;
      font-weight: 500;
    }

    .guest-table .col-name .khmer-name {
      color: #666;
      font-style: italic;
    }

    .guest-table .col-phone {
      width: 90px;
      color: #555;
    }

    .guest-table .col-note {
      min-width: 100px;
      max-width: 150px;
      color: #666;
      font-size: 9px;
    }

    .guest-table .col-amount {
      width: 100px;
      text-align: right;
      font-weight: 600;
    }

    .guest-table .col-amount.khr { color: #c62828; }
    .guest-table .col-amount.usd { color: #2e7d32; }

    .guest-table .col-payment {
      width: 80px;
      text-align: center;
    }

    /* ==================== PAYMENT BADGES ==================== */
    .payment-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .payment-badge.cash {
      background: #7c4dff;
      color: #fff;
    }

    .payment-badge.aba {
      background: #0066cc;
      color: #fff;
    }

    .payment-badge.ac {
      background: #ff6d00;
      color: #fff;
    }

    /* ==================== FINAL PAGE ==================== */
    .final-section {
      text-align: center;
      padding: 40px 20px;
      margin-top: 40px;
      border-top: 2px solid #e91e63;
    }

    .final-section .ornament {
      font-size: 30px;
      color: #e91e63;
      margin-bottom: 20px;
    }

    .final-section .thank-you {
      font-size: 18px;
      font-weight: 700;
      color: #c2185b;
      margin-bottom: 10px;
    }

    .final-section .message {
      font-size: 12px;
      color: #666;
      max-width: 400px;
      margin: 0 auto;
      line-height: 1.8;
    }

    .final-section .signature {
      margin-top: 30px;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    /* ==================== PAGE FOOTER ==================== */
    .page-footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #999;
    }

    /* ==================== PRINT SPECIFIC ==================== */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .cover-page {
        min-height: auto;
        height: 100vh;
      }

      .summary-cards {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  </style>
</head>
<body>
  <!-- ==================== COVER PAGE ==================== -->
  <div class="cover-page">
    <div class="cover-ornament">❦ ❦ ❦</div>
    <h1 class="cover-title">សៀវភៅកត់ចំណងដៃ</h1>
    <p class="cover-subtitle">WEDDING GUEST REGISTRY</p>
    
    <div class="couple-names">
      ${escapeHtml(groomName)}
      <span class="and">&</span>
      ${escapeHtml(brideName)}
    </div>

    ${
      groomFather || groomMother || brideFather || brideMother
        ? `
    <div class="parents-info">
      <div class="parent-row">
        <div class="parent-side">
          <div class="parent-label">ឳពុកកូនកំលោះ & ម្ដាយកូនកំលោះ</div>
          <div class="parent-name">${escapeHtml(groomFather) || "-"} & ${
            escapeHtml(groomMother) || "-"
          }</div>
        </div>
        <div class="parent-side">
          <div class="parent-label">ឳពុកកូនក្រមុំ & ម្ដាយកូនក្រមុំ</div>
          <div class="parent-name">${escapeHtml(brideFather) || "-"} & ${
            escapeHtml(brideMother) || "-"
          }</div>
        </div>
      </div>
    </div>
    `
        : ""
    }
    
    <div class="wedding-details">
      ${
        weddingDate
          ? `<p><span class="icon">📅</span> ${escapeHtml(weddingDate)}</p>`
          : ""
      }
      ${
        weddingTime
          ? `<p><span class="icon">🕐</span> ${escapeHtml(weddingTime)}</p>`
          : ""
      }
      ${
        weddingLocation
          ? `<p><span class="icon">📍</span> ${escapeHtml(weddingLocation)}</p>`
          : ""
      }
    </div>
    
    <div class="cover-footer">
      <p>នាំចេញនៅ: ${exportDate}</p>
    </div>
  </div>

  <!-- ==================== SUMMARY PAGE ==================== -->
  <div class="content-page">
    <div class="page-header">
      <div class="page-header-left">សៀវភៅកត់ចំណងដៃ</div>
      <div class="page-header-center">${escapeHtml(groomName)} & ${escapeHtml(
      brideName
    )}</div>
      <div class="page-header-right">${weddingDate || ""}</div>
    </div>

    <div class="summary-section">
      <h2 class="section-title"><span class="icon">📊</span> សង្ខេបទូទៅ (Summary)</h2>
      
      <div class="summary-cards">
        <div class="summary-card">
          <h3>ចំនួនភ្ញៀវសរុប</h3>
          <div class="value">${totals.total_guests.toLocaleString()}</div>
          <div class="sub-value">Total Guests</div>
        </div>
        <div class="summary-card">
          <h3>សរុបរូបិយភ័ណ្ឌរៀល</h3>
          <div class="value khr">${formatNumber(totals.total_khr)} ៛</div>
          <div class="sub-value">Total KHR</div>
        </div>
        <div class="summary-card">
          <h3>សរុបរូបិយភ័ណ្ឌដុល្លារ</h3>
          <div class="value usd">$${formatNumber(totals.total_usd)}</div>
          <div class="sub-value">Total USD</div>
        </div>
        <div class="summary-card highlight">
          <h3>សរុបទាំងអស់</h3>
          <div class="value total">${formatNumber(grandTotalKHR)} ៛</div>
          <div class="sub-value">Grand Total (in KHR)</div>
        </div>
      </div>

      <div class="breakdown-section">
        <div class="breakdown-card">
          <h4><span class="icon">💳</span> ការបែងចែកតាមប្រភេទការបង់ (By Payment Type)</h4>
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>ប្រភេទ</th>
                <th>ចំនួន</th>
                <th>សរុប</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>សាច់ប្រាក់ (CASH)</td>
                <td>${paymentBreakdown.CASH.count} នាក់</td>
                <td>${formatNumber(paymentBreakdown.CASH.totalKHR)} ៛</td>
              </tr>
              <tr>
                <td>ABA Bank</td>
                <td>${paymentBreakdown.ABA.count} នាក់</td>
                <td>${formatNumber(paymentBreakdown.ABA.totalKHR)} ៛</td>
              </tr>
              <tr>
                <td>AC Bank</td>
                <td>${paymentBreakdown.AC.count} នាក់</td>
                <td>${formatNumber(paymentBreakdown.AC.totalKHR)} ៛</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="breakdown-card">
          <h4><span class="icon">💰</span> ការបែងចែកតាមរូបិយភ័ណ្ឌ (By Currency)</h4>
          <table class="breakdown-table">
            <thead>
              <tr>
                <th>រូបិយភ័ណ្ឌ</th>
                <th>ចំនួន</th>
                <th>សរុប</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>រៀល (KHR)</td>
                <td>${currencyBreakdown.KHR.count} នាក់</td>
                <td>${formatNumber(currencyBreakdown.KHR.total)} ៛</td>
              </tr>
              <tr>
                <td>ដុល្លារ (USD)</td>
                <td>${currencyBreakdown.USD.count} នាក់</td>
                <td>$${formatNumber(currencyBreakdown.USD.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== GUEST LIST PAGE ==================== -->
  <div class="content-page">
    <div class="page-header">
      <div class="page-header-left">បញ្ជីភ្ញៀវ (Guest List)</div>
      <div class="page-header-center">${escapeHtml(groomName)} & ${escapeHtml(
      brideName
    )}</div>
      <div class="page-header-right">${totals.total_guests} នាក់</div>
    </div>

    <div class="guest-section">
      <table class="guest-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ឈ្មោះភ្ញៀវ<small>Guest Name</small></th>
            <th>លេខទូរស័ព្ទ<small>Phone</small></th>
            <th>កំណត់ចំណាំ<small>Note</small></th>
            <th style="text-align: right;">ចំនួន<small>Amount</small></th>
            <th style="text-align: center;">ប្រភេទ<small>Payment</small></th>
          </tr>
        </thead>
        <tbody>
          ${guestRows}
        </tbody>
      </table>
    </div>

    <!-- ==================== FINAL SECTION ==================== -->
    <div class="final-section">
      <div class="ornament">❦</div>
      <p class="thank-you">សូមអរគុណ</p>
      <p class="message">
        សូមអរគុណដល់ភ្ញៀវទាំងអស់ដែលបានចូលរួមក្នុងពិធីមង្គលការរបស់យើង។
        <br>
        Thank you to all guests who joined our wedding celebration.
      </p>
      <div class="signature">
        ${escapeHtml(groomName)} & ${escapeHtml(brideName)}
      </div>
    </div>

    <div class="page-footer">
      <div>ប្រព័ន្ធកត់ចំណងដៃ</div>
      <div>នាំចេញនៅ: ${exportDate} ${exportTime}</div>
      <div>Wedding Guest Registry</div>
    </div>
  </div>
</body>
</html>
  `;
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Calculate payment type breakdown from guests array
   */
  function calculatePaymentBreakdown(guests) {
    const breakdown = {
      CASH: { count: 0, totalKHR: 0, totalUSD: 0 },
      ABA: { count: 0, totalKHR: 0, totalUSD: 0 },
      AC: { count: 0, totalKHR: 0, totalUSD: 0 },
    };

    guests.forEach((guest) => {
      const type = guest.payment_type || "CASH";
      const amountKHR = guest.amount_khr || 0;
      const amountUSD = guest.amount_usd || 0;

      if (breakdown[type]) {
        breakdown[type].count++;
        breakdown[type].totalKHR += amountKHR;
        breakdown[type].totalUSD += amountUSD;
      }
    });

    return breakdown;
  }

  /**
   * Calculate currency breakdown from guests array
   */
  function calculateCurrencyBreakdown(guests) {
    const breakdown = {
      KHR: { count: 0, total: 0 },
      USD: { count: 0, total: 0 },
    };

    guests.forEach((guest) => {
      const currency = guest.currency || "KHR";
      const amount = guest.amount || 0;

      if (breakdown[currency]) {
        breakdown[currency].count++;
        breakdown[currency].total += amount;
      }
    });

    return breakdown;
  }

  /**
   * Get human-readable payment type label
   */
  function getPaymentTypeLabel(type) {
    const labels = {
      CASH: "សាច់ប្រាក់",
      ABA: "ABA",
      AC: "AC",
    };
    return labels[type] || type || "សាច់ប្រាក់";
  }

  /**
   * Format date in Khmer locale
   */
  function formatDateKhmer(dateStr) {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("km-KH");
    } catch {
      return dateStr;
    }
  }

  /**
   * Format number with thousand separators
   */
  function formatNumber(num) {
    if (num === null || num === undefined) return "0";
    return parseFloat(num).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    if (!text) return "";
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Format currency with symbol
   */
  function formatCurrency(amount, currency) {
    const num = parseFloat(amount) || 0;
    if (currency === "USD") {
      return "$" + num.toLocaleString("en-US", { minimumFractionDigits: 0 });
    }
    return num.toLocaleString("en-US") + " ៛";
  }

  // ============================================================================
  // EXPOSE FUNCTIONS GLOBALLY
  // ============================================================================
  window.exportToExcel = exportToExcel;
  window.exportToPDF = exportToPDF;

  console.log("export.js: Functions registered successfully:", {
    exportToExcel: typeof window.exportToExcel,
    exportToPDF: typeof window.exportToPDF,
  });
})();

// Final verification
console.log("export.js: Module loaded completely");
