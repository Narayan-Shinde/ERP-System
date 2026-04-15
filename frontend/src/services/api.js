import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// 401: if JWT exp claim is still in the future, assume transient (e.g. server restart) and reload once.
// If token missing or expired, clear storage and send user to login.
let _isHandling401 = false;
API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !_isHandling401) {
      _isHandling401 = true;
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiry  = payload.exp ? payload.exp * 1000 : 0;
          if (expiry > Date.now()) {
            window.dispatchEvent(new CustomEvent('api-unauthorized', { detail: { status: 401 } }));
            setTimeout(() => { _isHandling401 = false; }, 3000);
            return Promise.reject(err);
          }
        } catch {}
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login    = d => API.post('/auth/login', d);
export const register = d => API.post('/auth/register', d);

export const updateUser       = (id,d)    => API.put(`/users/${id}`, d);
export const toggleUserStatus = id        => API.put(`/users/${id}/toggle-status`);
export const deleteUser       = id        => API.delete(`/users/${id}`);
export const changePassword   = d         => API.put('/users/change-password', d);

export const getSuppliers           = ()        => API.get('/purchase/suppliers');
export const addSupplier            = d         => API.post('/purchase/suppliers', d);
export const updateSupplier         = (id,d)    => API.put(`/purchase/suppliers/${id}`, d);
export const deleteSupplier         = id        => API.delete(`/purchase/suppliers/${id}`);
export const getPurchaseInvoices    = p         => API.get('/purchase/invoices', {params:p});
export const addPurchaseInvoice     = d         => API.post('/purchase/invoices', d);
export const recordPurchasePayment  = (id,p)    => API.put(`/purchase/invoices/${id}/payment`, null, {params:p});
export const cancelPurchaseInvoice  = (id,r)    => API.delete(`/purchase/invoices/${id}`, {params:{reason:r||'Cancelled'}});
export const updatePurchaseInvoice  = (id,d)    => API.put(`/purchase/invoices/${id}`, d);
export const getPurchaseOrders      = p         => API.get('/purchase/orders', {params:p});
export const addPurchaseOrder       = d         => API.post('/purchase/orders', d);
export const updatePurchaseOrder    = (id,d)    => API.put(`/purchase/orders/${id}`, d);
export const deletePurchaseOrder    = id        => API.delete(`/purchase/orders/${id}`);
export const getPurchaseReturns     = (p)       => API.get('/purchase/returns', {params:p});
export const addPurchaseReturn      = d         => API.post('/purchase/returns', d);
export const updatePurchaseReturn   = (id,d)    => API.put(`/purchase/returns/${id}`, d);
export const deletePurchaseReturn   = id        => API.delete(`/purchase/returns/${id}`);
export const getGRNs                = (p)       => API.get('/purchase/grn', {params:p});
export const addGRN                 = d         => API.post('/purchase/grn', d);
export const updateGRN              = (id,d)    => API.put(`/purchase/grn/${id}`, d);
export const deleteGRN              = id        => API.delete(`/purchase/grn/${id}`);
export const getPurchaseRegister    = p         => API.get('/purchase/report/register', {params:p});

export const getCustomers           = ()        => API.get('/sales/customers');
export const addCustomer            = d         => API.post('/sales/customers', d);
export const updateCustomer         = (id,d)    => API.put(`/sales/customers/${id}`, d);
export const deleteCustomer         = id        => API.delete(`/sales/customers/${id}`);
export const getSalesInvoices       = p         => API.get('/sales/invoices', {params:p});
export const addSalesInvoice        = d         => API.post('/sales/invoices', d);
export const updateSalesInvoice     = (id,d)    => API.put(`/sales/invoices/${id}`, d);
export const calculateInvoice       = (d,isInterState) => API.post('/sales/invoices/calculate', d, {params:{isInterState:isInterState||false}});
export const recordSalesPayment     = (id,p)    => API.put(`/sales/invoices/${id}/payment`, null, {params:p});
export const cancelSalesInvoice     = (id,r)    => API.delete(`/sales/invoices/${id}`, {params:{reason:r||'Cancelled'}});
export const getSalesOrders         = p         => API.get('/sales/orders', {params:p});
export const addSalesOrder          = d         => API.post('/sales/orders', d);
export const updateSalesOrder       = (id,d)    => API.put(`/sales/orders/${id}`, d);
export const deleteSalesOrder       = id        => API.delete(`/sales/orders/${id}`);
export const getSalesReturns        = (p)       => API.get('/sales/returns', {params:p});
export const addSalesReturn         = d         => API.post('/sales/returns', d);
export const updateSalesReturn      = (id,d)    => API.put(`/sales/returns/${id}`, d);
export const deleteSalesReturn      = id        => API.delete(`/sales/returns/${id}`);
export const getOutstandingReport   = ()        => API.get('/sales/report/outstanding');
export const getSalesRegister       = p         => API.get('/sales/report/register', {params:p});

export const getExpenseHeads  = ()      => API.get('/expense/heads');
export const addExpenseHead      = d       => API.post('/expense/heads', d);
export const updateExpenseHead   = (id,d)  => API.put(`/expense/heads/${id}`, d);
export const deleteExpenseHead   = id      => API.delete(`/expense/heads/${id}`);
export const getExpenses      = p       => API.get('/expense', {params:p});
export const addExpense       = d       => API.post('/expense', d);
export const updateExpense    = (id,d)  => API.put(`/expense/${id}`, d);
export const deleteExpense    = id      => API.delete(`/expense/${id}`);

export const getVouchers   = p       => API.get('/accounting/vouchers', {params:p});
export const addVoucher    = d       => API.post('/accounting/vouchers', d);
export const updateVoucher = (id,d)  => API.put(`/accounting/vouchers/${id}`, d);
export const deleteVoucher    = id      => API.delete(`/accounting/vouchers/${id}`);
export const repostMissing    = ()      => API.post('/accounting/repost-missing');
export const getAccountingDashboard = () => API.get('/accounting/dashboard');

export const getLedgers             = p      => API.get('/ledger', {params:p});
export const addLedger              = d      => API.post('/ledger', d);
export const updateLedger           = (id,d) => API.put(`/ledger/${id}`, d);
export const getLedgerStatement      = (id, p) => API.get(`/ledger/${id}/statement`, {params: p});
export const getAllLedgerTransactions    = p     => API.get('/ledger/transactions', {params: p});
export const addLedgerTransaction       = d     => API.post('/ledger/transactions', d);
export const updateLedgerTransaction    = (id,d) => API.put(`/ledger/transactions/${id}`, d);
export const deleteLedgerTransaction    = id     => API.delete(`/ledger/transactions/${id}`);

export const getCategories     = ()      => API.get('/inventory/categories');
export const addCategory       = d       => API.post('/inventory/categories', d);
export const updateCategory    = (id,d)  => API.put(`/inventory/categories/${id}`, d);
export const deleteCategory    = id      => API.delete(`/inventory/categories/${id}`);
export const getWarehouses     = ()      => API.get('/inventory/warehouses');
export const addWarehouse      = d       => API.post('/inventory/warehouses', d);
export const updateWarehouse   = (id,d)  => API.put(`/inventory/warehouses/${id}`, d);
export const deleteWarehouse   = id      => API.delete(`/inventory/warehouses/${id}`);
export const getItems          = p       => API.get('/inventory/items', {params:p});
export const addItem           = d       => API.post('/inventory/items', d);
export const updateItem        = (id,d)  => API.put(`/inventory/items/${id}`, d);
export const deleteItem        = id      => API.delete(`/inventory/items/${id}`);
export const getLowStockItems  = ()      => API.get('/inventory/items/low-stock');

// ── HSN Master API ─────────────────────────────────────────────
export const searchHsn         = (itemName, limit = 10) => API.get('/hsn/search', { params: { itemName, limit } });
export const suggestHsn        = itemName => API.get('/hsn/search', { params: { itemName, limit: 5 } });
export const autoCompleteHsn   = (code, limit = 10) => API.get('/hsn/autocomplete', { params: { code, limit } });
export const getHsnByCode      = code    => API.get(`/hsn/${code}`);
export const validateHsn       = code    => API.get(`/hsn/validate/${code}`);
export const getHsnGstRate     = code    => API.get(`/hsn/gst-rate/${code}`);
export const suggestHsnByCategory = (itemType, description) => API.post('/hsn/suggest', { itemType, description });
export const getAllHsn         = ()      => API.get('/hsn');

export const getGstConfigurations    = ()      => API.get('/gst/configurations');
export const addGstConfiguration     = d       => API.post('/gst/configurations', d);
export const updateGstConfiguration  = (id,d)  => API.put(`/gst/configurations/${id}`, d);
export const deleteGstConfiguration  = id      => API.delete(`/gst/configurations/${id}`);
export const getGstLiability    = (f,t)   => API.get('/reports/gst-liability', {params:{fromDate:f,toDate:t}});
export const getGSTR3B            = (f,t)   => API.get('/gst/gstr3b', {params:{fromDate:f,toDate:t}})
export const generateGSTR3B       = (f,t)   => API.get('/gst/gstr3b', {params:{fromDate:f,toDate:t}})  // alias;
export const getITCReport         = (f,t)   => API.get('/gst/itc-report', {params:{fromDate:f,toDate:t}});

export const getDashboard       = (fy)    => API.get('/reports/dashboard', { params: fy ? { financialYear: fy } : {} });
export const getProfitLoss      = (f,t)   => API.get('/reports/profit-loss', {params:{fromDate:f,toDate:t}});
export const getMonthlyPL       = year    => API.get('/reports/monthly-pl', {params:{year}});
export const getTrialBalance    = ()      => API.get('/reports/trial-balance');
export const getBalanceSheet    = ()      => API.get('/reports/balance-sheet');
export const getCashFlow        = (f,t)   => API.get('/reports/cash-flow', {params:{fromDate:f,toDate:t}});
export const getStockSummary      = ()          => API.get('/reports/stock-summary');
export const getStockLedger       = (item,f,t)  => API.get('/reports/stock-ledger', {params:{itemId:item,fromDate:f,toDate:t}});
export const getComparativePL     = (p1f,p1t,p2f,p2t) => API.get('/reports/comparative-pl', {params:{period1From:p1f,period1To:p1t,period2From:p2f,period2To:p2t}});

export const getCompanySettings  = ()  => API.get('/settings/company');
export const saveCompanySettings = d   => API.post('/settings/company', d);
export const getBanks         = ()      => API.get('/settings/banks');
export const addBank          = d       => API.post('/settings/banks', d);
export const updateBank       = (id,d)  => API.put(`/settings/banks/${id}`, d);
export const setDefaultBank   = id      => API.put(`/settings/banks/${id}/set-default`);
export const deleteBank       = id      => API.delete(`/settings/banks/${id}`);

export default API;

export const getAuditLogs          = ()        => API.get('/audit');
export const getAuditByUser        = u         => API.get(`/audit/by-user/${u}`);
export const getAuditByModule      = m         => API.get(`/audit/by-module/${m}`);
export const getAuditByAction      = a         => API.get(`/audit/by-action/${a}`);
export const getAuditByDate        = (f,t)     => API.get('/audit/by-date', {params:{fromDate:f,toDate:t}});
export const clearOldAuditLogs     = ()        => API.delete('/audit/clear');

// ── Inventory Enhanced ──
export const getItemBarcode      = id        => API.get(`/inventory/items/${id}/barcode`);
export const updateItemBarcode   = (id,d)    => API.put(`/inventory/items/${id}/barcode`, null, {params:d});
export const getItemBatches      = id        => API.get(`/inventory/items/${id}/batches`);
export const addItemBatch        = (id,d)    => API.post(`/inventory/items/${id}/batches`, d);
export const getItemPriceLists   = id        => API.get(`/inventory/items/${id}/price-lists`);
export const updateItemPriceLists= (id,d)    => API.put(`/inventory/items/${id}/price-lists`, d);
export const updateItemImage     = (id,d)    => API.put(`/inventory/items/${id}/image`, d);
export const deleteItemImage     = id        => API.delete(`/inventory/items/${id}/image`);
export const getExpiringSoon     = (days)    => API.get('/inventory/items/expiring-soon', {params:{days}});
export const adjustItemStock     = (id,d)    => API.put(`/inventory/items/${id}/stock`, null, {params:d});

// ── Customer Enhanced ──
export const getCustomerLedger    = (id,p)   => API.get(`/customers/${id}/ledger`, {params:p});
export const getCustomerInvoices  = id        => API.get(`/customers/${id}/invoices`);
export const checkCreditLimit     = (id,amt)  => API.get(`/customers/${id}/credit-check`, {params:{newInvoiceAmount:amt}});
export const getOverdueCustomers  = ()        => API.get('/customers/overdue');
export const getCustomerSummary   = ()        => API.get('/customers/summary');

// ── Supplier Enhanced ──
export const getSupplierLedger    = (id,p)    => API.get(`/suppliers/${id}/ledger`, {params:p});
export const getSupplierInvoices  = id        => API.get(`/suppliers/${id}/invoices`);
export const getPendingPayments   = ()        => API.get('/suppliers/pending-payments');
export const getSupplierSummary   = ()        => API.get('/suppliers/summary');

// ── GST Enhanced ──
export const getGSTR1            = (p)       => API.get('/gst/gstr1', {params:p});
export const getTaxLiability     = (p)       => API.get('/gst/tax-liability', {params:p});

// ── Sales Enhanced ──
export const convertToInvoice    = (id)      => API.put(`/sales/invoices/${id}/convert-to-invoice`);
export const getSalesInvoice     = (id)      => API.get(`/sales/invoices/${id}`);
export const getCustomerStatement= (id,p)    => API.get(`/sales/customers/${id}/statement`, {params:p});
export const duplicateSalesInvoice=(id)      => API.post(`/sales/invoices/${id}/duplicate`);
export const getCustomerSalesReport=(p)      => API.get('/sales/report/customer-summary', {params:p});
export const getItemSalesReport   = (p)      => API.get('/sales/report/item-summary', {params:p});

export const getItemSummaryReport   = p  => API.get('/sales/report/item-summary', {params:p});
export const getPurchaseItemSummary = p  => API.get('/purchase/report/item-summary', {params:p});

// ── New: Delivery Challan, Credit/Debit Note, Aging ──
export const getDeliveryChallan    = (id)   => API.get(`/sales/invoices/${id}/challan`);
export const getSalesCreditNote    = (id)   => API.get(`/sales/returns/${id}/credit-note`);
export const getPurchaseDebitNote  = (id)   => API.get(`/purchase/returns/${id}/debit-note`);
export const getSupplierStatement  = (id,p) => API.get(`/purchase/suppliers/${id}/statement`, {params:p});
export const getInvoiceShareData   = (id)   => API.get(`/sales/invoices/${id}/share`);
export const getInvoiceAging       = ()     => API.get('/reports/invoice-aging');
export const getStockValuation     = ()     => API.get('/reports/stock-valuation');

// ── Draft Invoice ──────────────────────────────────────────────────
export const saveDraftSalesInvoice  = d         => API.post('/sales/invoices', {...d, status:'DRAFT'});
export const confirmDraftInvoice    = (id,d)    => API.put(`/sales/invoices/${id}`, {...d, status:'CONFIRMED'});
export const saveDraftPurchaseInvoice=(d)       => API.post('/purchase/invoices', {...d, status:'DRAFT'});

// ── E-Way Bill ─────────────────────────────────────────────────────
export const getEwayBillData        = id        => API.get(`/sales/invoices/${id}/eway-bill`);
export const updateEwayBillNumber   = (id,p)    => API.put(`/sales/invoices/${id}/eway-bill`, null, {params:p});

// ── Email Invoice ──────────────────────────────────────────────────
export const emailInvoice           = (id,p)    => API.post(`/sales/invoices/${id}/email`, null, {params:p});

// ── Stock Transfer ─────────────────────────────────────────────────
export const getStockTransfers      = ()        => API.get('/inventory/stock-transfers');
export const createStockTransfer    = d         => API.post('/inventory/stock-transfers', d);
export const updateStockTransfer    = (id,d)    => API.put(`/inventory/stock-transfers/${id}`, d);

// ── Recurring Invoices ─────────────────────────────────────────────
export const getRecurringInvoices   = ()        => API.get('/sales/recurring');
export const addRecurringInvoice    = d         => API.post('/sales/recurring', d);
export const updateRecurringInvoice = (id,d)    => API.put(`/sales/recurring/${id}`, d);
export const deleteRecurringInvoice = id        => API.delete(`/sales/recurring/${id}`);
export const runRecurringNow        = id        => API.post(`/sales/recurring/${id}/run`);

// ── Bank Reconciliation ────────────────────────────────────────────
export const getBankStatements      = p         => API.get('/accounting/bank-statements', {params:p});
export const addBankStatement       = d         => API.post('/accounting/bank-statements', d);
export const updateBankStatement    = (id,d)    => API.put(`/accounting/bank-statements/${id}`, d);
export const deleteBankStatement    = id        => API.delete(`/accounting/bank-statements/${id}`);
export const reconcileEntry         = (id,p)    => API.put(`/accounting/bank-statements/${id}/reconcile`, null, {params:p});
export const getUnreconciledEntries = ()        => API.get('/accounting/bank-statements/unreconciled');

// ── Reports - new ─────────────────────────────────────────────────
export const getBillwiseProfitReport= p         => API.get('/reports/billwise-profit', {params:p});
export const getDaywiseSalesReport  = p         => API.get('/reports/daywise-sales', {params:p});
export const getPartyReport         = p         => API.get('/reports/party-report', {params:p});

// ── Item Variants ──────────────────────────────────────────────────
export const getItemVariants        = id        => API.get(`/inventory/items/${id}/variants`);
export const addItemVariant         = (id,d)    => API.post(`/inventory/items/${id}/variants`, d);
export const updateItemVariant      = (id,vid,d)=> API.put(`/inventory/items/${id}/variants/${vid}`, d);
export const deleteItemVariant      = (id,vid)  => API.delete(`/inventory/items/${id}/variants/${vid}`);

// ── GSTIN Verification (GST Portal public search) ──────────────
// Uses https://sheet.gstincheck.co.in/ — free public GSTIN lookup
// ── GSTIN State code → name map ──
const GST_STATE_MAP = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
  '24':'Gujarat','26':'Dadra & Nagar Haveli and Daman & Diu','27':'Maharashtra',
  '28':'Andhra Pradesh','29':'Karnataka','30':'Goa','31':'Lakshadweep',
  '32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar Islands',
  '36':'Telangana','37':'Andhra Pradesh','38':'Ladakh',
  '97':'Other Territory','99':'Centre Jurisdiction'
};

// ── Parse GSTIN response data — normalize from ANY API format ──
const parseGSTResponse = (data, gstin) => {
  const stateCode = gstin.substring(0,2);
  const pan       = gstin.substring(2,12);
  const stateName = GST_STATE_MAP[stateCode] || '';

  // Different APIs use different field names — handle all
  const legalName  = data.lgnm  || data.legal_name  || data.legalName  || data.name || '';
  const tradeName  = data.tradeNam || data.trade_name || data.tradeName || data.businessName || '';
  const name       = legalName || tradeName || '';

  // Address from pradr (Principal Address) or adadr (Additional)
  const addr = data.pradr?.addr || data.pradr || data.address || {};
  const street   = [addr.bno, addr.bnm, addr.flno, addr.st].filter(Boolean).join(', ') || addr.street || '';
  const locality = addr.loc  || addr.locality || addr.area || '';
  const district = addr.dst  || addr.district || addr.city || '';
  const state    = GST_STATE_MAP[addr.stcd] || GST_STATE_MAP[stateCode] || stateName || addr.state || '';
  const pincode  = addr.pncd || addr.pincode || addr.pin || '';
  const fullAddr = [street, locality, district].filter(Boolean).join(', ');

  const status = data.sts || data.status || data.gstStatus || 'Active';
  const cancelled = (status + '').toLowerCase().includes('cancel');

  return { name, legalName, tradeName, street, locality, district, state, stateName, pincode, fullAddr, pan, stateCode, status, cancelled, raw: data };
};

export const verifyGSTIN = async (gstin) => {
  if (!gstin || gstin.trim().length !== 15)
    throw new Error('GSTIN exactly 15 characters cha hava!');
  const g = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g))
    throw new Error('GSTIN format invalid! Example: 27AABCU9603R1ZX');

  // Use backend proxy — avoids CORS issues completely
  try {
    const backendResp = await API.get(`/gstin/verify/${g}`);
    if (backendResp.data) return { data: backendResp.data };
  } catch (backendErr) {
    // Backend unavailable — fall through to direct API calls
  }

  // Try multiple public APIs in order
  const APIs = [
    // API 1: apisetu.gov.in (official India govt)
    async () => {
      const r = await fetch(`https://api.apisetu.gov.in/dictionary/v3/gstn/search?gstin=${g}`, { headers: {'Accept':'application/json'} });
      if (!r.ok) throw new Error('API 1 failed');
      return r.json();
    },
    // API 2: sheet.gstincheck.co.in
    async () => {
      const r = await fetch(`https://sheet.gstincheck.co.in/check/${g}`);
      if (!r.ok) throw new Error('API 2 failed');
      return r.json();
    },
    // API 3: gstincheck.co.in/check/{gstin}
    async () => {
      const r = await fetch(`https://gstincheck.co.in/check/${g}`);
      if (!r.ok) throw new Error('API 3 failed');
      return r.json();
    },
  ];

  for (const apiFn of APIs) {
    try {
      const raw = await apiFn();
      // Check if response has any useful data
      if (raw && (raw.lgnm || raw.legal_name || raw.name || raw.tradeNam || raw.trade_name)) {
        const parsed = parseGSTResponse(raw, g);
        return { data: parsed };
      }
    } catch { /* try next */ }
  }

  // All APIs failed — fallback: parse from GSTIN itself (state + PAN)
  const stateCode = g.substring(0,2);
  const pan       = g.substring(2,12);
  const stateName = GST_STATE_MAP[stateCode] || 'Unknown';
  return {
    data: {
      name: '', legalName: '', tradeName: '',
      street: '', locality: '', district: '', state: stateName,
      stateName, pincode: '', fullAddr: '',
      pan, stateCode, status: 'UNVERIFIED', cancelled: false,
      note: 'Could not verify online — GSTIN format valid; state from GSTIN: ' + stateName,
      raw: { note: 'Could not fetch from API — GSTIN format valid, state: ' + stateName }
    }
  };
};

// Backend GSTIN verify endpoint (if configured)
export const verifyGSTINBackend = (gstin) => API.get('/settings/verify-gstin', { params: { gstin } });
