# BridgeLink — Car Hire Management & Profitability Dashboard (Frontend)

React + Vite + Tailwind CSS v3, Recharts, React Router, Lucide, date-fns.
Works **today** with local browser storage and demo data; designed so a real API can replace the data layer later.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pricing, balances, profit, conflicts + route smoke tests
npm run build
```
**Demo login:** `joy@vistaride.co.ke` / `vistaride123`

## What works now
Login (validation, show/hide, forgot-password modal) · Dashboard (8 KPIs vs previous period, 6 charts, 4 live lists, date filters, vehicle selector) · Bookings (auto pricing, conflict detection + authorized override, extend, return with overtime, print agreement/invoice/receipt) · Calendar · Vehicles · Income & Payments (partial payments, duplicate prevention, deposits as liabilities) · Expenses (recurring posting) · Profitability (P&L, separate cash flow, break-even calculator, estimates labelled) · Fuel & Mileage (anomaly flags) · Maintenance (date/odometer reminders) · Customers · Reports (13 reports, CSV + print-to-PDF) · Notifications · Settings.

## Where things live
- `src/lib/finance.js` — ALL money logic (pricing, profit, cash flow, break-even). Tested in `finance.test.js`.
- `src/context.jsx` — auth + data store (localStorage). **This is the swap point**: replace actions with Axios/TanStack Query calls to your Express API.
- `src/lib/seed.js` — demo data (all flagged `demo: true`; remove from Settings → Data & demo).
- `public/mazda.jpeg` — hero image (swap for a higher-resolution, dark studio shot for the login page).

## Notes
- Amounts are whole KES integers (no floating-point cents). Dates use the browser clock; target timezone Africa/Nairobi.
- Depreciation is an **estimate** (straight-line, rate per vehicle) unless you record a Depreciation expense.
- Loan principal is cash-flow only; loan interest has its own P&L line.
- Not yet built (needs backend): real JWT/cookie auth, PostgreSQL, file uploads/receipts, role-based access, true .xlsx/.pdf export.
