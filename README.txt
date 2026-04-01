====================================================
  ERP Accounting & GST Management System
  Version 2.0 - COMPLETE
====================================================

DEFAULT LOGIN: admin / admin123

QUICK START:
1. Start MongoDB (auto starts as Windows Service)
2. Open backend/ in IntelliJ IDEA → Run ErpAccountingApplication.java
3. Open frontend/ in VS Code → npm install → npm start
4. Browser: http://localhost:3000

8 MODULES:
  1. Purchase  - Supplier, PO, Invoice, Return, GRN
  2. Sales     - Customer, SO, Invoice, Return
  3. Expense   - Expense Heads, Vouchers
  4. Accounting- Journal, Payment, Receipt, Contra (Double-Entry)
  5. Ledger    - Chart of Accounts, Date-wise Statement
  6. Inventory - Category, Items, Warehouse, Stock Movement
  7. GST       - GSTR-3B, ITC Report, HSN Config
  8. Reports   - P&L, Trial Balance, Balance Sheet, Dashboard

5 ROLES:
  ROLE_ADMIN             - Full access
  ROLE_ACCOUNTANT        - All modules except user management
  ROLE_SALES_EXECUTIVE   - Customer + Sales only
  ROLE_PURCHASE_EXECUTIVE- Supplier + Purchase + Inventory
  ROLE_MANAGER           - View-only (reports, dashboard)

TECH STACK:
  Frontend : React JS 18 + Recharts + Axios
  Backend  : Java 17 + Spring Boot 3.2 + JWT
  Database : MongoDB

See ERP_Project_Complete_Guide.docx for full guide.
====================================================
