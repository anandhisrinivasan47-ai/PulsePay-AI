// ============================================================
// PULSEPAY AI - FREELANCE PAYMENT ASSISTANT
// Complete Frontend Controller
// Backend: FastAPI on http://127.0.0.1:8001
// ============================================================

// ============================================================
// 1. CONFIGURATION AND APPLICATION STATE
// ============================================================

const API_BASE_URL = "http://127.0.0.1:8001";

let invoices = [];
let currentFilter = "all";
let currentView = "overview";

const latestReminders = {};

const VIEW_IDS = [
  "overview",
  "my-invoices",
  "create-invoice",
  "ai-payment-insights",
  "client-history",
  "payment-follow-ups",
  "paypal-payments",
  "settings"
];

// ============================================================
// 2. DOM AND SECURITY HELPERS
// ============================================================

function getElement(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Not provided";

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return escapeHTML(value);
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function formatAmount(amount) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function normaliseStatus(status) {
  return String(status || "pending").trim().toLowerCase();
}

// ============================================================
// 3. TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = "info") {
  const container = getElement("toast-container");

  if (!container) return;

  const toast = document.createElement("div");

  const icons = {
    info: "info",
    success: "check_circle",
    error: "error"
  };

  toast.className = `toast-item toast-${type}`;

  toast.innerHTML = `
    <span class="material-symbols-outlined">
      ${icons[type] || icons.info}
    </span>

    <span class="toast-message"></span>

    <button type="button" class="toast-close" aria-label="Close">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;

  toast.querySelector(".toast-message").textContent = String(message);

  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.remove();
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 5000);
}

// ============================================================
// 4. API REQUEST WRAPPER
// ============================================================

async function apiRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body ? {
          "Content-Type": "application/json"
        } : {}),
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to FastAPI. Check whether the backend is running on port 8001."
    );
  }

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      detail: text || "The backend returned an invalid response."
    };
  }

  if (!response.ok) {
    let message = "Backend request failed.";

    if (Array.isArray(data.detail)) {
      message = data.detail.map(item => {
        const location = Array.isArray(item.loc)
          ? item.loc.join(" → ")
          : "";

        return `${location}: ${item.msg || "Validation error"}`;
      }).join("\n");
    } else if (typeof data.detail === "string") {
      message = data.detail;
    } else if (data.detail) {
      message = JSON.stringify(data.detail);
    } else if (data.message) {
      message = data.message;
    }

    throw new Error(message);
  }

  return data;
}

// ============================================================
// 5. BACKEND STATUS
// ============================================================

function updateBackendStatus(connected) {
  const label = getElement("backendStatusPill");
  const dot = getElement("backendDot");

  if (label) {
    label.textContent = connected
      ? "127.0.0.1:8001 · Connected"
      : "127.0.0.1:8001 · Offline";
  }

  if (dot) {
    dot.classList.toggle("connected", connected);
    dot.classList.toggle("disconnected", !connected);
  }
}

async function testBackendConnection() {
  try {
    const result = await apiRequest("/");

    updateBackendStatus(true);

    showToast(
      result.message || "Backend connection successful.",
      "success"
    );
  } catch (error) {
    updateBackendStatus(false);
    showToast(error.message, "error");
  }
}

// ============================================================
// 6. CONVERT BACKEND INVOICE RECORDS
// ============================================================

function convertInvoice(row) {
  if (Array.isArray(row)) {
    return {
      id: Number(row[0]),
      client: row[1] || "",
      service: row[2] || "",
      amount: Number(row[3]) || 0,
      dueDate: row[4] || "",
      status: normaliseStatus(row[5]),
      invoiceDate: row[6] || "",
      paidDate: row[7] || "",
      paypalOrderId: row[8] || "",
      paypalExpectedUsd: row[9] ?? null,
      paypalExchangeRate: row[10] ?? null
    };
  }

  return {
    id: Number(row.id),
    client: row.client || "",
    service: row.service || "",
    amount: Number(row.amount) || 0,
    dueDate: row.due_date || row.dueDate || "",
    status: normaliseStatus(row.payment_status || row.status),
    invoiceDate: row.invoice_date || row.invoiceDate || "",
    paidDate: row.paid_date || row.paidDate || "",
    paypalOrderId: row.paypal_order_id || row.paypalOrderId || "",
    paypalExpectedUsd: row.paypal_expected_usd ?? null,
    paypalExchangeRate: row.paypal_exchange_rate ?? null
  };
}

// ============================================================
// 7. VIEW NAVIGATION
// ============================================================

function switchView(viewName) {
  if (!VIEW_IDS.includes(viewName)) {
    viewName = "overview";
  }

  currentView = viewName;

  // Keep browser URL synchronized with the active view.
  const targetHash = `#${viewName}`;

  if (window.location.hash !== targetHash) {
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname +
      window.location.search +
      targetHash
    );
  }

  VIEW_IDS.forEach(id => {
    const section = getElement(`view-${id}`);

    if (section) {
      section.classList.add("hidden");
    }
  });

  const selectedSection = getElement(`view-${viewName}`);

  if (selectedSection) {
    selectedSection.classList.remove("hidden");
  }

  document.querySelectorAll(".nav-item").forEach(item => {
    const path = item.getAttribute("data-path");
    item.classList.toggle("active", path === viewName);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace("#", "");

  if (VIEW_IDS.includes(hash)) {
    switchView(hash);
  }
});

// ============================================================
// 8. LOAD INVOICES FROM FASTAPI
// ============================================================

async function loadInvoicesFromBackend() {
  try {
    const data = await apiRequest("/invoices");

    const rows = Array.isArray(data)
      ? data
      : data.invoices || [];

    invoices = rows.map(convertInvoice);

    updateBackendStatus(true);

    displayInvoices();
    renderOverviewSnapshot();
    updateDashboard();

    const count = getElement("navInvoiceCount");

    if (count) {
      count.textContent = invoices.length;
    }

    console.log(
      `PulsePay AI: ${invoices.length} invoices loaded from SQLite.`
    );
  } catch (error) {
    console.error("Invoice loading error:", error);

    updateBackendStatus(false);

    const container = getElement("invoiceList");

    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined danger-text">warning</span>
          <h3>Unable to load invoices</h3>
          <p>${escapeHTML(error.message)}</p>

          <button class="primary-button"
            onclick="loadInvoicesFromBackend()">
            Retry Connection
          </button>
        </div>
      `;
    }

    showToast(error.message, "error");
  }
}

// ============================================================
// 9. CREATE INVOICE
// ============================================================

async function createInvoice() {
  const client = getElement("clientName")?.value.trim();
  const service = getElement("service")?.value.trim();
  const amountValue = getElement("amount")?.value;
  const invoiceDate = getElement("invoiceDate")?.value;
  const dueDate = getElement("dueDate")?.value;

  const amount = Number(amountValue);

  if (!client || !service || !amountValue || !invoiceDate || !dueDate) {
    showToast("Please complete all invoice fields.", "error");
    return;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Enter a valid invoice amount.", "error");
    return;
  }

  if (dueDate < invoiceDate) {
    showToast("The due date cannot be before the invoice date.", "error");
    return;
  }

  const payload = {
    client,
    service,
    amount,
    invoice_date: invoiceDate,
    due_date: dueDate,
    payment_status: "pending"
  };

  const button = getElement("createInvoiceBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  try {
    const result = await apiRequest("/invoices", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    showToast(
      result.message || "Invoice created successfully.",
      "success"
    );

    getElement("createInvoiceForm")?.reset();

    setDefaultDates();

    await loadInvoicesFromBackend();

    switchView("my-invoices");
  } catch (error) {
    console.error("Create invoice error:", error);
    showToast(error.message, "error");
  } finally {
    if (button) {
      button.disabled = false;

      button.innerHTML = `
        <span class="material-symbols-outlined">save</span>
        Save Invoice
      `;
    }
  }
}

// ============================================================
// 10. INVOICE STATUS AND FILTERS
// ============================================================

function isOverdue(invoice) {
  if (invoice.status === "paid" || !invoice.dueDate) {
    return false;
  }

  return invoice.dueDate < localDateString();
}

function getDisplayedStatus(invoice) {
  if (invoice.status === "paid") {
    return "paid";
  }

  if (isOverdue(invoice)) {
    return "overdue";
  }

  return invoice.status || "pending";
}

function statusBadge(invoice) {
  const status = getDisplayedStatus(invoice);

  if (status === "paid") {
    return `<span class="status-badge status-paid">Paid</span>`;
  }

  if (status === "overdue") {
    return `<span class="status-badge status-overdue">Overdue</span>`;
  }

  return `<span class="status-badge status-pending">Pending</span>`;
}

function filterInvoicesByStatus(status) {
  const allowedFilters = ["all", "pending", "paid", "overdue"];

  currentFilter = allowedFilters.includes(status) ? status : "all";

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.getAttribute("data-filter") === currentFilter
    );
  });

  const searchValue = (
    getElement("searchInvoice")?.value || ""
  ).trim().toLowerCase();

  let filtered = [...invoices];

  if (currentFilter !== "all") {
    filtered = filtered.filter(
      invoice => getDisplayedStatus(invoice) === currentFilter
    );
  }

  if (searchValue) {
    filtered = filtered.filter(invoice => {
      return (
        String(invoice.client).toLowerCase().includes(searchValue) ||
        String(invoice.service).toLowerCase().includes(searchValue) ||
        String(invoice.id).includes(searchValue)
      );
    });
  }

  renderInvoiceTable(filtered);
}

function searchInvoices() {
  filterInvoicesByStatus(currentFilter);
}

function displayInvoices() {
  filterInvoicesByStatus(currentFilter);
}

// ============================================================
// INTERACTIVE KPI CARD NAVIGATION
// ============================================================

function openInvoiceFilter(status) {
  const allowedFilters = ["all", "paid", "pending", "overdue"];

  const selectedFilter = allowedFilters.includes(status)
    ? status
    : "all";

  // Clear previous searches so the card shows every matching invoice.
  const ledgerSearch = getElement("searchInvoice");
  const globalSearch = getElement("globalSearchInput");

  if (ledgerSearch) {
    ledgerSearch.value = "";
  }

  if (globalSearch) {
    globalSearch.value = "";
  }

  // Open the invoice ledger.
  switchView("my-invoices");

  // Apply the filter selected by the KPI card.
  filterInvoicesByStatus(selectedFilter);
}

// ============================================================
// 11. RENDER INVOICE LEDGER
// ============================================================

function renderInvoiceTable(list) {
  const container = getElement("invoiceList");

  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-symbols-outlined">inbox</span>

        <h3>No Invoices Found</h3>

        <p>Try another filter or create a new invoice.</p>

        <button class="primary-button"
          onclick="switchView('create-invoice')">
          Create Invoice
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>

        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>Client</th>
            <th>Service</th>
            <th class="text-right">Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${list.map(invoice => {
            const manualPaymentButton =
              !invoice.paypalOrderId && invoice.status !== "paid"
                ? `
                  <button class="small-button"
                    onclick="markAsPaid(${invoice.id})">
                    Mark Paid
                  </button>
                `
                : "";

            const paypalButton =
              getDisplayedStatus(invoice) !== "paid"
                ? `
                  <button class="small-button paypal-button"
                    onclick="payWithPayPal(${invoice.id})">
                    <span class="material-symbols-outlined">credit_card</span>
                    PayPal
                  </button>
                `
                : "";

            return `
              <tr>
                <td class="id-cell">
                  #INV-${String(invoice.id).padStart(4, "0")}
                </td>

                <td>${escapeHTML(invoice.client)}</td>

                <td>${escapeHTML(invoice.service)}</td>

                <td class="text-right amount-cell">
                  ${formatCurrency(invoice.amount)}
                </td>

                <td>${formatDate(invoice.dueDate)}</td>

                <td>${statusBadge(invoice)}</td>

                <td>
                  <div class="action-buttons">

                    ${paypalButton}
                    ${manualPaymentButton}

                    <button class="icon-button"
                      title="AI Analysis"
                      onclick="analyzeInvoice(${invoice.id})">
                      <span class="material-symbols-outlined">psychology</span>
                    </button>

                    <button class="icon-button"
                      title="Predict Payment"
                      onclick="predictPayment(${invoice.id})">
                      <span class="material-symbols-outlined">query_stats</span>
                    </button>

                    <button class="icon-button"
                      title="Client History"
                      onclick="viewClientPaymentHistory('${escapeHTML(invoice.client)}')">
                      <span class="material-symbols-outlined">person</span>
                    </button>

                    <button class="icon-button"
                      title="Generate Reminder"
                      onclick="getPersonalizedReminder(${invoice.id})">
                      <span class="material-symbols-outlined">mail</span>
                    </button>

                    <button class="icon-button"
                      title="Follow-up History"
                      onclick="viewInvoiceFollowups(${invoice.id})">
                      <span class="material-symbols-outlined">history</span>
                    </button>

                    <button class="icon-button danger-text"
                      title="Delete Invoice"
                      onclick="deleteInvoice(${invoice.id})">
                      <span class="material-symbols-outlined">delete</span>
                    </button>

                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>

      </table>
    </div>
  `;
}

// ============================================================
// 12. OVERVIEW RECENT INVOICES
// ============================================================

function renderOverviewSnapshot() {
  const container = getElement("overviewRecentInvoicesList");

  if (!container) return;

  const recent = [...invoices]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (!recent.length) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">
          No invoices recorded yet.
        </td>
      </tr>
    `;

    return;
  }

  container.innerHTML = recent.map(invoice => `
    <tr>
      <td class="id-cell">
        #INV-${String(invoice.id).padStart(4, "0")}
      </td>

      <td>${escapeHTML(invoice.client)}</td>

      <td>${escapeHTML(invoice.service)}</td>

      <td class="text-right amount-cell">
        ${formatCurrency(invoice.amount)}
      </td>

      <td>${formatDate(invoice.dueDate)}</td>

      <td>${statusBadge(invoice)}</td>

      <td>
        <button class="text-button"
          onclick="analyzeInvoice(${invoice.id})">
          AI Analyze
        </button>
      </td>
    </tr>
  `).join("");
}

// ============================================================
// 13. UPDATE DASHBOARD KPI CARDS AND REVENUE
// ============================================================

function updateDashboard() {
  const total = invoices.length;

  // Use the same computed status as the invoice badges and filters.
  // This keeps overdue invoices separate from pending invoices.
  const paidInvoices = invoices.filter(
    invoice => getDisplayedStatus(invoice) === "paid"
  );

  const pendingInvoices = invoices.filter(
    invoice => getDisplayedStatus(invoice) === "pending"
  );

  const overdueInvoices = invoices.filter(
    invoice => getDisplayedStatus(invoice) === "overdue"
  );

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  );

  const receivedRevenue = paidInvoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  );

  // Outstanding amount includes both pending and overdue invoices.
  const pendingRevenue = invoices
    .filter(invoice => getDisplayedStatus(invoice) !== "paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const values = {
    totalInvoices: total,
    paidInvoices: paidInvoices.length,
    pendingInvoices: pendingInvoices.length,
    overdueInvoices: overdueInvoices.length,
    totalRevenue: formatAmount(totalRevenue),
    receivedRevenue: formatAmount(receivedRevenue),
    pendingRevenue: formatAmount(pendingRevenue)
  };

  Object.entries(values).forEach(([id, value]) => {
    const element = getElement(id);

    if (element) {
      element.textContent = value;
    }
  });
}

// ============================================================
// 14. MANUALLY MARK AN INVOICE AS PAID
// ============================================================

async function markAsPaid(invoiceId) {
  const invoice = invoices.find(
    item => item.id === Number(invoiceId)
  );

  if (!invoice) {
    showToast("Invoice not found.", "error");
    return;
  }

  if (invoice.status === "paid") {
    showToast("This invoice is already paid.", "info");
    return;
  }

  if (invoice.paypalOrderId) {
    showToast(
      "This invoice has a PayPal order. Verify its payment through PayPal instead.",
      "error"
    );

    return;
  }

  const confirmed = confirm(
    `Confirm that invoice ${invoiceId} was paid outside PayPal?`
  );

  if (!confirmed) return;

  const payload = {
    client: invoice.client,
    service: invoice.service,
    amount: invoice.amount,
    due_date: invoice.dueDate,
    invoice_date: invoice.invoiceDate || null,
    payment_status: "paid",
    paid_date: localDateString()
  };

  try {
    const result = await apiRequest(`/invoices/${invoiceId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    showToast(
      result.message || "Invoice marked as paid.",
      "success"
    );

    await loadInvoicesFromBackend();
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ============================================================
// 15. DELETE ONE INVOICE
// ============================================================

async function deleteInvoice(invoiceId) {
  const confirmed = confirm(
    `Delete invoice #${invoiceId} permanently?`
  );

  if (!confirmed) return;

  try {
    const result = await apiRequest(`/invoices/${invoiceId}`, {
      method: "DELETE"
    });

    showToast(
      result.message || "Invoice deleted.",
      "success"
    );

    await loadInvoicesFromBackend();
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ============================================================
// 16. DELETE ALL INVOICES
// ============================================================

async function deleteAllInvoices() {
  if (!invoices.length) {
    showToast("There are no invoices to delete.", "info");
    return;
  }

  const confirmed = confirm(
    "This will permanently delete every invoice. Continue?"
  );

  if (!confirmed) return;

  try {
    for (const invoice of [...invoices]) {
      await apiRequest(`/invoices/${invoice.id}`, {
        method: "DELETE"
      });
    }

    showToast("All invoices were deleted.", "success");
    await loadInvoicesFromBackend();
  } catch (error) {
    showToast(
      "Some invoices could not be deleted: " + error.message,
      "error"
    );

    await loadInvoicesFromBackend();
  }
}

// ============================================================
// 17. AI PAYMENT ANALYSIS
// ============================================================

async function analyzeInvoice(invoiceId) {
  try {
    const result = await apiRequest(
      `/invoices/${invoiceId}/analyze`
    );

    const analysis = result.analysis || result;

    const riskLevel = analysis.risk_level || "Not available";

    const riskScore =
      analysis.combined_risk_score ??
      analysis.risk_score ??
      "N/A";

    const reasons = Array.isArray(analysis.risk_reasons)
      ? analysis.risk_reasons
      : [];

    const reasonsHTML = reasons.length
      ? reasons.map(reason => `
          <li>${escapeHTML(reason)}</li>
        `).join("")
      : "<li>No risk reasons were returned.</li>";

    const container = getElement("aiInsights");

    if (!container) {
      showToast("AI Insights dashboard was not found.", "error");
      return;
    }

    container.innerHTML = `
      <div class="panel">

        <div class="section-heading">
          <div>
            <h2 class="section-title">
              Invoice #${invoiceId} Analysis
            </h2>

            <p class="section-subtitle">
              AI payment-risk evaluation
            </p>
          </div>

          <button class="secondary-button"
            onclick="switchView('my-invoices')">
            Back to Invoices
          </button>
        </div>

        <div class="stats-grid mt-5">
          <div class="stat-card">
            <div class="stat-label">Risk Level</div>
            <div class="stat-value">
              ${escapeHTML(riskLevel)}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Risk Score</div>
            <div class="stat-value">
              ${escapeHTML(riskScore)}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Overdue</div>
            <div class="stat-value">
              ${analysis.is_overdue ? "Yes" : "No"}
            </div>
          </div>
        </div>

        <div class="content-card mt-5">
          <h3 class="section-title">
            Engine Recommendation
          </h3>

          <p class="mt-3">
            ${escapeHTML(
              analysis.recommendation || "No recommendation available."
            )}
          </p>
        </div>

        <div class="content-card mt-4">
          <h3 class="section-title">
            Risk Reasons
          </h3>

          <ul class="risk-list mt-3">
            ${reasonsHTML}
          </ul>
        </div>

        <div class="flex flex-wrap gap-2 mt-5">
          <button class="primary-button"
            onclick="getPersonalizedReminder(${invoiceId})">
            <span class="material-symbols-outlined">mail</span>
            Generate Reminder
          </button>

          <button class="secondary-button"
            onclick="predictPayment(${invoiceId})">
            Predict Payment
          </button>
        </div>
      </div>
    `;

    switchView("ai-payment-insights");
  } catch (error) {
    console.error("AI analysis error:", error);

    showToast(
      "Payment analysis failed: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 18. AI PAYMENT PREDICTION - MACHINE LEARNING
// ============================================================


// ============================================================
// 18. AI PAYMENT PREDICTION - MACHINE LEARNING
// ============================================================

async function predictPayment(invoiceId) {
  const invoice = invoices.find(
    item => item.id === Number(invoiceId)
  );

  if (!invoice) {
    showToast("Invoice not found.", "error");
    return;
  }

  const container = getElement("aiInsights");

  if (!container) {
    showToast("AI Insights dashboard was not found.", "error");
    return;
  }

  // DEBUG: Inspect the selected invoice and its date.
  console.log("Selected invoice:", invoice);
  console.log("Invoice due date:", invoice.dueDate);

  const dueDate = String(invoice.dueDate || "").trim();

  // Validate the actual invoice due date.
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    showToast(
      "This invoice has a missing or invalid due date. Please check its invoice record.",
      "error"
    );

    console.error("Invalid invoice due date:", dueDate);
    return;
  }

  try {
    container.innerHTML = `
      <div class="panel">
        <h2 class="section-title">
          PulsePay AI Prediction
        </h2>

        <p class="section-subtitle mt-2">
          Running Logistic Regression prediction...
        </p>
      </div>
    `;

    const payload = {
      due_date: dueDate,
      payment_status: invoice.status,
      amount: invoice.amount,

      // Temporary demonstration values.
      // Not verified client-history statistics.
      client_paid_rate: 0.5,
      client_invoice_count: 0,
      average_delay_days: 0
    };

    console.log("ML prediction request:", payload);

    const result = await apiRequest("/predict-payment-ml", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const prediction = result.prediction || {};

    const likelihood = Number(
      prediction.payment_likelihood
    );

    const riskScore = Number(
      prediction.risk_score
    );

    const safeLikelihood = Number.isFinite(likelihood)
      ? Math.max(0, Math.min(100, likelihood))
      : 0;

    const likelihoodText = Number.isFinite(likelihood)
      ? `${likelihood.toFixed(2)}%`
      : "Unavailable";

    const riskScoreText = Number.isFinite(riskScore)
      ? riskScore.toFixed(2)
      : "Unavailable";

    container.innerHTML = `
      <div class="panel">

        <div class="section-heading">
          <div>
            <h2 class="section-title">
              PulsePay AI Prediction
            </h2>

            <p class="section-subtitle mt-2">
              Invoice #${invoice.id} ·
              ${escapeHTML(invoice.client)}
            </p>
          </div>

          <button class="secondary-button"
            onclick="switchView('my-invoices')">
            Back to Invoices
          </button>
        </div>

        <div class="stats-grid mt-5">
          <div class="stat-card">
            <div class="stat-label">
              Payment Likelihood
            </div>

            <div class="stat-value success-text">
              ${escapeHTML(likelihoodText)}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">
              Risk Category
            </div>

            <div class="stat-value">
              ${escapeHTML(
                prediction.risk_category || "Unavailable"
              )}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">
              Risk Score
            </div>

            <div class="stat-value">
              ${escapeHTML(riskScoreText)}
            </div>
          </div>
        </div>

        <div class="content-card mt-5">
          <h3 class="section-title">
            Payment Probability
          </h3>

          <div class="w-full bg-surface-container-high rounded-full h-3 mt-4 overflow-hidden">
            <div
              class="bg-green-600 h-3 rounded-full"
              style="width: ${safeLikelihood}%">
            </div>
          </div>

          <p class="mt-3 text-body-sm">
            ${escapeHTML(
              prediction.prediction || "No prediction available"
            )}
          </p>
        </div>

        <div class="content-card mt-4">
          <h3 class="section-title">
            Machine Learning Model
          </h3>

          <p class="mt-3">
            ${escapeHTML(
              prediction.model_type || "Not available"
            )}
          </p>

          <p class="text-body-sm mt-2">
            Training data:
            ${escapeHTML(
              prediction.training_data || "Not specified"
            )}
          </p>
        </div>

        <div class="content-card mt-4">
          <h3 class="section-title">
            Prediction Disclaimer
          </h3>

          <p class="mt-3 text-body-sm">
            ${escapeHTML(
              prediction.confidence_note ||
              "Prototype prediction only."
            )}
          </p>

          <p class="mt-3 text-body-sm">
            Client-history inputs currently use demonstration
            values, not verified client statistics.
          </p>
        </div>
      </div>
    `;

    switchView("ai-payment-insights");

    showToast(
      "ML payment prediction completed successfully!",
      "success"
    );

  } catch (error) {
    console.error("ML prediction error:", error);

    container.innerHTML = `
      <div class="content-card">
        <h3 class="section-title">
          Prediction Failed
        </h3>

        <p class="mt-3">
          ${escapeHTML(error.message)}
        </p>

        <button class="secondary-button mt-4"
          onclick="predictPayment(${invoice.id})">
          Retry Prediction
        </button>
      </div>
    `;

    switchView("ai-payment-insights");

    showToast(
      "ML prediction failed: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 19. CLIENT PAYMENT HISTORY
// ============================================================

async function viewClientPaymentHistory(clientName) {
  try {
    const result = await apiRequest(
      `/clients/${encodeURIComponent(clientName)}/payment-history`
    );

    const container = getElement("paymentHistory");

    if (!container) {
      showToast("Client History section was not found.", "error");
      return;
    }

    container.innerHTML = `
      <div class="panel">

        <div class="section-heading">
          <div>
            <h2 class="section-title">
              ${escapeHTML(result.client || clientName)}
            </h2>

            <p class="section-subtitle">
              Client settlement profile
            </p>
          </div>

          <button class="secondary-button"
            onclick="switchView('my-invoices')">
            Back to Invoices
          </button>
        </div>

        <div class="stats-grid mt-5">
          <div class="stat-card">
            <div class="stat-label">Total Invoices</div>
            <div class="stat-value">
              ${Number(result.total_invoices) || 0}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Paid Invoices</div>
            <div class="stat-value success-text">
              ${Number(result.paid_invoices) || 0}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Pending Invoices</div>
            <div class="stat-value">
              ${Number(result.pending_invoices) || 0}
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Total Received</div>
            <div class="stat-value money-value">
              ${formatCurrency(result.total_amount_paid)}
            </div>
          </div>
        </div>

        <div class="content-card mt-5">
          <div class="stat-label">
            Payment Reliability
          </div>

          <div class="stat-value success-text">
            ${Number(result.payment_reliability) || 0}%
          </div>
        </div>
      </div>
    `;

    switchView("client-history");
  } catch (error) {
    showToast(
      "Unable to load client payment history: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 20. GENERATE PERSONALIZED PAYMENT REMINDER
// ============================================================

async function getPersonalizedReminder(invoiceId) {
  try {
    const result = await apiRequest(
      `/invoices/${invoiceId}/personalized-reminder`
    );

    let reminder =
      result.personalized_reminder ??
      result.reminder ??
      result;

    if (typeof reminder === "object") {
      reminder = JSON.stringify(reminder, null, 2);
    }

    reminder = String(reminder);

    latestReminders[invoiceId] = reminder;

    const container = getElement("paymentFollowups");

    if (!container) {
      showToast("Payment Follow-ups section was not found.", "error");
      return;
    }

    container.innerHTML = `
      <div class="panel">

        <div class="section-heading">
          <div>
            <h2 class="section-title">
              Personalized Payment Reminder
            </h2>

            <p class="section-subtitle">
              Invoice #${invoiceId}
            </p>
          </div>

          <button class="secondary-button"
            onclick="switchView('my-invoices')">
            Back to Invoices
          </button>
        </div>

        <div class="content-card mt-5">
          <pre id="reminderContent" class="result-pre"></pre>
        </div>

        <div class="flex flex-wrap gap-2 mt-4">
          <button class="primary-button"
            onclick="copyReminder(${invoiceId})">
            <span class="material-symbols-outlined">content_copy</span>
            Copy Reminder
          </button>

          <button class="secondary-button"
            onclick="savePaymentFollowup(${invoiceId})">
            <span class="material-symbols-outlined">save</span>
            Save Follow-up
          </button>

          <button class="secondary-button"
            onclick="viewInvoiceFollowups(${invoiceId})">
            View Follow-up History
          </button>
        </div>
      </div>
    `;

    getElement("reminderContent").textContent = reminder;

    switchView("payment-follow-ups");
  } catch (error) {
    showToast(
      "Reminder generation failed: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 21. COPY GENERATED REMINDER
// ============================================================

async function copyReminder(invoiceId) {
  const reminder = latestReminders[invoiceId];

  if (!reminder) {
    showToast("No generated reminder is available.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(reminder);

    showToast("Reminder copied successfully.", "success");
  } catch (error) {
    showToast(
      "Clipboard access failed. Select and copy the reminder manually.",
      "error"
    );
  }
}

// ============================================================
// 22. SAVE PAYMENT FOLLOW-UP
// ============================================================

async function savePaymentFollowup(invoiceId) {
  const reminder = latestReminders[invoiceId];

  if (!reminder) {
    showToast(
      "Generate a reminder before saving a follow-up.",
      "error"
    );
    return;
  }

  try {
    const result = await apiRequest(
      `/invoices/${invoiceId}/followups`,
      {
        method: "POST",
        body: JSON.stringify({
          followup_status: "pending",
          reminder_message: reminder,
          notes: "Reminder generated from PulsePay AI frontend"
        })
      }
    );

    showToast(
      result.message || "Follow-up saved successfully.",
      "success"
    );

    await viewInvoiceFollowups(invoiceId);
  } catch (error) {
    showToast(
      "Unable to save follow-up: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 23. VIEW FOLLOW-UP HISTORY
// ============================================================

async function viewInvoiceFollowups(invoiceId) {
  try {
    const result = await apiRequest(
      `/invoices/${invoiceId}/followups`
    );

    const container = getElement("paymentFollowups");

    if (!container) {
      showToast("Payment Follow-ups section was not found.", "error");
      return;
    }

    const rows = result.followups || [];

    const tableRows = rows.length
      ? rows.map(item => `
          <tr>
            <td>${Number(item.followup_id)}</td>
            <td>${escapeHTML(item.followup_date || "")}</td>
            <td>${escapeHTML(item.followup_status || "")}</td>
            <td>
              ${escapeHTML(item.reminder_message || "No message")}
            </td>
          </tr>
        `).join("")
      : `
          <tr>
            <td colspan="4" class="empty-cell">
              No follow-up records found.
            </td>
          </tr>
        `;

    container.innerHTML = `
      <div class="panel">

        <div class="section-heading">
          <div>
            <h2 class="section-title">
              Follow-up History
            </h2>

            <p class="section-subtitle">
              Invoice #${invoiceId} ·
              ${Number(result.total_followups) || 0} records
            </p>
          </div>

          <button class="secondary-button"
            onclick="switchView('my-invoices')">
            Back to Invoices
          </button>
        </div>

        <div class="table-wrap mt-5">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Status</th>
                <th>Reminder</th>
              </tr>
            </thead>

            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <button class="primary-button mt-4"
          onclick="getPersonalizedReminder(${invoiceId})">
          Generate New Reminder
        </button>
      </div>
    `;

    switchView("payment-follow-ups");
  } catch (error) {
    showToast(
      "Unable to retrieve follow-up history: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 24. TEST PAYPAL SANDBOX CONNECTION
// ============================================================

async function testPayPalConnection() {
  const resultBox = getElement("paypalConnectionResult");

  if (resultBox) {
    resultBox.textContent = "Connecting to PayPal Sandbox...";
  }

  try {
    const result = await apiRequest(
      "/paypal/test-connection",
      {
        method: "POST"
      }
    );

    if (resultBox) {
      resultBox.textContent = result.message;
      resultBox.classList.add("success-result");
    }

    showToast(
      "PayPal Sandbox connection successful!",
      "success"
    );
  } catch (error) {
    if (resultBox) {
      resultBox.textContent = error.message;
      resultBox.classList.remove("success-result");
    }

    showToast(
      "PayPal connection failed: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 25. CREATE PAYPAL ORDER / REOPEN EXISTING CHECKOUT
// ============================================================

async function payWithPayPal(invoiceId) {
  const invoice = invoices.find(
    item => item.id === Number(invoiceId)
  );

  if (!invoice) {
    showToast("Invoice not found.", "error");
    return;
  }

  if (getDisplayedStatus(invoice) === "paid") {
    showToast("This invoice is already paid.", "info");
    return;
  }

  // Do not create a second PayPal order for the same invoice.
  if (invoice.paypalOrderId) {
    try {
      const existingStatus = await apiRequest(
        `/paypal/order-status/${encodeURIComponent(invoice.paypalOrderId)}`
      );

      if (existingStatus.payment_verified) {
        showToast(
          "This PayPal payment is already verified.",
          "success"
        );

        await loadInvoicesFromBackend();
        return;
      }

      if (
        existingStatus.paypal_order_status === "PAYER_ACTION_REQUIRED" &&
        existingStatus.approval_url
      ) {
        showToast(
          "Reopening your existing PayPal checkout...",
          "success"
        );

        window.location.href = existingStatus.approval_url;
        return;
      }

      showToast(
        `This invoice already has PayPal order ${invoice.paypalOrderId}. Its status is ${existingStatus.paypal_order_status}.`,
        "info"
      );
    } catch (error) {
      showToast(
        "An existing PayPal order is linked to this invoice. " +
        error.message,
        "error"
      );
    }

    return;
  }

  try {
    showToast("Creating PayPal Sandbox order...", "info");

    // The backend calculates USD from the saved INR invoice.
    // Do not send amount_usd or a JSON request body.
    const result = await apiRequest(
      `/paypal/create-order/${invoiceId}`,
      {
        method: "POST"
      }
    );

    if (!result.approval_url || !result.paypal_order_id) {
      throw new Error(
        "PayPal did not return an order ID or approval link."
      );
    }

    sessionStorage.setItem(
      "pendingPayPalOrderId",
      result.paypal_order_id
    );

    sessionStorage.setItem(
      "pendingPayPalInvoiceId",
      String(invoiceId)
    );

    showToast(
      `PayPal order created for $${result.amount_usd}. Redirecting to checkout...`,
      "success"
    );

    window.location.href = result.approval_url;
  } catch (error) {
    console.error("PayPal order creation error:", error);

    showToast(
      "PayPal order creation failed: " + error.message,
      "error"
    );
  }
}

// ============================================================
// 26. CAPTURE PAYPAL ORDER AFTER BUYER APPROVAL
// ============================================================

async function capturePayPalOrder(orderId) {
  if (!orderId) {
    showToast("PayPal order ID is missing.", "error");
    return;
  }

  const cleanOrderId = String(orderId).trim();

  try {
    showToast(
      "Verifying and capturing PayPal payment...",
      "info"
    );

    const result = await apiRequest(
      `/paypal/capture-order/${encodeURIComponent(cleanOrderId)}`,
      {
        method: "POST"
      }
    );

    if (result.payment_status !== "paid") {
      throw new Error(
        "Payment was not confirmed as paid."
      );
    }

    sessionStorage.removeItem("pendingPayPalOrderId");
    sessionStorage.removeItem("pendingPayPalInvoiceId");

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.hash
    );

    showToast(
      `Payment confirmed for invoice #${result.invoice_id}.`,
      "success"
    );

    await loadInvoicesFromBackend();

    switchView("my-invoices");
  } catch (error) {
    console.error("PayPal capture error:", error);

    showToast(
      "Payment verification/capture needs attention: " +
      error.message,
      "error"
    );

    const input = getElement("manualOrderIdInput");

    if (input) {
      input.value = cleanOrderId;
    }

    switchView("paypal-payments");
  }
}

// ============================================================
// 27. CHECK PAYPAL ORDER STATUS
// ============================================================

async function checkPayPalOrderStatus(orderId) {
  if (!orderId || !String(orderId).trim()) {
    showToast("Enter a PayPal order ID.", "error");
    return;
  }

  const cleanOrderId = String(orderId).trim();

  try {
    const result = await apiRequest(
      `/paypal/order-status/${encodeURIComponent(cleanOrderId)}`
    );

    const container = getElement("paypalOrderStatusResult");

    if (container) {
      container.textContent = JSON.stringify(result, null, 2);

      container.classList.toggle(
        "success-result",
        Boolean(result.payment_verified)
      );
    }

    if (result.payment_verified) {
      showToast(
        "PayPal payment is verified and completed.",
        "success"
      );

      await loadInvoicesFromBackend();
    } else {
      showToast(
        `PayPal order status: ${result.paypal_order_status}`,
        "info"
      );
    }
  } catch (error) {
    const container = getElement("paypalOrderStatusResult");

    if (container) {
      container.textContent = error.message;
    }

    showToast(
      "Unable to check PayPal order: " + error.message,
      "error"
    );
  }
}

function checkPayPalOrderFromInput() {
  const orderId = getElement("manualOrderIdInput")?.value.trim();

  if (!orderId) {
    showToast("Enter a PayPal order ID first.", "error");
    return;
  }

  checkPayPalOrderStatus(orderId);
}

// ============================================================
// 28. SET DEFAULT INVOICE DATES
// ============================================================

function setDefaultDates() {
  const invoiceDate = getElement("invoiceDate");
  const dueDate = getElement("dueDate");

  if (!invoiceDate || !dueDate) return;

  const today = new Date();
  const due = new Date();

  due.setDate(due.getDate() + 14);

  invoiceDate.value = localDateString(today);
  dueDate.value = localDateString(due);
}

// ============================================================
// 29. INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  setDefaultDates();

  // Create invoice form.
  const invoiceForm = getElement("createInvoiceForm");

  if (invoiceForm) {
    invoiceForm.addEventListener("submit", event => {
      event.preventDefault();
      createInvoice();
    });
  }

  // Global search shortcut.
  window.addEventListener("keydown", event => {
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();

      const search = getElement("globalSearchInput");

      if (search) {
        search.focus();
      }
    }
  });

  // Global search.
  const globalSearch = getElement("globalSearchInput");

  if (globalSearch) {
    globalSearch.addEventListener("input", event => {
      const ledgerSearch = getElement("searchInvoice");

      if (ledgerSearch) {
        ledgerSearch.value = event.target.value;
      }

      switchView("my-invoices");
      searchInvoices();
    });
  }

  // Sidebar toggle.
  const toggleButton = getElement("toggleSidebarBtn");

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      const sidebar = getElement("appSidebar");
      const main = getElement("mainContainer");

      if (!sidebar || !main) return;

      sidebar.classList.toggle("sidebar-collapsed");
      main.classList.toggle("main-expanded");
    });
  }

  // Open the selected initial view.
  const initialHash = window.location.hash.replace("#", "");

  switchView(
    VIEW_IDS.includes(initialHash)
      ? initialHash
      : "overview"
  );

  // Load real invoices.
  await loadInvoicesFromBackend();

  // Detect PayPal return parameters.
  const params = new URLSearchParams(window.location.search);

  const paypalToken = params.get("token");
  const payerId = params.get("PayerID");
  const paypalCancelled = params.get("paypal") === "cancel";

  if (paypalCancelled) {
    sessionStorage.removeItem("pendingPayPalOrderId");
    sessionStorage.removeItem("pendingPayPalInvoiceId");

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.hash
    );

    showToast(
      "PayPal checkout was cancelled.",
      "info"
    );
  } else if (paypalToken) {
    console.log("PayPal buyer approval return detected.");
    console.log("PayPal order:", paypalToken);
    console.log("Payer ID:", payerId || "Not provided");

    // Capture the order returned by PayPal.
    await capturePayPalOrder(paypalToken);
  } else {
    // Recover the stored pending order after a page refresh.
    const storedOrderId = sessionStorage.getItem(
      "pendingPayPalOrderId"
    );

    if (storedOrderId) {
      const input = getElement("manualOrderIdInput");

      if (input) {
        input.value = storedOrderId;
      }

      console.log(
        "A pending PayPal order was found:",
        storedOrderId
      );
    }
  }
});