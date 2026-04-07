import { printReport as printReportUtil } from '../utils/printUtils';
import React, { useState, useEffect } from 'react';
import { getExpenses, addExpense, updateExpense, deleteExpense, getExpenseHeads, addExpenseHead, updateExpenseHead, deleteExpenseHead, calculateInvoice } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useFY } from '../context/FYContext';
import ConfirmModal from '../components/ConfirmModal';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const PAYMENT_MODES = ['CASH','BANK TRANSFER','CHEQUE','UPI','NEFT/RTGS'];

export default function ExpensePage() {
  const { user: currentUser } = useAuth();
  const { selectedFY } = useFY();
  const isAdmin = currentUser?.roles?.includes('ROLE_ADMIN');
  const [tab, setTab]           = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [heads, setHeads]       = useState([]);
  const [showModal, setModal]   = useState(null);
  const [form, setForm]         = useState({ paymentMode:'CASH', gstRate:0 });
  const [headForm, setHeadForm] = useState({});
  const [confirmDeleteHead, setConfirmDeleteHead] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [filterHead, setFH]     = useState('');
  const [confirmItem, setConfirmItem] = useState(null);
  const [filterFrom, setFF]     = useState('');
  const [filterTo,   setFT]     = useState('');
  const [filterMode, setFM]     = useState('');
  const [search, setSearch]     = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [expRes, headRes] = await Promise.all([getExpenses(), getExpenseHeads()]);
      setExpenses(expRes.data || []);
      setHeads(headRes.data || []);
    } catch { setExpenses([]); setHeads([]); }
    setLoading(false);
  };

  const calcGst = (amount, rate) => {
    const a = Number(amount)||0, r = Number(rate)||0;
    const half = (a * r / 100) / 2;
    return { cgst: half, sgst: half, total: a + a * r / 100 };
  };

  const saveExpense = async () => {
    if (!form.expenseDate)            { toast.error('Expense date is required'); return; }
    if (!form.expenseHeadName?.trim()) { toast.error('Expense Head is required'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    if (!form.paymentMode)             { toast.error('Payment mode is required'); return; }
    
    // Get totals from backend API
    let cgst, sgst, total;
    try {
      const invoice = {
        items: [{
          itemId: 'expense',
          itemName: form.expenseHeadName,
          quantity: 1,
          rate: form.amount,
          discount: 0,
          gstRate: form.gstRate || 0
        }],
        discount: 0,
        freightCharge: 0,
        packagingCharge: 0,
        otherCharge: 0,
        roundOff: 0
      };
      const response = await calculateInvoice(invoice, false);
      cgst = response.data.totalCgst || 0;
      sgst = response.data.totalSgst || 0;
      total = response.data.grandTotal || form.amount;
    } catch (err) {
      // Fallback to frontend calc
      const a = Number(form.amount)||0, r = Number(form.gstRate)||0;
      const half = (a * r / 100) / 2;
      cgst = half;
      sgst = half;
      total = a + a * r / 100;
    }
    
    const head = heads.find(h => h.headName === form.expenseHeadName);
    try {
      const data = { ...form, expenseHeadId:head?.id, cgstAmount:cgst, sgstAmount:sgst, totalAmount:total, financialYear:selectedFY.label, status:'APPROVED' };
      if (form.id) { await updateExpense(form.id, data); toast.success('Expense updated!'); }
      else         { await addExpense(data);             toast.success('Expense saved!'); }
      setModal(null); setForm({ paymentMode:'CASH', gstRate:0 }); fetchAll();
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async () => {
    if (!confirmItem) return;
    try { await deleteExpense(confirmItem.id); toast.success('Expense deleted!'); fetchAll(); }
    catch { toast.error('Failed to delete'); }
    setConfirmItem(null);
  };

  const saveHead = async () => {
    if (!headForm.name) { toast.error('Enter name'); return; }
    try {
      if (headForm.id) {
        await updateExpenseHead(headForm.id, { headName: headForm.name, description: headForm.description, active:true });
        toast.success('Updated!');
      } else {
        await addExpenseHead({ headName: headForm.name, description: headForm.description, active:true });
        toast.success('Created!');
      }
      setModal(null); setHeadForm({}); fetchAll();
    }
    catch { toast.error('Failed'); }
  };

  const filtered = expenses.filter(e => {
    if (filterHead && e.expenseHeadName !== filterHead) return false;
    if (filterMode && e.paymentMode !== filterMode)     return false;
    if (filterFrom && e.expenseDate < filterFrom)       return false;
    if (filterTo   && e.expenseDate > filterTo)         return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(e.expenseHeadName||'').toLowerCase().includes(s) && !(e.description||'').toLowerCase().includes(s) && !(e.voucherNumber||'').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const totalAmt = filtered.reduce((s,e) => s+(Number(e.amount)||0), 0);
  const totalGst = filtered.reduce((s,e) => s+(Number(e.cgstAmount)||0)*2, 0);
  const totalAll = filtered.reduce((s,e) => s+(Number(e.totalAmount)||0), 0);

  const headSummary = heads.map(h => {
    const exps = expenses.filter(e => e.expenseHeadName === h.headName);
    return { name:h.headName, count:exps.length, total:exps.reduce((s,e)=>s+(e.totalAmount||0),0) };
  }).filter(h => h.count > 0).sort((a,b) => b.total - a.total);

  const printReport = () => {
    const total = filtered.reduce((s,e)=>s+(e.amount||0),0);
    printReportUtil({
      title: 'Expense Report',
      subtitle: `Period: ${filterFrom||'All'} to ${filterTo||'All'}`,
      summaryCards: [
        { label: 'Total Expenses', value: fmt(total), color: '#dc2626' },
        { label: 'No. of Entries', value: filtered.length },
      ],
      tableHeaders: [
        {label:'#'}, {label:'Date'}, {label:'Category'}, {label:'Description'},
        {label:'Payment Mode'}, {label:'Amount',right:true}
      ],
      tableRows: filtered.map((e,i) => [
        {value:i+1},
        {value:e.expenseDate||e.date||'—'},
        {value:e.expenseHeadName||'—'},
        {value:e.description||e.narration||'—'},
        {value:e.paymentMode||'—'},
        {value:fmt(e.amount||0), right:true, style:'font-weight:600;color:#dc2626'}
      ]),
      footerNote: `Total Expenses: ${fmt(total)}`
    });
  };

  const deleteHead = async () => {
    try {
      const inUse = expenses.filter(e => e.expenseHeadName === confirmDeleteHead.headName).length;
      if (inUse > 0) { toast.error(`Cannot delete — ${inUse} expenses use this category`); setConfirmDeleteHead(null); return; }
      await deleteExpenseHead(confirmDeleteHead.id);
      toast.success('Deleted!');
      setConfirmDeleteHead(null); fetchAll();
    } catch(e) { toast.error('Failed to delete'); }
  };

  return (
    <>
    <div>
      <div className="tabs">
        {[['expenses','💸 Expenses'],['summary','📊 Head-wise Summary'],['heads','📋 Expense Heads']].map(([k,l])=>(
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ─── EXPENSES TAB ─── */}
      {tab==='expenses' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">💸 Expense Vouchers</span>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{background:'#fee2e2',color:'#dc2626',padding:'4px 14px',borderRadius:12,fontSize:12,fontWeight:700}}>Total: {fmt(totalAll)}</span>
              <button className="btn btn-outline" onClick={printReport} style={{fontSize:12}}>🖨️ Print</button>
              <button className="btn btn-primary" onClick={()=>{setForm({paymentMode:'CASH',gstRate:0});setModal('add');}}>+ New Expense</button>
            </div>
          </div>
          <div className="card-body">
            {/* Filters */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14,padding:'10px 12px',background:'#f8fafc',borderRadius:7,border:'1px solid #e2e8f0'}}>
              <input placeholder="🔍 Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{height:30,fontSize:12,minWidth:180}}/>
              <select value={filterHead} onChange={e=>setFH(e.target.value)} style={{height:30,fontSize:12}}>
                <option value="">All Heads</option>
                {heads.map(h=><option key={h.id} value={h.headName}>{h.headName}</option>)}
              </select>
              <select value={filterMode} onChange={e=>setFM(e.target.value)} style={{height:30,fontSize:12}}>
                <option value="">All Modes</option>
                {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
              </select>
              <input type="date" value={filterFrom} onChange={e=>setFF(e.target.value)} style={{height:30,fontSize:12}} title="From"/>
              <input type="date" value={filterTo}   onChange={e=>setFT(e.target.value)} style={{height:30,fontSize:12}} title="To"/>
              <button className="btn btn-outline" onClick={()=>{setFH('');setFM('');setFF('');setFT('');setSearch('');}} style={{height:30,fontSize:12}}>✕ Clear</button>
              <span style={{marginLeft:'auto',fontSize:11,color:'#94a3b8',display:'flex',alignItems:'center'}}>{filtered.length}/{expenses.length} records</span>
            </div>

            {/* Stats */}
            {filtered.length > 0 && (
              <div style={{display:'flex',gap:10,marginBottom:12}}>
                {[['Base Amount',totalAmt,'#1a4f8a'],['GST Amount',totalGst,'#d97706'],['Total Paid',totalAll,'#dc2626']].map(([l,v,c])=>(
                  <div key={l} style={{flex:1,background:'white',border:`2px solid ${c}20`,borderTop:`3px solid ${c}`,borderRadius:6,padding:'8px 12px'}}>
                    <div style={{fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5}}>{l}</div>
                    <div style={{fontWeight:800,color:c,fontSize:14}}>{fmt(v)}</div>
                  </div>
                ))}
              </div>
            )}

            {loading ? <div className="text-center" style={{padding:40}}>Loading...</div> :
            filtered.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>Voucher No</th><th>Expense Head</th><th>Description</th><th>Payment</th><th className="text-right">Amount</th><th className="text-right">GST</th><th className="text-right">Total</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(e=>(
                      <tr key={e.id}>
                        <td style={{whiteSpace:'nowrap'}}>{e.expenseDate}</td>
                        <td style={{fontSize:11,color:'#94a3b8'}}>{e.voucherNumber||'—'}</td>
                        <td><strong>{e.expenseHeadName}</strong></td>
                        <td style={{color:'#64748b',fontSize:12}}>{e.description||'—'}</td>
                        <td><span className="badge badge-secondary">{e.paymentMode}</span></td>
                        <td className="text-right">{fmt(e.amount)}</td>
                        <td className="text-right" style={{color:'#64748b',fontSize:11}}>{e.gstRate>0?`${e.gstRate}%`:'—'}</td>
                        <td className="text-right" style={{fontWeight:700,color:'#dc2626'}}>{fmt(e.totalAmount)}</td>
                        <td>
                          <div style={{display:'flex',gap:4}}>
                            <button className="btn btn-outline" style={{padding:'3px 10px',fontSize:11}} onClick={()=>{setForm({...e});setModal('edit');}}>✏️ Edit</button>
                            {isAdmin && <button className="btn btn-outline" style={{padding:'3px 10px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}} onClick={()=>setConfirmItem(e)}>🗑️</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#f0f4ff',fontWeight:700,borderTop:'2px solid #1a4f8a'}}>
                      <td colSpan={5} style={{padding:'8px 10px',color:'#1a4f8a'}}>TOTAL ({filtered.length} entries)</td>
                      <td className="text-right" style={{color:'#1a4f8a'}}>{fmt(totalAmt)}</td>
                      <td className="text-right" style={{color:'#d97706'}}>{fmt(totalGst)}</td>
                      <td className="text-right" style={{color:'#dc2626'}}>{fmt(totalAll)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center" style={{padding:56,color:'#94a3b8'}}>
                <div style={{fontSize:44,marginBottom:12}}>💸</div>
                <div style={{fontSize:15,fontWeight:600}}>{expenses.length===0?'No expenses yet':'No results match filters'}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SUMMARY TAB ─── */}
      {tab==='summary' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📊 Head-wise Expense Summary</span>
            <button className="btn btn-outline" onClick={printReport} style={{fontSize:12}}>🖨️ Print Report</button>
          </div>
          <div className="card-body">
            {headSummary.length > 0 ? (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
                  {[['Heads Used',headSummary.length,'#1a4f8a',false],['Total Expenses',expenses.reduce((s,e)=>s+(e.totalAmount||0),0),'#dc2626',true],['Total Entries',expenses.length,'#d97706',false]].map(([l,v,c,money])=>(
                    <div key={l} style={{background:'white',border:`2px solid ${c}20`,borderTop:`4px solid ${c}`,borderRadius:8,padding:'12px 16px'}}>
                      <div style={{fontSize:11,color:'#94a3b8'}}>{l}</div>
                      <div style={{fontWeight:800,color:c,fontSize:20}}>{money?fmt(v):v}</div>
                    </div>
                  ))}
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>#</th><th>Expense Head</th><th className="text-right">Entries</th><th className="text-right">Total Amount</th><th>% Share</th></tr></thead>
                    <tbody>
                      {headSummary.map((h,i)=>{
                        const grandTotal = headSummary.reduce((s,x)=>s+x.total,0);
                        const pct = grandTotal>0?(h.total/grandTotal*100).toFixed(1):0;
                        return (
                          <tr key={h.name}>
                            <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                            <td><strong>{h.name}</strong></td>
                            <td className="text-right">{h.count}</td>
                            <td className="text-right" style={{fontWeight:700,color:'#dc2626'}}>{fmt(h.total)}</td>
                            <td>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{flex:1,height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                                  <div style={{width:`${pct}%`,height:'100%',background:'#1a4f8a',borderRadius:4}}/>
                                </div>
                                <span style={{fontSize:11,color:'#64748b',minWidth:35}}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background:'#f0f4ff',fontWeight:700,borderTop:'2px solid #1a4f8a'}}>
                        <td colSpan={2} style={{padding:'8px 10px',color:'#1a4f8a'}}>GRAND TOTAL</td>
                        <td className="text-right">{expenses.length}</td>
                        <td className="text-right" style={{color:'#dc2626'}}>{fmt(headSummary.reduce((s,h)=>s+h.total,0))}</td>
                        <td>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : <div className="text-center" style={{padding:56,color:'#94a3b8'}}><div style={{fontSize:44}}>📊</div><div style={{marginTop:12}}>No expense data yet.</div></div>}
          </div>
        </div>
      )}

      {/* ─── HEADS TAB ─── */}
      {tab==='heads' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Expense Heads / Categories</span>
            <button className="btn btn-primary" onClick={()=>{setHeadForm({});setModal('head');}}>+ Add Head</button>
          </div>
          <div className="card-body">
            {heads.length>0 ? (
              <div className="table-container"><table>
                <thead><tr><th>#</th><th>Head</th><th>Description</th><th className="text-right">Total Spent</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{heads.map((h,i)=>{
                  const spent = expenses.filter(e=>e.expenseHeadName===h.headName).reduce((s,e)=>s+(e.totalAmount||0),0);
                  return <tr key={h.id}>
  <td style={{color:'#94a3b8',fontSize:12}}>{i+1}</td>
  <td><strong>{h.name}</strong></td>
  <td style={{fontSize:12,color:'#64748b'}}>{h.description||'—'}</td>
  <td className="text-right" style={{fontWeight:600,color:'#dc2626'}}>{spent>0?fmt(spent):'—'}</td>
  <td><span className={`badge ${h.active?'badge-success':'badge-danger'}`}>{h.active?'Active':'Inactive'}</span></td>
  <td style={{display:'flex',gap:4}}>
    <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
      onClick={()=>{setHeadForm({id:h.id,name:h.headName,description:h.description});setModal('head');}}>✏️ Edit</button>
    <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,borderColor:'#dc2626',color:'#dc2626'}}
      onClick={()=>setConfirmDeleteHead(h)}>🗑️ Del</button>
  </td>
</tr>;
                })}</tbody>
              </table></div>
            ) : <div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40,marginBottom:12}}>📋</div><div>No heads yet. Create categories like Rent, Salary, Utilities...</div></div>}
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT MODAL ─── */}
      {(showModal==='add'||showModal==='edit') && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:580}}>
            <div className="modal-header"><h3>{showModal==='edit'?'✏️ Edit Expense':'➕ New Expense Entry'}</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Date *</label><input type="date" value={form.expenseDate||''} onChange={e=>setForm({...form,expenseDate:e.target.value})}/></div>
                <div className="form-group"><label>Expense Head *</label>
                  <select value={form.expenseHeadName||''} onChange={e=>setForm({...form,expenseHeadName:e.target.value})}>
                    <option value="">-- Select --</option>{heads.map(h=><option key={h.id} value={h.headName}>{h.headName}</option>)}
                  </select></div>
                <div className="form-group"><label>Amount (₹) *</label><input type="number" min="0" value={form.amount||''} onChange={e=>setForm({...form,amount:e.target.value})}/></div>
                <div className="form-group"><label>GST Rate (%)</label>
                  <select value={form.gstRate||0} onChange={e=>setForm({...form,gstRate:e.target.value})}>
                    {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                  </select></div>
                <div className="form-group"><label>Payment Mode</label>
                  <select value={form.paymentMode} onChange={e=>setForm({...form,paymentMode:e.target.value})}>
                    {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
                  </select></div>
                <div className="form-group"><label>Voucher No.</label><input value={form.voucherNumber||''} placeholder="Auto if empty" onChange={e=>setForm({...form,voucherNumber:e.target.value})}/></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label>Description</label><input value={form.description||''} placeholder="Brief description" onChange={e=>setForm({...form,description:e.target.value})}/></div>
              </div>
              {form.amount>0 && (
                <div style={{background:'#f0f4ff',borderRadius:6,padding:'10px 14px',marginTop:8,fontSize:12}}>
                  <strong>Preview: </strong>Base {fmt(form.amount)} + GST({form.gstRate||0}% = {fmt(calcGst(form.amount,form.gstRate).cgst*2)}) = <strong style={{color:'#1a4f8a'}}>Total: {fmt(calcGst(form.amount,form.gstRate).total)}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveExpense}>{showModal==='edit'?'Update':'Save'} Expense</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── HEAD MODAL ─── */}
      {showModal==='head' && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h3>{headForm.id ? '✏️ Edit Expense Head' : 'Add Expense Head'}</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-group"><label>Head Name *</label><input value={headForm.name||''} placeholder="e.g. Rent, Salary, Electricity" onChange={e=>setHeadForm({...headForm,name:e.target.value})} autoFocus/></div>
              <div className="form-group"><label>Description</label><input value={headForm.description||''} onChange={e=>setHeadForm({...headForm,description:e.target.value})}/></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveHead}>{headForm.id ? 'Update' : 'Create Head'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
      <ConfirmModal
        open={!!confirmDeleteHead}
        title="Delete Expense Head"
        message={`Delete "${confirmDeleteHead?.headName}"?`}
        details="This cannot be undone."
        confirmLabel="Yes, Delete"
        type="danger"
        onConfirm={deleteHead}
        onCancel={() => setConfirmDeleteHead(null)}
      />
      <ConfirmModal
        open={!!confirmItem}
        title="Delete Expense?"
        message={`Are you sure you want to delete this expense?`}
        details={confirmItem ? `${confirmItem.expenseHeadName || 'Expense'} — ₹${confirmItem.amount?.toLocaleString('en-IN')} on ${confirmItem.expenseDate}` : ''}
        confirmLabel="Yes, Delete"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmItem(null)}
      />
    </>
  );
}
