# Validation Notes

- Backend source files (`main.py`, `payment_engine.py`, `ml_payment_model.py`) were retained byte-for-byte from the uploaded project.
- Frontend controller (`front-end/script.js`) was retained byte-for-byte from the uploaded project.
- Original HTML IDs and inline event handlers were retained; the dashboard adds `overdueInvoices`, which the existing `updateDashboard()` function already populates.
- Status KPI buttons call the existing `switchView()` and `filterInvoicesByStatus()` functions.
- Invoice status exclusivity remains controlled by the existing `getDisplayedStatus()` logic: paid first, then overdue, then pending.
- No PayPal order creation, capture, or payment action was invoked during packaging or validation.
- The `.env` file was excluded intentionally; use the existing local credentials by copying that file yourself to this package's `back-end` folder.
- Stitch design exports are preserved in `design-reference/stitch/`; the light PayPal gateway design is the selected reference for the app. The extra dark gateway export is retained only as part of the supplied reference archive.

Automated checks: HTML ID coverage, JavaScript syntax, Python syntax, backend byte hashes, frontend controller byte hash, package contents, and secret-file exclusion are checked during build. A browser-based visual preview could not be run in this sandbox because its browser runtime blocked local file/loopback navigation. Please confirm the rendered appearance after launching the package locally. This package has not been tested end-to-end against your local PayPal Sandbox account.
