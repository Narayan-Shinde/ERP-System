import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, ComposedChart, Area, Line
} from 'recharts';
import { getDashboard } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';
import toast from 'react-hot-toast';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = n => {
  const v = Number(n)||0;
  if (v >= 10000000) return '₹' + (v/10000000).toFixed(1) + 'Cr';
  if (v >= 100000)   return '₹' + (v/100000).toFixed(1) + 'L';
  if (v >= 1000)     return '₹' + (v/1000).toFixed(1) + 'K';
  return fmt(v);
};

const STATUS_COLOR = { PAID:'#16a34a', PARTIAL:'#d97706', PENDING:'#dc2626', CONFIRMED:'#2563eb', DRAFT:'#94a3b8' };
const STATUS_BG    = { PAID:'#d1fae5', PARTIAL:'#fef9c3', PENDING:'#fee2e2', CONFIRMED:'#dbeafe', DRAFT:'#f1f5f9' };

const ROLE_MODULES = {
  ROLE_ADMIN: [
    { icon:'🛒', label:'Purchase',    link:'/purchase',   color:'#2563eb' },
    { icon:'💰', label:'Sales',       link:'/sales',      color:'#16a34a' },
    { icon:'🧾', label:'Expenses',    link:'/expense',    color:'#d97706' },
    { icon:'📝', label:'Vouchers',    link:'/accounting', color:'#7c3aed' },
    { icon:'📒', label:'Ledger',      link:'/ledger',     color:'#0891b2' },
    { icon:'📦', label:'Inventory',   link:'/inventory',  color:'#65a30d' },
    { icon:'🏛️', label:'GST',         link:'/gst',        color:'#dc2626' },
    { icon:'📈', label:'Reports',     link:'/reports',    color:'#1a4f8a' },
    { icon:'📂', label:'Import',      link:'/import',     color:'#f59e0b' },
    { icon:'⚙️', label:'Settings',    link:'/settings',   color:'#64748b' },
    { icon:'👥', label:'Users',       link:'/users',      color:'#6d28d9' },
    { icon:'🔍', label:'Audit Logs',  link:'/audit',      color:'#0f766e' },
  ],
  ROLE_ACCOUNTANT: [
    { icon:'🛒', label:'Purchase',    link:'/purchase',   color:'#2563eb' },
    { icon:'💰', label:'Sales',       link:'/sales',      color:'#16a34a' },
    { icon:'🧾', label:'Expenses',    link:'/expense',    color:'#d97706' },
    { icon:'📝', label:'Vouchers',    link:'/accounting', color:'#7c3aed' },
    { icon:'📒', label:'Ledger',      link:'/ledger',     color:'#0891b2' },
    { icon:'📦', label:'Inventory',   link:'/inventory',  color:'#65a30d' },
    { icon:'🏛️', label:'GST',         link:'/gst',        color:'#dc2626' },
    { icon:'📈', label:'Reports',     link:'/reports',    color:'#1a4f8a' },
    { icon:'📂', label:'Import',      link:'/import',     color:'#f59e0b' },
    { icon:'⚙️', label:'Settings',    link:'/settings',   color:'#64748b' },
  ],
  ROLE_SALES_EXECUTIVE: [
    { icon:'💰', label:'Sales',       link:'/sales',      color:'#16a34a' },
    { icon:'📦', label:'Inventory',   link:'/inventory',  color:'#65a30d' },
    { icon:'📈', label:'Reports',     link:'/reports',    color:'#1a4f8a' },
  ],
  ROLE_PURCHASE_EXECUTIVE: [
    { icon:'🛒', label:'Purchase',    link:'/purchase',   color:'#2563eb' },
    { icon:'📦', label:'Inventory',   link:'/inventory',  color:'#65a30d' },
  ],
  ROLE_MANAGER: [
    { icon:'📈', label:'Reports',     link:'/reports',    color:'#1a4f8a' },
    { icon:'🏛️', label:'GST',         link:'/gst',        color:'#dc2626' },
    { icon:'🛒', label:'Purchase',    link:'/purchase',   color:'#2563eb' },
    { icon:'💰', label:'Sales',       link:'/sales',      color:'#16a34a' },
    { icon:'📦', label:'Inventory',   link:'/inventory',  color:'#65a30d' },
  ],
};

const ROLE_LABELS = {
  ROLE_ADMIN:             'System Administrator',
  ROLE_ACCOUNTANT:        'Accountant',
  ROLE_SALES_EXECUTIVE:   'Sales Executive',
  ROLE_PURCHASE_EXECUTIVE:'Purchase Executive',
  ROLE_MANAGER:           'Manager',
};

const ROLE_COLORS = {
  ROLE_ADMIN: '#dc2626', ROLE_ACCOUNTANT: '#2563eb',
  ROLE_SALES_EXECUTIVE: '#16a34a', ROLE_PURCHASE_EXECUTIVE: '#d97706', ROLE_MANAGER: '#7c3aed'
};

const ROLE_WELCOME = {
  ROLE_ADMIN:             { icon:'👑', msg:'Full system access — manage everything', color:'#dc2626' },
  ROLE_ACCOUNTANT:        { icon:'📊', msg:'Manage accounts, GST, reports & vouchers', color:'#2563eb' },
  ROLE_SALES_EXECUTIVE:   { icon:'💰', msg:'Manage customers, sales invoices & orders', color:'#16a34a' },
  ROLE_PURCHASE_EXECUTIVE:{ icon:'🛒', msg:'Manage suppliers, purchase orders & inventory', color:'#d97706' },
  ROLE_MANAGER:           { icon:'👔', msg:'View reports, GST summary & business overview', color:'#7c3aed' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats,      setStats]   = useState(null);
  const [loading,    setLoading] = useState(true);
  const [chartMode,  setChart]   = useState('bar');
  const [chartRange, setRange]   = useState(6);

  const role    = user?.roles?.[0] || 'ROLE_MANAGER';
  const modules = ROLE_MODULES[role] || ROLE_MODULES.ROLE_MANAGER;
  const rColor  = ROLE_COLORS[role]  || '#1a4f8a';
  const welcome = ROLE_WELCOME[role] || ROLE_WELCOME.ROLE_MANAGER;

  const isAdmin       = role === 'ROLE_ADMIN';
  const isAccountant  = role === 'ROLE_ACCOUNTANT';
  const isSales       = role === 'ROLE_SALES_EXECUTIVE';
  const isPurchase    = role === 'ROLE_PURCHASE_EXECUTIVE';
  const isManager     = role === 'ROLE_MANAGER';

  const canSeeFullStats  = isAdmin || isAccountant || isManager;
  const canSeeSalesStats = isAdmin || isAccountant || isSales || isManager;
  const canSeePurchStats = isAdmin || isAccountant || isPurchase || isManager;

  const { selectedFY } = useFY();

  useEffect(() => {
    setLoading(true);
    getDashboard(selectedFY.label)
      .then(r => setStats(r.data))
      .catch(() => toast.error('Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [selectedFY.label]);

  const allMonthly  = stats?.monthlyChart || [];
  const monthlyChart = allMonthly.slice(-chartRange);
  const recentSales = stats?.recentSales  || [];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:40 }}>⏳</div>
      <div style={{ color:'#94a3b8', fontSize:14 }}>Loading dashboard...</div>
    </div>
  );

  return (
    <div>

      {/* ── WELCOME BANNER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${rColor}15, ${rColor}05)`,
        border: `1px solid ${rColor}25`,
        borderLeft: `5px solid ${rColor}`,
        borderRadius: 10, padding: '16px 20px', marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#1a2744', marginBottom: 2 }}>
            {welcome.icon} Welcome, {user?.fullName || user?.username}!
          </div>
          <div style={{ fontSize: 13, color: '#64748b' }}>{welcome.msg}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            background: `${rColor}15`, color: rColor,
            border: `1px solid ${rColor}30`, padding: '5px 14px',
            borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>
            {ROLE_LABELS[role] || role.replace('ROLE_', '')}
          </span>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
      </div>

      {/* ── STAT CARDS — ROLE BASED ── */}
      {canSeeFullStats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'Total Sales',          value: stats?.totalSales,       color:'#2563eb', icon:'💰', link:'/sales' },
            { label:'Total Purchases',      value: stats?.totalPurchases,   color:'#7c3aed', icon:'🛒', link:'/purchase' },
            { label:'Total Expenses',       value: stats?.totalExpenses,    color:'#d97706', icon:'🧾', link:'/expense' },
            { label:'Gross Profit',         value: stats?.grossProfit,      color:'#16a34a', icon:'📊', link:'/reports' },
            { label:'Net Profit',           value: stats?.netProfit,        color:(stats?.netProfit||0)>=0?'#16a34a':'#dc2626', icon:'📈', link:'/reports' },
            { label:'Outstanding',          value: stats?.totalOutstanding, color:'#dc2626', icon:'⚠️', link:'/sales' },
          ].map(s => (
            <Link key={s.label} to={s.link} style={{ textDecoration:'none' }}>
              <div style={{
                background:'white', border:`1px solid ${s.color}20`,
                borderTop:`5px solid ${s.color}`, borderRadius:10,
                padding:'16px 14px', cursor:'pointer',
                boxShadow:'0 2px 8px rgba(0,0,0,0.07)', transition:'transform .18s, box-shadow .18s',
                position:'relative', overflow:'hidden',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${s.color}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.07)'; }}
              >
                <div style={{ position:'absolute', top:-10, right:-10, width:60, height:60, borderRadius:'50%', background:`${s.color}08` }} />
                <div style={{ fontSize:24, marginBottom:6 }}>{s.icon}</div>
                <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.8, marginBottom:3, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontWeight:900, color:s.color, fontSize:19, lineHeight:1 }}>{fmtShort(s.value)}</div>
                <div style={{ fontSize:10, color:`${s.color}99`, marginTop:5 }}>{fmt(s.value)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── TODAY + RECEIVABLE + PAYABLE CARDS ── */}
      {canSeeFullStats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:"Today's Sales",      value: stats?.todaySales,      color:'#0891b2', icon:'🌅', fmt:true },
            { label:"Today's Purchases",  value: stats?.todayPurchases,  color:'#7c3aed', icon:'📦', fmt:true },
            { label:'Total Receivable',   value: stats?.totalReceivable, color:'#16a34a', icon:'💳', fmt:true },
            { label:'Total Payable',      value: stats?.totalPayable,    color:'#dc2626', icon:'🏦', fmt:true },
          ].map(s => (
            <div key={s.label} style={{
              background:'white', border:`1px solid ${s.color}20`,
              borderLeft:`5px solid ${s.color}`, borderRadius:10,
              padding:'14px 16px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)',
              display:'flex', alignItems:'center', gap:14
            }}>
              <div style={{ fontSize:28, lineHeight:1 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.8, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontWeight:900, color:s.color, fontSize:18 }}>{fmtShort(s.value)}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>{fmt(s.value)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── OVERDUE ALERT BANNER ── */}
      {canSeeFullStats && (stats?.overdueCount || 0) > 0 && (
        <div style={{
          background:'#fff7ed', border:'1px solid #fed7aa',
          borderLeft:'5px solid #f97316', borderRadius:10,
          padding:'12px 18px', marginBottom:16,
          display:'flex', alignItems:'center', justifyContent:'space-between'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:24 }}>⚠️</span>
            <div>
              <div style={{ fontWeight:700, color:'#c2410c', fontSize:14 }}>
                {stats.overdueCount} Overdue Invoice{stats.overdueCount > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize:12, color:'#92400e' }}>
                Customers have not paid past their due date
              </div>
            </div>
          </div>
          <Link to="/reports" style={{
            background:'#f97316', color:'white', padding:'7px 18px',
            borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none'
          }}>
            View Aging Report →
          </Link>
        </div>
      )}

      {/* ── SALES EXECUTIVE: Sales-focused stats ── */}
      {isSales && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'My Sales (Total)',   value: stats?.totalSales,       color:'#16a34a', icon:'💰', type:'money' },
            { label:'Invoices Created',   value: stats?.salesCount||0,    color:'#2563eb', icon:'🧾', type:'count' },
            { label:'Pending Payments',   value: stats?.pendingInvoices||0,color:'#dc2626',icon:'⚠️', type:'count' },
            { label:'Outstanding Amount', value: stats?.totalOutstanding, color:'#d97706', icon:'📋', type:'money' },
          ].map(s => (
            <Link key={s.label} to="/sales" style={{ textDecoration:'none' }}>
              <div style={{
                background:'white', border:`1px solid ${s.color}20`,
                borderTop:`5px solid ${s.color}`, borderRadius:10,
                padding:'18px 16px', cursor:'pointer',
                boxShadow:'0 2px 8px rgba(0,0,0,0.07)', transition:'all .18s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform=''}
              >
                <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.8, marginBottom:4, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontWeight:900, color:s.color, fontSize:22 }}>
                  {s.type === 'money' ? fmtShort(s.value) : s.value}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── PURCHASE EXECUTIVE: Purchase-focused stats ── */}
      {isPurchase && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'Total Purchases',    value: stats?.totalPurchases,   color:'#2563eb', icon:'🛒', type:'money' },
            { label:'Purchase Invoices',  value: stats?.purchaseCount||0, color:'#7c3aed', icon:'📄', type:'count' },
            { label:'Low Stock Items',    value: stats?.lowStockCount||0, color:'#d97706', icon:'⚠️', type:'count' },
            { label:'Out of Stock',       value: stats?.outOfStockCount||0,color:'#dc2626',icon:'🔴', type:'count' },
          ].map(s => (
            <Link key={s.label} to={s.label.includes('Stock') ? '/inventory' : '/purchase'} style={{ textDecoration:'none' }}>
              <div style={{
                background:'white', border:`1px solid ${s.color}20`,
                borderTop:`5px solid ${s.color}`, borderRadius:10,
                padding:'18px 16px', cursor:'pointer',
                boxShadow:'0 2px 8px rgba(0,0,0,0.07)', transition:'all .18s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform=''}
              >
                <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.8, marginBottom:4, fontWeight:600 }}>{s.label}</div>
                <div style={{ fontWeight:900, color:s.color, fontSize:22 }}>
                  {s.type === 'money' ? fmtShort(s.value) : s.value}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── INVENTORY STATUS — Visible to Admin, Accountant, Purchase, Manager ── */}
      {(canSeePurchStats) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
          {[
            { label:'Total Items',  value: stats?.totalItems      || 0, color:'#1a4f8a', icon:'📦', bg:'#eff6ff' },
            { label:'In Stock',     value: stats?.inStockCount    || 0, color:'#16a34a', icon:'🟢', bg:'#f0fdf4' },
            { label:'Low Stock ⚠️', value: stats?.lowStockItems   || 0, color:'#d97706', icon:'🟡', bg:'#fefce8' },
            { label:'Out of Stock', value: stats?.outOfStockCount || 0, color:'#dc2626', icon:'🔴', bg:'#fef2f2' },
          ].map(s => (
            <Link key={s.label} to="/inventory" style={{ textDecoration:'none' }}>
              <div style={{
                background:s.bg, border:`1px solid ${s.color}30`,
                borderLeft:`5px solid ${s.color}`, borderRadius:8,
                padding:'12px 16px', cursor:'pointer', transition:'all .15s',
                boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
              }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform=''}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginBottom:4 }}>{s.label}</div>
                    <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
                  </div>
                  <div style={{ fontSize:28, opacity:.7 }}>{s.icon}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── CHART — Admin / Accountant / Manager ── */}
      {canSeeFullStats && (
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16, marginBottom:16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 Monthly Sales vs Purchase</span>
              <div style={{ display:'flex', gap:6 }}>
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:6, padding:2, gap:2 }}>
                  {[6,12].map(r => (
                    <button key={r} onClick={() => setRange(r)} style={{
                      fontSize:11, padding:'3px 8px', border:'none', borderRadius:4, cursor:'pointer',
                      background: chartRange===r ? '#1a4f8a' : 'transparent',
                      color: chartRange===r ? 'white' : '#64748b', fontWeight:700,
                    }}>{r}M</button>
                  ))}
                </div>
                <div style={{ display:'flex', background:'#f1f5f9', borderRadius:6, padding:2, gap:2 }}>
                  {[['bar','📊'],['line','📈']].map(([m,ic]) => (
                    <button key={m} onClick={() => setChart(m)} style={{
                      fontSize:11, padding:'3px 8px', border:'none', borderRadius:4, cursor:'pointer',
                      background: chartMode===m ? '#1a4f8a' : 'transparent',
                      color: chartMode===m ? 'white' : '#64748b', fontWeight:700,
                    }}>{ic}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="card-body">
              {monthlyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={210}>
                  {chartMode === 'bar' ? (
                    <BarChart data={monthlyChart} margin={{ top:4, right:4, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                      <XAxis dataKey="month" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:10 }} tickFormatter={v => fmtShort(v)} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
                      <Bar dataKey="sales"    fill="#2563eb" radius={[3,3,0,0]} name="Sales" />
                      <Bar dataKey="purchase" fill="#7c3aed" radius={[3,3,0,0]} name="Purchase" />
                      <Bar dataKey="profit"   fill="#16a34a" radius={[3,3,0,0]} name="Profit" />
                    </BarChart>
                  ) : (
                    <ComposedChart data={monthlyChart} margin={{ top:4, right:4, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                      <XAxis dataKey="month" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:10 }} tickFormatter={v => fmtShort(v)} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
                      <Area type="monotone" dataKey="sales"    fill="#dbeafe" stroke="#2563eb" strokeWidth={2} name="Sales" />
                      <Line type="monotone"  dataKey="purchase" stroke="#7c3aed" strokeWidth={2} dot={{ r:3 }} name="Purchase" />
                      <Line type="monotone"  dataKey="profit"   stroke="#16a34a" strokeWidth={2} dot={{ r:3 }} strokeDasharray="4 2" name="Profit" />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
                  No data yet. Start entering transactions.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">📋 Business KPIs</span></div>
            <div className="card-body">
              {[
                ['Total Sales Invoices',    stats?.salesCount || 0,           '',        '/sales'],
                ['Total Purchase Invoices', stats?.purchaseCount || 0,         '',        '/purchase'],
                ['Pending Invoices',        stats?.pendingInvoices || 0,       '#dc2626', '/sales'],
                ['Low Stock Items',         stats?.lowStockCount || 0,         '#d97706', '/inventory'],
                ['Gross Profit Margin',     stats?.totalSales > 0 ? ((stats?.grossProfit/stats?.totalSales)*100).toFixed(1)+'%':'0%', '#16a34a', '/reports'],
                ['Net Profit Margin',       stats?.totalSales > 0 ? ((stats?.netProfit/stats?.totalSales)*100).toFixed(1)+'%':'0%',   (stats?.netProfit||0)>=0?'#16a34a':'#dc2626', '/reports'],
              ].map(([label, value, color, link]) => (
                <Link key={label} to={link} style={{ textDecoration:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9', cursor:'pointer' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>{label}</span>
                    <span style={{ fontWeight:700, fontSize:13, color: color || '#1a4f8a' }}>{value}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SALES CHART — Sales Executive ── */}
      {isSales && (
        <div style={{ marginBottom:16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 Monthly Sales Trend</span>
            </div>
            <div className="card-body">
              {monthlyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
                    <XAxis dataKey="month" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:10 }} tickFormatter={v => fmtShort(v)} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Bar dataKey="sales" fill="#16a34a" radius={[3,3,0,0]} name="Sales" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>No sales data yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RECENT INVOICES — Sales/Admin/Accountant/Manager ── */}
      {canSeeSalesStats && (
        <div style={{ display:'grid', gridTemplateColumns: canSeeFullStats ? '1.4fr 1fr' : '1fr', gap:16, marginBottom:16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">🧾 Recent Sales Invoices</span>
              <Link to="/sales" style={{ fontSize:12, color:'#2563eb', textDecoration:'none', fontWeight:600 }}>View All →</Link>
            </div>
            <div className="card-body" style={{ padding:0 }}>
              {recentSales.length > 0 ? (
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['INVOICE #','CUSTOMER','DATE','AMOUNT','STATUS'].map(h => (
                        <th key={h} style={{ padding:'8px 14px', textAlign:h==='AMOUNT'?'right':'left', fontSize:11, color:'#94a3b8', fontWeight:700, letterSpacing:.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((inv, i) => (
                      <tr key={inv.id || i} style={{ borderBottom:'1px solid #f1f5f9' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background=''}
                      >
                        <td style={{ padding:'9px 14px', fontWeight:700, color:'#1a4f8a' }}>{inv.invoiceNumber || '—'}</td>
                        <td style={{ padding:'9px 14px', color:'#374151', maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inv.customerName || '—'}</td>
                        <td style={{ padding:'9px 14px', color:'#64748b', whiteSpace:'nowrap' }}>{inv.invoiceDate || '—'}</td>
                        <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#1a4f8a' }}>{fmtShort(inv.grandTotal)}</td>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{
                            background: STATUS_BG[inv.paymentStatus]   || '#f1f5f9',
                            color:      STATUS_COLOR[inv.paymentStatus] || '#64748b',
                            padding:'3px 8px', borderRadius:10, fontSize:10, fontWeight:700,
                          }}>{inv.paymentStatus || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🧾</div>
                  <div style={{ fontSize:13 }}>No invoices yet.</div>
                  <Link to="/sales" style={{ fontSize:12, color:'#2563eb', fontWeight:600 }}>Create first invoice →</Link>
                </div>
              )}
            </div>
          </div>

          {/* Alerts — Admin/Accountant/Manager only */}
          {canSeeFullStats && (
            <div className="card">
              <div className="card-header"><span className="card-title">🔔 Alerts & Notifications</span></div>
              <div className="card-body">
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {(stats?.outOfStockCount || 0) > 0 && (
                    <Link to="/inventory" style={{ textDecoration:'none' }}>
                      <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:6, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:700, color:'#991b1b', fontSize:13 }}>🔴 Out of Stock</div>
                          <div style={{ fontSize:11, color:'#b91c1c', marginTop:2 }}>{stats.outOfStockCount} items fully out of stock</div>
                        </div>
                        <span style={{ background:'#dc2626', color:'white', borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>{stats.outOfStockCount}</span>
                      </div>
                    </Link>
                  )}
                  {(stats?.lowStockCount || 0) > 0 && (
                    <Link to="/inventory" style={{ textDecoration:'none' }}>
                      <div style={{ background:'#fef9c3', border:'1px solid #fcd34d', borderRadius:6, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:700, color:'#92400e', fontSize:13 }}>⚠️ Low Stock</div>
                          <div style={{ fontSize:11, color:'#b45309', marginTop:2 }}>{stats.lowStockCount} items below reorder level</div>
                        </div>
                        <span style={{ background:'#d97706', color:'white', borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>{stats.lowStockCount}</span>
                      </div>
                    </Link>
                  )}
                  {(stats?.pendingInvoices || 0) > 0 && (
                    <Link to="/sales" style={{ textDecoration:'none' }}>
                      <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:6, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div>
                          <div style={{ fontWeight:700, color:'#1e40af', fontSize:13 }}>💸 Payment Pending</div>
                          <div style={{ fontSize:11, color:'#2563eb', marginTop:2 }}>{stats.pendingInvoices} invoices awaiting payment</div>
                        </div>
                        <span style={{ background:'#2563eb', color:'white', borderRadius:'50%', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>{stats.pendingInvoices}</span>
                      </div>
                    </Link>
                  )}
                  {!(stats?.lowStockCount) && !(stats?.outOfStockCount) && !(stats?.pendingInvoices) && (
                    <div style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>
                      <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                      <div style={{ fontSize:13 }}>All clear! No pending alerts.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FY SUMMARY — Admin/Accountant/Manager ── */}
      {canSeeFullStats && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header"><span className="card-title">📅 Financial Year Summary</span></div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
              {[
                { label:'Total Revenue',     value: stats?.totalSales,     bar:1,            color:'#2563eb' },
                { label:'Total Cost (COGS)', value: stats?.totalPurchases, bar: stats?.totalSales > 0 ? stats.totalPurchases/stats.totalSales : 0, color:'#7c3aed' },
                { label:'Total Expenses',    value: stats?.totalExpenses,  bar: stats?.totalSales > 0 ? stats.totalExpenses/stats.totalSales : 0,  color:'#d97706' },
                { label:'Net Profit',        value: stats?.netProfit,      bar: stats?.totalSales > 0 ? Math.max(0,(stats.netProfit||0)/stats.totalSales) : 0, color:'#16a34a' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                    <span style={{ fontSize:12, color:'#475569' }}>{s.label}</span>
                    <span style={{ fontWeight:700, color:s.color, fontSize:12 }}>{fmtShort(s.value)}</span>
                  </div>
                  <div style={{ height:6, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,(s.bar||0)*100)}%`, background:s.color, borderRadius:3, transition:'width .5s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TOP CUSTOMERS & SUPPLIERS ── */}
      {canSeeFullStats && stats?.topCustomers?.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header"><span className="card-title">🏆 Top Customers</span></div>
            <div className="card-body" style={{ padding:'10px 16px' }}>
              {(stats.topCustomers||[]).map((c,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom: i < (stats.topCustomers.length-1) ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:'#2563eb', color:'white', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{i+1}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{c.name}</span>
                  </div>
                  <span style={{ fontWeight:700, color:'#16a34a', fontSize:13 }}>{fmtShort(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginBottom:0 }}>
            <div className="card-header"><span className="card-title">🏭 Top Suppliers</span></div>
            <div className="card-body" style={{ padding:'10px 16px' }}>
              {(stats.topSuppliers||[]).map((s,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom: i < (stats.topSuppliers.length-1) ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:'#7c3aed', color:'white', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>{i+1}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{s.name}</span>
                  </div>
                  <span style={{ fontWeight:700, color:'#dc2626', fontSize:13 }}>{fmtShort(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOW STOCK LIST ── */}
      {canSeeFullStats && stats?.lowStockList?.length > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-header">
            <span className="card-title">⚠️ Low Stock Alert</span>
            <Link to="/inventory" style={{ fontSize:12, color:'#2563eb', textDecoration:'none', fontWeight:600 }}>View All →</Link>
          </div>
          <div className="card-body" style={{ padding:0 }}>
            <div className="table-container">
              <table>
                <thead><tr><th>Item Name</th><th style={{textAlign:'right'}}>Current Stock</th><th style={{textAlign:'right'}}>Reorder Level</th><th>Unit</th><th>Status</th></tr></thead>
                <tbody>
                  {(stats.lowStockList||[]).map((item,i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:600 }}>{item.itemName}</td>
                      <td style={{ textAlign:'right', fontWeight:700, color: item.currentStock <= 0 ? '#dc2626' : '#d97706' }}>{item.currentStock}</td>
                      <td style={{ textAlign:'right', color:'#64748b' }}>{item.reorderLevel}</td>
                      <td>{item.unit}</td>
                      <td><span style={{ background: item.currentStock <= 0 ? '#fee2e2' : '#fef9c3', color: item.currentStock <= 0 ? '#dc2626' : '#92400e', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700 }}>{item.currentStock <= 0 ? '🔴 Out of Stock' : '⚠️ Low Stock'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:16}}>
        {[
          {label:'+ New Sale Invoice', link:'/sales', icon:'🧾', bg:'#2563eb'},
          {label:'+ New Purchase',     link:'/purchase', icon:'📦', bg:'#7c3aed'},
          {label:'+ New Expense',      link:'/expense',  icon:'💸', bg:'#dc2626'},
          {label:'+ Add Item',         link:'/inventory', icon:'📋', bg:'#059669'},
          {label:'View Reports',       link:'/reports',  icon:'📊', bg:'#0284c7'},
          {label:'GST Reports',        link:'/gst',      icon:'📤', bg:'#d97706'},
        ].map(a=>(
          <Link key={a.label} to={a.link} style={{textDecoration:'none'}}>
            <div style={{background:a.bg,color:'#fff',borderRadius:8,padding:'12px 14px',
              display:'flex',alignItems:'center',gap:8,fontWeight:700,fontSize:13,cursor:'pointer',
              transition:'all .15s',boxShadow:'0 2px 6px rgba(0,0,0,0.12)'}}
              onMouseEnter={e=>{e.currentTarget.style.opacity='0.88';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.opacity='1';e.currentTarget.style.transform='';}}>
              <span style={{fontSize:18}}>{a.icon}</span>{a.label}
            </div>
          </Link>
        ))}
      </div>

      {/* ── QUICK ACCESS — Role-filtered modules ── */}
      <div className="card">
        <div className="card-header"><span className="card-title">⚡ Quick Access</span></div>
        <div className="card-body">
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(modules.length, 6)},1fr)`, gap:10 }}>
            {modules.map(m => (
              <Link key={m.label} to={m.link} style={{ textDecoration:'none' }}>
                <div style={{
                  background:`${m.color}08`, border:`2px solid ${m.color}25`,
                  borderRadius:8, padding:'14px 8px', textAlign:'center',
                  color:m.color, fontSize:11, fontWeight:700, cursor:'pointer', transition:'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${m.color}18`; e.currentTarget.style.transform='translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background=`${m.color}08`; e.currentTarget.style.transform=''; }}
                >
                  <div style={{ fontSize:22, marginBottom:5 }}>{m.icon}</div>
                  {m.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
