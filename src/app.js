const { ipcRenderer } = require("electron");

// Application State - exposed globally for export.js access
let guests = [];
let filteredGuests = []; // Store filtered results for pagination
let editingGuestId = null;
let totals = {
  total_guests: 0,
  total_khr: 0,
  total_usd: 0,
  cash_total: 0,
};

// Pagination State
let currentPage = 1;
let itemsPerPage = 10;
let currentSearchTerm = "";
let currentPaymentFilter = "";

// Expose state globally for export.js to access
window.guests = guests;
window.totals = totals;

// Currency Conversion
const EXCHANGE_RATE = 4000; // 1 USD = 4000 KHR

function convertToKHR(amount, fromCurrency) {
  if (fromCurrency === "USD") {
    return amount * EXCHANGE_RATE;
  }
  return amount; // Already in KHR
}

function convertToUSD(amount, fromCurrency) {
  if (fromCurrency === "KHR") {
    return amount / EXCHANGE_RATE;
  }
  return amount; // Already in USD
}

function getConvertedAmounts(amount, currency) {
  const numAmount = parseFloat(amount) || 0;
  return {
    khr: convertToKHR(numAmount, currency),
    usd: convertToUSD(numAmount, currency),
    original: numAmount,
    originalCurrency: currency,
  };
}
// Add real-time currency conversion preview
function updateCurrencyPreview() {
  if (!elements.guestAmount || !elements.guestCurrency) return;

  const amount = parseFloat(elements.guestAmount.value) || 0;
  const currency = elements.guestCurrency.value;

  // Find or create preview element
  let previewElement = document.getElementById("currencyPreview");
  if (!previewElement) {
    previewElement = document.createElement("div");
    previewElement.id = "currencyPreview";
    previewElement.className = "currency-preview";
    elements.guestAmount.parentNode.appendChild(previewElement);
  }

  if (amount > 0) {
    const convertedAmounts = getConvertedAmounts(amount, currency);
    const convertedText =
      currency === "KHR"
        ? `≈ ${formatCurrency(convertedAmounts.usd, "USD")}`
        : `≈ ${formatCurrency(convertedAmounts.khr, "KHR")}`;
    previewElement.innerHTML = `<small class="conversion-preview">${convertedText}</small>`;
    previewElement.style.display = "block";
  } else {
    previewElement.style.display = "none";
  }
}
// DOM Elements
const elements = {
  // Dashboard
  totalGuests: document.getElementById("totalGuests"),
  totalKHR: document.getElementById("totalKHR"),
  totalUSD: document.getElementById("totalUSD"),
  cashSummary: document.getElementById("cashSummary"),

  // Controls
  addGuestBtn: document.getElementById("addGuestBtn"),
  searchInput: document.getElementById("searchInput"),
  exportExcelBtn: document.getElementById("exportExcelBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  printBtn: document.getElementById("printBtn"),

  // Table
  guestsTable: document.getElementById("guestsTable"),
  guestsTableBody: document.getElementById("guestsTableBody"),
  emptyState: document.getElementById("emptyState"),

  // Modal
  guestModal: document.getElementById("guestModal"),
  guestForm: document.getElementById("guestForm"),
  modalTitle: document.getElementById("modalTitle"),
  saveGuestBtn: document.getElementById("saveGuestBtn"),

  // Form fields
  guestName: document.getElementById("guestName"),
  guestNameKm: document.getElementById("guestNameKm"),
  guestPhone: document.getElementById("guestPhone"),
  guestNote: document.getElementById("guestNote"),
  guestAmount: document.getElementById("guestAmount"),
  guestCurrency: document.getElementById("guestCurrency"),
  selectedInvitationGuestId: document.getElementById(
    "selectedInvitationGuestId"
  ),

  // Loading
  loadingOverlay: document.getElementById("loadingOverlay"),

  // Date
  currentDate: document.getElementById("currentDate"),
};

// Utility Functions
function formatCurrency(amount, currency) {
  const num = parseFloat(amount) || 0;
  if (currency === "KHR") {
    return num.toLocaleString("km-KH") + " ៛";
  } else {
    return (
      "$" +
      num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}

function formatKhmerNumber(num) {
  return num.toLocaleString("km-KH");
}

// Enhanced loading function with custom messages
function showLoading(
  show = true,
  title = "កំពុងដំណើរការ...",
  subtitle = "Processing..."
) {
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingSubtitle = document.getElementById("loadingSubtitle");

  if (show) {
    if (loadingTitle) loadingTitle.textContent = title;
    if (loadingSubtitle) loadingSubtitle.textContent = subtitle;
    elements.loadingOverlay.classList.add("show");
  } else {
    elements.loadingOverlay.classList.remove("show");
  }
}

// Show table loading skeleton
function showTableLoading(show = true) {
  const skeleton = document.getElementById("tableLoadingSkeleton");
  const table = document.getElementById("guestsTable");
  const emptyState = document.getElementById("emptyState");
  const paginationContainer = document.getElementById("paginationContainer");

  if (show) {
    if (skeleton) skeleton.style.display = "block";
    if (table) table.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (paginationContainer) paginationContainer.style.display = "none";
  } else {
    if (skeleton) skeleton.style.display = "none";
  }
}

// Button loading state
function setButtonLoading(button, loading = true) {
  if (!button) return;

  if (loading) {
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.classList.remove("loading");
    button.disabled = false;
  }
}

// Expose showLoading globally for export.js
window.showLoading = showLoading;
window.showTableLoading = showTableLoading;
window.setButtonLoading = setButtonLoading;

function showNotification(message, type = "success", duration = 4000) {
  console.log("Showing notification:", message, type); // Debug log

  // Remove existing notifications
  document.querySelectorAll(".toast-notification").forEach((n) => n.remove());

  // Create notification element
  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;

  // Set content based on type
  let icon, title;
  if (type === "success") {
    icon = "✅";
    title = "ជោគជ័យ!";
  } else if (type === "error") {
    icon = "❌";
    title = "មានកំហុស!";
  } else if (type === "warning") {
    icon = "⚠️";
    title = "ការព្រមាន!";
  } else {
    icon = "♻️";
    title = "ជោគជ័យ!";
  }

  // Create HTML content
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Add close button functionality
  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      toast.style.animation = "toastSlideOut 0.25s ease-in forwards";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };
  }

  // Add to DOM
  document.body.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "toastSlideOut 0.25s ease-in forwards";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }, duration);

  console.log("Toast notification created and added to DOM"); // Debug log
}

// Expose showNotification globally for export.js
window.showNotification = showNotification;

// Expose pagination functions globally for HTML onclick handlers
window.changePage = changePage;
window.changeItemsPerPage = changeItemsPerPage;
window.clearFilters = clearFilters;

// Date Functions
function updateCurrentDate() {
  const now = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const khmerDate = now.toLocaleDateString("km-KH", options);
  const englishDate = now.toLocaleDateString("en-US", options);

  elements.currentDate.innerHTML = `
        <div>${khmerDate}</div>
        <small style="opacity: 0.8;">${englishDate}</small>
    `;
}

// Data Loading Functions
async function loadGuests() {
  try {
    // Show table skeleton while loading
    showTableLoading(true);

    guests = await ipcRenderer.invoke("get-guests");
    window.guests = guests; // Sync global reference for export.js

    // Initialize filteredGuests with all guests (apply current filters if any)
    if (currentSearchTerm || currentPaymentFilter) {
      filterGuests(currentSearchTerm, currentPaymentFilter);
    } else {
      filteredGuests = [...guests];
      renderGuestsTable();
      renderPagination();
    }

    await loadTotals();
    updateDashboard();
  } catch (error) {
    console.error("Error loading guests:", error);
    showNotification("Error loading guests: " + error.message, "error");
  } finally {
    // Hide table skeleton
    showTableLoading(false);
  }
}

async function loadTotals() {
  try {
    totals = await ipcRenderer.invoke("get-totals");
    window.totals = totals; // Sync global reference for export.js
  } catch (error) {
    console.error("Error loading totals:", error);
  }
}

// UI Rendering Functions
function updateDashboard() {
  // Update total guests
  elements.totalGuests.textContent = formatKhmerNumber(totals.total_guests);

  // Update KHR total
  elements.totalKHR.textContent = formatCurrency(totals.total_khr, "KHR");

  // Update USD total
  elements.totalUSD.textContent = formatCurrency(totals.total_usd, "USD");

  // Update cash summary
  elements.cashSummary.innerHTML = `
        <div class="amount-khr">${formatCurrency(totals.total_khr, "KHR")}</div>
        <div class="amount-usd">+ ${formatCurrency(
          totals.total_usd,
          "USD"
        )}</div>
    `;
}

function renderGuestsTable() {
  // Use filteredGuests for display (includes search/filter results)
  const displayGuests =
    filteredGuests.length > 0 || currentSearchTerm || currentPaymentFilter
      ? filteredGuests
      : guests;
  const paginationContainer = document.getElementById("paginationContainer");

  if (displayGuests.length === 0) {
    elements.guestsTable.style.display = "none";
    elements.emptyState.style.display = "block";
    if (paginationContainer) paginationContainer.style.display = "none";

    // Update empty state message based on whether it's filtered or not
    if (currentSearchTerm || currentPaymentFilter) {
      elements.emptyState.innerHTML = `
        <div class="empty-icon">
          <i class="fas fa-search"></i>
        </div>
        <h3>រកមិនឃើញលទ្ធផល</h3>
        <p>No results found for your search. Try different keywords.</p>
        <button class="btn btn-primary" onclick="clearFilters()">
          <i class="fas fa-times"></i>
          សម្អាតតម្រង
        </button>
      `;
    } else {
      elements.emptyState.innerHTML = `
        <div class="empty-icon">
          <i class="fas fa-users-slash"></i>
        </div>
        <h3>មិនទានមៀហ្មានណាមួយទេ</h3>
        <p>No guests found. Click "Add Guest" to get started.</p>
        <button class="btn btn-primary" onclick="openGuestModal()">
          <i class="fas fa-plus"></i>
          បន្ថែមភ្ញៀវដំបូង
        </button>
      `;
    }
    return;
  }

  elements.guestsTable.style.display = "table";
  elements.emptyState.style.display = "none";
  if (paginationContainer) paginationContainer.style.display = "flex";

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGuests = displayGuests.slice(startIndex, endIndex);

  // Calculate the global index for numbering (continues across pages)
  const globalStartIndex = startIndex;

  elements.guestsTableBody.innerHTML = paginatedGuests
    .map(
      (guest, index) => `
        <tr class="guest-row" data-id="${guest.id}">
            <td class="col-index">${globalStartIndex + index + 1}</td>
            <td class="col-name">
                <div class="guest-name">${escapeHtml(
                  guest.name_km || guest.name
                )}</div>
                ${
                  guest.name_km
                    ? `<div class="guest-name-en">${escapeHtml(
                        guest.name
                      )}</div>`
                    : ""
                }
            </td>
            <td class="col-phone">${escapeHtml(guest.phone || "-")}</td>
            <td class="col-note">
                <div class="note-text" title="${escapeHtml(guest.note || "")}">
                    ${escapeHtml(guest.note || "-")}
                </div>
            </td>
            <td class="col-amount">
                <div class="amount-display">
                    <div class="amount-primary ${
                      guest.currency === "KHR" ? "amount-khr" : "amount-usd"
                    }">
                        ${formatCurrency(guest.amount, guest.currency)}
                    </div>
                    <div class="amount-converted">
                        ${
                          guest.currency === "KHR"
                            ? formatCurrency(
                                guest.amount_usd ||
                                  guest.amount / EXCHANGE_RATE,
                                "USD"
                              )
                            : formatCurrency(
                                guest.amount_khr ||
                                  guest.amount * EXCHANGE_RATE,
                                "KHR"
                              )
                        }
                    </div>
                </div>
            </td>
            <td class="col-payment">
                <span class="payment-badge ${guest.payment_type.toLowerCase()}">
                    ${
                      guest.payment_type === "CASH"
                        ? "សាច់ប្រាក់"
                        : guest.payment_type
                    }
                </span>
            </td>
            <td class="col-actions">
                <div class="actions-group">
                    <button class="btn btn-sm btn-edit" onclick="editGuest(${
                      guest.id
                    })">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteGuest(${
                      guest.id
                    })">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `
    )
    .join("");
}

// Clear all filters
function clearFilters() {
  currentSearchTerm = "";
  currentPaymentFilter = "";
  currentPage = 1;

  // Reset UI elements
  if (elements.searchInput) elements.searchInput.value = "";
  const paymentFilterSelect = document.getElementById("paymentFilterSelect");
  if (paymentFilterSelect) paymentFilterSelect.value = "";

  filteredGuests = [...guests];
  renderGuestsTable();
  renderPagination();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Search and Filter Functionality
function filterGuests(
  searchTerm = currentSearchTerm,
  paymentFilter = currentPaymentFilter
) {
  // Store current filter values
  currentSearchTerm = searchTerm;
  currentPaymentFilter = paymentFilter;

  // Reset to first page when filters change
  currentPage = 1;

  // Apply filters
  filteredGuests = guests.filter((guest) => {
    const searchLower = searchTerm.toLowerCase();

    // Search filter - check name (en), name_km, phone, and note
    const matchesSearch =
      !searchTerm ||
      guest.name.toLowerCase().includes(searchLower) ||
      (guest.name_km && guest.name_km.includes(searchTerm)) || // Direct match for Khmer text
      (guest.phone && guest.phone.includes(searchTerm)) ||
      (guest.note && guest.note.toLowerCase().includes(searchLower));

    // Payment type filter
    const matchesPayment =
      !paymentFilter || guest.payment_type === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  renderGuestsTable();
  renderPagination();
}

// Change page
function changePage(page) {
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  renderGuestsTable();
  renderPagination();

  // Scroll to top of table
  const tableSection = document.querySelector(".table-section");
  if (tableSection) {
    tableSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Change items per page
function changeItemsPerPage(newItemsPerPage) {
  itemsPerPage = parseInt(newItemsPerPage);
  currentPage = 1; // Reset to first page
  renderGuestsTable();
  renderPagination();
}

// Render pagination controls
function renderPagination() {
  const paginationContainer = document.getElementById("paginationContainer");
  if (!paginationContainer) return;

  const totalItems = filteredGuests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis for large page counts
  let pageNumbers = [];
  if (totalPages <= 7) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    if (currentPage <= 4) {
      pageNumbers = [1, 2, 3, 4, 5, "...", totalPages];
    } else if (currentPage >= totalPages - 3) {
      pageNumbers = [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    } else {
      pageNumbers = [
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      ];
    }
  }

  paginationContainer.innerHTML = `
    <div class="pagination-info">
      <span class="pagination-showing">
        បង្ហាញ <strong>${startItem}</strong> - <strong>${endItem}</strong> ពី <strong>${totalItems}</strong> កំណត់ត្រា
      </span>
      <div class="pagination-per-page">
        <label>បង្ហាញ:</label>
        <select id="itemsPerPageSelect" onchange="changeItemsPerPage(this.value)">
          <option value="10" ${
            itemsPerPage === 10 ? "selected" : ""
          }>10</option>
          <option value="25" ${
            itemsPerPage === 25 ? "selected" : ""
          }>25</option>
          <option value="50" ${
            itemsPerPage === 50 ? "selected" : ""
          }>50</option>
          <option value="100" ${
            itemsPerPage === 100 ? "selected" : ""
          }>100</option>
        </select>
      </div>
    </div>
    <div class="pagination-controls">
      <button class="pagination-btn pagination-prev" onclick="changePage(${
        currentPage - 1
      })" ${currentPage === 1 ? "disabled" : ""}>
        <i class="fas fa-chevron-left"></i>
        មុន
      </button>
      <div class="pagination-pages">
        ${pageNumbers
          .map((page) => {
            if (page === "...") {
              return '<span class="pagination-ellipsis">...</span>';
            }
            return `<button class="pagination-page ${
              page === currentPage ? "active" : ""
            }" onclick="changePage(${page})">${page}</button>`;
          })
          .join("")}
      </div>
      <button class="pagination-btn pagination-next" onclick="changePage(${
        currentPage + 1
      })" ${currentPage === totalPages || totalPages === 0 ? "disabled" : ""}>
        បន្ទាប់
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;
}

// Modal Functions
function openGuestModal(guestId = null) {
  editingGuestId = guestId;

  if (guestId) {
    // Edit mode
    const guest = guests.find((g) => g.id === guestId);
    if (guest) {
      elements.modalTitle.textContent = "កែប្រែមេហ្មាន";
      elements.guestName.value = guest.name;
      elements.guestNameKm.value = guest.name_km || "";
      elements.guestPhone.value = guest.phone || "";
      elements.guestNote.value = guest.note || "";
      elements.guestAmount.value = guest.amount;
      elements.guestCurrency.value = guest.currency;

      // Set payment type
      const paymentRadio = elements.guestForm.querySelector(
        `input[name="payment_type"][value="${guest.payment_type}"]`
      );
      if (paymentRadio) {
        paymentRadio.checked = true;
      }

      elements.saveGuestBtn.innerHTML = '<i class="fas fa-save"></i> កែប្រែ';

      // Update conversion preview for edit mode
      setTimeout(() => {
        updateCurrencyPreview();
      }, 100);
    }
  } else {
    // Add mode
    elements.modalTitle.textContent = "បន្ថែមភ្ញៀវថ្មី";
    elements.guestForm.reset();
    elements.guestCurrency.value = "KHR";
    elements.saveGuestBtn.innerHTML = '<i class="fas fa-save"></i> រក្សាទុក';
  }

  elements.guestModal.classList.add("show");
  elements.guestName.focus();
}

function closeGuestModal() {
  elements.guestModal.classList.remove("show");
  editingGuestId = null;
  elements.guestForm.reset();

  // Clear currency preview
  const previewElement = document.getElementById("currencyPreview");
  if (previewElement) {
    previewElement.style.display = "none";
  }

  // Clear invitation guest selection
  const invitationGuestIdField = document.getElementById(
    "selectedInvitationGuestId"
  );
  if (invitationGuestIdField) {
    invitationGuestIdField.value = "";
  }
  const suggestionsContainer = document.getElementById("invitationSuggestions");
  if (suggestionsContainer) {
    suggestionsContainer.innerHTML = "";
  }
}

// CRUD Operations
async function saveGuest(guestData) {
  try {
    // Set button loading state
    setButtonLoading(elements.saveGuestBtn, true);

    if (editingGuestId) {
      // Show loading with update message
      showLoading(true, "កំពុងកែប្រែ...", "Updating guest...");
      // Update existing guest
      await ipcRenderer.invoke("update-guest", editingGuestId, guestData);
      showNotification("កែប្រែមេហ្មានបានជោគជ័យ!");
      await loadGuests();
      closeGuestModal(); // Close modal after editing
    } else {
      // Show loading with add message
      showLoading(true, "កំពុងបន្ថែម...", "Adding new guest...");
      // Add new guest
      await ipcRenderer.invoke("add-guest", guestData);
      showNotification(
        "បន្ថែមមេហ្មានបានជោគជ័យ! អ្នកអាចបន្ថែមភ្ញៀវផ្សេងទៀតបាន។"
      );
      await loadGuests();

      // Mark invitation guest as imported if selected from invitation list
      if (guestData.invitation_guest_id) {
        try {
          await ipcRenderer.invoke(
            "mark-invitation-guest-imported",
            guestData.invitation_guest_id
          );
          console.log(
            "Marked invitation guest as imported:",
            guestData.invitation_guest_id
          );
        } catch (error) {
          console.error("Error marking invitation guest:", error);
        }
      }

      // Clear form but keep modal open for adding more guests
      elements.guestForm.reset();
      elements.guestCurrency.value = "KHR"; // Reset to default currency
      // Clear invitation guest selection
      elements.selectedInvitationGuestId.value = "";
      // Focus back to name field for quick entry
      setTimeout(() => {
        elements.guestName.focus();
      }, 100);
    }
  } catch (error) {
    console.error("Error saving guest:", error);
    showNotification("Error saving guest: " + error.message, "error");
  } finally {
    showLoading(false);
    setButtonLoading(elements.saveGuestBtn, false);
  }
}

async function editGuest(guestId) {
  openGuestModal(guestId);
}

async function deleteGuest(guestId) {
  const guest = guests.find((g) => g.id === guestId);
  if (!guest) return;

  const confirmed = confirm(`តើអ្នកពិតជាចង់លុបមេហ្មាន "${guest.name}" មែនទេ?`);
  if (!confirmed) return;

  try {
    showLoading(true, "កំពុងលុប...", "Deleting guest...");
    await ipcRenderer.invoke("delete-guest", guestId);
    showNotification(
      `ភ្ញៀវ "${guest.name}" ត្រូវបានលុបចេញពីបញ្ជីរួចរាល់`,
      "success"
    );
    await loadGuests();
  } catch (error) {
    console.error("Error deleting guest:", error);
    showNotification("Error deleting guest: " + error.message, "error");
  } finally {
    showLoading(false);
  }
}

// Event Listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Add guest button
  if (elements.addGuestBtn) {
    elements.addGuestBtn.addEventListener("click", () => {
      console.log("Add guest button clicked");
      openGuestModal();
    });
    console.log("Add guest button listener added");
  } else {
    console.error("addGuestBtn element not found!");
  }

  // Search input with debounce for better performance
  let searchTimeout;
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      // Add loading class to search container
      const searchContainer = elements.searchInput.closest(".search-container");
      if (searchContainer) searchContainer.classList.add("loading");

      searchTimeout = setTimeout(() => {
        filterGuests(e.target.value, currentPaymentFilter);
        // Remove loading class after search
        if (searchContainer) searchContainer.classList.remove("loading");
      }, 300);
    });
  }

  // Payment type filter
  const paymentFilterSelect = document.getElementById("paymentFilterSelect");
  if (paymentFilterSelect) {
    paymentFilterSelect.addEventListener("change", (e) => {
      filterGuests(currentSearchTerm, e.target.value);
    });
  }

  // Export buttons
  if (elements.exportExcelBtn) {
    elements.exportExcelBtn.addEventListener("click", () => {
      console.log("Export Excel button clicked");
      if (typeof window.exportToExcel === "function") {
        window.exportToExcel();
      } else {
        console.error("exportToExcel function not found");
        showNotification("Export function not available", "error");
      }
    });
  }
  if (elements.exportPdfBtn) {
    elements.exportPdfBtn.addEventListener("click", () => {
      console.log("Export PDF button clicked");
      if (typeof window.exportToPDF === "function") {
        window.exportToPDF();
      } else {
        console.error("exportToPDF function not found");
        showNotification("Export function not available", "error");
      }
    });
  }
  if (elements.printBtn) {
    elements.printBtn.addEventListener("click", () => window.print());
  }

  // Modal close events
  if (elements.guestModal) {
    elements.guestModal.addEventListener("click", (e) => {
      if (e.target === elements.guestModal) {
        closeGuestModal();
      }
    });
  }

  // Add event listeners for real-time conversion
  if (elements.guestAmount && elements.guestCurrency) {
    elements.guestAmount.addEventListener("input", updateCurrencyPreview);
    elements.guestCurrency.addEventListener("change", updateCurrencyPreview);
  }

  // Form submission
  elements.guestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(elements.guestForm);
    const invitationGuestId = document.getElementById(
      "selectedInvitationGuestId"
    )?.value;

    const guestData = {
      name: formData.get("name").trim(),
      name_km: formData.get("name_km")?.trim() || null,
      phone: formData.get("phone").trim(),
      note: formData.get("note").trim(),
      amount: parseFloat(formData.get("amount")) || 0,
      currency: formData.get("currency"),
      payment_type: formData.get("payment_type"),
    };

    // Add invitation_guest_id if selected from invitation list
    if (invitationGuestId) {
      guestData.invitation_guest_id = parseInt(invitationGuestId);
    }

    // Validation
    if (!guestData.name) {
      showNotification("សូមបញ្ចូលឈ្មោះភ្ញៀវ", "error");
      elements.guestName.focus();
      return;
    }

    if (guestData.amount < 0) {
      showNotification("ចំនួនទឹកប្រាក់មិនអាចតិចជាង 0 បានទេ", "error");
      elements.guestAmount.focus();
      return;
    }

    // Add conversion info to guest data for display
    const convertedAmounts = getConvertedAmounts(
      guestData.amount,
      guestData.currency
    );
    guestData.converted_khr = convertedAmounts.khr;
    guestData.converted_usd = convertedAmounts.usd;

    await saveGuest(guestData);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "n":
          e.preventDefault();
          openGuestModal();
          break;
        case "f":
          e.preventDefault();
          elements.searchInput.focus();
          break;
        case "p":
          e.preventDefault();
          window.print();
          break;
      }
    }

    if (e.key === "Escape") {
      closeGuestModal();
    }
  });

  // IPC event listeners
  ipcRenderer.on("new-guest", () => {
    openGuestModal();
  });

  ipcRenderer.on("export-excel", () => {
    if (typeof window.exportToExcel === "function") {
      window.exportToExcel();
    }
  });

  ipcRenderer.on("export-pdf", () => {
    if (typeof window.exportToPDF === "function") {
      window.exportToPDF();
    }
  });
}

// Wedding Information Management
let weddingInfo = {
  groomName: "",
  brideName: "",
  groomFather: "",
  groomMother: "",
  brideFather: "",
  brideMother: "",
  weddingDate: "",
  weddingTime: "",
  weddingLocation: "",
  latitude: "",
  longitude: "",
  invitationMessage: "",
  uploadedFiles: [],
};

async function initWeddingInfo() {
  try {
    // Load wedding info from database
    const savedWeddingInfo = await ipcRenderer.invoke("get-all-wedding-info");
    console.log("Loaded wedding info from database:", savedWeddingInfo);

    // Merge with default wedding info, excluding uploadedFiles
    Object.keys(savedWeddingInfo).forEach((key) => {
      if (key !== "uploadedFiles" && savedWeddingInfo[key]) {
        weddingInfo[key] = savedWeddingInfo[key];
      }
    });

    populateWeddingForm();
  } catch (error) {
    console.error("Error loading wedding info from database:", error);
    // Fallback to localStorage
    const savedWeddingInfo = localStorage.getItem("weddingInfo");
    if (savedWeddingInfo) {
      const parsed = JSON.parse(savedWeddingInfo);
      Object.keys(parsed).forEach((key) => {
        if (key !== "uploadedFiles" && parsed[key]) {
          weddingInfo[key] = parsed[key];
        }
      });
      populateWeddingForm();
    }
  }

  // Check if wedding info section should be visible
  const isWeddingInfoVisible =
    localStorage.getItem("weddingInfoVisible") == "false";
  const weddingInfoSection = document.querySelector(".wedding-info");
  const toggleBtn = document.getElementById("toggleWeddingInfo");

  if (weddingInfoSection) {
    if (!isWeddingInfoVisible) {
      weddingInfoSection.classList.add("hidden");
      toggleBtn.classList.remove("active");
    } else {
      toggleBtn.classList.add("active");
    }
  }

  setupWeddingEventListeners();
  initWeddingFileUpload();

  // Load wedding files
  await loadUploadedFiles();
}

function setupWeddingEventListeners() {
  // Toggle wedding info visibility
  const toggleBtn = document.getElementById("toggleWeddingInfo");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleWeddingInfoSection);
  }

  // Save wedding info button
  const saveBtn = document.querySelector(".save-wedding-info");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveWeddingInfo);
  }

  // View map button
  const viewMapBtn = document.querySelector(".view-map");
  if (viewMapBtn) {
    viewMapBtn.addEventListener("click", openMapView);
  }

  // Preview invitation button
  const previewBtn = document.querySelector(".preview-invitation");
  if (previewBtn) {
    previewBtn.addEventListener("click", previewInvitation);
  }

  // Auto-save on input change
  const inputs = document.querySelectorAll(
    ".wedding-info-table .info-input:not(#weddingFilesInput)"
  );
  inputs.forEach((input) => {
    input.addEventListener("blur", autoSaveWeddingInfo);

    // Add enter key navigation
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const allInputs = Array.from(inputs);
        const currentIndex = allInputs.indexOf(input);
        if (currentIndex < allInputs.length - 1) {
          allInputs[currentIndex + 1].focus();
        }
      }
    });
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleWeddingKeyboardShortcuts);
}

function handleWeddingKeyboardShortcuts(e) {
  // Ctrl/Cmd + W to toggle wedding info
  if ((e.ctrlKey || e.metaKey) && e.key === "w") {
    e.preventDefault();
    toggleWeddingInfoSection();
  }

  // Ctrl/Cmd + S to save wedding info (when focused on wedding inputs)
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.classList.contains("info-input")) {
      e.preventDefault();
      saveWeddingInfo();
    }
  }

  // Ctrl/Cmd + M to open map (when wedding section is active)
  if ((e.ctrlKey || e.metaKey) && e.key === "m") {
    const weddingSection = document.querySelector(".wedding-info");
    if (weddingSection && !weddingSection.classList.contains("hidden")) {
      e.preventDefault();
      openMapView();
    }
  }
}

function toggleWeddingInfoSection() {
  const weddingInfoSection = document.querySelector(".wedding-info");
  const toggleBtn = document.getElementById("toggleWeddingInfo");

  if (weddingInfoSection.classList.contains("hidden")) {
    // Show section
    weddingInfoSection.classList.remove("hidden");
    toggleBtn.classList.add("active");
    localStorage.setItem("weddingInfoVisible", "true");
    showNotification("បានបង្ហាញផ្នែកព័ត៌មានអាពាហ៍ពិពាហ៍", "info");
  } else {
    // Hide section
    weddingInfoSection.classList.add("hidden");
    toggleBtn.classList.remove("active");
    localStorage.setItem("weddingInfoVisible", "false");
    showNotification("បានលាក់ផ្នែកព័ត៌មានអាពាហ៍ពិពាហ៍", "info");
  }
}

function populateWeddingForm() {
  const inputs = document.querySelectorAll(
    ".wedding-info-table .info-input:not(#weddingFilesInput)"
  );
  const mapping = [
    "groomName",
    "brideName",
    "groomFather",
    "brideFather",
    "groomMother",
    "brideMother",
    "weddingDate",
    "weddingTime",
    "weddingLocation",
    "latitude",
    "longitude",
    "invitationMessage",
  ];

  inputs.forEach((input, index) => {
    const key = mapping[index];
    if (key && weddingInfo[key]) {
      input.value = weddingInfo[key];
    }
  });
}

function collectWeddingFormData() {
  const inputs = document.querySelectorAll(
    ".wedding-info-table .info-input:not(#weddingFilesInput)"
  );
  const mapping = [
    "groomName",
    "brideName",
    "groomFather",
    "brideFather",
    "groomMother",
    "brideMother",
    "weddingDate",
    "weddingTime",
    "weddingLocation",
    "latitude",
    "longitude",
    "invitationMessage",
  ];

  const updatedInfo = { ...weddingInfo };
  inputs.forEach((input, index) => {
    const key = mapping[index];
    if (key) {
      updatedInfo[key] = input.value || "";
    }
  });

  return updatedInfo;
}

async function saveWeddingInfo() {
  try {
    weddingInfo = collectWeddingFormData();

    // Save to database
    for (const [key, value] of Object.entries(weddingInfo)) {
      if (key !== "uploadedFiles") {
        await ipcRenderer.invoke("set-wedding-info", key, value);
      }
    }

    // Also save to localStorage as backup
    localStorage.setItem("weddingInfo", JSON.stringify(weddingInfo));

    showNotification("ព័ត៌មានអាពាហ៍ពិពាហ៍បានរក្សាទុកជោគជ័យ!", "success");

    // Validate required fields
    const requiredFields = [
      "groomName",
      "brideName",
      "weddingDate",
      "weddingLocation",
    ];
    const missingFields = requiredFields.filter((field) => !weddingInfo[field]);

    if (missingFields.length > 0) {
      showNotification("សូមបំពេញព័ត៌មានចាំបាច់ឱ្យបានគ្រប់គ្រាន់", "warning");
    }
  } catch (error) {
    console.error("Error saving wedding info:", error);
    showNotification("មានបញ្ហាក្នុងការរក្សាទុកព័ត៌មាន", "error");
  }
}

async function autoSaveWeddingInfo() {
  try {
    weddingInfo = collectWeddingFormData();

    // Save to database
    for (const [key, value] of Object.entries(weddingInfo)) {
      if (key !== "uploadedFiles") {
        await ipcRenderer.invoke("set-wedding-info", key, value);
      }
    }

    // Also save to localStorage as backup
    localStorage.setItem("weddingInfo", JSON.stringify(weddingInfo));
  } catch (error) {
    console.error("Auto-save error:", error);
  }
}

function openMapView() {
  const { latitude, longitude, weddingLocation } = weddingInfo;

  if (!latitude || !longitude) {
    showNotification("សូមបញ្ចូល Latitude និង Longitude ជាមុនសិន", "warning");
    // Focus on coordinate inputs
    const latInput = document.querySelector(".coords-input");
    if (latInput) latInput.focus();
    return;
  }

  // Validate coordinates
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    showNotification(
      "Latitude/Longitude មិនត្រឹមត្រូវ\nLatitude: -90 ទៅ 90\nLongitude: -180 ទៅ 180",
      "error"
    );
    return;
  }

  // Create Google Maps URL
  const location = weddingLocation
    ? encodeURIComponent(weddingLocation)
    : "Wedding Location";
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}&t=h&z=15&hl=km`;

  try {
    // Open in default browser
    const { shell } = require("electron");
    shell.openExternal(mapUrl);
    showNotification("កំពុងបើកផែនទី Google Maps...", "success");
  } catch (error) {
    console.error("Error opening map:", error);
    showNotification("មានបញ្ហាក្នុងការបើកផែនទី", "error");
  }
}

function previewInvitation() {
  const {
    groomName,
    brideName,
    weddingDate,
    weddingTime,
    weddingLocation,
    invitationMessage,
  } = weddingInfo;

  if (!groomName || !brideName || !weddingDate || !weddingLocation) {
    showNotification("សូមបំពេញព័ត៌មានចាំបាច់ជាមុនសិន", "warning");
    return;
  }

  // Format date for display
  const date = new Date(weddingDate);
  const formattedDate = date.toLocaleDateString("km-KH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = weddingTime || "ម៉ោងនឹងប្រកាសក្រោយ";

  const invitationHtml = `
    <div style="font-family: 'Nokora', sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem; background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h1 style="color: #e91e63; font-size: 2rem; margin-bottom: 1rem;">💍 អញ្ជើញចូលរួមពិធីអាពាហ៍ពិពាហ៍ 💍</h1>
      </div>
      
      <div style="background: white; padding: 2rem; border-radius: 12px; margin-bottom: 1.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <p style="font-size: 1.2rem; color: #1a202c; margin-bottom: 0.5rem;">
            <strong style="color: #e91e63;">កូនកំលោះ:</strong> ${groomName}
          </p>
          <p style="font-size: 1.2rem; color: #1a202c;">
            <strong style="color: #e91e63;">កូនក្រមុំ:</strong> ${brideName}
          </p>
        </div>
        
        <hr style="border: none; height: 1px; background: #e2e8f0; margin: 1.5rem 0;">
        
        <div style="color: #4a5568; line-height: 1.6;">
          <p style="margin-bottom: 0.75rem;">
            <strong>📅 កាលបរិច្ឆេទ:</strong> ${formattedDate}
          </p>
          <p style="margin-bottom: 0.75rem;">
            <strong>🕐 ម៉ោង:</strong> ${formattedTime}
          </p>
          <p style="margin-bottom: 1rem;">
            <strong>📍 ទីតាំង:</strong> ${weddingLocation}
          </p>
          
          ${
            invitationMessage
              ? `
            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border-left: 4px solid #e91e63;">
              <p style="color: #1a202c; font-style: italic;">${invitationMessage}</p>
            </div>
          `
              : ""
          }
        </div>
      </div>
      
      <div style="text-align: center; color: #718096; font-size: 0.9rem;">
        <p>សូមអញ្ជើញមកចូលរួមដើម្បីចែករំលែកក្នុងពេលវេលាពិសេសនេះ</p>
      </div>
    </div>
  `;

  // Create and show preview modal
  createPreviewModal(invitationHtml);
}

function createPreviewModal(content) {
  // Remove existing preview modal
  const existingModal = document.getElementById("invitationPreviewModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement("div");
  modal.id = "invitationPreviewModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    padding: 2rem;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    border-radius: 16px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;

  const closeButton = document.createElement("button");
  closeButton.innerHTML = "×";
  closeButton.style.cssText = `
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: #e91e63;
    color: white;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    z-index: 1;
  `;

  closeButton.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  modalContent.innerHTML = content;
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

// Wedding File Upload Management
function initWeddingFileUpload() {
  const fileInput = document.getElementById("weddingFilesInput");
  const dropZone = document.getElementById("weddingFileDropZone");
  const filesList = document.getElementById("uploadedFilesList");

  if (!fileInput || !dropZone || !filesList) return;

  // Click to upload
  dropZone.addEventListener("click", () => fileInput.click());

  // File input change
  fileInput.addEventListener("change", handleFileSelect);

  // Drag and drop events
  dropZone.addEventListener("dragover", handleDragOver);
  dropZone.addEventListener("dragleave", handleDragLeave);
  dropZone.addEventListener("drop", handleFileDrop);

  // Load existing files
  loadUploadedFiles();
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  processFiles(files);
  event.target.value = ""; // Clear input
}

function handleDragOver(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.add("dragover");
}

function handleDragLeave(event) {
  event.preventDefault();
  event.stopPropagation();
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove("dragover");
  }
}

function handleFileDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove("dragover");

  const files = Array.from(event.dataTransfer.files);
  processFiles(files);
}

function processFiles(files) {
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const validFiles = [];
  const errors = [];

  files.forEach((file) => {
    if (file.size > maxFileSize) {
      errors.push(`${file.name}: ឯកសារធំពេក (អតិបរមា 10MB)`);
      return;
    }

    // Check if file already exists (check both name formats)
    const existingFile = weddingInfo.uploadedFiles.find((f) => {
      const fName = f.original_name || f.name;
      const fSize = f.file_size || f.size;
      return fName === file.name && fSize === file.size;
    });

    if (existingFile) {
      errors.push(`${file.name}: ឯកសារនេះមានរួចហើយ`);
      return;
    }

    validFiles.push(file);
  });

  if (errors.length > 0) {
    showNotification(errors.join("\n"), "warning");
  }

  if (validFiles.length > 0) {
    uploadFiles(validFiles);
  }
}

async function uploadFiles(files) {
  const path = require("path");
  const fs = require("fs");

  // Get uploads directory from main process (handles packaged app correctly)
  const uploadsDir = await ipcRenderer.invoke("get-uploads-path");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  files.forEach(async (file) => {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadsDir, fileName);

    const fileData = {
      name: fileName,
      originalName: file.name,
      filePath: filePath,
      fileSize: file.size,
      mimeType: file.type,
      fileType: file.type.startsWith("image/") ? "image" : "document",
    };

    // Copy file to uploads directory
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        console.log("Writing file to:", filePath);
        fs.writeFileSync(filePath, Buffer.from(e.target.result));
        console.log("File written successfully");

        // Save to database
        console.log("Saving file metadata to database:", fileData);
        const savedFile = await ipcRenderer.invoke(
          "add-wedding-file",
          fileData
        );
        console.log("File saved to database:", savedFile);

        // Update display
        await loadUploadedFiles();

        showNotification(`បានបន្ថែម ${file.name} ជោគជ័យ`, "success");
      } catch (error) {
        console.error("Error saving file:", error);
        showNotification(
          `មានបញ្ហាក្នុងការរក្សាទុក ${file.name}: ${error.message}`,
          "error"
        );
      }
    };

    reader.onerror = function (error) {
      console.error("FileReader error:", error);
      showNotification(`មានបញ្ហាក្នុងការអានឯកសារ ${file.name}`, "error");
    };

    reader.readAsArrayBuffer(file);
  });
}

async function loadUploadedFiles() {
  try {
    console.log("Loading wedding files from database...");
    const files = await ipcRenderer.invoke("get-wedding-files");
    console.log("Loaded files:", files);
    weddingInfo.uploadedFiles = files || [];
    displayUploadedFiles();
  } catch (error) {
    console.error("Error loading wedding files:", error);
    weddingInfo.uploadedFiles = [];
    displayUploadedFiles();
  }
}

function displayUploadedFiles() {
  const filesList = document.getElementById("uploadedFilesList");
  if (!filesList) return;

  if (!weddingInfo.uploadedFiles || weddingInfo.uploadedFiles.length === 0) {
    filesList.innerHTML = "";
    return;
  }

  const filesHtml = weddingInfo.uploadedFiles
    .map((file) => {
      const isImage = (file.mime_type || file.type || "").startsWith("image/");
      const fileIcon = getFileIcon(file.mime_type || file.type);
      const fileSize = formatFileSize(file.file_size || file.size);

      return `
      <div class="file-item ${isImage ? "image" : "document"}" data-file-id="${
        file.id
      }">
        ${isImage ? createImagePreview(file) : ""}
        <div class="file-icon ${isImage ? "image" : "document"}">
          <i class="${fileIcon}"></i>
        </div>
        <div class="file-info">
          <div class="file-name" title="${file.original_name || file.name}">${
        file.original_name || file.name
      }</div>
          <div class="file-size">${fileSize}</div>
        </div>
        <div class="file-actions">
          <button class="file-action-btn view" onclick="viewWeddingFile('${
            file.id
          }')" title="មើល">
            <i class="fas fa-eye"></i>
          </button>
          <button class="file-action-btn delete" onclick="deleteWeddingFile('${
            file.id
          }')" title="លុប">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  filesList.innerHTML = filesHtml + createFilesSummary();
}

function createImagePreview(file) {
  const filePath = file.file_path || file.path;
  const fileName = file.original_name || file.name;
  const mimeType = file.mime_type || file.type;

  if (mimeType && mimeType.startsWith("image/")) {
    return `<img src="file://${filePath}" alt="${fileName}" class="file-preview-thumbnail" onerror="this.style.display='none'">`;
  }
  return "";
}

function getFileIcon(mimeType) {
  if (!mimeType) return "fas fa-file";
  if (mimeType.startsWith("image/")) return "fas fa-image";
  if (mimeType.includes("pdf")) return "fas fa-file-pdf";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "fas fa-file-word";
  if (mimeType.includes("text")) return "fas fa-file-alt";
  return "fas fa-file";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function createFilesSummary() {
  const totalFiles = weddingInfo.uploadedFiles.length;
  const totalSize = weddingInfo.uploadedFiles.reduce(
    (sum, file) => sum + (file.file_size || file.size || 0),
    0
  );

  return `
    <div class="files-summary">
      <div class="files-count">
        <i class="fas fa-folder"></i>
        ចំនួនឯកសារ: <strong>${totalFiles}</strong>
      </div>
      <div class="files-size">
        <i class="fas fa-database"></i>
        ទំហំសរុប: <strong>${formatFileSize(totalSize)}</strong>
      </div>
    </div>
  `;
}

async function viewWeddingFile(fileId) {
  try {
    const file = await ipcRenderer.invoke("get-wedding-file", fileId);
    if (!file) {
      showNotification("ឯកសារនេះមិនមានទេ", "error");
      return;
    }

    const { shell } = require("electron");
    shell.openPath(file.file_path);
  } catch (error) {
    console.error("Error opening file:", error);
    showNotification("មានបញ្ហាក្នុងការបើកឯកសារ", "error");
  }
}

async function deleteWeddingFile(fileId) {
  try {
    const file = await ipcRenderer.invoke("get-wedding-file", fileId);
    if (!file) {
      showNotification("ឯកសារនេះមិនមានទេ", "error");
      return;
    }

    const fileName = file.original_name || file.name;
    if (confirm(`តើអ្នកប្រាកដថាចង់លុបឯកសារ "${fileName}" មែនទេ?`)) {
      // Delete from database
      await ipcRenderer.invoke("delete-wedding-file", fileId);

      // Delete physical file
      const fs = require("fs");
      if (fs.existsSync(file.file_path)) {
        fs.unlinkSync(file.file_path);
      }

      // Reload files
      await loadUploadedFiles();

      showNotification(`បានលុប ${fileName} ជោគជ័យ`, "success");
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    showNotification("មានបញ្ហាក្នុងការលុបឯកសារ", "error");
  }
}

function viewAllWeddingFiles() {
  if (!weddingInfo.uploadedFiles || weddingInfo.uploadedFiles.length === 0) {
    showNotification("មិនមានឯកសារអាពាហ៍ពិពាហ៍ទេ", "info");
    return;
  }

  const filesListHtml = weddingInfo.uploadedFiles
    .map((file) => {
      const fileIcon = getFileIcon(file.mime_type || file.type);
      const fileSize = formatFileSize(file.file_size || file.size);
      const uploadDate = new Date(
        file.created_at || file.uploadDate
      ).toLocaleDateString("km-KH");

      return `
      <div class="file-gallery-item" onclick="viewWeddingFile('${file.id}')">
        <div class="file-gallery-icon">
          <i class="${fileIcon}"></i>
        </div>
        <div class="file-gallery-info">
          <h4>${file.original_name || file.name}</h4>
          <p>${fileSize} • ${uploadDate}</p>
        </div>
      </div>
    `;
    })
    .join("");

  const galleryHtml = `
    <div style="font-family: 'Nokora', sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h2 style="color: #e91e63; margin-bottom: 1rem;">
          <i class="fas fa-folder-open"></i> ឯកសារអាពាហ៍ពិពាហ៍
        </h2>
        <p style="color: #666;">ចុចលើឯកសារដើម្បីបើក</p>
      </div>
      
      <div style="display: grid; gap: 1rem; max-height: 400px; overflow-y: auto;">
        ${filesListHtml}
      </div>
      
      <div style="text-align: center; margin-top: 2rem; color: #666;">
        <small>ចំនួនឯកសារសរុប: ${weddingInfo.uploadedFiles.length}</small>
      </div>
    </div>
    
    <style>
      .file-gallery-item {
        display: flex;
        align-items: center;
        padding: 1rem;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .file-gallery-item:hover {
        background: #f8fafc;
        transform: translateX(5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .file-gallery-icon {
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #e91e63;
        color: white;
        border-radius: 8px;
        margin-right: 1rem;
        font-size: 1.5rem;
      }
      .file-gallery-info h4 {
        margin: 0 0 0.5rem 0;
        color: #1a202c;
      }
      .file-gallery-info p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
      }
    </style>
  `;

  createPreviewModal(galleryHtml);
}

// Initialize Application
async function initApp() {
  try {
    console.log("Starting app initialization...");

    // Check if DOM elements exist
    console.log("Checking DOM elements...");
    console.log("addGuestBtn exists:", !!elements.addGuestBtn);
    console.log("guestsTableBody exists:", !!elements.guestsTableBody);
    console.log("totalGuests exists:", !!elements.totalGuests);

    updateCurrentDate();
    console.log("Date updated");

    setupEventListeners();
    console.log("Event listeners set up");

    setupQRCodeListeners();
    console.log("QR code listeners set up");

    setupInvitationGuestsListeners();
    console.log("Invitation guests listeners set up");

    await initWeddingInfo();
    console.log("Wedding info initialized");

    await loadGuests();
    console.log("Guests loaded");

    // Update date every minute
    setInterval(updateCurrentDate, 60000);

    console.log("Wedding List Management System initialized successfully");
  } catch (error) {
    console.error("Error initializing app:", error);
    showNotification(
      "Error initializing application: " + error.message,
      "error"
    );
  }
}

// Global functions for HTML onclick events
window.openGuestModal = openGuestModal;
window.closeGuestModal = closeGuestModal;
window.editGuest = editGuest;
window.deleteGuest = deleteGuest;
window.viewWeddingFile = viewWeddingFile;
window.deleteWeddingFile = deleteWeddingFile;
window.openPaymentQRModal = openPaymentQRModal;
window.closePaymentQRModal = closePaymentQRModal;

// Payment QR Code Functions
let currentQRCode = null;

async function openPaymentQRModal() {
  console.log("openPaymentQRModal called");
  const modal = document.getElementById("paymentQRModal");
  console.log("Modal element:", modal);

  if (!modal) {
    console.error("paymentQRModal not found!");
    return;
  }

  modal.classList.add("show");
  document.body.style.overflow = "hidden";
  console.log("Modal should be visible now");

  // Load existing QR code
  await loadPaymentQRCode();
}

function closePaymentQRModal() {
  const modal = document.getElementById("paymentQRModal");
  if (!modal) return;

  modal.classList.remove("show");
  document.body.style.overflow = "";
}

async function loadPaymentQRCode() {
  try {
    const qrCode = await ipcRenderer.invoke("get-payment-qr-code");
    currentQRCode = qrCode;

    const qrEmptyState = document.getElementById("qrEmptyState");
    const qrCodeDisplay = document.getElementById("qrCodeDisplay");
    const qrCodeImage = document.getElementById("qrCodeImage");
    const uploadQRBtn = document.getElementById("uploadQRBtnText");
    const removeQRBtn = document.getElementById("removeQRBtn");

    if (qrCode) {
      // Show QR code
      qrEmptyState.style.display = "none";
      qrCodeDisplay.style.display = "block";
      qrCodeImage.src = qrCode.file_path;
      uploadQRBtn.textContent = "ផ្លាស់ប្តូរ QR កូដ";
      removeQRBtn.style.display = "inline-flex";
    } else {
      // Show empty state
      qrEmptyState.style.display = "flex";
      qrCodeDisplay.style.display = "none";
      uploadQRBtn.textContent = "បង្ហោះ QR កូដ";
      removeQRBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Error loading QR code:", error);
    showNotification("មានបញ្ហាក្នុងការផ្ទុក QR កូដ", "error");
  }
}

async function uploadQRCode() {
  const input = document.getElementById("qrCodeInput");
  const file = input.files[0];

  if (!file) {
    showNotification("សូមជ្រើសរើសរូបភាព", "warning");
    return;
  }

  // Validate file type
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!validTypes.includes(file.type)) {
    showNotification("សូមជ្រើសរើសរូបភាពប្រភេទ PNG, JPEG ឬ WebP", "error");
    input.value = "";
    return;
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showNotification("ទំហំរូបភាពធំពេក (អតិបរមា 5MB)", "error");
    input.value = "";
    return;
  }

  try {
    showLoading(true);

    const fs = require("fs");
    const path = require("path");

    // Get uploads directory from main process (handles packaged app correctly)
    const uploadsDir = await ipcRenderer.invoke("get-uploads-path");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const fileName = `qr_code_${timestamp}${extension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Read file and save it
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = Buffer.from(e.target.result);
        fs.writeFileSync(filePath, buffer);

        // Save to database
        const fileData = {
          name: fileName,
          originalName: file.name,
          filePath: filePath,
          fileSize: file.size,
          mimeType: file.type,
          fileType: "image",
        };

        await ipcRenderer.invoke("add-payment-qr-code", fileData);

        showNotification("បានបង្ហោះ QR កូដដោយជោគជ័យ! 🎉", "success");
        await loadPaymentQRCode();

        // Reset input
        input.value = "";
      } catch (error) {
        console.error("Error saving QR code:", error);
        showNotification("មានបញ្ហាក្នុងការរក្សាទុក QR កូដ", "error");
      } finally {
        showLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error("Error uploading QR code:", error);
    showNotification("មានបញ្ហាក្នុងការបង្ហោះ QR កូដ", "error");
    showLoading(false);
  }
}

async function removeQRCode() {
  if (!currentQRCode) return;

  const confirmed = confirm("តើអ្នកប្រាកដថាចង់លុប QR កូដនេះមែនទេ?");
  if (!confirmed) return;

  try {
    showLoading(true);

    const fs = require("fs");

    // Delete file from filesystem
    if (fs.existsSync(currentQRCode.file_path)) {
      fs.unlinkSync(currentQRCode.file_path);
    }

    // Delete from database
    await ipcRenderer.invoke("delete-wedding-file", currentQRCode.id);

    showNotification("បានលុប QR កូដដោយជោគជ័យ", "success");
    await loadPaymentQRCode();
  } catch (error) {
    console.error("Error removing QR code:", error);
    showNotification("មានបញ្ហាក្នុងការលុប QR កូដ", "error");
  } finally {
    showLoading(false);
  }
}

// Setup QR Code Event Listeners
function setupQRCodeListeners() {
  console.log("Setting up QR code listeners...");

  const showQRBtn = document.getElementById("showPaymentQRBtn");
  const uploadQRBtn = document.getElementById("uploadQRBtn");
  const removeQRBtn = document.getElementById("removeQRBtn");
  const qrCodeInput = document.getElementById("qrCodeInput");

  console.log("showPaymentQRBtn exists:", !!showQRBtn);
  console.log("uploadQRBtn exists:", !!uploadQRBtn);
  console.log("qrCodeInput exists:", !!qrCodeInput);

  if (showQRBtn) {
    showQRBtn.addEventListener("click", openPaymentQRModal);
    console.log("QR button click listener attached");
  } else {
    console.error("showPaymentQRBtn not found!");
  }

  if (uploadQRBtn) {
    uploadQRBtn.addEventListener("click", () => {
      qrCodeInput.click();
    });
  }

  if (qrCodeInput) {
    qrCodeInput.addEventListener("change", uploadQRCode);
  }

  if (removeQRBtn) {
    removeQRBtn.addEventListener("click", removeQRCode);
  }

  // Close modal on background click
  const qrModal = document.getElementById("paymentQRModal");
  if (qrModal) {
    qrModal.addEventListener("click", (e) => {
      if (e.target === qrModal) {
        closePaymentQRModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && qrModal && qrModal.classList.contains("show")) {
      closePaymentQRModal();
    }
  });
}

// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", initApp);

// ===================================
// Invitation Guests Management
// ===================================

let invitationGuests = [];
let filteredInvitationGuests = [];
let csvData = [];

// Open Invitation Guests Modal
function openInvitationGuestsModal() {
  const modal = document.getElementById("invitationGuestsModal");
  if (modal) {
    modal.classList.add("show");
    loadInvitationGuests();
    loadInvitationGuestsStats();
  }
}

// Close Invitation Guests Modal
function closeInvitationGuestsModal() {
  const modal = document.getElementById("invitationGuestsModal");
  if (modal) {
    modal.classList.remove("show");
    clearCSVPreview();
  }
}

// Load Invitation Guests
async function loadInvitationGuests(filters = {}) {
  try {
    showLoading(true);
    invitationGuests = await ipcRenderer.invoke(
      "get-invitation-guests",
      filters
    );
    filteredInvitationGuests = invitationGuests;
    renderInvitationGuestsTable();
    loadGroupCategories();
  } catch (error) {
    console.error("Error loading invitation guests:", error);
    showNotification("មានបញ្ហាក្នុងការផ្ទុកបញ្ជីភ្ញៀវអញ្ជើញ", "error");
  } finally {
    showLoading(false);
  }
}

// Load Stats
async function loadInvitationGuestsStats() {
  try {
    const stats = await ipcRenderer.invoke("get-invitation-guests-stats");
    document.getElementById("totalInvitationGuests").textContent =
      stats.total || 0;
    document.getElementById("importedGuests").textContent = stats.imported || 0;
    document.getElementById("pendingGuests").textContent =
      stats.not_imported || 0;
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Render Invitation Guests Table
function renderInvitationGuestsTable() {
  const tbody = document.getElementById("invitationTableBody");
  const emptyState = document.getElementById("invitationEmptyState");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredInvitationGuests.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  filteredInvitationGuests.forEach((guest) => {
    const row = document.createElement("tr");
    row.dataset.guestId = guest.id;

    const statusBadge = guest.is_imported
      ? '<span class="status-badge imported"><i class="fas fa-check"></i> បានបញ្ចូល</span>'
      : '<span class="status-badge pending"><i class="fas fa-clock"></i> រង់ចាំ</span>';

    row.innerHTML = `
      <td><input type="checkbox" class="guest-checkbox" data-id="${
        guest.id
      }" /></td>
      <td>
        <div>${escapeHtml(guest.name)}</div>
        ${
          guest.name_km
            ? `<div style="color: #666; font-size: 0.875rem; margin-top: 2px;">${escapeHtml(
                guest.name_km
              )}</div>`
            : ""
        }
      </td>
      <td>${guest.phone || "-"}</td>
      <td>${guest.email || "-"}</td>
      <td>${guest.address || "-"}</td>
      <td>${guest.group_category || "-"}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="table-actions">
          <button class="btn-icon btn-delete" onclick="deleteInvitationGuest(${
            guest.id
          })" title="លុប">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

// Load Group Categories for Filter
function loadGroupCategories() {
  const select = document.getElementById("groupFilterSelect");
  if (!select) return;

  const groups = [
    ...new Set(invitationGuests.map((g) => g.group_category).filter(Boolean)),
  ];

  // Clear existing options except first
  select.innerHTML = '<option value="">ក្រុមទាំងអស់ / All Groups</option>';

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    select.appendChild(option);
  });
}

// Upload CSV File
async function uploadCSVFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".csv")) {
    showNotification("សូមជ្រើសរើសឯកសារ CSV", "error");
    return;
  }

  try {
    showLoading(true);
    const content = await file.text();
    csvData = parseCSV(content);

    if (csvData.length === 0) {
      showNotification("ឯកសារ CSV ទទេ", "error");
      return;
    }

    displayCSVPreview(csvData);
    showNotification(`បានផ្ទុក ${csvData.length} ជួរ`, "success");
  } catch (error) {
    console.error("Error reading CSV:", error);
    showNotification("មានបញ្ហាក្នុងការអានឯកសារ CSV", "error");
  } finally {
    showLoading(false);
  }
}

// Parse CSV Content
function parseCSV(content) {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row = {};

    // Map CSV columns to database fields
    const nameIdx = headers.findIndex(
      (h) => h.includes("name") && !h.includes("khmer") && !h.includes("km")
    );
    const nameKmIdx = headers.findIndex(
      (h) =>
        (h.includes("name") && (h.includes("khmer") || h.includes("km"))) ||
        h.includes("ឈ្មោះ")
    );
    const phoneIdx = headers.findIndex(
      (h) => h.includes("phone") || h.includes("លេខ")
    );
    const emailIdx = headers.findIndex(
      (h) => h.includes("email") || h.includes("អ៊ីមែល")
    );
    const addressIdx = headers.findIndex(
      (h) => h.includes("address") || h.includes("អាសយដ្ឋាន")
    );
    const groupIdx = headers.findIndex(
      (h) => h.includes("group") || h.includes("ក្រុម")
    );
    const noteIdx = headers.findIndex(
      (h) => h.includes("note") || h.includes("កំណត់")
    );

    if (nameIdx !== -1 && values[nameIdx]) {
      row.name = values[nameIdx];
      row.name_km = nameKmIdx !== -1 ? values[nameKmIdx] : "";
      row.phone = phoneIdx !== -1 ? values[phoneIdx] : "";
      row.email = emailIdx !== -1 ? values[emailIdx] : "";
      row.address = addressIdx !== -1 ? values[addressIdx] : "";
      row.group_category = groupIdx !== -1 ? values[groupIdx] : "";
      row.note = noteIdx !== -1 ? values[noteIdx] : "";
      data.push(row);
    }
  }

  return data;
}

// Display CSV Preview
function displayCSVPreview(data) {
  const preview = document.getElementById("csvPreview");
  const table = document.getElementById("csvPreviewTable");
  const rowCount = document.getElementById("csvRowCount");

  if (!preview || !table) return;

  rowCount.textContent = `${data.length} rows`;

  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Khmer Name</th>
        <th>Phone</th>
        <th>Email</th>
        <th>Address</th>
        <th>Group</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${data
        .slice(0, 10)
        .map(
          (row, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${row.name_km ? escapeHtml(row.name_km) : "-"}</td>
          <td>${row.phone || "-"}</td>
          <td>${row.email || "-"}</td>
          <td>${row.address || "-"}</td>
          <td>${row.group_category || "-"}</td>
          <td>${row.note || "-"}</td>
        </tr>
      `
        )
        .join("")}
      ${
        data.length > 10
          ? `<tr><td colspan="8" class="more-rows">... and ${
              data.length - 10
            } more rows</td></tr>`
          : ""
      }
    </tbody>
  `;

  preview.style.display = "block";
}

// Clear CSV Preview
function clearCSVPreview() {
  const preview = document.getElementById("csvPreview");
  if (preview) {
    preview.style.display = "none";
  }
  csvData = [];
  const input = document.getElementById("csvFileInput");
  if (input) input.value = "";
}

// Import CSV Data
async function importCSVData() {
  if (csvData.length === 0) {
    showNotification("មិនមានទិន្នន័យសម្រាប់នាំចូល", "error");
    return;
  }

  try {
    showLoading(true);
    const result = await ipcRenderer.invoke(
      "bulk-add-invitation-guests",
      csvData
    );

    showNotification(
      `បាននាំចូល ${result.successCount} ជួរដោយជោគជ័យ`,
      "success"
    );
    clearCSVPreview();
    await loadInvitationGuests();
    await loadInvitationGuestsStats();
  } catch (error) {
    console.error("Error importing CSV:", error);
    showNotification("មានបញ្ហាក្នុងការនាំចូលទិន្នន័យ", "error");
  } finally {
    showLoading(false);
  }
}

// Delete Invitation Guest
async function deleteInvitationGuest(id) {
  const confirmed = confirm("តើអ្នកប្រាកដថាចង់លុបភ្ញៀវនេះមែនទេ?");
  if (!confirmed) return;

  try {
    showLoading(true);
    await ipcRenderer.invoke("delete-invitation-guest", id);
    showNotification("បានលុបដោយជោគជ័យ", "success");
    await loadInvitationGuests();
    await loadInvitationGuestsStats();
  } catch (error) {
    console.error("Error deleting invitation guest:", error);
    showNotification("មានបញ្ហាក្នុងការលុបភ្ញៀវ", "error");
  } finally {
    showLoading(false);
  }
}

// Clear All Invitation Guests
async function clearAllInvitationGuests() {
  const confirmed = confirm(
    "តើអ្នកប្រាកដថាចង់លុបបញ្ជីភ្ញៀវអញ្ជើញទាំងអស់មែនទេ?\nសកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ!"
  );
  if (!confirmed) return;

  try {
    showLoading(true);
    await ipcRenderer.invoke("clear-all-invitation-guests");
    showNotification("បានលុបបញ្ជីទាំងអស់ដោយជោគជ័យ", "success");
    await loadInvitationGuests();
    await loadInvitationGuestsStats();
  } catch (error) {
    console.error("Error clearing invitation guests:", error);
    showNotification("មានបញ្ហាក្នុងការលុបបញ្ជី", "error");
  } finally {
    showLoading(false);
  }
}

// Select Invitation Guest for Registry
async function selectInvitationGuestForRegistry(id) {
  try {
    const guest = invitationGuests.find((g) => g.id === id);
    if (!guest) return;

    // Close invitation modal
    closeInvitationGuestsModal();

    // Open guest registration modal with pre-filled data
    openGuestModal();

    // Fill form with invitation guest data
    document.getElementById("guestName").value = guest.name;
    document.getElementById("guestPhone").value = guest.phone || "";
    document.getElementById("selectedInvitationGuestId").value = guest.id;

    // Mark as imported
    await ipcRenderer.invoke("mark-invitation-guest-imported", id);
  } catch (error) {
    console.error("Error selecting invitation guest:", error);
    showNotification("មានបញ្ហាក្នុងការជ្រើសរើសភ្ញៀវ", "error");
  }
}

// Search Invitation Guests in Add Guest Modal
async function searchInvitationGuestsForSuggestions(query) {
  if (!query || query.length < 2) {
    document.getElementById("invitationSuggestions").innerHTML = "";
    return;
  }

  try {
    const filters = { search: query, is_imported: false };
    const results = await ipcRenderer.invoke("get-invitation-guests", filters);

    displayInvitationSuggestions(results.slice(0, 5));
  } catch (error) {
    console.error("Error searching invitation guests:", error);
  }
}

// Display Invitation Suggestions
function displayInvitationSuggestions(results) {
  const container = document.getElementById("invitationSuggestions");
  if (!container) return;

  if (results.length === 0) {
    container.innerHTML =
      '<div class="suggestion-item no-results">មិនមានលទ្ធផល</div>';
    return;
  }

  container.innerHTML = results
    .map(
      (guest) => `
    <div class="suggestion-item" onclick="fillGuestFromInvitation(${guest.id})">
      <div class="suggestion-name">
        <i class="fas fa-user"></i>
        ${escapeHtml(guest.name)}
        ${
          guest.name_km
            ? `<span style="color: #666; font-weight: normal; margin-left: 8px;">(${escapeHtml(
                guest.name_km
              )})</span>`
            : ""
        }
      </div>
      <div class="suggestion-details">
        ${guest.phone || ""}
        ${
          guest.group_category
            ? `<span class="suggestion-group">${guest.group_category}</span>`
            : ""
        }
      </div>
    </div>
  `
    )
    .join("");
}

// Fill Guest Form from Invitation
async function fillGuestFromInvitation(id) {
  try {
    const guest = await ipcRenderer.invoke("get-invitation-guest", id);
    if (!guest) return;

    document.getElementById("guestName").value = guest.name;
    document.getElementById("guestNameKm").value = guest.name_km || "";
    document.getElementById("guestPhone").value = guest.phone || "";
    document.getElementById("selectedInvitationGuestId").value = guest.id;
    document.getElementById("invitationSuggestions").innerHTML = "";
  } catch (error) {
    console.error("Error filling guest from invitation:", error);
  }
}

// Download CSV Template
function downloadCSVTemplate() {
  const template =
    "Name,Name_KM,Phone,Email,Address,Group,Note\nJohn Doe,ចន ដូ,012345678,john@example.com,Phnom Penh,Family,VIP Guest\nJane Smith,ជេន ស្មីត,098765432,jane@example.com,Siem Reap,Friends,";

  const blob = new Blob([template], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "invitation_guests_template.csv";
  a.click();
  URL.revokeObjectURL(url);

  showNotification("បានទាញយកគំរូ CSV", "success");
}

// Setup Invitation Guests Event Listeners
function setupInvitationGuestsListeners() {
  const manageBtn = document.getElementById("manageInvitationGuestsBtn");
  const uploadCSVBtn = document.getElementById("uploadCSVBtn");
  const csvFileInput = document.getElementById("csvFileInput");
  const importCSVBtn = document.getElementById("importCSVBtn");
  const cancelCSVBtn = document.getElementById("cancelCSVBtn");
  const clearAllBtn = document.getElementById("clearAllInvitationGuestsBtn");
  const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
  const searchInput = document.getElementById("invitationSearchInput");
  const groupFilter = document.getElementById("groupFilterSelect");
  const importedFilter = document.getElementById("importedFilterSelect");
  const guestNameInput = document.getElementById("guestName");

  if (manageBtn) {
    manageBtn.addEventListener("click", openInvitationGuestsModal);
  }

  if (uploadCSVBtn && csvFileInput) {
    uploadCSVBtn.addEventListener("click", () => csvFileInput.click());
    csvFileInput.addEventListener("change", uploadCSVFile);
  }

  if (importCSVBtn) {
    importCSVBtn.addEventListener("click", importCSVData);
  }

  if (cancelCSVBtn) {
    cancelCSVBtn.addEventListener("click", clearCSVPreview);
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", clearAllInvitationGuests);
  }

  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener("click", downloadCSVTemplate);
  }

  // Search and Filter
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      filteredInvitationGuests = invitationGuests.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.name_km.includes(e.target.value) ||
          (g.phone && g.phone.includes(query)) ||
          (g.email && g.email.toLowerCase().includes(query))
      );
      renderInvitationGuestsTable();
    });
  }

  if (groupFilter) {
    groupFilter.addEventListener("change", (e) => {
      const filters = {};
      if (e.target.value) filters.group_category = e.target.value;
      if (importedFilter && importedFilter.value) {
        filters.is_imported = parseInt(importedFilter.value);
      }
      loadInvitationGuests(filters);
    });
  }

  if (importedFilter) {
    importedFilter.addEventListener("change", (e) => {
      const filters = {};
      if (e.target.value) filters.is_imported = parseInt(e.target.value);
      if (groupFilter && groupFilter.value) {
        filters.group_category = groupFilter.value;
      }
      loadInvitationGuests(filters);
    });
  }

  // Search in Add Guest Modal - unified name field with autocomplete
  if (guestNameInput) {
    let searchTimeout;
    guestNameInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchInvitationGuestsForSuggestions(e.target.value);
      }, 300);
    });

    // Clear suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".invitation-search-box")) {
        document.getElementById("invitationSuggestions").innerHTML = "";
      }
    });
  }

  // Close modal on background click
  const modal = document.getElementById("invitationGuestsModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeInvitationGuestsModal();
      }
    });
  }
}

const { shell } = require("electron");
document.getElementById("externalLink").addEventListener("click", function (e) {
  e.preventDefault();
  shell.openExternal(this.href);
});
