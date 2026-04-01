import React, { useState, useEffect } from 'react';
import {
  getBanks, getCustomers, addCustomer, updateCustomer, deleteCustomer,
  getSalesInvoices, addSalesInvoice, updateSalesInvoice, cancelSalesInvoice, recordSalesPayment,
  getSalesOrders, addSalesOrder, updateSalesOrder, deleteSalesOrder,
  getSalesReturns, addSalesReturn, updateSalesReturn,
  getItems, getSalesRegister, convertToInvoice
} from '../services/api';
import { printSalesInvoiceMulti } from '../utils/printUtils';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { useFY } from '../context/FYContext';
import { useAuth } from '../context/AuthContext';

const fmt   = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const today = () => new Date().toISOString().split('T')[0];
const GST_RATES = [0,0.25,1,3,5,12,18,28];
const STATUS_COLOR = {PAID:'#16a34a',PARTIAL:'#d97706',PENDING:'#dc2626',RETURNED:'#7c3aed',CONFIRMED:'#2563eb',DRAFT:'#64748b',CANCELLED:'#94a3b8'};
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry'];

export default function SalesPage() {
  const { selectedFY } = useFY();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.includes('ROLE_ADMIN') || currentUser?.roles?.includes('ROLE_ACCOUNTANT');

  const [tab, setTab]             = useState('invoices');
  const [customers, setCusts]     = useState([]);
  const [invoices,  setInv]       = useState([]);
  const [orders,    setOrders]    = useState([]);
  const [returns,   setReturns]   = useState([]);
  const [items,     setItems]     = useState([]);
  const [banks,     setBanks]     = useState([]);
  const [register,  setReg]       = useState(null);

  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('');

  const [modal, setModal]         = useState(null);
  const [form,  setForm]          = useState({});
  const [invItems, setInvItems]   = useState([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);
  const [editReturnId, setEditReturnId] = useState(null);

  const [payModal, setPayModal]   = useState(null);
  const [payAmt,   setPayAmt]     = useState('');
  const [payRef,   setPayRef]     = useState('');
  const [payNotes, setPayNotes]   = useState('');

  const [regFrom, setRegFrom]     = useState('');
  const [regTo,   setRegTo]       = useState('');

  const [printModal,  setPrintModal]  = useState(null);
  const [printCopies, setPrintCopies] = useState({customer:true,transport:false,supplier:false,challan:false});

  const [confirmCancelInv,    setConfirmCancelInv]    = useState(null);
  const [confirmDeleteCust,   setConfirmDeleteCust]   = useState(null);
  const [confirmDeleteOrder,  setConfirmDeleteOrder]  = useState(null);
  const [confirmApproveReturn,setConfirmApproveReturn]= useState(null);

  const tabList = [
    ['invoices','📄 Invoices'],['customers','👤 Customers'],['orders','📋 Orders'],
    ['returns','↩️ Returns'],['register','📊 Register']
  ];

  useEffect(() => { fetchAll(); fetchBanks(); }, []);

  const fetchBanks = async () => {
    try { const r = await getBanks(); setBanks(r.data||[]); } catch {}
  };

  const fetchAll = async () => {
    try {
      const [cR,iR,oR,rR,itR] = await Promise.all([
        getCustomers(), getSalesInvoices(), getSalesOrders(),
        getSalesReturns(), getItems()
      ]);
      setCusts(cR.data||[]); setInv(iR.data||[]); setOrders(oR.data||[]);
      setReturns(rR.data||[]); setItems(itR.data||[]);
    } catch { toast.error('Data load failed — backend running aahe ka?'); }
  };

  // ── GST calc (mirrors PurchasePage exactly) ──
  const calcTotals = (rows, f) => {
    let sub=0,cgst=0,sgst=0,igst=0;
    const inter = !!(f?.isInterState);
    rows.forEach(it => {
      const base   = (it.quantity||0)*(it.rate||0)*(1-(it.discount||0)/100);
      const gstAmt = base*(it.gstRate||0)/100;
      sub += base;
      if(inter) igst += gstAmt; else { cgst+=gstAmt/2; sgst+=gstAmt/2; }
    });
    const invDiscPct = (f?.discount||0)/100;
    const invDisc    = sub*invDiscPct;
    const subD       = sub-invDisc;
    const df         = 1-invDiscPct;
    const cF=cgst*df, sF=sgst*df, iF=igst*df;
    const totalGst   = inter?iF:cF+sF;
    const addChg     = (f?.freightCharge||0)+(f?.packagingCharge||0)+(f?.otherCharge||0);
    const grand      = subD+totalGst+addChg+(f?.roundOff||0);
    return {subTotal:subD,totalCgst:inter?0:cF,totalSgst:inter?0:sF,totalIgst:inter?iF:0,
            totalGst,discountAmount:invDisc,freightCharge:f?.freightCharge||0,
            packagingCharge:f?.packagingCharge||0,otherCharge:f?.otherCharge||0,
            roundOff:f?.roundOff||0,grandTotal:grand};
  };

  const addItemRow    = () => setInvItems(r=>[...r,{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);
  const removeItemRow = i  => setInvItems(r=>r.filter((_,idx)=>idx!==i));
  const updateItemRow = (i,field,val) => {
    setInvItems(rows => {
      const r=rows.map((row,idx)=>idx===i?{...row,[field]:val}:row);
      if(field==='itemId'){
        const it=items.find(x=>x.id===val);
        if(it) r[i]={...r[i],itemName:it.itemName,hsnCode:it.hsnCode||'',rate:it.salesRate||0,unit:it.unit||'Nos',gstRate:it.gstRate||18};
      }
      return r;
    });
  };

  const totals = calcTotals(invItems, form);

  // ── Customer ──
  const saveCustomer = async () => {
    if(!form.customerName?.trim()){toast.error('Customer name required!');return;}
    if(!form.phone?.trim()){toast.error('Phone required!');return;}
    const phone=form.phone.trim().replace(/[^0-9]/g,'');
    if(phone.length!==10||'6789'.indexOf(phone[0])<0){toast.error('Phone: 10 digits, 6-9 se start');return;}
    if(form.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)){toast.error('Invalid email');return;}
    if(form.gstin?.trim()&&form.gstin.trim().length!==15){toast.error('GSTIN 15 chars cha hava!');return;}
    if(!form.id){
      const dup=customers.find(c=>(c.customerName||c.name||'').toLowerCase().trim()===(form.customerName||'').toLowerCase().trim());
      if(dup){toast.error(`"${form.customerName}" already exists!`);return;}
      const dupP=customers.find(c=>c.phone?.replace(/[^0-9]/g,'')===phone);
      if(dupP){toast.error(`Phone already registered: ${dupP.customerName||dupP.name}`);return;}
    }
    try {
      const payload={...form,phone,customerName:form.customerName.trim(),name:form.customerName.trim()};
      if(form.id) await updateCustomer(form.id,payload);
      else        await addCustomer(payload);
      toast.success(form.id?'Customer updated!':'Customer added! ✅');
      setModal(null);setForm({});fetchAll();
    } catch(e){toast.error(e.response?.data?.error||'Save failed');}
  };

  // ── Invoice ──
  const saveInvoice = async (asDraft=false) => {
    if(!form.customerId){toast.error('Select a customer!');return;}
    if(invItems.every(i=>!i.itemName?.trim())){toast.error('Add at least 1 item!');return;}
    const rows=invItems.filter(i=>i.itemName?.trim());
    if(rows.some(i=>!i.quantity||i.quantity<=0)){toast.error('Quantity > 0 hava!');return;}
    if(form.customerGstin?.trim()&&form.customerGstin.trim().length!==15){toast.error('Customer GSTIN 15 chars!');return;}
    const t=calcTotals(rows,form);
    const cust=customers.find(c=>c.id===form.customerId);
    const data={...form,...t,items:rows,customerName:cust?.customerName||cust?.name||'',
      financialYear:selectedFY?.label||'',paymentStatus:'PENDING',
      status:asDraft?'DRAFT':'CONFIRMED',isDraft:asDraft,
      balanceDue:t.grandTotal,paidAmount:0,invoiceDate:form.invoiceDate||today()};
    try {
      if(form.id) await updateSalesInvoice(form.id,data);
      else        await addSalesInvoice(data);
      toast.success(asDraft?'Draft saved!':'Invoice saved! ✅');
      setModal(null);setForm({});setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);
      fetchAll();
    } catch(e){toast.error(e.response?.data?.error||e.response?.data||'Save failed');}
  };

  const cancelInv = async () => {
    try {
      await cancelSalesInvoice(confirmCancelInv.id,'Cancelled by user');
      toast.success('Invoice cancelled');setConfirmCancelInv(null);fetchAll();
    } catch(e){toast.error(e.response?.data?.error||'Failed');setConfirmCancelInv(null);}
  };

  const recordPayment = async () => {
    const amt=parseFloat(payAmt);
    if(!amt||amt<=0){toast.error('Valid amount enter karo');return;}
    if(amt>(payModal.balanceDue||0)+0.01){toast.error(`Max ₹${payModal.balanceDue?.toFixed(2)}`);return;}
    try {
      await recordSalesPayment(payModal.id,{amount:amt,paymentMode:form.paymentMode||'CASH',referenceNo:payRef,notes:payNotes});
      toast.success('Payment recorded! ✅');
      setPayModal(null);setPayAmt('');setPayRef('');setPayNotes('');setForm({});fetchAll();
    } catch(e){toast.error(e.response?.data?.error||'Payment failed');}
  };

  // ── Order ──
  const saveOrder = async () => {
    if(!form.customerId){toast.error('Select customer!');return;}
    const rows=invItems.filter(i=>i.itemName?.trim());
    if(!rows.length){toast.error('Add items!');return;}
    const t=calcTotals(rows,form);
    const cust=customers.find(c=>c.id===form.customerId);
    const data={...form,...t,items:rows,customerName:cust?.customerName||cust?.name||'',
      financialYear:selectedFY?.label||'',orderDate:form.orderDate||today()};
    try {
      if(form.id) await updateSalesOrder(form.id,data);
      else        await addSalesOrder(data);
      toast.success('Order saved!');
      setModal(null);setForm({});setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);
      fetchAll();
    } catch(e){toast.error(e.response?.data?.error||'Failed');}
  };

  const convertOrder = async order => {
    try{await convertToInvoice(order.id);toast.success('Invoice created!');fetchAll();}
    catch(e){toast.error(e.response?.data?.error||'Convert failed');}
  };

  // ── Return ──
  const saveReturn = async () => {
    if(!form.originalInvoiceId){toast.error('Select invoice!');return;}
    const rows=invItems.filter(i=>i.itemName?.trim()&&(i.quantity||0)>0);
    if(!rows.length){toast.error('Return qty > 0 hava!');return;}
    const t=calcTotals(rows,form);
    const data={...form,...t,items:rows,returnDate:form.returnDate||today(),financialYear:selectedFY?.label||''};
    try {
      if(editReturnId) await updateSalesReturn(editReturnId,data);
      else             await addSalesReturn(data);
      toast.success('Return saved!');
      setModal(null);setForm({});setEditReturnId(null);
      setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);
      fetchAll();
    } catch(e){toast.error(e.response?.data?.error||'Failed');}
  };

  // ── Register ──
  const fetchRegister = async () => {
    if(!regFrom||!regTo){toast.error('Date range select karo');return;}
    try{const r=await getSalesRegister({fromDate:regFrom,toDate:regTo});setReg(r.data);}
    catch{toast.error('Register load failed');}
  };

  // ── Filtered invoices ──
  const filtInv = invoices.filter(inv => {
    if(invStatus&&inv.paymentStatus!==invStatus&&inv.status!==invStatus) return false;
    if(invSearch){const s=invSearch.toLowerCase();return (inv.invoiceNumber||'').toLowerCase().includes(s)||(inv.customerName||'').toLowerCase().includes(s);}
    return true;
  });

  return (
    <>
    <div>
      <div className="tabs">{tabList.map(([k,l])=>(
        <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
      ))}</div>

      {/* ── INVOICES ── */}
      {tab==='invoices'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">📄 Sales Invoices</span>
            <div style={{display:'flex',gap:8}}>
              <span style={{background:'#fee2e2',color:'#dc2626',padding:'4px 10px',borderRadius:12,fontSize:12,fontWeight:700}}>
                Outstanding: {fmt(invoices.reduce((s,i)=>s+Math.max(0,(i.balanceDue||0)),0))}
              </span>
              <button className="btn btn-primary" onClick={()=>{setForm({invoiceType:'TAX_INVOICE',invoiceDate:today()});setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);setModal('invoice');}}>+ New Invoice</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'center'}}>
              <input placeholder="🔍 Search invoice#, customer..." value={invSearch} onChange={e=>setInvSearch(e.target.value)}
                style={{height:30,fontSize:12,minWidth:200,padding:'0 10px',border:'1.5px solid #e2e8f0',borderRadius:6,outline:'none'}}
                onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
              <select value={invStatus} onChange={e=>setInvStatus(e.target.value)} style={{height:30,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Status</option>
                {['PAID','PARTIAL','PENDING','DRAFT','CANCELLED'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-outline" onClick={()=>{setInvSearch('');setInvStatus('');}} style={{height:30,fontSize:12}}>✕ Clear</button>
              <span style={{fontSize:12,color:'#94a3b8'}}>{filtInv.length}/{invoices.length} records</span>
            </div>
            {invoices.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Invoice#</th><th>Customer</th><th>Date</th><th>Taxable</th><th>GST</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{filtInv.map(inv=>(
                  <tr key={inv.id}>
                    <td style={{fontSize:11,fontWeight:600,color:'#1a4f8a'}}>{inv.invoiceNumber||'—'}<br/><span style={{fontSize:10,color:'#94a3b8',fontWeight:400}}>{inv.invoiceType||'TAX_INVOICE'}</span></td>
                    <td><strong>{inv.customerName}</strong><br/><span style={{fontSize:10,color:'#94a3b8'}}>{inv.customerPhone||''}</span></td>
                    <td style={{fontSize:11}}>{inv.invoiceDate}</td>
                    <td className="text-right" style={{fontSize:11}}>{fmt(inv.subTotal||0)}</td>
                    <td className="text-right" style={{fontSize:11}}>{fmt(inv.totalGst||0)}</td>
                    <td className="text-right" style={{fontWeight:700}}>{fmt(inv.grandTotal)}</td>
                    <td className="text-right" style={{color:'#16a34a'}}>{fmt(inv.paidAmount||0)}</td>
                    <td className="text-right" style={{color:(inv.balanceDue||0)>0?'#dc2626':'#16a34a',fontWeight:600}}>{fmt(inv.balanceDue||0)}</td>
                    <td><span style={{background:STATUS_COLOR[inv.status==='DRAFT'?'DRAFT':inv.status==='CANCELLED'?'CANCELLED':(inv.paymentStatus||'PENDING')]+'20',color:STATUS_COLOR[inv.status==='DRAFT'?'DRAFT':inv.status==='CANCELLED'?'CANCELLED':(inv.paymentStatus||'PENDING')],padding:'2px 6px',borderRadius:8,fontSize:10,fontWeight:700}}>{inv.status==='DRAFT'?'DRAFT':inv.status==='CANCELLED'?'CANCELLED':(inv.paymentStatus||'PENDING')}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                          onClick={()=>{setPrintModal(inv);setPrintCopies({customer:true,transport:false,supplier:false,challan:false});}}>🖨️</button>
                        {(inv.balanceDue||0)>0&&inv.status!=='CANCELLED'&&inv.status!=='DRAFT'&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#16a34a',borderColor:'#86efac'}}
                            onClick={()=>{setPayModal(inv);setPayAmt((inv.balanceDue||0).toFixed(2));setForm({paymentMode:'CASH'});setPayRef('');setPayNotes('');}}>💰 Pay</button>
                        )}
                        {inv.status!=='CANCELLED'&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                            onClick={()=>{setForm({...inv});setInvItems(inv.items?.length?inv.items:[{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);setModal('invoice');}}>✏️</button>
                        )}
                        {isAdmin&&inv.status!=='CANCELLED'&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}}
                            onClick={()=>setConfirmCancelInv(inv)}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📄</div><div>No invoices yet. Click "+ New Invoice" to start.</div></div>}
          </div>
        </div>
      )}

      {/* ── CUSTOMERS ── */}
      {tab==='customers'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">👤 Customer Master</span>
            <button className="btn btn-primary" onClick={()=>{setForm({});setModal('customer');}}>+ Add Customer</button>
          </div>
          <div className="card-body">
            {customers.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Code</th><th>Customer Name</th><th>Contact</th><th>Phone</th><th>GSTIN</th><th>City</th><th>Balance</th><th>Action</th></tr></thead>
                <tbody>{customers.map(c=>(
                  <tr key={c.id}>
                    <td style={{fontSize:11,color:'#94a3b8'}}>{c.customerCode||'—'}</td>
                    <td><strong>{c.customerName||c.name}</strong><br/><span style={{fontSize:10,color:'#94a3b8'}}>{c.email||''}</span></td>
                    <td>{c.contactPerson||'—'}</td>
                    <td>{c.phone||'—'}</td>
                    <td style={{fontSize:11}}>{c.gstin||'—'}</td>
                    <td>{c.city||'—'}</td>
                    <td className="text-right" style={{color:'#dc2626',fontWeight:600}}>{fmt(c.currentBalance||0)}</td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                          onClick={()=>{setForm({...c});setModal('customer');}}>✏️</button>
                        {isAdmin&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}}
                            onClick={()=>setConfirmDeleteCust(c)}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>👤</div><div>No customers. Click "+ Add Customer".</div></div>}
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab==='orders'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Sales Orders</span>
            <button className="btn btn-primary" onClick={()=>{setForm({orderDate:today()});setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);setModal('order');}}>+ New Order</button>
          </div>
          <div className="card-body">
            {orders.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Order#</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{orders.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontSize:11,fontWeight:600,color:'#1a4f8a'}}>{o.orderNumber||'—'}</td>
                    <td><strong>{o.customerName}</strong></td>
                    <td style={{fontSize:11}}>{o.orderDate}</td>
                    <td className="text-right" style={{fontWeight:600}}>{fmt(o.grandTotal||0)}</td>
                    <td><span style={{background:'#dbeafe',color:'#1e40af',padding:'3px 8px',borderRadius:12,fontSize:11}}>{o.status||'PENDING'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#16a34a',borderColor:'#86efac'}}
                          onClick={()=>convertOrder(o)}>→ Invoice</button>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                          onClick={()=>{setForm({...o});setInvItems(o.items?.length?o.items:[{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);setModal('order');}}>✏️</button>
                        {isAdmin&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}}
                            onClick={()=>setConfirmDeleteOrder(o)}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📋</div><div>No orders. Click "+ New Order".</div></div>}
          </div>
        </div>
      )}

      {/* ── RETURNS ── */}
      {tab==='returns'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">↩️ Sales Returns</span>
            <button className="btn btn-primary" onClick={()=>{setForm({});setEditReturnId(null);setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);setModal('return');}}>+ New Return</button>
          </div>
          <div className="card-body">
            {returns.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Return#</th><th>Customer</th><th>Date</th><th>Against Invoice</th><th>Amount</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{returns.map(r=>(
                  <tr key={r.id}>
                    <td style={{fontSize:11}}>{r.returnNumber||'—'}</td>
                    <td><strong>{r.customerName}</strong></td>
                    <td style={{fontSize:11}}>{r.returnDate}</td>
                    <td style={{fontSize:11}}>{r.originalInvoiceNumber||r.invoiceNumber||'—'}</td>
                    <td className="text-right" style={{color:'#dc2626',fontWeight:600}}>{fmt(r.grandTotal||r.returnAmount||0)}</td>
                    <td style={{fontSize:11,color:'#64748b'}}>{r.reason||'—'}</td>
                    <td><span style={{background:r.status==='APPROVED'?'#d1fae5':r.status==='COMPLETED'?'#dbeafe':'#fee2e2',color:r.status==='APPROVED'?'#16a34a':r.status==='COMPLETED'?'#2563eb':'#dc2626',padding:'3px 8px',borderRadius:12,fontSize:11}}>{r.status||'PENDING'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                          onClick={()=>{setForm({...r});setInvItems(r.items?.length?r.items:[{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,discount:0,gstRate:18}]);setEditReturnId(r.id);setModal('return');}}>✏️</button>
                        {r.status==='PENDING'&&isAdmin&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#16a34a',borderColor:'#86efac'}}
                            onClick={()=>setConfirmApproveReturn(r)}>✅ Approve</button>
                        )}
                        {r.status==='APPROVED'&&isAdmin&&(
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#2563eb',borderColor:'#93c5fd'}}
                            onClick={async()=>{try{await updateSalesReturn(r.id,{...r,status:'COMPLETED'});toast.success('Completed!');fetchAll();}catch{toast.error('Failed');}}}>🏁 Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>↩️</div><div>No sales returns.</div></div>}
          </div>
        </div>
      )}

      {/* ── REGISTER ── */}
      {tab==='register'&&(
        <div className="card">
          <div className="card-header"><span className="card-title">📊 Sales Register</span></div>
          <div className="card-body">
            <div className="toolbar" style={{marginBottom:16,gap:10,flexWrap:'wrap'}}>
              <label style={{fontSize:12,fontWeight:600}}>From:</label>
              <input type="date" value={regFrom} onChange={e=>setRegFrom(e.target.value)} style={{height:32}}/>
              <label style={{fontSize:12,fontWeight:600}}>To:</label>
              <input type="date" value={regTo} onChange={e=>setRegTo(e.target.value)} style={{height:32}}/>
              <button className="btn btn-primary" onClick={fetchRegister}>Generate</button>
            </div>
            {register&&(
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                  {[['Total Taxable',register.summary?.totalTaxableValue,'#1a4f8a'],
                    ['Total CGST',register.summary?.totalCgst,'#7c3aed'],
                    ['Total SGST',register.summary?.totalSgst,'#2563eb'],
                    ['Grand Total',register.summary?.totalAmount,'#16a34a']
                  ].map(([label,val,color])=>(
                    <div key={label} style={{background:'white',border:`2px solid ${color}20`,borderTop:`4px solid ${color}`,borderRadius:6,padding:'10px 14px'}}>
                      <div style={{fontSize:11,color:'#64748b'}}>{label}</div>
                      <div style={{fontWeight:700,color,fontSize:14}}>{fmt(val)}</div>
                    </div>
                  ))}
                </div>
                <div className="table-container"><table>
                  <thead><tr><th>Invoice#</th><th>Customer</th><th>Date</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>{register.invoices?.map(inv=>(
                    <tr key={inv.id}>
                      <td style={{fontSize:11,fontWeight:600,color:'#1a4f8a'}}>{inv.invoiceNumber}</td>
                      <td>{inv.customerName}</td>
                      <td style={{fontSize:11}}>{inv.invoiceDate}</td>
                      <td className="text-right">{fmt(inv.subTotal)}</td>
                      <td className="text-right" style={{fontSize:11}}>{fmt(inv.totalCgst)}</td>
                      <td className="text-right" style={{fontSize:11}}>{fmt(inv.totalSgst)}</td>
                      <td className="text-right" style={{fontSize:11}}>{fmt(inv.totalIgst)}</td>
                      <td className="text-right" style={{fontWeight:700}}>{fmt(inv.grandTotal)}</td>
                      <td><span style={{background:STATUS_COLOR[inv.paymentStatus]+'20',color:STATUS_COLOR[inv.paymentStatus],padding:'2px 6px',borderRadius:8,fontSize:10,fontWeight:700}}>{inv.paymentStatus}</span></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </>
            )}
            {!register&&<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📊</div><div>Select date range to generate Sales Register</div></div>}
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Customer Modal */}
      {modal==='customer'&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-header"><h3>{form.id?'Edit':'Add'} Customer</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer Code</label>
                  <input value={form.customerCode||''} readOnly placeholder="Auto-generated on save" style={{background:'#f8fafc',color:'#64748b',cursor:'not-allowed'}}/>
                </div>
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input value={form.customerName||''} onChange={e=>setForm({...form,customerName:e.target.value})} placeholder="e.g. Ramesh Traders"/>
                </div>
                <div className="form-group">
                  <label>Customer GSTIN</label>
                  <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                    <input value={form.gstin||''} onChange={async e=>{
                      const g=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
                      setForm(f=>({...f,gstin:g}));
                      if(g.length===15&&/^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)){
                        const tid=toast.loading('🔍 GSTIN verify hotoy...');
                        try{
                          const {verifyGSTIN}=await import('../services/api');
                          const r=await verifyGSTIN(g);const d=r.data;
                          toast.dismiss(tid);
                          if(d.cancelled){toast.error('⚠️ GSTIN Cancelled!');return;}
                          const upd={gstin:g};
                          if(d.name){upd.customerName=d.name;upd.name=d.name;}
                          if(d.fullAddr||d.address) upd.address=d.fullAddr||d.address||'';
                          if(d.city||d.district)    upd.city=d.city||d.district||'';
                          if(d.state)               upd.state=d.state;
                          if(d.pincode)             upd.pincode=d.pincode;
                          if(d.pan)                 upd.pan=d.pan;
                          setForm(f=>({...f,...upd}));
                          toast.success(d.name?'✅ Auto-filled: '+d.name+(d.state?' | '+d.state:''):'✅ GSTIN valid | '+d.stateName);
                        }catch(e){toast.dismiss(tid);}
                      }
                    }} placeholder="27AAAAA0000A1Z5" maxLength={15} style={{flex:1}}/>
                    <button type="button" className="btn btn-outline" style={{whiteSpace:'nowrap',padding:'6px 12px'}}
                      onClick={async()=>{
                        const g=(form.gstin||'').trim().toUpperCase();
                        if(g.length!==15){toast.error('GSTIN 15 chars cha hava!');return;}
                        const tid=toast.loading('🔍 Verifying...');
                        try{
                          const {verifyGSTIN}=await import('../services/api');
                          const r=await verifyGSTIN(g);const d=r.data;
                          toast.dismiss(tid);
                          if(d.cancelled){toast.error('⚠️ GSTIN Cancelled!');return;}
                          const upd={gstin:g};
                          if(d.name){upd.customerName=d.name;upd.name=d.name;}
                          if(d.fullAddr||d.address) upd.address=d.fullAddr||d.address||'';
                          if(d.city||d.district)    upd.city=d.city||d.district||'';
                          if(d.state)               upd.state=d.state;
                          if(d.pincode)             upd.pincode=d.pincode;
                          if(d.pan)                 upd.pan=d.pan;
                          setForm(f=>({...f,...upd}));
                          toast.success(d.name?'✅ Auto-filled: '+d.name:'✅ GSTIN valid | '+d.stateName);
                        }catch(e){toast.dismiss(tid);toast.error(e.message||'Verify failed');}
                      }}>🔍 Verify & Fill</button>
                  </div>
                </div>
                {[['contactPerson','Contact Person'],['phone','Phone *'],['email','Email'],
                  ['address','Address'],['city','City'],['state','State'],['pincode','Pincode'],['pan','PAN']
                ].map(([f,l])=>(
                  <div key={f} className="form-group">
                    <label>{l}</label>
                    <input value={form[f]||''} onChange={e=>setForm({...form,[f]:e.target.value})}/>
                  </div>
                ))}
                <div className="form-group">
                  <label>Opening Balance (₹)</label>
                  <input type="number" value={form.openingBalance||0} onChange={e=>setForm({...form,openingBalance:Number(e.target.value)})}/>
                </div>
                <div className="form-group">
                  <label>Credit Limit (₹)</label>
                  <input type="number" value={form.creditLimit||0} onChange={e=>setForm({...form,creditLimit:Number(e.target.value)})}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCustomer}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {modal==='invoice'&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:900,width:'95vw'}}>
            <div className="modal-header"><h3>{form.id?'Edit':'New'} Sales Invoice</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid" style={{marginBottom:12}}>
                <div className="form-group">
                  <label>Invoice Type</label>
                  <select value={form.invoiceType||'TAX_INVOICE'} onChange={e=>setForm({...form,invoiceType:e.target.value})}>
                    {['TAX_INVOICE','PROFORMA','QUOTATION','DELIVERY_CHALLAN','RETAIL_INVOICE','ESTIMATE'].map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Customer *</label>
                  <select value={form.customerId||''} onChange={e=>{
                    const c=customers.find(x=>x.id===e.target.value);
                    setForm(f=>({...f,customerId:e.target.value,customerName:c?.customerName||c?.name||'',
                      customerGstin:c?.gstin||'',customerPhone:c?.phone||'',
                      customerAddress:c?.address||'',customerCity:c?.city||'',customerState:c?.state||'',
                      isInterState:!!(c?.state&&c.state.toLowerCase()!=='maharashtra'&&c.state!=='')}));
                  }}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.customerName||c.name}{c.gstin?' — '+c.gstin:''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Invoice Date *</label>
                  <input type="date" value={form.invoiceDate||today()} onChange={e=>setForm({...form,invoiceDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Customer GSTIN</label>
                  <input value={form.customerGstin||''} onChange={e=>setForm({...form,customerGstin:e.target.value.toUpperCase()})} placeholder="Auto-filled"/>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate||''} onChange={e=>setForm({...form,dueDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label style={{display:'flex',alignItems:'center',gap:6}}>
                    <input type="checkbox" checked={!!form.isInterState} onChange={e=>setForm({...form,isInterState:e.target.checked})}/>
                    Inter-State (IGST)
                  </label>
                  <div style={{fontSize:11,color:form.isInterState?'#dc2626':'#16a34a',marginTop:2}}>{form.isInterState?'IGST applicable':'CGST + SGST applicable'}</div>
                </div>
              </div>

              {/* Items */}
              <div style={{border:'1px solid #e2e8f0',borderRadius:6,overflow:'hidden',marginBottom:12}}>
                <div style={{background:'#1a4f8a',color:'white',padding:'8px 12px',fontSize:12,display:'grid',gridTemplateColumns:'2fr 1fr .8fr .8fr 1fr .6fr 1fr .5fr',gap:8,fontWeight:700}}>
                  <span>Item Name</span><span>HSN</span><span>Qty</span><span>Unit</span><span>Rate</span><span>Disc%</span><span>GST%</span><span></span>
                </div>
                {invItems.map((it,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr .8fr .8fr 1fr .6fr 1fr .5fr',gap:8,padding:'6px 8px',borderBottom:'1px solid #f1f5f9',background:i%2?'#f8fafc':'white'}}>
                    <select value={it.itemId||''} onChange={e=>updateItemRow(i,'itemId',e.target.value)}
                      style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,width:'100%'}}>
                      <option value="">-- Select Item --</option>
                      {items.filter(x=>x.active!==false).map(x=>(
                        <option key={x.id} value={x.id}>{x.itemName}{x.itemCode?' ('+x.itemCode+')':''} | Stock:{x.currentStock}</option>
                      ))}
                    </select>
                    <input value={it.hsnCode||''} readOnly style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,background:'#f8fafc',color:'#64748b'}} placeholder="Auto"/>
                    <input type="number" min="0.001" value={it.quantity} onChange={e=>updateItemRow(i,'quantity',Number(e.target.value))} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <input value={it.unit||'Nos'} onChange={e=>updateItemRow(i,'unit',e.target.value)} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <input type="number" min="0" value={it.rate} onChange={e=>updateItemRow(i,'rate',Number(e.target.value))} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <input type="number" min="0" max="100" value={it.discount||0} onChange={e=>updateItemRow(i,'discount',Number(e.target.value))} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <select value={it.gstRate} onChange={e=>updateItemRow(i,'gstRate',Number(e.target.value))} style={{fontSize:12,padding:'4px 2px',border:'1px solid #e2e8f0',borderRadius:4}}>
                      {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                    </select>
                    <button onClick={()=>removeItemRow(i)} style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}}>×</button>
                  </div>
                ))}
                <div style={{padding:'8px',background:'#f8fafc'}}>
                  <button className="btn btn-outline" style={{fontSize:12}} onClick={addItemRow}>+ Add Item</button>
                </div>
              </div>

              {/* Totals */}
              <div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}>
                <div style={{background:'#f0f4ff',borderRadius:6,padding:'10px 16px',fontSize:13,minWidth:240}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span>Taxable:</span><strong>{fmt(totals.subTotal)}</strong></div>
                  {!form.isInterState&&<><div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'#64748b'}}><span>CGST:</span><span>{fmt(totals.totalCgst)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'#64748b'}}><span>SGST:</span><span>{fmt(totals.totalSgst)}</span></div></>}
                  {form.isInterState&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'#64748b'}}><span>IGST:</span><span>{fmt(totals.totalIgst)}</span></div>}
                  <div style={{display:'flex',justifyContent:'space-between',borderTop:'2px solid #1a4f8a',paddingTop:6,fontWeight:700,color:'#1a4f8a',fontSize:14}}><span>Grand Total:</span><span>{fmt(totals.grandTotal)}</span></div>
                </div>
              </div>

              {/* Additional Charges */}
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
                <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:'#374151'}}>📦 Additional Charges</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Freight (₹)</label>
                    <input type="number" min="0" value={form.freightCharge||''} placeholder="0" onChange={e=>setForm(f=>({...f,freightCharge:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Packaging (₹)</label>
                    <input type="number" min="0" value={form.packagingCharge||''} placeholder="0" onChange={e=>setForm(f=>({...f,packagingCharge:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Other (₹)</label>
                    <input type="number" min="0" value={form.otherCharge||''} placeholder="0" onChange={e=>setForm(f=>({...f,otherCharge:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Round Off</label>
                    <input type="number" value={form.roundOff||''} placeholder="0" onChange={e=>setForm(f=>({...f,roundOff:parseFloat(e.target.value)||0}))}/></div>
                </div>
              </div>

              <div className="form-group">
                <label>Vehicle No. / LR No.</label>
                <input value={form.vehicleNumber||''} onChange={e=>setForm({...form,vehicleNumber:e.target.value})} placeholder="MH10AB1234"/>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional notes"/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={()=>saveInvoice(true)} style={{color:'#64748b',borderColor:'#64748b'}} title="Draft — stock nahi deducted">📋 Draft</button>
              <button className="btn btn-primary" onClick={()=>saveInvoice(false)}>💾 Save Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {modal==='order'&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:720}}>
            <div className="modal-header"><h3>{form.id?'Edit':'New'} Sales Order</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Customer *</label>
                  <select value={form.customerId||''} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);setForm({...form,customerId:e.target.value,customerName:c?.customerName||c?.name||''});}}>
                    <option value="">-- Select --</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.customerName||c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Order Date</label><input type="date" value={form.orderDate||today()} onChange={e=>setForm({...form,orderDate:e.target.value})}/></div>
                <div className="form-group"><label>Valid Until</label><input type="date" value={form.validUntil||''} onChange={e=>setForm({...form,validUntil:e.target.value})}/></div>
                <div className="form-group"><label>Notes</label><input value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
              </div>
              <div className="table-container"><table>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>GST%</th><th>Taxable</th><th>GST</th><th>Total</th><th></th></tr></thead>
                <tbody>{invItems.map((it,i)=>(
                  <tr key={i}>
                    <td><select value={it.itemId||''} style={{minWidth:140}} onChange={e=>updateItemRow(i,'itemId',e.target.value)}>
                      <option value="">-- Select --</option>
                      {items.filter(x=>x.active!==false).map(x=><option key={x.id} value={x.id}>{x.itemName}</option>)}
                    </select></td>
                    <td><input type="number" value={it.quantity||''} style={{width:60}} onChange={e=>updateItemRow(i,'quantity',Number(e.target.value))}/></td>
                    <td><input value={it.unit||'Nos'} style={{width:60}} onChange={e=>updateItemRow(i,'unit',e.target.value)}/></td>
                    <td><input type="number" value={it.rate||''} style={{width:80}} onChange={e=>updateItemRow(i,'rate',Number(e.target.value))}/></td>
                    <td><select value={it.gstRate||18} style={{width:60}} onChange={e=>updateItemRow(i,'gstRate',Number(e.target.value))}>{GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></td>
                    <td className="text-right">{fmt((it.quantity||0)*(it.rate||0))}</td>
                    <td className="text-right" style={{color:'#6366f1'}}>{fmt((it.quantity||0)*(it.rate||0)*(it.gstRate||0)/100)}</td>
                    <td className="text-right" style={{fontWeight:600}}>{fmt((it.quantity||0)*(it.rate||0)*(1+(it.gstRate||0)/100))}</td>
                    <td><button style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}} onClick={()=>removeItemRow(i)}>×</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                <button className="btn btn-outline" style={{fontSize:12}} onClick={addItemRow}>+ Add Item</button>
                <div style={{display:'flex',gap:16,fontSize:12}}>
                  <span>Taxable: <strong>{fmt(invItems.reduce((s,i)=>s+(i.quantity||0)*(i.rate||0),0))}</strong></span>
                  <span style={{color:'#16a34a'}}>Grand Total: <strong>{fmt(totals.grandTotal)}</strong></span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveOrder}>{form.id?'Update':'Create'} Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {modal==='return'&&(
        <div className="modal-overlay" onClick={()=>{setModal(null);setEditReturnId(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:720}}>
            <div className="modal-header"><h3>{editReturnId?'Edit':'New'} Sales Return</h3><button className="modal-close" onClick={()=>{setModal(null);setEditReturnId(null);}}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Customer *</label>
                  <select value={form.customerId||''} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);setForm({...form,customerId:e.target.value,customerName:c?.customerName||c?.name||'',originalInvoiceId:''});}}>
                    <option value="">-- Select --</option>
                    {customers.map(c=><option key={c.id} value={c.id}>{c.customerName||c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Against Invoice *</label>
                  <select value={form.originalInvoiceId||''} onChange={e=>{
                    const inv=invoices.find(i=>i.id===e.target.value);
                    if(inv){
                      const retItems=(inv.items||[]).map(it=>({
                        itemId:it.itemId||'',itemName:it.itemName||'',hsnCode:it.hsnCode||'',
                        quantity:it.quantity||1,maxQty:it.quantity||1,
                        unit:it.unit||'Nos',rate:it.rate||0,gstRate:it.gstRate||0,
                        taxableAmount:(it.quantity||0)*(it.rate||0),
                        gstAmt:(it.quantity||0)*(it.rate||0)*(it.gstRate||0)/100,
                        amount:(it.quantity||0)*(it.rate||0)*(1+(it.gstRate||0)/100)
                      }));
                      setForm(f=>({...f,originalInvoiceId:e.target.value,originalInvoiceNumber:inv.invoiceNumber||''}));
                      if(retItems.length) setInvItems(retItems);
                    }
                  }}>
                    <option value="">-- Select Invoice --</option>
                    {invoices.filter(i=>!i.cancelled&&i.status!=='CANCELLED'&&(!form.customerId||i.customerId===form.customerId)).map(i=>(
                      <option key={i.id} value={i.id}>{i.invoiceNumber} — {fmt(i.grandTotal)} ({i.customerName})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label>Return Date</label><input type="date" value={form.returnDate||today()} onChange={e=>setForm({...form,returnDate:e.target.value})}/></div>
                <div className="form-group"><label>Reason</label><input value={form.reason||''} placeholder="Damaged / Wrong / Quality" onChange={e=>setForm({...form,reason:e.target.value})}/></div>
              </div>
              <h4 style={{margin:'12px 0 8px'}}>Items to Return</h4>
              <div className="table-container"><table>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>GST%</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
                <tbody>{invItems.map((row,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{fontWeight:600}}>{row.itemName||'—'}</td>
                    <td><input type="number" value={row.quantity||0} style={{width:70}} min={0} max={row.maxQty||999}
                      onChange={e=>{
                        const qty=Math.min(Number(e.target.value),row.maxQty||Number(e.target.value));
                        const rows=[...invItems];
                        const tax=qty*(rows[i].rate||0);const gst=tax*(rows[i].gstRate||0)/100;
                        rows[i]={...rows[i],quantity:qty,taxableAmount:tax,gstAmt:gst,amount:tax+gst};
                        setInvItems(rows);
                      }}/>
                      {row.maxQty>0&&<div style={{fontSize:10,color:'#6b7280'}}>Max: {row.maxQty}</div>}
                    </td>
                    <td>{row.unit||'Nos'}</td>
                    <td>{fmt(row.rate||0)}</td>
                    <td>{row.gstRate||0}%</td>
                    <td className="text-right">{fmt(row.taxableAmount||(row.quantity||0)*(row.rate||0))}</td>
                    <td className="text-right" style={{color:'#6366f1'}}>{fmt(row.gstAmt||0)}</td>
                    <td className="text-right" style={{fontWeight:600}}>{fmt(row.amount||(row.quantity||0)*(row.rate||0)*(1+(row.gstRate||0)/100))}</td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div style={{textAlign:'right',marginTop:8,fontSize:13}}>
                <div>Taxable: <strong>{fmt(invItems.reduce((s,i)=>s+(i.taxableAmount||(i.quantity||0)*(i.rate||0)),0))}</strong></div>
                <div>Grand Total: <strong style={{color:'#dc2626',fontSize:15}}>{fmt(invItems.reduce((s,i)=>s+(i.amount||0),0))}</strong></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>{setModal(null);setEditReturnId(null);}}>Cancel</button>
              <button className="btn btn-primary" onClick={saveReturn}>{editReturnId?'Update':'Record'} Return</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal&&(
        <div className="modal-overlay" onClick={()=>setPayModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header"><h3>Record Payment</h3><button className="modal-close" onClick={()=>setPayModal(null)}>×</button></div>
            <div className="modal-body">
              <div style={{background:'#f0f4ff',borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:12}}>
                <div><strong>Invoice:</strong> {payModal.invoiceNumber} | <strong>Customer:</strong> {payModal.customerName}</div>
                <div style={{marginTop:4}}>
                  <strong>Total:</strong> {fmt(payModal.grandTotal)} | <strong>Paid:</strong> {fmt(payModal.paidAmount)} | <strong style={{color:'#dc2626'}}>Balance: {fmt(payModal.balanceDue)}</strong>
                </div>
              </div>
              <div className="form-group"><label>Payment Amount (₹) *</label>
                <input type="number" value={payAmt} max={payModal.balanceDue}
                  onChange={e=>{const val=Number(e.target.value);setPayAmt(val>payModal.balanceDue+0.01?payModal.balanceDue:e.target.value);}}
                  placeholder={`Max: ${payModal.balanceDue}`}/>
                <small style={{color:'#64748b',fontSize:11}}>Max payable: {fmt(payModal.balanceDue)}</small>
              </div>
              <div className="form-group"><label>Payment Mode</label>
                <select value={form.paymentMode||'CASH'} onChange={e=>setForm({...form,paymentMode:e.target.value})}>
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI / GPay / PhonePe</option>
                  <option value="CHEQUE">🏦 Cheque</option>
                  <option value="NEFT">💸 NEFT / RTGS / IMPS</option>
                  {banks.map(b=><option key={b.id} value={b.bankName}>{b.bankName}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Reference No.</label>
                <input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Cheque no. / UTR no."/>
              </div>
              <div className="form-group"><label>Notes</label>
                <input value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder="Optional"/>
              </div>
              {(payModal.paymentHistory||[]).length>0&&(
                <div style={{background:'#f8fafc',borderRadius:8,padding:'8px 12px',marginTop:4}}>
                  <div style={{fontSize:11,fontWeight:600,marginBottom:4}}>Previous Payments:</div>
                  {[...(payModal.paymentHistory||[])].reverse().map((ph,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'2px 0'}}>
                      <span style={{color:'#64748b'}}>{ph.paymentDate} — {ph.paymentMode}</span>
                      <span style={{fontWeight:600,color:'#059669'}}>₹{(ph.amount||0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setPayModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={recordPayment}>💰 Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal — Swipe style */}
      {printModal&&(
        <div className="modal-overlay" onClick={()=>setPrintModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
            <div className="modal-header">
              <div><h3 style={{margin:0}}>🖨️ Print Invoice</h3><div style={{fontSize:12,color:'#64748b',marginTop:2}}>{printModal.invoiceNumber} — {printModal.customerName}</div></div>
              <button className="modal-close" onClick={()=>setPrintModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:12}}>Copies select kara:</div>
              {[
                {key:'customer',  label:'Original',         sub:'For Recipient / Customer',    color:'#1a4f8a', icon:'📄'},
                {key:'transport', label:'Duplicate',        sub:'For Transporter',             color:'#7c3aed', icon:'🚚'},
                {key:'supplier',  label:'Triplicate',       sub:'For Supplier / Office Copy',  color:'#16a34a', icon:'🏭'},
                {key:'challan',   label:'Delivery Challan', sub:'No prices — qty only',        color:'#f59e0b', icon:'📦'},
              ].map(({key,label,sub,color,icon})=>(
                <div key={key} onClick={()=>setPrintCopies(p=>({...p,[key]:!p[key]}))}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',marginBottom:8,
                    border:`2px solid ${printCopies[key]?color:'#e5e7eb'}`,borderRadius:8,cursor:'pointer',
                    background:printCopies[key]?color+'0f':'#fff',transition:'all .15s'}}>
                  <div style={{width:20,height:20,borderRadius:4,border:`2px solid ${printCopies[key]?color:'#d1d5db'}`,background:printCopies[key]?color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {printCopies[key]&&<span style={{color:'#fff',fontSize:12,lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{fontSize:16}}>{icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13,color:printCopies[key]?color:'#374151'}}>{label}</div>
                    <div style={{fontSize:11,color:'#6b7280'}}>{sub}</div>
                  </div>
                </div>
              ))}
              <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                {[['1 Copy',{customer:true,transport:false,supplier:false,challan:false}],
                  ['2 Copies',{customer:true,transport:true,supplier:false,challan:false}],
                  ['3 Copies',{customer:true,transport:true,supplier:true,challan:false}],
                  ['All 4',{customer:true,transport:true,supplier:true,challan:true}]].map(([l,v])=>(
                  <button key={l} onClick={()=>setPrintCopies(v)} style={{fontSize:11,padding:'4px 10px',border:'1px solid #e5e7eb',borderRadius:4,background:'#f8fafc',cursor:'pointer'}}>{l}</button>
                ))}
              </div>
              <div style={{marginTop:10,padding:'8px 12px',background:'#f0f9ff',borderRadius:6,fontSize:12,color:'#0369a1'}}>
                {Object.values(printCopies).filter(Boolean).length===0?'⚠️ At least 1 copy select kara!':`✅ ${Object.values(printCopies).filter(Boolean).length} cop${Object.values(printCopies).filter(Boolean).length===1?'y':'ies'} print hoil`}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setPrintModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!Object.values(printCopies).some(Boolean)}
                onClick={async()=>{
                  const sel=Object.entries(printCopies).filter(([,v])=>v).map(([k])=>k);
                  if(!sel.length){toast.error('Select at least 1 copy!');return;}
                  setPrintModal(null);
                  try{await printSalesInvoiceMulti(printModal,sel);}
                  catch(e){toast.error('Print failed: '+e.message);}
                }}>
                🖨️ Print {Object.values(printCopies).filter(Boolean).length} Cop{Object.values(printCopies).filter(Boolean).length===1?'y':'ies'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

    {/* ConfirmModals */}
    <ConfirmModal open={!!confirmCancelInv} title="Cancel Invoice?"
      message="Invoice cancel झाल्यावर stock restore होईल व accounting reverse होईल."
      details={confirmCancelInv?`Invoice: ${confirmCancelInv.invoiceNumber} — ${fmt(confirmCancelInv.grandTotal||0)}`:''}
      confirmLabel="Yes, Cancel" type="warning"
      onConfirm={cancelInv} onCancel={()=>setConfirmCancelInv(null)}/>

    <ConfirmModal open={!!confirmDeleteCust} title="Delete Customer?"
      message="Customer permanently delete होईल."
      details={confirmDeleteCust?`${confirmDeleteCust.customerName||confirmDeleteCust.name}`:''}
      confirmLabel="Yes, Delete" type="danger"
      onConfirm={async()=>{try{await deleteCustomer(confirmDeleteCust.id);toast.success('Deleted');setConfirmDeleteCust(null);fetchAll();}catch(e){toast.error(e.response?.data?.error||'Cannot delete');setConfirmDeleteCust(null);}}}
      onCancel={()=>setConfirmDeleteCust(null)}/>

    <ConfirmModal open={!!confirmDeleteOrder} title="Delete Order?"
      message="Order permanently delete होईल."
      details={confirmDeleteOrder?`Order: ${confirmDeleteOrder.orderNumber||''}`:''}
      confirmLabel="Yes, Delete" type="danger"
      onConfirm={async()=>{try{await deleteSalesOrder(confirmDeleteOrder.id);toast.success('Deleted');setConfirmDeleteOrder(null);fetchAll();}catch(e){toast.error(e.response?.data?.error||'Failed');setConfirmDeleteOrder(null);}}}
      onCancel={()=>setConfirmDeleteOrder(null)}/>

    <ConfirmModal open={!!confirmApproveReturn} title="Approve Sales Return?"
      message="Return approve झाल्यावर stock परत येईल आणि customer balance update होईल."
      details={confirmApproveReturn?`Return: ${confirmApproveReturn.returnNumber||''} — ${fmt(confirmApproveReturn.grandTotal||0)}`:''}
      confirmLabel="✅ Yes, Approve" type="warning"
      onConfirm={async()=>{
        try{
          await updateSalesReturn(confirmApproveReturn.id,{...confirmApproveReturn,status:'APPROVED'});
          toast.success('✅ Return Approved! Stock updated.');
          setConfirmApproveReturn(null);fetchAll();
        }catch{toast.error('Failed to approve');setConfirmApproveReturn(null);}
      }}
      onCancel={()=>setConfirmApproveReturn(null)}/>
    </>
  );
}
