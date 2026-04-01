import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FYProvider } from './context/FYContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PurchasePage from './pages/PurchasePage';
import SalesPage from './pages/SalesPage';
import ExpensePage from './pages/ExpensePage';
import AccountingPage from './pages/AccountingPage';
import LedgerPage from './pages/LedgerPage';
import InventoryPage from './pages/InventoryPage';
import GSTPage from './pages/GSTPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ImportPage from './pages/ImportPage';
import AuditLogPage from './pages/AuditLogPage';
import CustomerPage from './pages/CustomerPage';
import SupplierPage from './pages/SupplierPage';
import BankReconciliationPage from './pages/BankReconciliationPage';
import RecurringInvoicePage from './pages/RecurringInvoicePage';

const ADMIN       = ['ROLE_ADMIN'];
const ADMIN_ACC   = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT'];
const ADMIN_ACC_MGR = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_MANAGER'];
const PURCHASE_ROLES = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_PURCHASE_EXECUTIVE', 'ROLE_MANAGER'];
const SALES_ROLES    = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_EXECUTIVE', 'ROLE_MANAGER'];
const INVENTORY_ROLES = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_PURCHASE_EXECUTIVE', 'ROLE_MANAGER'];
const GST_ROLES      = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_MANAGER'];
const REPORTS_ROLES  = ['ROLE_ADMIN', 'ROLE_ACCOUNTANT', 'ROLE_SALES_EXECUTIVE', 'ROLE_MANAGER'];

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:40 }}>⏳</div>
      <div style={{ color:'#94a3b8' }}>Loading...</div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (roles && !roles.some(r => user.roles?.includes(r))) {
    return (
      <div style={{ padding:60, textAlign:'center' }}>
        <div style={{ fontSize:64 }}>🚫</div>
        <div style={{ fontSize:22, fontWeight:800, color:'#dc2626', marginTop:16 }}>Access Denied</div>
        <div style={{ fontSize:14, color:'#64748b', marginTop:8, marginBottom:24 }}>
          You don't have permission to view this page.
        </div>
        <button onClick={() => window.history.back()}
          style={{ background:'#1a4f8a', color:'white', border:'none', padding:'10px 24px', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600 }}>
          ← Go Back
        </button>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <FYProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize:13 } }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="purchase"
                element={<ProtectedRoute roles={PURCHASE_ROLES}><PurchasePage /></ProtectedRoute>} />
              <Route path="sales"
                element={<ProtectedRoute roles={SALES_ROLES}><SalesPage /></ProtectedRoute>} />
              <Route path="expense"
                element={<ProtectedRoute roles={[...ADMIN_ACC, 'ROLE_MANAGER']}><ExpensePage /></ProtectedRoute>} />
              <Route path="accounting"
                element={<ProtectedRoute roles={ADMIN_ACC_MGR}><AccountingPage /></ProtectedRoute>} />
              <Route path="ledger"
                element={<ProtectedRoute roles={ADMIN_ACC_MGR}><LedgerPage /></ProtectedRoute>} />
              <Route path="inventory"
                element={<ProtectedRoute roles={INVENTORY_ROLES}><InventoryPage /></ProtectedRoute>} />
              <Route path="gst"
                element={<ProtectedRoute roles={GST_ROLES}><GSTPage /></ProtectedRoute>} />
              <Route path="reports"
                element={<ProtectedRoute roles={REPORTS_ROLES}><ReportsPage /></ProtectedRoute>} />
              <Route path="import"
                element={<ProtectedRoute roles={ADMIN_ACC}><ImportPage /></ProtectedRoute>} />
              <Route path="settings"
                element={<ProtectedRoute roles={ADMIN_ACC}><SettingsPage /></ProtectedRoute>} />
              <Route path="users"
                element={<ProtectedRoute roles={ADMIN}><UsersPage /></ProtectedRoute>} />
              <Route path="customers"
                element={<ProtectedRoute><CustomerPage /></ProtectedRoute>} />
              <Route path="suppliers"
                element={<ProtectedRoute><SupplierPage /></ProtectedRoute>} />
              <Route path="audit"
                element={<ProtectedRoute roles={ADMIN}><AuditLogPage /></ProtectedRoute>} />
              <Route path="bank-reconciliation"
                element={<ProtectedRoute roles={ADMIN_ACC}><BankReconciliationPage /></ProtectedRoute>} />
              <Route path="recurring-invoices"
                element={<ProtectedRoute roles={ADMIN_ACC}><RecurringInvoicePage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </FYProvider>
    </AuthProvider>
  );
}

export default App;
