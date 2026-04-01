import React, { useState, useRef } from 'react';
import { useFY } from '../context/FYContext';
import { addPurchaseInvoice, addSalesInvoice, addExpense, addCustomer, addSupplier, addItem, addVoucher } from '../services/api';
import toast from 'react-hot-toast';

const extractTextFromPDF = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        resolve(text);
      } catch { resolve(''); }
    };
    reader.readAsText(file);
  });
};

function parseAmount(str) {
  if (!str) return 0;
  return parseFloat(str.toString().replace(/[₹,\s]/g, '')) || 0;
}

function parseDate(str) {
  if (!str) return new Date().toISOString().split('T')[0];
  const m = str.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }
  return new Date().toISOString().split('T')[0];
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase().replace(/\s+/g,'_'));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g,''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
}

function detectType(headers) {
  const h = headers.join(' ').toLowerCase();
  if (h.includes('supplier') || h.includes('purchase') || h.includes('vendor')) return 'purchase';
  if (h.includes('customer') || h.includes('sales') || h.includes('invoice')) return 'sales';
  if (h.includes('expense') || h.includes('head')) return 'expense';
  if (h.includes('item') || h.includes('product') || h.includes('stock')) return 'inventory';
  if (h.includes('name') && h.includes('phone')) return 'customer';
  return 'unknown';
}

const TEMPLATES = {
  purchase: {
    name: 'Purchase Invoices',
    headers: ['supplier_name','invoice_date','invoice_number','item_name','quantity','unit','rate','gst_rate','notes'],
    sample: 'ABC Suppliers,01/04/2024,INV-001,Rice Bags,100,Bags,45,5,Cash purchase\nXYZ Traders,05/04/2024,INV-002,Sugar,50,Kg,42,5,Credit'
  },
  sales: {
    name: 'Sales Invoices',
    headers: ['customer_name','invoice_date','invoice_number','item_name','quantity','unit','rate','gst_rate','notes'],
    sample: 'Ram Traders,01/04/2024,SINV-001,Rice Bags,50,Bags,55,5,Cash\nSita Stores,03/04/2024,SINV-002,Sugar,30,Kg,50,5,Credit'
  },
  expense: {
    name: 'Expenses',
    headers: ['expense_head','expense_date','amount','payment_mode','notes'],
    sample: 'Rent,01/04/2024,15000,BANK TRANSFER,Office rent April\nElectricity,05/04/2024,3500,CASH,Monthly bill'
  },
  customer: {
    name: 'Customers',
    headers: ['customer_name','phone','email','gstin','address','city','state'],
    sample: 'Ram Traders,9876543210,ram@gmail.com,27ABCDE1234F1Z5,Main Road,Pune,Maharashtra\nSita Stores,9123456789,,,,Mumbai,Maharashtra'
  },
  supplier: {
    name: 'Suppliers',
    headers: ['supplier_name','phone','email','gstin','address','city','state'],
    sample: 'ABC Suppliers,9999988888,abc@gmail.com,27XYZAB5678G1Z2,MIDC,Pune,Maharashtra'
  },
  inventory: {
    name: 'Inventory Items',
    headers: ['item_name','item_code','category','unit','purchase_rate','sales_rate','gst_rate','opening_stock','reorder_level'],
    sample: 'Rice Bags,ITEM001,Food Grains,Bags,45,55,5,500,50\nSugar,ITEM002,Food Grains,Kg,42,50,5,200,30'
  }
};

const loadPdfJs = () => new Promise((resolve, reject) => {
  if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    resolve(window.pdfjsLib);
  };
  script.onerror = () => reject(new Error('pdfjs load failed'));
  document.head.appendChild(script);
});

const parseBoBAmount = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/[,\s]/g, '').replace(/Cr|Dr/gi, '')) || 0;
};

const extractPdfText = async (file) => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rowMap  = {};
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!rowMap[y]) rowMap[y] = [];
      rowMap[y].push({ x: item.transform[4], text: item.str });
    }
    const pageLines = Object.entries(rowMap)
      .sort(([ya],[yb]) => Number(yb) - Number(ya))
      .map(([, items]) => items.sort((a,b) => a.x - b.x).map(i => i.text).join(' ').trim())
      .filter(l => l.length > 0);
    lines = lines.concat(pageLines);
  }
  return lines;
};

const parseBoBStatement = (lines) => {
  const txns = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    if (!/^\d{2}\/\d{2}\/\d{4}/.test(line)) continue;
    while (i + 1 < lines.length) {
      const next = lines[i+1].trim();
      if (!next || /^\d{2}\/\d{2}\/\d{4}/.test(next) || /^(Page|Statement|TRAN|VALUE|WITH|DEPO|BALA)/i.test(next)) break;
      i++; line += ' ' + lines[i].trim();
    }
    const dates = line.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if (!dates.length) continue;
    const tranDate = dates[0];
    const amtMatches = [...line.matchAll(/([\d,]+\.\d{2}(?:Cr|Dr)?)/gi)];
    if (amtMatches.length < 2) continue;
    const balance = parseBoBAmount(amtMatches[amtMatches.length - 1][1]);
    let dr = 0, cr = 0;
    if (amtMatches.length >= 3) {
      dr = parseBoBAmount(amtMatches[amtMatches.length - 3][1]);
      cr = parseBoBAmount(amtMatches[amtMatches.length - 2][1]);
    } else {
      const amt = parseBoBAmount(amtMatches[0][1]);
      const up  = line.toUpperCase();
      if (up.includes('EBANK:SELF') || up.includes('BY CASH')) cr = amt; else dr = amt;
    }
    let narration = line.replace(/\d{2}\/\d{2}\/\d{4}/g,'').replace(/([\d,]+\.\d{2}(?:Cr|Dr)?)/gi,'').replace(/\s+/g,' ').trim();
    if (!narration) narration = 'Bank Transaction';
    const [dd,mm,yyyy] = tranDate.split('/');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    let txnType = 'OTHER';
    const up = narration.toUpperCase();
    if (up.includes('UPI')) txnType='UPI';
    else if (up.includes('NEFT')) txnType='NEFT';
    else if (up.includes('RTGS')) txnType='RTGS';
    else if (up.includes('IMPS')) txnType='IMPS';
    else if (up.includes('EBANK')) txnType='E-BANKING';
    else if (up.includes('CASH')) txnType='CASH';
    else if (up.includes('CHEQUE')||up.includes('CHQS')) txnType='CHEQUE';
    else if (up.includes('CHARGES')||up.includes('CHGS')) txnType='BANK CHARGES';
    txns.push({ date:isoDate, displayDate:tranDate, narration, txnType, dr, cr, balance, selected:true });
  }
  return txns;
};

export default function ImportPage() {
  const { selectedFY, fyList } = useFY();
  const [tab, setTab]           = useState('csv');
  const [importType, setType]   = useState('purchase');
  const [preview, setPreview]   = useState([]);
  const [headers, setHeaders]   = useState([]);
  const [rawText, setRawText]   = useState('');
  const [status, setStatus]     = useState([]);
  const [importing, setImport]  = useState(false);
  const [done, setDone]         = useState({ success: 0, failed: 0 });
  const fileRef = useRef();

  const [bsTxns, setBsTxns]         = useState([]);
  const [bsLoading, setBsLoading]   = useState(false);
  const [bsImporting, setBsImport]  = useState(false);
  const [bsStatus, setBsStatus]     = useState([]);
  const [bsDone, setBsDone]         = useState({ success:0, failed:0 });
  const [bankLedger, setBankLedger] = useState("Bank of Baroda");
  const [contraLedger, setContraLedger] = useState("Suspense Account");
  const [fyear, setFyear]           = useState(selectedFY?.label || "2025-26");
  React.useEffect(() => {
    if (selectedFY?.label) { setFyear(selectedFY.label); setBsTxns([]); }
  }, [selectedFY?.label]);
  const handleFyearChange = (newFY) => {
    setFyear(newFY);
    setBsTxns([]);
  };
  const bsFileRef = useRef();

  const today = () => new Date().toISOString().split('T')[0];

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreview([]); setStatus([]); setDone({ success: 0, failed: 0 });

    const ext = file.name.split('.').pop().toLowerCase();
    let text = '';

    if (ext === 'csv' || ext === 'txt') {
      text = await file.text();
    } else {
      toast.error('CSV / TXT files only. For PDF: copy-paste the text in Manual tab.');
      return;
    }

    setRawText(text);
    processText(text);
  };

  const processText = (text) => {
    const rows = parseCSV(text);
    if (rows.length === 0) { toast.error('No data found. Check file format.'); return; }
    const hdrs = Object.keys(rows[0]);
    const detected = detectType(hdrs);
    setHeaders(hdrs);
    setPreview(rows.slice(0, 5));
    if (detected !== 'unknown') {
      setType(detected);
      toast.success(`Detected: ${detected.toUpperCase()} data — ${rows.length} rows found`);
    } else {
      toast(`${rows.length} rows found. Please select type manually.`, { icon: 'ℹ️' });
    }
  };

  const handlePaste = (text) => {
    setRawText(text);
    if (text.trim()) processText(text);
  };

  const importRow = async (row) => {
    try {
      const gstRate   = parseFloat(row.gst_rate || row.gst || 0);
      const qty       = parseFloat(row.quantity || row.qty || 1);
      const rate      = parseAmount(row.rate || row.amount || row.price || 0);
      const base      = qty * rate;
      const gstAmt    = base * gstRate / 100;
      const cgst      = gstAmt / 2;
      const sgst      = gstAmt / 2;

      if (importType === 'purchase') {
        await addPurchaseInvoice({
          supplierName:    row.supplier_name || row.supplier || 'Unknown',
          invoiceNumber:   row.invoice_number || row.invoice_no || ('PINV-' + Date.now()),
          invoiceDate:     parseDate(row.invoice_date || row.date),
          financialYear:   fyear,
          items: [{
            itemName: row.item_name || row.item || row.product || 'Item',
            quantity: qty, unit: row.unit || 'Nos', rate,
            gstRate, cgstRate: gstRate/2, sgstRate: gstRate/2,
            cgstAmount: cgst, sgstAmount: sgst,
            amount: base, totalAmount: base + gstAmt
          }],
          subTotal: base, totalCgst: cgst, totalSgst: sgst,
          totalGst: gstAmt, grandTotal: base + gstAmt,
          paidAmount: 0, balanceDue: base + gstAmt,
          paymentStatus: 'PENDING', status: 'CONFIRMED',
          notes: row.notes || row.remarks || ''
        });
      } else if (importType === 'sales') {
        await addSalesInvoice({
          customerName:  row.customer_name || row.customer || 'Unknown',
          invoiceNumber: row.invoice_number || row.invoice_no || ('SINV-' + Date.now()),
          invoiceDate:   parseDate(row.invoice_date || row.date),
          financialYear: selectedFY.label,
          items: [{
            itemName: row.item_name || row.item || row.product || 'Item',
            quantity: qty, unit: row.unit || 'Nos', rate,
            gstRate, discount: 0,
            cgstAmount: cgst, sgstAmount: sgst,
            amount: base, totalAmount: base + gstAmt
          }],
          subTotal: base, totalCgst: cgst, totalSgst: sgst,
          totalGst: gstAmt, grandTotal: base + gstAmt,
          paidAmount: 0, balanceDue: base + gstAmt,
          paymentStatus: 'PENDING', status: 'CONFIRMED',
          notes: row.notes || ''
        });
      } else if (importType === 'expense') {
        await addExpense({
          expenseHeadName: row.expense_head || row.head || row.category || 'General',
          expenseDate:     parseDate(row.expense_date || row.date),
          amount:          parseAmount(row.amount),
          paymentMode:     row.payment_mode || row.mode || 'CASH',
          description:     row.notes || row.remarks || row.description || '',
          financialYear:   fyear, active: true
        });
      } else if (importType === 'customer') {
        await addCustomer({
          customerName:    row.customer_name || row.name,
          phone:           row.phone || row.mobile || '',
          email:           row.email || '',
          gstin:           row.gstin || row.gst || '',
          address:         row.address || '',
          city:            row.city || '',
          state:           row.state || 'Maharashtra',
          active:          true
        });
      } else if (importType === 'supplier') {
        await addSupplier({
          supplierName:    row.supplier_name || row.name,
          phone:           row.phone || row.mobile || '',
          email:           row.email || '',
          gstin:           row.gstin || row.gst || '',
          address:         row.address || '',
          city:            row.city || '',
          state:           row.state || 'Maharashtra',
          active:          true
        });
      } else if (importType === 'inventory') {
        await addItem({
          itemName:      row.item_name || row.name,
          itemCode:      row.item_code || row.code || '',
          categoryName:  row.category || '',
          unit:          row.unit || 'Nos',
          purchaseRate:  parseAmount(row.purchase_rate || row.cost || 0),
          salesRate:     parseAmount(row.sales_rate || row.price || 0),
          mrpRate:       parseAmount(row.mrp || row.sales_rate || 0),
          gstRate:       parseFloat(row.gst_rate || 18),
          currentStock:  parseFloat(row.opening_stock || row.stock || 0),
          reorderLevel:  parseFloat(row.reorder_level || row.reorder || 10),
          active:        true
        });
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, err: e.response?.data?.error || e.message };
    }
  };

  const runImport = async () => {
    const rows = parseCSV(rawText);
    if (rows.length === 0) { toast.error('No data to import'); return; }
    setImport(true);
    setStatus(rows.map(() => ({ state: 'pending' })));
    let success = 0, failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const res = await importRow(rows[i]);
      setStatus(prev => {
        const s = [...prev];
        s[i] = res.ok ? { state: 'ok' } : { state: 'fail', err: res.err };
        return s;
      });
      if (res.ok) success++; else failed++;
    }
    setDone({ success, failed });
    setImport(false);
    toast.success(`Import done! ✅ ${success} saved, ❌ ${failed} failed`);
  };

  const downloadTemplate = (type) => {
    const t = TEMPLATES[type];
    const csv = t.headers.join(',') + '\n' + t.sample;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template_${type}.csv`; a.click();
  };

  const handleBSFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBsLoading(true); setBsTxns([]); setBsStatus([]); setBsDone({ success:0, failed:0 });
    try {
      const lines = await extractPdfText(file);
      const txns  = parseBoBStatement(lines);
      if (txns.length === 0) {
        toast.error('कोणतेही transactions सापडले नाहीत. PDF format check करा.');
      } else {
        setBsTxns(txns);
        toast.success(`🎉 ${txns.length} transactions सापडले! Review करा.`);
      }
    } catch (err) {
      toast.error('PDF read error: ' + err.message);
    } finally {
      setBsLoading(false);
      e.target.value = '';
    }
  };

  const toggleBSTxn = (i) => {
    setBsTxns(prev => prev.map((t,idx) => idx===i ? {...t, selected:!t.selected} : t));
  };
  const toggleAllBS = (v) => setBsTxns(prev => prev.map(t => ({...t, selected:v})));

  const runBSImport = async () => {
    const selected = bsTxns.filter(t => t.selected);
    if (selected.length === 0) { toast.error('कोणतेही transactions select केले नाहीत'); return; }
    setBsImport(true);
    const statuses = bsTxns.map(t => t.selected ? { state:'pending' } : { state:'skip' });
    setBsStatus(statuses);
    let success = 0, failed = 0;
    for (let i = 0; i < bsTxns.length; i++) {
      if (!bsTxns[i].selected) continue;
      const t = bsTxns[i];
      const amount = t.dr > 0 ? t.dr : t.cr;
      const isWithdrawal = t.dr > 0;
      try {
        await addVoucher({
          voucherType:   'JOURNAL',
          voucherDate:   t.date,
          narration:     t.narration,
          financialYear: fyear,
          entries: [
            {
              ledgerName: isWithdrawal ? contraLedger : bankLedger,
              entryType:  'DEBIT',
              amount
            },
            {
              ledgerName: isWithdrawal ? bankLedger : contraLedger,
              entryType:  'CREDIT',
              amount
            }
          ],
          totalDebit:  amount,
          totalCredit: amount
        });
        statuses[i] = { state:'ok' };
        success++;
      } catch (err) {
        const isDuplicate = err.response?.data?.duplicate === true;
        statuses[i] = isDuplicate 
          ? { state:'skip', err: 'Already imported' }
          : { state:'fail', err: err.response?.data?.error || err.message };
        if (isDuplicate) success++;
        else failed++;
      }
      setBsStatus([...statuses]);
    }
    setBsDone({ success, failed });
    setBsImport(false);
    toast.success(`Import Done! ✅ ${success} saved, ❌ ${failed} failed`);
  };

  const fmtAmt = (n) => n > 0 ? '₹' + n.toLocaleString('en-IN', { minimumFractionDigits:2 }) : '—';

  const rows = rawText ? parseCSV(rawText) : [];
  const TYPE_LABELS = { purchase:'Purchase Invoice', sales:'Sales Invoice', expense:'Expense', customer:'Customer Master', supplier:'Supplier Master', inventory:'Inventory Item' };

  return (
    <div>
      <div className="tabs">
        <div className={`tab ${tab==='bank'?'active':''}`} onClick={()=>setTab('bank')}>🏦 Bank Statement PDF</div>
        <div className={`tab ${tab==='csv'?'active':''}`} onClick={()=>setTab('csv')}>📂 CSV / File Import</div>
        <div className={`tab ${tab==='paste'?'active':''}`} onClick={()=>setTab('paste')}>📋 Copy-Paste Import</div>
        <div className={`tab ${tab==='template'?'active':''}`} onClick={()=>setTab('template')}>📥 Download Templates</div>
        <div className={`tab ${tab==='guide'?'active':''}`} onClick={()=>setTab('guide')}>📖 How To Use</div>
      </div>

      {/* ── CSV IMPORT ── */}
      {tab === 'csv' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📂 Bulk Import from CSV File</span></div>
          <div className="card-body">

            {/* Type selector */}
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,fontWeight:700,color:'#1a4f8a',marginBottom:6,display:'block'}}>Import Type *</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {Object.entries(TYPE_LABELS).map(([k,l]) => (
                  <div key={k} onClick={()=>setType(k)} style={{
                    padding:'6px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:600,
                    background: importType===k ? '#1a4f8a' : '#f0f4ff',
                    color: importType===k ? 'white' : '#1a4f8a',
                    border: `2px solid ${importType===k ? '#1a4f8a' : '#c7d2fe'}`
                  }}>{l}</div>
                ))}
              </div>
            </div>

            {/* Upload box */}
            <div
              onClick={() => fileRef.current.click()}
              style={{border:'3px dashed #c7d2fe',borderRadius:10,padding:'32px',textAlign:'center',cursor:'pointer',background:'#f8faff',marginBottom:16,transition:'all .2s'}}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){fileRef.current.files=e.dataTransfer.files;handleFile({target:{files:[f]}});}}}
            >
              <div style={{fontSize:40,marginBottom:8}}>📂</div>
              <div style={{fontWeight:700,color:'#1a4f8a',fontSize:15}}>Click to upload or Drag & Drop</div>
              <div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>CSV files only (.csv, .txt)</div>
              <div style={{fontSize:11,color:'#cbd5e1',marginTop:2}}>For PDF / Excel: Copy data and use "Copy-Paste Import" tab</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:'none'}} onChange={handleFile}/>

            {/* Preview */}
            {rows.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontWeight:700,color:'#1a4f8a',fontSize:13}}>
                    Preview — {rows.length} rows as <span style={{color:'#7c3aed'}}>{TYPE_LABELS[importType]}</span>
                  </div>
                  <button className="btn btn-primary" onClick={runImport} disabled={importing} style={{padding:'6px 20px'}}>
                    {importing ? '⏳ Importing...' : `✅ Import All ${rows.length} Rows`}
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        {Object.keys(rows[0]).slice(0,7).map(h => <th key={h}>{h}</th>)}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i}>
                          <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                          {Object.values(row).slice(0,7).map((v,j) => (
                            <td key={j} style={{fontSize:12,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v||'—'}</td>
                          ))}
                          <td>
                            {!status[i] && <span style={{color:'#94a3b8',fontSize:11}}>⏸ Waiting</span>}
                            {status[i]?.state==='pending' && <span style={{color:'#f59e0b',fontSize:11}}>⏳ Processing</span>}
                            {status[i]?.state==='ok' && <span style={{color:'#16a34a',fontSize:11,fontWeight:700}}>✅ Saved</span>}
                            {status[i]?.state==='fail' && <span style={{color:'#dc2626',fontSize:10}} title={status[i].err}>❌ Failed</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(done.success > 0 || done.failed > 0) && (
                  <div style={{marginTop:12,padding:'10px 16px',background: done.failed===0?'#d1fae5':'#fef9c3',borderRadius:6,fontSize:13,fontWeight:600}}>
                    Import Complete — ✅ {done.success} saved &nbsp;|&nbsp; ❌ {done.failed} failed
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PASTE IMPORT ── */}
      {tab === 'paste' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📋 Copy-Paste Import (PDF / Excel / Any Source)</span></div>
          <div className="card-body">
            <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#1e40af'}}>
              💡 <strong>PDF मधून data import करायचा?</strong><br/>
              PDF open करा → सगळा data Select करा (Ctrl+A) → Copy करा (Ctrl+C) → खाली Paste करा → Import करा
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:'#1a4f8a',marginBottom:6,display:'block'}}>Import Type</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {Object.entries(TYPE_LABELS).map(([k,l]) => (
                  <div key={k} onClick={()=>setType(k)} style={{
                    padding:'5px 12px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:600,
                    background: importType===k ? '#1a4f8a' : '#f0f4ff',
                    color: importType===k ? 'white' : '#1a4f8a',
                    border: `2px solid ${importType===k ? '#1a4f8a' : '#c7d2fe'}`
                  }}>{l}</div>
                ))}
              </div>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:700,color:'#1a4f8a',marginBottom:6,display:'block'}}>
                CSV Format मध्ये Data Paste करा (First row = headers)
              </label>
              <textarea
                rows={10}
                value={rawText}
                onChange={e => handlePaste(e.target.value)}
                placeholder={`First line madhe headers, nanter data:\n\n${TEMPLATES[importType]?.headers.join(',')}\n${TEMPLATES[importType]?.sample}`}
                style={{width:'100%',border:'2px solid #e2e8f0',borderRadius:6,padding:'10px',fontFamily:'monospace',fontSize:12,boxSizing:'border-box'}}
              />
            </div>

            {rows.length > 0 && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#1a4f8a'}}>{rows.length} rows detected</div>
                  <button className="btn btn-primary" onClick={runImport} disabled={importing}>
                    {importing ? '⏳ Importing...' : `✅ Import ${rows.length} Rows`}
                  </button>
                </div>
                {(done.success > 0 || done.failed > 0) && (
                  <div style={{padding:'10px 16px',background: done.failed===0?'#d1fae5':'#fef9c3',borderRadius:6,fontSize:13,fontWeight:600}}>
                    ✅ {done.success} saved &nbsp;|&nbsp; ❌ {done.failed} failed
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TEMPLATES ── */}
      {tab === 'template' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📥 Download CSV Templates</span></div>
          <div className="card-body">
            <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:8,padding:'14px 18px',marginBottom:20,fontSize:13,color:'#1e40af'}}>
              📥 Template download करा → Excel/Notepad मध्ये data भरा → CSV म्हणून save करा → Import करा<br/>
              <span style={{fontSize:11,opacity:.8}}>Excel मध्ये: File → Save As → CSV (Comma delimited)</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <div key={key} style={{background:'white',border:'2px solid #e2e8f0',borderRadius:8,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.05)'}}>
                  <div style={{fontWeight:700,color:'#1a4f8a',marginBottom:6,fontSize:14}}>
                    {key==='purchase'?'🛒':key==='sales'?'💰':key==='expense'?'🧾':key==='customer'?'👤':key==='supplier'?'🏭':'📦'} {t.name}
                  </div>
                  <div style={{fontSize:11,color:'#64748b',marginBottom:10,lineHeight:1.6}}>
                    <strong>Columns:</strong><br/>
                    {t.headers.join(', ')}
                  </div>
                  <div style={{background:'#f8fafc',borderRadius:4,padding:'6px 8px',fontSize:10,fontFamily:'monospace',color:'#475569',marginBottom:10,overflow:'auto'}}>
                    {t.sample.split('\n')[0].substring(0,60)}...
                  </div>
                  <button className="btn btn-primary" style={{width:'100%',fontSize:12}} onClick={()=>downloadTemplate(key)}>
                    ⬇️ Download Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GUIDE ── */}
      {tab === 'guide' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📖 Import Guide — Step by Step</span></div>
          <div className="card-body">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              {[
                {
                  title:'📂 CSV File Import',
                  color:'#1a4f8a',
                  steps:[
                    'Templates tab मधून CSV template download करा',
                    'Excel / Google Sheets मध्ये data भरा',
                    '"CSV (Comma delimited)" format मध्ये save करा',
                    'CSV Import tab मध्ये file upload करा',
                    'Type select करा (auto-detect होतं)',
                    '"Import All Rows" click करा'
                  ]
                },
                {
                  title:'📋 PDF / Any Source Import',
                  color:'#7c3aed',
                  steps:[
                    'PDF / Excel / Tally data open करा',
                    'सगळा data select करा (Ctrl+A)',
                    'Copy करा (Ctrl+C)',
                    'Copy-Paste Import tab उघडा',
                    'Text box मध्ये Paste करा (Ctrl+V)',
                    'Type select करून Import करा'
                  ]
                },
                {
                  title:'✅ Supported Data Types',
                  color:'#16a34a',
                  steps:[
                    'Purchase Invoices — Supplier + Items + GST',
                    'Sales Invoices — Customer + Items + GST',
                    'Expenses — Head-wise with payment mode',
                    'Customer Master — Bulk add customers',
                    'Supplier Master — Bulk add suppliers',
                    'Inventory Items — Items with rates & stock'
                  ]
                },
                {
                  title:'⚠️ Important Notes',
                  color:'#d97706',
                  steps:[
                    'Date format: DD/MM/YYYY किंवा YYYY-MM-DD',
                    'Amount: numbers only, ₹ sign नको',
                    'GST Rate: number (5, 12, 18, 28)',
                    'Import झाल्यावर accounting auto-post होतं',
                    'Import झाल्यावर stock automatic update होतो',
                    'Failed rows manually entry करा'
                  ]
                }
              ].map((section, i) => (
                <div key={i} style={{background:'white',border:`2px solid ${section.color}20`,borderTop:`4px solid ${section.color}`,borderRadius:8,padding:'16px'}}>
                  <div style={{fontWeight:700,color:section.color,marginBottom:12,fontSize:14}}>{section.title}</div>
                  {section.steps.map((s,j) => (
                    <div key={j} style={{display:'flex',gap:8,marginBottom:6,fontSize:13}}>
                      <span style={{background:section.color,color:'white',borderRadius:'50%',width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,flexShrink:0,fontWeight:700}}>{j+1}</span>
                      <span style={{color:'#475569'}}>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BANK STATEMENT PDF IMPORT ── */}
      {tab === 'bank' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏦 Bank Statement PDF Import</span>
            <span style={{fontSize:12,color:'#64748b',marginLeft:12}}>Bank of Baroda / कोणताही bank statement PDF</span>
          </div>
          <div className="card-body">

            {/* Settings row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#1a4f8a',display:'block',marginBottom:4}}>Bank Ledger Name *</label>
                <input value={bankLedger} onChange={e=>setBankLedger(e.target.value)}
                  style={{width:'100%',padding:'7px 10px',border:'2px solid #c7d2fe',borderRadius:6,fontSize:13,boxSizing:'border-box'}}
                  placeholder="Bank of Baroda" />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#1a4f8a',display:'block',marginBottom:4}}>Contra Ledger (Default) *</label>
                <input value={contraLedger} onChange={e=>setContraLedger(e.target.value)}
                  style={{width:'100%',padding:'7px 10px',border:'2px solid #c7d2fe',borderRadius:6,fontSize:13,boxSizing:'border-box'}}
                  placeholder="Suspense Account" />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:'#1a4f8a',display:'block',marginBottom:4}}>Financial Year</label>
                <select value={fyear} onChange={e=>handleFyearChange(e.target.value)}
                  style={{width:'100%',padding:'7px 10px',border:'2px solid #c7d2fe',borderRadius:6,fontSize:13,boxSizing:'border-box'}}>
                  {fyList.filter(f=>f.value!=='ALL').map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            {/* Info box */}
            <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#1e40af'}}>
              💡 <strong>कसे वापरायचे:</strong> खालील बटणावर click करा → Bank Statement PDF select करा → Automatic parse होईल → Preview check करा → Import करा<br/>
              <span style={{fontSize:11,opacity:.8}}>📌 प्रत्येक transaction एक Accounting Journal Voucher म्हणून save होईल. Contra Ledger = "Suspense Account" (नंतर assign करता येईल).</span>
            </div>

            {/* Upload button */}
            {bsTxns.length === 0 && (
              <div
                onClick={() => bsFileRef.current.click()}
                style={{border:'3px dashed #6366f1',borderRadius:12,padding:'40px',textAlign:'center',cursor:'pointer',
                  background: bsLoading ? '#f0f4ff' : 'linear-gradient(135deg,#f0f4ff,#ede9fe)',marginBottom:16,transition:'all .2s'}}
              >
                {bsLoading ? (
                  <>
                    <div style={{fontSize:40,marginBottom:8}}>⏳</div>
                    <div style={{fontWeight:700,color:'#6366f1',fontSize:15}}>PDF Parse करत आहे... थोडे थांबा</div>
                    <div style={{fontSize:12,color:'#94a3b8',marginTop:4}}>43 pages असतील तर 10-15 seconds लागतात</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:48,marginBottom:8}}>🏦</div>
                    <div style={{fontWeight:800,color:'#4f46e5',fontSize:16}}>Bank Statement PDF Upload करा</div>
                    <div style={{fontSize:13,color:'#64748b',marginTop:6}}>Bank of Baroda, SBI, HDFC, ICICI — कोणताही bank</div>
                    <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>PDF format (.pdf) only</div>
                  </>
                )}
              </div>
            )}
            <input ref={bsFileRef} type="file" accept=".pdf" style={{display:'none'}} onChange={handleBSFile} />

            {/* Transactions preview table */}
            {bsTxns.length > 0 && (
              <div>
                {/* Summary cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                  {[
                    { label:'Total Transactions', value: bsTxns.length, color:'#1a4f8a' },
                    { label:'Selected', value: bsTxns.filter(t=>t.selected).length, color:'#7c3aed' },
                    { label:'Total Withdrawal (DR)', value:'₹'+bsTxns.filter(t=>t.selected).reduce((s,t)=>s+t.dr,0).toLocaleString('en-IN',{minimumFractionDigits:2}), color:'#dc2626' },
                    { label:'Total Deposit (CR)',    value:'₹'+bsTxns.filter(t=>t.selected).reduce((s,t)=>s+t.cr,0).toLocaleString('en-IN',{minimumFractionDigits:2}), color:'#16a34a' }
                  ].map((c,i)=>(
                    <div key={i} style={{background:'white',border:`2px solid ${c.color}20`,borderLeft:`4px solid ${c.color}`,borderRadius:8,padding:'10px 14px'}}>
                      <div style={{fontSize:11,color:'#64748b',marginBottom:2}}>{c.label}</div>
                      <div style={{fontSize:16,fontWeight:800,color:c.color}}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Action buttons */}
                <div style={{display:'flex',gap:8,marginBottom:10,alignItems:'center',flexWrap:'wrap'}}>
                  <button className="btn btn-primary" onClick={runBSImport} disabled={bsImporting||bsTxns.filter(t=>t.selected).length===0}
                    style={{background:'#4f46e5',fontSize:13}}>
                    {bsImporting ? '⏳ Importing...' : `✅ Import ${bsTxns.filter(t=>t.selected).length} Vouchers`}
                  </button>
                  <button onClick={()=>toggleAllBS(true)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #c7d2fe',background:'white',fontSize:12,cursor:'pointer'}}>☑️ All Select</button>
                  <button onClick={()=>toggleAllBS(false)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #c7d2fe',background:'white',fontSize:12,cursor:'pointer'}}>⬜ Deselect All</button>
                  <button onClick={()=>{setBsTxns([]);setBsStatus([]);setBsDone({success:0,failed:0});}}
                    style={{padding:'6px 12px',borderRadius:6,border:'1px solid #fca5a5',background:'#fff5f5',fontSize:12,cursor:'pointer',color:'#dc2626'}}>🗑️ Clear</button>
                  <span style={{fontSize:12,color:'#64748b',marginLeft:'auto'}}>
                    {bsDone.success > 0 && <span style={{color:'#16a34a',fontWeight:700}}>✅ {bsDone.success} saved </span>}
                    {bsDone.failed > 0 && <span style={{color:'#dc2626',fontWeight:700}}>❌ {bsDone.failed} failed</span>}
                  </span>
                </div>

                {/* Table */}
                <div className="table-container" style={{maxHeight:480,overflowY:'auto'}}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{width:36}}>
                          <input type="checkbox" checked={bsTxns.every(t=>t.selected)} onChange={e=>toggleAllBS(e.target.checked)} />
                        </th>
                        <th>#</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Narration</th>
                        <th style={{textAlign:'right',color:'#dc2626'}}>Withdrawal (DR)</th>
                        <th style={{textAlign:'right',color:'#16a34a'}}>Deposit (CR)</th>
                        <th style={{textAlign:'right'}}>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bsTxns.map((t,i) => (
                        <tr key={i} style={{opacity: t.selected ? 1 : 0.4, background: bsStatus[i]?.state==='ok'?'#f0fdf4':bsStatus[i]?.state==='fail'?'#fff5f5':''}}>
                          <td><input type="checkbox" checked={!!t.selected} onChange={()=>toggleBSTxn(i)} /></td>
                          <td style={{fontSize:11,color:'#94a3b8'}}>{i+1}</td>
                          <td style={{fontSize:12,whiteSpace:'nowrap'}}>{t.displayDate}</td>
                          <td>
                            <span style={{
                              fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:10,
                              background: t.txnType==='UPI'?'#ede9fe':t.txnType==='NEFT'?'#dbeafe':t.txnType==='CASH'?'#dcfce7':'#f1f5f9',
                              color:      t.txnType==='UPI'?'#7c3aed':t.txnType==='NEFT'?'#1d4ed8':t.txnType==='CASH'?'#16a34a':'#475569'
                            }}>{t.txnType}</span>
                          </td>
                          <td style={{fontSize:11,maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={t.narration}>{t.narration}</td>
                          <td style={{textAlign:'right',fontSize:12,fontWeight:600,color:'#dc2626'}}>{fmtAmt(t.dr)}</td>
                          <td style={{textAlign:'right',fontSize:12,fontWeight:600,color:'#16a34a'}}>{fmtAmt(t.cr)}</td>
                          <td style={{textAlign:'right',fontSize:11,color:'#475569'}}>{fmtAmt(t.balance)}</td>
                          <td style={{fontSize:11}}>
                            {!bsStatus[i] && <span style={{color:'#94a3b8'}}>⏸</span>}
                            {bsStatus[i]?.state==='pending' && <span style={{color:'#f59e0b'}}>⏳</span>}
                            {bsStatus[i]?.state==='ok'      && <span style={{color:'#16a34a',fontWeight:700}}>✅</span>}
                            {bsStatus[i]?.state==='fail'    && <span style={{color:'#dc2626'}} title={bsStatus[i].err}>❌</span>}
                            {bsStatus[i]?.state==='skip' && bsStatus[i]?.err==='Already imported' && <span style={{color:'#f59e0b'}} title="Already imported">⚠️ Duplicate</span>}
                            {bsStatus[i]?.state==='skip' && !bsStatus[i]?.err && <span style={{color:'#94a3b8'}}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(bsDone.success > 0 || bsDone.failed > 0) && (
                  <div style={{marginTop:12,padding:'12px 16px',background:bsDone.failed===0?'#d1fae5':'#fef9c3',borderRadius:8,fontSize:13,fontWeight:600}}>
                    🎉 Import Complete! ✅ {bsDone.success} Journal Vouchers created &nbsp;|&nbsp; ❌ {bsDone.failed} failed
                    <div style={{fontSize:11,color:'#64748b',marginTop:4,fontWeight:400}}>
                      Accounting → Vouchers मध्ये जाऊन import झालेले vouchers check करा.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
