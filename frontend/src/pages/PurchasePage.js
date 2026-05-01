import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getBanks, getSuppliers, addSupplier, updateSupplier, deleteSupplier,
         getPurchaseInvoices, addPurchaseInvoice, updatePurchaseInvoice, cancelPurchaseInvoice, recordPurchasePayment,
         getPurchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
         getPurchaseReturns, addPurchaseReturn, updatePurchaseReturn, deletePurchaseReturn,
         getGRNs, addGRN, updateGRN, deleteGRN, getPurchaseRegister, getItems,
         calculateInvoice } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { useFY } from '../context/FYContext';
import { printPurchaseInvoice, printPurchaseReturn, printPurchaseOrder } from '../utils/printUtils';
import { useAuth } from '../context/AuthContext';
export default function PurchasePage() {
const openDebitNote = (data) => {
  setDebitNoteData(data);
};

const printDebitNote = () => {
  window.print();
};
const [ewayPModal, setEwayPModal] = useState(false);
const [ewayPNum, setEwayPNum] = useState("");

const [debitNoteData, setDebitNoteData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [supplierStmt, setSupplierStmt] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [stmtSupplier, setStmtSupplier] = useState(null);
const fmt  = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const today = () => new Date().toISOString().split('T')[0];
const GST_RATES = [0,0.25,1,3,5,12,18,28];
  const { selectedFY } = useFY();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.roles?.includes('ROLE_ADMIN');
  const [confirmDeleteSupp, setConfirmDeleteSupp] = useState(null);
  const [confirmCancelInv, setConfirmCancelInv] = useState(null);
  const [confirmDeletePO, setConfirmDeletePO] = useState(null);
  const [confirmDeleteReturn, setConfirmDeleteReturn] = useState(null);
  const [confirmDeleteGRN, setConfirmDeleteGRN] = useState(null);
  const [editGRNId, setEditGRNId] = useState(null);
  const [confirmApproveReturn, setConfirmApproveReturn] = useState(null);
  const [tab, setTab]         = useState('invoices');
  const [suppliers, setSupp]  = useState([]);
  const [invoices, setInv]    = useState([]);
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('');
  const [orders, setOrders]   = useState([]);
  const [returns, setReturns] = useState([]);
  const [grns, setGRNs]       = useState([]);
  const [register, setReg]    = useState(null);
  const [items, setItems]     = useState([]);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState({});
  const [poItems, setPoItems] = useState([{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]);
  const [prItems, setPrItems] = useState([{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]);
  const [editOrderId, setEditOrderId] = useState(null);
  const [editReturnId, setEditReturnId] = useState(null);
  const [invItems, setInvItems]   = useState([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,gstRate:18}]);
  const [calculatedTotals, setCalculatedTotals] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmt, setPayAmt]   = useState('');
  const [payRef,  setPayRef]  = useState('');
  const [payNotes,setPayNotes]= useState('');
  const [regFrom, setRegFrom] = useState('');
  const [regTo, setRegTo]     = useState('');

  useEffect(()=>{ fetchAll(); fetchBanks(); },[selectedFY.label]); // eslint-disable-line react-hooks/exhaustive-deps

  const [bankList, setBankList] = useState([]);
  const fetchBanks = async () => {
    try { const r = await getBanks(); setBankList(r.data||[]); } catch { }
  };
  const fetchAll = async () => {
    const fyParam = selectedFY.value === 'ALL' ? {} : { financialYear: selectedFY.label };
    try {
      const [sR,iR,oR,rR,gR,itR] = await Promise.all([
        getSuppliers(), getPurchaseInvoices(fyParam), getPurchaseOrders(fyParam),
        getPurchaseReturns(fyParam), getGRNs(fyParam), getItems()
      ]);
      setSupp(sR.data||[]); setInv(iR.data||[]); setOrders(oR.data||[]);
      setReturns(rR.data||[]); setGRNs(gR.data||[]); setItems(itR.data||[]);
    } catch { }
  };

  const gstRateOptions = useMemo(() => { // eslint-disable-line react-hooks/exhaustive-deps
    return Array.from(new Set(GST_RATES)).sort((a, b) => a - b);
  }, []);

  // ── Backend Invoice Calculation (Professional ERP Pattern) ──
  const calcTimeoutRef = useRef(null);
  
  useEffect(() => {
    if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    
    const validItems = invItems.filter(it => it.itemId && it.quantity > 0);
    if (validItems.length === 0) {
      setCalculatedTotals(null);
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
            discount: it.discount,
            gstRate: it.gstRate
          })),
          discount: form.discount || 0,
          freightCharge: form.freightCharge || 0,
          packagingCharge: form.packagingCharge || 0,
          otherCharge: form.otherCharge || 0,
          roundOff: form.roundOff || 0
        };
        
        const response = await calculateInvoice(invoice, form.isInterState);
        const d = response.data;
        // Normalize backend field names (totalCGST → totalCgst, etc.)
        setCalculatedTotals({
          subTotal:        d.totalTaxable   ?? d.subTotal       ?? 0,
          totalCgst:       d.totalCGST      ?? d.totalCgst      ?? 0,
          totalSgst:       d.totalSGST      ?? d.totalSgst      ?? 0,
          totalIgst:       d.totalIGST      ?? d.totalIgst      ?? 0,
          totalGst:       (d.totalCGST ?? d.totalCgst ?? 0) + (d.totalSGST ?? d.totalSgst ?? 0) + (d.totalIGST ?? d.totalIgst ?? 0),
          discountAmount:  d.totalDiscount  ?? d.discountAmount  ?? 0,
          grandTotal:      d.grandTotal     ?? 0,
          freightCharge:   form.freightCharge  || 0,
          packagingCharge: form.packagingCharge|| 0,
          otherCharge:     form.otherCharge    || 0,
          roundOff:        form.roundOff       || 0,
        });
      } catch (err) {
        // Silent fail - will use fallback calculation
      }
    }, 300);
    
    return () => {
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  }, [invItems, form.discount, form.freightCharge, form.packagingCharge, form.otherCharge, form.roundOff, form.isInterState]);

  // ── Fallback Frontend Calc (for offline/resilience) ──
  const calcTotalsFallback = (rows, f) => {
    let sub=0,cgst=0,sgst=0,igst=0;
    const interState = f?.isInterState || false;  // form-level flag (supplier state check)
    rows.forEach(it => {
      const base   = (it.quantity||0)*(it.rate||0) * (1 - (it.discount||0)/100);
      const gstAmt = base * (it.gstRate||0) / 100;
      sub += base;
      if (interState) igst += gstAmt;  // use form-level interState only
      else { cgst += gstAmt/2; sgst += gstAmt/2; }
    });
    // Invoice-level discount — also adjust GST proportionally
    const invDiscPct = (f?.discount||0) / 100;
    const invDisc    = sub * invDiscPct;
    const subAfterD  = sub - invDisc;
    const discFactor = 1 - invDiscPct;
    const cgstFinal  = cgst * discFactor;
    const sgstFinal  = sgst * discFactor;
    const igstFinal  = igst * discFactor;
    const totalGst   = interState ? igstFinal : cgstFinal + sgstFinal;
    const freight    = f?.freightCharge   || 0;
    const packaging  = f?.packagingCharge || 0;
    const other      = f?.otherCharge     || 0;
    const addChg     = freight + packaging + other;
    const roundOff   = f?.roundOff        || 0;
    return {
      subTotal:subAfterD,
      totalCgst:interState?0:cgstFinal,
      totalSgst:interState?0:sgstFinal,
      totalIgst:interState?igstFinal:0,
      totalGst,
      discountAmount:invDisc,
      freightCharge:freight, packagingCharge:packaging,
      otherCharge:other, otherChargeLabel:f?.otherChargeLabel||'Other',
      roundOff,
      grandTotal:subAfterD + totalGst + addChg + roundOff
    };
  };

  const addItemRow = () => setInvItems((prev) => [...prev, { itemId: '', itemName: '', hsnCode: '', quantity: 1, unit: 'Nos', rate: 0, gstRate: 18 }]);
  const removeItemRow = (i) => setInvItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItemRow = (i, field, val) => {
    setInvItems((rows) => {
      const r = rows.map((row, idx) => (idx === i ? { ...row, [field]: val } : row));
      if (field === 'itemId') {
        if (!val) {
          r[i] = { ...r[i], itemId: '', itemName: '', hsnCode: '', rate: 0, gstRate: 18 };
        } else {
          const it = items.find((x) => x.id === val);
          if (it) {
            const hsn = (it.hsnCode || '').toString().trim();
            const g = Number(it.gstRate) || 18;
            r[i] = {
              ...r[i],
              itemId: val,
              itemName: it.itemName,
              hsnCode: hsn,
              rate: it.purchaseRate || 0,
              unit: it.unit || 'Nos',
              gstRate: g,
            };
          }
        }
      }
      if (field === 'itemName') {
        const it = items.find((x) => x.itemName === val || x.itemCode === val);
        if (it) {
          const hsn = (it.hsnCode || '').toString().trim();
          const g = Number(it.gstRate) || 18;
          r[i] = {
            ...r[i],
            itemId: it.id,
            itemName: it.itemName,
            hsnCode: hsn,
            rate: it.purchaseRate || 0,
            unit: it.unit || 'Nos',
            gstRate: g,
          };
        }
      }
      if (field === 'hsnCode') {
        const code = String(val || '').trim();
        r[i] = { ...r[i], hsnCode: code };
      }
      return r;
    });
  };

  const deleteSupp = async () => {
    try {
      await deleteSupplier(confirmDeleteSupp.id);
      toast.success(`Supplier "${confirmDeleteSupp.supplierName}" deleted`);
      setConfirmDeleteSupp(null); fetchAll();
    } catch(e) {
      toast.error(e.response?.data?.error || e.response?.data || 'Cannot delete — may have active invoices');
      setConfirmDeleteSupp(null);
    }
  };

  const cancelInv = async () => {
    try {
      await cancelPurchaseInvoice(confirmCancelInv.id, 'Cancelled by user');
      toast.success('Invoice cancelled and accounting reversed');
      setConfirmCancelInv(null); fetchAll();
    } catch(e) {
      toast.error(e.response?.data?.error || 'Failed to cancel invoice');
      setConfirmCancelInv(null);
    }
  };

  const saveSupplier = async () => {
    if(!form.supplierName?.trim()){toast.error('Supplier Name is required');return;}
    if(!form.phone?.trim()){toast.error('Phone number is required');return;}
    const phoneRegex=/^[6-9]\d{9}$/;
    if(!phoneRegex.test(form.phone)){toast.error('Enter valid 10-digit mobile number (starting with 6-9)');return;}
    if(form.email?.trim()){
      const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!emailRegex.test(form.email)){toast.error('Enter a valid email address');return;}
    }
    if(form.gstin?.trim() && form.gstin.length!==15){toast.error('GSTIN must be exactly 15 characters');return;}
    if(form.pincode?.trim() && !/^\d{6}$/.test(form.pincode)){toast.error('Pincode must be 6 digits');return;}
    if(!form.id){
      const dupPhone=suppliers.find(s=>s.phone===form.phone);
      if(dupPhone){toast.error(`Phone ${form.phone} already used by ${dupPhone.supplierName}`);return;}
    }
    try { if(form.id) await updateSupplier(form.id,form); else await addSupplier(form);
      toast.success('Supplier saved!'); setModal(null); setForm({}); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const saveInvoice = async () => {
    if(!form.supplierId){toast.error('Please select a supplier');return;}
    if(invItems.length===0){toast.error('Add at least one item');return;}
    const badItem=invItems.find(i=>!i.itemName?.trim()||!i.quantity||i.quantity<=0||!i.rate||i.rate<=0);
    if(badItem){toast.error('All items must have name, quantity > 0, and rate > 0');return;}
    if(form.supplierGstin?.trim() && form.supplierGstin.trim().length!==15){toast.error('Supplier GSTIN 15 characters cha hava!');return;}
    const totals=calcTotalsFallback(invItems,form);
    const supp=suppliers.find(s=>s.id===form.supplierId);
    const data={...form,...totals,items:invItems,supplierName:supp?.supplierName||'',
      financialYear:selectedFY.label,paymentStatus:'PENDING',status:'CONFIRMED',
      balanceDue:totals.grandTotal,paidAmount:0,invoiceDate:form.invoiceDate||today()};
    try { await addPurchaseInvoice(data); toast.success('Invoice saved! Auto-posting done ✅');
      setModal(null); setForm({}); setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,gstRate:18}]); fetchAll(); }
    catch(e) { toast.error(e.response?.data?.error || e.response?.data || 'Failed to save'); }
  };

  const saveAsDraft = async () => {
    if(!form.supplierId){toast.error('Select a supplier first');return;}
    const totals=calcTotalsFallback(invItems,form);
    const supp=suppliers.find(s=>s.id===form.supplierId);
    const data={...form,...totals,items:invItems,supplierName:supp?.supplierName||'',
      financialYear:selectedFY.label,paymentStatus:'PENDING',status:'DRAFT',
      balanceDue:totals.grandTotal,paidAmount:0,invoiceDate:form.invoiceDate||today()};
    try { await addPurchaseInvoice(data);
      toast.success('📋 Draft saved! Stock added nahi — confirm karayla invoice open kara.');
      setModal(null); setForm({}); setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,gstRate:18}]); fetchAll(); }
    catch(e) { toast.error('Draft save failed'); }
  };

  // eslint-disable-next-line no-unused-vars
  const openPEwayModal = (inv) => { setEwayPModal(inv); setEwayPNum(inv.ewayBillNumber||''); };
  // eslint-disable-next-line no-unused-vars
  const savePEwayBill  = async () => {
    if(!ewayPNum.trim()){toast.error('E-Way Bill number enter kara');return;}
    try {
      // Use PUT /purchase/invoices/{id} to update ewayBillNumber
      const inv = {...ewayPModal, ewayBillNumber: ewayPNum};
      await updatePurchaseInvoice(ewayPModal.id, inv);
      toast.success('✅ E-Way Bill number saved: '+ewayPNum);
      setEwayPModal(null); fetchAll();
    } catch(e){ toast.error('Save failed'); }
  };

  const saveOrder = async () => {
    if(!form.supplierId){toast.error('Select supplier');return;}
    const supp=suppliers.find(s=>s.id===form.supplierId);
    const validItems = poItems.filter(i=>i.itemName && i.quantity>0);
    
    // Get totals from backend API
    let totals;
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
      const response = await calculateInvoice(invoice, form.isInterState);
      totals = response.data;
    } catch (err) {
      // Fallback to frontend calc
      totals = calcTotalsFallback(validItems, form);
    }
    
    const payload = {
      supplierId:form.supplierId, supplierName:supp?.supplierName||'',
      supplierGstin:supp?.gstin||'', supplierAddress:supp?.address||'',
      supplierCity:supp?.city||'', supplierState:supp?.state||'',
      supplierPhone:supp?.phone||'',
      poDate:form.orderDate||today(), expectedDeliveryDate:form.expectedDelivery||null,
      ...totals,
      notes:form.remarks||'', status: editOrderId ? (form.status||'DRAFT') : 'DRAFT',
      financialYear:selectedFY.label, items:validItems
    };
    try {
      if(editOrderId) { await updatePurchaseOrder(editOrderId, payload); toast.success('PO updated!'); }
      else { await addPurchaseOrder(payload); toast.success('PO created!'); }
      setModal(null); setForm({}); setPoItems([{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]); setEditOrderId(null); fetchAll();
    } catch { toast.error('Failed'); }
  };

  // ─── DELETE PURCHASE RETURN ───
  const deleteReturn = async () => {
    try {
      await deletePurchaseReturn(confirmDeleteReturn.id);
      toast.success('Return deleted!');
      setConfirmDeleteReturn(null);
      fetchAll();
    } catch(e) {
      toast.error(e.response?.data?.error || 'Delete failed');
      setConfirmDeleteReturn(null);
    }
  };

  // ─── DELETE GRN ───
  const deleteGRNEntry = async () => {
    try {
      await deleteGRN(confirmDeleteGRN.id);
      toast.success('GRN deleted!');
      setConfirmDeleteGRN(null);
      fetchAll();
    } catch(e) {
      toast.error(e.response?.data?.error || 'Delete failed');
      setConfirmDeleteGRN(null);
    }
  };

  const saveReturn = async () => {
    if(!form.supplierId){toast.error('Select supplier');return;}
    if(!form.originalInvoiceId){toast.error('Against Invoice select करणे आवश्यक आहे');return;}
    const validItems = prItems.filter(i=>i.itemName && i.quantity>0);
    
    // Get totals from backend API
    let totals;
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
      const response = await calculateInvoice(invoice, form.isInterState);
      totals = response.data;
    } catch (err) {
      // Fallback to frontend calc
      totals = calcTotalsFallback(validItems, form);
    }
    
    const payload = {
      supplierId:form.supplierId, supplierName:form.supplierName||'',
      originalInvoiceId:form.originalInvoiceId||'',
      originalInvoiceNumber:form.invoiceNumber||'',
      returnDate:form.returnDate||today(),
      ...totals,
      reason:form.reason||'', status:'PENDING',
      financialYear:selectedFY.label, items:validItems
    };
    try {
      if(editReturnId) { await updatePurchaseReturn(editReturnId, payload); toast.success('Return updated!'); }
      else { await addPurchaseReturn(payload); toast.success('Return recorded!'); }
      setModal(null); setForm({}); setPrItems([{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]); setEditReturnId(null); fetchAll();
    } catch { toast.error('Failed'); }
  };

  const saveGRN = async () => {
    if(!form.supplierId){toast.error('Select supplier');return;}
    try {
      if(editGRNId) {
        await updateGRN(editGRNId, {...form, financialYear:selectedFY.label,
          receivedDate:form.grnDate||today(), grnDate:form.grnDate||today()});
        toast.success('GRN updated!');
      } else {
        await addGRN({...form, financialYear:selectedFY.label,
          receivedDate:form.grnDate||today(), grnDate:form.grnDate||today(), status:'RECEIVED'});
        toast.success('GRN created!');
      }
      setModal(null); setForm({}); setEditGRNId(null); fetchAll();
    } catch { toast.error('Failed'); }
  };

  const recordPayment = async () => {
    if(!payAmt||payAmt<=0){toast.error('Enter amount');return;}
    try { await recordPurchasePayment(payModal.id,{amount:Number(payAmt),paymentMode:form.paymentMode||'CASH',referenceNo:payRef,notes:payNotes});
      toast.success('Payment recorded!'); setPayModal(null); setPayAmt(''); setPayRef(''); setPayNotes(''); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const fetchRegister = async () => {
    if(!regFrom||!regTo){toast.error('Select date range');return;}
    try { const r=await getPurchaseRegister({fromDate:regFrom,toDate:regTo}); setReg(r.data); }
    catch { toast.error('Failed to load'); }
  };

  const totals = calculatedTotals || calcTotalsFallback(invItems, form);
  const STATUS_COLOR = {PAID:'#16a34a',PARTIAL:'#d97706',PENDING:'#dc2626',RETURNED:'#7c3aed',CONFIRMED:'#2563eb',DRAFT:'#64748b',RECEIVED:'#16a34a',SENT:'#0891b2',PARTIALLY_RECEIVED:'#7c3aed',INVOICED:'#059669',CANCELLED:'#dc2626'};

  const tabList = [
    ['invoices','📄 Invoices'],['suppliers','🏭 Suppliers'],['orders','📋 Orders'],
    ['returns','↩️ Returns'],['grn','📦 GRN'],['register','📊 Register']
  ];

  return (
    <>
    <div>
      <div className="tabs">{tabList.map(([k,l])=>(
        <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
      ))}</div>

      {/* ── SUPPLIERS ── */}
      {tab==='suppliers'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏭 Supplier Master</span>
            <button className="btn btn-primary" onClick={()=>{setForm({});setModal('supplier');}}>+ Add Supplier</button>
          </div>
          <div className="card-body">
            {suppliers.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Code</th><th>Supplier Name</th><th>Contact</th><th>Phone</th><th>GSTIN</th><th>City</th><th>Balance</th><th>Action</th></tr></thead>
                <tbody>{suppliers.map(s=>(
                  <tr key={s.id}>
                    <td style={{fontSize:11,color:'#94a3b8'}}>{s.supplierCode||'—'}</td>
                    <td><strong>{s.supplierName}</strong></td>
                    <td>{s.contactPerson||'—'}</td>
                    <td>{s.phone||'—'}</td>
                    <td style={{fontSize:11}}>{s.gstin||'—'}</td>
                    <td>{s.city||'—'}</td>
                    <td className="text-right" style={{color:'#dc2626',fontWeight:600}}>{fmt(s.currentBalance||0)}</td>
                    <td style={{display:'flex',gap:4}}>
                      <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}} onClick={()=>{setForm(s);setModal('supplier');}}>✏️ Edit</button>
                      {isAdmin && <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,borderColor:'#dc2626',color:'#dc2626'}} onClick={()=>setConfirmDeleteSupp(s)}>🗑️ Del</button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>🏭</div><div>No suppliers. Add your first supplier.</div></div>}
          </div>
        </div>
      )}

      {/* ── INVOICES ── */}
      {tab==='invoices'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">📄 Purchase Invoices</span>
            <div style={{display:'flex',gap:8}}>
              <span style={{background:'#fee2e2',color:'#dc2626',padding:'4px 10px',borderRadius:12,fontSize:12,fontWeight:700}}>
                Outstanding: {fmt(invoices.reduce((s,i)=>s+Math.max(0,(i.balanceDue||0)),0))}
              </span>
              <button className="btn btn-primary" onClick={()=>{setForm({invoiceDate:today()});setInvItems([{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,gstRate:18}]);setModal('invoice');}}>+ New Invoice</button>
            </div>
          </div>
          <div className="card-body">
            {/* Search & Filter */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'center'}}>
              <input placeholder="🔍 Search invoice#, supplier..." value={invSearch} onChange={e=>setInvSearch(e.target.value)}
                style={{height:30,fontSize:12,minWidth:200,padding:'0 10px',border:'1.5px solid #e2e8f0',borderRadius:6,outline:'none'}}
                onFocus={e=>e.target.style.borderColor='#2563eb'} onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              <select value={invStatus} onChange={e=>setInvStatus(e.target.value)} style={{height:30,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Status</option>
                {['PAID','PARTIAL','PENDING'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-outline" onClick={()=>{setInvSearch('');setInvStatus('');}} style={{height:30,fontSize:12}}>✕ Clear</button>
              <span style={{fontSize:12,color:'#94a3b8'}}>
                {invoices.filter(inv=>{
                  if(invStatus && inv.paymentStatus!==invStatus) return false;
                  if(invSearch){const s=invSearch.toLowerCase();return (inv.invoiceNumber||'').toLowerCase().includes(s)||(inv.supplierName||'').toLowerCase().includes(s);}
                  return true;
                }).length}/{invoices.length} records
              </span>
            </div>
            {invoices.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Invoice#</th><th>Supplier</th><th>Date</th><th>Taxable</th><th>GST</th><th>Total</th><th>Paid</th><th>Credit</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{invoices.filter(inv=>{
                  if(invStatus && inv.paymentStatus!==invStatus) return false;
                  if(invSearch){const s=invSearch.toLowerCase();return (inv.invoiceNumber||'').toLowerCase().includes(s)||(inv.supplierName||'').toLowerCase().includes(s);}
                  return true;
                }).map(inv=>(
                  <tr key={inv.id}>
                    <td style={{fontSize:11,fontWeight:600,color:'#1a4f8a'}}>{inv.invoiceNumber}</td>
                    <td><strong>{inv.supplierName}</strong></td>
                    <td style={{fontSize:11}}>{inv.invoiceDate}</td>
                    <td className="text-right">{fmt(inv.subTotal)}</td>
                    <td className="text-right" style={{fontSize:11,color:'#64748b'}}>{fmt(inv.totalGst)}</td>
                    <td className="text-right" style={{fontWeight:700}}>{fmt(inv.grandTotal)}</td>
                    <td className="text-right" style={{color:'#16a34a'}}>{fmt(inv.paidAmount)}</td>
                    <td className="text-right" style={{color:'#7c3aed',fontSize:11}}>{inv.creditApplied>0?fmt(inv.creditApplied):'—'}</td>
                    <td className="text-right" style={{fontWeight:600,
                      color:(inv.balanceDue||0)<-0.01?'#059669':'#dc2626'}}>
                      {(inv.balanceDue||0)<-0.01
                        ?<span title="Supplier owes you — refund pending">{fmt(Math.abs(inv.balanceDue))} <span style={{fontSize:10}}>↩ Refund</span></span>
                        :fmt(inv.balanceDue)}
                    </td>
                    <td><span style={{background:STATUS_COLOR[inv.paymentStatus]+'20',color:STATUS_COLOR[inv.paymentStatus],padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:700}}>{inv.paymentStatus}</span></td>
                    <td style={{display:'flex',gap:4}}>
                      {inv.paymentStatus!=='PAID'&&inv.paymentStatus!=='RETURNED'&&(inv.balanceDue||0)>0.01&&<button className="btn btn-outline" style={{padding:'2px 6px',fontSize:10,color:'#16a34a',borderColor:'#16a34a'}} onClick={()=>setPayModal(inv)}>💰Pay</button>}
                      <button className="btn btn-outline" style={{padding:'2px 6px',fontSize:10}} onClick={()=>printPurchaseInvoice(inv, returns.filter(r=>r.originalInvoiceId===inv.id&&(r.status==='APPROVED'||r.status==='COMPLETED')))}>🖨️</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📄</div><div>No invoices. Create your first purchase invoice.</div></div>}
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab==='orders'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Purchase Orders</span>
            <button className="btn btn-primary" onClick={()=>{setForm({});setModal('order');}}>+ New PO</button>
          </div>
          <div className="card-body">
            {orders.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Expected Delivery</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{orders.map(o=>(
                  <tr key={o.id}>
                    <td style={{fontSize:11,fontWeight:600,color:'#1a4f8a'}}>{o.poNumber||'—'}</td>
                    <td><strong>{o.supplierName}</strong></td>
                    <td style={{fontSize:11}}>{o.poDate||o.orderDate||"—"}</td>
                    <td style={{fontSize:11}}>{o.expectedDeliveryDate||'—'}</td>
                    <td className="text-right">{fmt(o.grandTotal||o.totalAmount||0)}</td>
                    <td><span style={{background:STATUS_COLOR[o.status]+'20',color:STATUS_COLOR[o.status]||'#64748b',padding:'3px 8px',borderRadius:12,fontSize:11,fontWeight:700}}>{o.status}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}} title="Print PO"
                          onClick={()=>{
                            const supp=suppliers.find(s=>s.id===o.supplierId)||{};
                            printPurchaseOrder({...o,
                              poNumber:o.poNumber||o.id,
                              orderDate:o.poDate||o.orderDate,
                              expectedDelivery:o.expectedDeliveryDate,
                              supplierGstin:o.supplierGstin||supp.gstin||'',
                              supplierAddress:o.supplierAddress||supp.address||'',
                              supplierCity:o.supplierCity||supp.city||'',
                              supplierState:o.supplierState||supp.state||'',
                              supplierPhone:o.supplierPhone||supp.phone||''
                            });
                          }}>🖨️</button>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}} onClick={()=>{
                          setForm({supplierId:o.supplierId,orderDate:o.poDate,expectedDelivery:o.expectedDeliveryDate,remarks:o.notes,status:o.status});
                          setPoItems(o.items?.length ? o.items : [{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]);
                          setEditOrderId(o.id); setModal('order');
                        }}>✏️</button>
                        {/* Create Invoice from PO */}
                        {o.status==='INVOICED' ? (
                          <span style={{padding:'3px 8px',fontSize:11,color:'#16a34a',fontWeight:600}}>✅ Invoiced</span>
                        ) : o.status!=='CANCELLED' && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#2563eb',borderColor:'#93c5fd'}}
                            title="Create Purchase Invoice from this PO"
                            onClick={()=>{
                              const poInvItems = (o.items||[]).map(it=>({
                                itemId:it.itemId||'',
                                itemName:it.itemName||'', hsnCode:it.hsnCode||'',
                                quantity:it.quantity||1, unit:it.unit||'Nos',
                                rate:it.rate||0, gstRate:it.gstRate||18,
                                taxableAmount:(it.quantity||1)*(it.rate||0),
                                cgst:((it.quantity||1)*(it.rate||0)*(it.gstRate||18)/100)/2,
                                sgst:((it.quantity||1)*(it.rate||0)*(it.gstRate||18)/100)/2,
                                igst:0,
                                totalAmount:(it.quantity||1)*(it.rate||0)*(1+(it.gstRate||18)/100)
                              }));
                              setForm({supplierId:o.supplierId, poReference:o.poNumber});
                              setInvItems(poInvItems.length ? poInvItems : [{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,gstRate:18}]);
                              setTab('invoices'); setModal('invoice');
                              toast.success('PO items loaded — review and save invoice');
                            }}>📄 Invoice</button>
                        )}
                        {/* Status Change — hide if already INVOICED */}
                        {o.status==='DRAFT' && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#059669',borderColor:'#6ee7b7'}}
                            onClick={async()=>{
                              try{ await updatePurchaseOrder(o.id,{...o,status:'SENT'}); toast.success('Status: SENT'); fetchAll(); }
                              catch{ toast.error('Failed'); }
                            }}>→ SENT</button>
                        )}
                        {o.status==='SENT' && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#7c3aed',borderColor:'#c4b5fd'}}
                            onClick={async()=>{
                              try{ await updatePurchaseOrder(o.id,{...o,status:'PARTIALLY_RECEIVED'}); toast.success('Status: PARTIALLY RECEIVED'); fetchAll(); }
                              catch{ toast.error('Failed'); }
                            }}>→ PARTIAL</button>
                        )}
                        {(o.status==='SENT'||o.status==='PARTIALLY_RECEIVED') && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#16a34a',borderColor:'#86efac'}}
                            onClick={async()=>{
                              try{ await updatePurchaseOrder(o.id,{...o,status:'RECEIVED'}); toast.success('Status: RECEIVED ✅'); fetchAll(); }
                              catch{ toast.error('Failed'); }
                            }}>✅ RECEIVED</button>
                        )}
                        {isAdmin && <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}} onClick={()=>setConfirmDeletePO(o)}>🗑️</button>}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📋</div><div>No purchase orders.</div></div>}
          </div>
        </div>
      )}

      {/* ── RETURNS ── */}
      {tab==='returns'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">↩️ Purchase Returns</span>
            <button className="btn btn-primary" onClick={()=>{setForm({});setModal('return');}}>+ New Return</button>
          </div>
          <div className="card-body">
            {returns.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>Return#</th><th>Supplier</th><th>Date</th><th>Against Invoice</th><th>Amount</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{returns.map(r=>(
                  <tr key={r.id}>
                    <td style={{fontSize:11}}>{r.returnNumber||'—'}</td>
                    <td><strong>{r.supplierName}</strong></td>
                    <td style={{fontSize:11}}>{r.returnDate}</td>
                    <td style={{fontSize:11}}>{r.originalInvoiceNumber||r.invoiceNumber||'—'}</td>
                    <td className="text-right" style={{color:'#dc2626',fontWeight:600}}>{fmt(r.grandTotal||r.returnAmount||0)}</td>
                    <td style={{fontSize:11,color:'#64748b'}}>{r.reason||'—'}</td>
                    <td><span style={{background: r.status==='APPROVED'?'#d1fae5':r.status==='COMPLETED'?'#dbeafe':'#fee2e2', color:r.status==='APPROVED'?'#16a34a':r.status==='COMPLETED'?'#2563eb':'#dc2626',padding:'3px 8px',borderRadius:12,fontSize:11}}>{r.status||'PENDING'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        {/* ✅ PRINT BUTTON */}
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                          onClick={()=>printPurchaseReturn(r)}>🖨️</button>
                        {(r.status==='APPROVED'||r.status==='COMPLETED') && (
                          <button className="btn btn-xs" style={{background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe',fontSize:10,padding:'2px 7px'}}
                            title="Print Debit Note" onClick={()=>openDebitNote(r)}>📄 DN</button>
                        )}
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}} onClick={()=>{
                          setForm({supplierId:r.supplierId,supplierName:r.supplierName,invoiceNumber:r.originalInvoiceNumber,returnDate:r.returnDate,reason:r.reason});
                          setPrItems(r.items?.length ? r.items : [{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]);
                          setEditReturnId(r.id); setModal('return');
                        }}>✏️</button>
                        {r.status==='PENDING' && isAdmin && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#16a34a',borderColor:'#86efac'}}
                            onClick={()=>setConfirmApproveReturn(r)}>✅ Approve</button>
                        )}
                        {r.status==='APPROVED' && isAdmin && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#2563eb',borderColor:'#93c5fd'}}
                            onClick={async()=>{
                              try{
                                await updatePurchaseReturn(r.id,{...r,status:'COMPLETED'});
                                toast.success('Return Completed!');
                                fetchAll();
                              }catch{ toast.error('Failed'); }
                            }}>🏁 Complete</button>
                        )}
                        {r.status==='PENDING' && isAdmin && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}}
                            onClick={()=>setConfirmDeleteReturn(r)}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>↩️</div><div>No purchase returns.</div></div>}
          </div>
        </div>
      )}

      {/* ── GRN ── */}
      {tab==='grn'&&(
        <div className="card">
          <div className="card-header">
            <span className="card-title">📦 Goods Receipt Notes (GRN)</span>
            <button className="btn btn-primary" onClick={()=>{setForm({});setEditGRNId(null);setModal('grn');}}>+ New GRN</button>
          </div>
          <div className="card-body">
            {grns.length>0?(
              <div className="table-container"><table>
                <thead><tr><th>GRN#</th><th>Supplier</th><th>GRN Date</th><th>PO Reference</th><th>Received By</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{grns.map(g=>(
                  <tr key={g.id}>
                    <td style={{fontSize:11,fontWeight:600}}>{g.grnNumber||'—'}</td>
                    <td><strong>{g.supplierName}</strong></td>
                    <td style={{fontSize:11}}>{g.grnDate}</td>
                    <td style={{fontSize:11}}>{g.poNumber||'—'}</td>
                    <td>{g.receivedBy||'—'}</td>
                    <td><span style={{background:'#d1fae5',color:'#16a34a',padding:'3px 8px',borderRadius:12,fontSize:11}}>{g.status||'RECEIVED'}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                          onClick={()=>{
                            setForm({supplierId:g.supplierId,supplierName:g.supplierName,
                              grnDate:g.grnDate,poNumber:g.poNumber,receivedBy:g.receivedBy,
                              remarks:g.remarks,status:g.status});
                            setEditGRNId(g.id);
                            setModal('grn');
                          }}>✏️</button>
                        {isAdmin && (
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,color:'#dc2626',borderColor:'#fca5a5'}}
                            onClick={()=>setConfirmDeleteGRN(g)}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            ):<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📦</div><div>No GRN entries.</div></div>}
          </div>
        </div>
      )}

      {/* ── REGISTER ── */}
      {tab==='register'&&(
        <div className="card">
          <div className="card-header"><span className="card-title">📊 Purchase Register</span></div>
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
                  <thead><tr><th>Invoice#</th><th>Supplier</th><th>Date</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>{register.invoices?.map(inv=>(
                    <tr key={inv.id}>
                      <td style={{fontSize:11,fontWeight:600,color:'#1a4f8a'}}>{inv.invoiceNumber}</td>
                      <td>{inv.supplierName}</td>
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
                {register.supplierWise&&Object.keys(register.supplierWise).length>0&&(
                  <div style={{marginTop:16}}>
                    <div style={{fontWeight:700,marginBottom:8,color:'#1a4f8a'}}>Supplier-wise Summary</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                      {Object.entries(register.supplierWise).map(([supp,amt])=>(
                        <div key={supp} style={{background:'#f0f4ff',border:'1px solid #c7d2fe',borderRadius:6,padding:'6px 12px',fontSize:12}}>
                          <strong>{supp}</strong>: {fmt(amt)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {!register&&<div className="text-center" style={{padding:48,color:'#94a3b8'}}><div style={{fontSize:40}}>📊</div><div>Select date range to generate Purchase Register</div></div>}
          </div>
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Supplier Modal */}
      {modal==='supplier'&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-header"><h3>{form.id?'Edit':'Add'} Supplier</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                {/* Auto-generated Supplier Code */}
                <div className="form-group">
                  <label>Supplier Code</label>
                  <input value={form.supplierCode||''} readOnly
                    placeholder="Auto-generated on save"
                    style={{background:'#f8fafc',color:'#64748b',cursor:'not-allowed'}}/>
                </div>
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input value={form.supplierName||''} onChange={e=>setForm({...form,supplierName:e.target.value})} placeholder="e.g. Atul Polymers"/>
                </div>
                <div className="form-group">
                  <label>Supplier GSTIN</label>
                  <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                    <input value={form.gstin||''} onChange={async e=>{
                      const g = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
                      setForm(f=>({...f,gstin:g}));
                      // Auto-verify when 15 chars typed (like Swipe!)
                      if(g.length===15 && /^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)){
                        const tid=toast.loading('🔍 GSTIN verify hotoy...');
                        try{
                          const {verifyGSTIN}=await import('../services/api');
                          const r=await verifyGSTIN(g);
                          const d=r.data;
                          toast.dismiss(tid);
                          if(d.cancelled){toast.error('⚠️ GSTIN Cancelled!');return;}
                          const upd={gstin:g};
                          if(d.name)                   {upd.supplierName=d.name;upd.name=d.name;}
                          if(d.fullAddr||d.address)     upd.address=d.fullAddr||d.address||'';
                          if(d.city||d.district)        upd.city=d.city||d.district||'';
                          if(d.state)                   upd.state=d.state;
                          if(d.pincode)                 upd.pincode=d.pincode;
                          if(d.pan)                     upd.pan=d.pan;
                          setForm(f=>({...f,...upd}));
                          toast.success(d.name?'✅ Auto-filled: '+d.name+(d.state?' | '+d.state:''):'✅ GSTIN valid | '+d.stateName);
                        }catch(e){toast.dismiss(tid);}
                      }
                    }}
                      placeholder="27AAAAA0000A1Z5" maxLength={15} style={{flex:1}}/>
                    <button type="button" className="btn btn-outline" style={{whiteSpace:'nowrap',padding:'6px 12px'}}
                      onClick={async()=>{
                        const g = (form.gstin||'').trim().toUpperCase();
                        if(g.length!==15){toast.error('GSTIN 15 characters cha hava!');return;}
                        const tid = toast.loading('🔍 Verifying GSTIN...');
                        try {
                          const {verifyGSTIN} = await import('../services/api');
                          const r = await verifyGSTIN(g);
                          const d = r.data;
                          toast.dismiss(tid);
                          if(d.cancelled){toast.error('⚠️ GSTIN Cancelled/Inactive!');return;}
                          const upd = {gstin:g};
                          if(d.name)                         { upd.supplierName=d.name; upd.name=d.name; }
                          if(d.legalName && !d.name)           upd.supplierName=d.legalName;
                          if(d.fullAddr||d.address)            upd.address=d.fullAddr||d.address||'';
                          if(d.city||d.district)               upd.city=d.city||d.district||'';
                          if(d.state)                          upd.state=d.state;
                          if(d.pincode)                        upd.pincode=d.pincode;
                          if(d.pan)                            upd.pan=d.pan;
                          setForm(f=>({...f,...upd}));
                          toast.success(d.name
                            ? '✅ Auto-filled: '+d.name+(d.state?' | '+d.state:'')
                            : '✅ GSTIN valid | State: '+d.stateName);
                        } catch(e) {
                          toast.dismiss(tid);
                          toast.error(e.message||'Verify failed');
                        }
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
                  <label>Credit Days</label>
                  <input type="number" value={form.creditDays||30} onChange={e=>setForm({...form,creditDays:Number(e.target.value)})}/>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSupplier}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {modal==='invoice'&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:900,width:'95vw'}}>
            <div className="modal-header"><h3>New Purchase Invoice</h3><button className="modal-close" onClick={()=>setModal(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid" style={{marginBottom:12}}>
                <div className="form-group">
                  <label>Supplier *</label>
                  <select value={form.supplierId||''} onChange={e=>{
                      const s=suppliers.find(x=>x.id===e.target.value);
                      setForm(f=>({...f,
                        supplierId:e.target.value,
                        supplierName:s?.supplierName||s?.name||'',
                        supplierGstin:s?.gstin||'',
                        supplierPan:s?.pan||'',
                        supplierAddress:s?.address||'',
                        supplierCity:s?.city||'',
                        supplierState:s?.state||'',
                        supplierPhone:s?.phone||'',
                        supplierEmail:s?.email||'',
                        isInterState:s?.isInterState||false,
                      }));
                    }}>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.supplierName||s.name}{s.gstin?' — '+s.gstin:''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Invoice Date *</label>
                  <input type="date" value={form.invoiceDate||today()} onChange={e=>setForm({...form,invoiceDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Supplier Invoice No</label>
                  <input value={form.supplierInvoiceNumber||''} onChange={e=>setForm({...form,supplierInvoiceNumber:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate||''} onChange={e=>setForm({...form,dueDate:e.target.value})}/>
                </div>
              </div>
              {/* Items */}
              <datalist id="purchase-inv-hsn-datalist">
              {calculatedTotals && (
                <span style={{fontSize:10,color:'#16a34a',background:'#dcfce7',padding:'2px 6px',borderRadius:4}}>
                  ✓ Server Calculated
                </span>
              )}
              {!calculatedTotals && (
                <span style={{fontSize:10,color:'#d97706',background:'#fef3c7',padding:'2px 6px',borderRadius:4}}>
                  Client Mode
                </span>
              )}
              </datalist>
              <div style={{border:'1px solid #e2e8f0',borderRadius:6,overflow:'hidden',marginBottom:12}}>
                <div style={{background:'#1a4f8a',color:'white',padding:'8px 12px',fontSize:12,display:'grid',gridTemplateColumns:'2fr 1fr .8fr .8fr 1fr 1fr .5fr',gap:8,fontWeight:700}}>
                  <span>Item Name</span><span>HSN / SAC</span><span>Qty</span><span>Unit</span><span>Rate</span><span>GST%</span><span></span>
                </div>
                <div style={{fontSize:11,color:'#64748b',padding:'6px 10px',background:'#f1f5f9',borderBottom:'1px solid #e2e8f0'}}>
                  आयटम निवडला की HSN व GST% ऑटो. Inventory madhle values yetil.
                </div>
                {invItems.map((it,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr .8fr .8fr 1fr 1fr .5fr',gap:8,padding:'6px 8px',borderBottom:'1px solid #f1f5f9',background:i%2?'#f8fafc':'white'}}>
                    <select value={it.itemId||''} onChange={e=>updateItemRow(i,'itemId',e.target.value)}
                      style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,width:'100%'}}>
                      <option value="">-- Select Item --</option>
                      {items.filter(x=>x.active!==false).map(x=>(
                        <option key={x.id} value={x.id}>{x.itemName}{x.itemCode?' ('+x.itemCode+')':''} | Stock:{x.currentStock}</option>
                      ))}
                    </select>
                    <input list="purchase-inv-hsn-datalist" value={it.hsnCode||''} onChange={e=>updateItemRow(i,'hsnCode',e.target.value)}
                      style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4,width:'100%'}} placeholder="Type / pick"/>
                    <input type="number" min="0" value={it.quantity} onChange={e=>updateItemRow(i,'quantity',Number(e.target.value))} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <input value={it.unit||'Nos'} onChange={e=>updateItemRow(i,'unit',e.target.value)} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <input type="number" min="0" value={it.rate} onChange={e=>updateItemRow(i,'rate',Number(e.target.value))} style={{fontSize:12,padding:'4px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/>
                    <select value={it.gstRate} onChange={e=>updateItemRow(i,'gstRate',Number(e.target.value))} style={{fontSize:12,padding:'4px 2px',border:'1px solid #e2e8f0',borderRadius:4}}>
                      {gstRateOptions.map(r=><option key={r} value={r}>{r}%</option>)}
                    </select>
                    <button onClick={()=>removeItemRow(i)} style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}}>×</button>
                  </div>
                ))}
                <div style={{padding:'8px',background:'#f8fafc'}}>
                  <button className="btn btn-outline" style={{fontSize:12}} onClick={addItemRow}>+ Add Item</button>
                </div>
              </div>
              {/* Totals */}
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <div style={{background:'#f0f4ff',borderRadius:6,padding:'10px 16px',fontSize:13,minWidth:220}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontWeight:700,fontSize:14}}>Invoice Totals</span>
                    {calculatedTotals && (
                      <span style={{fontSize:10,color:'#16a34a',background:'#dcfce7',padding:'2px 6px',borderRadius:4}}>
                        ✓ Server
                      </span>
                    )}
                    {!calculatedTotals && (
                      <span style={{fontSize:10,color:'#d97706',background:'#fef3c7',padding:'2px 6px',borderRadius:4}}>
                        Client
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span>Taxable:</span><strong>{fmt(totals.subTotal)}</strong></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'#64748b'}}><span>CGST:</span><span>{fmt(totals.totalCgst)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'#64748b'}}><span>SGST:</span><span>{fmt(totals.totalSgst)}</span></div>
                  {totals.totalIgst>0&&<div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'#64748b'}}><span>IGST:</span><span>{fmt(totals.totalIgst)}</span></div>}
                  <div style={{display:'flex',justifyContent:'space-between',borderTop:'2px solid #1a4f8a',paddingTop:6,fontWeight:700,color:'#1a4f8a',fontSize:14}}><span>Grand Total:</span><span>{fmt(totals.grandTotal)}</span></div>
                </div>
              </div>
              <div className="form-group" style={{marginTop:8}}>
                <label>Notes</label>
                <input value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional notes"/>
              </div>
              {/* Additional Charges */}
              <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px',marginTop:10}}>
                <div style={{fontWeight:600,fontSize:12,marginBottom:8,color:'#374151'}}>📦 Additional Charges</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Freight (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.freightCharge||''} placeholder="0"
                      onChange={e=>setForm(f=>({...f,freightCharge:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Packaging (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.packagingCharge||''} placeholder="0"
                      onChange={e=>setForm(f=>({...f,packagingCharge:parseFloat(e.target.value)||0}))}/></div>
                  <div><label style={{fontSize:11,display:'block',marginBottom:4}}>Other (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.otherCharge||''} placeholder="0"
                      onChange={e=>setForm(f=>({...f,otherCharge:parseFloat(e.target.value)||0}))}/></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-outline" onClick={saveAsDraft}
                style={{color:'#64748b',borderColor:'#64748b'}} title="Draft — stock added nahi">
                📋 Draft
              </button>
              <button className="btn btn-primary" onClick={saveInvoice}>💾 Save Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {modal==='order'&&(
        <div className="modal-overlay" onClick={()=>{setModal(null);setEditOrderId(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:720}}>
            <div className="modal-header"><h3>{editOrderId?'Edit':'New'} Purchase Order</h3><button className="modal-close" onClick={()=>{setModal(null);setEditOrderId(null);}}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Supplier *</label>
                  <select value={form.supplierId||''} onChange={e=>setForm({...form,supplierId:e.target.value})}>
                    <option value="">-- Select --</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.supplierName}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Order Date</label><input type="date" value={form.orderDate||today()} onChange={e=>setForm({...form,orderDate:e.target.value})}/></div>
                <div className="form-group"><label>Expected Delivery</label><input type="date" value={form.expectedDelivery||''} onChange={e=>setForm({...form,expectedDelivery:e.target.value})}/></div>
                <div className="form-group"><label>Notes</label><input value={form.remarks||''} onChange={e=>setForm({...form,remarks:e.target.value})}/></div>
              </div>
              <h4 style={{margin:'12px 0 8px'}}>Items</h4>
              <div className="table-container"><table>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>GST%</th><th>Taxable</th><th>GST Amt</th><th>Total</th><th></th></tr></thead>
                <tbody>{poItems.map((row,i)=>(
                  <tr key={i}>
                    <td><select value={row.itemId||''} style={{minWidth:140}} onChange={e=>{
                      const it=items.find(it=>it.id===e.target.value);
                      const rows=[...poItems];
                      const selRate=it?.purchaseRate||0; const selGstRate=it?.gstRate||18;
                      const selQty=rows[i].quantity||1;
                      const selTax=selQty*selRate; const selGst=selTax*selGstRate/100;
                      rows[i]={...rows[i],itemId:e.target.value,itemName:it?.itemName||'',hsnCode:it?.hsnCode||'',unit:it?.unit||'Nos',
                        rate:selRate,gstRate:selGstRate,taxableAmount:selTax,gstAmt:selGst,amount:selTax+selGst};
                      setPoItems(rows);
                    }}>
                      <option value="">-- Select --</option>
                      {items.filter(it=>it.active!==false).map(it=><option key={it.id} value={it.id}>{it.itemName}</option>)}
                    </select></td>
                    <td><input type="number" value={row.quantity||''} style={{width:60}} onChange={e=>{
                      const rows=[...poItems];
                      const qty=Number(e.target.value); const tax=qty*(rows[i].rate||0); const gst=tax*(rows[i].gstRate||18)/100;
                      rows[i]={...rows[i],quantity:qty,taxableAmount:tax,gstAmt:gst,amount:tax+gst};
                      setPoItems(rows);
                    }}/></td>
                    <td><input value={row.unit||'Nos'} style={{width:60}} onChange={e=>{const rows=[...poItems];rows[i]={...rows[i],unit:e.target.value};setPoItems(rows);}}/></td>
                    <td><input type="number" value={row.rate||''} style={{width:80}} onChange={e=>{
                      const rows=[...poItems];
                      const rate=Number(e.target.value); const tax=(rows[i].quantity||0)*rate; const gst=tax*(rows[i].gstRate||18)/100;
                      rows[i]={...rows[i],rate,taxableAmount:tax,gstAmt:gst,amount:tax+gst};
                      setPoItems(rows);
                    }}/></td>
                    <td><select value={row.gstRate||0} style={{width:60}} onChange={e=>{
                      const rate=Number(e.target.value); const rows=[...poItems];
                      const tax=(rows[i].quantity||0)*(rows[i].rate||0); const gst=tax*rate/100;
                      rows[i]={...rows[i],gstRate:rate,gstAmt:gst,taxableAmount:tax,amount:tax+gst};
                      setPoItems(rows);
                    }}>{[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}</select></td>
                    <td className="text-right">{fmt((row.taxableAmount||(row.quantity||0)*(row.rate||0)))}</td>
                    <td className="text-right" style={{color:'#6366f1'}}>{fmt(row.gstAmt||(row.taxableAmount||0)*(row.gstRate||0)/100)}</td>
                    <td className="text-right" style={{fontWeight:600}}>{fmt(row.amount||0)}</td>
                    <td><button style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}} onClick={()=>setPoItems(poItems.filter((_,j)=>j!==i))}>×</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>setPoItems([...poItems,{itemId:'',itemName:'',hsnCode:'',quantity:1,unit:'Nos',rate:0,gstRate:18,taxableAmount:0,gstAmt:0,amount:0}])}>+ Add Item</button>
                <div style={{display:'flex',gap:16,fontSize:12,marginTop:4}}>
                  <span>Taxable: <strong>{fmt(poItems.reduce((s,i)=>s+(i.taxableAmount||(i.quantity||0)*(i.rate||0)),0))}</strong></span>
                  <span style={{color:'#6366f1'}}>GST: <strong>{fmt(poItems.reduce((s,i)=>s+(i.gstAmt||0),0))}</strong></span>
                  <span style={{color:'#16a34a'}}>Grand Total: <strong>{fmt(poItems.reduce((s,i)=>s+(i.amount||0),0))}</strong></span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>{setModal(null);setEditOrderId(null);}}>Cancel</button>
              <button className="btn btn-primary" onClick={saveOrder}>{editOrderId?'Update':'Create'} PO</button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {modal==='return'&&(
        <div className="modal-overlay" onClick={()=>{setModal(null);setEditReturnId(null);}}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:720}}>
            <div className="modal-header"><h3>{editReturnId?'Edit':'New'} Purchase Return</h3><button className="modal-close" onClick={()=>{setModal(null);setEditReturnId(null);}}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Supplier *</label>
                  <select value={form.supplierId||''} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setForm({...form,supplierId:e.target.value,supplierName:s?.supplierName||'',originalInvoiceId:'',invoiceNumber:''});setPrItems([{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}]);}}>
                    <option value="">-- Select --</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.supplierName}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Against Invoice *</label>
                  <select value={form.originalInvoiceId||''} onChange={e=>{
                    const inv=invoices.find(i=>i.id===e.target.value);
                    if(inv){
                      const approvedReturns=returns.filter(r=>
                        r.originalInvoiceId===inv.id &&
                        (r.status==='APPROVED'||r.status==='COMPLETED') &&
                        (!editReturnId || r.id!==editReturnId)
                      );
                      const retQtyMap={};
                      approvedReturns.forEach(r=>(r.items||[]).forEach(ri=>{
                        retQtyMap[ri.itemId]=(retQtyMap[ri.itemId]||0)+ri.quantity;
                      }));
                      const retItems=(inv.items||[]).map(it=>{
                        const alreadyRet=retQtyMap[it.itemId]||0;
                        const remainingQty=Math.max(0,(it.quantity||1)-alreadyRet);
                        const stockItem=items.find(si=>si.id===it.itemId);
                        const inStock=stockItem?Number(stockItem.currentStock):remainingQty;
                        const maxQty=Math.min(remainingQty, inStock);
                        if(maxQty<=0) return null;
                        const qty=maxQty;
                        const tax=qty*(it.rate||0);
                        const gst=tax*(it.gstRate||0)/100;
                        return {
                          itemId:it.itemId||'',itemName:it.itemName||'',hsnCode:it.hsnCode||'',
                          quantity:qty,maxQty,inStock,alreadyReturned:alreadyRet,invoiceQty:it.quantity,
                          unit:it.unit||'Nos',rate:it.rate||0,gstRate:it.gstRate||0,
                          taxableAmount:tax,gstAmt:gst,amount:tax+gst
                        };
                      }).filter(Boolean);
                      setForm(f=>({...f,originalInvoiceId:e.target.value,invoiceNumber:inv.invoiceNumber||'',
                        invoiceTotal:inv.grandTotal,invoicePaid:inv.paidAmount}));
                      if(retItems.length) setPrItems(retItems);
                    } else { setForm(f=>({...f,originalInvoiceId:'',invoiceNumber:'',invoiceTotal:0,invoicePaid:0})); }
                  }}>
                    <option value="">-- Select Invoice --</option>
                    {invoices.filter(i=>!i.cancelled&&i.supplierId===form.supplierId).map(i=>{
                      const doneQty=returns.filter(r=>r.originalInvoiceId===i.id&&(r.status==='APPROVED'||r.status==='COMPLETED'))
                        .reduce((s,r)=>(r.items||[]).reduce((ss,ri)=>ss+ri.quantity,s),0);
                      const totalQty=(i.items||[]).reduce((s,it)=>s+(it.quantity||0),0);
                      const remaining=totalQty-doneQty;
                      return remaining>0
                        ? <option key={i.id} value={i.id}>{i.invoiceNumber} — {fmt(i.grandTotal)} (Remaining: {remaining} items)</option>
                        : null;
                    }).filter(Boolean)}
                  </select>
                </div>
                <div className="form-group"><label>Return Date</label><input type="date" value={form.returnDate||today()} onChange={e=>setForm({...form,returnDate:e.target.value})}/></div>
                <div className="form-group"><label>Reason</label><input value={form.reason||''} placeholder="Damaged / Wrong / Quality" onChange={e=>setForm({...form,reason:e.target.value})}/></div>
              </div>
              <h4 style={{margin:'12px 0 8px'}}>Items to Return</h4>
              <div className="table-container"><table>
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>GST%</th><th>Taxable</th><th>GST Amt</th><th>Total</th><th></th></tr></thead>
                <tbody>{prItems.map((row,i)=>(
                  <tr key={i}>
                    <td><select value={row.itemId||''} style={{minWidth:140}} onChange={e=>{
                      const it=items.find(it=>it.id===e.target.value);
                      const rows=[...prItems];
                      const rate=it?.purchaseRate||0; const qty=rows[i].quantity||1;
                      const gstRate=it?.gstRate||0;
                      const tax=qty*rate; const gst=tax*gstRate/100;
                      rows[i]={...rows[i],itemId:e.target.value,itemName:it?.itemName||'',unit:it?.unit||'Nos',rate,gstRate,taxableAmount:tax,gstAmt:gst,amount:tax+gst};
                      setPrItems(rows);
                    }}>
                      <option value="">-- Select --</option>
                      {items.filter(it=>it.active!==false).map(it=><option key={it.id} value={it.id}>{it.itemName}</option>)}
                    </select></td>
                    <td>
                      <input type="number" value={row.quantity||''} style={{width:60}}
                        min={0} max={row.maxQty||row.quantity}
                        onChange={e=>{
                          const qty=Math.min(Number(e.target.value), row.maxQty||Number(e.target.value));
                          const rows=[...prItems];
                          const tax=qty*(rows[i].rate||0); const gst=tax*(rows[i].gstRate||0)/100;
                          rows[i]={...rows[i],quantity:qty,taxableAmount:tax,gstAmt:gst,amount:tax+gst};
                          setPrItems(rows);
                        }}/>
                      {row.maxQty>0&&<div style={{fontSize:10,color:'#6b7280'}}>Max: {row.maxQty}</div>}
                      {row.inStock!=null&&row.inStock<(row.invoiceQty||0)&&<div style={{fontSize:10,color:'#dc2626'}}>Stock: {row.inStock}</div>}
                    </td>
                    <td><input value={row.unit||'Nos'} style={{width:60}} onChange={e=>{const rows=[...prItems];rows[i]={...rows[i],unit:e.target.value};setPrItems(rows);}}/></td>
                    <td><input type="number" value={row.rate||''} style={{width:80}} onChange={e=>{
                      const rate=Number(e.target.value); const rows=[...prItems];
                      const tax=(rows[i].quantity||0)*rate; const gst=tax*(rows[i].gstRate||0)/100;
                      rows[i]={...rows[i],rate,taxableAmount:tax,gstAmt:gst,amount:tax+gst};
                      setPrItems(rows);
                    }}/></td>
                    <td><select value={row.gstRate||0} style={{width:60}} onChange={e=>{
                      const rate=Number(e.target.value); const rows=[...prItems];
                      const tax=(rows[i].quantity||0)*(rows[i].rate||0); const gst=tax*rate/100;
                      rows[i]={...rows[i],gstRate:rate,gstAmt:gst,taxableAmount:tax,amount:tax+gst};
                      setPrItems(rows);
                    }}>{[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}</select></td>
                    <td className="text-right">{fmt((row.taxableAmount||(row.quantity||0)*(row.rate||0)))}</td>
                    <td className="text-right" style={{color:'#6366f1'}}>{fmt(row.gstAmt||(row.taxableAmount||0)*(row.gstRate||0)/100)}</td>
                    <td className="text-right" style={{fontWeight:600}}>{fmt(row.amount||0)}</td>
                    <td><button style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}} onClick={()=>setPrItems(prItems.filter((_,j)=>j!==i))}>×</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>setPrItems([...prItems,{itemId:'',itemName:'',quantity:1,unit:'Nos',rate:0,amount:0}])}>+ Add Item</button>
                <div style={{textAlign:'right',fontSize:13}}>
                  <div>Taxable: <strong>{fmt(prItems.reduce((s,i)=>s+(i.taxableAmount||(i.quantity||0)*(i.rate||0)),0))}</strong></div>
                  <div>GST: <strong style={{color:'#6366f1'}}>{fmt(prItems.reduce((s,i)=>s+(i.gstAmt||(i.taxableAmount||0)*(i.gstRate||0)/100),0))}</strong></div>
                  <div>Grand Total: <strong style={{color:'#16a34a',fontSize:15}}>{fmt(prItems.reduce((s,i)=>s+(i.amount||0),0))}</strong></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>{setModal(null);setEditReturnId(null);}}>Cancel</button>
              <button className="btn btn-primary" onClick={saveReturn}>{editReturnId?'Update':'Record'} Return</button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {modal==='grn'&&(
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:700,width:'95vw'}}>
            <div className="modal-header"><h3>{editGRNId ? "✏️ Edit GRN" : "📦 New Goods Receipt Note"}</h3><button className="modal-close" onClick={()=>{setModal(null);setEditGRNId(null);}}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Supplier *</label>
                  <select value={form.supplierId||''} onChange={e=>{const s=suppliers.find(x=>x.id===e.target.value);setForm({...form,supplierId:e.target.value,supplierName:s?.supplierName||''});}}>
                    <option value="">-- Select --</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.supplierName}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>GRN Date</label>
                  <input type="date" value={form.grnDate||today()} onChange={e=>setForm({...form,grnDate:e.target.value})}/>
                </div>
                <div className="form-group"><label>PO Reference</label>
                  <select value={form.poNumber||''} onChange={e=>setForm({...form,poNumber:e.target.value})}>
                    <option value="">-- Select PO (optional) --</option>
                    {orders.filter(o=>o.supplierId===form.supplierId).map(o=>(
                      <option key={o.id} value={o.poNumber}>{o.poNumber} — {fmt(o.grandTotal||0)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label>Received By</label>
                  <input value={form.receivedBy||''} onChange={e=>setForm({...form,receivedBy:e.target.value})} placeholder="Name"/>
                </div>
              </div>
              <div className="form-group"><label>Remarks</label>
                <input value={form.remarks||''} onChange={e=>setForm({...form,remarks:e.target.value})} placeholder="Optional"/>
              </div>
              {/* Items received */}
              <div style={{marginTop:12}}>
                <div style={{fontWeight:600,marginBottom:8,color:'#1a4f8a'}}>Items Received</div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',fontSize:12,borderCollapse:'collapse'}}>
                    <thead><tr style={{background:'#f1f5f9'}}>
                      <th style={{padding:'6px 8px',textAlign:'left'}}>Item Name</th>
                      <th style={{padding:'6px 8px',textAlign:'right'}}>Ordered Qty</th>
                      <th style={{padding:'6px 8px',textAlign:'right'}}>Received Qty</th>
                      <th style={{padding:'6px 8px',textAlign:'right'}}>Accepted Qty</th>
                      <th style={{padding:'6px 8px'}}>Unit</th>
                      <th style={{padding:'6px 4px'}}></th>
                    </tr></thead>
                    <tbody>
                      {(form.items||[{itemName:'',orderedQty:0,receivedQty:0,acceptedQty:0,unit:'Nos'}]).map((it,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                          <td style={{padding:'4px 6px'}}><input value={it.itemName||''} onChange={e=>{const rows=[...(form.items||[{itemName:'',orderedQty:0,receivedQty:0,acceptedQty:0,unit:'Nos'}])];rows[i]={...rows[i],itemName:e.target.value};setForm({...form,items:rows});}} style={{width:'100%',fontSize:12,padding:'3px 6px',border:'1px solid #e2e8f0',borderRadius:4}}/></td>
                          <td style={{padding:'4px 6px'}}><input type="number" value={it.orderedQty||0} onChange={e=>{const rows=[...(form.items||[])];rows[i]={...rows[i],orderedQty:Number(e.target.value)};setForm({...form,items:rows});}} style={{width:70,fontSize:12,padding:'3px 6px',border:'1px solid #e2e8f0',borderRadius:4,textAlign:'right'}}/></td>
                          <td style={{padding:'4px 6px'}}><input type="number" value={it.receivedQty||0} onChange={e=>{const rows=[...(form.items||[])];rows[i]={...rows[i],receivedQty:Number(e.target.value),acceptedQty:Number(e.target.value)};setForm({...form,items:rows});}} style={{width:70,fontSize:12,padding:'3px 6px',border:'1px solid #e2e8f0',borderRadius:4,textAlign:'right'}}/></td>
                          <td style={{padding:'4px 6px'}}><input type="number" value={it.acceptedQty||0} onChange={e=>{const rows=[...(form.items||[])];rows[i]={...rows[i],acceptedQty:Number(e.target.value)};setForm({...form,items:rows});}} style={{width:70,fontSize:12,padding:'3px 6px',border:'1px solid #e2e8f0',borderRadius:4,textAlign:'right'}}/></td>
                          <td style={{padding:'4px 6px'}}><input value={it.unit||'Nos'} onChange={e=>{const rows=[...(form.items||[])];rows[i]={...rows[i],unit:e.target.value};setForm({...form,items:rows});}} style={{width:55,fontSize:12,padding:'3px 4px',border:'1px solid #e2e8f0',borderRadius:4}}/></td>
                          <td style={{padding:'4px 2px'}}><button onClick={()=>{const rows=(form.items||[]).filter((_,j)=>j!==i);setForm({...form,items:rows.length?rows:[{itemName:'',orderedQty:0,receivedQty:0,acceptedQty:0,unit:'Nos'}]});}} style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:16}}>×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="btn btn-outline" style={{marginTop:6,fontSize:12}} onClick={()=>setForm({...form,items:[...(form.items||[]),{itemName:'',orderedQty:0,receivedQty:0,acceptedQty:0,unit:'Nos'}]})}>+ Add Item</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveGRN}>{editGRNId ? "💾 Update GRN" : "✅ Create GRN"}</button>
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
                <div><strong>Invoice:</strong> {payModal.invoiceNumber} | <strong>Supplier:</strong> {payModal.supplierName}</div>
                <div style={{marginTop:4}}>
                  <strong>Invoice Total:</strong> {fmt(payModal.grandTotal)} |{' '}
                  <strong>Paid:</strong> {fmt(payModal.paidAmount)} |{' '}
                  {(payModal.creditApplied||0)>0 && <><strong style={{color:'#6366f1'}}>Credit Applied: {fmt(payModal.creditApplied)}</strong> | </>}
                  <strong style={{color:'#dc2626'}}>Balance Due: {fmt(payModal.balanceDue)}</strong>
                </div>
                {(() => {
                  const supp = suppliers.find(s => s.id === payModal.supplierId);
                  return supp ? (
                    <div style={{marginTop:6,paddingTop:6,borderTop:'1px solid #c7d2fe'}}>
                      <strong style={{color:'#7c3aed'}}>Supplier Net Balance: {fmt(Math.abs(supp.currentBalance||0))} {(supp.currentBalance||0) < 0 ? '(Supplier owes you — credit)' : '(You owe supplier)'}</strong>
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="form-group"><label>Payment Amount (₹) *</label>
                <input type="number" value={payAmt}
                  max={payModal.balanceDue}
                  onChange={e=>{
                    const val=Number(e.target.value);
                    if(val > payModal.balanceDue + 0.01) {
                      setPayAmt(payModal.balanceDue);
                    } else {
                      setPayAmt(e.target.value);
                    }
                  }}
                  placeholder={`Max: ${payModal.balanceDue}`}/>
                <small style={{color:'#64748b',fontSize:11}}>Max payable: {fmt(payModal.balanceDue)}</small>
              </div>
              <div className="form-group"><label>Payment Mode</label>
                <select value={form.paymentMode||'CREDIT'} onChange={e=>setForm({...form,paymentMode:e.target.value})}>
                  <option value="CREDIT">🏷️ Credit (Pay Later)</option>
                  <option value="CASH">💵 Cash</option>
                  <option value="UPI">📱 UPI / GPay</option>
                  <option value="CHEQUE">🏦 Cheque</option>
                  <option value="NEFT">💸 NEFT / RTGS</option>
                  {bankList.map(b=><option key={b.id} value={b.bankName}>{b.bankName} {b.isDefault?'(Default)':''}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Reference No.</label>
                <input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Cheque no. / UTR no."/>
              </div>
              <div className="form-group"><label>Notes</label>
                <input value={payNotes} onChange={e=>setPayNotes(e.target.value)} placeholder="Optional"/>
              </div>
              {(payModal.paymentHistory||[]).length>0 && (
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
    </div>

    <ConfirmModal
      open={!!confirmDeleteSupp}
      title="Delete Supplier?"
      message="This will permanently delete the supplier. Cannot delete if active invoices exist."
      details={confirmDeleteSupp ? `${confirmDeleteSupp.supplierName} — ${confirmDeleteSupp.city || ''}` : ''}
      confirmLabel="Yes, Delete"
      type="danger"
      onConfirm={deleteSupp}
      onCancel={() => setConfirmDeleteSupp(null)}
    />
    <ConfirmModal
      open={!!confirmDeleteReturn} title="Delete Purchase Return?" type="danger"
      message="हा return permanently delete होईल."
      details={confirmDeleteReturn?`${confirmDeleteReturn.returnNumber||''} — ${confirmDeleteReturn.supplierName||''}`:''}
      confirmLabel="Yes, Delete" onConfirm={deleteReturn} onCancel={()=>setConfirmDeleteReturn(null)}/>

    <ConfirmModal
      open={!!confirmDeleteGRN} title="Delete GRN?" type="danger"
      message="हा GRN permanently delete होईल."
      details={confirmDeleteGRN?`${confirmDeleteGRN.grnNumber||''} — ${confirmDeleteGRN.supplierName||''}`:''}
      confirmLabel="Yes, Delete" onConfirm={deleteGRNEntry} onCancel={()=>setConfirmDeleteGRN(null)}/>

    <ConfirmModal
      open={!!confirmCancelInv}
      title="Cancel Purchase Invoice?"
      message="This will cancel the invoice and reverse all accounting entries."
      details={confirmCancelInv ? `Invoice: ${confirmCancelInv.invoiceNumber} — ₹${(confirmCancelInv.grandTotal||0).toLocaleString('en-IN')}` : ''}
      confirmLabel="Yes, Cancel Invoice"
      type="warning"
      onConfirm={cancelInv}
      onCancel={() => setConfirmCancelInv(null)}
    />
    <ConfirmModal
      open={!!confirmDeletePO}
      title="Delete Purchase Order?"
      message="हा Purchase Order permanently delete होईल."
      details={confirmDeletePO ? `PO: ${confirmDeletePO.poNumber} — ${confirmDeletePO.supplierName||''}` : ''}
      confirmLabel="Yes, Delete"
      type="danger"
      onConfirm={async()=>{
        try{ await deletePurchaseOrder(confirmDeletePO.id); toast.success('PO deleted'); setConfirmDeletePO(null); fetchAll(); }
        catch{ toast.error('Failed'); setConfirmDeletePO(null); }
      }}
      onCancel={() => setConfirmDeletePO(null)}
    />
    <ConfirmModal
      open={!!confirmApproveReturn}
      title="Approve Purchase Return?"
      message="Return approve झाल्यावर stock items supplier कडे परत जातील आणि supplier balance update होईल."
      details={confirmApproveReturn ? `Return: ${confirmApproveReturn.returnNumber} — ₹${(confirmApproveReturn.totalAmount||0).toLocaleString('en-IN')}` : ''}
      confirmLabel="✅ Yes, Approve"
      type="warning"
      onConfirm={async()=>{
        try{
          await updatePurchaseReturn(confirmApproveReturn.id,{...confirmApproveReturn,status:'APPROVED'});
          toast.success('✅ Return Approved! Stock updated.');
          setConfirmApproveReturn(null); fetchAll();
        }catch{ toast.error('Failed to approve'); setConfirmApproveReturn(null); }
      }}
      onCancel={() => setConfirmApproveReturn(null)}
    />


      {/* ══ DEBIT NOTE MODAL ══ */}
      {modal==='debitnote' && debitNoteData && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Debit Note — {debitNoteData.debitNoteNumber}</h3>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                <div><div style={{fontSize:11,color:'#94a3b8'}}>Debit Note No</div><div style={{fontWeight:700}}>{debitNoteData.debitNoteNumber}</div></div>
                <div><div style={{fontSize:11,color:'#94a3b8'}}>Against Invoice</div><div style={{fontWeight:600}}>{debitNoteData.originalInvoice}</div></div>
                <div><div style={{fontSize:11,color:'#94a3b8'}}>Supplier</div><div>{debitNoteData.supplierName}</div></div>
                <div><div style={{fontSize:11,color:'#94a3b8'}}>Reason</div><div>{debitNoteData.reason||'—'}</div></div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'#7c3aed',color:'white'}}>
                  <th style={{padding:'6px 8px'}}>#</th><th style={{padding:'6px 8px'}}>Item</th>
                  <th style={{padding:'6px 8px',textAlign:'right'}}>Qty</th>
                  <th style={{padding:'6px 8px',textAlign:'right'}}>Rate</th>
                  <th style={{padding:'6px 8px',textAlign:'right'}}>Amount</th>
                </tr></thead>
                <tbody>{(debitNoteData.items||[]).map((it,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #ede9fe'}}>
                    <td style={{padding:'5px 8px',color:'#94a3b8'}}>{i+1}</td>
                    <td style={{padding:'5px 8px',fontWeight:600}}>{it.itemName}</td>
                    <td style={{padding:'5px 8px',textAlign:'right'}}>{it.quantity}</td>
                    <td style={{padding:'5px 8px',textAlign:'right'}}>₹{it.rate||it.purchaseRate||0}</td>
                    <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700}}>₹{(it.totalAmount||it.amount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{textAlign:'right',marginTop:12,fontWeight:700,fontSize:15,color:'#7c3aed'}}>
                Total: ₹{(debitNoteData.grandTotal||0).toLocaleString('en-IN',{maximumFractionDigits:0})}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Close</button>
              <button className="btn btn-primary" style={{background:'#7c3aed',border:'none'}} onClick={()=>printDebitNote(debitNoteData)}>🖨️ Print Debit Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SUPPLIER STATEMENT MODAL ══ */}
      {modal==='suppstmt' && supplierStmt && stmtSupplier && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Supplier Statement — {stmtSupplier.supplierName}</h3>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                {[
                  {label:'Total Purchase',value:supplierStmt.totalPurchase,color:'#7c3aed'},
                  {label:'Total Paid',    value:supplierStmt.totalPaid,    color:'#16a34a'},
                  {label:'Balance Due',   value:supplierStmt.balance,       color:(supplierStmt.balance||0)>0?'#dc2626':'#16a34a'},
                ].map(s=>(
                  <div key={s.label} style={{background:s.color+'10',border:`1px solid ${s.color}25`,borderRadius:8,padding:'12px',textAlign:'center'}}>
                    <div style={{fontSize:10,color:'#64748b',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>{s.label}</div>
                    <div style={{fontSize:16,fontWeight:900,color:s.color}}>₹{(Number(s.value)||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</div>
                  </div>
                ))}
              </div>
              <div style={{maxHeight:320,overflowY:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:'#1a4f8a',color:'white',position:'sticky',top:0}}>
                    <th style={{padding:'6px 8px'}}>Date</th><th style={{padding:'6px 8px'}}>Reference</th>
                    <th style={{padding:'6px 8px',textAlign:'right'}}>Amount</th>
                    <th style={{padding:'6px 8px',textAlign:'right'}}>Paid</th>
                    <th style={{padding:'6px 8px',textAlign:'center'}}>Status</th>
                  </tr></thead>
                  <tbody>{(supplierStmt.transactions||[]).map((t,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i===0?'#f8fafc':''}}>
                      <td style={{padding:'5px 8px',fontSize:11}}>{t.date||'Opening'}</td>
                      <td style={{padding:'5px 8px',fontWeight:t.type==='OPENING_BALANCE'?400:600,color:t.type==='OPENING_BALANCE'?'#64748b':'#1a2744'}}>{t.reference}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',fontWeight:600}}>₹{(Number(t.credit)||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#16a34a'}}>₹{(Number(t.paid)||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                      <td style={{padding:'5px 8px',textAlign:'center'}}>
                        {t.status && <span style={{background:t.status==='PAID'?'#dcfce7':t.status==='PARTIAL'?'#fef9c3':'#fee2e2',color:t.status==='PAID'?'#16a34a':t.status==='PARTIAL'?'#b45309':'#dc2626',padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700}}>{t.status}</span>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
