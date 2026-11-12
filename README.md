# PulsePay AI — Freelance OS

This package contains your original FastAPI + SQLite + PayPal Sandbox application with a refreshed light-theme frontend inspired by the eight Google Stitch references.

## What was changed

- Updated the existing frontend theme to a clean light fintech design: white sidebar and cards, soft lavender-grey surfaces, indigo accents, and distinct paid / pending / overdue colors.
- Kept the original frontend JavaScript controller intact. Existing API URLs, request formats, ML calls, PayPal order creation / approval / capture / verification flow, invoice and follow-up actions remain in the original `front-end/script.js`.
- Added the overdue invoice KPI and made the Total / Paid / Pending / Overdue KPI cards navigate to their matching invoice filters. Their values are computed from the live invoice records.
- Kept the backend Python files and SQLite database from your uploaded project unchanged.
- Kept your original `front-end/backup_legacy` folder.
- Stored the Stitch source screens, code exports and design briefs under `design-reference/stitch/`.

## Important security note

Your uploaded `.env` file is intentionally not included in this download. This prevents PayPal secrets from being copied into another archive. Copy your existing local `back-end/.env` from your original project into this package's `back-end` folder using File Explorer. Do not paste the values into chat or frontend files. A safe `.env.example` is included.

The included `back-end/invoices.db` is your uploaded local database snapshot. Keep this ZIP and database private.

## Run the website on Windows

### 1. Start the backend

1. Open `PulsePay_AI\back-end`.
2. Copy your existing `.env` file from your original project's `back-end` folder into this `back-end` folder.
3. Double-click `run_backend.bat`.
4. Keep its terminal window open. The backend is expected at `http://127.0.0.1:8001`.

For a first-time Python environment, install dependencies from this folder with:

```powershell
python -m pip install -r requirements.txt
```

### 2. Start the frontend

1. Open the extracted `PulsePay_AI_Redesigned` folder.
2. Double-click `START_REDESIGNED_FRONTEND.bat` (this starts the server from the correct `front-end` folder).
3. Keep its terminal window open.
4. Open this address in Chrome:

**http://127.0.0.1:5501/index.html#overview**

This uses port **5501** so it will not conflict with an older VS Code Live Server running on port 5500. Do not start the old project's Live Server when checking this redesigned copy.

The frontend uses Google Fonts and Tailwind's CDN for typography and utility styles, so an internet connection is needed for those CDN assets. The local app and backend still run on your computer.

## PayPal safety

No PayPal order is created by the setup scripts. No payment is attempted automatically. PayPal actions only run when you click the existing payment controls. Continue using Sandbox credentials and the existing backend flow.

## Local URL vs public hosting

`127.0.0.1` is a local address that works on your own computer; it is not a public website URL. This chat cannot publish the app to a public hosting provider. The ZIP is ready to run locally. Public hosting would require a hosting account and deployment configuration, especially for the private FastAPI backend and environment secrets.
