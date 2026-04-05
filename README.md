📊 ERP System – Complete Business Management Solution

A full-stack, enterprise-grade ERP (Enterprise Resource Planning) system designed to manage end-to-end business operations including Accounting, GST, Inventory, Sales, Purchase, and Reporting.

Built with Spring Boot + React, this system provides a scalable and modular architecture suitable for small to medium businesses.

🚀 Key Highlights
🔐 Secure Authentication using JWT
📊 Real-time Analytics Dashboard
🧾 GST-Compliant Accounting System
📦 Complete Inventory & Stock Management
💰 Sales & Purchase Lifecycle Handling
🏦 Bank Reconciliation System
📈 Financial Reports & Insights
⚙️ Modular & Scalable Architecture
🎯 Core Modules
💰 Sales Management
Invoice generation system
Customer-wise sales tracking
Sales history & analytics
File: SalesPage.js
📦 Purchase Management
Supplier-based purchasing
Purchase order management
Expense tracking integration
File: PurchasePage.js
📊 Inventory Management
Real-time stock tracking
Product lifecycle management
Low stock alerts (extendable)
File: InventoryPage.js
👥 Customer & Supplier Management
Customer profiles & history
Supplier management system
Contact & transaction tracking
Files: CustomerPage.js, SupplierPage.js
🏛️ GST Compliance System
Automated tax calculation
GST-ready reports
Filing support (extendable)
File: GSTPage.js
📈 Accounting System
Journal entries
Ledger management
Trial balance system
Files: AccountingPage.js, LedgerPage.js
🏦 Bank Reconciliation
Bank statement matching
Transaction verification
Reconciliation reports
File: BankReconciliationPage.js
📉 Reports & Analytics
Financial reports generation
Business insights dashboard
Data visualization using charts
Files: ReportsPage.js, Dashboard.js
⚙️ Additional Features
Expense tracking (ExpensePage.js)
Audit logs (AuditLogPage.js)
Recurring invoices (RecurringInvoicePage.js)
Data import system (ImportPage.js)
User management (UsersPage.js)
System settings (SettingsPage.js)
Authentication (Login.js)
🛠️ Tech Stack
🔙 Backend
Java 17
Spring Boot 3.2
Spring Security + JWT Authentication
MongoDB
Spring Mail (Email सेवांसाठी)
RESTful API Architecture
🌐 Frontend
React 18
React Router
Axios (API integration)
Recharts (Data visualization)
React Hot Toast (Notifications)
React Testing Library
📁 Project Structure
ERP-System/
├── backend/
│   ├── src/main/
│   │   ├── java/com/...      # Backend source code
│   │   └── resources/        # Config files
│   └── pom.xml               # Maven configuration
│
└── frontend/
    ├── src/
    │   ├── pages/            # All major modules
    │   ├── components/       # Reusable UI components
    │   ├── services/         # API calls (Axios)
    │   ├── context/          # State management
    │   ├── styles/           # Styling files
    │   └── App.js
    └── package.json
⚙️ Getting Started
✅ Prerequisites
Java 17
Node.js (v18+)
MongoDB
Maven
🔧 Backend Setup
cd backend
mvn clean install
mvn spring-boot:run
🌐 Frontend Setup
cd frontend
npm install
npm start
🔐 Authentication Flow
User Login → JWT Token generated
Token stored in frontend
API requests authenticated using token
Role-based access control implemented
📊 Use Cases
Small business ERP
Accounting & GST system
Inventory management software
Sales & billing system
📌 Future Enhancements
📱 Mobile App Integration
☁️ Cloud Deployment (AWS / Docker)
📊 Advanced BI Dashboard
🔔 Notification सिस्टम (SMS/Email)
🌍 Multi-tenant architecture
🧠 Architecture Overview
Microservice-ready structure (extendable)
Clean separation: Controller → Service → Repository
Frontend follows component-based architecture
API-driven communication
🤝 Contributing

Contributions are welcome!

Fork the repository
Create feature branch
Commit changes
Open Pull Request
👨‍💻 Author

Narayan Shinde
🔗 GitHub: https://github.com/Narayan-Shinde

⭐ Support

If you find this project useful, please ⭐ star the repository!

🎓 Final Summary

This project is a production-ready ERP solution that demonstrates:

Full-stack development skills
Real-world business logic implementation
Secure authentication & authorization
Scalable and modular system design

