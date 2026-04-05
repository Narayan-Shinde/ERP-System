# 📊 ERP System – Complete Business Management Solution

A **full-stack ERP (Enterprise Resource Planning) system** built using **Spring Boot + React** to manage end-to-end business operations like **Accounting, GST, Inventory, Sales, Purchase, and Reporting**.

---

## 🚀 Key Highlights

- 🔐 JWT-based Authentication  
- 📊 Real-time Dashboard & Analytics  
- 🧾 GST-Compliant Accounting  
- 📦 Inventory & Stock Management  
- 💰 Sales & Purchase Management  
- 🏦 Bank Reconciliation  
- 📈 Financial Reports  

---

## 🎯 Core Modules

### 💰 Sales Management
- Invoice generation  
- Customer tracking  
- Sales analytics  
- `SalesPage.js`

### 📦 Purchase Management
- Supplier management  
- Purchase orders  
- Expense integration  
- `PurchasePage.js`

### 📊 Inventory Management
- Stock tracking  
- Product management  
- Low stock alerts (extendable)  
- `InventoryPage.js`

### 👥 Customer & Supplier
- Customer profiles  
- Supplier management  
- Contact & transaction tracking  
- `CustomerPage.js`, `SupplierPage.js`

### 🏛️ GST System
- Tax calculation  
- GST reports  
- Filing support (extendable)  
- `GSTPage.js`

### 📈 Accounting
- Journal entries  
- Ledger system  
- Trial balance  
- `AccountingPage.js`, `LedgerPage.js`

### 🏦 Bank Reconciliation
- Statement matching  
- Transaction verification  
- Reports  
- `BankReconciliationPage.js`

### 📉 Reports & Dashboard
- Financial reports  
- Charts & analytics  
- Business insights  
- `ReportsPage.js`, `Dashboard.js`

### ⚙️ Additional Features

- Expense Management  
- Audit Logs  
- Recurring Invoices  
- Data Import  
- User Management  
- System Settings  
- Authentication  

---

## 🛠️ Tech Stack

### 🔙 Backend
- Java 17  
- Spring Boot 3  
- Spring Security + JWT  
- MongoDB  
- REST APIs  

### 🌐 Frontend
- React 18  
- React Router  
- Axios  
- Recharts  
- React Hot Toast  

---

## 📁 Project Structure

```
ERP-System/
├── backend/
│   └── src/main/
│       ├── java/
│       └── resources/
│
└── frontend/
    └── src/
        ├── pages/
        ├── components/
        ├── services/
        ├── context/
        └── App.js
```

---

## ⚙️ Setup

### Backend

```
cd backend
mvn spring-boot:run
```

### Frontend

```
cd frontend
npm install
npm start
```

---

## 🔐 Authentication Flow

1. User login  
2. JWT token generated  
3. Token used in API requests  
4. Role-based access  

---

## 📌 Future Scope

- 📱 Mobile App  
- ☁️ Cloud Deployment  
- 📊 Advanced Dashboard  
- 🔔 Notifications  

---

## 👨‍💻 Author

**Narayan Shinde**  
GitHub: https://github.com/Narayan-Shinde  

---

## ⭐ Support

If you like this project, give it a ⭐
