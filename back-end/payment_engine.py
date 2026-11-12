
from datetime import date


# 1. Overdue Payment Detection Engine

def is_overdue(due_date: date, payment_status: str):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if payment_status == "paid":
        return False

    return due_date < date.today()


# 2. Payment Risk Detection

def payment_risk(due_date: date, payment_status: str):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if payment_status == "paid":
        return "Low"

    days_overdue = max(0, (date.today() - due_date).days)

    if days_overdue == 0:
        return "Low"
    elif days_overdue <= 7:
        return "Medium"
    else:
        return "High"


# 3. Smart Recommendation

def smart_recommendation(due_date: date, payment_status: str):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if payment_status == "paid":
        return "No action needed. Payment received."

    risk = payment_risk(due_date, payment_status)

    if risk == "Low":
        return "Wait until the due date."
    elif risk == "Medium":
        return "Send a friendly payment reminder."
    else:
        return "Send an urgent payment reminder."


# 4. Invoice Amount Priority

def amount_priority(amount: float):

    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if amount < 10000:
        return "Low"
    elif amount < 50000:
        return "Medium"
    else:
        return "High"


# 5. Combined Payment Risk Score

def combined_risk_score(
    due_date: date,
    payment_status: str,
    amount: float
):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if payment_status == "paid":
        amount_priority(amount)
        return 0

    days_overdue = max(0, (date.today() - due_date).days)

    if days_overdue == 0:
        overdue_score = 0
    elif days_overdue <= 7:
        overdue_score = 20
    elif days_overdue <= 15:
        overdue_score = 40
    else:
        overdue_score = 60

    priority = amount_priority(amount)

    if priority == "Low":
        amount_score = 10
    elif priority == "Medium":
        amount_score = 25
    else:
        amount_score = 40

    total_score = overdue_score + amount_score

    return min(total_score, 100)


# 6. Main Payment Intelligence Engine

def analyze_invoice(
    due_date: date,
    payment_status: str,
    amount: float
):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    overdue = is_overdue(due_date, payment_status)

    if overdue:
        days_overdue = (date.today() - due_date).days
    else:
        days_overdue = 0

    risk = payment_risk(due_date, payment_status)

    recommendation = smart_recommendation(
        due_date,
        payment_status
    )

    priority = amount_priority(amount)

    score = combined_risk_score(
        due_date,
        payment_status,
        amount
    )

    if score <= 30:
        score_category = "Low"
    elif score <= 60:
        score_category = "Medium"
    else:
        score_category = "High"

    # Explainable Risk Analysis

    risk_reasons = []

    if payment_status == "paid":

        risk_reasons.append(
            "Invoice has already been paid."
        )

    elif overdue:

        risk_reasons.append(
            f"Payment is overdue by {days_overdue} days."
        )

    elif payment_status == "unpaid":

        risk_reasons.append(
            "Invoice is unpaid but not overdue yet."
        )

    else:

        risk_reasons.append(
            "Payment is currently pending."
        )

    if payment_status != "paid":

        if priority == "High":
            risk_reasons.append(
                "Invoice has a high financial value."
            )

        elif priority == "Medium":
            risk_reasons.append(
                "Invoice has a medium financial value."
            )

        else:
            risk_reasons.append(
                "Invoice has a low financial value."
            )

    return {
        "payment_status": payment_status,
        "is_overdue": overdue,
        "days_overdue": days_overdue,
        "risk_level": risk,
        "recommendation": recommendation,
        "amount_priority": priority,
        "combined_risk_score": score,
        "combined_risk_category": score_category,
        "risk_reasons": risk_reasons
    }


# 7. Smart Payment Reminder Generator


# 7. Smart Payment Reminder Generator

def generate_payment_reminder(
    due_date: date,
    payment_status: str
):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if payment_status == "paid":
        return "No reminder needed. Payment has been received."

    days_remaining = (due_date - date.today()).days

    if days_remaining > 7:

        return (
            f"Your invoice payment is due in {days_remaining} days. "
            "Please plan your payment in advance."
        )

    elif days_remaining > 0:

        return (
            f"Friendly reminder: Your invoice payment is due in "
            f"{days_remaining} days. Please arrange payment."
        )

    elif days_remaining == 0:

        return (
            "Payment reminder: Your invoice payment is due today. "
            "Please arrange payment."
        )

    elif days_remaining >= -7:

        return (
            f"Friendly reminder: Your invoice payment is overdue by "
            f"{abs(days_remaining)} days. Please arrange payment."
        )

    else:

        return (
            f"Urgent reminder: Your invoice payment is overdue by "
            f"{abs(days_remaining)} days. Please make the payment "
            "as soon as possible."
        )


# 8. Personalized Payment Reminder Generator

def generate_personalized_reminder(
    client: str,
    invoice_id: int,
    service: str,
    amount: float,
    due_date: date,
    payment_status: str
):

    payment_status = payment_status.strip().lower()

    if payment_status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not client.strip() or not service.strip():
        raise ValueError("Client and service cannot be empty")

    formatted_amount = f"INR {amount:,.2f}"
    formatted_date = due_date.strftime("%d %B %Y")

    if payment_status == "paid":

        return {
            "subject": f"Payment Confirmation - Invoice #{invoice_id}",

            "message": (
                f"Dear {client},\n\n"
                f"We have received your payment of {formatted_amount} "
                f"for {service}.\n\n"
                f"Invoice Number: #{invoice_id}\n"
                f"Payment Status: Paid\n\n"
                "Thank you for your payment. "
                "We appreciate your business!"
            )
        }

    reminder = generate_payment_reminder(
        due_date,
        payment_status
    )

    return {
        "subject": f"Payment Reminder - Invoice #{invoice_id}",

        "message": (
            f"Dear {client},\n\n"
            f"This is regarding your invoice for {service}.\n\n"
            f"Invoice Number: #{invoice_id}\n"
            f"Outstanding Amount: {formatted_amount}\n"
            f"Due Date: {formatted_date}\n"
            f"Payment Status: {payment_status.title()}\n\n"
            f"{reminder}\n\n"
            "Thank you for your cooperation."
        )
    }
# 9. AI Payment Prediction Engine

def predict_payment(due_date: date, payment_status: str, amount: float):

    payment_status = payment_status.strip().lower()

    if payment_status == "paid":
        return {
            "prediction": "Payment Received",
            "payment_likelihood": 100,
            "confidence": "Confirmed"
        }

    analysis = analyze_invoice(
        due_date,
        payment_status,
        amount
    )

    risk_score = analysis["combined_risk_score"]

    likelihood = max(0, 100 - risk_score)

    if likelihood >= 70:
        prediction = "High Likelihood"
    elif likelihood >= 40:
        prediction = "Medium Likelihood"
    else:
        prediction = "Low Likelihood"

    return {
        "prediction": prediction,
        "payment_likelihood": likelihood,
        "risk_score": risk_score,
        "confidence": "Rule-based estimate"
    }