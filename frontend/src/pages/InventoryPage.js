import React, { useState, useEffect, useRef } from 'react';
import {
  getItems, addItem, updateItem, deleteItem as deleteItemAPI,
  getCategories, addCategory, updateCategory, deleteCategory,
  getWarehouses, addWarehouse, updateWarehouse, deleteWarehouse,
  getLowStockItems,
  getItemBarcode, updateItemBarcode,
  getItemBatches, addItemBatch,
  getItemPriceLists, updateItemPriceLists,
  updateItemImage, deleteItemImage,
  getExpiringSoon, adjustItemStock,
  suggestHsn
} from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import HsnAutoComplete from '../components/HsnAutoComplete';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => (Number(n)||0).toLocaleString('en-IN');

const UNITS = ['Nos','Pcs','Box','Kg','Gram','Litre','ML','Meter','Feet','Inch','Dozen','Pack','Set','Pair','Roll','Sheet','Bag','Bottle','Can','Carton','Strip','Tablet','Capsule','Tube','Sachet'];
const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];
const BARCODE_TYPES = ['CODE128','EAN13','QR','CODE39','UPC'];

export default function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN';

  // ── Core State ──
  const [tab, setTab]           = useState('items');
  const [variantItem, setVariantItem]   = useState(null);   // item selected for variants
  const [variantForm, setVariantForm]   = useState({});
  const [variantModal, setVariantModal] = useState(false);
  const [transferForm, setTransferForm] = useState({items:[{itemId:'',itemName:'',quantity:1,unit:'Pcs'}]});
  const [transfers,    setTransfers]    = useState([]);
  const [transferModal,setTransferModal]= useState(false);
  const [scanResult,  setScanResult]  = useState(null);
  const [scanMode,    setScanMode]    = useState(false);
  const [items, setItems]       = useState([]);
  const [categories, setCats]   = useState([]);
  const [warehouses, setWH]     = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading]   = useState(false);

  // ── Item Form ──
  const [showModal, setShowModal]   = useState(null);
  const [form, setForm]             = useState({unit:'Nos',gstRate:18,reorderLevel:10});
  const [activeFormTab, setActiveFormTab] = useState('basic');

  // ── Confirm Modals ──
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [confirmDeleteCat,  setConfirmDeleteCat]  = useState(null);
  const [confirmDeleteWH,   setConfirmDeleteWH]   = useState(null);

  // ── Search / Filter ──
  const [itemSearch,      setItemSearch]      = useState('');
  const [itemCatFilter,   setItemCatFilter]   = useState('');
  const [itemStatusFilter,setItemStatusFilter]= useState('');

  // ── Category / Warehouse ──
  const [catForm,   setCatForm]   = useState({});
  const [editCat,   setEditCat]   = useState(null);
  const [whForm,    setWhForm]    = useState({});
  const [editWhId,  setEditWhId]  = useState(null);

  // ── Barcode Modal ──
  const [barcodeModal, setBarcodeModal] = useState(null);
  const [barcodeData,  setBarcodeData]  = useState(null);

  // ── Batch Modal ──
  const [batchModal,   setBatchModal]   = useState(null);
  const [batchData,    setBatchData]    = useState(null);
  const [batchForm,    setBatchForm]    = useState({});

  // ── Price List Modal ──
  const [priceModal,   setPriceModal]   = useState(null);
  const [priceData,    setPriceData]    = useState(null);
  const [priceForm,    setPriceForm]    = useState([]);

  // ── Image ──
  const imageInputRef = useRef(null);

  // ─────────────── LOAD ───────────────
  const load = async () => {
    setLoading(true);
    try {
      const [iR, cR, wR, lR] = await Promise.all([
        getItems(), getCategories(), getWarehouses(), getLowStockItems()
      ]);
      setItems(iR.data||[]);
      setCats(cR.data||[]);
      setWH(wR.data||[]);
      setLowStock(lR.data||[]);
    } catch { toast.error('Failed to load inventory'); }
    setLoading(false);
  };

  const loadExpiring = async () => {
    try { const r = await getExpiringSoon(60); setExpiring(r.data||[]); }
    catch { /* silent */ }
  };

  React.useEffect(() => {
    load();
    loadExpiring();
  }, []);

  // ─────────────── HSN AUTO-SUGGEST FROM BACKEND ───────────────
  const hsnTimeoutRef = useRef(null);
  const handleItemNameChange = (e) => {
    const name = e.target.value;
    setForm({...form, itemName: name});

    // Clear previous timeout
    if (hsnTimeoutRef.current) clearTimeout(hsnTimeoutRef.current);

    // Debounce backend call
    if (name.trim().length >= 3) {
      hsnTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await suggestHsn(name);
          if (response.data && response.data.hsnCode) {
            setForm(f => ({
              ...f,
              hsnCode: response.data.hsnCode,
              gstRate: response.data.gstRate,
              hsnDescription: response.data.description
            }));
          }
        } catch (err) {
          // Silent fail - user can manually enter
        }
      }, 500);
    }
  };

  // ─────────────── ITEMS CRUD ───────────────
  const saveItem = async () => {
    const name = form.itemName?.trim();
    // ── Required ──
    if (!name)          { toast.error('Item name required aahe!'); return; }
    if (!form.unit?.trim()) { toast.error('Unit required aahe! (Nos/Pcs/Kg/Mtr etc.)'); return; }

    // ── Rates ──
    const pr = Number(form.purchaseRate);
    const sr = Number(form.salesRate);
    if (isNaN(pr) || pr < 0) { toast.error('Purchase rate 0 ya jada hava!'); return; }
    if (isNaN(sr) || sr < 0) { toast.error('Sales rate 0 ya jada hava!'); return; }
    if (sr > 0 && pr > 0 && sr < pr * 0.5) {
      toast.error('⚠️ Sale rate purchase rate peksha 50% peksha kami aahe! Check kara.');
      // Don't block — just warn. Continue.
    }

    // ── GST Rate: must be valid ──
    const validGST = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];
    const gstRate = Number(form.gstRate);
    if (!validGST.includes(gstRate)) {
      toast.error('GST rate invalid! Valid: 0,0.1,0.25,1,1.5,3,5,6,7.5,12,18,28%. Got: '+gstRate); return;
    }

    // ── HSN code: must be 4 or 8 digits if given ──
    if (form.hsnCode?.trim()) {
      const hsn = form.hsnCode.trim();
      if (!/^\d{4}(\d{4})?$/.test(hsn)) {
        toast.error('HSN code 4 ya 8 digits cha hava! Got: '+hsn); return;
      }
    }

    // ── Normalize name ──
    const normN = s => s?.toLowerCase().trim().replace(/\s+/g, ' ') || '';

    // ── Duplicate item name check (add + edit) ──
    const dupItem = items.find(i =>
      normN(i.itemName) === normN(name) &&
      i.active !== false &&
      i.id !== form.id  // exclude self on edit
    );
    if (dupItem) { toast.error('Item "'+name+'" already exists! Duplicate nahi chalnar.'); return; }

    // ── Reorder level >= 0 ──
    if (form.reorderLevel !== undefined && Number(form.reorderLevel) < 0) {
      toast.error('Reorder level 0 ya jada hava!'); return;
    }

    try {
      const payload = {...form, itemName: name};
      if (form.id) await updateItem(form.id, payload);
      else         await addItem(payload);
      toast.success(form.id ? '✅ Item updated!' : '✅ Item added!');
      setShowModal(null); setForm({unit:'Nos',gstRate:18,reorderLevel:10});
      load();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed to save item'); }
  };

  const deleteItem = async () => {
    try {
      await deleteItemAPI(confirmDeleteItem.id);
      toast.success('Item deleted');
      setConfirmDeleteItem(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Cannot delete item'); }
  };

  // ─────────────── IMAGE ───────────────
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { toast.error('Image too large. Max 500KB.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setForm(f => ({...f, imageBase64: base64, imageMimeType: file.type, _imagePreview: ev.target.result}));
    };
    reader.readAsDataURL(file);
  };

  const saveItemImage = async (itemId) => {
    if (!form.imageBase64) return;
    try {
      await updateItemImage(itemId, {imageBase64: form.imageBase64, mimeType: form.imageMimeType});
      toast.success('Image saved');
      load();
    } catch(e) { toast.error(e.response?.data?.error || 'Image save failed'); }
  };

  const removeImage = async (itemId) => {
    try {
      await deleteItemImage(itemId);
      setForm(f => ({...f, imageBase64: null, imageMimeType: null, _imagePreview: null}));
      toast.success('Image removed'); load();
    } catch { toast.error('Failed to remove image'); }
  };

  // ─────────────── BARCODE ───────────────
  const openBarcodeModal = async (item) => {
    setBarcodeModal(item);
    try {
      const r = await getItemBarcode(item.id);
      setBarcodeData(r.data);
    } catch { toast.error('Failed to load barcode'); }
  };

  const printBarcode = () => {
    if (!barcodeData) return;
    const w = window.open('', '_blank', 'width=400,height=300');
    w.document.write(`<!DOCTYPE html><html><head><title>Barcode</title>
    <style>
      body{font-family:Arial;text-align:center;padding:20px;background:#fff;}
      .barcode-box{border:2px solid #1a4f8a;border-radius:8px;padding:16px 24px;display:inline-block;}
      .item-name{font-weight:700;font-size:14px;color:#1a2744;margin-bottom:4px;}
      .barcode-num{font-size:12px;color:#64748b;letter-spacing:3px;font-family:monospace;margin:8px 0;}
      .price{font-size:16px;font-weight:900;color:#16a34a;}
      .hsn{font-size:10px;color:#94a3b8;margin-top:4px;}
      @media print{body{padding:0;}button{display:none;}}
    </style></head><body>
    <div class="barcode-box">
      <div class="item-name">${barcodeData.itemName}</div>
      <div class="barcode-num">${barcodeData.barcode}</div>
      <svg id="bc" style="display:block;margin:8px auto;max-width:220px;height:60px;"></svg>
      <div class="price">MRP: ₹${barcodeData.salesRate}</div>
      ${barcodeData.hsnCode ? `<div class="hsn">HSN: ${barcodeData.hsnCode}</div>` : ''}
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">SKU: ${barcodeData.itemCode||''}</div>
    </div>
    <br><button onclick="window.print()" style="margin-top:12px;padding:8px 20px;background:#1a4f8a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">🖨️ Print</button>
    <script>
    // Simple barcode bars renderer for CODE128-like display
    (function(){
      var svg=document.getElementById('bc');
      var code='${barcodeData.barcode}';
      var w=220,h=60,barW=2.2;
      var bars=code.split('').map((c,i)=>i%2===0?1:0);
      var x=4;
      svg.setAttribute('viewBox','0 0 '+w+' '+h);
      for(var i=0;i<code.length*2.2+8;i++){
        var rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
        rect.setAttribute('x',x);rect.setAttribute('y',4);
        rect.setAttribute('width',barW);rect.setAttribute('height',h-8);
        rect.setAttribute('fill',i%2===0?'#000':'#fff');
        svg.appendChild(rect); x+=barW;
      }
    })();
    </script>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const regenerateBarcode = async (item) => {
    try {
      await updateItemBarcode(item.id, {barcodeType: barcodeData?.barcodeType || 'CODE128'});
      const r = await getItemBarcode(item.id);
      setBarcodeData(r.data);
      toast.success('Barcode regenerated');
      load();
    } catch { toast.error('Failed to regenerate barcode'); }
  };

  // ─────────────── BATCH ───────────────
  const openBatchModal = async (item) => {
    setBatchModal(item);
    try {
      const r = await getItemBatches(item.id);
      setBatchData(r.data);
    } catch { toast.error('Failed to load batches'); }
  };

  const saveBatch = async () => {
    if (!batchForm.batchNumber?.trim()) { toast.error('Batch number required'); return; }
    if (!batchForm.quantity || Number(batchForm.quantity) <= 0) { toast.error('Quantity required'); return; }
    try {
      await addItemBatch(batchModal.id, {
        ...batchForm,
        quantity: Number(batchForm.quantity),
        purchaseRate: Number(batchForm.purchaseRate||0)
      });
      toast.success('Batch added!');
      setBatchForm({});
      const r = await getItemBatches(batchModal.id);
      setBatchData(r.data);
      load();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed to add batch'); }
  };

  // ─────────────── PRICE LIST ───────────────
  const openPriceModal = async (item) => {
    setPriceModal(item);
    try {
      const r = await getItemPriceLists(item.id);
      setPriceData(r.data);
      setPriceForm(r.data?.priceLists || []);
    } catch { toast.error('Failed to load price lists'); }
  };

  const savePriceLists = async () => {
    try {
      await updateItemPriceLists(priceModal.id, priceForm);
      toast.success('Price lists saved!');
      setPriceModal(null); setPriceForm([]); load();
    } catch { toast.error('Failed to save price lists'); }
  };

  // ─────────────── CATEGORY ───────────────
  const saveCat = async () => {
    if (!catForm.categoryName?.trim()) { toast.error('Category name required'); return; }
    try {
      if (editCat) await updateCategory(editCat.id, catForm);
      else         await addCategory(catForm);
      toast.success(editCat ? 'Category updated' : 'Category added');
      setShowModal(null); setCatForm({}); setEditCat(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed to save category'); }
  };

  const deleteCat = async () => {
    try {
      await deleteCategory(confirmDeleteCat.id);
      toast.success('Category deleted');
      setConfirmDeleteCat(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Cannot delete — items may be using this category'); }
  };

  // ─────────────── WAREHOUSE ───────────────
  const saveWH = async () => {
    if (!whForm.warehouseName?.trim()) { toast.error('Warehouse name required'); return; }
    try {
      if (editWhId) await updateWarehouse(editWhId, whForm);
      else          await addWarehouse(whForm);
      toast.success(editWhId ? 'Warehouse updated' : 'Warehouse added');
      setShowModal(null); setWhForm({}); setEditWhId(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed to save warehouse'); }
  };

  const deleteWH = async () => {
    try {
      await deleteWarehouse(confirmDeleteWH.id);
      toast.success('Warehouse deleted');
      setConfirmDeleteWH(null); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Cannot delete'); }
  };

  // ─────────────── STATS ───────────────
  const totalValue   = items.reduce((s,i) => s + (i.currentStock||0)*(i.purchaseRate||0), 0);
  const totalItems   = items.length;
  const lowStockCnt  = lowStock.length;
  const outOfStockCnt= items.filter(i=>i.currentStock<=0).length;
  const expiredCnt   = expiring.filter(e=>e.expired).length;
  const expiringSoonCnt = expiring.filter(e=>!e.expired).length;

  const filteredItems = items.filter(i => {
    if (itemCatFilter && (i.categoryName||'') !== itemCatFilter) return false;
    if (itemStatusFilter === 'out'  && i.currentStock > 0)                                      return false;
    if (itemStatusFilter === 'low'  && !(i.currentStock > 0 && i.currentStock <= i.reorderLevel)) return false;
    if (itemStatusFilter === 'instock' && i.currentStock <= i.reorderLevel)                      return false;
    if (itemSearch) {
      const s = itemSearch.toLowerCase();
      return (i.itemName||'').toLowerCase().includes(s)
          || (i.itemCode||'').toLowerCase().includes(s)
          || (i.hsnCode||'').toLowerCase().includes(s)
          || (i.barcode||'').toLowerCase().includes(s);
    }
    return true;
  });

  const TABS = [
    {key:'items',      label:'📦 Items'},
    {key:'categories', label:'🗂️ Categories'},
    {key:'warehouses', label:'🏭 Warehouses'},
    {key:'lowstock',   label:`⚠️ Low Stock (${lowStockCnt})`},
    {key:'expiry',     label:`📅 Expiry (${expiredCnt+expiringSoonCnt})`},
    {key:'variants',   label:'🎨 Variants'},
    {key:'transfer',   label:'🔄 Stock Transfer'},
    {key:'scanner',    label:'📷 Barcode Scanner'},
  ];

  return (
    <>
    <div>
      {/* ── STAT CARDS ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16}}>
        {[
          ['Total Items',    totalItems,        '#2563eb','📦'],
          ['Stock Value',    fmt(totalValue),   '#16a34a','💰',true],
          ['Low Stock',      lowStockCnt,       '#d97706','⚠️'],
          ['Out of Stock',   outOfStockCnt,     '#dc2626','🔴'],
          ['Expiring Soon',  expiringSoonCnt+expiredCnt,'#7c3aed','📅'],
        ].map(([l,v,c,ic,isAmt])=>(
          <div key={l} style={{background:'white',border:`1px solid ${c}20`,borderTop:`4px solid ${c}`,borderRadius:10,padding:'12px 14px',boxShadow:'0 2px 6px rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
            <div style={{fontSize:10,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>{l}</div>
            <div style={{fontWeight:800,color:c,fontSize:18}}>{isAmt ? v : fmtN(v)}</div>
          </div>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{display:'flex',gap:0,marginBottom:16,borderBottom:'2px solid #e2e8f0'}}>
        {TABS.map(({key,label})=>(
          <div key={key} className={`tab ${tab===key?'active':''}`} onClick={()=>setTab(key)}
            style={{padding:'8px 16px',cursor:'pointer',fontSize:13,fontWeight:tab===key?700:500,
              color:tab===key?'#1a4f8a':'#64748b',borderBottom:tab===key?'2px solid #1a4f8a':'2px solid transparent',
              marginBottom:-2,whiteSpace:'nowrap'}}>
            {label}
          </div>
        ))}
      </div>

      {/* ══════════════ ITEMS TAB ══════════════ */}
      {tab==='items' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📦 Item / Product Master</span>
            <div style={{display:'flex',gap:6}}>
              <button className="btn btn-outline" style={{fontSize:12}}
                onClick={()=>{setItemSearch('');setItemCatFilter('');setItemStatusFilter('');}}>
                ✕ Clear Filter
              </button>
              <button className="btn btn-primary" onClick={()=>{
                setForm({unit:'Nos',gstRate:18,reorderLevel:10});
                setActiveFormTab('basic');
                setShowModal('item');
              }}>+ Add Item</button>
            </div>
          </div>
          <div className="card-body">
            {/* Filters */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'center'}}>
              <input placeholder="🔍 Search name, code, HSN, barcode..."
                value={itemSearch} onChange={e=>setItemSearch(e.target.value)}
                style={{height:32,fontSize:12,minWidth:240,padding:'0 10px',border:'1.5px solid #e2e8f0',borderRadius:6,outline:'none'}}
                onFocus={e=>e.target.style.borderColor='#2563eb'}
                onBlur={e=>e.target.style.borderColor='#e2e8f0'} />
              <select value={itemCatFilter} onChange={e=>setItemCatFilter(e.target.value)}
                style={{height:32,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Categories</option>
                {categories.map(c=><option key={c.id} value={c.categoryName}>{c.categoryName}</option>)}
              </select>
              <select value={itemStatusFilter} onChange={e=>setItemStatusFilter(e.target.value)}
                style={{height:32,fontSize:12,borderRadius:6,border:'1px solid #d1d5db',padding:'0 8px'}}>
                <option value="">All Status</option>
                <option value="instock">🟢 In Stock</option>
                <option value="low">🟡 Low Stock</option>
                <option value="out">🔴 Out of Stock</option>
              </select>
              <span style={{fontSize:12,color:'#94a3b8',marginLeft:'auto'}}>
                {filteredItems.length} items
              </span>
            </div>

            {loading ? (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:32}}>⏳</div><div style={{marginTop:8}}>Loading...</div>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{width:50}}>#</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Unit</th>
                      <th>HSN</th>
                      <th className="text-right">Purchase ₹</th>
                      <th className="text-right">Sales ₹</th>
                      <th className="text-right">MRP ₹</th>
                      <th className="text-right">Stock</th>
                      <th>Status</th>
                      <th style={{minWidth:200}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((i,idx)=>{
                      const isLow = i.currentStock > 0 && i.currentStock <= i.reorderLevel;
                      const isOut = i.currentStock <= 0;
                      return (
                        <tr key={i.id}>
                          <td style={{fontSize:11,color:'#94a3b8'}}>{idx+1}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              {i.imageBase64 ? (
                                <img src={`data:${i.imageMimeType||'image/jpeg'};base64,${i.imageBase64}`}
                                  alt="" style={{width:32,height:32,objectFit:'cover',borderRadius:4,border:'1px solid #e2e8f0'}}/>
                              ) : (
                                <div style={{width:32,height:32,background:'#f1f5f9',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,border:'1px solid #e2e8f0'}}>📦</div>
                              )}
                              <div>
                                <div style={{fontWeight:600,fontSize:13}}>{i.itemName}</div>
                                <div style={{fontSize:10,color:'#94a3b8'}}>{i.itemCode}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:12}}>{i.categoryName||'—'}</td>
                          <td style={{fontSize:12}}>{i.unit}</td>
                          <td style={{fontSize:11,color:'#64748b'}}>{i.hsnCode||'—'}</td>
                          <td className="text-right" style={{fontSize:12}}>{fmt(i.purchaseRate)}</td>
                          <td className="text-right" style={{fontSize:12}}>{fmt(i.salesRate)}</td>
                          <td className="text-right" style={{fontSize:12,color:'#64748b'}}>{fmt(i.mrp)}</td>
                          <td className="text-right">
                            <span style={{fontWeight:700,color:isOut?'#dc2626':isLow?'#d97706':'#059669',fontSize:13}}>
                              {i.currentStock} {i.unit}
                            </span>
                            {isLow && <div style={{fontSize:10,color:'#d97706'}}>⚠️ Low</div>}
                            {isOut && <div style={{fontSize:10,color:'#dc2626'}}>🔴 Out</div>}
                          </td>
                          <td>
                            <span className={`badge ${i.active?'badge-success':'badge-danger'}`}>
                              {i.active?'Active':'Inactive'}
                            </span>
                            {i.batchTracking && <div style={{fontSize:10,color:'#7c3aed',marginTop:2}}>🔖 Batch</div>}
                          </td>
                          <td>
                            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#2563eb',color:'#2563eb'}}
                                onClick={()=>{
                                  setForm({...i,openingStock:i.currentStock,_imagePreview:i.imageBase64?`data:${i.imageMimeType||'image/jpeg'};base64,${i.imageBase64}`:null});
                                  setActiveFormTab('basic');
                                  setShowModal('item');
                                }}>✏️ Edit</button>
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#7c3aed',color:'#7c3aed'}}
                                onClick={()=>openBarcodeModal(i)}>🔖 Barcode</button>
                              <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#059669',color:'#059669'}}
                                onClick={()=>openPriceModal(i)}>💲 Price</button>
                              {i.batchTracking && (
                                <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#d97706',color:'#d97706'}}
                                  onClick={()=>openBatchModal(i)}>📋 Batch</button>
                              )}
                              {isAdmin && (
                                <button className="btn btn-outline" style={{padding:'3px 7px',fontSize:10,borderColor:'#dc2626',color:'#dc2626',opacity:i.currentStock===0?1:0.5,cursor:i.currentStock===0?'pointer':'not-allowed'}}
                                  onClick={()=>{
                                    if(i.currentStock===0) setConfirmDeleteItem(i);
                                    else toast.error('⚠️ Stock 0 nahi aahe! Item delete karaycha asel tar adhi stock 0 kara.');
                                  }}>🗑️</button>
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
                <div style={{fontSize:40,marginBottom:12}}>📦</div>
                <div style={{fontWeight:600}}>No items found</div>
                <div style={{fontSize:12,marginTop:4}}>
                  {itemSearch||itemCatFilter||itemStatusFilter ? 'Try clearing filters' : 'Click "+ Add Item" to start'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ CATEGORIES ══════════════ */}
      {tab==='categories' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🗂️ Item Categories</span>
            <button className="btn btn-primary" onClick={()=>{setCatForm({});setEditCat(null);setShowModal('cat');}}>+ Add Category</button>
          </div>
          <div className="card-body">
            {categories.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>#</th><th>Category Name</th><th>Description</th><th className="text-right">Items</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {categories.map((c,i)=>(
                      <tr key={c.id}>
                        <td style={{color:'#94a3b8',fontSize:12}}>{i+1}</td>
                        <td><strong>{c.categoryName}</strong></td>
                        <td style={{fontSize:12,color:'#64748b'}}>{c.description||'—'}</td>
                        <td className="text-right">{items.filter(it=>it.categoryId===c.id).length}</td>
                        <td><span className={`badge ${c.active?'badge-success':'badge-danger'}`}>{c.active?'Active':'Inactive'}</span></td>
                        <td style={{display:'flex',gap:4}}>
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                            onClick={()=>{setEditCat(c);setCatForm({categoryName:c.categoryName,description:c.description||''});setShowModal('cat');}}>✏️ Edit</button>
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,borderColor:'#dc2626',color:'#dc2626'}}
                            onClick={()=>setConfirmDeleteCat(c)}>🗑️ Del</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>🗂️</div>
                <div>No categories yet. Click "+ Add Category" to start.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ WAREHOUSES ══════════════ */}
      {tab==='warehouses' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏭 Warehouses / Storage</span>
            <button className="btn btn-primary" onClick={()=>{setWhForm({});setEditWhId(null);setShowModal('wh');}}>+ Add Warehouse</button>
          </div>
          <div className="card-body">
            {warehouses.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>#</th><th>Warehouse Name</th><th>Address</th><th>City</th><th>Contact</th><th>Phone</th><th>Actions</th></tr></thead>
                  <tbody>
                    {warehouses.map((w,i)=>(
                      <tr key={w.id}>
                        <td style={{color:'#94a3b8',fontSize:12}}>{i+1}</td>
                        <td><strong>{w.warehouseName}</strong></td>
                        <td style={{fontSize:12,color:'#64748b'}}>{w.address||'—'}</td>
                        <td style={{fontSize:12}}>{w.city||'—'}</td>
                        <td style={{fontSize:12}}>{w.contactPerson||'—'}</td>
                        <td style={{fontSize:12}}>{w.phone||'—'}</td>
                        <td style={{display:'flex',gap:4}}>
                          <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11}}
                            onClick={()=>{setEditWhId(w.id);setWhForm({...w});setShowModal('wh');}}>✏️ Edit</button>
                          {isAdmin && <button className="btn btn-outline" style={{padding:'3px 8px',fontSize:11,borderColor:'#dc2626',color:'#dc2626'}}
                            onClick={()=>setConfirmDeleteWH(w)}>🗑️ Del</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>🏭</div>
                <div>No warehouses yet.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ LOW STOCK ══════════════ */}
      {tab==='lowstock' && (
        <div className="card">
          <div className="card-header"><span className="card-title">⚠️ Low Stock Alert</span></div>
          <div className="card-body">
            {lowStock.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>#</th><th>Item</th><th>Category</th><th className="text-right">Current Stock</th><th className="text-right">Reorder Level</th><th>Unit</th><th className="text-right">Purchase ₹</th><th>Status</th></tr></thead>
                  <tbody>
                    {lowStock.map((i,idx)=>(
                      <tr key={i.id} style={{background: i.currentStock<=0?'#fff1f2':'#fffbeb'}}>
                        <td style={{fontSize:11,color:'#94a3b8'}}>{idx+1}</td>
                        <td><strong>{i.itemName}</strong><div style={{fontSize:10,color:'#94a3b8'}}>{i.itemCode}</div></td>
                        <td style={{fontSize:12}}>{i.categoryName||'—'}</td>
                        <td className="text-right">
                          <span style={{fontWeight:700,color:i.currentStock<=0?'#dc2626':'#d97706',fontSize:14}}>
                            {i.currentStock}
                          </span>
                        </td>
                        <td className="text-right" style={{fontSize:12,color:'#64748b'}}>{i.reorderLevel}</td>
                        <td style={{fontSize:12}}>{i.unit}</td>
                        <td className="text-right" style={{fontSize:12}}>{fmt(i.purchaseRate)}</td>
                        <td>
                          <span style={{background:i.currentStock<=0?'#fee2e2':'#fef9c3',color:i.currentStock<=0?'#dc2626':'#92400e',padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700}}>
                            {i.currentStock<=0?'🔴 Out of Stock':'⚠️ Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{color:'#16a34a',fontWeight:600}}>All items are well-stocked!</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ EXPIRY TAB ══════════════ */}
      {tab==='expiry' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📅 Batch / Expiry Tracking</span>
            <button className="btn btn-outline" style={{fontSize:12}} onClick={loadExpiring}>🔄 Refresh</button>
          </div>
          <div className="card-body">
            {expiring.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr><th>#</th><th>Item</th><th>Batch No.</th><th className="text-right">Qty</th><th>Expiry Date</th><th className="text-right">Days Left</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {expiring.map((e,i)=>(
                      <tr key={i} style={{background:e.expired?'#fff1f2':e.daysLeft<=7?'#fffbeb':'white'}}>
                        <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                        <td><strong>{e.itemName}</strong><div style={{fontSize:10,color:'#94a3b8'}}>{e.itemCode}</div></td>
                        <td style={{fontFamily:'monospace',fontSize:12}}>{e.batchNumber}</td>
                        <td className="text-right" style={{fontWeight:700}}>{e.quantity}</td>
                        <td style={{fontSize:12}}>{e.expiryDate}</td>
                        <td className="text-right">
                          <span style={{fontWeight:700,color:e.expired?'#dc2626':e.daysLeft<=7?'#d97706':'#16a34a',fontSize:13}}>
                            {e.expired ? '—' : e.daysLeft + 'd'}
                          </span>
                        </td>
                        <td>
                          <span style={{background:e.expired?'#fee2e2':e.daysLeft<=7?'#fef9c3':'#d1fae5',color:e.expired?'#dc2626':e.daysLeft<=7?'#92400e':'#065f46',padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700}}>
                            {e.expired?'🔴 Expired':e.daysLeft<=7?'⚠️ Critical':'📅 Expiring Soon'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <div style={{fontWeight:600,color:'#16a34a'}}>No items expiring in next 60 days!</div>
                <div style={{fontSize:12,marginTop:4}}>Enable batch tracking on items to track expiry dates.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ═════════ ADD / EDIT ITEM MODAL ═════════ */}
    {showModal==='item' && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:700,maxHeight:'90vh',overflowY:'auto'}}>
          <div className="modal-header">
            <h3 style={{margin:0}}>{form.id?'✏️ Edit Item':'➕ Add New Item'}</h3>
            <button className="modal-close" onClick={()=>setShowModal(null)}>×</button>
          </div>

          {/* Form Tabs */}
          <div style={{display:'flex',gap:0,borderBottom:'2px solid #e2e8f0',padding:'0 20px',background:'#f8fafc'}}>
            {[['basic','📋 Basic'],['pricing','💲 Pricing'],['stock','📦 Stock'],['image','🖼️ Image'],['advanced','⚙️ Advanced']].map(([k,l])=>(
              <div key={k} onClick={()=>setActiveFormTab(k)}
                style={{padding:'8px 12px',cursor:'pointer',fontSize:12,fontWeight:activeFormTab===k?700:500,
                  color:activeFormTab===k?'#1a4f8a':'#64748b',
                  borderBottom:activeFormTab===k?'2px solid #1a4f8a':'2px solid transparent',
                  marginBottom:-2,whiteSpace:'nowrap'}}>
                {l}
              </div>
            ))}
          </div>

          <div className="modal-body">
            {/* ── BASIC TAB ── */}
            {activeFormTab==='basic' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Item Code / SKU</label>
                  <input value={form.itemCode||''} readOnly placeholder="Auto-generated on save"
                    style={{background:'#f8fafc',color:'#64748b',cursor:'not-allowed'}}/>
                </div>
                <div className="form-group">
                  <label>Item Name <span style={{color:'#dc2626'}}>*</span></label>
                  <input value={form.itemName||''} onChange={handleItemNameChange}
                    placeholder="Enter item name"/>
                </div>
                <div className="form-group">
                  <label>HSN Code <span style={{fontSize:10,color:'#94a3b8'}}>(8-digit auto-suggest)</span></label>
                  <HsnAutoComplete
                    value={form.hsnCode}
                    onChange={(hsnCode) => setForm({...form, hsnCode})}
                    onGstRateChange={(gstRate) => setForm({...form, gstRate})}
                    placeholder="Type item name to search HSN..."
                    showGstRate={true}
                  />
                  <div style={{fontSize:10,color:'#64748b',marginTop:4}}>
                    💡 Item name type करा - exact 8-digit HSN code auto-fill होईल
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.categoryId||''} onChange={e=>{
                    const c = categories.find(c=>c.id===e.target.value);
                    setForm({...form,categoryId:e.target.value,categoryName:c?.categoryName||''});
                  }}>
                    <option value="">-- Select Category --</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.categoryName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unit</label>
                  <select value={form.unit||'Nos'} onChange={e=>setForm({...form,unit:e.target.value})}>
                    {UNITS.map(u=><option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>GST Rate (%)</label>
                  <select value={form.gstRate||18} onChange={e=>setForm({...form,gstRate:Number(e.target.value)})}>
                    {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Description</label>
                  <textarea value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}
                    rows={2} style={{resize:'vertical',fontSize:12}}
                    placeholder="Optional item description..."/>
                </div>
              </div>
            )}

            {/* ── PRICING TAB ── */}
            {activeFormTab==='pricing' && (
              <div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Purchase Rate (₹) <span style={{color:'#dc2626'}}>*</span></label>
                    <input type="number" min="0" step="0.01" value={form.purchaseRate||''}
                      onChange={e=>setForm({...form,purchaseRate:Number(e.target.value)})}
                      placeholder="0.00"/>
                  </div>
                  <div className="form-group">
                    <label>Sales Rate (₹) <span style={{color:'#dc2626'}}>*</span></label>
                    <input type="number" min="0" step="0.01" value={form.salesRate||''}
                      onChange={e=>setForm({...form,salesRate:Number(e.target.value)})}
                      placeholder="0.00"/>
                  </div>
                  <div className="form-group">
                    <label>MRP (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.mrp||''}
                      onChange={e=>setForm({...form,mrp:Number(e.target.value)})}
                      placeholder="0.00"/>
                  </div>
                </div>
                {/* Margin Display */}
                {form.purchaseRate > 0 && form.salesRate > 0 && (
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 14px',marginTop:12}}>
                    <div style={{fontSize:12,color:'#166534',fontWeight:600}}>💡 Margin Analysis</div>
                    <div style={{display:'flex',gap:24,marginTop:6,fontSize:12}}>
                      <div>Profit: <strong style={{color:'#16a34a'}}>₹{(form.salesRate - form.purchaseRate).toFixed(2)}</strong></div>
                      <div>Margin: <strong style={{color:'#16a34a'}}>{(((form.salesRate-form.purchaseRate)/form.salesRate)*100).toFixed(1)}%</strong></div>
                      <div>Markup: <strong style={{color:'#2563eb'}}>{(((form.salesRate-form.purchaseRate)/form.purchaseRate)*100).toFixed(1)}%</strong></div>
                    </div>
                  </div>
                )}
                <div style={{marginTop:16}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>📋 Multiple Price Lists</div>
                  <div style={{fontSize:11,color:'#94a3b8',marginBottom:10}}>
                    Save the item first, then use the "💲 Price" button to manage price lists.
                  </div>
                </div>
              </div>
            )}

            {/* ── STOCK TAB ── */}
            {activeFormTab==='stock' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>{form.id ? 'Current Stock (Read-only)' : 'Opening Stock'}</label>
                  <input type="number" min="0" value={form.openingStock||0}
                    readOnly={!!form.id}
                    onChange={e=>setForm({...form,openingStock:Number(e.target.value)})}
                    style={form.id?{background:'#f8fafc',color:'#64748b',cursor:'not-allowed'}:{}}/>
                  {form.id && <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Use "Stock Adjust" in item menu to change stock</div>}
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input type="number" min="0" value={form.reorderLevel||10}
                    onChange={e=>setForm({...form,reorderLevel:Number(e.target.value)})}/>
                  <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Alert when stock goes below this level</div>
                </div>
                <div className="form-group">
                  <label>Warehouse</label>
                  <select value={form.warehouseId||''} onChange={e=>setForm({...form,warehouseId:e.target.value})}>
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouseName}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{display:'flex',alignItems:'center',gap:8}}>
                  <label style={{marginBottom:0}}>Enable Batch Tracking</label>
                  <input type="checkbox" checked={form.batchTracking||false}
                    onChange={e=>setForm({...form,batchTracking:e.target.checked})}
                    style={{width:18,height:18,cursor:'pointer'}}/>
                  <span style={{fontSize:11,color:'#94a3b8'}}>Track by Batch No. + Expiry Date</span>
                </div>
              </div>
            )}

            {/* ── IMAGE TAB ── */}
            {activeFormTab==='image' && (
              <div style={{textAlign:'center'}}>
                <div style={{marginBottom:16}}>
                  {form._imagePreview ? (
                    <img src={form._imagePreview} alt="Item" style={{maxWidth:200,maxHeight:200,objectFit:'contain',border:'2px solid #e2e8f0',borderRadius:8,padding:4}}/>
                  ) : (
                    <div style={{width:160,height:160,background:'#f1f5f9',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,margin:'0 auto',border:'2px dashed #d1d5db'}}>
                      📦
                    </div>
                  )}
                </div>
                <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageChange} style={{display:'none'}}/>
                <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
                  <button className="btn btn-primary" style={{fontSize:12}}
                    onClick={()=>imageInputRef.current?.click()}>
                    📁 {form._imagePreview ? 'Change Image' : 'Upload Image'}
                  </button>
                  {form._imagePreview && (
                    <button className="btn btn-outline" style={{fontSize:12,borderColor:'#dc2626',color:'#dc2626'}}
                      onClick={()=>{
                        if (form.id) removeImage(form.id);
                        else setForm(f=>({...f,imageBase64:null,imageMimeType:null,_imagePreview:null}));
                      }}>
                      🗑️ Remove
                    </button>
                  )}
                </div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:8}}>Max 500KB. JPG, PNG, WebP supported.</div>
              </div>
            )}

            {/* ── ADVANCED TAB ── */}
            {activeFormTab==='advanced' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Barcode Value</label>
                  <input value={form.barcode||''} onChange={e=>setForm({...form,barcode:e.target.value})}
                    placeholder="Auto-generated if empty"/>
                </div>
                <div className="form-group">
                  <label>Barcode Type</label>
                  <select value={form.barcodeType||'CODE128'} onChange={e=>setForm({...form,barcodeType:e.target.value})}>
                    {BARCODE_TYPES.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Inter-State Supply (IGST)</label>
                  <select value={form.isInterState?'true':'false'}
                    onChange={e=>setForm({...form,isInterState:e.target.value==='true'})}>
                    <option value="false">No (CGST + SGST)</option>
                    <option value="true">Yes (IGST only)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveItem}>
              {form.id ? '✅ Update Item' : '✅ Add Item'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ═════════ BARCODE MODAL ═════════ */}
    {barcodeModal && (
      <div className="modal-overlay" onClick={()=>{setBarcodeModal(null);setBarcodeData(null);}}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
          <div className="modal-header">
            <h3 style={{margin:0}}>🔖 Barcode — {barcodeModal.itemName}</h3>
            <button className="modal-close" onClick={()=>{setBarcodeModal(null);setBarcodeData(null);}}>×</button>
          </div>
          <div className="modal-body" style={{textAlign:'center'}}>
            {barcodeData ? (
              <>
                <div style={{background:'#f8fafc',border:'2px solid #1a4f8a',borderRadius:12,padding:24,display:'inline-block',minWidth:280}}>
                  <div style={{fontWeight:700,fontSize:15,color:'#1a2744',marginBottom:4}}>{barcodeData.itemName}</div>
                  <div style={{fontSize:11,color:'#64748b',marginBottom:8}}>{barcodeModal.itemCode}</div>
                  {/* Barcode bars visual */}
                  <div style={{display:'flex',justifyContent:'center',gap:1,margin:'12px 0',height:60,alignItems:'stretch'}}>
                    {barcodeData.barcode.split('').map((d,i)=>(
                      <div key={i} style={{
                        width: 3,
                        background: i%3===0?'#1a2744':i%3===1?'#374151':'#1a2744',
                        opacity: 0.8 + (parseInt(d)||0)*0.02,
                      }}/>
                    ))}
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:16,letterSpacing:4,fontWeight:700,color:'#1a2744',marginBottom:8}}>
                    {barcodeData.barcode}
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:'#16a34a'}}>₹{barcodeData.salesRate}</div>
                  {barcodeData.hsnCode && <div style={{fontSize:10,color:'#94a3b8',marginTop:4}}>HSN: {barcodeData.hsnCode}</div>}
                  <div style={{fontSize:10,color:'#94a3b8',marginTop:2}}>Type: {barcodeData.barcodeType}</div>
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:16}}>
                  <button className="btn btn-primary" onClick={printBarcode}>🖨️ Print Barcode</button>
                  <button className="btn btn-outline" onClick={()=>regenerateBarcode(barcodeModal)}>🔄 Regenerate</button>
                </div>
              </>
            ) : (
              <div style={{padding:32,color:'#94a3b8'}}>⏳ Loading barcode...</div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ═════════ PRICE LIST MODAL ═════════ */}
    {priceModal && (
      <div className="modal-overlay" onClick={()=>setPriceModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:560}}>
          <div className="modal-header">
            <h3 style={{margin:0}}>💲 Price Lists — {priceModal.itemName}</h3>
            <button className="modal-close" onClick={()=>setPriceModal(null)}>×</button>
          </div>
          <div className="modal-body">
            <div style={{marginBottom:12,padding:'10px 12px',background:'#f0f4ff',borderRadius:8,fontSize:12,color:'#2563eb'}}>
              <strong>Default Sales Rate:</strong> {fmt(priceData?.salesRate||0)} &nbsp;|&nbsp;
              <strong>MRP:</strong> {fmt(priceData?.mrp||0)}
            </div>
            <div className="table-container" style={{marginBottom:12}}>
              <table>
                <thead>
                  <tr><th>Price List Name</th><th>Price (₹)</th><th>Min Qty</th><th>Unit</th><th>Active</th><th>Del</th></tr>
                </thead>
                <tbody>
                  {priceForm.map((p,i)=>(
                    <tr key={i}>
                      <td><input value={p.listName||''} style={{width:'100%',fontSize:12,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 6px'}}
                        onChange={e=>{const f=[...priceForm];f[i]={...f[i],listName:e.target.value};setPriceForm(f);}}/></td>
                      <td><input type="number" value={p.price||''} style={{width:80,fontSize:12,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 6px'}}
                        onChange={e=>{const f=[...priceForm];f[i]={...f[i],price:Number(e.target.value)};setPriceForm(f);}}/></td>
                      <td><input type="number" value={p.minQty||0} style={{width:60,fontSize:12,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 6px'}}
                        onChange={e=>{const f=[...priceForm];f[i]={...f[i],minQty:Number(e.target.value)};setPriceForm(f);}}/></td>
                      <td><select value={p.unit||'Nos'} style={{fontSize:12,border:'1px solid #e2e8f0',borderRadius:4,padding:'3px 4px'}}
                        onChange={e=>{const f=[...priceForm];f[i]={...f[i],unit:e.target.value};setPriceForm(f);}}>
                        {UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
                      <td><input type="checkbox" checked={p.active!==false}
                        onChange={e=>{const f=[...priceForm];f[i]={...f[i],active:e.target.checked};setPriceForm(f);}}/></td>
                      <td><button style={{background:'none',border:'none',color:'#dc2626',cursor:'pointer',fontSize:14}}
                        onClick={()=>setPriceForm(priceForm.filter((_,j)=>j!==i))}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>setPriceForm([...priceForm,{listName:'',price:0,minQty:0,unit:'Nos',active:true}])}>
              + Add Price List
            </button>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setPriceModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={savePriceLists}>✅ Save Price Lists</button>
          </div>
        </div>
      </div>
    )}

    {/* ═════════ BATCH MODAL ═════════ */}
    {batchModal && (
      <div className="modal-overlay" onClick={()=>{setBatchModal(null);setBatchData(null);setBatchForm({});}}>
        <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:600}}>
          <div className="modal-header">
            <h3 style={{margin:0}}>📋 Batch Tracking — {batchModal.itemName}</h3>
            <button className="modal-close" onClick={()=>{setBatchModal(null);setBatchData(null);setBatchForm({});}}>×</button>
          </div>
          <div className="modal-body">
            {/* Add Batch Form */}
            <div style={{background:'#f8fafc',borderRadius:8,padding:14,border:'1px solid #e2e8f0',marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:10}}>➕ Add New Batch</div>
              <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                <div className="form-group">
                  <label style={{fontSize:11}}>Batch Number *</label>
                  <input value={batchForm.batchNumber||''} onChange={e=>setBatchForm({...batchForm,batchNumber:e.target.value})}
                    placeholder="e.g. BATCH-001"/>
                </div>
                <div className="form-group">
                  <label style={{fontSize:11}}>Quantity *</label>
                  <input type="number" min="1" value={batchForm.quantity||''} onChange={e=>setBatchForm({...batchForm,quantity:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label style={{fontSize:11}}>Purchase Rate (₹)</label>
                  <input type="number" min="0" value={batchForm.purchaseRate||''} onChange={e=>setBatchForm({...batchForm,purchaseRate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label style={{fontSize:11}}>Mfg Date</label>
                  <input type="date" value={batchForm.manufacturingDate||''} onChange={e=>setBatchForm({...batchForm,manufacturingDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label style={{fontSize:11}}>Expiry Date</label>
                  <input type="date" value={batchForm.expiryDate||''} onChange={e=>setBatchForm({...batchForm,expiryDate:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label style={{fontSize:11}}>Supplier</label>
                  <input value={batchForm.supplierName||''} onChange={e=>setBatchForm({...batchForm,supplierName:e.target.value})}
                    placeholder="Supplier name"/>
                </div>
              </div>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={saveBatch}>➕ Add Batch</button>
            </div>
            {/* Existing Batches */}
            <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>📋 Existing Batches</div>
            {batchData?.batches?.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>Batch No.</th><th className="text-right">Qty</th><th>Mfg Date</th><th>Expiry</th><th className="text-right">Rate ₹</th><th>Supplier</th><th>Status</th></tr></thead>
                  <tbody>
                    {batchData.batches.map((b,i)=>{
                      const isExp = b.expiryDate && new Date(b.expiryDate) < new Date();
                      const daysLeft = b.expiryDate ? Math.floor((new Date(b.expiryDate)-new Date())/(1000*60*60*24)) : null;
                      return (
                        <tr key={i} style={{background:isExp?'#fff1f2':daysLeft!==null&&daysLeft<=7?'#fffbeb':'white'}}>
                          <td style={{fontFamily:'monospace',fontWeight:600,fontSize:12}}>{b.batchNumber}</td>
                          <td className="text-right" style={{fontWeight:700}}>{b.quantity}</td>
                          <td style={{fontSize:11,color:'#64748b'}}>{b.manufacturingDate||'—'}</td>
                          <td style={{fontSize:11,fontWeight:600,color:isExp?'#dc2626':daysLeft!==null&&daysLeft<=7?'#d97706':'#374151'}}>
                            {b.expiryDate||'—'}{daysLeft!==null&&<span style={{fontSize:10,marginLeft:4}}>({isExp?'Expired':daysLeft+'d'})</span>}
                          </td>
                          <td className="text-right" style={{fontSize:12}}>{fmt(b.purchaseRate||0)}</td>
                          <td style={{fontSize:11,color:'#64748b'}}>{b.supplierName||'—'}</td>
                          <td><span style={{background:isExp?'#fee2e2':daysLeft!==null&&daysLeft<=7?'#fef9c3':'#d1fae5',color:isExp?'#dc2626':daysLeft!==null&&daysLeft<=7?'#92400e':'#065f46',padding:'2px 6px',borderRadius:8,fontSize:10,fontWeight:700}}>{isExp?'🔴 Expired':daysLeft!==null&&daysLeft<=7?'⚠️ Critical':'✅ OK'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:20,color:'#94a3b8',fontSize:12}}>No batches added yet.</div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={()=>{setBatchModal(null);setBatchData(null);setBatchForm({});}}>Close</button>
          </div>
        </div>
      </div>
    )}

    {/* ═════════ CATEGORY MODAL ═════════ */}
    {showModal==='cat' && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h3>{editCat?'Edit Category':'Add Category'}</h3><button className="modal-close" onClick={()=>setShowModal(null)}>×</button></div>
          <div className="modal-body">
            <div className="form-group"><label>Category Name *</label><input value={catForm.categoryName||''} onChange={e=>setCatForm({...catForm,categoryName:e.target.value})}/></div>
            <div className="form-group"><label>Description</label><input value={catForm.description||''} onChange={e=>setCatForm({...catForm,description:e.target.value})}/></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>setShowModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCat}>{editCat?'Update':'Create'}</button>
          </div>
        </div>
      </div>
    )}

    {/* ═════════ WAREHOUSE MODAL ═════════ */}
    {showModal==='wh' && (
      <div className="modal-overlay" onClick={()=>setShowModal(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-header"><h3>{editWhId?'Edit':'Add'} Warehouse</h3><button className="modal-close" onClick={()=>{setShowModal(null);setEditWhId(null);setWhForm({});}}>×</button></div>
          <div className="modal-body">
            <div className="form-group"><label>Name *</label><input value={whForm.warehouseName||''} onChange={e=>setWhForm({...whForm,warehouseName:e.target.value})}/></div>
            <div className="form-group"><label>Address</label><input value={whForm.address||''} onChange={e=>setWhForm({...whForm,address:e.target.value})}/></div>
            <div className="form-group"><label>City</label><input value={whForm.city||''} onChange={e=>setWhForm({...whForm,city:e.target.value})}/></div>
            <div className="form-group"><label>Contact Person</label><input value={whForm.contactPerson||''} onChange={e=>setWhForm({...whForm,contactPerson:e.target.value})}/></div>
            <div className="form-group"><label>Phone</label><input value={whForm.phone||''} onChange={e=>setWhForm({...whForm,phone:e.target.value})}/></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={()=>{setShowModal(null);setEditWhId(null);setWhForm({});}}>Cancel</button>
            <button className="btn btn-primary" onClick={saveWH}>{editWhId?'Update':'Create'}</button>
          </div>
        </div>
      </div>
    )}

      {/* ══════════════ VARIANTS TAB ══════════════ */}
      {tab==='variants' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🎨 Item Variants</span>
            <span style={{fontSize:12,color:'#94a3b8'}}>Size, Color, Width — ek item madhe multiple variants manage kara</span>
          </div>
          <div className="card-body">
            <div style={{marginBottom:12}}>
              <label style={{fontWeight:600,fontSize:13,marginRight:10}}>Item Select kara:</label>
              <select style={{padding:'6px 12px',borderRadius:6,border:'1px solid #e2e8f0',fontSize:13}}
                value={variantItem?.id||''} onChange={e=>{const it=items.find(i=>i.id===e.target.value);setVariantItem(it||null);}}>
                <option value="">-- Select Item --</option>
                {items.map(it=><option key={it.id} value={it.id}>{it.itemName} ({it.itemCode})</option>)}
              </select>
            </div>
            {variantItem && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:15}}>{variantItem.itemName}</span>
                    <span style={{fontSize:12,color:'#64748b',marginLeft:8}}>Base Rate: ₹{variantItem.salesRate}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={()=>{setVariantForm({variantType:'SIZE',active:true});setVariantModal(true);}}>
                    + Add Variant
                  </button>
                </div>
                {(variantItem.variants||[]).length===0 ? (
                  <div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>
                    <div style={{fontSize:32,marginBottom:8}}>🎨</div>
                    <div>Konathe variant nahi. "+ Add Variant" click karo.</div>
                    <div style={{fontSize:12,marginTop:6}}>Example: 12mm, 24mm, 48mm sizes add kara</div>
                  </div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead style={{background:'#1a4f8a',color:'#fff'}}>
                      <tr>
                        <th style={{padding:'8px 10px',textAlign:'left'}}>Variant Name</th>
                        <th style={{padding:'8px 10px',textAlign:'left'}}>Type</th>
                        <th style={{padding:'8px 10px',textAlign:'right'}}>Purchase Rate</th>
                        <th style={{padding:'8px 10px',textAlign:'right'}}>Sale Rate</th>
                        <th style={{padding:'8px 10px',textAlign:'right'}}>Stock</th>
                        <th style={{padding:'8px 10px',textAlign:'center'}}>Status</th>
                        <th style={{padding:'8px 10px'}}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(variantItem.variants||[]).map((v,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid #e2e8f0',background:i%2?'#f8fafc':'#fff'}}>
                          <td style={{padding:'7px 10px',fontWeight:600}}>{v.variantName}</td>
                          <td style={{padding:'7px 10px',color:'#64748b'}}>{v.variantType}</td>
                          <td style={{padding:'7px 10px',textAlign:'right'}}>₹{(v.purchaseRate||0).toFixed(2)}</td>
                          <td style={{padding:'7px 10px',textAlign:'right'}}>₹{(v.salesRate||0).toFixed(2)}</td>
                          <td style={{padding:'7px 10px',textAlign:'right'}}>{v.currentStock||0}</td>
                          <td style={{padding:'7px 10px',textAlign:'center'}}>
                            <span style={{background:v.active?'#dcfce7':'#fee2e2',color:v.active?'#166534':'#dc2626',
                              fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4}}>
                              {v.active?'Active':'Inactive'}
                            </span>
                          </td>
                          <td style={{padding:'7px 10px'}}>
                            <button className="btn btn-sm btn-outline" onClick={()=>{setVariantForm({...v,_index:i});setVariantModal(true);}}>✏️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ STOCK TRANSFER TAB ══════════════ */}
      {tab==='transfer' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔄 Internal Stock Transfer</span>
            <button className="btn btn-primary btn-sm" onClick={()=>{setTransferForm({transferDate:new Date().toISOString().slice(0,10),items:[{itemId:'',itemName:'',quantity:1,unit:'Pcs'}]});setTransferModal(true);}}>
              + New Transfer
            </button>
          </div>
          <div className="card-body">
            {transfers.length===0 ? (
              <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
                <div style={{fontSize:36,marginBottom:8}}>🔄</div>
                <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>Stock Transfer records nahi</div>
                <div style={{fontSize:13}}>Ek warehouse madhun dusryat items move karayla "+ New Transfer" click karo</div>
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead style={{background:'#1a4f8a',color:'#fff'}}>
                  <tr>
                    {['Transfer No.','Date','From','To','Items','Status','Action'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:'left'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t,i)=>(
                    <tr key={t.id} style={{borderBottom:'1px solid #e2e8f0',background:i%2?'#f8fafc':'#fff'}}>
                      <td style={{padding:'7px 10px',fontWeight:600}}>{t.transferNumber}</td>
                      <td style={{padding:'7px 10px'}}>{t.transferDate}</td>
                      <td style={{padding:'7px 10px'}}>{t.fromWarehouseName||'—'}</td>
                      <td style={{padding:'7px 10px'}}>{t.toWarehouseName||'—'}</td>
                      <td style={{padding:'7px 10px'}}>{(t.items||[]).length} items</td>
                      <td style={{padding:'7px 10px'}}>
                        <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:4,
                          background:t.status==='COMPLETED'?'#dcfce7':t.status==='PENDING'?'#fef3c7':'#f1f5f9',
                          color:t.status==='COMPLETED'?'#166534':t.status==='PENDING'?'#92400e':'#374151'}}>
                          {t.status}
                        </span>
                      </td>
                      <td style={{padding:'7px 10px'}}>
                        {t.status==='PENDING' && (
                          <button className="btn btn-sm btn-primary"
                            onClick={async()=>{
                              try {
                                const {updateStockTransfer} = await import('../services/api');
                                await updateStockTransfer(t.id,{...t,status:'COMPLETED'});
                                toast.success('✅ Transfer completed!');
                                const {getStockTransfers} = await import('../services/api');
                                const r = await getStockTransfers(); setTransfers(r.data||[]);
                              } catch(e){ toast.error('Failed'); }
                            }}>✅ Complete</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

          {/* ══ VARIANT MODAL ══ */}
      {variantModal && (
        <div className="modal-overlay" onClick={()=>setVariantModal(false)}>
          <div className="modal" style={{maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{variantForm._index!==undefined?'Edit':'Add'} Variant — {variantItem?.itemName}</h3>
              <button className="modal-close" onClick={()=>setVariantModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Variant Name *</label>
                  <input value={variantForm.variantName||''} onChange={e=>setVariantForm(f=>({...f,variantName:e.target.value}))}
                    placeholder="e.g. 12mm, Red, Large"/>
                </div>
                <div className="form-group">
                  <label>Variant Type</label>
                  <select value={variantForm.variantType||'SIZE'} onChange={e=>setVariantForm(f=>({...f,variantType:e.target.value}))}>
                    <option value="SIZE">Size / Width</option>
                    <option value="COLOR">Color</option>
                    <option value="WEIGHT">Weight</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Purchase Rate (₹)</label>
                  <input type="number" min="0" step="0.01" value={variantForm.purchaseRate||''}
                    onChange={e=>setVariantForm(f=>({...f,purchaseRate:parseFloat(e.target.value)||0}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label>Sale Rate (₹)</label>
                  <input type="number" min="0" step="0.01" value={variantForm.salesRate||''}
                    onChange={e=>setVariantForm(f=>({...f,salesRate:parseFloat(e.target.value)||0}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label>Opening Stock</label>
                  <input type="number" min="0" value={variantForm.currentStock||''}
                    onChange={e=>setVariantForm(f=>({...f,currentStock:parseFloat(e.target.value)||0}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input type="number" min="0" value={variantForm.reorderLevel||''}
                    onChange={e=>setVariantForm(f=>({...f,reorderLevel:parseFloat(e.target.value)||0}))} placeholder="0"/>
                </div>
                <div className="form-group">
                  <label>SKU (optional)</label>
                  <input value={variantForm.sku||''} onChange={e=>setVariantForm(f=>({...f,sku:e.target.value}))} placeholder="e.g. TAPE-12MM"/>
                </div>
                <div className="form-group" style={{display:'flex',alignItems:'center',gap:10,paddingTop:20}}>
                  <input type="checkbox" id="vActive" checked={variantForm.active!==false}
                    onChange={e=>setVariantForm(f=>({...f,active:e.target.checked}))} style={{width:16,height:16}}/>
                  <label htmlFor="vActive" style={{margin:0}}>Active</label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setVariantModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async()=>{
                if(!variantForm.variantName?.trim()){toast.error('Variant name required');return;}
                try {
                  const updatedItem = {...variantItem};
                  const variants = [...(updatedItem.variants||[])];
                  const vData = {...variantForm};
                  if(vData._index!==undefined){
                    const idx=vData._index; delete vData._index;
                    variants[idx]=vData;
                  } else {
                    delete vData._index; variants.push(vData);
                  }
                  updatedItem.variants = variants;
                  updatedItem.hasVariants = true;
                  const {updateItem} = await import('../services/api');
                  await updateItem(variantItem.id, updatedItem);
                  // Refresh items
                  const {getItems} = await import('../services/api');
                  const r = await getItems(); 
                  const newItem = (r.data||[]).find(i=>i.id===variantItem.id);
                  setVariantItem(newItem||updatedItem);
                  toast.success('✅ Variant saved!');
                  setVariantModal(false);
                } catch(e){ toast.error('Save failed'); }
              }}>💾 Save Variant</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STOCK TRANSFER MODAL ══ */}
      {transferModal && (
        <div className="modal-overlay" onClick={()=>setTransferModal(false)}>
          <div className="modal" style={{maxWidth:680}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔄 New Stock Transfer</h3>
              <button className="modal-close" onClick={()=>setTransferModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{marginBottom:12}}>
                <div className="form-group">
                  <label>Transfer Date</label>
                  <input type="date" value={transferForm.transferDate||''} onChange={e=>setTransferForm(f=>({...f,transferDate:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>From Warehouse</label>
                  <select value={transferForm.fromWarehouseId||''} onChange={e=>{
                    const w=warehouses.find(wh=>wh.id===e.target.value);
                    setTransferForm(f=>({...f,fromWarehouseId:e.target.value,fromWarehouseName:w?.warehouseName||''}));
                  }}>
                    <option value="">-- Select --</option>
                    {warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouseName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>To Warehouse</label>
                  <select value={transferForm.toWarehouseId||''} onChange={e=>{
                    const w=warehouses.find(wh=>wh.id===e.target.value);
                    setTransferForm(f=>({...f,toWarehouseId:e.target.value,toWarehouseName:w?.warehouseName||''}));
                  }}>
                    <option value="">-- Select --</option>
                    {warehouses.map(w=><option key={w.id} value={w.id}>{w.warehouseName}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input value={transferForm.notes||''} onChange={e=>setTransferForm(f=>({...f,notes:e.target.value}))} placeholder="Optional"/>
                </div>
              </div>
              <h4 style={{marginBottom:8}}>Items to Transfer</h4>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'#1a4f8a',color:'#fff'}}>
                  <th style={{padding:'7px 8px',textAlign:'left'}}>Item</th>
                  <th style={{padding:'7px 8px',textAlign:'right',width:80}}>Qty</th>
                  <th style={{padding:'7px 8px',width:70}}>Unit</th>
                  <th style={{padding:'7px 8px',width:40}}></th>
                </tr></thead>
                <tbody>
                  {(transferForm.items||[]).map((row,i)=>(
                    <tr key={i}>
                      <td style={{padding:'4px 4px'}}>
                        <select value={row.itemId||''} style={{width:'100%'}}
                          onChange={e=>{const it=items.find(x=>x.id===e.target.value);
                            const rows=[...(transferForm.items||[])];rows[i]={...row,itemId:e.target.value,itemName:it?.itemName||'',unit:it?.unit||'Pcs'};
                            setTransferForm(f=>({...f,items:rows}));}}>
                          <option value="">-- Select Item --</option>
                          {items.map(it=><option key={it.id} value={it.id}>{it.itemName} (Stock:{it.currentStock})</option>)}
                        </select>
                      </td>
                      <td style={{padding:'4px 4px'}}>
                        <input type="number" min="1" style={{width:'100%',textAlign:'right'}} value={row.quantity||''}
                          onChange={e=>{const rows=[...(transferForm.items||[])];rows[i]={...row,quantity:parseFloat(e.target.value)||0};setTransferForm(f=>({...f,items:rows}));}}/>
                      </td>
                      <td style={{padding:'4px 4px'}}><input value={row.unit||'Pcs'} style={{width:'100%'}}
                        onChange={e=>{const rows=[...(transferForm.items||[])];rows[i]={...row,unit:e.target.value};setTransferForm(f=>({...f,items:rows}));}}/></td>
                      <td style={{padding:'4px 4px',textAlign:'center'}}>
                        <button className="btn btn-sm" style={{color:'#dc2626',border:'none',background:'none',cursor:'pointer'}}
                          onClick={()=>setTransferForm(f=>({...f,items:f.items.filter((_,j)=>j!==i)}))}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>setTransferForm(f=>({...f,items:[...(f.items||[]),{itemId:'',itemName:'',quantity:1,unit:'Pcs'}]}))}>
                + Add Item
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setTransferModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async()=>{
                if(!transferForm.fromWarehouseId||!transferForm.toWarehouseId){toast.error('From/To warehouse select kara');return;}
                if(transferForm.fromWarehouseId===transferForm.toWarehouseId){toast.error('From and To cannot be same');return;}
                if(!(transferForm.items||[]).some(r=>r.itemId)){toast.error('At least one item add kara');return;}
                try {
                  const {createStockTransfer,getStockTransfers} = await import('../services/api');
                  await createStockTransfer({...transferForm,status:'PENDING'});
                  toast.success('✅ Transfer created!');
                  const r = await getStockTransfers(); setTransfers(r.data||[]);
                  setTransferModal(false);
                } catch(e){ toast.error(e.response?.data?.error||'Failed'); }
              }}>💾 Create Transfer</button>
            </div>
          </div>
        </div>
      )}

          {/* ══════════════ BARCODE SCANNER TAB ══════════════ */}
      {tab==='scanner' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📷 Barcode Scanner</span>
            <span style={{fontSize:12,color:'#94a3b8'}}>Camera ne barcode scan kara item search karayla</span>
          </div>
          <div className="card-body">
            <div style={{maxWidth:500,margin:'0 auto',textAlign:'center'}}>
              {!scanMode ? (
                <div>
                  <div style={{fontSize:48,marginBottom:16}}>📷</div>
                  <div style={{fontSize:15,marginBottom:8,color:'#374151'}}>Camera Scanner</div>
                  <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>
                    Mobile/laptop camera varun barcode scan karayla html5-qrcode library install karayla laagel.
                  </div>
                  <button className="btn btn-primary" onClick={()=>{
                    setScanMode(true);
                    // Load html5-qrcode dynamically
                    if(!document.getElementById('html5qr-script')) {
                      const s = document.createElement('script');
                      s.id = 'html5qr-script';
                      s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
                      s.onload = () => {
                        if(window.Html5Qrcode) {
                          setTimeout(() => {
                            const html5QrCode = new window.Html5Qrcode("reader");
                            html5QrCode.start(
                              {facingMode:"environment"},
                              {fps:10,qrbox:{width:250,height:150}},
                              (decodedText) => {
                                html5QrCode.stop();
                                setScanMode(false);
                                setScanResult(decodedText);
                                // Find item by barcode
                                import('../services/api').then(api=>api.getItems()).then(r=>{
                                  const found = (r.data||[]).find(i=>i.barcode===decodedText||i.itemCode===decodedText);
                                  if(found) { setScanResult({barcode:decodedText,item:found}); }
                                  else { setScanResult({barcode:decodedText,item:null}); }
                                });
                              },
                              (err) => {}
                            ).catch(e=>{
                              toast.error('Camera access nahi mila. Browser madhe camera permission allow kara.');
                              setScanMode(false);
                            });
                          }, 500);
                        }
                      };
                      document.body.appendChild(s);
                    }
                  }}>
                    📷 Start Scanner
                  </button>
                  <div style={{fontSize:12,color:'#94a3b8',marginTop:12}}>
                    Alternative: Barcode manully search kara:
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'center'}}>
                    <input id="manualBarcode" placeholder="Barcode / Item Code enter kara"
                      style={{padding:'8px 12px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:13,width:250}}
                      onKeyDown={e=>{if(e.key==='Enter'){
                        const val=e.target.value.trim();
                        if(!val) return;
                        import('../services/api').then(api=>api.getItems()).then(r=>{
                          const found=(r.data||[]).find(i=>i.barcode===val||i.itemCode===val||i.itemName?.toLowerCase().includes(val.toLowerCase()));
                          setScanResult({barcode:val,item:found||null});
                        });
                      }}}/>
                    <button className="btn btn-primary btn-sm" onClick={()=>{
                      const val=document.getElementById('manualBarcode')?.value?.trim();
                      if(!val) return;
                      import('../services/api').then(api=>api.getItems()).then(r=>{
                        const found=(r.data||[]).find(i=>i.barcode===val||i.itemCode===val||i.itemName?.toLowerCase().includes(val.toLowerCase()));
                        setScanResult({barcode:val,item:found||null});
                      });
                    }}>🔍 Search</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div id="reader" style={{width:'100%',maxWidth:400,margin:'0 auto'}}></div>
                  <button className="btn btn-outline btn-sm" style={{marginTop:12}}
                    onClick={()=>setScanMode(false)}>Cancel</button>
                </div>
              )}

              {scanResult && (
                <div style={{marginTop:24,textAlign:'left'}}>
                  <div style={{fontWeight:600,marginBottom:8}}>Scan Result:</div>
                  <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 16px'}}>
                    <div style={{fontSize:12,color:'#94a3b8',marginBottom:4}}>Scanned: <b style={{fontFamily:'monospace',color:'#374151'}}>{scanResult.barcode}</b></div>
                    {scanResult.item ? (
                      <div>
                        <div style={{fontWeight:700,fontSize:16,color:'#1a4f8a',marginBottom:8}}>{scanResult.item.itemName}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:6,padding:'8px 12px'}}>
                            <div style={{fontSize:11,color:'#94a3b8'}}>Current Stock</div>
                            <div style={{fontWeight:700,fontSize:18,color:scanResult.item.currentStock<=scanResult.item.reorderLevel?'#dc2626':'#059669'}}>{scanResult.item.currentStock} {scanResult.item.unit}</div>
                          </div>
                          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:6,padding:'8px 12px'}}>
                            <div style={{fontSize:11,color:'#94a3b8'}}>Sale Rate</div>
                            <div style={{fontWeight:700,fontSize:18,color:'#1a4f8a'}}>₹{(scanResult.item.salesRate||0).toLocaleString('en-IN')}</div>
                          </div>
                          <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:6,padding:'8px 12px'}}>
                            <div style={{fontSize:11,color:'#94a3b8'}}>HSN Code</div>
                            <div style={{fontWeight:700,fontSize:16}}>{scanResult.item.hsnCode||'—'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{color:'#dc2626',fontWeight:600}}>
                        ❌ Item not found for barcode: {scanResult.barcode}
                        <div style={{fontSize:12,color:'#64748b',marginTop:4,fontWeight:400}}>
                          Inventory madhe item add kara ya item varti barcode assign kara.
                        </div>
                      </div>
                    )}
                  </div>
                  <button className="btn btn-outline btn-sm" style={{marginTop:10}} onClick={()=>setScanResult(null)}>Clear</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    {/* ═════════ CONFIRM MODALS ═════════ */}
    <ConfirmModal open={!!confirmDeleteItem} title="Delete Item?" type="danger"
      message="हा item delete होईल." confirmLabel="Yes, Delete"
      details={confirmDeleteItem?`${confirmDeleteItem.itemName} (${confirmDeleteItem.itemCode}) — Stock: ${confirmDeleteItem.currentStock}`:''}
      onConfirm={deleteItem} onCancel={()=>setConfirmDeleteItem(null)}/>
    <ConfirmModal open={!!confirmDeleteCat} title="Delete Category?"
      message="Are you sure you want to delete this category?"
      details={confirmDeleteCat?`${confirmDeleteCat.categoryName}`:''}
      onCancel={()=>setConfirmDeleteCat(null)} onConfirm={deleteCat}/>
    <ConfirmModal open={!!confirmDeleteWH} title="Delete Warehouse?" type="danger"
      message="हा Warehouse permanently delete होईल." confirmLabel="Yes, Delete"
      details={confirmDeleteWH?`${confirmDeleteWH.warehouseName}`:''} 
      onConfirm={deleteWH} onCancel={()=>setConfirmDeleteWH(null)}/>
    </>
  );
}
