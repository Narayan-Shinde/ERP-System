import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFY, FY_LIST } from '../../context/FYContext';
import '../../styles/App.css';

const A   = 'ROLE_ADMIN';
const ACC = 'ROLE_ACCOUNTANT';
const SE  = 'ROLE_SALES_EXECUTIVE';
const PE  = 'ROLE_PURCHASE_EXECUTIVE';
const MGR = 'ROLE_MANAGER';

const menuItems = [
  { section: 'Overview', items: [
    { path: '/',           label: 'Dashboard',      icon: '📊' },
  ]},
  { section: 'Transactions', items: [
    { path: '/purchase',   label: 'Purchase',       icon: '🛒', roles: [A, ACC, PE, MGR] },
    { path: '/sales',      label: 'Sales',          icon: '💰', roles: [A, ACC, SE, MGR] },
    { path: '/expense',    label: 'Expenses',       icon: '🧾', roles: [A, ACC, MGR] },
  ]},
  { section: 'Accounting', items: [
    { path: '/accounting', label: 'Vouchers',       icon: '📝', roles: [A, ACC, MGR] },
    { path: '/ledger',     label: 'Ledger',         icon: '📒', roles: [A, ACC, MGR] },
    { path: '/inventory',  label: 'Inventory',      icon: '📦', roles: [A, ACC, PE, MGR] },
    { path: '/customers',  label: 'Customers',      icon: '👥', roles: [A, ACC, SE, MGR] },
    { path: '/suppliers',  label: 'Suppliers',      icon: '🏭', roles: [A, ACC, PE, MGR] },
  ]},
  { section: 'GST & Reports', items: [
    { path: '/gst',        label: 'GST / GSTR-3B', icon: '🏛️', roles: [A, ACC, MGR] },
    { path: '/reports',    label: 'Reports & P&L', icon: '📈', roles: [A, ACC, SE, MGR] },
  ]},
  { section: 'Data Tools', items: [
    { path: '/import',             label: 'Bulk Import',       icon: '📂', roles: [A, ACC] },
    { path: '/bank-reconciliation', label: 'Bank Reconciliation',icon: '🏦', roles: [A, ACC] },
    { path: '/recurring-invoices',  label: 'Recurring Invoices', icon: '🔄', roles: [A, ACC] },
  ]},
  { section: 'Administration', items: [
    { path: '/users',      label: 'User Management',icon: '👥', roles: [A] },
    { path: '/audit',      label: 'Audit Logs',    icon: '🔍', roles: [A] },
    { path: '/settings',   label: 'Settings',      icon: '⚙️', roles: [A, ACC] },
  ]},
];

const pageTitles = {
  '/':           'Dashboard',
  '/purchase':   'Purchase Management',
  '/sales':      'Sales Management',
  '/expense':    'Expense Management',
  '/accounting': 'Accounting Vouchers',
  '/ledger':     'Ledger Accounts',
  '/inventory':  'Inventory & Stock',
  '/customers':  'Customer Management',
  '/suppliers':  'Supplier Management',
  '/gst':        'GST / GSTR-3B',
  '/reports':    'Reports & Analytics',
  '/import':     'Bulk Data Import',
  '/users':      'User Management',
  '/audit':      'Audit Logs',
  '/settings':   'Company Settings',
};

const ROLE_BADGE = {
  ROLE_ADMIN:             { label: 'Admin',              color: '#dc2626', bg: '#fee2e2' },
  ROLE_ACCOUNTANT:        { label: 'Accountant',         color: '#2563eb', bg: '#dbeafe' },
  ROLE_SALES_EXECUTIVE:   { label: 'Sales Executive',    color: '#16a34a', bg: '#d1fae5' },
  ROLE_PURCHASE_EXECUTIVE:{ label: 'Purchase Executive', color: '#d97706', bg: '#fef3c7' },
  ROLE_MANAGER:           { label: 'Manager',            color: '#7c3aed', bg: '#ede9fe' },
};

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const { selectedFY, setSelectedFY } = useFY();
  const navigate    = useNavigate();
  const location    = useLocation();
  const title       = pageTitles[location.pathname] || 'ERP System';
  const handleLogout = () => { logout(); navigate('/login'); };

  const userRole   = user?.roles?.[0];
  const roleBadge  = ROLE_BADGE[userRole] || { label: userRole?.replace('ROLE_', '') || 'User', color: '#64748b', bg: '#f1f5f9' };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ fontSize:26, marginBottom:4 }}>🏢</div>
          <h2>ERP Accounting</h2>
          <span>GST Management System</span>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(section => {
            const visibleItems = section.items.filter(item =>
              !item.roles || item.roles.some(r => hasRole(r))
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section}>
                <div className="menu-section-title">{section.section}</div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="icon">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar user info */}
        <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,0.1)', marginTop:'auto' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Logged in as</div>
          <div style={{ fontWeight:700, color:'rgba(255,255,255,0.9)', fontSize:13, marginBottom:4 }}>
            {user?.fullName || user?.username}
          </div>
          <span style={{
            background: roleBadge.bg, color: roleBadge.color,
            fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
          }}>
            {roleBadge.label}
          </span>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-header">
          <div className="page-title">🏢 {title}</div>
          <div className="header-right">
            {/* Financial Year Selector */}
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0f4ff', border:'1.5px solid #c7d2fe', borderRadius:8, padding:'4px 10px' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#1a4f8a' }}>📅 FY:</span>
              <select
                value={selectedFY.value}
                onChange={e => setSelectedFY(FY_LIST.find(f => f.value === e.target.value))}
                style={{ fontSize:12, fontWeight:700, color:'#1a4f8a', border:'none', background:'transparent', cursor:'pointer', outline:'none' }}
              >
                {FY_LIST.map(fy => (
                  <option key={fy.value} value={fy.value}>{fy.label}</option>
                ))}
              </select>
            </div>

            <div className="user-info">
              <strong>{user?.fullName || user?.username}</strong>
              <span style={{
                background: roleBadge.bg, color: roleBadge.color,
                fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10,
              }}>
                {roleBadge.label}
              </span>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="footer-left">
            © 2026 &nbsp;<strong>ERP Accounting &amp; GST Management System</strong> &nbsp;|&nbsp; <strong>Sunita Enterprise</strong>
          </div>
          <div className="footer-center">
            A Product of <strong>Prem Software India Solution</strong>
            &nbsp;|&nbsp;
            Developed by <strong>Narayan Shinde</strong>
          </div>
          <div className="footer-right">
            <a
              href="https://www.premsoftwareindiasolution.com"
              target="_blank"
              rel="noreferrer"
              style={{ color:'#2563eb', textDecoration:'none', fontWeight:600 }}
            >
              🌐 www.premsoftwareindiasolution.com
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
