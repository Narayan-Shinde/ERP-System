import React, { useState, useEffect, useRef } from 'react';
import {
  getRecurringInvoices, addRecurringInvoice, updateRecurringInvoice,
  deleteRecurringInvoice, runRecurringNow, getCustomers, getItems,
  calculateInvoice
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const fmt  = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);
const FREQ  = ['MONTHLY','WEEKLY','QUARTERLY','YEARLY','DAILY'];
const STATUS_COLORS = {ACTIVE:{bg:'#dcfce7',c:'#166534'},PAUSED:{bg:'#fef3c7',c:'#92400e'},COMPLETED:{bg:'#e0e7ff',c:'#3730a3'},CANCELLED:{bg:'#fee2e2',c:'#dc2626'}};

export default function RecurringInvoicePage() {
  const [invoices,  setInvoices]  = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items,     setItems]     = useState([]);
  const [modal,     setModal]     = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [calculatedTotal, setCalculatedTotal] = useState(null);
  const [form,      setForm]      = useState({frequency:'MONTHLY',dayOfMonth:1,dueDays:30,invoiceType:'TAX_INVOICE',status:'ACTIVE',items:[{itemId:'',itemName:'',quantity:1,unit:'Pcs',rate:0,gstRate:18}]});
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(()=>{ fetchAll(); },[selectedFY.label]);

  const fetchAll = async () => {
    try {
      const [r1,r2,r3] = await Promise.all([getRecurringInvoices(),getCustomers(),getItems()]);
      setInvoices(r1.data||[]); setCustomers(r2.data||[]); setItems(r3.data||[]);
    } catch(e){ toast.error('Load failed'); }
  };

  const save = async () => {
    if(!form.customerId){ toast.error('Customer select kara'); return; }
    if(!form.name?.trim()){ toast.error('Name/Label required'); return; }
    if(!(form.items||[]).some(r=>r.itemId)){ toast.error('At least one item add kara'); return; }
    try {
      if(editId) await updateRecurringInvoice(editId, form);
      else       await addRecurringInvoice(form);
      toast.success('✅ Recurring Invoice saved!');
      setModal(false); setEditId(null);
      setForm({frequency:'MONTHLY',dayOfMonth:1,dueDays:30,invoiceType:'TAX_INVOICE',status:'ACTIVE',items:[{itemId:'',itemName:'',quantity:1,unit:'Pcs',rate:0,gstRate:18}]});
      fetchAll();
    } catch(e){ toast.error(e.response?.data?.error||'Failed'); }
  };

  const runNow = async (id, name) => {
    if(!window.confirm(`"${name}" sathi aata invoice generate kara?`)) return;
    try {
      const r = await runRecurringNow(id);
      toast.success('✅ Invoice generated: ' + (r.data?.invoice?.invoiceNumber||''));
      fetchAll();
    } catch(e){ toast.error(e.response?.data?.error||'Failed'); }
  };

  const openEdit = (inv) => {
    setForm({...inv}); setEditId(inv.id); setModal(true);
  };

  const updateItem = (i, field, val) => {
    const rows = [...(form.items||[])];
    if(field==='itemId') {
      const it = items.find(x=>x.id===val);
      rows[i] = {...rows[i], itemId:val, itemName:it?.itemName||'', unit:it?.unit||'Pcs', rate:it?.salesRate||0, gstRate:it?.gstRate||18, hsnCode:it?.hsnCode||''};
    } else {
      rows[i] = {...rows[i], [field]: field==='quantity'||field==='rate'||field==='gstRate'||field==='discount' ? parseFloat(val)||0 : val};
    }
    setForm(f=>({...f,items:rows}));
  };

  // ── Backend Calculation (Professional ERP Pattern) ──
  const calcTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    
    const validItems = (form.items || []).filter(it => it.itemId && it.quantity > 0);
    if (validItems.length === 0) {
      setCalculatedTotal(null);
      return;
    }
    
    calcTimeoutRef.current = setTimeout(async () => {
      try {
        const invoice = {
          items: validItems.map(it => ({
            itemId: it.itemId,
            itemName: it.itemName,
            hsnCode: it.hsnCode,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            discount: it.discount || 0,
            gstRate: it.gstRate
          })),
          discount: 0,
          freightCharge: 0,
          packagingCharge: 0,
          otherCharge: 0,
          roundOff: 0
        };
        
        const response = await calculateInvoice(invoice, false);
        setCalculatedTotal(response.data.grandTotal);
      } catch (err) {
        // Silent fail - will use fallback
      }
    }, 300);
    
    return () => {
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  }, [form.items]);

  // ── Fallback Frontend Calc (for offline/resilience) ──
  const calcTotalFallback = () => {
    return (form.items||[]).reduce((s,r)=>{
      const base = (r.quantity||0)*(r.rate||0)*(1-(r.discount||0)/100);
      return s + base + base*(r.gstRate||0)/100;
    },0);
  };

  const total = calculatedTotal || calcTotalFallback();

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h2 style={{margin:0,fontWeight:800,color:'#1a4f8a'}}>🔄 Recurring Invoices</h2>
          <p style={{margin:0,fontSize:13,color:'#64748b',marginTop:4}}>Auto-generate invoices monthly/weekly/quarterly</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditId(null);setForm({frequency:'MONTHLY',dayOfMonth:1,dueDays:30,invoiceType:'TAX_INVOICE',status:'ACTIVE',items:[{itemId:'',itemName:'',quantity:1,unit:'Pcs',rate:0,gstRate:18}]});setModal(true);}}>
          + New Recurring Invoice
        </button>
      </div>

      {invoices.length===0 ? (
        <div style={{textAlign:'center',padding:60,color:'#94a3b8',background:'white',borderRadius:12,border:'1px solid #e2e8f0'}}>
          <div style={{fontSize:48,marginBottom:12}}>🔄</div>
          <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Konathe recurring invoice nahi</div>
          <div style={{fontSize:13,marginBottom:20}}>Monthly rent, AMC charges, subscription fees — ek vela set kara, auto generate hote</div>
          <button className="btn btn-primary" onClick={()=>{setModal(true);}}>+ Create First Recurring Invoice</button>
        </div>
      ) : (
        <div style={{display:'grid',gap:12}}>
          {invoices.map(inv=>{
            const sc = STATUS_COLORS[inv.status]||STATUS_COLORS.PAUSED;
            const total = (inv.items||[]).reduce((s,r)=>{
              const base=(r.quantity||0)*(r.rate||0); return s+base+base*(r.gstRate||0)/100;
            },0);
            return (
              <div key={inv.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:15,color:'#1a4f8a'}}>{inv.name}</span>
                    <span style={{...sc,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:4}}>{inv.status}</span>
                    <span style={{background:'#eff6ff',color:'#1d4ed8',fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4}}>{inv.frequency}</span>
                  </div>
                  <div style={{display:'flex',gap:20,fontSize:13,color:'#64748b'}}>
                    <span>👤 {inv.customerName}</span>
                    <span>💰 {fmt(total)}</span>
                    <span>📅 Next: <b style={{color:'#374151'}}>{inv.nextRunDate||'—'}</b></span>
                    <span>🔢 Runs: {inv.totalRuns||0}{inv.maxRuns>0?`/${inv.maxRuns}`:''}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {inv.status==='ACTIVE' && (
                    <button className="btn btn-sm btn-primary" onClick={()=>runNow(inv.id,inv.name)}>▶ Run Now</button>
                  )}
                  <button className="btn btn-sm btn-outline" onClick={()=>openEdit(inv)}>✏️ Edit</button>
                  <button className="btn btn-sm btn-outline"
                    style={{color:inv.status==='ACTIVE'?'#d97706':'#059669',borderColor:inv.status==='ACTIVE'?'#d97706':'#059669'}}
                    onClick={async()=>{
                      await updateRecurringInvoice(inv.id,{...inv,status:inv.status==='ACTIVE'?'PAUSED':'ACTIVE'});
                      toast.success(inv.status==='ACTIVE'?'Paused':'Activated');
                      fetchAll();
                    }}>{inv.status==='ACTIVE'?'⏸ Pause':'▶ Resume'}</button>
                  <button className="btn btn-sm btn-outline" style={{color:'#dc2626',borderColor:'#dc2626'}}
                    onClick={()=>setConfirmDelete(inv)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Recurring Invoice */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete Recurring Invoice?"
        message="This recurring invoice setup will be permanently deleted."
        details={confirmDelete ? `${confirmDelete.name} — ${confirmDelete.frequency} — Customer: ${confirmDelete.customerName}` : ''}
        confirmLabel="Yes, Delete"
        type="danger"
        onConfirm={async () => {
          try {
            await deleteRecurringInvoice(confirmDelete.id);
            toast.success('Recurring invoice deleted');
            fetchAll();
          } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to delete');
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal" style={{maxWidth:760}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId?'Edit':'New'} Recurring Invoice</h3>
              <button className="modal-close" onClick={()=>setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Name / Label *</label>
                  <input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    placeholder="e.g. Monthly Rent, AMC Charges, Subscription Fee"/>
                </div>
                <div className="form-group">
                  <label>Customer *</label>
                  <select value={form.customerId||''} onChange={e=>{
                    const c=customers.find(x=>x.id===e.target.value);
                    setForm(f=>({...f,customerId:e.target.value,customerName:c?.customerName||c?.name||'',
                      customerGstin:c?.gstin||'',customerAddress:c?.address||'',customerState:c?.state||'',
                      customerPhone:c?.phone||'',customerEmail:c?.email||''}));
                  }}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.customerName||c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={form.frequency||'MONTHLY'} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
                    {FREQ.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Day of Month (1-28)</label>
                  <input type="number" min="1" max="28" value={form.dayOfMonth||1}
                    onChange={e=>setForm(f=>({...f,dayOfMonth:parseInt(e.target.value)||1}))}/>
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate||today()} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>End Date <span style={{fontSize:11,color:'#94a3b8'}}>(blank = infinite)</span></label>
                  <input type="date" value={form.endDate||''} onChange={e=>setForm(f=>({...f,endDate:e.target.value||null}))}/>
                </div>
                <div className="form-group">
                  <label>Max Runs <span style={{fontSize:11,color:'#94a3b8'}}>(0 = unlimited)</span></label>
                  <input type="number" min="0" value={form.maxRuns||0} onChange={e=>setForm(f=>({...f,maxRuns:parseInt(e.target.value)||0}))}/>
                </div>
                <div className="form-group">
                  <label>Due Days</label>
                  <input type="number" min="0" value={form.dueDays||30} onChange={e=>setForm(f=>({...f,dueDays:parseInt(e.target.value)||30}))}/>
                </div>
                <div className="form-group">
                  <label>Invoice Type</label>
                  <select value={form.invoiceType||'TAX_INVOICE'} onChange={e=>setForm(f=>({...f,invoiceType:e.target.value}))}>
                    <option value="TAX_INVOICE">Tax Invoice</option>
                    <option value="RETAIL_INVOICE">Retail Invoice</option>
                  </select>
                </div>
                {editId && (
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status||'ACTIVE'} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                )}
              </div>

              <h4 style={{margin:'16px 0 8px'}}>Items</h4>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'#1a4f8a',color:'#fff'}}>
                  {['Item','Qty','Unit','Rate','Disc%','GST%','Total',''].map(h=>(
                    <th key={h} style={{padding:'7px 8px',textAlign:['Qty','Rate','Disc%','GST%','Total'].includes(h)?'right':'left'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(form.items||[]).map((row,i)=>(
                    <tr key={i}>
                      <td style={{padding:'4px'}}>
                        <select value={row.itemId||''} style={{minWidth:140}} onChange={e=>updateItem(i,'itemId',e.target.value)}>
                          <option value="">-- Select --</option>
                          {items.map(it=><option key={it.id} value={it.id}>{it.itemName}</option>)}
                        </select>
                      </td>
                      <td style={{padding:'4px'}}><input type="number" min="0.001" step="0.001" style={{width:70,textAlign:'right'}} value={row.quantity||''} onChange={e=>updateItem(i,'quantity',e.target.value)}/></td>
                      <td style={{padding:'4px'}}><input value={row.unit||'Pcs'} style={{width:60}} onChange={e=>updateItem(i,'unit',e.target.value)}/></td>
                      <td style={{padding:'4px'}}><input type="number" min="0" step="0.01" style={{width:90,textAlign:'right'}} value={row.rate||''} onChange={e=>updateItem(i,'rate',e.target.value)}/></td>
                      <td style={{padding:'4px'}}><input type="number" min="0" max="100" style={{width:60,textAlign:'right'}} value={row.discount||''} onChange={e=>updateItem(i,'discount',e.target.value)}/></td>
                      <td style={{padding:'4px'}}><input type="number" min="0" style={{width:60,textAlign:'right'}} value={row.gstRate||''} onChange={e=>updateItem(i,'gstRate',e.target.value)}/></td>
                      <td style={{padding:'4px',textAlign:'right',fontWeight:600}}>
                        {fmt((row.quantity||0)*(row.rate||0)*(1-(row.discount||0)/100)*(1+(row.gstRate||0)/100))}
                      </td>
                      <td style={{padding:'4px',textAlign:'center'}}>
                        <button style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}}
                          onClick={()=>setForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td colSpan={6} style={{textAlign:'right',padding:'8px',fontWeight:600}}>Invoice Total:</td>
                  <td style={{padding:'8px',textAlign:'right',fontWeight:700,color:'#1a4f8a',fontSize:15}}>{fmt(total)}</td>
                  <td></td>
                </tr></tfoot>
              </table>
              <button className="btn btn-outline btn-sm" style={{marginTop:8}}
                onClick={()=>setForm(f=>({...f,items:[...(f.items||[]),{itemId:'',itemName:'',quantity:1,unit:'Pcs',rate:0,gstRate:18}]}))}>
                + Add Item
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>💾 Save Recurring Invoice</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
