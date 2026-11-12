# PulsePay AI — Freelance OS

PulsePay AI is an AI-powered freelancer payment assistant built with FastAPI, SQLite, and PayPal Sandbox. It includes a refreshed light-theme frontend inspired by the eight Google Stitch design references.

## What Was Changed

- Updated the existing frontend theme to a clean light fintech design with a white sidebar and cards, soft lavender-grey surfaces, indigo accents, and distinct paid, pending, and overdue colors.
- Kept the original frontend JavaScript controller intact. Existing API URLs, request formats, ML calls, PayPal order creation, approval, capture, and verification flows, invoice actions, and follow-up actions remain in the original `front-end/script.js`.
- Added the overdue invoice KPI.
- Made the Total, Paid, Pending, and Overdue KPI cards navigate to their matching invoice filters.
- KPI values are computed from live invoice records.
- Kept the backend Python files unchanged.
- Excluded the local SQLite database from GitHub to protect private data.
- Kept the original `front-end/backup_legacy` folder.
- Stored the Stitch source screens, code exports, and design briefs under `design-reference/stitch/`.

## Important Security Note

Your actual `.env` file is intentionally excluded from this GitHub repository to protect your PayPal Sandbox credentials.

A safe `.env.example` file is included as a reference.

Before running the backend:

1. Open the `back-end` folder.
2. Make sure a local `.env` file exists in that folder.
3. If you need to create one, use `.env.example` as a guide.
4. Add your own PayPal Sandbox credentials to the local `.env` file.
5. Never upload or share your actual `.env` file.

The local `back-end/invoices.db` database is intentionally excluded from this repository. It is not published to GitHub. Keep local database files and real payment data private.

## Run the Website on Windows

### 1. Start the Backend

1. Open the `back-end` folder.
2. Make sure your local `.env` file is configured.
3. Double-click `run_backend.bat`.
4. Keep its terminal window open.

The backend is expected to run at:

`http://127.0.0.1:8001`

For a first-time Python environment, install dependencies from the backend folder:

```powershell
python -m pip install -r requirements.txt
```

### 2. Start the Frontend

1. Open the main `PulsePay_AI_Redesigned` folder.
2. Double-click `START_REDESIGNED_FRONTEND.bat`. This starts the server from the correct `front-end` folder.
3. Keep its terminal window open.
4. Open this address in Chrome:

`http://127.0.0.1:5501/index.html#overview`

This uses port `5501` so it will not conflict with an older VS Code Live Server running on port `5500`.

Do not start the old project's Live Server when checking this redesigned version.

The frontend uses Google Fonts and Tailwind CSS through CDN resources, so an internet connection is needed for those assets. The local application and backend still run on your computer.

## PayPal Safety

- No PayPal order is created by the setup scripts.
- No payment is attempted automatically.
- PayPal actions only run when you interact with the existing payment controls.
- Continue using PayPal Sandbox credentials for testing.
- Never expose your PayPal client secret in frontend files or public repositories.

## Local URL vs Public Hosting

`127.0.0.1` is a local address that works on your own computer. It is not a public website URL.

This repository contains the project source code. It does not automatically host the application online.

Public hosting requires a hosting provider and deployment configuration, especially for the private FastAPI backend and environment secrets.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.