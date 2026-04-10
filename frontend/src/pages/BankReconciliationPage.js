import React, { useState, useEffect } from 'react';
import {
  getBanks, getBankStatements, addBankStatement, deleteBankStatement,
  reconcileEntry, getUnreconciledEntries
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);

export default function BankReconciliationPage() {
  const [banks,        setBanks]        = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [statements,   setStatements]   = useState([]);
  const [unreconciled, setUnreconciled] = useState([]);
  const [tab,          setTab]          = useState('all');
  const [addModal,     setAddModal]     = useState(false);
  const [matchModal,   setMatchModal]   = useState(null);  // {entry, suggestions}
  const [form,         setForm]         = useState({transactionDate:today()});
  const [fromDate,     setFromDate]     = useState('');
  const [toDate,       setToDate]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [summary,      setSummary]      = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { fetchBanks(); }, []);
  useEffect(() => { if(selectedBank) fetchData(); }, [selectedBank, fromDate, toDate, tab]);

  const fetchBanks = async () => {
    try { const r = await getBanks(); setBanks(r.data||[]); } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { bankAccountId: selectedBank };
      if(fromDate) params.fromDate = fromDate;
      if(toDate)   params.toDate   = toDate;
      const r  = await getBankStatements(params);
      setStatements(r.data||[]);
      const r2 = await getUnreconciledEntries();
      setUnreconciled(r2.data||[]);
      // Calculate summary
      const all = r.data||[];
      setSummary({
        total:    all.length,
        matched:  all.filter(e=>e.reconciliationStatus==='MATCHED').length,
        unmatched:all.filter(e=>e.reconciliationStatus==='UNMATCHED').length,
        ignored:  all.filter(e=>e.reconciliationStatus==='IGNORED').length,
        totalCredit: all.reduce((s,e)=>s+(e.creditAmount||0),0),
        totalDebit:  all.reduce((s,e)=>s+(e.debitAmount||0),0),
      });
    } catch(e) { toast.error('Load failed'); }
    setLoading(false);
  };

  const saveEntry = async () => {
    if(!form.transactionDate){ toast.error('Date required'); return; }
    if(!form.debitAmount && !form.creditAmount){ toast.error('Debit ya Credit amount enter kara'); return; }
    try {
      await addBankStatement({...form, bankAccountId:selectedBank,
        bankAccountName: banks.find(b=>b.id===selectedBank)?.bankName||'',
        reconciliationStatus:'UNMATCHED'});
      toast.success('✅ Entry added');
      setAddModal(false);
      setForm({transactionDate:today()});
      fetchData();
    } catch(e){ toast.error('Failed'); }
  };

  const doReconcile = async (entryId, voucherType, voucherNumber, voucherId) => {
    try {
      await reconcileEntry(entryId, {voucherType, voucherNumber, voucherId});
      toast.success('✅ Matched!');
      setMatchModal(null);
      fetchData();
    } catch(e){ toast.error('Reconcile failed'); }
  };

  const displayList = tab==='unmatched'
    ? statements.filter(e=>e.reconciliationStatus==='UNMATCHED')
    : tab==='matched'
    ? statements.filter(e=>e.reconciliationStatus==='MATCHED')
    : statements;

  const STATUS_COLORS = {
    MATCHED:   {bg:'#dcfce7',color:'#166534'},
    UNMATCHED: {bg:'#fee2e2',color:'#dc2626'},
    IGNORED:   {bg:'#f1f5f9',color:'#64748b'},
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h2 style={{margin:0,fontWeight:800,color:'#1a4f8a'}}>🏦 Bank Reconciliation</h2>
          <p style={{margin:0,fontSize:13,color:'#64748b',marginTop:4}}>Bank statement vs aaplya records match kara</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <select value={selectedBank} onChange={e=>setSelectedBank(e.target.value)}
            style={{padding:'8px 14px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:13}}>
            <option value="">-- Select Bank Account --</option>
            {banks.map(b=><option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
          </select>
          {selectedBank && (
            <button className="btn btn-primary" onClick={()=>setAddModal(true)}>+ Add Entry</button>
          )}
        </div>
      </div>

      {!selectedBank && (
        <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>
          <div style={{fontSize:48,marginBottom:12}}>🏦</div>
          <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Bank Account Select kara</div>
          <div style={{fontSize:13}}>Settings → Bank Accounts madhe bank add kara, mag ithe reconcile kara</div>
        </div>
      )}

      {selectedBank && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:20}}>
              {[
                {label:'Total Entries', value:summary.total,          color:'#2563eb', money:false},
                {label:'Matched ✅',    value:summary.matched,        color:'#059669', money:false},
                {label:'Unmatched ❌',  value:summary.unmatched,      color:'#dc2626', money:false},
                {label:'Total Credit',  value:fmt(summary.totalCredit),color:'#059669', money:true},
                {label:'Total Debit',   value:fmt(summary.totalDebit), color:'#dc2626', money:true},
              ].map(c=>(
                <div key={c.label} style={{background:'#f8fafc',borderRadius:8,padding:'12px 14px',borderLeft:`4px solid ${c.color}`}}>
                  <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>{c.label}</div>
                  <div style={{fontWeight:700,color:c.color,fontSize:16}}>{c.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters + Tabs */}
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}
              style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:13}}/>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)}
              style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:13}}/>
            <button className="btn btn-outline btn-sm" onClick={fetchData}>🔄 Refresh</button>
            <div style={{marginLeft:'auto',display:'flex',gap:0,border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
              {[['all','All'],['unmatched','Unmatched'],['matched','Matched']].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)}
                  style={{padding:'6px 14px',border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
                    background:tab===k?'#1a4f8a':'#fff',color:tab===k?'#fff':'#374151'}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="card-body" style={{padding:0}}>
              {loading ? (
                <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>⏳ Loading...</div>
              ) : displayList.length===0 ? (
                <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
                  <div style={{fontSize:32,marginBottom:8}}>📊</div>
                  <div>Konathe entries nahi. "+ Add Entry" varun bank statement import kara.</div>
                </div>
              ) : (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'#1a4f8a',color:'#fff'}}>
                      {['Date','Description','Ref No.','Debit (Out)','Credit (In)','Status','Matched With','Action'].map(h=>(
                        <th key={h} style={{padding:'8px 10px',textAlign:['Debit (Out)','Credit (In)'].includes(h)?'right':'left',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayList.map((entry,i)=>{
                      const sc = STATUS_COLORS[entry.reconciliationStatus]||STATUS_COLORS.IGNORED;
                      return (
                        <tr key={entry.id} style={{borderBottom:'1px solid #e2e8f0',background:i%2?'#f8fafc':'#fff'}}>
                          <td style={{padding:'7px 10px',whiteSpace:'nowrap'}}>{entry.transactionDate}</td>
                          <td style={{padding:'7px 10px',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis'}}>{entry.description||'—'}</td>
                          <td style={{padding:'7px 10px',fontFamily:'monospace',fontSize:12}}>{entry.referenceNumber||'—'}</td>
                          <td style={{padding:'7px 10px',textAlign:'right',color:'#dc2626',fontWeight:entry.debitAmount>0?600:400}}>
                            {entry.debitAmount>0?fmt(entry.debitAmount):'—'}
                          </td>
                          <td style={{padding:'7px 10px',textAlign:'right',color:'#059669',fontWeight:entry.creditAmount>0?600:400}}>
                            {entry.creditAmount>0?fmt(entry.creditAmount):'—'}
                          </td>
                          <td style={{padding:'7px 10px'}}>
                            <span style={{...sc,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:4,display:'inline-block'}}>
                              {entry.reconciliationStatus}
                            </span>
                          </td>
                          <td style={{padding:'7px 10px',fontSize:12,color:'#64748b'}}>
                            {entry.matchedVoucherNumber||'—'}
                          </td>
                          <td style={{padding:'7px 10px'}}>
                            {entry.reconciliationStatus==='UNMATCHED' && (
                              <button className="btn btn-sm btn-primary"
                                onClick={()=>{
                                  const rec = unreconciled.find(u=>u.entry?.id===entry.id);
                                  setMatchModal({entry, suggestions: rec?.suggestions||[]});
                                }}>
                                🔗 Match
                              </button>
                            )}
                            <button className="btn btn-sm btn-outline" style={{color:'#dc2626',borderColor:'#dc2626',marginLeft:6}} onClick={()=>setConfirmDelete(entry)} title="Delete entry">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* ADD ENTRY MODAL */}
      {addModal && (
        <div className="modal-overlay" onClick={()=>setAddModal(false)}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>+ Add Bank Statement Entry</h3>
              <button className="modal-close" onClick={()=>setAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={form.transactionDate||''} onChange={e=>setForm(f=>({...f,transactionDate:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. NEFT from ABC Ltd"/>
                </div>
                <div className="form-group">
                  <label>Reference No. (UTR/Cheque)</label>
                  <input value={form.referenceNumber||''} onChange={e=>setForm(f=>({...f,referenceNumber:e.target.value}))} placeholder="UTR/Cheque number"/>
                </div>
                <div className="form-group">
                  <label>Entry Type</label>
                  <select value={form._type||'credit'} onChange={e=>setForm(f=>({...f,_type:e.target.value,debitAmount:0,creditAmount:0}))}>
                    <option value="credit">Credit (Money IN ← customer paid)</option>
                    <option value="debit">Debit (Money OUT → supplier paid)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input type="number" min="0" step="0.01"
                    value={form._type==='debit'?(form.debitAmount||''):(form.creditAmount||'')}
                    onChange={e=>{
                      const v=parseFloat(e.target.value)||0;
                      setForm(f=>({...f,
                        debitAmount: f._type==='debit'?v:0,
                        creditAmount: f._type==='credit'?v:0
                      }));
                    }} placeholder="0.00"/>
                </div>
                <div className="form-group">
                  <label>Balance after transaction</label>
                  <input type="number" step="0.01" value={form.balance||''}
                    onChange={e=>setForm(f=>({...f,balance:parseFloat(e.target.value)||0}))} placeholder="Optional"/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEntry}>💾 Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH MODAL */}
      {matchModal && (
        <div className="modal-overlay" onClick={()=>setMatchModal(null)}>
          <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔗 Match Entry</h3>
              <button className="modal-close" onClick={()=>setMatchModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 14px',marginBottom:16}}>
                <div style={{fontSize:12,color:'#64748b'}}>Bank Entry</div>
                <div style={{fontWeight:700}}>{matchModal.entry.description}</div>
                <div style={{fontSize:13,marginTop:4}}>
                  {matchModal.entry.creditAmount>0 && <span style={{color:'#059669'}}>Credit: {fmt(matchModal.entry.creditAmount)}</span>}
                  {matchModal.entry.debitAmount>0  && <span style={{color:'#dc2626'}}>Debit: {fmt(matchModal.entry.debitAmount)}</span>}
                  <span style={{color:'#94a3b8',marginLeft:12}}>{matchModal.entry.transactionDate}</span>
                </div>
              </div>

              {(matchModal.suggestions||[]).length>0 ? (
                <>
                  <div style={{fontWeight:600,marginBottom:10}}>🎯 Auto-suggestions (amount match):</div>
                  {matchModal.suggestions.map((s,i)=>(
                    <div key={i} style={{border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <span style={{fontWeight:700,color:'#1a4f8a'}}>{s.number}</span>
                        <span style={{fontSize:12,color:'#64748b',marginLeft:10}}>{s.type}</span>
                        <span style={{marginLeft:10}}>{s.customer||s.supplier||''}</span>
                        <div style={{fontSize:13,color:'#059669',fontWeight:600}}>₹{(s.amount||0).toLocaleString('en-IN')}</div>
                      </div>
                      <button className="btn btn-primary btn-sm"
                        onClick={()=>doReconcile(matchModal.entry.id,s.type,s.number,s.id)}>
                        ✅ Match
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{color:'#94a3b8',textAlign:'center',padding:20}}>
                  Auto-match nahi sapat. Manual number enter kara:
                </div>
              )}

              <div style={{marginTop:16,borderTop:'1px solid #e2e8f0',paddingTop:12}}>
                <div style={{fontWeight:600,marginBottom:8}}>Manual Match:</div>
                <div style={{display:'flex',gap:8}}>
                  <input id="manualVNum" placeholder="Invoice/Voucher number" style={{flex:1,padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:6}}/>
                  <select id="manualVType" style={{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:6}}>
                    <option value="SALES_INVOICE">Sales Invoice</option>
                    <option value="PURCHASE_PAYMENT">Purchase Payment</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button className="btn btn-primary btn-sm"
                    onClick={()=>{
                      const num = document.getElementById('manualVNum').value;
                      const type= document.getElementById('manualVType').value;
                      if(!num.trim()){toast.error('Number enter kara');return;}
                      doReconcile(matchModal.entry.id,type,num,null);
                    }}>Match</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setMatchModal(null)}>Close</button>
              <button className="btn btn-sm" style={{background:'#f1f5f9',color:'#64748b',border:'none',cursor:'pointer'}}
                onClick={async()=>{
                  try {
                    await import('../services/api').then(api=>api.reconcileEntry(matchModal.entry.id,{voucherType:'IGNORED',voucherNumber:'IGNORED'}));
                    toast.success('Entry ignored');
                    setMatchModal(null); fetchData();
                  } catch{}
                }}>Ignore Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Bank Statement */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Bank Statement Entry?"
        message="This bank statement entry will be permanently deleted."
        details={confirmDelete ? `Date: ${confirmDelete.transactionDate} — ${confirmDelete.description || 'No description'} — ${confirmDelete.debitAmount > 0 ? fmt(confirmDelete.debitAmount) + ' Dr' : fmt(confirmDelete.creditAmount) + ' Cr'}` : ''}
        confirmLabel="Yes, Delete"
        type="danger"
        onConfirm={async () => {
          try {
            await deleteBankStatement(confirmDelete.id);
            toast.success('Bank statement entry deleted');
            fetchData();
          } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to delete');
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
