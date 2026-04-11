import React, { useState, useEffect } from 'react';
import {
  getSuppliers, addSupplier, updateSupplier, deleteSupplier,
  getSupplierLedger, getSupplierInvoices,
  getPendingPayments, getSupplierSummary
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const fmt  = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => (Number(n)||0).toLocaleString('en-IN');

const SUPPLIER_CATEGORIES = ['Local','National','Importer','Manufacturer','Distributor','Wholesaler','Service Provider'];
const PAYMENT_TERMS = ['Net 7','Net 15','Net 30','Net 45','Net 60','COD','Advance','50% Advance','Credit'];
const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','J&K','Ladakh'];

export default function SupplierPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';

  const [tab, setTab]             = useState('list');
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary]     = useState(null);
  const [pending, setPending]     = useState([]);
  const [loading, setLoading]     = useState(false);

  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');

  const [showModal, setShowModal] = useState(null);
  const [form, setForm]           = useState({});
  const [formTab, setFormTab]     = useState('basic');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Ledger
  const [ledgerSupplier, setLedgerSupplier] = useState(null);
  const [ledgerData,     setLedgerData]     = useState(null);
  const [ledgerFrom,     setLedgerFrom]     = useState('');
  const [ledgerTo,       setLedgerTo]       = useState('');
  const [ledgerLoading,  setLedgerLoading]  = useState(false);

  // History
  const [historySupplier, setHistorySupplier] = useState(null);
  const [historyData,     setHistoryData]     = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sR, smR] = await Promise.all([getSuppliers(), getSupplierSummary()]);
      setSuppliers(sR.data||[]);
      setSummary(smR.data||null);
    } catch { toast.error('Failed to load suppliers'); }
    setLoading(false);
  };

  const loadPending = async () => {
    try { const r = await getPendingPayments(); setPending(r.data||[]); }
    catch { toast.error('Failed to load pending payments'); }
  };

  // ─── BANK DETAILS ───
  const copyBankDetails = (supp) => {
    const s = suppliers.find(s => s.id === supp.supplierId) || supp;
    const lines = [`Supplier: ${s.supplierName || supp.supplierName}`];
    if (s.bankName)       lines.push(`Bank: ${s.bankName}`);
    if (s.accountNumber)  lines.push(`A/C: ${s.accountNumber}`);
    if (s.ifscCode)       lines.push(`IFSC: ${s.ifscCode}`);
    if (s.upiId)          lines.push(`UPI: ${s.upiId}`);
    if (s.phone)          lines.push(`Phone: ${s.phone}`);
    if (lines.length > 1) {
      navigator.clipboard.writeText(lines.join('\n'));
      toast.success('Bank details copied!');
    } else {
      toast.error('No bank details available for this supplier');
    }
  };

  const callSupplier = (phone) => {
    window.open(`tel:${phone}`);
  };



  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab==='pending') loadPending(); }, [tab]);

  // ─── CRUD ───
  const normName = s => s?.toLowerCase().trim().replace(/\s+/g, ' ') || '';

  const saveSupplier = async () => {
    const name = form.supplierName?.trim();
    if (!name)               { toast.error('Supplier name required aahe!'); return; }
    if (!form.phone?.trim()) { toast.error('Phone number required aahe!');  return; }

    const phone = form.phone.trim().replace(/[\s\-()]/g,'');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Phone invalid! 10 digits, 6-9 se start honyapahijhe. Got: '+form.phone); return;
    }
    if (form.email?.trim()) {
      if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
        toast.error('Email address invalid! Got: '+form.email); return;
      }
    }
    if (form.gstin?.trim()) {
      const g = form.gstin.trim().toUpperCase();
      if (g.length !== 15) { toast.error('GSTIN exactly 15 characters cha hava! Got '+g.length); return; }
      if (!/^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
        toast.error('GSTIN format invalid! Example: 27AABCU9603R1ZX'); return;
      }
    }
    if (form.pan?.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.trim().toUpperCase())) {
        toast.error('PAN format invalid! Example: ABCDE1234F'); return;
      }
    }
    if (form.pincode?.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      toast.error('Pincode 6 digits cha hava!'); return;
    }

    // Duplicate name check (add + edit both)
    const dupName = suppliers.find(s =>
      (normName(s.supplierName)===normName(name) || normName(s.name)===normName(name))
      && s.id !== form.id
    );
    if (dupName) { toast.error('Supplier "'+name+'" already exists! Duplicate nahi chalnar.'); return; }
    if (!form.id) {
      const dupPhone = suppliers.find(s => s.phone?.replace(/[\s\-()]/g,'')===phone);
      if (dupPhone) { toast.error('Phone '+phone+' already registered: '+dupPhone.supplierName); return; }
      if (form.email?.trim()) {
        const dupEmail = suppliers.find(s => s.email?.toLowerCase()===form.email.trim().toLowerCase());
        if (dupEmail) { toast.error('Email already registered: '+dupEmail.supplierName); return; }
      }
      if (form.gstin?.trim()) {
        const dupGstin = suppliers.find(s =>
          s.gstin?.toUpperCase()===form.gstin.trim().toUpperCase() && s.id !== form.id);
        if (dupGstin) { toast.error('GSTIN already registered: '+dupGstin.supplierName); return; }
      }
    }

    try {
      const payload = {...form, phone, supplierName: name, name};
      if (form.id) await updateSupplier(form.id, payload);
      else         await addSupplier(payload);
      toast.success(form.id ? '✅ Supplier updated!' : '✅ Supplier added!');
      setShowModal(null); setForm({});
      load();
    } catch(e) { toast.error(e.response?.data?.error || e.message || 'Failed to save'); }
  };

  const deleteSupp = async () => {
    try {
      await deleteSupplier(confirmDelete.id);
      toast.success('Supplier deactivated');
      setConfirmDelete(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Cannot delete'); }
  };

  // ─── LEDGER ───
  const openLedger = async (supp, from, to) => {
    setLedgerSupplier(supp);
    setLedgerLoading(true);
    try {
      const params = {};
      if (from) params.fromDate = from;
      if (to)   params.toDate   = to;
      const r = await getSupplierLedger(supp.id, params);
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
    w.document.write(`<!DOCTYPE html><html><head><title>Supplier Ledger</title>
    <style>body{font-family:Arial;font-size:12px;margin:20px}h2{color:#1a4f8a}table{width:100%;border-collapse:collapse}th{background:#1a4f8a;color:white;padding:8px;font-size:11px;text-align:left}.footer{margin-top:20px;font-size:10px;color:#94a3b8;text-align:center}@media print{button{display:none}}</style>
    </head><body>
    <h2>Supplier Ledger Statement</h2>
    <div style="display:flex;gap:24;margin-bottom:16px;font-size:12px">
      <div><strong>Supplier:</strong> ${ledgerData.supplierName}</div>
      <div style="margin-left:24px"><strong>Code:</strong> ${ledgerData.supplierCode||'—'}</div>
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

  // ─── HISTORY ───
  const openHistory = async (supp) => {
    setHistorySupplier(supp);
    try {
      const r = await getSupplierInvoices(supp.id);
      setHistoryData(r.data);
    } catch { toast.error('Failed to load history'); }
  };

  const filtered = suppliers.filter(s => {
    if (catFilter && s.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (s.supplierName||'').toLowerCase().includes(q)
          || (s.phone||'').includes(q)
          || (s.supplierCode||'').toLowerCase().includes(q)
          || (s.gstin||'').toLowerCase().includes(q)
          || (s.city||'').toLowerCase().includes(q);
    }
    return true;
  });

  const totalPendingAmt = pending.reduce((s,p)=>s+(p.pendingAmount||0),0);

  return (
    <>
    <div>
      {/* ── STAT CARDS ── */}
      {summary && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
          {[
            ['Total Suppliers', fmtN(summary.totalSuppliers||0), '#2563eb','🏭'],
            ['Total Payable',   fmt(summary.totalPayable||0),    '#dc2626','💸'],
            ['Overdue',         fmtN(summary.overdueSuppliers||0),'#d97706','⚠️'],
            ['Active',          fmtN(summary.activeSuppliers||0), '#16a34a','✅'],
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
        {[
          {key:'list',    label:'🏭 Suppliers'},
          {key:'pending', label:`💸 Pending Payments (${pending.length})`},
        ].map(({key,label})=>(
          <div key={key} onClick={()=>setTab(key)}
            style={{padding:'8px 18px',cursor:'pointer',fontSize:13,fontWeight:tab===key?700:500,
              color:tab===key?'#1a4f8a':'#64748b',
              borderBottom:tab===key?'2px solid #1a4f8a':'2px solid transparent',
              marginBottom:-2,whiteSpace:'nowrap'}}>
            {label}
          </div>
        ))}
      </div>

      {/* ══════════ SUPPLIER LIST ══════════ */}
      {tab==='list' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏭 Supplier Master</span>
            <button className="btn btn-primary" onClick={()=>{setForm({creditDays:30,balanceType:'CREDIT',country:'India'});setFormTab('basic');setShowModal('supp');}}>
              + Add Supplier
            </button>
          </div>
          <div className="card-body">
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'center'}}>
              <input placeholder="🔍 Search name, phone, code, city, GSTIN..."
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{height:32,fontSize:12,minWidth:260,padding:'0 10px',border:'1.5px solid #e2e8f0',borderRadius:6,outline:'none'}}
                onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                style={{height:32,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Categories</option>
                {SUPPLIER_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <button className="btn btn-outline" style={{height:32,fontSize:12}} onClick={()=>{setSearch('');setCatFilter('');}}>✕ Clear</button>
              <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>{filtered.length} suppliers</span>
            </div>

            {loading ? (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}><div style={{fontSize:32}}>⏳</div><div style={{marginTop:8}}>Loading...</div></div>
            ) : filtered.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Supplier</th><th>Phone</th><th>City</th>
                      <th>GSTIN</th><th>Category</th><th>Payment Terms</th>
                      <th className="text-right">Balance</th>
                      <th style={{minWidth:220}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s,i)=>(
                      <tr key={s.id}>
                        <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                        <td>
                          <div style={{fontWeight:600,fontSize:13}}>{s.supplierName}</div>
                          <div style={{fontSize:10,color:'#94a3b8'}}>{s.supplierCode}</div>
                        </td>
                        <td style={{fontSize:12}}>{s.phone}</td>
                        <td style={{fontSize:12,color:'#64748b'}}>{s.city||'—'}</td>
                        <td style={{fontSize:11,fontFamily:'monospace',color:'#64748b'}}>{s.gstin||'—'}</td>
                        <td>
                          {s.category && (
                            <span style={{background:'#f0fdf4',color:'#166534',padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:600}}>
                              {s.category}
                            </span>
                          )}
                        </td>
                        <td style={{fontSize:11,color:'#64748b'}}>{s.paymentTerms||`Net ${s.creditDays||30}`}</td>
                        <td className="text-right">
                          <span style={{fontWeight:700,fontSize:13,color:s.currentBalance>0?'#dc2626':s.currentBalance<0?'#16a34a':'#64748b'}}>
                            {fmt(Math.abs(s.currentBalance))}
                          </span>
                          <div style={{fontSize:10,color:'#94a3b8'}}>{s.currentBalance>0?'Cr (Payable)':s.currentBalance<0?'Dr (Advance)':'Nil'}</div>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#2563eb',color:'#2563eb'}}
                              onClick={()=>{setForm({...s});setFormTab('basic');setShowModal('supp');}}>✏️ Edit</button>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#7c3aed',color:'#7c3aed'}}
                              onClick={()=>{setLedgerFrom('');setLedgerTo('');openLedger(s,'','');setShowModal('ledger');}}>📒 Ledger</button>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#059669',color:'#059669'}}
                              onClick={()=>{openHistory(s);setShowModal('history');}}>📋 History</button>
                            {isAdmin && (
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#dc2626',color:'#dc2626'}}
                                onClick={()=>setConfirmDelete(s)}>🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>🏭</div>
                <div style={{fontWeight:600}}>{search||catFilter ? 'No suppliers match the filter' : 'No suppliers yet'}</div>
                <div style={{fontSize:12,marginTop:4}}>{!search&&!catFilter&&'Click "+ Add Supplier" to start'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ PENDING PAYMENTS ══════════ */}
      {tab==='pending' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">💸 Pending Supplier Payments</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {totalPendingAmt > 0 && (
                <span style={{fontSize:13,fontWeight:700,color:'#dc2626',background:'#fee2e2',padding:'4px 12px',borderRadius:8}}>
                  Total: {fmt(totalPendingAmt)}
                </span>
              )}
              <button className="btn btn-outline" style={{fontSize:12}} onClick={loadPending}>🔄 Refresh</button>
            </div>
          </div>
          <div className="card-body">
            {pending.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Supplier</th><th>Phone</th>
                      <th className="text-right">Pending Amount</th>
                      <th className="text-right">Overdue Amount</th>
                      <th className="text-right">Invoices</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((p,i)=>(
                      <tr key={p.supplierId} style={{background: p.overdueAmount>0 ? '#fff1f2' : 'white'}}>
                        <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                        <td>
                          <div style={{fontWeight:600}}>{p.supplierName}</div>
                          <div style={{fontSize:10,color:'#94a3b8'}}>{p.supplierCode}</div>
                        </td>
                        <td style={{fontSize:12}}>{p.phone}</td>
                        <td className="text-right">
                          <span style={{fontWeight:700,color:'#dc2626',fontSize:14}}>{fmt(p.pendingAmount)}</span>
                        </td>
                        <td className="text-right">
                          {p.overdueAmount > 0 ? (
                            <span style={{fontWeight:700,color:'#dc2626',fontSize:13}}>{fmt(p.overdueAmount)}</span>
                          ) : <span style={{color:'#94a3b8',fontSize:11}}>—</span>}
                        </td>
                        <td className="text-right" style={{fontSize:12}}>
                          {p.pendingInvoices}
                          {p.overdueInvoices > 0 && <div style={{fontSize:10,color:'#dc2626'}}>⚠️ {p.overdueInvoices} overdue</div>}
                        </td>
                        <td>
                          <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#7c3aed',color:'#7c3aed'}}
                              onClick={()=>{setLedgerFrom('');setLedgerTo('');openLedger({id:p.supplierId,supplierName:p.supplierName},'','');setShowModal('ledger');}}>
                              📒 Ledger
                            </button>
                            <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#1a4f8a',color:'#1a4f8a'}}
                              onClick={()=>copyBankDetails(p)}
                              title="Copy bank details for payment">
                              🏦 Bank
                            </button>
                            {p.phone && (
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#16a34a',color:'#16a34a'}}
                                onClick={()=>callSupplier(p.phone)}
                                title={`Call ${p.phone}`}>
                                📞 Call
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#f8fafc',fontWeight:700}}>
                      <td colSpan={3} style={{padding:'10px',fontSize:13}}>TOTAL</td>
                      <td className="text-right" style={{color:'#dc2626',fontSize:14,padding:'10px'}}>{fmt(totalPendingAmt)}</td>
                      <td className="text-right" style={{color:'#dc2626',fontSize:13,padding:'10px'}}>
                        {fmt(pending.reduce((s,p)=>s+(p.overdueAmount||0),0))}
                      </td>
                      <td className="text-right" style={{padding:'10px'}}>{pending.reduce((s,p)=>s+(p.pendingInvoices||0),0)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <div style={{fontWeight:600,color:'#16a34a'}}>No pending payments!</div>
                <div style={{fontSize:12,marginTop:4}}>All supplier payments are up to date.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ═════════ ADD / EDIT SUPPLIER MODAL ═════════ */}
    {showModal==='supp' && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:660,maxHeight:'90vh',overflowY:'auto'}}>
          <div className="modal-header">
            <h3 style={{margin:0}}>{form.id ? '✏️ Edit Supplier' : '➕ Add Supplier'}</h3>
            <button className="modal-close" onClick={()=>setShowModal(null)}>×</button>
          </div>
          {/* Sub-tabs */}
          <div style={{display:'flex',borderBottom:'2px solid #e2e8f0',padding:'0 20px',background:'#f8fafc'}}>
            {[['basic','🏭 Basic'],['address','📍 Address'],['bank','🏦 Bank'],['financial','💲 Financial']].map(([k,l])=>(
              <div key={k} onClick={()=>setFormTab(k)}
                style={{padding:'8px 12px',cursor:'pointer',fontSize:12,fontWeight:formTab===k?700:500,
                  color:formTab===k?'#1a4f8a':'#64748b',
                  borderBottom:formTab===k?'2px solid #1a4f8a':'2px solid transparent',
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
                  <label>Supplier Code</label>
                  <input value={form.supplierCode||''} readOnly placeholder="Auto-generated"
                    style={{background:'#f8fafc',color:'#64748b',cursor:'not-allowed'}}/>
                </div>
                <div className="form-group">
                  <label>Supplier Name <span style={{color:'#dc2626'}}>*</span></label>
                  <input value={form.supplierName||''} onChange={e=>setForm({...form,supplierName:e.target.value})} placeholder="Company / Person name"/>
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
                  <input value={form.contactPerson||''} onChange={e=>setForm({...form,contactPerson:e.target.value})} placeholder="Sales rep name"/>
                </div>
                <div className="form-group">
                  <label>GSTIN</label>
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <input value={form.gstin||''} onChange={async e=>{
                        const g = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
                        setForm(f=>({...f,gstin:g}));
                        if (g.length===15 && /^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) {
                          const toastId = toast.loading('🔍 GSTIN verify hotoy...');
                          try {
                            const {verifyGSTIN} = await import('../services/api');
                            const r = await verifyGSTIN(g);
                            const d = r.data;
                            toast.dismiss(toastId);
                            if (d.cancelled) { toast.error('⚠️ GSTIN Cancelled/Inactive!'); return; }
                            const updates = {};
                            if (d.name) { updates.supplierName = d.name; updates.name = d.name; }
                            if (d.legalName) updates.legalName = d.legalName;
                            const addrStr = d.fullAddr || d.address || [d.street,d.locality].filter(Boolean).join(', ');
                            if (addrStr)    updates.address  = addrStr;
                            if (d.district||d.city) updates.city = d.district||d.city;
                            if (d.state)    updates.state    = d.state;
                            if (d.pincode)  updates.pincode  = d.pincode;
                            if (d.pan)      updates.pan      = d.pan;
                            setForm(f=>({...f, gstin:g, ...updates}));
                            if (d.name) toast.success('✅ GSTIN verified — legal/trade name & address form मध्ये भरले. Supplier identity तपासा.');
                            else toast('ℹ️ GSTIN valid. State: '+(d.stateName||d.state)+' | PAN: '+d.pan,{icon:'✅'});
                          } catch(e){ toast.dismiss(toastId); toast.error(e.message||'GSTIN verify failed — network/API'); }
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
                          // ── AUTO-FILL: name, address, city, state, pincode, PAN ──
                          const updates = {};
                          if (d.name) {
                            updates.supplierName = d.name;
                            updates.name         = d.name;
                          }
                          if (d.legalName)  updates.legalName = d.legalName;
                          if (d.tradeName)  updates.tradeName = d.tradeName;
                          const addrStr = d.fullAddr || d.address || [d.street, d.locality].filter(Boolean).join(', ');
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
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}>
                    <option value="">-- Select Category --</option>
                    {SUPPLIER_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Terms</label>
                  <select value={form.paymentTerms||''} onChange={e=>setForm({...form,paymentTerms:e.target.value})}>
                    <option value="">-- Select Terms --</option>
                    {PAYMENT_TERMS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Credit Days</label>
                  <input type="number" min="0" max="365" value={form.creditDays||30}
                    onChange={e=>setForm({...form,creditDays:Number(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Payment due after X days</div>
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
                  <label style={{marginBottom:0,fontWeight:500}}>Inter-State Supplier (IGST applicable)</label>
                </div>
              </div>
            )}

            {/* BANK */}
            {formTab==='bank' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input value={form.bankName||''} onChange={e=>setForm({...form,bankName:e.target.value})} placeholder="e.g. SBI, HDFC"/>
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input value={form.accountNumber||''} onChange={e=>setForm({...form,accountNumber:e.target.value})} placeholder="Account number"/>
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input value={form.ifscCode||''} onChange={e=>setForm({...form,ifscCode:e.target.value.toUpperCase()})} placeholder="e.g. SBIN0001234" maxLength={11}/>
                </div>
                <div className="form-group">
                  <label>UPI ID</label>
                  <input value={form.upiId||''} onChange={e=>setForm({...form,upiId:e.target.value})} placeholder="name@upi"/>
                </div>
                {(form.bankName || form.accountNumber) && (
                  <div style={{gridColumn:'1/-1',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 14px',fontSize:12}}>
                    <div style={{fontWeight:600,color:'#166534',marginBottom:4}}>🏦 Bank Details Preview</div>
                    <div>{form.bankName} | A/C: {form.accountNumber} | IFSC: {form.ifscCode}</div>
                    {form.upiId && <div>UPI: {form.upiId}</div>}
                  </div>
                )}
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
                  <select value={form.balanceType||'CREDIT'} onChange={e=>setForm({...form,balanceType:e.target.value})}>
                    <option value="CREDIT">Credit (We owe supplier)</option>
                    <option value="DEBIT">Debit (Supplier owes us)</option>
                  </select>
                </div>
                {form.id && (
                  <div className="form-group" style={{gridColumn:'1/-1'}}>
                    <div style={{background:'#f0f4ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'10px 14px',fontSize:12}}>
                      <strong>Current Balance: </strong>
                      <span style={{color:form.currentBalance>0?'#dc2626':'#16a34a',fontWeight:700,fontSize:14}}>
                        {fmt(Math.abs(form.currentBalance||0))} {form.currentBalance>0?'Cr (Payable)':'Dr (Advance)'}
                      </span>
                      <div style={{color:'#64748b',marginTop:4,fontSize:11}}>Balance is auto-calculated from invoices and payments.</div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveSupplier}>
              {form.id ? '✅ Update Supplier' : '✅ Add Supplier'}
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
            <h3 style={{margin:0}}>📒 Supplier Ledger — {ledgerSupplier?.supplierName}</h3>
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
              onClick={()=>openLedger(ledgerSupplier, ledgerFrom, ledgerTo)}>🔍 Filter</button>
            <button className="btn btn-outline" style={{height:30,fontSize:12}}
              onClick={()=>{setLedgerFrom('');setLedgerTo('');openLedger(ledgerSupplier,'','');}}>✕ Clear</button>
            <button className="btn btn-primary" style={{height:30,fontSize:12,marginLeft:'auto'}} onClick={printLedger}>🖨️ Print</button>
          </div>
          <div style={{overflowY:'auto',flex:1,padding:'0 20px 20px'}}>
            {ledgerLoading ? (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>⏳ Loading ledger...</div>
            ) : ledgerData ? (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,margin:'14px 0'}}>
                  {[
                    ['Total Debit (Dr)',  fmt(ledgerData.totalDebit||0),  '#2563eb'],
                    ['Total Credit (Cr)', fmt(ledgerData.totalCredit||0), '#16a34a'],
                    ['Closing Balance',   fmt(Math.abs(ledgerData.closingBalance||0)), '#7c3aed'],
                    ['Credit Days',       `${ledgerData.creditDays||30} days`, '#d97706'],
                  ].map(([l,v,c])=>(
                    <div key={l} style={{background:'#f8fafc',border:`1px solid ${c}20`,borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:'#94a3b8',marginBottom:2}}>{l}</div>
                      <div style={{fontWeight:700,color:c,fontSize:15}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr style={{background:'#1a4f8a'}}>
                        {['Date','Type','Reference','Narration','Debit (Dr)','Credit (Cr)','Balance','Status'].map((h,i)=>(
                          <th key={h} style={{color:'white',padding:'8px 10px',fontSize:11,textAlign:i>=4?'right':'left'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(ledgerData.rows||[]).map((row,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid #f1f5f9',
                          background:row.type==='OPENING'?'#f8fafc':row.type==='INVOICE'?'#eff6ff':row.type==='PAYMENT'?'#f0fdf4':row.type==='RETURN'?'#fefce8':'white'}}>
                          <td style={{padding:'6px 10px',fontSize:11}}>{String(row.date).substring(0,10)}</td>
                          <td style={{padding:'6px 10px',fontSize:11}}>
                            <span style={{background:row.type==='INVOICE'?'#dbeafe':row.type==='PAYMENT'?'#d1fae5':row.type==='RETURN'?'#fef9c3':'#f1f5f9',
                              color:row.type==='INVOICE'?'#1d4ed8':row.type==='PAYMENT'?'#065f46':row.type==='RETURN'?'#713f12':'#475569',
                              padding:'2px 6px',borderRadius:6,fontSize:10,fontWeight:600}}>
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
                          <td style={{padding:'6px 10px',fontSize:11,textAlign:'right',fontWeight:700,color:(row.balance||0)>0?'#dc2626':'#16a34a'}}>
                            {fmt(Math.abs(row.balance||0))} {(row.balance||0)>0?'Cr':'Dr'}
                          </td>
                          <td style={{padding:'6px 10px',fontSize:10}}>
                            {row.status && <span style={{background:row.status==='PAID'?'#d1fae5':row.status==='PENDING'?'#fee2e2':'#fef9c3',color:row.status==='PAID'?'#065f46':row.status==='PENDING'?'#991b1b':'#713f12',padding:'1px 5px',borderRadius:4,fontWeight:600}}>{row.status}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:'#1a4f8a'}}>
                        <td colSpan={4} style={{padding:'8px 10px',fontWeight:700,fontSize:12,color:'white'}}>CLOSING BALANCE</td>
                        <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'white',fontSize:12}}>{fmt(ledgerData.totalDebit||0)}</td>
                        <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'white',fontSize:12}}>{fmt(ledgerData.totalCredit||0)}</td>
                        <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'#fcd34d',fontSize:13}}>{fmt(Math.abs(ledgerData.closingBalance||0))} {(ledgerData.closingBalance||0)>0?'Cr':'Dr'}</td>
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
    {showModal==='history' && historySupplier && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:760,maxHeight:'88vh',display:'flex',flexDirection:'column'}}>
          <div className="modal-header" style={{flexShrink:0}}>
            <h3 style={{margin:0}}>📋 Purchase History — {historySupplier?.supplierName}</h3>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="btn btn-outline" style={{fontSize:12,padding:'4px 12px'}} onClick={()=>{
                const w=window.open('','_blank');
                const invoices=historyData?.invoices||[];
                const totalPurchased=historyData?.totalPurchased||0;
                const totalPaid=historyData?.totalPaid||0;
                const balance=totalPurchased-totalPaid;
                w.document.write(`<!DOCTYPE html><html><head><title>Purchase History</title>
                <style>body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
                h2{color:#1a4f8a}table{width:100%;border-collapse:collapse;margin-top:12px}
                th{background:#1a4f8a;color:#fff;padding:7px 10px;text-align:left;font-size:12px}
                td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px}
                .cards{display:flex;gap:12px;margin:12px 0;flex-wrap:wrap}
                .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;min-width:130px}
                .card-label{font-size:10px;color:#94a3b8}.card-value{font-size:16px;font-weight:800}
                .text-right{text-align:right}.total-row td{font-weight:700;background:#f1f5f9}
                @media print{button{display:none}}</style></head><body>
                <h2>Purchase History — ${historySupplier?.supplierName}</h2>
                <div>Code: ${historySupplier?.supplierCode} | Phone: ${historySupplier?.phone||'—'} | GSTIN: ${historySupplier?.gstin||'—'}</div>
                <div class="cards">
                  <div class="card"><div class="card-label">Total Invoices</div><div class="card-value" style="color:#2563eb">${fmtN(historyData?.count||0)}</div></div>
                  <div class="card"><div class="card-label">Total Purchased</div><div class="card-value" style="color:#dc2626">${fmt(totalPurchased)}</div></div>
                  <div class="card"><div class="card-label">Total Paid</div><div class="card-value" style="color:#16a34a">${fmt(totalPaid)}</div></div>
                  <div class="card"><div class="card-label">Balance</div><div class="card-value" style="color:#d97706">${fmt(balance)}</div></div>
                </div>
                <table><thead><tr><th>#</th><th>Invoice No.</th><th>Date</th><th>Supplier Inv</th><th class="text-right">Amount</th><th class="text-right">Paid</th><th class="text-right">Balance</th><th>Status</th></tr></thead>
                <tbody>${invoices.map((inv,i)=>`<tr><td>${i+1}</td><td>${inv.invoiceNumber||'—'}</td><td>${inv.invoiceDate||'—'}</td><td>${inv.supplierInvoiceNumber||'—'}</td><td class="text-right">${fmt(inv.grandTotal)}</td><td class="text-right">${fmt(inv.paidAmount||0)}</td><td class="text-right">${fmt(inv.balanceDue||0)}</td><td>${inv.paymentStatus||'—'}</td></tr>`).join('')}
                </tbody><tfoot><tr class="total-row"><td colspan="4">Total</td><td class="text-right">${fmt(totalPurchased)}</td><td class="text-right">${fmt(totalPaid)}</td><td class="text-right">${fmt(balance)}</td><td></td></tr></tfoot>
                </table>
                <div style="margin-top:16px;font-size:11px;color:#94a3b8">Generated: ${new Date().toLocaleString('en-IN')} | ERP Accounting</div>
                </body></html>`);
                w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
              }}>🖨️ Print</button>
              <button className="modal-close" onClick={()=>setShowModal(null)}>×</button>
            </div>
          </div>
          <div style={{overflowY:'auto',flex:1}}>
            <div className="modal-body">
              {historyData ? (
                <>
                  <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
                    {[
                      ['Total Invoices', fmtN(historyData.count||0), '#2563eb'],
                      ['Total Purchased', fmt(historyData.totalPurchased||0), '#dc2626'],
                      ['Total Paid', fmt(historyData.totalPaid||0), '#16a34a'],
                      ['Balance', fmt((historyData.totalPurchased||0)-(historyData.totalPaid||0)), '#d97706'],
                    ].map(([l,v,c])=>(
                      <div key={l} style={{background:'#f8fafc',border:`1px solid ${c}20`,borderRadius:8,padding:'8px 14px',minWidth:130}}>
                        <div style={{fontSize:10,color:'#94a3b8'}}>{l}</div>
                        <div style={{fontWeight:800,color:c,fontSize:16}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="table-container">
                    <table>
                      <thead><tr><th>#</th><th>Invoice No.</th><th>Date</th><th>Supplier Inv</th><th className="text-right">Amount</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th>Status</th></tr></thead>
                      <tbody>
                        {(historyData.invoices||[]).map((inv,i)=>(
                          <tr key={inv.id}>
                            <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                            <td style={{fontFamily:'monospace',fontWeight:600,fontSize:12}}>{inv.invoiceNumber}</td>
                            <td style={{fontSize:12}}>{inv.invoiceDate}</td>
                            <td style={{fontSize:11,color:'#64748b'}}>{inv.supplierInvoiceNumber||'—'}</td>
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

    <ConfirmModal open={!!confirmDelete} title="Delete Supplier?" type="danger"
      message="हा supplier deactivate होईल."
      details={confirmDelete?`${confirmDelete.supplierName} (${confirmDelete.supplierCode})`:''}
      confirmLabel="Yes, Delete" onConfirm={deleteSupp} onCancel={()=>setConfirmDelete(null)}/>
    </>
  );
}
