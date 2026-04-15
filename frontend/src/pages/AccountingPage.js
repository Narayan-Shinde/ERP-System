import React, { useState, useEffect } from 'react';
import { printReport } from '../utils/printUtils';
import { getVouchers, addVoucher, updateVoucher, deleteVoucher, getLedgers, addLedgerTransaction, getAllLedgerTransactions, repostMissing } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';
import ConfirmModal from '../components/ConfirmModal';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

const VOUCHER_TYPES = ['JOURNAL','PAYMENT','RECEIPT','CONTRA'];
const TYPE_COLOR = { JOURNAL:'#1a4f8a', PAYMENT:'#dc2626', RECEIPT:'#16a34a', CONTRA:'#7c3aed' };
const TYPE_ICON  = { JOURNAL:'📝', PAYMENT:'💸', RECEIPT:'💰', CONTRA:'🔄' };

const COMMON_ACCOUNTS = [
  'Cash Account', 'Bank Account', 'Purchase Account', 'Sales Account',
  'GST Input Tax Credit', 'GST Output Tax Payable', 'Accounts Payable',
  'Accounts Receivable', 'Capital Account', 'Retained Earnings',
];

export default function AccountingPage() {
  const { selectedFY } = useFY();
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.roles?.includes('ROLE_ADMIN') || currentUser?.roles?.includes('ADMIN'));
  const [tab, setTab]           = useState('vouchers');
  const [vouchers, setVouchers] = useState([]);
  const [postedVoucherNums, setPostedVoucherNums] = useState(new Set());
  const [confirmVoucher, setConfirmVoucher] = useState(null);
  const [ledgers, setLedgers]   = useState([]);
  const [filterType, setFT]     = useState('all');
  const [showModal, setModal]   = useState(false);
  const [form, setForm]         = useState({ voucherType: 'JOURNAL' });
  const [entries, setEntries]   = useState([
    { ledgerId:'', ledgerName:'', entryType:'DEBIT',  amount: 0 },
    { ledgerId:'', ledgerName:'', entryType:'CREDIT', amount: 0 },
  ]);
  const [openingForm, setOF] = useState({ accountName:'', group:'ASSET', openingBalance:0, type:'DEBIT' });
  const [obLoading, setObL] = useState(false);

  useEffect(() => {
    const fyParam = selectedFY.value === 'ALL' ? {} : { financialYear: selectedFY.label };
    getVouchers(fyParam).then(r => setVouchers(r.data || [])).catch(() => {});
    getLedgers().then(r => setLedgers(r.data || [])).catch(() => {});
    getAllLedgerTransactions(fyParam).then(r => {
      const nums = new Set((r.data||[]).map(t => t.voucherNumber).filter(Boolean));
      setPostedVoucherNums(nums);
    }).catch(() => {});
  }, [selectedFY.label]);

  const totalDebit  = entries.filter(e => e.entryType === 'DEBIT').reduce((s,e) => s + (Number(e.amount)||0), 0);
  const totalCredit = entries.filter(e => e.entryType === 'CREDIT').reduce((s,e) => s + (Number(e.amount)||0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const saveVoucher = async () => {
    if (!form.voucherType)   { toast.error('Voucher Type is required'); return; }
    if (!form.voucherDate)   { toast.error('Voucher Date is required'); return; }
    if (entries.length < 2)  { toast.error('Minimum 2 entries (Debit + Credit) required'); return; }
    const hasDebit  = entries.some(e => e.entryType === 'DEBIT'  && Number(e.amount) > 0);
    const hasCredit = entries.some(e => e.entryType === 'CREDIT' && Number(e.amount) > 0);
    if (!hasDebit)  { toast.error('At least one Debit entry is required'); return; }
    if (!hasCredit) { toast.error('At least one Credit entry is required'); return; }
    const emptyEntry = entries.find(e => (!e.ledgerAccountId && !e.ledgerName) || !e.amount || Number(e.amount) <= 0);
    if (emptyEntry) { toast.error('All entries must have a ledger account and amount > 0'); return; }
    if (!isBalanced) { toast.error('❌ Debit total must equal Credit total!'); return; }
    try {
      const data = { ...form, entries, totalDebit, totalCredit, financialYear: selectedFY.label, status: 'POSTED' };
      if (form.id) {
        await updateVoucher(form.id, data);
        toast.success('Voucher updated!');
      } else {
        await addVoucher(data);
        toast.success('Voucher posted!');
      }
      setModal(false);
      setForm({ voucherType: 'JOURNAL' });
      setEntries([
        { ledgerId:'', ledgerName:'', entryType:'DEBIT',  amount: 0 },
        { ledgerId:'', ledgerName:'', entryType:'CREDIT', amount: 0 },
      ]);
      getVouchers(selectedFY.value === 'ALL' ? {} : { financialYear: selectedFY.label }).then(r => setVouchers(r.data || []));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const saveOpeningBalance = async () => {
    if (!openingForm.accountName || !openingForm.openingBalance) {
      toast.error('Enter account name and amount'); return;
    }
    setObL(true);
    try {
      const isDebit = openingForm.type === 'DEBIT';
      const entry = {
        voucherType: 'JOURNAL',
        voucherNumber: 'OB-' + Date.now(),
        voucherDate: today(),
        financialYear: selectedFY.label,
        narration: 'Opening Balance: ' + openingForm.accountName,
        status: 'POSTED',
        entries: [
          { ledgerName: openingForm.accountName, entryType: openingForm.type,       amount: Number(openingForm.openingBalance) },
          { ledgerName: isDebit ? 'Opening Balance Suspense' : 'Opening Balance Suspense', entryType: isDebit ? 'CREDIT' : 'DEBIT', amount: Number(openingForm.openingBalance) },
        ],
        totalDebit:  Number(openingForm.openingBalance),
        totalCredit: Number(openingForm.openingBalance),
      };
      await addVoucher(entry);
      toast.success('Opening balance saved!');
      setOF({ accountName:'', group:'ASSET', openingBalance:0, type:'DEBIT' });
      getVouchers(selectedFY.value === 'ALL' ? {} : { financialYear: selectedFY.label }).then(r => setVouchers(r.data || []));
    } catch (e) { toast.error('Failed: ' + (e.response?.data?.error || e.message)); }
    setObL(false);
  };

  const updateEntry = (idx, field, val) => {
    const u = [...entries];
    u[idx] = { ...u[idx], [field]: field === 'amount' ? Number(val) : val };
    if (field === 'ledgerId') {
      const l = ledgers.find(x => x.id === val);
      u[idx].ledgerName = l?.accountName || '';
    }
    setEntries(u);
  };

  const filteredVouchers = filterType === 'all' ? vouchers : vouchers.filter(v => v.voucherType === filterType);

  const stats = VOUCHER_TYPES.map(t => ({ type: t, count: vouchers.filter(v => v.voucherType === t).length,
    total: vouchers.filter(v => v.voucherType === t).reduce((s,v) => s + (v.totalDebit||0), 0) }));

  const tabs = [['vouchers','📝 Vouchers'],['opening','🏁 Opening Balance']];

  return (
    <>
    <div>
      <div className="tabs">
        {tabs.map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── VOUCHERS ── */}
      {tab === 'vouchers' && (
        <>
          {/* Summary Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
            {stats.map(s => (
              <div key={s.type} style={{ background:'white', border:`2px solid ${TYPE_COLOR[s.type]}20`, borderTop:`4px solid ${TYPE_COLOR[s.type]}`, borderRadius:6, padding:'10px 14px', cursor:'pointer' }}
                onClick={() => setFT(filterType === s.type ? 'all' : s.type)}>
                <div style={{ fontSize:20, marginBottom:4 }}>{TYPE_ICON[s.type]}</div>
                <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase', letterSpacing:1 }}>{s.type}</div>
                <div style={{ fontWeight:700, color:TYPE_COLOR[s.type], fontSize:14 }}>{fmt(s.total)}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{s.count} vouchers</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">📝 Accounting Vouchers</span>
              <div style={{ display:'flex', gap:8 }}>
                <select value={filterType} onChange={e => setFT(e.target.value)} style={{ height:32 }}>
                  <option value="all">All Types</option>
                  {VOUCHER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <button className="btn btn-outline" style={{fontSize:12,color:'#7c3aed',borderColor:'#7c3aed'}}
                  title="Purane invoices/returns ke liye ledger entries post karo"
                  onClick={async()=>{
                    if(!window.confirm('Repost missing ledger entries? This will post all unposted invoices & returns.')) return;
                    try{
                      const r = await repostMissing();
                      alert('✅ Repost done! Entries posted: ' + (r.data?.entriesPosted || 0));
                      window.location.reload();
                    }catch(e){alert('❌ Repost failed: ' + (e.response?.data?.error||e.message));}
                  }}>🔄 Fix Ledger</button>
                <button className="btn btn-primary" onClick={() => {
                  setForm({ voucherType:'JOURNAL', voucherDate: today() });
                  setEntries([
                    {ledgerId:'',ledgerName:'',entryType:'DEBIT',amount:0},
                    {ledgerId:'',ledgerName:'',entryType:'CREDIT',amount:0}
                  ]);
                  setModal(true);
                }}>+ New Voucher</button>
                <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>{
                  printReport({
                    title: 'Accounting Vouchers',
                    subtitle: `Total: ${filteredVouchers.length} vouchers`,
                    summaryCards: [
                      { label: 'Total Vouchers', value: filteredVouchers.length },
                      { label: 'Total Debit', value: fmt(filteredVouchers.reduce((s,v)=>s+(v.totalDebit||0),0)), color:'#dc2626' },
                      { label: 'Total Credit', value: fmt(filteredVouchers.reduce((s,v)=>s+(v.totalCredit||0),0)), color:'#059669' },
                    ],
                    tableHeaders: [
                      {label:'Voucher#'},{label:'Type'},{label:'Date'},{label:'Narration'},
                      {label:'Dr Accounts'},{label:'Cr Accounts'},{label:'Amount',right:true}
                    ],
                    tableRows: filteredVouchers.map(v => [
                      {value:v.voucherNumber||'—'},
                      {value:v.voucherType||'—'},
                      {value:v.voucherDate||'—'},
                      {value:v.narration||'—'},
                      {value:(v.entries||[]).filter(e=>e.entryType==='DEBIT').map(e=>e.ledgerName).join(', ')||'—'},
                      {value:(v.entries||[]).filter(e=>e.entryType==='CREDIT').map(e=>e.ledgerName).join(', ')||'—'},
                      {value:fmt(v.totalDebit||0), right:true}
                    ])
                  });
                }}>🖨️ Print Vouchers</button>
              </div>
            </div>
            <div className="card-body">
              {filteredVouchers.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Voucher#</th><th>Type</th><th>Date</th><th>Narration / Party</th>
                        <th>Dr / Cr Accounts</th>
                        <th className="text-right">Debit ₹</th><th className="text-right">Credit ₹</th><th>Status</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVouchers.map(v => (
                        <tr key={v.id} style={{ borderBottom:'1px solid #f1f5f9', opacity: v.cancelled ? 0.5 : 1 }}>
                          <td style={{ fontSize:11, fontWeight:600, color:'#1a4f8a' }}>
                            {v.voucherNumber}
                            {v.cancelled && <span style={{color:'#dc2626',fontSize:10,marginLeft:4}}>[CANCELLED]</span>}
                          </td>
                          <td>
                            <span style={{ background:TYPE_COLOR[v.voucherType]+'20', color:TYPE_COLOR[v.voucherType], padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700 }}>
                              {TYPE_ICON[v.voucherType]} {v.voucherType}
                            </span>
                          </td>
                          <td style={{ fontSize:11 }}>{v.voucherDate}</td>
                          <td style={{ fontSize:12, maxWidth:200 }}>
                            <div style={{ fontWeight:600, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {v.referenceNumber || v.voucherNumber}
                            </div>
                            <div style={{ fontSize:11, color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {v.narration || '—'}
                            </div>
                          </td>
                          <td style={{ fontSize:11, maxWidth:220 }}>
                            {(v.entries||[]).map((e,i) => (
                              <div key={i} style={{ display:'flex', gap:4, alignItems:'center', marginBottom:2 }}>
                                <span style={{ 
                                  background: e.entryType==='DEBIT'?'#dbeafe':'#dcfce7',
                                  color: e.entryType==='DEBIT'?'#1d4ed8':'#15803d',
                                  padding:'1px 5px', borderRadius:4, fontSize:10, fontWeight:700, minWidth:28, textAlign:'center'
                                }}>{e.entryType==='DEBIT'?'Dr':'Cr'}</span>
                                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.ledgerName}</span>
                                <span style={{ color:'#94a3b8', fontSize:10, marginLeft:'auto' }}>{fmt(e.amount)}</span>
                              </div>
                            ))}
                          </td>
                          <td className="text-right" style={{ color:'#1a4f8a', fontWeight:600 }}>{fmt(v.totalDebit)}</td>
                          <td className="text-right" style={{ color:'#16a34a', fontWeight:600 }}>{fmt(v.totalCredit)}</td>
                          <td>
                            <div style={{display:'flex',flexDirection:'column',gap:3}}>
                              {(() => {
                                const isAuto = v.voucherNumber?.startsWith('AUTO-') ||
                                  v.voucherNumber?.startsWith('PAY-PUR-') ||
                                  v.voucherNumber?.startsWith('PAY-SAL-') ||
                                  v.voucherNumber?.startsWith('REC-SAL-');
                                const inLedger = isAuto || postedVoucherNums.has(v.voucherNumber);
                                let label, bg, color;
                                if (v.cancelled) { label='❌ CANCELLED'; bg='#fee2e2'; color='#dc2626'; }
                                else if (v.voucherNumber?.startsWith('AUTO-')) { label='🤖 AUTO-POSTED'; bg='#ede9fe'; color='#7c3aed'; }
                                else if (v.voucherNumber?.startsWith('PAY-PUR-') || v.voucherNumber?.startsWith('PAY-SAL-')) { label='💳 PAYMENT'; bg='#d1fae5'; color='#059669'; }
                                else if (v.voucherNumber?.startsWith('REC-SAL-')) { label='🧾 RECEIPT'; bg='#d1fae5'; color='#059669'; }
                                else if (inLedger) { label='✅ POSTED'; bg='#d1fae5'; color='#059669'; }
                                else { label='⏳ PENDING'; bg='#fef9c3'; color='#92400e'; }
                                return <span style={{ background:bg, color, padding:'3px 8px', borderRadius:12, fontSize:11, fontWeight:700 }}>{label}</span>;
                              })()}
                              {!v.cancelled && (() => {
                                const isAutoPosted = v.voucherNumber?.startsWith('AUTO-') ||
                                  v.voucherNumber?.startsWith('PAY-PUR-') ||
                                  v.voucherNumber?.startsWith('PAY-SAL-') ||
                                  v.voucherNumber?.startsWith('REC-SAL-');
                                const inLedger = isAutoPosted || postedVoucherNums.has(v.voucherNumber);
                                return (
                                  <span style={{ background: inLedger?'#dbeafe':'#fef9c3', color: inLedger?'#1d4ed8':'#92400e', padding:'2px 6px', borderRadius:8, fontSize:10, fontWeight:600 }}>
                                    {inLedger ? '📒 Ledger ✅' : '📒 Ledger ⏳'}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td>
                            {!v.cancelled && (
                              <div style={{ display:'flex', gap:4 }}>
                                <button className="btn btn-outline" style={{ padding:'3px 8px', fontSize:11 }}
                                  onClick={() => {
                                    setForm({ ...v });
                                    const mappedEntries = (v.entries && v.entries.length > 0 ? v.entries : [
                                      { ledgerName:'', entryType:'DEBIT',  amount:0 },
                                      { ledgerName:'', entryType:'CREDIT', amount:0 },
                                    ]).map(e => {
                                      const found = ledgers.find(l => l.accountName?.toLowerCase() === e.ledgerName?.toLowerCase());
                                      return { ...e, ledgerAccountId: found?.id || e.ledgerAccountId || '' };
                                    });
                                    setEntries(mappedEntries);
                                    setModal(true);
                                  }}>✏️</button>
                                <button className="btn btn-outline" style={{ padding:'3px 8px', fontSize:11, color:'#0891b2', borderColor:'#bae6fd' }}
                                  title="Print Voucher"
                                  onClick={() => {
                                    const w = window.open('','_blank','width=700,height=500');
                                    const entries = (v.entries||[]).map(e =>
                                      `<tr><td>${e.ledgerName||''}</td><td style="text-align:center">${e.entryType==='DEBIT'?'Dr':'Cr'}</td><td style="text-align:right">₹${(e.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr>`
                                    ).join('');
                                    w.document.write(`<!DOCTYPE html><html><head><title>Voucher ${v.voucherNumber||''}</title>
                                      <style>body{font-family:Arial;margin:20px}h2{color:#1a4f8a}table{width:100%;border-collapse:collapse;margin-top:12px}
                                      th,td{border:1px solid #ddd;padding:8px;font-size:13px}th{background:#f0f4ff}
                                      .meta{background:#f8fafc;padding:10px;border-radius:6px;margin-bottom:12px;font-size:12px}
                                      .meta span{margin-right:20px}.total{font-weight:bold;color:#1a4f8a}</style></head>
                                      <body>
                                      <h2>📄 Accounting Voucher</h2>
                                      <div class="meta">
                                        <span><b>Voucher#:</b> ${v.voucherNumber||'—'}</span>
                                        <span><b>Type:</b> ${v.voucherType||'—'}</span>
                                        <span><b>Date:</b> ${v.voucherDate||'—'}</span>
                                        <span><b>FY:</b> ${v.financialYear||'—'}</span>
                                        <span><b>Status:</b> ${v.status||'POSTED'}</span>
                                      </div>
                                      ${v.narration?`<div style="margin-bottom:10px;font-size:12px"><b>Narration:</b> ${v.narration}</div>`:''}
                                      <table><thead><tr><th>Ledger Account</th><th>Dr/Cr</th><th>Amount</th></tr></thead>
                                      <tbody>${entries}</tbody>
                                      <tfoot><tr><td colspan="2" class="total">Total Debit / Credit</td>
                                        <td class="total" style="text-align:right">₹${(v.totalDebit||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td></tr></tfoot>
                                      </table>
                                      <div style="margin-top:30px;display:flex;justify-content:space-between;font-size:11px;color:#666">
                                        <span>Prepared By: _______________</span>
                                        <span>Approved By: _______________</span>
                                        <span>Received By: _______________</span>
                                      </div>
                                      <script>window.onload=()=>window.print()</script>
                                      </body></html>`);
                                    w.document.close();
                                  }}>🖨️</button>
                                {/* Post button — only for manually created vouchers NOT already auto-posted */}
                                {!postedVoucherNums.has(v.voucherNumber) &&
                                 !v.voucherNumber?.startsWith('AUTO-') &&
                                 !v.voucherNumber?.startsWith('PAY-PUR-') &&
                                 !v.voucherNumber?.startsWith('PAY-SAL-') &&
                                 !v.voucherNumber?.startsWith('REC-SAL-') && (
                                  <button className="btn btn-outline" style={{ padding:'3px 8px', fontSize:11, color:'#059669', borderColor:'#6ee7b7' }}
                                    title="Post entries to Ledger"
                                    onClick={async () => {
                                      if (!window.confirm(`"${v.voucherNumber}" च्या entries Ledger मध्ये post करायच्या का?`)) return;
                                      try {
                                        const vEntries = v.entries || [];
                                        if (vEntries.length === 0) { toast.error('No entries in this voucher'); return; }
                                        let posted = 0, notFound = [];
                                        for (const e of vEntries) {
                                          if (!e.ledgerName || !e.amount) continue;
                                          const ledgerAcc = ledgers.find(l => l.accountName?.toLowerCase() === e.ledgerName?.toLowerCase());
                                          if (!ledgerAcc) { notFound.push(e.ledgerName); continue; }
                                          await addLedgerTransaction({
                                            ledgerAccountId:   ledgerAcc.id,
                                            ledgerAccountName: ledgerAcc.accountName,
                                            entryType:         e.entryType,
                                            amount:            e.amount,
                                            narration:         v.narration || v.voucherNumber,
                                            voucherNumber:     v.voucherNumber,
                                            transactionDate:   v.voucherDate || today(),
                                            financialYear:     v.financialYear || selectedFY.label
                                          });
                                          posted++;
                                        }
                                        if (posted > 0) toast.success(`✅ ${posted} entries posted to Ledger!`);
                                        if (notFound.length > 0) toast.error(`❌ Ledger सापडले नाही: ${notFound.join(', ')}`);
                                      } catch(err) {
                                        toast.error(err.response?.data?.error || 'Post failed');
                                      }
                                    }}>📒 Post</button>
                                )}
                                {isAdmin && (
                                <button className="btn btn-outline" style={{ padding:'3px 8px', fontSize:11, color:'#dc2626', borderColor:'#fca5a5' }}
                                  onClick={() => setConfirmVoucher(v)}>🗑️</button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center" style={{ padding:48, color:'#94a3b8' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📝</div>
                  <div>No vouchers found. Create your first accounting entry.</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── OPENING BALANCE ── */}
      {tab === 'opening' && (
        <div className="card">
          <div className="card-header"><span className="card-title">🏁 Opening Balance Setup</span></div>
          <div className="card-body">
            <div style={{ background:'#eff6ff', border:'2px solid #bfdbfe', borderRadius:8, padding:'16px 20px', marginBottom:20 }}>
              <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:8, fontSize:14 }}>ℹ️ About Opening Balance</div>
              <div style={{ fontSize:13, color:'#1e40af', lineHeight:1.6 }}>
                Opening Balance is the balance of an account at the start of the financial year (1st April).<br/>
                Enter the balance for each account as it was at the beginning of the year.<br/>
                <strong>Assets & Expenses</strong> → DEBIT opening balance<br/>
                <strong>Liabilities, Income & Equity</strong> → CREDIT opening balance
              </div>
            </div>

            <div style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:8, padding:'20px', maxWidth:600 }}>
              <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:16, fontSize:14 }}>Enter Opening Balance</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Account Name *</label>
                  <input list="ob-accounts" value={openingForm.accountName}
                    onChange={e => setOF({...openingForm, accountName:e.target.value})}
                    placeholder="e.g. Cash Account, Bank Account"/>
                  <datalist id="ob-accounts">
                    {[...COMMON_ACCOUNTS, ...ledgers.map(l => l.accountName)].map(a => <option key={a} value={a}/>)}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Account Group</label>
                  <select value={openingForm.group} onChange={e => {
                    const g = e.target.value;
                    const type = ['ASSET','EXPENSE'].includes(g) ? 'DEBIT' : 'CREDIT';
                    setOF({...openingForm, group:g, type});
                  }}>
                    {['ASSET','LIABILITY','INCOME','EXPENSE','EQUITY'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Opening Balance (₹) *</label>
                  <input type="number" value={openingForm.openingBalance}
                    onChange={e => setOF({...openingForm, openingBalance:e.target.value})}
                    placeholder="Enter amount"/>
                </div>
                <div className="form-group">
                  <label>Balance Type</label>
                  <select value={openingForm.type} onChange={e => setOF({...openingForm, type:e.target.value})}>
                    <option value="DEBIT">DEBIT (Dr) — Assets, Expenses</option>
                    <option value="CREDIT">CREDIT (Cr) — Liabilities, Income, Equity</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" onClick={saveOpeningBalance} disabled={obLoading} style={{ marginTop:8 }}>
                {obLoading ? 'Saving...' : '✅ Save Opening Balance'}
              </button>
            </div>

            {/* Show existing opening balance vouchers */}
            <div style={{ marginTop:24 }}>
              <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:14 }}>
                📋 Opening Balance Entries ({vouchers.filter(v => v.narration?.includes('Opening Balance')).length})
              </div>
              {vouchers.filter(v => v.narration?.includes('Opening Balance')).length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Voucher#</th><th>Account</th><th>Date</th><th className="text-right">Amount</th></tr>
                    </thead>
                    <tbody>
                      {vouchers.filter(v => v.narration?.includes('Opening Balance')).map(v => (
                        <tr key={v.id}>
                          <td style={{ fontSize:11, fontWeight:600, color:'#1a4f8a' }}>{v.voucherNumber}</td>
                          <td><strong>{v.narration?.replace('Opening Balance: ','')}</strong></td>
                          <td style={{ fontSize:11 }}>{v.voucherDate}</td>
                          <td className="text-right" style={{ fontWeight:700 }}>{fmt(v.totalDebit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color:'#94a3b8', fontSize:13, padding:'16px 0' }}>No opening balances entered yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:700, width:'95vw' }}>
            <div className="modal-header">
              <h3>New {form.voucherType} Voucher</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ marginBottom:16 }}>
                <div className="form-group">
                  <label>Voucher Type</label>
                  <select value={form.voucherType} onChange={e => setForm({...form, voucherType:e.target.value})}>
                    {VOUCHER_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Voucher Date</label>
                  <input type="date" value={form.voucherDate || today()} onChange={e => setForm({...form, voucherDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Voucher Number</label>
                  <input value={form.voucherNumber || ''} onChange={e => setForm({...form, voucherNumber:e.target.value})} placeholder="Auto-generated if blank"/>
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input value={form.referenceNumber || ''} onChange={e => setForm({...form, referenceNumber:e.target.value})}/>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:16 }}>
                <label>Narration</label>
                <input value={form.narration || ''} onChange={e => setForm({...form, narration:e.target.value})} placeholder="Brief description of the voucher"/>
              </div>

              {/* Voucher Type Helper */}
              <div style={{ background:'#f0f4ff', border:'1px solid #c7d2fe', borderRadius:6, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#1e40af' }}>
                {form.voucherType === 'JOURNAL' && '📝 Journal: General accounting entries. DR & CR must be equal.'}
                {form.voucherType === 'PAYMENT' && '💸 Payment: Cash/Bank going OUT. Bank/Cash → Debit (Supplier/Expense).'}
                {form.voucherType === 'RECEIPT' && '💰 Receipt: Cash/Bank coming IN. Bank/Cash → Debit (Customer → Credit).'}
                {form.voucherType === 'CONTRA' && '🔄 Contra: Transfer between Cash & Bank accounts only.'}
              </div>

              {/* Entries */}
              <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:8 }}>Ledger Entries</div>
              <table style={{ width:'100%', marginBottom:8, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#1a4f8a' }}>
                    <th style={{ padding:'7px 10px', color:'white', textAlign:'left', fontSize:12 }}>Ledger Account</th>
                    <th style={{ padding:'7px 10px', color:'white', fontSize:12 }}>Dr/Cr</th>
                    <th style={{ padding:'7px 10px', color:'white', fontSize:12 }}>Amount (₹)</th>
                    <th style={{ padding:'7px 4px', color:'white' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom:'1px solid #e2e8f0', background: idx%2?'#f8fafc':'white' }}>
                      <td style={{ padding:'5px 6px' }}>
                        <input list={`accts-${idx}`} value={entry.ledgerName || ''} onChange={e => {
                          const name = e.target.value;
                          const l = ledgers.find(x => x.accountName === name);
                          const u = [...entries]; u[idx] = {...u[idx], ledgerName:name, ledgerId:l?.id||''};
                          setEntries(u);
                        }} placeholder="Type account name..." style={{ width:'100%', fontSize:12, padding:'4px 6px', border:'1px solid #e2e8f0', borderRadius:4 }}/>
                        <datalist id={`accts-${idx}`}>
                          {[...COMMON_ACCOUNTS, ...ledgers.map(l=>l.accountName)].map(a=><option key={a} value={a}/>)}
                        </datalist>
                      </td>
                      <td style={{ padding:'5px 6px' }}>
                        <select value={entry.entryType} onChange={e => updateEntry(idx,'entryType',e.target.value)} style={{ fontSize:12, padding:'4px 6px' }}>
                          <option value="DEBIT">DEBIT (Dr)</option>
                          <option value="CREDIT">CREDIT (Cr)</option>
                        </select>
                      </td>
                      <td style={{ padding:'5px 6px' }}>
                        <input type="number" value={entry.amount} onChange={e => updateEntry(idx,'amount',e.target.value)} style={{ width:130, fontSize:12, padding:'4px 6px', border:'1px solid #e2e8f0', borderRadius:4 }}/>
                      </td>
                      <td style={{ padding:'5px 4px' }}>
                        {entries.length > 2 && (
                          <button onClick={() => setEntries(entries.filter((_,i)=>i!==idx))} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:18 }}>×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-outline btn-sm" onClick={() => setEntries([...entries,{ledgerId:'',ledgerName:'',entryType:'DEBIT',amount:0}])} style={{ fontSize:12 }}>
                + Add Entry
              </button>

              {/* Balance Check */}
              <div style={{ marginTop:12, padding:'10px 14px', background: isBalanced?'#d1fae5':'#fee2e2', borderRadius:6, fontSize:13, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span>
                  Total Debit: <strong>{fmt(totalDebit)}</strong> &nbsp;|&nbsp; Total Credit: <strong>{fmt(totalCredit)}</strong>
                </span>
                <span style={{ fontWeight:700, color: isBalanced?'#059669':'#dc2626' }}>
                  {isBalanced ? '✅ BALANCED' : `❌ Diff: ${fmt(Math.abs(totalDebit-totalCredit))}`}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveVoucher} disabled={!isBalanced}>
                Post Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      <ConfirmModal
        open={!!confirmVoucher}
        title="Cancel Voucher?"
        message="This will cancel the voucher and reverse its accounting entries."
        details={confirmVoucher ? `Voucher: ${confirmVoucher.voucherNumber || confirmVoucher.id} — ${confirmVoucher.voucherType}` : ''}
        confirmLabel="Yes, Cancel Voucher"
        cancelLabel="Keep It"
        type="warning"
        onConfirm={async () => {
          try { await deleteVoucher(confirmVoucher.id); toast.success('Voucher cancelled'); getVouchers(selectedFY.value === 'ALL' ? {} : { financialYear: selectedFY.label }).then(r => setVouchers(r.data||[])); }
          catch { toast.error('Failed to cancel'); }
          setConfirmVoucher(null);
        }}
        onCancel={() => setConfirmVoucher(null)}
      />
    </>
  );
}
