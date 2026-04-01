import React, { useState, useEffect } from 'react';
import {
  getCustomers, addCustomer, updateCustomer, deleteCustomer,
  getCustomerLedger, getCustomerInvoices,
  checkCreditLimit, getOverdueCustomers, getCustomerSummary
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const fmt  = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => (Number(n)||0).toLocaleString('en-IN');

const CUSTOMER_CATEGORIES = ['Regular','Retail','Wholesale','VIP','Dealer','Distributor','Government','Export'];
const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','J&K','Ladakh'];

export default function CustomerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';

  const [tab, setTab]             = useState('list');
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [overdue, setOverdue]     = useState([]);
  const [loading, setLoading]     = useState(false);

  // Search / filter
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [balFilter, setBalFilter] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(null);
  const [form, setForm]           = useState({});
  const [formTab, setFormTab]     = useState('basic');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Ledger
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [ledgerData,     setLedgerData]     = useState(null);
  const [ledgerFrom,     setLedgerFrom]     = useState('');
  const [ledgerTo,       setLedgerTo]       = useState('');
  const [ledgerLoading,  setLedgerLoading]  = useState(false);

  // History
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [historyData,     setHistoryData]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cR, sR] = await Promise.all([getCustomers(), getCustomerSummary()]);
      setCustomers(cR.data||[]);
      setSummary(sR.data||null);
    } catch { toast.error('Failed to load customers'); }
    setLoading(false);
  };

  const loadOverdue = async () => {
    try { const r = await getOverdueCustomers(); setOverdue(r.data||[]); }
    catch { toast.error('Failed to load overdue'); }
  };

  // ─── PAYMENT REMINDER ───
  const buildReminderMessage = (o) => {
    const amt = '\u20b9' + Number(o.overdueAmount).toLocaleString('en-IN', {minimumFractionDigits:2});
    return `Dear ${o.customerName},\n\nThis is a friendly reminder that your payment of ${amt} is overdue by ${o.maxDaysOverdue} days (${o.overdueInvoices} invoice${o.overdueInvoices>1?'s':''}).\n\nKindly clear the outstanding amount at the earliest.\n\nThank you for your business!\n\n— Accounts Team`;
  };
  const sendWhatsAppReminder = (o) => {
    const msg = encodeURIComponent(buildReminderMessage(o));
    const phone = (o.whatsapp || o.phone || '').replace(/\D/g,'');
    const indiaPhone = phone.startsWith('91') ? phone : '91' + phone;
    window.open(`https://wa.me/${indiaPhone}?text=${msg}`, '_blank');
  };
  const copyReminderMessage = (o) => {
    navigator.clipboard.writeText(buildReminderMessage(o));
    toast.success('Message copied to clipboard!');
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab==='overdue') loadOverdue(); }, [tab]);

  // ─── CRUD ───
  // Normalize: lowercase + single spaces
  const normName = s => s?.toLowerCase().trim().replace(/\s+/g, ' ') || '';

  const saveCustomer = async () => {
    const name = form.customerName?.trim();
    // ── Required fields ──
    if (!name)              { toast.error('Customer name required aahe!'); return; }
    if (!form.phone?.trim()){ toast.error('Phone number required aahe!');  return; }

    // ── Phone: 10 digits, starts 6-9 ──
    const phone = form.phone.trim().replace(/[\s\-()]/g,'');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Phone invalid! 10 digits, 6-9 se start honyapahijhe. Got: '+form.phone); return;
    }

    // ── Email pattern ──
    if (form.email?.trim()) {
      if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
        toast.error('Email address invalid! Got: '+form.email); return;
      }
    }

    // ── GSTIN: 15 chars, valid pattern ──
    if (form.gstin?.trim()) {
      const g = form.gstin.trim().toUpperCase();
      if (g.length !== 15) { toast.error('GSTIN exactly 15 characters cha hava! Got '+g.length); return; }
      if (!/^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
        toast.error('GSTIN format invalid! Example: 27AABCU9603R1ZX'); return;
      }
    }

    // ── PAN: valid pattern ──
    if (form.pan?.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.trim().toUpperCase())) {
        toast.error('PAN format invalid! Example: ABCDE1234F'); return;
      }
    }

    // ── Pincode: 6 digits ──
    if (form.pincode?.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      toast.error('Pincode 6 digits cha hava!'); return;
    }

    // ── Duplicate name check (frontend — add + edit both) ──
    const dupName = customers.find(c =>
      (normName(c.customerName)===normName(name) || normName(c.name)===normName(name))
      && c.id !== form.id  // exclude self on edit
    );
    if (dupName) { toast.error('Customer "'+name+'" already exists! Duplicate nahi chalnar.'); return; }
    if (!form.id) {
      // Duplicate phone check
      const dupPhone = customers.find(c => c.phone?.replace(/[\s\-()]/g,'')===phone);
      if (dupPhone) { toast.error('Phone '+phone+' already registered: '+dupPhone.customerName); return; }
      // Duplicate email check
      if (form.email?.trim()) {
        const dupEmail = customers.find(c => c.email?.toLowerCase()===form.email.trim().toLowerCase());
        if (dupEmail) { toast.error('Email "'+form.email+'" already registered: '+dupEmail.customerName); return; }
      }
      // Duplicate GSTIN check
      if (form.gstin?.trim()) {
        const dupGstin = customers.find(c =>
          c.gstin?.toUpperCase()===form.gstin.trim().toUpperCase() && c.id !== form.id);
        if (dupGstin) { toast.error('GSTIN already registered: '+dupGstin.customerName); return; }
      }
    }

    try {
      const payload = {...form, phone, customerName: name, name};
      if (form.id) await updateCustomer(form.id, payload);
      else         await addCustomer(payload);
      toast.success(form.id ? '✅ Customer updated!' : '✅ Customer added!');
      setShowModal(null); setForm({});
      load();
    } catch(e) { toast.error(e.response?.data?.error || e.message || 'Failed to save'); }
  };

  const deleteCust = async () => {
    try {
      await deleteCustomer(confirmDelete.id);
      toast.success('Customer deactivated');
      setConfirmDelete(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Cannot delete'); }
  };

  // ─── LEDGER ───
  const openLedger = async (cust, from, to) => {
    setLedgerCustomer(cust);
    setLedgerLoading(true);
    try {
      const params = {};
      if (from) params.fromDate = from;
      if (to)   params.toDate   = to;
      const r = await getCustomerLedger(cust.id, params);
      setLedgerData(r.data);
    } catch { toast.error('Failed to load ledger'); }
    setLedgerLoading(false);
  };

  const printLedger = () => {
    if (!ledgerData) return;
    const w = window.open('', '_blank');
    const rows = (ledgerData.rows||[]).map(r => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:6px 8px;font-size:11px">${r.date||'—'}</td>
        <td style="padding:6px 8px;font-size:11px">${r.type||'—'}</td>
        <td style="padding:6px 8px;font-size:11px">${r.reference||'—'}</td>
        <td style="padding:6px 8px;font-size:11px;color:#555">${r.narration||'—'}</td>
        <td style="padding:6px 8px;text-align:right;font-size:11px;color:#2563eb">${r.debit>0?'₹'+Number(r.debit).toLocaleString('en-IN',{minimumFractionDigits:2}):''}</td>
        <td style="padding:6px 8px;text-align:right;font-size:11px;color:#16a34a">${r.credit>0?'₹'+Number(r.credit).toLocaleString('en-IN',{minimumFractionDigits:2}):''}</td>
        <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:700">${'₹'+Number(r.balance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
      </tr>`).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>Customer Ledger</title>
    <style>body{font-family:Arial;font-size:12px;margin:20px}h2{color:#1a4f8a}table{width:100%;border-collapse:collapse}th{background:#1a4f8a;color:white;padding:8px;font-size:11px;text-align:left}.footer{margin-top:20px;font-size:10px;color:#94a3b8;text-align:center}@media print{button{display:none}}</style>
    </head><body>
    <h2>Customer Ledger Statement</h2>
    <div style="display:flex;gap:24;margin-bottom:16px;font-size:12px">
      <div><strong>Customer:</strong> ${ledgerData.customerName}</div>
      <div style="margin-left:24px"><strong>Code:</strong> ${ledgerData.customerCode||'—'}</div>
      <div style="margin-left:24px"><strong>Phone:</strong> ${ledgerData.phone||'—'}</div>
      <div style="margin-left:24px"><strong>GSTIN:</strong> ${ledgerData.gstin||'—'}</div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Narration</th><th style="text-align:right">Debit (Dr)</th><th style="text-align:right">Credit (Cr)</th><th style="text-align:right">Balance</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#f8fafc;font-weight:700">
        <td colspan="4" style="padding:8px;font-size:12px">CLOSING BALANCE</td>
        <td style="padding:8px;text-align:right;color:#2563eb">₹${Number(ledgerData.totalDebit||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="padding:8px;text-align:right;color:#16a34a">₹${Number(ledgerData.totalCredit||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
        <td style="padding:8px;text-align:right;color:#dc2626">₹${Number(ledgerData.closingBalance||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
      </tr></tfoot>
    </table>
    <div class="footer">Generated on ${new Date().toLocaleString('en-IN')} | Powered by Prem Software India Solution</div>
    <br><button onclick="window.print()" style="padding:8px 20px;background:#1a4f8a;color:white;border:none;border-radius:6px;cursor:pointer">🖨️ Print</button>
    </body></html>`);
    w.document.close();
  };

  // ─── PURCHASE HISTORY ───
  const openHistory = async (cust) => {
    setHistoryCustomer(cust);
    try {
      const r = await getCustomerInvoices(cust.id);
      setHistoryData(r.data);
    } catch { toast.error('Failed to load history'); }
  };

  // ─── FILTERS ───
  const filtered = customers.filter(c => {
    if (catFilter && c.category !== catFilter) return false;
    if (balFilter === 'outstanding' && c.currentBalance <= 0) return false;
    if (balFilter === 'credit'      && c.currentBalance >= 0) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.customerName||'').toLowerCase().includes(s)
          || (c.phone||'').includes(s)
          || (c.customerCode||'').toLowerCase().includes(s)
          || (c.gstin||'').toLowerCase().includes(s)
          || (c.city||'').toLowerCase().includes(s);
    }
    return true;
  });

  const TABS = [
    {key:'list',     label:'👥 Customers'},
    {key:'overdue',  label:`⚠️ Overdue (${overdue.length})`},
  ];

  return (
    <>
    <div>
      {/* ── STAT CARDS ── */}
      {summary && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
          {[
            ['Total Customers', fmtN(summary.totalCustomers||0), '#2563eb','👥'],
            ['Outstanding',     fmt(summary.totalOutstanding||0), '#dc2626','💳'],
            ['Overdue',         fmtN(summary.overdueCustomers||0), '#d97706','⚠️'],
            ['Active',          fmtN(summary.activeCustomers||0),  '#16a34a','✅'],
          ].map(([l,v,c,ic])=>(
            <div key={l} style={{background:'white',borderTop:`4px solid ${c}`,borderRadius:10,padding:'12px 16px',boxShadow:'0 2px 6px rgba(0,0,0,0.06)',border:`1px solid ${c}20`}}>
              <div style={{fontSize:22,marginBottom:4}}>{ic}</div>
              <div style={{fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1}}>{l}</div>
              <div style={{fontWeight:800,color:c,fontSize:20,marginTop:2}}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'2px solid #e2e8f0'}}>
        {TABS.map(({key,label})=>(
          <div key={key} onClick={()=>setTab(key)}
            style={{padding:'8px 18px',cursor:'pointer',fontSize:13,fontWeight:tab===key?700:500,
              color:tab===key?'#1a4f8a':'#64748b',borderBottom:tab===key?'2px solid #1a4f8a':'2px solid transparent',
              marginBottom:-2,whiteSpace:'nowrap'}}>
            {label}
          </div>
        ))}
      </div>

      {/* ══════════ CUSTOMER LIST ══════════ */}
      {tab==='list' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">👥 Customer Master</span>
            <button className="btn btn-primary" onClick={()=>{setForm({creditLimit:0,creditDays:30,paymentReminderDays:7,balanceType:'DEBIT'});setFormTab('basic');setShowModal('cust');}}>
              + Add Customer
            </button>
          </div>
          <div className="card-body">
            {/* Filters */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'center'}}>
              <input placeholder="🔍 Search name, phone, code, city, GSTIN..."
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{height:32,fontSize:12,minWidth:260,padding:'0 10px',border:'1.5px solid #e2e8f0',borderRadius:6,outline:'none'}}
                onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                style={{height:32,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Categories</option>
                {CUSTOMER_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <select value={balFilter} onChange={e=>setBalFilter(e.target.value)}
                style={{height:32,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Balance</option>
                <option value="outstanding">💳 Outstanding</option>
                <option value="credit">💰 Credit Balance</option>
              </select>
              <button className="btn btn-outline" style={{height:32,fontSize:12}} onClick={()=>{setSearch('');setCatFilter('');setBalFilter('');}}>✕ Clear</button>
              <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>{filtered.length} customers</span>
            </div>

            {loading ? (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}><div style={{fontSize:32}}>⏳</div><div style={{marginTop:8}}>Loading...</div></div>
            ) : filtered.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Customer</th><th>Phone</th><th>City</th>
                      <th>GSTIN</th><th>Category</th>
                      <th className="text-right">Credit Limit</th>
                      <th className="text-right">Balance</th>
                      <th style={{minWidth:220}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c,i)=>{
                      const isOverLimit = c.creditLimit > 0 && c.currentBalance > c.creditLimit;
                      return (
                        <tr key={c.id} style={{background: isOverLimit ? '#fff1f2' : 'white'}}>
                          <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                          <td>
                            <div style={{fontWeight:600,fontSize:13}}>{c.customerName}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{c.customerCode}</div>
                          </td>
                          <td style={{fontSize:12}}>{c.phone}</td>
                          <td style={{fontSize:12,color:'#64748b'}}>{c.city||'—'}</td>
                          <td style={{fontSize:11,fontFamily:'monospace',color:'#64748b'}}>{c.gstin||'—'}</td>
                          <td>
                            {c.category && (
                              <span style={{background:'#eff6ff',color:'#1d4ed8',padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:600}}>
                                {c.category}
                              </span>
                            )}
                          </td>
                          <td className="text-right" style={{fontSize:12}}>
                            {c.creditLimit > 0 ? fmt(c.creditLimit) : <span style={{color:'#94a3b8',fontSize:11}}>No limit</span>}
                            {isOverLimit && <div style={{fontSize:10,color:'#dc2626',fontWeight:700}}>⚠️ Over Limit!</div>}
                          </td>
                          <td className="text-right">
                            <span style={{fontWeight:700,fontSize:13,color:c.currentBalance>0?'#dc2626':c.currentBalance<0?'#16a34a':'#64748b'}}>
                              {fmt(Math.abs(c.currentBalance))}
                            </span>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{c.currentBalance>0?'Dr (Receivable)':c.currentBalance<0?'Cr (Advance)':'Nil'}</div>
                          </td>
                          <td>
                            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#2563eb',color:'#2563eb'}}
                                onClick={()=>{setForm({...c});setFormTab('basic');setShowModal('cust');}}>✏️ Edit</button>
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#7c3aed',color:'#7c3aed'}}
                                onClick={()=>{setLedgerFrom('');setLedgerTo('');openLedger(c,'','');setShowModal('ledger');}}>📒 Ledger</button>
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#059669',color:'#059669'}}
                                onClick={()=>{openHistory(c);setShowModal('history');}}>📋 History</button>
                              {isAdmin && (
                                <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#dc2626',color:'#dc2626'}}
                                  onClick={()=>setConfirmDelete(c)}>🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>👥</div>
                <div style={{fontWeight:600}}>{search||catFilter||balFilter ? 'No customers match the filter' : 'No customers yet'}</div>
                <div style={{fontSize:12,marginTop:4}}>{!search&&!catFilter&&!balFilter&&'Click "+ Add Customer" to start'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ OVERDUE TAB ══════════ */}
      {tab==='overdue' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚠️ Overdue Receivables</span>
            <button className="btn btn-outline" style={{fontSize:12}} onClick={loadOverdue}>🔄 Refresh</button>
          </div>
          <div className="card-body">
            {overdue.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>#</th><th>Customer</th><th>Phone</th><th className="text-right">Overdue Amount</th><th className="text-right">Interest @18%</th><th className="text-right">Total</th><th className="text-right">Invoices</th><th className="text-right">Days Overdue</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {overdue.map((o,i)=>(
                      <tr key={o.customerId} style={{background: o.maxDaysOverdue > 60 ? '#fff1f2' : o.maxDaysOverdue > 30 ? '#fffbeb' : 'white'}}>
                        <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                        <td><div style={{fontWeight:600}}>{o.customerName}</div><div style={{fontSize:10,color:'#94a3b8'}}>{o.customerCode}</div></td>
                        <td style={{fontSize:12}}>{o.phone}</td>
                        <td className="text-right"><span style={{fontWeight:700,color:'#dc2626',fontSize:14}}>{fmt(o.overdueAmount)}</span></td>
                        <td className="text-right" style={{fontSize:12,color:'#d97706'}}>{o.interestAmount>0?fmt(o.interestAmount):'—'}</td>
                        <td className="text-right" style={{fontSize:13,fontWeight:700,color:'#7c3aed'}}>{o.totalWithInterest>0?fmt(o.totalWithInterest):fmt(o.overdueAmount)}</td>
                        <td className="text-right" style={{fontSize:12}}>{o.overdueInvoices}</td>
                        <td className="text-right">
                          <span style={{fontWeight:700,fontSize:13,color:o.maxDaysOverdue>60?'#dc2626':o.maxDaysOverdue>30?'#d97706':'#374151'}}>
                            {o.maxDaysOverdue} days
                          </span>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#25d366',color:'#25d366'}}
                              onClick={()=>sendWhatsAppReminder(o)}
                              title={`Send WhatsApp reminder to ${o.phone}`}>
                              📲 WhatsApp
                            </button>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#64748b',color:'#64748b'}}
                              onClick={()=>copyReminderMessage(o)}
                              title="Copy reminder message to clipboard">
                              📋 Copy Msg
                            </button>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#7c3aed',color:'#7c3aed'}}
                              onClick={()=>{setLedgerFrom('');setLedgerTo('');openLedger({id:o.customerId,customerName:o.customerName},'','');setShowModal('ledger');}}>
                              📒 Ledger
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div style={{fontWeight:600,color:'#16a34a'}}>No overdue receivables!</div>
                <div style={{fontSize:12,marginTop:4}}>All payments are up to date.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ═════════ ADD / EDIT CUSTOMER MODAL ═════════ */}
    {showModal==='cust' && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:660,maxHeight:'90vh',overflowY:'auto'}}>
          <div className="modal-header">
            <h3 style={{margin:0}}>{form.id ? '✏️ Edit Customer' : '➕ Add Customer'}</h3>
            <button className="modal-close" onClick={()=>setShowModal(null)}>×</button>
          </div>
          {/* Sub-tabs */}
          <div style={{display:'flex',borderBottom:'2px solid #e2e8f0',padding:'0 20px',background:'#f8fafc'}}>
            {[['basic','👤 Basic'],['address','📍 Address'],['financial','💲 Financial'],['credit','🏦 Credit']].map(([k,l])=>(
              <div key={k} onClick={()=>setFormTab(k)}
                style={{padding:'8px 12px',cursor:'pointer',fontSize:12,fontWeight:formTab===k?700:500,
                  color:formTab===k?'#1a4f8a':'#64748b',borderBottom:formTab===k?'2px solid #1a4f8a':'2px solid transparent',
                  marginBottom:-2,whiteSpace:'nowrap'}}>
                {l}
              </div>
            ))}
          </div>
          <div className="modal-body">

            {/* BASIC */}
            {formTab==='basic' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Code</label>
                  <input value={form.customerCode||''} readOnly placeholder="Auto-generated"
                    style={{background:'#f8fafc',color:'#64748b',cursor:'not-allowed'}}/>
                </div>
                <div className="form-group">
                  <label>Customer Name <span style={{color:'#dc2626'}}>*</span></label>
                  <input value={form.customerName||''} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="Full name"/>
                </div>
                <div className="form-group">
                  <label>Phone <span style={{color:'#dc2626'}}>*</span></label>
                  <input value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="10-digit mobile"/>
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input value={form.whatsapp||''} onChange={e=>setForm({...form,whatsapp:e.target.value})} placeholder="WhatsApp number"/>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@example.com"/>
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input value={form.contactPerson||''} onChange={e=>setForm({...form,contactPerson:e.target.value})} placeholder="Owner / Manager name"/>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option value="">-- Select Category --</option>
                    {CUSTOMER_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>GSTIN</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input value={form.gstin||''} onChange={async e=>{
                        const g = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
                        setForm(f=>({...f,gstin:g}));
                        // Auto-trigger verify when 15 chars entered (like Swipe)
                        if (g.length===15 && /^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) {
                          const toastId = toast.loading('🔍 GSTIN verify hotoy...');
                          try {
                            const {verifyGSTIN} = await import('../services/api');
                            const r = await verifyGSTIN(g);
                            const d = r.data;
                            toast.dismiss(toastId);
                            if (d.cancelled) { toast.error('⚠️ GSTIN Cancelled/Inactive!'); return; }
                            const updates = {};
                            if (d.name) { updates.customerName = d.name; updates.name = d.name; }
                            if (d.legalName) updates.legalName = d.legalName;
                            const addrStr = d.fullAddr || [d.street,d.locality].filter(Boolean).join(', ');
                            if (addrStr)    updates.address  = addrStr;
                            if (d.district||d.city) updates.city = d.district||d.city;
                            if (d.state)    updates.state    = d.state;
                            if (d.pincode)  updates.pincode  = d.pincode;
                            if (d.pan)      updates.pan      = d.pan;
                            setForm(f=>({...f, gstin:g, ...updates}));
                            if (d.name) toast.success('✅ Auto-filled: '+d.name+(d.state?' | '+d.state:''));
                            else toast('ℹ️ GSTIN valid. State: '+(d.stateName||d.state)+' | PAN: '+d.pan,{icon:'✅'});
                          } catch(e){ toast.dismiss(toastId); }
                        }
                      }}
                      placeholder="15-char GSTIN — auto-fills name & address" maxLength={15} style={{flex:1}}/>
                    <button type="button" className="btn btn-sm btn-outline"
                      style={{whiteSpace:'nowrap',fontSize:11}}
                      onClick={async()=>{
                        if(!form.gstin||form.gstin.trim().length!==15){toast.error('GSTIN exactly 15 characters cha hava!');return;}
                        const toastId = toast.loading('GSTIN verify hotoy...');
                        try {
                          const {verifyGSTIN} = await import('../services/api');
                          const r = await verifyGSTIN(form.gstin);
                          const d = r.data;
                          toast.dismiss(toastId);
                          if(d.cancelled) {
                            toast.error('⚠️ GSTIN Cancelled/Inactive aahe! Proceed with caution.');
                            return;
                          }
                          // ── AUTO-FILL: name, address, city, state, pincode ──
                          const updates = {};
                          if (d.name) {
                            updates.customerName = d.name;
                            updates.name         = d.name;  // legacy field
                          }
                          if (d.legalName)  updates.legalName = d.legalName;
                          if (d.tradeName)  updates.tradeName = d.tradeName;
                          // Address — use fullAddr or build from parts
                          const addrStr = d.fullAddr || [d.street, d.locality].filter(Boolean).join(', ');
                          if (addrStr)      updates.address   = addrStr;
                          if (d.district||d.city) updates.city = d.district || d.city;
                          if (d.state)      updates.state     = d.state;
                          if (d.pincode)    updates.pincode   = d.pincode;
                          if (d.pan)        updates.pan       = d.pan;
                          setForm(f => ({...f, ...updates}));
                          if (d.name) {
                            toast.success('✅ GSTIN Verified! Auto-filled:\n' + d.name + (d.state ? ' | ' + d.state : '') + (d.district ? ' | ' + d.district : ''));
                          } else if (d.note) {
                            toast('⚠️ ' + d.note, {icon:'ℹ️'});
                          } else {
                            toast.success('✅ GSTIN Valid | State: ' + (d.stateName||d.state) + ' | PAN: ' + d.pan);
                          }
                        } catch(e){ toast.dismiss(toastId); toast.error(e.message||'Verify failed'); }
                      }}>🔍 Verify</button>
                  </div>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Notes</label>
                  <textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}
                    rows={2} style={{resize:'vertical',fontSize:12}} placeholder="Any special notes..."/>
                </div>
              </div>
            )}

            {/* ADDRESS */}
            {formTab==='address' && (
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Address</label>
                  <textarea value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}
                    rows={2} style={{resize:'vertical',fontSize:12}} placeholder="Street, Area, Building..."/>
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select value={form.state||''} onChange={e=>setForm({...form,state:e.target.value})}>
                    <option value="">-- Select State --</option>
                    {INDIAN_STATES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input value={form.pincode||''} onChange={e=>setForm({...form,pincode:e.target.value})} maxLength={6} placeholder="6 digits"/>
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input value={form.country||'India'} onChange={e=>setForm({...form,country:e.target.value})}/>
                </div>
                <div className="form-group" style={{display:'flex',alignItems:'center',gap:8,gridColumn:'1/-1'}}>
                  <input type="checkbox" checked={form.isInterState||false} onChange={e=>setForm({...form,isInterState:e.target.checked})} style={{width:16,height:16}}/>
                  <label style={{marginBottom:0,fontWeight:500}}>Inter-State Customer (IGST applicable)</label>
                </div>
              </div>
            )}

            {/* FINANCIAL */}
            {formTab==='financial' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Opening Balance (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.openingBalance||0}
                    onChange={e=>setForm({...form,openingBalance:Number(e.target.value)})}/>
                </div>
                <div className="form-group">
                  <label>Balance Type</label>
                  <select value={form.balanceType||'DEBIT'} onChange={e=>setForm({...form,balanceType:e.target.value})}>
                    <option value="DEBIT">Debit (Customer owes us)</option>
                    <option value="CREDIT">Credit (We owe customer)</option>
                  </select>
                </div>
                {form.id && (
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <div style={{background:'#f0f4ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 14px',fontSize:12}}>
                      <strong>Current Balance: </strong>
                      <span style={{color:form.currentBalance>0?'#dc2626':'#16a34a',fontWeight:700,fontSize:14}}>
                        {fmt(Math.abs(form.currentBalance||0))} {form.currentBalance>0?'Dr':'Cr'}
                      </span>
                      <div style={{color:'#64748b',marginTop:4,fontSize:11}}>Balance is auto-calculated from invoices and payments. Opening balance change will be applied on save.</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CREDIT */}
            {formTab==='credit' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Credit Limit (₹)</label>
                  <input type="number" min="0" step="100" value={form.creditLimit||0}
                    onChange={e=>setForm({...form,creditLimit:Number(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Set 0 for no credit limit</div>
                </div>
                <div className="form-group">
                  <label>Credit Days</label>
                  <input type="number" min="0" max="365" value={form.creditDays||30}
                    onChange={e=>setForm({...form,creditDays:Number(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Payment due after X days</div>
                </div>
                <div className="form-group">
                  <label>Reminder Days Before Due</label>
                  <input type="number" min="0" max="30" value={form.paymentReminderDays||7}
                    onChange={e=>setForm({...form,paymentReminderDays:Number(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Send reminder X days before due date</div>
                </div>
                {form.creditLimit > 0 && form.currentBalance > 0 && (
                  <div style={{gridColumn:'1/-1',background: form.currentBalance > form.creditLimit ? '#fff1f2' : '#f0fdf4',
                    border:`1px solid ${form.currentBalance > form.creditLimit ? '#fca5a5' : '#bbf7d0'}`,
                    borderRadius:8,padding:'10px 14px',fontSize:12}}>
                    <div style={{fontWeight:700,color:form.currentBalance > form.creditLimit ? '#dc2626' : '#16a34a'}}>
                      {form.currentBalance > form.creditLimit ? '⚠️ Credit Limit Exceeded!' : '✅ Within Credit Limit'}
                    </div>
                    <div style={{marginTop:4,display:'flex',gap:16,fontSize:12}}>
                      <span>Limit: <strong>{fmt(form.creditLimit)}</strong></span>
                      <span>Used: <strong style={{color:'#dc2626'}}>{fmt(form.currentBalance)}</strong></span>
                      <span>Available: <strong style={{color:'#16a34a'}}>{fmt(Math.max(0,form.creditLimit-form.currentBalance))}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCustomer}>
              {form.id ? '✅ Update Customer' : '✅ Add Customer'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ═════════ LEDGER MODAL ═════════ */}
    {showModal==='ledger' && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:900,width:'96vw',maxHeight:'92vh',display:'flex',flexDirection:'column'}}>
          <div className="modal-header" style={{flexShrink:0}}>
            <h3 style={{margin:0}}>📒 Customer Ledger — {ledgerCustomer?.customerName}</h3>
            <button className="modal-close" onClick={()=>setShowModal(null)}>×</button>
          </div>
          <div style={{padding:'12px 20px',borderBottom:'1px solid #e2e8f0',display:'flex',gap:8,alignItems:'center',flexShrink:0,background:'#f8fafc',flexWrap:'wrap'}}>
            <label style={{fontSize:12,fontWeight:500}}>From:</label>
            <input type="date" value={ledgerFrom} onChange={e=>setLedgerFrom(e.target.value)}
              style={{height:30,fontSize:12,border:'1px solid #e2e8f0',borderRadius:6,padding:'0 8px'}}/>
            <label style={{fontSize:12,fontWeight:500}}>To:</label>
            <input type="date" value={ledgerTo} onChange={e=>setLedgerTo(e.target.value)}
              style={{height:30,fontSize:12,border:'1px solid #e2e8f0',borderRadius:6,padding:'0 8px'}}/>
            <button className="btn btn-outline" style={{height:30,fontSize:12}}
              onClick={()=>openLedger(ledgerCustomer, ledgerFrom, ledgerTo)}>🔍 Filter</button>
            <button className="btn btn-outline" style={{height:30,fontSize:12}}
              onClick={()=>{setLedgerFrom('');setLedgerTo('');openLedger(ledgerCustomer,'','');}}>✕ Clear</button>
            <button className="btn btn-primary" style={{height:30,fontSize:12,marginLeft:'auto'}} onClick={printLedger}>🖨️ Print</button>
          </div>
          <div style={{overflowY:'auto',flex:1,padding:'0 20px 20px'}}>
            {ledgerLoading ? (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>⏳ Loading ledger...</div>
            ) : ledgerData ? (
              <>
                {/* Summary */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,margin:'14px 0'}}>
                  {[
                    ['Total Debit (Dr)', fmt(ledgerData.totalDebit||0), '#2563eb'],
                    ['Total Credit (Cr)', fmt(ledgerData.totalCredit||0), '#16a34a'],
                    ['Closing Balance', fmt(Math.abs(ledgerData.closingBalance||0)), '#7c3aed'],
                    ['Credit Limit', ledgerData.creditLimit > 0 ? fmt(ledgerData.creditLimit) : 'No Limit', '#d97706'],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:'#f8fafc',border:`1px solid ${c}20`,borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:'#94a3b8',marginBottom:2}}>{l}</div>
                      <div style={{fontWeight:700,color:c,fontSize:15}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Ledger Table */}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr style={{background:'#1a4f8a',color:'white'}}>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11}}>Date</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11}}>Type</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11}}>Reference</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11}}>Narration</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11,textAlign:'right'}}>Debit (Dr)</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11,textAlign:'right'}}>Credit (Cr)</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11,textAlign:'right'}}>Balance</th>
                        <th style={{color:'white',padding:'8px 10px',fontSize:11}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ledgerData.rows||[]).map((row,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:row.type==='OPENING'?'#f8fafc':row.type==='INVOICE'?'#eff6ff':row.type==='PAYMENT'?'#f0fdf4':row.type==='RETURN'?'#fefce8':'white'}}>
                          <td style={{padding:'6px 10px',fontSize:11}}>{String(row.date).substring(0,10)}</td>
                          <td style={{padding:'6px 10px',fontSize:11}}>
                            <span style={{background:row.type==='INVOICE'?'#dbeafe':row.type==='PAYMENT'?'#d1fae5':row.type==='RETURN'?'#fef9c3':'#f1f5f9',color:row.type==='INVOICE'?'#1d4ed8':row.type==='PAYMENT'?'#065f46':row.type==='RETURN'?'#713f12':'#475569',padding:'2px 6px',borderRadius:6,fontSize:10,fontWeight:600}}>
                              {row.type}
                            </span>
                          </td>
                          <td style={{padding:'6px 10px',fontSize:11,fontFamily:'monospace',fontWeight:600}}>{row.reference}</td>
                          <td style={{padding:'6px 10px',fontSize:11,color:'#64748b'}}>{row.narration||'—'}</td>
                          <td style={{padding:'6px 10px',fontSize:11,textAlign:'right',color:'#2563eb',fontWeight:row.debit>0?600:400}}>
                            {row.debit > 0 ? fmt(row.debit) : '—'}
                          </td>
                          <td style={{padding:'6px 10px',fontSize:11,textAlign:'right',color:'#16a34a',fontWeight:row.credit>0?600:400}}>
                            {row.credit > 0 ? fmt(row.credit) : '—'}
                          </td>
                          <td style={{padding:'6px 10px',fontSize:11,textAlign:'right',fontWeight:700,color: (row.balance||0)>0?'#dc2626':'#16a34a'}}>
                            {fmt(Math.abs(row.balance||0))} {(row.balance||0)>0?'Dr':'Cr'}
                          </td>
                          <td style={{padding:'6px 10px',fontSize:10}}>
                            {row.status && <span style={{background:row.status==='PAID'?'#d1fae5':row.status==='PENDING'?'#fee2e2':'#fef9c3',color:row.status==='PAID'?'#065f46':row.status==='PENDING'?'#991b1b':'#713f12',padding:'1px 5px',borderRadius:4,fontWeight:600}}>{row.status}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:'#1a4f8a',color:'white'}}>
                        <td colSpan={4} style={{padding:'8px 10px',fontWeight:700,fontSize:12,color:'white'}}>CLOSING BALANCE</td>
                        <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'white',fontSize:12}}>{fmt(ledgerData.totalDebit||0)}</td>
                        <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'white',fontSize:12}}>{fmt(ledgerData.totalCredit||0)}</td>
                        <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'#fcd34d',fontSize:13}}>{fmt(Math.abs(ledgerData.closingBalance||0))} {(ledgerData.closingBalance||0)>0?'Dr':'Cr'}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>No ledger data available.</div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ═════════ HISTORY MODAL ═════════ */}
    {showModal==='history' && historyCustomer && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:760,maxHeight:'88vh',display:'flex',flexDirection:'column'}}>
          <div className="modal-header" style={{flexShrink:0}}>
            <h3 style={{margin:0}}>📋 Sales History — {historyCustomer?.customerName}</h3>
            <button className="modal-close" onClick={()=>setShowModal(null)}>×</button>
          </div>
          <div style={{overflowY:'auto',flex:1}}>
            <div className="modal-body">
              {historyData ? (
                <>
                  <div style={{display:'flex',gap:16,marginBottom:12,fontSize:12}}>
                    <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'8px 14px'}}>
                      <div style={{color:'#94a3b8',fontSize:10}}>Total Invoices</div>
                      <div style={{fontWeight:800,color:'#1d4ed8',fontSize:18}}>{fmtN(historyData.count||0)}</div>
                    </div>
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 14px'}}>
                      <div style={{color:'#94a3b8',fontSize:10}}>Total Business</div>
                      <div style={{fontWeight:800,color:'#16a34a',fontSize:18}}>{fmt(historyData.totalBusiness||0)}</div>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>#</th><th>Invoice No.</th><th>Date</th><th className="text-right">Amount</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
                      <tbody>
                        {(historyData.invoices||[]).map((inv,i)=>(
                          <tr key={inv.id}>
                            <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                            <td style={{fontFamily:'monospace',fontWeight:600,fontSize:12}}>{inv.invoiceNumber}</td>
                            <td style={{fontSize:12}}>{inv.invoiceDate}</td>
                            <td className="text-right" style={{fontWeight:700}}>{fmt(inv.grandTotal)}</td>
                            <td className="text-right" style={{fontSize:12,color:'#16a34a'}}>{fmt(inv.paidAmount||0)}</td>
                            <td className="text-right" style={{fontSize:12,color:'#dc2626',fontWeight:600}}>{fmt(inv.balanceDue||0)}</td>
                            <td><span className={`badge ${inv.paymentStatus==='PAID'?'badge-success':inv.paymentStatus==='RETURNED'?'badge-warning':'badge-danger'}`} style={{fontSize:10}}>{inv.paymentStatus}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>⏳ Loading history...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    <ConfirmModal open={!!confirmDelete} title="Delete Customer?" type="danger"
      message="हा customer deactivate होईल."
      details={confirmDelete?`${confirmDelete.customerName} (${confirmDelete.customerCode})`:''}
      confirmLabel="Yes, Delete" onConfirm={deleteCust} onCancel={()=>setConfirmDelete(null)}/>
    </>
  );
}
