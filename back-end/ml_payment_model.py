
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression


# ============================================================
# PULSEP﻿AY AI - MACHINE LEARNING PAYMENT PREDICTION
# ============================================================

# IMPORTANT:
# This first version uses synthetic demonstration data.
# It is a prototype, not a model validated on real client history.


def create_training_data(samples=3000, random_state=42):

    rng = np.random.default_rng(random_state)

    amount = rng.lognormal(
        mean=9.0,
        sigma=1.0,
        size=samples
    )

    amount = np.clip(amount, 500, 200000)

    days_until_due = rng.integers(
        -45, 46, size=samples
    )

    client_paid_rate = rng.uniform(
        0.0, 1.0, size=samples
    )

    client_invoice_count = rng.integers(
        0, 21, size=samples
    )

    average_delay_days = rng.uniform(
        0, 30, size=samples
    )

    is_unpaid = rng.integers(
        0, 2, size=samples
    )

    # Simulated probability used to create demonstration labels.
    # It is NOT a real-world payment prediction formula.

    logit = (
        0.3
        + 2.2 * client_paid_rate
        + 0.07 * client_invoice_count
        - 0.055 * average_delay_days
        - 0.000012 * amount
        + 0.035 * days_until_due
        - 0.6 * is_unpaid
    )

    probability = 1 / (1 + np.exp(-logit))

    # 1 = simulated on-time payment
    # 0 = simulated delayed payment

    labels = rng.binomial(1, probability)

    features = np.column_stack([
        amount,
        days_until_due,
        client_paid_rate,
        client_invoice_count,
        average_delay_days,
        is_unpaid
    ])

    return features, labels


# ============================================================
# TRAIN THE MACHINE LEARNING MODEL
# ============================================================

def train_payment_model():

    features, labels = create_training_data()

    X_train, X_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.20,
        random_state=42,
        stratify=labels
    )

    model = Pipeline([
        ("scaler", StandardScaler()),

        ("classifier", LogisticRegression(
            max_iter=1000,
            random_state=42
        ))
    ])

    model.fit(X_train, y_train)

    test_accuracy = model.score(X_test, y_test)

    print("PulsePay AI machine learning model trained.")
    print("Training data: Synthetic demonstration dataset.")
    print(f"Holdout accuracy on synthetic data: {test_accuracy:.2%}")

    return model


# Train once when this module is imported.
payment_model = train_payment_model()


# ============================================================
# MAKE A PAYMENT PREDICTION
# ============================================================

def predict_payment_ml(
    amount,
    days_until_due,
    client_paid_rate=0.5,
    client_invoice_count=0,
    average_delay_days=0,
    payment_status="pending"
):

    status = payment_status.strip().lower()

    if status not in ["paid", "unpaid", "pending"]:
        raise ValueError("Invalid payment status")

    if status == "paid":
        return {
            "prediction": "Payment Received",
            "payment_likelihood": 100,
            "risk_category": "Low",
            "model_type": "Scikit-learn Logistic Regression",
            "confidence_note": "Payment is already marked as paid."
        }

    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not 0 <= client_paid_rate <= 1:
        raise ValueError("Client paid rate must be between 0 and 1")

    if client_invoice_count < 0:
        raise ValueError("Invoice count cannot be negative")

    if average_delay_days < 0:
        raise ValueError("Average delay cannot be negative")

    is_unpaid = 1 if status == "unpaid" else 0

    features = np.array([[
        float(amount),
        float(days_until_due),
        float(client_paid_rate),
        float(client_invoice_count),
        float(average_delay_days),
        is_unpaid
    ]])

    probability = payment_model.predict_proba(features)[0][1]

    likelihood = round(float(probability) * 100, 2)

    if likelihood >= 70:
        prediction = "High Likelihood"
        risk_category = "Low"

    elif likelihood >= 40:
        prediction = "Medium Likelihood"
        risk_category = "Medium"

    else:
        prediction = "Low Likelihood"
        risk_category = "High"

    return {
        "prediction": prediction,
        "payment_likelihood": likelihood,
        "risk_category": risk_category,
        "risk_score": round(100 - likelihood, 2),
        "model_type": "Scikit-learn Logistic Regression",
        "training_data": "Synthetic demonstration dataset",
        "confidence_note": (
            "Prototype prediction only. Model validation on real "
            "historical payment data is required before production use."
        )
    }
