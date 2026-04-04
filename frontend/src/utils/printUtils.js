import { getCompanySettings } from '../services/api';

// ─── Formatters ────────────────────────────────────────────
const fmt  = n => '₹' + (Number(n)||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtN = n => (Number(n)||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
const n    = v => (Number(v)||0).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });

const getCompany = async () => {
  try { const r = await getCompanySettings(); return r.data || {}; }
  catch { return {}; }
};

// ─── Amount in Words ───────────────────────────────────────
function amountInWords(amount) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function toWords(num) {
    if (num === 0) return '';
    if (num < 20) return ones[num] + ' ';
    if (num < 100) return tens[Math.floor(num/10)] + ' ' + ones[num%10] + ' ';
    if (num < 1000) return ones[Math.floor(num/100)] + ' Hundred ' + toWords(num%100);
    if (num < 100000) return toWords(Math.floor(num/1000)) + 'Thousand ' + toWords(num%1000);
    if (num < 10000000) return toWords(Math.floor(num/100000)) + 'Lakh ' + toWords(num%100000);
    return toWords(Math.floor(num/10000000)) + 'Crore ' + toWords(num%10000000);
  }

  const num = Number(amount) || 0;

  // ✅ Correct split
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let words = 'INR ' + (toWords(rupees).trim() || 'Zero') + ' Rupees';

  if (paise > 0) {
    words += ' and ' + toWords(paise).trim() + ' Paise';
  }

  words += ' Only';

  return words;
}

// ─── CSS Styles (shared across all copies) ─────────────────
function getStyles(color) {
  color = color || '#1a4f8a';
  return [
    '@page { margin:8mm; }',
    '* { box-sizing:border-box; margin:0; padding:0; }',
    'body { font-family:Arial,sans-serif; font-size:11px; color:#111; background:#fff; }',
    '.copy-page { max-width:860px; margin:0 auto 0; padding:16px; border:2px solid '+color+'; page-break-after:always; }',
    '.copy-page:last-child { page-break-after:auto; }',
    '.copy-label { text-align:right; font-size:9px; font-weight:700; color:'+color+'; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }',
    '.invoice-title { text-align:center; font-size:17px; font-weight:900; color:'+color+'; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; }',
    '.hline { border-bottom:2px solid '+color+'; margin-bottom:8px; }',
    '.hline2 { border-bottom:1.5px solid '+color+'; margin:8px 0; }',
    '.header-grid { display:table; width:100%; margin-bottom:6px; }',
    '.header-left { display:table-cell; width:60%; vertical-align:top; padding-right:12px; }',
    '.header-right { display:table-cell; width:40%; vertical-align:top; text-align:right; }',
    '.co-name { font-size:15px; font-weight:900; color:'+color+'; }',
    '.co-info { font-size:10px; color:#444; line-height:1.6; margin-top:3px; }',
    '.meta-table { border-collapse:collapse; margin-left:auto; }',
    '.meta-table td { padding:2px 3px; font-size:11px; white-space:nowrap; }',
    '.party-grid { display:table; width:100%; border:1px solid '+color+'; margin-bottom:10px; }',
    '.party-box { display:table-cell; width:50%; padding:8px 10px; vertical-align:top; }',
    '.party-box:first-child { border-right:1px solid '+color+'; }',
    '.party-box .lbl { font-size:9px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }',
    '.party-box .nm  { font-size:12px; font-weight:700; }',
    '.party-box .info { font-size:10px; color:#444; line-height:1.7; margin-top:2px; }',
    'table.items { width:100%; border-collapse:collapse; border:1px solid '+color+'; font-size:11px; }',
    'table.items thead tr { background:'+color+' !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    'table.items thead th { padding:6px 7px; color:#fff !important; font-weight:700; border:1px solid '+color+'; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    'table.items thead th.r { text-align:right; }',
    'table.items tbody tr:nth-child(even) { background:#f8fafc; }',
    'table.items tbody td { padding:5px 7px; border:1px solid #dde1e7; }',
    'table.items tbody td.r { text-align:right; white-space:nowrap; }',
    '.tot-row { display:flex; justify-content:flex-end; margin-top:8px; }',
    '.tot-box { width:310px; border:1px solid '+color+'; overflow:hidden; }',
    '.tot-box table { font-size:11px; width:100%; border-collapse:collapse; }',
    '.tot-box td { padding:4px 10px; border-bottom:1px solid #f0f0f0; white-space:nowrap; }',
    '.tot-box td:last-child { text-align:right; font-weight:600; }',
    '.tot-box .grand td { background:'+color+' !important; color:#fff !important; font-size:13px; font-weight:800; padding:6px 10px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    '.words-row { background:#f8fafc; border:1px solid '+color+'; padding:6px 10px; margin-top:8px; font-size:10px; line-height:1.7; }',
    '.words-row b { color:'+color+'; }',
    'table.hsn-tbl { width:100%; border-collapse:collapse; border:1px solid '+color+'; margin-top:4px; font-size:10px; }',
    'table.hsn-tbl thead tr { background:'+color+' !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    'table.hsn-tbl thead th { padding:5px 7px; color:#fff !important; font-weight:700; border:1px solid '+color+'; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    'table.hsn-tbl thead th.r { text-align:right; }',
    'table.hsn-tbl tbody td { padding:4px 7px; border:1px solid #dde1e7; }',
    'table.hsn-tbl tbody td.r { text-align:right; }',
    'table.hsn-tbl tfoot td { padding:4px 7px; border:1px solid '+color+'; font-weight:700; background:#f1f5f9; }',
    'table.hsn-tbl tfoot td.r { text-align:right; }',
    '.two-col { display:table; width:100%; border:1px solid '+color+'; margin-top:12px; }',
    '.bank-box { display:table-cell; width:55%; padding:10px 12px; border-right:1px solid '+color+'; vertical-align:top; }',
    '.bank-box .lbl { font-size:9px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px; }',
    '.bank-box table { border:none; background:none; }',
    '.bank-box table td { padding:2px 0; font-size:10px; border:none; background:none !important; }',
    '.bank-box table td:first-child { font-weight:700; padding-right:10px; color:#333; width:70px; }',
    '.sign-box { display:table-cell; width:45%; padding:10px 12px; vertical-align:top; text-align:center; }',
    '.sign-box .lbl { font-size:9px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; }',
    '.sign-line { border-top:1px solid #999; padding-top:4px; font-size:10px; color:#555; margin-top:36px; }',
    '.recv-area { display:table; width:100%; border:1px solid '+color+'; margin-top:8px; }',
    '.recv-left { display:table-cell; width:50%; padding:8px 10px; border-right:1px solid '+color+'; vertical-align:top; }',
    '.recv-right { display:table-cell; width:50%; padding:8px 10px; text-align:center; vertical-align:bottom; }',
    '.recv-lbl { font-size:9px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px; }',
    '.recv-line { border-top:1px solid #999; padding-top:4px; font-size:10px; color:#555; margin-top:30px; text-align:center; }',
    '.notes-tc { display:table; width:100%; border:1px solid '+color+'; margin-top:8px; }',
    '.notes-cell { display:table-cell; width:40%; padding:8px 10px; border-right:1px solid '+color+'; vertical-align:top; font-size:10px; line-height:1.7; }',
    '.tc-cell { display:table-cell; width:60%; padding:8px 10px; vertical-align:top; font-size:10px; }',
    '.notes-cell .lbl, .tc-cell .lbl { font-size:9px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }',
    '.tc-cell ol { padding-left:14px; line-height:1.9; color:#444; }',
    '.footer-strip { margin-top:10px; padding-top:6px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:9px; color:#888; }',
    // Challan specific
    '.challan-items table { width:100%; border-collapse:collapse; border:1px solid '+color+'; font-size:11px; }',
    '.challan-items thead tr { background:'+color+' !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    '.challan-items thead th { padding:6px 7px; color:#fff !important; font-weight:700; border:1px solid '+color+'; -webkit-print-color-adjust:exact; print-color-adjust:exact; }',
    '.challan-items thead th.r { text-align:right; }',
    '.challan-items tbody td { padding:5px 7px; border:1px solid #dde1e7; }',
    '.challan-items tbody td.r { text-align:right; }',
    '@media print { .no-print { display:none !important; } }',
  ].join(' ');
}

// ─── Sub-builders ──────────────────────────────────────────
function buildHeader(co, companyName, titleText, copyLabel, metaRowsHtml) {
  var color = co.invoiceColor || '#1a4f8a';
  var logoHtml = co.logoData
    ? '<img src="'+co.logoData+'" style="max-height:55px;max-width:130px;object-fit:contain;display:block;margin-bottom:4px" alt="logo"/>'
    : '';
  return (
    '<div class="copy-label">'+copyLabel+'</div>'+
    '<div class="invoice-title">'+titleText+'</div>'+
    '<div class="hline"></div>'+
    '<div class="header-grid">'+
      '<div class="header-left">'+
        logoHtml+
        '<div class="co-name">'+companyName+'</div>'+
        '<div class="co-info">'+
          'GSTIN: <b>'+(co.gstin||'—')+'</b><br>'+
          (co.address||'')+
          ((co.city||co.state) ? ', '+(co.city||'')+((co.city&&co.state)?', ':'')+( co.state||'')+(co.pincode?' - '+co.pincode:'') : '')+
          '<br>Mobile: '+(co.phone||'—')+
          (co.email ? ' | Email: '+co.email : '')+
        '</div>'+
      '</div>'+
      '<div class="header-right">'+
        '<table class="meta-table">'+metaRowsHtml+'</table>'+
      '</div>'+
    '</div>'+
    '<div class="hline2"></div>'
  );
}

function metaRow(label, value) {
  return '<tr>'+
    '<td style="font-weight:600;color:#555;text-align:left;padding-right:4px;white-space:nowrap">'+label+'</td>'+
    '<td style="color:#555;padding:0 2px">:</td>'+
    '<td style="font-weight:700;color:#111;padding-left:3px;white-space:nowrap">'+value+'</td>'+
    '</tr>';
}

function partyGrid(inv, co, companyName, isForTransporter) {
  return (
    '<div class="party-grid">'+
      '<div class="party-box">'+
        '<div class="lbl">Customer Details</div>'+
        '<div class="nm">'+(inv.customerName||'—')+'</div>'+
        '<div class="info">'+
          (inv.customerGstin ? 'GSTIN: <b>'+inv.customerGstin+'</b><br>' : '')+
          (inv.customerPan   ? 'PAN: '+inv.customerPan+'<br>' : '')+
          '<b>Billing Address:</b><br>'+
          (inv.customerAddress ? inv.customerAddress+'<br>' : '')+
          ((inv.customerCity||inv.customerState) ?
            (inv.customerCity||'')+((inv.customerCity&&inv.customerState)?', ':'')+
            (inv.customerState||'')+(inv.customerPincode?' - '+inv.customerPincode:'')+'<br>' : '')+
          (inv.customerPhone ? 'Ph: '+inv.customerPhone : '')+
        '</div>'+
      '</div>'+
      '<div class="party-box">'+
        '<div style="margin-bottom:8px">'+
          '<div class="lbl">Shipping Address</div>'+
          '<div class="info">'+
            (inv.shippingAddress ||
              ((inv.customerAddress||'')+' '+(inv.customerCity||'')+' '+(inv.customerState||'')).trim() ||
              'Same as Billing')+
          '</div>'+
        '</div>'+
        '<div style="margin-bottom:8px">'+
          '<div class="lbl">Dispatch From</div>'+
          '<div class="info">'+
            (co.address||'')+' '+(co.city||'')+
            ((co.city&&co.state)?', ':'')+( co.state||'')+
          '</div>'+
        '</div>'+
        (inv.vehicleNumber ? '<div><div class="lbl">Vehicle No.</div><div class="info"><b>'+inv.vehicleNumber+'</b></div></div>' : '')+
        (inv.ewayBillNumber ? '<div><div class="lbl">E-Way Bill No.</div><div class="info"><b style="font-family:monospace">'+inv.ewayBillNumber+'</b></div></div>' : '')+
        (inv.lrNumber ? '<div><div class="lbl">LR/GR No.</div><div class="info">'+inv.lrNumber+'</div></div>' : '')+
      '</div>'+
    '</div>'
  );
}

function itemsTable(items, showPrice) {
  // showPrice false = Delivery Challan (no rate/amount)
  if (!items || !items.length) return '<p style="color:#888;font-size:11px;margin:8px 0">No items</p>';
  if (showPrice === false) {
    // Challan — only #, Item, HSN, Qty
    var rows = items.map(function(it, i) {
      return '<tr>'+
        '<td>'+(i+1)+'</td>'+
        '<td><b>'+(it.itemName||'—')+'</b>'+
          (it.hsnCode ? '<br><span style="font-size:9px;color:#666">HSN: '+it.hsnCode+'</span>' : '')+
        '</td>'+
        '<td class="r">'+(it.quantity||0)+' '+(it.unit||'')+'</td>'+
        '</tr>';
    }).join('');
    var totalQty = items.reduce(function(s,i){ return s+(Number(i.quantity)||0); }, 0);
    return (
      '<div class="challan-items">'+
        '<table><thead><tr>'+
          '<th style="width:30px">#</th>'+
          '<th>Item / Description</th>'+
          '<th class="r" style="width:80px">Qty</th>'+
        '</tr></thead>'+
        '<tbody>'+rows+'</tbody>'+
        '<tfoot><tr>'+
          '<td colspan="2" style="font-weight:700;text-align:right;border:1px solid #dde1e7;padding:5px 7px">Total Items / Qty : '+items.length+' / '+totalQty+'</td>'+
          '<td style="font-weight:700;text-align:right;border:1px solid #dde1e7;padding:5px 7px">'+totalQty+'</td>'+
        '</tr></tfoot>'+
        '</table>'+
      '</div>'
    );
  }
  // Full invoice table
  var rows = items.map(function(it, i) {
    return '<tr>'+
      '<td>'+(i+1)+'</td>'+
      '<td><b>'+(it.itemName||'—')+'</b>'+
        (it.hsnCode ? '<br><span style="font-size:9px;color:#666">HSN: '+it.hsnCode+'</span>' : '')+
      '</td>'+
      '<td>'+(it.hsnCode||'—')+'</td>'+
      '<td class="r">'+n(it.rate||0)+'</td>'+
      '<td class="r">'+(it.quantity||0)+' '+(it.unit||'')+'</td>'+
      '<td class="r">'+n(it.taxableAmount||((it.rate||0)*(it.quantity||0)))+'</td>'+
      '<td class="r">'+n(it.gstAmt||0)+' ('+(it.gstRate||0)+'%)</td>'+
      '<td class="r" style="font-weight:700">'+n(it.totalAmount||it.amount||0)+'</td>'+
      '</tr>';
  }).join('');
  var totalQty = items.reduce(function(s,i){ return s+(Number(i.quantity)||0); }, 0);
  return (
    '<table class="items">'+
      '<thead><tr>'+
        '<th style="width:25px">#</th>'+
        '<th>Item</th>'+
        '<th>HSN/SAC</th>'+
        '<th class="r">Rate / Item</th>'+
        '<th class="r">Qty</th>'+
        '<th class="r">Taxable Value</th>'+
        '<th class="r">Tax Amount</th>'+
        '<th class="r">Amount</th>'+
      '</tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
      '<tfoot><tr>'+
        '<td colspan="8" style="padding:4px 7px;font-size:10px;color:#555;border:1px solid #dde1e7">'+
          'Total Items / Qty : '+items.length+' / '+totalQty+
        '</td>'+
      '</tr></tfoot>'+
    '</table>'
  );
}

function totalsAndWords(inv) {
  var html = (
    '<div class="tot-row">'+
      '<div class="tot-box">'+
        '<table><tbody>'+
          '<tr><td>Taxable Amount</td><td>'+fmt(inv.subTotal||0)+'</td></tr>'+
          (inv.totalCgst>0.01 ? '<tr><td>CGST '+(inv.totalCgst&&inv.subTotal?((Math.round((inv.totalCgst/inv.subTotal)*100*10)/10).toFixed(1)):'9.0')+'%</td><td>'+fmt(inv.totalCgst)+'</td></tr>' : '')+
          (inv.totalSgst>0.01 ? '<tr><td>SGST '+(inv.totalSgst&&inv.subTotal?((Math.round((inv.totalSgst/inv.subTotal)*100*10)/10).toFixed(1)):'9.0')+'%</td><td>'+fmt(inv.totalSgst)+'</td></tr>' : '')+
          (inv.totalIgst>0.01 ? '<tr><td>IGST</td><td>'+fmt(inv.totalIgst)+'</td></tr>' : '')+
          (inv.freightCharge>0 ? '<tr><td>Freight</td><td>'+fmt(inv.freightCharge)+'</td></tr>' : '')+
          (inv.packagingCharge>0 ? '<tr><td>Packaging</td><td>'+fmt(inv.packagingCharge)+'</td></tr>' : '')+
          (inv.otherCharge>0 ? '<tr><td>'+(inv.otherChargeLabel||'Other Charges')+'</td><td>'+fmt(inv.otherCharge)+'</td></tr>' : '')+
          (inv.roundOff&&Math.abs(inv.roundOff)>0.001 ? '<tr><td>Round Off</td><td>'+n(inv.roundOff)+'</td></tr>' : '')+
          '<tr class="grand"><td>Total</td><td>'+fmt(inv.grandTotal||0)+'</td></tr>'+
        '</tbody></table>'+
      '</div>'+
    '</div>'+
    '<div class="words-row"><b>Total amount (in words):</b> '+amountInWords(inv.grandTotal||0)+'</div>'
  );
  return html;
}

function hsnTable(items, isInterState) {
  if (!items || !items.length) return '';
  var map = {};
  items.forEach(function(it) {
    var hsn = it.hsnCode || 'N/A';
    if (!map[hsn]) map[hsn] = { taxable:0, cgst:0, sgst:0, igst:0 };
    map[hsn].taxable += Number(it.taxableAmount||0) || (it.rate||0)*(it.quantity||0);
    map[hsn].cgst    += Number(it.cgstAmount||0);
    map[hsn].sgst    += Number(it.sgstAmount||0);
    map[hsn].igst    += Number(it.igstAmount||0);
  });
  var totTax = 0, totTbl = 0, totCgst = 0, totSgst = 0, totIgst = 0;
  var rows = Object.keys(map).map(function(hsn) {
    var r = map[hsn];
    var tax = r.cgst + r.sgst + r.igst;
    totTbl += r.taxable; totCgst += r.cgst; totSgst += r.sgst; totIgst += r.igst; totTax += tax;
    if (isInterState) {
      return '<tr><td>'+hsn+'</td><td class="r">'+n(r.taxable)+'</td>'+
        '<td class="r" colspan="2">—</td>'+
        '<td class="r">18%</td><td class="r">'+n(r.igst)+'</td>'+
        '<td class="r">'+n(tax)+'</td></tr>';
    }
    var gstR = r.taxable > 0 ? Math.round((r.cgst/r.taxable)*100) : 9;
    return '<tr><td>'+hsn+'</td><td class="r">'+n(r.taxable)+'</td>'+
      '<td class="r">'+gstR+'%</td><td class="r">'+n(r.cgst)+'</td>'+
      '<td class="r">'+gstR+'%</td><td class="r">'+n(r.sgst)+'</td>'+
      '<td class="r">'+n(r.cgst+r.sgst+r.igst)+'</td></tr>';
  }).join('');
  var footRow = isInterState
    ? '<tr><td><b>TOTAL</b></td><td class="r"><b>'+n(totTbl)+'</b></td><td class="r" colspan="2"></td><td class="r"></td><td class="r"><b>'+n(totIgst)+'</b></td><td class="r"><b>'+n(totTax)+'</b></td></tr>'
    : '<tr><td><b>TOTAL</b></td><td class="r"><b>'+n(totTbl)+'</b></td><td class="r"></td><td class="r"><b>'+n(totCgst)+'</b></td><td class="r"></td><td class="r"><b>'+n(totSgst)+'</b></td><td class="r"><b>'+n(totTax)+'</b></td></tr>';
  var headers = isInterState
    ? '<th>HSN/SAC</th><th class="r">Taxable Value</th><th class="r" colspan="2">Central Tax</th><th class="r">IGST Rate</th><th class="r">IGST Amt</th><th class="r">Total Tax</th>'
    : '<th>HSN/SAC</th><th class="r">Taxable Value</th><th class="r" colspan="2">Central Tax</th><th class="r" colspan="2">State/UT Tax</th><th class="r">Total Tax Amount</th>';
  return (
    '<div style="margin-top:10px">'+
    '<table class="hsn-tbl">'+
      '<thead><tr>'+headers+'</tr></thead>'+
      '<tbody>'+rows+'</tbody>'+
      '<tfoot><tr>'+footRow+'</tr></tfoot>'+
    '</table>'+
    '<div style="text-align:right;font-size:12px;font-weight:700;margin-top:6px;padding-right:2px">'+
      'Amount Payable: '+fmt(items.reduce(function(s,i){return s+(Number(i.totalAmount||i.amount||0));},0))+
    '</div>'+
    '</div>'
  );
}

function bankAndSign(co, companyName) {
  return (
    '<div class="two-col">'+
      '<div class="bank-box">'+
        '<div class="lbl">Bank Details</div>'+
        '<table><tbody>'+
          (co.bankName     ? '<tr><td>Bank</td><td>'+co.bankName+'</td></tr>' : '')+
          (co.accountNumber? '<tr><td>Account #</td><td>'+co.accountNumber+'</td></tr>' : '')+
          (co.ifscCode     ? '<tr><td>IFSC Code</td><td>'+co.ifscCode+'</td></tr>' : '')+
          (co.branch       ? '<tr><td>Branch</td><td>'+co.branch+'</td></tr>' : '')+
          (co.upiId        ? '<tr><td>UPI</td><td>'+co.upiId+'</td></tr>' : '')+
        '</tbody></table>'+
      '</div>'+
      '<div class="sign-box">'+
        '<div class="lbl">For '+companyName+'</div>'+
        '<div class="sign-line">'+(co.signatureLabel||'Authorized Signatory')+'</div>'+
      '</div>'+
    '</div>'
  );
}

function receiverSign() {
  return (
    '<div class="recv-area">'+
      '<div class="recv-left">'+
        '<div class="recv-lbl">Notes</div>'+
      '</div>'+
      '<div class="recv-right">'+
        '<div class="recv-line">Receiver</div>'+
      '</div>'+
    '</div>'
  );
}

function notesAndTC(notes, tc) {
  var tcItems = tc ? tc.split('\n').filter(function(l){ return l.trim(); }) : [];
  var defaultTC = [
    'All Disputes are Subject to Home Jurisdiction Only.',
    'Any complaint regarding this invoice to be made within 7 days.',
    'Goods once sold will not be taken back.',
    'No warranty for physically damaged goods.',
    'Interest @ 18% will be applicable post 14 days from the due date of the invoice.',
  ];
  var tcList = tcItems.length ? tcItems : defaultTC;
  return (
    '<div class="notes-tc">'+
      '<div class="notes-cell">'+
        '<div class="lbl">Notes</div>'+
        (notes||'Thank you for your business!')+
        '<br><br><div style="margin-top:20px;border-top:1px solid #ccc;padding-top:4px;font-size:10px;color:#555">Receiver</div>'+
      '</div>'+
      '<div class="tc-cell">'+
        '<div class="lbl">Terms and Conditions</div>'+
        '<ol>'+tcList.map(function(t){ return '<li>'+t+'</li>'; }).join('')+'</ol>'+
        '<div style="margin-top:8px;font-size:10px;color:#444">'+
          'Declaration: we declare that this invoice shows the actual price of the goods/services described and that all the particulars are true and correct.'+
        '</div>'+
      '</div>'+
    '</div>'
  );
}

function footerLine(companyName, invoiceNumber, copyLabel) {
  var isDigitallySigned = '<span style="color:#1a4f8a;font-weight:600">✓ This is a digitally verified document.</span>';
  return (
    '<div class="footer-strip">'+
      '<span>'+companyName+' | Powered by ERP System</span>'+
      '<span>'+isDigitallySigned+'</span>'+
      '<span>Page 1 / 1</span>'+
    '</div>'
  );
}

// ─── Build one copy ────────────────────────────────────────
function buildInvoiceCopy(inv, co, companyName, copyLabel, isChallan) {
  var color = co.invoiceColor || '#1a4f8a';

  var titleText = isChallan ? 'DELIVERY CHALLAN'
    : inv.invoiceType === 'QUOTATION'    ? 'QUOTATION'
    : inv.invoiceType === 'PROFORMA'     ? 'PROFORMA INVOICE'
    : inv.invoiceType === 'ESTIMATE'     ? 'ESTIMATE'
    : inv.invoiceType === 'RETAIL_INVOICE' ? 'RETAIL INVOICE'
    : 'TAX INVOICE';

  var meta = metaRow('Invoice #', '<b>'+(inv.invoiceNumber||'—')+'</b>')+
    metaRow('Invoice Date', inv.invoiceDate||'—')+
    metaRow('Place of Supply', (function(){
      // Dynamic: customer state pramane Place of Supply
      var s = inv.customerState || co.state || '';
      var stateCode = {
        'MAHARASHTRA':'27','DELHI':'07','GUJARAT':'24','KARNATAKA':'29',
        'TAMIL NADU':'33','RAJASTHAN':'08','UTTAR PRADESH':'09',
        'WEST BENGAL':'19','TELANGANA':'36','ANDHRA PRADESH':'37',
        'MADHYA PRADESH':'23','KERALA':'32','PUNJAB':'03',
        'HARYANA':'06','BIHAR':'10','JHARKHAND':'20','ODISHA':'21',
        'CHHATTISGARH':'22','ASSAM':'18','HIMACHAL PRADESH':'02',
        'UTTARAKHAND':'05','GOA':'30','TRIPURA':'16','MEGHALAYA':'17',
        'MANIPUR':'14','NAGALAND':'13','ARUNACHAL PRADESH':'12',
        'MIZORAM':'15','SIKKIM':'11','JAMMU & KASHMIR':'01',
        'CHANDIGARH':'04','PUDUCHERRY':'34','LADAKH':'38'
      };
      var upper = s.toUpperCase();
      var code = stateCode[upper] || '';
      return code ? code + '-' + upper : (upper || '27-MAHARASHTRA');
    })())+
    (inv.dueDate ? metaRow('Due Date', inv.dueDate) : '')+
    (inv.financialYear ? metaRow('FY', inv.financialYear) : '');

  // Transport copy sathi vehicle number meta madhe add karo
  if (copyLabel === 'DUPLICATE FOR TRANSPORTER' && inv.vehicleNumber) {
    meta += metaRow('Vehicle No.', '<b>'+inv.vehicleNumber+'</b>');
  }
  // Supplier copy sathi PO reference
  if (copyLabel === 'TRIPLICATE FOR SUPPLIER' && inv.poNumber) {
    meta += metaRow('Customer PO', inv.poNumber);
  }

  var hdr = buildHeader(co, companyName, titleText, copyLabel, meta);
  var party = partyGrid(inv, co, companyName, false);

  if (isChallan) {
    // Challan — no prices, just items + qty
    var body =
      hdr + party +
      itemsTable(inv.items, false) +
      bankAndSign(co, companyName) +
      receiverSign() +
      '<div class="notes-tc">'+
        '<div class="notes-cell"><div class="lbl">Notes</div>'+(inv.notes||'Thank you for your business!')+'</div>'+
        '<div class="tc-cell"></div>'+
      '</div>'+
      footerLine(companyName, inv.invoiceNumber, copyLabel);
    return '<div class="copy-page">'+body+'</div>';
  }

  // Full invoice copy
  var body =
    hdr + party +
    itemsTable(inv.items, true) +
    hsnTable(inv.items, inv.isInterState) +
    totalsAndWords(inv) +
    bankAndSign(co, companyName) +
    notesAndTC(inv.notes, co.termsConditions) +
    footerLine(companyName);

  return '<div class="copy-page">'+body+'</div>';
}

// ─── MAIN EXPORT: printSalesInvoiceMulti ──────────────────
// This is the new unified function — Swipe sarkha 4 checkboxes
// copies = array like: ['customer', 'transport', 'supplier', 'challan']
export async function printSalesInvoiceMulti(inv, copies) {
  var co = await getCompany();
  var companyName = co.companyName || 'Your Company';
  var color = co.invoiceColor || '#1a4f8a';

  var copyDefs = {
    customer:  'ORIGINAL FOR RECIPIENT',
    transport: 'DUPLICATE FOR TRANSPORTER',
    supplier:  'TRIPLICATE FOR SUPPLIER',
    challan:   'DELIVERY CHALLAN',
  };

  if (!copies || copies.length === 0) copies = ['customer'];

  var allPages = copies.map(function(c) {
    var label = copyDefs[c] || c.toUpperCase();
    return buildInvoiceCopy(inv, co, companyName, label, c === 'challan');
  }).join('');

  var w = window.open('', '_blank', 'width=1000,height=800');
  if (!w) { alert('Popup blocked! Browser madhe popup allow kara.'); return; }

  var copiesCount = copies.length;
  var copiesLabel = copies.map(function(c){
    return {customer:'Customer',transport:'Transport',supplier:'Supplier',challan:'Challan'}[c]||c;
  }).join(' + ');

  w.document.write(
    '<!DOCTYPE html><html><head><title>'+inv.invoiceNumber+'</title>'+
    '<style>'+getStyles(color)+'</style></head>'+
    '<body>'+
    allPages+
    '<div class="no-print" style="'+
      'position:sticky;bottom:0;background:#fff;border-top:2px solid '+color+';'+
      'padding:14px 20px;display:flex;align-items:center;justify-content:space-between;'+
      'flex-wrap:wrap;gap:10px;z-index:999'+
    '">'+
      '<div style="font-size:13px;color:#374151">'+
        '<b style="color:'+color+'">'+inv.invoiceNumber+'</b> &nbsp;|&nbsp; '+
        copiesCount+' cop'+(copiesCount>1?'ies':'y')+': <b>'+copiesLabel+'</b>'+
      '</div>'+
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+
        '<div style="'+
          'background:#fef9c3;border:1px solid #fde047;border-radius:6px;'+
          'padding:6px 12px;font-size:11px;color:#713f12;max-width:280px;line-height:1.5'+
        '">'+
          '💡 PDF save karayla: Print click karo → Destination madhe <b>"Save as PDF"</b> select karo'+
        '</div>'+
        '<button onclick="window.print()" style="'+
          'background:'+color+';color:#fff;padding:10px 28px;border:none;'+
          'border-radius:6px;font-size:14px;font-weight:700;cursor:pointer'+
        '">🖨️ Print / Save PDF</button>'+
        '<button onclick="window.close()" style="'+
          'background:#f1f5f9;color:#374151;padding:10px 18px;border:1px solid #e2e8f0;'+
          'border-radius:6px;font-size:13px;cursor:pointer'+
        '">✕ Close</button>'+
      '</div>'+
    '</div>'+
    '<script>'+
      'window.onload=function(){'+
        'document.title="'+inv.invoiceNumber+'";'+
      '};'+
    '<\/script>'+
    '</body></html>'
  );
  w.document.close();
}

// ─── Backward-compat wrappers (SalesPage currently uses these) ─
export async function printSalesInvoice(inv, approvedReturns, copyType) {
  // copyType: 'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' etc.
  var copies = ['customer'];
  if (copyType && copyType.toLowerCase().includes('transport')) copies = ['transport'];
  if (copyType && copyType.toLowerCase().includes('supplier'))  copies = ['supplier'];
  return printSalesInvoiceMulti(inv, copies);
}

// ─── Delivery Challan standalone ─────────────────────────
export async function printDeliveryChallan(inv) {
  return printSalesInvoiceMulti(inv, ['challan']);
}

// ─── Purchase Invoice ─────────────────────────────────────
export async function printPurchaseInvoice(inv, approvedReturns) {
  var co = await getCompany();
  var companyName = co.companyName || 'Your Company';
  var color = co.invoiceColor || '#1a4f8a';

  var meta = metaRow('Invoice #', '<b>'+(inv.invoiceNumber||'—')+'</b>')+
    metaRow('Invoice Date', inv.invoiceDate||'—')+
    (inv.supplierInvoiceNumber ? metaRow('Supp. Inv#', inv.supplierInvoiceNumber) : '')+
    (inv.dueDate ? metaRow('Due Date', inv.dueDate) : '')+
    (inv.financialYear ? metaRow('FY', inv.financialYear) : '');

  var hdr = buildHeader(co, companyName, 'PURCHASE INVOICE', 'ORIGINAL', meta);

  var party = (
    '<div class="party-grid">'+
      '<div class="party-box">'+
        '<div class="lbl">Supplier Details</div>'+
        '<div class="nm">'+(inv.supplierName||'—')+'</div>'+
        '<div class="info">'+
          (inv.supplierGstin   ? 'GSTIN: <b>'+inv.supplierGstin+'</b><br>' : '')+
          (inv.supplierAddress ? inv.supplierAddress+'<br>' : '')+
          ((inv.supplierCity||inv.supplierState) ?
            (inv.supplierCity||'')+((inv.supplierCity&&inv.supplierState)?', ':'')+
            (inv.supplierState||'')+'<br>' : '')+
          (inv.supplierPhone ? 'Ph: '+inv.supplierPhone : '')+
        '</div>'+
      '</div>'+
      '<div class="party-box">'+
        '<div class="lbl">Bill To (Buyer)</div>'+
        '<div class="nm">'+companyName+'</div>'+
        '<div class="info">'+
          (co.gstin ? 'GSTIN: <b>'+co.gstin+'</b><br>' : '')+
          (co.pan   ? 'PAN: '+co.pan+'<br>' : '')+
          (co.address ? co.address+'<br>' : '')+
          ((co.city||co.state) ? (co.city||'')+((co.city&&co.state)?', ':'')+( co.state||'')+(co.pincode?' - '+co.pincode:'') : '')+
          (co.phone ? '<br>Ph: '+co.phone : '')+
        '</div>'+
      '</div>'+
    '</div>'
  );

  var body = hdr + party + itemsTable(inv.items, true) + hsnTable(inv.items, inv.isInterState) +
    totalsAndWords(inv) + bankAndSign(co, companyName) +
    notesAndTC(inv.notes, co.termsConditions) + footerLine(companyName);

  var w = window.open('', '_blank', 'width=1000,height=800');
  if (!w) { alert('Popup blocked!'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>Purchase Invoice</title><style>'+getStyles(color)+'</style></head><body>'+
    '<div class="copy-page">'+body+'</div>'+
    '<div class="no-print" style="text-align:center;margin:20px">'+
      '<button onclick="window.print()" style="background:'+color+';color:#fff;padding:10px 32px;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-right:10px">🖨️ Print</button>'+
      '<button onclick="window.close()" style="background:#64748b;color:#fff;padding:10px 24px;border:none;border-radius:6px;font-size:14px;cursor:pointer">✕ Close</button>'+
    '</div>'+
    '</body></html>');
  w.document.close();
}

// ─── Other existing exports (unchanged logic) ─────────────
export async function printPurchaseOrder(order) {
  var co = await getCompany();
  var companyName = co.companyName||'Company';
  var color = co.invoiceColor||'#1a4f8a';
  var meta = metaRow('PO #','<b>'+(order.poNumber||'—')+'</b>')+metaRow('PO Date',order.poDate||'—');
  var hdr = buildHeader(co,companyName,'PURCHASE ORDER','COPY',meta);
  var body = hdr+
    '<div class="party-grid"><div class="party-box"><div class="lbl">Supplier</div><div class="nm">'+(order.supplierName||'—')+'</div>'+
    '<div class="info">'+(order.supplierGstin?'GSTIN: '+order.supplierGstin+'<br>':'')+
    (order.supplierAddress||'')+'</div></div>'+
    '<div class="party-box"><div class="lbl">Delivery Address</div><div class="info">'+(co.address||'')+', '+(co.city||'')+', '+(co.state||'')+'</div></div></div>'+
    itemsTable(order.items,true)+
    totalsAndWords(order)+
    bankAndSign(co,companyName)+footerLine(companyName);
  var w=window.open('','_blank','width=1000,height=800');
  if(!w){alert('Popup blocked!');return;}
  w.document.write('<!DOCTYPE html><html><head><title>PO</title><style>'+getStyles(color)+'</style></head><body><div class="copy-page">'+body+'</div></body></html>');
  w.document.close();
}

export async function printSalesOrder(order) {
  var co = await getCompany();
  var companyName = co.companyName||'Company';
  var color = co.invoiceColor||'#1a4f8a';
  var meta = metaRow('SO #','<b>'+(order.soNumber||'—')+'</b>')+metaRow('SO Date',order.soDate||'—');
  var hdr = buildHeader(co,companyName,'SALES ORDER','COPY',meta);
  var body = hdr+
    '<div class="party-grid"><div class="party-box"><div class="lbl">Customer</div><div class="nm">'+(order.customerName||'—')+'</div>'+
    '<div class="info">'+(order.customerGstin?'GSTIN: '+order.customerGstin+'<br>':'')+
    (order.customerAddress||'')+'</div></div>'+
    '<div class="party-box"><div class="lbl">Delivery Address</div><div class="info">'+(order.shippingAddress||order.customerAddress||'Same as billing')+'</div></div></div>'+
    itemsTable(order.items,true)+totalsAndWords(order)+bankAndSign(co,companyName)+footerLine(companyName);
  var w=window.open('','_blank','width=1000,height=800');
  if(!w){alert('Popup blocked!');return;}
  w.document.write('<!DOCTYPE html><html><head><title>SO</title><style>'+getStyles(color)+'</style></head><body><div class="copy-page">'+body+'</div></body></html>');
  w.document.close();
}

export async function printSalesReturn(ret) {
  var co=await getCompany();var companyName=co.companyName||'Company';var color=co.invoiceColor||'#1a4f8a';
  var meta=metaRow('Return #','<b>'+(ret.returnNumber||'—')+'</b>')+metaRow('Date',ret.returnDate||'—')+
    (ret.originalInvoiceNumber?metaRow('Orig. Invoice',ret.originalInvoiceNumber):'');
  var hdr=buildHeader(co,companyName,'SALES RETURN','COPY',meta);
  var body=hdr+itemsTable(ret.items,true)+totalsAndWords(ret)+bankAndSign(co,companyName)+footerLine(companyName);
  var w=window.open('','_blank','width=1000,height=800');if(!w)return;
  w.document.write('<!DOCTYPE html><html><head><title>Return</title><style>'+getStyles(color)+'</style></head><body><div class="copy-page">'+body+'</div></body></html>');
  w.document.close();
}

export async function printPurchaseReturn(ret) {
  var co=await getCompany();var companyName=co.companyName||'Company';var color=co.invoiceColor||'#1a4f8a';
  var meta=metaRow('Return #','<b>'+(ret.returnNumber||'—')+'</b>')+metaRow('Date',ret.returnDate||'—')+
    (ret.originalInvoiceNumber?metaRow('Orig. Invoice',ret.originalInvoiceNumber):'');
  var hdr=buildHeader(co,companyName,'PURCHASE RETURN','COPY',meta);
  var body=hdr+itemsTable(ret.items,true)+totalsAndWords(ret)+bankAndSign(co,companyName)+footerLine(companyName);
  var w=window.open('','_blank','width=1000,height=800');if(!w)return;
  w.document.write('<!DOCTYPE html><html><head><title>Return</title><style>'+getStyles(color)+'</style></head><body><div class="copy-page">'+body+'</div></body></html>');
  w.document.close();
}

export async function printReport({ title, subtitle, tableHeaders, tableRows, summaryCards, footerNote }) {
  var co=await getCompany();var companyName=co.companyName||'Company';var color=co.invoiceColor||'#1a4f8a';
  var cards=summaryCards&&summaryCards.length?'<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px">'+
    summaryCards.map(function(c){return '<div style="border:1px solid '+color+';padding:10px 16px;border-radius:6px;min-width:130px">'+
      '<div style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px">'+c.label+'</div>'+
      '<div style="font-size:16px;font-weight:800;color:'+color+'">'+c.value+'</div></div>';}).join('')+'</div>':'';
  var hdrs=tableHeaders?'<thead><tr>'+tableHeaders.map(function(h){
      var lbl = typeof h==='object' ? (h.label||'') : (h||'');
      var align = (typeof h==='object' && h.right) ? 'right' : 'left';
      return '<th style="padding:6px 8px;text-align:'+align+';background:'+color+';color:#fff;border:1px solid '+color+'">'+lbl+'</th>';}).join('')+'</tr></thead>':'';
  var rows=tableRows?tableRows.map(function(row,ri){return '<tr style="background:'+(ri%2===0?'#fff':'#f8fafc')+'">'+row.map(function(cell){
          var val   = typeof cell==='object' ? (cell.value!=null?cell.value:'') : (cell!=null?cell:'');
          var align = (typeof cell==='object' && cell.right) ? 'right' : 'left';
          var extra = (typeof cell==='object' && cell.style) ? cell.style : '';
          var bold  = (typeof cell==='object' && cell.bold)  ? 'font-weight:700;' : '';
          return '<td style="padding:5px 8px;border:1px solid #e2e8f0;text-align:'+align+';'+bold+extra+'">'+val+'</td>';}).join('')+'</tr>';}).join(''):'';
  var body='<div style="text-align:center;margin-bottom:16px">'+
    '<div style="font-size:16px;font-weight:800;color:'+color+'">'+title+'</div>'+
    (subtitle?'<div style="font-size:11px;color:#6b7280;margin-top:2px">'+subtitle+'</div>':'')+
    '<div style="border-bottom:2px solid '+color+';margin-top:8px"></div></div>'+
    cards+'<table style="width:100%;border-collapse:collapse;font-size:11px">'+hdrs+'<tbody>'+rows+'</tbody></table>'+
    (footerNote?'<div style="margin-top:10px;font-size:10px;color:#6b7280">'+footerNote+'</div>':'');
  var w=window.open('','_blank','width=1000,height=700');if(!w)return;
  w.document.write('<!DOCTYPE html><html><head><title>'+title+'</title><style>'+getStyles(color)+'@page{margin:8mm}body{font-family:Arial,sans-serif;font-size:11px;padding:20px}</style></head><body>'+body+'<div class="no-print" style="text-align:center;margin:20px"><button onclick="window.print()" style="background:'+color+';color:#fff;padding:9px 28px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer">🖨️ Print</button></div></body></html>');
  w.document.close();
}

export async function printCompactInvoice(inv, approvedReturns, copyType) {
  return printSalesInvoice(inv, approvedReturns, copyType);
}

