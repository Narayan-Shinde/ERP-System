import { printReport as doPrint } from '../utils/printUtils';
import React, { useState } from 'react';
import {
  getProfitLoss, getMonthlyPL, getTrialBalance,
  getBalanceSheet, getCashFlow, getStockSummary,
  getStockLedger, getComparativePL, getItems
} from '../services/api';
import {
  BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';
import { useFY } from '../context/FYContext';

const fmt   = n => '₹' + (Number(n)||0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtN  = n => (Number(n)||0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct   = n => (Number(n)||0).toFixed(1) + '%';
const hdrs  = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function ReportsPage() {
  const [tab, setTab]           = useState('pl');
  const [fromDate, setFrom]     = useState('');
  const [toDate, setTo]         = useState('');
  const [pl, setPl]             = useState(null);
  const [monthly, setMonthly]   = useState(null);
  const [trial, setTrial]       = useState(null);
  const [bs, setBs]             = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [stock, setStock]       = useState(null);
  const [items, setItems]       = useState([]);
  const [comparative, setComp]  = useState(null);
  const [year, setYear]         = useState(2024);
  const [loading, setLoading]   = useState(false);
  const { selectedFY } = useFY();

  const fillFY = () => {
    setFrom(selectedFY.from);
    setTo(selectedFY.to);
    setPl(null); setMonthly(null); setTrial(null);
    setBs(null); setCashFlow(null); setStock(null); setComp(null);
  };

  const exportExcel = (title, headers, rows, sheetName = 'Report') => {
    const bom = '﻿';
    const headerRow = headers.join(',');
    const dataRows  = rows.map(r => r.map(v => {
      const s = String(v == null ? '' : v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    }).join(','));
    const csv  = bom + [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${title} exported!`);
  };

  const exportTrial = () => {
    if (!trial) { toast.error('Load Trial Balance first'); return; }
    const rows = (trial.accounts || []).map(a => [
      a.accountName, a.accountGroup,
      a.debit > 0 ? (a.debit).toFixed(2) : '',
      a.credit > 0 ? (a.credit).toFixed(2) : '',
    ]);
    rows.push(['TOTAL', '', trial.totalDebit?.toFixed(2), trial.totalCredit?.toFixed(2)]);
    exportExcel('Trial_Balance', ['Account Name', 'Account Group', 'Debit (₹)', 'Credit (₹)'], rows);
  };

  const exportBS = () => {
    if (!bs) { toast.error('Load Balance Sheet first'); return; }
    const rows = [];
    rows.push(['ASSETS', '']);
    (bs.assets?.fixedAssets || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    (bs.assets?.currentAssets || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    (bs.assets?.cashAndBank || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    rows.push(['Total Assets', bs.assets?.totalAssets?.toFixed(2)]);
    rows.push(['', '']);
    rows.push(['LIABILITIES', '']);
    (bs.liabilitiesAndEquity?.currentLiabilities || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    (bs.liabilitiesAndEquity?.longTermLiabilities || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    rows.push(['', '']);
    rows.push(['EQUITY', '']);
    (bs.liabilitiesAndEquity?.capital || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    (bs.liabilitiesAndEquity?.retainedEarnings || []).forEach(a => rows.push([a.accountName, a.balance?.toFixed(2)]));
    rows.push(['Net Profit/Loss (Current Year)', (bs.liabilitiesAndEquity?.netProfitCurrentYear || 0).toFixed(2)]);
    rows.push(['Total Liabilities & Equity', bs.liabilitiesAndEquity?.totalLiabilitiesAndEquity?.toFixed(2)]);
    exportExcel('Balance_Sheet', ['Particulars', 'Amount (₹)'], rows);
  };

  const exportStock = () => {
    if (!stock) { toast.error('Load Stock Summary first'); return; }
    const rows = (stock.items || []).map(i => [
      i.itemCode, i.itemName, i.categoryName || '',
      i.unit, i.currentStock, i.purchaseRate?.toFixed(2),
      (i.currentStock * i.purchaseRate).toFixed(2),
      i.currentStock <= 0 ? 'Out of Stock' : i.currentStock <= i.reorderLevel ? 'Low Stock' : 'In Stock',
    ]);
    rows.push(['', 'TOTAL STOCK VALUE', '', '', '', '', stock.totalStockValue?.toFixed(2), '']);
    exportExcel('Stock_Summary', ['Item Code','Item Name','Category','Unit','Stock Qty','Rate (₹)','Stock Value (₹)','Status'], rows);
  };

  const [c1From, setC1From] = useState('');
  const [c1To,   setC1To]   = useState('');
  const [c2From, setC2From] = useState('');
  const [c2To,   setC2To]   = useState('');

  const load = async (fn, setter, errMsg) => {
    setLoading(true);
    try { const r = await fn(); setter(r.data); }
    catch { toast.error(errMsg || 'Failed to load'); }
    setLoading(false);
  };

  const fetchComparative = async () => {
    if (!c1From || !c1To || !c2From || !c2To) {
      toast.error('Select both periods'); return;
    }
    setLoading(true);
    try {
      const r = await getComparativePL(c1From, c1To, c2From, c2To);
      setComp(r.data);
    } catch { toast.error('Failed to load comparative P&L'); }
    setLoading(false);
  };

  const TABS = [
    ['pl',          '📊 P&L'],
    ['monthly',     '📅 Monthly'],
    ['comparative', '📈 Comparative'],
    ['trial',       '⚖️ Trial Balance'],
    ['bs',          '🏦 Balance Sheet'],
    ['cashflow',    '💸 Cash Flow'],
    ['stock',       '📦 Stock Summary'],
    ['stockledger', '📋 Stock Ledger'],
  ];

  const printPL = () => {
    if (!pl) { toast.error('Load P&L first'); return; }
    doPrint({
      title: 'Profit & Loss Statement',
      subtitle: `Period: ${fromDate||''} to ${toDate||''}`,
      summaryCards: [
        { label: 'Total Revenue', value: fmt(pl?.income?.total||0), color:'#059669' },
        { label: 'Cost of Goods', value: fmt(pl?.costOfGoods||0), color:'#dc2626' },
        { label: 'Operating Expenses', value: fmt(pl?.expenses?.total||0), color:'#f59e0b' },
        { label: 'Net Profit', value: fmt(pl?.netProfit||0), color:(pl?.netProfit||0)>=0?'#059669':'#dc2626' },
      ],
      tableHeaders: [{label:'Particulars'},{label:'Amount (₹)',right:true}],
      tableRows: [
        [{value:'INCOME',style:'font-weight:700;background:#f0fdf4'},{value:'',right:true}],
        [{value:'Sales Revenue'},{value:fmt(pl?.income?.sales||0),right:true,style:'color:#059669'}],
        [{value:'Total Revenue',style:'font-weight:700'},{value:fmt(pl?.income?.total||0),right:true,style:'font-weight:700;color:#059669'}],
        [{value:''},{value:''}],
        [{value:'EXPENSES',style:'font-weight:700;background:#fef2f2'},{value:'',right:true}],
        [{value:'Cost of Goods (Purchases)'},{value:fmt(pl?.costOfGoods||0),right:true,style:'color:#dc2626'}],
        [{value:'Gross Profit',style:'font-weight:700'},{value:fmt(pl?.grossProfit||0),right:true,style:'font-weight:700'}],
        [{value:'Operating Expenses'},{value:fmt(pl?.expenses?.total||0),right:true,style:'color:#dc2626'}],
        ...(Object.entries(pl?.expenses?.breakdown||{}).map(([k,v])=>[{value:'  '+k,style:'color:#555'},{value:fmt(v),right:true,style:'color:#555'}])),
        [{value:''},{value:''}],
        [{value:'NET PROFIT / (LOSS)',style:'font-weight:800;background:#eff6ff'},{value:fmt(pl?.netProfit||0),right:true,style:`font-weight:800;color:${(pl?.netProfit||0)>=0?'#059669':'#dc2626'}`}],
      ]
    });
  };

  const printMonthly = () => {
    if (!monthly?.months?.length) { toast.error('Load Monthly report first'); return; }
    doPrint({
      title: 'Monthly P&L Report',
      subtitle: 'Financial Year: ' + (year||''),
      summaryCards: [
        { label: 'Total Sales',     value: fmt(monthly?.totals?.sales||0),      color:'#059669' },
        { label: 'Total Purchases', value: fmt(monthly?.totals?.purchases||0),  color:'#dc2626' },
        { label: 'Total Expenses',  value: fmt(monthly?.totals?.expenses||0),   color:'#f59e0b' },
        { label: 'Net Profit',      value: fmt(monthly?.totals?.netProfit||0),  color:'#2563eb' },
      ],
      tableHeaders: [{label:'Month'},{label:'Sales',right:true},{label:'Purchases',right:true},{label:'Expenses',right:true},{label:'Net Profit',right:true}],
      tableRows: [
        ...(monthly?.months||[]).map(m=>[
          {value:m.month},
          {value:fmt(m.sales||0),right:true,style:'color:#059669'},
          {value:fmt(m.purchases||0),right:true,style:'color:#dc2626'},
          {value:fmt(m.expenses||0),right:true,style:'color:#f59e0b'},
          {value:fmt(m.netProfit||0),right:true,style:'color:'+((m.netProfit||0)>=0?'#059669':'#dc2626')},
        ]),
        [{value:'TOTAL',style:'font-weight:800;background:#e8edf5'},
         {value:fmt(monthly?.totals?.sales||0),right:true,style:'font-weight:700;color:#059669'},
         {value:fmt(monthly?.totals?.purchases||0),right:true,style:'font-weight:700;color:#dc2626'},
         {value:fmt(monthly?.totals?.expenses||0),right:true,style:'font-weight:700;color:#f59e0b'},
         {value:fmt(monthly?.totals?.netProfit||0),right:true,style:'font-weight:800;color:'+((monthly?.totals?.netProfit||0)>=0?'#059669':'#dc2626')},
        ]
      ]
    });
  };

  const printTrial = () => {
    if (!trial?.accounts?.length) { toast.error('Load Trial Balance first'); return; }
    doPrint({
      title: 'Trial Balance',
      subtitle: `As on ${toDate||new Date().toISOString().split('T')[0]}`,
      summaryCards: [
        { label: 'Total Debit', value: fmt(trial?.totalDebit||0), color:'#dc2626' },
        { label: 'Total Credit', value: fmt(trial?.totalCredit||0), color:'#059669' },
        { label: 'Difference', value: fmt(Math.abs((trial?.totalDebit||0)-(trial?.totalCredit||0))), color:'#f59e0b' },
      ],
      tableHeaders: [{label:'Account'},{label:'Group'},{label:'Debit (₹)',right:true},{label:'Credit (₹)',right:true}],
      tableRows: (trial?.accounts||[]).map(a=>[
        {value:a.accountName},{value:a.accountGroup||''},
        {value:a.debit>0?fmt(a.debit):'—',right:true,style:'color:#dc2626'},
        {value:a.credit>0?fmt(a.credit):'—',right:true,style:'color:#059669'},
      ])
    });
  };

  const printBS = () => {
    if (!bs) { toast.error('Load Balance Sheet first'); return; }
    const assets = [...(bs?.assets?.fixedAssets||[]), ...(bs?.assets?.currentAssets||[])];
    const liab   = [...(bs?.liabilities?.capitalReserves||[]), ...(bs?.liabilities?.currentLiabilities||[])];
    const rows = [];
    const maxLen = Math.max(assets.length, liab.length);
    for(let i=0;i<maxLen;i++){
      rows.push([
        {value:assets[i]?.accountName||''},{value:assets[i]?fmt(assets[i].balance||0):'',right:true},
        {value:liab[i]?.accountName||''},{value:liab[i]?fmt(liab[i].balance||0):'',right:true},
      ]);
    }
    doPrint({
      title: 'Balance Sheet',
      subtitle: `As on ${toDate||new Date().toISOString().split('T')[0]}`,
      summaryCards: [
        { label: 'Total Assets', value: fmt(bs?.assets?.totalAssets||0), color:'#059669' },
        { label: 'Total Liabilities', value: fmt(bs?.liabilities?.totalLiabilities||0), color:'#dc2626' },
        { label: 'Net Worth', value: fmt((bs?.assets?.totalAssets||0)-(bs?.liabilities?.totalLiabilities||0)), color:'#2563eb' },
      ],
      tableHeaders: [{label:'Assets'},{label:'Amount',right:true},{label:'Liabilities & Equity'},{label:'Amount',right:true}],
      tableRows: rows
    });
  };

  const printCashFlow = () => {
    if (!cashFlow) { toast.error('Load Cash Flow first'); return; }
    const op = cashFlow.operatingActivities || {};
    const inflows  = op.cashInflows  || {};
    const outflows = op.cashOutflows || {};
    doPrint({
      title: 'Cash Flow Statement',
      subtitle: 'Period: ' + (fromDate||'') + ' to ' + (toDate||''),
      summaryCards: [
        { label: 'Cash Inflows',  value: fmt(inflows.total||0),                  color:'#059669' },
        { label: 'Cash Outflows', value: fmt(outflows.total||0),                 color:'#dc2626' },
        { label: 'Net Cash Flow', value: fmt(cashFlow.netCashFlow||0),           color:'#2563eb' },
        { label: 'Net Operating', value: fmt(op.netOperatingCashFlow||0),        color:'#7c3aed' },
      ],
      tableHeaders: [{label:'Particulars'},{label:'Amount (₹)',right:true}],
      tableRows: [
        [{value:'OPERATING ACTIVITIES',style:'font-weight:700;background:#dbeafe;color:#1a4f8a'},{value:''}],
        [{value:'── Cash Inflows',style:'font-weight:600;color:#059669;background:#f0fdf4'},{value:''}],
        [{value:'  Sales Receipts'},{value:fmt(inflows.salesReceipts||0),right:true,style:'color:#059669'}],
        [{value:'  Total Inflows',style:'font-weight:700'},{value:fmt(inflows.total||0),right:true,style:'font-weight:700;color:#059669'}],
        [{value:''},{value:''}],
        [{value:'── Cash Outflows',style:'font-weight:600;color:#dc2626;background:#fef2f2'},{value:''}],
        [{value:'  Purchase Payments'},{value:fmt(outflows.purchasePayments||0),right:true,style:'color:#dc2626'}],
        [{value:'  Expenses'},{value:fmt(outflows.expenses||0),right:true,style:'color:#dc2626'}],
        [{value:'  Total Outflows',style:'font-weight:700'},{value:fmt(outflows.total||0),right:true,style:'font-weight:700;color:#dc2626'}],
        [{value:''},{value:''}],
        [{value:'Net Operating Cash Flow',style:'font-weight:700;background:#eff6ff'},{value:fmt(op.netOperatingCashFlow||0),right:true,style:'font-weight:700;color:'+((op.netOperatingCashFlow||0)>=0?'#059669':'#dc2626')}],
        [{value:''},{value:''}],
        [{value:'WORKING CAPITAL',style:'font-weight:700;background:#dbeafe;color:#1a4f8a'},{value:''}],
        [{value:'  Customer Balance'},{value:fmt(cashFlow.customerNetBalance||0),right:true,style:'color:'+((cashFlow.customerNetBalance||0)>=0?'#059669':'#dc2626')}],
        [{value:'  Supplier Balance'},{value:fmt(cashFlow.supplierNetBalance||0),right:true,style:'color:'+((cashFlow.supplierNetBalance||0)>=0?'#059669':'#dc2626')}],
        [{value:'  Receivables'},{value:fmt(cashFlow.receivables||0),right:true,style:'color:#059669'}],
        [{value:'  Payables'},{value:fmt(cashFlow.payables||0),right:true,style:'color:#dc2626'}],
        [{value:''},{value:''}],
        [{value:'NET CASH FLOW',style:'font-weight:800;font-size:13px;background:'+((cashFlow.netCashFlow||0)>=0?'#d1fae5':'#fee2e2')},{value:fmt(cashFlow.netCashFlow||0),right:true,style:'font-weight:800;font-size:13px;color:'+((cashFlow.netCashFlow||0)>=0?'#059669':'#dc2626')}],
      ]
    });
  };

  const printStock = () => {
    if (!stock?.items?.length) { toast.error('Load Stock Summary first'); return; }
    doPrint({
      title: 'Stock Summary Report',
      subtitle: 'As on ' + new Date().toLocaleDateString('en-IN'),
      summaryCards: [
        { label: 'Total Items',   value: stock.totalItems||0,         color:'#2563eb' },
        { label: 'Stock Value',   value: fmt(stock.totalStockValue||0), color:'#059669' },
        { label: 'Low Stock',     value: stock.lowStockCount||0,      color:'#f59e0b' },
        { label: 'Out of Stock',  value: stock.outOfStockCount||0,    color:'#dc2626' },
      ],
      tableHeaders: [
        {label:'Item Code'},{label:'Item Name'},{label:'Category'},
        {label:'Stock',right:true},{label:'Unit'},
        {label:'Rate',right:true},{label:'Value',right:true},{label:'Status'}
      ],
      tableRows: [
        ...(stock?.items||[]).map(i=>{
          const qty = i.currentStock||0;
          const val = i.stockValue||(qty*(i.salesRate||i.purchaseRate||0));
          const status = qty<=0 ? 'Out of Stock' : qty<=(i.reorderLevel||0) ? 'Low Stock' : 'In Stock';
          const statusColor = qty<=0 ? 'color:#dc2626;font-weight:700' : qty<=(i.reorderLevel||0) ? 'color:#f59e0b' : 'color:#059669';
          return [
            {value:i.itemCode||'—'},{value:i.itemName||'—'},{value:i.categoryName||'—'},
            {value:qty,right:true,style:statusColor},
            {value:i.unit||'Nos'},
            {value:fmtN(i.salesRate||i.purchaseRate||0),right:true},
            {value:fmt(val),right:true,style:'color:#1a4f8a'},
            {value:status,style:statusColor},
          ];
        }),
        [{value:'TOTAL',style:'font-weight:800;background:#e8edf5'},{value:''},{value:''},
         {value:'',right:true},{value:''},
         {value:'',right:true},
         {value:fmt(stock.totalStockValue||0),right:true,style:'font-weight:800;color:#059669'},
         {value:''},
        ]
      ]
    });
  };

  const printReport = (title) => {
    if(title==='Trial Balance') return printTrial();
    if(title==='Balance Sheet') return printBS();
    if(title==='Stock Summary Report') return printStock();
  };

  const DateBar = ({ onFetch, label, reportTitle, onPrint, onExcel }) => (
    <div className="toolbar" style={{ marginBottom: 16, gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>From:</label>
      <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} style={{ height: 32 }} />
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>To:</label>
      <input type="date" value={toDate} onChange={e => setTo(e.target.value)} style={{ height: 32 }} />
      <button
        onClick={fillFY}
        style={{ height:32, fontSize:11, padding:'0 10px', background:'#eff6ff', color:'#1a4f8a', border:'1.5px solid #bfdbfe', borderRadius:6, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}
        title="Fill current financial year dates"
      >
        📅 {selectedFY.label}
      </button>
      <button className="btn btn-primary" onClick={onFetch} disabled={loading} style={{ height:32 }}>
        {loading ? '⏳ Loading...' : label}
      </button>
      {(reportTitle || onPrint) && (
        <>
          <button className="btn btn-outline" onClick={onPrint || (() => printReport(reportTitle))} style={{ height:32, fontSize:12 }}>
            🖨️ Print / PDF
          </button>
          {onExcel && (
            <button
              onClick={onExcel}
              style={{ height:32, fontSize:12, padding:'0 12px', background:'#16a34a', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}
            >
              📊 Export Excel
            </button>
          )}
        </>
      )}
    </div>
  );

  const StatCard = ({ label, value, color, isMoney = true }) => (
    <div style={{ background: 'white', border: `2px solid ${color}20`, borderTop: `4px solid ${color}`, borderRadius: 6, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontWeight: 700, color, fontSize: 14 }}>{isMoney ? fmt(value) : value}</div>
    </div>
  );

  return (
    <div>
      <div className="tabs">
        {TABS.map(([k, l]) => (
          <div key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      {/* ══════════════ P&L ══════════════ */}
      {tab === 'pl' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📊 Profit & Loss Statement</span></div>
          <div className="card-body">
            <DateBar
              label="Generate P&L"
              reportTitle="Profit & Loss Statement"
              onPrint={printPL}
              onFetch={() => {
                if (!fromDate || !toDate) { toast.error('Select date range'); return; }
                load(() => getProfitLoss(fromDate, toDate), setPl, 'Failed to load P&L');
              }}
            />
            {pl ? (
              <div id="report-content">
                <div style={{ background: '#1a4f8a', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  Profit & Loss — {pl.period}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    <tr style={{ background: '#dbeafe' }}>
                      <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, color: '#1a4f8a' }}>INCOME</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '7px 32px' }}>Sales Revenue ({pl.income?.invoiceCount || 0} invoices)</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', fontWeight: 600 }}>{fmt(pl.income?.sales)}</td>
                    </tr>
                    <tr style={{ background: '#eff6ff', borderBottom: '2px solid #1a4f8a' }}>
                      <td style={{ padding: '8px 16px', fontWeight: 700 }}>Total Income</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: 14 }}>{fmt(pl.income?.total)}</td>
                    </tr>
                    <tr style={{ background: '#fef9c3' }}>
                      <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, color: '#92400e' }}>COST OF GOODS SOLD</td>
                    </tr>
                    <tr style={{ background: '#fffbeb', borderBottom: '2px solid #f59e0b' }}>
                      <td style={{ padding: '8px 16px', fontWeight: 700 }}>Total COGS (Purchases)</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{fmt(pl.costOfGoods)}</td>
                    </tr>
                    <tr style={{ background: pl.grossProfit >= 0 ? '#d1fae5' : '#fee2e2' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 700, fontSize: 14 }}>GROSS PROFIT</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: pl.grossProfit >= 0 ? '#059669' : '#dc2626' }}>
                        {fmt(pl.grossProfit)} <span style={{ fontSize: 11, opacity: .7 }}>({pct(pl.grossProfitMargin)} margin)</span>
                      </td>
                    </tr>
                    <tr style={{ background: '#fee2e2' }}>
                      <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, color: '#991b1b' }}>OPERATING EXPENSES</td>
                    </tr>
                    {pl.expenses?.breakdown && Object.entries(pl.expenses.breakdown).map(([h, a]) => (
                      <tr key={h} style={{ borderBottom: '1px solid #fecaca' }}>
                        <td style={{ padding: '6px 32px', color: '#64748b' }}>{h}</td>
                        <td style={{ padding: '6px 16px', textAlign: 'right', color: '#ef4444' }}>{fmt(a)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fef2f2', borderBottom: '2px solid #ef4444' }}>
                      <td style={{ padding: '8px 16px', fontWeight: 700 }}>Total Expenses</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(pl.expenses?.total)}</td>
                    </tr>
                    <tr style={{ background: pl.netProfit >= 0 ? '#bbf7d0' : '#fecaca' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 15 }}>NET PROFIT / (LOSS)</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: pl.netProfit >= 0 ? '#059669' : '#dc2626' }}>
                        {fmt(pl.netProfit)} <span style={{ fontSize: 12, opacity: .8 }}>({pct(pl.netProfitMargin)} margin)</span>
                      </td>
                    </tr>
                    {pl.gst && (
                      <>
                        <tr style={{ background: '#f0f4ff' }}>
                          <td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, color: '#1a4f8a' }}>GST SUMMARY</td>
                        </tr>
                        <tr><td style={{ padding: '6px 32px' }}>Output GST (Sales)</td><td style={{ padding: '6px 16px', textAlign: 'right' }}>{fmt(pl.gst.outputGst)}</td></tr>
                        <tr><td style={{ padding: '6px 32px' }}>Input GST / ITC (Purchases)</td><td style={{ padding: '6px 16px', textAlign: 'right', color: '#16a34a' }}>({fmt(pl.gst.inputGst)})</td></tr>
                        <tr style={{ background: '#eff6ff', fontWeight: 700 }}>
                          <td style={{ padding: '8px 16px' }}>Net GST Payable</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', color: pl.gst.netGstPayable >= 0 ? '#dc2626' : '#16a34a' }}>{fmt(pl.gst.netGstPayable)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div>Select date range and generate P&L report</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ MONTHLY P&L ══════════════ */}
      {tab === 'monthly' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📅 Monthly P&L Statement</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Financial Year:</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ height: 32 }}>
                {Array.from({length: new Date().getFullYear()-1999}, (_,i) => 2000+i).reverse().map(y => <option key={y} value={y}>{y}–{y+1}</option>)}
              </select>
              <button className="btn btn-primary" onClick={() => load(() => getMonthlyPL(year), setMonthly, 'Failed')} disabled={loading}>
                {loading ? 'Loading...' : 'Generate'}
              </button>
              <button className="btn btn-outline" onClick={printMonthly} style={{ height:32, fontSize:12 }}>🖨️ Print / PDF</button>
            </div>
          </div>
          <div className="card-body">
            {monthly ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                  <StatCard label="Total Sales"     value={monthly.totals?.sales}     color="#1a4f8a" />
                  <StatCard label="Total Purchases" value={monthly.totals?.purchases} color="#d97706" />
                  <StatCard label="Total Expenses"  value={monthly.totals?.expenses}  color="#dc2626" />
                  <StatCard label="Net Profit"      value={monthly.totals?.netProfit} color={monthly.totals?.netProfit >= 0 ? '#059669' : '#dc2626'} />
                </div>
                <div style={{ marginBottom: 20, height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly.months}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '₹' + v.toLocaleString('en-IN', { notation: 'compact' })} />
                      <Tooltip formatter={(v, n) => [fmt(v), n]} />
                      <Legend />
                      <Bar dataKey="sales"     fill="#1a4f8a" name="Sales"     radius={[3, 3, 0, 0]} />
                      <Bar dataKey="purchases" fill="#f59e0b" name="Purchase"  radius={[3, 3, 0, 0]} />
                      <Bar dataKey="netProfit" fill="#10b981" name="Net Profit" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="text-right">Sales</th>
                        <th className="text-right">Purchases</th>
                        <th className="text-right">Gross Profit</th>
                        <th className="text-right">Expenses</th>
                        <th className="text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.months?.map((m, i) => (
                        <tr key={i}>
                          <td><strong>{m.month} {m.year}</strong></td>
                          <td className="text-right" style={{ color: '#1a4f8a' }}>{fmt(m.sales)}</td>
                          <td className="text-right" style={{ color: '#d97706' }}>{fmt(m.purchases)}</td>
                          <td className="text-right" style={{ color: m.grossProfit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{fmt(m.grossProfit)}</td>
                          <td className="text-right" style={{ color: '#dc2626' }}>{fmt(m.expenses)}</td>
                          <td className="text-right" style={{ fontWeight: 700, color: m.netProfit >= 0 ? '#059669' : '#dc2626' }}>{fmt(m.netProfit)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: '#f0f4ff', fontWeight: 700, borderTop: '2px solid #1a4f8a' }}>
                        <td>TOTAL</td>
                        <td className="text-right" style={{ color: '#1a4f8a' }}>{fmt(monthly.totals?.sales)}</td>
                        <td className="text-right" style={{ color: '#d97706' }}>{fmt(monthly.totals?.purchases)}</td>
                        <td className="text-right" style={{ color: '#16a34a' }}>{fmt(monthly.totals?.sales - monthly.totals?.purchases)}</td>
                        <td className="text-right" style={{ color: '#dc2626' }}>{fmt(monthly.totals?.expenses)}</td>
                        <td className="text-right" style={{ color: monthly.totals?.netProfit >= 0 ? '#059669' : '#dc2626' }}>{fmt(monthly.totals?.netProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                <div>Select Financial Year and click Generate</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ COMPARATIVE P&L ══════════════ */}
      {tab === 'comparative' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📈 Comparative P&L Analysis</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '12px 16px', border: '2px solid #c7d2fe' }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#1a4f8a', fontSize: 13 }}>📅 Period 1 (Base Period)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>From</label>
                    <input type="date" value={c1From} onChange={e => setC1From(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>To</label>
                    <input type="date" value={c1To} onChange={e => setC1To(e.target.value)} />
                  </div>
                </div>
              </div>
              <div style={{ background: '#fef9c3', borderRadius: 6, padding: '12px 16px', border: '2px solid #fcd34d' }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#92400e', fontSize: 13 }}>📅 Period 2 (Comparison Period)</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>From</label>
                    <input type="date" value={c2From} onChange={e => setC2From(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ margin: 0, flex: 1 }}>
                    <label>To</label>
                    <input type="date" value={c2To} onChange={e => setC2To(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 16, display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn btn-primary" onClick={fetchComparative} disabled={loading} style={{ padding: '8px 24px' }}>
                {loading ? 'Analyzing...' : '📈 Compare Periods'}
              </button>
              <button className="btn btn-outline" onClick={() => {
                if (!comparative) { toast.error('Load Comparative report first'); return; }
                doPrint({
                  title: 'Comparative P&L Analysis',
                  subtitle: `Period 1: ${c1From} to ${c1To} | Period 2: ${c2From} to ${c2To}`,
                  summaryCards: [
                    { label: 'P1 Sales', value: fmt(comparative.period1?.income?.total||0), color:'#059669' },
                    { label: 'P2 Sales', value: fmt(comparative.period2?.income?.total||0), color:'#2563eb' },
                    { label: 'P1 Net Profit', value: fmt(comparative.period1?.netProfit||0), color:'#059669' },
                    { label: 'P2 Net Profit', value: fmt(comparative.period2?.netProfit||0), color:'#2563eb' },
                  ],
                  tableHeaders: [{label:'Particulars'},{label:'Period 1',right:true},{label:'Period 2',right:true},{label:'Change',right:true}],
                  tableRows: [
                    [{value:'Sales'},{value:fmt(comparative.period1?.income?.total||0),right:true},{value:fmt(comparative.period2?.income?.total||0),right:true},{value:fmt((comparative.period2?.income?.total||0)-(comparative.period1?.income?.total||0)),right:true}],
                    [{value:'Purchases'},{value:fmt(comparative.period1?.costOfGoods||0),right:true},{value:fmt(comparative.period2?.costOfGoods||0),right:true},{value:fmt((comparative.period2?.costOfGoods||0)-(comparative.period1?.costOfGoods||0)),right:true}],
                    [{value:'Expenses'},{value:fmt(comparative.period1?.expenses?.total||0),right:true},{value:fmt(comparative.period2?.expenses?.total||0),right:true},{value:fmt((comparative.period2?.expenses?.total||0)-(comparative.period1?.expenses?.total||0)),right:true}],
                    [{value:'Net Profit',style:'font-weight:700'},{value:fmt(comparative.period1?.netProfit||0),right:true,style:'font-weight:700'},{value:fmt(comparative.period2?.netProfit||0),right:true,style:'font-weight:700'},{value:fmt((comparative.period2?.netProfit||0)-(comparative.period1?.netProfit||0)),right:true,style:'font-weight:700'}],
                  ]
                });
              }} style={{ padding: '8px 16px', fontSize:12 }}>🖨️ Print / PDF</button>
            </div>

            {comparative ? (
              <>
                {/* Variance summary badges */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    ['Sales Change',      comparative.variance?.salesChange,      comparative.variance?.salesChange >= 0],
                    ['Gross Profit Change', comparative.variance?.grossProfitChange, comparative.variance?.grossProfitChange >= 0],
                    ['Net Profit Change', comparative.variance?.netProfitChange,  comparative.variance?.netProfitChange >= 0],
                  ].map(([l, v, isGood]) => (
                    <div key={l} style={{
                      flex: 1, background: isGood ? '#d1fae5' : '#fee2e2',
                      border: `2px solid ${isGood ? '#10b981' : '#ef4444'}`,
                      borderRadius: 8, padding: '10px 16px', textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{l}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isGood ? '#059669' : '#dc2626' }}>
                        {isGood ? '▲' : '▼'} {fmt(Math.abs(v))}
                      </div>
                    </div>
                  ))}
                  <div style={{
                    flex: 1, background: comparative.variance?.isBetter ? '#d1fae5' : '#fee2e2',
                    border: `2px solid ${comparative.variance?.isBetter ? '#10b981' : '#ef4444'}`,
                    borderRadius: 8, padding: '10px 16px', textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Performance</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: comparative.variance?.isBetter ? '#059669' : '#dc2626' }}>
                      {comparative.variance?.isBetter ? '✅ IMPROVED' : '⚠️ DECLINED'}
                    </div>
                  </div>
                </div>

                {/* Comparison Chart */}
                <div style={{ marginBottom: 20, height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Sales',       p1: comparative.period1?.sales,     p2: comparative.period2?.sales },
                      { name: 'Purchases',   p1: comparative.period1?.purchases, p2: comparative.period2?.purchases },
                      { name: 'Gross Profit',p1: comparative.period1?.grossProfit, p2: comparative.period2?.grossProfit },
                      { name: 'Expenses',    p1: comparative.period1?.expenses,  p2: comparative.period2?.expenses },
                      { name: 'Net Profit',  p1: comparative.period1?.netProfit, p2: comparative.period2?.netProfit },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => '₹' + v.toLocaleString('en-IN', { notation: 'compact' })} />
                      <Tooltip formatter={(v, n) => [fmt(v), n]} />
                      <Legend />
                      <Bar dataKey="p1" fill="#1a4f8a" name={comparative.period1?.label || 'Period 1'} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="p2" fill="#f59e0b" name={comparative.period2?.label || 'Period 2'} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Comparison Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#1a4f8a', color: 'white' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left' }}>Metric</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Period 1 ({comparative.period1?.label})</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Period 2 ({comparative.period2?.label})</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Change</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right' }}>Change %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Sales Revenue',  comparative.period1?.sales,     comparative.period2?.sales],
                      ['Purchases (COGS)',comparative.period1?.purchases, comparative.period2?.purchases],
                      ['Gross Profit',   comparative.period1?.grossProfit,comparative.period2?.grossProfit],
                      ['Expenses',       comparative.period1?.expenses,  comparative.period2?.expenses],
                      ['Net Profit',     comparative.period1?.netProfit, comparative.period2?.netProfit],
                    ].map(([label, v1, v2]) => {
                      const diff = (v2 || 0) - (v1 || 0);
                      const diffPct = v1 ? (diff / Math.abs(v1)) * 100 : 0;
                      const isGood = label.includes('Purchase') || label.includes('Expense') ? diff <= 0 : diff >= 0;
                      const isLast = label === 'Net Profit';
                      return (
                        <tr key={label} style={{ borderBottom: '1px solid #e2e8f0', background: isLast ? '#f0f4ff' : 'inherit', fontWeight: isLast ? 700 : 'normal' }}>
                          <td style={{ padding: '8px 16px' }}>{label}</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right' }}>{fmt(v1)}</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right' }}>{fmt(v2)}</td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', color: isGood ? '#059669' : '#dc2626', fontWeight: 600 }}>
                            {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff))}
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'right', color: isGood ? '#059669' : '#dc2626' }}>
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
                <div>Select two date ranges to compare business performance</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>e.g. Q1 vs Q2, or this year vs last year</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ TRIAL BALANCE ══════════════ */}
      {tab === 'trial' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚖️ Trial Balance</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => load(getTrialBalance, setTrial, 'Failed')} disabled={loading}>
                {loading ? 'Loading...' : 'Fetch Trial Balance'}
              </button>
              <button className="btn btn-outline" onClick={() => printReport('Trial Balance')} style={{ fontSize:12 }}>🖨️ Print / PDF</button>
              <button onClick={exportTrial} style={{ fontSize:12, padding:'4px 12px', background:'#16a34a', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>📊 Excel</button>
            </div>
          </div>
          <div className="card-body">
            {trial ? (
              <div id="report-content">
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  {[['Total Debit', '#1a4f8a', trial.totalDebit], ['Total Credit', '#16a34a', trial.totalCredit],
                    ['Difference', trial.isBalanced ? '#16a34a' : '#dc2626', trial.difference]].map(([l, c, v]) => (
                    <div key={l} style={{ flex: 1, background: 'white', border: `2px solid ${c}20`, borderTop: `4px solid ${c}`, borderRadius: 6, padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{l}</div>
                      <div style={{ fontWeight: 700, color: c, fontSize: 15 }}>{fmt(v)}</div>
                    </div>
                  ))}
                  <div style={{ flex: 1, background: trial.isBalanced ? '#d1fae5' : '#fee2e2', border: `2px solid ${trial.isBalanced ? '#10b981' : '#ef4444'}`, borderRadius: 6, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontWeight: 700, color: trial.isBalanced ? '#059669' : '#dc2626', fontSize: 14 }}>
                      {trial.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}
                    </span>
                  </div>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Account Code</th><th>Account Name</th><th>Group</th><th className="text-right">Debit ₹</th><th className="text-right">Credit ₹</th></tr>
                    </thead>
                    <tbody>
                      {trial.accounts?.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontSize: 11, color: '#94a3b8' }}>{a.accountCode || '—'}</td>
                          <td><strong>{a.accountName}</strong></td>
                          <td><span className="badge badge-secondary">{a.accountGroup}</span></td>
                          <td className="text-right" style={{ color: '#1a4f8a', fontWeight: a.debit ? 600 : 400 }}>{a.debit ? fmt(a.debit) : '—'}</td>
                          <td className="text-right" style={{ color: '#16a34a', fontWeight: a.credit ? 600 : 400 }}>{a.credit ? fmt(a.credit) : '—'}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '2px solid #1a4f8a', background: '#f0f4ff', fontWeight: 700 }}>
                        <td colSpan={3}>TOTAL</td>
                        <td className="text-right" style={{ color: '#1a4f8a' }}>{fmt(trial.totalDebit)}</td>
                        <td className="text-right" style={{ color: '#16a34a' }}>{fmt(trial.totalCredit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}><div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div><div>Click "Fetch Trial Balance" to load</div></div>}
          </div>
        </div>
      )}

      {/* ══════════════ BALANCE SHEET ══════════════ */}
      {tab === 'bs' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏦 Balance Sheet</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => load(getBalanceSheet, setBs, 'Failed')} disabled={loading}>
                {loading ? 'Loading...' : 'Generate Balance Sheet'}
              </button>
              <button className="btn btn-outline" onClick={() => printReport('Balance Sheet')} style={{ fontSize:12 }}>🖨️ Print / PDF</button>
              <button onClick={exportBS} style={{ fontSize:12, padding:'4px 12px', background:'#16a34a', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>📊 Excel</button>
            </div>
          </div>
          <div className="card-body">
            {bs ? (
              <div id="report-content">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <span style={{ background: bs.isBalanced ? '#d1fae5' : '#fee2e2', color: bs.isBalanced ? '#059669' : '#dc2626', padding: '4px 12px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                    {bs.isBalanced ? '✅ Assets = Liabilities + Equity' : '❌ Does Not Balance'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ background: '#1a4f8a', color: 'white', padding: '10px 14px', fontWeight: 700, borderRadius: '6px 6px 0 0', fontSize: 13 }}>ASSETS</div>
                    {[['Fixed Assets', 'fixedAssets'], ['Current Assets', 'currentAssets'], ['Cash & Bank', 'cashAndBank']].map(([l, k]) => (
                      <div key={k} style={{ borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                        <div style={{ fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', padding: '4px 14px', background: '#f8fafc' }}>{l}</div>
                        {bs.assets?.[k]?.length > 0
                          ? bs.assets[k].map((a, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 20px', fontSize: 12 }}>
                              <span>{a.accountName}</span><span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
                            </div>
                          ))
                          : <div style={{ padding: '4px 20px', color: '#94a3b8', fontSize: 11 }}>No entries</div>}
                      </div>
                    ))}
                    <div style={{ background: '#1a4f8a', color: 'white', padding: '10px 14px', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>TOTAL ASSETS</span><span>{fmt(bs.assets?.totalAssets)}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ background: '#0f2d5a', color: 'white', padding: '10px 14px', fontWeight: 700, borderRadius: '6px 6px 0 0', fontSize: 13 }}>LIABILITIES & EQUITY</div>
                    {[['Capital', 'capital'], ['Retained Earnings', 'retainedEarnings'], ['Current Liabilities', 'currentLiabilities'], ['Long-term Liabilities', 'longTermLiabilities']].map(([l, k]) => (
                      <div key={k} style={{ borderBottom: '1px solid #e2e8f0', padding: '8px 0' }}>
                        <div style={{ fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', padding: '4px 14px', background: '#f8fafc' }}>{l}</div>
                        {bs.liabilitiesAndEquity?.[k]?.length > 0
                          ? bs.liabilitiesAndEquity[k].map((a, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 20px', fontSize: 12 }}>
                              <span>{a.accountName}</span><span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
                            </div>
                          ))
                          : <div style={{ padding: '4px 20px', color: '#94a3b8', fontSize: 11 }}>No entries</div>}
                      </div>
                    ))}
                    <div style={{ background: '#1e40af', color: 'white', padding: '7px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>Net Profit (Current Year)</span><span>{fmt(bs.liabilitiesAndEquity?.netProfitCurrentYear)}</span>
                    </div>
                    <div style={{ background: '#0f2d5a', color: 'white', padding: '10px 14px', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span>TOTAL LIABILITIES & EQUITY</span><span>{fmt(bs.liabilitiesAndEquity?.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}><div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div><div>Click "Generate Balance Sheet"</div></div>}
          </div>
        </div>
      )}

      {/* ══════════════ CASH FLOW ══════════════ */}
      {tab === 'cashflow' && (
        <div className="card">
          <div className="card-header"><span className="card-title">💸 Cash Flow Statement</span></div>
          <div className="card-body">
            <DateBar
              label="Generate Cash Flow"
              reportTitle="Cash Flow Statement"
              onPrint={printCashFlow}
              onFetch={() => {
                if (!fromDate || !toDate) { toast.error('Select date range'); return; }
                load(() => getCashFlow(fromDate, toDate), setCashFlow, 'Failed');
              }}
            />
            {cashFlow ? (
              <div id="report-content">
                <div style={{ background: '#1a4f8a', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontWeight: 700, marginBottom: 2 }}>
                  Cash Flow Statement — {cashFlow.period}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    <tr style={{ background: '#dbeafe' }}><td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, color: '#1a4f8a' }}>OPERATING ACTIVITIES</td></tr>
                    <tr style={{ background: '#f0f9ff' }}><td colSpan={2} style={{ padding: '6px 16px', fontWeight: 600, color: '#2563eb', fontSize: 12 }}>Cash Inflows</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 32px' }}>Sales Receipts</td>
                      <td style={{ padding: '6px 16px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{fmt(cashFlow.operatingActivities?.cashInflows?.salesReceipts)}</td>
                    </tr>
                    <tr style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', fontWeight: 600 }}>
                      <td style={{ padding: '7px 16px' }}>Total Cash Inflows</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', color: '#16a34a' }}>{fmt(cashFlow.operatingActivities?.cashInflows?.total)}</td>
                    </tr>
                    <tr style={{ background: '#fef2f2' }}><td colSpan={2} style={{ padding: '6px 16px', fontWeight: 600, color: '#dc2626', fontSize: 12 }}>Cash Outflows</td></tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 32px' }}>Purchase Payments</td>
                      <td style={{ padding: '6px 16px', textAlign: 'right', color: '#dc2626' }}>{fmt(cashFlow.operatingActivities?.cashOutflows?.purchasePayments)}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 32px' }}>Operating Expenses</td>
                      <td style={{ padding: '6px 16px', textAlign: 'right', color: '#dc2626' }}>{fmt(cashFlow.operatingActivities?.cashOutflows?.expenses)}</td>
                    </tr>
                    <tr style={{ background: '#fef2f2', borderBottom: '2px solid #ef4444', fontWeight: 600 }}>
                      <td style={{ padding: '7px 16px' }}>Total Cash Outflows</td>
                      <td style={{ padding: '7px 16px', textAlign: 'right', color: '#dc2626' }}>{fmt(cashFlow.operatingActivities?.cashOutflows?.total)}</td>
                    </tr>
                    <tr style={{ background: cashFlow.operatingActivities?.netOperatingCashFlow >= 0 ? '#d1fae5' : '#fee2e2' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Net Operating Cash Flow</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: cashFlow.operatingActivities?.netOperatingCashFlow >= 0 ? '#059669' : '#dc2626' }}>
                        {fmt(cashFlow.operatingActivities?.netOperatingCashFlow)}
                      </td>
                    </tr>
                    <tr style={{ background: cashFlow.netCashFlow >= 0 ? '#bbf7d0' : '#fecaca' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 15 }}>NET CASH FLOW</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: cashFlow.netCashFlow >= 0 ? '#059669' : '#dc2626' }}>
                        {fmt(cashFlow.netCashFlow)}
                      </td>
                    </tr>
                    <tr style={{ background: '#f0f4ff' }}><td colSpan={2} style={{ padding: '8px 16px', fontWeight: 700, color: '#1a4f8a' }}>WORKING CAPITAL (Actual Net Balances)</td></tr>
                    {/* Customer Net Balance */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: (cashFlow.customerNetBalance||0) < 0 ? '#fef2f2' : 'white' }}>
                      <td style={{ padding: '6px 32px' }}>
                        Customer Net Balance
                        <span style={{fontSize:11,marginLeft:8,padding:'2px 6px',borderRadius:10,
                          background:(cashFlow.customerNetBalance||0)>=0?'#d1fae5':'#fee2e2',
                          color:(cashFlow.customerNetBalance||0)>=0?'#065f46':'#991b1b',fontWeight:600}}>
                          {(cashFlow.customerNetBalance||0)>=0 ? '📥 Customers owe us' : '📤 We owe customers (Refund Pending)'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 16px', textAlign: 'right', fontWeight: 700, fontSize:14,
                        color: (cashFlow.customerNetBalance||0) >= 0 ? '#d97706' : '#dc2626' }}>
                        {fmt(cashFlow.customerNetBalance||0)}
                      </td>
                    </tr>
                    {/* Supplier Net Balance */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: (cashFlow.supplierNetBalance||0) < 0 ? '#fef2f2' : 'white' }}>
                      <td style={{ padding: '6px 32px' }}>
                        Supplier Net Balance
                        <span style={{fontSize:11,marginLeft:8,padding:'2px 6px',borderRadius:10,
                          background:(cashFlow.supplierNetBalance||0)>=0?'#ede9fe':'#fee2e2',
                          color:(cashFlow.supplierNetBalance||0)>=0?'#5b21b6':'#991b1b',fontWeight:600}}>
                          {(cashFlow.supplierNetBalance||0)>=0 ? '📤 We owe supplier' : '📥 Supplier owes us (Credit/Return Pending)'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 16px', textAlign: 'right', fontWeight: 700, fontSize:14,
                        color: (cashFlow.supplierNetBalance||0) >= 0 ? '#7c3aed' : '#dc2626' }}>
                        {fmt(cashFlow.supplierNetBalance||0)}
                      </td>
                    </tr>
                    {/* Invoice-wise outstanding (for reference) */}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background:'#f8fafc' }}>
                      <td style={{ padding: '5px 32px', fontSize:12, color:'#64748b' }}>↳ Invoice Outstanding (Receivables)</td>
                      <td style={{ padding: '5px 16px', textAlign: 'right', fontSize:12, color: '#d97706' }}>{fmt(cashFlow.receivables)}</td>
                    </tr>
                    <tr style={{ background:'#f8fafc' }}>
                      <td style={{ padding: '5px 32px', fontSize:12, color:'#64748b' }}>↳ Invoice Outstanding (Payables)</td>
                      <td style={{ padding: '5px 16px', textAlign: 'right', fontSize:12, color: '#7c3aed' }}>{fmt(cashFlow.payables)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}><div style={{ fontSize: 40, marginBottom: 12 }}>💸</div><div>Select date range and generate Cash Flow</div></div>}
          </div>
        </div>
      )}

      {/* ══════════════ STOCK SUMMARY ══════════════ */}
      {tab === 'stock' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📦 Stock Summary Report</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => load(getStockSummary, setStock, 'Failed')} disabled={loading}>
                {loading ? 'Loading...' : 'Load Stock Summary'}
              </button>
              <button className="btn btn-outline" onClick={() => printReport('Stock Summary Report')} style={{ fontSize:12 }}>🖨️ Print / PDF</button>
              <button onClick={exportStock} style={{ fontSize:12, padding:'4px 12px', background:'#16a34a', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600 }}>📊 Excel</button>
            </div>
          </div>
          <div className="card-body">
            {stock ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  <StatCard label="Total Items"    value={stock.totalItems}       color="#1a4f8a" isMoney={false} />
                  <StatCard label="Stock Value"    value={stock.totalStockValue}  color="#16a34a" />
                  <StatCard label="Out of Stock"   value={stock.outOfStockCount}  color="#dc2626" isMoney={false} />
                  <StatCard label="Low Stock"      value={stock.lowStockCount}    color="#d97706" isMoney={false} />
                </div>
                {stock.categoryWiseValue && Object.keys(stock.categoryWiseValue).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: '#1a4f8a', fontSize: 13 }}>Category-wise Stock Value</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {Object.entries(stock.categoryWiseValue).map(([cat, val]) => (
                        <div key={cat} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '6px 12px', fontSize: 12 }}>
                          <strong>{cat}</strong>: <span style={{ color: '#1a4f8a', fontWeight: 700 }}>{fmt(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Item Code</th><th>Item Name</th><th>Category</th><th>Unit</th>
                        <th className="text-right">Stock Qty</th><th className="text-right">Rate</th>
                        <th className="text-right">Stock Value</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {stock.items?.map(item => {
                        const isLow = item.currentStock <= item.reorderLevel && item.currentStock > 0;
                        const isOut = item.currentStock <= 0;
                        const val   = item.currentStock * item.purchaseRate;
                        return (
                          <tr key={item.id}>
                            <td style={{ fontSize: 11, color: '#94a3b8' }}>{item.itemCode}</td>
                            <td><strong>{item.itemName}</strong></td>
                            <td style={{ fontSize: 12 }}>{item.categoryName || '—'}</td>
                            <td style={{ fontSize: 12 }}>{item.unit}</td>
                            <td className="text-right" style={{ fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : '#059669' }}>
                              {item.currentStock} {item.unit}
                            </td>
                            <td className="text-right">{fmt(item.purchaseRate)}</td>
                            <td className="text-right" style={{ fontWeight: 600, color: '#1a4f8a' }}>{fmt(val)}</td>
                            <td>
                              <span style={{ background: isOut ? '#fee2e2' : isLow ? '#fef9c3' : '#d1fae5', color: isOut ? '#dc2626' : isLow ? '#92400e' : '#065f46', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                                {isOut ? '🔴 Out of Stock' : isLow ? '🟡 Low Stock' : '🟢 In Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f0f4ff', fontWeight: 700, borderTop: '2px solid #1a4f8a' }}>
                        <td colSpan={6}>TOTAL STOCK VALUE</td>
                        <td className="text-right" style={{ color: '#1a4f8a', fontSize: 14 }}>{fmt(stock.totalStockValue)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div className="text-center" style={{ padding: 48, color: '#94a3b8' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📦</div><div>Click "Load Stock Summary"</div></div>}
          </div>
        </div>
      )}
      {/* ══════════════ STOCK LEDGER ══════════════ */}
      {tab === 'stockledger' && (
        <StockLedgerTab />
      )}
    </div>
  );
}

function StockLedgerTab() {
  const [items,    setItems]    = React.useState([]);
  const [selItem,  setSelItem]  = React.useState('');
  const [fromDate, setFrom]     = React.useState('');
  const [toDate,   setTo]       = React.useState('');
  const [ledger,   setLedger]   = React.useState(null);
  const [loading,  setLoading]  = React.useState(false);
  const [search,   setSearch]   = React.useState('');

  React.useEffect(() => {
    getItems().then(r => setItems(Array.isArray(r.data) ? r.data : (r.data?.content || [])))
      .catch(() => {});
  }, []);

  const fmt2 = n => '₹' + (Number(n)||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });

  const loadLedger = async () => {
    if (!selItem) { toast.error('Please select an item'); return; }
    setLoading(true);
    try {
      const res = await getStockLedger(selItem, fromDate||null, toDate||null);
      setLedger(res.data);
    } catch { toast.error('Failed to load stock ledger'); }
    setLoading(false);
  };

  const filteredTx = (ledger?.movements || []).filter(tx => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (tx.itemName||'').toLowerCase().includes(q)
      || (tx.movementType||'').toLowerCase().includes(q)
      || (tx.referenceNumber||'').toLowerCase().includes(q);
  });

  const printLedger = () => {
    if (!ledger) { toast.error('Load ledger first'); return; }
    const selectedItem = items.find(i => String(i.id) === String(selItem));
    doPrint({
      title: 'Stock Ledger',
      subtitle: `Item: ${selectedItem?.itemName||''} | ${fromDate||''} to ${toDate||''}`,
      summaryCards: [
        { label: 'Item', value: selectedItem?.itemName||'—' },
        { label: 'Unit', value: selectedItem?.unit||'—' },
        { label: 'Current Stock', value: (selectedItem?.currentStock||0)+' '+(selectedItem?.unit||''), color:'#1a4f8a' },
      ],
      tableHeaders: [
        {label:'Date'},{label:'Reference'},{label:'Type'},{label:'In',right:true},{label:'Out',right:true},{label:'Balance',right:true}
      ],
      tableRows: filteredTx.map(tx => [
        {value:tx.movementDate||'—'},
        {value:tx.referenceNumber||'—'},
        {value:tx.movementType||'—'},
        {value:tx.movementType==='STOCK_IN'||tx.movementType==='OPENING'?tx.quantity:'—', right:true, style:'color:#059669;font-weight:600'},
        {value:tx.movementType==='STOCK_OUT'?tx.quantity:'—', right:true, style:'color:#dc2626;font-weight:600'},
        {value:(tx.balanceQty||0)+' '+(ledger?.unit||''), right:true, style:'font-weight:600'}
      ])
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📋 Stock Ledger Report</span>
        <button className="btn btn-outline" onClick={printLedger} disabled={!ledger} style={{ fontSize:12 }}>🖨️ Print</button>
      </div>
      <div className="card-body">
        {/* Filters */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:16, padding:'12px 14px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
          <div style={{ flex:'1 1 200px' }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>SELECT ITEM *</label>
            <select value={selItem} onChange={e => setSelItem(e.target.value)} style={{ width:'100%', height:34, fontSize:12, borderRadius:6, border:'1px solid #d1d5db', padding:'0 8px' }}>
              <option value="">— Select Item —</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.itemCode} — {item.itemName}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>FROM DATE</label>
            <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} style={{ height:34, fontSize:12, borderRadius:6, border:'1px solid #d1d5db', padding:'0 8px' }} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:3 }}>TO DATE</label>
            <input type="date" value={toDate} onChange={e => setTo(e.target.value)} style={{ height:34, fontSize:12, borderRadius:6, border:'1px solid #d1d5db', padding:'0 8px' }} />
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <button className="btn btn-primary" onClick={loadLedger} disabled={loading || !selItem}>
              {loading ? '⏳ Loading...' : '📋 Load Ledger'}
            </button>
          </div>
        </div>

        {ledger ? (
          <>
            {/* Item Info Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
              {[
                ['Current Stock',    ledger.currentStock + ' ' + (ledger.unit||''), '#1a4f8a'],
                ['Opening Balance',  ledger.openingBalance + ' ' + (ledger.unit||''), '#2563eb'],
                ['Total IN',         ledger.totalIn + ' ' + (ledger.unit||''), '#16a34a'],
                ['Total OUT',        ledger.totalOut + ' ' + (ledger.unit||''), '#dc2626'],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:`${c}08`, border:`2px solid ${c}20`, borderTop:`3px solid ${c}`, borderRadius:8, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, marginBottom:3 }}>{l}</div>
                  <div style={{ fontWeight:800, color:c, fontSize:16 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Search within transactions */}
            <div style={{ marginBottom:10 }}>
              <input
                type="text"
                placeholder="🔍  Search transactions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width:300, height:32, fontSize:12, padding:'0 10px', border:'1.5px solid #e2e8f0', borderRadius:6, outline:'none' }}
              />
              {search && <span style={{ fontSize:12, color:'#64748b', marginLeft:8 }}>{filteredTx.length} results</span>}
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Ref #</th>
                    <th className="text-right">In (Qty)</th>
                    <th className="text-right">Out (Qty)</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.length > 0 ? filteredTx.map((tx, i) => {
                    const isIn  = tx.movementType === 'STOCK_IN'  || tx.movementType === 'OPENING' || tx.movementType === 'ADJUSTMENT_IN';
                    const isOut = tx.movementType === 'STOCK_OUT' || tx.movementType === 'ADJUSTMENT_OUT';
                    return (
                    <tr key={i}>
                      <td style={{ whiteSpace:'nowrap', fontSize:12 }}>{tx.movementDate || '—'}</td>
                      <td style={{ fontSize:12 }}>{tx.movementType?.replace(/_/g,' ') || '—'}</td>
                      <td style={{ fontSize:11, color:'#94a3b8' }}>{tx.referenceNumber || '—'}</td>
                      <td className="text-right" style={{ fontWeight:700, color:'#16a34a' }}>
                        {isIn ? `+${tx.quantity}` : ''}
                      </td>
                      <td className="text-right" style={{ fontWeight:700, color:'#dc2626' }}>
                        {isOut ? `-${tx.quantity}` : ''}
                      </td>
                      <td className="text-right" style={{ fontWeight:800, color:'#1a4f8a', fontSize:13 }}>
                        {tx.balanceQty ?? ''}
                      </td>
                      <td className="text-right">—</td>
                      <td className="text-right">—</td>
                    </tr>
                    );
                  }) : (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:24, color:'#94a3b8' }}>
                      {search ? `No results for "${search}"` : 'No transactions found'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Select an item and click "Load Ledger"</div>
            <div style={{ fontSize:12 }}>View complete stock movement history for any inventory item</div>
          </div>
        )}
      </div>
    </div>
  );
}
