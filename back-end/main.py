
import os
import sqlite3
from pathlib import Path
from datetime import date
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from payment_engine import (
    analyze_invoice,
    combined_risk_score,
    generate_payment_reminder,
    generate_personalized_reminder,
    predict_payment,
)

from ml_payment_model import predict_payment_ml


# ============================================================
# 1. CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")

PAYPAL_BASE_URL = os.getenv(
    "PAYPAL_BASE_URL",
    "https://api-m.sandbox.paypal.com",
).rstrip("/")

# Test conversion factor. This is not a live exchange rate.
INR_TO_USD_RATE = os.getenv("INR_TO_USD_RATE", "0.012")


def convert_inr_to_usd(inr_amount):
    """Convert an INR invoice amount to USD."""

    try:
        rate = Decimal(str(INR_TO_USD_RATE))
        amount = Decimal(str(inr_amount))

        if not rate.is_finite() or rate <= 0:
            raise ValueError("INR_TO_USD_RATE must be positive")

        if not amount.is_finite() or amount <= 0:
            raise ValueError("Invoice amount must be positive")

        usd_amount = (amount * rate).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        if usd_amount < Decimal("0.01"):
            raise ValueError(
                "Invoice amount is too small for PayPal checkout"
            )

        return usd_amount, rate

    except (InvalidOperation, ValueError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Currency conversion error: {error}",
        )


# ============================================================
# 2. FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AI Freelancer Payment Assistant",
    description="Smart invoice and payment risk analysis system",
    version="1.4",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 3. DATABASE CONNECTION
# ============================================================

DB_PATH = BASE_DIR / "invoices.db"

conn = sqlite3.connect(
    str(DB_PATH),
    check_same_thread=False,
    timeout=30,
)

cursor = conn.cursor()


# ============================================================
# 4. DATABASE TABLES AND MIGRATIONS
# ============================================================

cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client TEXT,
        service TEXT,
        amount REAL,
        due_date TEXT,
        payment_status TEXT DEFAULT 'pending',
        invoice_date TEXT,
        paid_date TEXT
    )
    """
)

cursor.execute("PRAGMA table_info(invoices)")

existing_columns = [
    column[1] for column in cursor.fetchall()
]

migrations = {
    "due_date": """
        ALTER TABLE invoices ADD COLUMN due_date TEXT
    """,
    "payment_status": """
        ALTER TABLE invoices
        ADD COLUMN payment_status TEXT DEFAULT 'pending'
    """,
    "invoice_date": """
        ALTER TABLE invoices ADD COLUMN invoice_date TEXT
    """,
    "paid_date": """
        ALTER TABLE invoices ADD COLUMN paid_date TEXT
    """,
    "paypal_order_id": """
        ALTER TABLE invoices ADD COLUMN paypal_order_id TEXT
    """,
    "paypal_expected_usd": """
        ALTER TABLE invoices ADD COLUMN paypal_expected_usd REAL
    """,
    "paypal_exchange_rate": """
        ALTER TABLE invoices ADD COLUMN paypal_exchange_rate REAL
    """,
}

for column_name, sql in migrations.items():
    if column_name not in existing_columns:
        cursor.execute(sql)


cursor.execute(
    """
    CREATE TABLE IF NOT EXISTS payment_followups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        followup_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        followup_status TEXT NOT NULL DEFAULT 'pending',
        reminder_message TEXT,
        notes TEXT
    )
    """
)

conn.commit()


# ============================================================
# 5. DATA MODELS
# ============================================================

class Invoice(BaseModel):
    client: str = Field(min_length=2)
    service: str = Field(min_length=2)
    amount: float = Field(gt=0)
    due_date: date
    payment_status: str = "pending"
    invoice_date: date | None = None
    paid_date: date | None = None


class PaymentAnalysisRequest(BaseModel):
    due_date: date
    payment_status: str
    amount: float = Field(gt=0)


class MLPaymentAnalysisRequest(BaseModel):
    due_date: date
    payment_status: str
    amount: float = Field(gt=0)
    client_paid_rate: float = Field(default=0.5, ge=0, le=1)
    client_invoice_count: int = Field(default=0, ge=0)
    average_delay_days: float = Field(default=0, ge=0)


class FollowUpRequest(BaseModel):
    followup_status: str = "pending"
    reminder_message: str | None = None
    notes: str | None = None


class FollowUpStatusUpdate(BaseModel):
    followup_status: str


# ============================================================
# 6. SHARED HELPERS
# ============================================================

def normalise_payment_status(status):
    return (status or "pending").strip().lower()


def get_invoice_or_404(invoice_id: int):

    cursor.execute(
        "SELECT * FROM invoices WHERE id = ?",
        (invoice_id,),
    )

    invoice = cursor.fetchone()

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    return invoice


def get_paypal_access_token():
    """Get a PayPal OAuth access token."""

    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="PayPal credentials are missing from the back-end .env file",
        )

    try:

        response = requests.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            headers={
                "Accept": "application/json",
                "Accept-Language": "en_US",
            },
            data={
                "grant_type": "client_credentials",
            },
            timeout=20,
        )

        if response.status_code != 200:

            print(
                "PayPal authentication error:",
                response.text,
            )

            raise HTTPException(
                status_code=502,
                detail="PayPal authentication failed",
            )

        token = response.json().get("access_token")

        if not token:
            raise HTTPException(
                status_code=502,
                detail="PayPal did not return an access token",
            )

        return token

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to connect to PayPal Sandbox",
        )


def get_paypal_order_details(order_id: str, access_token: str):
    """Read the current PayPal order without capturing it."""

    try:

        response = requests.get(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}",
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            timeout=20,
        )

        if response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="PayPal order was not found",
            )

        if response.status_code != 200:

            print(
                "PayPal order lookup error:",
                response.text,
            )

            raise HTTPException(
                status_code=502,
                detail="Unable to retrieve PayPal order details",
            )

        return response.json()

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to communicate with PayPal while checking the order",
        )


def verify_completed_paypal_order(
    order: dict,
    expected_order_id: str,
    invoice_id: int,
    expected_usd,
):
    """
    Verify PayPal order ID, invoice reference,
    completed captures, currency and total amount.
    """

    if order.get("id") != expected_order_id:
        raise HTTPException(
            status_code=400,
            detail="PayPal order ID verification failed",
        )

    if order.get("status") != "COMPLETED":
        raise HTTPException(
            status_code=409,
            detail={
                "message": "PayPal order is not completed",
                "paypal_order_status": order.get("status"),
            },
        )

    purchase_units = order.get("purchase_units") or []

    if not purchase_units:
        raise HTTPException(
            status_code=400,
            detail="PayPal purchase information is missing",
        )

    completed_captures = []
    captured_total = Decimal("0.00")
    expected_invoice_reference = str(invoice_id)

    for unit in purchase_units:

        custom_id = unit.get("custom_id")
        reference_id = unit.get("reference_id")

        if custom_id and custom_id != expected_invoice_reference:
            raise HTTPException(
                status_code=400,
                detail="PayPal custom invoice reference does not match",
            )

        if reference_id and reference_id != expected_invoice_reference:
            raise HTTPException(
                status_code=400,
                detail="PayPal reference ID does not match the invoice",
            )

        if not custom_id and not reference_id:
            raise HTTPException(
                status_code=400,
                detail="PayPal order does not contain an invoice reference",
            )

        captures = (
            (unit.get("payments") or {}).get("captures") or []
        )

        for capture in captures:

            if capture.get("status") != "COMPLETED":
                continue

            amount_info = capture.get("amount") or {}

            currency = amount_info.get("currency_code")
            value = amount_info.get("value")

            if currency != "USD" or value is None:
                raise HTTPException(
                    status_code=400,
                    detail="Captured currency or amount is invalid",
                )

            try:
                capture_value = Decimal(str(value))
            except InvalidOperation:
                raise HTTPException(
                    status_code=400,
                    detail="PayPal returned an invalid capture amount",
                )

            if not capture_value.is_finite() or capture_value <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="PayPal returned a non-positive capture amount",
                )

            captured_total += capture_value

            completed_captures.append(
                {
                    "capture_id": capture.get("id"),
                    "capture_status": capture.get("status"),
                    "amount": f"{capture_value:.2f}",
                    "currency": currency,
                }
            )

    if not completed_captures:
        raise HTTPException(
            status_code=409,
            detail="PayPal order has no completed payment capture",
        )

    try:

        expected_amount = Decimal(str(expected_usd)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    except InvalidOperation:
        raise HTTPException(
            status_code=500,
            detail="Saved expected PayPal amount is invalid",
        )

    captured_total = captured_total.quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )

    if captured_total != expected_amount:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Captured amount does not match the invoice",
                "expected_usd": f"{expected_amount:.2f}",
                "captured_usd": f"{captured_total:.2f}",
            },
        )

    return {
        "expected_usd": f"{expected_amount:.2f}",
        "captured_usd": f"{captured_total:.2f}",
        "captures": completed_captures,
    }


def mark_invoice_paid(invoice_id: int):
    """Mark an invoice paid only after successful PayPal verification."""

    cursor.execute(
        """
        UPDATE invoices
        SET payment_status = 'paid',
            paid_date = COALESCE(paid_date, ?)
        WHERE id = ?
        """,
        (
            date.today().isoformat(),
            invoice_id,
        ),
    )

    conn.commit()


# ============================================================
# 7. HOME ENDPOINT
# ============================================================

@app.get("/")
def home():

    return {
        "message": "AI Freelancer Payment Assistant Backend is Running!"
    }


# ============================================================
# 8. CREATE INVOICE
# ============================================================

@app.post("/invoices")
def create_invoice(invoice: Invoice):

    status = normalise_payment_status(invoice.payment_status)

    if status not in ["paid", "unpaid", "pending"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid payment status",
        )

    invoice_date = invoice.invoice_date or date.today()
    paid_date = None

    if status == "paid":
        paid_date = invoice.paid_date or date.today()

    cursor.execute(
        """
        INSERT INTO invoices (
            client, service, amount, due_date,
            payment_status, invoice_date, paid_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            invoice.client,
            invoice.service,
            invoice.amount,
            invoice.due_date.isoformat(),
            status,
            invoice_date.isoformat(),
            paid_date.isoformat() if paid_date else None,
        ),
    )

    invoice_id = cursor.lastrowid

    conn.commit()

    return {
        "message": "Invoice created successfully!",
        "invoice_id": invoice_id,
        "invoice_date": invoice_date,
        "paid_date": paid_date,
        "invoice_details": invoice,
    }


# ============================================================
# 9. GET ALL INVOICES
# ============================================================

@app.get("/invoices")
def get_invoices():

    cursor.execute(
        "SELECT * FROM invoices ORDER BY id"
    )

    records = cursor.fetchall()

    return {
        "total_invoices": len(records),
        "invoices": records,
    }


# ============================================================
# 10. GET ONE INVOICE
# ============================================================

@app.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int):

    record = get_invoice_or_404(invoice_id)

    return {
        "invoice": record
    }


# ============================================================
# 11. ANALYSE SAVED INVOICE
# ============================================================

@app.get("/invoices/{invoice_id}/analyze")
def analyze_saved_invoice(invoice_id: int):

    cursor.execute(
        """
        SELECT amount, due_date, payment_status
        FROM invoices
        WHERE id = ?
        """,
        (invoice_id,),
    )

    record = cursor.fetchone()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    amount, due_date, payment_status = record

    if not due_date or not payment_status:
        raise HTTPException(
            status_code=400,
            detail="Invoice is missing payment information",
        )

    try:

        result = analyze_invoice(
            date.fromisoformat(due_date),
            payment_status,
            amount,
        )

        return {
            "invoice_id": invoice_id,
            "analysis": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 12. UPDATE INVOICE
# ============================================================

@app.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, invoice: Invoice):

    status = normalise_payment_status(invoice.payment_status)

    if status not in ["paid", "unpaid", "pending"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid payment status",
        )

    cursor.execute(
        """
        SELECT invoice_date, paid_date, paypal_order_id,
               payment_status, amount
        FROM invoices
        WHERE id = ?
        """,
        (invoice_id,),
    )

    existing_invoice = cursor.fetchone()

    if existing_invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    (
        existing_invoice_date,
        existing_paid_date,
        existing_paypal_order_id,
        existing_payment_status,
        existing_amount,
    ) = existing_invoice

    if (
        status == "paid"
        and existing_paypal_order_id
        and normalise_payment_status(existing_payment_status) != "paid"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This invoice has a PayPal order. Verify the PayPal capture "
                "before marking it as paid."
            ),
        )

    if (
        existing_paypal_order_id
        and Decimal(str(invoice.amount)) != Decimal(str(existing_amount))
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This invoice already has a PayPal order. "
                "Do not change its amount while that order is attached."
            ),
        )

    invoice_date = (
        invoice.invoice_date.isoformat()
        if invoice.invoice_date
        else existing_invoice_date or date.today().isoformat()
    )

    paid_date = None

    if status == "paid":

        if invoice.paid_date:
            paid_date = invoice.paid_date.isoformat()

        elif existing_paid_date:
            paid_date = existing_paid_date

        else:
            paid_date = date.today().isoformat()

    cursor.execute(
        """
        UPDATE invoices
        SET client = ?,
            service = ?,
            amount = ?,
            due_date = ?,
            payment_status = ?,
            invoice_date = ?,
            paid_date = ?
        WHERE id = ?
        """,
        (
            invoice.client,
            invoice.service,
            invoice.amount,
            invoice.due_date.isoformat(),
            status,
            invoice_date,
            paid_date,
            invoice_id,
        ),
    )

    conn.commit()

    return {
        "message": "Invoice updated successfully!",
        "invoice_id": invoice_id,
        "invoice_date": invoice_date,
        "paid_date": paid_date,
    }


# ============================================================
# 13. DELETE INVOICE
# ============================================================

@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int):

    cursor.execute(
        "DELETE FROM invoices WHERE id = ?",
        (invoice_id,),
    )

    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    conn.commit()

    return {
        "message": "Invoice deleted successfully!"
    }


# ============================================================
# 14. PAYMENT INTELLIGENCE
# ============================================================

@app.post("/analyze-payment")
def analyze_payment(request: PaymentAnalysisRequest):

    try:

        result = analyze_invoice(
            request.due_date,
            request.payment_status,
            request.amount,
        )

        return {
            "message": "Payment analysis completed successfully!",
            "analysis": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 15. COMBINED PAYMENT RISK SCORE
# ============================================================

@app.post("/payment-risk-score")
def get_payment_risk_score(request: PaymentAnalysisRequest):

    try:

        score = combined_risk_score(
            request.due_date,
            request.payment_status,
            request.amount,
        )

        if score <= 30:
            category = "Low"
        elif score <= 60:
            category = "Medium"
        else:
            category = "High"

        return {
            "risk_score": score,
            "risk_category": category,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 16. SMART PAYMENT REMINDER
# ============================================================

@app.post("/generate-reminder")
def generate_reminder_api(request: PaymentAnalysisRequest):

    try:

        reminder = generate_payment_reminder(
            request.due_date,
            request.payment_status,
        )

        return {
            "payment_status": request.payment_status,
            "due_date": request.due_date,
            "reminder_message": reminder,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 17. PERSONALIZED REMINDER
# ============================================================

@app.get("/invoices/{invoice_id}/personalized-reminder")
def personalized_reminder_for_invoice(invoice_id: int):

    cursor.execute(
        """
        SELECT id, client, service, amount, due_date, payment_status
        FROM invoices
        WHERE id = ?
        """,
        (invoice_id,),
    )

    invoice = cursor.fetchone()

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    if not invoice[4] or not invoice[5]:
        raise HTTPException(
            status_code=400,
            detail="Invoice is missing payment information",
        )

    try:

        reminder = generate_personalized_reminder(
            client=invoice[1],
            invoice_id=invoice[0],
            service=invoice[2],
            amount=invoice[3],
            due_date=date.fromisoformat(invoice[4]),
            payment_status=invoice[5],
        )

        return {
            "invoice_id": invoice[0],
            "client": invoice[1],
            "personalized_reminder": reminder,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 18. CREATE PAYMENT FOLLOW-UP
# ============================================================

@app.post("/invoices/{invoice_id}/followups")
def create_payment_followup(
    invoice_id: int,
    followup: FollowUpRequest,
):

    status = (followup.followup_status or "").strip().lower()

    if status not in ["pending", "sent"]:
        raise HTTPException(
            status_code=400,
            detail="Follow-up status must be pending or sent",
        )

    cursor.execute(
        "SELECT id FROM invoices WHERE id = ?",
        (invoice_id,),
    )

    if cursor.fetchone() is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    cursor.execute(
        """
        INSERT INTO payment_followups (
            invoice_id, followup_status, reminder_message, notes
        )
        VALUES (?, ?, ?, ?)
        """,
        (
            invoice_id,
            status,
            followup.reminder_message,
            followup.notes,
        ),
    )

    followup_id = cursor.lastrowid

    conn.commit()

    return {
        "message": "Payment follow-up recorded successfully!",
        "followup_id": followup_id,
        "invoice_id": invoice_id,
        "followup_status": status,
        "reminder_message": followup.reminder_message,
        "notes": followup.notes,
    }


# ============================================================
# 19. GET PAYMENT FOLLOW-UP HISTORY
# ============================================================

@app.get("/invoices/{invoice_id}/followups")
def get_payment_followups(invoice_id: int):

    cursor.execute(
        "SELECT id FROM invoices WHERE id = ?",
        (invoice_id,),
    )

    if cursor.fetchone() is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    cursor.execute(
        """
        SELECT id, invoice_id, followup_date,
               followup_status, reminder_message, notes
        FROM payment_followups
        WHERE invoice_id = ?
        ORDER BY id DESC
        """,
        (invoice_id,),
    )

    records = cursor.fetchall()

    followups = [
        {
            "followup_id": record[0],
            "invoice_id": record[1],
            "followup_date": record[2],
            "followup_status": record[3],
            "reminder_message": record[4],
            "notes": record[5],
        }
        for record in records
    ]

    return {
        "invoice_id": invoice_id,
        "total_followups": len(followups),
        "followups": followups,
    }


# ============================================================
# 20. UPDATE FOLLOW-UP STATUS
# ============================================================

@app.put("/followups/{followup_id}/status")
def update_followup_status(
    followup_id: int,
    request: FollowUpStatusUpdate,
):

    status = (request.followup_status or "").strip().lower()

    if status not in ["pending", "sent"]:
        raise HTTPException(
            status_code=400,
            detail="Follow-up status must be pending or sent",
        )

    cursor.execute(
        "SELECT id FROM payment_followups WHERE id = ?",
        (followup_id,),
    )

    if cursor.fetchone() is None:
        raise HTTPException(
            status_code=404,
            detail="Follow-up not found",
        )

    cursor.execute(
        """
        UPDATE payment_followups
        SET followup_status = ?
        WHERE id = ?
        """,
        (status, followup_id),
    )

    conn.commit()

    return {
        "message": "Follow-up status updated successfully!",
        "followup_id": followup_id,
        "new_status": status,
    }


# ============================================================
# 21. RULE-BASED AI PAYMENT PREDICTION
# ============================================================

@app.post("/predict-payment")
def predict_payment_api(request: PaymentAnalysisRequest):

    try:

        result = predict_payment(
            request.due_date,
            request.payment_status,
            request.amount,
        )

        return {
            "message": "Payment prediction completed successfully!",
            "prediction": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 21A. MACHINE LEARNING PAYMENT PREDICTION
# ============================================================

@app.post("/predict-payment-ml")
def predict_payment_ml_api(request: MLPaymentAnalysisRequest):

    try:

        days_until_due = (
            request.due_date - date.today()
        ).days

        result = predict_payment_ml(
            amount=request.amount,
            days_until_due=days_until_due,
            client_paid_rate=request.client_paid_rate,
            client_invoice_count=request.client_invoice_count,
            average_delay_days=request.average_delay_days,
            payment_status=request.payment_status,
        )

        return {
            "message": "ML payment prediction completed successfully!",
            "prediction": result,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


# ============================================================
# 22. CLIENT PAYMENT HISTORY
# ============================================================

@app.get("/clients/{client_name}/payment-history")
def get_client_payment_history(client_name: str):

    cursor.execute(
        """
        SELECT
            COUNT(*),
            SUM(
                CASE
                    WHEN LOWER(payment_status) = 'paid'
                    THEN 1 ELSE 0
                END
            ),
            SUM(
                CASE
                    WHEN LOWER(payment_status) = 'unpaid'
                    THEN 1 ELSE 0
                END
            ),
            SUM(
                CASE
                    WHEN LOWER(payment_status) = 'pending'
                    THEN 1 ELSE 0
                END
            ),
            SUM(
                CASE
                    WHEN LOWER(payment_status) = 'paid'
                    THEN amount ELSE 0
                END
            )
        FROM invoices
        WHERE LOWER(client) = LOWER(?)
        """,
        (client_name.strip(),),
    )

    total, paid, unpaid, pending, total_paid = cursor.fetchone()

    if total == 0:
        raise HTTPException(
            status_code=404,
            detail="No invoices found for this client",
        )

    paid = paid or 0
    reliability = round((paid / total) * 100, 2)

    return {
        "client": client_name,
        "total_invoices": total,
        "paid_invoices": paid,
        "unpaid_invoices": unpaid or 0,
        "pending_invoices": pending or 0,
        "total_amount_paid": total_paid or 0,
        "payment_reliability": reliability,
    }


# ============================================================
# 23. PAYPAL CONNECTION TEST
# ============================================================

@app.post("/paypal/test-connection")
def test_paypal_connection():

    token = get_paypal_access_token()

    if not token:
        raise HTTPException(
            status_code=502,
            detail="PayPal access token could not be generated",
        )

    return {
        "message": "PayPal Sandbox connection successful!",
        "connected": True,
    }


# ============================================================
# 24. CREATE PAYPAL ORDER USING INR INVOICE
# ============================================================

@app.post("/paypal/create-order/{invoice_id}")
def create_paypal_order(invoice_id: int):

    cursor.execute(
        """
        SELECT client, service, amount, payment_status,
               paypal_order_id, paypal_expected_usd,
               paypal_exchange_rate
        FROM invoices
        WHERE id = ?
        """,
        (invoice_id,),
    )

    invoice = cursor.fetchone()

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    (
        client,
        service,
        invoice_amount,
        payment_status,
        existing_order_id,
        existing_expected_usd,
        existing_exchange_rate,
    ) = invoice

    if normalise_payment_status(payment_status) == "paid":
        raise HTTPException(
            status_code=409,
            detail=(
                "Invoice is already marked as paid. "
                "Verify its PayPal order before creating another order."
            ),
        )

    # Never create another order for an invoice already linked to an order.
    if existing_order_id:
        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "This invoice is already linked to a PayPal order."
                ),
                "paypal_order_id": existing_order_id,
                "expected_usd": existing_expected_usd,
                "exchange_rate": existing_exchange_rate,
                "next_step": (
                    "Check GET /paypal/order-status/{order_id} "
                    "or continue with the existing PayPal order."
                ),
            },
        )

    expected_usd, exchange_rate = convert_inr_to_usd(
        invoice_amount
    )

    access_token = get_paypal_access_token()

    try:

        response = requests.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "reference_id": str(invoice_id),
                        "custom_id": str(invoice_id),
                        "description": (
                            f"Invoice {invoice_id} - {service}"
                        ),
                        "amount": {
                            "currency_code": "USD",
                            "value": f"{expected_usd:.2f}",
                        },
                    }
                ],
                "payment_source": {
                    "paypal": {
                        "experience_context": {
                            "user_action": "PAY_NOW",
                            "return_url": (
                                "http://127.0.0.1:5500/front-end/index.html"
                            ),
                            "cancel_url": (
                                "http://127.0.0.1:5500/front-end/index.html"
                                "?paypal=cancel"
                            ),
                        }
                    }
                },
            },
            timeout=20,
        )

        if response.status_code not in [200, 201]:

            print(
                "PayPal order creation error:",
                response.text,
            )

            raise HTTPException(
                status_code=502,
                detail="PayPal order creation failed",
            )

        order = response.json()
        order_id = order.get("id")

        approval_url = next(
            (
                link.get("href")
                for link in order.get("links", [])
                if link.get("rel") in ["approve", "payer-action"]
            ),
            None,
        )

        if not order_id:
            raise HTTPException(
                status_code=502,
                detail="PayPal did not return an order ID",
            )

        if not approval_url:
            raise HTTPException(
                status_code=502,
                detail="PayPal approval link is missing",
            )

        cursor.execute(
            """
            UPDATE invoices
            SET paypal_order_id = ?,
                paypal_expected_usd = ?,
                paypal_exchange_rate = ?
            WHERE id = ?
            """,
            (
                order_id,
                float(expected_usd),
                float(exchange_rate),
                invoice_id,
            ),
        )

        conn.commit()

        return {
            "message": "PayPal order created successfully!",
            "invoice_id": invoice_id,
            "invoice_amount_inr": float(invoice_amount),
            "exchange_rate": float(exchange_rate),
            "amount_usd": f"{expected_usd:.2f}",
            "paypal_order_id": order_id,
            "paypal_status": order.get("status"),
            "approval_url": approval_url,
        }

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to communicate with PayPal",
        )


# ============================================================
# 25. CHECK PAYPAL ORDER STATUS AND RECOVER APPROVAL URL
# ============================================================

@app.get("/paypal/order-status/{order_id}")
def check_paypal_order_status(order_id: str):

    cursor.execute(
        """
        SELECT id, payment_status, paypal_expected_usd
        FROM invoices
        WHERE paypal_order_id = ?
        """,
        (order_id,),
    )

    invoice = cursor.fetchone()

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="No invoice is linked to this PayPal order",
        )

    invoice_id, local_payment_status, expected_usd = invoice

    if expected_usd is None:
        raise HTTPException(
            status_code=400,
            detail="Expected PayPal amount is missing from the invoice",
        )

    access_token = get_paypal_access_token()

    # Retrieve the existing order. This does not create or capture it.
    order = get_paypal_order_details(
        order_id,
        access_token,
    )

    # Recover the original buyer-approval URL from PayPal's HATEOAS links.
    links = order.get("links") or []

    approval_url = next(
        (
            link.get("href")
            for relation in ["payer-action", "approve"]
            for link in links
            if link.get("rel") == relation and link.get("href")
        ),
        None,
    )

    result = {
        "invoice_id": invoice_id,
        "local_payment_status": local_payment_status,
        "paypal_order_id": order.get("id"),
        "paypal_order_status": order.get("status"),
        "payment_verified": False,
        "approval_url": approval_url,
        "captures": [],
    }

    # Only report payment as verified after validating a completed capture.
    if order.get("status") == "COMPLETED":

        verification = verify_completed_paypal_order(
            order=order,
            expected_order_id=order_id,
            invoice_id=invoice_id,
            expected_usd=expected_usd,
        )

        result.update(
            {
                "payment_verified": True,
                "expected_usd": verification["expected_usd"],
                "captured_usd": verification["captured_usd"],
                "captures": verification["captures"],
            }
        )

    return result


# ============================================================
# 26. CAPTURE AND VERIFY PAYPAL PAYMENT (SAFE TO RETRY)
# ============================================================

@app.post("/paypal/capture-order/{order_id}")
def capture_paypal_order(order_id: str):

    cursor.execute(
        """
        SELECT id, payment_status, paypal_expected_usd
        FROM invoices
        WHERE paypal_order_id = ?
        """,
        (order_id,),
    )

    invoice = cursor.fetchone()

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="No invoice is linked to this PayPal order",
        )

    invoice_id, payment_status, expected_usd = invoice

    if expected_usd is None:
        raise HTTPException(
            status_code=400,
            detail="Expected PayPal amount is missing",
        )

    access_token = get_paypal_access_token()

    # First check PayPal. This handles a previous successful capture
    # where the local database was not updated because of a network issue.
    order = get_paypal_order_details(
        order_id,
        access_token,
    )

    paypal_status = order.get("status")

    # If PayPal already completed the payment, verify it and reconcile
    # the local database. Do not send another capture request.
    if paypal_status == "COMPLETED":

        verification = verify_completed_paypal_order(
            order=order,
            expected_order_id=order_id,
            invoice_id=invoice_id,
            expected_usd=expected_usd,
        )

        mark_invoice_paid(invoice_id)

        return {
            "message": (
                "PayPal payment is already captured and has now been verified."
            ),
            "invoice_id": invoice_id,
            "paypal_order_id": order_id,
            "expected_usd": verification["expected_usd"],
            "captured_usd": verification["captured_usd"],
            "currency": "USD",
            "payment_status": "paid",
            "paypal_order_status": "COMPLETED",
            "capture_status": "COMPLETED",
            "already_captured": True,
            "captures": verification["captures"],
        }

    # If SQLite says paid but PayPal does not show a completed capture,
    # do not attempt another charge. Investigate the local paid status.
    if normalise_payment_status(payment_status) == "paid":

        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "The local invoice is marked paid, but PayPal does not "
                    "show a completed capture. No new capture was attempted."
                ),
                "invoice_id": invoice_id,
                "local_payment_status": payment_status,
                "paypal_order_status": paypal_status,
                "next_step": (
                    "Check whether this invoice was manually marked paid "
                    "or paid through another method before changing its status."
                ),
            },
        )

    # Only capture an approved order.
    if paypal_status != "APPROVED":

        raise HTTPException(
            status_code=409,
            detail={
                "message": (
                    "The PayPal order has not been approved by the buyer."
                ),
                "paypal_order_status": paypal_status,
                "next_step": (
                    "Complete buyer approval using the PayPal Sandbox "
                    "approval link."
                ),
            },
        )

    # Capture the order only after verifying that it is approved.
    try:

        capture_response = requests.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
            json={},
            timeout=20,
        )

    except requests.RequestException:

        # The request might have reached PayPal even if our connection
        # timed out. Read the order again before reporting failure.
        try:

            order_after_error = get_paypal_order_details(
                order_id,
                access_token,
            )

            if order_after_error.get("status") == "COMPLETED":

                verification = verify_completed_paypal_order(
                    order=order_after_error,
                    expected_order_id=order_id,
                    invoice_id=invoice_id,
                    expected_usd=expected_usd,
                )

                mark_invoice_paid(invoice_id)

                return {
                    "message": (
                        "PayPal capture completed; payment was verified "
                        "after a network interruption."
                    ),
                    "invoice_id": invoice_id,
                    "paypal_order_id": order_id,
                    "expected_usd": verification["expected_usd"],
                    "captured_usd": verification["captured_usd"],
                    "currency": "USD",
                    "payment_status": "paid",
                    "paypal_order_status": "COMPLETED",
                    "capture_status": "COMPLETED",
                    "already_captured": False,
                    "captures": verification["captures"],
                }

        except HTTPException:
            pass

        raise HTTPException(
            status_code=502,
            detail=(
                "The capture request had a network problem and its result "
                "could not be confirmed. Check GET "
                "/paypal/order-status/{order_id} before trying again. "
                "Do not create another order."
            ),
        )

    # PayPal can return an error if a previous attempt already captured
    # the order. Check the order again before reporting capture failure.
    if capture_response.status_code not in [200, 201]:

        print(
            "PayPal capture response:",
            capture_response.text,
        )

        order_after_response = get_paypal_order_details(
            order_id,
            access_token,
        )

        if order_after_response.get("status") == "COMPLETED":

            verification = verify_completed_paypal_order(
                order=order_after_response,
                expected_order_id=order_id,
                invoice_id=invoice_id,
                expected_usd=expected_usd,
            )

            mark_invoice_paid(invoice_id)

            return {
                "message": (
                    "PayPal payment was already captured and has been verified."
                ),
                "invoice_id": invoice_id,
                "paypal_order_id": order_id,
                "expected_usd": verification["expected_usd"],
                "captured_usd": verification["captured_usd"],
                "currency": "USD",
                "payment_status": "paid",
                "paypal_order_status": "COMPLETED",
                "capture_status": "COMPLETED",
                "already_captured": True,
                "captures": verification["captures"],
            }

        raise HTTPException(
            status_code=502,
            detail={
                "message": "PayPal capture failed",
                "paypal_order_status": order_after_response.get("status"),
            },
        )

    # Verify the actual capture response before updating SQLite.
    capture_data = capture_response.json()

    verification = verify_completed_paypal_order(
        order=capture_data,
        expected_order_id=order_id,
        invoice_id=invoice_id,
        expected_usd=expected_usd,
    )

    mark_invoice_paid(invoice_id)

    return {
        "message": "PayPal payment captured and verified successfully!",
        "invoice_id": invoice_id,
        "paypal_order_id": order_id,
        "expected_usd": verification["expected_usd"],
        "captured_usd": verification["captured_usd"],
        "currency": "USD",
        "payment_status": "paid",
        "paypal_order_status": "COMPLETED",
        "capture_status": "COMPLETED",
        "already_captured": False,
        "captures": verification["captures"],
    }
