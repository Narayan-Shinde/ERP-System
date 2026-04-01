import React, { useState, useEffect, useRef } from 'react';
import { getCompanySettings, saveCompanySettings, getBanks, addBank, updateBank, setDefaultBank, deleteBank as deleteBankAPI} from '../services/api';
import toast from 'react-hot-toast';

const hdrs = () => ({ 'Content-Type':'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
  'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry'];

const FY_OPTIONS = ['2022-23','2023-24','2024-25','2025-26'];

export default function SettingsPage() {
  const [tab, setTab]       = useState('company');
  const [form, setForm]     = useState({
    companyName: '', address: '', city: '', state: 'Maharashtra', pincode: '', country: 'India',
    phone: '', email: '', website: '', gstin: '', pan: '', cin: '',
    bankName: '', accountNumber: '', ifscCode: '', branch: '',
    financialYearStart: '2024-25', currency: 'INR', currencySymbol: '₹',
    dateFormat: 'DD-MM-YYYY', enableGST: true, defaultGSTRate: 18,
    invoicePrefix: 'INV', purchasePrefix: 'PINV', narrationRequired: false,
    decimalPlaces: 2,
    logoData: '', invoiceFormat: 'STANDARD', invoiceColor: '#1a4f8a',
    invoiceFooterNote: ''
  });
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const logoInputRef = useRef(null);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { toast.error('Logo file size must be under 500KB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file (PNG, JPG, etc.)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setLogoPreview(base64);
      setForm(f => ({...f, logoData: base64}));
      toast.success('Logo uploaded! Click Save Settings to apply.');
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview('');
    setForm(f => ({...f, logoData: ''}));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  useEffect(() => {
    getCompanySettings().then(r => { if (r.data) { setForm(f => ({...f, ...r.data})); if (r.data.logoData) setLogoPreview(r.data.logoData); } }).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.companyName?.trim())  { toast.error('Company Name required aahe!'); return; }

    // ── Phone: 10 digits, starts 6-9 ──
    if (!form.phone?.trim()) { toast.error('Company phone number required aahe!'); return; }
    const cleanPhone = form.phone.trim().replace(/[\s\-()]/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) { toast.error('Phone invalid! 10 digits, 6-9 se start honyapahijhe. Got: '+form.phone); return; }

    // ── Email: valid format ──
    if (!form.email?.trim()) { toast.error('Company email required aahe!'); return; }
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(form.email.trim())) { toast.error('Email address invalid! Got: '+form.email); return; }

    // ── GSTIN: 15 chars + valid pattern ──
    if (form.gstin?.trim()) {
      const g = form.gstin.trim().toUpperCase();
      if (g.length !== 15) { toast.error('GSTIN exactly 15 characters cha hava! Got '+g.length); return; }
      if (!/^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
        toast.error('GSTIN format invalid! Example: 27AABCU9603R1ZX'); return;
      }
    }

    // ── PAN: valid format ──
    if (form.pan?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.trim().toUpperCase())) {
      toast.error('PAN format invalid! Example: ABCDE1234F'); return;
    }

    // ── Pincode: 6 digits starting 1-9 ──
    if (form.pincode?.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      toast.error('Pincode 6 digits cha hava! (Starting 1-9)'); return;
    }

    // ── Invoice prefix: only alphanumeric ──
    if (form.invoicePrefix?.trim() && !/^[A-Za-z0-9\-/]{1,10}$/.test(form.invoicePrefix.trim())) {
      toast.error('Invoice prefix: only letters, numbers, - or / allowed (max 10 chars)'); return;
    }
    setLoading(true);
    try {
      await saveCompanySettings(form);
      if (form.companyName) localStorage.setItem('companyName', form.companyName);
      toast.success('Settings saved! ✅');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error('Failed to save settings'); }
    setLoading(false);
  };

  const f = (key, label, type='text', opts=null) => (
    <div className="form-group" key={key}>
      <label>{label}</label>
      {opts ? (
        <select value={form[key] || ''} onChange={e => setForm({...form, [key]: e.target.value})}>
          {opts.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : type === 'checkbox' ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
          <input type="checkbox" checked={!!form[key]} onChange={e => setForm({...form, [key]:e.target.checked})} style={{ width:18, height:18 }}/>
          <span style={{ fontSize:13, color:'#64748b' }}>Enabled</span>
        </div>
      ) : (
        <input type={type} value={form[key] || ''} onChange={e => setForm({...form, [key]: type==='number' ? Number(e.target.value) : e.target.value})}/>
      )}
    </div>
  );

  const tabs = [['setup','🚀 First Setup'],['company','🏢 Company'],['bank','🏦 Bank'],['preferences','⚙️ Preferences']];

  return (
    <div>
      <div className="tabs">
        {tabs.map(([k,l]) => (
          <div key={k} className={`tab ${tab===k?'active':''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ── FIRST SETUP WIZARD ── */}
      {tab === 'setup' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🚀 First Time Setup — Quick Start Guide</span>
          </div>
          <div className="card-body">
            {/* Progress Steps */}
            <div style={{ display:'flex', gap:0, marginBottom:32, position:'relative' }}>
              <div style={{ position:'absolute', top:20, left:'10%', right:'10%', height:3, background:'#e2e8f0', zIndex:0 }}/>
              {[
                { n:1, icon:'🏢', title:'Company Info',    desc:'Name, GSTIN, Address',   done: !!(form.companyName && form.gstin) },
                { n:2, icon:'🖼️', title:'Logo Upload',     desc:'Brand your invoices',    done: !!logoPreview },
                { n:3, icon:'🏦', title:'Bank Account',    desc:'For invoice printing',   done: !!(form.bankName) },
                { n:4, icon:'📅', title:'Financial Year',  desc:'Set your FY period',     done: !!(form.financialYearStart) },
                { n:5, icon:'🧾', title:'Invoice Format',  desc:'Choose style & color',   done: !!(form.invoiceFormat) },
              ].map((step, i) => (
                <div key={i} style={{ flex:1, textAlign:'center', position:'relative', zIndex:1 }}>
                  <div style={{
                    width:40, height:40, borderRadius:'50%', margin:'0 auto 8px',
                    background: step.done ? '#16a34a' : '#e2e8f0',
                    color: step.done ? 'white' : '#94a3b8',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18, fontWeight:700, border:`3px solid ${step.done?'#16a34a':'#e2e8f0'}`,
                    boxShadow: step.done ? '0 0 0 3px #dcfce7' : 'none',
                    transition:'all .3s'
                  }}>
                    {step.done ? '✓' : step.n}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color: step.done?'#16a34a':'#374151' }}>{step.icon} {step.title}</div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{step.desc}</div>
                </div>
              ))}
            </div>

            {/* Quick Fill Steps */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

              {/* Step 1 & 4: Company + FY */}
              <div style={{ background:'#f8fafc', borderRadius:10, padding:20, border:'1px solid #e2e8f0' }}>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:14, fontSize:14 }}>🏢 Step 1: Business Details</div>
                <div className="form-group"><label>Business / Company Name *</label>
                  <input value={form.companyName||''} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="e.g. Sunita Enterprises"/>
                </div>
                <div className="form-group"><label>GST Number (GSTIN)</label>
                  <input value={form.gstin||''} onChange={e=>setForm(f=>({...f,gstin:e.target.value.toUpperCase()}))} placeholder="e.g. 27AAAAA0000A1Z5" maxLength={15}
                    style={{ fontFamily:'monospace', letterSpacing:1 }}/>
                </div>
                <div className="form-group"><label>Phone *</label>
                  <input value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="10 digit mobile"/>
                </div>
                <div className="form-group"><label>Email</label>
                  <input value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="business@email.com"/>
                </div>
                <div className="form-group"><label>Address</label>
                  <textarea value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))} rows={2} placeholder="Full address"/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div className="form-group"><label>City</label><input value={form.city||''} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/></div>
                  <div className="form-group"><label>PIN Code</label><input value={form.pincode||''} onChange={e=>setForm(f=>({...f,pincode:e.target.value}))} maxLength={6}/></div>
                </div>
                <div className="form-group"><label>State</label>
                  <select value={form.state||'Maharashtra'} onChange={e=>setForm(f=>({...f,state:e.target.value}))}>
                    {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh','Puducherry'].map(s=>(<option key={s}>{s}</option>))}
                  </select>
                </div>
                <div className="form-group"><label>📅 Financial Year</label>
                  <select value={form.financialYearStart||'2024-25'} onChange={e=>setForm(f=>({...f,financialYearStart:e.target.value}))}>
                    {['2022-23','2023-24','2024-25','2025-26'].map(y=>(<option key={y}>{y}</option>))}
                  </select>
                </div>
              </div>

              {/* Step 2, 3, 5: Logo + Bank + Format */}
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                {/* Logo */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:14 }}>🖼️ Step 2: Company Logo</div>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ width:80, height:80, border:'2px dashed #cbd5e1', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'white', flexShrink:0 }}>
                      {logoPreview
                        ? <img src={logoPreview} alt="logo" style={{ maxWidth:76, maxHeight:76, objectFit:'contain' }}/>
                        : <span style={{ fontSize:28, color:'#cbd5e1' }}>🏢</span>}
                    </div>
                    <div>
                      <button className="btn btn-primary" style={{ fontSize:12, marginBottom:6 }} onClick={() => logoInputRef.current?.click()}>
                        📁 {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      </button>
                      {logoPreview && <button className="btn btn-outline" style={{ fontSize:11, marginLeft:6, color:'#dc2626' }} onClick={removeLogo}>Remove</button>}
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>PNG/JPG/SVG • Max 500KB<br/>Appears on all invoices</div>
                      <input ref={logoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload}/>
                    </div>
                  </div>
                </div>

                {/* Bank */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:14 }}>🏦 Step 3: Bank Details <span style={{ fontSize:11, fontWeight:400, color:'#94a3b8' }}>(for invoice)</span></div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div className="form-group"><label>Bank Name</label><input value={form.bankName||''} onChange={e=>setForm(f=>({...f,bankName:e.target.value}))} placeholder="State Bank of India"/></div>
                    <div className="form-group"><label>Account Number</label><input value={form.accountNumber||''} onChange={e=>setForm(f=>({...f,accountNumber:e.target.value}))}/></div>
                    <div className="form-group"><label>IFSC Code</label><input value={form.ifscCode||''} onChange={e=>setForm(f=>({...f,ifscCode:e.target.value.toUpperCase()}))} style={{ fontFamily:'monospace' }}/></div>
                    <div className="form-group"><label>Branch</label><input value={form.branch||''} onChange={e=>setForm(f=>({...f,branch:e.target.value}))}/></div>
                  </div>
                </div>

                {/* Invoice Format & Color */}
                <div style={{ background:'#f8fafc', borderRadius:10, padding:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:14 }}>🧾 Step 5: Invoice Style</div>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    {[{v:'STANDARD',l:'Standard'},{v:'COMPACT',l:'Compact'},{v:'DETAILED',l:'Detailed'}].map(opt=>(
                      <div key={opt.v} onClick={()=>setForm(f=>({...f,invoiceFormat:opt.v}))}
                        style={{ flex:1, border:`2px solid ${form.invoiceFormat===opt.v?'#2563eb':'#e2e8f0'}`, borderRadius:8, padding:'8px 4px', textAlign:'center', cursor:'pointer', background:form.invoiceFormat===opt.v?'#eff6ff':'white', fontWeight:700, fontSize:12, color:form.invoiceFormat===opt.v?'#2563eb':'#374151' }}>
                        {opt.l}
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:12, color:'#64748b' }}>Color:</span>
                    {['#1a4f8a','#16a34a','#dc2626','#7c3aed','#d97706','#0891b2','#374151'].map(col=>(
                      <div key={col} onClick={()=>setForm(f=>({...f,invoiceColor:col}))}
                        style={{ width:24, height:24, borderRadius:'50%', background:col, cursor:'pointer', border:form.invoiceColor===col?'3px solid #374151':'3px solid transparent', transition:'all .15s' }}/>
                    ))}
                    <input type="color" value={form.invoiceColor||'#1a4f8a'} onChange={e=>setForm(f=>({...f,invoiceColor:e.target.value}))} style={{ width:28, height:28, borderRadius:4, border:'none', cursor:'pointer', padding:0 }}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ marginTop:24, textAlign:'center' }}>
              <button className="btn btn-primary" onClick={save} disabled={loading} style={{ fontSize:15, padding:'10px 40px', letterSpacing:0.5 }}>
                {loading ? '⏳ Saving...' : saved ? '✅ Setup Saved!' : '💾 Save All Settings'}
              </button>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:8 }}>
                You can always change these settings later from the Company / Bank tabs
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPANY INFO ── */}
      {tab === 'company' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏢 Company Information</span>
            <button className="btn btn-primary" onClick={save} disabled={loading}>
              {loading ? 'Saving...' : saved ? '✅ Saved!' : 'Save Settings'}
            </button>
          </div>
          <div className="card-body">

            {/* ── ROW 1: Basic Info + Address ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px 32px', marginBottom:24 }}>
              <div>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:13, textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #e2e8f0', paddingBottom:6 }}>
                  Basic Information
                </div>
                <div className="form-grid">
                  {f('companyName','Company Name *')}
                  {f('gstin','GSTIN (GST Number)')}
                  {f('pan','PAN Number')}
                  {f('cin','CIN / Registration No.')}
                  {f('phone','Phone / Mobile')}
                  {f('email','Email Address')}
                  {f('website','Website')}
                </div>
              </div>
              <div>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:13, textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #e2e8f0', paddingBottom:6 }}>
                  Address
                </div>
                <div className="form-group">
                  <label>Address / Street</label>
                  <textarea value={form.address || ''} onChange={e => setForm({...form, address:e.target.value})} rows={3}/>
                </div>
                <div className="form-grid">
                  {f('city','City')}
                  {f('state','State', 'text', STATES)}
                  {f('pincode','PIN Code')}
                  {f('country','Country')}
                </div>
              </div>
            </div>

            {/* ── ROW 2: Logo + Invoice Format ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px 32px', marginBottom:24 }}>

              {/* Logo Upload */}
              <div>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:13, textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #e2e8f0', paddingBottom:6 }}>
                  🖼️ Company Logo
                </div>
                <div style={{ background:'#f8fafc', border:'2px dashed #cbd5e1', borderRadius:10, padding:20, textAlign:'center', minHeight:140 }}>
                  {logoPreview ? (
                    <div>
                      <img src={logoPreview} alt="logo" style={{ maxHeight:80, maxWidth:200, objectFit:'contain', display:'block', margin:'0 auto 12px' }}/>
                      <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>Logo uploaded ✅</div>
                      <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
                        <button className="btn btn-outline" style={{ fontSize:11, padding:'4px 10px' }} onClick={() => logoInputRef.current?.click()}>
                          🔄 Change
                        </button>
                        <button className="btn btn-outline" style={{ fontSize:11, padding:'4px 10px', color:'#dc2626', borderColor:'#fca5a5' }} onClick={removeLogo}>
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:40, marginBottom:8 }}>🏢</div>
                      <div style={{ fontSize:13, color:'#64748b', marginBottom:12 }}>Upload your company logo</div>
                      <button className="btn btn-primary" style={{ fontSize:12 }} onClick={() => logoInputRef.current?.click()}>
                        📁 Choose Logo
                      </button>
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:8 }}>PNG, JPG, SVG • Max 500KB</div>
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogoUpload}/>
                </div>
              </div>

              {/* Invoice Format */}
              <div>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:13, textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #e2e8f0', paddingBottom:6 }}>
                  🧾 Invoice Appearance
                </div>

                {/* Format Select */}
                <div className="form-group" style={{ marginBottom:14 }}>
                  <label>Invoice Format</label>
                  <div style={{ display:'flex', gap:10, marginTop:6 }}>
                    {[
                      {v:'STANDARD', l:'Standard', desc:'Logo + Company + Items + HSN'},
                      {v:'COMPACT',  l:'Compact',  desc:'Smaller text, fits more items'},
                      {v:'DETAILED', l:'Detailed', desc:'Includes T&C + Declaration'},
                    ].map(opt => (
                      <div key={opt.v}
                        onClick={() => setForm(f => ({...f, invoiceFormat: opt.v}))}
                        style={{
                          flex:1, border:`2px solid ${form.invoiceFormat===opt.v ? '#2563eb' : '#e2e8f0'}`,
                          borderRadius:8, padding:'10px 8px', textAlign:'center', cursor:'pointer',
                          background: form.invoiceFormat===opt.v ? '#eff6ff' : 'white',
                          transition:'all .15s'
                        }}>
                        <div style={{ fontWeight:700, fontSize:12, color: form.invoiceFormat===opt.v ? '#2563eb' : '#374151' }}>{opt.l}</div>
                        <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div className="form-group" style={{ marginBottom:14 }}>
                  <label>Invoice Primary Color</label>
                  <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:6, flexWrap:'wrap' }}>
                    {['#1a4f8a','#16a34a','#dc2626','#7c3aed','#d97706','#0891b2','#374151'].map(col => (
                      <div key={col}
                        onClick={() => setForm(f => ({...f, invoiceColor: col}))}
                        style={{
                          width:28, height:28, borderRadius:'50%', background:col, cursor:'pointer',
                          border: form.invoiceColor===col ? '3px solid #374151' : '3px solid transparent',
                          boxShadow: form.invoiceColor===col ? '0 0 0 2px white inset' : 'none',
                          transition:'all .15s'
                        }}/>
                    ))}
                    <input type="color" value={form.invoiceColor || '#1a4f8a'}
                      onChange={e => setForm(f => ({...f, invoiceColor: e.target.value}))}
                      style={{ width:32, height:32, borderRadius:4, border:'1px solid #e2e8f0', cursor:'pointer', padding:2 }}
                      title="Custom color"/>
                    <span style={{ fontSize:11, color:'#64748b' }}>{form.invoiceColor}</span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="form-group">
                  <label>Invoice Footer Note</label>
                  <input type="text" value={form.invoiceFooterNote || ''} onChange={e => setForm(f => ({...f, invoiceFooterNote: e.target.value}))} placeholder="e.g. Thank you for your business!" />
                </div>
              </div>
            </div>

            {/* ── Invoice Header LIVE PREVIEW ── */}
            <div style={{ background:'white', border:'2px solid #e2e8f0', borderRadius:10, overflow:'hidden' }}>
              <div style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'8px 16px', fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>
                📄 Invoice Header Live Preview
              </div>
              <div style={{ padding:'16px 20px' }}>
                {/* Title */}
                <div style={{ textAlign:'center', marginBottom:6 }}>
                  <span style={{ fontSize:17, fontWeight:900, color: form.invoiceColor||'#1a4f8a', textTransform:'uppercase', letterSpacing:1 }}>TAX INVOICE</span>
                </div>
                <div style={{ borderBottom:`2px solid ${form.invoiceColor||'#1a4f8a'}`, marginBottom:8 }}/>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div>
                    {logoPreview && <img src={logoPreview} alt="logo" style={{ maxHeight:45, maxWidth:120, objectFit:'contain', display:'block', marginBottom:4 }}/>}
                    <div style={{ fontSize:16, fontWeight:900, color: form.invoiceColor||'#1a4f8a' }}>{form.companyName || 'Your Company Name'}</div>
                    <div style={{ fontSize:11, color:'#444', lineHeight:1.6, marginTop:2 }}>
                      {form.address && <div>{form.address}</div>}
                      <div>{[form.city, form.state, form.pincode].filter(Boolean).join(', ') || 'City, State - PIN'}</div>
                      {form.phone && <div>📞 {form.phone}{form.email && ` | ✉️ ${form.email}`}</div>}
                      {form.gstin && <div>GSTIN: <strong>{form.gstin}</strong></div>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', fontSize:11 }}>
                    <table style={{ borderCollapse:'collapse', marginLeft:'auto' }}>
                      {[['Invoice #','INV-0001'],['Date', new Date().toLocaleDateString('en-IN')],['Due Date','—']].map(([l,v]) => (
                        <tr key={l}><td style={{ color:'#555', whiteSpace:'nowrap', paddingRight:4 }}>{l}</td><td style={{ color:'#555' }}>:</td><td style={{ fontWeight:700 }}>{v}</td></tr>
                      ))}
                    </table>
                  </div>
                </div>
                <div style={{ borderBottom:`1.5px solid ${form.invoiceColor||'#1a4f8a'}`, marginTop:8 }}/>
                {form.invoiceFooterNote && (
                  <div style={{ marginTop:8, fontSize:11, color:'#64748b', textAlign:'center', fontStyle:'italic' }}>
                    {form.invoiceFooterNote}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── BANK ── */}
      {tab === 'bank' && <BankTab />}

      {/* ── PREFERENCES ── */}
      {tab === 'preferences' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚙️ System Preferences</span>
            <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Saving...':'Save'}</button>
          </div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px 32px' }}>
              {/* Accounting */}
              <div>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:13, textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #e2e8f0', paddingBottom:6 }}>
                  Accounting Settings
                </div>
                <div className="form-grid">
                  {f('financialYearStart','Financial Year', 'text', FY_OPTIONS)}
                  {f('currency','Currency', 'text', ['INR','USD','EUR','GBP'])}
                  {f('currencySymbol','Currency Symbol')}
                  {f('decimalPlaces','Decimal Places','number')}
                  {f('enableGST','Enable GST','checkbox')}
                  {f('defaultGSTRate','Default GST Rate (%)','number')}
                </div>
              </div>
              {/* Invoice */}
              <div>
                <div style={{ fontWeight:700, color:'#1a4f8a', marginBottom:12, fontSize:13, textTransform:'uppercase', letterSpacing:1, borderBottom:'2px solid #e2e8f0', paddingBottom:6 }}>
                  Invoice Settings
                </div>
                <div className="form-grid">
                  {f('invoicePrefix','Sales Invoice Prefix')}
                  {f('purchasePrefix','Purchase Invoice Prefix')}
                  {f('dateFormat','Date Format', 'text', ['DD-MM-YYYY','YYYY-MM-DD','MM/DD/YYYY'])}
                  {f('narrationRequired','Require Narration in Vouchers','checkbox')}
                </div>
              </div>
            </div>
            {/* Current Settings Display */}
            <div style={{ marginTop:24, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'14px 18px' }}>
              <div style={{ fontWeight:700, color:'#475569', marginBottom:10, fontSize:13 }}>Current Configuration</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
                {[
                  ['Financial Year', form.financialYearStart],
                  ['Currency', form.currency + ' (' + form.currencySymbol + ')'],
                  ['GST', form.enableGST ? '✅ Enabled (' + form.defaultGSTRate + '%)' : '❌ Disabled'],
                  ['Invoice Prefix', form.invoicePrefix + '-XXXX'],
                  ['Purchase Prefix', form.purchasePrefix + '-XXXX'],
                  ['Date Format', form.dateFormat],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'white', border:'1px solid #e2e8f0', borderRadius:6, padding:'6px 12px', fontSize:12 }}>
                    <span style={{ color:'#94a3b8' }}>{l}: </span>
                    <strong style={{ color:'#1a4f8a' }}>{v}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankTab() {
  const [banks, setBanks]       = React.useState([]);
  const [modal, setModal]       = React.useState(false);
  const [editId, setEditId]     = React.useState(null);
  const [form, setForm]         = React.useState({
    bankName:'', accountNumber:'', ifscCode:'', branch:'',
    accountType:'CURRENT', openingBalance:0, isDefault:false
  });
  const [loading, setLoading]   = React.useState(false);

  const fetchBanks = async () => {
    try {
      const r = await getBanks();
      setBanks(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error('Failed to load banks'); }
  };

  React.useEffect(() => { fetchBanks(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ bankName:'', accountNumber:'', ifscCode:'', branch:'', accountType:'CURRENT', openingBalance:0, isDefault:false });
    setModal(true);
  };

  const openEdit = (b) => {
    setEditId(b.id);
    setForm({ bankName:b.bankName||'', accountNumber:b.accountNumber||'', ifscCode:b.ifscCode||'',
      branch:b.branch||'', accountType:b.accountType||'CURRENT', openingBalance:b.openingBalance||0, isDefault:b.isDefault||false });
    setModal(true);
  };

  const save = async () => {
    if (!form.bankName) { toast.error('Bank name required'); return; }
    setLoading(true);
    try {
      if (editId) await updateBank(editId, form);
      else await addBank(form);
      toast.success(editId ? 'Bank updated!' : 'Bank added! Ledger account created.');
      setModal(false); fetchBanks();
    } catch { toast.error('Failed to save bank'); }
    setLoading(false);
  };

  const setDefault = async (id) => {
    try {
      await setDefaultBank(id);
      toast.success('Default bank updated!'); fetchBanks();
    } catch { toast.error('Failed'); }
  };

  const deleteBank = async (id) => {
    if (!window.confirm('Delete this bank?')) return;
    try {
      await deleteBank(id);
      toast.success('Bank deleted'); fetchBanks();
    } catch { toast.error('Failed'); }
  };

  const fmt = n => '₹' + (Number(n)||0).toLocaleString('en-IN');

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🏦 Bank Accounts</span>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Bank</button>
      </div>
      <div className="card-body">
        <div style={{background:'#eff6ff',border:'2px solid #bfdbfe',borderRadius:8,padding:'10px 16px',marginBottom:16,fontSize:13,color:'#1e40af'}}>
          💡 प्रत्येक bank साठी automatically Ledger Account तयार होतो. Payment करताना bank select करा → त्या bank चा ledger update होतो.
        </div>

        {banks.length === 0 ? (
          <div style={{textAlign:'center',padding:48,color:'#94a3b8'}}>
            <div style={{fontSize:40,marginBottom:12}}>🏦</div>
            <div>No banks added yet. Click "+ Add Bank" to start.</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
            {banks.map(b => (
              <div key={b.id} style={{background:'white',border:`2px solid ${b.isDefault?'#1a4f8a':'#e2e8f0'}`,borderRadius:10,padding:16,position:'relative'}}>
                {b.isDefault && (
                  <span style={{position:'absolute',top:10,right:10,background:'#1a4f8a',color:'white',fontSize:10,padding:'2px 8px',borderRadius:10,fontWeight:700}}>⭐ DEFAULT</span>
                )}
                <div style={{fontWeight:700,fontSize:15,color:'#1a4f8a',marginBottom:8}}>🏦 {b.bankName}</div>
                <div style={{fontSize:12,color:'#64748b',lineHeight:2}}>
                  {b.accountNumber && <div><strong>A/C:</strong> {b.accountNumber}</div>}
                  {b.ifscCode && <div><strong>IFSC:</strong> {b.ifscCode}</div>}
                  {b.branch && <div><strong>Branch:</strong> {b.branch}</div>}
                  <div><strong>Type:</strong> {b.accountType}</div>
                  <div><strong>Opening Balance:</strong> <span style={{color:'#16a34a',fontWeight:600}}>{fmt(b.openingBalance)}</span></div>
                </div>
                <div style={{display:'flex',gap:6,marginTop:12}}>
                  <button className="btn btn-outline" style={{fontSize:11,padding:'3px 8px'}} onClick={() => openEdit(b)}>✏️ Edit</button>
                  {!b.isDefault && (
                    <button className="btn btn-outline" style={{fontSize:11,padding:'3px 8px',color:'#1a4f8a',borderColor:'#1a4f8a'}} onClick={() => setDefault(b.id)}>⭐ Set Default</button>
                  )}
                  {!b.isDefault && (
                    <button className="btn btn-outline" style={{fontSize:11,padding:'3px 8px',color:'#dc2626',borderColor:'#fca5a5'}} onClick={() => deleteBank(b.id)}>🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Also show Cash in Hand info */}
        <div style={{marginTop:20,padding:'12px 16px',background:'#fef9c3',border:'2px solid #fde68a',borderRadius:8,fontSize:13}}>
          <strong>💵 Cash in Hand</strong> — हे automatically Ledger मध्ये असतं. Cash payment साठी "CASH" select करा.
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:480}}>
            <div className="modal-header">
              <h3>{editId ? '✏️ Edit Bank' : '+ Add Bank Account'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Bank Name *</label>
                  <input value={form.bankName} onChange={e => setForm({...form, bankName:e.target.value})} placeholder="e.g. HDFC Bank, SBI, ICICI"/>
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input value={form.accountNumber} onChange={e => setForm({...form, accountNumber:e.target.value})} placeholder="1234567890"/>
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input value={form.ifscCode} onChange={e => setForm({...form, ifscCode:e.target.value})} placeholder="HDFC0001234"/>
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <input value={form.branch} onChange={e => setForm({...form, branch:e.target.value})} placeholder="Main Branch"/>
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <select value={form.accountType} onChange={e => setForm({...form, accountType:e.target.value})}>
                    <option value="CURRENT">Current Account</option>
                    <option value="SAVINGS">Savings Account</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Opening Balance (₹)</label>
                  <input type="number" value={form.openingBalance} onChange={e => setForm({...form, openingBalance:Number(e.target.value)})} placeholder="0"/>
                </div>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                    <input type="checkbox" checked={form.isDefault} onChange={e => setForm({...form, isDefault:e.target.checked})}/>
                    Set as Default Bank (Payment मध्ये automatically select होईल)
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={loading}>{loading ? 'Saving...' : editId ? 'Update Bank' : 'Add Bank'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
