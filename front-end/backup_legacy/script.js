
// ==========================================
// AI FREELANCER PAYMENT ASSISTANT
// COMPLETE FRONTEND JAVASCRIPT
// ==========================================

// 1. Backend URL
const API_BASE_URL = "http://127.0.0.1:8000";

// 2. Invoice storage
let invoices = [];

// 3. Common API request function
async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        options
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {

        let errorMessage = "Backend request failed";

        if (Array.isArray(data.detail)) {

            errorMessage = data.detail.map(error => {
                return `${error.loc.join(" → ")}: ${error.msg}`;
            }).join("\n");

        } else if (typeof data.detail === "string") {

            errorMessage = data.detail;

        } else if (data.detail) {

            errorMessage = JSON.stringify(data.detail);
        }

        throw new Error(errorMessage);
    }

    return data;
}

// 4. Safely get HTML elements
function getElement(id) {
    return document.getElementById(id);
}

// 5. Format currency
function formatCurrency(amount) {

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

// 6. Format dashboard amounts
function formatAmount(amount) {

    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2
    }).format(Number(amount) || 0);
}

// 7. Convert invoice data
function convertInvoice(row) {

    if (Array.isArray(row)) {

        return {
            id: Number(row[0]),
            client: row[1] || "",
            service: row[2] || "",
            amount: Number(row[3]) || 0,
            dueDate: row[4] || "",
            status: String(row[5] || "pending").toLowerCase(),
            invoiceDate: row[6] || "",
            paidDate: row[7] || ""
        };
    }

    return {
        id: Number(row.id),
        client: row.client || "",
        service: row.service || "",
        amount: Number(row.amount) || 0,
        dueDate: row.due_date || row.dueDate || "",
        status: String(
            row.payment_status || row.status || "pending"
        ).toLowerCase(),
        invoiceDate: row.invoice_date || row.invoiceDate || "",
        paidDate: row.paid_date || row.paidDate || ""
    };
}

// 8. Escape HTML
function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char];
    });
}

// 9. Display AI results inside the dashboard
function displayAIInsights(title, content) {

    const container = getElement("aiInsights");

    if (!container) {

        console.error("AI Insights section not found.");

        return;
    }

    container.innerHTML = `

        <div class="card ai-insight-card">

            <h3>${escapeHTML(title)}</h3>

            ${content}

        </div>

    `;

    container.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// 10. Load invoices from backend
async function loadInvoicesFromBackend() {

    try {

        const data = await apiRequest("/invoices");

        const rows = Array.isArray(data)
            ? data
            : data.invoices || [];

        invoices = rows.map(convertInvoice);

        displayInvoices();

        console.log("Invoices loaded:", invoices);

    } catch (error) {

        console.error("Loading error:", error);

        const container = getElement("invoiceList");

        if (container) {

            container.textContent =
                "Unable to load invoices: " + error.message;
        }
    }
}

// 11. Create invoice
async function createInvoice() {

    const clientElement = getElement("clientName");
    const serviceElement = getElement("service");
    const amountElement = getElement("amount");
    const invoiceDateElement = getElement("invoiceDate");
    const dueDateElement = getElement("dueDate");

    if (
        !clientElement ||
        !serviceElement ||
        !amountElement ||
        !invoiceDateElement ||
        !dueDateElement
    ) {

        alert("Invoice form elements are missing.");

        return;
    }

    const client = clientElement.value.trim();
    const service = serviceElement.value.trim();
    const amount = Number(amountElement.value);
    const invoiceDate = invoiceDateElement.value;
    const dueDate = dueDateElement.value;

    if (
        !client ||
        !service ||
        !amountElement.value.trim() ||
        !invoiceDate ||
        !dueDate
    ) {

        alert("Please fill in all invoice details.");

        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {

        alert("Enter a valid invoice amount.");

        return;
    }

    if (dueDate < invoiceDate) {

        alert("Due date cannot be before invoice date.");

        return;
    }

    const invoiceData = {

        client: client,

        service: service,

        amount: amount,

        invoice_date: invoiceDate,

        due_date: dueDate,

        payment_status: "pending"
    };

    try {

        const result = await apiRequest("/invoices", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(invoiceData)
        });

        alert(result.message || "Invoice created successfully!");

        clientElement.value = "";
        serviceElement.value = "";
        amountElement.value = "";
        invoiceDateElement.value = "";
        dueDateElement.value = "";

        await loadInvoicesFromBackend();

    } catch (error) {

        console.error("Invoice creation error:", error);

        alert("Invoice creation failed: " + error.message);
    }
}

// 12. Format date
function formatDate(value) {

    if (!value) return "Not provided";

    const parts = String(value).split("-");

    if (parts.length !== 3) {

        return escapeHTML(value);
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// 13. Display invoices
function displayInvoices(list = invoices) {

    const container = getElement("invoiceList");

    if (!container) {

        console.error("invoiceList element not found.");

        return;
    }

    container.innerHTML = "";

    if (!list.length) {

        container.textContent = "No invoices found.";

        updateDashboard();

        return;
    }

    list.forEach(invoice => {

        const card = document.createElement("div");

        card.className = "card";

        const isPaid = invoice.status === "paid";

        card.innerHTML = `

            <label>

                <input
                    type="checkbox"
                    class="selectedInvoice"
                    value="${invoice.id}"
                >

                Select Invoice

            </label>

            <h3>Invoice #${invoice.id}</h3>

            <p>Client: ${escapeHTML(invoice.client)}</p>

            <p>Service: ${escapeHTML(invoice.service)}</p>

            <p>Amount: ${formatCurrency(invoice.amount)}</p>

            <p>Invoice Date: ${formatDate(invoice.invoiceDate)}</p>

            <p>Due Date: ${formatDate(invoice.dueDate)}</p>

            <p>Paid Date: ${formatDate(invoice.paidDate)}</p>

            <p>Status: ${escapeHTML(invoice.status)}</p>

            <button
                onclick="markAsPaid(${invoice.id})"
                ${isPaid ? "disabled" : ""}
            >
                ${isPaid ? "Already Paid" : "Mark as Paid"}
            </button>

            <button onclick="deleteInvoice(${invoice.id})">
                Delete Invoice
            </button>

            <button onclick="analyzeInvoice(${invoice.id})">
                Analyze Payment
            </button>

            <button onclick="predictPayment(${invoice.id})">
                Predict Payment
            </button>

            <button class="view-history-btn">
                View Payment History
            </button>

        `;

        // Safely pass client name to payment history function
        const historyButton = card.querySelector(".view-history-btn");

        historyButton.addEventListener("click", () => {

            viewClientPaymentHistory(invoice.client);

        });

        container.appendChild(card);
    });

    updateDashboard();
}

// 14. Update dashboard
function updateDashboard() {

    const total = invoices.length;

    const paid = invoices.filter(
        invoice => invoice.status === "paid"
    );

    const pending = invoices.filter(
        invoice => invoice.status !== "paid"
    );

    const totalRevenue = invoices.reduce(
        (sum, invoice) => sum + invoice.amount,
        0
    );

    const receivedRevenue = paid.reduce(
        (sum, invoice) => sum + invoice.amount,
        0
    );

    const pendingRevenue = pending.reduce(
        (sum, invoice) => sum + invoice.amount,
        0
    );

    const values = {

        totalInvoices: total,

        paidInvoices: paid.length,

        pendingInvoices: pending.length,

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

// 15. Mark invoice as paid manually
async function markAsPaid(invoiceId) {

    const invoice = invoices.find(
        item => item.id === Number(invoiceId)
    );

    if (!invoice) {

        alert("Invoice not found.");

        return;
    }

    if (invoice.status === "paid") {

        alert("This invoice is already paid.");

        return;
    }

    if (!confirm("Confirm that this invoice has been paid?")) {

        return;
    }

    const today = new Date();

    const paidDate = [

        today.getFullYear(),

        String(today.getMonth() + 1).padStart(2, "0"),

        String(today.getDate()).padStart(2, "0")

    ].join("-");

    const updatedData = {

        client: invoice.client,

        service: invoice.service,

        amount: invoice.amount,

        due_date: invoice.dueDate,

        invoice_date: invoice.invoiceDate || null,

        payment_status: "paid",

        paid_date: paidDate
    };

    try {

        const result = await apiRequest(
            `/invoices/${invoiceId}`,
            {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(updatedData)
            }
        );

        alert(result.message || "Payment status updated!");

        await loadInvoicesFromBackend();

    } catch (error) {

        console.error("Payment update error:", error);

        alert("Update failed: " + error.message);
    }
}

// 16. Delete invoice
async function deleteInvoice(invoiceId) {

    const confirmed = confirm(
        "Are you sure you want to delete this invoice?"
    );

    if (!confirmed) return;

    try {

        const result = await apiRequest(
            `/invoices/${invoiceId}`,
            {
                method: "DELETE"
            }
        );

        alert(result.message || "Invoice deleted.");

        await loadInvoicesFromBackend();

    } catch (error) {

        console.error(error);

        alert("Delete failed: " + error.message);
    }
}

// 17. Search invoices
function searchInvoices() {

    const searchElement = getElement("searchInvoice");

    if (!searchElement) return;

    const searchValue = searchElement.value
        .toLowerCase()
        .trim();

    const filtered = invoices.filter(invoice =>

        invoice.client.toLowerCase().includes(searchValue) ||

        invoice.service.toLowerCase().includes(searchValue) ||

        String(invoice.id).includes(searchValue)
    );

    displayInvoices(filtered);
}

// 18. Delete all invoices
async function deleteAllInvoices() {

    if (!invoices.length) {

        alert("No invoices available.");

        return;
    }

    if (!confirm("Delete all invoices permanently?")) {

        return;
    }

    try {

        for (const invoice of [...invoices]) {

            await apiRequest(
                `/invoices/${invoice.id}`,
                {
                    method: "DELETE"
                }
            );
        }

        alert("All invoices deleted.");

        await loadInvoicesFromBackend();

    } catch (error) {

        console.error(error);

        alert("Delete operation failed: " + error.message);

        await loadInvoicesFromBackend();
    }
}

// 19. Delete selected invoices
async function deleteSelectedInvoices() {

    const selected = document.querySelectorAll(
        ".selectedInvoice:checked"
    );

    if (!selected.length) {

        alert("Please select invoices first.");

        return;
    }

    if (!confirm("Delete selected invoices?")) {

        return;
    }

    try {

        for (const checkbox of selected) {

            await apiRequest(
                `/invoices/${Number(checkbox.value)}`,
                {
                    method: "DELETE"
                }
            );
        }

        alert("Selected invoices deleted.");

        await loadInvoicesFromBackend();

    } catch (error) {

        console.error(error);

        alert("Delete failed: " + error.message);

        await loadInvoicesFromBackend();
    }
}

// 20. Analyze saved invoice
async function analyzeInvoice(invoiceId) {

    try {

        const result = await apiRequest(
            `/invoices/${invoiceId}/analyze`
        );

        const analysis = result.analysis || result;

        const riskReasons = Array.isArray(analysis.risk_reasons)
            ? analysis.risk_reasons
            : [];

        const reasonsHTML = riskReasons.length

            ? riskReasons.map(reason => {

                return `<li>${escapeHTML(reason)}</li>`;

            }).join("")

            : "<li>No additional risk reasons provided.</li>";

        const content = `

            <p>
                <strong>Invoice ID:</strong>
                #${Number(invoiceId)}
            </p>

            <p>
                <strong>Risk Level:</strong>
                ${escapeHTML(analysis.risk_level ?? "Not available")}
            </p>

            <p>
                <strong>Combined Risk Score:</strong>
                ${escapeHTML(analysis.combined_risk_score ?? "Not available")}
            </p>

            <p>
                <strong>Risk Category:</strong>
                ${escapeHTML(analysis.combined_risk_category ?? "Not available")}
            </p>

            <p>
                <strong>Overdue:</strong>
                ${escapeHTML(analysis.is_overdue ?? "Not available")}
            </p>

            <p>
                <strong>Days Overdue:</strong>
                ${escapeHTML(analysis.days_overdue ?? "Not available")}
            </p>

            <p>
                <strong>Amount Priority:</strong>
                ${escapeHTML(analysis.amount_priority ?? "Not available")}
            </p>

            <h4>Smart Recommendation</h4>

            <p>
                ${escapeHTML(
                    analysis.recommendation ??
                    "No recommendation available."
                )}
            </p>

            <h4>Risk Reasons</h4>

            <ul>
                ${reasonsHTML}
            </ul>

        `;

        displayAIInsights(
            "AI Payment Risk Analysis",
            content
        );

    } catch (error) {

        console.error("Analysis error:", error);

        alert("Payment analysis failed: " + error.message);
    }
}

// 21. AI Payment Prediction
async function predictPayment(invoiceId) {

    const invoice = invoices.find(
        item => item.id === Number(invoiceId)
    );

    if (!invoice) {

        alert("Invoice not found.");

        return;
    }

    try {

        const result = await apiRequest(
            "/predict-payment",
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    due_date: invoice.dueDate,

                    payment_status: invoice.status,

                    amount: invoice.amount

                })
            }
        );

        const prediction = result.prediction || result;

        const content = `

            <p>
                <strong>Invoice ID:</strong>
                #${invoice.id}
            </p>

            <p>
                <strong>Prediction:</strong>
                ${escapeHTML(
                    prediction.prediction ?? "Not available"
                )}
            </p>

            <p>
                <strong>Payment Likelihood:</strong>
                ${escapeHTML(
                    prediction.payment_likelihood ?? "Not available"
                )}
            </p>

            <p>
                <strong>Risk Score:</strong>
                ${escapeHTML(
                    prediction.risk_score ?? "Not applicable"
                )}
            </p>

            <p>
                <strong>Confidence:</strong>
                ${escapeHTML(
                    prediction.confidence ?? "Not available"
                )}
            </p>

            <p>
                <em>
                    This is a rule-based payment estimate.
                </em>
            </p>

        `;

        displayAIInsights(
            "AI Payment Prediction",
            content
        );

    } catch (error) {

        console.error("Prediction error:", error);

        alert("Payment prediction failed: " + error.message);
    }
}

// 22. Client Payment History
async function viewClientPaymentHistory(clientName) {

    try {

        const result = await apiRequest(
            `/clients/${encodeURIComponent(clientName)}/payment-history`
        );

        const container = getElement("paymentHistory");

        if (!container) {

            throw new Error("Payment history section not found.");
        }

        container.innerHTML = `

            <div class="card">

                <h2>Client Payment History</h2>

                <h3>
                    Client: ${escapeHTML(result.client)}
                </h3>

                <p>
                    Total Invoices:
                    ${Number(result.total_invoices) || 0}
                </p>

                <p>
                    Paid Invoices:
                    ${Number(result.paid_invoices) || 0}
                </p>

                <p>
                    Unpaid Invoices:
                    ${Number(result.unpaid_invoices) || 0}
                </p>

                <p>
                    Pending Invoices:
                    ${Number(result.pending_invoices) || 0}
                </p>

                <p>
                    Total Amount Received:
                    ${formatCurrency(result.total_amount_paid)}
                </p>

                <p>
                    Payment Reliability:
                    ${Number(result.payment_reliability) || 0}%
                </p>

                <button id="closePaymentHistory">
                    Close History
                </button>

            </div>

        `;

        getElement("closePaymentHistory").addEventListener(
            "click",
            () => {

                container.innerHTML = `
                    <p>
                        Select View Payment History from an invoice
                        to see client details.
                    </p>
                `;
            }
        );

        container.scrollIntoView({

            behavior: "smooth",

            block: "start"
        });

    } catch (error) {

        console.error("Payment history error:", error);

        alert(
            "Unable to load payment history: " +
            error.message
        );
    }
}

// 23. Start application
document.addEventListener("DOMContentLoaded", () => {

    loadInvoicesFromBackend();

});
