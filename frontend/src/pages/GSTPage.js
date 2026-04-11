import React, { useState, useEffect } from 'react';
import { getGSTR3B, getITCReport, getGstConfigurations, addGstConfiguration, updateGstConfiguration, deleteGstConfiguration, getGstLiability, getGSTR1, getCompanySettings } from '../services/api';
import { printReport } from '../utils/printUtils';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

const fmt  = n => '₹' + (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const fmtN = n =>       (Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});

export default function GSTPage() {
  const [tab, setTab]          = useState('gstr1');
  const [fromDate, setFrom]    = useState('');
  const [toDate, setTo]        = useState('');
  const [gstr1, setGSTR1]      = useState(null);
  const [gstr3b, setG3b]       = useState(null);
  const [itc, setITC]          = useState(null);
  const [liability, setLiab]   = useState(null);
  const [configs, setConfigs]  = useState([]);
  const [showModal, setModal]  = useState(false);
  const [form, setForm]        = useState({});
  const [loading, setLoading]  = useState(false);
  const [company, setCompany]  = useState({});
  const [gstr1Tab, setG1Tab]   = useState('b2b');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editConfigId,  setEditConfigId]  = useState(null);

  useEffect(() => {
    getCompanySettings().then(r => setCompany(r.data||{})).catch(()=>{});
    getGstConfigurations().then(r => setConfigs(r.data||[])).catch(()=>{});
  }, []);

  const fetchGSTR1 = async () => {
    if (!fromDate||!toDate) { toast.error('Select date range'); return; }
    setLoading(true);
    try { const r = await getGSTR1({fromDate, toDate}); setGSTR1(r.data); toast.success('GSTR-1 loaded!'); }
    catch { toast.error('Failed to fetch GSTR-1'); }
    setLoading(false);
  };

  const fetchGSTR3B = async () => {
    if (!fromDate||!toDate) { toast.error('Select date range'); return; }
    setLoading(true);
    try { const r = await getGSTR3B(fromDate, toDate); setG3b(r.data); }
    catch { toast.error('Failed to fetch GSTR-3B'); }
    setLoading(false);
  };

  const fetchITC = async () => {
    if (!fromDate||!toDate) { toast.error('Select date range'); return; }
    setLoading(true);
    try { const r = await getITCReport(fromDate, toDate); setITC(r.data); }
    catch { toast.error('Failed to fetch'); }
    setLoading(false);
  };

  const fetchLiability = async () => {
    if (!fromDate||!toDate) { toast.error('Select date range'); return; }
    setLoading(true);
    try { const res = await getGstLiability(fromDate, toDate); setLiab(res.data); }
    catch { toast.error('Failed to fetch tax liability'); }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!form.hsnCode?.trim()) { toast.error('HSN Code required'); return; }
    if (form.gstRate === undefined) { toast.error('GST Rate required'); return; }
    try {
      if (editConfigId) {
        await updateGstConfiguration(editConfigId, {...form, active:true});
        toast.success('GST config updated!');
      } else {
        await addGstConfiguration({...form, active:true});
        toast.success('GST config saved!');
      }
      setModal(false); setForm({}); setEditConfigId(null);
      getGstConfigurations().then(r=>setConfigs(r.data||[]));
    } catch { toast.error('Failed'); }
  };

  const exportCSV = (rows, filename) => {
    const csv = rows.map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    toast.success('CSV exported!');
  };

  const exportGSTR1JSON = () => {
    if (!gstr1) return;
    const obj = {
      gstin: company.gstin||'YOUR_GSTIN',
      fp: (fromDate||'').replace(/-/g,'').substring(0,6),
      b2b: (gstr1.b2b||[]).map(i=>({ctin:i.customerGstin, inv:[{inum:i.invoiceNumber,idt:i.invoiceDate,val:i.grandTotal,pos:company.state||'27',rchrg:'N',inv_typ:'R',itms:[{num:1,itm_det:{txval:i.taxableAmount,rt:18,camt:i.cgst,samt:i.sgst,iamt:i.igst,csamt:0}}]}]})),
      b2cs: (gstr1.b2c||[]).map(i=>({typ:'OE',pos:company.state||'27',rt:18,txval:i.taxableAmount,iamt:i.igst,camt:i.cgst,samt:i.sgst,csamt:0})),
      hsn: {data:(gstr1.hsnSummary||[]).map(h=>({num:1,hsn_sc:h.hsnCode,desc:'Goods',uqc:'NOS',qty:h.totalQty,txval:h.taxableValue,camt:h.cgst,samt:h.sgst,iamt:h.igst}))}
    };
    const blob = new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `GSTR1_${(fromDate||'').replace(/-/g,'')}.json`; a.click();
    toast.success('GSTR-1 JSON exported! Upload at gstn.gov.in');
  };

  const DateBar = ({ onFetch, label }) => (
    <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}>
      <label style={{fontSize:12,fontWeight:600,color:'#64748b'}}>From:</label>
      <input type="date" value={fromDate} onChange={e=>setFrom(e.target.value)} style={{height:34,border:'1px solid #e2e8f0',borderRadius:6,padding:'0 8px'}}/>
      <label style={{fontSize:12,fontWeight:600,color:'#64748b'}}>To:</label>
      <input type="date" value={toDate} onChange={e=>setTo(e.target.value)} style={{height:34,border:'1px solid #e2e8f0',borderRadius:6,padding:'0 8px'}}/>
      <button className="btn btn-primary" onClick={onFetch} disabled={loading} style={{height:34}}>
        {loading ? '⏳ Loading...' : label}
      </button>
    </div>
  );

  const taxRow = (label, cgst, sgst, igst, isTotal=false, color='inherit') => (
    <tr style={{background:isTotal?'#f0f4ff':'inherit',fontWeight:isTotal?700:'normal',borderTop:isTotal?'2px solid #1a4f8a':'none'}}>
      <td style={{padding:'8px 16px',color}}>{label}</td>
      <td style={{padding:'8px 16px',textAlign:'right',color}}>{fmt(cgst)}</td>
      <td style={{padding:'8px 16px',textAlign:'right',color}}>{fmt(sgst)}</td>
      <td style={{padding:'8px 16px',textAlign:'right',color}}>{fmt(igst)}</td>
      <td style={{padding:'8px 16px',textAlign:'right',color,fontWeight:700}}>{fmt((cgst||0)+(sgst||0)+(igst||0))}</td>
    </tr>
  );

  const StatCard = ({label, value, color='#1a4f8a'}) => (
    <div style={{background:'white',border:`2px solid ${color}20`,borderTop:`4px solid ${color}`,borderRadius:8,padding:'12px 16px',minWidth:130}}>
      <div style={{fontSize:11,color:'#64748b',marginBottom:4}}>{label}</div>
      <div style={{fontWeight:700,color,fontSize:14}}>{value}</div>
    </div>
  );

  const Empty = ({icon, text}) => (
    <div style={{textAlign:'center',padding:64,color:'#94a3b8'}}>
      <div style={{fontSize:48,marginBottom:12}}>{icon}</div>
      <div style={{fontSize:15,fontWeight:600,marginBottom:6}}>{text}</div>
      <div style={{fontSize:13}}>Select date range and click Generate</div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🧾 GST Reports</h1>
        <p className="page-subtitle">GSTR-1 • GSTR-3B • ITC • Tax Liability • Configuration</p>
      </div>

      <div className="tabs">
        {[['gstr1','📤 GSTR-1'],['gstr3b','📋 GSTR-3B'],['itc','🟢 ITC Report'],['liability','⚠️ Tax Liability'],['config','⚙️ GST Config']].map(([k,l])=>(
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ══ GSTR-1 ══ */}
      {tab==='gstr1' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📤 GSTR-1 — Outward Supplies</span>
            {gstr1 && (
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>exportCSV(
                  [['Invoice#','Date','Customer','GSTIN','Taxable','CGST','SGST','IGST','Total','Type'],
                   ...[...(gstr1.b2b||[]),...(gstr1.b2c||[])].map(i=>[i.invoiceNumber,i.invoiceDate,i.customerName,i.customerGstin||'B2C',i.taxableAmount||0,i.cgst||0,i.sgst||0,i.igst||0,i.grandTotal||0,i.customerGstin?'B2B':'B2C'])],
                  `GSTR1_${fromDate}_${toDate}.csv`)}>📥 CSV</button>
                <button className="btn btn-outline" onClick={exportGSTR1JSON} style={{fontSize:12,color:'#16a34a',borderColor:'#16a34a'}}>📋 GSTN JSON</button>
                <button className="btn btn-outline" onClick={()=>printReport({
                  title:'GSTR-1 Outward Supplies',subtitle:`Period: ${fromDate} to ${toDate}`,
                  summaryCards:[{label:'Total Invoices',value:gstr1.totalInvoices||0},{label:'B2B',value:gstr1.b2bCount||0,color:'#7c3aed'},{label:'B2C',value:gstr1.b2cCount||0,color:'#d97706'},{label:'Total GST',value:fmt(gstr1.totalGst),color:'#dc2626'},{label:'Grand Total',value:fmt(gstr1.grandTotal),color:'#16a34a'}],
                  tableHeaders:[{label:'Invoice#'},{label:'Date'},{label:'Customer'},{label:'GSTIN'},{label:'Taxable',right:true},{label:'GST',right:true},{label:'Total',right:true},{label:'Type'}],
                  tableRows:[...(gstr1.b2b||[]),...(gstr1.b2c||[])].map(i=>[{value:i.invoiceNumber},{value:i.invoiceDate},{value:i.customerName},{value:i.customerGstin||'Unregistered'},{value:fmt(i.taxableAmount),right:true},{value:fmt((i.cgst||0)+(i.sgst||0)+(i.igst||0)),right:true},{value:fmt(i.grandTotal),right:true},{value:i.customerGstin?'B2B':'B2C'}]),
                  footerNote:`B2B: ${gstr1.b2bCount} | B2C: ${gstr1.b2cCount} | Total GST: ${fmt(gstr1.totalGst)}`
                })} style={{fontSize:12,color:'#7c3aed',borderColor:'#7c3aed'}}>🖨️ Print</button>
              </div>
            )}
          </div>
          <div className="card-body">
            <DateBar onFetch={fetchGSTR1} label="Generate GSTR-1"/>
            {gstr1 ? (
              <>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
                  <StatCard label="Total Invoices" value={gstr1.totalInvoices||0}/>
                  <StatCard label="B2B (GST Registered)" value={gstr1.b2bCount||0} color="#7c3aed"/>
                  <StatCard label="B2C (Unregistered)" value={gstr1.b2cCount||0} color="#d97706"/>
                  <StatCard label="Taxable Value" value={fmt(gstr1.totalTaxableValue)} color="#0891b2"/>
                  <StatCard label="Total GST" value={fmt(gstr1.totalGst)} color="#dc2626"/>
                  <StatCard label="Grand Total" value={fmt(gstr1.grandTotal)} color="#16a34a"/>
                </div>

                <div style={{display:'flex',gap:0,marginBottom:14,borderBottom:'2px solid #e2e8f0'}}>
                  {[['b2b',`🏢 B2B (${gstr1.b2bCount||0})`],['b2c',`👤 B2C (${gstr1.b2cCount||0})`],['hsn','📦 HSN Summary']].map(([k,l])=>(
                    <div key={k} onClick={()=>setG1Tab(k)}
                      style={{padding:'8px 18px',cursor:'pointer',fontSize:13,fontWeight:gstr1Tab===k?700:500,
                        color:gstr1Tab===k?'#1a4f8a':'#64748b',
                        borderBottom:gstr1Tab===k?'2px solid #1a4f8a':'2px solid transparent',marginBottom:-2}}>
                      {l}
                    </div>
                  ))}
                </div>

                {gstr1Tab==='b2b' && (
                  <div className="table-container">
                    {(gstr1.b2b||[]).length===0
                      ? <div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No B2B invoices in this period</div>
                      : <table>
                          <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>GSTIN</th><th className="text-right">Taxable</th><th className="text-right">CGST</th><th className="text-right">SGST</th><th className="text-right">IGST</th><th className="text-right">Grand Total</th></tr></thead>
                          <tbody>
                            {(gstr1.b2b||[]).map((inv,i)=>(
                              <tr key={i}>
                                <td style={{fontWeight:600,fontSize:12}}>{inv.invoiceNumber}</td>
                                <td style={{fontSize:12}}>{inv.invoiceDate}</td>
                                <td>{inv.customerName}</td>
                                <td style={{fontSize:11,fontFamily:'monospace',color:'#7c3aed'}}>{inv.customerGstin}</td>
                                <td className="text-right">{fmt(inv.taxableAmount)}</td>
                                <td className="text-right" style={{color:'#7c3aed'}}>{fmt(inv.cgst)}</td>
                                <td className="text-right" style={{color:'#2563eb'}}>{fmt(inv.sgst)}</td>
                                <td className="text-right" style={{color:'#0891b2'}}>{fmt(inv.igst)}</td>
                                <td className="text-right" style={{fontWeight:700,color:'#1a4f8a'}}>{fmt(inv.grandTotal)}</td>
                              </tr>
                            ))}
                            <tr style={{fontWeight:700,background:'#f0f4ff',borderTop:'2px solid #1a4f8a'}}>
                              <td colSpan={4}>TOTAL B2B ({gstr1.b2bCount})</td>
                              <td className="text-right">{fmt((gstr1.b2b||[]).reduce((s,i)=>s+(i.taxableAmount||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2b||[]).reduce((s,i)=>s+(i.cgst||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2b||[]).reduce((s,i)=>s+(i.sgst||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2b||[]).reduce((s,i)=>s+(i.igst||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2b||[]).reduce((s,i)=>s+(i.grandTotal||0),0))}</td>
                            </tr>
                          </tbody>
                        </table>
                    }
                  </div>
                )}

                {gstr1Tab==='b2c' && (
                  <div className="table-container">
                    {(gstr1.b2c||[]).length===0
                      ? <div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No B2C invoices in this period</div>
                      : <table>
                          <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th className="text-right">Taxable</th><th className="text-right">CGST</th><th className="text-right">SGST</th><th className="text-right">IGST</th><th className="text-right">Grand Total</th></tr></thead>
                          <tbody>
                            {(gstr1.b2c||[]).map((inv,i)=>(
                              <tr key={i}>
                                <td style={{fontWeight:600,fontSize:12}}>{inv.invoiceNumber}</td>
                                <td style={{fontSize:12}}>{inv.invoiceDate}</td>
                                <td>{inv.customerName}</td>
                                <td className="text-right">{fmt(inv.taxableAmount)}</td>
                                <td className="text-right" style={{color:'#7c3aed'}}>{fmt(inv.cgst)}</td>
                                <td className="text-right" style={{color:'#2563eb'}}>{fmt(inv.sgst)}</td>
                                <td className="text-right" style={{color:'#0891b2'}}>{fmt(inv.igst)}</td>
                                <td className="text-right" style={{fontWeight:700,color:'#1a4f8a'}}>{fmt(inv.grandTotal)}</td>
                              </tr>
                            ))}
                            <tr style={{fontWeight:700,background:'#f0f4ff',borderTop:'2px solid #1a4f8a'}}>
                              <td colSpan={3}>TOTAL B2C ({gstr1.b2cCount})</td>
                              <td className="text-right">{fmt((gstr1.b2c||[]).reduce((s,i)=>s+(i.taxableAmount||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2c||[]).reduce((s,i)=>s+(i.cgst||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2c||[]).reduce((s,i)=>s+(i.sgst||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2c||[]).reduce((s,i)=>s+(i.igst||0),0))}</td>
                              <td className="text-right">{fmt((gstr1.b2c||[]).reduce((s,i)=>s+(i.grandTotal||0),0))}</td>
                            </tr>
                          </tbody>
                        </table>
                    }
                  </div>
                )}

                {gstr1Tab==='hsn' && (
                  <div className="table-container">
                    {(gstr1.hsnSummary||[]).length===0
                      ? <div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No HSN data</div>
                      : <table>
                          <thead><tr><th>HSN Code</th><th className="text-right">Total Qty</th><th className="text-right">Taxable Value</th><th className="text-right">CGST</th><th className="text-right">SGST</th><th className="text-right">IGST</th><th className="text-right">Total Tax</th></tr></thead>
                          <tbody>
                            {(gstr1.hsnSummary||[]).map((h,i)=>(
                              <tr key={i}>
                                <td style={{fontWeight:700,fontFamily:'monospace',color:'#7c3aed'}}>{h.hsnCode}</td>
                                <td className="text-right">{fmtN(h.totalQty)}</td>
                                <td className="text-right">{fmt(h.taxableValue)}</td>
                                <td className="text-right" style={{color:'#7c3aed'}}>{fmt(h.cgst)}</td>
                                <td className="text-right" style={{color:'#2563eb'}}>{fmt(h.sgst)}</td>
                                <td className="text-right" style={{color:'#0891b2'}}>{fmt(h.igst)}</td>
                                <td className="text-right" style={{fontWeight:700,color:'#1a4f8a'}}>{fmt(h.totalTax)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    }
                  </div>
                )}

                <div style={{marginTop:14,padding:'10px 14px',background:'#f0fdf4',border:'1px solid #86efac',borderRadius:6,fontSize:12,color:'#166534'}}>
                  💡 <strong>GSTR-1 Filing:</strong> Export GSTN JSON → Login <strong>gstn.gov.in</strong> → Returns → GSTR-1 → Upload JSON. Due: 11th of next month.
                </div>
              </>
            ) : <Empty icon="📤" text="Generate GSTR-1 Report"/>}
          </div>
        </div>
      )}

      {/* ══ GSTR-3B ══ */}
      {tab==='gstr3b' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 GSTR-3B Summary Report</span>
            {gstr3b && (
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>exportCSV([['Field','Value'],['Period',gstr3b.period||''],['Total Sales',gstr3b.totalSales||0],['Total Purchases',gstr3b.totalPurchases||0],['Output CGST',gstr3b.outputTax?.cgst||0],['Output SGST',gstr3b.outputTax?.sgst||0],['Net Tax Payable',gstr3b.netTaxLiability?.total||0]],'GSTR3B.csv')}>📥 CSV</button>
                <button className="btn btn-outline" style={{fontSize:12,color:'#7c3aed',borderColor:'#7c3aed'}} onClick={()=>printReport({
                  title:'GSTR-3B Summary',subtitle:`Period: ${gstr3b?.period||''}`,
                  summaryCards:[{label:'Output GST',value:fmt((gstr3b.outputTax?.cgst||0)+(gstr3b.outputTax?.sgst||0)+(gstr3b.outputTax?.igst||0)),color:'#dc2626'},{label:'Input ITC',value:fmt((gstr3b.inputTaxCredit?.cgst||0)+(gstr3b.inputTaxCredit?.sgst||0)+(gstr3b.inputTaxCredit?.igst||0)),color:'#16a34a'},{label:'Net Payable',value:fmt(gstr3b.netTaxLiability?.total),color:'#1a4f8a'}],
                  tableHeaders:[{label:'Section'},{label:'CGST',right:true},{label:'SGST',right:true},{label:'IGST',right:true},{label:'Total',right:true}],
                  tableRows:[
                    [{value:'3.1 Output Tax (Sales)',style:'color:#dc2626'},{value:fmt(gstr3b.outputTax?.cgst),right:true},{value:fmt(gstr3b.outputTax?.sgst),right:true},{value:fmt(gstr3b.outputTax?.igst),right:true},{value:fmt((gstr3b.outputTax?.cgst||0)+(gstr3b.outputTax?.sgst||0)+(gstr3b.outputTax?.igst||0)),right:true,style:'font-weight:700'}],
                    [{value:'4 Input Tax Credit',style:'color:#16a34a'},{value:fmt(gstr3b.inputTaxCredit?.cgst),right:true},{value:fmt(gstr3b.inputTaxCredit?.sgst),right:true},{value:fmt(gstr3b.inputTaxCredit?.igst),right:true},{value:fmt((gstr3b.inputTaxCredit?.cgst||0)+(gstr3b.inputTaxCredit?.sgst||0)+(gstr3b.inputTaxCredit?.igst||0)),right:true,style:'font-weight:700'}],
                    [{value:'6.1 Net GST Payable',style:'font-weight:700;color:#1a4f8a'},{value:fmt(gstr3b.netTaxLiability?.cgst),right:true,style:'font-weight:700'},{value:fmt(gstr3b.netTaxLiability?.sgst),right:true,style:'font-weight:700'},{value:fmt(gstr3b.netTaxLiability?.igst),right:true,style:'font-weight:700'},{value:fmt(gstr3b.netTaxLiability?.total),right:true,style:'font-weight:800;color:#1a4f8a;font-size:14px'}],
                  ]
                })}>🖨️ Print</button>
              </div>
            )}
          </div>
          <div className="card-body">
            <DateBar onFetch={fetchGSTR3B} label="Generate GSTR-3B"/>
            {gstr3b ? (
              <>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
                  <StatCard label="Total Sales (Taxable)" value={fmt(gstr3b.totalSales)}/>
                  <StatCard label="Total Purchases" value={fmt(gstr3b.totalPurchases)} color="#d97706"/>
                  <StatCard label="Output Tax" value={fmt((gstr3b.outputTax?.cgst||0)+(gstr3b.outputTax?.sgst||0)+(gstr3b.outputTax?.igst||0))} color="#dc2626"/>
                  <StatCard label="Net Tax Payable" value={fmt(gstr3b.netTaxLiability?.total)} color={gstr3b.netTaxLiability?.total>=0?'#dc2626':'#16a34a'}/>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#1a4f8a',color:'white'}}>
                    <th style={{padding:'10px 16px',textAlign:'left'}}>Section</th>
                    <th style={{padding:'10px 16px',textAlign:'right'}}>CGST</th>
                    <th style={{padding:'10px 16px',textAlign:'right'}}>SGST</th>
                    <th style={{padding:'10px 16px',textAlign:'right'}}>IGST</th>
                    <th style={{padding:'10px 16px',textAlign:'right'}}>Total</th>
                  </tr></thead>
                  <tbody>
                    {taxRow('3.1 Output Tax (Sales)',gstr3b.outputTax?.cgst,gstr3b.outputTax?.sgst,gstr3b.outputTax?.igst,false,'#dc2626')}
                    {taxRow('4 Input Tax Credit (ITC)',gstr3b.inputTaxCredit?.cgst,gstr3b.inputTaxCredit?.sgst,gstr3b.inputTaxCredit?.igst,false,'#16a34a')}
                    {taxRow('6.1 Net GST Payable',gstr3b.netTaxLiability?.cgst,gstr3b.netTaxLiability?.sgst,gstr3b.netTaxLiability?.igst,true,'#1a4f8a')}
                  </tbody>
                </table>
              </>
            ) : <Empty icon="📋" text="Generate GSTR-3B Report"/>}
          </div>
        </div>
      )}

      {/* ══ ITC REPORT ══ */}
      {tab==='itc' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🟢 Input Tax Credit (ITC) Report</span>
            {itc && <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>printReport({
              title:'Input Tax Credit (ITC) Report',subtitle:`Period: ${fromDate} to ${toDate}`,
              summaryCards:[{label:'Total Purchases',value:itc.invoices?.length||0},{label:'Total ITC Available',value:fmt(itc.totalITC),color:'#16a34a'}],
              tableHeaders:[{label:'Invoice#'},{label:'Supplier'},{label:'Date'},{label:'Taxable',right:true},{label:'CGST',right:true},{label:'SGST',right:true},{label:'IGST',right:true},{label:'Total ITC',right:true}],
              tableRows:(itc.invoices||[]).map(i=>[{value:i.invoiceNumber},{value:i.supplierName},{value:i.invoiceDate},{value:fmt(i.subTotal),right:true},{value:fmt(i.totalCgst),right:true},{value:fmt(i.totalSgst),right:true},{value:fmt(i.totalIgst),right:true},{value:fmt(i.totalGst),right:true,style:'font-weight:700;color:#16a34a'}]),
              footerNote:`Total ITC: ${fmt(itc.totalITC)}`
            })}>🖨️ Print</button>}
          </div>
          <div className="card-body">
            <DateBar onFetch={fetchITC} label="Generate ITC Report"/>
            {itc ? (
              <>
                <div style={{display:'flex',gap:10,marginBottom:16}}>
                  <StatCard label="Total Purchases" value={itc.invoices?.length||0} color="#64748b"/>
                  <StatCard label="Total ITC Available" value={fmt(itc.totalITC)} color="#16a34a"/>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Invoice#</th><th>Supplier</th><th>Date</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total ITC</th></tr></thead>
                    <tbody>
                      {itc.invoices?.map(inv=>(
                        <tr key={inv.id}>
                          <td style={{fontSize:12,fontWeight:600}}>{inv.invoiceNumber}</td>
                          <td>{inv.supplierName}</td><td style={{fontSize:12}}>{inv.invoiceDate}</td>
                          <td className="text-right">{fmt(inv.subTotal)}</td>
                          <td className="text-right" style={{color:'#7c3aed'}}>{fmt(inv.totalCgst)}</td>
                          <td className="text-right" style={{color:'#2563eb'}}>{fmt(inv.totalSgst)}</td>
                          <td className="text-right" style={{color:'#0891b2'}}>{fmt(inv.totalIgst)}</td>
                          <td className="text-right" style={{fontWeight:700,color:'#16a34a'}}>{fmt(inv.totalGst)}</td>
                        </tr>
                      ))}
                      <tr style={{fontWeight:700,background:'#f0f4ff',borderTop:'2px solid #1a4f8a'}}>
                        <td colSpan={7}>TOTAL ITC AVAILABLE</td>
                        <td className="text-right" style={{color:'#16a34a',fontSize:14}}>{fmt(itc.totalITC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : <Empty icon="🟢" text="Generate ITC Report"/>}
          </div>
        </div>
      )}

      {/* ══ TAX LIABILITY ══ */}
      {tab==='liability' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚠️ GST Tax Liability Report</span>
            {liability && <button className="btn btn-outline" style={{fontSize:12}} onClick={()=>printReport({
              title:'GST Tax Liability Report',subtitle:`Period: ${liability.period}`,
              tableHeaders:[{label:'Head'},{label:'CGST',right:true},{label:'SGST',right:true},{label:'IGST',right:true},{label:'Total',right:true}],
              tableRows:[
                [{value:'Output Tax (Sales)',style:'color:#dc2626;font-weight:600'},{value:fmt(liability.outputTax?.cgst),right:true},{value:fmt(liability.outputTax?.sgst),right:true},{value:fmt(liability.outputTax?.igst),right:true},{value:fmt((liability.outputTax?.cgst||0)+(liability.outputTax?.sgst||0)+(liability.outputTax?.igst||0)),right:true,style:'font-weight:700'}],
                [{value:'Input Tax Credit',style:'color:#16a34a;font-weight:600'},{value:fmt(liability.inputTaxCredit?.cgst),right:true},{value:fmt(liability.inputTaxCredit?.sgst),right:true},{value:fmt(liability.inputTaxCredit?.igst),right:true},{value:fmt((liability.inputTaxCredit?.cgst||0)+(liability.inputTaxCredit?.sgst||0)+(liability.inputTaxCredit?.igst||0)),right:true,style:'font-weight:700'}],
                [{value:'Net GST Payable',style:'font-weight:700;color:#1a4f8a'},{value:fmt(liability.netLiability?.cgst),right:true,style:'font-weight:700;color:#1a4f8a'},{value:fmt(liability.netLiability?.sgst),right:true,style:'font-weight:700;color:#1a4f8a'},{value:fmt(liability.netLiability?.igst),right:true,style:'font-weight:700;color:#1a4f8a'},{value:fmt((liability.netLiability?.cgst||0)+(liability.netLiability?.sgst||0)+(liability.netLiability?.igst||0)),right:true,style:'font-weight:800;color:#1a4f8a;font-size:14px'}]
              ],footerNote:'Pay by 20th of next month via GST portal.'
            })}>🖨️ Print</button>}
          </div>
          <div className="card-body">
            <DateBar onFetch={fetchLiability} label="Calculate Tax Liability"/>
            {liability ? (
              <>
                <div style={{background:'#1a4f8a',color:'white',padding:'10px 16px',borderRadius:'6px 6px 0 0',fontWeight:700,marginBottom:2}}>
                  GST Tax Liability — {liability.period}
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,marginBottom:16}}>
                  <thead><tr style={{background:'#f0f4ff'}}>
                    {['Head','CGST','SGST','IGST','Total'].map((h,i)=><th key={i} style={{padding:'10px 16px',textAlign:i>0?'right':'left'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {taxRow('Output Tax (Sales)',liability.outputTax?.cgst,liability.outputTax?.sgst,liability.outputTax?.igst,false,'#dc2626')}
                    {taxRow('Input Tax Credit (Purchases)',liability.inputTaxCredit?.cgst,liability.inputTaxCredit?.sgst,liability.inputTaxCredit?.igst,false,'#16a34a')}
                    {taxRow('Net GST Payable',liability.netLiability?.cgst,liability.netLiability?.sgst,liability.netLiability?.igst,true,'#1a4f8a')}
                  </tbody>
                </table>
                {(liability.refundable?.cgst>0||liability.refundable?.sgst>0||liability.refundable?.igst>0) && (
                  <div style={{background:'#d1fae5',border:'2px solid #10b981',borderRadius:6,padding:'12px 16px',marginBottom:12}}>
                    <div style={{fontWeight:700,color:'#065f46',marginBottom:4}}>🎉 ITC Refundable (Excess ITC)</div>
                    <div style={{fontSize:13,color:'#064e3b'}}>CGST: {fmt(liability.refundable?.cgst)} | SGST: {fmt(liability.refundable?.sgst)} | IGST: {fmt(liability.refundable?.igst)}</div>
                  </div>
                )}
                <div style={{padding:'10px 14px',background:'#fef9c3',border:'1px solid #fcd34d',borderRadius:6,fontSize:12,color:'#92400e'}}>
                  💡 Pay GST by filing GSTR-3B on GST portal before 20th of next month. Net Payable = Output Tax − ITC
                </div>
              </>
            ) : <Empty icon="⚠️" text="Calculate GST Tax Liability"/>}
          </div>
        </div>
      )}

      {/* ══ CONFIG ══ */}
      {tab==='config' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚙️ GST Rate Configuration</span>
            <button className="btn btn-primary" onClick={()=>{setForm({gstRate:18,taxType:'GOODS'});setEditConfigId(null);setModal(true);}}>+ Add HSN Config</button>
          </div>
          <div className="card-body">
            {configs.length>0 ? (
              <div className="table-container">
                <table>
                  <thead><tr><th>HSN/SAC Code</th><th>Description</th><th>GST Rate</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Type</th><th>Status</th></tr></thead>
                  <tbody>
                    {configs.map(c=>(
                      <tr key={c.id}>
                        <td style={{fontWeight:700,fontFamily:'monospace',color:'#7c3aed'}}>{c.hsnCode}</td>
                        <td style={{fontSize:12}}>{c.description||'—'}</td>
                        <td style={{fontWeight:700,color:'#1a4f8a'}}>{c.gstRate}%</td>
                        <td style={{fontSize:11}}>{(c.gstRate/2).toFixed(1)}%</td>
                        <td style={{fontSize:11}}>{(c.gstRate/2).toFixed(1)}%</td>
                        <td style={{fontSize:11}}>{c.gstRate}%</td>
                        <td><span className="badge badge-secondary">{c.taxType||'GOODS'}</span></td>
                        <td><span className={`badge ${c.active?'badge-success':'badge-danger'}`}>{c.active?'Active':'Inactive'}</span></td>
                        <td>
                          <div style={{display:'flex',gap:6}}>
                            <button className="btn btn-sm btn-outline" style={{color:'#2563eb',borderColor:'#2563eb'}}
                              onClick={()=>{setForm({...c});setEditConfigId(c.id);setModal(true);}} title="Edit config">✏️</button>
                            <button className="btn btn-sm btn-outline" style={{color:'#dc2626',borderColor:'#dc2626'}} onClick={()=>setConfirmDelete(c)} title="Delete config">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
                <div style={{fontSize:40,marginBottom:12}}>⚙️</div>
                <div>No GST configurations. Add HSN codes and rates.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h3>{editConfigId ? "✏️ Edit GST Configuration" : "➕ Add GST Configuration"}</h3><button className="modal-close" onClick={()=>setModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>HSN/SAC Code *</label><input value={form.hsnCode||''} onChange={e=>setForm({...form,hsnCode:e.target.value})} placeholder="e.g. 8471, 9984"/></div>
                <div className="form-group"><label>GST Rate (%) *</label>
                  <select value={form.gstRate||18} onChange={e=>setForm({...form,gstRate:Number(e.target.value)})}>
                    {[0,0.25,1,1.5,3,5,6,7.5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Tax Type</label>
                  <select value={form.taxType||'GOODS'} onChange={e=>setForm({...form,taxType:e.target.value})}>
                    <option>GOODS</option><option>SERVICES</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label>Description</label><input value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Item description"/></div>
              </div>
              {form.gstRate > 0 && (
                <div style={{background:'#f0f4ff',borderRadius:6,padding:'8px 12px',fontSize:12,marginTop:8}}>
                  GST {form.gstRate}% = CGST {(form.gstRate/2).toFixed(1)}% + SGST {(form.gstRate/2).toFixed(1)}% (IGST {form.gstRate}% inter-state)
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveConfig}>Save Config</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete GST Config */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete GST Configuration?"
        message="This HSN/SAC configuration will be permanently deleted."
        details={confirmDelete ? `HSN: ${confirmDelete.hsnCode} — GST ${confirmDelete.gstRate}% (${confirmDelete.description || 'No description'})` : ''}
        confirmLabel="Yes, Delete"
        type="danger"
        onConfirm={async () => {
          try {
            await deleteGstConfiguration(confirmDelete.id);
            toast.success('GST configuration deleted');
            getGstConfigurations().then(r => setConfigs(r.data || []));
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
